from database_sqlite import engine, Base, OPD, SessionLocal
from datetime import datetime

def migrate_opd_table():
    """Create OPD table and populate with default data"""
    
    # Create the OPD table
    Base.metadata.create_all(bind=engine)
    
    # Create a session
    db = SessionLocal()
    
    try:
        # Check if OPDs already exist
        existing_opds = db.query(OPD).count()
        if existing_opds > 0:
            print("OPD table already has data, skipping migration")
            return
        
        # Create default OPDs
        default_opds = [
            {
                "opd_code": "opd1",
                "opd_name": "OPD 1",
                "description": "General Eye Consultation",
                "is_active": True
            },
            {
                "opd_code": "opd2", 
                "opd_name": "OPD 2",
                "description": "Specialized Eye Care",
                "is_active": True
            },
            {
                "opd_code": "opd3",
                "opd_name": "OPD 3", 
                "description": "Advanced Eye Treatment",
                "is_active": True
            }
        ]
        
        for opd_data in default_opds:
            opd = OPD(**opd_data)
            db.add(opd)
        
        db.commit()
        print("Successfully created OPD table and populated with default data")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_opd_table()
