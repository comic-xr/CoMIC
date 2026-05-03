-- Migration: Add VR exploration session tables
-- Run this on existing databases to add VR exploration support
--
-- Tables added:
--   - vr_exploration_sessions: Main session tracking
--   - vr_session_participants: Who's in each session
--   - vr_session_snapshots: Captured states during exploration

-- ============================================================================
-- VR EXPLORATION SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS vr_exploration_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    view_configuration_id UUID REFERENCES view_configurations(id) ON DELETE SET NULL,
    dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    -- Owner information
    owner_user_id VARCHAR(255) NOT NULL,
    owner_user_name VARCHAR(255),

    -- Session scope
    selection_type VARCHAR(20) DEFAULT 'full' CHECK (selection_type IN ('full', 'region', 'selection')),
    region_of_interest JSONB,  -- Bounding box for region type
    selection_ids JSONB,       -- Array of point/cell IDs for selection type

    -- Exploration settings
    default_exploration_mode VARCHAR(20) DEFAULT 'fly' CHECK (default_exploration_mode IN ('fly', 'teleport', 'walk', 'orbit')),
    default_vr_scale DOUBLE PRECISION DEFAULT 1.0,

    -- Collaboration settings
    allow_join BOOLEAN DEFAULT TRUE,
    allow_desktop_participants BOOLEAN DEFAULT TRUE,
    allow_desktop_control BOOLEAN DEFAULT FALSE,

    -- Session state
    status VARCHAR(20) DEFAULT 'preparing' CHECK (status IN ('preparing', 'active', 'paused', 'ended')),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for vr_exploration_sessions
CREATE INDEX IF NOT EXISTS idx_vr_sessions_project ON vr_exploration_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_vr_sessions_owner ON vr_exploration_sessions(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_vr_sessions_status ON vr_exploration_sessions(status);
CREATE INDEX IF NOT EXISTS idx_vr_sessions_dataset ON vr_exploration_sessions(dataset_id);

-- ============================================================================
-- VR SESSION PARTICIPANTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS vr_session_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES vr_exploration_sessions(id) ON DELETE CASCADE,
    od_user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),

    -- Participant mode
    mode VARCHAR(30) DEFAULT 'desktop-observer' CHECK (mode IN (
        'vr-explorer',        -- Active VR participant
        'vr-observer',        -- VR but view-only
        'desktop-observer',   -- Desktop view-only
        'desktop-participant' -- Desktop with some control
    )),

    -- VR-specific state (for VR modes)
    vr_scale DOUBLE PRECISION DEFAULT 1.0,
    scale_visibility VARCHAR(20) DEFAULT 'my-scale' CHECK (scale_visibility IN ('my-scale', 'world-scale')),

    -- Timestamps
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_session_participant UNIQUE (session_id, od_user_id)
);

-- Indexes for vr_session_participants
CREATE INDEX IF NOT EXISTS idx_vr_participants_session ON vr_session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_vr_participants_user ON vr_session_participants(od_user_id);

-- ============================================================================
-- VR SESSION SNAPSHOTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS vr_session_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES vr_exploration_sessions(id) ON DELETE CASCADE,

    -- Snapshot info
    name VARCHAR(255) NOT NULL,
    view_snapshot_id UUID,  -- Links to a view_configuration snapshot if captured

    -- Creator info
    created_by VARCHAR(255) NOT NULL,
    created_by_name VARCHAR(255),

    -- Participant states at time of snapshot
    participant_states JSONB,  -- Array of { userId, vrScale, position, orientation }

    -- Timestamp
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for vr_session_snapshots
CREATE INDEX IF NOT EXISTS idx_vr_snapshots_session ON vr_session_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_vr_snapshots_timestamp ON vr_session_snapshots(timestamp DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Create trigger for updating vr_exploration_sessions.updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_vr_sessions_updated_at'
    ) THEN
        CREATE TRIGGER update_vr_sessions_updated_at
            BEFORE UPDATE ON vr_exploration_sessions
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- ============================================================================
-- VR PREPROCESSING
-- ============================================================================

CREATE TABLE IF NOT EXISTS vr_preprocessing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    requested_by VARCHAR(255),

    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'not_needed', 'pending', 'queued', 'processing', 'complete', 'failed'
    )),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

    -- Operations to perform
    operations JSONB DEFAULT '[]',

    -- Results
    result_metadata JSONB,
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Indexes for vr_preprocessing
CREATE INDEX IF NOT EXISTS idx_vr_preprocessing_dataset ON vr_preprocessing(dataset_id);
CREATE INDEX IF NOT EXISTS idx_vr_preprocessing_status ON vr_preprocessing(status);
CREATE INDEX IF NOT EXISTS idx_vr_preprocessing_project ON vr_preprocessing(project_id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vr_exploration_sessions') THEN
        RAISE NOTICE 'VR exploration tables created successfully';
    ELSE
        RAISE EXCEPTION 'Failed to create VR exploration tables';
    END IF;
END
$$;
