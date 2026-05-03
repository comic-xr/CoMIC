# VR Preprocessing Worker

Python worker that processes VR preprocessing jobs from the BullMQ queue.

## Operations

### vr-bounds-calculation
Computes bounding box and centroid for VR navigation:
- Bounds (min/max for each axis)
- Dimensions
- Centroid
- Diagonal length
- Suggested VR scale

### vr-lod-generation
Generates multiple Level of Detail versions:
- For meshes: Uses vtkDecimatePro for polygon reduction
- For point clouds: Uses vtkMaskPoints for subsampling
- Default levels: [1.0, 0.5, 0.25, 0.1]
- Uploads LOD files to MinIO

### vr-octree-build
Builds octree spatial index for point clouds:
- Efficient frustum culling in VR
- LOD selection based on distance
- Spatial queries for interaction
- Saves octree structure as JSON

## Setup

### Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export REDIS_HOST=localhost
export REDIS_PORT=6379
export QUEUE_NAME=vr-preprocessing
export MINIO_ENDPOINT=localhost:9000
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export MINIO_BUCKET=cia-files
export API_BASE_URL=http://localhost:3001/api/vr/preprocessing/internal

# Run worker
python worker.py
```

### Docker

```bash
# Build
docker build -t cia-vr-preprocessing-worker .

# Run
docker run -d \
  --name vr-preprocessing-worker \
  -e REDIS_HOST=host.docker.internal \
  -e MINIO_ENDPOINT=host.docker.internal:9000 \
  -e API_BASE_URL=http://host.docker.internal:3001/api/vr/preprocessing/internal \
  cia-vr-preprocessing-worker
```

## Queue Integration

The worker consumes jobs from the `vr-preprocessing` BullMQ queue.

Job data structure:
```json
{
  "jobId": "uuid",
  "operation": "vr-lod-generation",
  "fileStorageKey": "files/dataset.vtp",
  "params": {
    "preprocessingId": "uuid",
    "operationType": "vr-lod-generation",
    "levels": [1.0, 0.5, 0.25, 0.1]
  }
}
```

## API Callbacks

The worker reports progress and completion to the server:

- `POST /api/vr/preprocessing/internal/progress` - Progress updates
- `POST /api/vr/preprocessing/internal/complete` - Job completion
- `POST /api/vr/preprocessing/internal/failed` - Job failure

## Output

Results are stored in MinIO under `vr-preprocessing/{preprocessingId}/`:
- `lod_0.vtp`, `lod_1.vtp`, etc. - LOD versions
- `octree.json` - Octree spatial index

Result metadata is returned to the API and stored in the `vr_preprocessing` table.
