from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from database_sqlite import get_db, Patient, Queue, PatientStatus, OPD, get_ist_now
from auth import get_current_active_user, User
from .opd import get_opd_queue, get_queue_data
import pytz
ist = pytz.timezone('Asia/Kolkata')
router = APIRouter()

# Pydantic models
class DisplayQueueItem(BaseModel):
    position: int
    token_number: str
    patient_name: str
    status: PatientStatus
    waiting_time_minutes: Optional[int]
    is_dilated: bool

    class Config:
        from_attributes = True

class DisplayData(BaseModel):
    opd_type: str
    current_patient: Optional[DisplayQueueItem] or None
    next_patients: List[DisplayQueueItem]
    total_patients: int
    estimated_wait_time: Optional[int]

class AllOPDsDisplayData(BaseModel):
    opds: List[DisplayData]
    last_updated: datetime

@router.get("/opd/{opd_type}", response_model=DisplayData)
async def get_opd_display_data(
    opd_type: str,
    db: Session = Depends(get_db)
):
    # Normalize OPD code to lowercase for database lookup
    opd_type = opd_type.lower()
    unformatted_opd_data = get_queue_data(opd_type, db, None)
    formatted_opd_data = format_opd_data(opd_type, unformatted_opd_data)
    
    return formatted_opd_data

def format_opd_data(opd_type, opd_data):
    if len(opd_data) < 1:
        return DisplayData(
            opd_type=opd_type,
            current_patient = None, 
            next_patients = [],
            total_patients = 0,
            estimated_wait_time = 0
        )
    curr = opd_data[0]
    if curr.registration_time:
        waiting_time = int((get_ist_now() - curr.registration_time).total_seconds() / 60)
    
    current_patient = DisplayQueueItem(position=curr.position,
                                       token_number=curr.token_number,
                                       patient_name=curr.patient_name,
                                       status=curr.status,
                                       waiting_time_minutes=waiting_time,
                                       is_dilated=curr.is_dilated)

    next_patients = []
    for entry in opd_data[1:]:
        waiting_time = None
        if entry.registration_time:
            waiting_time = int((get_ist_now() - entry.registration_time).total_seconds() / 60)
        
        next_patients.append(DisplayQueueItem(
            position=entry.position,
            token_number=entry.token_number,
            patient_name=entry.patient_name,
            status=entry.status,
            waiting_time_minutes=waiting_time,
            is_dilated=entry.is_dilated
        ))

    total_patients = 0
    estimated_wait_time = 0
    formatted_opd_data = DisplayData(
        opd_type=opd_type,
        current_patient = current_patient, 
        next_patients = next_patients,
        total_patients = total_patients,
        estimated_wait_time = estimated_wait_time
    )

    return formatted_opd_data

@router.get("/all", response_model=AllOPDsDisplayData)
async def get_all_opds_display_data(
    db: Session = Depends(get_db)
):
    """Get display data for all OPDs - used by display screens"""
    try:
        opds_data = []
        
        # Get all active OPDs from database
        active_opds = db.query(OPD).filter(OPD.is_active == True).all()
        for opd in active_opds:
            unformatted_opd_data = get_queue_data(opd.opd_code, db, None)
            opd_data = format_opd_data(opd.opd_code, unformatted_opd_data)
            #opd_data = await get_opd_display_data(opd.opd_code, db)
            #print("********************")
            #print(opd_data)
            
            if opd_data is not None:
                opds_data.append(opd_data)
        


        return AllOPDsDisplayData(
            opds=opds_data,
            last_updated=get_ist_now()
        )
    except Exception as e:
        print(f"Error in get_all_opds_display_data: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching display data: {str(e)}")

@router.get("/")
async def get_display_home(
    db: Session = Depends(get_db)
):
    """Main display route - shows all OPDs with current status"""
    today = get_ist_now().date()
    
    # Get today's summary statistics
    total_patients_today = db.query(Patient).filter(
        func.date(Patient.registration_time) == today
    ).count()
    
    total_pending = db.query(Patient).filter(
        Patient.current_status == PatientStatus.PENDING
    ).count()
    
    total_in_opd = db.query(Patient).filter(
        Patient.current_status == PatientStatus.IN_OPD
    ).count()
    
    total_dilated = db.query(Patient).filter(
        Patient.current_status == PatientStatus.DILATED
    ).count()
    
    total_completed = db.query(Patient).filter(
        Patient.current_status == PatientStatus.COMPLETED,
        func.date(Patient.completed_at) == today
    ).count()
    
    # Get OPD-wise data
    opds_data = []
    active_opds = db.query(OPD).filter(OPD.is_active == True).all()
    for opd in active_opds:
        opd_data = await get_opd_display_data(opd.opd_code, db)
        opds_data.append(opd_data)
    
    return {
        "hospital_name": "Eye Hospital",
        "date": today.isoformat(),
        "time": get_ist_now().strftime("%H:%M:%S"),
        "summary": {
            "total_patients_today": total_patients_today,
            "total_pending": total_pending,
            "total_in_opd": total_in_opd,
            "total_dilated": total_dilated,
            "total_completed": total_completed
        },
        "opds": opds_data,
        "last_updated": get_ist_now().isoformat()
    }

@router.get("/opd/{opd_type}/waiting-list")
async def get_waiting_list(
    opd_type: str,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    unformatted_opd_data = get_queue_data(opd_type, db, None)
    print("******************************** ->>>>> ", len(unformatted_opd_data))
    waiting_list = []
    for entry in unformatted_opd_data:
        waiting_time = None
        if entry.registration_time:
            waiting_time = int((get_ist_now() - entry.registration_time).total_seconds() / 60)
        
        waiting_list.append({
            "position": entry.position,
            "token_number": entry.token_number,
            "patient_name": entry.patient_name,
            "age": entry.age,
            "status": entry.status,
            "waiting_time_minutes": waiting_time,
            "is_dilated": entry.is_dilated,
            "registration_time": entry.registration_time.isoformat()
        })
    
    return {
        "opd_type": opd_type,
        "waiting_list": waiting_list,
        "total_waiting": len(waiting_list)
    }

@router.get("/stats/overview")
async def get_display_overview(
    db: Session = Depends(get_db)
):
    """Get overview statistics for display screens"""
    today = get_ist_now().date()
    
    # Get today's statistics
    total_patients_today = db.query(Patient).filter(
        func.date(Patient.registration_time) == today
    ).count()
    
    total_pending = db.query(Patient).filter(
        Patient.current_status == PatientStatus.PENDING
    ).count()
    
    total_in_opd = db.query(Patient).filter(
        Patient.current_status == PatientStatus.IN_OPD
    ).count()
    
    total_dilated = db.query(Patient).filter(
        Patient.current_status == PatientStatus.DILATED
    ).count()
    
    total_completed = db.query(Patient).filter(
        Patient.current_status == PatientStatus.COMPLETED,
        func.date(Patient.completed_at) == today
    ).count()
    
    # Get OPD-wise counts
    opd_counts = {}
    active_opds = db.query(OPD).filter(OPD.is_active == True).all()
    for opd in active_opds:
        opd_type = opd.opd_code
        opd_pending = db.query(Queue).filter(
            Queue.opd_type == opd_type,
            Queue.status == PatientStatus.PENDING
        ).count()
        
        opd_in_progress = db.query(Queue).filter(
            Queue.opd_type == opd_type,
            Queue.status == PatientStatus.IN_OPD
        ).count()
        
        opd_dilated = db.query(Queue).filter(
            Queue.opd_type == opd_type,
            Queue.status == PatientStatus.DILATED
        ).count()
        
        opd_counts[opd_type] = {
            "pending": opd_pending,
            "in_progress": opd_in_progress,
            "dilated": opd_dilated,
            "total": opd_pending + opd_in_progress + opd_dilated
        }
    
    return {
        "date": today.isoformat(),
        "summary": {
            "total_patients_today": total_patients_today,
            "total_pending": total_pending,
            "total_in_opd": total_in_opd,
            "total_dilated": total_dilated,
            "total_completed": total_completed
        },
        "opd_counts": opd_counts,
        "last_updated": get_ist_now().isoformat()
    }
