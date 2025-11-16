"""Debug script to check queue query"""
from database_sqlite import SessionLocal, Queue, Patient, PatientStatus

db = SessionLocal()

opd_type = "opd1"

print(f"\n=== DEBUGGING QUEUE QUERY FOR {opd_type} ===\n")

# Check all queue entries
all_entries = db.query(Queue).filter(Queue.opd_type == opd_type).all()
print(f"Total queue entries for {opd_type}: {len(all_entries)}")
for entry in all_entries:
    print(f"  - ID: {entry.id}, Patient: {entry.patient_id}, Status: {entry.status}, Type: {type(entry.status)}")
    print(f"    Status value: '{entry.status.value if hasattr(entry.status, 'value') else entry.status}'")
    print(f"    Status == PatientStatus.PENDING: {entry.status == PatientStatus.PENDING}")
    print(f"    Status in [PENDING, IN_OPD, ...]: {entry.status in [PatientStatus.PENDING, PatientStatus.IN_OPD, PatientStatus.DILATED, PatientStatus.REFERRED]}")
    print()

print("\n=== TESTING QUERY WITH FILTER ===\n")

# Test the actual query
try:
    filtered_entries = db.query(Queue).join(Patient).filter(
        Queue.opd_type == opd_type,
        Queue.status.in_([PatientStatus.PENDING, PatientStatus.IN_OPD, PatientStatus.DILATED, PatientStatus.REFERRED])
    ).order_by(Queue.position).all()
    
    print(f"Filtered entries: {len(filtered_entries)}")
    for entry in filtered_entries:
        print(f"  - Patient: {entry.patient.name}, Status: {entry.status}")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

db.close()



