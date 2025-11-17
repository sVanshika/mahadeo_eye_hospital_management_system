from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from database_sqlite import get_db, Patient, Queue, PatientStatus, OPD, PatientFlow, get_ist_now
from auth import get_current_active_user, User, require_role, check_opd_access, UserRole
from websocket_manager import broadcast_queue_update, broadcast_patient_status_update, broadcast_display_update
import pytz
ist = pytz.timezone('Asia/Kolkata')
router = APIRouter()

# Pydantic models
class QueueResponse(BaseModel):
    id: int
    patient_id: int
    token_number: str
    patient_name: str
    position: int
    status: PatientStatus
    registration_time: datetime
    is_dilated: bool
    dilation_time: Optional[datetime] = None
    age: Optional[int] = None
    phone: Optional[str] = None
    is_referred: bool
    referred_from: Optional[str] = None
    dilation_flag: bool

    class Config:
        from_attributes = True

class OPDStats(BaseModel):
    opd_type: str
    opd_name: str
    total_patients: int
    pending_patients: int
    in_opd_patients: int
    dilated_patients: int
    referred_patients: int
    completed_today: int
    avg_waiting_time: Optional[float]
    
class DilatePatientRequest(BaseModel):
    remarks: Optional[str] = None

@router.get("/{opd_type}/queue", response_model=List[QueueResponse])
async def get_opd_queue(
    opd_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Convert to lowercase to match database
    opd_type = opd_type.lower()
    
    # Check OPD access
    check_opd_access(current_user, opd_type, db)
    
    print(f"\n{'='*60}")
    print(f"=== GET QUEUE FOR OPD: {opd_type} ===")
    print(f"!!! CODE VERSION: 2024-11-14-v3 !!!")
    print(f"{'='*60}")
    
    # Validate OPD exists and is active
    opd = db.query(OPD).filter(OPD.opd_code == opd_type, OPD.is_active == True).first()
    if not opd:
        print(f"ERROR: OPD {opd_type} not found or inactive")
        raise HTTPException(status_code=404, detail="OPD not found or inactive")
    print(f"✓ OPD found: {opd.opd_code} - {opd.opd_name}")
    
    # First, let's see ALL queue entries for this OPD
    all_queue_entries = db.query(Queue).filter(Queue.opd_type == opd_type).all()
    print(f"✓ Total queue entries for {opd_type}: {len(all_queue_entries)}")
    for entry in all_queue_entries:
        print(f"  - Patient ID: {entry.patient_id}, Status: {entry.status}, Position: {entry.position}")
    
    try:
        # Check what statuses we're looking for
        print(f"Looking for statuses: {[PatientStatus.PENDING, PatientStatus.IN_OPD, PatientStatus.DILATED, PatientStatus.REFERRED]}")
        
        queue_entries = db.query(Queue).join(Patient).filter(
            Queue.opd_type == opd_type,
            Queue.status.in_([PatientStatus.PENDING, PatientStatus.IN_OPD, PatientStatus.DILATED, PatientStatus.REFERRED])
        ).filter(
        # Only exclude patients who were referred FROM this OPD to a DIFFERENT OPD
        # Allow: fresh patients (no referral), patients referred TO this OPD, patients referred FROM this OPD back to this OPD
        ~(
            (Patient.referred_from == opd_type) & 
            (Patient.referred_to != opd_type) & 
            (Patient.referred_to.isnot(None))
        )
        ).order_by(Queue.position).all()
        
        print(f"Found {len(queue_entries)} queue entries after filtering")
        for entry in queue_entries:
            print(f"  Matched: Patient {entry.patient_id} - {entry.patient.name}, Status: {entry.status}")
    except Exception as e:
        print(f"ERROR querying queue entries: {e}")
        import traceback
        traceback.print_exc()
        return []
    
    # Sort queue: IN_OPD first, then other patients by position, then referred by waiting time
    # Separate into 3 categories
    # 1. IN_OPD: Anyone currently being served (Queue.status = IN_OPD) - ALWAYS show at top
    in_opd_patients = [e for e in queue_entries if e.status == PatientStatus.IN_OPD]
    
    # 2. REFERRED: Patients waiting to be called who were referred (Patient.current_status = REFERRED and NOT in OPD)
    referred_patients = [e for e in queue_entries if e.patient.current_status == PatientStatus.REFERRED and e.status != PatientStatus.IN_OPD]
    
    # 3. OTHER: Regular waiting patients (PENDING, DILATED, etc.)
    other_patients = [e for e in queue_entries if e.status != PatientStatus.IN_OPD and e.patient.current_status != PatientStatus.REFERRED]
    
    # Sort referred patients by registration time (oldest first = longest waiting)
    referred_patients.sort(key=lambda x: x.patient.registration_time)
    
    # Combine: IN_OPD first (current patient), then other patients, then referred patients
    queue_entries = in_opd_patients + other_patients + referred_patients
    
    print(f"Queue order: {len(in_opd_patients)} IN_OPD + {len(other_patients)} other + {len(referred_patients)} referred")

    print("**** Building queue response ****")
    queue_data = []
    for entry in queue_entries:
        try:
            print(f"Processing: {entry.patient.name}, Status: {entry.status}")
            
            # Convert status for referred patients
            display_status = entry.status
            if entry.status == PatientStatus.REFERRED:
                display_status = PatientStatus.PENDING
            
            queue_item = QueueResponse(
                id=entry.id,
                patient_id=entry.patient_id,
                token_number=entry.patient.token_number,
                patient_name=entry.patient.name,
                position=entry.position,
                status=display_status,
                registration_time=entry.patient.registration_time,
                is_dilated=entry.patient.is_dilated if entry.patient.is_dilated is not None else False,
                dilation_time=entry.patient.dilation_time,
                age=entry.patient.age,
                phone=entry.patient.phone,
                is_referred=(entry.patient.current_status == PatientStatus.REFERRED),
                referred_from=entry.patient.referred_from,
                dilation_flag=entry.patient.dilation_flag
            )
            queue_data.append(queue_item)
            print(f"  ✓ Added to queue response")
        except Exception as e:
            print(f"  ✗ ERROR creating response for {entry.patient.name}: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"Returning {len(queue_data)} patients in queue")
    return queue_data

@router.post("/{opd_type}/call-next")
async def call_next_patient(
    opd_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    opd_type = opd_type.lower()
    
    # Check OPD access
    check_opd_access(current_user, opd_type, db)
    
    # Validate OPD exists and is active
    opd = db.query(OPD).filter(OPD.opd_code == opd_type, OPD.is_active == True).first()
    if not opd:
        raise HTTPException(status_code=404, detail="OPD not found or inactive")
    
    # CRITICAL: Check if there's already a patient IN_OPD
    # Exclude patients who were referred out of this OPD or have REFERRED status
    existing_in_opd = db.query(Queue).join(Patient).filter(
        Queue.opd_type == opd_type,
        Queue.status == PatientStatus.IN_OPD,
        # IMPORTANT: Exclude patients with REFERRED status (they're no longer in this OPD)
        Patient.current_status != PatientStatus.REFERRED
    ).filter(
        # Also exclude patients who were referred FROM this OPD to a DIFFERENT OPD
        # This is a backup check in case Patient.current_status wasn't updated
        ~(
            (Patient.referred_from == opd_type) & 
            (Patient.referred_to != opd_type) & 
            (Patient.referred_to.isnot(None))
        )
    ).first()
    
    if existing_in_opd:
        raise HTTPException(
            status_code=400, 
            detail=f"Another patient ({existing_in_opd.patient.token_number} - {existing_in_opd.patient.name}) is currently in OPD. Please complete or send them back first."
        )
    
    # Get all pending patients (including referred patients who can be called)
    pending_patients = db.query(Queue).join(Patient).filter(
        Queue.opd_type == opd_type,
        Queue.status.in_([PatientStatus.PENDING, PatientStatus.REFERRED])
    ).filter(
        # Apply the same exclusion filter as in get_opd_queue
        ~(
            (Patient.referred_from == opd_type) & 
            (Patient.referred_to != opd_type) & 
            (Patient.referred_to.isnot(None))
        )
    ).order_by(Queue.position).all()
    
    if not pending_patients:
        raise HTTPException(status_code=404, detail="No patients in queue")
    
    # Sort: Regular patients by position, then referred patients by waiting time
    regular_patients = [p for p in pending_patients if p.patient.current_status != PatientStatus.REFERRED]
    referred_patients = [p for p in pending_patients if p.patient.current_status == PatientStatus.REFERRED]
    
    # Sort referred patients by registration time (oldest first)
    referred_patients.sort(key=lambda x: x.patient.registration_time)
    
    # Get the first patient from regular queue, or first referred if no regular
    if regular_patients:
        next_patient = regular_patients[0]
    elif referred_patients:
        next_patient = referred_patients[0]
    else:
        raise HTTPException(status_code=404, detail="No patients in queue")
    
    if not next_patient:
        raise HTTPException(status_code=404, detail="No patients in queue")
    
    # Update queue status to IN_OPD
    next_patient.status = PatientStatus.IN_OPD
    next_patient.patient.current_room = f"opd_{opd_type}"
    next_patient.updated_at = get_ist_now()
    
    # IMPORTANT: If patient was referred TO this OPD, accept them fully
    # Update their status to IN_OPD and clear referral fields (they're now managed here)
    if (next_patient.patient.current_status == PatientStatus.REFERRED and 
        next_patient.patient.referred_to == opd_type):
        # Patient is being accepted in destination OPD
        next_patient.patient.current_status = PatientStatus.IN_OPD
        next_patient.patient.allocated_opd = opd_type  # Update primary OPD
        # Clear referral fields (referral is complete)
        next_patient.patient.referred_from = None
        next_patient.patient.referred_to = None
    elif next_patient.patient.current_status != PatientStatus.REFERRED:
        # Regular patient (not referred)
        next_patient.patient.current_status = PatientStatus.IN_OPD
    
    # Log patient flow
    flow_entry = PatientFlow(
        patient_id=next_patient.patient_id,
        from_room="waiting_area",
        to_room=f"opd_{opd_type}",
        status=PatientStatus.IN_OPD
    )
    db.add(flow_entry)
    db.commit()
    
    # Broadcast updates
    await broadcast_queue_update(opd_type, db)
    await broadcast_patient_status_update(next_patient.patient_id, PatientStatus.IN_OPD, db)
    await broadcast_display_update()
    
    return {
        "message": f"Patient {next_patient.patient.token_number} called",
        "patient": {
            "id": next_patient.patient_id,
            "token_number": next_patient.patient.token_number,
            "name": next_patient.patient.name,
            "position": next_patient.position
        }
    }

@router.post("/{opd_type}/dilate-patient/{patient_id}")
async def dilate_patient(
    opd_type: str,
    patient_id: int,
    payload: DilatePatientRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    opd_type = opd_type.lower()
    remarks = payload.remarks
    print("dilate patient: {remarks}")
    
    # Check OPD access
    check_opd_access(current_user, opd_type, db)
    
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # if patient.allocated_opd != opd_type:
    #     raise HTTPException(status_code=400, detail="Patient not in this OPD")
    
    # Update patient status
    patient.current_status = PatientStatus.DILATED
    patient.is_dilated = True
    patient.dilation_time = get_ist_now()
    patient.dilation_flag = True
    
    # Update queue status
    queue_entry = db.query(Queue).filter(
        Queue.patient_id == patient_id,
        Queue.opd_type == opd_type
    ).first()
    
    if queue_entry:
        queue_entry.status = PatientStatus.DILATED
        queue_entry.updated_at = get_ist_now()
    
    # Log patient flow
    flow_entry = PatientFlow(
        patient_id=patient_id,
        from_room=f"opd_{opd_type}",
        to_room="dilation_area",
        status=PatientStatus.DILATED,
        notes=remarks
    )
    db.add(flow_entry)
    db.commit()
    
    # Broadcast updates
    await broadcast_queue_update(opd_type, db)
    await broadcast_patient_status_update(patient_id, PatientStatus.DILATED, db)
    await broadcast_display_update()
    
    return {"message": f"Patient {patient.token_number} marked for dilation"}

@router.post("/{opd_type}/return-dilated/{patient_id}")
async def return_dilated_patient(
    opd_type: str,
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    opd_type = opd_type.lower()
    
    # Check OPD access
    check_opd_access(current_user, opd_type, db)
    
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if not patient.is_dilated:
        raise HTTPException(status_code=400, detail="Patient is not dilated")
    
    # Check if dilation time has passed (30-40 minutes)
    # if patient.dilation_time:
    #     time_since_dilation = get_ist_now() - patient.dilation_time
    #     if time_since_dilation < timedelta(minutes=30):
    #         remaining_time = 30 - int(time_since_dilation.total_seconds() / 60)
    #         raise HTTPException(
    #             status_code=400, 
    #             detail=f"Dilation time not complete. Please wait {remaining_time} more minutes"
    #         )
    
    # Update patient status back to IN_OPD
    patient.current_status = PatientStatus.PENDING
    patient.current_room = f"opd_{opd_type}"
    
    # Update queue status
    queue_entry = db.query(Queue).filter(
        Queue.patient_id == patient_id,
        Queue.opd_type == opd_type
    ).first()
    
    if queue_entry:
        queue_entry.status = PatientStatus.PENDING
        queue_entry.updated_at = get_ist_now()
    
    # Log patient flow
    flow_entry = PatientFlow(
        patient_id=patient_id,
        from_room="dilation_area",
        to_room=f"opd_{opd_type}",
        status=PatientStatus.PENDING,
        notes=f"Patient returned from dilation, dilation time - {patient.dilation_time}"
    )
    patient.is_dilated = False
    patient.dilation_time = None
    db.add(flow_entry)
    db.commit()
    
    # Broadcast updates
    await broadcast_queue_update(opd_type, db)
    await broadcast_patient_status_update(patient_id, PatientStatus.IN_OPD, db)
    await broadcast_display_update()
    
    return {"message": f"Patient {patient.token_number} returned from dilation"}

@router.post("/{opd_type}/send-back-to-queue/{patient_id}")
async def send_back_to_queue(
    opd_type: str,
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    opd_type = opd_type.lower()
    
    # Check OPD access
    check_opd_access(current_user, opd_type, db)
    
    """Send a patient who was accidentally called back to the queue"""
    # Validate OPD exists and is active
    opd = db.query(OPD).filter(OPD.opd_code == opd_type, OPD.is_active == True).first()
    if not opd:
        raise HTTPException(status_code=404, detail="OPD not found or inactive")
    
    # Get the patient
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get the queue entry
    queue_entry = db.query(Queue).filter(
        Queue.patient_id == patient_id,
        Queue.opd_type == opd_type
    ).first()
    
    if not queue_entry:
        raise HTTPException(status_code=404, detail="Patient not in this OPD queue")
    
    # Check if patient is currently IN_OPD
    if queue_entry.status != PatientStatus.IN_OPD:
        raise HTTPException(status_code=400, detail=f"Patient is not currently in OPD (status: {queue_entry.status})")
    
    # Send back to queue - set status to PENDING
    queue_entry.status = PatientStatus.PENDING
    queue_entry.updated_at = get_ist_now()
    
    # Update patient status only if they're not referred
    if patient.current_status != PatientStatus.REFERRED:
        patient.current_status = PatientStatus.PENDING
    
    # Log patient flow
    flow_entry = PatientFlow(
        patient_id=patient_id,
        from_room=f"opd_{opd_type}",
        to_room="waiting_area",
        status=PatientStatus.PENDING,
        notes="Patient accidentally called - sent back to queue"
    )
    db.add(flow_entry)
    db.commit()
    
    # Broadcast updates
    await broadcast_queue_update(opd_type, db)
    await broadcast_patient_status_update(patient_id, PatientStatus.PENDING, db)
    await broadcast_display_update()
    
    return {
        "message": f"Patient {patient.token_number} sent back to queue",
        "patient": {
            "id": patient.id,
            "token_number": patient.token_number,
            "name": patient.name
        }
    }

@router.post("/{opd_type}/call-out-of-order/{patient_id}")
async def call_out_of_order(
    opd_type: str,
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    opd_type = opd_type.lower()
    
    # Check OPD access
    check_opd_access(current_user, opd_type, db)
    
    """Call a specific patient out of order (emergency or special case)"""
    # Validate OPD exists and is active
    opd = db.query(OPD).filter(OPD.opd_code == opd_type, OPD.is_active == True).first()
    if not opd:
        raise HTTPException(status_code=404, detail="OPD not found or inactive")
    
    # Get the patient
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get the queue entry
    queue_entry = db.query(Queue).filter(
        Queue.patient_id == patient_id,
        Queue.opd_type == opd_type
    ).first()
    
    if not queue_entry:
        raise HTTPException(status_code=404, detail="Patient not in this OPD queue")
    
    # Check if patient is currently PENDING or REFERRED
    if queue_entry.status not in [PatientStatus.PENDING, PatientStatus.REFERRED, PatientStatus.DILATED]:
        raise HTTPException(status_code=400, detail=f"Patient cannot be called (status: {queue_entry.status})")
    
    # Check if there's already a patient in OPD (with same exclusions as call_next)
    current_in_opd = db.query(Queue).join(Patient).filter(
        Queue.opd_type == opd_type,
        Queue.status == PatientStatus.IN_OPD,
        # IMPORTANT: Exclude patients with REFERRED status
        Patient.current_status != PatientStatus.REFERRED
    ).filter(
        # Also exclude patients who were referred out
        ~(
            (Patient.referred_from == opd_type) & 
            (Patient.referred_to != opd_type) & 
            (Patient.referred_to.isnot(None))
        )
    ).first()
    
    if current_in_opd:
        raise HTTPException(
            status_code=400, 
            detail=f"Another patient ({current_in_opd.patient.token_number}) is currently in OPD. Please complete or send them back first."
        )
    
    # Call the patient out of order
    queue_entry.status = PatientStatus.IN_OPD
    queue_entry.updated_at = get_ist_now()
    
    # Update patient status and room
    patient.current_room = f"opd_{opd_type}"
    
    # IMPORTANT: If patient was referred TO this OPD, accept them fully
    if (patient.current_status == PatientStatus.REFERRED and 
        patient.referred_to == opd_type):
        # Patient is being accepted in destination OPD
        patient.current_status = PatientStatus.IN_OPD
        patient.allocated_opd = opd_type  # Update primary OPD
        # Clear referral fields (referral is complete)
        patient.referred_from = None
        patient.referred_to = None
    elif patient.current_status != PatientStatus.REFERRED:
        # Regular patient (not referred)
        patient.current_status = PatientStatus.IN_OPD
    
    # Log patient flow
    flow_entry = PatientFlow(
        patient_id=patient_id,
        from_room="waiting_area",
        to_room=f"opd_{opd_type}",
        status=PatientStatus.IN_OPD,
        notes="Patient called out of order"
    )
    db.add(flow_entry)
    db.commit()
    
    # Broadcast updates
    await broadcast_queue_update(opd_type, db)
    await broadcast_patient_status_update(patient_id, PatientStatus.IN_OPD, db)
    await broadcast_display_update()
    
    return {
        "message": f"Patient {patient.token_number} called out of order",
        "patient": {
            "id": patient.id,
            "token_number": patient.token_number,
            "name": patient.name,
            "position": queue_entry.position
        }
    }

@router.get("/{opd_type}/stats", response_model=OPDStats)
async def get_opd_stats(
    opd_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    opd_type = opd_type.lower()
    
    # Check OPD access
    check_opd_access(current_user, opd_type, db)
    
    # Validate OPD exists and is active
    opd = db.query(OPD).filter(OPD.opd_code == opd_type, OPD.is_active == True).first()
    if not opd:
        raise HTTPException(status_code=404, detail="OPD not found or inactive")
    
    today = get_ist_now().date()
    
    # Get queue statistics
    total_patients = db.query(Queue).filter(Queue.opd_type == opd_type).count()
    pending_patients = db.query(Queue).filter(
        Queue.opd_type == opd_type,
        Queue.status == PatientStatus.PENDING
    ).count()
    in_opd_patients = db.query(Queue).filter(
        Queue.opd_type == opd_type,
        Queue.status == PatientStatus.IN_OPD
    ).count()
    dilated_patients = db.query(Queue).filter(
        Queue.opd_type == opd_type,
        Queue.status == PatientStatus.DILATED
    ).count()
    referred_patients = db.query(Queue).filter(
        Queue.opd_type == opd_type,
        Queue.status == PatientStatus.REFERRED
    ).count()
    
    # Get completed patients today
    completed_today = db.query(Patient).filter(
        Patient.current_status == PatientStatus.COMPLETED,
        func.date(Patient.completed_at) == today
    ).count()
    
    # Calculate average waiting time (simplified)
    avg_waiting_time = None
    completed_patients = db.query(Patient).filter(
        Patient.current_status == PatientStatus.COMPLETED,
        func.date(Patient.completed_at) == today
    ).all()
    
    if completed_patients:
        total_waiting_time = 0
        for patient in completed_patients:
            if patient.completed_at:
                waiting_time = (patient.completed_at - patient.registration_time).total_seconds() / 60
                total_waiting_time += waiting_time
        avg_waiting_time = total_waiting_time / len(completed_patients)
    
    return OPDStats(
        opd_type=opd_type,
        opd_name=opd.opd_name,
        total_patients=total_patients,
        pending_patients=pending_patients,
        in_opd_patients=in_opd_patients,
        dilated_patients=dilated_patients,
        referred_patients=referred_patients,
        completed_today=completed_today,
        avg_waiting_time=avg_waiting_time
    )

@router.get("/stats/all", response_model=List[OPDStats])
async def get_all_opd_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    stats = []
    # Get all active OPDs
    active_opds = db.query(OPD).filter(OPD.is_active == True).all()
    
    for opd in active_opds:
        try:
            opd_stats = await get_opd_stats(opd.opd_code, db, current_user)
            stats.append(opd_stats)
        except HTTPException:
            # Skip OPDs that have no data or are inactive
            continue
    
    return stats
