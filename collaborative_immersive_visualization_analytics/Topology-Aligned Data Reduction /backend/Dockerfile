# CIVA Reduction backend with TTK on Linux (use on Apple Silicon via Docker).
# Build: docker build -t civa-backend ./backend
# Run:   docker run -p 8000:8000 -v "$(pwd)/data/datasets:/data/datasets" civa-backend
FROM --platform=linux/amd64 continuumio/miniconda3:latest

WORKDIR /app

# Install TTK (conda-forge has linux-64 build) + Python 3.11, then FastAPI/uvicorn
RUN conda create -n civa -c conda-forge topologytoolkit python=3.11 -y && \
    . /opt/conda/etc/profile.d/conda.sh && conda activate civa && \
    pip install --no-cache-dir "fastapi>=0.104" "uvicorn[standard]>=0.24"

# Copy backend code (reduce.py, main.py)
COPY main.py reduce.py ./

# Default: read VTI from /data/datasets (mount host data there at run time)
ENV DATA_DIR=/data/datasets

# Run uvicorn from /app using the conda env
RUN echo '#!/bin/bash\nset -e\n. /opt/conda/etc/profile.d/conda.sh\nconda activate civa\ncd /app\nexec uvicorn main:app --host 0.0.0.0 --port 8000' > /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
