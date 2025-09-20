# Agno AI Agent Service Startup Script
# PowerShell script to start the Agno service

Write-Host "Starting Agno AI Agent Service..." -ForegroundColor Green
Write-Host ""

# Check if Python virtual environment is activated
if (-not $env:VIRTUAL_ENV) {
    Write-Host "Activating Python virtual environment..." -ForegroundColor Yellow
    & ".\.venv\Scripts\Activate.ps1"
}

# Set environment variables
$env:PYTHONPATH = "$PWD;$env:PYTHONPATH"

Write-Host "Environment Configuration:" -ForegroundColor Cyan
Write-Host "  LITELLM_BASE: $env:LITELLM_BASE" -ForegroundColor Gray
Write-Host "  AGNO_PORT: 9010" -ForegroundColor Gray
Write-Host "  Models: deepseek-r1:14b, mxbai-embed-large:latest" -ForegroundColor Gray
Write-Host ""

Write-Host "Starting Agno service on port 9010..." -ForegroundColor Green
Write-Host "API Documentation: http://127.0.0.1:9010/docs" -ForegroundColor Cyan
Write-Host "Health Check: http://127.0.0.1:9010/health" -ForegroundColor Cyan
Write-Host ""

# Start the service
uvicorn services.agno.main:app --host 0.0.0.0 --port 9010 --reload --env-file .env