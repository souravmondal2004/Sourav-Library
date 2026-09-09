@echo off
setlocal enabledelayedexpansion
echo ===================================================
echo 🚀 Scribd Clone: Automatic GitHub Commit & Push
echo ===================================================
cd /d "%~dp0"

:: Check if git remote exists
git remote get-url origin >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] No GitHub remote 'origin' is configured yet.
    echo Please enter your GitHub repository URL:
    echo (Example: https://github.com/your-username/scribd-clone.git)
    set /p REPO_URL="Repository URL: "
    if "!REPO_URL!"=="" (
        echo [x] Error: No repository URL provided. Aborting.
        pause
        exit /b 1
    )
    git remote add origin "!REPO_URL!"
    echo [+] Added remote origin: !REPO_URL!
)

:: Get commit message from user or use default
echo.
set /p COMMIT_MSG="Enter commit message (Press Enter for auto timestamp): "
if "!COMMIT_MSG!"=="" (
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set dt=%%I
    set "TIMESTAMP=!dt:~0,4!-!dt:~4,2!-!dt:~6,2! !dt:~8,2!:!dt:~10,2!:!dt:~12,2!"
    set "COMMIT_MSG=auto-commit: updates at !TIMESTAMP!"
)

echo.
echo [+] Staging all changes...
git add -A

echo [+] Committing changes...
git commit -m "!COMMIT_MSG!"

echo [+] Pushing to GitHub (main branch)...
git push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo ===================================================
    echo ✅ Successfully committed and pushed to GitHub!
    echo ===================================================
) else (
    echo [!] Push failed or required authentication. Check your credentials.
)
pause
