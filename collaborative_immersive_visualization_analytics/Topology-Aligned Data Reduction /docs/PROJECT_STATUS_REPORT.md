# CIVA Reduction — Project Status Report

**Document version:** 1.0  
**Date:** March 2025  
**Project:** Topology-Aligned Data Reduction for Immersive Analytics (WebXR + VTK.js)

---

## 1. Executive Summary

Progress since the proposal has established a **working baseline** for interaction-driven, topology-aligned volumetric reduction in the browser. The system now includes: a **centralized configuration** (no magic numbers); a **modular architecture** (core/renderer, core/webxr, data, interaction, metrics, ui, utils); **dataset descriptors** and an **async loader** with progress, cancellation, and error handling; a **spatial LOD manager** with observable state transitions; **scalar state** with rollback; **rendering validation** (bounds, orientation, NaNs); **dynamic backend reduction** (TTK when available, VTK fallback); and **WebXR bootstrapping** with feature detection, head-tracked navigation, controller rays, and XR/renderer isolation. All of this supports the proposal’s goal of treating reduction as an **interaction-driven, reversible, and measurable** system behavior.

---

## 2. Sprints and Subtasks Completed

Work was organized into **phases and sprints** with multiple subtasks per sprint. Approximate counts:

| Phase / focus              | Sprints | Subtasks (approx.) | Status   |
|----------------------------|--------|---------------------|----------|
| **Phase 1 — Environment & first load** | 1      | 7                   | Complete |
| **Phase 2 — Reduction state & topology** | 1      | 4                   | Complete |
| **Phase 3 — LOD & backend** | 1      | 6                   | Complete |
| **Phase 4 — Config, modules, descriptors** | 1      | 8+                  | Complete |
| **Phase 5 — WebXR**        | 1      | 3                   | Complete |
| **Total completed**        | **5**  | **28+**             | —        |

### Phase 1 — Environment and first load (Sprint 1)

- Add dependencies: vtk.js, @types; ensure React/Vite build.
- Resolve VTK.js ESM/global issues (Vite config).
- Extend config for volumetric data (.vti, .vtr, .vts).
- DataLoader: load one .vti from config path, parse with XMLImageDataReader.
- RendererManager: RenderWindow, attach to container, Renderer, Camera, render loop.
- SceneManager: VolumeMapper + Volume, OTF/CTF, add to scene.
- Wire renderer in App; fix initialization (deferred init, OpenGL registration, first render).

### Phase 2 — Reduction state and topology (Sprint 2)

- State: `reduction.topologyThreshold`, `setTopologyThreshold`.
- OTF: values below threshold opacity 0, above visible; update on state change.
- UI: range slider for topology threshold (sublevel-set filter).
- VTK Interactor: mouse drag rotate/pan/zoom (TrackballCamera).

### Phase 3 — LOD and backend (Sprint 3)

- LOD: `reduction.lodLevel` (high/medium/low/full), `setLodLevel`, load correct VTI per level.
- `loadVolume(datasetId, lodLevel)` with static fallback; backend POST when API URL set.
- Backend: FastAPI, `/api/reduce`, TTK when available (persistence-based simplification), VTK shrink fallback.
- Dashboard: right-side panel, volume specs (resolution, spacing, voxels, load time), LOD buttons, backend status (TTK vs VTK vs static).
- Data: descriptor JSON, async loader (progress, AbortSignal, coarse/medium/fine/feature), LOD manager (one resolution per region, logged transitions), feature manager stub.

### Phase 4 — Config, modules, descriptors (Sprint 4)

- Config: topology threshold min/max/default and rendering scalar range in config (no magic numbers).
- Dataset descriptor: JSON schema (grid dimensions, resolution level, scalar fields, file size, voxel count); `ctBones.descriptor.json`; `loadDescriptor`.
- New/expanded modules: data/lod-manager, data/feature-manager, data/async-loader, data/dataset-descriptor; interaction/controller, interaction/roi; metrics/logging; ui/state; core/renderer/rendering-validation.
- Scalar state: one active scalar, `setActiveScalarField`, `rollbackScalarField`.
- Rendering validation: bounds, orientation, no NaNs; run before `setVolumeData`.

### Phase 5 — WebXR (Sprint 5)

- WebXR feature detection: `isWebXRAvailable`, `checkXRSupport`, `supportsImmersiveVR`; graceful desktop fallback.
- XRSessionManager: VTK RenderWindowHelper, inject OpenGL window from renderer; Enter VR / Exit VR; controller rays enabled.
- XR state isolation: no XR in data or renderer; renderer only exposes `getOpenGLRenderWindow()`.

---

## 3. Key Milestones Achieved

1. **Baseline visualization**  
   VTK.js volume rendering works without WebXR: volume ray-casting, transfer functions, lighting, trackball interaction, correct bounds and orientation.

2. **Topology-aligned reduction (client + server)**  
   - **Client:** Sublevel-set filtering via topology threshold (OTF: below threshold → opacity 0).  
   - **Server:** Optional TTK-based simplification or VTK spatial shrink; frontend shows “TTK” vs “VTK fallback” vs “static files.”

3. **LOD system**  
   Single active resolution per region; LOD switches load the appropriate volume (backend or static), update VolumeMapper and stats, and are observable/logged via SpatialLODManager.

4. **Modular architecture**  
   Clear modules: `core/renderer`, `core/webxr`, `data` (loader, lod-manager, feature-manager, descriptor), `interaction` (controller, roi), `metrics` (performance, logging), `ui/state`, `utils`. Single responsibility; no XR in data, no XR logic inside renderer.

5. **Configuration and validation**  
   Central config (dataset paths, LOD thresholds, XR, logging, topology bounds, scalar range). Validation for config and for volume data before render.

6. **WebXR path**  
   Feature detection, Enter/Exit VR, head-tracked navigation and controller rays via VTK helper, clean fallback to desktop when unsupported or denied.

7. **Dataset and loading**  
   Descriptor JSON, async loader with progress/cancel/errors, resolution levels (coarse/medium/fine/feature), backend-driven reduction with fallback.

---

## 3.1 Topology ToolKit (TTK) Integration

The **Topology ToolKit (TTK)** is the project’s primary backend engine for **topology-aligned data reduction**. It is used when the Python reduction service is run in an environment where TTK is installed (e.g. conda); otherwise the backend falls back to VTK-based spatial reduction.

**Role of TTK**

- **Persistence-based simplification:** TTK provides topological simplification (e.g. `ttkTopologicalSimplification` / `ttkTopologicalSimplificationByPersistence`) so that reduction is driven by the **persistence of features** in the scalar field (e.g. sublevel-set components), not by uniform downsampling alone. This aligns with the proposal’s goal of *topology-aligned* reduction.
- **Backend usage:** The FastAPI backend (`backend/reduce.py`) detects TTK at import time. When available and a persistence threshold is used, it applies TTK simplification; otherwise it uses VTK’s spatial shrink filter for LOD (coarse/medium/fine).
- **Frontend visibility:** The dashboard shows whether reduction is coming from **“Topology ToolKit (TTK)”**, **“VTK fallback (TTK not installed)”**, or **“static files”** (no backend), so users and evaluators can see which path is active.

**Deployment and limitations**

- **Installation:** TTK is not on PyPI; it is installed via **conda** (e.g. `conda install -c conda-forge topologytoolkit`). The README and `backend/setup_ttk.sh` describe setup. The backend’s `.venv` is used for FastAPI/uvicorn; for TTK, the backend must be run with a conda environment that has TTK (e.g. `civa-backend`), or via **Docker** (Linux image where conda-forge provides TTK).
- **Apple Silicon (osx-arm64):** The conda package `topologytoolkit` has no build for osx-arm64. On M1/M2/M3 Macs, options are: use the backend with **VTK fallback only**, or run the backend in **Docker** (Linux amd64) to use TTK.
- **References:** TTK is an open-source library for topological data analysis (e.g. Tierny, “Topology ToolKit,” IEEE TVCG 2020); the project uses it for persistence-based simplification of volumetric scalar data in the reduction pipeline.

---

## 4. Challenges Encountered

- **VTK.js initialization:** Early “renNode undefined” and “getKeyMatrices” errors required manual pipeline setup, deferred first render, and OpenGL implementation registration (Renderer, Camera, Volume, VolumeMapper).  
- **Rendering visibility:** Gray screen resolved by serving `data/datasets` via Vite middleware, correct base path, transfer function tuning, and explicit render after `setVolumeData` and `resetCamera`.  
- **Backend environment:** TTK is conda-only and not available on Apple Silicon (osx-arm64); documented use of VTK fallback or Docker. Ensuring the backend runs with the correct Python (conda vs venv) led to `run_ttk.sh` and clear README steps.  
- **Backend API:** Fixed 500 from VTI string encoding (bytes/latin-1), 404 from `DATA_DIR` resolution, and 405 by adding GET `/api/reduce` alongside POST.  
- **WebXR types:** VTK helper’s `setDrawControllersRay` and initial values (`initialized`, `xrSessionType`) not fully reflected in .d.ts; used type assertions and correct initial values.  
- **XR input:** `XRInputSourceArray` does not implement `.find`; used `Array.from(session.inputSources).find` for controller ray from frame.

---

## 5. Plans for the Next Phase

The following items are planned for the next phases, aligned with variable reduction, feature-based reduction, ROI, reversibility, system measurements, and logging/reproducibility.

---

### Phase 5 (continued) — Variable and feature-based reduction

**15. Variable reduction**

- Enforce **one scalar active** at a time; support **optional vector magnitude only**.
- Reject invalid combinations (e.g. multiple scalars or invalid field names).
- *Current:* Scalar state and `setActiveScalarField` / `rollbackScalarField` exist; UI and validation for “one scalar + optional vector magnitude” and invalid combinations are to be added.

**16. Feature-based reduction**

- Implement toggles for:
  - **Isosurfaces** (e.g. marching cubes at a given value).
  - **Slicing planes** (MPR: axial/sagittal/coronal).
  - **Threshold regions** (sublevel/superlevel ranges).
- Features render as **primary objects**; raw volume becomes **contextual** (reduced opacity).
- *Current:* Only volume ray-casting and topology threshold (OTF) are in place; isosurface/slice/threshold toggles and opacity roles are planned.

**17. ROI selection**

- Implement **3D ROI selection via controller** (e.g. ray-based box or region).
- ROI triggers:
  - **Higher-resolution load** for the selected region.
  - **Scoped rendering** (clip or focus on ROI).
- ROI must be **visualized clearly** (outline, handles, or wireframe).
- *Current:* `interaction/roi` has bounds types and config; no controller-driven 3D selection or visualization yet.

**18. Reversibility**

- Every reduction action must be **undoable** (LOD, threshold, feature toggles, ROI, scalar switch).
- Provide a **global “reset view”** action (camera + reduction state).
- *Current:* Scalar rollback exists; full undo stack and global reset are planned.

---

### Phase 6 — System measurements (mandatory)

**19. FPS measurement**

- Implement **continuous FPS tracking**.
- Record: **mean**, **min/max**, **p95 frame time** (or equivalent percentiles).
- *Current:* `metrics/performance-monitor` and `metrics-collector` exist; FPS series and p95/min/max reporting to be added.

**20. Interaction latency**

- Measure time from **reduction action → stable render** (e.g. LOD switch, threshold change, feature toggle).
- Log **latency per action type**.
- *Current:* Load time is stored in volume stats; action-to-stable-render latency not yet instrumented.

**21. Load time metrics**

- Measure: **time to first render**, **time to full resolution**.
- Separate **network vs processing time** where possible (e.g. fetch end vs parse/render complete).
- *Current:* Load time per volume is stored; first-render and network/processing split are planned.

**22. Memory metrics**

- Track: **loaded dataset sizes**, **JS heap usage snapshots** (e.g. performance.memory when available).
- Report approximations **clearly** (e.g. “heap ≈”, “dataset size from descriptor”).
- *Current:* Volume stats include dimensions/voxels; no heap or explicit dataset-size tracking yet.

---

### Phase 7 — Logging and reproducibility

**23. Event logging**

- Log every: **LOD switch**, **feature toggle**, **ROI action**, **scalar change** (and optionally threshold, Enter/Exit VR).
- **Timestamp** every event.
- *Current:* `metrics/logging` and config flags exist; LOD manager logs transitions; structured event log for all reduction actions is planned.

**24. Session export**

- Allow **exporting logs as JSON**.
- Logs must support **reconstruction of interaction sequences** (ordered, timestamped events with parameters).
- *Current:* Not implemented; to be built on top of event logging.

**25. Determinism**

- Ensure **same actions → same states** (e.g. same LOD + threshold + toggles → same visual and internal state).
- Avoid **nondeterministic rendering paths** (e.g. tie-break order, random seeds, or platform-dependent branches).
- *Current:* State is centralized and synchronous where applicable; formal determinism review and any fixes are planned.

---

## 6. Summary Table (Next Phase)

| #   | Item                     | Category        | Status   |
|-----|--------------------------|-----------------|----------|
| 15  | Variable reduction       | Reduction       | Planned  |
| 16  | Feature-based reduction  | Reduction       | Planned  |
| 17  | ROI selection (3D)       | Interaction     | Planned  |
| 18  | Reversibility / reset    | UX / state      | Planned  |
| 19  | FPS measurement          | Metrics         | Planned  |
| 20  | Interaction latency      | Metrics         | Planned  |
| 21  | Load time metrics        | Metrics         | Planned  |
| 22  | Memory metrics           | Metrics         | Planned  |
| 23  | Event logging            | Logging         | Planned  |
| 24  | Session export (JSON)    | Logging         | Planned  |
| 25  | Determinism              | Reproducibility | Planned  |

---

## 7. Document control

- **Sprints completed:** 5  
- **Subtasks completed:** 28+  
- **Next phase:** Variable and feature-based reduction (15–18), then system measurements (19–22), then logging and reproducibility (23–25).
