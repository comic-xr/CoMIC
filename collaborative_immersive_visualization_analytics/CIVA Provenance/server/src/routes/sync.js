// server/src/routes/sync.js
// Provides sync status for client reconciliation

const express = require("express");
const router = express.Router();
const { createLogger } = require("../utils/logger");

const log = createLogger("sync");

/**
 * GET /api/sync/status
 * Returns server state information for client reconciliation
 */
router.get("/status", async (req, res) => {
  try {
    const { pool } = req.app.locals;

    // Get server instance ID
    const instanceResult = await pool.query(`
      SELECT instance_id, created_at, schema_version
      FROM server_instance
      LIMIT 1
    `);

    // Get quick stats
    const statsResult = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM datasets) as dataset_count,
        (SELECT COUNT(*) FROM view_configurations) as view_count
    `);

    const instance = instanceResult.rows[0];
    const stats = statsResult.rows[0];

    if (!instance) {
      log.error("server_instance table is empty");
      return res.status(500).json({ error: "Server instance not initialized" });
    }

    res.json({
      serverInstanceId: instance.instance_id,
      serverCreatedAt: instance.created_at,
      schemaVersion: instance.schema_version,
      datasetCount: parseInt(stats.dataset_count, 10),
      viewCount: parseInt(stats.view_count, 10),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error("Failed to get sync status:", error);
    res.status(500).json({ error: "Failed to get sync status" });
  }
});

module.exports = router;
