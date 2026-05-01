-- CIA Web Analytics Platform - Consolidated Database Schema
-- v2.1 Server-Authority Architecture with ViewGroup Link System
-- FIXED: Proper dependency ordering (all tables before triggers/FKs that reference them)
-- ADDED: ViewGroups, ViewLinks, ViewGroupLinks, ViewActivity tables for two-layer link architecture

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SERVER INSTANCE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS server_instance (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    instance_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    schema_version VARCHAR(20) NOT NULL DEFAULT '2.0.0',
    last_migration VARCHAR(100),
    notes TEXT
);

INSERT INTO server_instance (id, instance_id, schema_version, notes)
VALUES (1, uuid_generate_v4(), '2.1.0', 'Database with ViewGroup link system')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    storage_quota_bytes BIGINT DEFAULT 10737418240,
    storage_used_bytes BIGINT DEFAULT 0,
    audit_config JSONB DEFAULT '{"level": "standard"}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    avatar_url VARCHAR(500),
    preferences JSONB DEFAULT '{}',
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    UNIQUE(organization_id, user_id)
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    parent_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    visibility VARCHAR(20) DEFAULT 'private',
    status VARCHAR(20) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    UNIQUE(organization_id, slug)
);

CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '{}',
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

CREATE TABLE project_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_branch_id UUID REFERENCES project_branches(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    merged_at TIMESTAMPTZ,
    merged_by UUID REFERENCES users(id),
    UNIQUE(project_id, name)
);

-- ============================================================================
-- FILES (Datasets)
-- ============================================================================

CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    file_type VARCHAR(50) NOT NULL DEFAULT 'unknown',
    hash VARCHAR(64),
    storage_key VARCHAR(500),
    public_path VARCHAR(500),
    point_count INTEGER,
    cell_count INTEGER,
    bounds JSONB,
    data_arrays JSONB,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by VARCHAR(255),
    last_accessed_at TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    current_version_id UUID,
    derived_from UUID REFERENCES datasets(id) ON DELETE SET NULL,
    derivation_info JSONB,
    -- File-level thumbnail (static, only changes on version update or admin action)
    thumbnail_key VARCHAR(500),        -- MinIO object key for file thumbnail
    thumbnail_updated_at TIMESTAMPTZ,  -- When thumbnail was last generated
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE file_versions (
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

ALTER TABLE datasets
    ADD CONSTRAINT fk_current_version
    FOREIGN KEY (current_version_id) REFERENCES file_versions(id);

CREATE TABLE file_project_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    access_level VARCHAR(20) NOT NULL DEFAULT 'read',
    visibility VARCHAR(20) DEFAULT 'all_members',
    visible_to_users UUID[] DEFAULT '{}',
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    folder_id UUID,  -- FK added after folders table
    UNIQUE(file_id, project_id)
);

-- ============================================================================
-- ROOMS
-- ============================================================================

CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    -- Non-main rooms should remain NULL here so the unique constraint only
    -- applies to the single TRUE main room per project.
    is_main BOOLEAN,
    room_type VARCHAR(20) DEFAULT 'breakout' CHECK (room_type IN ('main', 'breakout')),
    is_public BOOLEAN DEFAULT TRUE,
    max_members INTEGER DEFAULT 50,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT one_main_room_per_project UNIQUE (project_id, is_main) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_rooms_project ON rooms(project_id);

CREATE TABLE room_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

CREATE INDEX idx_room_members_room ON room_members(room_id);
CREATE INDEX idx_room_members_user ON room_members(user_id);

-- ============================================================================
-- WORKSPACES (Must be before saved_filters, bookmarks, canvases)
-- ============================================================================

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL DEFAULT 'Untitled Workspace',
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'personal' CHECK (type IN ('personal', 'project', 'breakout')),
    parent_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    active_canvas_id UUID,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id),
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    auto_merge BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspaces_project ON workspaces(project_id);
CREATE INDEX idx_workspaces_type ON workspaces(type);
CREATE INDEX idx_workspaces_room ON workspaces(room_id);

CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (permission IN ('owner', 'editor', 'viewer')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- ============================================================================
-- FOLDERS
-- ============================================================================

CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_folder_name_in_parent UNIQUE NULLS NOT DISTINCT (project_id, parent_id, name)
);

CREATE INDEX idx_folders_project ON folders(project_id);
CREATE INDEX idx_folders_parent ON folders(parent_id);

-- Add folder FK to file_project_access
ALTER TABLE file_project_access 
    ADD CONSTRAINT fk_file_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL;
CREATE INDEX idx_file_project_access_folder ON file_project_access(folder_id);

-- ============================================================================
-- STARS
-- ============================================================================

CREATE TABLE stars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    scope VARCHAR(20) NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'room', 'project')),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('file', 'folder')),
    target_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_star_per_scope UNIQUE (user_id, target_type, target_id, scope, room_id)
);

CREATE INDEX idx_stars_user ON stars(user_id);
CREATE INDEX idx_stars_project ON stars(project_id);
CREATE INDEX idx_stars_scope ON stars(scope);
CREATE INDEX idx_stars_room ON stars(room_id) WHERE room_id IS NOT NULL;
CREATE INDEX idx_stars_target ON stars(target_type, target_id);

-- ============================================================================
-- VIEWGROUPS
-- ============================================================================

CREATE TABLE viewgroups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255),  -- NULL for implicit solo groups
    color VARCHAR(20) DEFAULT '#a855f7',
    layout_id VARCHAR(50) DEFAULT 'single',
    slots JSONB DEFAULT '[]',
    canvas_position JSONB DEFAULT '{"row": 0, "col": 0, "rowSpan": 1, "colSpan": 1}',
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    visibility VARCHAR(20) DEFAULT 'group' CHECK (visibility IN ('private', 'group', 'public')),
    shared_with JSONB DEFAULT '[]',
    is_explicit BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_viewgroups_workspace ON viewgroups(workspace_id);
CREATE INDEX idx_viewgroups_owner ON viewgroups(owner_id);
CREATE INDEX idx_viewgroups_explicit ON viewgroups(is_explicit) WHERE is_explicit = TRUE;

-- ============================================================================
-- VIEW CONFIGURATIONS
-- ============================================================================

CREATE TABLE view_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES project_branches(id),
    file_version_id UUID REFERENCES file_versions(id),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    group_id UUID,
    name VARCHAR(255) DEFAULT 'Untitled View',
    description TEXT,
    owner_user_id UUID REFERENCES users(id),
    owner_user_name VARCHAR(255),
    visibility VARCHAR(50) DEFAULT 'private',
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with JSONB DEFAULT '[]',
    saved_by_user BOOLEAN DEFAULT FALSE,
    camera JSONB,
    filters JSONB DEFAULT '[]',
    widgets JSONB DEFAULT '[]',
    color_maps JSONB,
    cursor_config JSONB DEFAULT '{"showOtherUsers": true, "cursorStyle": "crosshair", "showCursorTrails": false}',
    annotation_display JSONB DEFAULT '{"visible": true, "showLabels": true, "opacity": 1.0}',
    annotations_visible BOOLEAN DEFAULT TRUE,
    links JSONB DEFAULT '{}',
    forked_from JSONB,
    fork_count INTEGER DEFAULT 0,
    merged_from JSONB,
    broadcast JSONB DEFAULT '{"state": "off", "startedAt": null, "followerCount": 0, "allowDuplication": false, "allowChat": true, "allowAnnotations": false}',
    following JSONB,
    snapshots JSONB DEFAULT '[]',
    max_snapshots INTEGER DEFAULT 50,
    applied_presets JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'active',
    active_instance_count INTEGER DEFAULT 0,
    last_active_timestamp TIMESTAMPTZ DEFAULT NOW(),
    server_version INTEGER DEFAULT 1,
    view_group_id UUID REFERENCES viewgroups(id) ON DELETE SET NULL,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- VIEWGROUP LINK SYSTEM (Two-Layer Architecture)
-- ============================================================================

-- View-to-View Links (Foundation Layer)
-- Individual links between specific views - the building blocks
CREATE TABLE view_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_view_id UUID NOT NULL REFERENCES view_configurations(id) ON DELETE CASCADE,
    target_view_id UUID NOT NULL REFERENCES view_configurations(id) ON DELETE CASCADE,
    property VARCHAR(50) NOT NULL,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('follow', 'sync', 'broadcast')),
    active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Pause state (for VG link override)
    paused_by_vg_link UUID,  -- Reference to view_group_links.id - FK added after that table

    -- Reconciliation tracking (for unidirectional followers)
    follower_last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    follower_diverged_at TIMESTAMPTZ,
    leader_state_hash VARCHAR(16),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Prevent duplicate links
    UNIQUE(source_view_id, target_view_id, property)
);

CREATE INDEX idx_view_links_source ON view_links(source_view_id);
CREATE INDEX idx_view_links_target ON view_links(target_view_id);
CREATE INDEX idx_view_links_paused ON view_links(paused_by_vg_link) WHERE paused_by_vg_link IS NOT NULL;
CREATE INDEX idx_view_links_property ON view_links(property);

-- ViewGroup-to-ViewGroup Links (Convenience Layer)
-- Follows Originator Principle: originator's links get paused
CREATE TABLE view_group_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    originator_group_id UUID NOT NULL REFERENCES viewgroups(id) ON DELETE CASCADE,
    target_group_id UUID NOT NULL REFERENCES viewgroups(id) ON DELETE CASCADE,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('follow', 'sync', 'broadcast')),
    properties JSONB NOT NULL DEFAULT '["camera", "filters"]',
    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Prevent duplicate VG links
    UNIQUE(originator_group_id, target_group_id)
);

CREATE INDEX idx_vg_links_originator ON view_group_links(originator_group_id);
CREATE INDEX idx_vg_links_target ON view_group_links(target_group_id);

-- Add foreign key from view_links to view_group_links (deferred to avoid circular dependency)
ALTER TABLE view_links
    ADD CONSTRAINT view_links_paused_by_vg_link_fkey
    FOREIGN KEY (paused_by_vg_link) REFERENCES view_group_links(id) ON DELETE SET NULL;

-- View Activity Table (for reconciliation)
-- Tracks when users are actively interacting with views
CREATE TABLE view_activity (
    view_id UUID NOT NULL REFERENCES view_configurations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    inactive_at TIMESTAMPTZ,

    PRIMARY KEY (view_id, user_id, active_at)
);

CREATE INDEX idx_view_activity_active ON view_activity(view_id, user_id)
    WHERE inactive_at IS NULL;

-- Index for view_configurations by view_group_id
CREATE INDEX idx_view_configs_group ON view_configurations(view_group_id)
    WHERE view_group_id IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE view_links IS 'Foundation layer: View-to-View links for property synchronization';
COMMENT ON TABLE view_group_links IS 'Convenience layer: ViewGroup-to-ViewGroup links with Originator Principle';
COMMENT ON TABLE view_activity IS 'Activity tracking for reconciliation of unidirectional followers';
COMMENT ON COLUMN view_links.paused_by_vg_link IS 'ID of VG link that paused this link (Originator Principle)';
COMMENT ON COLUMN view_group_links.originator_group_id IS 'Group that initiated link - their incoming follow links get paused';

-- ============================================================================
-- ANNOTATIONS
-- ============================================================================

CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    file_version_id UUID REFERENCES file_versions(id),
    branch_id UUID REFERENCES project_branches(id),
    position DOUBLE PRECISION[3],
    normal DOUBLE PRECISION[3],
    type VARCHAR(50) NOT NULL DEFAULT 'point',
    text TEXT,
    content JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    visibility VARCHAR(50) DEFAULT 'public',
    visibility_group UUID[],
    status VARCHAR(50) DEFAULT 'active',
    migrated_from UUID REFERENCES annotations(id),
    user_id VARCHAR(255),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspace_annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    view_id UUID REFERENCES view_configurations(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES project_branches(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    path_data JSONB NOT NULL,
    screen_coordinates JSONB NOT NULL,
    linked_datasets UUID[],
    linked_grid_slots VARCHAR(50)[],
    linked_view_ids UUID[],
    style JSONB DEFAULT '{"strokeColor": "#ffffff", "strokeWidth": 2, "opacity": 1.0}',
    text_content TEXT,
    label VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    visibility VARCHAR(50) DEFAULT 'project',
    visibility_users UUID[],
    status VARCHAR(50) DEFAULT 'active',
    locked BOOLEAN DEFAULT FALSE,
    z_index INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspace_annotation_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_annotation_id UUID NOT NULL REFERENCES workspace_annotations(id) ON DELETE CASCADE,
    snapshot_data JSONB NOT NULL,
    version_number INTEGER NOT NULL,
    change_note TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_annotation_id, version_number)
);

-- ============================================================================
-- COMPUTATION
-- ============================================================================

CREATE TABLE computation_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    file_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    file_version_id UUID REFERENCES file_versions(id) ON DELETE CASCADE,
    operation VARCHAR(100) NOT NULL,
    params JSONB NOT NULL,
    result_storage_key VARCHAR(500),
    result_metadata JSONB,
    compute_time_ms BIGINT,
    result_size_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 1,
    expires_at TIMESTAMPTZ
);

CREATE TABLE computation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    file_version_id UUID REFERENCES file_versions(id),
    operation VARCHAR(100) NOT NULL,
    params JSONB NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(50) DEFAULT 'queued',
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    cache_id UUID REFERENCES computation_cache(id),
    cache_key VARCHAR(255),
    result_metadata JSONB,
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    requested_by UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id)
);

-- ============================================================================
-- SESSION RECORDINGS
-- ============================================================================

CREATE TABLE session_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_ms BIGINT,
    storage_key VARCHAR(500),
    file_size BIGINT,
    frame_count INTEGER,
    metadata JSONB DEFAULT '{}',
    device_info JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'recording',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- VR EXPLORATION SESSIONS
-- ============================================================================

CREATE TABLE vr_exploration_sessions (
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

CREATE INDEX idx_vr_sessions_project ON vr_exploration_sessions(project_id);
CREATE INDEX idx_vr_sessions_owner ON vr_exploration_sessions(owner_user_id);
CREATE INDEX idx_vr_sessions_status ON vr_exploration_sessions(status);
CREATE INDEX idx_vr_sessions_dataset ON vr_exploration_sessions(dataset_id);

CREATE TABLE vr_session_participants (
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

CREATE INDEX idx_vr_participants_session ON vr_session_participants(session_id);
CREATE INDEX idx_vr_participants_user ON vr_session_participants(od_user_id);

CREATE TABLE vr_session_snapshots (
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

CREATE INDEX idx_vr_snapshots_session ON vr_session_snapshots(session_id);
CREATE INDEX idx_vr_snapshots_timestamp ON vr_session_snapshots(timestamp DESC);

-- NOTE: Trigger for vr_exploration_sessions is in the TRIGGERS section below

-- VR Preprocessing - tracks preprocessing jobs for VR optimization
CREATE TABLE vr_preprocessing (
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

CREATE INDEX idx_vr_preprocessing_dataset ON vr_preprocessing(dataset_id);
CREATE INDEX idx_vr_preprocessing_status ON vr_preprocessing(status);
CREATE INDEX idx_vr_preprocessing_project ON vr_preprocessing(project_id);

-- ============================================================================
-- SAVED FILTERS
-- ============================================================================

CREATE TABLE saved_filters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scope VARCHAR(20) NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'workspace', 'project')),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    filter_config JSONB NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_filters_project ON saved_filters(project_id);
CREATE INDEX idx_saved_filters_owner ON saved_filters(owner_id);
CREATE INDEX idx_saved_filters_workspace ON saved_filters(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_saved_filters_scope ON saved_filters(scope);

-- ============================================================================
-- BOOKMARKS
-- ============================================================================

CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scope VARCHAR(20) NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'workspace', 'project')),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
    view_config_id UUID REFERENCES view_configurations(id) ON DELETE SET NULL,
    camera_state JSONB,
    filter_ids UUID[] DEFAULT '{}',
    thumbnail_key VARCHAR(500),
    tags TEXT[] DEFAULT '{}',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookmarks_project ON bookmarks(project_id);
CREATE INDEX idx_bookmarks_owner ON bookmarks(owner_id);
CREATE INDEX idx_bookmarks_workspace ON bookmarks(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_bookmarks_scope ON bookmarks(scope);
CREATE INDEX idx_bookmarks_dataset ON bookmarks(dataset_id) WHERE dataset_id IS NOT NULL;
CREATE INDEX idx_bookmarks_tags ON bookmarks USING GIN(tags);

-- ============================================================================
-- VIEW THUMBNAILS (Progressive Loading & Snapshots)
-- ============================================================================
-- Stores visual thumbnails/previews of views for:
-- 1. Progressive loading (show thumbnail while real data loads)
-- 2. Bookmark previews
-- 3. Snapshot gallery views
-- 4. Canvas cell placeholders

CREATE TABLE view_thumbnails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    view_config_id UUID NOT NULL REFERENCES view_configurations(id) ON DELETE CASCADE,
    snapshot_id UUID,  -- NULL = current state thumbnail, else links to specific snapshot

    -- Thumbnail data (either storage_key OR inline_data, not both)
    format VARCHAR(10) NOT NULL CHECK (format IN ('svg', 'webp', 'png', 'jpeg')),
    storage_key VARCHAR(500),     -- MinIO object key for larger thumbnails
    inline_data TEXT,             -- Base64 encoded data for small thumbnails (< 64KB)

    -- Metadata
    width INTEGER,
    height INTEGER,
    file_size INTEGER,            -- Size in bytes

    -- Lifecycle
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,       -- Optional TTL for auto-cleanup

    -- Ensure either storage_key or inline_data is set
    CONSTRAINT thumbnail_data_check CHECK (
        (storage_key IS NOT NULL AND inline_data IS NULL) OR
        (storage_key IS NULL AND inline_data IS NOT NULL)
    ),

    -- Unique constraint: one thumbnail per view/snapshot combination
    CONSTRAINT unique_view_snapshot_thumbnail UNIQUE (view_config_id, snapshot_id)
);

CREATE INDEX idx_thumbnails_view ON view_thumbnails(view_config_id);
CREATE INDEX idx_thumbnails_snapshot ON view_thumbnails(snapshot_id) WHERE snapshot_id IS NOT NULL;
CREATE INDEX idx_thumbnails_expires ON view_thumbnails(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- RECORDING EVENTS
-- ============================================================================

CREATE TABLE recording_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_id UUID NOT NULL REFERENCES session_recordings(id) ON DELETE CASCADE,
    timestamp_offset_ms INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_source VARCHAR(50),
    event_data JSONB NOT NULL,
    user_id UUID REFERENCES users(id),
    client_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255),
    organization_id UUID REFERENCES organizations(id),
    project_id UUID REFERENCES projects(id),
    room_id UUID,
    session_recording_id UUID REFERENCES session_recordings(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    before_state JSONB,
    after_state JSONB,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT
);

-- ============================================================================
-- Y.JS PERSISTENCE
-- ============================================================================

CREATE TABLE yjs_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id VARCHAR(255) NOT NULL UNIQUE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    document_state BYTEA NOT NULL,
    snapshot_version INTEGER DEFAULT 1,
    last_update_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE yjs_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id VARCHAR(255) NOT NULL,
    update_data BYTEA NOT NULL,
    update_origin VARCHAR(50),
    user_id UUID REFERENCES users(id),
    client_id BIGINT,
    sequence_num BIGSERIAL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_yjs_room FOREIGN KEY (room_id) REFERENCES yjs_documents(room_id) ON DELETE CASCADE
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id VARCHAR(255) NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(255),
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    thread_root_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id),
    yjs_update_id UUID REFERENCES yjs_updates(id) ON DELETE SET NULL,
    -- Matrix federation columns (Phase 3)
    matrix_event_id VARCHAR(255),
    matrix_room_id VARCHAR(255),
    federation_source VARCHAR(50)
);

-- ============================================================================
-- MATRIX FEDERATION (Phase 3-7)
-- ============================================================================

-- Maps CIA Web rooms to Matrix rooms
CREATE TABLE matrix_room_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cia_room_id VARCHAR(255) NOT NULL UNIQUE,
    matrix_room_id VARCHAR(255) NOT NULL UNIQUE,
    matrix_alias VARCHAR(255),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active',
    config JSONB DEFAULT '{}'
);

CREATE INDEX idx_matrix_room_mappings_cia_room ON matrix_room_mappings(cia_room_id);
CREATE INDEX idx_matrix_room_mappings_matrix_room ON matrix_room_mappings(matrix_room_id);
CREATE INDEX idx_matrix_room_mappings_project ON matrix_room_mappings(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_matrix_room_mappings_status ON matrix_room_mappings(status);

-- Deduplication log for Matrix events
CREATE TABLE matrix_event_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matrix_event_id VARCHAR(255) NOT NULL UNIQUE,
    cia_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('outbound', 'inbound')),
    matrix_room_id VARCHAR(255) NOT NULL,
    cia_room_id VARCHAR(255),
    matrix_user_id VARCHAR(255),
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    event_data JSONB DEFAULT '{}'
);

CREATE INDEX idx_matrix_event_log_matrix_event_id ON matrix_event_log(matrix_event_id);
CREATE INDEX idx_matrix_event_log_cia_message_id ON matrix_event_log(cia_message_id) WHERE cia_message_id IS NOT NULL;
CREATE INDEX idx_matrix_event_log_direction ON matrix_event_log(direction);
CREATE INDEX idx_matrix_event_log_processed_at ON matrix_event_log(processed_at);

-- Cache of federated Matrix users
CREATE TABLE federated_user_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matrix_user_id VARCHAR(255) NOT NULL UNIQUE,
    cia_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    display_name VARCHAR(255),
    avatar_url TEXT,
    server_name VARCHAR(255),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    cached_at TIMESTAMPTZ DEFAULT NOW(),
    profile_data JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active'
);

CREATE INDEX idx_federated_user_cache_matrix_user_id ON federated_user_cache(matrix_user_id);
CREATE INDEX idx_federated_user_cache_cia_user_id ON federated_user_cache(cia_user_id) WHERE cia_user_id IS NOT NULL;
CREATE INDEX idx_federated_user_cache_server_name ON federated_user_cache(server_name);
CREATE INDEX idx_federated_user_cache_last_seen ON federated_user_cache(last_seen);

-- ============================================================================
-- CANVAS SYSTEM (Canvases, Placements, Subsets, Notes, Images)
-- ============================================================================

CREATE TABLE canvases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Untitled Canvas',
    dimensions JSONB NOT NULL DEFAULT '{"rows": 3, "cols": 3}',
    viewport JSONB DEFAULT '{"row": 0, "col": 0, "rows": 3, "cols": 3}',
    layout_mode VARCHAR(20) NOT NULL DEFAULT 'grid' CHECK (layout_mode IN ('grid', 'flow')),
    flow_direction VARCHAR(20) NOT NULL DEFAULT 'row' CHECK (flow_direction IN ('row', 'column')),
    homepoint JSONB,
    ownership JSONB NOT NULL DEFAULT '{"type": "personal", "ownerId": null}',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_canvases_workspace ON canvases(workspace_id);
CREATE INDEX idx_canvases_project ON canvases(project_id);

-- Deferred FK: workspaces.active_canvas_id -> canvases (canvases depends on workspaces, so this can't be inline)
ALTER TABLE workspaces ADD CONSTRAINT fk_workspaces_active_canvas FOREIGN KEY (active_canvas_id) REFERENCES canvases(id) ON DELETE SET NULL;

CREATE TABLE placements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    row_index INT NOT NULL DEFAULT 0,
    col_index INT NOT NULL DEFAULT 0,
    row_span INT NOT NULL DEFAULT 1 CHECK (row_span BETWEEN 1 AND 3),
    col_span INT NOT NULL DEFAULT 1 CHECK (col_span BETWEEN 1 AND 3),
    content_type VARCHAR(20) NOT NULL DEFAULT 'empty' CHECK (content_type IN ('view', 'note', 'image', 'subset', 'empty')),
    content_id UUID,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_placements_canvas ON placements(canvas_id);
CREATE INDEX idx_placements_content ON placements(content_type, content_id);
CREATE INDEX idx_placements_position ON placements(canvas_id, row_index, col_index);

CREATE TABLE subsets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Untitled Focus Group',
    description TEXT,
    placement_ids UUID[] DEFAULT '{}',
    attached_notes UUID[] DEFAULT '{}',
    attached_images UUID[] DEFAULT '{}',
    visibility VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),
    shared_with UUID[] DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subsets_canvas ON subsets(canvas_id);
CREATE INDEX idx_subsets_project ON subsets(project_id);
CREATE INDEX idx_subsets_visibility ON subsets(visibility);

CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT '',
    content TEXT DEFAULT '',
    format VARCHAR(20) DEFAULT 'markdown' CHECK (format IN ('markdown', 'plain', 'rich')),
    position JSONB,
    width INT DEFAULT 1,
    height INT DEFAULT 1,
    color VARCHAR(20) DEFAULT 'default',
    pinned BOOLEAN DEFAULT FALSE,
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_canvas ON notes(canvas_id);

CREATE TABLE canvas_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    storage_key VARCHAR(500),
    original_name VARCHAR(255),
    mime_type VARCHAR(100) DEFAULT 'image/png',
    file_size BIGINT DEFAULT 0,
    natural_width INT DEFAULT 0,
    natural_height INT DEFAULT 0,
    position JSONB,
    width INT DEFAULT 1,
    height INT DEFAULT 1,
    fit VARCHAR(20) DEFAULT 'contain' CHECK (fit IN ('contain', 'cover', 'fill')),
    caption TEXT DEFAULT '',
    alt_text TEXT DEFAULT '',
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_canvas_images_canvas ON canvas_images(canvas_id);

-- ============================================================================
-- ALL INDEXES (for tables defined above)
-- ============================================================================

CREATE INDEX idx_datasets_hash ON datasets(hash);
CREATE INDEX idx_datasets_org ON datasets(organization_id);
CREATE INDEX idx_datasets_status ON datasets(status);
CREATE INDEX idx_datasets_derived_from ON datasets(derived_from);
CREATE INDEX idx_file_versions_file ON file_versions(file_id);
CREATE INDEX idx_file_versions_hash ON file_versions(hash);
CREATE INDEX idx_file_access_project ON file_project_access(project_id);
CREATE INDEX idx_file_access_file ON file_project_access(file_id);
CREATE INDEX idx_branches_project ON project_branches(project_id);
CREATE INDEX idx_branches_status ON project_branches(status);
CREATE INDEX idx_annotations_dataset ON annotations(dataset_id);
CREATE INDEX idx_annotations_branch ON annotations(branch_id);
CREATE INDEX idx_annotations_status ON annotations(status);
CREATE INDEX idx_workspace_ann_project ON workspace_annotations(project_id);
CREATE INDEX idx_workspace_ann_view ON workspace_annotations(view_id);
CREATE INDEX idx_workspace_ann_status ON workspace_annotations(status);
CREATE INDEX idx_workspace_ann_linked_datasets ON workspace_annotations USING GIN(linked_datasets);
CREATE INDEX idx_views_project ON view_configurations(project_id);
CREATE INDEX idx_views_dataset ON view_configurations(dataset_id);
CREATE INDEX idx_views_owner ON view_configurations(owner_user_id);
CREATE INDEX idx_views_shared ON view_configurations(is_shared);
CREATE INDEX idx_views_status ON view_configurations(status);
CREATE INDEX idx_views_visibility ON view_configurations(visibility);
CREATE INDEX idx_views_updated ON view_configurations(updated_at DESC);
CREATE INDEX idx_cache_key ON computation_cache(cache_key);
CREATE INDEX idx_cache_file ON computation_cache(file_id);
CREATE INDEX idx_jobs_status ON computation_jobs(status);
CREATE INDEX idx_jobs_file ON computation_jobs(file_id);
CREATE INDEX idx_jobs_cache_key ON computation_jobs(cache_key);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_org ON audit_log(organization_id, timestamp DESC);
CREATE INDEX idx_audit_project ON audit_log(project_id, timestamp DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id, timestamp DESC);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_yjs_docs_project ON yjs_documents(project_id);
CREATE INDEX idx_yjs_docs_updated ON yjs_documents(updated_at DESC);
CREATE INDEX idx_yjs_updates_room_seq ON yjs_updates(room_id, sequence_num);
CREATE INDEX idx_yjs_updates_room_time ON yjs_updates(room_id, timestamp);
CREATE INDEX idx_yjs_updates_origin ON yjs_updates(update_origin) WHERE update_origin IS NOT NULL;
CREATE INDEX idx_yjs_updates_user ON yjs_updates(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_recording_events_recording ON recording_events(recording_id);
CREATE INDEX idx_recording_events_playback ON recording_events(recording_id, timestamp_offset_ms);
CREATE INDEX idx_recording_events_type ON recording_events(event_type);
CREATE INDEX idx_recording_events_user ON recording_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_recordings_project ON session_recordings(project_id);
CREATE INDEX idx_recordings_user ON session_recordings(user_id);
CREATE INDEX idx_recordings_status ON session_recordings(status);
CREATE INDEX idx_recordings_started ON session_recordings(started_at DESC);
CREATE INDEX idx_chat_room_time ON chat_messages(room_id, timestamp DESC);
CREATE INDEX idx_chat_project_time ON chat_messages(project_id, timestamp DESC);
CREATE INDEX idx_chat_user ON chat_messages(user_id);
CREATE INDEX idx_chat_thread ON chat_messages(thread_root_id) WHERE thread_root_id IS NOT NULL;
CREATE INDEX idx_chat_not_deleted ON chat_messages(room_id, timestamp) WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_type ON chat_messages(message_type) WHERE message_type != 'text';
CREATE INDEX idx_chat_matrix_event_id ON chat_messages(matrix_event_id) WHERE matrix_event_id IS NOT NULL;
CREATE INDEX idx_chat_matrix_room_id ON chat_messages(matrix_room_id) WHERE matrix_room_id IS NOT NULL;
CREATE INDEX idx_chat_federation_source ON chat_messages(federation_source) WHERE federation_source IS NOT NULL;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_folder_path(folder_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    current_id UUID := folder_uuid;
    folder_name TEXT;
    parent UUID;
BEGIN
    IF folder_uuid IS NULL THEN RETURN '/'; END IF;
    WHILE current_id IS NOT NULL LOOP
        SELECT f.name, f.parent_id INTO folder_name, parent FROM folders f WHERE f.id = current_id;
        IF folder_name IS NOT NULL THEN result := '/' || folder_name || result; END IF;
        current_id := parent;
    END LOOP;
    IF result = '' THEN result := '/'; END IF;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION count_files_in_folder(folder_uuid UUID)
RETURNS INTEGER AS $$
DECLARE file_count INTEGER;
BEGIN
    IF folder_uuid IS NULL THEN RETURN 0; END IF;
    WITH RECURSIVE folder_tree AS (
        SELECT id FROM folders WHERE id = folder_uuid
        UNION ALL
        SELECT f.id FROM folders f INNER JOIN folder_tree ft ON f.parent_id = ft.id
    )
    SELECT COUNT(*) INTO file_count FROM file_project_access fpa WHERE fpa.folder_id IN (SELECT id FROM folder_tree);
    RETURN COALESCE(file_count, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_file_version(
    p_file_id UUID, p_hash VARCHAR(64), p_storage_key VARCHAR(500),
    p_uploaded_by UUID, p_change_note TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE v_version_number INTEGER; v_version_id UUID;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number FROM file_versions WHERE file_id = p_file_id;
    INSERT INTO file_versions (file_id, version_number, hash, storage_key, uploaded_by, change_note)
    VALUES (p_file_id, v_version_number, p_hash, p_storage_key, p_uploaded_by, p_change_note)
    RETURNING id INTO v_version_id;
    UPDATE datasets SET current_version_id = v_version_id, updated_at = NOW() WHERE id = p_file_id;
    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID, p_org_id UUID, p_project_id UUID, p_action VARCHAR(100),
    p_entity_type VARCHAR(50), p_entity_id UUID,
    p_before_state JSONB DEFAULT NULL, p_after_state JSONB DEFAULT NULL, p_details JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE v_audit_id UUID; v_user_email VARCHAR(255);
BEGIN
    SELECT email INTO v_user_email FROM users WHERE id = p_user_id;
    INSERT INTO audit_log (user_id, user_email, organization_id, project_id, action, entity_type, entity_id, before_state, after_state, details)
    VALUES (p_user_id, v_user_email, p_org_id, p_project_id, p_action, p_entity_type, p_entity_id, p_before_state, p_after_state, p_details)
    RETURNING id INTO v_audit_id;
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ensure_user_personal_workspace(p_user_id UUID, p_project_id UUID, p_user_name VARCHAR(255) DEFAULT 'User')
RETURNS UUID AS $$
DECLARE v_workspace_id UUID;
BEGIN
    SELECT id INTO v_workspace_id FROM workspaces WHERE project_id = p_project_id AND owner_id = p_user_id AND type = 'personal';
    IF v_workspace_id IS NULL THEN
        INSERT INTO workspaces (name, description, type, project_id, owner_id, created_by)
        VALUES ('My Workspace', 'Personal workspace for ' || p_user_name, 'personal', p_project_id, p_user_id, p_user_id)
        RETURNING id INTO v_workspace_id;
    END IF;
    RETURN v_workspace_id;
END;
$$ LANGUAGE plpgsql;

-- Matrix Federation: Clean up old event log entries (run via cron)
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

-- Matrix Federation: Clean up stale user cache entries (run via cron)
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

-- ============================================================================
-- TRIGGERS (All tables exist now)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON datasets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE ON annotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_view_configs_updated_at BEFORE UPDATE ON view_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workspace_ann_updated_at BEFORE UPDATE ON workspace_annotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_canvases_updated_at BEFORE UPDATE ON canvases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_placements_updated_at BEFORE UPDATE ON placements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subsets_updated_at BEFORE UPDATE ON subsets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_canvas_images_updated_at BEFORE UPDATE ON canvas_images FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saved_filters_updated_at BEFORE UPDATE ON saved_filters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookmarks_updated_at BEFORE UPDATE ON bookmarks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vr_sessions_updated_at BEFORE UPDATE ON vr_exploration_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_viewgroups_updated_at BEFORE UPDATE ON viewgroups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create main room when project is created
CREATE OR REPLACE FUNCTION create_main_room_for_project() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO rooms (project_id, name, is_main, room_type, created_by) VALUES (NEW.id, 'Main Room', TRUE, 'main', NEW.created_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_main_room AFTER INSERT ON projects FOR EACH ROW EXECUTE FUNCTION create_main_room_for_project();

-- Auto-create default workspace for breakout rooms
CREATE OR REPLACE FUNCTION create_default_workspace_for_room() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.room_type != 'main' THEN
        INSERT INTO workspaces (name, description, type, project_id, room_id, owner_id, created_by)
        VALUES (NEW.name || ' Workspace', 'Default workspace for room: ' || NEW.name, 'breakout', NEW.project_id, NEW.id, NEW.created_by, NEW.created_by);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_room_workspace AFTER INSERT ON rooms FOR EACH ROW EXECUTE FUNCTION create_default_workspace_for_room();

-- Delete stars when folder deleted
CREATE OR REPLACE FUNCTION delete_folder_stars() RETURNS TRIGGER AS $$
BEGIN DELETE FROM stars WHERE target_type = 'folder' AND target_id = OLD.id; RETURN OLD; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delete_folder_stars BEFORE DELETE ON folders FOR EACH ROW EXECUTE FUNCTION delete_folder_stars();

-- ============================================================================
-- SEED DATA
-- ============================================================================

INSERT INTO organizations (id, name, slug, storage_quota_bytes)
VALUES ('00000000-0000-0000-0000-000000000000', 'System', 'system', 1099511627776)
ON CONFLICT (id) DO NOTHING;

-- Seed users matching Keycloak test users
-- User ID ordering: System (001) > Admin (002) > Regular users (003+)
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

-- Sample project owned by System user
INSERT INTO projects (id, organization_id, name, slug, description, visibility, created_by)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Sample Files', 'sample-files', 'Demo project with sample VTK files', 'public', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO project_branches (project_id, name, description, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'main', 'Default branch', 'active')
ON CONFLICT (project_id, name) DO NOTHING;

-- Seed demo room (created by System)
INSERT INTO rooms (id, project_id, name, is_main, room_type, created_by)
VALUES ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Demo Room', NULL, 'breakout', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Add all test users as project members
INSERT INTO project_members (project_id, user_id, role)
VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'admin'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'member'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'member'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'viewer')
ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- Add all test users as organization members
INSERT INTO organization_members (organization_id, user_id, role)
VALUES
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'admin'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'admin'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000003', 'member'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000004', 'member'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000005', 'member')
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- Note: Main room and workspaces are auto-created by triggers when project is inserted

-- ============================================================================
-- DONE
-- ============================================================================
