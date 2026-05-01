#!/bin/bash
# start.sh - Start all CIA Web services

set -e  # Exit on error

echo "🚀 Starting CIA Web..."
echo ""

# Colors for output
GREEN="$(echo -e '\033[0;32m')"
YELLOW="$(echo -e '\033[1;33m')"
RED="$(echo -e '\033[0;31m')"
NC="$(echo -e '\033[0m')" # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Load environment variables (if present)
if [ -f ".env" ]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
fi

# Auth-related defaults
DEV_BYPASS_AUTH="${DEV_BYPASS_AUTH:-false}"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
SKIP_AUTH_SETUP="${SKIP_AUTH_SETUP:-false}"

# Check if Docker is running
echo "📦 Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi
print_status "Docker is running"
echo ""

# Start Docker services
echo "🐳 Starting Docker services (PostgreSQL, MinIO, Redis, API, Y.js, VTK Worker, Thumbnail Worker)..."
docker-compose up -d

# Start Matrix Federation services
echo ""
echo "🔐 Starting Matrix Federation services (Synapse, Matrix DB, Matrix Redis)..."
cd server
docker-compose -f docker-compose.matrix.yml up -d
cd ..

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check PostgreSQL
echo -n "  PostgreSQL: "
if docker exec cia-postgres pg_isready -U ciauser -d cia_analytics > /dev/null 2>&1; then
    print_status "Ready"
else
    print_warning "Not ready yet, waiting..."
    sleep 5
fi

# Check MinIO
echo -n "  MinIO: "
if curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    print_status "Ready"
else
    print_warning "Not ready yet, waiting..."
    sleep 3
fi

# Check Redis
echo -n "  Redis: "
if docker exec cia-redis redis-cli ping > /dev/null 2>&1; then
    print_status "Ready"
else
    print_warning "Not ready yet, waiting..."
    sleep 2
fi

# Check API
echo -n "  API: "
MAX_RETRIES=10
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        print_status "Ready"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
            print_error "API failed to start. Check logs with: docker-compose logs api"
            exit 1
        fi
        sleep 2
    fi
done

# Check Y.js WebSocket
echo -n "  Y.js WebSocket: "
if nc -z localhost 9001 2>/dev/null; then
    print_status "Ready"
else
    print_warning "Not ready yet, waiting..."
    sleep 3
fi

# Check Keycloak (if dev bypass is disabled)
if [ "${DEV_BYPASS_AUTH}" != "true" ]; then
    echo -n "  Keycloak: "
    MAX_RETRIES=15
    RETRY_COUNT=0
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -s "${KEYCLOAK_URL}/health/ready" > /dev/null 2>&1; then
            print_status "Ready"
            break
        else
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
                print_warning "Keycloak not ready yet. Check logs with: docker logs cia-keycloak"
                break
            fi
            sleep 3
        fi
    done
fi

# Check Matrix PostgreSQL
echo -n "  Matrix PostgreSQL: "
if docker exec cia_matrix_postgres pg_isready -U synapse_user -d synapse > /dev/null 2>&1; then
    print_status "Ready"
else
    print_warning "Not ready yet, waiting..."
    sleep 5
fi

# Check Matrix Redis
echo -n "  Matrix Redis: "
if docker exec cia_matrix_redis redis-cli ping > /dev/null 2>&1; then
    print_status "Ready"
else
    print_warning "Not ready yet, waiting..."
    sleep 2
fi

# Check Synapse
echo -n "  Synapse (Matrix): "
MAX_RETRIES=15
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:8008/health > /dev/null 2>&1; then
        print_status "Ready"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
            print_warning "Synapse not ready yet. Check logs with: docker logs cia_matrix_synapse"
            break
        fi
        sleep 3
    fi
done

echo ""
print_status "All Docker services are running!"
echo ""

# Initialize Keycloak realm/users when auth is required
if [ "${DEV_BYPASS_AUTH}" != "true" ]; then
    if [ "${SKIP_AUTH_SETUP}" = "true" ]; then
        print_warning "Skipping Keycloak setup (SKIP_AUTH_SETUP=true)"
    else
        if [ -x "./scripts/setup-local-auth.sh" ]; then
            if command -v jq > /dev/null 2>&1; then
                echo "🔐 Configuring Keycloak realm, client, and test users..."
                ./scripts/setup-local-auth.sh
            else
                print_warning "jq not installed; run ./scripts/setup-local-auth.sh manually after installing jq"
            fi
        else
            print_warning "Missing scripts/setup-local-auth.sh; auth setup skipped"
        fi
    fi
    echo ""
fi

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
    echo ""
fi

echo "🌐 Services running:"
echo ""
echo "  Core Services:"
echo "  • PostgreSQL:       localhost:5432"
echo "  • MinIO:            localhost:9000 (Console: localhost:9002)"
echo "  • Redis:            localhost:6379"
echo "  • API:              http://localhost:3001"
echo "  • Y.js WebSocket:   ws://localhost:9001"
echo "  • Keycloak:         ${KEYCLOAK_URL}"
echo "  • VTK Worker:       Processing compute jobs from Redis queue"
echo "  • Thumbnail Worker: Generating thumbnails via headless browser"
echo ""
echo "  Matrix Federation:"
echo "  • Synapse:          http://localhost:8008 (Federation: 8448)"
echo "  • Matrix PostgreSQL: localhost:5433"
echo "  • Matrix Redis:     (internal)"
echo ""

echo "📝 Next steps:"
echo ""
echo "  Start the frontend:"
echo "     ${YELLOW}npm start${NC}"
echo ""
echo "  Check Matrix federation status:"
echo "     ${YELLOW}curl http://localhost:3001/api/matrix/status${NC}"
echo ""
if [ "${DEV_BYPASS_AUTH}" != "true" ]; then
    echo "  Auth note: dev bypass is disabled; you will be redirected to Keycloak to log in."
    echo ""
fi

print_status "Backend services ready! (Matrix federation enabled)"
