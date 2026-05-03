// server/src/routes/stars.js
// API routes for starring files and folders
//
// Stars are WORKSPACE-SCOPED:
// - 'personal': Only visible in user's personal workspaces
// - 'room': Visible to everyone in that room's workspaces
// - 'project': Visible project-wide (team favorites)
//
// Endpoints:
// GET    /api/projects/:projectId/stars         - Get starred items (filtered by scope)
// POST   /api/projects/:projectId/stars         - Star an item
// DELETE /api/projects/:projectId/stars/:id     - Unstar an item
// POST   /api/projects/:projectId/stars/toggle  - Toggle star (convenience)

const express = require("express");
const router = express.Router({ mergeParams: true });
const { getUserId, checkProjectAccess } = require("../middleware/auth");

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/projects/:projectId/stars
 * Get starred items visible in current context
 *
 * Query params:
 * - scope: 'personal' | 'room' | 'project' | 'all' (default: 'all')
 * - roomId: Required if scope='room', returns room-scoped stars
 *
 * Returns stars the user can see based on:
 * - Their personal stars (scope='personal')
 * - Room stars if they're in that room (scope='room')
 * - Project-wide stars (scope='project')
 * - All visible stars (scope='all', default)
 */
router.get("/", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { scope = "all", roomId } = req.query;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    // User must be authenticated to view stars
    if (!userId) {
      return res
        .status(401)
        .json({ error: "Authentication required to view stars" });
    }

    // Check access
    if (!(await checkProjectAccess(pool, projectId, userId))) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Build scope filter
    let scopeFilter = "";
    const queryParams = [projectId, userId];
    let paramIndex = 3;

    if (scope === "personal") {
      scopeFilter = `AND s.scope = 'personal' AND s.user_id = $2`;
    } else if (scope === "room") {
      if (!roomId) {
        return res
          .status(400)
          .json({ error: "roomId required for room scope" });
      }
      scopeFilter = `AND s.scope = 'room' AND s.room_id = ${paramIndex}`;
      queryParams.push(roomId);
      paramIndex++;
    } else if (scope === "project") {
      scopeFilter = `AND s.scope = 'project'`;
    } else {
      // 'all' - return all stars visible to this user
      // Personal (own) + Room (if member) + Project
      scopeFilter = `AND (
        (s.scope = 'personal' AND s.user_id = $2) OR
        (s.scope = 'project') OR
        (s.scope = 'room' AND s.room_id IN (
          SELECT room_id FROM room_members WHERE user_id = $2
        ))
      )`;
    }

    // Get starred files
    const starredFilesResult = await pool.query(
      `SELECT s.id as star_id, s.created_at as starred_at,
              s.scope, s.room_id, s.user_id as starred_by,
              d.id, d.filename as name, d.file_type, d.file_size as size,
              fpa.folder_id,
              COALESCE(get_folder_path(fpa.folder_id), '/') as folder_path,
              f.name as folder_name
       FROM stars s
       INNER JOIN datasets d ON s.target_id = d.id
       INNER JOIN file_project_access fpa ON d.id = fpa.file_id AND fpa.project_id = $1
       LEFT JOIN folders f ON fpa.folder_id = f.id
       WHERE s.project_id = $1 
         AND s.target_type = 'file'
         AND d.status = 'active'
         ${scopeFilter}
       ORDER BY s.created_at DESC`,
      queryParams
    );

    // Get starred folders (reset params for separate query)
    const folderParams = [projectId, userId];
    let folderScopeFilter = scopeFilter.replace(/\$3/g, "$3"); // Adjust if needed
    if (scope === "room" && roomId) {
      folderParams.push(roomId);
    }

    const starredFoldersResult = await pool.query(
      `SELECT s.id as star_id, s.created_at as starred_at,
              s.scope, s.room_id, s.user_id as starred_by,
              fo.id, fo.name, fo.parent_id,
              get_folder_path(fo.id) as path,
              count_files_in_folder(fo.id) as file_count
       FROM stars s
       INNER JOIN folders fo ON s.target_id = fo.id
       WHERE s.project_id = $1 
         AND s.target_type = 'folder'
         ${scopeFilter}
       ORDER BY s.created_at DESC`,
      queryParams
    );

    // Format response
    const stars = [
      ...starredFilesResult.rows.map((row) => ({
        id: row.star_id,
        targetType: "file",
        targetId: row.id,
        scope: row.scope,
        roomId: row.room_id,
        starredBy: row.starred_by,
        isOwn: row.starred_by === userId,
        starredAt: row.starred_at,
        target: {
          id: row.id,
          name: row.name,
          fileType: row.file_type,
          size: row.size,
          folderId: row.folder_id,
          folderPath: row.folder_path,
          folderName: row.folder_name,
        },
      })),
      ...starredFoldersResult.rows.map((row) => ({
        id: row.star_id,
        targetType: "folder",
        targetId: row.id,
        scope: row.scope,
        roomId: row.room_id,
        starredBy: row.starred_by,
        isOwn: row.starred_by === userId,
        starredAt: row.starred_at,
        target: {
          id: row.id,
          name: row.name,
          parentId: row.parent_id,
          path: row.path,
          fileCount: parseInt(row.file_count),
        },
      })),
    ];

    // Group IDs by scope for easy lookup
    const starredIds = {
      personal: {
        files: stars
          .filter((s) => s.scope === "personal" && s.targetType === "file")
          .map((s) => s.targetId),
        folders: stars
          .filter((s) => s.scope === "personal" && s.targetType === "folder")
          .map((s) => s.targetId),
      },
      room: {
        files: stars
          .filter((s) => s.scope === "room" && s.targetType === "file")
          .map((s) => s.targetId),
        folders: stars
          .filter((s) => s.scope === "room" && s.targetType === "folder")
          .map((s) => s.targetId),
      },
      project: {
        files: stars
          .filter((s) => s.scope === "project" && s.targetType === "file")
          .map((s) => s.targetId),
        folders: stars
          .filter((s) => s.scope === "project" && s.targetType === "folder")
          .map((s) => s.targetId),
      },
      // Combined for simple "is this starred?" checks
      all: {
        files: [
          ...new Set(
            stars.filter((s) => s.targetType === "file").map((s) => s.targetId)
          ),
        ],
        folders: [
          ...new Set(
            stars
              .filter((s) => s.targetType === "folder")
              .map((s) => s.targetId)
          ),
        ],
      },
    };

    res.json({ stars, starredIds, scope });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/stars
 * Star a file or folder with scope
 *
 * Body:
 * - targetType: 'file' | 'folder'
 * - targetId: UUID
 * - scope: 'personal' | 'room' | 'project' (default: 'personal')
 * - roomId: Required if scope='room'
 */
router.post("/", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { targetType, targetId, scope = "personal", roomId } = req.body;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    // User must be authenticated to star items
    if (!userId) {
      return res
        .status(401)
        .json({ error: "Authentication required to star items" });
    }

    // Validate targetType
    if (!targetType || !["file", "folder"].includes(targetType)) {
      return res
        .status(400)
        .json({ error: "targetType must be 'file' or 'folder'" });
    }
    if (!targetId) {
      return res.status(400).json({ error: "targetId is required" });
    }

    // Validate scope
    if (!["personal", "room", "project"].includes(scope)) {
      return res
        .status(400)
        .json({ error: "scope must be 'personal', 'room', or 'project'" });
    }

    // Room scope requires roomId
    if (scope === "room" && !roomId) {
      return res.status(400).json({ error: "roomId required for room scope" });
    }

    // Check project access
    if (!(await checkProjectAccess(pool, projectId, userId))) {
      return res.status(403).json({ error: "Access denied" });
    }

    // If room scope, verify user is in the room
    if (scope === "room") {
      const roomCheck = await pool.query(
        `SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2`,
        [roomId, userId]
      );
      if (roomCheck.rows.length === 0) {
        return res
          .status(403)
          .json({ error: "You must be a member of the room" });
      }
    }

    // Verify target exists in this project
    if (targetType === "file") {
      const fileCheck = await pool.query(
        `SELECT 1 FROM file_project_access 
         WHERE file_id = $1 AND project_id = $2`,
        [targetId, projectId]
      );
      if (fileCheck.rows.length === 0) {
        return res.status(404).json({ error: "File not found in project" });
      }
    } else {
      const folderCheck = await pool.query(
        `SELECT 1 FROM folders 
         WHERE id = $1 AND project_id = $2`,
        [targetId, projectId]
      );
      if (folderCheck.rows.length === 0) {
        return res.status(404).json({ error: "Folder not found" });
      }
    }

    // Create star
    const result = await pool.query(
      `INSERT INTO stars (user_id, project_id, target_type, target_id, scope, room_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [
        userId,
        projectId,
        targetType,
        targetId,
        scope,
        scope === "room" ? roomId : null,
      ]
    );

    res.status(201).json({
      starred: true,
      star: {
        id: result.rows[0].id,
        targetType,
        targetId,
        scope,
        roomId: scope === "room" ? roomId : null,
        createdAt: result.rows[0].created_at,
      },
    });
  } catch (error) {
    // Already starred in this scope
    if (error.code === "23505") {
      return res.status(409).json({ error: "Already starred in this scope" });
    }
    next(error);
  }
});

/**
 * DELETE /api/projects/:projectId/stars/:id
 * Remove a star by star ID
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    // User must be authenticated to delete stars
    if (!userId) {
      return res
        .status(401)
        .json({ error: "Authentication required to delete stars" });
    }

    // Delete star (only if belongs to user and project)
    const result = await pool.query(
      `DELETE FROM stars 
       WHERE id = $1 AND user_id = $2 AND project_id = $3
       RETURNING id`,
      [id, userId, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Star not found" });
    }

    res.json({ starred: false, deletedId: id });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/stars/toggle
 * Toggle star status (convenience endpoint)
 *
 * Body:
 * - targetType: 'file' | 'folder'
 * - targetId: UUID
 * - scope: 'personal' | 'room' | 'project' (default: 'personal')
 * - roomId: Required if scope='room'
 */
router.post("/toggle", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { targetType, targetId, scope = "personal", roomId } = req.body;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    // User must be authenticated to toggle stars
    if (!userId) {
      return res
        .status(401)
        .json({ error: "Authentication required to toggle stars" });
    }

    // Validate
    if (!targetType || !["file", "folder"].includes(targetType)) {
      return res
        .status(400)
        .json({ error: "targetType must be 'file' or 'folder'" });
    }
    if (!targetId) {
      return res.status(400).json({ error: "targetId is required" });
    }
    if (!["personal", "room", "project"].includes(scope)) {
      return res.status(400).json({ error: "Invalid scope" });
    }
    if (scope === "room" && !roomId) {
      return res.status(400).json({ error: "roomId required for room scope" });
    }

    // Check access
    if (!(await checkProjectAccess(pool, projectId, userId))) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if already starred in this scope
    const existing = await pool.query(
      `SELECT id FROM stars 
       WHERE user_id = $1 
         AND target_type = $2 
         AND target_id = $3
         AND scope = $4
         AND (room_id = $5 OR (room_id IS NULL AND $5 IS NULL))`,
      [userId, targetType, targetId, scope, scope === "room" ? roomId : null]
    );

    if (existing.rows.length > 0) {
      // Unstar
      await pool.query("DELETE FROM stars WHERE id = $1", [
        existing.rows[0].id,
      ]);
      return res.json({
        starred: false,
        targetType,
        targetId,
        scope,
        roomId: scope === "room" ? roomId : null,
        message: "Unstarred",
      });
    }

    // Verify target exists before starring
    if (targetType === "file") {
      const fileCheck = await pool.query(
        `SELECT 1 FROM file_project_access 
         WHERE file_id = $1 AND project_id = $2`,
        [targetId, projectId]
      );
      if (fileCheck.rows.length === 0) {
        return res.status(404).json({ error: "File not found in project" });
      }
    } else {
      const folderCheck = await pool.query(
        `SELECT 1 FROM folders 
         WHERE id = $1 AND project_id = $2`,
        [targetId, projectId]
      );
      if (folderCheck.rows.length === 0) {
        return res.status(404).json({ error: "Folder not found" });
      }
    }

    // If room scope, verify membership
    if (scope === "room") {
      const roomCheck = await pool.query(
        `SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2`,
        [roomId, userId]
      );
      if (roomCheck.rows.length === 0) {
        return res
          .status(403)
          .json({ error: "You must be a member of the room" });
      }
    }

    // Star
    const result = await pool.query(
      `INSERT INTO stars (user_id, project_id, target_type, target_id, scope, room_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        userId,
        projectId,
        targetType,
        targetId,
        scope,
        scope === "room" ? roomId : null,
      ]
    );

    res.json({
      starred: true,
      targetType,
      targetId,
      scope,
      roomId: scope === "room" ? roomId : null,
      starId: result.rows[0].id,
      message: "Starred",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
