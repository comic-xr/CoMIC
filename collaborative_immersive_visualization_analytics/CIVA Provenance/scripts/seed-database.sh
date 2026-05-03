#!/bin/bash
# seed-database.sh - Seed the CIA Web database with required base data
# Run from the project root directory

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  CIA Web Database Seeder (Fixed)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Configuration
CONTAINER_NAME="${DB_CONTAINER:-cia-postgres}"
DB_USER="${POSTGRES_USER:-ciauser}"
DB_NAME="${POSTGRES_DB:-cia_analytics}"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}✗ Container '${CONTAINER_NAME}' is not running${NC}"
    echo "  Start it with: docker-compose up -d"
    exit 1
fi

echo -e "${GREEN}✓${NC} Database container is running"

# Run the seed SQL
echo -e "${BLUE}→${NC} Seeding database..."
echo ""

docker exec -i "${CONTAINER_NAME}" psql -U "$DB_USER" -d "$DB_NAME" << 'EOSQL'

-- ============================================================================
-- CIA Web Database Seed Script (Fixed)
-- Handles broken triggers and missing tables
-- ============================================================================

\echo '=== Step 1: Check for problematic triggers ==='

-- Check if the broken trigger exists and drop it
DO $$
BEGIN
    -- Drop the trigger if it exists
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'create_default_workspace_trigger'
    ) THEN
        DROP TRIGGER IF EXISTS create_default_workspace_trigger ON projects;
        RAISE NOTICE 'Dropped broken trigger: create_default_workspace_trigger';
    END IF;
    
    -- Also drop the function if it exists
    DROP FUNCTION IF EXISTS create_default_workspace_for_project() CASCADE;
    RAISE NOTICE 'Dropped trigger function if existed';
END $$;

\echo '=== Step 2: Create workspaces table if missing ==='

-- Create workspaces table if it doesn't exist
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    room_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout_mode VARCHAR(20) DEFAULT 'flow',
    grid_config JSONB DEFAULT '{}',
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rooms table if it doesn't exist
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    room_type VARCHAR(20) DEFAULT 'breakout',
    is_public BOOLEAN DEFAULT true,
    max_members INT,
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

\echo '=== Step 3: Seed organizations ==='

-- 1. SYSTEM ORGANIZATION
INSERT INTO organizations (id, name, slug, storage_quota_bytes)
VALUES ('00000000-0000-0000-0000-000000000000', 'System', 'system', 1099511627776)
ON CONFLICT (id) DO NOTHING;

-- 2. DEMO ORGANIZATION
INSERT INTO organizations (id, name, slug, storage_quota_bytes)
VALUES ('00000000-0000-0000-0000-000000000002', 'Demo Organization', 'demo-org', 107374182400)
ON CONFLICT (id) DO NOTHING;

\echo '=== Step 4: Seed users ==='

-- Users (must match init.sql and mockUsers.js)
-- System (000001) > Admin (000002) > Regular users (000003+)
INSERT INTO users (id, external_id, email, display_name)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'system', 'system@cia-web.local', 'System'),
    ('00000000-0000-0000-0000-000000000002', 'cia-admin', 'admin@cia-web.local', 'CIA Admin'),
    ('00000000-0000-0000-0000-000000000003', 'alice', 'alice@cia-web.local', 'Alice Analyst'),
    ('00000000-0000-0000-0000-000000000004', 'bob', 'bob@cia-web.local', 'Bob Builder'),
    ('00000000-0000-0000-0000-000000000005', 'viewer', 'viewer@cia-web.local', 'View Only')
ON CONFLICT (id) DO UPDATE SET
    external_id = EXCLUDED.external_id,
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name;

\echo '=== Step 5: Seed project ==='

-- Sample project (owned by System user)
INSERT INTO projects (id, organization_id, name, slug, description, visibility, created_by, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'Sample Files',
    'sample-files',
    'Demo project with sample VTK files',
    'public',
    '00000000-0000-0000-0000-000000000001',
    'active'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

\echo '=== Step 6: Seed memberships ==='

-- Organization memberships (all users in System org)
INSERT INTO organization_members (organization_id, user_id, role)
VALUES
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'admin'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'admin'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000003', 'member'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000004', 'member'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000005', 'member')
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- Project memberships
INSERT INTO project_members (project_id, user_id, role)
VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'admin'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'member'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'member'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'viewer')
ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;

\echo '=== Step 7: Seed room ==='

-- Demo room (created by System)
INSERT INTO rooms (id, project_id, name, room_type, is_public, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'Demo Room',
    'breakout',
    true,
    '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

-- Note: Workspaces are auto-created by triggers in init.sql

\echo ''
\echo '=== VERIFICATION ==='
\echo ''

\echo '--- Organizations ---'
SELECT id, name, slug FROM organizations ORDER BY name;

\echo ''
\echo '--- Users ---'
SELECT id, email, display_name FROM users ORDER BY email;

\echo ''
\echo '--- Projects ---'
SELECT id, name, visibility, status FROM projects ORDER BY name;

\echo ''
\echo '--- Project Members ---'
SELECT p.name as project, u.email, pm.role
FROM project_members pm
JOIN projects p ON p.id = pm.project_id
JOIN users u ON u.id = pm.user_id;

\echo ''
\echo '--- Rooms ---'
SELECT id, name, room_type FROM rooms ORDER BY name;

\echo ''
\echo '--- Workspaces ---'
SELECT id, name, layout_mode, is_default FROM workspaces ORDER BY name;

EOSQL

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✓ Database seeded successfully!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Seeded data:"
    echo "  Project ID: 00000000-0000-0000-0000-000000000001 (Sample Files)"
    echo ""
    echo "Users:"
    echo "  System:     00000000-0000-0000-0000-000000000001 (system@cia-web.local)"
    echo "  Admin:      00000000-0000-0000-0000-000000000002 (admin@cia-web.local)"
    echo "  Alice:      00000000-0000-0000-0000-000000000003 (alice@cia-web.local)"
    echo "  Bob:        00000000-0000-0000-0000-000000000004 (bob@cia-web.local)"
    echo "  Viewer:     00000000-0000-0000-0000-000000000005 (viewer@cia-web.local)"
    echo ""
    echo "Test with:"
    echo "  curl http://localhost:3001/api/projects/00000000-0000-0000-0000-000000000001 -H 'x-user-id: 00000000-0000-0000-0000-000000000002' | jq"
else
    echo ""
    echo -e "${RED}✗ Failed to seed database${NC}"
    exit 1
fi