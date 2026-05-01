#!/bin/bash
# reset-database.sh
# Wipes the database and restarts with fresh schema
# Usage:
#   ./scripts/reset-database.sh           # Interactive reset
#   ./scripts/reset-database.sh --quick   # Fast reset, no prompts
#   ./scripts/reset-database.sh --rebuild # Reset + rebuild Docker images

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

QUICK_MODE=false
REBUILD_MODE=false
VERBOSE=false

for arg in "$@"; do
    case $arg in
        --quick|-q) QUICK_MODE=true ;;
        --rebuild|-r) REBUILD_MODE=true ;;
        --verbose|-v) VERBOSE=true ;;
    esac
done

# Helper function to run commands with optional output
run_cmd() {
    if [ "$VERBOSE" = true ]; then
        "$@"
    else
        "$@" > /dev/null 2>&1
    fi
}

# Helper to run command and capture output on failure
run_or_fail() {
    local output
    local exit_code

    output=$("$@" 2>&1) && exit_code=$? || exit_code=$?

    if [ $exit_code -ne 0 ]; then
        echo -e "${RED}❌ Command failed: $*${NC}"
        echo "$output"
        return $exit_code
    fi

    if [ "$VERBOSE" = true ]; then
        echo "$output"
    fi
    return 0
}

if [ "$QUICK_MODE" = false ]; then
    echo "============================================"
    echo "  Database Reset Script"
    echo "============================================"
    echo ""
    [ "$REBUILD_MODE" = true ] && echo -e "${YELLOW}Mode: Full rebuild (will rebuild Docker images)${NC}"
    echo -e "${YELLOW}⚠️  WARNING: This will DELETE ALL DATA!${NC}"
    echo ""
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Cancelled."
        exit 0
    fi
    echo ""
fi

echo "🔄 Resetting database and Y.js state..."

# Ensure the Matrix network exists (required by docker-compose.yml)
echo "🌐 Ensuring Docker networks exist..."
if ! docker network inspect cia_matrix_network > /dev/null 2>&1; then
    echo "   Creating cia_matrix_network..."
    docker network create cia_matrix_network || true
fi

# Stop and remove volumes (this clears postgres AND restarts y-websocket fresh)
echo "🛑 Stopping containers and removing volumes..."
if ! run_or_fail docker compose down -v; then
    echo -e "${YELLOW}⚠️  docker compose down failed, continuing anyway...${NC}"
fi

# The Y.js server is in-memory, so restarting clears it.
# But the BROWSER has Y.js data in IndexedDB that will re-sync!

# Clean up dangling images if rebuilding
if [ "$REBUILD_MODE" = true ]; then
    echo "🗑️  Cleaning up Docker system..."
    docker system prune -f > /dev/null 2>&1 || true

    echo "🔨 Rebuilding containers (--no-cache to avoid stale code)..."
    echo "   This may take a few minutes..."
    if [ "$VERBOSE" = true ]; then
        if ! docker compose build --no-cache; then
            echo -e "${RED}❌ Build failed!${NC}"
            exit 1
        fi
    else
        if ! docker compose build --no-cache > /tmp/docker-build.log 2>&1; then
            echo -e "${RED}❌ Build failed! Last 50 lines:${NC}"
            tail -50 /tmp/docker-build.log
            exit 1
        fi
        echo -e "   ${GREEN}Build completed${NC}"
    fi

    echo "🚀 Starting containers..."
    if ! run_or_fail docker compose up -d; then
        echo -e "${RED}❌ Failed to start containers${NC}"
        docker compose logs --tail=50
        exit 1
    fi
else
    echo "🚀 Starting with fresh database..."
    if ! run_or_fail docker compose up -d; then
        echo -e "${RED}❌ Failed to start containers${NC}"
        echo "Checking logs..."
        docker compose logs --tail=50
        exit 1
    fi
fi

# Wait for postgres
echo "⏳ Waiting for PostgreSQL..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-ciauser}" -d "${POSTGRES_DB:-cia_analytics}" > /dev/null 2>&1; then
        echo -e "   ${GREEN}PostgreSQL is ready${NC}"
        break
    fi
    attempt=$((attempt + 1))
    if [ "$QUICK_MODE" = false ]; then
        echo "   Waiting... ($attempt/$max_attempts)"
    fi
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}❌ PostgreSQL failed to start${NC}"
    echo "Container logs:"
    docker compose logs postgres --tail=30
    exit 1
fi

# Give init.sql time to run
echo "⏳ Waiting for schema initialization..."
sleep 3

# Verify database was initialized
echo "🔍 Verifying database..."

# Check if tables exist
table_count=$(docker compose exec -T postgres psql -U "${POSTGRES_USER:-ciauser}" -d "${POSTGRES_DB:-cia_analytics}" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")

if [ "$table_count" -lt 10 ]; then
    echo -e "${RED}❌ Database schema not initialized (only $table_count tables found)${NC}"
    echo "Checking if init.sql ran..."
    docker compose logs postgres --tail=50 | grep -i "error\|init.sql" || true
    exit 1
fi

# Check sample files
sample_count=$(docker compose exec -T postgres psql -U "${POSTGRES_USER:-ciauser}" -d "${POSTGRES_DB:-cia_analytics}" -t -c \
    "SELECT COUNT(*) FROM datasets;" 2>/dev/null | xargs || echo "0")

# Check users
user_count=$(docker compose exec -T postgres psql -U "${POSTGRES_USER:-ciauser}" -d "${POSTGRES_DB:-cia_analytics}" -t -c \
    "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "0")

# Check Y.js tables
yjs_tables=$(docker compose exec -T postgres psql -U "${POSTGRES_USER:-ciauser}" -d "${POSTGRES_DB:-cia_analytics}" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'yjs_%' OR table_name = 'chat_messages';" 2>/dev/null | xargs || echo "0")

echo ""
echo -e "${GREEN}✅ Database reset complete!${NC}"
echo "📊 Tables created: $table_count"
echo "👤 Users seeded: $user_count"
echo "📁 Sample files: $sample_count"
echo "💬 Y.js tables: $yjs_tables"

if [ "$QUICK_MODE" = false ]; then
    echo ""
    echo "🌐 Services running:"
    echo "   • API:      http://localhost:3001"
    echo "   • MinIO:    http://localhost:9000 (Console: localhost:9002)"
    echo "   • Redis:    localhost:6379"
    echo "   • Y.js:     ws://localhost:9001"
    echo "   • Keycloak: http://localhost:8080"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Clear browser IndexedDB to remove stale Y.js data!${NC}"
    echo "   The browser caches Y.js state locally. After a database reset,"
    echo "   old datasets will re-appear unless you clear the browser storage."
    echo ""
    echo "   Run this in browser DevTools console (F12 → Console):"
    echo -e "   ${GREEN}indexedDB.deleteDatabase('cia-datasets'); location.reload();${NC}"
    echo ""
    echo -e "${YELLOW}💡 TIP: Run ./scripts/setup-local-auth.sh to create Keycloak users${NC}"
fi
