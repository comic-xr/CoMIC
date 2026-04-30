# Data Directory

This directory contains datasets and data files.

**Note:** Do NOT hardcode dataset paths in source code. Use environment variables or configuration files to reference data locations.

## Dataset layout

- `datasets/` — VTK ImageData (`.vti`) volumes used by the app.

## Verified datasets (`data/datasets/`)

| File          | Dimensions   | Spacing | Format  | Notes                                      |
|---------------|--------------|--------|--------|--------------------------------------------|
| `ctBones.vti` | 256×256×256  | 1 1 1  | Float64 | Source volume; app and backend use this.   |

LOD files (e.g. `ctBones_high.vti`) are no longer stored here; reduction is done by the backend (TTK/VTK) or the app falls back to this full-resolution file.

All files are valid **VTK ImageData** XML with:
- `PointData` scalars (Float64)
- `appended` data, `vtkZLibDataCompressor`
- Origin `0 0 0`; scalar range 0–255 (suitable for bone/grayscale presets)

The app loads the default from config: base path `/data/datasets`, default ID `ctBones` → `/data/datasets/ctBones.vti`. In dev, the Vite plugin serves `data/datasets/` at that URL.

## Dynamic reduction (backend)

Volume levels (Full / High / Medium / Low) are produced **on demand** by the Python backend using [TTK](https://topology-tool-kit.github.io/) when available. Place the **source** VTI (e.g. `ctBones.vti`) in `data/datasets/` and run the backend; see the main [README](../README.md#dynamic-topology-aligned-reduction-backend--ttk) for setup.
