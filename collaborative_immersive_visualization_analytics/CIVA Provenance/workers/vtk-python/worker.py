#!/usr/bin/env python3
"""
VTK Python Worker

Processes compute jobs from the BullMQ queue.
Supports mesh decimation, LOD generation, smoothing, point cloud subsampling, etc.

UPDATED: Uses BullMQ v4+ queue patterns (prioritized sorted set)
"""

import os
import sys
import json
import time
import logging
import tempfile
from pathlib import Path

import redis
import requests
import numpy as np
import vtk
from vtk.util.numpy_support import vtk_to_numpy, numpy_to_vtk
from minio import Minio
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
import umap

# =============================================================================
# CONFIGURATION
# =============================================================================

REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))
QUEUE_NAME = os.environ.get("QUEUE_NAME", "general")
WORKER_ID = os.environ.get("WORKER_ID", f"vtk-worker-{os.getpid()}")

MINIO_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.environ.get("MINIO_BUCKET", "cia-files")
MINIO_SECURE = os.environ.get("MINIO_SECURE", "false").lower() == "true"

API_CALLBACK_URL = os.environ.get(
    "API_CALLBACK_URL", "http://localhost:3001/api/compute/internal"
)
INTERNAL_API_TOKEN = os.environ.get("INTERNAL_API_TOKEN")

INTERNAL_HEADERS = (
    {"x-internal-token": INTERNAL_API_TOKEN} if INTERNAL_API_TOKEN else {}
)

# =============================================================================
# LOGGING
# =============================================================================

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
log = logging.getLogger("vtk-worker")

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
# VTK OPERATIONS
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


def decimate_mesh(polydata, reduction=0.5):
    """
    Reduce mesh polygon count using vtkDecimatePro.

    Args:
        polydata: vtkPolyData input (must have polygons)
        reduction: float (0-1), fraction of polygons to remove

    Returns:
        vtkPolyData: Decimated mesh

    Raises:
        ValueError: If input has no polygons (e.g., point cloud)
    """
    # Check if data has polygons (required for decimation)
    num_polys = polydata.GetNumberOfPolys() if hasattr(polydata, 'GetNumberOfPolys') else 0
    num_points = polydata.GetNumberOfPoints()

    if num_polys == 0:
        raise ValueError(
            f"Cannot decimate: file has {num_points} points but 0 polygons. "
            "Decimation requires a mesh with polygons (triangles/quads). "
            "Point clouds cannot be decimated - try 'subsample-points' instead."
        )

    log.info(f"Decimating mesh: {num_polys} polys, {num_points} points, reduction={reduction}")

    decimate = vtk.vtkDecimatePro()
    decimate.SetInputData(polydata)
    decimate.SetTargetReduction(reduction)
    decimate.PreserveTopologyOn()
    decimate.Update()

    output = decimate.GetOutput()
    log.info(f"Result: {output.GetNumberOfPolys()} polys, {output.GetNumberOfPoints()} points")

    return output


def subsample_points(polydata, params: dict):
    """
    Subsample a point cloud using vtkMaskPoints.
    Works on point clouds (no polygons required).

    Args:
        polydata: vtkPolyData input (point cloud)
        params: {
            ratio: float (0-1, fraction of points to keep),
            randomize: bool (random vs uniform sampling)
        }

    Returns:
        vtkPolyData: Subsampled point cloud
    """
    ratio = params.get("ratio", 0.5)
    randomize = params.get("randomize", True)

    num_points = polydata.GetNumberOfPoints()
    target_points = int(num_points * ratio)
    on_ratio = max(1, num_points // target_points) if target_points > 0 else num_points

    log.info(f"Subsampling points: {num_points} -> ~{target_points} (1 in {on_ratio})")

    mask = vtk.vtkMaskPoints()
    mask.SetInputData(polydata)
    mask.SetOnRatio(on_ratio)
    if randomize:
        mask.RandomModeOn()
    else:
        mask.RandomModeOff()
    mask.Update()

    output = mask.GetOutput()
    log.info(f"Result: {output.GetNumberOfPoints()} points")

    return output


def smooth_mesh(polydata, iterations=20, relaxation=0.1):
    """Smooth mesh surface using Laplacian smoothing."""
    smoother = vtk.vtkSmoothPolyDataFilter()
    smoother.SetInputData(polydata)
    smoother.SetNumberOfIterations(iterations)
    smoother.SetRelaxationFactor(relaxation)
    smoother.Update()
    return smoother.GetOutput()


def compute_statistics(data):
    """Compute dataset statistics (no output file)."""
    bounds = data.GetBounds()

    stats = {
        "bounds": {
            "xMin": bounds[0], "xMax": bounds[1],
            "yMin": bounds[2], "yMax": bounds[3],
            "zMin": bounds[4], "zMax": bounds[5],
        },
        "numberOfPoints": data.GetNumberOfPoints(),
        "numberOfCells": data.GetNumberOfCells(),
    }

    # Add polygon count if available
    if hasattr(data, 'GetNumberOfPolys'):
        stats["numberOfPolys"] = data.GetNumberOfPolys()

    # Get data arrays info
    if hasattr(data, 'GetPointData'):
        point_data = data.GetPointData()
        stats["pointArrays"] = []
        for i in range(point_data.GetNumberOfArrays()):
            arr = point_data.GetArray(i)
            if arr:
                stats["pointArrays"].append({
                    "name": arr.GetName(),
                    "components": arr.GetNumberOfComponents(),
                    "tuples": arr.GetNumberOfTuples(),
                    "range": list(arr.GetRange()),
                })

    return stats


def _get_points_array(polydata):
    """Extract point positions as numpy array shape (n, 3)."""
    points = polydata.GetPoints()
    if not points:
        raise ValueError("Dataset has no points")
    np_points = vtk_to_numpy(points.GetData())
    if np_points.ndim != 2 or np_points.shape[1] < 3:
        raise ValueError("Point data is not 3D")
    return np_points[:, :3]


def run_pca(polydata, components=3):
    pts = _get_points_array(polydata)
    comp = max(2, min(int(components), 3))
    pca = PCA(n_components=comp)
    reduced = pca.fit_transform(pts)
    # Pad to 3D for consistency
    if comp == 2:
        z = np.zeros((reduced.shape[0], 1))
        reduced = np.hstack([reduced, z])
    return reduced.tolist(), {
        "components": comp,
        "explainedVariance": (
            pca.explained_variance_ratio_.tolist()
            if hasattr(pca, "explained_variance_ratio_")
            else None
        ),
        "pointCount": len(pts),
        "method": "pca",
    }


def run_tsne(polydata, components=2, perplexity=10, max_iter=300, learning_rate=200):
    pts = _get_points_array(polydata)
    comp = max(2, min(int(components), 3))
    tsne = TSNE(
        n_components=comp,
        perplexity=float(perplexity),
        max_iter=int(max_iter),
        learning_rate=float(learning_rate),
        init="pca",
        verbose=0,
    )
    reduced = tsne.fit_transform(pts)
    if comp == 2:
        z = np.zeros((reduced.shape[0], 1))
        reduced = np.hstack([reduced, z])
    return reduced.tolist(), {
        "components": comp,
        "perplexity": perplexity,
        "maxIterations": max_iter,
        "pointCount": len(pts),
        "method": "tsne",
    }


def run_umap(polydata, components=2, n_neighbors=8, min_dist=0.1):
    pts = _get_points_array(polydata)
    comp = max(2, min(int(components), 3))
    reducer = umap.UMAP(
        n_components=comp,
        n_neighbors=int(n_neighbors),
        min_dist=float(min_dist),
        init="spectral",
    )
    reduced = reducer.fit_transform(pts)
    if comp == 2:
        z = np.zeros((reduced.shape[0], 1))
        reduced = np.hstack([reduced, z])
    return reduced.tolist(), {
        "components": comp,
        "neighbors": n_neighbors,
        "minDist": min_dist,
        "pointCount": len(pts),
        "method": "umap",
    }


def generate_lod(polydata, levels=3):
    """Generate multiple LOD versions."""
    results = []
    reductions = [0.0, 0.5, 0.75, 0.9][:levels + 1]

    # Check if we can decimate (has polygons)
    has_polys = hasattr(polydata, 'GetNumberOfPolys') and polydata.GetNumberOfPolys() > 0

    for i, reduction in enumerate(reductions):
        if reduction == 0:
            results.append({"level": i, "reduction": 0, "data": polydata})
        elif has_polys:
            decimated = decimate_mesh(polydata, reduction)
            results.append({"level": i, "reduction": reduction, "data": decimated})
        else:
            # For point clouds, use subsampling instead
            subsampled = subsample_points(polydata, {"ratio": 1.0 - reduction})
            results.append({"level": i, "reduction": reduction, "data": subsampled})

    return results


# =============================================================================
# API CALLBACKS
# =============================================================================

def report_progress(job_id: str, progress: int, message: str = None):
    """Report job progress to API."""
    try:
        requests.post(
            f"{API_CALLBACK_URL}/job-progress",
            headers=INTERNAL_HEADERS,
            json={
                "jobId": job_id,
                "progress": progress,
                "message": message,
            },
            timeout=5,
        )
    except Exception as e:
        log.warning(f"Failed to report progress: {e}")


def report_complete(
    job_id: str,
    cache_key: str,
    result_key: str,
    metadata: dict,
    compute_time: int,
    size: int,
):
    """Report job completion to API."""
    try:
        requests.post(
            f"{API_CALLBACK_URL}/job-complete",
            headers=INTERNAL_HEADERS,
            json={
                "jobId": job_id,
                "cacheKey": cache_key,
                "resultStorageKey": result_key,
                "resultMetadata": metadata,
                "computeTimeMs": compute_time,
                "resultSizeBytes": size,
            },
            timeout=10,
        )
    except Exception as e:
        log.error(f"Failed to report completion: {e}")


def report_failed(job_id: str, error: str):
    """Report job failure to API."""
    try:
        requests.post(
            f"{API_CALLBACK_URL}/job-failed",
            headers=INTERNAL_HEADERS,
            json={
                "jobId": job_id,
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
    """Process a single compute job."""
    job_id = job_data.get("jobId")
    operation = job_data.get("operation")
    file_storage_key = job_data.get("fileStorageKey")
    params = job_data.get("params", {})
    cache_key = job_data.get("cacheKey")

    log.info(f"Processing job {job_id}: {operation}")
    start_time = time.time()

    try:
        report_progress(job_id, 10, "Downloading file...")

        # Download file from MinIO
        with tempfile.NamedTemporaryFile(suffix=Path(file_storage_key).suffix, delete=False) as tmp:
            tmp_path = tmp.name
            minio_client.fget_object(MINIO_BUCKET, file_storage_key, tmp_path)

        report_progress(job_id, 30, "Reading file...")

        # Read VTK data
        data = read_vtk_file(tmp_path)

        report_progress(job_id, 50, f"Running {operation}...")

        # Execute operation
        result_data = None
        metadata = {}

        if operation == "mesh-decimation":
            # decimate_mesh will raise ValueError if no polygons
            reduction = params.get("reduction", 0.5)
            result_data = decimate_mesh(data, reduction)
            metadata = {
                "originalPolys": data.GetNumberOfPolys(),
                "resultPolys": result_data.GetNumberOfPolys(),
                "originalPoints": data.GetNumberOfPoints(),
                "resultPoints": result_data.GetNumberOfPoints(),
                "reduction": reduction,
            }

        elif operation == "subsample-points":
            # New operation for point clouds
            ratio = params.get("ratio", 0.5)
            result_data = subsample_points(data, params)
            metadata = {
                "originalPoints": data.GetNumberOfPoints(),
                "resultPoints": result_data.GetNumberOfPoints(),
                "ratio": ratio,
            }

        elif operation == "mesh-smoothing":
            iterations = params.get("iterations", 20)
            relaxation = params.get("relaxation", 0.1)
            result_data = smooth_mesh(data, iterations, relaxation)
            metadata = {
                "iterations": iterations,
                "relaxation": relaxation,
            }

        elif operation == "compute-statistics":
            metadata = compute_statistics(data)
            # No output file for statistics
            report_progress(job_id, 90, "Finalizing...")
            compute_time = int((time.time() - start_time) * 1000)
            report_complete(job_id, cache_key, None, metadata, compute_time, 0)
            os.unlink(tmp_path)
            return

        elif operation == "lod-generation":
            levels = params.get("levels", 3)
            lod_results = generate_lod(data, levels)
            # For now, just return the medium LOD
            result_data = lod_results[1]["data"] if len(lod_results) > 1 else data
            metadata = {
                "levels": len(lod_results),
                "selectedLevel": 1,
            }

        elif operation == "dr-pca":
            comps = params.get("components", 3)
            reduced_points, meta = run_pca(data, comps)
            metadata = meta
            # Write reduced points to JSON
            result_suffix = ".json"
            with tempfile.NamedTemporaryFile(suffix=result_suffix, delete=False, mode="w") as result_tmp:
                result_path = result_tmp.name
                json.dump({"reducedPoints": reduced_points}, result_tmp)

            report_progress(job_id, 85, "Uploading PCA result...")
            result_key = f"computed/{job_id}/reduced{result_suffix}"
            result_size = os.path.getsize(result_path)
            minio_client.fput_object(MINIO_BUCKET, result_key, result_path)

            # Cleanup temp files
            os.unlink(tmp_path)
            os.unlink(result_path)

            compute_time = int((time.time() - start_time) * 1000)
            log.info(f"Job {job_id} completed in {compute_time}ms")

            report_complete(job_id, cache_key, result_key, metadata, compute_time, result_size)
            return

        elif operation == "dr-tsne":
            comps = params.get("components", 2)
            perplexity = params.get("perplexity", 10)
            max_iter = params.get("maxIterations", params.get("max_iterations", 300))
            learning_rate = params.get("learningRate", params.get("learning_rate", 200))
            reduced_points, meta = run_tsne(
                data,
                comps,
                perplexity=perplexity,
                max_iter=max_iter,
                learning_rate=learning_rate,
            )
            metadata = meta
            result_suffix = ".json"
            with tempfile.NamedTemporaryFile(suffix=result_suffix, delete=False, mode="w") as result_tmp:
                result_path = result_tmp.name
                json.dump({"reducedPoints": reduced_points}, result_tmp)

            report_progress(job_id, 85, "Uploading t-SNE result...")
            result_key = f"computed/{job_id}/reduced{result_suffix}"
            result_size = os.path.getsize(result_path)
            minio_client.fput_object(MINIO_BUCKET, result_key, result_path)

            os.unlink(tmp_path)
            os.unlink(result_path)

            compute_time = int((time.time() - start_time) * 1000)
            log.info(f"Job {job_id} completed in {compute_time}ms")

            report_complete(job_id, cache_key, result_key, metadata, compute_time, result_size)
            return

        elif operation == "dr-umap":
            comps = params.get("components", 2)
            n_neighbors = params.get("nNeighbors", params.get("neighbors", 8))
            min_dist = params.get("minDist", params.get("min_dist", 0.1))
            reduced_points, meta = run_umap(
                data,
                comps,
                n_neighbors=n_neighbors,
                min_dist=min_dist,
            )
            metadata = meta
            result_suffix = ".json"
            with tempfile.NamedTemporaryFile(suffix=result_suffix, delete=False, mode="w") as result_tmp:
                result_path = result_tmp.name
                json.dump({"reducedPoints": reduced_points}, result_tmp)

            report_progress(job_id, 85, "Uploading UMAP result...")
            result_key = f"computed/{job_id}/reduced{result_suffix}"
            result_size = os.path.getsize(result_path)
            minio_client.fput_object(MINIO_BUCKET, result_key, result_path)

            os.unlink(tmp_path)
            os.unlink(result_path)

            compute_time = int((time.time() - start_time) * 1000)
            log.info(f"Job {job_id} completed in {compute_time}ms")

            report_complete(job_id, cache_key, result_key, metadata, compute_time, result_size)
            return

        else:
            raise ValueError(f"Unknown operation: {operation}")

        report_progress(job_id, 70, "Writing result...")

        # Write result to temp file
        result_suffix = Path(file_storage_key).suffix
        with tempfile.NamedTemporaryFile(suffix=result_suffix, delete=False) as result_tmp:
            result_path = result_tmp.name
            write_vtk_file(result_data, result_path)

        report_progress(job_id, 85, "Uploading result...")

        # Upload to MinIO
        result_key = f"computed/{job_id}/result{result_suffix}"
        result_size = os.path.getsize(result_path)
        minio_client.fput_object(MINIO_BUCKET, result_key, result_path)

        report_progress(job_id, 95, "Finalizing...")

        # Cleanup temp files
        os.unlink(tmp_path)
        os.unlink(result_path)

        compute_time = int((time.time() - start_time) * 1000)
        log.info(f"Job {job_id} completed in {compute_time}ms")

        report_complete(job_id, cache_key, result_key, metadata, compute_time, result_size)

    except Exception as e:
        log.exception(f"Job {job_id} failed: {e}")
        report_failed(job_id, str(e))


# =============================================================================
# MAIN LOOP - FIXED FOR BULLMQ V4+
# =============================================================================

def main():
    """Main worker loop using BullMQ v4+ queue patterns."""
    log.info(f"Starting VTK worker: {WORKER_ID}")
    log.info(f"Redis: {REDIS_HOST}:{REDIS_PORT}")
    log.info(f"Queue: {QUEUE_NAME}")
    log.info(f"MinIO: {MINIO_ENDPOINT}/{MINIO_BUCKET}")

    # Connect to Redis
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

    # BullMQ v4+ key patterns
    prioritized_key = f"bull:{QUEUE_NAME}:prioritized"  # Sorted set for prioritized jobs
    wait_key = f"bull:{QUEUE_NAME}:wait"  # List for non-prioritized jobs (fallback)
    active_key = f"bull:{QUEUE_NAME}:active"

    log.info("Worker ready, waiting for jobs...")

    while True:
        try:
            job_id = None

            # First, try to get from prioritized sorted set (BullMQ v4+ default)
            # BZPOPMIN blocks and returns the item with lowest score (highest priority)
            result = r.bzpopmin(prioritized_key, timeout=1)

            if result:
                # result is (key, member, score) tuple
                job_id = result[1]
                log.debug(f"Got job from prioritized queue: {job_id}")
            else:
                # Fallback: try the wait list (non-prioritized jobs)
                job_id = r.brpoplpush(wait_key, active_key, timeout=1)
                if job_id:
                    log.debug(f"Got job from wait queue: {job_id}")

            if job_id:
                # Move to active set (for prioritized jobs)
                r.zadd(active_key, {job_id: time.time()})

                # Get job data from the job hash
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

                # Mark job as completed in BullMQ (move to completed set)
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
