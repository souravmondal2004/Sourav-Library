@echo off
title Stop Scribd Platform Servers
echo =======================================================
echo    Stopping Scribd Clone Servers (Port 8080 & 5173)
echo =======================================================
echo.

set STOPPED_ANY=0

:: Terminate any process listening on 8080 (Spring Boot)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080" ^| findstr "LISTENING"') do (
    echo [+] Stopping Backend server on port 8080 (PID: %%a)...
    taskkill /f /pid %%a >nul 2>&1
    set STOPPED_ANY=1
)

:: Terminate any process listening on 5173 (Vite Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo [+] Stopping Frontend server on port 5173 (PID: %%a)...
    taskkill /f /pid %%a >nul 2>&1
    set STOPPED_ANY=1
)

echo.
if "%STOPPED_ANY%"=="1" (
    echo [SUCCESS] Both backend and frontend servers have been stopped.
) else (
    echo [INFO] No running Scribd servers were found on ports 8080 or 5173.
)
echo.
pause
