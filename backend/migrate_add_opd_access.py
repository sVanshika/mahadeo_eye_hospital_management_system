"""
Database Migration Script: Add UserOPDAccess table
This script safely adds the user_opd_access table to existing database
and assigns ALL OPDs to existing nurse users (maintains current behavior)
"""

import sqlite3
from database_sqlite import Base, engine, SessionLocal, UserOPDAccess, User, OPD, UserRole
from sqlalchemy import inspect

def migrate_database():
    print("\n" + "="*60)
    print("DATABASE MIGRATION: Adding UserOPDAccess table")
    print("="*60 + "\n")
    
    # Create all tables (will only create missing ones)
    print("[1/4] Creating new tables...")
    Base.metadata.create_all(bind=engine)
    print("[OK] user_opd_access table created (if not exists)\n")
    
    # Check if table exists and has data
    db = SessionLocal()
    try:
        existing_count = db.query(UserOPDAccess).count()
        print(f"[2/4] Current OPD access entries: {existing_count}")
        
        if existing_count > 0:
            print("[!] Table already has data. Skipping migration.")
            print("   If you want to re-migrate, delete existing entries first.\n")
            return
        
        # Get all nurse users
        nurses = db.query(User).filter(User.role == UserRole.NURSING).all()
        print(f"\n[3/4] Found {len(nurses)} nurse user(s)")
        
        if len(nurses) == 0:
            print("   No nurses found. Migration complete (nothing to migrate).\n")
            return
        
        # Get all active OPDs
        opds = db.query(OPD).filter(OPD.is_active == True).all()
        print(f"[4/4] Found {len(opds)} active OPD(s)")
        
        if len(opds) == 0:
            print("   No active OPDs found. Skipping nurse assignments.\n")
            return
        
        print("\n" + "-"*60)
        print("ASSIGNING ALL OPDs TO ALL NURSES (preserving current access)")
        print("-"*60)
        
        # Assign ALL OPDs to ALL nurses (preserves current behavior)
        assignments_created = 0
        for nurse in nurses:
            print(f"\n   Nurse: {nurse.username} (ID: {nurse.id})")
            for opd in opds:
                # Check if assignment already exists
                existing = db.query(UserOPDAccess).filter(
                    UserOPDAccess.user_id == nurse.id,
                    UserOPDAccess.opd_code == opd.opd_code
                ).first()
                
                if not existing:
                    access = UserOPDAccess(
                        user_id=nurse.id,
                        opd_code=opd.opd_code
                    )
                    db.add(access)
                    assignments_created += 1
                    print(f"      [OK] Assigned {opd.opd_code} ({opd.opd_name})")
                else:
                    print(f"      [SKIP] Already assigned {opd.opd_code}")
        
        db.commit()
        
        print("\n" + "="*60)
        print(f"[OK] MIGRATION COMPLETE!")
        print(f"  Total OPD access entries created: {assignments_created}")
        print("="*60 + "\n")
        
        # Verification
        total_entries = db.query(UserOPDAccess).count()
        print(f"Verification: {total_entries} total OPD access entries in database")
        
        print("\n[INFO] NEXT STEPS:")
        print("  1. Admin can now modify nurse OPD assignments via Admin Panel")
        print("  2. Nurses will continue to have access to all OPDs (as before)")
        print("  3. Admin can restrict access by removing unwanted OPD assignments\n")
        
    except Exception as e:
        print(f"\n[ERROR] during migration: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    try:
        migrate_database()
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        exit(1)

