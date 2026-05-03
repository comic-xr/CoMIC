// server/src/services/recordingService.js
// Captures Y.js and application events during active recording sessions
//
// Architecture:
// - Maintains map of active recordings per project
// - Buffers events and flushes to database periodically
// - Called from Y.js server when updates arrive
// - Called from REST API when state changes occur

const { createLogger } = require("../utils/logger");

const log = createLogger("recordings");

/**
 * RecordingService - Captures events during active recording sessions
 */
class RecordingService {
  constructor(pool) {
    this.pool = pool;

    // Active recordings: projectId -> { recordingId, startTime, userId, eventBuffer, flushInterval }
    this.activeRecordings = new Map();

    // Configuration
    this.bufferSize = 50; // Flush after this many events
    this.flushIntervalMs = 5000; // Or flush every 5 seconds
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  /**
   * Start capturing events for a recording
   * @param {string} recordingId - Recording UUID
   * @param {string} projectId - Project UUID
   * @param {string} userId - User who started the recording
   */
  startCapture(recordingId, projectId, userId) {
    // Stop any existing recording for this project first
    this.stopCaptureForProject(projectId);

    const session = {
      recordingId,
      projectId,
      userId,
      startTime: Date.now(),
      eventBuffer: [],
      eventCount: 0,
      flushInterval: setInterval(
        () => this._flushEvents(projectId),
        this.flushIntervalMs
      ),
    };

    this.activeRecordings.set(projectId, session);

    log.info(
      `Started recording capture: ${recordingId} for project ${projectId}`
    );
  }

  /**
   * Stop capturing and flush remaining events
   * @param {string} recordingId - Recording UUID
   */
  async stopCapture(recordingId) {
    // Find the project for this recording
    let targetProjectId = null;
    for (const [projectId, session] of this.activeRecordings) {
      if (session.recordingId === recordingId) {
        targetProjectId = projectId;
        break;
      }
    }

    if (!targetProjectId) {
      log.warn(`No active capture found for recording ${recordingId}`);
      return;
    }

    await this.stopCaptureForProject(targetProjectId);
  }

  /**
   * Stop capture for a specific project
   * @param {string} projectId - Project UUID
   */
  async stopCaptureForProject(projectId) {
    const session = this.activeRecordings.get(projectId);
    if (!session) return;

    // Stop the flush interval
    clearInterval(session.flushInterval);

    // Flush remaining events
    await this._flushEvents(projectId);

    // Remove from active recordings
    this.activeRecordings.delete(projectId);

    log.info(
      `Stopped recording capture for project ${projectId}, total events: ${session.eventCount}`
    );
  }

  // ==========================================================================
  // EVENT RECORDING
  // ==========================================================================

  /**
   * Record an event during an active session
   * Called from various sources (Y.js server, REST API, WebSocket handlers)
   *
   * @param {string} projectId - Project UUID
   * @param {string} eventType - Type: 'camera', 'filter', 'widget', 'annotation', 'chat', 'presence', 'cursor'
   * @param {string} eventSource - More specific source: 'camera:rotate', 'filter:add', etc.
   * @param {Object} eventData - Event payload
   * @param {string} userId - Optional user UUID
   * @param {number} clientId - Optional Y.js client ID
   */
  async recordEvent(
    projectId,
    eventType,
    eventSource,
    eventData,
    userId = null,
    clientId = null
  ) {
    const session = this.activeRecordings.get(projectId);
    if (!session) {
      // No active recording for this project - silently ignore
      return;
    }

    // Skip high-frequency cursor events unless explicitly enabled
    if (eventType === "cursor" && !session.options?.includeCursors) {
      return;
    }

    const offsetMs = Date.now() - session.startTime;

    session.eventBuffer.push({
      recordingId: session.recordingId,
      offsetMs,
      eventType,
      eventSource,
      eventData,
      userId,
      clientId,
    });

    session.eventCount++;

    // Flush if buffer is full
    if (session.eventBuffer.length >= this.bufferSize) {
      await this._flushEvents(projectId);
    }
  }

  /**
   * Convenience method to record a camera change
   */
  recordCameraChange(projectId, cameraState, userId) {
    return this.recordEvent(
      projectId,
      "camera",
      "camera:update",
      cameraState,
      userId
    );
  }

  /**
   * Convenience method to record a filter change
   */
  recordFilterChange(projectId, action, filterData, userId) {
    return this.recordEvent(
      projectId,
      "filter",
      `filter:${action}`,
      filterData,
      userId
    );
  }

  /**
   * Convenience method to record an annotation change
   */
  recordAnnotationChange(projectId, action, annotationData, userId) {
    return this.recordEvent(
      projectId,
      "annotation",
      `annotation:${action}`,
      annotationData,
      userId
    );
  }

  /**
   * Convenience method to record a chat message
   */
  recordChatMessage(projectId, messageData, userId) {
    return this.recordEvent(
      projectId,
      "chat",
      "chat:message",
      messageData,
      userId
    );
  }

  /**
   * Convenience method to record a view change
   */
  recordViewChange(projectId, action, viewData, userId) {
    return this.recordEvent(
      projectId,
      "view",
      `view:${action}`,
      viewData,
      userId
    );
  }

  // ==========================================================================
  // INTERNAL
  // ==========================================================================

  /**
   * Flush buffered events to database
   * @private
   */
  async _flushEvents(projectId) {
    const session = this.activeRecordings.get(projectId);
    if (!session || session.eventBuffer.length === 0) return;

    // Take all events from buffer
    const events = session.eventBuffer.splice(0);

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Batch insert using unnest for better performance
      const recordingIds = events.map((e) => e.recordingId);
      const offsets = events.map((e) => e.offsetMs);
      const types = events.map((e) => e.eventType);
      const sources = events.map((e) => e.eventSource);
      const data = events.map((e) => JSON.stringify(e.eventData));
      const userIds = events.map((e) => e.userId);
      const clientIds = events.map((e) => e.clientId);

      await client.query(
        `
        INSERT INTO recording_events (
          recording_id, timestamp_offset_ms, event_type, event_source, 
          event_data, user_id, client_id
        )
        SELECT * FROM unnest(
          $1::uuid[], $2::int[], $3::varchar[], $4::varchar[],
          $5::jsonb[], $6::uuid[], $7::int[]
        )
      `,
        [recordingIds, offsets, types, sources, data, userIds, clientIds]
      );

      await client.query("COMMIT");

      log.debug(
        `Flushed ${events.length} events for recording ${session.recordingId}`
      );
    } catch (error) {
      await client.query("ROLLBACK");
      log.error(`Failed to flush events: ${error.message}`);

      // Put events back in buffer for retry
      session.eventBuffer.unshift(...events);
    } finally {
      client.release();
    }
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  /**
   * Check if project has an active recording
   */
  hasActiveRecording(projectId) {
    return this.activeRecordings.has(projectId);
  }

  /**
   * Get active recording ID for project
   */
  getActiveRecordingId(projectId) {
    const session = this.activeRecordings.get(projectId);
    return session?.recordingId || null;
  }

  /**
   * Get all active recordings
   */
  getActiveRecordings() {
    const result = [];
    for (const [projectId, session] of this.activeRecordings) {
      result.push({
        projectId,
        recordingId: session.recordingId,
        startTime: session.startTime,
        eventCount: session.eventCount,
        elapsedMs: Date.now() - session.startTime,
      });
    }
    return result;
  }

  /**
   * Get recording stats
   */
  getStats(projectId) {
    const session = this.activeRecordings.get(projectId);
    if (!session) return null;

    return {
      recordingId: session.recordingId,
      startTime: session.startTime,
      elapsedMs: Date.now() - session.startTime,
      eventCount: session.eventCount,
      bufferSize: session.eventBuffer.length,
    };
  }
}

// Singleton for easy import
let instance = null;

function createRecordingService(pool) {
  if (!instance) {
    instance = new RecordingService(pool);
  }
  return instance;
}

function getRecordingService() {
  return instance;
}

module.exports = {
  RecordingService,
  createRecordingService,
  getRecordingService,
};
