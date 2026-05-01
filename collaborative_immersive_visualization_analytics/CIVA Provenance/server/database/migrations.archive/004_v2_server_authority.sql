-- 004_v2_server_authority.sql
-- Migration for v2.0 Server-Authority Architecture
-- Adds file versioning, project branches, session recordings, computation cache
-- Enhances annotations and audit logging

-- ============================================================================
-- FILE VERSIONS TABLE
-- Tracks history when file content changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS file_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    hash VARCHAR(64) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    change_note TEXT,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(file_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_file_versions_file ON file_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_versions_hash ON file_versions(hash);

-- Add current_version_id to datasets (files)
ALTER TABLE datasets
    ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES file_versions(id);

-- ============================================================================
-- PROJECT BRANCHES TABLE
-- Git-like branching for annotation isolation
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_branch_id UUID REFERENCES project_branches(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',  -- active, merged, archived
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    merged_at TIMESTAMPTZ,
    merged_by UUID REFERENCES users(id),

    UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_branches_project ON project_branches(project_id);
CREATE INDEX IF NOT EXISTS idx_branches_parent ON project_branches(parent_branch_id);
CREATE INDEX IF NOT EXISTS idx_branches_status ON project_branches(status);

-- Create default 'main' branch for existing projects
INSERT INTO project_branches (id, project_id, name, description, status)
SELECT
    uuid_generate_v4(),
    p.id,
    'main',
    'Default branch',
    'active'
FROM projects p
WHERE NOT EXISTS (
    SELECT 1 FROM project_branches pb
    WHERE pb.project_id = p.id AND pb.name = 'main'
);

-- ============================================================================
-- ENHANCED ANNOTATIONS TABLE
-- Add versioning, branching, and visibility support
-- ============================================================================

-- Add new columns to existing annotations table
ALTER TABLE annotations
    ADD COLUMN IF NOT EXISTS file_version_id UUID REFERENCES file_versions(id),
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES project_branches(id),
    ADD COLUMN IF NOT EXISTS position DOUBLE PRECISION[3],
    ADD COLUMN IF NOT EXISTS normal DOUBLE PRECISION[3],
    ADD COLUMN IF NOT EXISTS text TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'public',  -- public, private, group
    ADD COLUMN IF NOT EXISTS visibility_group UUID[],
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',  -- active, archived, migrated, invalid
    ADD COLUMN IF NOT EXISTS migrated_from UUID REFERENCES annotations(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Rename created_by to use UUID if it's VARCHAR
-- (Keep both for backward compatibility during migration)
ALTER TABLE annotations
    ADD COLUMN IF NOT EXISTS creator_user_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_annotations_version ON annotations(file_version_id);
CREATE INDEX IF NOT EXISTS idx_annotations_branch ON annotations(branch_id);
CREATE INDEX IF NOT EXISTS idx_annotations_visibility ON annotations(visibility);
CREATE INDEX IF NOT EXISTS idx_annotations_status ON annotations(status);
CREATE INDEX IF NOT EXISTS idx_annotations_creator_uuid ON annotations(creator_user_id);

-- ============================================================================
-- SESSION RECORDINGS TABLE
-- For audit compliance and playback
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Timing
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_ms BIGINT,

    -- Storage
    storage_key VARCHAR(500),  -- MinIO key for recording data
    file_size BIGINT,
    frame_count INTEGER,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    device_info JSONB DEFAULT '{}',  -- VR/desktop, browser, etc.

    -- Status
    status VARCHAR(50) DEFAULT 'recording',  -- recording, complete, failed, archived

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recordings_project ON session_recordings(project_id);
CREATE INDEX IF NOT EXISTS idx_recordings_user ON session_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON session_recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_started ON session_recordings(started_at DESC);

-- ============================================================================
-- COMPUTATION CACHE TABLE
-- Cache expensive computation results
-- ============================================================================

CREATE TABLE IF NOT EXISTS computation_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Cache key (hash of file_id + version + operation + params)
    cache_key VARCHAR(255) UNIQUE NOT NULL,

    -- What was computed
    file_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    file_version_id UUID REFERENCES file_versions(id) ON DELETE CASCADE,
    operation VARCHAR(100) NOT NULL,
    params JSONB NOT NULL,

    -- Result
    result_storage_key VARCHAR(500),  -- MinIO key for result
    result_metadata JSONB,  -- vertices, faces, bounds, etc.

    -- Stats
    compute_time_ms BIGINT,
    result_size_bytes BIGINT,

    -- Access tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 1,

    -- TTL management
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cache_key ON computation_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_file ON computation_cache(file_id);
CREATE INDEX IF NOT EXISTS idx_cache_operation ON computation_cache(operation);
CREATE INDEX IF NOT EXISTS idx_cache_accessed ON computation_cache(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON computation_cache(expires_at);

-- ============================================================================
-- ENHANCED AUDIT LOG
-- Add before/after state tracking
-- ============================================================================

ALTER TABLE audit_log
    ADD COLUMN IF NOT EXISTS before_state JSONB,
    ADD COLUMN IF NOT EXISTS after_state JSONB,
    ADD COLUMN IF NOT EXISTS session_recording_id UUID REFERENCES session_recordings(id);

-- Add index for session recording correlation
CREATE INDEX IF NOT EXISTS idx_audit_session_recording ON audit_log(session_recording_id);

-- ============================================================================
-- ORGANIZATION AUDIT CONFIG
-- Per-organization audit settings
-- ============================================================================

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS audit_config JSONB DEFAULT '{"level": "standard"}';

-- ============================================================================
-- VIEW CONFIGURATIONS ENHANCEMENTS
-- Add branch support and sharing improvements
-- ============================================================================

ALTER TABLE view_configurations
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES project_branches(id),
    ADD COLUMN IF NOT EXISTS file_version_id UUID REFERENCES file_versions(id),
    ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'private';  -- private, project, public

CREATE INDEX IF NOT EXISTS idx_views_branch ON view_configurations(branch_id);
CREATE INDEX IF NOT EXISTS idx_views_shared ON view_configurations(is_shared);

-- ============================================================================
-- COMPUTATION JOBS TABLE (Enhanced)
-- For tracking worker jobs
-- ============================================================================

CREATE TABLE IF NOT EXISTS computation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- What to compute
    file_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    file_version_id UUID REFERENCES file_versions(id),
    operation VARCHAR(100) NOT NULL,
    params JSONB NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',  -- high, normal, low

    -- Status tracking
    status VARCHAR(50) DEFAULT 'queued',  -- queued, processing, complete, failed, cancelled
    progress INTEGER DEFAULT 0,  -- 0-100
    error_message TEXT,

    -- Result
    cache_id UUID REFERENCES computation_cache(id),
    result_metadata JSONB,

    -- Timing
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Requestor
    requested_by UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON computation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_file ON computation_jobs(file_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON computation_jobs(requested_by);
CREATE INDEX IF NOT EXISTS idx_jobs_queued ON computation_jobs(queued_at);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to increment file version
CREATE OR REPLACE FUNCTION create_file_version(
    p_file_id UUID,
    p_hash VARCHAR(64),
    p_storage_key VARCHAR(500),
    p_uploaded_by UUID,
    p_change_note TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_version_number INTEGER;
    v_version_id UUID;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_version_number
    FROM file_versions
    WHERE file_id = p_file_id;

    -- Insert new version
    INSERT INTO file_versions (file_id, version_number, hash, storage_key, uploaded_by, change_note)
    VALUES (p_file_id, v_version_number, p_hash, p_storage_key, p_uploaded_by, p_change_note)
    RETURNING id INTO v_version_id;

    -- Update current version pointer
    UPDATE datasets
    SET current_version_id = v_version_id, updated_at = NOW()
    WHERE id = p_file_id;

    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log audit event with state changes
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_org_id UUID,
    p_project_id UUID,
    p_action VARCHAR(100),
    p_entity_type VARCHAR(50),
    p_entity_id UUID,
    p_before_state JSONB DEFAULT NULL,
    p_after_state JSONB DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::JSONB,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
    v_user_email VARCHAR(255);
BEGIN
    -- Get user email for denormalization
    SELECT email INTO v_user_email FROM users WHERE id = p_user_id;

    INSERT INTO audit_log (
        user_id, user_email, organization_id, project_id,
        action, entity_type, entity_id,
        before_state, after_state, details,
        ip_address, user_agent
    )
    VALUES (
        p_user_id, v_user_email, p_org_id, p_project_id,
        p_action, p_entity_type, p_entity_id,
        p_before_state, p_after_state, p_details,
        p_ip_address, p_user_agent
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update computation cache access
CREATE OR REPLACE FUNCTION touch_computation_cache(p_cache_key VARCHAR(255))
RETURNS VOID AS $$
BEGIN
    UPDATE computation_cache
    SET last_accessed_at = NOW(), access_count = access_count + 1
    WHERE cache_key = p_cache_key;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at on file_versions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to new tables (if triggers don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_project_branches_updated_at') THEN
        -- No updated_at on project_branches, so skip
        NULL;
    END IF;
END $$;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Create main branch for the demo project if it doesn't exist
INSERT INTO project_branches (project_id, name, description, status)
SELECT
    '00000000-0000-0000-0000-000000000001'::UUID,
    'main',
    'Default branch for sample files project',
    'active'
WHERE EXISTS (
    SELECT 1 FROM projects WHERE id = '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (project_id, name) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE file_versions IS 'Tracks file version history for audit and rollback';
COMMENT ON TABLE project_branches IS 'Git-like branches for isolating work on annotations';
COMMENT ON TABLE session_recordings IS 'Captures user sessions for audit compliance and playback';
COMMENT ON TABLE computation_cache IS 'Caches expensive computation results for performance';
COMMENT ON TABLE computation_jobs IS 'Tracks computation jobs processed by workers';

COMMENT ON COLUMN datasets.current_version_id IS 'Points to the current/latest file version';
COMMENT ON COLUMN annotations.visibility IS 'public=everyone, private=creator only, group=specific users';
COMMENT ON COLUMN annotations.status IS 'active=valid, archived=old version, migrated=copied from old version, invalid=coordinates no longer valid';
COMMENT ON COLUMN organizations.audit_config IS 'Per-org audit settings: {level: minimal|standard|detailed|forensic}';