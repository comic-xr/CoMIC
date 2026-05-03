FROM python:3.11-slim

WORKDIR /app

# Install VTK dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy worker script
COPY worker.py .

# Environment variables (can be overridden)
ENV REDIS_HOST=localhost
ENV REDIS_PORT=6379
ENV QUEUE_NAME=vr-preprocessing
ENV MINIO_ENDPOINT=localhost:9000
ENV MINIO_ACCESS_KEY=minioadmin
ENV MINIO_SECRET_KEY=minioadmin
ENV MINIO_BUCKET=cia-files
ENV MINIO_SECURE=false
ENV API_BASE_URL=http://localhost:3001/api/vr/preprocessing/internal

CMD ["python", "worker.py"]
