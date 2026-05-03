-- 001_initial_schema.sql
-- Initial database schema for CIA Web

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DATASETS TABLE (Layer 1: Physical Files)
-- ============================================================================

CREATE TABLE IF NOT EXISTS datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID,  -- Will be FK after organizations table is created

    -- File identification
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50),  -- 'vtp', 'vti', 'csv', etc.
    hash VARCHAR(64),  -- SHA-256 for deduplication

    -- Storage
    storage_key VARCHAR(500),  -- MinIO object key
    public_path VARCHAR(500),  -- For sample/public files

    -- Metadata (VTK-specific, but can be extended for other types)
    point_count BIGINT,
    cell_count BIGINT,
    bounds JSONB,  -- {xMin, xMax, yMin, yMax, zMin, zMax}
    data_arrays JSONB,  -- Array of {name, type, numberOfComponents, range}

    -- Audit
    uploaded_at TIMESTAMP DEFAULT NOW(),
    uploaded_by VARCHAR(255),  -- User ID or 'system' for samples
    last_accessed_at TIMESTAMP,
    access_count INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(50) DEFAULT 'active',  -- 'active', 'archived', 'deleted'

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_datasets_org ON datasets(organization_id);
CREATE INDEX idx_datasets_hash ON datasets(hash);
CREATE INDEX idx_datasets_type ON datasets(file_type);
CREATE INDEX idx_datasets_status ON datasets(status);

-- ============================================================================
-- VIEW CONFIGURATIONS TABLE (Layer 2: Snapshots)
-- ============================================================================

CREATE TABLE IF NOT EXISTS view_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,

    -- View identification
    name VARCHAR(255) DEFAULT 'Untitled View',
    description TEXT,

    -- View state (snapshot in time)
    camera JSONB,  -- Camera position, orientation, focal point
    filters JSONB,  -- Array of filter configurations
    widgets JSONB,  -- Widget states (sliders, clipping planes, etc.)
    color_maps JSONB,  -- Color mapping configurations
    annotations_visible BOOLEAN DEFAULT true,

    -- Instance tracking (how many active instances exist)
    active_instance_count INTEGER DEFAULT 0,
    last_active_timestamp TIMESTAMP,

    -- Lifecycle
    status VARCHAR(50) DEFAULT 'active',  -- 'active', 'inactive', 'archived'
    saved_by_user BOOLEAN DEFAULT false,

    -- User/collaboration
    owner_user_id VARCHAR(255),
    shared_with JSONB,  -- Array of user IDs

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_views_dataset ON view_configurations(dataset_id);
CREATE INDEX idx_views_owner ON view_configurations(owner_user_id);
CREATE INDEX idx_views_status ON view_configurations(status);

-- ============================================================================
-- ANNOTATIONS TABLE (Linked to Datasets)
-- ============================================================================

CREATE TABLE IF NOT EXISTS annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,

    -- Annotation data
    type VARCHAR(50) NOT NULL,  -- 'point', 'line', 'polygon', 'text', 'measurement'
    coordinates JSONB NOT NULL,  -- 3D coordinates
    properties JSONB,  -- Additional properties (color, text, measurements, etc.)

    -- User/collaboration
    created_by VARCHAR(255),
    edited_by VARCHAR(255),

    -- Status
    visible BOOLEAN DEFAULT true,
    locked BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_annotations_dataset ON annotations(dataset_id);
CREATE INDEX idx_annotations_type ON annotations(type);
CREATE INDEX idx_annotations_creator ON annotations(created_by);