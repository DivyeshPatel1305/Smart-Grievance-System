@echo off
title Smart Grievance Portal - Backend
echo ========================================
echo  Smart Public Grievance Portal
echo  Starting Backend...
echo ========================================

set "PROJECT_ROOT=%~dp0"
set "PYTHON=%PROJECT_ROOT%backend\venv\Scripts\python.exe"
set "BACKEND=%PROJECT_ROOT%backend"

cd /d "%BACKEND%"

echo [1/3] Running migrations...
"%PYTHON%" manage.py migrate

echo [2/3] Seeding data...
"%PYTHON%" setup_data.py

echo [3/3] Starting Daphne server...
echo Backend will be at: http://127.0.0.1:8000
echo KEEP THIS WINDOW OPEN
echo ========================================
"%PYTHON%" -m daphne -b 127.0.0.1 -p 8000 grievance_platform.asgi:application

pause
