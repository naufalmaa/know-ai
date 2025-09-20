# PowerShell script to start MinIO server
Write-Host "Starting MinIO Server Setup..." -ForegroundColor Green
Write-Host ""

# Check if MinIO is available
$minioPath = Get-Command minio -ErrorAction SilentlyContinue
if (-not $minioPath) {
    Write-Host "ERROR: MinIO is not installed or not in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "To install MinIO on Windows:"
    Write-Host "1. Download from: https://dl.min.io/server/minio/release/windows-amd64/minio.exe"
    Write-Host "2. Place minio.exe in a folder like C:\minio\"
    Write-Host "3. Add C:\minio\ to your PATH environment variable"
    Write-Host ""
    Write-Host "Quick install (run this command):"
    Write-Host "Invoke-WebRequest -Uri 'https://dl.min.io/server/minio/release/windows-amd64/minio.exe' -OutFile 'minio.exe'"
    Write-Host ""
    
    $download = Read-Host "Download MinIO now? (y/n)"
    if ($download -eq 'y' -or $download -eq 'Y') {
        Write-Host "Downloading MinIO..." -ForegroundColor Yellow
        try {
            Invoke-WebRequest -Uri "https://dl.min.io/server/minio/release/windows-amd64/minio.exe" -OutFile "minio.exe"
            Write-Host "✅ MinIO downloaded successfully!" -ForegroundColor Green
            Write-Host "You can now run: .\minio.exe server .minio-data --address :9001 --console-address :9002"
        } catch {
            Write-Host "❌ Failed to download MinIO: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    exit 1
}

# Create MinIO data directory (with leading dot)
if (-not (Test-Path ".minio-data")) {
    New-Item -ItemType Directory -Path ".minio-data" | Out-Null
    Write-Host "Created .minio-data directory" -ForegroundColor Green
}

# Set MinIO credentials
$env:MINIO_ROOT_USER = "minioadmin"
$env:MINIO_ROOT_PASSWORD = "minioadmin"

Write-Host "Starting MinIO server on port 9001..." -ForegroundColor Green
Write-Host "Console will be available on port 9002" -ForegroundColor Green
Write-Host ""
Write-Host "Credentials:" -ForegroundColor Yellow
Write-Host "  Access Key: $($env:MINIO_ROOT_USER)"
Write-Host "  Secret Key: $($env:MINIO_ROOT_PASSWORD)"
Write-Host ""
Write-Host "MinIO Console: http://127.0.0.1:9002" -ForegroundColor Cyan
Write-Host "MinIO API: http://127.0.0.1:9001" -ForegroundColor Cyan
Write-Host ""

# Start MinIO server (using .minio-data)
Write-Host "Starting MinIO server..." -ForegroundColor Green
& minio server ".minio-data" --address :9001 --console-address :9002
