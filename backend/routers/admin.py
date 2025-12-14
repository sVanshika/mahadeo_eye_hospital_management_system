from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, date, timedelta
from pydantic import BaseModel
from database import get_db, User, Room, Patient, Queue, PatientStatus, OPD, PatientFlow, UserRole, get_ist_now, UserOPDAccess, get_user_opd_access
from auth import get_current_active_user, User, require_role, UserCreate, UserResponse

router = APIRouter()

import pytz
ist = pytz.timezone('Asia/Kolkata')

# Pydantic models
class RoomCreate(BaseModel):
    room_number: str
    room_name: str
    room_type: str

class RoomResponse(BaseModel):
    id: int
    room_number: str
    room_name: str
    room_type: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    total_patients_today: int
    total_patients_pending: int
    total_patients_in_opd: int
    total_patients_dilated: int
    total_patients_completed: int
    avg_waiting_time: Optional[float]
    opd_stats: List[dict]

class PatientFlowResponse(BaseModel):
    id: int
    patient_id: int
    token_number: str
    patient_name: str
    from_room: Optional[str]
    to_room: Optional[str]
    status: PatientStatus
    timestamp: datetime
    notes: Optional[str]

    class Config:
        from_attributes = True

# OPD Access Management Models
class UserOPDAccessResponse(BaseModel):
    user_id: int
    username: str
    role: UserRole
    allowed_opds: List[str]  # List of OPD codes user has access to

class AssignOPDAccessRequest(BaseModel):
    opd_codes: List[str]  # List of OPD codes to assign to user

class OPDAccessDetailResponse(BaseModel):
    id: int
    user_id: int
    opd_code: str
    created_at: datetime

    class Config:
        from_attributes = True

# Room Management
@router.post("/rooms", response_model=RoomResponse)
async def create_room(
    room_data: RoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    # Check if room already exists
    if db.query(Room).filter(Room.room_number == room_data.room_number).first():
        raise HTTPException(status_code=400, detail="Room number already exists")
    
    db_room = Room(
        room_number=room_data.room_number,
        room_name=room_data.room_name,
        room_type=room_data.room_type
    )
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    
    return db_room

@router.get("/rooms", response_model=List[RoomResponse])
async def get_rooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    rooms = db.query(Room).filter(Room.is_active == True).all()
    return rooms

@router.put("/rooms/{room_id}/deactivate")
async def deactivate_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    room.is_active = False
    db.commit()
    
    return {"message": "Room deactivated successfully"}

# User Management
@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    # Check if user already exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    
    from auth import get_password_hash
    hashed_password = get_password_hash(user_data.password)
    
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@router.get("/users", response_model=List[UserResponse])
async def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    users = db.query(User).filter(User.is_active == True).all()
    return users

@router.put("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    
    user.is_active = False
    db.commit()
    
    return {"message": "User deactivated successfully"}

# OPD Access Management
@router.get("/users/{user_id}/opd-access", response_model=UserOPDAccessResponse)
async def get_user_opd_access_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Get all OPD codes that a user has access to"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's OPD access entries
    allowed_opds = get_user_opd_access(db, user_id)
    
    return UserOPDAccessResponse(
        user_id=user.id,
        username=user.username,
        role=user.role,
        allowed_opds=allowed_opds
    )

@router.post("/users/{user_id}/opd-access")
async def assign_opd_access(
    user_id: int,
    access_data: AssignOPDAccessRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Assign OPD access to a user (replaces existing assignments).
    Only applicable to Nursing role users.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only allow OPD access management for nursing staff
    if user.role != UserRole.NURSING:
        raise HTTPException(
            status_code=400, 
            detail="OPD access control is only applicable to Nursing staff"
        )
    
    # Validate that all OPD codes exist
    for opd_code in access_data.opd_codes:
        opd = db.query(OPD).filter(OPD.opd_code == opd_code, OPD.is_active == True).first()
        if not opd:
            raise HTTPException(
                status_code=400, 
                detail=f"OPD '{opd_code}' not found or inactive"
            )
    
    # Remove all existing OPD access for this user
    db.query(UserOPDAccess).filter(UserOPDAccess.user_id == user_id).delete()
    
    # Add new OPD access entries
    for opd_code in access_data.opd_codes:
        access_entry = UserOPDAccess(
            user_id=user_id,
            opd_code=opd_code
        )
        db.add(access_entry)
    
    db.commit()
    
    return {
        "message": f"OPD access updated for user '{user.username}'",
        "user_id": user_id,
        "allowed_opds": access_data.opd_codes
    }

@router.delete("/users/{user_id}/opd-access/{opd_code}")
async def remove_opd_access(
    user_id: int,
    opd_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Remove access to a specific OPD for a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Find and delete the access entry
    access_entry = db.query(UserOPDAccess).filter(
        UserOPDAccess.user_id == user_id,
        UserOPDAccess.opd_code == opd_code
    ).first()
    
    if not access_entry:
        raise HTTPException(
            status_code=404, 
            detail=f"User does not have access to OPD '{opd_code}'"
        )
    
    db.delete(access_entry)
    db.commit()
    
    return {
        "message": f"Access to OPD '{opd_code}' removed for user '{user.username}'"
    }

@router.get("/opd-access/all", response_model=List[UserOPDAccessResponse])
async def get_all_users_opd_access(
    role: Optional[UserRole] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Get OPD access for all users (optionally filtered by role)"""
    query = db.query(User).filter(User.is_active == True)
    
    if role:
        query = query.filter(User.role == role)
    
    users = query.all()
    
    result = []
    for user in users:
        allowed_opds = get_user_opd_access(db, user.id)
        result.append(UserOPDAccessResponse(
            user_id=user.id,
            username=user.username,
            role=user.role,
            allowed_opds=allowed_opds
        ))
    
    return result

# Dashboard and Analytics
@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    today = get_ist_now().date()
    
    # Get today's patient statistics
    total_patients_today = db.query(Patient).filter(
        func.date(Patient.registration_time) == today
    ).count()
    
    total_patients_pending = db.query(Patient).filter(
        Patient.current_status == PatientStatus.PENDING
    ).count()
    
    total_patients_in_opd = db.query(Patient).filter(
        Patient.current_status == PatientStatus.IN_OPD
    ).count()
    
    total_patients_dilated = db.query(Patient).filter(
        Patient.current_status == PatientStatus.DILATED
    ).count()
    
    total_patients_completed = db.query(Patient).filter(
        Patient.current_status == PatientStatus.COMPLETED,
        func.date(Patient.completed_at) == today
    ).count()
    
    # Calculate average waiting time
    completed_patients = db.query(Patient).filter(
        Patient.current_status == PatientStatus.COMPLETED,
        func.date(Patient.completed_at) == today
    ).all()
    
    avg_waiting_time = None
    if completed_patients:
        total_waiting_time = 0
        for patient in completed_patients:
            if patient.completed_at:
                waiting_time = (patient.completed_at - patient.registration_time).total_seconds() / 60
                total_waiting_time += waiting_time
        avg_waiting_time = total_waiting_time / len(completed_patients)
    
    # Get OPD-wise statistics
    opd_stats = []
    # Get all active OPDs from database
    active_opds = db.query(OPD).filter(OPD.is_active == True).all()
    for opd in active_opds:
        opd_type = opd.opd_code
        opd_patients = db.query(Patient).filter(Patient.allocated_opd == opd_type).count()
        opd_pending = db.query(Queue).filter(
            Queue.opd_type == opd_type,
            Queue.status == PatientStatus.PENDING
        ).count()
        opd_in_progress = db.query(Queue).filter(
            Queue.opd_type == opd_type,
            Queue.status == PatientStatus.IN_OPD
        ).count()
        opd_completed = db.query(Patient).filter(
            Patient.current_status == PatientStatus.COMPLETED,
            func.date(Patient.completed_at) == today
        ).count()
        
        opd_stats.append({
            "opd_type": opd_type,
            "total_patients": opd_patients,
            "pending": opd_pending,
            "in_progress": opd_in_progress,
            "completed_today": opd_completed
        })
    
    return DashboardStats(
        total_patients_today=total_patients_today,
        total_patients_pending=total_patients_pending,
        total_patients_in_opd=total_patients_in_opd,
        total_patients_dilated=total_patients_dilated,
        total_patients_completed=total_patients_completed,
        avg_waiting_time=avg_waiting_time,
        opd_stats=opd_stats
    )

@router.get("/patient-flows", response_model=List[PatientFlowResponse])
async def get_patient_flows(
    skip: int = 0,
    limit: int = 100,
    patient_id: Optional[int] = None,
    opd_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    query = db.query(PatientFlow).join(Patient)
    
    if patient_id:
        query = query.filter(PatientFlow.patient_id == patient_id)
    
    if opd_type:
        query = query.filter(Patient.allocated_opd == opd_type)
    
    if start_date:
        query = query.filter(func.date(PatientFlow.timestamp) >= start_date)
    
    if end_date:
        query = query.filter(func.date(PatientFlow.timestamp) <= end_date)
    
    flows = query.order_by(desc(PatientFlow.timestamp)).offset(skip).limit(limit).all()
    
    flow_data = []
    for flow in flows:
        flow_data.append(PatientFlowResponse(
            id=flow.id,
            patient_id=flow.patient_id,
            token_number=flow.patient.token_number,
            patient_name=flow.patient.name,
            from_room=flow.from_room,
            to_room=flow.to_room,
            status=flow.status,
            timestamp=flow.timestamp,
            notes=flow.notes
        ))
    
    return flow_data

@router.delete("/patients/{patient_id}")
async def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Delete a patient and all their associated records (flows, queues, etc.)
    Admin only operation.
    """
    # Find the patient
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Delete associated records
    # Delete patient flows
    db.query(PatientFlow).filter(PatientFlow.patient_id == patient_id).delete()
    
    # Delete queue entries
    db.query(Queue).filter(Queue.patient_id == patient_id).delete()
    
    # Delete the patient
    db.delete(patient)
    db.commit()
    
    return {
        "message": f"Patient {patient.name} (Token: {patient.token_number}) deleted successfully",
        "patient_id": patient_id
    }

@router.get("/reports/daily")
async def get_daily_report(
    report_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    if not report_date:
        report_date = get_ist_now().date()
    
    # Get all patients for the day
    patients = db.query(Patient).filter(
        func.date(Patient.registration_time) == report_date
    ).all()
    
    # Calculate statistics
    total_patients = len(patients)
    completed_patients = len([p for p in patients if p.current_status == PatientStatus.COMPLETED])
    pending_patients = len([p for p in patients if p.current_status == PatientStatus.PENDING])
    in_opd_patients = len([p for p in patients if p.current_status == PatientStatus.IN_OPD])
    dilated_patients = len([p for p in patients if p.current_status == PatientStatus.DILATED])
    referred_patients = len([p for p in patients if p.current_status == PatientStatus.REFERRED])
    
    # Calculate average processing time
    completed_with_times = [p for p in patients if p.current_status == PatientStatus.COMPLETED and p.completed_at]
    avg_processing_time = None
    if completed_with_times:
        total_time = sum((p.completed_at - p.registration_time).total_seconds() for p in completed_with_times)
        avg_processing_time = total_time / len(completed_with_times) / 60  # in minutes
    
    # OPD-wise breakdown
    opd_breakdown = {}
    # Get all active OPDs from database
    active_opds = db.query(OPD).filter(OPD.is_active == True).all()
    for opd in active_opds:
        opd_type = opd.opd_code
        opd_patients = [p for p in patients if p.allocated_opd == opd_type]
        opd_breakdown[opd_type] = {
            "total": len(opd_patients),
            "completed": len([p for p in opd_patients if p.current_status == PatientStatus.COMPLETED]),
            "pending": len([p for p in opd_patients if p.current_status == PatientStatus.PENDING]),
            "in_progress": len([p for p in opd_patients if p.current_status == PatientStatus.IN_OPD])
        }
    
    return {
        "date": report_date.isoformat(),
        "summary": {
            "total_patients": total_patients,
            "completed_patients": completed_patients,
            "pending_patients": pending_patients,
            "in_opd_patients": in_opd_patients,
            "dilated_patients": dilated_patients,
            "referred_patients": referred_patients,
            "completion_rate": (completed_patients / total_patients * 100) if total_patients > 0 else 0,
            "avg_processing_time_minutes": avg_processing_time
        },
        "opd_breakdown": opd_breakdown
    }
