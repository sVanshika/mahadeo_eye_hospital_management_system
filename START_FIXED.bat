@echo off
echo ========================================
echo Starting Eye Hospital System (FIXED)
echo ========================================
echo.

echo [1/2] Starting Backend...
cd backend
start "Backend Server" cmd /k "python main.py"
timeout /t 5 /nobreak >nul

echo [2/2] Starting Frontend...
cd ..\frontend
start "Frontend Server" cmd /k "npm start"

echo.
echo ========================================
echo Both servers starting...
echo ========================================
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Press F12 in browser to see console logs
echo ========================================
pause

