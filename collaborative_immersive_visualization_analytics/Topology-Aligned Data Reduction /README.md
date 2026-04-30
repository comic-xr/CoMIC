# Topology-Aligned Data Reduction

## Team Members
- Sai
- Tarun

## Project Description

**CIVA Reduction** is a WebXR-capable scientific volume viewer for CT and scalar-field datasets. The defining feature is **topology-aligned reduction** — instead of throwing away voxels with naive spatial downsampling, the project applies persistence-based topological simplification using the [Topology ToolKit (TTK)](https://topology-tool-kit.github.io/) so that the geometric features that *matter* for the data (peaks, valleys, persistent topological structures) survive while small noise features are flattened.

The frontend is a Vite + React + TypeScript single-page application that renders volumes through [vtk.js](https://kitware.github.io/vtk-js/). The backend is a FastAPI service that runs the TTK + VTK reduction pipeline on demand and returns a reduced VTI file.

What you can do with the app:

- **Topology reduction** — drive a persistence threshold from the UI; the backend runs `ttkPersistenceDiagram` → threshold by persistence → `ttkTopologicalSimplification` and returns a topologically-simplified VTI.
- **Spatial LOD** — four levels (`full`, `high`, `medium`, `low`) computed by `vtkImageShrink3D` (1×, 1×, 2×, 4×) on top of the topology step.
- **Switch datasets effortlessly** — any `.vti` dropped into `data/datasets/` is auto-discovered and selectable from a dropdown. Files outside the folder can be loaded via a browser file picker.
- **Robust scalar handling** — VTI files with no active scalar, multi-component arrays, or only cell-data scalars are auto-handled; the loader synthesizes a renderable 1-component scalar field if needed.
- **Interactive ROI** — wireframe sphere with X / Y / Z position sliders + radius. ROI local refinement overlays a higher-detail volume crop in that region.
- **Feature operators** — slice plane, isosurface (Marching Cubes), threshold region, contextual dim.
- **Auto LOD by camera distance** — optional automatic LOD switching based on `LOD_*` thresholds in `.env`.
- **WebXR** — `immersive-vr` session when the browser supports it; graceful fallback otherwise.
- **Reduction-state FSM** — `idle → base_volume → lod_switched → roi_refined → feature_focus` so the UI never drifts from data state.
- **Metrics dashboard** — FPS μ/min/max, frame ms p95, action latencies, volume load time, voxel count.
- **Session export** — dump session events + metrics as JSON.

### Datasets bundled with the project

`data/datasets/` is the canonical place for source `.vti` files. Two are committed:

| File | Type | Dimensions | Spacing | Scalar layout | Notes |
| --- | --- | --- | --- | --- | --- |
| `ctBones.vti` | CT bone scan | 256 × 256 × 256 | 1.0 × 1.0 × 1.0 | `Float64`, single 1-component array `ImageScalars`, range 0–255 | Primary demo dataset; ~11 MB compressed. Renders bones; great for opacity-floor tuning, ROI, isosurface |
| `waveletElevation.vti` | Synthetic wavelet decomposition | 21 × 21 × 21 | 1.0 × 1.0 × 1.0 | `Float32`, single 2-component array `RDataWithElevation`, range ≈ 37 – 277 | Tiny (~74 KB); demonstrates the multi-component auto-extraction path. Component 0 (elevation) is rendered |

A descriptor JSON ships alongside `ctBones`:

```json
{
  "id": "ctBones",
  "gridDimensions": [256, 256, 256],
  "resolutionLevel": "fine",
  "lodLevel": "high",
  "scalarFields": [
    { "name": "ImageScalars", "numberOfComponents": 1, "dataType": "Float64", "range": [0, 255] }
  ],
  "voxelCount": 16777216,
  "spacing": [1, 1, 1],
  "origin": [0, 0, 0],
  "path": "ctBones.vti"
}
```

Descriptor files are **optional**. When missing, the dashboard auto-derives the same metadata from the loaded `vtkImageData` via `descriptorFromVtkImageData()`.

### Architecture diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Browser                                    │
│                                                                         │
│   ┌──────────────┐  ┌────────────────┐  ┌────────────────────────────┐  │
│   │   React UI   │→ │  central store │→ │  vtk.js scene & renderer   │  │
│   │  (App.tsx)   │  │   (state/*)    │  │      (core/renderer/*)     │  │
│   └──────────────┘  └────────┬───────┘  └────────────────────────────┘  │
│         ↑                    │                                          │
│         │                    ▼                                          │
│   ┌──────────────────────────────────────┐                              │
│   │          data loader (data/*)        │                              │
│   │  loadVolumeWithProgress, loadVti,    │                              │
│   │  loadVtiFromFile, loadDescriptor     │                              │
│   └──────────────┬───────────────────────┘                              │
│                  │                                                      │
│                  │ static (vite middleware)        backend (proxied)    │
│                  ▼                                  ▼                   │
│        ┌──────────────────────┐        ┌─────────────────────────────┐  │
│        │  /data/datasets/*    │        │  /api/reduce  /api/health   │  │
│        │  (vite plugin reads  │        │  (Vite proxies to FastAPI)  │  │
│        │   from disk)         │        │                             │  │
│        └──────────────────────┘        └──────────────┬──────────────┘  │
└────────────────────────────────────────────────────────│─────────────────┘
                                                        ▼
                                       ┌───────────────────────────────┐
                                       │     FastAPI backend           │
                                       │     backend/main.py           │
                                       │     backend/reduce.py         │
                                       │                               │
                                       │  TTK persistence diagram →    │
                                       │  topological simplification → │
                                       │  vtkImageShrink3D LOD →       │
                                       │  return VTI bytes             │
                                       └───────────────────────────────┘
```

### Topology reduction pipeline

When the user moves the persistence slider or picks an LOD other than `full`, the frontend sends:

```json
POST /api/reduce
{
  "datasetId": "ctBones",
  "level": "medium",
  "persistenceThreshold": 0.42
}
```

Backend logic:

1. Load source `${DATA_DIR}/${datasetId}.vti` via `vtkXMLImageDataReader`.
2. If `persistenceThreshold == 0`, skip TTK and pass through.
3. If `0 < threshold ≤ 1`, multiply by `_estimate_max_persistence(image)` to get an absolute threshold (TTK's units).
4. Run `reduce_with_ttk(image, abs_threshold)` — TTK simplifies topological features below the threshold.
5. Apply `vtkImageShrink3D` for the chosen `level` (full/high = 1×, medium = 2×, low = 4×).
6. Return the resulting VTI as `application/octet-stream` plus an `X-Reduction-Metadata` JSON header:

```json
{
  "usedTTK": true,
  "persistenceThreshold": 105.6,
  "persistenceThresholdNormalized": 0.42,
  "reductionMode": "ttk-topological+lod",
  "level": "medium",
  "outputDimensions": [128, 128, 128],
  "outputSpacing": [2, 2, 2],
  "outputOrigin": [0, 0, 0],
  "ttkAvailable": true
}
```

---

## Components

```
CIVA_Reduction/
├── backend/
│   ├── main.py              # FastAPI app: /api/health, /api/reduce, /api/ttk
│   ├── reduce.py            # TTK + VTK reduction pipeline
│   ├── requirements.txt     # fastapi, uvicorn, vtk
│   ├── Dockerfile           # Linux amd64 image with conda + topologytoolkit
│   ├── run.sh               # local venv runner
│   ├── run_ttk.sh           # conda env runner
│   └── setup_ttk.sh         # one-shot conda env install
├── data/
│   ├── README.md
│   └── datasets/
│       ├── ctBones.vti                    # 256³ CT bone scan
│       ├── ctBones.descriptor.json        # optional metadata
│       └── waveletElevation.vti           # 21³ wavelet test field
├── docs/
│   ├── FINAL_PROJECT_REPORT.md
│   ├── PROJECT_STATUS_REPORT.md
│   └── CIVA_Topology_Reduction_Presentation.pptx
├── public/
├── scripts/
│   ├── generate_lod.py                    # legacy, pre-backend LOD generator
│   ├── generate_project_docx.py
│   └── generate_topology_pptx.py
├── src/
│   ├── App.tsx                            # Top-level React component (UI + load orchestration)
│   ├── main.tsx                           # ReactDOM entry, config validation
│   ├── config/
│   │   ├── appConfig.ts                   # env-var binding & defaults
│   │   ├── types.ts
│   │   └── validator.ts
│   ├── core/
│   │   ├── renderer/
│   │   │   ├── renderer-manager.ts        # vtk.js RenderWindow lifecycle
│   │   │   ├── scene-manager.ts           # Volume, OTF/CTF, ROI, isosurface, threshold
│   │   │   └── rendering-validation.ts    # validateVolumeData
│   │   └── webxr/
│   │       ├── xr-session-manager.ts
│   │       ├── xr-input-manager.ts
│   │       └── xr-feature-detection.ts
│   ├── data/
│   │   ├── data-loader.ts                 # loadVti, loadVolume, loadVtiFromFile, ensureRenderableScalars
│   │   ├── async-loader.ts                # progress / cancellation, loadDescriptor
│   │   ├── dataset-descriptor.ts          # descriptor schema + auto-derive helper
│   │   ├── lod-manager.ts                 # SpatialLODManager
│   │   ├── feature-manager.ts
│   │   └── immutable-assets.ts
│   ├── interaction/
│   │   ├── controller.ts
│   │   └── roi.ts
│   ├── metrics/
│   │   ├── metrics-collector.ts           # FPS, action latencies, performance snapshots
│   │   ├── performance-monitor.ts
│   │   ├── session-event-log.ts           # sessionEventAppend / sessionEventExportObject
│   │   └── logging.ts
│   ├── state/
│   │   ├── store.ts                       # central reactive store
│   │   ├── reduction-fsm.ts               # phase derivation
│   │   ├── reduction-phase.ts
│   │   └── types.ts
│   └── ui/
├── docker-compose.yml                     # backend service, port 8000
├── vite.config.ts                         # dev server, proxy, dataset listing endpoint
├── vite.config.js                         # compiled JS form (Vite picks this up)
├── package.json
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── .env                                   # all VITE_* knobs
└── README.md
```

### Module-by-module reference

#### `src/config/`

- **`appConfig.ts`** — Reads `VITE_*` env vars and produces the `DEFAULT_CONFIG` object. Helpers: `getEnvString`, `getEnvNumber`, `getEnvBoolean`, `isReductionApiEnabled()`.
- **`types.ts`** — Shape of `AppConfig` (dataset, LOD, ROI, rendering, XR, logging, performance, topology).
- **`validator.ts`** — `validateConfigOrThrow(cfg)` and `logConfigSummary(cfg)`. Called once at boot.

#### `src/data/`

- **`data-loader.ts`**
  - `loadVti(url)` — fetches and parses a VTI URL via `vtkXMLImageDataReader.setUrl`.
  - `loadVtiFromFile(file: File)` — wraps a picked `File` in a Blob URL and reuses `loadVti`. Same active-scalar setup as the backend response path.
  - `loadVolume(datasetId, lodLevel, signal?, persistenceThreshold?)` — entry point for backend-or-static loads. Tries `loadVolumeFromBackend` first if the API is enabled; falls back to `loadVolumeStatic`.
  - `loadVolumeFromBackend(datasetId, lodLevel, persistenceThreshold?, signal?)` — `POST /api/reduce`, parses VTI bytes from a Blob URL.
  - `loadVolumeWithProgress(datasetId, lodLevel, onProgress?, signal?, persistenceThreshold?)` — main UI path, emits `resolve / fetch / decode / done` progress phases.
  - `getVtiUrlForLod(basePath, datasetId, lodLevel)` — `${basePath}/${datasetId}_<lod>.vti` (or `.vti` for `full`).
  - `getVtkjsIndexUrlForLod(...)` — same for vtk.js HttpDataSetReader index.json layout.
  - `volumeFromVtkImageData(data)` — converts a `vtkImageData` into a `LoadedVolume` plain object.
  - `getVolumeStatsFromVtkImageData(data)` — pulls dimensions / spacing / voxel count for the dashboard.
  - `ensureRenderableScalars(image)` (private) — auto-activates a 1-component scalar; if only multi-component arrays exist, synthesizes a 1-component array from component 0 of the first array. Runs after every load.
  - `DataLoader` class — facade exposing the above as instance methods.
- **`async-loader.ts`**
  - `loadVolumeAsync(options)` — wraps `loadVolumeWithProgress` with structured `LoadResult { data, descriptor, lodLevel }` and `LoadError` semantics.
  - `loadDescriptor(datasetId, signal?)` — fetches `<basePath>/<id>.descriptor.json`; returns `null` if missing or invalid.
- **`dataset-descriptor.ts`**
  - Types `DatasetDescriptor`, `ScalarFieldDescriptor`, `ResolutionLevel`.
  - `voxelCountFromDimensions(dims)`.
  - `resolutionToLodLevel(level)` — maps `coarse / medium / fine / feature` → `low / medium / high / full`.
  - `descriptorFromVtkImageData(id, data)` — auto-derives a descriptor from a loaded volume so users don't need to write JSON.
- **`lod-manager.ts`** — `SpatialLODManager` tracks one active LOD per region (`global` by default), emits `LODStateTransition` events, and logs them.
- **`feature-manager.ts`** — Feature dataset registry (slice / iso / threshold dependencies).
- **`immutable-assets.ts`** — Read-only asset markers.

#### `src/state/`

- **`store.ts`** — Central reactive store. Actions:
  - `setTopologyThreshold(value)` — TTK persistence parameter (0–255 slider, normalized to [0,1] in App).
  - `setDisplayIntensityMin(value)` — opacity floor.
  - `setLodLevel(level)`, `setAutoLodByDistance(enabled)`.
  - `setFeatureSliceEnabled / setFeatureDimVolume / setFeatureIsosurfaceEnabled / setFeatureIsosurfaceValue / setFeatureThresholdEnabled / setFeatureThresholdRange`.
  - `setRoiWireframe / setRoiRefinementEnabled / setRoiRadiusWorld / setRoiCenterNorm`.
  - `setReductionBackendEnabled(bool)` — used by health probe + error fallback.
  - `setActiveScalarField / rollbackScalarField`.
  - `setVolumeStats(stats)`, `resetExplorationState()`.
  - `subscribe(listener)` returns an unsubscribe function.
- **`reduction-fsm.ts`** — `snapshotFsmState(ctx)` derives the canonical phase from current context. `FSM_TRANSITION_TABLE` documents allowed events.
- **`reduction-phase.ts`** — `ReductionPhase` enum-like type.
- **`types.ts`** — `AppState`, `ReductionState`, `ScalarState`, `VolumeStats`, `LodLevel`.

#### `src/core/renderer/`

- **`renderer-manager.ts`** — Owns the vtk.js `RenderWindow`, `OpenGLRenderWindow`, `Renderer`, `Interactor`. Methods: `init`, `startRenderLoop`, `stopRenderLoop`, `render`, `setFrameDeltaHook`, `dispose`.
- **`scene-manager.ts`** — Builds and updates the scene:
  - `setVolumeData(image, preset, displayIntensitySlider)` — installs the volume mapper, transfer functions, and unit distance.
  - `setDisplayIntensityFromSlider(value)` — updates the OTF without reload.
  - `setSlicePlaneEnabled(bool)`.
  - `setIsosurfaceEnabled(bool, value)`.
  - `setThresholdRegion(bool, min, max)`.
  - `setContextualVolumeDim(bool)`.
  - `setRoiWireframe(bool, radius, centerWorld?)` — cyan high-resolution sphere; reuses the existing source on subsequent calls so the sphere moves smoothly.
  - `setRoiRefinementVolumeData(image, radius, centerWorld?)` — ImageCropFilter + secondary VolumeMapper.
  - `getLastWorldBounds()`, `getVolumeCenter()`, `resetCamera()`, `dispose()`.
  - `buildCurrentOTFForDataRange(dMin, dMax)` (private) — unified opacity ramp that works at any slider value.
- **`rendering-validation.ts`** — `validateVolumeData(image)` checks bounds, scalar presence, and NaN-free buffers before rendering.

#### `src/core/webxr/`

- **`xr-feature-detection.ts`** — `supportsImmersiveVR()` Promise-based feature probe.
- **`xr-session-manager.ts`** — `XRSessionManager` wraps `navigator.xr.requestSession('immersive-vr')`.
- **`xr-input-manager.ts`** — Tracks XR controller inputs.

#### `src/interaction/`

- **`controller.ts`** — Camera / pointer interaction wiring.
- **`roi.ts`** — ROI utility helpers.

#### `src/metrics/`

- **`metrics-collector.ts`** — `MetricsCollector` records frame deltas, action latencies (`lod_switch_to_stable`, `feature_*_to_stable`, `roi_refinement_to_stable`, `volume_load`); exposes `getPerformanceSnapshot()` and `exportReport()`.
- **`performance-monitor.ts`** — FPS / frame-time aggregation.
- **`session-event-log.ts`** — `sessionEventAppend(name, payload)` and `sessionEventExportObject()`.
- **`logging.ts`** — Leveled logger with config gating.

#### `src/App.tsx`

- Mounts the renderer / scene / metrics collector inside a single `useEffect`.
- Subscribes to the store and translates state diffs into scene-manager calls.
- Tracks `datasetIdRef` so the same reload pipeline is reused when the user changes the dataset dropdown.
- Handlers: `handlePickFile` (file picker), `handleFileChange` (parse + apply uploaded file), `handleSelectDataset` (dropdown change), `handleEnterVR / handleExitVR`, `handleExportSession`.
- Builds the dashboard panel with all controls.

#### `vite.config.ts` / `vite.config.js`

- `serveDataDatasets()` plugin:
  - `GET /data/datasets/index.json` → returns `{"datasets": [...]}` (auto-discovery of `.vti` files).
  - `GET /data/datasets/<file>` → streams the file from disk.
- Proxies `/api/*` to `VITE_REDUCTION_PROXY_TARGET` for both dev and preview.
- Force-includes `@kitware/vtk.js` in `optimizeDeps`.

#### `backend/main.py`

- FastAPI app with permissive CORS. Routes:
  - `GET /api/health` — `{ ok, vtk, ttk, dataDir }`.
  - `GET /api/ttk` — diagnostic info (Python path, vtk/ttk availability).
  - `GET /api/reduce?datasetId=&level=&persistenceThreshold=` — query-string variant.
  - `POST /api/reduce` — accepts `{ datasetId, level, persistenceThreshold? }`, returns reduced VTI bytes plus an `X-Reduction-Metadata` header.

#### `backend/reduce.py`

TTK pipeline:

- `_read_vti(path)` / `_write_vti_to_bytes(image)` — VTI I/O.
- `_get_active_point_scalar_name(image)` / `_select_input_scalar(filter, name)` — robust scalar selection so TTK doesn't segfault on files with no active scalar.
- `reduce_with_ttk(image, threshold)` — `ttkPersistenceDiagram` → `vtkThreshold` on `Persistence` array → `ttkTopologicalSimplification`. Falls back to `ttkTopologicalSimplificationByPersistence` if the explicit pipeline fails.
- `_estimate_max_persistence(image)` — used to map a normalized [0,1] slider value into TTK's absolute persistence units.
- `_spatial_lod_grid(image, level)` — applies `vtkImageShrink3D` (1×, 1×, 2×, 4×).
- `reduce_volume(source_path, level, persistence_threshold?)` — orchestrates the full pipeline and emits a structured event log on stderr.

---

## How to Run

### 1. Prerequisites

- **Node.js 18.20.7** (pinned in `.nvmrc` and `package.json` engines)
- **npm 9+**
- **Docker Desktop** (recommended for backend on Apple Silicon — TTK has no `osx-arm64` build on conda-forge, so the backend runs in a Linux container)

### 2. Frontend only (no real reduction)

```bash
git clone <repo>
cd CIVA_Reduction
npm install
npm run dev
```

Open http://localhost:5173. With no backend running you will see "Reduction: Backend unreachable" and the app falls back to **static** loading (no real reduction, just file fetches).

### 3. Full stack — frontend + TTK backend

**Terminal A — backend in Docker** (Linux container with TTK pre-installed):

```bash
docker compose up --build
```

This builds an `amd64` image, mounts `data/datasets/` read-only into `/data/datasets`, and listens on port 8000.

Verify TTK is loaded:

```bash
curl http://localhost:8000/api/health
# → {"ok":true,"vtk":true,"ttk":true,"dataDir":"/data/datasets"}
```

**Terminal B — frontend**:

```bash
npm run dev
```

The dashboard should now show **"Reduction: Topology ToolKit (TTK)"** in indigo. The persistence slider and LOD buttons trigger real `POST /api/reduce` calls.

### 4. Backend alternatives (when Docker isn't available)

#### Local Python venv (no TTK, VTK fallback only)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
DATA_DIR=../data/datasets uvicorn main:app --reload --port 8000
```

Without TTK, `POST /api/reduce` returns HTTP 503 and the app falls back to static loading.

#### Conda env with TTK (Linux / Intel macOS only)

```bash
chmod +x backend/setup_ttk.sh && ./backend/setup_ttk.sh
conda activate civa-backend
cd backend && uvicorn main:app --reload --port 8000
```

### 5. Switching datasets

Three ways to bring a `.vti` file into the app:

#### a) Drop into `data/datasets/` (recommended; supports TTK reduction)

```bash
cp /path/to/myScan.vti data/datasets/
```

- **No restart needed**: served immediately at `/data/datasets/myScan.vti`; the backend's mounted `/data/datasets` sees it.
- **Refresh the browser once**: the DATASET dropdown auto-discovers `myScan` from `index.json`.
- **Pick `myScan` from the dropdown** — the app loads it through `POST /api/reduce`. LOD and persistence sliders run real TTK on it.

To make it the boot default, set `VITE_DEFAULT_DATASET=myScan` in `.env` and restart Vite.

#### b) Browser file picker (any file on disk; static-only)

Click **Load .vti file** in the DATASET card. Parsed locally via a Blob URL — no server round-trip, no reduction. Useful for quick previews.

#### c) Programmatic descriptor (optional)

If you want richer dashboard metadata, drop a `<id>.descriptor.json` next to the VTI file. Otherwise the descriptor is auto-derived at load time.

### 6. Verifying TTK is doing real work

```bash
curl -sS -X POST http://localhost:8000/api/reduce \
  -H 'Content-Type: application/json' \
  -d '{"datasetId":"ctBones","level":"medium","persistenceThreshold":0.5}' \
  -o /tmp/reduced.vti -D -
# Look for: X-Reduction-Metadata: {"usedTTK":true,...}
```

In the browser, open DevTools → Network → filter `reduce` → response headers should include `X-Reduction-Metadata` with `"usedTTK":true`.

### 7. npm scripts cheat-sheet

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR (port 5173) |
| `npm run build` | Type-check (`tsc -b`) + production bundle |
| `npm run preview` | Serve the production build |
| `npm run type-check` | TypeScript only, no emit |
| `npm run lint` | ESLint, zero-warning enforced |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |

### 8. Configuration via `.env`

All knobs live in `.env` (consumed by `src/config/appConfig.ts`).

**Dataset / reduction**

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_DATA_PATH` | `/data/datasets` | Base URL for static VTI |
| `VITE_DEFAULT_DATASET` | `ctBones` | Dataset id loaded on page open |
| `VITE_DATA_MAX_SIZE_MB` | `1000` | Soft size limit for sanity checks |
| `VITE_VOLUME_DATA_FORMAT` | `vti` | `vti` or `vtkjs` |
| `VITE_REDUCTION_API_URL` | empty in dev | Direct backend URL; empty → use Vite proxy |
| `VITE_REDUCTION_PROXY_TARGET` | `http://localhost:8000` | Where Vite proxies `/api/*` |
| `VITE_REDUCTION_FETCH_TIMEOUT_MS` | `15000` | Reduce-call timeout |

**LOD**

| Variable | Default |
| --- | --- |
| `VITE_LOD_MEDIUM_THRESHOLD_M` | 50 |
| `VITE_LOD_LOW_THRESHOLD_M` | 150 |
| `VITE_LOD_MAX_DISTANCE_M` | 500 |
| `VITE_LOD_MIN_POINT_SIZE_PX` | 1 |
| `VITE_LOD_MAX_POINT_SIZE_PX` | 10 |

**ROI**

| Variable | Default |
| --- | --- |
| `VITE_ROI_MIN_SIZE_M` | 1 |
| `VITE_ROI_MAX_SIZE_M` | 10000 |
| `VITE_ROI_DEFAULT_SHAPE` | `box` |
| `VITE_ROI_DEFAULT_SIZE_M` | 100 |
| `VITE_ROI_BOOST_LOD_WHEN_ACTIVE` | `true` |

**Rendering**

| Variable | Default |
| --- | --- |
| `VITE_RENDER_DEFAULT_OPACITY` | 0.8 |
| `VITE_RENDER_SAMPLE_DISTANCE_M` | 0 |
| `VITE_RENDER_POINT_SIZE_PX` | 2 |
| `VITE_RENDER_BG_COLOR` | `#000000` |
| `VITE_RENDER_GRID_ENABLED` | `true` |
| `VITE_RENDER_GRID_CELL_SIZE_M` | 10 |
| `VITE_RENDER_ANTIALIAS_ENABLED` | `true` |
| `VITE_RENDER_TARGET_FPS` | 60 |
| `VITE_RENDER_SCALAR_RANGE_MIN` / `MAX` | 0 / 255 |

**XR / logging / performance / topology**

| Variable | Default |
| --- | --- |
| `VITE_XR_ENABLED` | `true` |
| `VITE_XR_HAND_TRACKING_ENABLED` | `false` |
| `VITE_XR_HAPTIC_FEEDBACK_ENABLED` | `true` |
| `VITE_LOG_ENABLED` | `true` |
| `VITE_LOG_LEVEL` | `info` |
| `VITE_LOG_PERFORMANCE` | `true` |
| `VITE_LOG_INTERACTIONS` | `false` |
| `VITE_LOG_MAX_MESSAGES` | `1000` |
| `VITE_PERF_MONITORING_ENABLED` | `true` |
| `VITE_PERF_FPS_MONITOR_INTERVAL_MS` | `1000` |
| `VITE_PERF_MEMORY_WARNING_THRESHOLD_MB` | `512` |
| `VITE_PERF_AUTO_OPTIMIZE_ENABLED` | `true` |
| `VITE_PERF_AUTO_OPTIMIZE_FPS_THRESHOLD` | `30` |
| `VITE_TOPOLOGY_THRESHOLD_MIN` / `MAX` / `DEFAULT` | 0 / 255 / 0 |

### 9. Troubleshooting

**"Reduction: Backend unreachable" in yellow.** The frontend can't reach `/api/health`. Either the backend isn't running, or `VITE_REDUCTION_PROXY_TARGET` doesn't match the port the backend is listening on. Update one or the other and restart Vite.

**"Volume validation failed: No point scalars".** The current loader auto-handles multi-component arrays. If you still see it, the file likely has only CellData scalars — convert offline with ParaView's "Cell Data to Point Data" filter.

**"Failed to load resource ... chunk-XXXXX.js (404)".** Vite's dep-optimizer cache went stale.
```bash
rm -rf node_modules/.vite
npm run dev -- --force
```
Then **hard-refresh** the browser (Cmd+Shift+R / Ctrl+Shift+R).

**Two dev servers running on 5173 and 5174.** A previous Vite process didn't release its port:
```bash
pkill -9 -f vite
```
Then start one fresh instance with `npm run dev`.

**TTK errors on Apple Silicon.** `topologytoolkit` has no `osx-arm64` build on conda-forge. Run the backend in Docker (`docker compose up`).

### 10. API reference

#### `POST /api/reduce`

Body:
```ts
{
  datasetId: string;       // bare id; ".vti" is appended on the server
  level: 'full' | 'high' | 'medium' | 'low';
  persistenceThreshold?: number;  // 0–1 normalized, or absolute (>1)
}
```
Response: `application/octet-stream` (a complete VTI file) plus header `X-Reduction-Metadata: <JSON>`.

Error codes: 400 (invalid id) / 404 (file not found) / 500 (pipeline failure) / 503 (TTK or VTK not importable).

#### `GET /api/reduce`
Same as POST, with query-string parameters: `?datasetId=&level=&persistenceThreshold=`.

#### `GET /api/health`
```json
{ "ok": true, "vtk": true, "ttk": true, "dataDir": "/data/datasets" }
```

#### `GET /api/ttk`
Diagnostic info (Python path, vtk/ttk availability, data dir).

#### `GET /data/datasets/index.json`
Vite middleware route (dev only):
```json
{ "datasets": ["ctBones", "waveletElevation"] }
```

---

## Dependencies

### Frontend (Node)

Runtime dependencies (`package.json`):

| Package | Version | Purpose |
| --- | --- | --- |
| `@kitware/vtk.js` | `^30.7.1` | WebGL scientific visualization (VolumeMapper, MarchingCubes, ImageCropFilter, SphereSource, XML readers, transfer functions) |
| `react` | `^18.2.0` | UI framework |
| `react-dom` | `^18.2.0` | DOM renderer for React |

Dev dependencies:

| Package | Version | Purpose |
| --- | --- | --- |
| `vite` | `^5.4.21` | Dev server + bundler |
| `@vitejs/plugin-react` | `^4.3.0` | React Fast Refresh integration |
| `typescript` | `^5.2.2` | Static typing |
| `@types/node` | `^20.11.0` | Node typings |
| `@types/react` | `^18.2.43` | React typings |
| `@types/react-dom` | `^18.2.17` | React DOM typings |
| `eslint` | `^9.16.0` | Linting (zero-warning enforced) |
| `@eslint/js` | `^9.16.0` | ESLint core configs |
| `typescript-eslint` | `^8.18.0` | TS rules for ESLint |
| `prettier` | `^3.1.0` | Formatter |
| `eslint-config-prettier` | `^9.1.0` | Disables ESLint rules that conflict with Prettier |
| `eslint-plugin-prettier` | `^5.2.1` | Run Prettier as an ESLint rule |

### Backend (Python)

`backend/requirements.txt`:

| Package | Purpose |
| --- | --- |
| `fastapi` | Web framework for the reduction API |
| `uvicorn[standard]` | ASGI server |
| `vtk` | VTI I/O (`vtkXMLImageDataReader/Writer`), spatial LOD (`vtkImageShrink3D`), ROI / probe filters |
| `pydantic` | Request body validation (`ReduceRequest`) |

Required system-level (not via pip):

| Package | Source | Purpose |
| --- | --- | --- |
| `topologytoolkit` (TTK) | `conda-forge` | Topology pipeline: `ttkPersistenceDiagram`, `ttkTopologicalSimplification`, `ttkTopologicalSimplificationByPersistence` |

### Tooling

| Tool | Purpose |
| --- | --- |
| **Docker / Docker Compose** | Cross-platform TTK execution (the recommended path on Apple Silicon since TTK has no `osx-arm64` conda build) |
| **conda / Miniconda** | Alternative way to install TTK on Linux / Intel macOS |
| **Node.js 18.20.7** | Runtime (pinned in `.nvmrc`) |
| **Python 3.11** | Backend runtime (Docker image and conda env both target 3.11) |

### Browser support

- Modern browsers with WebGL 2 (Chromium / Firefox / Safari recent).
- WebXR features require Chromium + an immersive-VR-capable headset (Quest, Vive, etc.). The app gracefully degrades to desktop-only when XR is unavailable.

### Engineering standards

- ESM-only (no CommonJS in `src/`).
- TypeScript strict mode — no implicit `any`, explicit return types, prefer `unknown` before narrowing.
- No hardcoded paths — dataset and file paths come from env vars or descriptor JSON.
- Zero-warning ESLint.
- Prettier-formatted.
- One responsibility per module: UI in `App.tsx`/`ui/`, state in `state/`, scene/render in `core/renderer/`, data in `data/`.

### License

MIT — see [LICENSE](LICENSE).

### Acknowledgements

- [Kitware vtk.js](https://github.com/Kitware/vtk-js) — WebGL scientific visualization.
- [Topology ToolKit](https://topology-tool-kit.github.io/) — persistence-based topological simplification.
- [VTK](https://vtk.org/) — the canonical visualization library.
- [FastAPI](https://fastapi.tiangolo.com/) — Python web framework powering the backend.
