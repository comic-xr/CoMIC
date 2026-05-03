-- Migration 010: Matrix Federation Support
-- Adds tables and columns for Matrix Protocol federation
--
-- This migration adds:
-- 1. Matrix metadata columns to chat_messages table
-- 2. matrix_room_mappings table (CIA Web room <-> Matrix room)
-- 3. matrix_event_log table (deduplication)
-- 4. federated_user_cache table (Matrix user profiles)

-- =============================================================================
-- 1. Add Matrix metadata columns to chat_messages
-- =============================================================================

-- Add matrix_event_id column to track Matrix event IDs
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS matrix_event_id VARCHAR(255);

-- Add matrix_room_id column to track Matrix room
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS matrix_room_id VARCHAR(255);

-- Add federation_source column to track message origin
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS federation_source VARCHAR(50);

-- Add index for Matrix event ID lookups (deduplication)
CREATE INDEX IF NOT EXISTS idx_chat_messages_matrix_event_id
ON chat_messages(matrix_event_id)
WHERE matrix_event_id IS NOT NULL;

-- Add index for federation source filtering
CREATE INDEX IF NOT EXISTS idx_chat_messages_federation_source
ON chat_messages(federation_source)
WHERE federation_source IS NOT NULL;

-- Add index for Matrix room ID
CREATE INDEX IF NOT EXISTS idx_chat_messages_matrix_room_id
ON chat_messages(matrix_room_id)
WHERE matrix_room_id IS NOT NULL;

COMMENT ON COLUMN chat_messages.matrix_event_id IS 'Matrix event ID for federated messages (e.g., $abc123:matrix.org)';
COMMENT ON COLUMN chat_messages.matrix_room_id IS 'Matrix room ID for federated messages (e.g., !xyz789:matrix.org)';
COMMENT ON COLUMN chat_messages.federation_source IS 'Source of message: NULL (local), "matrix", "xmpp", etc.';

-- =============================================================================
-- 2. Matrix Room Mappings Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS matrix_room_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- CIA Web room identifier
    cia_room_id VARCHAR(255) NOT NULL UNIQUE,

    -- Matrix room ID (e.g., !abc123:matrix.cia-web.local)
    matrix_room_id VARCHAR(255) NOT NULL,

    -- Matrix room alias (e.g., #cia_project-main:matrix.cia-web.local)
    matrix_alias VARCHAR(255),

    -- Optional project reference
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),

    -- Status: active, archived, error
    status VARCHAR(50) DEFAULT 'active',

    -- Additional configuration (JSON)
    config JSONB DEFAULT '{}',

    -- Constraints
    CONSTRAINT unique_cia_room UNIQUE (cia_room_id),
    CONSTRAINT unique_matrix_room UNIQUE (matrix_room_id)
);

-- Indexes for room mapping lookups
CREATE INDEX IF NOT EXISTS idx_matrix_room_mappings_cia_room
ON matrix_room_mappings(cia_room_id);

CREATE INDEX IF NOT EXISTS idx_matrix_room_mappings_matrix_room
ON matrix_room_mappings(matrix_room_id);

CREATE INDEX IF NOT EXISTS idx_matrix_room_mappings_project
ON matrix_room_mappings(project_id)
WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matrix_room_mappings_status
ON matrix_room_mappings(status);

COMMENT ON TABLE matrix_room_mappings IS 'Maps CIA Web rooms to Matrix rooms for federation';
COMMENT ON COLUMN matrix_room_mappings.cia_room_id IS 'CIA Web room identifier (e.g., "project-abc-main")';
COMMENT ON COLUMN matrix_room_mappings.matrix_room_id IS 'Matrix room ID starting with ! (e.g., "!xyz:matrix.org")';
COMMENT ON COLUMN matrix_room_mappings.matrix_alias IS 'Human-readable Matrix room alias starting with # (e.g., "#cia_room:matrix.org")';

-- =============================================================================
-- 3. Matrix Event Log Table (Deduplication)
-- =============================================================================

CREATE TABLE IF NOT EXISTS matrix_event_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Matrix event ID
    matrix_event_id VARCHAR(255) NOT NULL,

    -- CIA Web message ID (if applicable)
    cia_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,

    -- Direction: 'outbound' (CIA -> Matrix), 'inbound' (Matrix -> CIA)
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('outbound', 'inbound')),

    -- Matrix room ID
    matrix_room_id VARCHAR(255) NOT NULL,

    -- CIA Web room ID
    cia_room_id VARCHAR(255),

    -- Matrix sender (for inbound) or recipient (for outbound)
    matrix_user_id VARCHAR(255),

    -- Timestamp when event was processed
    processed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Event metadata (JSON)
    event_data JSONB DEFAULT '{}',

    -- Constraints
    CONSTRAINT unique_matrix_event UNIQUE (matrix_event_id)
);

-- Indexes for event log
CREATE INDEX IF NOT EXISTS idx_matrix_event_log_matrix_event_id
ON matrix_event_log(matrix_event_id);

CREATE INDEX IF NOT EXISTS idx_matrix_event_log_cia_message_id
ON matrix_event_log(cia_message_id)
WHERE cia_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matrix_event_log_direction
ON matrix_event_log(direction);

CREATE INDEX IF NOT EXISTS idx_matrix_event_log_processed_at
ON matrix_event_log(processed_at);

-- Index for cleanup (old events)
CREATE INDEX IF NOT EXISTS idx_matrix_event_log_cleanup
ON matrix_event_log(processed_at)
WHERE processed_at < NOW() - INTERVAL '7 days';

COMMENT ON TABLE matrix_event_log IS 'Log of processed Matrix events for deduplication and audit';
COMMENT ON COLUMN matrix_event_log.matrix_event_id IS 'Matrix event ID (starts with $)';
COMMENT ON COLUMN matrix_event_log.direction IS 'Message direction: outbound (CIA->Matrix) or inbound (Matrix->CIA)';

-- =============================================================================
-- 4. Federated User Cache Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS federated_user_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Matrix user ID (e.g., @user:matrix.org)
    matrix_user_id VARCHAR(255) NOT NULL UNIQUE,

    -- Optional mapping to CIA Web user (if they sign up)
    cia_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Display name
    display_name VARCHAR(255),

    -- Avatar URL (HTTP, not mxc://)
    avatar_url TEXT,

    -- Matrix homeserver (extracted from user ID)
    server_name VARCHAR(255),

    -- Last time this user was seen (sent a message)
    last_seen TIMESTAMPTZ DEFAULT NOW(),

    -- Cache timestamp (for TTL)
    cached_at TIMESTAMPTZ DEFAULT NOW(),

    -- Profile metadata (JSON)
    profile_data JSONB DEFAULT '{}',

    -- Status: active, inactive, banned
    status VARCHAR(50) DEFAULT 'active',

    -- Constraints
    CONSTRAINT unique_matrix_user UNIQUE (matrix_user_id)
);

-- Indexes for user cache
CREATE INDEX IF NOT EXISTS idx_federated_user_cache_matrix_user_id
ON federated_user_cache(matrix_user_id);

CREATE INDEX IF NOT EXISTS idx_federated_user_cache_cia_user_id
ON federated_user_cache(cia_user_id)
WHERE cia_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_federated_user_cache_server_name
ON federated_user_cache(server_name);

CREATE INDEX IF NOT EXISTS idx_federated_user_cache_last_seen
ON federated_user_cache(last_seen);

-- Index for cache cleanup (stale entries)
CREATE INDEX IF NOT EXISTS idx_federated_user_cache_cleanup
ON federated_user_cache(cached_at)
WHERE cached_at < NOW() - INTERVAL '30 days';

COMMENT ON TABLE federated_user_cache IS 'Cache of federated Matrix users for display names and avatars';
COMMENT ON COLUMN federated_user_cache.matrix_user_id IS 'Full Matrix user ID (e.g., @user:matrix.org)';
COMMENT ON COLUMN federated_user_cache.avatar_url IS 'HTTP URL to avatar image (converted from mxc://)';
COMMENT ON COLUMN federated_user_cache.server_name IS 'Homeserver domain extracted from Matrix user ID';

-- =============================================================================
-- 5. Helper Functions
-- =============================================================================

-- Function to clean up old event log entries (run via cron)
CREATE OR REPLACE FUNCTION cleanup_matrix_event_log()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM matrix_event_log
    WHERE processed_at < NOW() - INTERVAL '7 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_matrix_event_log IS 'Deletes Matrix event log entries older than 7 days';

-- Function to clean up stale user cache entries (run via cron)
CREATE OR REPLACE FUNCTION cleanup_federated_user_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM federated_user_cache
    WHERE cached_at < NOW() - INTERVAL '30 days'
    AND last_seen < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_federated_user_cache IS 'Deletes federated user cache entries older than 30 days';

-- =============================================================================
-- 6. Grants (if needed)
-- =============================================================================

-- Grant access to CIA Web application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON matrix_room_mappings TO cia_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON matrix_event_log TO cia_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON federated_user_cache TO cia_user;

-- =============================================================================
-- Migration Complete
-- =============================================================================

-- Update migration tracking (if you have a migrations table)
-- INSERT INTO schema_migrations (version, description, applied_at)
-- VALUES ('010', 'Matrix Federation Support', NOW());

SELECT 'Migration 010: Matrix Federation Support - COMPLETE' AS status;
