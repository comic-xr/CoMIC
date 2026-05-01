#!/bin/bash

# Matrix Federation Infrastructure Test Script
#
# This script tests the Synapse homeserver setup after initial configuration.
# Run this after starting docker-compose -f docker-compose.matrix.yml up -d

set -e

echo "================================================================================"
echo "CIA Web Matrix Federation - Infrastructure Test"
echo "================================================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Test 1: Check if Docker is running
echo "Test 1: Checking Docker..."
if docker info >/dev/null 2>&1; then
    pass "Docker is running"
else
    fail "Docker is not running. Please start Docker Desktop."
    exit 1
fi
echo ""

# Test 2: Check if containers are running
echo "Test 2: Checking Matrix containers..."

if docker ps | grep -q cia_matrix_synapse; then
    pass "Synapse container is running"
else
    fail "Synapse container is not running"
    warn "Start with: docker-compose -f docker-compose.matrix.yml up -d"
fi

if docker ps | grep -q cia_matrix_postgres; then
    pass "PostgreSQL container is running"
else
    fail "PostgreSQL container is not running"
fi

if docker ps | grep -q cia_matrix_redis; then
    pass "Redis container is running"
else
    fail "Redis container is not running"
fi
echo ""

# Test 3: Check Synapse health endpoint
echo "Test 3: Checking Synapse health endpoint..."
if curl -s http://localhost:8008/health | grep -q "OK"; then
    pass "Synapse health endpoint is responding"
else
    fail "Synapse health endpoint is not responding"
    warn "Check logs: docker-compose -f docker-compose.matrix.yml logs synapse"
fi
echo ""

# Test 4: Check Synapse version
echo "Test 4: Checking Synapse version..."
VERSION_RESPONSE=$(curl -s http://localhost:8008/_matrix/federation/v1/version)
if echo "$VERSION_RESPONSE" | grep -q "Synapse"; then
    VERSION=$(echo "$VERSION_RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    pass "Synapse version: $VERSION"
else
    fail "Could not retrieve Synapse version"
fi
echo ""

# Test 5: Check PostgreSQL connection
echo "Test 5: Checking PostgreSQL connection..."
if docker exec cia_matrix_postgres pg_isready -U synapse_user -d synapse >/dev/null 2>&1; then
    pass "PostgreSQL is ready"
else
    fail "PostgreSQL is not ready"
fi
echo ""

# Test 6: Check Redis connection
echo "Test 6: Checking Redis connection..."
if docker exec cia_matrix_redis redis-cli ping | grep -q "PONG"; then
    pass "Redis is responding"
else
    fail "Redis is not responding"
fi
echo ""

# Test 7: Check if signing key exists
echo "Test 7: Checking Matrix signing key..."
if [ -f "./matrix-data/matrix.cia-web.local.signing.key" ]; then
    pass "Signing key exists"
else
    warn "Signing key not found (will be auto-generated on first start)"
fi
echo ""

# Test 8: Check volume mounts
echo "Test 8: Checking volume mounts..."
if docker exec cia_matrix_synapse test -f /data/homeserver.yaml >/dev/null 2>&1; then
    pass "homeserver.yaml is mounted"
else
    fail "homeserver.yaml is not mounted"
fi

if docker exec cia_matrix_synapse test -f /data/cia-bridge-registration.yaml >/dev/null 2>&1; then
    pass "cia-bridge-registration.yaml is mounted"
else
    fail "cia-bridge-registration.yaml is not mounted"
fi
echo ""

# Test 9: Check if ports are accessible
echo "Test 9: Checking port accessibility..."
if nc -z localhost 8008 2>/dev/null; then
    pass "Port 8008 (Client-Server API) is accessible"
else
    fail "Port 8008 is not accessible"
fi

if nc -z localhost 8448 2>/dev/null; then
    pass "Port 8448 (Federation API) is accessible"
else
    warn "Port 8448 is not accessible (may need to be opened for external federation)"
fi

if nc -z localhost 5433 2>/dev/null; then
    pass "Port 5433 (PostgreSQL) is accessible"
else
    warn "Port 5433 is not accessible"
fi
echo ""

# Test 10: Check logs for errors
echo "Test 10: Checking Synapse logs for critical errors..."
ERROR_COUNT=$(docker logs cia_matrix_synapse 2>&1 | grep -i "ERROR" | wc -l)
if [ "$ERROR_COUNT" -eq 0 ]; then
    pass "No errors in Synapse logs"
else
    warn "Found $ERROR_COUNT error lines in logs"
    warn "Check with: docker-compose -f docker-compose.matrix.yml logs synapse | grep ERROR"
fi
echo ""

# Summary
echo "================================================================================"
echo "Test Summary"
echo "================================================================================"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Synapse infrastructure is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Create admin user:"
    echo "   docker exec -it cia_matrix_synapse register_new_matrix_user \\"
    echo "     -c /data/homeserver.yaml -a http://localhost:8008"
    echo ""
    echo "2. Test with Matrix client (Element):"
    echo "   - Download Element from https://element.io"
    echo "   - Configure custom homeserver: http://localhost:8008"
    echo "   - Login with your admin user"
    echo ""
    echo "3. Proceed to Phase 2: Create Matrix bridge service"
    echo "   See plan file for details"
else
    echo -e "${RED}✗ Some tests failed. Please fix issues before proceeding.${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "- View logs: docker-compose -f docker-compose.matrix.yml logs"
    echo "- Restart: docker-compose -f docker-compose.matrix.yml restart"
    echo "- Clean start: docker-compose -f docker-compose.matrix.yml down && docker-compose -f docker-compose.matrix.yml up -d"
fi
echo ""
