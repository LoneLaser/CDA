# CDA Dev Server Launcher
$ProjectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$Url = "http://127.0.0.1:5173"

function Test-ServerReady {
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# If server already running, just open browser
if (Test-ServerReady) {
    Write-Host "Server already running. Opening browser..."
    Start-Process $Url
    exit 0
}

Write-Host "Starting CDA dev server..."

# Start Vite in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ProjectPath'; npm run dev"

# Wait up to 30s for server to be ready
Write-Host "Waiting for server to start..."
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-ServerReady) {
        Write-Host "Server ready. Opening browser..."
        Start-Process $Url
        exit 0
    }
}

# Fallback: open anyway
Write-Host "Opening browser (server may still be starting)..."
Start-Process $Url
