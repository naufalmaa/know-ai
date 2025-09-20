@echo off
echo Starting MinIO Server Setup...
echo.

REM Check if MinIO is installed
where minio.exe >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: MinIO is not installed or not in PATH
    echo.
    echo To install MinIO on Windows:
    echo 1. Download from: https://dl.min.io/server/minio/release/windows-amd64/minio.exe
    echo 2. Place minio.exe in a folder like C:\minio\
    echo 3. Add C:\minio\ to your PATH environment variable
    echo.
    echo Alternative quick install with PowerShell:
    echo Invoke-WebRequest -Uri "https://dl.min.io/server/minio/release/windows-amd64/minio.exe" -OutFile "minio.exe"
    echo.
    pause
    exit /b 1
)

REM Create MinIO data directory
if not exist .minio-data mkdir .minio-data

REM Set MinIO credentials (you can change these)
set MINIO_ROOT_USER=minioadmin
set MINIO_ROOT_PASSWORD=minioadmin

echo Starting MinIO server on port 9001...
echo Console will be available on port 9002
echo.
echo Credentials:
echo   Access Key: %MINIO_ROOT_USER%
echo   Secret Key: %MINIO_ROOT_PASSWORD%
echo.

REM Start MinIO server
minio.exe server .minio-data --address :9001 --console-address :9002