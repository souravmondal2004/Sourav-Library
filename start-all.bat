@echo off
setlocal enabledelayedexpansion
title Scribd Platform Launcher

echo =======================================================
echo    Scribd Clone (Lumina) Platform Controller
echo =======================================================
echo.

:: 1. Check if backend is already running on port 8080
netstat -ano | findstr ":8080" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend server is ALREADY running on port 8080.
) else (
    echo [..] Starting Scribd Backend (Spring Boot)...
    start "Scribd Backend (Spring Boot)" cmd /k "call "%~dp0run-backend.bat""
    timeout /t 3 >nul
)

:: 2. Check if frontend is already running on port 5173
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Frontend server is ALREADY running on port 5173.
) else (
    echo [..] Starting Scribd Frontend (React + Vite)...
    start "Scribd Frontend (React Vite)" cmd /k "call "%~dp0run-frontend.bat""
    timeout /t 2 >nul
)

echo.
echo =======================================================
echo  Servers are active:
echo  - Frontend: http://localhost:5173
echo  - Backend:  http://localhost:8080
echo  - H2 DB:    http://localhost:8080/h2-console
echo =======================================================
echo.
echo Launching browser in 2 seconds...
timeout /t 2 >nul
start http://localhost:5173
