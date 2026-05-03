// server/src/routes/content.js
// Notes and images management endpoints

const express = require("express");
const router = express.Router();
const multer = require("multer");
const crypto = require("crypto");
const { createLogger } = require("../utils/logger");
const { getUserId } = require("../middleware/auth");

const log = createLogger("files");

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."
        )
      );
    }
  },
});

// ============================================================================
// NOTES ENDPOINTS
// ============================================================================

/**
 * GET /api/content/notes
 * List notes for a canvas
 */
router.get("/notes", async (req, res, next) => {
  try {
    const { canvas_id } = req.query;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    if (!canvas_id) {
      return res.status(400).json({ error: "canvas_id is required" });
    }

    const result = await pool.query(
      `SELECT * FROM notes
       WHERE canvas_id = $1 AND (visibility = 'public' OR created_by = $2)
       ORDER BY pinned DESC, updated_at DESC`,
      [canvas_id, userId]
    );

    res.json({
      notes: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/content/notes/:id
 * Get note details
 */
router.get("/notes/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;

    const result = await pool.query(`SELECT * FROM notes WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/content/notes
 * Create a new note
 */
router.post("/notes", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { pool } = req.app.locals;
    const {
      canvas_id,
      title,
      content,
      format,
      position,
      width,
      height,
      color,
      pinned,
      visibility,
    } = req.body;

    if (!canvas_id) {
      return res.status(400).json({ error: "canvas_id is required" });
    }

    const result = await pool.query(
      `INSERT INTO notes (canvas_id, title, content, format, position, width, height, color, pinned, visibility, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        canvas_id,
        title || "",
        content || "",
        format || "markdown",
        position ? JSON.stringify(position) : null,
        width || 1,
        height || 1,
        color || "default",
        pinned || false,
        visibility || "private",
        userId,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/content/notes/:id
 * Update note
 */
router.put("/notes/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const {
      title,
      content,
      format,
      position,
      width,
      height,
      color,
      pinned,
      visibility,
    } = req.body;

    const result = await pool.query(
      `UPDATE notes
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           format = COALESCE($3, format),
           position = COALESCE($4, position),
           width = COALESCE($5, width),
           height = COALESCE($6, height),
           color = COALESCE($7, color),
           pinned = COALESCE($8, pinned),
           visibility = COALESCE($9, visibility),
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        title,
        content,
        format,
        position ? JSON.stringify(position) : null,
        width,
        height,
        color,
        pinned,
        visibility,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/content/notes/:id
 * Delete note
 */
router.delete("/notes/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;

    const result = await pool.query(
      `DELETE FROM notes WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json({ success: true, id });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// IMAGES ENDPOINTS
// ============================================================================

/**
 * GET /api/content/images
 * List images for a canvas
 */
router.get("/images", async (req, res, next) => {
  try {
    const { canvas_id } = req.query;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    if (!canvas_id) {
      return res.status(400).json({ error: "canvas_id is required" });
    }

    const result = await pool.query(
      `SELECT * FROM canvas_images
       WHERE canvas_id = $1 AND (visibility = 'public' OR created_by = $2)
       ORDER BY updated_at DESC`,
      [canvas_id, userId]
    );

    res.json({
      images: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/content/images
 * Upload an image
 */
router.post("/images", upload.single("file"), async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { pool, minioClient, bucketName } = req.app.locals;
    const file = req.file;
    const {
      canvas_id,
      position,
      width,
      height,
      fit,
      caption,
      alt_text,
      visibility,
    } = req.body;

    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    if (!canvas_id) {
      return res.status(400).json({ error: "canvas_id is required" });
    }

    // Upload to MinIO
    const storageKey = `canvas-images/${canvas_id}/${crypto.randomUUID()}/${
      file.originalname
    }`;

    await minioClient.putObject(
      bucketName,
      storageKey,
      file.buffer,
      file.size,
      {
        "Content-Type": file.mimetype,
        "Original-Filename": file.originalname,
      }
    );

    // Insert into database
    const result = await pool.query(
      `INSERT INTO canvas_images (canvas_id, storage_key, original_name, mime_type, file_size, position, width, height, fit, caption, alt_text, visibility, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        canvas_id,
        storageKey,
        file.originalname,
        file.mimetype,
        file.size,
        position ? JSON.stringify(position) : null,
        width || 1,
        height || 1,
        fit || "contain",
        caption || "",
        alt_text || file.originalname,
        visibility || "private",
        userId,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/content/images/:id
 * Get image details
 */
router.get("/images/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;

    const result = await pool.query(
      `SELECT * FROM canvas_images WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/content/images/:id/download
 * Download image file
 */
router.get("/images/:id/download", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool, minioClient, bucketName } = req.app.locals;

    const result = await pool.query(
      `SELECT * FROM canvas_images WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }

    const image = result.rows[0];
    const dataStream = await minioClient.getObject(
      bucketName,
      image.storage_key
    );

    res.setHeader("Content-Type", image.mime_type);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${image.original_name}"`
    );

    dataStream.pipe(res);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/content/images/:id
 * Update image metadata
 */
router.put("/images/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const { position, width, height, fit, caption, alt_text, visibility } =
      req.body;

    const result = await pool.query(
      `UPDATE canvas_images
       SET position = COALESCE($1, position),
           width = COALESCE($2, width),
           height = COALESCE($3, height),
           fit = COALESCE($4, fit),
           caption = COALESCE($5, caption),
           alt_text = COALESCE($6, alt_text),
           visibility = COALESCE($7, visibility),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        position ? JSON.stringify(position) : null,
        width,
        height,
        fit,
        caption,
        alt_text,
        visibility,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/content/images/:id
 * Delete image
 */
router.delete("/images/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool, minioClient, bucketName } = req.app.locals;

    // Get image to delete from MinIO
    const imageResult = await pool.query(
      `SELECT storage_key FROM canvas_images WHERE id = $1`,
      [id]
    );

    if (imageResult.rows.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }

    // Delete from MinIO
    try {
      await minioClient.removeObject(
        bucketName,
        imageResult.rows[0].storage_key
      );
    } catch (minioError) {
      log.error("Failed to delete from MinIO:", minioError);
      // Continue with database deletion even if MinIO fails
    }

    // Delete from database
    await pool.query(`DELETE FROM canvas_images WHERE id = $1`, [id]);

    res.json({ success: true, id });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
