@echo off
echo ==========================================
echo Starting TTG Scheduler (Production Mode)...
echo Pulling latest images from Docker Hub...
echo ==========================================

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b
)

echo Pulling and starting...
docker-compose -f docker-compose.prod.yml up --pull always -d

echo.
echo ==========================================
echo Application is running!
echo Frontend: http://localhost
echo Backend API: http://localhost:8000/docs
echo ==========================================
echo.
pause
docker-compose -f docker-compose.prod.yml logs -f
