// server/src/routes/views.js
// View configuration management for v2.0 server-authority architecture
// Views are persistent snapshots of visualization state

const express = require("express");
const router = express.Router();
const { getUser } = require("../middleware/auth");
const thumbnailService = require("../services/thumbnailService");
const { createLogger } = require("../utils/logger");

const log = createLogger("views");

const CAMERA_POSITION_DELTA_THRESHOLD = 0.2;
const CAMERA_FOCAL_POINT_DELTA_THRESHOLD = 0.2;
const CAMERA_VIEW_UP_ANGLE_THRESHOLD_DEGREES = 2;
const CAMERA_PARALLEL_SCALE_DELTA_THRESHOLD = 0.05;
const CAMERA_VIEW_ANGLE_THRESHOLD_DEGREES = 0.5;
const CAMERA_CLIPPING_RANGE_DELTA_THRESHOLD = 0.5;

function summarizeFieldChanges(changedFields) {
  if (changedFields.length === 0) {
    return "Updated view state";
  }
  if (changedFields.length === 1) {
    return `Updated ${changedFields[0]}`;
  }
  return `Updated ${changedFields.slice(0, 3).join(", ")}`;
}

function deriveUpdateAction(changedFields) {
  if (changedFields.includes("camera")) {
    return {
      actionType: "view:camera-update",
      actionIntent: "explore_view",
    };
  }

  if (changedFields.includes("filters")) {
    return {
      actionType: "view:filter-update",
      actionIntent: "refine_filters",
    };
  }

  if (changedFields.includes("widgets")) {
    return {
      actionType: "view:widget-update",
      actionIntent: "adjust_tools",
    };
  }

  return {
    actionType: "view:update",
    actionIntent: "refine_analysis",
  };
}

function parseCameraState(value) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return null;
    }
  }
  return typeof value === "object" ? value : null;
}

function vectorDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return Number.POSITIVE_INFINITY;
  }

  let sum = 0;
  for (let index = 0; index < a.length; index += 1) {
    const aValue = Number(a[index]);
    const bValue = Number(b[index]);
    if (!Number.isFinite(aValue) || !Number.isFinite(bValue)) {
      return Number.POSITIVE_INFINITY;
    }
    sum += (aValue - bValue) ** 2;
  }

  return Math.sqrt(sum);
}

function vectorAngleDegrees(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return Number.POSITIVE_INFINITY;
  }

  let dot = 0;
  let aMagnitude = 0;
  let bMagnitude = 0;

  for (let index = 0; index < a.length; index += 1) {
    const aValue = Number(a[index]);
    const bValue = Number(b[index]);
    if (!Number.isFinite(aValue) || !Number.isFinite(bValue)) {
      return Number.POSITIVE_INFINITY;
    }
    dot += aValue * bValue;
    aMagnitude += aValue * aValue;
    bMagnitude += bValue * bValue;
  }

  if (aMagnitude === 0 || bMagnitude === 0) {
    return Number.POSITIVE_INFINITY;
  }

  const cosine = Math.min(1, Math.max(-1, dot / (Math.sqrt(aMagnitude) * Math.sqrt(bMagnitude))));
  return Math.acos(cosine) * (180 / Math.PI);
}

function hasMeaningfulCameraChange(beforeCamera, afterCamera) {
  const previous = parseCameraState(beforeCamera);
  const next = parseCameraState(afterCamera);

  if (!previous || !next) {
    return true;
  }

  const positionDelta = vectorDistance(previous.position, next.position);
  if (positionDelta > CAMERA_POSITION_DELTA_THRESHOLD) {
    return true;
  }

  const focalPointDelta = vectorDistance(previous.focalPoint, next.focalPoint);
  if (focalPointDelta > CAMERA_FOCAL_POINT_DELTA_THRESHOLD) {
    return true;
  }

  const viewUpAngleDelta = vectorAngleDegrees(previous.viewUp, next.viewUp);
  if (viewUpAngleDelta > CAMERA_VIEW_UP_ANGLE_THRESHOLD_DEGREES) {
    return true;
  }

  const previousParallelScale = Number(previous.parallelScale);
  const nextParallelScale = Number(next.parallelScale);
  if (
    Number.isFinite(previousParallelScale) &&
    Number.isFinite(nextParallelScale) &&
    Math.abs(previousParallelScale - nextParallelScale) > CAMERA_PARALLEL_SCALE_DELTA_THRESHOLD
  ) {
    return true;
  }

  const previousViewAngle = Number(previous.viewAngle);
  const nextViewAngle = Number(next.viewAngle);
  if (
    Number.isFinite(previousViewAngle) &&
    Number.isFinite(nextViewAngle) &&
    Math.abs(previousViewAngle - nextViewAngle) > CAMERA_VIEW_ANGLE_THRESHOLD_DEGREES
  ) {
    return true;
  }

  const clippingRangeDelta = vectorDistance(
    previous.clippingRange,
    next.clippingRange
  );
  if (clippingRangeDelta > CAMERA_CLIPPING_RANGE_DELTA_THRESHOLD) {
    return true;
  }

  return false;
}

// ============================================================================
// VIEW ENDPOINTS
// ============================================================================

/**
 * GET /api/views
 * List views with filters
 */
router.get("/", async (req, res, next) => {
  try {
    const user = getUser(req);
    const { pool } = req.app.locals;
    const {
      fileId,
      projectId,
      branchId,
      visibility,
      shared,
      status = "active",
      limit = 50,
      offset = 0,
    } = req.query;

    let query = `
      SELECT v.*,
             u.email as owner_email,
             d.filename as file_name
      FROM view_configurations v
      LEFT JOIN users u ON v.owner_user_id::uuid = u.id
      LEFT JOIN datasets d ON v.dataset_id = d.id
      WHERE v.status = $1
    `;
    const values = [status];
    let paramIndex = 2;

    // Filter by file
    if (fileId) {
      query += ` AND v.dataset_id = $${paramIndex++}`;
      values.push(fileId);
    }

    // Filter by branch
    if (branchId) {
      query += ` AND v.branch_id = $${paramIndex++}`;
      values.push(branchId);
    }

    // Filter shared views
    if (shared === "true") {
      query += ` AND v.is_shared = true`;
    }

    // Visibility filter
    if (visibility) {
      query += ` AND v.visibility = $${paramIndex++}`;
      values.push(visibility);
    } else {
      // Default: show user's views + public/project visible
      query += ` AND (
        v.owner_user_id = $${paramIndex++} OR
        v.visibility IN ('public', 'project')
      )`;
      values.push(user.id);
    }

    query += ` ORDER BY v.updated_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    values.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, values);

    res.json({
      views: result.rows,
      count: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/views/:id
 * Get single view details
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;

    const result = await pool.query(
      `
      SELECT v.*,
             u.email as owner_email,
             d.filename as file_name,
             fv.version_number as file_version
      FROM view_configurations v
      LEFT JOIN users u ON v.owner_user_id::uuid = u.id
      LEFT JOIN datasets d ON v.dataset_id = d.id
      LEFT JOIN file_versions fv ON v.file_version_id = fv.id
      WHERE v.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    res.json({ view: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/views
 * Create a new view configuration
 */
router.post("/", async (req, res, next) => {
  const { pool, wsManager, provenanceService } = req.app.locals;

  try {
    const user = getUser(req);
    const {
      fileId,
      projectId,
      branchId,
      name = "Untitled View",
      description,
      camera,
      filters,
      widgets,
      colorMaps,
      annotationsVisible = true,
      visibility = "private",
      isShared = false,
      forkedFrom,
    } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: "fileId is required" });
    }

    // Verify file exists
    const fileCheck = await pool.query(
      "SELECT id, current_version_id FROM datasets WHERE id = $1 AND status = 'active'",
      [fileId]
    );

    if (fileCheck.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileVersionId = fileCheck.rows[0].current_version_id;

    // Insert view
    const result = await pool.query(
      `
      INSERT INTO view_configurations (
        project_id, dataset_id, file_version_id, branch_id,
        name, description,
        camera, filters, widgets, color_maps,
        annotations_visible, visibility, is_shared,
        owner_user_id, saved_by_user, forked_from
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, $15)
      RETURNING *
    `,
      [
        projectId || null,
        fileId,
        fileVersionId,
        branchId || null,
        name,
        description || null,
        camera ? JSON.stringify(camera) : null,
        filters ? JSON.stringify(filters) : null,
        widgets ? JSON.stringify(widgets) : null,
        colorMaps ? JSON.stringify(colorMaps) : null,
        annotationsVisible,
        visibility,
        isShared,
        user.id,
        forkedFrom ? JSON.stringify(forkedFrom) : null,
      ]
    );

    const view = result.rows[0];

    if (view.project_id && provenanceService) {
      const transition = await provenanceService.captureViewTransition({
        projectId: view.project_id,
        view,
        user,
        actionType: "view:create",
        actionIntent: "create_view",
        actionSummary: `Created view "${view.name}"`,
        metadata: {
          datasetId: view.dataset_id,
          branchId: view.branch_id,
        },
        snapshotName: `${view.name} Initial State`,
        snapshotDescription: `Initial persisted state for ${view.name}`,
      });

      if (wsManager) {
        wsManager.provenanceUpdated(view.project_id, {
          viewId: view.id,
          actionType: transition.history.action_type,
          historyId: transition.history.id,
          snapshotId: transition.snapshot.id,
        });
        wsManager.analysisSnapshotCreated(view.project_id, transition.snapshot);
      }
    }

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "view:create",
        projectId,
        entityType: "view",
        entityId: view.id,
        after: { name, visibility, fileId },
      });
    }

    // Broadcast view creation to all clients in project
    // (for multi-client sync, not just shared views)
    if (wsManager) {
      if (projectId) {
        wsManager.viewCreated(projectId, view);
      } else {
        // Find project from file access
        const projects = await pool.query(
          "SELECT project_id FROM file_project_access WHERE file_id = $1",
          [fileId]
        );
        for (const row of projects.rows) {
          wsManager.viewCreated(row.project_id, view);
        }
      }
    }

    // Queue server-side thumbnail generation for the new view
    // IMPORTANT: Delay initial thumbnail generation by 5 seconds to allow
    // the client time to set up initial camera state. Without this delay,
    // the thumbnail is captured before the user has panned/zoomed, resulting
    // in the default view instead of their actual view state.
    //
    // Using queueThumbnailJobDebounced ensures that if the user updates
    // the view's camera before this runs, the debounce mechanism will
    // prevent duplicate jobs.
    setTimeout(() => {
      thumbnailService
        .queueThumbnailJobDebounced({
          fileId,
          pool, // IMPORTANT: Pass pool so handler_type can be looked up
          viewId: view.id,
          projectId: projectId || null,
          priority: 4, // Slightly lower priority than immediate requests
        })
        .then((job) => {
          if (job) {
            log.debug(`Initial thumbnail queued for view ${view.id}`);
          } else {
            log.debug(
              `Initial thumbnail for view ${view.id} debounced (camera update already queued)`
            );
          }
        })
        .catch((err) => {
          log.warn(
            `Failed to queue thumbnail job for view ${view.id}: ${err.message}`
          );
        });
    }, 5000); // 5 second delay

    res.status(201).json({
      success: true,
      view,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/views/:id
 * Update a view configuration
 */
router.put("/:id", async (req, res, next) => {
  const { pool, wsManager, provenanceService } = req.app.locals;

  try {
    const { id } = req.params;
    const user = getUser(req);
    const updates = req.body;

    // Get existing view
    const existing = await pool.query(
      "SELECT * FROM view_configurations WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const beforeState = existing.rows[0];
    const changedFields = [];

    // Build dynamic update query
    const allowedFields = [
      "name",
      "description",
      "camera",
      "filters",
      "widgets",
      "color_maps",
      "cursor_config",
      "annotation_display",
      "annotations_visible",
      "visibility",
      "is_shared",
      "status",
      "active_instance_count",
      "links",
      "broadcast",
      "following",
      "snapshots",
      "applied_presets",
    ];

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      // Map camelCase to snake_case
      const dbField = field.replace(/([A-Z])/g, "_$1").toLowerCase();
      const bodyField = field;

      if (updates[bodyField] !== undefined) {
        let value = updates[bodyField];
        // JSON fields need stringification
        const jsonFields = [
          "camera",
          "filters",
          "widgets",
          "colorMaps",
          "color_maps",
          "cursor_config",
          "annotation_display",
          "links",
          "broadcast",
          "following",
          "snapshots",
          "applied_presets",
        ];
        if (jsonFields.includes(bodyField) && typeof value === "object") {
          value = JSON.stringify(value);
        }
        setClauses.push(`${dbField} = $${paramIndex++}`);
        values.push(value);
        changedFields.push(bodyField);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    // Add tracking fields
    setClauses.push(`updated_at = NOW()`);

    // Add WHERE clause
    values.push(id);

    const result = await pool.query(
      `
      UPDATE view_configurations
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      values
    );

    const view = result.rows[0];
    const { actionType, actionIntent } = deriveUpdateAction(changedFields);
    const actionSummary = `${summarizeFieldChanges(changedFields)} on "${view.name}"`;

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "view:update",
        entityType: "view",
        entityId: id,
        before: { name: beforeState.name },
        after: { name: view.name },
      });
    }

    const cameraOnlyUpdate =
      changedFields.length === 1 && changedFields.includes("camera");
    const shouldCaptureCameraChange =
      !cameraOnlyUpdate || hasMeaningfulCameraChange(beforeState.camera, view.camera);

    if (view.project_id && provenanceService && shouldCaptureCameraChange) {
      const transition = await provenanceService.captureViewTransition({
        projectId: view.project_id,
        view,
        user,
        actionType,
        actionIntent,
        actionSummary,
        metadata: {
          changedFields,
          previousName: beforeState.name,
        },
        snapshotName: `${view.name} Update`,
        snapshotDescription: actionSummary,
      });

      if (wsManager) {
        wsManager.provenanceUpdated(view.project_id, {
          viewId: view.id,
          actionType: transition.history.action_type,
          historyId: transition.history.id,
          snapshotId: transition.snapshot.id,
        });
        wsManager.analysisSnapshotCreated(view.project_id, transition.snapshot);
      }
    } else if (cameraOnlyUpdate) {
      log.debug(`Skipped low-signal camera provenance event for view ${view.id}`);
    }

    // Broadcast update to all clients in the project
    // Even private views need sync for the owner across devices
    if (wsManager && view.project_id) {
      wsManager.viewUpdated(view.project_id, view);
    } else if (wsManager && view.dataset_id) {
      // Fallback: find project from file access table
      const projects = await pool.query(
        "SELECT project_id FROM file_project_access WHERE file_id = $1",
        [view.dataset_id]
      );

      for (const row of projects.rows) {
        wsManager.viewUpdated(row.project_id, view);
      }
    }

    // Queue thumbnail regeneration if visual state changed
    // These fields affect how the visualization looks in the thumbnail
    const visualFields = [
      "camera",
      "filters",
      "widgets",
      "colorMaps",
      "color_maps",
    ];
    const visualStateChanged = visualFields.some(
      (field) => updates[field] !== undefined
    );

    if (visualStateChanged && view.dataset_id) {
      // Use debounced queuing to avoid excessive regeneration during rapid edits
      thumbnailService
        .queueThumbnailJobDebounced({
          fileId: view.dataset_id,
          pool,
          viewId: id,
          priority: 3, // Lower priority than user-initiated requests
        })
        .then((job) => {
          if (job) {
            log.debug(
              `Queued thumbnail regeneration for view ${id} after state change`
            );
          } else {
            log.debug(`Thumbnail regeneration for view ${id} debounced`);
          }
        })
        .catch((err) => {
          log.warn(
            `Failed to queue thumbnail regeneration for view ${id}: ${err.message}`
          );
        });
    }

    res.json({
      success: true,
      view,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/views/:id
 * Delete a view (soft delete)
 */
router.delete("/:id", async (req, res, next) => {
  const { pool, wsManager, provenanceService } = req.app.locals;

  try {
    const { id } = req.params;
    const user = getUser(req);

    // Get view info
    const existing = await pool.query(
      "SELECT * FROM view_configurations WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const view = existing.rows[0];

    // Soft delete
    await pool.query(
      "UPDATE view_configurations SET status = 'archived', updated_at = NOW() WHERE id = $1",
      [id]
    );

    if (view.project_id && provenanceService) {
      const archivedView = {
        ...view,
        status: "archived",
      };
      const transition = await provenanceService.captureViewTransition({
        projectId: view.project_id,
        view: archivedView,
        user,
        actionType: "view:delete",
        actionIntent: "remove_view",
        actionSummary: `Archived view "${view.name}"`,
        metadata: {
          previousStatus: view.status,
          nextStatus: "archived",
        },
        snapshotName: `${view.name} Archived`,
        snapshotDescription: `Final archived state for ${view.name}`,
      });

      if (wsManager) {
        wsManager.provenanceUpdated(view.project_id, {
          viewId: view.id,
          actionType: transition.history.action_type,
          historyId: transition.history.id,
          snapshotId: transition.snapshot.id,
        });
        wsManager.analysisSnapshotCreated(view.project_id, transition.snapshot);
      }
    }

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "view:delete",
        entityType: "view",
        entityId: id,
        before: { name: view.name, status: view.status },
        after: { status: "archived" },
      });
    }

    // Broadcast deletion
    if (view.is_shared && wsManager) {
      const projects = await pool.query(
        "SELECT project_id FROM file_project_access WHERE file_id = $1",
        [view.dataset_id]
      );

      for (const row of projects.rows) {
        wsManager.viewDeleted(row.project_id, id);
      }
    }

    res.json({ success: true, message: "View deleted" });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/views/:id/duplicate
 * Create a copy of a view
 */
router.post("/:id/duplicate", async (req, res, next) => {
  const { pool, provenanceService, wsManager } = req.app.locals;

  try {
    const { id } = req.params;
    const user = getUser(req);
    const { name } = req.body;

    // Get original view
    const original = await pool.query(
      "SELECT * FROM view_configurations WHERE id = $1",
      [id]
    );

    if (original.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const source = original.rows[0];

    // Create duplicate
    const result = await pool.query(
      `
      INSERT INTO view_configurations (
        project_id, dataset_id, file_version_id, branch_id,
        name, description,
        camera, filters, widgets, color_maps,
        annotations_visible, visibility, is_shared,
        owner_user_id, saved_by_user
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'private', false, $12, true)
      RETURNING *
    `,
      [
        source.project_id || null,
        source.dataset_id,
        source.file_version_id,
        source.branch_id,
        name || `${source.name} (Copy)`,
        source.description,
        source.camera,
        source.filters,
        source.widgets,
        source.color_maps,
        source.annotations_visible,
        user.id,
      ]
    );

    const duplicatedView = result.rows[0];

    if (duplicatedView.project_id && provenanceService) {
      const transition = await provenanceService.captureViewTransition({
        projectId: duplicatedView.project_id,
        view: duplicatedView,
        user,
        actionType: "view:duplicate",
        actionIntent: "branch_analysis",
        actionSummary: `Duplicated view "${source.name}" into "${duplicatedView.name}"`,
        metadata: {
          sourceViewId: source.id,
          sourceViewName: source.name,
        },
        snapshotName: `${duplicatedView.name} Initial State`,
        snapshotDescription: `Initial state for duplicated view ${duplicatedView.name}`,
      });

      if (wsManager) {
        wsManager.provenanceUpdated(duplicatedView.project_id, {
          viewId: duplicatedView.id,
          actionType: transition.history.action_type,
          historyId: transition.history.id,
          snapshotId: transition.snapshot.id,
        });
        wsManager.analysisSnapshotCreated(
          duplicatedView.project_id,
          transition.snapshot
        );
      }
    }

    res.status(201).json({
      success: true,
      view: duplicatedView,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/views/:id/share
 * Share a view with project or make public
 */
router.post("/:id/share", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { id } = req.params;
    const { visibility = "project", projectId } = req.body;

    // Update view
    const result = await pool.query(
      `
      UPDATE view_configurations
      SET visibility = $1, is_shared = true, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
      [visibility, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const view = result.rows[0];

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "view:share",
        projectId,
        entityType: "view",
        entityId: id,
        details: { visibility },
      });
    }

    // Broadcast that view was shared
    if (projectId && wsManager) {
      wsManager.viewCreated(projectId, view); // Appears as "new" to other users
    }

    res.json({
      success: true,
      view,
      message: `View shared with visibility: ${visibility}`,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GRANULAR SHARING ENDPOINTS
// ============================================================================

/**
 * GET /api/views/:id/shares
 * Get list of users this view is shared with
 */
router.get("/:id/shares", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const user = getUser(req);

    // Get view with sharing info
    const result = await pool.query(
      `
      SELECT v.id, v.name, v.owner_user_id, v.shared_with
      FROM view_configurations v
      WHERE v.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const view = result.rows[0];

    // Check permission (owner or has share access)
    const sharedWith = view.shared_with || [];
    const hasAccess =
      view.owner_user_id === user.id ||
      sharedWith.some((share) => share.userId === user.id);

    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: "You don't have access to this view" });
    }

    res.json({
      shares: sharedWith,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/views/:id/shares
 * Add or update shares for a view
 */
router.post("/:id/shares", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { id } = req.params;
    const user = getUser(req);
    const { added = [], updated = [], removed = [] } = req.body;

    // Get existing view
    const existing = await pool.query(
      "SELECT * FROM view_configurations WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const view = existing.rows[0];

    // Check permission (owner only for now)
    if (view.owner_user_id !== user.id) {
      return res
        .status(403)
        .json({ error: "Only the owner can modify sharing settings" });
    }

    // Get current shares
    let sharedWith = view.shared_with || [];

    // Process removals
    for (const userId of removed) {
      sharedWith = sharedWith.filter((share) => share.userId !== userId);
    }

    // Process additions
    for (const newShare of added) {
      // Remove if already exists (will be re-added with new settings)
      sharedWith = sharedWith.filter(
        (share) => share.userId !== newShare.userId
      );
      // Add new share
      sharedWith.push({
        userId: newShare.userId,
        permission: newShare.permission || "viewer",
        addedAt: new Date().toISOString(),
        addedBy: user.id,
      });
    }

    // Process updates
    for (const updatedShare of updated) {
      const index = sharedWith.findIndex(
        (share) => share.userId === updatedShare.userId
      );
      if (index !== -1) {
        sharedWith[index] = {
          ...sharedWith[index],
          permission: updatedShare.permission || sharedWith[index].permission,
        };
      }
    }

    // Update database
    const result = await pool.query(
      `
      UPDATE view_configurations
      SET shared_with = $1, is_shared = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `,
      [JSON.stringify(sharedWith), sharedWith.length > 0, id]
    );

    const updatedView = result.rows[0];

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "view:update_shares",
        entityType: "view",
        entityId: id,
        details: {
          added: added.length,
          updated: updated.length,
          removed: removed.length,
        },
      });
    }

    // Broadcast update to all clients in the project
    if (wsManager && view.dataset_id) {
      const projects = await pool.query(
        "SELECT project_id FROM file_project_access WHERE file_id = $1",
        [view.dataset_id]
      );

      for (const row of projects.rows) {
        wsManager.viewUpdated(row.project_id, updatedView);
      }
    }

    res.json({
      success: true,
      shares: sharedWith,
      view: updatedView,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/views/:id/shares/:userId
 * Remove a specific user's access to a view
 */
router.delete("/:id/shares/:userId", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { id, userId } = req.params;
    const user = getUser(req);

    // Get existing view
    const existing = await pool.query(
      "SELECT * FROM view_configurations WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const view = existing.rows[0];

    // Check permission (owner only)
    if (view.owner_user_id !== user.id) {
      return res
        .status(403)
        .json({ error: "Only the owner can modify sharing settings" });
    }

    // Remove user from shared_with
    let sharedWith = view.shared_with || [];
    sharedWith = sharedWith.filter((share) => share.userId !== userId);

    // Update database
    const result = await pool.query(
      `
      UPDATE view_configurations
      SET shared_with = $1, is_shared = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `,
      [JSON.stringify(sharedWith), sharedWith.length > 0, id]
    );

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "view:remove_share",
        entityType: "view",
        entityId: id,
        details: { removedUserId: userId },
      });
    }

    // Broadcast update
    if (wsManager && view.dataset_id) {
      const projects = await pool.query(
        "SELECT project_id FROM file_project_access WHERE file_id = $1",
        [view.dataset_id]
      );

      for (const row of projects.rows) {
        wsManager.viewUpdated(row.project_id, result.rows[0]);
      }
    }

    res.json({
      success: true,
      message: "Share removed",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/views/:id/stop-sharing
 * Remove all shares and make view private
 */
router.post("/:id/stop-sharing", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { id } = req.params;
    const user = getUser(req);

    // Get existing view
    const existing = await pool.query(
      "SELECT * FROM view_configurations WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const view = existing.rows[0];

    // Check permission (owner only)
    if (view.owner_user_id !== user.id) {
      return res
        .status(403)
        .json({ error: "Only the owner can stop sharing" });
    }

    // Clear all shares and set to private
    const result = await pool.query(
      `
      UPDATE view_configurations
      SET shared_with = '[]'::jsonb,
          is_shared = false,
          visibility = 'private',
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
      [id]
    );

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "view:stop_sharing",
        entityType: "view",
        entityId: id,
      });
    }

    // Broadcast update
    if (wsManager && view.dataset_id) {
      const projects = await pool.query(
        "SELECT project_id FROM file_project_access WHERE file_id = $1",
        [view.dataset_id]
      );

      for (const row of projects.rows) {
        wsManager.viewUpdated(row.project_id, result.rows[0]);
      }
    }

    res.json({
      success: true,
      message: "Sharing stopped, view is now private",
      view: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/views/:id/share-link
 * Generate a shareable link for the view
 */
router.post("/:id/share-link", async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = getUser(req);
    const { pool } = req.app.locals;

    // Get view
    const result = await pool.query(
      "SELECT * FROM view_configurations WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const view = result.rows[0];

    // Check permission (owner or has can-share permission)
    const sharedWith = view.shared_with || [];
    const userShare = sharedWith.find((share) => share.userId === user.id);
    const canShare =
      view.owner_user_id === user.id ||
      (userShare && userShare.permission === "can-share");

    if (!canShare) {
      return res
        .status(403)
        .json({ error: "You don't have permission to share this view" });
    }

    // Generate shareable link
    const baseUrl =
      req.headers.origin || `${req.protocol}://${req.get("host")}`;
    const shareLink = `${baseUrl}/view/${id}`;

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "view:generate_share_link",
        entityType: "view",
        entityId: id,
      });
    }

    res.json({
      success: true,
      shareLink,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
