// server/src/routes/folders.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const { getUserId } = require("../middleware/auth");
const { checkProjectAccess } = require("../middleware/auth");

function buildFolderTree(folders, fileCountMap = {}) {
  const folderMap = new Map();
  const roots = [];

  folders.forEach((f) => {
    folderMap.set(f.id, {
      id: f.id,
      name: f.name,
      parentId: f.parent_id,
      path: f.path || "/",
      fileCount: fileCountMap[f.id] || 0,
      createdBy: f.created_by
        ? { id: f.created_by, name: f.creator_name }
        : null,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
      children: [],
    });
  });

  folders.forEach((f) => {
    const folder = folderMap.get(f.id);
    if (f.parent_id && folderMap.has(f.parent_id)) {
      folderMap.get(f.parent_id).children.push(folder);
    } else {
      roots.push(folder);
    }
  });

  return roots;
}

// GET /api/projects/:projectId/folders
router.get("/", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    const access = await checkProjectAccess(pool, projectId, userId);
    if (!access) {
      return res.status(403).json({ error: "Access denied" });
    }

    const foldersResult = await pool.query(
      `SELECT f.*, u.display_name as creator_name, get_folder_path(f.id) as path
       FROM folders f
       LEFT JOIN users u ON f.created_by = u.id
       WHERE f.project_id = $1
       ORDER BY f.name`,
      [projectId]
    );

    const countsResult = await pool.query(
      `SELECT folder_id, COUNT(*) as file_count
       FROM file_project_access
       WHERE project_id = $1 AND folder_id IS NOT NULL
       GROUP BY folder_id`,
      [projectId]
    );

    const fileCountMap = {};
    countsResult.rows.forEach((row) => {
      fileCountMap[row.folder_id] = parseInt(row.file_count);
    });

    const tree = buildFolderTree(foldersResult.rows, fileCountMap);
    res.json({ folders: tree });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:projectId/folders
router.post("/", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, parentId } = req.body;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Folder name is required" });
    }

    if (name.length > 255) {
      return res.status(400).json({ error: "Folder name too long (max 255)" });
    }

    const access = await checkProjectAccess(pool, projectId, userId);
    if (!access || access === "viewer") {
      return res.status(403).json({ error: "Permission denied" });
    }

    if (parentId) {
      const parentCheck = await pool.query(
        "SELECT id FROM folders WHERE id = $1 AND project_id = $2",
        [parentId, projectId]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(400).json({ error: "Parent folder not found" });
      }
    }

    const result = await pool.query(
      `INSERT INTO folders (project_id, parent_id, name, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [projectId, parentId || null, name.trim(), userId]
    );

    const folder = result.rows[0];
    const pathResult = await pool.query("SELECT get_folder_path($1) as path", [
      folder.id,
    ]);

    res.status(201).json({
      folder: {
        id: folder.id,
        name: folder.name,
        parentId: folder.parent_id,
        path: pathResult.rows[0].path,
        fileCount: 0,
        createdAt: folder.created_at,
      },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ error: "A folder with this name already exists here" });
    }
    next(error);
  }
});

// GET /api/projects/:projectId/folders/:id
router.get("/:id", async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    const access = await checkProjectAccess(pool, projectId, userId);
    if (!access) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await pool.query(
      `SELECT f.*, u.display_name as creator_name,
              get_folder_path(f.id) as path,
              count_files_in_folder(f.id) as file_count
       FROM folders f
       LEFT JOIN users u ON f.created_by = u.id
       WHERE f.id = $1 AND f.project_id = $2`,
      [id, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Folder not found" });
    }

    const f = result.rows[0];
    res.json({
      folder: {
        id: f.id,
        name: f.name,
        parentId: f.parent_id,
        path: f.path,
        fileCount: parseInt(f.file_count),
        createdBy: { id: f.created_by, name: f.creator_name },
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/projects/:projectId/folders/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const { name, parentId } = req.body;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    const access = await checkProjectAccess(pool, projectId, userId);
    if (!access || access === "viewer") {
      return res.status(403).json({ error: "Permission denied" });
    }

    const existing = await pool.query(
      "SELECT * FROM folders WHERE id = $1 AND project_id = $2",
      [id, projectId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Folder not found" });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "Folder name cannot be empty" });
      }
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }

    if (parentId !== undefined) {
      if (parentId === id) {
        return res
          .status(400)
          .json({ error: "Cannot move folder into itself" });
      }

      if (parentId) {
        const circularCheck = await pool.query(
          `WITH RECURSIVE ancestors AS (
             SELECT id, parent_id FROM folders WHERE id = $1
             UNION ALL
             SELECT f.id, f.parent_id FROM folders f
             INNER JOIN ancestors a ON f.id = a.parent_id
           )
           SELECT 1 FROM ancestors WHERE id = $2`,
          [parentId, id]
        );
        if (circularCheck.rows.length > 0) {
          return res
            .status(400)
            .json({ error: "Cannot create circular folder structure" });
        }

        const parentCheck = await pool.query(
          "SELECT id FROM folders WHERE id = $1 AND project_id = $2",
          [parentId, projectId]
        );
        if (parentCheck.rows.length === 0) {
          return res.status(400).json({ error: "Parent folder not found" });
        }
      }

      updates.push(`parent_id = $${paramCount++}`);
      values.push(parentId || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE folders SET ${updates.join(
        ", "
      )} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    const pathResult = await pool.query("SELECT get_folder_path($1) as path", [
      id,
    ]);

    const folder = result.rows[0];
    res.json({
      folder: {
        id: folder.id,
        name: folder.name,
        parentId: folder.parent_id,
        path: pathResult.rows[0].path,
        updatedAt: folder.updated_at,
      },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ error: "A folder with this name already exists here" });
    }
    next(error);
  }
});

// DELETE /api/projects/:projectId/folders/:id
router.delete("/:id", async (req, res, next) => {
  const client = await req.app.locals.pool.connect();

  try {
    const { projectId, id } = req.params;
    const { cascade } = req.query;
    const userId = getUserId(req);

    await client.query("BEGIN");

    const access = await checkProjectAccess(client, projectId, userId);
    if (!access || !["owner", "admin", "editor"].includes(access)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Permission denied" });
    }

    const existing = await client.query(
      "SELECT * FROM folders WHERE id = $1 AND project_id = $2",
      [id, projectId]
    );
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Folder not found" });
    }

    const folder = existing.rows[0];

    if (cascade === "true") {
      await client.query(
        `WITH RECURSIVE folder_tree AS (
           SELECT id FROM folders WHERE id = $1
           UNION ALL
           SELECT f.id FROM folders f INNER JOIN folder_tree ft ON f.parent_id = ft.id
         )
         UPDATE file_project_access SET folder_id = NULL
         WHERE folder_id IN (SELECT id FROM folder_tree)`,
        [id]
      );

      await client.query(
        `WITH RECURSIVE folder_tree AS (
           SELECT id FROM folders WHERE id = $1
           UNION ALL
           SELECT f.id FROM folders f INNER JOIN folder_tree ft ON f.parent_id = ft.id
         )
         DELETE FROM folders WHERE id IN (SELECT id FROM folder_tree)`,
        [id]
      );
    } else {
      await client.query(
        `UPDATE file_project_access SET folder_id = $1 WHERE folder_id = $2`,
        [folder.parent_id, id]
      );

      await client.query(
        `UPDATE folders SET parent_id = $1 WHERE parent_id = $2`,
        [folder.parent_id, id]
      );

      await client.query("DELETE FROM folders WHERE id = $1", [id]);
    }

    await client.query("COMMIT");
    res.json({ success: true, message: "Folder deleted" });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
