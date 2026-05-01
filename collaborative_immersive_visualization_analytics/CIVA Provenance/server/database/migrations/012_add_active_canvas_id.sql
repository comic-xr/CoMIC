ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS active_canvas_id UUID REFERENCES canvases(id) ON DELETE SET NULL;

UPDATE workspaces w
SET active_canvas_id = c.id
FROM LATERAL (
  SELECT id
  FROM canvases
  WHERE workspace_id = w.id
  ORDER BY updated_at DESC
  LIMIT 1
) c
WHERE w.active_canvas_id IS NULL
  AND c.id IS NOT NULL;
