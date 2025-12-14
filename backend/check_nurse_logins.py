#!/usr/bin/env python3
"""
Script to check all nurse user login details and their OPD access
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from database import User, UserOPDAccess, OPD, UserRole

load_dotenv()

def check_nurse_logins():
    """Check all nurse users and their OPD access"""
    
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:YOUR_PASSWORD@localhost:5432/Eye-Hospital")
    
    # Handle postgres:// to postgresql:// conversion
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("NURSE LOGIN DETAILS AND OPD ACCESS")
        print("=" * 70)
        print()
        
        # Get all active nursing users
        nurse_users = db.query(User).filter(
            User.role == UserRole.NURSING,
            User.is_active == True
        ).all()
        
        if not nurse_users:
            print("❌ No active nurse users found in database.")
            print()
            print("Default nurse user should be created by running:")
            print("  python init_db.py")
            return
        
        print(f"Found {len(nurse_users)} active nurse user(s):")
        print()
        
        for idx, nurse in enumerate(nurse_users, 1):
            print(f"[{idx}] Username: {nurse.username}")
            print(f"    Email:    {nurse.email}")
            print(f"    User ID:  {nurse.id}")
            print(f"    Created:  {nurse.created_at}")
            
            # Get OPD access
            opd_access_entries = db.query(UserOPDAccess).filter(
                UserOPDAccess.user_id == nurse.id
            ).all()
            
            if opd_access_entries:
                opd_codes = [entry.opd_code for entry in opd_access_entries]
                print(f"    OPD Access: {', '.join(opd_codes)}")
                
                # Get OPD names
                opd_names = []
                for opd_code in opd_codes:
                    opd = db.query(OPD).filter(OPD.opd_code == opd_code).first()
                    if opd:
                        opd_names.append(f"{opd_code} ({opd.opd_name})")
                    else:
                        opd_names.append(f"{opd_code} (NOT FOUND)")
                
                print(f"    OPD Names:  {', '.join(opd_names)}")
            else:
                print(f"    OPD Access: ⚠️  NO OPD ACCESS ASSIGNED")
                print(f"    Status:     This nurse cannot access any OPDs!")
            
            print()
        
        print("=" * 70)
        print("ALL AVAILABLE OPDs:")
        print("=" * 70)
        
        all_opds = db.query(OPD).filter(OPD.is_active == True).order_by(OPD.opd_code).all()
        if all_opds:
            for opd in all_opds:
                print(f"  • {opd.opd_code}: {opd.opd_name}")
        else:
            print("  No OPDs found. Create OPDs via admin panel or API.")
        
        print()
        print("=" * 70)
        print("HOW TO ASSIGN OPD ACCESS:")
        print("=" * 70)
        print()
        print("1. Login as admin (username: admin, password: admin123)")
        print("2. Go to Admin Panel → Users")
        print("3. Find the nurse user and click 'Manage OPD Access'")
        print("4. Select the OPDs this nurse should access")
        print()
        print("OR use API:")
        print("  POST /api/admin/users/{user_id}/opd-access")
        print("  Body: { \"opd_codes\": [\"opd1\", \"opd2\"] }")
        print()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_nurse_logins()

