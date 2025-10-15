from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from database_sqlite import get_db, Patient, OPD
from auth import get_current_active_user, User, require_role, UserRole
from printing import printer_manager
from pydantic import BaseModel

router = APIRouter()

class PrintRequest(BaseModel):
    patient_id: int
    print_type: str  # 'token' or 'opd_slip'

@router.post("/print-token/{patient_id}")
async def print_token(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.REGISTRATION))
):
    """Print a patient token"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    success = printer_manager.print_token(
        token_number=patient.token_number,
        patient_name=patient.name,
        opd_number=patient.allocated_opd if patient.allocated_opd else None
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to print token")
    
    return {"message": "Token printed successfully"}

@router.post("/print-opd-slip/{patient_id}")
async def print_opd_slip(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.REGISTRATION))
):
    """Print an OPD slip"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if not patient.allocated_opd:
        raise HTTPException(status_code=400, detail="Patient not allocated to any OPD")
    
    # Calculate estimated wait time (simplified)
    estimated_wait = None
    if patient.registration_time:
        from datetime import datetime
        wait_minutes = int((datetime.utcnow() - patient.registration_time).total_seconds() / 60)
        estimated_wait = max(0, wait_minutes)
    
    success = printer_manager.print_opd_slip(
        token_number=patient.token_number,
        patient_name=patient.name,
        opd_number=patient.allocated_opd,
        registration_time=patient.registration_time.strftime("%Y-%m-%d %H:%M:%S"),
        estimated_wait=estimated_wait
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to print OPD slip")
    
    return {"message": "OPD slip printed successfully"}

@router.post("/test-printer")
async def test_printer(
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Test printer connection"""
    success = printer_manager.test_print()
    
    if not success:
        raise HTTPException(status_code=500, detail="Printer test failed")
    
    return {"message": "Printer test successful"}

@router.get("/printer-status")
async def get_printer_status(
    current_user: User = Depends(get_current_active_user)
):
    """Get printer status"""
    status = {
        "connected": printer_manager.printer is not None,
        "printer_ip": printer_manager.printer_ip,
        "printer_port": printer_manager.printer_port
    }
    
    return status
