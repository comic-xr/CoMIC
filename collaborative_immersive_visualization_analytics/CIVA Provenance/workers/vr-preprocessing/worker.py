#!/usr/bin/env python3
"""
VR Preprocessing Worker

Processes VR preprocessing jobs from the BullMQ queue.
Operations:
- LOD (Level of Detail) generation for large meshes
- Octree building for point clouds
- Bounds calculation for VR navigation
- Texture compression (future)

Uses the same queue patterns as the general VTK worker.
"""

import os
import sys
import json
import time
import logging
import tempfile
import struct
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import redis
import requests
import numpy as np
import vtk
from vtk.util.numpy_support import vtk_to_numpy, numpy_to_vtk
from minio import Minio

# =============================================================================
# CONFIGURATION
# =============================================================================

REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))
QUEUE_NAME = os.environ.get("QUEUE_NAME", "vr-preprocessing")
WORKER_ID = os.environ.get("WORKER_ID", f"vr-preprocess-{os.getpid()}")

MINIO_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.environ.get("MINIO_BUCKET", "cia-files")
MINIO_SECURE = os.environ.get("MINIO_SECURE", "false").lower() == "true"

API_BASE_URL = os.environ.get(
    "API_BASE_URL", "http://localhost:3001/api/vr/preprocessing/internal"
)
INTERNAL_API_TOKEN = os.environ.get("INTERNAL_API_TOKEN")

INTERNAL_HEADERS = (
    {"x-internal-token": INTERNAL_API_TOKEN} if INTERNAL_API_TOKEN else {}
)

# =============================================================================
# LOGGING
# =============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
log = logging.getLogger("vr-preprocessing")

# =============================================================================
# MINIO CLIENT
# =============================================================================

minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_SECURE,
)


# =============================================================================
# VTK FILE OPERATIONS
# =============================================================================

def read_vtk_file(filepath: str):
    """Read any VTK-supported file format."""
    ext = Path(filepath).suffix.lower()

    readers = {
        ".vtp": vtk.vtkXMLPolyDataReader,
        ".vti": vtk.vtkXMLImageDataReader,
        ".vtu": vtk.vtkXMLUnstructuredGridReader,
        ".vtk": vtk.vtkDataSetReader,
        ".stl": vtk.vtkSTLReader,
        ".obj": vtk.vtkOBJReader,
        ".ply": vtk.vtkPLYReader,
    }

    reader_class = readers.get(ext)
    if not reader_class:
        raise ValueError(f"Unsupported file format: {ext}")

    reader = reader_class()
    reader.SetFileName(filepath)
    reader.Update()

    return reader.GetOutput()


def write_vtk_file(data, filepath: str):
    """Write VTK data to file."""
    ext = Path(filepath).suffix.lower()

    writers = {
        ".vtp": vtk.vtkXMLPolyDataWriter,
        ".vti": vtk.vtkXMLImageDataWriter,
        ".vtu": vtk.vtkXMLUnstructuredGridWriter,
        ".stl": vtk.vtkSTLWriter,
        ".ply": vtk.vtkPLYWriter,
    }

    writer_class = writers.get(ext)
    if not writer_class:
        raise ValueError(f"Unsupported output format: {ext}")

    writer = writer_class()
    writer.SetFileName(filepath)
    writer.SetInputData(data)
    writer.Write()


# =============================================================================
# VR PREPROCESSING OPERATIONS
# =============================================================================

def compute_bounds(data) -> Dict:
    """
    Compute bounding box and centroid for VR navigation.
    Essential for proper VR scale and positioning.
    """
    bounds = data.GetBounds()

    # Calculate dimensions
    dims = (
        bounds[1] - bounds[0],  # x extent
        bounds[3] - bounds[2],  # y extent
        bounds[5] - bounds[4],  # z extent
    )

    # Calculate centroid
    centroid = (
        (bounds[0] + bounds[1]) / 2,
        (bounds[2] + bounds[3]) / 2,
        (bounds[4] + bounds[5]) / 2,
    )

    # Calculate diagonal (useful for scale calculations)
    diagonal = np.sqrt(dims[0]**2 + dims[1]**2 + dims[2]**2)

    # Suggested VR scale (aim for ~2m diagonal in VR space)
    suggested_vr_scale = 2.0 / diagonal if diagonal > 0 else 1.0

    return {
        "bounds": {
            "min": [bounds[0], bounds[2], bounds[4]],
            "max": [bounds[1], bounds[3], bounds[5]],
        },
        "dimensions": list(dims),
        "centroid": list(centroid),
        "diagonal": diagonal,
        "suggestedVRScale": suggested_vr_scale,
        "numberOfPoints": data.GetNumberOfPoints(),
        "numberOfCells": data.GetNumberOfCells(),
    }


def generate_lod_levels(polydata, levels: List[float] = None) -> List[Dict]:
    """
    Generate multiple LOD levels for VR rendering.

    Args:
        polydata: VTK polydata (mesh or point cloud)
        levels: List of reduction factors [1.0, 0.5, 0.25, 0.1]

    Returns:
        List of LOD results with metadata
    """
    if levels is None:
        levels = [1.0, 0.5, 0.25, 0.1]

    results = []
    has_polys = hasattr(polydata, 'GetNumberOfPolys') and polydata.GetNumberOfPolys() > 0
    original_points = polydata.GetNumberOfPoints()
    original_polys = polydata.GetNumberOfPolys() if has_polys else 0

    log.info(f"Generating {len(levels)} LOD levels for {'mesh' if has_polys else 'point cloud'}")
    log.info(f"Original: {original_points} points, {original_polys} polygons")

    for i, level in enumerate(levels):
        if level >= 1.0:
            # Full detail - just copy
            results.append({
                "level": i,
                "factor": level,
                "data": polydata,
                "points": original_points,
                "polys": original_polys,
            })
        elif has_polys:
            # Mesh decimation
            reduction = 1.0 - level
            decimate = vtk.vtkDecimatePro()
            decimate.SetInputData(polydata)
            decimate.SetTargetReduction(reduction)
            decimate.PreserveTopologyOn()
            decimate.Update()

            output = decimate.GetOutput()
            results.append({
                "level": i,
                "factor": level,
                "data": output,
                "points": output.GetNumberOfPoints(),
                "polys": output.GetNumberOfPolys(),
            })
            log.info(f"LOD {i}: {output.GetNumberOfPolys()} polys ({level*100:.0f}%)")
        else:
            # Point cloud subsampling
            target = int(original_points * level)
            on_ratio = max(1, original_points // target) if target > 0 else original_points

            mask = vtk.vtkMaskPoints()
            mask.SetInputData(polydata)
            mask.SetOnRatio(on_ratio)
            mask.RandomModeOn()
            mask.Update()

            output = mask.GetOutput()
            results.append({
                "level": i,
                "factor": level,
                "data": output,
                "points": output.GetNumberOfPoints(),
                "polys": 0,
            })
            log.info(f"LOD {i}: {output.GetNumberOfPoints()} points ({level*100:.0f}%)")

    return results


class OctreeNode:
    """Simple octree node for point cloud spatial indexing."""

    def __init__(self, bounds: Tuple[float, ...], depth: int = 0, max_depth: int = 8, max_points: int = 1000):
        self.bounds = bounds  # (xmin, xmax, ymin, ymax, zmin, zmax)
        self.depth = depth
        self.max_depth = max_depth
        self.max_points = max_points
        self.points = []
        self.point_indices = []
        self.children = None
        self.is_leaf = True

    def center(self) -> Tuple[float, float, float]:
        return (
            (self.bounds[0] + self.bounds[1]) / 2,
            (self.bounds[2] + self.bounds[3]) / 2,
            (self.bounds[4] + self.bounds[5]) / 2,
        )

    def subdivide(self):
        """Split node into 8 children."""
        cx, cy, cz = self.center()
        xmin, xmax, ymin, ymax, zmin, zmax = self.bounds

        self.children = []
        for i in range(8):
            # Determine child bounds based on octant
            child_bounds = (
                xmin if (i & 1) == 0 else cx,
                cx if (i & 1) == 0 else xmax,
                ymin if (i & 2) == 0 else cy,
                cy if (i & 2) == 0 else ymax,
                zmin if (i & 4) == 0 else cz,
                cz if (i & 4) == 0 else zmax,
            )
            self.children.append(OctreeNode(
                child_bounds,
                self.depth + 1,
                self.max_depth,
                self.max_points
            ))

        self.is_leaf = False

        # Redistribute points to children
        for point, idx in zip(self.points, self.point_indices):
            child_idx = self._get_child_index(point)
            self.children[child_idx].insert(point, idx)

        self.points = []
        self.point_indices = []

    def _get_child_index(self, point: Tuple[float, float, float]) -> int:
        """Get the child octant index for a point."""
        cx, cy, cz = self.center()
        idx = 0
        if point[0] >= cx:
            idx |= 1
        if point[1] >= cy:
            idx |= 2
        if point[2] >= cz:
            idx |= 4
        return idx

    def insert(self, point: Tuple[float, float, float], idx: int):
        """Insert a point into the octree."""
        if self.is_leaf:
            self.points.append(point)
            self.point_indices.append(idx)

            # Subdivide if too many points
            if len(self.points) > self.max_points and self.depth < self.max_depth:
                self.subdivide()
        else:
            child_idx = self._get_child_index(point)
            self.children[child_idx].insert(point, idx)

    def to_dict(self) -> Dict:
        """Serialize octree node to dictionary."""
        result = {
            "bounds": self.bounds,
            "depth": self.depth,
            "isLeaf": self.is_leaf,
        }

        if self.is_leaf:
            result["pointCount"] = len(self.points)
            result["pointIndices"] = self.point_indices
        else:
            result["children"] = [child.to_dict() for child in self.children]

        return result

    def get_stats(self) -> Dict:
        """Get octree statistics."""
        if self.is_leaf:
            return {
                "nodeCount": 1,
                "leafCount": 1,
                "maxDepth": self.depth,
                "totalPoints": len(self.points),
            }
        else:
            stats = {
                "nodeCount": 1,
                "leafCount": 0,
                "maxDepth": self.depth,
                "totalPoints": 0,
            }
            for child in self.children:
                child_stats = child.get_stats()
                stats["nodeCount"] += child_stats["nodeCount"]
                stats["leafCount"] += child_stats["leafCount"]
                stats["maxDepth"] = max(stats["maxDepth"], child_stats["maxDepth"])
                stats["totalPoints"] += child_stats["totalPoints"]
            return stats


def build_octree(polydata, max_depth: int = 8, max_points_per_node: int = 1000) -> Dict:
    """
    Build an octree spatial index for a point cloud.

    Useful for:
    - Efficient frustum culling in VR
    - Level of detail selection based on distance
    - Spatial queries for interaction

    Args:
        polydata: VTK polydata with points
        max_depth: Maximum octree depth
        max_points_per_node: Max points before subdivision

    Returns:
        Octree structure and statistics
    """
    points = polydata.GetPoints()
    if not points:
        raise ValueError("Dataset has no points")

    num_points = points.GetNumberOfPoints()
    log.info(f"Building octree for {num_points} points (max_depth={max_depth})")

    # Get bounds
    bounds = polydata.GetBounds()

    # Add small padding to avoid edge cases
    padding = 0.001 * max(
        bounds[1] - bounds[0],
        bounds[3] - bounds[2],
        bounds[5] - bounds[4]
    )
    padded_bounds = (
        bounds[0] - padding, bounds[1] + padding,
        bounds[2] - padding, bounds[3] + padding,
        bounds[4] - padding, bounds[5] + padding,
    )

    # Create root node
    root = OctreeNode(padded_bounds, 0, max_depth, max_points_per_node)

    # Insert all points
    for i in range(num_points):
        point = points.GetPoint(i)
        root.insert(point, i)

        # Progress logging every 100k points
        if (i + 1) % 100000 == 0:
            log.info(f"Inserted {i + 1}/{num_points} points into octree")

    stats = root.get_stats()
    log.info(f"Octree complete: {stats['nodeCount']} nodes, {stats['leafCount']} leaves, depth {stats['maxDepth']}")

    return {
        "octree": root.to_dict(),
        "stats": stats,
        "bounds": list(bounds),
    }


# =============================================================================
# API CALLBACKS
# =============================================================================

def report_progress(preprocessing_id: str, progress: int, operation: str = None, status: str = None):
    """Report preprocessing progress to API."""
    try:
        payload = {
            "preprocessingId": preprocessing_id,
            "progress": progress,
        }
        if operation:
            payload["operation"] = operation
        if status:
            payload["status"] = status

        requests.post(
            f"{API_BASE_URL}/progress",
            headers=INTERNAL_HEADERS,
            json=payload,
            timeout=5,
        )
    except Exception as e:
        log.warning(f"Failed to report progress: {e}")


def report_complete(preprocessing_id: str, results: Dict):
    """Report preprocessing completion to API."""
    try:
        requests.post(
            f"{API_BASE_URL}/complete",
            headers=INTERNAL_HEADERS,
            json={
                "preprocessingId": preprocessing_id,
                "results": results,
            },
            timeout=10,
        )
    except Exception as e:
        log.error(f"Failed to report completion: {e}")


def report_failed(preprocessing_id: str, error: str):
    """Report preprocessing failure to API."""
    try:
        requests.post(
            f"{API_BASE_URL}/failed",
            headers=INTERNAL_HEADERS,
            json={
                "preprocessingId": preprocessing_id,
                "error": error,
            },
            timeout=10,
        )
    except Exception as e:
        log.error(f"Failed to report failure: {e}")


# =============================================================================
# JOB PROCESSING
# =============================================================================

def process_job(job_data: dict):
    """Process a VR preprocessing job."""
    preprocessing_id = job_data.get("params", {}).get("preprocessingId")
    operation_type = job_data.get("params", {}).get("operationType")
    file_storage_key = job_data.get("fileStorageKey")
    params = job_data.get("params", {})

    log.info(f"Processing VR preprocessing job: {preprocessing_id} - {operation_type}")
    start_time = time.time()

    try:
        report_progress(preprocessing_id, 10, operation_type, "processing")

        # Download file from MinIO
        with tempfile.NamedTemporaryFile(suffix=Path(file_storage_key).suffix, delete=False) as tmp:
            tmp_path = tmp.name
            minio_client.fget_object(MINIO_BUCKET, file_storage_key, tmp_path)

        report_progress(preprocessing_id, 20, operation_type)

        # Read VTK data
        data = read_vtk_file(tmp_path)

        report_progress(preprocessing_id, 30, operation_type)

        # Execute operation
        results = {}

        if operation_type == "vr-bounds-calculation":
            # Compute bounds for VR navigation
            results = compute_bounds(data)
            report_progress(preprocessing_id, 90, operation_type)

        elif operation_type == "vr-lod-generation":
            # Generate LOD levels
            lod_levels = params.get("levels", [1.0, 0.5, 0.25, 0.1])
            lod_results = generate_lod_levels(data, lod_levels)

            report_progress(preprocessing_id, 60, operation_type)

            # Save LOD files to MinIO
            lod_storage_keys = []
            for lod in lod_results:
                if lod["factor"] < 1.0:  # Don't save the full detail version
                    lod_suffix = Path(file_storage_key).suffix
                    lod_path = tempfile.mktemp(suffix=lod_suffix)
                    write_vtk_file(lod["data"], lod_path)

                    lod_key = f"vr-preprocessing/{preprocessing_id}/lod_{lod['level']}{lod_suffix}"
                    minio_client.fput_object(MINIO_BUCKET, lod_key, lod_path)
                    os.unlink(lod_path)

                    lod_storage_keys.append({
                        "level": lod["level"],
                        "factor": lod["factor"],
                        "storageKey": lod_key,
                        "points": lod["points"],
                        "polys": lod["polys"],
                    })

            results = {
                "lodLevels": lod_storage_keys,
                "originalPoints": data.GetNumberOfPoints(),
                "originalPolys": data.GetNumberOfPolys() if hasattr(data, 'GetNumberOfPolys') else 0,
            }

            # Also compute bounds
            results.update(compute_bounds(data))
            report_progress(preprocessing_id, 90, operation_type)

        elif operation_type == "vr-octree-build":
            # Build octree for point cloud
            max_depth = params.get("maxDepth", 8)
            max_points = params.get("maxPointsPerNode", 1000)

            octree_result = build_octree(data, max_depth, max_points)

            report_progress(preprocessing_id, 70, operation_type)

            # Save octree to MinIO
            octree_path = tempfile.mktemp(suffix=".json")
            with open(octree_path, "w") as f:
                json.dump(octree_result["octree"], f)

            octree_key = f"vr-preprocessing/{preprocessing_id}/octree.json"
            minio_client.fput_object(MINIO_BUCKET, octree_key, octree_path)
            os.unlink(octree_path)

            results = {
                "octreeStorageKey": octree_key,
                "octreeStats": octree_result["stats"],
                "bounds": octree_result["bounds"],
            }

            # Also compute full bounds info
            results.update(compute_bounds(data))
            report_progress(preprocessing_id, 90, operation_type)

        else:
            raise ValueError(f"Unknown VR preprocessing operation: {operation_type}")

        # Cleanup temp file
        os.unlink(tmp_path)

        # Calculate timing
        compute_time = int((time.time() - start_time) * 1000)
        results["computeTimeMs"] = compute_time

        log.info(f"VR preprocessing complete: {preprocessing_id} in {compute_time}ms")

        report_complete(preprocessing_id, results)

    except Exception as e:
        log.exception(f"VR preprocessing failed: {preprocessing_id} - {e}")
        report_failed(preprocessing_id, str(e))


# =============================================================================
# MAIN LOOP
# =============================================================================

def main():
    """Main worker loop using BullMQ queue patterns."""
    log.info(f"Starting VR Preprocessing Worker: {WORKER_ID}")
    log.info(f"Redis: {REDIS_HOST}:{REDIS_PORT}")
    log.info(f"Queue: {QUEUE_NAME}")
    log.info(f"MinIO: {MINIO_ENDPOINT}/{MINIO_BUCKET}")
    log.info(f"API: {API_BASE_URL}")

    # Connect to Redis
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

    # BullMQ key patterns
    prioritized_key = f"bull:{QUEUE_NAME}:prioritized"
    wait_key = f"bull:{QUEUE_NAME}:wait"
    active_key = f"bull:{QUEUE_NAME}:active"

    log.info("Worker ready, waiting for jobs...")

    while True:
        try:
            job_id = None

            # Try prioritized sorted set first
            result = r.bzpopmin(prioritized_key, timeout=1)

            if result:
                job_id = result[1]
                log.debug(f"Got job from prioritized queue: {job_id}")
            else:
                # Fallback to wait list
                job_id = r.brpoplpush(wait_key, active_key, timeout=1)
                if job_id:
                    log.debug(f"Got job from wait queue: {job_id}")

            if job_id:
                # Move to active set
                r.zadd(active_key, {job_id: time.time()})

                # Get job data
                job_key = f"bull:{QUEUE_NAME}:{job_id}"
                job_json = r.hget(job_key, "data")

                if job_json:
                    job_data = json.loads(job_json)
                    log.info(f"Processing job: {job_id}")
                    process_job(job_data)
                else:
                    log.warning(f"No data found for job {job_id}")

                # Remove from active
                r.zrem(active_key, job_id)

                # Mark as completed
                completed_key = f"bull:{QUEUE_NAME}:completed"
                r.zadd(completed_key, {job_id: time.time()})

        except redis.ConnectionError as e:
            log.error(f"Redis connection error: {e}")
            time.sleep(5)
        except KeyboardInterrupt:
            log.info("Shutting down...")
            break
        except Exception as e:
            log.exception(f"Unexpected error: {e}")
            time.sleep(1)


if __name__ == "__main__":
    main()
