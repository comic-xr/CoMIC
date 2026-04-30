#!/usr/bin/env bash
# Install backend with TTK (Topology ToolKit) so the app shows "Reduction: Topology ToolKit (TTK)".
# Requires conda (e.g. Anaconda or Miniconda). Run from repo root or backend/.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Creating conda env 'civa-backend' with TTK (this may take a few minutes)..."
conda create -n civa-backend -c conda-forge topologytoolkit python=3.11 -y

echo ""
echo "Installing FastAPI and uvicorn in the new env..."
conda run -n civa-backend pip install fastapi "uvicorn[standard]"

echo ""
echo "Done. To run the backend with TTK:"
echo "  conda activate civa-backend"
echo "  cd $SCRIPT_DIR && uvicorn main:app --reload --port 8000"
echo ""
echo "Then restart the frontend; the dashboard should show 'Reduction: Topology ToolKit (TTK)'."
