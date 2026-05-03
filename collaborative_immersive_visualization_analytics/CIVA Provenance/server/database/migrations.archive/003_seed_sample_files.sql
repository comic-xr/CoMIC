-- 003_seed_sample_data.sql
-- Seed data for development and testing

-- ============================================================================
-- SYSTEM ORGANIZATION (For sample files)
-- ============================================================================

INSERT INTO organizations (id, name, slug, storage_quota_bytes, storage_used_bytes)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'System',
    'system',
    1099511627776,  -- 1 TB
    0
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEMO USER
-- ============================================================================

INSERT INTO users (id, external_id, email, display_name)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'demo-user',
    'demo@cia-web.local',
    'Demo User'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEMO PROJECT
-- ============================================================================

INSERT INTO projects (id, organization_id, name, slug, description, visibility, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'Sample Files',
    'sample-files',
    'Demo project with sample VTK files',
    'public',
    '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE FILES (VTP Files from vtp_files directory)
-- ============================================================================

-- Note: These are references to files in the vtp_files directory
-- The actual files need to be migrated to MinIO separately

INSERT INTO datasets (id, organization_id, filename, file_size, file_type, public_path, uploaded_by, status)
VALUES
    (
        '10000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000000',
        'Bones.vtp',
        27272740,
        'vtp',
        '/vtp_files/Bones.vtp',
        'system',
        'active'
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000000',
        'diskout.vtp',
        483237,
        'vtp',
        '/vtp_files/diskout.vtp',
        'system',
        'active'
    ),
    (
        '10000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000000',
        'earth.vtp',
        1233227,
        'vtp',
        '/vtp_files/earth.vtp',
        'system',
        'active'
    ),
    (
        '10000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000000',
        'Lungs.vtp',
        10750132,
        'vtp',
        '/vtp_files/Lungs.vtp',
        'system',
        'active'
    ),
    (
        '10000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000000',
        'LungVessels.vtp',
        28826464,
        'vtp',
        '/vtp_files/LungVessels.vtp',
        'system',
        'active'
    ),
    (
        '10000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000000',
        'Skull.vtp',
        19988316,
        'vtp',
        '/vtp_files/Skull.vtp',
        'system',
        'active'
    ),
    (
        '10000000-0000-0000-0000-000000000007',
        '00000000-0000-0000-0000-000000000000',
        'Ventricles.vtp',
        16487240,
        'vtp',
        '/vtp_files/Ventricles.vtp',
        'system',
        'active'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ADD SAMPLE FILES TO DEMO PROJECT
-- ============================================================================

INSERT INTO file_project_access (file_id, project_id, access_level, visibility, added_by)
SELECT
    id,
    '00000000-0000-0000-0000-000000000001',
    'read',
    'all_members',
    '00000000-0000-0000-0000-000000000001'
FROM datasets
WHERE uploaded_by = 'system'
ON CONFLICT (file_id, project_id) DO NOTHING;

-- ============================================================================
-- MAKE DEMO USER A PROJECT MEMBER
-- ============================================================================

INSERT INTO project_members (project_id, user_id, role)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'admin'
)
ON CONFLICT (project_id, user_id) DO NOTHING;

INSERT INTO organization_members (organization_id, user_id, role)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'admin'
)
ON CONFLICT (organization_id, user_id) DO NOTHING;