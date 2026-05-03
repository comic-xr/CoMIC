#!/bin/bash
# scripts/seed-mock-users.sh
# Create mock users for collaboration testing in development mode
#
# Usage:
#   ./scripts/seed-mock-users.sh           # Seed mock users
#   ./scripts/seed-mock-users.sh status    # Check current users
#   ./scripts/seed-mock-users.sh reset     # Remove and re-seed users
#   ./scripts/seed-mock-users.sh help      # Show help
#
# Prerequisites:
#   - PostgreSQL container must be running (docker-compose up -d postgres)
#   - DEV_BYPASS_AUTH=true in server environment

set -e

# =============================================================================
# CONFIGURATION
# =============================================================================

CONTAINER_NAME="${DB_CONTAINER:-cia-postgres}"
DB_USER="${POSTGRES_USER:-ciauser}"
DB_NAME="${POSTGRES_DB:-cia_analytics}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log_info()    { echo -e "${BLUE}ℹ${NC}  $1"; }
log_success() { echo -e "${GREEN}✓${NC}  $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC}  $1"; }
log_error()   { echo -e "${RED}✗${NC}  $1"; }
log_user()    { echo -e "${PURPLE}👤${NC} $1"; }

# Check if Docker container is running
check_container() {
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_error "Container '${CONTAINER_NAME}' is not running"
        echo "  Start it with: docker-compose up -d postgres"
        echo ""
        echo "  Or set DB_CONTAINER environment variable to your container name:"
        echo "    DB_CONTAINER=my-postgres ./scripts/seed-mock-users.sh"
        exit 1
    fi
    log_success "Database container '${CONTAINER_NAME}' is running"
}

# Run SQL query and return result
run_query() {
    docker exec -i "${CONTAINER_NAME}" psql -U "$DB_USER" -d "$DB_NAME" -t -c "$1" 2>/dev/null
}

# Run SQL query with formatted output
run_query_formatted() {
    docker exec -i "${CONTAINER_NAME}" psql -U "$DB_USER" -d "$DB_NAME" -c "$1" 2>/dev/null
}

# Run SQL file
run_sql() {
    docker exec -i "${CONTAINER_NAME}" psql -U "$DB_USER" -d "$DB_NAME" 2>&1
}

# =============================================================================
# MOCK USERS DATA
# =============================================================================

# Inline SQL for seeding users (no external file dependency)
# Note: Using heredoc with single quotes to prevent shell expansion
seed_users_sql() {
cat << 'ENDSQL'
-- ============================================================================
-- CIA Web - Mock Users for Development Testing
-- ============================================================================

-- Create test users with distinct UUIDs
-- NOTE: These MUST match init.sql user IDs for consistency
-- System user (000001) is created by init.sql, not here
INSERT INTO users (id, external_id, email, display_name, preferences, created_at, updated_at)
VALUES
    -- CIA Admin (matches DEV_USER in auth middleware)
    ('00000000-0000-0000-0000-000000000002', 'cia-admin', 'admin@cia-web.local', 'CIA Admin',
     '{"theme": "dark", "role": "admin"}', NOW(), NOW()),

    -- Alice - Analyst
    ('00000000-0000-0000-0000-000000000003', 'alice', 'alice@cia-web.local', 'Alice Analyst',
     '{"theme": "dark", "role": "researcher", "department": "Research"}', NOW(), NOW()),

    -- Bob - Builder
    ('00000000-0000-0000-0000-000000000004', 'bob', 'bob@cia-web.local', 'Bob Builder',
     '{"theme": "light", "role": "engineer", "department": "Engineering"}', NOW(), NOW()),

    -- Viewer - Read-only user
    ('00000000-0000-0000-0000-000000000005', 'viewer', 'viewer@cia-web.local', 'View Only',
     '{"theme": "dark", "role": "viewer"}', NOW(), NOW())
     
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    preferences = EXCLUDED.preferences,
    updated_at = NOW();

-- Add all test users to the default organization
-- Note: System (000001) is created by init.sql
INSERT INTO organization_members (id, organization_id, user_id, role, joined_at)
SELECT
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000000',
    u.id,
    CASE
        WHEN u.id = '00000000-0000-0000-0000-000000000002' THEN 'admin'  -- CIA Admin
        ELSE 'member'
    END,
    NOW()
FROM users u
WHERE u.id IN (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005'
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Add all test users to the default project
INSERT INTO project_members (id, project_id, user_id, role, joined_at)
SELECT
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    u.id,
    CASE
        WHEN u.id = '00000000-0000-0000-0000-000000000002' THEN 'admin'   -- CIA Admin
        WHEN u.id = '00000000-0000-0000-0000-000000000003' THEN 'member'  -- Alice
        WHEN u.id = '00000000-0000-0000-0000-000000000004' THEN 'member'  -- Bob
        ELSE 'viewer'  -- Viewer
    END,
    NOW()
FROM users u
WHERE u.id IN (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005'
)
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Verify users were created
SELECT id, email, display_name FROM users 
WHERE id LIKE '00000000-0000-0000-0000-00000000000%'
ORDER BY id;
ENDSQL
}

# =============================================================================
# COMMANDS
# =============================================================================

# Seed mock users
seed_users() {
    log_info "Seeding mock users..."
    echo ""
    
    if seed_users_sql | run_sql > /dev/null 2>&1; then
        log_success "Mock users seeded successfully!"
        echo ""
        show_users
    else
        log_error "Failed to seed mock users"
        echo ""
        echo "Debug: Running SQL again with output..."
        seed_users_sql | run_sql
        echo ""
        echo "Make sure the database schema is initialized."
        exit 1
    fi
}

# Show current mock users
show_users() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    Mock Users for Testing                      ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Simple query to list users - just check users table directly
    run_query_formatted "
        SELECT 
            display_name as \"Name\",
            email as \"Email\",
            preferences->>'role' as \"Role\"
        FROM users
        WHERE id IN (
            '00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000003',
            '00000000-0000-0000-0000-000000000004',
            '00000000-0000-0000-0000-000000000005'
        )
        ORDER BY id;
    "
    
    echo ""
    echo "User IDs for switching (use x-user-id header):"
    echo "  System: 00000000-0000-0000-0000-000000000001 (automated processes only)"
    echo "  Admin:  00000000-0000-0000-0000-000000000002 (admin)"
    echo "  Alice:  00000000-0000-0000-0000-000000000003 (member)"
    echo "  Bob:    00000000-0000-0000-0000-000000000004 (member)"
    echo "  Viewer: 00000000-0000-0000-0000-000000000005 (viewer)"
}

# Check status
check_status() {
    log_info "Checking mock users status..."
    echo ""
    
    local count=$(run_query "SELECT COUNT(*) FROM users WHERE id IN (
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000005'
    );" 2>/dev/null | tr -d ' ')
    
    if [ -n "$count" ] && [ "$count" -gt 0 ] 2>/dev/null; then
        log_success "Found $count mock user(s)"
        echo ""
        show_users
    else
        log_warning "No mock users found"
        echo ""
        echo "Run '$0' or '$0 seed' to create mock users."
    fi
}

# Reset (remove and re-seed)
reset_users() {
    log_warning "This will remove all mock users and their data!"
    read -p "Are you sure? Type 'yes' to confirm: " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Cancelled"
        exit 0
    fi
    
    log_info "Removing mock users..."
    
    # Remove in correct order (due to foreign keys)
    # Keep System user (000001) and Admin user (000002) as they're core users
    run_query "DELETE FROM project_members WHERE user_id LIKE '00000000-0000-0000-0000-00000000000%' AND user_id NOT IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');" > /dev/null 2>&1
    run_query "DELETE FROM organization_members WHERE user_id LIKE '00000000-0000-0000-0000-00000000000%' AND user_id NOT IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');" > /dev/null 2>&1
    run_query "DELETE FROM users WHERE id LIKE '00000000-0000-0000-0000-00000000000%' AND id NOT IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');" > /dev/null 2>&1

    log_success "Mock users removed (kept System and Admin users)"
    echo ""
    
    # Re-seed
    seed_users
}

# Show help
show_help() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║           CIA Web - Mock Users Setup Script                    ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Creates mock users for testing collaboration features in dev mode."
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  (default)   Seed mock users (same as 'seed')"
    echo "  seed        Create mock users in the database"
    echo "  status      Check current mock users"
    echo "  reset       Remove and re-create mock users"
    echo "  help        Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DB_CONTAINER   Docker container name (default: ciaweb-postgres)"
    echo "  POSTGRES_USER  Database user (default: cia_user)"
    echo "  POSTGRES_DB    Database name (default: cia_web)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Seed users"
    echo "  $0 status                             # Check users"
    echo "  DB_CONTAINER=my-pg $0                 # Use different container"
    echo ""
    echo "Mock Users Created:"
    echo "  • Development User (admin)    - developer@localhost"
    echo "  • Alice Chen (editor)         - alice@research.lab"
    echo "  • Bob Martinez (editor)       - bob@research.lab"
    echo "  • Dr. Carol Williams (admin)  - carol@research.lab"
    echo "  • Dave Kim (viewer)           - dave@university.edu"
    echo ""
}

# =============================================================================
# MAIN
# =============================================================================

main() {
    echo ""
    echo -e "${PURPLE}🧪 CIA Web Mock Users Setup${NC}"
    echo ""
    
    check_container
    echo ""
    
    case "${1:-seed}" in
        seed)
            seed_users
            ;;
        status)
            check_status
            ;;
        reset)
            reset_users
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            echo "  Run '$0 help' for usage"
            exit 1
            ;;
    esac
}

main "$@"