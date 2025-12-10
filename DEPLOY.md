# Deployment Guide for TTG Scheduler

This guide explains how to host the Time Table Generator (TTG) using Docker.

## Prerequisites
- **Docker** and **Docker Compose** installed on the server (AWS EC2, DigitalOcean, VPS, or local machine).

## Quick Start (Production)

1. **Clone the Repository**:
   ```bash
   git clone <repo_url>
   cd TTG
   ```

2. **Run with Docker Compose**:
   ```bash
   docker-compose up --build -d
   ```
   - This builds the frontend and backend images.
   - Spins up Postgres, Redis, Celery Worker, Backend API, and Frontend (Nginx).

3. **Access the App**:
   - **Frontend**: http://localhost (or your server IP)
   - **Backend API Docs**: http://localhost:8000/docs

## API Documentation
The backend automatically provides interactive API documentation:
- **Swagger UI**: `/docs`
- **ReDoc**: `/redoc`

Use these interfaces to give your App/Web developers clear details on available endpoints (Save, Load, Generate).

## Troubleshooting
- **Database Connection**: Ensure the `DATABASE_URL` in `docker-compose.yml` matches the `db` service credentials.
- **Ports**: Check if port `80` or `8000` is already in use.
- **Logs**:
  ```bash
  docker-compose logs -f backend
  docker-compose logs -f worker
  ```

## Customizing & Pushing to Registry

To deploy this to a remote server, you may want to push your images to a container registry (like Docker Hub, AWS ECR, or GHCR).

1.  **Tag your images**:
    Change the `image` field in `docker-compose.yml` or build with tags:
    ```bash
    docker build -t yourusername/ttg-backend:latest ./backend
    docker build -t yourusername/ttg-frontend:latest ./frontend
    ```

2.  **Login & Push**:
    ```bash
    docker login
    docker push yourusername/ttg-backend:latest
    docker push yourusername/ttg-frontend:latest
    ```

3.  **Update Compose**:
    Update `docker-compose.yml` on your server to use `image: yourusername/ttg-backend:latest` instead of `build: ...`.

## Sharing the Application (Source Code Method)

If you want to share this application with a colleague or client so they can run it on their machine:

1.  **Package the Source**:
    -   Zip the entire `TTG` folder (exclude `node_modules`, `.git`, `__pycache__` to save space).
    -   Ensure `docker-compose.yml`, `backend/`, `frontend/`, and `run.bat` are included.

2.  **Instructions for the Recipient**:
    -   Install **Docker Desktop**.
    -   Unzip the folder.
    -   Double-click `run.bat` (Windows) or run `docker-compose up --build` (Mac/Linux).
    -   Open `http://localhost`.

## Project Structure
-   `frontend/`: React + Vite application.
-   `backend/`: FastAPI + Celery application.
-   `docker-compose.yml`: Orchestration config.
-   `run.bat`: Quick start script (Builds locally).

## Sharing the Application (Docker Hub Method - EASIEST)

Since we have pushed the images to Docker Hub (`stifler7/ttg-backend`, `stifler7/ttg-frontend`), your users don't need to build anything!

1.  **What to Share**:
    -   Just share these two files: `docker-compose.prod.yml` and `run-prod.bat`.
    -   (You can zip them together).

2.  **Instructions for Recipient**:
    -   Install Docker Desktop.
    -   Run `run-prod.bat`.
    -   It will automatically download the app from the internet and run it.

