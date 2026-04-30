"""
Topology-aligned volume reduction using TTK only (no VTK spatial shrink fallback).

VTK is still used for VTI I/O and for auxiliary filters inside the TTK pipelines (e.g. probes).

TTK (Topology ToolKit): https://topology-tool-kit.github.io/
- Use conda: conda install -c conda-forge topologytoolkit

If TTK is not importable, reduce_volume raises — callers should return HTTP 503.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

# VTK required for reading/writing VTI
try:
    import vtk
    _VTK_AVAILABLE = True
except ImportError:
    _VTK_AVAILABLE = False

# Prefer 'topologytoolkit' to avoid conflict with Python's tkinter.ttk
_ttk_module = None
_TTK_AVAILABLE = False
for _mod_name in ("topologytoolkit", "ttk"):
    try:
        _ttk_module = __import__(_mod_name)
        if hasattr(_ttk_module, "ttkTopologicalSimplification") or hasattr(
            _ttk_module, "ttkTopologicalSimplificationByPersistence"
        ):
            _TTK_AVAILABLE = True
            break
    except ImportError:
        continue
if not _TTK_AVAILABLE:
    _ttk_module = None


def _read_vti(path: Path):
    """Read VTI file to vtkImageData."""
    if not _VTK_AVAILABLE:
        raise RuntimeError("VTK is required. Install with: pip install vtk")
    reader = vtk.vtkXMLImageDataReader()
    reader.SetFileName(str(path))
    reader.Update()
    image = reader.GetOutput()
    if image is None or image.GetNumberOfPoints() == 0:
        raise RuntimeError(f"Failed to read or empty image: {path}")
    return image


def _write_vti_to_bytes(image) -> bytes:
    """Write vtkImageData to VTI file in memory, return bytes."""
    writer = vtk.vtkXMLImageDataWriter()
    writer.SetInputData(image)
    writer.SetWriteToOutputString(True)
    writer.Write()
    out = writer.GetOutputString()
    if isinstance(out, bytes):
        return out
    return out.encode("latin-1")


def _get_active_point_scalar_name(image) -> Optional[str]:
    """
    Return the active point scalar array name for a vtkImageData.
    TTK VTK filters typically require the input scalar array to be explicitly selected.
    VTI readers often leave no "active" scalar; fall back to the first 1-component array.
    """
    try:
        pd = image.GetPointData()
        if pd is None:
            return None
        scalars = pd.GetScalars()
        if scalars is not None:
            name = scalars.GetName()
            if name:
                return str(name)
        n = pd.GetNumberOfArrays()
        for i in range(n):
            name = pd.GetArrayName(i)
            if not name:
                continue
            arr = pd.GetArray(i)
            if arr is not None and arr.GetNumberOfComponents() == 1:
                return str(name)
        return None
    except Exception:
        return None


def _select_input_scalar(filter_obj, scalar_name: str) -> None:
    """
    Best-effort: select the scalar array for a VTK/TTK filter.
    Prevents TTK segfaults like:
      'Attempt to get an input array for an index that has not been specified'
    """
    # Most VTK algorithms support SetInputArrayToProcess.
    if hasattr(filter_obj, "SetInputArrayToProcess"):
        try:
            filter_obj.SetInputArrayToProcess(
                0, 0, 0, vtk.vtkDataObject.FIELD_ASSOCIATION_POINTS, scalar_name
            )
        except Exception:
            pass
    # Some TTK wrappers expose SetScalarField like ParaView (POINTS, name).
    if hasattr(filter_obj, "SetScalarField"):
        try:
            filter_obj.SetScalarField(["POINTS", scalar_name])
        except Exception:
            pass


def reduce_with_ttk(image, persistence_threshold: float):
    """
    Topology-aligned reduction using TTK's topological simplification.
    persistence_threshold: absolute persistence threshold (TTK units).
    Higher value = more simplification (fewer features).
    """
    if not _TTK_AVAILABLE or _ttk_module is None:
        return None
    try:
        scalar_name = _get_active_point_scalar_name(image)
        if not scalar_name:
            # Cannot run TTK without a selected scalar array; avoid segfault.
            return None

        # --- Explicit persistence-diagram thresholding + topological simplification ---
        # This follows the conceptual TTK pipeline:
        # 1) compute persistence diagram
        # 2) threshold persistence pairs by persistence >= persistence_threshold
        # 3) use thresholded persistence pairs as constraints for TopologicalSimplification
        PDiagFilter = getattr(_ttk_module, "ttkPersistenceDiagram", None)
        TopSimplFilter = getattr(_ttk_module, "ttkTopologicalSimplification", None)
        if PDiagFilter is not None and TopSimplFilter is not None:
            try:
                diag = PDiagFilter()
                diag.SetInputData(image)
                _select_input_scalar(diag, scalar_name)
                diag.Update()
                diag_out = diag.GetOutput()
                if diag_out is not None:
                    # Determine where the "Persistence" array lives.
                    cell_data = diag_out.GetCellData() if hasattr(diag_out, "GetCellData") else None
                    point_data = diag_out.GetPointData() if hasattr(diag_out, "GetPointData") else None
                    use_cells = cell_data is not None and hasattr(cell_data, "HasArray") and cell_data.HasArray("Persistence")
                    assoc = vtk.vtkDataObject.FIELD_ASSOCIATION_CELLS if use_cells else vtk.vtkDataObject.FIELD_ASSOCIATION_POINTS

                    max_p = _estimate_max_persistence(image) or persistence_threshold
                    upper = max(max_p, persistence_threshold)

                    thr = vtk.vtkThreshold()
                    thr.SetInputData(diag_out)
                    # Threshold based on the persistence array on the chosen field association.
                    thr.SetInputArrayToProcess(0, 0, 0, assoc, "Persistence")
                    thr.ThresholdBetween(persistence_threshold, upper)
                    thr.Update()
                    constraints = thr.GetOutput()

                    simpl = TopSimplFilter()
                    # Port 0: domain
                    try:
                        simpl.SetInputData(0, image)
                    except Exception:
                        simpl.SetInputData(image)
                    # Port 1: constraints (best-effort; multi-input API differs across wrappers)
                    try:
                        simpl.SetInputData(1, constraints)
                    except Exception:
                        pass

                    # Some TTK builds still require/benefit from this persistence parameter.
                    if hasattr(simpl, "SetPersistenceThreshold"):
                        simpl.SetPersistenceThreshold(persistence_threshold)
                    _select_input_scalar(simpl, scalar_name)

                    simpl.Update()
                    out = simpl.GetOutput()
                    if out is not None and out.GetNumberOfPoints() > 0:
                        # Ensure vtkImageData for VTI writer.
                        if hasattr(out, "IsA") and out.IsA("vtkImageData"):
                            return out
                        try:
                            probe = vtk.vtkProbeFilter()
                            probe.SetInputData(out)
                            probe.SetSourceData(image)
                            probe.Update()
                            probed = probe.GetOutput()
                            if probed is not None and hasattr(probed, "IsA") and probed.IsA("vtkImageData"):
                                return probed
                        except Exception:
                            pass
                        # If resampling fails, fall back below.
            except Exception:
                # If explicit pipeline fails, fall back to the persistence-based simplification filter.
                pass

        # --- Fallback: TopologicalSimplificationByPersistence ---
        # If explicit constraint pipeline fails (e.g. due to wrapper incompatibilities),
        # use the persistence-based simplification filter directly.
        SimplFilter = getattr(_ttk_module, "ttkTopologicalSimplificationByPersistence", None) or getattr(
            _ttk_module, "ttkTopologicalSimplification", None
        )
        if SimplFilter is None:
            return None

        simpl = SimplFilter()
        simpl.SetInputData(image)
        _select_input_scalar(simpl, scalar_name)
        if hasattr(simpl, "SetPersistenceThreshold"):
            simpl.SetPersistenceThreshold(persistence_threshold)
        if hasattr(simpl, "SetThresholdIsAbsolute"):
            try:
                simpl.SetThresholdIsAbsolute(True)
            except Exception:
                pass

        simpl.Update()
        out = simpl.GetOutput()
        if out is None or out.GetNumberOfPoints() == 0:
            return None

        if hasattr(out, "IsA") and out.IsA("vtkImageData"):
            return out
        try:
            probe = vtk.vtkProbeFilter()
            probe.SetInputData(out)
            probe.SetSourceData(image)
            probe.Update()
            probed = probe.GetOutput()
            if probed is not None and hasattr(probed, "IsA") and probed.IsA("vtkImageData"):
                return probed
        except Exception:
            pass
    except Exception:
        pass
    return None


def _estimate_max_persistence(image) -> Optional[float]:
    """
    Estimate the maximum persistence value from ttkPersistenceDiagram output.
    Used to map a normalized persistence threshold from the frontend into TTK's absolute units.
    """
    if not _TTK_AVAILABLE or _ttk_module is None:
        return None

    PDiagFilter = getattr(_ttk_module, "ttkPersistenceDiagram", None)
    if PDiagFilter is None:
        return None

    try:
        scalar_name = _get_active_point_scalar_name(image)
        if not scalar_name:
            return None
        diag = PDiagFilter()
        diag.SetInputData(image)
        _select_input_scalar(diag, scalar_name)
        diag.Update()
        out = diag.GetOutput()
        if out is None:
            return None

        # Try cell data first, then point data.
        arrays_to_try = []
        cell_data = out.GetCellData() if hasattr(out, "GetCellData") else None
        if cell_data is not None:
            arrays_to_try.append(cell_data)
        point_data = out.GetPointData() if hasattr(out, "GetPointData") else None
        if point_data is not None:
            arrays_to_try.append(point_data)

        for data in arrays_to_try:
            n = data.GetNumberOfArrays()
            for i in range(n):
                arr = data.GetArray(i)
                if arr is None:
                    continue
                name = data.GetArrayName(i)
                if name is None:
                    continue
                if name.lower() == "persistence":
                    max_val = None
                    nt = arr.GetNumberOfTuples()
                    for j in range(nt):
                        v = arr.GetTuple1(j)
                        if v is None:
                            continue
                        if isinstance(v, (int, float)):
                            if max_val is None or v > max_val:
                                max_val = float(v)
                    return max_val
    except Exception:
        return None

    return None


def _spatial_lod_grid(image, level: str):
    """
    Uniform vtkImageShrink3D decimation for LOD (full/high=1, medium=2, low=4).
    Applied after TTK (or identity) so resolution/spacing in Volume specs change with level.
    This is display/LOD tiering, not a substitute for TTK topological simplification.
    """
    factors = {"full": 1, "high": 1, "medium": 2, "low": 4}
    factor = factors.get((level or "high").lower(), 1)
    if factor <= 1:
        return image
    dims = image.GetDimensions()
    n0 = dims[0]
    if n0 % factor != 0:
        return image
    shrink = vtk.vtkImageShrink3D()
    shrink.SetInputData(image)
    shrink.SetShrinkFactors(factor, factor, factor)
    shrink.AveragingOn()
    shrink.Update()
    return shrink.GetOutput()


def reduce_volume(
    source_path: Path,
    level: str = "high",
    persistence_threshold: Optional[float] = None,
) -> tuple[bytes, dict]:
    """
    Load VTI from source_path and return reduced VTI bytes.

    Requires TTK (_TTK_AVAILABLE). Topology: TTK simplification when persistence > 0 (normalized),
    else identity on the source grid. A final vtkImageShrink3D step applies LOD (full/high=1×,
    medium=2×, low=4×) so output dimensions match the requested level for Volume specs.

    Absolute persistence (> 1) is passed through to TTK as-is.

    level: 'full' | 'high' | 'medium' | 'low' — spatial LOD + default persistence when threshold omitted.
    """
    if not _TTK_AVAILABLE:
        raise RuntimeError(
            "TTK is required for reduction. Install topologytoolkit (e.g. conda install -c conda-forge topologytoolkit)."
        )

    image = _read_vti(source_path)

    if persistence_threshold is None:
        persistence_threshold = {"full": 0.0, "high": 0.0, "medium": 0.5, "low": 0.9}.get(level, 0.0)

    pt_raw = persistence_threshold
    mapped_persistence_threshold = float(pt_raw)
    pt = float(pt_raw)

    # No TTK simplification; still apply spatial LOD so grid size matches selected level.
    if 0.0 <= pt <= 1.0 and pt == 0.0:
        out = _spatial_lod_grid(image, level)
        vti_bytes = _write_vti_to_bytes(out)
        dims = list(out.GetDimensions()) if hasattr(out, "GetDimensions") else None
        spacing = list(out.GetSpacing()) if hasattr(out, "GetSpacing") else None
        origin = list(out.GetOrigin()) if hasattr(out, "GetOrigin") else None
        meta = {
            "usedTTK": False,
            "persistenceThreshold": 0.0,
            "persistenceThresholdNormalized": pt_raw,
            "reductionMode": "identity-passthrough+lod",
            "level": level,
            "outputDimensions": dims,
            "outputSpacing": spacing,
            "outputOrigin": origin,
            "ttkAvailable": True,
        }
        _log_reduction_event(meta, mapped_persistence_threshold, pt_raw, level, dims, spacing, origin)
        return vti_bytes, meta

    if 0.0 <= pt <= 1.0:
        max_p = _estimate_max_persistence(image)
        if max_p is not None and max_p > 0:
            mapped_persistence_threshold = pt * float(max_p)

    reduced = reduce_with_ttk(image, mapped_persistence_threshold)
    if reduced is None:
        raise RuntimeError(
            "TTK topological simplification produced no output. "
            "Check scalar arrays in the VTI and your TTK build."
        )

    out = _spatial_lod_grid(reduced, level)
    dims = list(out.GetDimensions()) if hasattr(out, "GetDimensions") else None
    spacing = list(out.GetSpacing()) if hasattr(out, "GetSpacing") else None
    origin = list(out.GetOrigin()) if hasattr(out, "GetOrigin") else None
    vti_bytes = _write_vti_to_bytes(out)
    meta = {
        "usedTTK": True,
        "persistenceThreshold": mapped_persistence_threshold,
        "persistenceThresholdNormalized": pt_raw,
        "reductionMode": "ttk-topological+lod",
        "level": level,
        "outputDimensions": dims,
        "outputSpacing": spacing,
        "outputOrigin": origin,
        "ttkAvailable": True,
    }
    _log_reduction_event(meta, mapped_persistence_threshold, pt_raw, level, dims, spacing, origin)
    return vti_bytes, meta


def _log_reduction_event(
    meta: dict,
    mapped: float,
    normalized: float | None,
    level: str,
    dims: list | None,
    spacing: list | None,
    origin: list | None,
) -> None:
    try:
        import sys

        print(
            json.dumps(
                {
                    "event": "reduction",
                    "usedTTK": meta.get("usedTTK"),
                    "reductionMode": meta.get("reductionMode"),
                    "persistenceThresholdNormalized": normalized,
                    "persistenceThresholdMapped": mapped,
                    "level": level,
                    "outputDimensions": dims,
                    "outputSpacing": spacing,
                    "outputOrigin": origin,
                }
            ),
            file=sys.stderr,
        )
    except Exception:
        pass
