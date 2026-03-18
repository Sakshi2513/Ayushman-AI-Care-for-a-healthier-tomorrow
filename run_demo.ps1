# ==========================================
# AI Care Assistant – FINAL WORKING SCRIPT
# ==========================================

function Get-FreePort {
    param([int]$start = 8000, [int]$end = 9000)
    for ($p = $start; $p -le $end; $p++) {
        try {
            $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $p)
            $listener.Start()
            $listener.Stop()
            return $p
        } catch { }
    }
    throw "No free ports found"
}

cd "$PSScriptRoot"

# ---------------- BACKEND ----------------
$venvPath = "$PSScriptRoot\backend\.venv\Scripts\Activate.ps1"

if (-not (Test-Path $venvPath)) {
    python -m venv backend\.venv
}

& $venvPath

pip install --upgrade pip
pip install -r backend\requirements.txt

$backendPort = Get-FreePort -start 8020 -end 8100
Write-Host "Backend running on port $backendPort"

# Start backend (IMPORTANT FIX HERE)
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd `"$PSScriptRoot`"; python -m uvicorn backend.main:app --reload --port $backendPort"
)

Start-Sleep -Seconds 5

# ---------------- FRONTEND ----------------
$frontendPort = Get-FreePort -start 5173 -end 5200
Write-Host "Frontend running on port $frontendPort"

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd `"$PSScriptRoot\frontend`"; set VITE_API_BASE=http://localhost:$backendPort; npm install; npm run dev -- --port $frontendPort"
)

Start-Sleep -Seconds 5

# ---------------- OPEN BROWSER ----------------
Start-Process "http://localhost:$frontendPort"

Write-Host "Demo launched successfully"
Write-Host "Backend: http://localhost:$backendPort"
Write-Host "Frontend: http://localhost:$frontendPort"