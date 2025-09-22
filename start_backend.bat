@echo off
echo ========================================
echo Eye Hospital Backend Server
echo ========================================
echo Starting FastAPI server...
echo.
echo Note: Make sure PostgreSQL is running
echo If you don't have PostgreSQL, use a cloud database
echo.
cd backend
python main.py
pause

