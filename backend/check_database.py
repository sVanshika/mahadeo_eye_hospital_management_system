#!/usr/bin/env python3
"""
Quick script to check what's in the database
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database_sqlite import Patient, Queue, OPD

DATABASE_URL = "sqlite:///./eye_hospital.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("\n=== CHECKING DATABASE ===\n")

# Check OPDs
print("OPDs in database:")
opds = db.query(OPD).all()
for opd in opds:
    print(f"  - Code: {opd.opd_code}, Name: {opd.opd_name}, Active: {opd.is_active}")

# Check Patients
print("\nPatients in database:")
patients = db.query(Patient).all()
for patient in patients:
    print(f"  - ID: {patient.id}, Token: {patient.token_number}, Name: {patient.name}")
    print(f"    Status: {patient.current_status}, Allocated OPD: {patient.allocated_opd}")

# Check Queue entries
print("\nQueue entries in database:")
queue_entries = db.query(Queue).all()
if not queue_entries:
    print("  *** NO QUEUE ENTRIES FOUND! ***")
else:
    for entry in queue_entries:
        print(f"  - OPD: {entry.opd_type}, Patient ID: {entry.patient_id}, Position: {entry.position}, Status: {entry.status}")

print("\n=== SUMMARY ===")
print(f"Total OPDs: {len(opds)}")
print(f"Total Patients: {len(patients)}")
print(f"Total Queue Entries: {len(queue_entries)}")

db.close()



