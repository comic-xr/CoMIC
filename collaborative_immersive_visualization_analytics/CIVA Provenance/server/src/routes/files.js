// server/src/routes/files.js
// File management routes for v2.0 server-authority architecture
// All file operations are server-authoritative with versioning support
//
// MANIFEST-DRIVEN ARCHITECTURE:
// File type validation uses the handler capabilities service.
// The handlerCapabilities module reads from registry.json, which is
// generated from handler manifests by `npm run build:manifests`.

const express = require("express");
const router = express.Router();
const multer = require("multer");
const crypto = require("crypto");
const { Readable } = require("stream");
const { getUser } = require("../middleware/auth");

const {
  validateUploadWithMagicBytes,
  getSupportedExtensions,
} = require("../services/handlerCapabilities");

const { createLogger } = require("../utils/logger");
const thumbnailService = require("../services/thumbnailService");

const log = createLogger("files");

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB max file size
  },
});

// ============================================================================
// FILE ENDPOINTS
// ============================================================================

/**
 * GET /api/files
 * List files the user has access to (across all projects)
 */
router.get("/", async (req, res, next) => {
  try {
    const user = getUser(req);
    const { pool } = req.app.locals;
    const { projectId, orgId, type, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT DISTINCT d.*, d.file_size as size, fv.version_number as current_version
      FROM datasets d
      LEFT JOIN file_versions fv ON d.current_version_id = fv.id
      LEFT JOIN file_project_access fpa ON d.id = fpa.file_id
      LEFT JOIN project_members pm ON fpa.project_id = pm.project_id
      WHERE d.status = 'active'
        AND (d.uploaded_by = $1 OR pm.user_id = $1 OR d.public_path IS NOT NULL)
    `;
    const values = [user.id];
    let paramIndex = 2;

    if (projectId) {
      query += ` AND fpa.project_id = $${paramIndex++}`;
      values.push(projectId);
    }

    if (orgId) {
      query += ` AND d.organization_id = $${paramIndex++}`;
      values.push(orgId);
    }

    if (type) {
      query += ` AND d.file_type = $${paramIndex++}`;
      values.push(type);
    }

    query += ` ORDER BY d.uploaded_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    values.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, values);

    res.json({
      files: result.rows,
      count: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/files/supported-types
 * Get list of supported file types
 */
router.get("/supported-types", (req, res) => {
  const { category } = req.query;
  const categories = category ? [category] : null;

  res.json({
    extensions: getSupportedExtensions(categories),
    categories: {
      mesh: getSupportedExtensions(["mesh"]),
      volume: getSupportedExtensions(["volume"]),
      image: getSupportedExtensions(["image"]),
      data: getSupportedExtensions(["data"]),
    },
  });
});

/**
 * GET /api/files/:id
 * Get file metadata and version history
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;

    // Get file with current version info
    const result = await pool.query(
      `
      SELECT d.*,
             d.file_size as size,
             fv.version_number as current_version,
             fv.hash as current_hash,
             fv.uploaded_at as version_uploaded_at
      FROM datasets d
      LEFT JOIN file_versions fv ON d.current_version_id = fv.id
      WHERE d.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    // Get version history
    const versions = await pool.query(
      `
      SELECT id, version_number, hash, change_note, uploaded_by, uploaded_at
      FROM file_versions
      WHERE file_id = $1
      ORDER BY version_number DESC
    `,
      [id]
    );

    res.json({
      file: result.rows[0],
      versions: versions.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/files
 * Upload a new file (creates file + first version)
 */
router.post("/", upload.single("file"), async (req, res, next) => {
  const { pool, minioClient, bucketName, wsManager } = req.app.locals;
  const client = await pool.connect();

  try {
    const user = getUser(req);
    const file = req.file;
    const { projectId, orgId } = req.body;

    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Validate file type using magic bytes
    const validation = validateUploadWithMagicBytes(
      file.originalname,
      file.buffer
    );

    if (!validation.valid) {
      return res.status(400).json({
        error: "Invalid file type",
        message: validation.error || "Could not verify file type",
      });
    }

    await client.query("BEGIN");

    // Calculate file hash
    const hash = crypto.createHash("sha256").update(file.buffer).digest("hex");

    // Check for duplicate by hash within organization
    const existingFile = await client.query(
      "SELECT id, filename FROM datasets WHERE hash = $1 AND organization_id = $2",
      [hash, orgId]
    );

    if (existingFile.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Duplicate file",
        message: "A file with identical content already exists",
        existingFile: {
          id: existingFile.rows[0].id,
          filename: existingFile.rows[0].filename,
        },
      });
    }

    // Upload to MinIO
    const storageKey = `${orgId || "default"}/${crypto.randomUUID()}/${
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
        "Detected-Type": validation.extension,
      }
    );

    // Insert file record
    const fileResult = await client.query(
      `
      INSERT INTO datasets (
        organization_id, filename, file_size, file_type, hash,
        storage_key, uploaded_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `,
      [
        orgId,
        file.originalname,
        file.size,
        validation.extension,
        hash,
        storageKey,
        user.id,
      ]
    );

    const fileId = fileResult.rows[0].id;

    // Create first version
    const versionResult = await client.query(
      `
      INSERT INTO file_versions (file_id, version_number, hash, storage_key, uploaded_by, change_note)
      VALUES ($1, 1, $2, $3, $4, 'Initial upload')
      RETURNING id
    `,
      [fileId, hash, storageKey, user.id]
    );

    // Update file to point to current version
    await client.query(
      "UPDATE datasets SET current_version_id = $1 WHERE id = $2",
      [versionResult.rows[0].id, fileId]
    );

    // If projectId provided, add file to project
    if (projectId) {
      await client.query(
        `
        INSERT INTO file_project_access (file_id, project_id, access_level, visibility, added_by)
        VALUES ($1, $2, 'read', 'all_members', $3)
        ON CONFLICT (file_id, project_id) DO NOTHING
      `,
        [fileId, projectId, user.id]
      );
    }

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "file:upload",
        orgId,
        projectId,
        entityType: "file",
        entityId: fileId,
        after: {
          filename: file.originalname,
          size: file.size,
          type: validation.extension,
        },
        details: { hash, handlerType: validation.handlerType },
      });
    }

    await client.query("COMMIT");

    // Fetch complete file record
    const newFile = await pool.query(
      `
      SELECT d.*, d.file_size as size, fv.version_number as current_version
      FROM datasets d
      LEFT JOIN file_versions fv ON d.current_version_id = fv.id
      WHERE d.id = $1
    `,
      [fileId]
    );

    // Broadcast to project if applicable
    if (projectId && wsManager) {
      wsManager.fileAdded(projectId, newFile.rows[0]);
    }

    // Queue a default file-level thumbnail (async, don't wait)
    // This generates the thumbnail shown in file lists.
    // View-specific thumbnails are queued separately when views are created.
    thumbnailService
      .queueThumbnailJob({
        fileId,
        pool,
        viewId: null, // File-level thumbnail, no specific view
        projectId: projectId || null,
        priority: 3, // Lower priority than view thumbnails
      })
      .catch((err) => {
        log.warn(
          `Failed to queue default thumbnail for file ${fileId}: ${err.message}`
        );
      });

    res.status(201).json({
      success: true,
      file: newFile.rows[0],
      validation: {
        extension: validation.extension,
        handlerType: validation.handlerType,
        displayName: validation.displayName,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

/**
 * POST /api/files/:id/versions
 * Upload a new version of an existing file
 */
router.post("/:id/versions", upload.single("file"), async (req, res, next) => {
  const { pool, minioClient, bucketName, wsManager } = req.app.locals;
  const client = await pool.connect();

  try {
    const { id: fileId } = req.params;
    const user = getUser(req);
    const file = req.file;
    const { changeNote } = req.body;

    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Validate file type
    const validation = validateUploadWithMagicBytes(
      file.originalname,
      file.buffer
    );

    if (!validation.valid) {
      return res.status(400).json({
        error: "Invalid file type",
        message: validation.error,
      });
    }

    await client.query("BEGIN");

    // Get existing file
    const existingFile = await client.query(
      "SELECT * FROM datasets WHERE id = $1",
      [fileId]
    );

    if (existingFile.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "File not found" });
    }

    const existing = existingFile.rows[0];

    // Get previous state for audit
    const beforeState = {
      version: existing.current_version_id,
      hash: existing.hash,
    };

    // Calculate new hash
    const hash = crypto.createHash("sha256").update(file.buffer).digest("hex");

    // Check if identical to current version
    if (hash === existing.hash) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "No changes detected",
        message: "This file is identical to the current version",
      });
    }

    // Get next version number
    const versionCountResult = await client.query(
      "SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM file_versions WHERE file_id = $1",
      [fileId]
    );
    const nextVersion = versionCountResult.rows[0].next_version;

    // Upload new version to MinIO
    const storageKey = `${
      existing.organization_id || "default"
    }/${crypto.randomUUID()}/${file.originalname}`;
    await minioClient.putObject(
      bucketName,
      storageKey,
      file.buffer,
      file.size,
      {
        "Content-Type": file.mimetype,
        "Original-Filename": file.originalname,
        Version: nextVersion.toString(),
      }
    );

    // Create new version record
    const versionResult = await client.query(
      `
      INSERT INTO file_versions (file_id, version_number, hash, storage_key, uploaded_by, change_note)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [fileId, nextVersion, hash, storageKey, user.id, changeNote || null]
    );

    // Update file to point to new version
    await client.query(
      `
      UPDATE datasets
      SET current_version_id = $1, hash = $2, file_size = $3, updated_at = NOW()
      WHERE id = $4
    `,
      [versionResult.rows[0].id, hash, file.size, fileId]
    );

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "file:version_create",
        orgId: existing.organization_id,
        entityType: "file",
        entityId: fileId,
        before: beforeState,
        after: { version: nextVersion, hash },
        details: { changeNote },
      });
    }

    await client.query("COMMIT");

    // Broadcast version update to all projects containing this file
    if (wsManager) {
      const projectsResult = await pool.query(
        "SELECT project_id FROM file_project_access WHERE file_id = $1",
        [fileId]
      );

      for (const row of projectsResult.rows) {
        wsManager.fileVersionAdded(
          row.project_id,
          fileId,
          versionResult.rows[0]
        );
      }
    }

    // Regenerate thumbnails for all views of this file (async, don't wait)
    // Uses queueThumbnailsForFile to handle all active views
    thumbnailService.queueThumbnailsForFile(pool, fileId).catch((err) => {
      log.warn(
        `Failed to queue thumbnail jobs for file version ${fileId}: ${err.message}`
      );
    });

    res.status(201).json({
      success: true,
      version: versionResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

/**
 * GET /api/files/:id/download
 * Download file content (current version or specific version)
 */
router.get("/:id/download", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { version } = req.query;
    const { pool, minioClient, bucketName } = req.app.locals;

    // Get file metadata
    let query, values;

    if (version) {
      // Get specific version
      query = `
        SELECT d.filename, d.organization_id, fv.storage_key
        FROM datasets d
        JOIN file_versions fv ON fv.file_id = d.id
        WHERE d.id = $1 AND fv.version_number = $2
      `;
      values = [id, parseInt(version)];
    } else {
      // Get current version
      query = `
        SELECT d.filename, d.organization_id, d.storage_key, d.public_path
        FROM datasets d
        WHERE d.id = $1
      `;
      values = [id];
    }

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: version ? "Version not found" : "File not found",
      });
    }

    const file = result.rows[0];

    // Log access for audit
    if (req.audit) {
      await req.audit({
        action: "file:download",
        orgId: file.organization_id,
        entityType: "file",
        entityId: id,
        details: { version: version || "current" },
      });
    }

    // If public file, serve directly
    if (file.public_path) {
      return res.sendFile(file.public_path, { root: process.cwd() });
    }

    // Fetch from MinIO
    const dataStream = await minioClient.getObject(
      bucketName,
      file.storage_key
    );

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.filename}"`
    );

    dataStream.pipe(res);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/files/:id
 * Soft delete a file (marks as deleted, doesn't remove from storage)
 */
router.delete("/:id", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const user = getUser(req);

    await client.query("BEGIN");

    // Get file info before deletion
    const fileResult = await client.query(
      "SELECT * FROM datasets WHERE id = $1",
      [id]
    );

    if (fileResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "File not found" });
    }

    const file = fileResult.rows[0];

    // Soft delete
    await client.query(
      "UPDATE datasets SET status = 'deleted', updated_at = NOW() WHERE id = $1",
      [id]
    );

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "file:delete",
        orgId: file.organization_id,
        entityType: "file",
        entityId: id,
        before: { filename: file.filename, status: file.status },
        after: { status: "deleted" },
      });
    }

    await client.query("COMMIT");

    // Broadcast to all projects containing this file
    if (wsManager) {
      const projectsResult = await pool.query(
        "SELECT project_id FROM file_project_access WHERE file_id = $1",
        [id]
      );

      for (const row of projectsResult.rows) {
        wsManager.fileRemoved(row.project_id, id);
      }
    }

    res.json({ success: true, message: "File deleted" });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

/**
 * POST /api/files/:id/add-to-project
 * Add an existing file to a project
 */
router.post("/:id/add-to-project", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { id: fileId } = req.params;
    const { projectId } = req.body;
    const user = getUser(req);

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    // Verify file exists
    const fileResult = await pool.query(
      "SELECT * FROM datasets WHERE id = $1 AND status = 'active'",
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    // Add to project
    await pool.query(
      `
      INSERT INTO file_project_access (file_id, project_id, access_level, visibility, added_by)
      VALUES ($1, $2, 'read', 'all_members', $3)
      ON CONFLICT (file_id, project_id) DO NOTHING
    `,
      [fileId, projectId, user.id]
    );

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "file:added_to_project",
        projectId,
        orgId: fileResult.rows[0].organization_id,
        entityType: "file",
        entityId: fileId,
        details: { filename: fileResult.rows[0].filename },
      });
    }

    // Broadcast to project
    if (wsManager) {
      wsManager.fileAdded(projectId, fileResult.rows[0]);
    }

    res.json({ success: true, message: "File added to project" });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/files/:id/remove-from-project
 * Remove a file from a project (doesn't delete the file)
 */
router.delete("/:id/remove-from-project", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { id: fileId } = req.params;
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    await pool.query(
      "DELETE FROM file_project_access WHERE file_id = $1 AND project_id = $2",
      [fileId, projectId]
    );

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "file:removed_from_project",
        projectId,
        entityType: "file",
        entityId: fileId,
      });
    }

    // Broadcast to project
    if (wsManager) {
      wsManager.fileRemoved(projectId, fileId);
    }

    res.json({ success: true, message: "File removed from project" });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/files/:id/thumbnail
 * Get a thumbnail for a file (stored directly in datasets table)
 *
 * File thumbnails are STATIC - they only change on:
 * 1. Admin explicitly regenerates from file options
 * 2. Version changes (new version gets new thumbnail)
 *
 * Returns 204 No Content if no thumbnail exists (avoids CORS issues with <img> tags).
 */
router.get("/:id/thumbnail", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool, minioClient, bucketName } = req.app.locals;

    log.debug(`Getting file thumbnail for ${id}`);

    // Get file's own thumbnail from datasets table
    const result = await pool.query(
      `SELECT thumbnail_key, thumbnail_updated_at, status
       FROM datasets
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      log.debug(`File ${id} not found`);
      return res.status(404).json({ error: "File not found" });
    }

    const file = result.rows[0];

    // If no thumbnail exists, auto-queue generation
    if (!file.thumbnail_key) {
      log.debug(`No thumbnail for file ${id} - queuing generation`);

      // Queue file-level thumbnail (not view-level)
      thumbnailService
        .queueFileThumbnailJob({
          fileId: id,
          pool,
          priority: 3,
        })
        .catch((err) =>
          log.warn(
            `Failed to auto-queue file thumbnail for ${id}: ${err.message}`
          )
        );

      // Return 204 No Content - signals no thumbnail but avoids CORS issues
      return res.status(204).end();
    }

    log.debug(`Found file thumbnail: ${file.thumbnail_key}`);

    // Set cache headers (file thumbnails are stable - cache longer)
    res.set("Cache-Control", "public, max-age=86400"); // 24 hours

    // Stream from MinIO
    if (minioClient) {
      try {
        // Determine MIME type from storage key
        const mimeType = file.thumbnail_key.endsWith(".webp")
          ? "image/webp"
          : file.thumbnail_key.endsWith(".png")
          ? "image/png"
          : "image/jpeg";
        res.set("Content-Type", mimeType);

        const stream = await minioClient.getObject(
          bucketName,
          file.thumbnail_key
        );
        stream.pipe(res);
      } catch (e) {
        log.error(`Failed to get file thumbnail from storage: ${e.message}`);
        return res.status(204).end();
      }
    } else {
      return res.status(204).end();
    }
  } catch (error) {
    log.error("Failed to get file thumbnail:", error);
    next(error);
  }
});

module.exports = router;
