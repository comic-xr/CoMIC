// server/src/routes/bookmarks.js
// Bookmarks API - saved view states with camera position and filters
//
// Scopes:
// - 'personal': Only visible to the owner
// - 'workspace': Visible to workspace members
// - 'project': Visible project-wide
//
// Endpoints:
// GET    /api/projects/:projectId/bookmarks               - List bookmarks
// POST   /api/projects/:projectId/bookmarks               - Create bookmark
// GET    /api/projects/:projectId/bookmarks/:id           - Get single bookmark
// PATCH  /api/projects/:projectId/bookmarks/:id           - Update bookmark
// DELETE /api/projects/:projectId/bookmarks/:id           - Delete bookmark
// POST   /api/projects/:projectId/bookmarks/:id/thumbnail - Upload thumbnail
// GET    /api/projects/:projectId/bookmarks/:id/thumbnail - Get thumbnail

const express = require("express");
const router = express.Router({ mergeParams: true });
const multer = require("multer");
const { createLogger } = require("../utils/logger");
const { getUser, getUserWorkspaceIds, checkProjectAccess } = require("../middleware/auth");

const log = createLogger("bookmarks");

// Configure multer for thumbnail uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max for thumbnails
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/projects/:projectId/bookmarks
 * List bookmarks visible in current context
 *
 * Query params:
 * - scope: 'personal' | 'workspace' | 'project' | 'all' (default: 'all')
 * - workspaceId: Filter by workspace (required if scope='workspace')
 * - datasetId: Filter by dataset (optional)
 */
router.get("/", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { scope = "all", workspaceId, datasetId } = req.query;
    const user = getUser(req);
    const { pool } = req.app.locals;

    // Check access
    const access = await checkProjectAccess(pool, projectId, user.id);
    if (!access) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Build scope filter
    let scopeFilter = "";
    const queryParams = [projectId, user.id];
    let paramIndex = 3;

    if (scope === "personal") {
      scopeFilter = `AND b.scope = 'personal' AND b.owner_id = $2`;
    } else if (scope === "workspace") {
      if (!workspaceId) {
        return res
          .status(400)
          .json({ error: "workspaceId required for workspace scope" });
      }
      scopeFilter = `AND b.scope = 'workspace' AND b.workspace_id = $${paramIndex}`;
      queryParams.push(workspaceId);
      paramIndex++;
    } else if (scope === "project") {
      scopeFilter = `AND b.scope = 'project'`;
    } else {
      // 'all' - return all bookmarks visible to this user
      const userWorkspaceIds = await getUserWorkspaceIds(
        pool,
        projectId,
        user.id
      );

      if (userWorkspaceIds.length > 0) {
        scopeFilter = `AND (
          (b.scope = 'personal' AND b.owner_id = $2) OR
          (b.scope = 'project') OR
          (b.scope = 'workspace' AND b.workspace_id = ANY($${paramIndex}))
        )`;
        queryParams.push(userWorkspaceIds);
        paramIndex++;
      } else {
        scopeFilter = `AND (
          (b.scope = 'personal' AND b.owner_id = $2) OR
          (b.scope = 'project')
        )`;
      }
    }

    // Optional dataset filter
    let datasetFilter = "";
    if (datasetId) {
      datasetFilter = `AND b.dataset_id = $${paramIndex}`;
      queryParams.push(datasetId);
      paramIndex++;
    }

    const result = await pool.query(
      `SELECT b.*,
              u.display_name as owner_name,
              u.email as owner_email,
              d.filename as dataset_name
       FROM bookmarks b
       LEFT JOIN users u ON b.owner_id = u.id
       LEFT JOIN datasets d ON b.dataset_id = d.id
       WHERE b.project_id = $1
         ${scopeFilter}
         ${datasetFilter}
       ORDER BY b.is_pinned DESC, b.created_at DESC`,
      queryParams
    );

    const bookmarks = result.rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      ownerId: row.owner_id,
      name: row.name,
      description: row.description,
      scope: row.scope,
      workspaceId: row.workspace_id,
      datasetId: row.dataset_id,
      datasetName: row.dataset_name,
      viewConfigId: row.view_config_id,
      cameraState: row.camera_state,
      filterIds: row.filter_ids || [],
      thumbnailKey: row.thumbnail_key,
      tags: row.tags || [],
      isPinned: row.is_pinned,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      owner: {
        id: row.owner_id,
        name: row.owner_name,
        email: row.owner_email,
      },
      isOwn: row.owner_id === user.id,
    }));

    res.json({ bookmarks, count: bookmarks.length, scope });
  } catch (error) {
    log.error("Failed to list bookmarks:", error);
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/bookmarks
 * Create a new bookmark
 *
 * Body:
 * - name: string (required)
 * - description: string (optional)
 * - scope: 'personal' | 'workspace' | 'project' (default: 'personal')
 * - workspace_id: UUID (required if scope='workspace')
 * - dataset_id: UUID (optional)
 * - view_config_id: UUID (optional)
 * - camera_state: object (optional)
 * - filter_ids: UUID[] (optional)
 * - tags: string[] (optional)
 * - is_pinned: boolean (default: false)
 */
router.post("/", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const {
      name,
      description,
      scope = "personal",
      workspace_id,
      dataset_id,
      view_config_id,
      camera_state,
      filter_ids = [],
      tags = [],
      is_pinned = false,
    } = req.body;
    const user = getUser(req);
    const { pool, wsManager } = req.app.locals;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "name is required" });
    }
    if (name.length > 255) {
      return res.status(400).json({ error: "name too long (max 255)" });
    }

    // Validate scope
    if (!["personal", "workspace", "project"].includes(scope)) {
      return res
        .status(400)
        .json({ error: "scope must be 'personal', 'workspace', or 'project'" });
    }

    // Workspace scope requires workspace_id
    if (scope === "workspace" && !workspace_id) {
      return res
        .status(400)
        .json({ error: "workspace_id required for workspace scope" });
    }

    // Check project access
    const access = await checkProjectAccess(pool, projectId, user.id);
    if (!access) {
      return res.status(403).json({ error: "Access denied" });
    }

    // If workspace scope, verify user has access to the workspace
    if (scope === "workspace") {
      const workspaceCheck = await pool.query(
        `SELECT 1 FROM workspaces w
         LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
         WHERE w.id = $1 AND w.project_id = $2
           AND (w.owner_id = $3 OR wm.user_id = $3)`,
        [workspace_id, projectId, user.id]
      );
      if (workspaceCheck.rows.length === 0) {
        return res
          .status(403)
          .json({ error: "You must have access to the workspace" });
      }
    }

    // Create bookmark
    const result = await pool.query(
      `INSERT INTO bookmarks (
        project_id, owner_id, name, description, scope, workspace_id,
        dataset_id, view_config_id, camera_state, filter_ids, tags, is_pinned
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        projectId,
        user.id,
        name.trim(),
        description || null,
        scope,
        scope === "workspace" ? workspace_id : null,
        dataset_id || null,
        view_config_id || null,
        camera_state ? JSON.stringify(camera_state) : null,
        filter_ids,
        tags,
        is_pinned,
      ]
    );

    const bookmark = result.rows[0];

    // Broadcast to project members
    if (wsManager) {
      wsManager.broadcastToProject(projectId, {
        type: "bookmark:created",
        bookmark: {
          id: bookmark.id,
          name: bookmark.name,
          scope: bookmark.scope,
          createdBy: user.name || user.email,
        },
      });
    }

    log.info(
      `Bookmark created: ${bookmark.id} by ${user.email} in project ${projectId}`
    );

    res.status(201).json({
      bookmark: {
        id: bookmark.id,
        projectId: bookmark.project_id,
        ownerId: bookmark.owner_id,
        name: bookmark.name,
        description: bookmark.description,
        scope: bookmark.scope,
        workspaceId: bookmark.workspace_id,
        datasetId: bookmark.dataset_id,
        viewConfigId: bookmark.view_config_id,
        cameraState: bookmark.camera_state,
        filterIds: bookmark.filter_ids || [],
        thumbnailKey: bookmark.thumbnail_key,
        tags: bookmark.tags || [],
        isPinned: bookmark.is_pinned,
        createdAt: bookmark.created_at,
        updatedAt: bookmark.updated_at,
        owner: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        isOwn: true,
      },
    });
  } catch (error) {
    log.error("Failed to create bookmark:", error);
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/bookmarks/:id
 * Get a single bookmark by ID
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const user = getUser(req);
    const { pool } = req.app.locals;

    // Check project access
    const access = await checkProjectAccess(pool, projectId, user.id);
    if (!access) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await pool.query(
      `SELECT b.*,
              u.display_name as owner_name,
              u.email as owner_email,
              d.filename as dataset_name
       FROM bookmarks b
       LEFT JOIN users u ON b.owner_id = u.id
       LEFT JOIN datasets d ON b.dataset_id = d.id
       WHERE b.id = $1 AND b.project_id = $2`,
      [id, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Bookmark not found" });
    }

    const row = result.rows[0];

    // Check access based on scope
    const canAccess =
      row.owner_id === user.id || // Owner
      row.scope === "project"; // Project-scoped

    // Check workspace access if workspace-scoped
    if (!canAccess && row.scope === "workspace" && row.workspace_id) {
      const workspaceCheck = await pool.query(
        `SELECT 1 FROM workspaces w
         LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
         WHERE w.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
        [row.workspace_id, user.id]
      );
      if (workspaceCheck.rows.length === 0) {
        return res
          .status(403)
          .json({ error: "Access denied to this bookmark" });
      }
    } else if (!canAccess) {
      return res.status(403).json({ error: "Access denied to this bookmark" });
    }

    res.json({
      bookmark: {
        id: row.id,
        projectId: row.project_id,
        ownerId: row.owner_id,
        name: row.name,
        description: row.description,
        scope: row.scope,
        workspaceId: row.workspace_id,
        datasetId: row.dataset_id,
        datasetName: row.dataset_name,
        viewConfigId: row.view_config_id,
        cameraState: row.camera_state,
        filterIds: row.filter_ids || [],
        thumbnailKey: row.thumbnail_key,
        tags: row.tags || [],
        isPinned: row.is_pinned,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        owner: {
          id: row.owner_id,
          name: row.owner_name,
          email: row.owner_email,
        },
        isOwn: row.owner_id === user.id,
      },
    });
  } catch (error) {
    log.error("Failed to get bookmark:", error);
    next(error);
  }
});

/**
 * PATCH /api/projects/:projectId/bookmarks/:id
 * Update a bookmark (owner only)
 *
 * Body (all optional):
 * - name: string
 * - description: string
 * - scope: 'personal' | 'workspace' | 'project'
 * - workspace_id: UUID
 * - dataset_id: UUID
 * - view_config_id: UUID
 * - camera_state: object
 * - filter_ids: UUID[]
 * - tags: string[]
 * - is_pinned: boolean
 */
router.patch("/:id", async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const {
      name,
      description,
      scope,
      workspace_id,
      dataset_id,
      view_config_id,
      camera_state,
      filter_ids,
      tags,
      is_pinned,
    } = req.body;
    const user = getUser(req);
    const { pool, wsManager } = req.app.locals;

    // Check project access
    const access = await checkProjectAccess(pool, projectId, user.id);
    if (!access) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get existing bookmark
    const existing = await pool.query(
      "SELECT * FROM bookmarks WHERE id = $1 AND project_id = $2",
      [id, projectId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Bookmark not found" });
    }

    // Only owner can update
    if (existing.rows[0].owner_id !== user.id) {
      return res
        .status(403)
        .json({ error: "Only the owner can update this bookmark" });
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "name cannot be empty" });
      }
      if (name.length > 255) {
        return res.status(400).json({ error: "name too long (max 255)" });
      }
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (scope !== undefined) {
      if (!["personal", "workspace", "project"].includes(scope)) {
        return res.status(400).json({ error: "Invalid scope" });
      }
      updates.push(`scope = $${paramCount++}`);
      values.push(scope);
    }

    if (workspace_id !== undefined) {
      if (workspace_id) {
        const workspaceCheck = await pool.query(
          `SELECT 1 FROM workspaces w
           LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
           WHERE w.id = $1 AND w.project_id = $2
             AND (w.owner_id = $3 OR wm.user_id = $3)`,
          [workspace_id, projectId, user.id]
        );
        if (workspaceCheck.rows.length === 0) {
          return res
            .status(403)
            .json({ error: "You must have access to the workspace" });
        }
      }
      updates.push(`workspace_id = $${paramCount++}`);
      values.push(workspace_id);
    }

    if (dataset_id !== undefined) {
      updates.push(`dataset_id = $${paramCount++}`);
      values.push(dataset_id);
    }

    if (view_config_id !== undefined) {
      updates.push(`view_config_id = $${paramCount++}`);
      values.push(view_config_id);
    }

    if (camera_state !== undefined) {
      updates.push(`camera_state = $${paramCount++}`);
      values.push(camera_state ? JSON.stringify(camera_state) : null);
    }

    if (filter_ids !== undefined) {
      updates.push(`filter_ids = $${paramCount++}`);
      values.push(filter_ids);
    }

    if (tags !== undefined) {
      updates.push(`tags = $${paramCount++}`);
      values.push(tags);
    }

    if (is_pinned !== undefined) {
      updates.push(`is_pinned = $${paramCount++}`);
      values.push(is_pinned);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE bookmarks SET ${updates.join(
        ", "
      )} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    const bookmark = result.rows[0];

    // Broadcast to project members
    if (wsManager) {
      wsManager.broadcastToProject(projectId, {
        type: "bookmark:updated",
        bookmark: {
          id: bookmark.id,
          name: bookmark.name,
          scope: bookmark.scope,
          updatedBy: user.name || user.email,
        },
      });
    }

    log.info(`Bookmark updated: ${bookmark.id} by ${user.email}`);

    res.json({
      bookmark: {
        id: bookmark.id,
        projectId: bookmark.project_id,
        ownerId: bookmark.owner_id,
        name: bookmark.name,
        description: bookmark.description,
        scope: bookmark.scope,
        workspaceId: bookmark.workspace_id,
        datasetId: bookmark.dataset_id,
        viewConfigId: bookmark.view_config_id,
        cameraState: bookmark.camera_state,
        filterIds: bookmark.filter_ids || [],
        thumbnailKey: bookmark.thumbnail_key,
        tags: bookmark.tags || [],
        isPinned: bookmark.is_pinned,
        createdAt: bookmark.created_at,
        updatedAt: bookmark.updated_at,
        isOwn: true,
      },
    });
  } catch (error) {
    log.error("Failed to update bookmark:", error);
    next(error);
  }
});

/**
 * DELETE /api/projects/:projectId/bookmarks/:id
 * Delete a bookmark (owner only)
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const user = getUser(req);
    const { pool, wsManager, minioClient, bucketName } = req.app.locals;

    // Check project access
    const access = await checkProjectAccess(pool, projectId, user.id);
    if (!access) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get existing bookmark
    const existing = await pool.query(
      "SELECT * FROM bookmarks WHERE id = $1 AND project_id = $2",
      [id, projectId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Bookmark not found" });
    }

    // Only owner can delete
    if (existing.rows[0].owner_id !== user.id) {
      return res
        .status(403)
        .json({ error: "Only the owner can delete this bookmark" });
    }

    const bookmarkName = existing.rows[0].name;
    const thumbnailKey = existing.rows[0].thumbnail_key;

    // Delete thumbnail from MinIO if exists
    if (thumbnailKey && minioClient) {
      try {
        await minioClient.removeObject(bucketName, thumbnailKey);
        log.debug(`Deleted thumbnail: ${thumbnailKey}`);
      } catch (e) {
        log.warn(`Failed to delete thumbnail: ${e.message}`);
      }
    }

    // Delete bookmark
    await pool.query("DELETE FROM bookmarks WHERE id = $1", [id]);

    // Broadcast to project members
    if (wsManager) {
      wsManager.broadcastToProject(projectId, {
        type: "bookmark:deleted",
        bookmarkId: id,
        deletedBy: user.name || user.email,
      });
    }

    log.info(`Bookmark deleted: ${id} (${bookmarkName}) by ${user.email}`);

    res.json({ success: true, message: "Bookmark deleted", deletedId: id });
  } catch (error) {
    log.error("Failed to delete bookmark:", error);
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/bookmarks/:id/thumbnail
 * Upload a thumbnail image for a bookmark
 */
router.post(
  "/:id/thumbnail",
  upload.single("thumbnail"),
  async (req, res, next) => {
    try {
      const { projectId, id } = req.params;
      const user = getUser(req);
      const { pool, minioClient, bucketName } = req.app.locals;

      if (!req.file) {
        return res.status(400).json({ error: "No thumbnail provided" });
      }

      // Check project access
      const access = await checkProjectAccess(pool, projectId, user.id);
      if (!access) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get existing bookmark
      const existing = await pool.query(
        "SELECT * FROM bookmarks WHERE id = $1 AND project_id = $2",
        [id, projectId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: "Bookmark not found" });
      }

      // Only owner can upload thumbnail
      if (existing.rows[0].owner_id !== user.id) {
        return res
          .status(403)
          .json({ error: "Only the owner can upload a thumbnail" });
      }

      // Delete old thumbnail if exists
      const oldThumbnailKey = existing.rows[0].thumbnail_key;
      if (oldThumbnailKey && minioClient) {
        try {
          await minioClient.removeObject(bucketName, oldThumbnailKey);
          log.debug(`Deleted old thumbnail: ${oldThumbnailKey}`);
        } catch (e) {
          log.warn(`Failed to delete old thumbnail: ${e.message}`);
        }
      }

      // Upload new thumbnail
      const thumbnailKey = `thumbnails/${projectId}/bookmarks/${id}.jpg`;

      await minioClient.putObject(
        bucketName,
        thumbnailKey,
        req.file.buffer,
        req.file.size,
        {
          "Content-Type": req.file.mimetype,
        }
      );

      // Update bookmark with new thumbnail key
      await pool.query(
        "UPDATE bookmarks SET thumbnail_key = $1 WHERE id = $2",
        [thumbnailKey, id]
      );

      log.info(`Thumbnail uploaded for bookmark ${id} by ${user.email}`);

      res.json({
        success: true,
        thumbnailKey,
        message: "Thumbnail uploaded",
      });
    } catch (error) {
      log.error("Failed to upload thumbnail:", error);
      next(error);
    }
  }
);

/**
 * GET /api/projects/:projectId/bookmarks/:id/thumbnail
 * Get the thumbnail image for a bookmark
 */
router.get("/:id/thumbnail", async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const user = getUser(req);
    const { pool, minioClient, bucketName } = req.app.locals;

    // Check project access
    const access = await checkProjectAccess(pool, projectId, user.id);
    if (!access) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get bookmark
    const existing = await pool.query(
      "SELECT thumbnail_key, scope, owner_id, workspace_id FROM bookmarks WHERE id = $1 AND project_id = $2",
      [id, projectId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Bookmark not found" });
    }

    const row = existing.rows[0];

    // Check access based on scope
    const canAccess = row.owner_id === user.id || row.scope === "project";

    if (!canAccess && row.scope === "workspace" && row.workspace_id) {
      const workspaceCheck = await pool.query(
        `SELECT 1 FROM workspaces w
         LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
         WHERE w.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
        [row.workspace_id, user.id]
      );
      if (workspaceCheck.rows.length === 0) {
        return res.status(403).json({ error: "Access denied" });
      }
    } else if (!canAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!row.thumbnail_key) {
      return res.status(404).json({ error: "No thumbnail available" });
    }

    // Stream from MinIO
    try {
      const stat = await minioClient.statObject(bucketName, row.thumbnail_key);
      res.setHeader(
        "Content-Type",
        stat.metaData?.["content-type"] || "image/jpeg"
      );
      res.setHeader("Content-Length", stat.size);
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours

      const stream = await minioClient.getObject(bucketName, row.thumbnail_key);
      stream.pipe(res);
    } catch (e) {
      if (e.code === "NoSuchKey" || e.code === "NotFound") {
        return res.status(404).json({ error: "Thumbnail not found" });
      }
      throw e;
    }
  } catch (error) {
    log.error("Failed to get thumbnail:", error);
    next(error);
  }
});

module.exports = router;
