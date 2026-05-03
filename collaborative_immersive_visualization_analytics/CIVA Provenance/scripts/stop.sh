#!/bin/bash
# stop.sh - Stop all CIA Web services
# Usage:
#   ./scripts/stop.sh           # Stop services (keep volumes)
#   ./scripts/stop.sh --clean   # Stop and remove volumes (data loss!)

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

CLEAN_MODE=false

for arg in "$@"; do
    case $arg in
        --clean|-c) CLEAN_MODE=true ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --clean, -c   Remove volumes (deletes all data)"
            echo "  --help, -h    Show this help"
            exit 0
            ;;
    esac
done

echo "🛑 Stopping CIA Web services..."
echo ""

# Stop main services
echo "📦 Stopping Docker Compose services..."
if [ "$CLEAN_MODE" = true ]; then
    echo -e "${YELLOW}⚠️  Removing volumes (all data will be deleted)${NC}"
    docker compose down -v
else
    docker compose down
fi

# Stop Matrix services
echo ""
echo "🔐 Stopping Matrix Federation services..."
if [ -f "server/docker-compose.matrix.yml" ]; then
    cd server
    if [ "$CLEAN_MODE" = true ]; then
        docker-compose -f docker-compose.matrix.yml down -v
    else
        docker-compose -f docker-compose.matrix.yml down
    fi
    cd ..
fi

# Stop LiveKit if running
if docker ps --format '{{.Names}}' | grep -q "livekit"; then
    echo ""
    echo "🎥 Stopping LiveKit services..."
    ./scripts/stop-livekit.sh 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}✅ All services stopped${NC}"

if [ "$CLEAN_MODE" = true ]; then
    echo ""
    echo -e "${YELLOW}💡 Data was removed. Run ./scripts/reset-database.sh to reinitialize.${NC}"
fi
