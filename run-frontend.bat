@echo off
set "NODE_DIR=C:\Users\soura\.nodejs\node-v20.18.0-win-x64"
if exist "%NODE_DIR%" set "PATH=%NODE_DIR%;%PATH%"
echo ===================================================
echo Starting Scribd Clone Frontend (React + Vite)
echo ===================================================
cd /d "%~dp0frontend"
npm run dev
pause
