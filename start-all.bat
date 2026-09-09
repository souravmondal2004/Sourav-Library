@echo off
echo =======================================================
echo Starting Scribd Clone Platform (Frontend + Backend)
echo =======================================================
start "Scribd Backend (Spring Boot)" cmd /k "call "%~dp0run-backend.bat""
timeout /t 5 >nul
start "Scribd Frontend (React Vite)" cmd /k "call "%~dp0run-frontend.bat""
echo.
echo Both servers are starting!
echo Frontend will open at: http://localhost:5173
echo Backend API at:        http://localhost:8080
echo.
