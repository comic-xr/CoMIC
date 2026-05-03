-- Migration: ViewGroup Links System
-- Date: 2026-01-25
-- Description: Two-layer link system for ViewGroups
--   - view_links: View-to-View links (foundation layer)
--   - view_group_links: ViewGroup-to-ViewGroup links (convenience layer)
--   - view_activity: Activity tracking for reconciliation

-- ============================================================================
-- VIEW-TO-VIEW LINKS TABLE (Foundation Layer)
-- ============================================================================

CREATE TABLE IF NOT EXISTS view_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_view_id UUID NOT NULL REFERENCES view_configurations(id) ON DELETE CASCADE,
    target_view_id UUID NOT NULL REFERENCES view_configurations(id) ON DELETE CASCADE,
    property VARCHAR(50) NOT NULL,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('follow', 'sync', 'broadcast')),
    active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Pause state (for VG link override)
    paused_by_vg_link UUID,  -- Reference to view_group_links.id - set NULL on delete

    -- Reconciliation tracking (for unidirectional followers)
    follower_last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    follower_diverged_at TIMESTAMPTZ,
    leader_state_hash VARCHAR(16),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Prevent duplicate links
    UNIQUE(source_view_id, target_view_id, property)
);

-- Indexes for view_links
CREATE INDEX IF NOT EXISTS idx_view_links_source ON view_links(source_view_id);
CREATE INDEX IF NOT EXISTS idx_view_links_target ON view_links(target_view_id);
CREATE INDEX IF NOT EXISTS idx_view_links_paused ON view_links(paused_by_vg_link) WHERE paused_by_vg_link IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_view_links_property ON view_links(property);

-- ============================================================================
-- VIEWGROUP-TO-VIEWGROUP LINKS TABLE (Convenience Layer)
-- Follows Originator Principle: originator's links get paused
-- ============================================================================

CREATE TABLE IF NOT EXISTS view_group_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Indexes for view_group_links
CREATE INDEX IF NOT EXISTS idx_vg_links_originator ON view_group_links(originator_group_id);
CREATE INDEX IF NOT EXISTS idx_vg_links_target ON view_group_links(target_group_id);

-- Add foreign key from view_links to view_group_links (deferred to avoid circular dependency)
ALTER TABLE view_links
    DROP CONSTRAINT IF EXISTS view_links_paused_by_vg_link_fkey;
ALTER TABLE view_links
    ADD CONSTRAINT view_links_paused_by_vg_link_fkey
    FOREIGN KEY (paused_by_vg_link) REFERENCES view_group_links(id) ON DELETE SET NULL;

-- ============================================================================
-- VIEW ACTIVITY TABLE (for reconciliation)
-- Tracks when users are actively interacting with views
-- ============================================================================

CREATE TABLE IF NOT EXISTS view_activity (
    view_id UUID NOT NULL REFERENCES view_configurations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    inactive_at TIMESTAMPTZ,

    PRIMARY KEY (view_id, user_id, active_at)
);

-- Index for finding currently active views
CREATE INDEX IF NOT EXISTS idx_view_activity_active ON view_activity(view_id, user_id)
    WHERE inactive_at IS NULL;

-- ============================================================================
-- VIEWGROUPS TABLE UPDATES
-- Add view_group_id column to view_configurations if not exists
-- ============================================================================

-- Ensure viewgroups has is_explicit column
ALTER TABLE viewgroups ADD COLUMN IF NOT EXISTS is_explicit BOOLEAN DEFAULT true;

-- Ensure view_configurations has view_group_id column
ALTER TABLE view_configurations ADD COLUMN IF NOT EXISTS view_group_id UUID REFERENCES viewgroups(id) ON DELETE SET NULL;

-- Index for view_configurations by view_group_id
CREATE INDEX IF NOT EXISTS idx_view_configs_group ON view_configurations(view_group_id)
    WHERE view_group_id IS NOT NULL;

-- ============================================================================
-- MIGRATION COMMENT
-- ============================================================================

COMMENT ON TABLE view_links IS 'Foundation layer: View-to-View links for property synchronization';
COMMENT ON TABLE view_group_links IS 'Convenience layer: ViewGroup-to-ViewGroup links with Originator Principle';
COMMENT ON TABLE view_activity IS 'Activity tracking for reconciliation of unidirectional followers';
COMMENT ON COLUMN view_links.paused_by_vg_link IS 'ID of VG link that paused this link (Originator Principle)';
COMMENT ON COLUMN view_group_links.originator_group_id IS 'Group that initiated link - their incoming follow links get paused';
