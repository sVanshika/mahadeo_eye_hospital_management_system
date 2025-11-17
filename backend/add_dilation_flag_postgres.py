#!/usr/bin/env python3
"""
Migration script to add dilation_flag column to patients table (PostgreSQL)
For use on Render server
"""

import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Get DATABASE_URL from environment (Render sets this automatically)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/eye_hospital")

def add_dilation_flag_column():
    """Add dilation_flag column to patients table if it doesn't exist"""
    
    print("Connecting to database...")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            # Check if column exists
            print("Checking if dilation_flag column exists...")
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='patients' AND column_name='dilation_flag'
            """))
            
            if result.fetchone():
                print("✓ dilation_flag column already exists")
                return
            
            # Add the column
            print("Adding dilation_flag column to patients table...")
            conn.execute(text("ALTER TABLE patients ADD COLUMN dilation_flag BOOLEAN DEFAULT FALSE"))
            conn.commit()
            print("✓ Successfully added dilation_flag column")
            
        except Exception as e:
            print(f"Error: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    add_dilation_flag_column()

