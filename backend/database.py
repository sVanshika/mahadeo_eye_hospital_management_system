from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum
import os
from dotenv import load_dotenv
import pytz

load_dotenv()

# IST timezone
ist = pytz.timezone('Asia/Kolkata')

# Helper function to get current IST time (naive for database compatibility)
def get_ist_now():
    return datetime.now(ist).replace(tzinfo=None)  # Return naive datetime in IST

# Database URL - PostgreSQL from environment variable
# Default connection string for "Eye-Hospital" database (update password in .env file)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:YOUR_PASSWORD@localhost:5432/Eye-Hospital")

# Handle PostgreSQL connection URL format (Render.com uses postgres:// but SQLAlchemy needs postgresql://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# URL encode the connection string properly if it contains unencoded special characters in password
from urllib.parse import urlparse, urlunparse, quote
if "@" in DATABASE_URL:
    try:
        # Parse the connection URL
        parsed = urlparse(DATABASE_URL)
        if parsed.password and "@" in parsed.password:
            # Password contains @, need to URL encode it
            # Reconstruct URL with properly encoded password
            netloc = f"{parsed.username}:{quote(parsed.password, safe='')}@{parsed.hostname}"
            if parsed.port:
                netloc += f":{parsed.port}"
            DATABASE_URL = urlunparse((
                parsed.scheme,
                netloc,
                parsed.path,
                parsed.params,
                parsed.query,
                parsed.fragment
            ))
    except Exception:
        # If parsing fails, try to manually encode the password part
        if "://" in DATABASE_URL and "@" in DATABASE_URL:
            # Extract parts
            scheme, rest = DATABASE_URL.split("://", 1)
            if "@" in rest:
                auth_part, host_part = rest.rsplit("@", 1)
                if ":" in auth_part:
                    username, password = auth_part.split(":", 1)
                    # URL encode the password
                    password_encoded = quote(password, safe='')
                    DATABASE_URL = f"{scheme}://{username}:{password_encoded}@{host_part}"

# Create engine with connection pooling for PostgreSQL
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Verify connections before using them
    echo=False  # Set to True for SQL query logging
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Enums
class PatientStatus(str, enum.Enum):
    PENDING = "pending"
    IN_OPD = "in"
    END_VISIT = "end_visit"
    DILATED = "dilated"
    REFERRED = "referred"
    COME_BACK = "come_back"
    COMPLETED = "completed"

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    REGISTRATION = "registration"
    NURSING = "nursing"

# OPDType enum removed - now using dynamic OPD table

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=get_ist_now)

class UserOPDAccess(Base):
    """Table to store which OPDs a nurse user can access"""
    __tablename__ = "user_opd_access"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    opd_code = Column(String, nullable=False)  # e.g., "opd1", "opd2"
    created_at = Column(DateTime, default=get_ist_now)
    
    # Relationships
    user = relationship("User", back_populates="opd_access")
    
# Add relationship to User model
User.opd_access = relationship("UserOPDAccess", back_populates="user", cascade="all, delete-orphan")

class OPD(Base):
    __tablename__ = "opds"
    
    id = Column(Integer, primary_key=True, index=True)
    opd_code = Column(String, unique=True, index=True, nullable=False)  # e.g., "opd1", "opd2"
    opd_name = Column(String, nullable=False)  # e.g., "OPD 1", "General OPD"
    description = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=get_ist_now)
    updated_at = Column(DateTime, default=get_ist_now)

class Room(Base):
    __tablename__ = "rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String, unique=True, index=True, nullable=False)
    room_name = Column(String, nullable=False)
    room_type = Column(String, nullable=False)  # vision, opd, refraction, retina, biometry
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=get_ist_now)

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    registration_number = Column(String, index=True)  # Hospital's original software registration number
    token_number = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    age = Column(Integer)  # Made optional
    phone = Column(String)
    registration_time = Column(DateTime, default=get_ist_now)
    current_status = Column(SQLEnum(PatientStatus), default=PatientStatus.PENDING)
    allocated_opd = Column(String)  # Now stores OPD code as string
    current_room = Column(String)
    is_dilated = Column(Boolean, default=False)
    dilation_time = Column(DateTime)
    referred_from = Column(String)
    referred_to = Column(String)
    completed_at = Column(DateTime)
    dilation_flag = Column(Boolean, default=False)

class Queue(Base):
    __tablename__ = "queues"
    
    id = Column(Integer, primary_key=True, index=True)
    opd_type = Column(String, nullable=False)  # Now stores OPD code as string
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    position = Column(Integer, nullable=False)
    status = Column(SQLEnum(PatientStatus), default=PatientStatus.PENDING)
    created_at = Column(DateTime, default=get_ist_now)
    updated_at = Column(DateTime, default=get_ist_now)
    
    patient = relationship("Patient", back_populates="queue_entries")

# Add relationship to Patient model
Patient.queue_entries = relationship("Queue", back_populates="patient")

class PatientFlow(Base):
    __tablename__ = "patient_flows"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    from_room = Column(String)
    to_room = Column(String)
    status = Column(SQLEnum(PatientStatus), nullable=False)
    timestamp = Column(DateTime, default=get_ist_now)
    notes = Column(String)
    
    patient = relationship("Patient")

# Helper functions for OPD access
def get_user_opd_access(db: SessionLocal, user_id: int):
    """
    Get list of OPD codes that a user has access to.
    Returns empty list if user has no access entries.
    Admin users should bypass this check (handled in auth layer).
    """
    access_entries = db.query(UserOPDAccess).filter(UserOPDAccess.user_id == user_id).all()
    return [entry.opd_code for entry in access_entries]

def user_has_opd_access(db: SessionLocal, user_id: int, opd_code: str) -> bool:
    """
    Check if a user has access to a specific OPD.
    Returns True if access exists, False otherwise.
    """
    access = db.query(UserOPDAccess).filter(
        UserOPDAccess.user_id == user_id,
        UserOPDAccess.opd_code == opd_code
    ).first()
    return access is not None

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
