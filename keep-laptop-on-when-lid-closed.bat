@echo off
title Configure Laptop Lid Action for Scribd Server
echo ====================================================================
echo  Windows Power Config: Keep Server Running When Laptop Lid is Closed
echo ====================================================================
echo.
echo By default, Windows puts your laptop to SLEEP when you close the lid,
echo which pauses your CPU, shuts down servers, and cuts the network.
echo.
echo This tool configures Windows so that when plugged into power/charger:
echo   Closing the lid turns off the display, BUT keeps Windows & your
echo   Scribd server running continuously 24/7!
echo.
echo Applying configuration...

:: Set lid close action to "Do Nothing" (0) when plugged in (AC)
powercfg /setacvalueindex scheme_current sub_buttons lidaction 0
powercfg /setactive scheme_current

echo.
echo ====================================================================
echo  [SUCCESS] Configured!
echo  When your laptop is plugged in, closing the lid will now KEEP your
echo  Scribd backend & frontend running without interruption.
echo ====================================================================
echo.
pause
