@echo off
setlocal

set "PROJECT=%~dp0"
set "PORT=5173"
set "URL=http://127.0.0.1:%PORT%"

echo Starting CDA dev server...

REM Check if server is already running
curl -s --max-time 1 "%URL%" >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo Server already running. Opening browser...
    start "" "%URL%"
    exit /b 0
)

REM Start the dev server in a new window
start "CDA Dev Server" cmd /k "cd /d "%PROJECT%" && npm run dev"

REM Wait for server to become available (up to 30s)
echo Waiting for server to start...
for /l %%i in (1,1,30) do (
    timeout /t 1 /nobreak >nul
    curl -s --max-time 1 "%URL%" >nul 2>&1
    if !ERRORLEVEL! == 0 (
        echo Server ready. Opening browser...
        start "" "%URL%"
        exit /b 0
    )
)

REM Fallback: open anyway
start "" "%URL%"
endlocal
