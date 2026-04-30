#!/usr/bin/env bash
# Run the backend. Prefer conda env 'civa-backend' (TTK) if active, else use .venv.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Prefer conda env civa-backend when active (for TTK). CONDA_PREFIX usually ends with /civa-backend.
USE_CONDA=
if [ -n "$CONDA_PREFIX" ] && [ -x "$CONDA_PREFIX/bin/uvicorn" ]; then
  case "$CONDA_PREFIX" in
    *civa-backend) USE_CONDA=1 ;;
    *civa-backend/) USE_CONDA=1 ;;
  esac
fi
if [ -n "$USE_CONDA" ]; then
  echo "[CIVA] Using conda env: civa-backend (TTK) at $CONDA_PREFIX"
  exec "$CONDA_PREFIX/bin/uvicorn" main:app --reload --port 8000
fi

if [ ! -d ".venv" ]; then
  echo "No .venv found. Create it: python -m venv .venv && .venv/bin/pip install -r requirements.txt"
  echo "For TTK: conda create -n civa-backend -c conda-forge topologytoolkit python=3.11 -y"
  echo "         conda activate civa-backend && pip install fastapi 'uvicorn[standard]'"
  echo "         Then run this script again (with civa-backend active)."
  exit 1
fi
# Debug: show why conda wasn't used (when CONDA_PREFIX is set but we're still using .venv)
if [ -n "$CONDA_PREFIX" ]; then
  echo "[CIVA] Conda env found but not civa-backend or no uvicorn: CONDA_DEFAULT_ENV=$CONDA_DEFAULT_ENV CONDA_PREFIX=$CONDA_PREFIX" 1>&2
fi
echo "[CIVA] Using .venv (VTK only; no TTK)"
exec .venv/bin/uvicorn main:app --reload --port 8000
