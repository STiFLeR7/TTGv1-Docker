@echo off
echo ==========================================
echo Starting TTG Scheduler (SaaS Edition)...
echo ==========================================

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b
)

echo Building and starting containers...
docker-compose up --build -d

echo.
echo ==========================================
echo Application is running!
echo Frontend: http://localhost
echo Backend API: http://localhost:8000/docs
echo ==========================================
echo.
echo Press any key to view logs (Ctrl+C to stop logs)...
pause >nul
docker-compose logs -f
