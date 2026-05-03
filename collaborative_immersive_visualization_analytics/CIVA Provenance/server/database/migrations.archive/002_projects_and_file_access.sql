-- 002_projects_and_file_access.sql
-- Projects, Organizations, and File Access Management

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,

    -- Storage management
    storage_quota_bytes BIGINT DEFAULT 107374182400,  -- 100 GB default
    storage_used_bytes BIGINT DEFAULT 0,

    -- Settings
    settings JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE,  -- From auth provider (Auth0, Keycloak, etc.)

    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    avatar_url VARCHAR(500),

    -- User preferences
    preferences JSONB DEFAULT '{}',

    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_external_id ON users(external_id);

-- ============================================================================
-- ORGANIZATION MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_members (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    role VARCHAR(50) NOT NULL DEFAULT 'member',  -- 'owner', 'admin', 'member', 'viewer'

    joined_at TIMESTAMP DEFAULT NOW(),

    PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- ============================================================================
-- PROJECTS TABLE (Replaces "sessions" concept)
-- ============================================================================

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,

    -- Project hierarchy (for branching/forking)
    parent_project_id UUID REFERENCES projects(id),

    -- Access control
    visibility VARCHAR(50) DEFAULT 'private',  -- 'private', 'organization', 'public'

    -- Status
    status VARCHAR(50) DEFAULT 'active',  -- 'active', 'archived', 'merged'

    -- Metadata
    settings JSONB DEFAULT '{}',

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_creator ON projects(created_by);
CREATE INDEX idx_projects_parent ON projects(parent_project_id);
CREATE INDEX idx_projects_status ON projects(status);

-- ============================================================================
-- PROJECT MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_members (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    role VARCHAR(50) NOT NULL DEFAULT 'viewer',  -- 'owner', 'admin', 'editor', 'commenter', 'viewer'

    -- Fine-grained permissions override
    permissions JSONB,  -- {canEdit: true, canComment: true, canShare: false, etc.}

    joined_at TIMESTAMP DEFAULT NOW(),

    PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_members_user ON project_members(user_id);

-- ============================================================================
-- FILE PROJECT ACCESS TABLE (Junction)
-- ============================================================================

CREATE TABLE IF NOT EXISTS file_project_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Access level for this file in this project
    access_level VARCHAR(50) DEFAULT 'read',  -- 'read', 'annotate', 'admin'

    -- Visibility within the project
    visibility VARCHAR(50) DEFAULT 'all_members',  -- 'all_members', 'admins_only', 'specific_users'
    visible_to_users UUID[],  -- Array of user IDs if visibility = 'specific_users'

    added_at TIMESTAMP DEFAULT NOW(),
    added_by UUID REFERENCES users(id),

    UNIQUE(file_id, project_id)
);

CREATE INDEX idx_file_access_file ON file_project_access(file_id);
CREATE INDEX idx_file_access_project ON file_project_access(project_id);

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Timestamp
    timestamp TIMESTAMP DEFAULT NOW(),

    -- User
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255),

    -- Context
    organization_id UUID REFERENCES organizations(id),
    project_id UUID REFERENCES projects(id),
    room_id VARCHAR(255),  -- For Y.js collaboration rooms

    -- Action
    action VARCHAR(100) NOT NULL,  -- 'file.uploaded', 'project.created', 'view.shared', etc.
    entity_type VARCHAR(50),  -- 'file', 'project', 'view', 'annotation', etc.
    entity_id UUID,

    -- Details
    details JSONB,

    -- Request info
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_org ON audit_log(organization_id);
CREATE INDEX idx_audit_project ON audit_log(project_id);
CREATE INDEX idx_audit_action ON audit_log(action);

-- ============================================================================
-- ADD FOREIGN KEY TO DATASETS
-- ============================================================================

ALTER TABLE datasets
    ADD CONSTRAINT fk_datasets_organization
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id) ON DELETE CASCADE;