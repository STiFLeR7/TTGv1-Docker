FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (for building some python packages if needed)
# netcat/curl useful for healthchecks
RUN apt-get update && apt-get install -y netcat-openbsd curl && rm -rf /var/lib/apt/lists/*

# Copy requirements
# If you don't have a requirements.txt, we'll create one or you can install manually.
# Assuming requirements.txt exists or we'll inline some common ones
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose port
EXPOSE 8000

# Default command (can be overridden by docker-compose)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
