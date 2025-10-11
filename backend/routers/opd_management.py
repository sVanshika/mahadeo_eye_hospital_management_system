from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from database_sqlite import get_db, OPD
from auth import get_current_active_user, User, require_role, UserRole

router = APIRouter()

# Pydantic models
class OPDCreate(BaseModel):
    opd_code: str
    opd_name: str
    description: Optional[str] = None

class OPDUpdate(BaseModel):
    opd_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class OPDResponse(BaseModel):
    id: int
    opd_code: str
    opd_name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=List[OPDResponse])
async def get_opds(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all OPDs"""
    query = db.query(OPD)
    if active_only:
        query = query.filter(OPD.is_active == True)
    
    opds = query.order_by(OPD.opd_code).all()
    return opds

@router.get("/{opd_id}", response_model=OPDResponse)
async def get_opd(
    opd_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific OPD by ID"""
    opd = db.query(OPD).filter(OPD.id == opd_id).first()
    if not opd:
        raise HTTPException(status_code=404, detail="OPD not found")
    return opd

@router.post("/", response_model=OPDResponse)
async def create_opd(
    opd_data: OPDCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Create a new OPD (Admin only)"""
    # Check if OPD code already exists
    existing_opd = db.query(OPD).filter(OPD.opd_code == opd_data.opd_code).first()
    if existing_opd:
        raise HTTPException(status_code=400, detail="OPD code already exists")
    
    opd = OPD(
        opd_code=opd_data.opd_code,
        opd_name=opd_data.opd_name,
        description=opd_data.description,
        is_active=True
    )
    
    db.add(opd)
    db.commit()
    db.refresh(opd)
    
    return opd

@router.put("/{opd_id}", response_model=OPDResponse)
async def update_opd(
    opd_id: int,
    opd_data: OPDUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Update an OPD (Admin only)"""
    opd = db.query(OPD).filter(OPD.id == opd_id).first()
    if not opd:
        raise HTTPException(status_code=404, detail="OPD not found")
    
    # Update fields
    if opd_data.opd_name is not None:
        opd.opd_name = opd_data.opd_name
    if opd_data.description is not None:
        opd.description = opd_data.description
    if opd_data.is_active is not None:
        opd.is_active = opd_data.is_active
    
    opd.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(opd)
    
    return opd

@router.delete("/{opd_id}")
async def delete_opd(
    opd_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Delete an OPD (Admin only) - Soft delete by setting is_active to False"""
    opd = db.query(OPD).filter(OPD.id == opd_id).first()
    if not opd:
        raise HTTPException(status_code=404, detail="OPD not found")
    
    # Soft delete - set is_active to False
    opd.is_active = False
    opd.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": f"OPD {opd.opd_name} has been deactivated"}

@router.post("/{opd_id}/activate")
async def activate_opd(
    opd_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Activate an OPD (Admin only)"""
    opd = db.query(OPD).filter(OPD.id == opd_id).first()
    if not opd:
        raise HTTPException(status_code=404, detail="OPD not found")
    
    opd.is_active = True
    opd.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": f"OPD {opd.opd_name} has been activated"}
