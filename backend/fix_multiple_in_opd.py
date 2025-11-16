"""
Database Cleanup Script: Fix Multiple IN_OPD Patients
This script identifies and fixes cases where multiple patients have IN_OPD status
in the same OPD, which should never happen.
"""

import os
import sys
from datetime import datetime
import pytz

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from database_sqlite import Base, Queue, Patient, PatientStatus, OPD, get_ist_now

# Database setup
DATABASE_URL = "sqlite:///./eye_hospital.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def fix_multiple_in_opd():
    """Fix OPDs that have multiple patients with IN_OPD status"""
    db = SessionLocal()
    
    try:
        print("\n" + "="*80)
        print("FIXING MULTIPLE IN_OPD PATIENTS")
        print("="*80 + "\n")
        
        # Get all active OPDs
        active_opds = db.query(OPD).filter(OPD.is_active == True).all()
        
        total_fixed = 0
        
        for opd in active_opds:
            opd_code = opd.opd_code
            print(f"\nChecking {opd.opd_name} ({opd_code})...")
            
            # Find all patients with IN_OPD status in this OPD
            # Exclude patients who were referred out
            in_opd_patients = db.query(Queue).join(Patient).filter(
                Queue.opd_type == opd_code,
                Queue.status == PatientStatus.IN_OPD
            ).filter(
                # Exclude patients who were referred FROM this OPD to a DIFFERENT OPD
                ~(
                    (Patient.referred_from == opd_code) & 
                    (Patient.referred_to != opd_code) & 
                    (Patient.referred_to.isnot(None))
                )
            ).order_by(Queue.position).all()
            
            if len(in_opd_patients) == 0:
                print(f"  [OK] No patients in OPD")
            elif len(in_opd_patients) == 1:
                print(f"  [OK] One patient in OPD: {in_opd_patients[0].patient.token_number} - {in_opd_patients[0].patient.name}")
            else:
                print(f"  [ERROR] Found {len(in_opd_patients)} patients with IN_OPD status:")
                
                for i, queue_entry in enumerate(in_opd_patients):
                    patient = queue_entry.patient
                    print(f"    {i+1}. Position {queue_entry.position}: {patient.token_number} - {patient.name}")
                
                # Keep the first one (lowest position), send others back to queue
                first_patient = in_opd_patients[0]
                print(f"\n  [ACTION] Keeping patient at position {first_patient.position}: {first_patient.patient.token_number}")
                
                # Send the rest back to PENDING
                for queue_entry in in_opd_patients[1:]:
                    patient = queue_entry.patient
                    print(f"  [ACTION] Sending back to queue: {patient.token_number} - {patient.name}")
                    
                    # Update queue status
                    queue_entry.status = PatientStatus.PENDING
                    queue_entry.updated_at = get_ist_now()
                    
                    # Update patient status if not referred
                    if patient.current_status != PatientStatus.REFERRED:
                        patient.current_status = PatientStatus.PENDING
                    
                    patient.current_room = None
                    
                    total_fixed += 1
                
                db.commit()
                print(f"  [FIXED] Corrected {len(in_opd_patients) - 1} patients")
        
        print("\n" + "="*80)
        print(f"CLEANUP COMPLETE: Fixed {total_fixed} patients across all OPDs")
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"\n[ERROR] Failed to fix database: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("\nThis script will fix multiple IN_OPD patients in the database.")
    print("It will keep the first patient (by position) and send others back to queue.\n")
    
    response = input("Do you want to continue? (yes/no): ").strip().lower()
    
    if response in ['yes', 'y']:
        fix_multiple_in_opd()
    else:
        print("Operation cancelled.")

