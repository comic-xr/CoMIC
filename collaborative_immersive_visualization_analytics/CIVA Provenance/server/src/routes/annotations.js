// server/src/routes/annotations.js
// Annotation management routes for v2.0 server-authority architecture
// Supports versioning, branching, and visibility controls

const express = require("express");
const router = express.Router();
const { getUser } = require("../middleware/auth");

// ============================================================================
// ANNOTATION ENDPOINTS
// ============================================================================

/**
 * GET /api/annotations
 * List annotations with filters
 */
router.get("/", async (req, res, next) => {
  try {
    const user = getUser(req);
    const { pool } = req.app.locals;
    const {
      fileId,
      projectId,
      branchId,
      type,
      visibility,
      status = "active",
      limit = 100,
      offset = 0,
    } = req.query;

    let query = `
      SELECT a.*,
             u.email as creator_email,
             d.filename as file_name
      FROM annotations a
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN datasets d ON a.dataset_id = d.id
      WHERE a.status = $1
    `;
    const values = [status];
    let paramIndex = 2;

    // Filter by file
    if (fileId) {
      query += ` AND a.dataset_id = $${paramIndex++}`;
      values.push(fileId);
    }

    // Filter by branch
    if (branchId) {
      query += ` AND a.branch_id = $${paramIndex++}`;
      values.push(branchId);
    }

    // Filter by type
    if (type) {
      query += ` AND a.type = $${paramIndex++}`;
      values.push(type);
    }

    // Visibility filter
    if (visibility) {
      query += ` AND a.visibility = $${paramIndex++}`;
      values.push(visibility);
    } else {
      // Default: show public + user's private annotations
      query += ` AND (a.visibility = 'public' OR a.created_by = $${paramIndex++})`;
      values.push(user.id);
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
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
 * GET /api/annotations/:id
 * Get single annotation details
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;

    const result = await pool.query(
      `
      SELECT a.*,
             u.email as creator_email,
             d.filename as file_name
      FROM annotations a
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN datasets d ON a.dataset_id = d.id
      WHERE a.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Annotation not found" });
    }

    res.json({ annotation: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/annotations
 * Create a new annotation
 */
router.post("/", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const user = getUser(req);
    const {
      fileId,
      projectId,
      branchId,
      type,
      coordinates,
      position,
      normal,
      text,
      properties,
      metadata,
      visibility = "public",
    } = req.body;

    if (!fileId || !type || !coordinates) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["fileId", "type", "coordinates"],
      });
    }

    // Verify file exists
    const fileCheck = await pool.query(
      "SELECT id, organization_id FROM datasets WHERE id = $1 AND status = 'active'",
      [fileId]
    );

    if (fileCheck.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const orgId = fileCheck.rows[0].organization_id;

    // Get current file version if not specified
    let fileVersionId = req.body.fileVersionId;
    if (!fileVersionId) {
      const versionResult = await pool.query(
        "SELECT current_version_id FROM datasets WHERE id = $1",
        [fileId]
      );
      fileVersionId = versionResult.rows[0]?.current_version_id;
    }

    // Insert annotation
    // Note: Database schema uses 'position' for coordinates and 'content' for properties
    // Position is DOUBLE PRECISION[3] (PostgreSQL array), pass array directly - no JSON.stringify
    const positionValue = coordinates || position || null;
    console.log("[DEBUG] [SERVER] Inserting annotation:", {
      fileId,
      fileVersionId,
      type,
      positionValue,
      positionType: typeof positionValue,
      positionIsArray: Array.isArray(positionValue),
    });

    const result = await pool.query(
      `
      INSERT INTO annotations (
        dataset_id, file_version_id, branch_id, type,
        position, normal, text,
        content, metadata, visibility,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `,
      [
        fileId,
        fileVersionId,
        branchId || null,
        type,
        positionValue,
        normal || null,
        text || null,
        properties ? JSON.stringify(properties) : null,
        metadata ? JSON.stringify(metadata) : "{}",
        visibility,
        user.id,
      ]
    );

    const annotation = result.rows[0];

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "annotation:create",
        orgId,
        projectId,
        entityType: "annotation",
        entityId: annotation.id,
        after: { type, fileId, visibility },
      });
    }

    // Broadcast to project
    if (projectId && wsManager) {
      wsManager.annotationCreated(projectId, fileId, annotation);
    }

    res.status(201).json({
      success: true,
      annotation,
    });
  } catch (error) {
    console.error(
      "[DEBUG] [SERVER] Annotation creation failed:",
      error.message
    );
    console.error("[DEBUG] [SERVER] Stack trace:", error);
    next(error);
  }
});

/**
 * PUT /api/annotations/:id
 * Update an annotation
 */
router.put("/:id", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { id } = req.params;
    const user = getUser(req);
    const updates = req.body;

    // Get existing annotation
    const existing = await pool.query(
      "SELECT * FROM annotations WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Annotation not found" });
    }

    const beforeState = existing.rows[0];

    // Build dynamic update query
    // Note: Database schema uses 'position' for coordinates and 'content' for properties
    const allowedFields = [
      "type",
      "position",
      "normal",
      "text",
      "content",
      "metadata",
      "visibility",
      "locked",
    ];

    // Map request field names to database column names
    const fieldMapping = {
      coordinates: "position",
      properties: "content",
      visible: "visibility",
    };

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      // Check for both database field name and mapped request field name
      const requestField = Object.keys(fieldMapping).find(
        (k) => fieldMapping[k] === field
      );
      const updateValue =
        updates[field] !== undefined
          ? updates[field]
          : requestField !== undefined
          ? updates[requestField]
          : undefined;

      if (updateValue !== undefined) {
        let value = updateValue;
        // JSONB fields need stringification (content, metadata)
        // Position is DOUBLE PRECISION[3], pass array directly - don't stringify
        if (
          ["content", "metadata"].includes(field) &&
          typeof value === "object"
        ) {
          value = JSON.stringify(value);
        }
        setClauses.push(`${field} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    // Add tracking fields
    setClauses.push(`updated_at = NOW()`);
    setClauses.push(`updated_by = $${paramIndex++}`);
    setClauses.push(`edited_by = $${paramIndex++}`);
    values.push(user.id, user.email);

    // Add WHERE clause
    values.push(id);

    const result = await pool.query(
      `
      UPDATE annotations
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
        action: "annotation:update",
        entityType: "annotation",
        entityId: id,
        before: { type: beforeState.type, text: beforeState.text },
        after: { type: annotation.type, text: annotation.text },
      });
    }

    // Broadcast update (need to find project IDs)
    if (wsManager) {
      const projects = await pool.query(
        "SELECT project_id FROM file_project_access WHERE file_id = $1",
        [annotation.dataset_id]
      );

      for (const row of projects.rows) {
        wsManager.annotationUpdated(
          row.project_id,
          annotation.dataset_id,
          annotation
        );
      }
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
 * DELETE /api/annotations/:id
 * Soft delete an annotation
 */
router.delete("/:id", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { id } = req.params;
    const user = getUser(req);

    // Get annotation info
    const existing = await pool.query(
      "SELECT * FROM annotations WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Annotation not found" });
    }

    const annotation = existing.rows[0];

    // Soft delete
    await pool.query(
      "UPDATE annotations SET status = 'archived', updated_at = NOW() WHERE id = $1",
      [id]
    );

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "annotation:delete",
        entityType: "annotation",
        entityId: id,
        before: { type: annotation.type, status: annotation.status },
        after: { status: "archived" },
      });
    }

    // Broadcast deletion
    if (wsManager) {
      const projects = await pool.query(
        "SELECT project_id FROM file_project_access WHERE file_id = $1",
        [annotation.dataset_id]
      );

      for (const row of projects.rows) {
        wsManager.annotationDeleted(row.project_id, annotation.dataset_id, id);
      }
    }

    res.json({ success: true, message: "Annotation deleted" });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/annotations/batch
 * Create multiple annotations at once
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

    if (annotations.length > 100) {
      return res
        .status(400)
        .json({ error: "Maximum 100 annotations per batch" });
    }

    await client.query("BEGIN");

    const created = [];

    for (const ann of annotations) {
      const {
        fileId,
        branchId,
        type,
        coordinates,
        position,
        normal,
        text,
        properties,
        metadata,
        visibility = "public",
      } = ann;

      if (!fileId || !type || !coordinates) {
        continue; // Skip invalid annotations
      }

      const result = await client.query(
        `
        INSERT INTO annotations (
          dataset_id, branch_id, type,
          position, normal, text,
          content, metadata, visibility,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
        [
          fileId,
          branchId || null,
          type,
          coordinates || position || null, // Pass array directly for DOUBLE PRECISION[3]
          normal || null,
          text || null,
          properties ? JSON.stringify(properties) : null,
          metadata ? JSON.stringify(metadata) : "{}",
          visibility,
          user.id,
        ]
      );

      created.push(result.rows[0]);
    }

    await client.query("COMMIT");

    // Audit log for batch
    if (req.audit) {
      await req.audit({
        action: "annotation:batch_create",
        projectId,
        entityType: "annotation",
        entityId: null,
        details: { count: created.length },
      });
    }

    // Broadcast all created annotations
    if (projectId && wsManager) {
      for (const annotation of created) {
        wsManager.annotationCreated(
          projectId,
          annotation.dataset_id,
          annotation
        );
      }
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

/**
 * POST /api/annotations/:id/migrate
 * Migrate annotation to a new file version (handles coordinate changes)
 */
router.post("/:id/migrate", async (req, res, next) => {
  const { pool } = req.app.locals;

  try {
    const { id } = req.params;
    const { targetVersionId, newCoordinates, status = "migrated" } = req.body;

    if (!targetVersionId) {
      return res.status(400).json({ error: "targetVersionId required" });
    }

    // Get original annotation
    const original = await pool.query(
      "SELECT * FROM annotations WHERE id = $1",
      [id]
    );

    if (original.rows.length === 0) {
      return res.status(404).json({ error: "Annotation not found" });
    }

    const sourceAnnotation = original.rows[0];

    // Create migrated copy
    // Note: Database schema uses 'position' for coordinates and 'content' for properties
    // Position is DOUBLE PRECISION[3] (PostgreSQL array), pass array directly
    const result = await pool.query(
      `
      INSERT INTO annotations (
        dataset_id, file_version_id, branch_id, type,
        position, normal, text,
        content, metadata, visibility,
        created_by,
        migrated_from
      )
      SELECT
        dataset_id, $2, branch_id, type,
        $3, normal, text,
        content, metadata, visibility,
        created_by,
        $1
      FROM annotations WHERE id = $1
      RETURNING *
    `,
      [
        id,
        targetVersionId,
        newCoordinates || sourceAnnotation.position, // Pass array directly
      ]
    );

    // Mark original as migrated
    await pool.query("UPDATE annotations SET status = $2 WHERE id = $1", [
      id,
      status,
    ]);

    res.json({
      success: true,
      original: { id, status },
      migrated: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
