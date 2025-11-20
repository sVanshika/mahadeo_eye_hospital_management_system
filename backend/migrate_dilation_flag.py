#!/usr/bin/env python3
"""
Migration script to add dilation_flag column to patients table
Works with both SQLite (local) and PostgreSQL (Render)
"""

import os
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv

load_dotenv()

def add_dilation_flag_column():
    """Add dilation_flag column to patients table if it doesn't exist"""
    
    # Determine which database to use based on DATABASE_URL
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    if not DATABASE_URL:
        # Default to SQLite for local development
        DATABASE_URL = "sqlite:///./eye_hospital.db"
        connect_args = {"check_same_thread": False}
    else:
        connect_args = {}
    
    print(f"Connecting to database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
    
    # Check if column exists using SQLAlchemy inspector
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('patients')]
    
    if 'dilation_flag' in columns:
        print("✓ dilation_flag column already exists")
        return True
    
    # Add the column
    print("Adding dilation_flag column to patients table...")
    
    with engine.connect() as conn:
        try:
            if 'sqlite' in DATABASE_URL.lower():
                # SQLite syntax
                conn.execute(text("ALTER TABLE patients ADD COLUMN dilation_flag BOOLEAN DEFAULT 0"))
            else:
                # PostgreSQL syntax
                conn.execute(text("ALTER TABLE patients ADD COLUMN dilation_flag BOOLEAN DEFAULT FALSE"))
            
            conn.commit()
            print("✓ Successfully added dilation_flag column")
            return True
            
        except Exception as e:
            print(f"Error: {e}")
            conn.rollback()
            return False

if __name__ == "__main__":
    add_dilation_flag_column()

