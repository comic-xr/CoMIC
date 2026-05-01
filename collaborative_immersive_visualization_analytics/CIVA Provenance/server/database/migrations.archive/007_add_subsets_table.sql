-- Migration: Add subsets table for focus groups
-- Run this if the subsets table doesn't exist

-- Create the subsets table if it doesn't exist
CREATE TABLE IF NOT EXISTS subsets (
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_subsets_canvas ON subsets(canvas_id);
CREATE INDEX IF NOT EXISTS idx_subsets_project ON subsets(project_id);
CREATE INDEX IF NOT EXISTS idx_subsets_visibility ON subsets(visibility);

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_subsets_updated_at'
    ) THEN
        CREATE TRIGGER update_subsets_updated_at
            BEFORE UPDATE ON subsets
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;
