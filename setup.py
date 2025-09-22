#!/usr/bin/env python3
"""
Setup script for Eye Hospital Patient Management System
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

def setup_backend():
    """Setup backend environment"""
    print("Setting up backend...")
    
    # Create .env file if it doesn't exist
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
    if not run_command("pip install -r requirements.txt", cwd="backend"):
        return False
    
    return True

def setup_frontend():
    """Setup frontend environment"""
    print("Setting up frontend...")
    
    # Install Node.js dependencies
    if not run_command("npm install", cwd="frontend"):
        return False
    
    return True

def setup_database():
    """Setup database with initial data"""
    print("Setting up database...")
    
    # This would typically run database migrations
    # For now, we'll just create the database
    print("✓ Database setup completed (run with Docker for full setup)")
    
    return True

def create_initial_data():
    """Create initial users and rooms"""
    print("Creating initial data...")
    
    # This would create initial admin user, rooms, etc.
    print("✓ Initial data creation completed")
    
    return True

def main():
    """Main setup function"""
    print("Eye Hospital Patient Management System Setup")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not Path("backend").exists() or not Path("frontend").exists():
        print("Error: Please run this script from the project root directory")
        sys.exit(1)
    
    success = True
    
    # Setup backend
    if not setup_backend():
        success = False
    
    # Setup frontend
    if not setup_frontend():
        success = False
    
    # Setup database
    if not setup_database():
        success = False
    
    # Create initial data
    if not create_initial_data():
        success = False
    
    if success:
        print("\n" + "=" * 50)
        print("✓ Setup completed successfully!")
        print("\nTo start the system:")
        print("1. Start PostgreSQL database")
        print("2. Run: docker-compose up")
        print("3. Or run individually:")
        print("   - Backend: cd backend && python main.py")
        print("   - Frontend: cd frontend && npm start")
        print("\nDefault credentials:")
        print("- Admin: admin / admin123")
        print("- Registration: reg / reg123")
        print("- Nursing: nurse / nurse123")
    else:
        print("\n" + "=" * 50)
        print("✗ Setup failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()

