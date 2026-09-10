# AnnaSetu — Single-Command D-Day Demonstration Launcher
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "   🌾 AnnaSetu: Smart Agricultural Procurement Coordination      " -ForegroundColor Yellow
Write-Host "          Smart India Hackathon D-Day Prototype                  " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "[1/3] Ensuring baseline SQLite database is seeded..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\services\api"
python -m app.seed.seed_data

Write-Host ""
Write-Host "[2/3] Starting FastAPI Backend on http://localhost:8000 ..." -ForegroundColor Cyan
$apiProcess = Start-Process python -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" -PassThru -WorkingDirectory "$PSScriptRoot\services\api" -WindowStyle Hidden

Write-Host ""
Write-Host "[3/3] Starting Next.js Web App on http://localhost:3000 ..." -ForegroundColor Cyan
# On Windows, npm is npm.cmd
$npmCmd = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npmCmd) { $npmCmd = "npm.cmd" }
$webProcess = Start-Process $npmCmd -ArgumentList "run", "dev" -PassThru -WorkingDirectory "$PSScriptRoot\apps\web" -WindowStyle Hidden

Write-Host "Waiting for services to spin up..." -ForegroundColor Gray
Start-Sleep -Seconds 4

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "  ✅ AnnaSetu Prototype is LIVE!" -ForegroundColor Green
Write-Host "  👉 Web Application: http://localhost:3000" -ForegroundColor Yellow
Write-Host "  👉 API Docs / Swagger: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "Opening Chrome / default browser to http://localhost:3000..." -ForegroundColor Cyan
Start-Process "http://localhost:3000"

Write-Host "Press Ctrl+C in this terminal to stop both servers." -ForegroundColor Gray

try {
    while ($true) {
        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    if ($apiProcess) { Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue }
    if ($webProcess) { Stop-Process -Id $webProcess.Id -Force -ErrorAction SilentlyContinue }
}
