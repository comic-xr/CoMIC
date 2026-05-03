-- Fix duplicate main rooms in the seed project
-- This script identifies and removes duplicate main rooms, keeping only one per project

-- First, let's see what we have
SELECT
    r.id,
    r.project_id,
    r.name,
    r.room_type,
    r.is_main,
    r.created_at
FROM rooms r
WHERE r.room_type = 'main'
ORDER BY r.project_id, r.created_at;

-- For each project with multiple main rooms, keep the oldest one and delete the rest
WITH ranked_main_rooms AS (
    SELECT
        id,
        project_id,
        ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at ASC) as rn
    FROM rooms
    WHERE room_type = 'main'
)
DELETE FROM rooms
WHERE id IN (
    SELECT id
    FROM ranked_main_rooms
    WHERE rn > 1
);

-- Verify the fix
SELECT
    r.project_id,
    COUNT(*) as main_room_count
FROM rooms r
WHERE r.room_type = 'main'
GROUP BY r.project_id
HAVING COUNT(*) > 1;

-- Should return 0 rows if successful
