FROM python:3.11-slim

WORKDIR /app

# Install VTK dependencies (updated package names for Debian Trixie)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglu1-mesa \
    libxrender1 \
    libsm6 \
    libxt6 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy worker code
COPY worker.py .

# Run worker
CMD ["python", "worker.py"]