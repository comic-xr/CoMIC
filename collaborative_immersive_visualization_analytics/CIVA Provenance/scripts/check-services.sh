#!/bin/bash
# check-services.sh - Check status of all CIA Web services
# Usage: ./scripts/check-services.sh

echo "=== CIA Web Services Status ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_port() {
    local name=$1
    local port=$2
    echo -n "$name (port $port): "
    if nc -zv localhost $port 2>&1 | grep -q "succeeded\|open"; then
        echo -e "${GREEN}✅ Running${NC}"
        return 0
    else
        echo -e "${RED}❌ Not running${NC}"
        return 1
    fi
}

check_http() {
    local name=$1
    local url=$2
    echo -n "$name: "
    if curl -s --max-time 3 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ Not responding${NC}"
        return 1
    fi
}

echo "📦 Docker containers:"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker not available"
echo ""

echo "🔌 Port checks:"
check_port "PostgreSQL" 5432
check_port "MinIO API" 9000
check_port "MinIO Console" 9002
check_port "Redis" 6379
check_port "API Server" 3001
check_port "Y.js WebSocket" 9001
echo ""

echo "🏥 Health checks:"
check_http "API Health" "http://localhost:3001/api/health"
check_http "MinIO Health" "http://localhost:9000/minio/health/live"
echo ""

echo "📊 Database status:"
if docker exec cia-postgres pg_isready -U ciauser -d cia_analytics > /dev/null 2>&1; then
    echo -e "PostgreSQL: ${GREEN}✅ Ready${NC}"

    # Check Y.js persistence tables
    echo ""
    echo "Y.js Persistence Tables:"

    yjs_docs=$(docker exec cia-postgres psql -U ciauser -d cia_analytics -t -c "SELECT COUNT(*) FROM yjs_documents;" 2>/dev/null | xargs)
    yjs_updates=$(docker exec cia-postgres psql -U ciauser -d cia_analytics -t -c "SELECT COUNT(*) FROM yjs_updates;" 2>/dev/null | xargs)
    chat_messages=$(docker exec cia-postgres psql -U ciauser -d cia_analytics -t -c "SELECT COUNT(*) FROM chat_messages;" 2>/dev/null | xargs)

    if [ -n "$yjs_docs" ]; then
        echo "  • yjs_documents:  $yjs_docs rooms"
        echo "  • yjs_updates:    $yjs_updates updates"
        echo "  • chat_messages:  $chat_messages messages"
    else
        echo -e "  ${YELLOW}⚠ Y.js tables not found (run reset-database.sh)${NC}"
    fi
else
    echo -e "PostgreSQL: ${RED}❌ Not ready${NC}"
fi

echo ""
echo "📝 Recent chat messages:"
docker exec cia-postgres psql -U ciauser -d cia_analytics -c \
    "SELECT username, LEFT(message, 40) as message, timestamp FROM chat_messages ORDER BY timestamp DESC LIMIT 5;" 2>/dev/null || echo "  No messages or table not available"
echo ""

echo "=== End of status check ==="