@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18+ is required. Install it and reopen this window.
  goto failed
)
node check-environment.js
if errorlevel 1 goto failed
node run.js %*
if errorlevel 1 goto failed
if not "%FOODTRUCK_NO_OPEN%"=="1" (
  start "" "%~dp0results\game.html"
  if errorlevel 1 (
    echo Browser launch failed. Open results\game.html manually.
    goto failed
  )
)
if not "%FOODTRUCK_NO_PAUSE%"=="1" pause
exit /b 0
:failed
echo Execution failed. See the message above. Existing files are preserved.
if not "%FOODTRUCK_NO_PAUSE%"=="1" pause
exit /b 1
