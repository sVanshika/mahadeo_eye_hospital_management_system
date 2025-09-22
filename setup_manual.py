#!/usr/bin/env python3
"""
Manual setup script for Eye Hospital Patient Management System (without Docker)
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def run_command(command, cwd=None):
    """Run a command and return success status"""
    try:
        result = subprocess.run(command, shell=True, cwd=cwd, check=True, capture_output=True, text=True)
        print(f"✓ {command}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ {command}")
        print(f"Error: {e.stderr}")
        return False

def check_python():
    """Check if Python is installed"""
    print("Checking Python installation...")
    try:
        result = subprocess.run([sys.executable, "--version"], capture_output=True, text=True)
        print(f"✓ Python found: {result.stdout.strip()}")
        return True
    except:
        print("✗ Python not found. Please install Python 3.11+ from https://python.org")
        return False

def check_node():
    """Check if Node.js is installed"""
    print("Checking Node.js installation...")
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        print(f"✓ Node.js found: {result.stdout.strip()}")
        return True
    except:
        print("✗ Node.js not found. Please install Node.js 18+ from https://nodejs.org")
        return False

def check_postgresql():
    """Check if PostgreSQL is available"""
    print("Checking PostgreSQL...")
    try:
        result = subprocess.run(["psql", "--version"], capture_output=True, text=True)
        print(f"✓ PostgreSQL found: {result.stdout.strip()}")
        return True
    except:
        print("✗ PostgreSQL not found. Please install PostgreSQL from https://postgresql.org")
        print("  Or use a cloud database service like Supabase, Railway, or Neon")
        return False

def setup_backend():
    """Setup backend environment"""
    print("\nSetting up backend...")
    
    # Create .env file
    env_file = Path("backend/.env")
    if not env_file.exists():
        env_content = """# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost/eye_hospital

# JWT Configuration
SECRET_KEY=your-secret-key-change-in-production-12345
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Server Configuration
HOST=0.0.0.0
PORT=8000

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Printer Configuration
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100
"""
        with open(env_file, 'w') as f:
            f.write(env_content)
        print("✓ Created backend/.env file")
    
    # Install Python dependencies
    if not run_command(f"{sys.executable} -m pip install -r requirements.txt", cwd="backend"):
        return False
    
    return True

def setup_frontend():
    """Setup frontend environment"""
    print("\nSetting up frontend...")
    
    # Install Node.js dependencies
    if not run_command("npm install", cwd="frontend"):
        return False
    
    return True

def create_database():
    """Create database and initialize data"""
    print("\nSetting up database...")
    
    # Try to create database
    try:
        # This will work if PostgreSQL is running locally
        from sqlalchemy import create_engine
        from database import Base
        from init_db import init_database
        
        # Set environment variable for database URL
        os.environ["DATABASE_URL"] = "postgresql://postgres:password@localhost/eye_hospital"
        
        # Initialize database
        init_database()
        print("✓ Database initialized successfully")
        return True
    except Exception as e:
        print(f"✗ Database setup failed: {e}")
        print("\nAlternative: Use a cloud database service")
        print("1. Go to https://supabase.com or https://railway.app")
        print("2. Create a new PostgreSQL database")
        print("3. Update the DATABASE_URL in backend/.env")
        print("4. Run: python backend/init_db.py")
        return False

def create_start_scripts():
    """Create start scripts for manual setup"""
    print("\nCreating start scripts...")
    
    # Backend start script
    backend_script = """@echo off
echo Starting Eye Hospital Backend...
cd backend
python main.py
pause
"""
    with open("start_backend.bat", "w") as f:
        f.write(backend_script)
    
    # Frontend start script
    frontend_script = """@echo off
echo Starting Eye Hospital Frontend...
cd frontend
npm start
pause
"""
    with open("start_frontend.bat", "w") as f:
        f.write(frontend_script)
    
    print("✓ Created start_backend.bat and start_frontend.bat")

def main():
    """Main setup function"""
    print("Eye Hospital Patient Management System - Manual Setup")
    print("=" * 60)
    
    # Check prerequisites
    if not check_python():
        return False
    if not check_node():
        return False
    if not check_postgresql():
        print("\nNote: You can still proceed and use a cloud database later")
    
    # Setup backend
    if not setup_backend():
        return False
    
    # Setup frontend
    if not setup_frontend():
        return False
    
    # Setup database
    create_database()
    
    # Create start scripts
    create_start_scripts()
    
    print("\n" + "=" * 60)
    print("✓ Manual setup completed!")
    print("\nTo start the system:")
    print("1. Start PostgreSQL database (if using local)")
    print("2. Run: start_backend.bat (in one terminal)")
    print("3. Run: start_frontend.bat (in another terminal)")
    print("\nAccess URLs:")
    print("- Frontend: http://localhost:3000")
    print("- Backend: http://localhost:8000")
    print("- API Docs: http://localhost:8000/docs")
    print("\nDefault credentials:")
    print("- Admin: admin / admin123")
    print("- Registration: reg / reg123")
    print("- Nursing: nurse / nurse123")
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        print("\n✗ Setup failed. Please check the errors above.")
        sys.exit(1)
    else:
        print("\n✓ Setup completed successfully!")
        input("\nPress Enter to continue...")

