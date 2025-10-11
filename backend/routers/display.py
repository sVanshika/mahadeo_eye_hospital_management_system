from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from database_sqlite import get_db, Patient, Queue, PatientStatus, OPD
from auth import get_current_active_user, User

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
    current_patient: Optional[DisplayQueueItem]
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
    # Get current patient (IN_OPD status)
    current_patient_query = db.query(Queue).join(Patient).filter(
        Queue.opd_type == opd_type,
        Queue.status == PatientStatus.IN_OPD,
        Patient.current_status != PatientStatus.COMPLETED  # Exclude completed patients
    ).order_by(Queue.position).first()
    
    current_patient = None
    if current_patient_query:
        waiting_time = None
        if current_patient_query.patient.registration_time:
            waiting_time = int((datetime.utcnow() - current_patient_query.patient.registration_time).total_seconds() / 60)
        
        current_patient = DisplayQueueItem(
            position=current_patient_query.position,
            token_number=current_patient_query.patient.token_number,
            patient_name=current_patient_query.patient.name,
            status=current_patient_query.status,
            waiting_time_minutes=waiting_time,
            is_dilated=current_patient_query.patient.is_dilated
        )
    
    # Get next patients (PENDING status)
    next_patients_query = db.query(Queue).join(Patient).filter(
        Queue.opd_type == opd_type,
        Queue.status == PatientStatus.PENDING,
        Patient.current_status != PatientStatus.COMPLETED  # Exclude completed patients
    ).order_by(Queue.position).limit(5).all()
    
    next_patients = []
    for entry in next_patients_query:
        waiting_time = None
        if entry.patient.registration_time:
            waiting_time = int((datetime.utcnow() - entry.patient.registration_time).total_seconds() / 60)
        
        next_patients.append(DisplayQueueItem(
            position=entry.position,
            token_number=entry.patient.token_number,
            patient_name=entry.patient.name,
            status=entry.status,
            waiting_time_minutes=waiting_time,
            is_dilated=entry.patient.is_dilated
        ))
    
    # Get total patients in queue
    total_patients = db.query(Queue).join(Patient).filter(
        Queue.opd_type == opd_type,
        Queue.status.in_([PatientStatus.PENDING, PatientStatus.IN_OPD, PatientStatus.DILATED]),
        Patient.current_status != PatientStatus.COMPLETED  # Exclude completed patients
    ).count()
    
    # Calculate estimated wait time (simplified)
    estimated_wait_time = None
    if next_patients:
        # Assume 10 minutes per patient on average
        estimated_wait_time = len(next_patients) * 10
    
    return DisplayData(
        opd_type=opd_type,
        current_patient=current_patient,
        next_patients=next_patients,
        total_patients=total_patients,
        estimated_wait_time=estimated_wait_time
    )

@router.get("/all", response_model=AllOPDsDisplayData)
async def get_all_opds_display_data(
    db: Session = Depends(get_db)
):
    """Get display data for all OPDs - used by display screens"""
    opds_data = []
    
    # Get all active OPDs from database
    active_opds = db.query(OPD).filter(OPD.is_active == True).all()
    for opd in active_opds:
        opd_data = await get_opd_display_data(opd.opd_code, db)
        opds_data.append(opd_data)
    
    return AllOPDsDisplayData(
        opds=opds_data,
        last_updated=datetime.utcnow()
    )

@router.get("/")
async def get_display_home(
    db: Session = Depends(get_db)
):
    """Main display route - shows all OPDs with current status"""
    today = datetime.utcnow().date()
    
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
        "time": datetime.utcnow().strftime("%H:%M:%S"),
        "summary": {
            "total_patients_today": total_patients_today,
            "total_pending": total_pending,
            "total_in_opd": total_in_opd,
            "total_dilated": total_dilated,
            "total_completed": total_completed
        },
        "opds": opds_data,
        "last_updated": datetime.utcnow().isoformat()
    }

@router.get("/opd/{opd_type}/waiting-list")
async def get_waiting_list(
    opd_type: str,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get detailed waiting list for an OPD"""
    waiting_patients = db.query(Queue).join(Patient).filter(
        Queue.opd_type == opd_type,
        Queue.status.in_([PatientStatus.PENDING, PatientStatus.DILATED]),
        Patient.current_status != PatientStatus.COMPLETED  # Exclude completed patients
    ).order_by(Queue.position).limit(limit).all()
    
    waiting_list = []
    for entry in waiting_patients:
        waiting_time = None
        if entry.patient.registration_time:
            waiting_time = int((datetime.utcnow() - entry.patient.registration_time).total_seconds() / 60)
        
        waiting_list.append({
            "position": entry.position,
            "token_number": entry.patient.token_number,
            "patient_name": entry.patient.name,
            "age": entry.patient.age,
            "status": entry.status,
            "waiting_time_minutes": waiting_time,
            "is_dilated": entry.patient.is_dilated,
            "registration_time": entry.patient.registration_time.isoformat()
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
    today = datetime.utcnow().date()
    
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
    for opd_type in str:
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
        "last_updated": datetime.utcnow().isoformat()
    }
