// server/src/routes/projects.js
// Project and file management endpoints

const express = require("express");
const router = express.Router();
const multer = require("multer");
const crypto = require("crypto");
const { Readable } = require("stream");
const { createLogger } = require("../utils/logger");
const { getUserId, checkProjectMembership } = require("../middleware/auth");

const log = createLogger("files");

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB max file size
  },
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Log an audit event
 */
async function logAudit(
  client,
  {
    userId,
    userEmail,
    organizationId,
    projectId,
    action,
    entityType,
    entityId,
    details,
    req,
  }
) {
  await client.query(
    `INSERT INTO audit_log (user_id, user_email, organization_id, project_id, action, entity_type, entity_id, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      userId,
      userEmail,
      organizationId,
      projectId,
      action,
      entityType,
      entityId,
      details,
      req.ip,
      req.get("user-agent"),
    ]
  );
}

/**
 * Get user email from request headers (placeholder for now)
 */
function getUserEmail(req) {
  // TODO: Replace with actual JWT token parsing
  return req.get("x-user-email") || "demo@cia-web.local";
}

// ============================================================================
// PROJECT ENDPOINTS
// ============================================================================

/**
 * GET /api/projects
 * List all projects user has access to
 */
router.get("/", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    const result = await pool.query(
      `SELECT p.*, o.name as organization_name
             FROM projects p
             JOIN organizations o ON p.organization_id = o.id
             LEFT JOIN project_members pm ON p.id = pm.project_id
             WHERE p.visibility = 'public' OR pm.user_id = $1
             ORDER BY p.updated_at DESC`,
      [userId]
    );

    res.json({
      projects: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:id
 * Get project details
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    const result = await pool.query(
      `SELECT p.*, o.name as organization_name
             FROM projects p
             JOIN organizations o ON p.organization_id = o.id
             LEFT JOIN project_members pm ON p.id = pm.project_id
             WHERE p.id = $1 AND (p.visibility = 'public' OR pm.user_id = $2)`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// CANVAS ENDPOINTS
// ============================================================================

/**
 * GET /api/projects/:id/canvases
 * List canvases for a project
 */
router.get("/:id/canvases", async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const { type } = req.query; // 'personal', 'shared', or undefined for all
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    // Verify user has access to project
    const projectCheck = await pool.query(
      `SELECT 1 FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.id = $1 AND (p.visibility = 'public' OR pm.user_id = $2)`,
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    let query = `
      SELECT c.*, w.name as workspace_name
      FROM canvases c
      JOIN workspaces w ON c.workspace_id = w.id
      WHERE c.project_id = $1 AND c.is_active = true
    `;
    const params = [projectId];
    let paramIndex = 2;

    // Filter by ownership type
    if (type === "personal") {
      query += ` AND c.ownership->>'type' = 'personal' AND c.ownership->>'ownerId' = $${paramIndex}`;
      params.push(userId);
    } else if (type === "shared") {
      query += ` AND c.ownership->>'type' = 'shared'`;
    }

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
 * POST /api/projects/:id/canvases
 * Create a new canvas in a project
 */
router.post("/:id/canvases", async (req, res, next) => {
  const client = await req.app.locals.pool.connect();

  try {
    const { id: projectId } = req.params;
    const userId = getUserId(req);
    const { wsManager } = req.app.locals;
    const {
      workspace_id,
      name,
      dimensions,
      ownership,
      layout_mode,
      flow_direction,
    } = req.body;

    console.log(
      "[DEBUG] Creating canvas for project:",
      projectId,
      "user:",
      userId
    );

    // Ensure ownership has the correct ownerId for personal canvases
    // Client may send undefined ownerId, so we use the authenticated user's ID
    let finalOwnership = ownership || { type: "personal" };
    if (finalOwnership.type === "personal" && !finalOwnership.ownerId) {
      finalOwnership = { ...finalOwnership, ownerId: userId };
      console.log("[DEBUG] Set ownerId to authenticated user:", userId);
    }

    await client.query("BEGIN");

    // Verify user has access to project
    const projectCheck = await client.query(
      `SELECT p.organization_id, pm.role
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE p.id = $1 AND pm.user_id = $2`,
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Access denied" });
    }

    // If no workspace_id provided, find or create a default workspace
    let workspaceId = workspace_id;
    if (!workspaceId) {
      // Try to find an existing workspace for this project
      const wsResult = await client.query(
        `SELECT w.id FROM workspaces w
         WHERE w.owner_id = $1
         ORDER BY w.created_at DESC LIMIT 1`,
        [userId]
      );

      if (wsResult.rows.length > 0) {
        workspaceId = wsResult.rows[0].id;
        console.log("[DEBUG] Found existing workspace:", workspaceId);
      } else {
        // Create a default workspace
        console.log("[DEBUG] Creating new workspace for user:", userId);
        const newWs = await client.query(
          `INSERT INTO workspaces (name, owner_id, created_by)
           VALUES ($1, $2, $2) RETURNING id`,
          ["Default Workspace", userId]
        );
        workspaceId = newWs.rows[0].id;
        console.log("[DEBUG] Created workspace:", workspaceId);
      }
    }

    // Create the canvas (handle both old and new schema)
    let result;
    try {
      console.log("[DEBUG] Inserting canvas with new schema");
      // Try with new schema (layout_mode, flow_direction)
      result = await client.query(
        `INSERT INTO canvases (
          workspace_id, project_id, name, dimensions, ownership,
          layout_mode, flow_direction, created_by
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          workspaceId,
          projectId,
          name || "Untitled Canvas",
          JSON.stringify(dimensions || { rows: 3, cols: 3 }),
          JSON.stringify(finalOwnership),
          layout_mode || "grid",
          flow_direction || "row",
          userId,
        ]
      );
      console.log("[DEBUG] Canvas created:", result.rows[0]?.id);
    } catch (insertError) {
      console.log("[DEBUG] Insert error:", insertError.message);
      // Fallback for old schema (without layout_mode, flow_direction)
      if (
        insertError.message.includes("layout_mode") ||
        insertError.message.includes("flow_direction") ||
        insertError.message.includes("column")
      ) {
        console.log("[DEBUG] Falling back to old schema");
        result = await client.query(
          `INSERT INTO canvases (workspace_id, project_id, name, dimensions, ownership, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            workspaceId,
            projectId,
            name || "Untitled Canvas",
            JSON.stringify(dimensions || { rows: 3, cols: 3 }),
            JSON.stringify(finalOwnership),
            userId,
          ]
        );
      } else {
        throw insertError;
      }
    }

    await client.query("COMMIT");

    const canvas = result.rows[0];

    // Broadcast to project
    if (wsManager) {
      wsManager.broadcast(projectId, {
        type: "canvas:created",
        canvasId: canvas.id,
        canvas,
        userId,
      });
    }

    res.status(201).json(canvas);
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

// ============================================================================
// FILE ENDPOINTS
// ============================================================================

/**
 * GET /api/projects/:id/files
 * List files in a project
 */
router.get("/:id/files", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    const projectCheck = await pool.query(
      `SELECT 1 FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.id = $1 AND (p.visibility = 'public' OR pm.user_id = $2)`,
      [id, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await pool.query(
      `SELECT d.*,
              d.file_size as size,
              fpa.access_level, fpa.added_at, fpa.folder_id,
              COALESCE(get_folder_path(fpa.folder_id), '/') as folder_path,
              f.name as folder_name
       FROM datasets d
       JOIN file_project_access fpa ON d.id = fpa.file_id
       LEFT JOIN folders f ON fpa.folder_id = f.id
       WHERE fpa.project_id = $1 AND d.status = 'active'
       ORDER BY fpa.added_at DESC`,
      [id]
    );

    res.json({ files: result.rows, count: result.rows.length });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/files/:fileId", async (req, res, next) => {
  try {
    const { id: projectId, fileId } = req.params;
    const { folderId } = req.body;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    const membershipRole = await checkProjectMembership(
      pool,
      projectId,
      userId
    );
    if (!membershipRole || !["owner", "admin", "editor"].includes(membershipRole)) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (folderId) {
      const folderCheck = await pool.query(
        "SELECT id FROM folders WHERE id = $1 AND project_id = $2",
        [folderId, projectId]
      );
      if (folderCheck.rows.length === 0) {
        return res.status(400).json({ error: "Folder not found" });
      }
    }

    const result = await pool.query(
      `UPDATE file_project_access SET folder_id = $1
       WHERE file_id = $2 AND project_id = $3 RETURNING *`,
      [folderId || null, fileId, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "File not found in project" });
    }

    res.json({ success: true, folderId: folderId || null });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/files
 * Upload a new file to a project
 */
router.post("/:id/files", upload.single("file"), async (req, res, next) => {
  const client = await req.app.locals.pool.connect();

  try {
    const { id: projectId } = req.params;
    const userId = getUserId(req);
    const userEmail = getUserEmail(req);
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    await client.query("BEGIN");

    // Verify user has edit access to project
    const projectCheck = await client.query(
      `SELECT p.organization_id FROM projects p
             JOIN project_members pm ON p.id = pm.project_id
             WHERE p.id = $1 AND pm.user_id = $2 AND pm.role IN ('owner', 'admin', 'editor')`,
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Access denied" });
    }

    const organizationId = projectCheck.rows[0].organization_id;

    // Calculate file hash for deduplication
    const hash = crypto.createHash("sha256").update(file.buffer).digest("hex");

    // Check if file already exists for this organization
    const existingFile = await client.query(
      "SELECT id FROM datasets WHERE hash = $1 AND organization_id = $2",
      [hash, organizationId]
    );

    let fileId;

    if (existingFile.rows.length > 0) {
      // File exists, reuse it
      fileId = existingFile.rows[0].id;
      log.debug("Reusing existing file:", fileId);
    } else {
      // Upload to MinIO
      const { minioClient, bucketName } = req.app.locals;
      const storageKey = `${organizationId}/${crypto.randomUUID()}/${
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

      log.info("Uploaded to MinIO:", storageKey);

      // Extract file type from extension
      const fileType = file.originalname.split(".").pop().toLowerCase();

      // Insert into database
      const insertResult = await client.query(
        `INSERT INTO datasets (organization_id, filename, file_size, file_type, hash, storage_key, uploaded_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id`,
        [
          organizationId,
          file.originalname,
          file.size,
          fileType,
          hash,
          storageKey,
          userId,
        ]
      );

      fileId = insertResult.rows[0].id;

      await logAudit(client, {
        userId,
        userEmail,
        organizationId,
        projectId,
        action: "file.uploaded",
        entityType: "file",
        entityId: fileId,
        details: { filename: file.originalname, size: file.size, hash },
        req,
      });
    }

    // Add file to project (if not already added)
    await client.query(
      `INSERT INTO file_project_access (file_id, project_id, access_level, visibility, added_by)
             VALUES ($1, $2, 'read', 'all_members', $3)
             ON CONFLICT (file_id, project_id) DO NOTHING`,
      [fileId, projectId, userId]
    );

    await logAudit(client, {
      userId,
      userEmail,
      organizationId,
      projectId,
      action: "file.added_to_project",
      entityType: "file",
      entityId: fileId,
      details: { filename: file.originalname },
      req,
    });

    await client.query("COMMIT");

    // Fetch the full file details to return to frontend

    const fileDetails = await client.query(
      "SELECT * FROM datasets WHERE id = $1",

      [fileId]
    );

    const fileData = fileDetails.rows[0];

    res.json({
      success: true,
      file: {
        id: fileData.id,
        filename: fileData.filename,
        file_size: fileData.file_size,
        file_type: fileData.file_type,
        mime_type: fileData.mime_type,
        hash: fileData.hash,
        uploaded_by: fileData.uploaded_by,
        uploaded_at: fileData.uploaded_at,
      },
      deduplicated: existingFile.rows.length > 0,
      message: "File uploaded successfully",
    });

    // Broadcast to project members
    const { wsManager } = req.app.locals;
    if (wsManager) {
      wsManager.fileAdded(projectId, fileData);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

/**
 * GET /api/projects/:id/members
 * Get all members of a project
 */
router.get("/:id/members", async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    // Verify user has access to project
    const projectCheck = await pool.query(
      `
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.id = $1 AND (p.visibility = 'public' OR pm.user_id = $2)
    `,
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get all project members with their user info
    const result = await pool.query(
      `
      SELECT
        u.id,
        u.display_name as name,
        u.email,
        u.avatar_url,
        pm.role,
        pm.added_at as joined_at
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
      ORDER BY pm.added_at ASC
    `,
      [projectId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
