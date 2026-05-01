// server/src/routes/vr.js
// VR exploration session management API

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { createLogger } = require("../utils/logger");
const vrPreprocessing = require("../services/vrPreprocessing");

const router = express.Router({ mergeParams: true });
const log = createLogger("vr");

// =============================================================================
// SESSION CRUD
// =============================================================================

/**
 * POST /vr/sessions
 * Create a new VR exploration session
 */
router.post("/sessions", async (req, res) => {
  const pool = req.app.locals.pool;
  const wsManager = req.app.locals.wsManager;

  try {
    const {
      viewConfigurationId,
      datasetId,
      projectId,
      selectionType,
      explorationMode,
      vrScale,
      allowJoin,
      allowDesktopParticipants,
      allowDesktopControl,
      regionOfInterest,
      selectionIds,
    } = req.body;

    const userId = req.headers["x-user-id"] || "anonymous";
    const userName = req.headers["x-user-name"] || "Anonymous";

    const sessionId = uuidv4();

    // Create session
    const result = await pool.query(
      `INSERT INTO vr_exploration_sessions (
        id, view_configuration_id, dataset_id, project_id,
        owner_user_id, owner_user_name,
        selection_type, default_exploration_mode, default_vr_scale,
        allow_join, allow_desktop_participants, allow_desktop_control,
        region_of_interest, selection_ids,
        status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      RETURNING *`,
      [
        sessionId,
        viewConfigurationId,
        datasetId,
        projectId,
        userId,
        userName,
        selectionType || "full",
        explorationMode || "fly",
        vrScale || 1.0,
        allowJoin !== false,
        allowDesktopParticipants !== false,
        allowDesktopControl !== false,
        regionOfInterest ? JSON.stringify(regionOfInterest) : null,
        selectionIds ? JSON.stringify(selectionIds) : null,
        "preparing",
      ]
    );

    const session = result.rows[0];

    // Add owner as first participant
    await pool.query(
      `INSERT INTO vr_session_participants (
        id, session_id, od_user_id, user_name, mode, joined_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), sessionId, userId, userName, "vr-explorer"]
    );

    // Broadcast to project
    if (wsManager && projectId) {
      wsManager.vrSessionCreated(projectId, session);
    }

    log.info(`VR session created: ${sessionId} by ${userName}`);

    res.json(session);
  } catch (error) {
    log.error("Failed to create VR session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

/**
 * GET /vr/sessions/:id
 * Get session details
 */
router.get("/sessions/:id", async (req, res) => {
  const pool = req.app.locals.pool;

  try {
    const sessionResult = await pool.query(
      `SELECT * FROM vr_exploration_sessions WHERE id = $1`,
      [req.params.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const session = sessionResult.rows[0];

    // Get participants
    const participantsResult = await pool.query(
      `SELECT * FROM vr_session_participants WHERE session_id = $1`,
      [req.params.id]
    );

    // Get snapshots
    const snapshotsResult = await pool.query(
      `SELECT * FROM vr_session_snapshots WHERE session_id = $1 ORDER BY timestamp DESC`,
      [req.params.id]
    );

    res.json({
      ...session,
      participants: participantsResult.rows,
      snapshots: snapshotsResult.rows,
    });
  } catch (error) {
    log.error("Failed to get VR session:", error);
    res.status(500).json({ error: "Failed to get session" });
  }
});

/**
 * GET /vr/sessions
 * List active sessions in a project
 */
router.get("/sessions", async (req, res) => {
  const pool = req.app.locals.pool;

  try {
    const { projectId } = req.query;

    const result = await pool.query(
      `SELECT s.*,
        (SELECT COUNT(*) FROM vr_session_participants WHERE session_id = s.id) as participant_count
      FROM vr_exploration_sessions s
      WHERE s.project_id = $1 AND s.status IN ('preparing', 'active', 'paused')
      ORDER BY s.created_at DESC`,
      [projectId]
    );

    res.json(result.rows);
  } catch (error) {
    log.error("Failed to list VR sessions:", error);
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

/**
 * PUT /vr/sessions/:id
 * Update session settings
 */
router.put("/sessions/:id", async (req, res) => {
  const pool = req.app.locals.pool;
  const wsManager = req.app.locals.wsManager;

  try {
    const userId = req.headers["x-user-id"] || "anonymous";

    const sessionResult = await pool.query(
      `SELECT * FROM vr_exploration_sessions WHERE id = $1`,
      [req.params.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const session = sessionResult.rows[0];

    if (session.owner_user_id !== userId) {
      return res.status(403).json({ error: "Not session owner" });
    }

    // Update allowed fields
    const allowedUpdates = [
      "status",
      "allow_join",
      "allow_desktop_participants",
      "allow_desktop_control",
      "default_exploration_mode",
      "default_vr_scale",
    ];

    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const field of allowedUpdates) {
      const camelField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      if (req.body[camelField] !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        values.push(req.body[camelField]);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return res.json(session);
    }

    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE vr_exploration_sessions SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    // Broadcast update
    if (wsManager && session.project_id) {
      wsManager.vrSessionUpdated(session.project_id, session.id, req.body);
    }

    res.json(result.rows[0]);
  } catch (error) {
    log.error("Failed to update VR session:", error);
    res.status(500).json({ error: "Failed to update session" });
  }
});

/**
 * DELETE /vr/sessions/:id
 * End/delete a session
 */
router.delete("/sessions/:id", async (req, res) => {
  const pool = req.app.locals.pool;
  const wsManager = req.app.locals.wsManager;

  try {
    const userId = req.headers["x-user-id"] || "anonymous";

    const sessionResult = await pool.query(
      `SELECT * FROM vr_exploration_sessions WHERE id = $1`,
      [req.params.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const session = sessionResult.rows[0];

    if (session.owner_user_id !== userId) {
      return res.status(403).json({ error: "Not session owner" });
    }

    await pool.query(
      `UPDATE vr_exploration_sessions SET status = 'ended', ended_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    // Broadcast end
    if (wsManager && session.project_id) {
      wsManager.vrSessionEnded(session.project_id, session.id);
    }

    log.info(`VR session ended: ${session.id}`);

    res.json({ success: true });
  } catch (error) {
    log.error("Failed to end VR session:", error);
    res.status(500).json({ error: "Failed to end session" });
  }
});

// =============================================================================
// PARTICIPANT MANAGEMENT
// =============================================================================

/**
 * POST /vr/sessions/:id/join
 * Join a session
 */
router.post("/sessions/:id/join", async (req, res) => {
  const pool = req.app.locals.pool;
  const wsManager = req.app.locals.wsManager;

  try {
    const userId = req.headers["x-user-id"] || "anonymous";
    const userName = req.headers["x-user-name"] || "Anonymous";

    const sessionResult = await pool.query(
      `SELECT * FROM vr_exploration_sessions WHERE id = $1`,
      [req.params.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const session = sessionResult.rows[0];

    if (!session.allow_join) {
      return res.status(403).json({ error: "Session does not allow joining" });
    }

    const { mode } = req.body;

    if (
      mode === "desktop-participant" &&
      !session.allow_desktop_participants
    ) {
      return res
        .status(403)
        .json({ error: "Session does not allow desktop participants" });
    }

    // Upsert participant
    const result = await pool.query(
      `INSERT INTO vr_session_participants (
        id, session_id, od_user_id, user_name, mode, joined_at, last_active_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (session_id, od_user_id) DO UPDATE SET
        mode = $5, last_active_at = NOW()
      RETURNING *`,
      [uuidv4(), req.params.id, userId, userName, mode || "desktop-observer"]
    );

    const participant = result.rows[0];

    // Broadcast join
    if (wsManager && session.project_id) {
      wsManager.vrParticipantJoined(session.project_id, session.id, participant);
    }

    log.info(
      `User ${userName} joined VR session ${session.id} as ${participant.mode}`
    );

    res.json(participant);
  } catch (error) {
    log.error("Failed to join VR session:", error);
    res.status(500).json({ error: "Failed to join session" });
  }
});

/**
 * POST /vr/sessions/:id/leave
 * Leave a session
 */
router.post("/sessions/:id/leave", async (req, res) => {
  const pool = req.app.locals.pool;
  const wsManager = req.app.locals.wsManager;

  try {
    const userId = req.headers["x-user-id"] || "anonymous";

    await pool.query(
      `DELETE FROM vr_session_participants WHERE session_id = $1 AND od_user_id = $2`,
      [req.params.id, userId]
    );

    const sessionResult = await pool.query(
      `SELECT project_id FROM vr_exploration_sessions WHERE id = $1`,
      [req.params.id]
    );

    if (sessionResult.rows.length > 0 && wsManager) {
      wsManager.vrParticipantLeft(
        sessionResult.rows[0].project_id,
        req.params.id,
        userId
      );
    }

    res.json({ success: true });
  } catch (error) {
    log.error("Failed to leave VR session:", error);
    res.status(500).json({ error: "Failed to leave session" });
  }
});

/**
 * PUT /vr/sessions/:id/participants/:odUserId
 * Update participant state
 */
router.put("/sessions/:id/participants/:odUserId", async (req, res) => {
  const pool = req.app.locals.pool;

  try {
    const allowedUpdates = ["mode", "vr_scale", "scale_visibility"];
    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const field of allowedUpdates) {
      const camelField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      if (req.body[camelField] !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        values.push(req.body[camelField]);
        paramCount++;
      }
    }

    updates.push(`last_active_at = NOW()`);

    values.push(req.params.id, req.params.odUserId);
    const result = await pool.query(
      `UPDATE vr_session_participants SET ${updates.join(", ")}
      WHERE session_id = $${paramCount} AND od_user_id = $${paramCount + 1}
      RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Participant not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    log.error("Failed to update participant:", error);
    res.status(500).json({ error: "Failed to update participant" });
  }
});

// =============================================================================
// SNAPSHOTS
// =============================================================================

/**
 * POST /vr/sessions/:id/snapshots
 * Create a session snapshot
 */
router.post("/sessions/:id/snapshots", async (req, res) => {
  const pool = req.app.locals.pool;
  const wsManager = req.app.locals.wsManager;

  try {
    const userId = req.headers["x-user-id"] || "anonymous";
    const userName = req.headers["x-user-name"] || "Anonymous";

    const { name, viewSnapshotId, participantStates } = req.body;

    const result = await pool.query(
      `INSERT INTO vr_session_snapshots (
        id, session_id, name, view_snapshot_id,
        created_by, created_by_name, participant_states, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *`,
      [
        uuidv4(),
        req.params.id,
        name || `Snapshot ${new Date().toLocaleTimeString()}`,
        viewSnapshotId,
        userId,
        userName,
        participantStates ? JSON.stringify(participantStates) : null,
      ]
    );

    const snapshot = result.rows[0];

    // Get session to find project_id
    const sessionResult = await pool.query(
      `SELECT project_id FROM vr_exploration_sessions WHERE id = $1`,
      [req.params.id]
    );

    // Broadcast snapshot created
    if (sessionResult.rows.length > 0 && wsManager) {
      wsManager.vrSnapshotCreated(
        sessionResult.rows[0].project_id,
        req.params.id,
        snapshot
      );
    }

    res.json(snapshot);
  } catch (error) {
    log.error("Failed to create snapshot:", error);
    res.status(500).json({ error: "Failed to create snapshot" });
  }
});

/**
 * GET /vr/sessions/:id/snapshots
 * List session snapshots
 */
router.get("/sessions/:id/snapshots", async (req, res) => {
  const pool = req.app.locals.pool;

  try {
    const result = await pool.query(
      `SELECT * FROM vr_session_snapshots WHERE session_id = $1 ORDER BY timestamp DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    log.error("Failed to list snapshots:", error);
    res.status(500).json({ error: "Failed to list snapshots" });
  }
});

// =============================================================================
// PREPROCESSING
// =============================================================================

/**
 * GET /vr/preprocessing/:datasetId/status
 * Get preprocessing status for a dataset
 */
router.get("/preprocessing/:datasetId/status", async (req, res) => {
  const pool = req.app.locals.pool;

  try {
    const status = await vrPreprocessing.getPreprocessingStatus(
      pool,
      req.params.datasetId
    );

    res.json(status);
  } catch (error) {
    log.error("Failed to get preprocessing status:", error);
    res.status(500).json({ error: "Failed to get preprocessing status" });
  }
});

/**
 * GET /vr/preprocessing/:datasetId/ready
 * Check if dataset is ready for VR exploration
 */
router.get("/preprocessing/:datasetId/ready", async (req, res) => {
  const pool = req.app.locals.pool;

  try {
    const readiness = await vrPreprocessing.isReadyForVR(
      pool,
      req.params.datasetId
    );

    res.json(readiness);
  } catch (error) {
    log.error("Failed to check VR readiness:", error);
    res.status(500).json({ error: "Failed to check VR readiness" });
  }
});

/**
 * POST /vr/preprocessing/:datasetId/start
 * Start preprocessing for a dataset
 */
router.post("/preprocessing/:datasetId/start", async (req, res) => {
  const pool = req.app.locals.pool;
  const wsManager = req.app.locals.wsManager;

  try {
    const userId = req.headers["x-user-id"] || "anonymous";
    const { projectId, force } = req.body;

    const result = await vrPreprocessing.startPreprocessing(
      pool,
      req.params.datasetId,
      {
        userId,
        projectId,
        force: force === true,
      }
    );

    // Broadcast preprocessing started
    if (wsManager && projectId && result.status === "queued") {
      wsManager.broadcastToProject(projectId, {
        type: "vr:preprocessing-started",
        projectId,
        datasetId: req.params.datasetId,
        preprocessingId: result.id,
        operations: result.operations,
        estimatedTime: result.estimatedTime,
        timestamp: new Date().toISOString(),
      });
    }

    log.info(
      `VR preprocessing started for dataset ${req.params.datasetId}: ${result.status}`
    );

    res.json(result);
  } catch (error) {
    log.error("Failed to start preprocessing:", error);
    res.status(500).json({ error: error.message || "Failed to start preprocessing" });
  }
});

/**
 * POST /vr/preprocessing/internal/progress
 * Update preprocessing progress (called by workers)
 */
router.post("/preprocessing/internal/progress", async (req, res) => {
  const pool = req.app.locals.pool;
  const wsManager = req.app.locals.wsManager;

  try {
    const { preprocessingId, progress, operation, status } = req.body;

    await vrPreprocessing.updateProgress(pool, preprocessingId, {
      progress,
      operation,
      status,
    });

    // Get preprocessing record for project ID
    const result = await pool.query(
      `SELECT project_id, dataset_id FROM vr_preprocessing WHERE id = $1`,
      [preprocessingId]
    );

    // Broadcast progress update
    if (result.rows.length > 0 && wsManager) {
      const { project_id, dataset_id } = result.rows[0];
      if (project_id) {
        wsManager.broadcastToProject(project_id, {
          type: "vr:preprocessing-progress",
          projectId: project_id,
          datasetId: dataset_id,
          preprocessingId,
          progress,
          operation,
          status,
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    log.error("Failed to update preprocessing progress:", error);
    res.status(500).json({ error: "Failed to update progress" });
  }
});

/**
 * POST /vr/preprocessing/internal/complete
 * Mark preprocessing as complete (called by workers)
 */
router.post("/preprocessing/internal/complete", async (req, res) => {
  const pool = req.app.locals.pool;
  const wsManager = req.app.locals.wsManager;

  try {
    const { preprocessingId, results } = req.body;

    await vrPreprocessing.completePreprocessing(pool, preprocessingId, results);

    // Get preprocessing record for broadcasting
    const result = await pool.query(
      `SELECT project_id, dataset_id FROM vr_preprocessing WHERE id = $1`,
      [preprocessingId]
    );

    // Broadcast completion
    if (result.rows.length > 0 && wsManager) {
      const { project_id, dataset_id } = result.rows[0];
      if (project_id) {
        wsManager.broadcastToProject(project_id, {
          type: "vr:preprocessing-complete",
          projectId: project_id,
          datasetId: dataset_id,
          preprocessingId,
          results,
          timestamp: new Date().toISOString(),
        });
      }
    }

    log.info(`VR preprocessing complete: ${preprocessingId}`);

    res.json({ success: true });
  } catch (error) {
    log.error("Failed to complete preprocessing:", error);
    res.status(500).json({ error: "Failed to complete preprocessing" });
  }
});

/**
 * POST /vr/preprocessing/internal/failed
 * Mark preprocessing as failed (called by workers)
 */
router.post("/preprocessing/internal/failed", async (req, res) => {
  const pool = req.app.locals.pool;
  const wsManager = req.app.locals.wsManager;

  try {
    const { preprocessingId, error: errorMessage } = req.body;

    await vrPreprocessing.updateProgress(pool, preprocessingId, {
      status: "failed",
      error: errorMessage,
    });

    // Get preprocessing record for broadcasting
    const result = await pool.query(
      `SELECT project_id, dataset_id FROM vr_preprocessing WHERE id = $1`,
      [preprocessingId]
    );

    // Broadcast failure
    if (result.rows.length > 0 && wsManager) {
      const { project_id, dataset_id } = result.rows[0];
      if (project_id) {
        wsManager.broadcastToProject(project_id, {
          type: "vr:preprocessing-failed",
          projectId: project_id,
          datasetId: dataset_id,
          preprocessingId,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        });
      }
    }

    log.error(`VR preprocessing failed: ${preprocessingId} - ${errorMessage}`);

    res.json({ success: true });
  } catch (error) {
    log.error("Failed to mark preprocessing as failed:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
});

module.exports = router;
