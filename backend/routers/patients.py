from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from database_sqlite import get_db, Patient, Queue, PatientStatus, OPD, PatientFlow
from auth import get_current_active_user, User, require_role, UserRole
from websocket_manager import broadcast_queue_update, broadcast_patient_status_update, broadcast_display_update
import asyncio

router = APIRouter()

# Pydantic models
class PatientCreate(BaseModel):
    name: str
    age: int
    phone: Optional[str] = None

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    phone: Optional[str] = None
    current_status: Optional[PatientStatus] = None
    allocated_opd: Optional[str] = None
    current_room: Optional[str] = None
    is_dilated: Optional[bool] = None
    referred_from: Optional[str] = None
    referred_to: Optional[str] = None

class PatientResponse(BaseModel):
    id: int
    token_number: str
    name: str
    age: int
    phone: Optional[str]
    registration_time: datetime
    current_status: PatientStatus
    allocated_opd: Optional[str]
    current_room: Optional[str]
    is_dilated: bool
    dilation_time: Optional[datetime]
    referred_from: Optional[str]
    referred_to: Optional[str]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True

class QueueResponse(BaseModel):
    id: int
    patient_id: int
    token_number: str
    patient_name: str
    position: int
    status: PatientStatus
    registration_time: datetime
    is_dilated: bool

    class Config:
        from_attributes = True
class AllocateOPDRequest(BaseModel):
    opd_type: str

class ReferPatientRequest(BaseModel):
    to_opd: str
    remarks: str

class ReferredPatientResponse(BaseModel):
    id: int
    token_number: str
    name: str
    age: int
    registration_time: datetime
    from_opd: Optional[str]
    to_opd: Optional[str]
    status: str
    current_queue_status: Optional[str] = None  # Shows current status in the destination OPD queue

    class Config:
        from_attributes = True


# Helper function to generate token number
def generate_token_number(db: Session) -> str:
    today = datetime.now().strftime("%Y%m%d")
    last_token = db.query(Patient).filter(
        Patient.token_number.like(f"{today}%")
    ).order_by(Patient.id.desc()).first()
    
    if last_token:
        last_number = int(last_token.token_number.split('-')[-1])
        new_number = last_number + 1
    else:
        new_number = 1001
    
    return f"{today}-{new_number:04d}"

@router.post("/register", response_model=PatientResponse)
async def register_patient(
    patient_data: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.REGISTRATION))
):
    # Generate unique token number
    token_number = generate_token_number(db)
    
    # Create patient
    db_patient = Patient(
        token_number=token_number,
        name=patient_data.name,
        age=patient_data.age,
        phone=patient_data.phone,
        registration_time=datetime.now()
    )
    
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    
    # Log patient flow
    flow_entry = PatientFlow(
        patient_id=db_patient.id,
        to_room="registration",
        status=PatientStatus.PENDING
    )
    db.add(flow_entry)
    db.commit()
    
    return db_patient

# Place static route BEFORE any dynamic /{patient_id} routes to avoid conflicts
@router.get("/referred", response_model=List[ReferredPatientResponse])
async def list_referred_patients(
    from_opd: Optional[str] = Query(default=None, alias="from_opd"),
    to_opd: Optional[str] = Query(default=None, alias="to_opd"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Patient).filter(Patient.current_status == PatientStatus.REFERRED)
    
    # Get valid OPD codes from database
    valid_opds = {opd.opd_code for opd in db.query(OPD).filter(OPD.is_active == True).all()}
    if from_opd and from_opd in valid_opds:
        query = query.filter(Patient.referred_from == from_opd)
    if to_opd and to_opd in valid_opds:
        query = query.filter(Patient.referred_to == to_opd)

    patients = query.order_by(Patient.registration_time.asc()).all()

    result = []
    for p in patients:
        # Get current queue status in the destination OPD
        current_queue_status = None
        if p.referred_to:
            queue_entry = db.query(Queue).filter(
                Queue.patient_id == p.id,
                Queue.opd_type == p.referred_to
            ).first()
            if queue_entry:
                current_queue_status = queue_entry.status.value

        result.append(ReferredPatientResponse(
            id=p.id,
            token_number=p.token_number,
            name=p.name,
            age=p.age,
            registration_time=p.registration_time,
            from_opd=p.referred_from,
            to_opd=p.referred_to,
            status=p.current_status.value,
            current_queue_status=current_queue_status
        ))
    
    return result

@router.post("/{patient_id}/allocate-opd")
async def allocate_opd(
    patient_id: int,
    payload: AllocateOPDRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.REGISTRATION))
):
    print("patients.py: allocate_opd")
    opd_type = payload.opd_type
    
    # Validate OPD exists and is active
    opd = db.query(OPD).filter(OPD.opd_code == opd_type, OPD.is_active == True).first()
    if not opd:
        raise HTTPException(status_code=404, detail="OPD not found or inactive")
    
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Update patient OPD allocation
    patient.allocated_opd = opd_type
    patient.current_room = f"opd_{opd_type}"
    
    # Add to OPD queue
    max_position = db.query(func.max(Queue.position)).filter(
        Queue.opd_type == opd_type
    ).scalar() or 0
    
    queue_entry = Queue(
        opd_type=opd_type,
        patient_id=patient_id,
        position=max_position + 1,
        status=PatientStatus.PENDING
    )
    
    db.add(queue_entry)
    db.commit()
    
    # Log patient flow
    flow_entry = PatientFlow(
        patient_id=patient_id,
        from_room="registration",
        to_room=f"opd_{opd_type}",
        status=PatientStatus.PENDING
    )
    db.add(flow_entry)
    db.commit()
    
    # Broadcast updates
    await broadcast_queue_update(opd_type, db)
    await broadcast_display_update()
    
    return {"message": f"Patient allocated to {opd_type}", "queue_position": max_position + 1}

@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.put("/{patient_id}/status")
async def update_patient_status(
    patient_id: int,
    status: PatientStatus,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.NURSING))
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    old_status = patient.current_status
    patient.current_status = status
    
    # Handle special cases
    if status == PatientStatus.DILATED:
        patient.is_dilated = True
        patient.dilation_time = datetime.utcnow()
    elif status == PatientStatus.COMPLETED:
        patient.completed_at = datetime.utcnow()
        # Remove from queue
        db.query(Queue).filter(
            Queue.patient_id == patient_id,
            Queue.opd_type == patient.allocated_opd
        ).delete()
    
    # Update queue status
    queue_entry = db.query(Queue).filter(
        Queue.patient_id == patient_id,
        Queue.opd_type == patient.allocated_opd
    ).first()
    
    if queue_entry:
        queue_entry.status = status
        queue_entry.updated_at = datetime.utcnow()
    
    # Log patient flow
    flow_entry = PatientFlow(
        patient_id=patient_id,
        from_room=patient.current_room,
        status=status,
        notes=notes
    )
    db.add(flow_entry)
    db.commit()
    
    # Broadcast updates
    if patient.allocated_opd:
        await broadcast_queue_update(patient.allocated_opd, db)
    await broadcast_patient_status_update(patient_id, status, db)
    await broadcast_display_update()
    
    return {"message": f"Patient status updated to {status}"}

@router.post("/{patient_id}/refer")
async def refer_patient(
    patient_id: int,
    payload: ReferPatientRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.NURSING))
):
    to_opd = payload.to_opd
    remarks = payload.remarks
    
    # Validate target OPD exists and is active
    target_opd = db.query(OPD).filter(OPD.opd_code == to_opd, OPD.is_active == True).first()
    if not target_opd:
        raise HTTPException(status_code=404, detail="Target OPD not found or inactive")
    
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    from_opd = patient.allocated_opd
    patient.referred_from = from_opd if from_opd else None
    patient.referred_to = to_opd
    patient.current_status = PatientStatus.REFERRED

    # Keep patient in current OPD queue but mark their queue status as REFERRED
    if from_opd:
        queue_entry = db.query(Queue).filter(
            Queue.patient_id == patient_id,
            Queue.opd_type == from_opd
        ).first()
        if queue_entry:
            queue_entry.status = PatientStatus.REFERRED

    # Ensure patient is ALSO present in the destination OPD queue with REFERRED status
    # Create only if not already present
    to_queue_entry = db.query(Queue).filter(
        Queue.patient_id == patient_id,
        Queue.opd_type == to_opd
    ).first()
    if not to_queue_entry:
        max_position_to = db.query(func.max(Queue.position)).filter(
            Queue.opd_type == to_opd
        ).scalar() or 0
        to_queue_entry = Queue(
            opd_type=to_opd,
            patient_id=patient_id,
            position=max_position_to + 1,
            status=PatientStatus.REFERRED
        )
        db.add(to_queue_entry)
    else:
        # If exists, ensure status is REFERRED
        to_queue_entry.status = PatientStatus.REFERRED

    # Log patient flow
    flow_entry = PatientFlow(
        patient_id=patient_id,
        from_room=f"opd_{from_opd}" if from_opd else None,
        to_room=f"opd_{to_opd}",
        status=PatientStatus.REFERRED,
        notes=remarks
    )
    db.add(flow_entry)
    db.commit()

    # Broadcast updates (update both OPD queues and global display)
    if from_opd:
        await broadcast_queue_update(from_opd, db)
    await broadcast_queue_update(to_opd, db)
    await broadcast_patient_status_update(patient_id, PatientStatus.REFERRED, db)
    await broadcast_display_update()

    return {"message": f"Patient referred to {to_opd} and present in both queues as referred"}


class ReturnReferredPatientRequest(BaseModel):
    opd_code: str # The OPD from which the patient is being returned (i.e., the referred_to OPD)
    remarks: Optional[str] = None

@router.post("/{patient_id}/return-from-referral")
async def return_referred_patient(
    patient_id: int,
    payload: ReturnReferredPatientRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.NURSING))
):
    opd_code_from_payload = payload.opd_code # This is the OPD the patient was referred TO, and is now returning FROM
    remarks = payload.remarks

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if patient.current_status != PatientStatus.REFERRED:
        raise HTTPException(status_code=400, detail="Patient is not currently in 'REFERRED' status.")
    
    if patient.referred_to != opd_code_from_payload:
        raise HTTPException(status_code=400, detail=f"Patient was not referred to {opd_code_from_payload}. Referred to: {patient.referred_to}")

    original_opd_code = patient.referred_from
    if not original_opd_code:
        raise HTTPException(status_code=400, detail="Patient's original OPD (referred_from) is not set, cannot return.")

    # 1. Update Patient object
    patient.current_status = PatientStatus.PENDING
    patient.allocated_opd = original_opd_code
    patient.current_room = f"opd_{original_opd_code}"
    patient.referred_from = None
    patient.referred_to = None
    # Dilation status (is_dilated, dilation_time) is preserved as it's independent of referral status.
    
    # 2. Update Queue entry for the original OPD (where patient is returning TO)
    original_opd_queue_entry = db.query(Queue).filter(
        Queue.patient_id == patient_id,
        Queue.opd_type == original_opd_code
    ).first()

    if not original_opd_queue_entry:
        # This case should ideally not happen if the patient was properly referred and had an entry in their original OPD.
        # If it does, we'll create a new entry to ensure they are in the queue.
        max_position_original = db.query(func.max(Queue.position)).filter(
            Queue.opd_type == original_opd_code
        ).scalar() or 0
        original_opd_queue_entry = Queue(
            opd_type=original_opd_code,
            patient_id=patient_id,
            position=max_position_original + 1,
            status=PatientStatus.PENDING
        )
        db.add(original_opd_queue_entry)
    else:
        original_opd_queue_entry.status = PatientStatus.PENDING
        original_opd_queue_entry.updated_at = datetime.now()

    # 3. Update Queue entry for the OPD the patient was referred TO (where patient is returning FROM)
    referred_to_opd_queue_entry = db.query(Queue).filter(
        Queue.patient_id == patient_id,
        Queue.opd_type == opd_code_from_payload
    ).first()

    if referred_to_opd_queue_entry:
        # Mark as completed for this queue, as the patient is no longer being managed here.
        referred_to_opd_queue_entry.status = PatientStatus.COMPLETED 
        referred_to_opd_queue_entry.updated_at = datetime.now()
    # If not found, it might have been processed/removed already, which is acceptable.

    # 4. Log patient flow
    flow_entry = PatientFlow(
        patient_id=patient_id,
        from_room=f"opd_{opd_code_from_payload}",
        to_room=f"opd_{original_opd_code}",
        status=PatientStatus.PENDING, # Patient is now pending in their original OPD
        notes=remarks
    )
    db.add(flow_entry)
    db.commit()
    db.refresh(patient) # Refresh patient to get updated fields

    # 5. Broadcast updates
    await broadcast_queue_update(original_opd_code, db)
    await broadcast_queue_update(opd_code_from_payload, db) # Update the queue they left
    await broadcast_patient_status_update(patient_id, PatientStatus.PENDING, db)
    await broadcast_display_update()

    return {"message": f"Patient {patient.name} ({patient.token_number}) returned to original OPD: {original_opd_code}"}



    
'''
@router.get("/referred", response_model=List[ReferredPatientResponse])
async def list_referred_patients(
    from_opd: Optional[str] = Query(default=None, alias="from_opd"),
    to_opd: Optional[str] = Query(default=None, alias="to_opd"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    print("patients.py: list_referred_patients")
    print(from_opd)
    print(to_opd)
    query = db.query(Patient).filter(Patient.current_status == PatientStatus.REFERRED)

    # Get valid OPDs from database
    valid_opds = {opd.opd_code for opd in db.query(OPD).filter(OPD.is_active == True).all()}
    if from_opd and from_opd in valid_opds:
        query = query.filter(Patient.referred_from == from_opd)
    if to_opd and to_opd in valid_opds:
        query = query.filter(Patient.referred_to == to_opd)

    patients = query.order_by(Patient.registration_time.asc()).all()

    # Map to response with from_opd and to_opd strings
    result = []
    for p in patients:
        result.append(ReferredPatientResponse(
            id=p.id,
            token_number=p.token_number,
            name=p.name,
            age=p.age,
            registration_time=p.registration_time,
            from_opd=p.referred_from,
            to_opd=p.referred_to,
        ))

    return result
'''

@router.get("/", response_model=List[PatientResponse])
async def get_patients(
    skip: int = 0,
    limit: int = 100,
    status: Optional[PatientStatus] = None,
    latest: Optional[bool] = Query(False), # New parameter to fetch latest patients
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    print("get_patients")
    query = db.query(Patient)
    print("status", status)
    print("latest", latest)
    
    if status:
        query = query.filter(Patient.current_status == status)
    
    if latest:
        # If 'latest' is true, order by registration time descending and limit to 5
        patients = query.order_by(Patient.registration_time.desc()).limit(5).all()
        print("Fetching latest 5 patients.")
        for patient in patients:
            print(patient.name, "\t", patient.registration_time, "\t", patient.current_status, "\t", patient.allocated_opd)
    else:
        # Otherwise, apply skip and limit for general pagination
        patients = query.order_by(Patient.registration_time.desc()).offset(skip).limit(limit).all()
        print(f"Fetching patients with skip={skip}, limit={limit}.")
    
    
    return patients



@router.post("/{patient_id}/endvisit")
async def end_patient_visit(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.NURSING))
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Store current OPD and room for broadcasting and logging before clearing them
    opd_to_update = patient.allocated_opd
    print("opd_to_update", opd_to_update)
    from_room = patient.current_room
    print("from_room", from_room)

    # Update patient status and details
    patient.current_status = PatientStatus.COMPLETED
    patient.status = PatientStatus.COMPLETED
    patient.completed_at = datetime.now()
    patient.current_room = None # Patient is no longer in any active room
    patient.allocated_opd = None # Patient is no longer allocated to an OPD
    patient.referred_from = None # Clear referral status
    patient.referred_to = None # Clear referral status

    # Remove patient from ALL queue entries (they should not appear in any queue after completion)
    queue_entries = db.query(Queue).filter(Queue.patient_id == patient_id).all()
    print("queue_entries to remove", queue_entries)
    for queue_entry in queue_entries:
        db.delete(queue_entry)

    # Log patient flow
    flow_entry = PatientFlow(
        patient_id=patient_id,
        from_room=from_room,
        to_room="completed",
        status=PatientStatus.COMPLETED,
        notes="Patient visit completed"
    )
    db.add(flow_entry)
    db.commit()
    print("committed")
    db.refresh(patient) # Refresh patient object to reflect latest DB state

    # Broadcast updates
    
    if opd_to_update:
        await broadcast_queue_update(opd_to_update, db) # Update the queue they just left
    await broadcast_patient_status_update(patient_id, PatientStatus.COMPLETED, db)
    await broadcast_display_update()

    return {"message": f"Patient {patient.token_number} visit completed."}

@router.post("/{patient_id}/delete")
async def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    opd_to_update = patient.allocated_opd # Store for broadcasting before deletion

    # Delete associated queue entries
    db.query(Queue).filter(Queue.patient_id == patient_id).delete(synchronize_session=False)

    # Delete associated patient flow entries
    db.query(PatientFlow).filter(PatientFlow.patient_id == patient_id).delete(synchronize_session=False)

    # Delete the patient record
    db.delete(patient)
    db.commit()

    # Broadcast updates if the patient was in an active OPD queue
    if opd_to_update:
        await broadcast_queue_update(opd_to_update, db)
    await broadcast_display_update() # General display update

    return {"message": f"Patient {patient.token_number} and all associated records deleted successfully."}
