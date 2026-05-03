#!/bin/bash
# stop-livekit.sh - Stop LiveKit voice chat services
#
# This script stops:
# 1. LiveKit server (native or Docker)
# 2. Token server (Node.js process)

# Colors
GREEN="$(echo -e '\033[0;32m')"
YELLOW="$(echo -e '\033[1;33m')"
NC="$(echo -e '\033[0m')"

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

echo ""
echo "🛑 Stopping LiveKit Voice Services..."
echo ""

# Stop token server
if [ -f /tmp/cia-token-server.pid ]; then
    TOKEN_PID=$(cat /tmp/cia-token-server.pid)
    if kill -0 $TOKEN_PID 2>/dev/null; then
        echo "Stopping token server (PID: $TOKEN_PID)..."
        kill $TOKEN_PID
        rm /tmp/cia-token-server.pid
        print_status "Token server stopped"
    else
        print_warning "Token server not running (stale PID file)"
        rm /tmp/cia-token-server.pid
    fi
else
    # Try to find by port
    TOKEN_PID=$(lsof -t -i :3002 2>/dev/null)
    if [ -n "$TOKEN_PID" ]; then
        echo "Stopping token server (PID: $TOKEN_PID)..."
        kill $TOKEN_PID
        print_status "Token server stopped"
    else
        print_warning "Token server not running"
    fi
fi

# Stop LiveKit server (check native first, then Docker)
LIVEKIT_STOPPED=false

# Check for native livekit-server process
if [ -f /tmp/cia-livekit.pid ]; then
    LIVEKIT_PID=$(cat /tmp/cia-livekit.pid)
    if kill -0 $LIVEKIT_PID 2>/dev/null; then
        echo "Stopping native LiveKit server (PID: $LIVEKIT_PID)..."
        kill $LIVEKIT_PID
        rm /tmp/cia-livekit.pid
        print_status "Native LiveKit server stopped"
        LIVEKIT_STOPPED=true
    else
        print_warning "Native LiveKit not running (stale PID file)"
        rm /tmp/cia-livekit.pid
    fi
fi

# If native wasn't stopped, try finding by port
if [ "$LIVEKIT_STOPPED" = false ]; then
    LIVEKIT_PID=$(lsof -t -i :7880 2>/dev/null)
    if [ -n "$LIVEKIT_PID" ]; then
        echo "Stopping LiveKit server (PID: $LIVEKIT_PID)..."
        kill $LIVEKIT_PID
        print_status "LiveKit server stopped"
        LIVEKIT_STOPPED=true
    fi
fi

# Check for Docker container
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^cia-livekit$'; then
    echo "Stopping LiveKit container..."
    docker stop cia-livekit
    print_status "LiveKit container stopped"
    LIVEKIT_STOPPED=true
fi

if [ "$LIVEKIT_STOPPED" = false ]; then
    print_warning "LiveKit server not running"
fi

echo ""
print_status "Voice services stopped"
echo ""

# Only show Docker cleanup tip if container exists
if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q '^cia-livekit$'; then
    echo "💡 To remove the LiveKit container entirely, run:"
    echo "   docker rm cia-livekit"
    echo ""
fi