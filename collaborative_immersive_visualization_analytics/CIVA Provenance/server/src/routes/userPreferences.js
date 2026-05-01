/**
 * @file userPreferences.js
 * @description API routes for user workspace preferences
 *
 * Stores per-user, per-project preferences like:
 * - View mode (tabs/tile)
 * - Open workspace IDs
 * - Active workspace ID
 * - Window positions (for floating mode)
 * - Viewport positions per canvas
 *
 * Uses the `preferences` JSONB column on the users table.
 */

const express = require("express");
const router = express.Router();
const { getUserId } = require("../middleware/auth");

/**
 * GET /api/users/preferences/:projectId
 * Get user's workspace preferences for a project
 */
router.get("/:projectId", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { projectId } = req.params;
    const { pool } = req.app.locals;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await pool.query(
      `SELECT preferences FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const preferences = result.rows[0].preferences || {};
    const projectPreferences = preferences.projects?.[projectId] || {};

    res.json({
      projectId,
      preferences: projectPreferences,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/preferences/:projectId
 * Update user's workspace preferences for a project
 *
 * Body: {
 *   viewMode: 'tabs' | 'tile',
 *   openWorkspaceIds: string[],
 *   activeWorkspaceId: string | null,
 *   windowPositions: { [workspaceId]: { x, y, width, height } },
 *   viewportPositions: { [canvasId]: { row, col } },
 *   workspaceOrder: string[],
 * }
 */
router.put("/:projectId", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { projectId } = req.params;
    const newPreferences = req.body;
    const { pool } = req.app.locals;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate input is an object
    if (!newPreferences || typeof newPreferences !== "object") {
      return res.status(400).json({ error: "Invalid preferences format" });
    }

    // Update preferences using jsonb_set to merge with existing
    // This preserves other project preferences while updating this one
    const result = await pool.query(
      `UPDATE users
       SET preferences = jsonb_set(
         COALESCE(preferences, '{}'::jsonb),
         ARRAY['projects', $1],
         $2::jsonb,
         true
       ),
       updated_at = NOW()
       WHERE id = $3
       RETURNING preferences`,
      [projectId, JSON.stringify(newPreferences), userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const preferences = result.rows[0].preferences || {};
    const projectPreferences = preferences.projects?.[projectId] || {};

    res.json({
      projectId,
      preferences: projectPreferences,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/users/preferences/:projectId
 * Partially update user's workspace preferences
 * Only updates the fields provided, preserves others
 */
router.patch("/:projectId", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { projectId } = req.params;
    const updates = req.body;
    const { pool } = req.app.locals;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get existing preferences
    const existing = await pool.query(
      `SELECT preferences FROM users WHERE id = $1`,
      [userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const preferences = existing.rows[0].preferences || {};
    const projectPreferences = preferences.projects?.[projectId] || {};

    // Merge updates with existing
    const mergedPreferences = {
      ...projectPreferences,
      ...updates,
      // Deep merge windowPositions if provided
      windowPositions: updates.windowPositions
        ? { ...projectPreferences.windowPositions, ...updates.windowPositions }
        : projectPreferences.windowPositions,
      // Deep merge viewportPositions if provided
      viewportPositions: updates.viewportPositions
        ? { ...projectPreferences.viewportPositions, ...updates.viewportPositions }
        : projectPreferences.viewportPositions,
    };

    // Save merged preferences
    const result = await pool.query(
      `UPDATE users
       SET preferences = jsonb_set(
         COALESCE(preferences, '{}'::jsonb),
         ARRAY['projects', $1],
         $2::jsonb,
         true
       ),
       updated_at = NOW()
       WHERE id = $3
       RETURNING preferences`,
      [projectId, JSON.stringify(mergedPreferences), userId]
    );

    res.json({
      projectId,
      preferences: result.rows[0].preferences?.projects?.[projectId] || {},
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/users/preferences/:projectId
 * Clear user's workspace preferences for a project
 */
router.delete("/:projectId", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { projectId } = req.params;
    const { pool } = req.app.locals;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Remove the project preferences by setting to null
    const result = await pool.query(
      `UPDATE users
       SET preferences = preferences #- ARRAY['projects', $1],
       updated_at = NOW()
       WHERE id = $2
       RETURNING preferences`,
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, projectId });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
