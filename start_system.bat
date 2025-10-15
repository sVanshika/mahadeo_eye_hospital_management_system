@echo off
echo ========================================
echo Eye Hospital Patient Management System
echo ========================================
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && python main.py"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo System Starting...
echo ========================================
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Login Credentials:
echo - Admin: admin / admin123
echo - Registration: reg / reg123
echo - Nursing: nurse / nurse123
echo.
echo Press any key to exit...
pause >nul

