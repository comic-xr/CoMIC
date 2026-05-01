#!/bin/bash
# Run a specific migration against the database
#
# Usage: ./run-migration.sh <migration_file> [database_name]
#
# Examples:
#   ./run-migration.sh migrations/009_add_vr_exploration_tables.sql
#   ./run-migration.sh migrations/009_add_vr_exploration_tables.sql my_database

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_FILE="$1"
DATABASE="${2:-cia_dev}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: No migration file specified${NC}"
    echo ""
    echo "Usage: $0 <migration_file> [database_name]"
    echo ""
    echo "Available migrations:"
    ls -1 "$SCRIPT_DIR/migrations/"*.sql 2>/dev/null | while read f; do
        echo "  - migrations/$(basename "$f")"
    done
    exit 1
fi

# Check if file exists
if [ ! -f "$SCRIPT_DIR/$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Running migration:${NC} $MIGRATION_FILE"
echo -e "${YELLOW}Database:${NC} $DATABASE"
echo ""

# Run the migration
if psql -d "$DATABASE" -f "$SCRIPT_DIR/$MIGRATION_FILE"; then
    echo ""
    echo -e "${GREEN}Migration completed successfully!${NC}"
else
    echo ""
    echo -e "${RED}Migration failed!${NC}"
    exit 1
fi
