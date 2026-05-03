#!/bin/bash
# server/database/run-migrations.sh
# Helper script to run database migrations
#
# Usage:
#   ./run-migrations.sh          # Run all pending migrations
#   ./run-migrations.sh 002      # Run specific migration
#   ./run-migrations.sh status   # Check migration status
#   ./run-migrations.sh reset    # Reset database (DANGER!)

set -e

# Configuration
CONTAINER_NAME="${DB_CONTAINER:-cia-postgres}"
DB_USER="${POSTGRES_USER:-ciauser}"
DB_NAME="${POSTGRES_DB:-cia_analytics}"
MIGRATIONS_DIR="$(dirname "$0")/migrations"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# Check if Docker container is running
check_container() {
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_error "Container '${CONTAINER_NAME}' is not running"
        echo "  Start it with: docker-compose up -d postgres"
        exit 1
    fi
    log_success "Database container is running"
}

# Run a SQL file
run_sql_file() {
    local file=$1
    local filename=$(basename "$file")
    
    log_info "Running: $filename"
    
    # Copy file to container
    docker cp "$file" "${CONTAINER_NAME}:/tmp/${filename}"
    
    # Execute
    if docker exec -i "${CONTAINER_NAME}" psql -U "$DB_USER" -d "$DB_NAME" -f "/tmp/${filename}" > /dev/null 2>&1; then
        log_success "Completed: $filename"
        return 0
    else
        log_error "Failed: $filename"
        # Show error details
        docker exec -i "${CONTAINER_NAME}" psql -U "$DB_USER" -d "$DB_NAME" -f "/tmp/${filename}" 2>&1 | head -20
        return 1
    fi
}

# Run SQL query
run_query() {
    docker exec -i "${CONTAINER_NAME}" psql -U "$DB_USER" -d "$DB_NAME" -c "$1"
}

# Check migration status
check_status() {
    log_info "Checking database status..."
    echo ""
    
    echo "=== Tables ==="
    run_query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    
    echo ""
    echo "=== Record Counts ==="
    run_query "
        SELECT 'organizations' as table_name, COUNT(*) as count FROM organizations
        UNION ALL SELECT 'projects', COUNT(*) FROM projects
        UNION ALL SELECT 'datasets', COUNT(*) FROM datasets
        UNION ALL SELECT 'file_project_access', COUNT(*) FROM file_project_access
        UNION ALL SELECT 'audit_log', COUNT(*) FROM audit_log
        ORDER BY table_name;
    " 2>/dev/null || log_warning "Some tables don't exist yet"
}

# Run all migrations in order
run_all_migrations() {
    log_info "Running all migrations..."
    echo ""
    
    # Migration 002 - Projects and File Access
    if [ -f "${MIGRATIONS_DIR}/002_projects_and_file_access.sql" ]; then
        run_sql_file "${MIGRATIONS_DIR}/002_projects_and_file_access.sql"
    fi
    
    # Migration 003 - Seed Sample Files
    if [ -f "${MIGRATIONS_DIR}/003_seed_sample_files.sql" ]; then
        run_sql_file "${MIGRATIONS_DIR}/003_seed_sample_files.sql"
    fi

    # Migration 004 - Seed Sample Files
    if [ -f "${MIGRATIONS_DIR}/004_v2_server_authority.sql" ]; then
        run_sql_file "${MIGRATIONS_DIR}/004_v2_server_authority.sql"
    fi

    # Migration 005 - Seed Sample Files
    if [ -f "${MIGRATIONS_DIR}/005_workspace_annotations.sql" ]; then
        run_sql_file "${MIGRATIONS_DIR}/005_workspace_annotations.sql"
    fi
    
    echo ""
    log_success "All migrations complete!"
}

# Run specific migration
run_specific_migration() {
    local migration_num=$1
    local migration_file=$(find "${MIGRATIONS_DIR}" -name "${migration_num}*.sql" | head -1)
    
    if [ -z "$migration_file" ]; then
        log_error "Migration ${migration_num} not found in ${MIGRATIONS_DIR}"
        echo "  Available migrations:"
        ls -1 "${MIGRATIONS_DIR}"/*.sql 2>/dev/null || echo "    (none)"
        exit 1
    fi
    
    run_sql_file "$migration_file"
}

# Reset database (DANGEROUS!)
reset_database() {
    log_warning "This will DELETE ALL DATA in the database!"
    read -p "Are you sure? Type 'yes' to confirm: " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Cancelled"
        exit 0
    fi
    
    log_info "Resetting database..."
    
    # Drop and recreate all tables
    run_query "
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO ${DB_USER};
        GRANT ALL ON SCHEMA public TO public;
    "
    
    # Run init.sql
    if [ -f "$(dirname "$0")/init.sql" ]; then
        run_sql_file "$(dirname "$0")/init.sql"
    fi
    
    # Run all migrations
    run_all_migrations
    
    log_success "Database reset complete!"
}

# Interactive psql session
interactive_session() {
    log_info "Starting interactive PostgreSQL session..."
    echo "  Type \\q to exit"
    echo ""
    docker exec -it "${CONTAINER_NAME}" psql -U "$DB_USER" -d "$DB_NAME"
}

# Main script
main() {
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║   CIA Web Database Migration Tool      ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    
    check_container
    
    case "${1:-all}" in
        status)
            check_status
            ;;
        all)
            run_all_migrations
            ;;
        reset)
            reset_database
            ;;
        psql|shell|interactive)
            interactive_session
            ;;
        help|--help|-h)
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  all       Run all pending migrations (default)"
            echo "  status    Check current database status"
            echo "  reset     Reset database and run all migrations (DANGER!)"
            echo "  psql      Start interactive PostgreSQL session"
            echo "  002       Run specific migration by number"
            echo "  help      Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Run all migrations"
            echo "  $0 002                # Run migration 002 only"
            echo "  $0 status             # Check status"
            echo ""
            ;;
        [0-9]*)
            run_specific_migration "$1"
            ;;
        *)
            log_error "Unknown command: $1"
            echo "  Run '$0 help' for usage"
            exit 1
            ;;
    esac
}

main "$@"