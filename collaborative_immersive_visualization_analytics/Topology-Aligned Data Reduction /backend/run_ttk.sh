#!/usr/bin/env bash
# Run the backend with the civa-backend conda env (TTK) by absolute path.
# Use this when the IDE or .venv keeps taking over and you see "TTK = False".
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Find civa-backend env path (no activation needed)
CONDA_ENV=
case "$CONDA_PREFIX" in *civa-backend*) CONDA_ENV="$CONDA_PREFIX" ;; esac
if [ -z "$CONDA_ENV" ] && command -v conda &>/dev/null; then
  CONDA_BASE=$(conda info --base 2>/dev/null)
  [ -n "$CONDA_BASE" ] && CONDA_ENV="$CONDA_BASE/envs/civa-backend"
fi
# Fallback: try common conda install locations (when conda isn't in script PATH)
for base in "/opt/anaconda3" "/opt/miniconda3" "$HOME/anaconda3" "$HOME/miniconda3" "$HOME/.conda"; do
  if [ -z "$CONDA_ENV" ] && [ -x "$base/envs/civa-backend/bin/python" ]; then
    CONDA_ENV="$base/envs/civa-backend"
    break
  fi
done
if [ -z "$CONDA_ENV" ] || [ ! -x "$CONDA_ENV/bin/python" ]; then
  echo "civa-backend conda env not found. Create it with:"
  echo "  conda create -n civa-backend -c conda-forge topologytoolkit python=3.11 -y"
  echo "  conda activate civa-backend && pip install fastapi 'uvicorn[standard]'"
  exit 1
fi

echo "[CIVA] Using TTK (civa-backend): $CONDA_ENV/bin/python"
exec "$CONDA_ENV/bin/python" -m uvicorn main:app --reload --port 8000
