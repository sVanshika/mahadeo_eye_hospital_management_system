#!/usr/bin/env python3
"""
Script to quickly setup individual OPD logins for nurses
Usage: python setup_individual_opd_logins.py
"""

import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from database import User, UserOPDAccess, OPD, UserRole
from auth import get_password_hash

load_dotenv()

def setup_individual_opd_logins():
    """Setup individual nurse users for each OPD"""
    
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:YOUR_PASSWORD@localhost:5432/Eye-Hospital")
    
    # Handle postgres:// to postgresql:// conversion
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("SETUP INDIVIDUAL OPD LOGINS FOR NURSES")
        print("=" * 70)
        print()
        
        # Get all active OPDs
        opds = db.query(OPD).filter(OPD.is_active == True).order_by(OPD.opd_code).all()
        
        if not opds:
            print("❌ No active OPDs found!")
            print("Please create OPDs first via admin panel or API.")
            return
        
        print(f"Found {len(opds)} active OPD(s):")
        for opd in opds:
            print(f"  • {opd.opd_code}: {opd.opd_name}")
        print()
        
        # Ask user what they want to do
        print("What would you like to do?")
        print("1. Create individual nurses for each OPD (one nurse per OPD)")
        print("2. Check existing nurses and their OPD access")
        print("3. Assign OPD access to existing nurses")
        print("4. Exit")
        print()
        
        choice = input("Enter choice (1-4): ").strip()
        
        if choice == "1":
            create_nurses_for_each_opd(db, opds)
        elif choice == "2":
            check_existing_nurses(db)
        elif choice == "3":
            assign_opd_access_interactive(db, opds)
        elif choice == "4":
            print("Exiting...")
            return
        else:
            print("Invalid choice!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def create_nurses_for_each_opd(db, opds):
    """Create a nurse user for each OPD"""
    print()
    print("=" * 70)
    print("CREATING INDIVIDUAL NURSES FOR EACH OPD")
    print("=" * 70)
    print()
    
    created_users = []
    
    for opd in opds:
        username = f"nurse_{opd.opd_code}"
        
        # Check if user already exists
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            print(f"⏭️  User '{username}' already exists. Skipping...")
            continue
        
        # Create password (simple format: opd1pass, opd2pass, etc.)
        password = f"{opd.opd_code}pass123"
        
        # Create nurse user
        nurse_user = User(
            username=username,
            email=f"nurse_{opd.opd_code}@hospital.com",
            hashed_password=get_password_hash(password),
            role=UserRole.NURSING,
            is_active=True
        )
        db.add(nurse_user)
        db.flush()  # Get the ID
        
        # Assign OPD access
        opd_access = UserOPDAccess(
            user_id=nurse_user.id,
            opd_code=opd.opd_code
        )
        db.add(opd_access)
        
        created_users.append({
            'username': username,
            'password': password,
            'opd_code': opd.opd_code,
            'user_id': nurse_user.id
        })
        
        print(f"✅ Created: {username} (password: {password}) → Access to {opd.opd_code}")
    
    if created_users:
        db.commit()
        print()
        print("=" * 70)
        print("✅ SUCCESS! Created the following nurse users:")
        print("=" * 70)
        print()
        print(f"{'Username':<20} {'Password':<20} {'OPD Access':<15}")
        print("-" * 70)
        for user_info in created_users:
            print(f"{user_info['username']:<20} {user_info['password']:<20} {user_info['opd_code']:<15}")
        print()
        print("These nurses can now log in with their individual credentials!")
    else:
        print("No new users created.")


def check_existing_nurses(db):
    """Check existing nurses and their OPD access"""
    print()
    print("=" * 70)
    print("EXISTING NURSE USERS AND OPD ACCESS")
    print("=" * 70)
    print()
    
    nurses = db.query(User).filter(
        User.role == UserRole.NURSING,
        User.is_active == True
    ).all()
    
    if not nurses:
        print("No nurse users found.")
        return
    
    print(f"{'Username':<20} {'Email':<30} {'OPD Access':<20}")
    print("-" * 70)
    
    for nurse in nurses:
        opd_access = db.query(UserOPDAccess).filter(
            UserOPDAccess.user_id == nurse.id
        ).all()
        
        opd_codes = [entry.opd_code for entry in opd_access]
        opd_str = ', '.join(opd_codes) if opd_codes else "NO ACCESS"
        
        print(f"{nurse.username:<20} {nurse.email:<30} {opd_str:<20}")


def assign_opd_access_interactive(db, opds):
    """Interactive assignment of OPD access"""
    print()
    print("=" * 70)
    print("ASSIGN OPD ACCESS TO EXISTING NURSE")
    print("=" * 70)
    print()
    
    # Get all nurses
    nurses = db.query(User).filter(
        User.role == UserRole.NURSING,
        User.is_active == True
    ).all()
    
    if not nurses:
        print("No nurse users found. Create nurses first.")
        return
    
    # List nurses
    print("Available nurses:")
    for idx, nurse in enumerate(nurses, 1):
        print(f"{idx}. {nurse.username} ({nurse.email})")
    print()
    
    try:
        nurse_idx = int(input("Select nurse number: ").strip()) - 1
        if nurse_idx < 0 or nurse_idx >= len(nurses):
            print("Invalid selection!")
            return
        
        selected_nurse = nurses[nurse_idx]
        
        # List OPDs
        print()
        print("Available OPDs:")
        for idx, opd in enumerate(opds, 1):
            print(f"{idx}. {opd.opd_code} - {opd.opd_name}")
        print()
        
        opd_selection = input("Enter OPD numbers (comma-separated, e.g., 1,2,3): ").strip()
        opd_indices = [int(x.strip()) - 1 for x in opd_selection.split(',')]
        
        selected_opds = []
        for idx in opd_indices:
            if 0 <= idx < len(opds):
                selected_opds.append(opds[idx].opd_code)
        
        if not selected_opds:
            print("No valid OPDs selected!")
            return
        
        # Remove existing access
        db.query(UserOPDAccess).filter(UserOPDAccess.user_id == selected_nurse.id).delete()
        
        # Add new access
        for opd_code in selected_opds:
            access = UserOPDAccess(
                user_id=selected_nurse.id,
                opd_code=opd_code
            )
            db.add(access)
        
        db.commit()
        
        print()
        print(f"✅ Assigned OPD access to {selected_nurse.username}: {', '.join(selected_opds)}")
        
    except (ValueError, IndexError) as e:
        print(f"Invalid input: {e}")


if __name__ == "__main__":
    print()
    print("⚠️  Note: This script requires admin privileges.")
    print("Make sure you have the correct DATABASE_URL in your .env file.")
    print()
    confirm = input("Continue? (y/n): ").strip().lower()
    if confirm == 'y':
        setup_individual_opd_logins()
    else:
        print("Cancelled.")

