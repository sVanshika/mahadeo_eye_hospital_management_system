#!/usr/bin/env python3
"""
Migration script to add dilation_flag column to patients table
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import sqlite3

DATABASE_URL = "sqlite:///./eye_hospital.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

def add_dilation_flag_column():
    """Add dilation_flag column to patients table if it doesn't exist"""
    
    print("Checking if dilation_flag column exists...")
    
    # Connect directly to SQLite to check and add column
    db_path = "./eye_hospital.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(patients)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'dilation_flag' in columns:
            print("✓ dilation_flag column already exists")
            return
        
        # Add the column
        print("Adding dilation_flag column to patients table...")
        cursor.execute("ALTER TABLE patients ADD COLUMN dilation_flag BOOLEAN DEFAULT 0")
        conn.commit()
        print("✓ Successfully added dilation_flag column")
        
    except sqlite3.Error as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_dilation_flag_column()

