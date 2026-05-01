#!/bin/bash
# Rebuild the API container without cache
# Usage: ./scripts/rebuild-api.sh

set -e

echo "Stopping api container..."
docker compose stop api

echo "Removing api container..."
docker compose rm -f api

echo "Rebuilding api with --no-cache..."
docker compose build --no-cache api

echo "Starting api container..."
docker compose up -d api

echo "Done! Tailing logs (Ctrl+C to exit)..."
docker compose logs -f api