@echo off
setlocal enabledelayedexpansion
title Sourav Library Android Builder

echo =======================================================
echo    Sourav Library Android APK Package Controller
echo =======================================================
echo.
echo  This script compiles and packages Sourav Library into
echo  an installable Android APK (.apk) for your smartphone.
echo =======================================================
echo.

set "ANDROID_DIR=%~dp0frontend\android"
set "JDK_DIR=C:\Users\soura\.jdks\ms-25.0.4.1"

if exist "%JDK_DIR%" (
    set "JAVA_HOME=%JDK_DIR%"
    set "PATH=%JDK_DIR%\bin;!PATH!"
    echo [+] Detected Java SDK at: %JDK_DIR%
)

echo.
echo Choose an option:
echo [1] Push changes to GitHub (Builds APK automatically in the Cloud)
echo [2] Build Android APK locally with Gradle
echo [3] Open project in Android Studio
echo.
set /p CHOICE="Select option [1, 2, or 3]: "

if "%CHOICE%"=="1" (
    echo.
    echo [+] Running GitHub sync to trigger cloud APK build...
    call "%~dp0sync-github.bat"
    echo.
    echo Check your build at: https://github.com/souravmondal2004/Sourav-Library/actions
    pause
    exit /b 0
)

if "%CHOICE%"=="2" (
    echo.
    echo [+] Building Android Debug APK...
    cd /d "%ANDROID_DIR%"
    if exist "gradlew.bat" (
        call gradlew.bat assembleDebug
    ) else (
        gradle assembleDebug
    )

    if exist "%ANDROID_DIR%\app\build\outputs\apk\debug\app-debug.apk" (
        echo.
        echo ===================================================
        echo [OK] SUCCESS! APK created at:
        echo %ANDROID_DIR%\app\build\outputs\apk\debug\app-debug.apk
        echo ===================================================
        explorer "%ANDROID_DIR%\app\build\outputs\apk\debug"
    ) else (
        echo [!] Local build requires Android SDK. Alternatively, use Option 1 to build via GitHub Actions.
    )
    pause
    exit /b 0
)

if "%CHOICE%"=="3" (
    echo.
    echo [+] Opening Android project in Android Studio...
    start "" "C:\Program Files\Android\Android Studio\bin\studio64.exe" "%ANDROID_DIR%" 2>nul
    if %ERRORLEVEL% NEQ 0 (
        start "" "%LOCALAPPDATA%\Programs\Android Studio\bin\studio64.exe" "%ANDROID_DIR%" 2>nul
    )
    pause
    exit /b 0
)

echo Invalid choice.
pause
