// server/src/routes/thumbnailCallback.js
// Dedicated callback endpoint for thumbnail worker
//
// This route handles callbacks from the thumbnail generation worker.
// It's mounted at /api/thumbnails separately from the main thumbnails
// router (which is mounted at /api/views) to provide a stable endpoint
// for internal worker communication.
//
// Why a separate route?
// - The main thumbnails.js routes are mounted under /api/views/:viewId/thumbnail
//   for client-facing operations (get thumbnail, queue generation, etc.)
// - This callback is for worker-to-server communication, not client-facing
// - Having a dedicated /api/thumbnails/callback endpoint keeps concerns separated
// - Workers can call a stable URL without needing to know viewIds

const express = require("express");
const router = express.Router();
const { createLogger } = require("../utils/logger");
const thumbnailService = require("../services/thumbnailService");

const log = createLogger("thumbnails");

/**
 * POST /api/thumbnails/callback
 * Callback from thumbnail worker with job results
 *
 * This is called by the thumbnail worker container after it:
 * 1. Captures a screenshot with headless Chromium
 * 2. Optimizes the image with sharp
 * 3. Uploads to MinIO storage
 *
 * The callback creates/updates the database record in view_thumbnails
 * so that GET /api/views/:viewId/thumbnail can find it.
 *
 * Security: In production, this should verify a shared secret to ensure
 * only legitimate workers can report completions.
 *
 * Request body:
 * {
 *   jobId: string,      // BullMQ job ID
 *   success: boolean,   // Whether thumbnail generation succeeded
 *   storageKey: string, // MinIO path (e.g., "thumbnails/{viewId}/thumbnail.webp")
 *   format: string,     // Image format (e.g., "webp")
 *   width: number,      // Thumbnail width in pixels
 *   height: number,     // Thumbnail height in pixels
 *   error?: string      // Error message if success is false
 * }
 */
router.post("/callback", async (req, res, next) => {
  try {
    const { pool, wsManager } = req.app.locals;
    const result = req.body;

    log.debug("Received thumbnail callback:", {
      jobId: result.jobId,
      success: result.success,
      storageKey: result.storageKey,
      thumbnailType: result.thumbnailType,
      fileId: result.fileId,
      viewId: result.viewId,
    });

    // Validate required fields
    if (!result.jobId) {
      log.warn("Thumbnail callback missing jobId");
      return res.status(400).json({ error: "jobId required" });
    }

    // Create broadcast function to pass to callback handler
    // Use broadcastAll to send to all connected clients (not project-specific)
    const broadcastFn = wsManager
      ? (eventType, data) => {
          log.debug(`Broadcasting ${eventType}:`, data);
          wsManager.broadcastAll({ type: eventType, ...data });
        }
      : null;

    // Handle the callback - creates/updates database record
    const saved = await thumbnailService.handleThumbnailCallback(
      pool,
      result,
      broadcastFn
    );

    // Also broadcast legacy event for backward compatibility
    if (saved.success && saved.viewId && wsManager) {
      log.debug(`Broadcasting thumbnail:ready for view ${saved.viewId}`);
      wsManager.broadcastAll({
        type: "thumbnail:ready",
        viewId: saved.viewId,
        snapshotId: null, // Current state thumbnail (not a snapshot)
      });
    }

    res.json(saved);
  } catch (error) {
    log.error("Failed to handle thumbnail callback:", error);
    next(error);
  }
});

/**
 * GET /api/thumbnails/health
 * Health check for the thumbnail system
 *
 * Useful for monitoring and debugging the thumbnail pipeline.
 */
router.get("/health", async (req, res) => {
  try {
    const queue = thumbnailService.getQueue();
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    res.json({
      status: "healthy",
      queue: {
        waiting,
        active,
        completed,
        failed,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
    });
  }
});

module.exports = router;
