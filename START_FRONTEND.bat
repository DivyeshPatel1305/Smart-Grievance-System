@echo off
title Smart Grievance Portal - Frontend
echo ========================================
echo  Smart Public Grievance Portal
echo  Starting Frontend...
echo ========================================

cd /d "%~dp0frontend"

echo Starting Vite dev server...
echo Frontend will be at: http://localhost:5173
echo KEEP THIS WINDOW OPEN
echo ========================================
npm run dev

pause
