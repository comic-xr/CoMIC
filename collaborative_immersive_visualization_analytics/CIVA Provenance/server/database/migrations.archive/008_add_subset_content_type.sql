-- Migration: Add 'subset' to placements content_type constraint
-- This allows subsets to be placed on the canvas as first-class citizens

-- Drop the old constraint
ALTER TABLE placements DROP CONSTRAINT IF EXISTS placements_content_type_check;

-- Add the new constraint with 'subset' included
ALTER TABLE placements ADD CONSTRAINT placements_content_type_check
    CHECK (content_type IN ('view', 'note', 'image', 'subset', 'empty'));
