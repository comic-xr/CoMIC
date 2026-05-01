// server/src/routes/workspaceAnnotations.js
// Workspace-level annotation management for v2.0 architecture
// These are annotations at the grid level, not anchored to specific datasets

const express = require("express");
const router = express.Router();
const { ws: log } = require("../utils/logger");
const { getUser } = require("../middleware/auth");

// ============================================================================
// WORKSPACE ANNOTATION ENDPOINTS
// ============================================================================

/**
 * GET /api/workspace-annotations
 * List workspace annotations with filters
 */
router.get("/", async (req, res, next) => {
  try {
    const user = getUser(req);
    const { pool } = req.app.locals;
    const {
      projectId,
      viewId,
      branchId,
      type,
      status = "active",
      limit = 100,
      offset = 0,
    } = req.query;

    let query = `
      SELECT wa.*,
             u.email as creator_email
      FROM workspace_annotations wa
      LEFT JOIN users u ON wa.created_by = u.id
      WHERE wa.status = $1
    `;
    const values = [status];
    let paramIndex = 2;

    // Filter by project
    if (projectId) {
      query += ` AND wa.project_id = $${paramIndex++}`;
      values.push(projectId);
    }

    // Filter by view
    if (viewId) {
      query += ` AND wa.view_id = $${paramIndex++}`;
      values.push(viewId);
    }

    // Filter by branch
    if (branchId) {
      query += ` AND wa.branch_id = $${paramIndex++}`;
      values.push(branchId);
    }

    // Filter by type
    if (type) {
      query += ` AND wa.type = $${paramIndex++}`;
      values.push(type);
    }

    // Visibility filter
    query += ` AND (
      wa.visibility = 'public'
      OR wa.visibility = 'project'
      OR (wa.visibility = 'private' AND wa.created_by = $${paramIndex++})
    )`;
    values.push(user.id);

    query += ` ORDER BY wa.z_index ASC, wa.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    values.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, values);

    res.json({
      annotations: result.rows,
      count: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workspace-annotations/:id
 * Get single workspace annotation details
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;

    const result = await pool.query(
      `
      SELECT wa.*,
             u.email as creator_email
      FROM workspace_annotations wa
      LEFT JOIN users u ON wa.created_by = u.id
      WHERE wa.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Workspace annotation not found" });
    }

    res.json({ annotation: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workspace-annotations
 * Create a new workspace annotation
 */
router.post("/", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const user = getUser(req);
    const {
      projectId,
      viewId,
      branchId,
      type,
      pathData,
      screenCoordinates,
      linkedDatasets,
      linkedGridSlots,
      linkedViewIds,
      style,
      textContent,
      label,
      visibility = "project",
      zIndex = 0,
    } = req.body;

    if (!projectId || !type || !pathData || !screenCoordinates) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["projectId", "type", "pathData", "screenCoordinates"],
      });
    }

    // Insert annotation
    const result = await pool.query(
      `
      INSERT INTO workspace_annotations (
        project_id, view_id, branch_id, type,
        path_data, screen_coordinates,
        linked_datasets, linked_grid_slots, linked_view_ids,
        style, text_content, label,
        visibility, z_index, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `,
      [
        projectId,
        viewId || null,
        branchId || null,
        type,
        JSON.stringify(pathData),
        JSON.stringify(screenCoordinates),
        linkedDatasets || null,
        linkedGridSlots || null,
        linkedViewIds || null,
        style ? JSON.stringify(style) : null,
        textContent || null,
        label || null,
        visibility,
        zIndex,
        user.id,
      ]
    );

    const annotation = result.rows[0];

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "workspace_annotation:create",
        projectId,
        entityType: "workspace_annotation",
        entityId: annotation.id,
        after: { type, visibility },
      });
    }

    // Broadcast to project
    if (projectId && wsManager) {
      wsManager.broadcast(projectId, {
        type: "workspace_annotation:created",
        annotation,
      });
    }

    log.debug(`Created workspace annotation: ${annotation.id}`);

    res.status(201).json({
      success: true,
      annotation,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/workspace-annotations/:id
 * Update a workspace annotation
 */
router.put("/:id", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { id } = req.params;
    const user = getUser(req);
    const updates = req.body;

    // Get existing annotation
    const existing = await pool.query(
      "SELECT * FROM workspace_annotations WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Workspace annotation not found" });
    }

    const beforeState = existing.rows[0];

    // Build dynamic update query
    const allowedFields = [
      "type",
      "path_data",
      "screen_coordinates",
      "linked_datasets",
      "linked_grid_slots",
      "linked_view_ids",
      "style",
      "text_content",
      "label",
      "visibility",
      "z_index",
      "locked",
    ];

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    // Map camelCase to snake_case
    const fieldMapping = {
      pathData: "path_data",
      screenCoordinates: "screen_coordinates",
      linkedDatasets: "linked_datasets",
      linkedGridSlots: "linked_grid_slots",
      linkedViewIds: "linked_view_ids",
      textContent: "text_content",
      zIndex: "z_index",
    };

    for (const [key, value] of Object.entries(updates)) {
      const dbField = fieldMapping[key] || key;
      if (allowedFields.includes(dbField) && value !== undefined) {
        let processedValue = value;
        // JSON fields need stringification
        if (
          ["path_data", "screen_coordinates", "style"].includes(dbField) &&
          typeof value === "object"
        ) {
          processedValue = JSON.stringify(value);
        }
        setClauses.push(`${dbField} = $${paramIndex++}`);
        values.push(processedValue);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    // Add tracking fields
    setClauses.push(`updated_at = NOW()`);
    setClauses.push(`updated_by = $${paramIndex++}`);
    values.push(user.id);

    // Add WHERE clause
    values.push(id);

    const result = await pool.query(
      `
      UPDATE workspace_annotations
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      values
    );

    const annotation = result.rows[0];

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "workspace_annotation:update",
        entityType: "workspace_annotation",
        entityId: id,
        before: { type: beforeState.type },
        after: { type: annotation.type },
      });
    }

    // Broadcast update
    if (annotation.project_id && wsManager) {
      wsManager.broadcast(annotation.project_id, {
        type: "workspace_annotation:updated",
        annotation,
      });
    }

    res.json({
      success: true,
      annotation,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/workspace-annotations/:id
 * Soft delete a workspace annotation
 */
router.delete("/:id", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { id } = req.params;
    const user = getUser(req);

    // Get annotation info
    const existing = await pool.query(
      "SELECT * FROM workspace_annotations WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Workspace annotation not found" });
    }

    const annotation = existing.rows[0];

    // Soft delete
    await pool.query(
      "UPDATE workspace_annotations SET status = 'deleted', updated_at = NOW(), updated_by = $2 WHERE id = $1",
      [id, user.id]
    );

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "workspace_annotation:delete",
        entityType: "workspace_annotation",
        entityId: id,
        before: { status: annotation.status },
        after: { status: "deleted" },
      });
    }

    // Broadcast deletion
    if (annotation.project_id && wsManager) {
      wsManager.broadcast(annotation.project_id, {
        type: "workspace_annotation:deleted",
        annotationId: id,
      });
    }

    res.json({ success: true, message: "Workspace annotation deleted" });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workspace-annotations/:id/history
 * Get version history for a workspace annotation
 */
router.get("/:id/history", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const { limit = 50 } = req.query;

    const result = await pool.query(
      `
      SELECT was.*,
             u.email as creator_email
      FROM workspace_annotation_snapshots was
      LEFT JOIN users u ON was.created_by = u.id
      WHERE was.workspace_annotation_id = $1
      ORDER BY was.version_number DESC
      LIMIT $2
    `,
      [id, parseInt(limit)]
    );

    res.json({
      annotationId: id,
      versions: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workspace-annotations/batch
 * Create multiple workspace annotations at once (for drawing operations)
 */
router.post("/batch", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;
  const client = await pool.connect();

  try {
    const user = getUser(req);
    const { annotations, projectId } = req.body;

    if (!Array.isArray(annotations) || annotations.length === 0) {
      return res.status(400).json({ error: "annotations array required" });
    }

    if (annotations.length > 50) {
      return res
        .status(400)
        .json({ error: "Maximum 50 annotations per batch" });
    }

    await client.query("BEGIN");

    const created = [];

    for (const ann of annotations) {
      const {
        viewId,
        type,
        pathData,
        screenCoordinates,
        linkedDatasets,
        style,
        textContent,
        label,
        zIndex = 0,
      } = ann;

      if (!type || !pathData || !screenCoordinates) {
        continue; // Skip invalid annotations
      }

      const result = await client.query(
        `
        INSERT INTO workspace_annotations (
          project_id, view_id, type,
          path_data, screen_coordinates,
          linked_datasets, style, text_content, label,
          z_index, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `,
        [
          projectId,
          viewId || null,
          type,
          JSON.stringify(pathData),
          JSON.stringify(screenCoordinates),
          linkedDatasets || null,
          style ? JSON.stringify(style) : null,
          textContent || null,
          label || null,
          zIndex,
          user.id,
        ]
      );

      created.push(result.rows[0]);
    }

    await client.query("COMMIT");

    // Audit log for batch
    if (req.audit) {
      await req.audit({
        action: "workspace_annotation:batch_create",
        projectId,
        entityType: "workspace_annotation",
        entityId: null,
        details: { count: created.length },
      });
    }

    // Broadcast all created annotations
    if (projectId && wsManager) {
      wsManager.broadcast(projectId, {
        type: "workspace_annotation:batch_created",
        annotations: created,
      });
    }

    res.status(201).json({
      success: true,
      created: created.length,
      skipped: annotations.length - created.length,
      annotations: created,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
