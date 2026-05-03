// server/src/routes/subsets.js
// Subset (focus groups) management endpoints

const express = require("express");
const router = express.Router();
const { getUserId } = require("../middleware/auth");

// ============================================================================
// SUBSET ENDPOINTS
// ============================================================================

/**
 * GET /api/subsets
 * List subsets for a canvas
 */
router.get("/", async (req, res, next) => {
  try {
    const { canvas_id, project_id } = req.query;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    let query = `
      SELECT s.*, u.email as created_by_email
      FROM subsets s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE (s.visibility = 'public' OR s.created_by = $1 OR $1 = ANY(s.shared_with))
    `;
    const params = [userId];
    let paramIndex = 2;

    if (canvas_id) {
      query += ` AND s.canvas_id = $${paramIndex++}`;
      params.push(canvas_id);
    }

    if (project_id) {
      query += ` AND s.project_id = $${paramIndex++}`;
      params.push(project_id);
    }

    query += " ORDER BY s.updated_at DESC";

    const result = await pool.query(query, params);

    res.json({
      subsets: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/subsets/:id
 * Get subset details
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    const result = await pool.query(
      `SELECT s.*, u.email as created_by_email
       FROM subsets s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.id = $1 AND (s.visibility = 'public' OR s.created_by = $2 OR $2 = ANY(s.shared_with))`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Subset not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subsets
 * Create a new subset
 */
router.post("/", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { pool } = req.app.locals;
    const {
      canvas_id,
      project_id,
      name,
      description,
      placement_ids,
      visibility,
      shared_with,
    } = req.body;

    if (!canvas_id) {
      return res.status(400).json({ error: "canvas_id is required" });
    }

    const result = await pool.query(
      `INSERT INTO subsets (canvas_id, project_id, name, description, placement_ids, visibility, shared_with, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        canvas_id,
        project_id || null,
        name || "Untitled Focus Group",
        description || "",
        placement_ids || [],
        visibility || "private",
        shared_with || [],
        userId,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/subsets/:id
 * Update subset
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const {
      name,
      description,
      placement_ids,
      attached_notes,
      attached_images,
      visibility,
      shared_with,
    } = req.body;

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
        placement_ids,
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

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/subsets/:id
 * Delete subset
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;

    const result = await pool.query(
      `DELETE FROM subsets WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Subset not found" });
    }

    res.json({ success: true, id });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subsets/:id/placements
 * Add placements to subset
 */
router.post("/:id/placements", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const { placement_ids } = req.body;

    const result = await pool.query(
      `UPDATE subsets
       SET placement_ids = placement_ids || $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [placement_ids, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Subset not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/subsets/:id/placements/:placementId
 * Remove placement from subset
 */
router.delete("/:id/placements/:placementId", async (req, res, next) => {
  try {
    const { id, placementId } = req.params;
    const { pool } = req.app.locals;

    const result = await pool.query(
      `UPDATE subsets
       SET placement_ids = array_remove(placement_ids, $1::uuid),
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [placementId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Subset not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
