import socketio
from fastapi import Depends
from sqlalchemy.orm import Session
from database_sqlite import get_db, Queue, Patient, OPDType, PatientStatus
from typing import List, Dict
import json

sio = socketio.AsyncServer(cors_allowed_origins="*")

@sio.event
async def connect(sid, environ):
    print(f"Client {sid} connected")

@sio.event
async def disconnect(sid):
    print(f"Client {sid} disconnected")

@sio.event
async def join_opd(sid, data):
    """Client joins a specific OPD room for real-time updates"""
    opd_type = data.get('opd_type')
    if opd_type:
        sio.enter_room(sid, f"opd_{opd_type}")
        print(f"Client {sid} joined OPD {opd_type}")

@sio.event
async def leave_opd(sid, data):
    """Client leaves an OPD room"""
    opd_type = data.get('opd_type')
    if opd_type:
        sio.leave_room(sid, f"opd_{opd_type}")
        print(f"Client {sid} left OPD {opd_type}")

async def broadcast_queue_update(opd_type: OPDType, db: Session):
    """Broadcast queue update to all clients in the OPD room"""
    # Get current queue for the OPD
    queue_entries = db.query(Queue).filter(
        Queue.opd_type == opd_type,
        Queue.status.in_([PatientStatus.PENDING, PatientStatus.IN_OPD])
    ).order_by(Queue.position).all()
    
    queue_data = []
    for entry in queue_entries:
        queue_data.append({
            "id": entry.id,
            "patient_id": entry.patient_id,
            "token_number": entry.patient.token_number,
            "patient_name": entry.patient.name,
            "position": entry.position,
            "status": entry.status,
            "registration_time": entry.patient.registration_time.isoformat(),
            "is_dilated": entry.patient.is_dilated
        })
    
    await sio.emit('queue_update', {
        'opd_type': opd_type,
        'queue': queue_data
    }, room=f"opd_{opd_type}")

async def broadcast_patient_status_update(patient_id: int, status: PatientStatus, db: Session):
    """Broadcast patient status update to all relevant OPDs"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return
    
    # Broadcast to the patient's allocated OPD
    if patient.allocated_opd:
        await sio.emit('patient_status_update', {
            'patient_id': patient_id,
            'token_number': patient.token_number,
            'status': status,
            'opd_type': patient.allocated_opd
        }, room=f"opd_{patient.allocated_opd}")
    
    # If patient is being referred, also broadcast to target OPD
    if status == PatientStatus.REFERRED and patient.referred_to:
        await sio.emit('patient_referral', {
            'patient_id': patient_id,
            'token_number': patient.token_number,
            'from_opd': patient.allocated_opd,
            'to_opd': patient.referred_to
        }, room=f"opd_{patient.referred_to}")

async def broadcast_display_update():
    """Broadcast update to all display screens"""
    await sio.emit('display_update', {'message': 'Queue updated'}, room='displays')

@sio.event
async def join_display(sid, data):
    """Client joins display room for general updates"""
    sio.enter_room(sid, 'displays')
    print(f"Display client {sid} connected")

@sio.event
async def leave_display(sid, data):
    """Client leaves display room"""
    sio.leave_room(sid, 'displays')
    print(f"Display client {sid} disconnected")
