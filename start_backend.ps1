# ─── Smart Grievance Portal — Backend Startup ───────────────────────────────
# Run this in a terminal and KEEP IT OPEN:
#   powershell -File start_backend.ps1

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$python  = Join-Path $projectRoot "backend\venv\Scripts\python.exe"
$backend = Join-Path $projectRoot "backend"

# Step 0: Kill any process using port 8000
Write-Host "[0/4] Freeing port 8000..." -ForegroundColor Gray
$pids = (netstat -ano 2>$null | Select-String ":8000.*LISTEN") -replace '.*\s+(\d+)$','$1'
foreach ($p in $pids) {
    if ($p -match '^\d+$') {
        Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue
        Write-Host "  Killed PID $p" -ForegroundColor Gray
    }
}
Start-Sleep -Seconds 2

Set-Location $backend

Write-Host "[1/4] Running migrations..." -ForegroundColor Cyan
& $python manage.py migrate --run-syncdb 2>&1 | Where-Object { $_ -match " OK| ERROR" }

Write-Host "[2/4] Seeding data..." -ForegroundColor Cyan
& $python setup_data.py 2>&1 | Where-Object { $_ -match "Created|Exists|COMPLETE|Officers" } | Select-Object -Last 5

Write-Host "[3/4] Seeding complaints..." -ForegroundColor Cyan
if (Test-Path "seed_complaints.py") {
    & $python seed_complaints.py 2>&1 | Select-Object -Last 5
}

Write-Host "[4/4] Starting Daphne (HTTP + WebSocket)..." -ForegroundColor Green
Write-Host ""
Write-Host "  Backend  -> http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host "  Swagger  -> http://127.0.0.1:8000/swagger/" -ForegroundColor Yellow
Write-Host "  Frontend -> http://localhost:5173  (run: npm run dev)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Admin   : admin@grievance.gov.in / Admin@1234" -ForegroundColor Cyan
Write-Host "  Officer : officer.pwd@grievance.gov.in / Officer@1234" -ForegroundColor Cyan
Write-Host "  Head    : head.pwd@grievance.gov.in / Head@1234" -ForegroundColor Cyan
Write-Host ""
Write-Host "  KEEP THIS TERMINAL OPEN. Press Ctrl+C to stop." -ForegroundColor Red
Write-Host ""

& $python -m daphne -b 127.0.0.1 -p 8000 grievance_platform.asgi:application
