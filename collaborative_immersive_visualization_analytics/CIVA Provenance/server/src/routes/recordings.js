// server/src/routes/recordings.js
// Session recording endpoints for audit and playback
//
// Architecture:
// - Recordings capture Y.js events during a session
// - Events are stored with timestamp offsets for playback sync
// - Recordings can be started/stopped per project
// - Playback reconstructs state by replaying events

const express = require("express");
const router = express.Router({ mergeParams: true }); // Access :projectId
const zlib = require("zlib");
const { promisify } = require("util");
const { createLogger } = require("../utils/logger");
const { getUser } = require("../middleware/auth");

const gzip = promisify(zlib.gzip);

const log = createLogger("recordings");

// ============================================================================
// LIST RECORDINGS
// ============================================================================

/**
 * GET /api/projects/:projectId/recordings
 * List all recordings for a project
 */
router.get("/", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;
    const { pool } = req.app.locals;

    let query = `
      SELECT 
        r.*,
        u.display_name as recorded_by_name,
        u.email as recorded_by_email,
        (SELECT COUNT(*) FROM recording_events WHERE recording_id = r.id) as event_count
      FROM session_recordings r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.project_id = $1
    `;
    const params = [projectId];
    let paramIndex = 2;

    if (status) {
      query += ` AND r.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY r.started_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count for pagination
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM session_recordings WHERE project_id = $1" +
        (status ? " AND status = $2" : ""),
      status ? [projectId, status] : [projectId]
    );

    const recordings = result.rows.map((r) => ({
      ...r,
      // Extract snapshot name for convenience (fallback to current or 'Unknown')
      recorded_by_name:
        r.recorded_by_name ||
        r.metadata?.recordedBySnapshot?.displayName ||
        "Unknown",
    }));

    res.json({
      recordings,
      count: recordings.length,
      total: parseInt(countResult.rows[0].count),
      offset: parseInt(offset),
      limit: parseInt(limit),
    });
  } catch (error) {
    log.error("Failed to list recordings:", error);
    next(error);
  }
});

// ============================================================================
// START RECORDING
// ============================================================================

/**
 * POST /api/projects/:projectId/recordings/start
 * Start a new recording session
 */
router.post("/start", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const user = getUser(req);
    const { pool, wsManager, recordingService } = req.app.locals;
    const { name, mode = "full", roomId, workspaceId, options = {} } = req.body;

    // Check if there's already an active recording for this project
    const existingRecording = await pool.query(
      `SELECT id FROM session_recordings 
       WHERE project_id = $1 AND status = 'recording'`,
      [projectId]
    );

    if (existingRecording.rows.length > 0) {
      return res.status(409).json({
        error: "Recording already in progress",
        existingRecordingId: existingRecording.rows[0].id,
      });
    }

    // Create recording record
    // Create recording record with user snapshot for audit trail
    const result = await pool.query(
      `
  INSERT INTO session_recordings (
    project_id, user_id, started_at, status, metadata, device_info
  ) VALUES ($1, $2, NOW(), 'recording', $3, $4)
  RETURNING *
`,
      [
        projectId,
        user.id,
        JSON.stringify({
          name: name || `Recording ${new Date().toISOString()}`,
          mode,
          roomId: roomId || null,
          workspaceId: workspaceId || null,
          options,
          // Snapshot user info at time of recording for audit trail
          recordedBySnapshot: {
            userId: user.id,
            displayName: user.name || user.displayName || "Unknown",
            email: user.email || null,
          },
        }),
        JSON.stringify({
          userAgent: req.get("user-agent"),
          ip: req.ip,
          timestamp: new Date().toISOString(),
        }),
      ]
    );

    const recording = result.rows[0];

    // Ensure we have a display name (current or snapshot)
    if (!recording.recorded_by_name && recording.metadata?.recordedBySnapshot) {
      recording.recorded_by_name =
        recording.metadata.recordedBySnapshot.displayName;
    }

    // Register with recording service for Y.js event capture
    if (recordingService) {
      recordingService.startCapture(recording.id, projectId, user.id);
    }

    // Broadcast to project members
    if (wsManager) {
      wsManager.broadcastToProject(projectId, {
        type: "recording:started",
        recording: {
          id: recording.id,
          startedAt: recording.started_at,
          startedBy: user.name,
          mode,
        },
      });
    }

    log.info(
      `Recording started: ${recording.id} by ${user.email} in project ${projectId}`
    );

    res.json({
      success: true,
      recording: {
        ...recording,
        recorded_by_name: user.name,
      },
    });
  } catch (error) {
    log.error("Failed to start recording:", error);
    next(error);
  }
});

// ============================================================================
// CAPTURE CLIENT EVENTS
// ============================================================================

/**
 * POST /api/projects/:projectId/recordings/events
 * Capture one or more client-side events for the active project recording
 */
router.post("/events", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const user = getUser(req);
    const { recordingService } = req.app.locals;
    const inputEvents = Array.isArray(req.body?.events)
      ? req.body.events
      : [req.body];

    if (!recordingService || !recordingService.hasActiveRecording(projectId)) {
      return res.json({ success: true, active: false, recordedCount: 0 });
    }

    let recordedCount = 0;

    for (const event of inputEvents) {
      if (!event?.eventType || !event?.eventSource) {
        continue;
      }

      await recordingService.recordEvent(
        projectId,
        event.eventType,
        event.eventSource,
        event.eventData || {},
        user?.id || null,
        event.clientId || null
      );

      recordedCount += 1;
    }

    res.json({ success: true, active: true, recordedCount });
  } catch (error) {
    log.error("Failed to capture recording events:", error);
    next(error);
  }
});

// ============================================================================
// STOP RECORDING
// ============================================================================

/**
 * POST /api/projects/:projectId/recordings/:id/stop
 * Stop an active recording
 */
router.post("/:id/stop", async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const { pool, wsManager, recordingService } = req.app.locals;

    // Stop capture first
    if (recordingService) {
      await recordingService.stopCapture(id);
    }

    // Update recording with end time and duration
    const result = await pool.query(
      `
      UPDATE session_recordings
      SET 
        ended_at = NOW(),
        duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
        status = 'ready'
      WHERE id = $1 AND project_id = $2 AND status = 'recording'
      RETURNING *
    `,
      [id, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Active recording not found" });
    }

    // Get event count
    const eventCount = await pool.query(
      "SELECT COUNT(*) FROM recording_events WHERE recording_id = $1",
      [id]
    );

    const recording = {
      ...result.rows[0],
      event_count: parseInt(eventCount.rows[0].count),
    };

    // Fallback to snapshot if user was deleted
    if (!recording.recorded_by_name && recording.metadata?.recordedBySnapshot) {
      recording.recorded_by_name =
        recording.metadata.recordedBySnapshot.displayName;
    }

    // Broadcast to project members
    if (wsManager) {
      wsManager.broadcastToProject(projectId, {
        type: "recording:stopped",
        recordingId: id,
        duration_ms: recording.duration_ms,
        event_count: recording.event_count,
      });
    }

    log.info(
      `Recording stopped: ${id}, duration: ${recording.duration_ms}ms, events: ${recording.event_count}`
    );

    res.json({
      success: true,
      active: false,
      recording,
      elapsed_ms: Date.now() - new Date(recording.started_at).getTime(),
    });
  } catch (error) {
    log.error("Failed to stop recording:", error);
    next(error);
  }
});

// ============================================================================
// GET RECORDING DETAILS
// ============================================================================

/**
 * GET /api/projects/:projectId/recordings/:id
 * Get recording metadata and summary
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const { pool } = req.app.locals;

    const result = await pool.query(
      `
      SELECT 
        r.*,
        u.display_name as recorded_by_name,
        u.email as recorded_by_email,
        (SELECT COUNT(*) FROM recording_events WHERE recording_id = r.id) as event_count,
        (SELECT jsonb_agg(DISTINCT event_type) FROM recording_events WHERE recording_id = r.id) as event_types
      FROM session_recordings r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = $1 AND r.project_id = $2
    `,
      [id, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Recording not found" });
    }

    res.json({ recording: result.rows[0] });
  } catch (error) {
    log.error("Failed to get recording:", error);
    next(error);
  }
});

// ============================================================================
// GET RECORDING EVENTS (FOR PLAYBACK)
// ============================================================================

/**
 * GET /api/projects/:projectId/recordings/:id/events
 * Get events for playback, with optional time range
 */
router.get("/:id/events", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { from = 0, to, types, limit = 1000 } = req.query;
    const { pool } = req.app.locals;

    let query = `
      SELECT id, timestamp_offset_ms, event_type, event_source, event_data, user_id, client_id
      FROM recording_events
      WHERE recording_id = $1 AND timestamp_offset_ms >= $2
    `;
    const params = [id, parseInt(from)];
    let paramIndex = 3;

    // Optional end time
    if (to) {
      query += ` AND timestamp_offset_ms <= $${paramIndex++}`;
      params.push(parseInt(to));
    }

    // Optional event type filter
    if (types) {
      const typeList = types.split(",");
      query += ` AND event_type = ANY($${paramIndex++})`;
      params.push(typeList);
    }

    query += ` ORDER BY timestamp_offset_ms ASC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    // Get total count for this recording
    const totalResult = await pool.query(
      "SELECT COUNT(*) FROM recording_events WHERE recording_id = $1",
      [id]
    );

    res.json({
      events: result.rows,
      count: result.rows.length,
      total: parseInt(totalResult.rows[0].count),
      from: parseInt(from),
      hasMore: result.rows.length === parseInt(limit),
    });
  } catch (error) {
    log.error("Failed to get recording events:", error);
    next(error);
  }
});

// ============================================================================
// UPDATE RECORDING METADATA
// ============================================================================

/**
 * PATCH /api/projects/:projectId/recordings/:id
 * Update recording metadata (name, etc.)
 */
router.patch("/:id", async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const { name } = req.body;
    const { pool } = req.app.locals;

    // Update metadata JSON
    const result = await pool.query(
      `
      UPDATE session_recordings
      SET metadata = metadata || $3
      WHERE id = $1 AND project_id = $2
      RETURNING *
    `,
      [id, projectId, JSON.stringify({ name })]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Recording not found" });
    }

    res.json({ success: true, recording: result.rows[0] });
  } catch (error) {
    log.error("Failed to update recording:", error);
    next(error);
  }
});

// ============================================================================
// DELETE RECORDING
// ============================================================================

/**
 * DELETE /api/projects/:projectId/recordings/:id
 * Delete a recording and its events
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const user = getUser(req);
    const { pool, minioClient, bucketName } = req.app.locals;

    // Get recording info before deleting
    const recording = await pool.query(
      "SELECT * FROM session_recordings WHERE id = $1 AND project_id = $2",
      [id, projectId]
    );

    if (recording.rows.length === 0) {
      return res.status(404).json({ error: "Recording not found" });
    }

    // Delete from MinIO if storage key exists
    const storageKey = recording.rows[0].storage_key;
    if (storageKey && minioClient) {
      try {
        await minioClient.removeObject(bucketName, storageKey);
        log.debug(`Deleted recording file: ${storageKey}`);
      } catch (e) {
        log.warn(`Failed to delete recording file: ${e.message}`);
      }
    }

    // Delete from database (cascades to recording_events)
    await pool.query("DELETE FROM session_recordings WHERE id = $1", [id]);

    log.info(`Recording deleted: ${id} by ${user.email}`);

    res.json({ success: true });
  } catch (error) {
    log.error("Failed to delete recording:", error);
    next(error);
  }
});

// ============================================================================
// GET ACTIVE RECORDING
// ============================================================================

/**
 * GET /api/projects/:projectId/recordings/active
 * Get the currently active recording for this project (if any)
 */
router.get("/status/active", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { pool } = req.app.locals;

    const result = await pool.query(
      `
      SELECT r.*, u.display_name as recorded_by_name
      FROM session_recordings r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.project_id = $1 AND r.status = 'recording'
    `,
      [projectId]
    );

    if (result.rows.length === 0) {
      return res.json({ active: false, recording: null });
    }

    res.json({
      active: true,
      recording: result.rows[0],
      elapsed_ms: Date.now() - new Date(result.rows[0].started_at).getTime(),
    });
  } catch (error) {
    log.error("Failed to get active recording:", error);
    next(error);
  }
});

// ============================================================================
// EXPORT RECORDING
// ============================================================================

/**
 * POST /api/projects/:projectId/recordings/:id/export
 * Export recording to MinIO as compressed JSONL
 */
router.post("/:id/export", async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const user = getUser(req);
    const { pool, minioClient, bucketName } = req.app.locals;

    // Get recording metadata
    const recordingResult = await pool.query(
      `SELECT * FROM session_recordings WHERE id = $1 AND project_id = $2`,
      [id, projectId]
    );

    if (recordingResult.rows.length === 0) {
      return res.status(404).json({ error: "Recording not found" });
    }

    const recording = recordingResult.rows[0];

    if (recording.status === "recording") {
      return res
        .status(400)
        .json({ error: "Cannot export active recording. Stop it first." });
    }

    if (recording.storage_key) {
      return res.json({
        success: true,
        message: "Recording already exported",
        storage_key: recording.storage_key,
        file_size: recording.file_size,
      });
    }

    log.info(`Exporting recording ${id}...`);

    // Stream events and build JSONL
    const BATCH_SIZE = 1000;
    let offset = 0;
    let lines = [];
    let totalEvents = 0;

    // Add metadata header
    lines.push(
      JSON.stringify({
        _type: "header",
        recording_id: id,
        project_id: projectId,
        started_at: recording.started_at,
        ended_at: recording.ended_at,
        duration_ms: recording.duration_ms,
        metadata: recording.metadata,
        exported_at: new Date().toISOString(),
        exported_by: user.email,
      })
    );

    // Stream events in batches
    while (true) {
      const eventsResult = await pool.query(
        `SELECT timestamp_offset_ms, event_type, event_source, event_data, user_id, client_id
         FROM recording_events
         WHERE recording_id = $1
         ORDER BY timestamp_offset_ms ASC
         LIMIT $2 OFFSET $3`,
        [id, BATCH_SIZE, offset]
      );

      if (eventsResult.rows.length === 0) break;

      for (const event of eventsResult.rows) {
        lines.push(
          JSON.stringify({
            t: event.timestamp_offset_ms,
            type: event.event_type,
            src: event.event_source,
            data: event.event_data,
            uid: event.user_id,
            cid: event.client_id,
          })
        );
        totalEvents++;
      }

      offset += BATCH_SIZE;

      // Log progress for large exports
      if (offset % 10000 === 0) {
        log.debug(`Export progress: ${offset} events processed`);
      }
    }

    // Add footer
    lines.push(
      JSON.stringify({
        _type: "footer",
        total_events: totalEvents,
        export_complete: true,
      })
    );

    // Compress
    const jsonlContent = lines.join("\n");
    const compressed = await gzip(Buffer.from(jsonlContent, "utf-8"));

    // Upload to MinIO
    const storageKey = `recordings/${projectId}/${id}.jsonl.gz`;

    await minioClient.putObject(
      bucketName,
      storageKey,
      compressed,
      compressed.length,
      {
        "Content-Type": "application/gzip",
        "Content-Encoding": "gzip",
        "X-Recording-Id": id,
        "X-Event-Count": String(totalEvents),
      }
    );

    // Update recording with storage info
    await pool.query(
      `UPDATE session_recordings
       SET storage_key = $1, file_size = $2
       WHERE id = $3`,
      [storageKey, compressed.length, id]
    );

    log.info(
      `Recording exported: ${id}, ${totalEvents} events, ${compressed.length} bytes`
    );

    res.json({
      success: true,
      storage_key: storageKey,
      file_size: compressed.length,
      event_count: totalEvents,
      original_size: jsonlContent.length,
      compression_ratio: (jsonlContent.length / compressed.length).toFixed(2),
    });
  } catch (error) {
    log.error("Failed to export recording:", error);
    next(error);
  }
});

// ============================================================================
// DOWNLOAD RECORDING
// ============================================================================

/**
 * GET /api/projects/:projectId/recordings/:id/download
 * Download exported recording file
 */
router.get("/:id/download", async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const { format = "jsonl" } = req.query; // jsonl or json
    const { pool, minioClient, bucketName } = req.app.locals;

    // Get recording
    const result = await pool.query(
      `SELECT * FROM session_recordings WHERE id = $1 AND project_id = $2`,
      [id, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Recording not found" });
    }

    const recording = result.rows[0];

    // If exported to MinIO, stream from there
    if (recording.storage_key) {
      const stat = await minioClient.statObject(
        bucketName,
        recording.storage_key
      );

      const filename = `recording-${id}-${
        recording.metadata?.name || "export"
      }.jsonl.gz`.replace(/[^a-zA-Z0-9.-]/g, "_");

      res.setHeader("Content-Type", "application/gzip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", stat.size);

      const stream = await minioClient.getObject(
        bucketName,
        recording.storage_key
      );
      stream.pipe(res);
      return;
    }

    // Otherwise, generate on-the-fly from database
    log.info(`Generating download for recording ${id} (not yet exported)`);

    const eventsResult = await pool.query(
      `SELECT timestamp_offset_ms, event_type, event_source, event_data, user_id, client_id
       FROM recording_events
       WHERE recording_id = $1
       ORDER BY timestamp_offset_ms ASC`,
      [id]
    );

    const filename = `recording-${id}.${format}`;

    if (format === "json") {
      // Full JSON format
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      res.json({
        recording: {
          id: recording.id,
          name: recording.metadata?.name,
          started_at: recording.started_at,
          ended_at: recording.ended_at,
          duration_ms: recording.duration_ms,
          metadata: recording.metadata,
        },
        events: eventsResult.rows.map((e) => ({
          timestamp_ms: e.timestamp_offset_ms,
          type: e.event_type,
          source: e.event_source,
          data: e.event_data,
          user_id: e.user_id,
          client_id: e.client_id,
        })),
      });
    } else {
      // JSONL format (default)
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      // Header
      res.write(
        JSON.stringify({
          _type: "header",
          recording_id: id,
          started_at: recording.started_at,
          ended_at: recording.ended_at,
          duration_ms: recording.duration_ms,
          metadata: recording.metadata,
        }) + "\n"
      );

      // Events
      for (const event of eventsResult.rows) {
        res.write(
          JSON.stringify({
            t: event.timestamp_offset_ms,
            type: event.event_type,
            src: event.event_source,
            data: event.event_data,
            uid: event.user_id,
            cid: event.client_id,
          }) + "\n"
        );
      }

      // Footer
      res.write(
        JSON.stringify({
          _type: "footer",
          total_events: eventsResult.rows.length,
        }) + "\n"
      );

      res.end();
    }
  } catch (error) {
    log.error("Failed to download recording:", error);
    next(error);
  }
});

// ============================================================================
// DELETE EXPORT (cleanup MinIO)
// ============================================================================

/**
 * DELETE /api/projects/:projectId/recordings/:id/export
 * Delete the exported file from MinIO (keeps DB events)
 */
router.delete("/:id/export", async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const { pool, minioClient, bucketName } = req.app.locals;

    const result = await pool.query(
      `SELECT storage_key FROM session_recordings WHERE id = $1 AND project_id = $2`,
      [id, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Recording not found" });
    }

    const { storage_key } = result.rows[0];

    if (storage_key) {
      await minioClient.removeObject(bucketName, storage_key);

      await pool.query(
        `UPDATE session_recordings SET storage_key = NULL, file_size = NULL WHERE id = $1`,
        [id]
      );

      log.info(`Deleted export for recording ${id}`);
    }

    res.json({ success: true, message: "Export deleted" });
  } catch (error) {
    log.error("Failed to delete export:", error);
    next(error);
  }
});

module.exports = router;
