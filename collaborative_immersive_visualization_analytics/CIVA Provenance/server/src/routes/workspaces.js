// server/src/routes/workspaces.js
// Workspace management endpoints

const express = require("express");
const router = express.Router();
const { getUserId } = require("../middleware/auth");

// ============================================================================
// WORKSPACE ENDPOINTS
// ============================================================================

/**
 * GET /api/workspaces
 * List workspaces for user
 */
router.get("/", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { type, project_id, room_id } = req.query;
    const { pool } = req.app.locals;

    let query = `
      SELECT DISTINCT w.*,
             (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count,
             (SELECT COUNT(*) FROM canvases WHERE workspace_id = w.id AND is_active = true) as canvas_count,
             (SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) FROM canvases WHERE workspace_id = w.id AND is_active = true) as canvas_ids
      FROM workspaces w
      LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
      LEFT JOIN project_members pm ON w.project_id = pm.project_id AND pm.user_id = $1
      WHERE w.is_archived = false 
        AND (
          w.owner_id = $1 
          OR wm.user_id = $1 
          OR (w.type = 'project' AND pm.user_id IS NOT NULL)
        )
    `;
    const params = [userId];
    let paramIndex = 2;

    if (type) {
      query += ` AND w.type = $${paramIndex++}`;
      params.push(type);
    }

    if (project_id) {
      query += ` AND w.project_id = $${paramIndex++}`;
      params.push(project_id);
    }

    if (room_id) {
      query += ` AND (w.room_id = $${paramIndex++} OR w.room_id IS NULL)`;
      params.push(room_id);
    }

    query += " ORDER BY w.type, w.updated_at DESC";

    const result = await pool.query(query, params);

    res.json({
      workspaces: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workspaces/personal
 * Get or create personal workspace for user
 */
router.get("/personal", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    // Check for existing personal workspace
    let result = await pool.query(
      `SELECT w.*,
              (SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) FROM canvases WHERE workspace_id = w.id AND is_active = true) as canvas_ids
       FROM workspaces w
       WHERE w.type = 'personal' AND w.owner_id = $1 AND w.is_archived = false`,
      [userId]
    );

    if (result.rows.length > 0) {
      return res.json(result.rows[0]);
    }

    // Create personal workspace
    result = await pool.query(
      `INSERT INTO workspaces (name, type, owner_id, created_by)
       VALUES ('My Workspace', 'personal', $1, $1)
       RETURNING *`,
      [userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workspaces/:id
 * Get workspace details
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    const result = await pool.query(
      `SELECT w.*,
              (SELECT json_agg(json_build_object('user_id', wm.user_id, 'permission', wm.permission))
               FROM workspace_members wm WHERE wm.workspace_id = w.id) as members,
              (SELECT COALESCE(array_agg(c.id), ARRAY[]::uuid[]) FROM canvases c WHERE c.workspace_id = w.id AND c.is_active = true) as canvas_ids
       FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE w.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workspaces
 * Create a new workspace
 */
router.post("/", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { pool } = req.app.locals;
    const { name, description, type, project_id, room_id, expires_at, auto_merge } =
      req.body;

    const result = await pool.query(
      `INSERT INTO workspaces (name, description, type, project_id, room_id, owner_id, created_by, expires_at, auto_merge)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8)
       RETURNING *`,
      [
        name || "Untitled Workspace",
        description || "",
        type || "project",
        project_id || null,
        room_id || null,
        userId,
        expires_at || null,
        auto_merge || false,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workspaces/:projectId/breakout
 * Create a breakout from project
 */
router.post("/:projectId/breakout", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;
    const { name, expires_hours = 2 } = req.body;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expires_hours);

    const result = await pool.query(
      `INSERT INTO workspaces (name, type, project_id, owner_id, created_by, expires_at, auto_merge)
       VALUES ($1, 'breakout', $2, $3, $3, $4, true)
       RETURNING *`,
      [name || "Breakout Room", projectId, userId, expiresAt]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/workspaces/:id
 * Update workspace
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const { name, description, room_id, active_canvas_id } = req.body;

    const result = await pool.query(
      `UPDATE workspaces
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           room_id = COALESCE($3, room_id),
           active_canvas_id = COALESCE($4, active_canvas_id),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, description, room_id, active_canvas_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/workspaces/:id
 * Archive workspace
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;

    const result = await pool.query(
      `UPDATE workspaces SET is_archived = true, archived_at = NOW() WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    res.json({ success: true, id });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// MEMBER ENDPOINTS
// ============================================================================

/**
 * POST /api/workspaces/:id/members
 * Add member to workspace
 */
router.post("/:id/members", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const { user_id, permission = "viewer" } = req.body;

    const result = await pool.query(
      `INSERT INTO workspace_members (workspace_id, user_id, permission)
       VALUES ($1, $2, $3)
       ON CONFLICT (workspace_id, user_id) DO UPDATE SET permission = $3
       RETURNING *`,
      [id, user_id, permission]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/workspaces/:id/members/:userId
 * Remove member from workspace
 */
router.delete("/:id/members/:userId", async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const { pool } = req.app.locals;

    await pool.query(
      `DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [id, userId]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
