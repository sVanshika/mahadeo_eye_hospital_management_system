from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List
from pydantic import BaseModel
from database import get_db, User, UserRole, get_user_opd_access
from auth import (
    authenticate_user, create_access_token, get_password_hash,
    get_current_active_user, UserLogin, UserCreate, UserResponse, Token, ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter()

# Extended login response model
class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
    allowed_opds: List[str]  # OPD codes user has access to

@router.post("/login", response_model=LoginResponse)
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # Get user's allowed OPDs (only for nursing staff)
    allowed_opds = []
    if user.role == UserRole.NURSING:
        allowed_opds = get_user_opd_access(db, user.id)
    elif user.role == UserRole.ADMIN:
        # Admin has access to all OPDs
        from database import OPD
        all_opds = db.query(OPD).filter(OPD.is_active == True).all()
        allowed_opds = [opd.opd_code for opd in all_opds]
    # Registration staff doesn't need OPD access (allowed_opds remains empty)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role,
            is_active=user.is_active
        ),
        "allowed_opds": allowed_opds
    }

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new user
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

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user
