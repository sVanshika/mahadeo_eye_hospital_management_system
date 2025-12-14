from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, User, UserRole, get_ist_now
import os
from dotenv import load_dotenv

import pytz
ist = pytz.timezone('Asia/Kolkata')

load_dotenv()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

# Pydantic models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str
    
    def __init__(self, **data):
        # Truncate password if it's too long
        if 'password' in data and len(data['password'].encode('utf-8')) > 72:
            data['password'] = data['password'][:72]
        super().__init__(**data)

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: UserRole
    
    def __init__(self, **data):
        # Truncate password if it's too long
        if 'password' in data and len(data['password'].encode('utf-8')) > 72:
            data['password'] = data['password'][:72]
        super().__init__(**data)

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    
    def __init__(self, **data):
        # Truncate password if it's too long
        if 'password' in data and data['password'] and len(data['password'].encode('utf-8')) > 72:
            data['password'] = data['password'][:72]
        super().__init__(**data)

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True

# Utility functions
def verify_password(plain_password, hashed_password):
    # Truncate password to 72 bytes if it's longer (bcrypt limitation)
    if len(plain_password.encode('utf-8')) > 72:
        plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    # Truncate password to 72 bytes if it's longer (bcrypt limitation)
    if len(password.encode('utf-8')) > 72:
        password = password[:72]
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = get_ist_now() + expires_delta
    else:
        expire = get_ist_now() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def authenticate_user(db: Session, username: str, password: str):
    print(f"Authenticating user: {username}")
    user = db.query(User).filter(User.username == username).first()
    print(f"User: {user}")
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def require_role(required_role: UserRole):
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role != required_role and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker

def check_opd_access(user: User, opd_code: str, db: Session):
    """
    Check if a user has access to a specific OPD.
    Raises HTTPException if user doesn't have access.
    
    Args:
        user: The current user object
        opd_code: The OPD code to check access for
        db: Database session
        
    Returns:
        True if user has access
        
    Raises:
        HTTPException: If user doesn't have access
    """
    # Admin has access to all OPDs
    if user.role == UserRole.ADMIN:
        return True
    
    # For nursing staff, check OPD access
    if user.role == UserRole.NURSING:
        from database import user_has_opd_access
        if user_has_opd_access(db, user.id, opd_code):
            return True
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have access to OPD '{opd_code}'. Please contact your administrator."
            )
    
    # Other roles (e.g., Registration) don't have OPD access
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Your role does not have OPD access"
    )

def require_opd_access(opd_code: str):
    """
    Dependency to check if user has access to a specific OPD.
    Admin users bypass this check (have access to all OPDs).
    Nursing users must have explicit OPD access.
    """
    def opd_access_checker(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ):
        check_opd_access(current_user, opd_code, db)
        return current_user
    
    return opd_access_checker