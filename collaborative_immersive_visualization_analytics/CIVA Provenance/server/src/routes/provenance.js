const express = require("express");
const router = express.Router({ mergeParams: true });
const { getUser } = require("../middleware/auth");
const { createLogger } = require("../utils/logger");
const { explainSnapshotDiff } = require("../services/snapshotDiffExplanationService");

const log = createLogger("provenance-routes");

async function resolveSnapshotIdentifier(provenanceService, projectId, snapshotIdentifier) {
  if (!snapshotIdentifier) return null;

  const normalized = String(snapshotIdentifier).trim();

  // Standard path: backend UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    return provenanceService.getSnapshot(projectId, normalized);
  }

  // Demo-friendly fallback: support UI labels like "1", "2", or "snap id 2"
  const match = normalized.match(/(\d+)/);
  if (!match) return null;

  const ordinal = parseInt(match[1], 10);
  if (!Number.isFinite(ordinal) || ordinal < 1) return null;

  const snapshots = await provenanceService.listSnapshots(projectId, {
    limit: 1000,
    offset: 0,
  });

  return snapshots[ordinal - 1] || null;
}

router.get("/history", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { viewId = null, limit = 50, offset = 0 } = req.query;
    const { provenanceService } = req.app.locals;

    const history = await provenanceService.listHistory(projectId, {
      viewId,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({ history });
  } catch (error) {
    next(error);
  }
});

router.get("/graph", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { viewId = null } = req.query;
    const { provenanceService } = req.app.locals;

    const graph = await provenanceService.getGraph(projectId, { viewId });
    res.json(graph);
  } catch (error) {
    next(error);
  }
});

router.get("/snapshots", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { viewId = null, limit = 100, offset = 0 } = req.query;
    const { provenanceService } = req.app.locals;

    const snapshots = await provenanceService.listSnapshots(projectId, {
      viewId,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({ snapshots });
  } catch (error) {
    next(error);
  }
});

router.post("/snapshots", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const user = getUser(req);
    const { pool, provenanceService, wsManager } = req.app.locals;
    const {
      viewId,
      name,
      description = "",
      actionIntent = "save_checkpoint",
      metadata = {},
    } = req.body;

    if (!viewId) {
      return res.status(400).json({ error: "viewId is required" });
    }

    let viewResult = await pool.query(
      "SELECT * FROM view_configurations WHERE id = $1 AND project_id = $2",
      [viewId, projectId]
    );

    if (viewResult.rows.length === 0) {
      // Legacy/dev fallback: some older views exist without project_id populated.
      // If the id matches, allow the active project to own the manual snapshot.
      viewResult = await pool.query(
        "SELECT * FROM view_configurations WHERE id = $1",
        [viewId]
      );
    }

    if (viewResult.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const snapshotSourceView = {
      ...viewResult.rows[0],
      project_id: viewResult.rows[0].project_id || projectId,
      camera: metadata?.camera
        ? JSON.stringify(metadata.camera)
        : viewResult.rows[0].camera,
    };

    const transition = await provenanceService.captureViewTransition({
      projectId,
      view: snapshotSourceView,
      user,
      actionType: "snapshot:create",
      actionIntent,
      actionSummary: `Created snapshot "${name || snapshotSourceView.name}"`,
      metadata,
      snapshotName: name,
      snapshotDescription: description,
    });

    if (wsManager) {
      wsManager.provenanceUpdated(projectId, {
        viewId,
        actionType: transition.history.action_type,
        historyId: transition.history.id,
        snapshotId: transition.snapshot.id,
      });
      wsManager.analysisSnapshotCreated(projectId, transition.snapshot);
    }

    res.status(201).json(transition);
  } catch (error) {
    next(error);
  }
});

router.post("/snapshots/:snapshotId/restore", async (req, res, next) => {
  try {
    const { projectId, snapshotId } = req.params;
    const user = getUser(req);
    const { provenanceService, wsManager } = req.app.locals;

    const restored = await provenanceService.restoreSnapshot({
      projectId,
      snapshotId,
      user,
    });

    if (wsManager) {
      wsManager.provenanceUpdated(projectId, {
        viewId: restored.view.id,
        actionType: restored.history.action_type,
        historyId: restored.history.id,
        snapshotId: restored.snapshot.id,
      });
      wsManager.analysisSnapshotCreated(projectId, restored.snapshot);
      wsManager.viewUpdated(projectId, restored.view);
    }

    res.json(restored);
  } catch (error) {
    if (error.message === "Snapshot not found" || error.message === "Snapshot view not found") {
      return res.status(404).json({ error: error.message });
    }
    log.error("Failed to restore snapshot:", error);
    next(error);
  }
});

router.post("/history/:historyId/restore", async (req, res, next) => {
  try {
    const { projectId, historyId } = req.params;
    const user = getUser(req);
    const { pool, provenanceService, wsManager } = req.app.locals;

    const historyResult = await pool.query(
      `
        SELECT *
        FROM action_history
        WHERE id = $1 AND project_id = $2
        LIMIT 1
      `,
      [historyId, projectId]
    );

    if (historyResult.rows.length === 0) {
      return res.status(404).json({ error: "History event not found" });
    }

    const history = historyResult.rows[0];
    let snapshotId = history.snapshot_id;

    if (!snapshotId) {
      const snapshotResult = await pool.query(
        `
          SELECT *
          FROM analysis_snapshots
          WHERE project_id = $1
            AND view_id = $2
            AND created_at <= $3
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [projectId, history.view_id, history.created_at]
      );

      if (snapshotResult.rows.length === 0) {
        return res.status(404).json({ error: "No snapshot found for this history event" });
      }

      snapshotId = snapshotResult.rows[0].id;
    }

    const restored = await provenanceService.restoreSnapshot({
      projectId,
      snapshotId,
      user,
    });

    if (wsManager) {
      wsManager.provenanceUpdated(projectId, {
        viewId: restored.view.id,
        actionType: restored.history.action_type,
        historyId: restored.history.id,
        snapshotId: restored.snapshot.id,
      });
      wsManager.analysisSnapshotCreated(projectId, restored.snapshot);
      wsManager.viewUpdated(projectId, restored.view);
    }

    res.json(restored);
  } catch (error) {
    if (error.message === "Snapshot not found" || error.message === "Snapshot view not found") {
      return res.status(404).json({ error: error.message });
    }
    log.error("Failed to restore from history event:", error);
    next(error);
  }
});

router.post("/snapshots/explain-diff", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { snapshotAId, snapshotBId } = req.body;
    const { provenanceService } = req.app.locals;

    if (!snapshotAId || !snapshotBId) {
      return res.status(400).json({ error: "snapshotAId and snapshotBId are required" });
    }

    const [snapshotA, snapshotB] = await Promise.all([
      resolveSnapshotIdentifier(provenanceService, projectId, snapshotAId),
      resolveSnapshotIdentifier(provenanceService, projectId, snapshotBId),
    ]);

    if (!snapshotA || !snapshotB) {
      return res.status(404).json({ error: "One or both snapshots were not found" });
    }

    const explanation = await explainSnapshotDiff(snapshotA, snapshotB);
    res.json({
      snapshotA: {
        id: snapshotA.id,
        name: snapshotA.name,
        created_at: snapshotA.created_at,
      },
      snapshotB: {
        id: snapshotB.id,
        name: snapshotB.name,
        created_at: snapshotB.created_at,
      },
      ...explanation,
    });
  } catch (error) {
    log.error("Failed to explain snapshot diff:", error);
    next(error);
  }
});

module.exports = router;
