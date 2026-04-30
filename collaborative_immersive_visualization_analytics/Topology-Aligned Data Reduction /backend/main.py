"""
CIVA Reduction backend: topology-aligned volume reduction via TTK only.

Serves POST /api/reduce: given datasetId and level (or persistenceThreshold),
returns a reduced VTI file. Requires Topology ToolKit (TTK). VTK is used for VTI I/O and uniform spatial LOD (shrink) after the topology step so each level has distinct grid size.

Run: uvicorn main:app --reload --port 8000
Set DATA_DIR to the folder containing source VTI files (e.g. data/datasets).
"""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json

from reduce import reduce_volume, _TTK_AVAILABLE, _VTK_AVAILABLE

app = FastAPI(
    title="CIVA Reduction API",
    description="TTK topology reduction + spatial LOD (VTK shrink); VTK for VTI I/O",
)

# Do not combine allow_origins=["*"] with allow_credentials=True — browsers block that
# (often reported as "CORS request did not succeed" / status null). This API does not use cookies.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Reduction-Metadata"],
)

# Source VTI files directory (e.g. project root/data/datasets)
def _find_data_dir() -> Path:
    if os.environ.get("DATA_DIR"):
        p = Path(os.environ["DATA_DIR"]).resolve()
        if p.is_dir():
            return p
    # Backend is in repo/backend/; data is repo/data/datasets/
    backend_dir = Path(__file__).resolve().parent
    repo_root = backend_dir.parent
    default = repo_root / "data" / "datasets"
    if default.is_dir():
        return default
    # Fallback: cwd might be repo root
    if (Path.cwd() / "data" / "datasets").is_dir():
        return (Path.cwd() / "data" / "datasets").resolve()
    return default


DATA_DIR = _find_data_dir()


@app.on_event("startup")
def _log_startup():
    import sys
    print(f"[CIVA backend] Python = {sys.executable}", file=sys.stderr)
    print(f"[CIVA backend] DATA_DIR = {DATA_DIR} (exists: {DATA_DIR.is_dir()})", file=sys.stderr)
    print(f"[CIVA backend] TTK = {_TTK_AVAILABLE} (use conda env 'civa-backend' for TTK)", file=sys.stderr)
    if not _TTK_AVAILABLE:
        print(
            "[CIVA backend] TTK is not installed. POST /api/reduce will return 503 until topologytoolkit is available.",
            file=sys.stderr,
        )
        print(
            "[CIVA backend] Install TTK: `conda create -n civa-backend -c conda-forge topologytoolkit python=3.11 -y`, "
            "then activate, install FastAPI deps, and start via `./backend/run_ttk.sh`.",
            file=sys.stderr,
        )


class ReduceRequest(BaseModel):
    datasetId: str
    level: str = "high"  # full | high | medium | low
    persistenceThreshold: float | None = None  # optional; level used if omitted


@app.get("/api/health")
def health():
    # Reduction requires TTK; without it the app should treat the backend as not "reduce-ready".
    reduce_ready = _VTK_AVAILABLE and _TTK_AVAILABLE
    return {
        "ok": reduce_ready,
        "vtk": _VTK_AVAILABLE,
        "ttk": _TTK_AVAILABLE,
        "dataDir": str(DATA_DIR),
    }


@app.get("/api/ttk")
def ttk_status():
    import sys
    return {
        "python": sys.executable,
        "vtkAvailable": _VTK_AVAILABLE,
        "ttkAvailable": _TTK_AVAILABLE,
        "dataDir": str(DATA_DIR),
    }


def _do_reduce(dataset_id: str, level: str, persistence_threshold: float | None = None):
    """Shared reduce logic; returns (vti_bytes, dataset_id, level, meta) or raises HTTPException."""
    if not _VTK_AVAILABLE:
        raise HTTPException(status_code=503, detail="VTK not available (required for VTI I/O)")
    if not _TTK_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail=(
                "TTK is required for reduction. Install topologytoolkit (conda-forge)."
            ),
        )
    dataset_id = "".join(c for c in dataset_id if c.isalnum() or c in "._-").strip()
    if not dataset_id:
        raise HTTPException(status_code=400, detail="Invalid datasetId")
    level = (level or "high").lower()
    if level not in ("full", "high", "medium", "low"):
        level = "high"
    source_path = (DATA_DIR / f"{dataset_id}.vti").resolve()
    if not source_path.is_file():
        raise HTTPException(
            status_code=404,
            detail=f"Dataset not found: {dataset_id}.vti (looked in {DATA_DIR})",
        )
    try:
        vti_bytes, meta = reduce_volume(
            source_path,
            level=level,
            persistence_threshold=persistence_threshold,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return vti_bytes, dataset_id, level, meta


@app.get("/api/reduce")
def api_reduce_get(
    datasetId: str = "ctBones",
    level: str = "high",
    persistenceThreshold: float | None = None,
):
    """GET with query params: ?datasetId=ctBones&level=high&persistenceThreshold=0.5"""
    from fastapi.responses import Response

    vti_bytes, dataset_id, lev, meta = _do_reduce(datasetId, level, persistenceThreshold)
    return Response(
        content=vti_bytes,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename={dataset_id}_{lev}.vti",
            "X-Reduction-Metadata": json.dumps(meta),
        },
    )


@app.post("/api/reduce")
def api_reduce_post(body: ReduceRequest):
    """POST with JSON body: { \"datasetId\": \"ctBones\", \"level\": \"high\" }"""
    from fastapi.responses import Response

    vti_bytes, dataset_id, lev, meta = _do_reduce(
        body.datasetId,
        body.level or "high",
        body.persistenceThreshold,
    )
    return Response(
        content=vti_bytes,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename={dataset_id}_{lev}.vti",
            "X-Reduction-Metadata": json.dumps(meta),
        },
    )
