#!/usr/bin/env python3
"""
Script to initialize default OPDs for Eye Hospital Patient Management System
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database_sqlite import Base, OPD, get_ist_now

def init_opds():
    """Initialize default OPDs"""
    
    # Database URL
    DATABASE_URL = "sqlite:///./eye_hospital.db"
    
    # Create engine
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("Creating default OPDs...")
        
        # Default OPDs
        opds_data = [
            {"opd_code": "opd1", "opd_name": "OPD 1", "description": "General Eye OPD 1"},
            {"opd_code": "opd2", "opd_name": "OPD 2", "description": "General Eye OPD 2"},
            {"opd_code": "opd3", "opd_name": "OPD 3", "description": "General Eye OPD 3"},
        ]
        
        for opd_data in opds_data:
            existing_opd = db.query(OPD).filter(OPD.opd_code == opd_data["opd_code"]).first()
            if not existing_opd:
                opd = OPD(
                    opd_code=opd_data["opd_code"],
                    opd_name=opd_data["opd_name"],
                    description=opd_data["description"],
                    is_active=True,
                    created_at=get_ist_now(),
                    updated_at=get_ist_now()
                )
                db.add(opd)
                print(f"[OK] OPD {opd_data['opd_code']} created")
            else:
                print(f"[OK] OPD {opd_data['opd_code']} already exists")
        
        # Commit all changes
        db.commit()
        print("[OK] OPD initialization completed successfully")
        
    except Exception as e:
        print(f"[ERROR] Error during initialization: {e}")
        db.rollback()
        import sys
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    print("Eye Hospital - OPD Initialization")
    print("=" * 40)
    init_opds()

