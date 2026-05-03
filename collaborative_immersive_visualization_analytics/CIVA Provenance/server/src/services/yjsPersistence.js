// server/src/services/yjsPersistence.js
// Y.js persistence service for PostgreSQL
// Handles document snapshots, update storage, and chat message extraction
//
// Architecture:
// - Y.js handles only presence data (cursors, avatars, chat)
// - PostgreSQL is the audit layer for chat and session recording
// - Three tables: yjs_documents (snapshots), yjs_updates (recording), chat_messages (audit)

const { Pool } = require("pg");
const { createLogger } = require("../utils/logger");

const log = createLogger("sync");

/**
 * Y.js Persistence Service
 * Handles document snapshots, incremental updates, and chat message storage
 */
class YjsPersistenceService {
  constructor(pool) {
    this.pool = pool;
    this.snapshotInterval = 60000; // 60 seconds default
    this.snapshotTimers = new Map(); // roomId -> timer
    this.matrixBridge = null; // Set via setMatrixBridge()
  }

  /**
   * Initialize the service with a database pool
   * @param {Pool} pool - PostgreSQL connection pool
   */
  static create(connectionConfig) {
    const pool = new Pool(connectionConfig);

    pool.on("connect", () => {
      log.info("Y.js persistence connected to PostgreSQL");
    });

    pool.on("error", (err) => {
      log.error("PostgreSQL pool error:", err.message);
    });

    return new YjsPersistenceService(pool);
  }

  /**
   * Set Matrix bridge for federation sync
   * @param {MatrixBridgeService} matrixBridge - Matrix bridge instance
   */
  setMatrixBridge(matrixBridge) {
    this.matrixBridge = matrixBridge;
    log.info("Matrix bridge connected to Y.js persistence");
  }

  /**
   * Get or create a Y.js document record
   * @param {string} roomId - Room identifier
   * @param {string} projectId - Optional project UUID
   * @returns {Promise<{id: string, documentState: Buffer|null, snapshotVersion: number}>}
   */
  async getOrCreateDocument(roomId, projectId = null) {
    const client = await this.pool.connect();
    try {
      // Try to get existing document
      const existing = await client.query(
        `SELECT id, document_state, snapshot_version, last_update_id
         FROM yjs_documents WHERE room_id = $1`,
        [roomId]
      );

      if (existing.rows.length > 0) {
        const doc = existing.rows[0];
        log.debug(
          "Loaded existing Y.js document for room:",
          roomId,
          "version:",
          doc.snapshot_version
        );
        return {
          id: doc.id,
          documentState: doc.document_state,
          snapshotVersion: doc.snapshot_version,
          lastUpdateId: doc.last_update_id,
        };
      }

      // Create new document record
      const result = await client.query(
        `INSERT INTO yjs_documents (room_id, project_id, document_state, snapshot_version)
         VALUES ($1, $2, $3, 1)
         RETURNING id, document_state, snapshot_version`,
        [roomId, projectId, Buffer.alloc(0)] // Empty initial state
      );

      log.info("Created new Y.js document for room:", roomId);
      return {
        id: result.rows[0].id,
        documentState: null,
        snapshotVersion: 1,
        lastUpdateId: null,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Store a Y.js binary update
   * @param {string} roomId - Room identifier
   * @param {Buffer} update - Binary Y.js update
   * @param {string} origin - Update origin: 'chat', 'cursor', 'camera', 'avatar', 'presence'
   * @param {string} userId - Optional user UUID
   * @param {number} clientId - Y.js awareness client ID
   * @returns {Promise<{id: string, sequenceNum: number}>}
   */
  async storeUpdate(
    roomId,
    update,
    origin = null,
    userId = null,
    clientId = null
  ) {
    // Skip cursor/avatar updates to reduce noise (unless recording is enabled)
    // For now, we only persist chat-related updates
    if (origin === "cursor" || origin === "avatar" || origin === "presence") {
      log.trace("Skipping noisy update:", origin, "for room:", roomId);
      return null;
    }

    const result = await this.pool.query(
      `INSERT INTO yjs_updates (room_id, update_data, update_origin, user_id, client_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, sequence_num`,
      [roomId, update, origin, userId, clientId]
    );

    log.trace(
      "Stored Y.js update for room:",
      roomId,
      "origin:",
      origin,
      "sequence:",
      result.rows[0].sequence_num
    );

    return {
      id: result.rows[0].id,
      sequenceNum: parseInt(result.rows[0].sequence_num),
    };
  }

  /**
   * Store a document snapshot (compressed state vector)
   * @param {string} roomId - Room identifier
   * @param {Buffer} stateVector - Encoded Y.Doc state
   * @param {string} lastUpdateId - ID of the last applied update
   * @returns {Promise<number>} New snapshot version
   */
  async storeSnapshot(roomId, stateVector, lastUpdateId = null) {
    const result = await this.pool.query(
      `UPDATE yjs_documents
       SET document_state = $2,
           snapshot_version = snapshot_version + 1,
           last_update_id = $3,
           updated_at = NOW()
       WHERE room_id = $1
       RETURNING snapshot_version`,
      [roomId, stateVector, lastUpdateId]
    );

    if (result.rows.length === 0) {
      log.warn("Attempted to snapshot non-existent document:", roomId);
      return 0;
    }

    const version = result.rows[0].snapshot_version;
    log.debug("Stored snapshot for room:", roomId, "version:", version);
    return version;
  }

  /**
   * Get updates since a specific sequence number (for client sync)
   * @param {string} roomId - Room identifier
   * @param {number} sequenceNum - Starting sequence number (exclusive)
   * @param {number} limit - Maximum updates to return
   * @returns {Promise<Array<{id: string, updateData: Buffer, origin: string, sequenceNum: number, timestamp: Date}>>}
   */
  async getUpdatesSince(roomId, sequenceNum, limit = 1000) {
    const result = await this.pool.query(
      `SELECT id, update_data, update_origin, sequence_num, timestamp
       FROM yjs_updates
       WHERE room_id = $1 AND sequence_num > $2
       ORDER BY sequence_num ASC
       LIMIT $3`,
      [roomId, sequenceNum, limit]
    );

    log.debug(
      "Retrieved",
      result.rows.length,
      "updates for room:",
      roomId,
      "since sequence:",
      sequenceNum
    );

    return result.rows.map((row) => ({
      id: row.id,
      updateData: row.update_data,
      origin: row.update_origin,
      sequenceNum: parseInt(row.sequence_num),
      timestamp: row.timestamp,
    }));
  }

  /**
   * Store a chat message for audit trail
   * @param {string} roomId - Room identifier
   * @param {string} projectId - Optional project UUID
   * @param {string} userId - Optional user UUID
   * @param {string} username - Display name (denormalized)
   * @param {string} message - Message content
   * @param {string} yjsUpdateId - Related Y.js update ID
   * @param {Object} metadata - Additional metadata (mentions, attachments, etc.)
   * @returns {Promise<{id: string, timestamp: Date}>}
   */
  async storeChatMessage(
    roomId,
    projectId,
    userId,
    username,
    message,
    yjsUpdateId = null,
    metadata = {}
  ) {
    const result = await this.pool.query(
      `INSERT INTO chat_messages
       (room_id, project_id, user_id, username, message, yjs_update_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, timestamp`,
      [
        roomId,
        projectId,
        userId,
        username,
        message,
        yjsUpdateId,
        JSON.stringify(metadata),
      ]
    );

    log.debug("Stored chat message in room:", roomId, "from:", username);

    const messageData = {
      id: result.rows[0].id,
      timestamp: result.rows[0].timestamp,
      roomId,
      projectId,
      userId,
      username,
      message,
      metadata,
    };

    // Sync to Matrix federation (if enabled and connected)
    if (this.matrixBridge && this.matrixBridge.isConnected) {
      // Async sync - don't block chat message storage
      this.matrixBridge.syncToMatrix(messageData).catch((err) => {
        log.error("Failed to sync message to Matrix:", err.message);
        // Message is already stored in PostgreSQL, so this is non-fatal
      });
    }

    return {
      id: messageData.id,
      timestamp: messageData.timestamp,
    };
  }

  /**
   * Get paginated chat history for a room
   * @param {string} roomId - Room identifier
   * @param {number} limit - Maximum messages to return
   * @param {Date} before - Get messages before this timestamp
   * @returns {Promise<Array<Object>>}
   */
  async getChatHistory(roomId, limit = 100, before = null) {
    let query = `
      SELECT id, room_id, project_id, user_id, username, message,
             timestamp, reply_to_id, thread_root_id, message_type, metadata
      FROM chat_messages
      WHERE room_id = $1 AND deleted_at IS NULL
    `;
    const params = [roomId];
    let paramIndex = 2;

    if (before) {
      query += ` AND timestamp < $${paramIndex++}`;
      params.push(before);
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await this.pool.query(query, params);

    // Return in chronological order
    const messages = result.rows.reverse();

    log.debug("Retrieved", messages.length, "chat messages for room:", roomId);

    return messages.map((row) => ({
      id: row.id,
      roomId: row.room_id,
      projectId: row.project_id,
      userId: row.user_id,
      username: row.username,
      message: row.message,
      timestamp: row.timestamp,
      replyToId: row.reply_to_id,
      threadRootId: row.thread_root_id,
      messageType: row.message_type,
      metadata: row.metadata,
    }));
  }

  /**
   * Get chat history for an entire project (across all rooms)
   * @param {string} projectId - Project UUID
   * @param {number} limit - Maximum messages to return
   * @param {Date} before - Get messages before this timestamp
   * @returns {Promise<Array<Object>>}
   */
  async getProjectChatHistory(projectId, limit = 100, before = null) {
    let query = `
      SELECT id, room_id, project_id, user_id, username, message,
             timestamp, reply_to_id, thread_root_id, message_type, metadata
      FROM chat_messages
      WHERE project_id = $1 AND deleted_at IS NULL
    `;
    const params = [projectId];
    let paramIndex = 2;

    if (before) {
      query += ` AND timestamp < $${paramIndex++}`;
      params.push(before);
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await this.pool.query(query, params);

    // Return in chronological order
    const messages = result.rows.reverse();

    log.debug(
      "Retrieved",
      messages.length,
      "chat messages for project:",
      projectId
    );

    return messages.map((row) => ({
      id: row.id,
      roomId: row.room_id,
      projectId: row.project_id,
      userId: row.user_id,
      username: row.username,
      message: row.message,
      timestamp: row.timestamp,
      replyToId: row.reply_to_id,
      threadRootId: row.thread_root_id,
      messageType: row.message_type,
      metadata: row.metadata,
    }));
  }

  /**
   * Delete old updates to save space (keep snapshots)
   * Called periodically or when room is closed
   * @param {string} roomId - Room identifier
   * @param {number} keepLast - Number of recent updates to keep
   * @returns {Promise<number>} Number of deleted updates
   */
  async pruneUpdates(roomId, keepLast = 1000) {
    const result = await this.pool.query(
      `DELETE FROM yjs_updates
       WHERE room_id = $1
       AND sequence_num < (
         SELECT COALESCE(MAX(sequence_num), 0) - $2
         FROM yjs_updates WHERE room_id = $1
       )
       RETURNING id`,
      [roomId, keepLast]
    );

    if (result.rows.length > 0) {
      log.info("Pruned", result.rows.length, "old updates for room:", roomId);
    }

    return result.rows.length;
  }

  /**
   * Schedule periodic snapshots for a room
   * @param {string} roomId - Room identifier
   * @param {function} getState - Callback to get current Y.Doc state
   */
  scheduleSnapshots(roomId, getState) {
    // Clear any existing timer
    this.cancelSnapshots(roomId);

    const timer = setInterval(async () => {
      try {
        const state = getState();
        if (state && state.length > 0) {
          await this.storeSnapshot(roomId, state);
        }
      } catch (err) {
        log.error("Snapshot failed for room:", roomId, err.message);
      }
    }, this.snapshotInterval);

    this.snapshotTimers.set(roomId, timer);
    log.debug(
      "Scheduled snapshots for room:",
      roomId,
      "interval:",
      this.snapshotInterval / 1000,
      "s"
    );
  }

  /**
   * Cancel scheduled snapshots for a room
   * @param {string} roomId - Room identifier
   */
  cancelSnapshots(roomId) {
    const timer = this.snapshotTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.snapshotTimers.delete(roomId);
      log.debug("Cancelled snapshots for room:", roomId);
    }
  }

  /**
   * Perform final snapshot when room is emptied
   * @param {string} roomId - Room identifier
   * @param {Buffer} state - Final Y.Doc state
   */
  async finalSnapshot(roomId, state) {
    this.cancelSnapshots(roomId);

    if (state && state.length > 0) {
      await this.storeSnapshot(roomId, state);
      log.info("Stored final snapshot for room:", roomId);
    }

    // Optionally prune old updates
    await this.pruneUpdates(roomId);
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    // Cancel all snapshot timers
    for (const [roomId, timer] of this.snapshotTimers) {
      clearInterval(timer);
      log.debug("Cancelled snapshot timer for room:", roomId);
    }
    this.snapshotTimers.clear();

    // Close database pool
    await this.pool.end();
    log.info("Y.js persistence service shut down");
  }
}

module.exports = { YjsPersistenceService };
