-- 006_canvas_layout_modes.sql
-- Add layout configuration fields to canvases table
-- For the unified infinite canvas system with Flow and Grid layout modes

-- Add layout_mode column (grid or flow)
ALTER TABLE canvases
ADD COLUMN IF NOT EXISTS layout_mode VARCHAR(20) NOT NULL DEFAULT 'grid'
CHECK (layout_mode IN ('grid', 'flow'));

-- Add flow_direction column (row or column)
ALTER TABLE canvases
ADD COLUMN IF NOT EXISTS flow_direction VARCHAR(20) NOT NULL DEFAULT 'row'
CHECK (flow_direction IN ('row', 'column'));

-- Add homepoint column for navigation bookmark
ALTER TABLE canvases
ADD COLUMN IF NOT EXISTS homepoint JSONB;

-- Add index on layout_mode for filtering
CREATE INDEX IF NOT EXISTS idx_canvases_layout_mode ON canvases(layout_mode);

-- Update schema version
UPDATE server_instance SET
    last_migration = '006_canvas_layout_modes',
    notes = 'Added layout_mode, flow_direction, homepoint to canvases'
WHERE id = 1;