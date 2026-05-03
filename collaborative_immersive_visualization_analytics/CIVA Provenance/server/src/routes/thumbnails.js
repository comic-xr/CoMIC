// server/src/routes/thumbnails.js
// View thumbnail API for progressive loading and snapshot previews
//
// Stores visual thumbnails/previews of views for:
// 1. Progressive loading (show thumbnail while real data loads)
// 2. Bookmark previews
// 3. Snapshot gallery views
// 4. Canvas cell placeholders
//
// Endpoints:
// POST   /api/views/:viewId/thumbnail              - Upload/update thumbnail
// GET    /api/views/:viewId/thumbnail              - Get current state thumbnail
// GET    /api/views/:viewId/thumbnail/:snapshotId  - Get snapshot thumbnail
// DELETE /api/views/:viewId/thumbnail              - Delete thumbnail

const express = require("express");
const router = express.Router({ mergeParams: true });
const multer = require("multer");
const { createLogger } = require("../utils/logger");
const { getUser } = require("../middleware/auth");
const thumbnailService = require("../services/thumbnailService");

const log = createLogger("thumbnails");

// Maximum size for inline storage (64KB)
const MAX_INLINE_SIZE = 64 * 1024;

// Configure multer for thumbnail uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB max for thumbnails (smaller than bookmarks)
  },
  fileFilter: (req, file, cb) => {
    // Only allow images and SVG
    const allowed = ["image/svg+xml", "image/webp", "image/png", "image/jpeg"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only SVG, WebP, PNG, and JPEG files are allowed"), false);
    }
  },
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/views/:viewId/thumbnail
 * Upload or update a thumbnail for a view
 *
 * Supports two modes:
 * 1. File upload (multipart/form-data with 'thumbnail' field)
 * 2. Inline data (JSON body with 'data' field for small thumbnails)
 *
 * Body params:
 * - snapshotId: Optional UUID to associate with a specific snapshot
 * - format: 'svg' | 'webp' | 'png' | 'jpeg' (required for inline)
 * - data: Base64 encoded thumbnail data (for inline storage)
 * - width: Thumbnail width in pixels
 * - height: Thumbnail height in pixels
 */
router.post(
  "/:viewId/thumbnail",
  upload.single("thumbnail"),
  async (req, res, next) => {
    try {
      const { viewId } = req.params;
      const user = getUser(req);
      const { pool, minioClient, bucketName } = req.app.locals;

      // Check view exists and user has access
      const viewResult = await pool.query(
        `SELECT id, owner_user_id, visibility FROM view_configurations WHERE id = $1`,
        [viewId]
      );

      if (viewResult.rows.length === 0) {
        return res.status(404).json({ error: "View not found" });
      }

      const view = viewResult.rows[0];

      // Only owner can upload thumbnails (for now)
      if (view.owner_user_id !== user.id) {
        return res
          .status(403)
          .json({ error: "Only the view owner can upload thumbnails" });
      }

      // Parse request - either file upload or inline data
      let format, data, storageKey, inlineData, width, height, fileSize;
      const { snapshotId } = req.body;

      if (req.file) {
        // File upload mode
        const mimeToFormat = {
          "image/svg+xml": "svg",
          "image/webp": "webp",
          "image/png": "png",
          "image/jpeg": "jpeg",
        };
        format = mimeToFormat[req.file.mimetype] || "png";
        data = req.file.buffer;
        fileSize = req.file.size;
        width = parseInt(req.body.width) || null;
        height = parseInt(req.body.height) || null;

        // Decide storage: inline for small files, MinIO for larger
        if (fileSize <= MAX_INLINE_SIZE) {
          inlineData = data.toString("base64");
          storageKey = null;
        } else {
          inlineData = null;
          storageKey = `thumbnails/views/${viewId}/${
            snapshotId || "current"
          }.${format}`;

          await minioClient.putObject(bucketName, storageKey, data, fileSize, {
            "Content-Type": req.file.mimetype,
          });
        }
      } else if (req.body.data) {
        // Inline data mode (from client-side capture)
        format = req.body.format;
        if (!["svg", "webp", "png", "jpeg"].includes(format)) {
          return res
            .status(400)
            .json({ error: "Invalid format. Use: svg, webp, png, jpeg" });
        }

        data = req.body.data;
        fileSize = data.length;
        width = parseInt(req.body.width) || null;
        height = parseInt(req.body.height) || null;

        // Decide storage based on size
        if (fileSize <= MAX_INLINE_SIZE) {
          inlineData = data;
          storageKey = null;
        } else {
          inlineData = null;
          storageKey = `thumbnails/views/${viewId}/${
            snapshotId || "current"
          }.${format}`;

          const buffer = Buffer.from(data, "base64");
          const mimeType =
            format === "svg" ? "image/svg+xml" : `image/${format}`;

          await minioClient.putObject(
            bucketName,
            storageKey,
            buffer,
            buffer.length,
            {
              "Content-Type": mimeType,
            }
          );
        }
      } else {
        return res.status(400).json({ error: "No thumbnail data provided" });
      }

      // Upsert into database
      const result = await pool.query(
        `
        INSERT INTO view_thumbnails (view_config_id, snapshot_id, format, storage_key, inline_data, width, height, file_size, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (view_config_id, snapshot_id)
        DO UPDATE SET
          format = EXCLUDED.format,
          storage_key = EXCLUDED.storage_key,
          inline_data = EXCLUDED.inline_data,
          width = EXCLUDED.width,
          height = EXCLUDED.height,
          file_size = EXCLUDED.file_size,
          updated_at = NOW()
        RETURNING id, view_config_id, snapshot_id, format, storage_key, width, height, file_size, created_at, updated_at
        `,
        [
          viewId,
          snapshotId || null,
          format,
          storageKey,
          inlineData,
          width,
          height,
          fileSize,
        ]
      );

      const thumbnail = result.rows[0];

      log.info(
        `Thumbnail ${thumbnail.id} uploaded for view ${viewId} by ${user.email}`
      );

      res.json({
        success: true,
        thumbnail: {
          id: thumbnail.id,
          viewConfigId: thumbnail.view_config_id,
          snapshotId: thumbnail.snapshot_id,
          format: thumbnail.format,
          width: thumbnail.width,
          height: thumbnail.height,
          fileSize: thumbnail.file_size,
          isInline: !!inlineData,
          createdAt: thumbnail.created_at,
          updatedAt: thumbnail.updated_at,
        },
      });
    } catch (error) {
      log.error("Failed to upload thumbnail:", error);
      next(error);
    }
  }
);

/**
 * GET /api/views/:viewId/thumbnail
 * Get the current state thumbnail for a view
 *
 * Falls back to file thumbnail if view-specific thumbnail doesn't exist yet.
 * This provides a smooth experience where new views show the file's default
 * thumbnail until their own view-specific thumbnail is generated.
 *
 * Query params:
 * - snapshotId: Optional UUID to get a specific snapshot's thumbnail
 * - metadata: If 'true', return metadata only (not the image data)
 */
router.get("/:viewId/thumbnail", async (req, res, next) => {
  try {
    const { viewId } = req.params;
    const { snapshotId, metadata } = req.query;
    const { pool, minioClient, bucketName } = req.app.locals;

    // Get thumbnail
    const result = await pool.query(
      `
      SELECT t.*, v.visibility, v.owner_user_id, v.dataset_id
      FROM view_thumbnails t
      JOIN view_configurations v ON t.view_config_id = v.id
      WHERE t.view_config_id = $1
        AND (t.snapshot_id = $2 OR ($2 IS NULL AND t.snapshot_id IS NULL))
      `,
      [viewId, snapshotId || null]
    );

    // If no view-specific thumbnail, try to fall back to file thumbnail
    if (result.rows.length === 0) {
      // Get the view's dataset_id to look up file thumbnail
      const viewResult = await pool.query(
        `SELECT dataset_id FROM view_configurations WHERE id = $1`,
        [viewId]
      );

      if (viewResult.rows.length > 0 && viewResult.rows[0].dataset_id) {
        const datasetId = viewResult.rows[0].dataset_id;

        // Check if file has a thumbnail
        const fileResult = await pool.query(
          `SELECT thumbnail_key FROM datasets WHERE id = $1 AND thumbnail_key IS NOT NULL`,
          [datasetId]
        );

        if (fileResult.rows.length > 0 && fileResult.rows[0].thumbnail_key) {
          // Serve the file thumbnail as fallback
          const thumbnailKey = fileResult.rows[0].thumbnail_key;

          log.debug(
            `View ${viewId} has no thumbnail, falling back to file thumbnail: ${thumbnailKey}`
          );

          // Set cache headers (shorter for fallback since view thumbnail may come soon)
          res.set("Cache-Control", "public, max-age=60"); // 1 minute

          if (minioClient) {
            try {
              const mimeType = thumbnailKey.endsWith(".webp")
                ? "image/webp"
                : thumbnailKey.endsWith(".png")
                ? "image/png"
                : "image/jpeg";
              res.set("Content-Type", mimeType);

              const stream = await minioClient.getObject(
                bucketName,
                thumbnailKey
              );
              return stream.pipe(res);
            } catch (e) {
              log.error(`Failed to get fallback file thumbnail: ${e.message}`);
            }
          }
        }
      }

      // No view thumbnail and no file thumbnail fallback available
      return res.status(404).json({ error: "Thumbnail not found" });
    }

    const thumbnail = result.rows[0];

    // Check access (public views or owner)
    const user = getUser(req);
    if (
      thumbnail.visibility === "private" &&
      thumbnail.owner_user_id !== user?.id
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Metadata only mode
    if (metadata === "true") {
      return res.json({
        id: thumbnail.id,
        viewConfigId: thumbnail.view_config_id,
        snapshotId: thumbnail.snapshot_id,
        format: thumbnail.format,
        width: thumbnail.width,
        height: thumbnail.height,
        fileSize: thumbnail.file_size,
        createdAt: thumbnail.created_at,
        updatedAt: thumbnail.updated_at,
      });
    }

    // Set cache headers with ETag for proper cache validation
    // Using updated_at as ETag ensures clients get fresh data when thumbnail changes
    const etag = `"${thumbnail.id}-${new Date(
      thumbnail.updated_at
    ).getTime()}"`;
    res.set("Cache-Control", "public, max-age=300, must-revalidate"); // 5 minutes, then revalidate
    res.set("ETag", etag);

    // Check if client has current version (304 Not Modified)
    const ifNoneMatch = req.get("If-None-Match");
    if (ifNoneMatch === etag) {
      return res.status(304).end();
    }

    // Return inline data directly
    if (thumbnail.inline_data) {
      const mimeType =
        thumbnail.format === "svg"
          ? "image/svg+xml"
          : `image/${thumbnail.format}`;
      res.set("Content-Type", mimeType);
      return res.send(Buffer.from(thumbnail.inline_data, "base64"));
    }

    // Stream from MinIO
    if (thumbnail.storage_key) {
      try {
        const mimeType =
          thumbnail.format === "svg"
            ? "image/svg+xml"
            : `image/${thumbnail.format}`;
        res.set("Content-Type", mimeType);

        const stream = await minioClient.getObject(
          bucketName,
          thumbnail.storage_key
        );
        stream.pipe(res);
      } catch (e) {
        log.error(`Failed to get thumbnail from storage: ${e.message}`);
        return res.status(404).json({ error: "Thumbnail file not found" });
      }
    } else {
      return res.status(404).json({ error: "Thumbnail data not available" });
    }
  } catch (error) {
    log.error("Failed to get thumbnail:", error);
    next(error);
  }
});

/**
 * GET /api/views/:viewId/thumbnail/:snapshotId
 * Get thumbnail for a specific snapshot (convenience route)
 */
router.get("/:viewId/thumbnail/:snapshotId", async (req, res, next) => {
  // Forward to main handler with snapshotId in query
  req.query.snapshotId = req.params.snapshotId;
  return router.handle(req, res, next);
});

/**
 * DELETE /api/views/:viewId/thumbnail
 * Delete a thumbnail
 *
 * Query params:
 * - snapshotId: Optional UUID to delete a specific snapshot's thumbnail
 */
router.delete("/:viewId/thumbnail", async (req, res, next) => {
  try {
    const { viewId } = req.params;
    const { snapshotId } = req.query;
    const user = getUser(req);
    const { pool, minioClient, bucketName } = req.app.locals;

    // Check view exists and user has access
    const viewResult = await pool.query(
      `SELECT id, owner_user_id FROM view_configurations WHERE id = $1`,
      [viewId]
    );

    if (viewResult.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const view = viewResult.rows[0];

    // Only owner can delete thumbnails
    if (view.owner_user_id !== user.id) {
      return res
        .status(403)
        .json({ error: "Only the view owner can delete thumbnails" });
    }

    // Get thumbnail to delete storage if needed
    const existing = await pool.query(
      `SELECT storage_key FROM view_thumbnails
       WHERE view_config_id = $1
       AND (snapshot_id = $2 OR ($2 IS NULL AND snapshot_id IS NULL))`,
      [viewId, snapshotId || null]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Thumbnail not found" });
    }

    const storageKey = existing.rows[0].storage_key;

    // Delete from storage if not inline
    if (storageKey && minioClient) {
      try {
        await minioClient.removeObject(bucketName, storageKey);
        log.debug(`Deleted thumbnail from storage: ${storageKey}`);
      } catch (e) {
        log.warn(`Failed to delete thumbnail from storage: ${e.message}`);
      }
    }

    // Delete from database
    await pool.query(
      `DELETE FROM view_thumbnails
       WHERE view_config_id = $1
       AND (snapshot_id = $2 OR ($2 IS NULL AND snapshot_id IS NULL))`,
      [viewId, snapshotId || null]
    );

    log.info(`Thumbnail deleted for view ${viewId} by ${user.email}`);

    res.json({ success: true, message: "Thumbnail deleted" });
  } catch (error) {
    log.error("Failed to delete thumbnail:", error);
    next(error);
  }
});

/**
 * GET /api/views/:viewId/thumbnails
 * List all thumbnails for a view (current + snapshots)
 */
router.get("/:viewId/thumbnails", async (req, res, next) => {
  try {
    const { viewId } = req.params;
    const { pool } = req.app.locals;

    // Get all thumbnails for this view
    const result = await pool.query(
      `
      SELECT t.id, t.snapshot_id, t.format, t.width, t.height, t.file_size,
             t.created_at, t.updated_at,
             (t.inline_data IS NOT NULL) as is_inline
      FROM view_thumbnails t
      WHERE t.view_config_id = $1
      ORDER BY t.snapshot_id NULLS FIRST, t.created_at DESC
      `,
      [viewId]
    );

    res.json({
      viewId,
      thumbnails: result.rows.map((row) => ({
        id: row.id,
        snapshotId: row.snapshot_id,
        format: row.format,
        width: row.width,
        height: row.height,
        fileSize: row.file_size,
        isInline: row.is_inline,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    log.error("Failed to list thumbnails:", error);
    next(error);
  }
});

// ============================================================================
// SERVER-SIDE THUMBNAIL GENERATION
// ============================================================================

/**
 * POST /api/views/:viewId/thumbnail/queue
 * Queue a server-side thumbnail generation job
 *
 * Thumbnails are generated by a headless browser worker to ensure
 * they accurately represent the visualization (no client tampering).
 */
router.post("/:viewId/thumbnail/queue", async (req, res, next) => {
  try {
    const { viewId } = req.params;
    const user = getUser(req);
    const { pool } = req.app.locals;
    const { priority } = req.body;

    // Check view exists and user has access
    const viewResult = await pool.query(
      `SELECT id, dataset_id, owner_user_id FROM view_configurations WHERE id = $1`,
      [viewId]
    );

    if (viewResult.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const view = viewResult.rows[0];

    // Queue the job
    const job = await thumbnailService.queueThumbnailJob({
      fileId: view.dataset_id,
      pool: pool,
      viewId: viewId,
      priority: priority || 5,
    });

    res.status(202).json({
      success: true,
      job,
    });
  } catch (error) {
    log.error("Failed to queue thumbnail job:", error);
    next(error);
  }
});

/**
 * POST /api/thumbnails/callback
 * Callback from thumbnail worker with job results
 *
 * This is called by the thumbnail worker, not by clients.
 * In production, verify with a shared secret.
 */
router.post("/callback", async (req, res, next) => {
  try {
    const { pool } = req.app.locals;
    const result = req.body;

    // Validate callback
    if (!result.jobId) {
      return res.status(400).json({ error: "jobId required" });
    }

    const saved = await thumbnailService.handleThumbnailCallback(pool, result);

    res.json(saved);
  } catch (error) {
    log.error("Failed to handle thumbnail callback:", error);
    next(error);
  }
});

module.exports = router;
