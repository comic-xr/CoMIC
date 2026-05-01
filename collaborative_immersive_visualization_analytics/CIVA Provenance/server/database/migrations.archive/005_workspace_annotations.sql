-- 005_workspace_annotations.sql
-- Migration for workspace-level annotations in v2.0 architecture
--
-- BACKGROUND:
-- Dataset annotations (existing) are spatially anchored to data coordinates
-- Workspace annotations are anchored to the workspace grid level and can:
-- - Span multiple datasets/views
-- - Show connections between different views
-- - Include freehand drawings, arrows, and relationship indicators
-- - Reference multiple datasets without being anchored to any single one

-- ============================================================================
-- WORKSPACE ANNOTATIONS TABLE
-- Annotations at the workspace/grid level (not anchored to datasets)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Workspace context
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    view_id UUID REFERENCES view_configurations(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES project_branches(id) ON DELETE SET NULL,

    -- Annotation type and data
    type VARCHAR(50) NOT NULL,  -- 'line', 'arrow', 'freehand', 'rectangle', 'ellipse', 'text', 'connector'

    -- Path/shape data
    -- For lines/arrows: array of points
    -- For freehand: array of points with pressure
    -- For rectangles/ellipses: bounds
    -- For text: position + text content
    -- For connectors: start/end references
    path_data JSONB NOT NULL,

    -- Screen/grid coordinates
    -- These are relative to the workspace grid, not dataset coordinates
    screen_coordinates JSONB NOT NULL,  -- {startX, startY, endX, endY} or array of points

    -- Linked entities (what this annotation connects/references)
    linked_datasets UUID[],  -- Array of dataset IDs this annotation references
    linked_grid_slots VARCHAR(50)[],  -- Array of grid slot identifiers (e.g., 'A1', 'B2')
    linked_view_ids UUID[],  -- Array of view configuration IDs

    -- Style properties
    style JSONB DEFAULT '{
        "strokeColor": "#ffffff",
        "strokeWidth": 2,
        "fillColor": null,
        "opacity": 1.0,
        "lineDash": [],
        "arrowStart": false,
        "arrowEnd": false,
        "fontSize": 14,
        "fontFamily": "sans-serif"
    }',

    -- Content (for text annotations)
    text_content TEXT,
    label VARCHAR(255),  -- Short label for quick identification

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Visibility and permissions
    visibility VARCHAR(50) DEFAULT 'project',  -- 'private', 'project', 'public'
    visibility_users UUID[],  -- For 'private' visibility, which users can see

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Status
    status VARCHAR(50) DEFAULT 'active',  -- 'active', 'archived', 'deleted'
    locked BOOLEAN DEFAULT false,
    z_index INTEGER DEFAULT 0  -- For layering overlapping annotations
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workspace_ann_project ON workspace_annotations(project_id);
CREATE INDEX IF NOT EXISTS idx_workspace_ann_view ON workspace_annotations(view_id);
CREATE INDEX IF NOT EXISTS idx_workspace_ann_branch ON workspace_annotations(branch_id);
CREATE INDEX IF NOT EXISTS idx_workspace_ann_type ON workspace_annotations(type);
CREATE INDEX IF NOT EXISTS idx_workspace_ann_status ON workspace_annotations(status);
CREATE INDEX IF NOT EXISTS idx_workspace_ann_creator ON workspace_annotations(created_by);
CREATE INDEX IF NOT EXISTS idx_workspace_ann_visibility ON workspace_annotations(visibility);

-- GIN index for array columns (for efficient lookups by linked entities)
CREATE INDEX IF NOT EXISTS idx_workspace_ann_linked_datasets ON workspace_annotations USING GIN(linked_datasets);
CREATE INDEX IF NOT EXISTS idx_workspace_ann_linked_views ON workspace_annotations USING GIN(linked_view_ids);

-- ============================================================================
-- WORKSPACE ANNOTATION SNAPSHOTS TABLE
-- For version history of workspace annotation states
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_annotation_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_annotation_id UUID NOT NULL REFERENCES workspace_annotations(id) ON DELETE CASCADE,

    -- Snapshot data (copy of the annotation state at this point)
    snapshot_data JSONB NOT NULL,

    -- Version tracking
    version_number INTEGER NOT NULL,
    change_note TEXT,

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(workspace_annotation_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_ws_ann_snapshots_annotation ON workspace_annotation_snapshots(workspace_annotation_id);
CREATE INDEX IF NOT EXISTS idx_ws_ann_snapshots_version ON workspace_annotation_snapshots(version_number DESC);

-- ============================================================================
-- CONNECTOR ENDPOINTS TABLE
-- For annotations that connect specific points on views/datasets
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_annotation_connectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_annotation_id UUID NOT NULL REFERENCES workspace_annotations(id) ON DELETE CASCADE,

    -- Endpoint type: 'start' or 'end'
    endpoint_type VARCHAR(10) NOT NULL CHECK (endpoint_type IN ('start', 'end')),

    -- What this endpoint connects to
    target_type VARCHAR(50) NOT NULL,  -- 'view', 'dataset', 'annotation', 'grid_slot'
    target_id UUID,  -- ID of the target entity
    target_grid_slot VARCHAR(50),  -- Grid slot identifier (e.g., 'A1')

    -- Position within the target (relative coordinates)
    anchor_position JSONB,  -- {x, y} relative to target bounds (0-1 normalized)

    -- Offset from anchor (for fine-tuning)
    offset JSONB DEFAULT '{"x": 0, "y": 0}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connectors_annotation ON workspace_annotation_connectors(workspace_annotation_id);
CREATE INDEX IF NOT EXISTS idx_connectors_target ON workspace_annotation_connectors(target_type, target_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create workspace annotation with automatic snapshot
CREATE OR REPLACE FUNCTION create_workspace_annotation(
    p_project_id UUID,
    p_view_id UUID,
    p_type VARCHAR(50),
    p_path_data JSONB,
    p_screen_coordinates JSONB,
    p_created_by UUID,
    p_style JSONB DEFAULT NULL,
    p_text_content TEXT DEFAULT NULL,
    p_linked_datasets UUID[] DEFAULT NULL,
    p_linked_view_ids UUID[] DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_annotation_id UUID;
BEGIN
    INSERT INTO workspace_annotations (
        project_id, view_id, type, path_data, screen_coordinates,
        created_by, style, text_content, linked_datasets, linked_view_ids
    )
    VALUES (
        p_project_id, p_view_id, p_type, p_path_data, p_screen_coordinates,
        p_created_by,
        COALESCE(p_style, '{}'::JSONB),
        p_text_content,
        p_linked_datasets,
        p_linked_view_ids
    )
    RETURNING id INTO v_annotation_id;

    -- Create initial snapshot
    INSERT INTO workspace_annotation_snapshots (
        workspace_annotation_id, version_number, snapshot_data, created_by, change_note
    )
    SELECT
        v_annotation_id,
        1,
        row_to_json(wa)::JSONB,
        p_created_by,
        'Initial creation'
    FROM workspace_annotations wa
    WHERE wa.id = v_annotation_id;

    RETURN v_annotation_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update workspace annotation with automatic snapshot
CREATE OR REPLACE FUNCTION update_workspace_annotation(
    p_annotation_id UUID,
    p_updates JSONB,
    p_updated_by UUID,
    p_change_note TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_next_version INTEGER;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
    FROM workspace_annotation_snapshots
    WHERE workspace_annotation_id = p_annotation_id;

    -- Update the annotation (dynamic JSONB merge)
    UPDATE workspace_annotations
    SET
        path_data = COALESCE(p_updates->>'path_data', path_data::TEXT)::JSONB,
        screen_coordinates = COALESCE(p_updates->>'screen_coordinates', screen_coordinates::TEXT)::JSONB,
        style = COALESCE(p_updates->'style', style),
        text_content = COALESCE(p_updates->>'text_content', text_content),
        label = COALESCE(p_updates->>'label', label),
        updated_by = p_updated_by,
        updated_at = NOW()
    WHERE id = p_annotation_id;

    -- Create new snapshot
    INSERT INTO workspace_annotation_snapshots (
        workspace_annotation_id, version_number, snapshot_data, created_by, change_note
    )
    SELECT
        p_annotation_id,
        v_next_version,
        row_to_json(wa)::JSONB,
        p_updated_by,
        p_change_note
    FROM workspace_annotations wa
    WHERE wa.id = p_annotation_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE workspace_annotations IS 'Annotations at the workspace/grid level that can span multiple datasets and views';
COMMENT ON TABLE workspace_annotation_snapshots IS 'Version history for workspace annotations';
COMMENT ON TABLE workspace_annotation_connectors IS 'Endpoints for connector-type annotations that link different elements';

COMMENT ON COLUMN workspace_annotations.type IS 'line, arrow, freehand, rectangle, ellipse, text, connector';
COMMENT ON COLUMN workspace_annotations.path_data IS 'Shape data as JSONB - format depends on type';
COMMENT ON COLUMN workspace_annotations.screen_coordinates IS 'Position relative to workspace grid, not data coordinates';
COMMENT ON COLUMN workspace_annotations.linked_datasets IS 'Array of dataset UUIDs this annotation references';
COMMENT ON COLUMN workspace_annotations.linked_grid_slots IS 'Array of grid slot identifiers (A1, B2, etc.)';
COMMENT ON COLUMN workspace_annotations.z_index IS 'Layering order for overlapping annotations';