// server/src/routes/filters.js
// API routes for saved filters (reusable filter configurations)
//
// Saved filters are SCOPE-BASED:
// - 'personal': Only visible to the owner
// - 'workspace': Visible to members of the workspace
// - 'project': Visible project-wide
//
// Endpoints:
// GET    /api/projects/:projectId/filters         - List filters (filtered by scope)
// POST   /api/projects/:projectId/filters         - Create a filter
// GET    /api/projects/:projectId/filters/:id     - Get single filter
// PATCH  /api/projects/:projectId/filters/:id     - Update a filter
// DELETE /api/projects/:projectId/filters/:id     - Delete a filter

const express = require("express");
const router = express.Router({ mergeParams: true });
const { createLogger } = require("../utils/logger");
const { getUser, getUserWorkspaceIds, checkProjectAccess } = require("../middleware/auth");

const log = createLogger("filters");

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/projects/:projectId/filters
 * List filters visible in current context
 *
 * Query params:
 * - scope: 'personal' | 'workspace' | 'project' | 'all' (default: 'all')
 * - workspaceId: Required if scope='workspace'
 */
router.get("/", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { scope = "all", workspaceId } = req.query;
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
      scopeFilter = `AND sf.scope = 'personal' AND sf.owner_id = $2`;
    } else if (scope === "workspace") {
      if (!workspaceId) {
        return res
          .status(400)
          .json({ error: "workspaceId required for workspace scope" });
      }
      scopeFilter = `AND sf.scope = 'workspace' AND sf.workspace_id = $${paramIndex}`;
      queryParams.push(workspaceId);
      paramIndex++;
    } else if (scope === "project") {
      scopeFilter = `AND sf.scope = 'project'`;
    } else {
      // 'all' - return all filters visible to this user
      // Personal (own) + Workspace (if member) + Project
      const userWorkspaceIds = await getUserWorkspaceIds(
        pool,
        projectId,
        user.id
      );

      if (userWorkspaceIds.length > 0) {
        scopeFilter = `AND (
          (sf.scope = 'personal' AND sf.owner_id = $2) OR
          (sf.scope = 'project') OR
          (sf.scope = 'workspace' AND sf.workspace_id = ANY($${paramIndex}))
        )`;
        queryParams.push(userWorkspaceIds);
        paramIndex++;
      } else {
        scopeFilter = `AND (
          (sf.scope = 'personal' AND sf.owner_id = $2) OR
          (sf.scope = 'project')
        )`;
      }
    }

    const result = await pool.query(
      `SELECT sf.*,
              u.display_name as owner_name,
              u.email as owner_email
       FROM saved_filters sf
       LEFT JOIN users u ON sf.owner_id = u.id
       WHERE sf.project_id = $1
         ${scopeFilter}
       ORDER BY sf.is_pinned DESC, sf.created_at DESC`,
      queryParams
    );

    const filters = result.rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      ownerId: row.owner_id,
      name: row.name,
      description: row.description,
      scope: row.scope,
      workspaceId: row.workspace_id,
      filterConfig: row.filter_config,
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

    res.json({ filters, count: filters.length, scope });
  } catch (error) {
    log.error("Failed to list filters:", error);
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/filters
 * Create a new saved filter
 *
 * Body:
 * - name: string (required)
 * - filter_config: object (required)
 * - description: string (optional)
 * - scope: 'personal' | 'workspace' | 'project' (default: 'personal')
 * - workspace_id: UUID (required if scope='workspace')
 * - is_pinned: boolean (default: false)
 */
router.post("/", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const {
      name,
      filter_config,
      description,
      scope = "personal",
      workspace_id,
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
    if (!filter_config || typeof filter_config !== "object") {
      return res
        .status(400)
        .json({ error: "filter_config is required and must be an object" });
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

    // Create filter
    const result = await pool.query(
      `INSERT INTO saved_filters (project_id, owner_id, name, description, scope, workspace_id, filter_config, is_pinned)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        projectId,
        user.id,
        name.trim(),
        description || null,
        scope,
        scope === "workspace" ? workspace_id : null,
        JSON.stringify(filter_config),
        is_pinned,
      ]
    );

    const filter = result.rows[0];

    // Broadcast to project members
    if (wsManager) {
      wsManager.broadcastToProject(projectId, {
        type: "filter:created",
        filter: {
          id: filter.id,
          name: filter.name,
          scope: filter.scope,
          createdBy: user.name || user.email,
        },
      });
    }

    log.info(
      `Filter created: ${filter.id} by ${user.email} in project ${projectId}`
    );

    res.status(201).json({
      filter: {
        id: filter.id,
        projectId: filter.project_id,
        ownerId: filter.owner_id,
        name: filter.name,
        description: filter.description,
        scope: filter.scope,
        workspaceId: filter.workspace_id,
        filterConfig: filter.filter_config,
        isPinned: filter.is_pinned,
        createdAt: filter.created_at,
        updatedAt: filter.updated_at,
        owner: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        isOwn: true,
      },
    });
  } catch (error) {
    log.error("Failed to create filter:", error);
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/filters/:id
 * Get a single filter by ID
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
      `SELECT sf.*,
              u.display_name as owner_name,
              u.email as owner_email
       FROM saved_filters sf
       LEFT JOIN users u ON sf.owner_id = u.id
       WHERE sf.id = $1 AND sf.project_id = $2`,
      [id, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Filter not found" });
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
        return res.status(403).json({ error: "Access denied to this filter" });
      }
    } else if (!canAccess) {
      return res.status(403).json({ error: "Access denied to this filter" });
    }

    res.json({
      filter: {
        id: row.id,
        projectId: row.project_id,
        ownerId: row.owner_id,
        name: row.name,
        description: row.description,
        scope: row.scope,
        workspaceId: row.workspace_id,
        filterConfig: row.filter_config,
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
    log.error("Failed to get filter:", error);
    next(error);
  }
});

/**
 * PATCH /api/projects/:projectId/filters/:id
 * Update a filter (owner only)
 *
 * Body (all optional):
 * - name: string
 * - description: string
 * - filter_config: object
 * - scope: 'personal' | 'workspace' | 'project'
 * - workspace_id: UUID
 * - is_pinned: boolean
 */
router.patch("/:id", async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const { name, description, filter_config, scope, workspace_id, is_pinned } =
      req.body;
    const user = getUser(req);
    const { pool, wsManager } = req.app.locals;

    // Check project access
    const access = await checkProjectAccess(pool, projectId, user.id);
    if (!access) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get existing filter
    const existing = await pool.query(
      "SELECT * FROM saved_filters WHERE id = $1 AND project_id = $2",
      [id, projectId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Filter not found" });
    }

    // Only owner can update
    if (existing.rows[0].owner_id !== user.id) {
      return res
        .status(403)
        .json({ error: "Only the owner can update this filter" });
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

    if (filter_config !== undefined) {
      if (typeof filter_config !== "object") {
        return res
          .status(400)
          .json({ error: "filter_config must be an object" });
      }
      updates.push(`filter_config = $${paramCount++}`);
      values.push(JSON.stringify(filter_config));
    }

    if (scope !== undefined) {
      if (!["personal", "workspace", "project"].includes(scope)) {
        return res.status(400).json({ error: "Invalid scope" });
      }
      updates.push(`scope = $${paramCount++}`);
      values.push(scope);
    }

    if (workspace_id !== undefined) {
      // If setting workspace_id, verify access
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

    if (is_pinned !== undefined) {
      updates.push(`is_pinned = $${paramCount++}`);
      values.push(is_pinned);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE saved_filters SET ${updates.join(
        ", "
      )} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    const filter = result.rows[0];

    // Broadcast to project members
    if (wsManager) {
      wsManager.broadcastToProject(projectId, {
        type: "filter:updated",
        filter: {
          id: filter.id,
          name: filter.name,
          scope: filter.scope,
          updatedBy: user.name || user.email,
        },
      });
    }

    log.info(`Filter updated: ${filter.id} by ${user.email}`);

    res.json({
      filter: {
        id: filter.id,
        projectId: filter.project_id,
        ownerId: filter.owner_id,
        name: filter.name,
        description: filter.description,
        scope: filter.scope,
        workspaceId: filter.workspace_id,
        filterConfig: filter.filter_config,
        isPinned: filter.is_pinned,
        createdAt: filter.created_at,
        updatedAt: filter.updated_at,
        isOwn: true,
      },
    });
  } catch (error) {
    log.error("Failed to update filter:", error);
    next(error);
  }
});

/**
 * DELETE /api/projects/:projectId/filters/:id
 * Delete a filter (owner only)
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const user = getUser(req);
    const { pool, wsManager } = req.app.locals;

    // Check project access
    const access = await checkProjectAccess(pool, projectId, user.id);
    if (!access) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get existing filter
    const existing = await pool.query(
      "SELECT * FROM saved_filters WHERE id = $1 AND project_id = $2",
      [id, projectId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Filter not found" });
    }

    // Only owner can delete
    if (existing.rows[0].owner_id !== user.id) {
      return res
        .status(403)
        .json({ error: "Only the owner can delete this filter" });
    }

    const filterName = existing.rows[0].name;

    // Delete filter
    await pool.query("DELETE FROM saved_filters WHERE id = $1", [id]);

    // Broadcast to project members
    if (wsManager) {
      wsManager.broadcastToProject(projectId, {
        type: "filter:deleted",
        filterId: id,
        deletedBy: user.name || user.email,
      });
    }

    log.info(`Filter deleted: ${id} (${filterName}) by ${user.email}`);

    res.json({ success: true, message: "Filter deleted", deletedId: id });
  } catch (error) {
    log.error("Failed to delete filter:", error);
    next(error);
  }
});

module.exports = router;
