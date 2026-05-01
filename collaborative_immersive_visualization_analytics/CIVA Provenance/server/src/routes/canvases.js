// server/src/routes/canvases.js
// Canvas and placement management endpoints

const express = require("express");
const router = express.Router();
const { getUserId } = require("../middleware/auth");

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate if a string is a valid UUID
 * @param {string} str - String to validate
 * @returns {boolean}
 */
function isValidUUID(str) {
  return typeof str === "string" && UUID_REGEX.test(str);
}

async function getWorkspaceAccess(pool, workspaceId, userId) {
  const result = await pool.query(
    `SELECT w.id, w.project_id
     FROM workspaces w
     LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
     WHERE w.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
    [workspaceId, userId]
  );
  return result.rows[0] || null;
}

async function getCanvasAccess(pool, canvasId, userId) {
  const result = await pool.query(
    `SELECT c.id, c.project_id, c.workspace_id
     FROM canvases c
     JOIN workspaces w ON c.workspace_id = w.id
     LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
     WHERE c.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
    [canvasId, userId]
  );
  return result.rows[0] || null;
}

// ============================================================================
// CANVAS ENDPOINTS
// ============================================================================

/**
 * GET /api/canvases
 * List canvases for a workspace
 */
router.get("/", async (req, res, next) => {
  try {
    const { workspace_id, project_id } = req.query;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    let query = `
      SELECT c.*, w.name as workspace_name
      FROM canvases c
      JOIN workspaces w ON c.workspace_id = w.id
      LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE c.is_active = true
    `;
    const params = [];
    let paramIndex = 1;

    if (workspace_id) {
      query += ` AND c.workspace_id = $${paramIndex++}`;
      params.push(workspace_id);
    }

    if (project_id) {
      query += ` AND c.project_id = $${paramIndex++}`;
      params.push(project_id);
    }

    // Check user has access
    query += ` AND (w.owner_id = $${paramIndex} OR wm.user_id = $${paramIndex})`;
    params.push(userId);

    query += " ORDER BY c.updated_at DESC";

    const result = await pool.query(query, params);

    res.json({
      canvases: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/canvases/:id
 * Get canvas with placements
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    // Validate UUID format to prevent database errors
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "Invalid canvas ID format" });
    }

    // Get canvas
    const canvasResult = await pool.query(
      `SELECT c.*, w.name as workspace_name
       FROM canvases c
       JOIN workspaces w ON c.workspace_id = w.id
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE c.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
      [id, userId]
    );

    if (canvasResult.rows.length === 0) {
      return res.status(404).json({ error: "Canvas not found" });
    }

    // Get placements (simple query - no validation for now)
    const placementsResult = await pool.query(
      `SELECT * FROM placements WHERE canvas_id = $1 ORDER BY row_index, col_index`,
      [id]
    );

    res.json({
      ...canvasResult.rows[0],
      placements: placementsResult.rows,
    });
  } catch (error) {
    console.error("[canvases] GET /:id error:", error);
    next(error);
  }
});

/**
 * POST /api/canvases
 * Create a new canvas
 */
router.post("/", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { pool, wsManager } = req.app.locals;
    const {
      workspace_id,
      project_id,
      name,
      dimensions,
      ownership,
      layout_mode,
      flow_direction,
    } = req.body;

    if (!workspace_id) {
      return res.status(400).json({ error: "workspace_id is required" });
    }

    const workspaceAccess = await getWorkspaceAccess(
      pool,
      workspace_id,
      userId
    );
    if (!workspaceAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Handle both old and new schema
    let result;
    try {
      console.log("[DEBUG] canvases.js: Inserting canvas with new schema");
      // Try with new schema (layout_mode, flow_direction)
      result = await pool.query(
        `INSERT INTO canvases (
          workspace_id, project_id, name, dimensions, ownership,
          layout_mode, flow_direction, created_by
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          workspace_id,
          project_id || null,
          name || "Untitled Canvas",
          JSON.stringify(dimensions || { rows: 3, cols: 3 }),
          JSON.stringify(ownership || { type: "personal", ownerId: userId }),
          layout_mode || "grid",
          flow_direction || "row",
          userId,
        ]
      );
    } catch (insertError) {
      console.log("[DEBUG] canvases.js: Insert error:", insertError.message);
      // Fallback for old schema (without layout_mode, flow_direction)
      if (
        insertError.message.includes("layout_mode") ||
        insertError.message.includes("flow_direction") ||
        insertError.message.includes("column")
      ) {
        console.log("[DEBUG] canvases.js: Falling back to old schema");
        result = await pool.query(
          `INSERT INTO canvases (workspace_id, project_id, name, dimensions, ownership, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            workspace_id,
            project_id || null,
            name || "Untitled Canvas",
            JSON.stringify(dimensions || { rows: 3, cols: 3 }),
            JSON.stringify(ownership || { type: "personal", ownerId: userId }),
            userId,
          ]
        );
      } else {
        throw insertError;
      }
    }

    const canvas = result.rows[0];

    // Broadcast to project
    if (project_id && wsManager) {
      wsManager.broadcast(project_id, {
        type: "canvas:created",
        canvasId: canvas.id,
        canvas,
        userId,
      });
    }

    res.status(201).json(canvas);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/canvases/:id
 * Update canvas
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { pool, wsManager } = req.app.locals;
    const {
      name,
      dimensions,
      viewport,
      layout_mode,
      flow_direction,
      homepoint,
    } = req.body;

    const canvasAccess = await getCanvasAccess(pool, id, userId);
    if (!canvasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await pool.query(
      `UPDATE canvases
       SET name = COALESCE($1, name),
           dimensions = COALESCE($2, dimensions),
           viewport = COALESCE($3, viewport),
           layout_mode = COALESCE($4, layout_mode),
           flow_direction = COALESCE($5, flow_direction),
           homepoint = COALESCE($6, homepoint),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        name,
        dimensions ? JSON.stringify(dimensions) : null,
        viewport ? JSON.stringify(viewport) : null,
        layout_mode,
        flow_direction,
        homepoint ? JSON.stringify(homepoint) : null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Canvas not found" });
    }

    const canvas = result.rows[0];

    // Broadcast to project
    if (canvas.project_id && wsManager) {
      wsManager.broadcast(canvas.project_id, {
        type: "canvas:updated",
        canvasId: canvas.id,
        canvas,
        updates: {
          name,
          dimensions,
          viewport,
          layout_mode,
          flow_direction,
          homepoint,
        },
        userId,
      });
    }

    res.json(canvas);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/canvases/:id
 * Delete canvas (soft delete)
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { pool, wsManager } = req.app.locals;

    const canvasAccess = await getCanvasAccess(pool, id, userId);
    if (!canvasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    // First get canvas to find project_id for broadcast
    const canvasResult = await pool.query(
      `SELECT project_id FROM canvases WHERE id = $1`,
      [id]
    );

    const result = await pool.query(
      `UPDATE canvases SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Canvas not found" });
    }

    // Broadcast to project
    const projectId = canvasResult.rows[0]?.project_id;
    if (projectId && wsManager) {
      wsManager.broadcast(projectId, {
        type: "canvas:deleted",
        canvasId: id,
        userId,
      });
    }

    res.json({ success: true, id });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PLACEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/canvases/:id/placements
 * Get placements for a canvas
 */
router.get("/:id/placements", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;

    const result = await pool.query(
      `SELECT * FROM placements WHERE canvas_id = $1 ORDER BY row_index, col_index`,
      [id]
    );

    res.json({
      placements: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/canvases/:id/placements
 * Add a placement to canvas
 */
router.post("/:id/placements", async (req, res, next) => {
  try {
    const { id: canvas_id } = req.params;
    const userId = getUserId(req);
    const { pool, wsManager } = req.app.locals;

    // Accept both camelCase (client) and snake_case (database)
    const {
      row_index,
      row,
      col_index,
      col,
      row_span,
      rowSpan,
      col_span,
      colSpan,
      content_type,
      content,
      content_id,
    } = req.body;

    // Resolve content from either format
    let resolvedContentType = content_type || "empty";
    let resolvedContentId = content_id || null;

    if (content) {
      resolvedContentType = content.type || "view";
      resolvedContentId =
        content.viewConfigurationId ||
        content.notesBlockId ||
        content.imageBlockId ||
        content.subsetId ||
        content.id ||
        null;
    }

    // Normalize content_type to match database constraint
    // Client may send 'notes' but DB expects 'note'
    if (resolvedContentType === "notes") {
      resolvedContentType = "note";
    }

    const canvasAccess = await getCanvasAccess(pool, canvas_id, userId);
    if (!canvasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    // =========================================================================
    // VALIDATION: Ensure referenced content exists
    // =========================================================================
    if (resolvedContentType === "view" && resolvedContentId) {
      const viewCheck = await pool.query(
        `SELECT id FROM view_configurations WHERE id = $1`,
        [resolvedContentId]
      );

      if (viewCheck.rows.length === 0) {
        console.warn(
          `[canvases] Rejected placement: view ${resolvedContentId} does not exist`
        );
        return res.status(400).json({
          error: "InvalidReference",
          message: `View configuration ${resolvedContentId} does not exist`,
          code: "VIEW_NOT_FOUND",
        });
      }
    }

    // Add similar checks for notes and images if needed
    if (resolvedContentType === "note" && resolvedContentId) {
      const noteCheck = await pool.query(`SELECT id FROM notes WHERE id = $1`, [
        resolvedContentId,
      ]);

      if (noteCheck.rows.length === 0) {
        return res.status(400).json({
          error: "InvalidReference",
          message: `Note ${resolvedContentId} does not exist`,
          code: "NOTE_NOT_FOUND",
        });
      }
    }

    if (resolvedContentType === "subset" && resolvedContentId) {
      const subsetCheck = await pool.query(
        `SELECT id FROM subsets WHERE id = $1`,
        [resolvedContentId]
      );

      if (subsetCheck.rows.length === 0) {
        return res.status(400).json({
          error: "InvalidReference",
          message: `Subset ${resolvedContentId} does not exist`,
          code: "SUBSET_NOT_FOUND",
        });
      }
    }

    if (resolvedContentType === "image" && resolvedContentId) {
      const imageCheck = await pool.query(
        `SELECT id FROM images WHERE id = $1`,
        [resolvedContentId]
      );

      if (imageCheck.rows.length === 0) {
        return res.status(400).json({
          error: "InvalidReference",
          message: `Image ${resolvedContentId} does not exist`,
          code: "IMAGE_NOT_FOUND",
        });
      }
    }
    // =========================================================================

    const result = await pool.query(
      `INSERT INTO placements (canvas_id, row_index, col_index, row_span, col_span, content_type, content_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        canvas_id,
        row_index ?? row ?? 0,
        col_index ?? col ?? 0,
        row_span ?? rowSpan ?? 1,
        col_span ?? colSpan ?? 1,
        resolvedContentType,
        resolvedContentId,
        userId,
      ]
    );

    const placement = result.rows[0];

    // Get project_id from canvas for broadcast
    const canvasResult = await pool.query(
      `SELECT project_id FROM canvases WHERE id = $1`,
      [canvas_id]
    );
    const projectId = canvasResult.rows[0]?.project_id;

    // Broadcast to project
    if (projectId && wsManager) {
      wsManager.broadcast(projectId, {
        type: "placement:added",
        canvasId: canvas_id,
        placement,
        userId,
      });
    }

    res.status(201).json(placement);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/placements/:id
 * Update a placement (move, resize)
 */
router.put("/placements/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { pool, wsManager } = req.app.locals;
    const {
      row_index,
      col_index,
      row_span,
      col_span,
      content_type,
      content_id,
    } = req.body;

    const placementCheck = await pool.query(
      `SELECT canvas_id FROM placements WHERE id = $1`,
      [id]
    );
    if (placementCheck.rows.length === 0) {
      return res.status(404).json({ error: "Placement not found" });
    }

    const canvasAccess = await getCanvasAccess(
      pool,
      placementCheck.rows[0].canvas_id,
      userId
    );
    if (!canvasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await pool.query(
      `UPDATE placements
       SET row_index = COALESCE($1, row_index),
           col_index = COALESCE($2, col_index),
           row_span = COALESCE($3, row_span),
           col_span = COALESCE($4, col_span),
           content_type = COALESCE($5, content_type),
           content_id = COALESCE($6, content_id),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [row_index, col_index, row_span, col_span, content_type, content_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Placement not found" });
    }

    const placement = result.rows[0];

    // Get project_id from canvas for broadcast
    const canvasResult = await pool.query(
      `SELECT project_id FROM canvases WHERE id = $1`,
      [placement.canvas_id]
    );
    const projectId = canvasResult.rows[0]?.project_id;

    // Broadcast to project
    if (projectId && wsManager) {
      wsManager.broadcast(projectId, {
        type: "placement:updated",
        canvasId: placement.canvas_id,
        placement,
        userId,
      });
    }

    res.json(placement);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/placements/:id
 * Delete a placement
 */
router.delete("/placements/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { pool, wsManager } = req.app.locals;

    // First get the placement to find canvas_id
    const placementResult = await pool.query(
      `SELECT canvas_id FROM placements WHERE id = $1`,
      [id]
    );

    if (placementResult.rows.length === 0) {
      return res.status(404).json({ error: "Placement not found" });
    }

    const canvasId = placementResult.rows[0].canvas_id;

    const canvasAccess = await getCanvasAccess(pool, canvasId, userId);
    if (!canvasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get project_id from canvas for broadcast
    const canvasResult = await pool.query(
      `SELECT project_id FROM canvases WHERE id = $1`,
      [canvasId]
    );
    const projectId = canvasResult.rows[0]?.project_id;

    // Delete the placement
    await pool.query(`DELETE FROM placements WHERE id = $1`, [id]);

    // Broadcast to project
    if (projectId && wsManager) {
      wsManager.broadcast(projectId, {
        type: "placement:removed",
        canvasId,
        placementId: id,
        userId,
      });
    }

    res.json({ success: true, id });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SUBSET ENDPOINTS
// ============================================================================

/**
 * GET /api/canvases/:id/subsets
 * Get subsets for a canvas
 */
router.get("/:id/subsets", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    const result = await pool.query(
      `SELECT * FROM subsets
       WHERE canvas_id = $1
         AND (visibility = 'public'
              OR visibility = 'shared'
              OR (visibility = 'private' AND created_by = $2))
       ORDER BY created_at DESC`,
      [id, userId]
    );

    res.json({
      subsets: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/canvases/:id/subsets
 * Create a new subset
 */
router.post("/:id/subsets", async (req, res, next) => {
  try {
    const { id: canvas_id } = req.params;
    const userId = getUserId(req);
    const { pool, wsManager } = req.app.locals;
    const {
      name,
      description,
      placement_ids,
      placementIds,
      attached_notes,
      attached_images,
      visibility,
      shared_with,
    } = req.body;

    const canvasAccess = await getCanvasAccess(pool, canvas_id, userId);
    if (!canvasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const projectId = canvasAccess.project_id;

    const result = await pool.query(
      `INSERT INTO subsets (
        canvas_id, project_id, name, description, placement_ids,
        attached_notes, attached_images, visibility, shared_with, created_by
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        canvas_id,
        projectId || null,
        name || "Untitled Focus Group",
        description || null,
        placement_ids || placementIds || [],
        attached_notes || [],
        attached_images || [],
        visibility || "private",
        shared_with || [],
        userId,
      ]
    );

    const subset = result.rows[0];

    // Broadcast to project
    if (projectId && wsManager) {
      wsManager.broadcast(projectId, {
        type: "subset:created",
        canvasId: canvas_id,
        subset,
        userId,
      });
    }

    res.status(201).json(subset);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/subsets/:id
 * Update a subset
 */
router.put("/subsets/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { pool, wsManager } = req.app.locals;
    const {
      name,
      description,
      placement_ids,
      placementIds,
      attached_notes,
      attached_images,
      visibility,
      shared_with,
    } = req.body;

    const subsetCheck = await pool.query(
      `SELECT canvas_id FROM subsets WHERE id = $1`,
      [id]
    );
    if (subsetCheck.rows.length === 0) {
      return res.status(404).json({ error: "Subset not found" });
    }

    const canvasAccess = await getCanvasAccess(
      pool,
      subsetCheck.rows[0].canvas_id,
      userId
    );
    if (!canvasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await pool.query(
      `UPDATE subsets
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           placement_ids = COALESCE($3, placement_ids),
           attached_notes = COALESCE($4, attached_notes),
           attached_images = COALESCE($5, attached_images),
           visibility = COALESCE($6, visibility),
           shared_with = COALESCE($7, shared_with),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        name,
        description,
        placement_ids || placementIds,
        attached_notes,
        attached_images,
        visibility,
        shared_with,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Subset not found" });
    }

    const subset = result.rows[0];

    // Get project_id from canvas for broadcast
    const canvasResult = await pool.query(
      `SELECT project_id FROM canvases WHERE id = $1`,
      [subset.canvas_id]
    );
    const projectId = canvasResult.rows[0]?.project_id;

    // Broadcast to project
    if (projectId && wsManager) {
      wsManager.broadcast(projectId, {
        type: "subset:updated",
        canvasId: subset.canvas_id,
        subset,
        userId,
      });
    }

    res.json(subset);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/subsets/:id
 * Delete a subset
 */
router.delete("/subsets/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { pool, wsManager } = req.app.locals;

    // First get the subset to find canvas_id
    const subsetResult = await pool.query(
      `SELECT canvas_id FROM subsets WHERE id = $1`,
      [id]
    );

    if (subsetResult.rows.length === 0) {
      return res.status(404).json({ error: "Subset not found" });
    }

    const canvasId = subsetResult.rows[0].canvas_id;

    const canvasAccess = await getCanvasAccess(pool, canvasId, userId);
    if (!canvasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get project_id from canvas for broadcast
    const canvasResult = await pool.query(
      `SELECT project_id FROM canvases WHERE id = $1`,
      [canvasId]
    );
    const projectId = canvasResult.rows[0]?.project_id;

    // Delete the subset
    await pool.query(`DELETE FROM subsets WHERE id = $1`, [id]);

    // Broadcast to project
    if (projectId && wsManager) {
      wsManager.broadcast(projectId, {
        type: "subset:deleted",
        canvasId,
        subsetId: id,
        userId,
      });
    }

    res.json({ success: true, id });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
