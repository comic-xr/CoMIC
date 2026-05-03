// server/src/routes/chat.js
// REST endpoints for chat history retrieval
//
// Chat messages are persisted by the Y.js WebSocket server (server.js)
// These endpoints provide query access for audit, search, and history loading

const express = require("express");
const router = express.Router();
const { createLogger } = require("../utils/logger");

const log = createLogger("chat");

/**
 * GET /api/rooms/:roomId/chat
 * Get chat history for a specific room
 *
 * Query params:
 *   - limit: Maximum messages to return (default 100, max 500)
 *   - before: ISO timestamp cursor for pagination (get messages before this time)
 *
 * Returns: Array of messages in chronological order (oldest first)
 */
router.get("/rooms/:roomId/chat", async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { pool } = req.app.locals;

    // Parse and validate query params
    let limit = parseInt(req.query.limit) || 100;
    limit = Math.min(Math.max(1, limit), 500); // Clamp to 1-500

    const before = req.query.before ? new Date(req.query.before) : null;
    if (before && isNaN(before.getTime())) {
      return res.status(400).json({
        error: "Invalid 'before' timestamp",
        message: "Expected ISO 8601 format (e.g., 2024-01-15T10:30:00Z)",
      });
    }

    // Build query
    let query = `
      SELECT
        id, room_id, project_id, user_id, username, message,
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

    const result = await pool.query(query, params);

    // Return in chronological order (reverse the DESC order)
    const messages = result.rows.reverse().map(formatMessage);

    // Get pagination info
    const hasMore = result.rows.length === limit;
    const oldestTimestamp = messages.length > 0 ? messages[0].timestamp : null;

    log.debug("Retrieved", messages.length, "messages for room:", roomId);

    res.json({
      roomId,
      messages,
      pagination: {
        limit,
        returned: messages.length,
        hasMore,
        oldestTimestamp,
      },
    });
  } catch (error) {
    log.error("Error fetching room chat:", error.message);
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/chat
 * Get chat history for an entire project (across all rooms)
 *
 * Query params:
 *   - limit: Maximum messages to return (default 100, max 500)
 *   - before: ISO timestamp cursor for pagination
 *   - roomId: Optional filter to specific room within project
 *
 * Returns: Array of messages in chronological order with room context
 */
router.get("/projects/:projectId/chat", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { pool } = req.app.locals;

    // Parse and validate query params
    let limit = parseInt(req.query.limit) || 100;
    limit = Math.min(Math.max(1, limit), 500);

    const before = req.query.before ? new Date(req.query.before) : null;
    if (before && isNaN(before.getTime())) {
      return res.status(400).json({
        error: "Invalid 'before' timestamp",
      });
    }

    const roomFilter = req.query.roomId || null;

    // Build query
    let query = `
      SELECT
        cm.id, cm.room_id, cm.project_id, cm.user_id, cm.username, cm.message,
        cm.timestamp, cm.reply_to_id, cm.thread_root_id, cm.message_type, cm.metadata
      FROM chat_messages cm
      WHERE cm.project_id = $1 AND cm.deleted_at IS NULL
    `;
    const params = [projectId];
    let paramIndex = 2;

    if (roomFilter) {
      query += ` AND cm.room_id = $${paramIndex++}`;
      params.push(roomFilter);
    }

    if (before) {
      query += ` AND cm.timestamp < $${paramIndex++}`;
      params.push(before);
    }

    query += ` ORDER BY cm.timestamp DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    // Return in chronological order
    const messages = result.rows.reverse().map(formatMessage);

    const hasMore = result.rows.length === limit;
    const oldestTimestamp = messages.length > 0 ? messages[0].timestamp : null;

    // Get unique rooms represented in results
    const roomIds = [...new Set(messages.map((m) => m.roomId))];

    log.debug(
      "Retrieved",
      messages.length,
      "messages for project:",
      projectId,
      "across",
      roomIds.length,
      "rooms"
    );

    res.json({
      projectId,
      messages,
      rooms: roomIds,
      pagination: {
        limit,
        returned: messages.length,
        hasMore,
        oldestTimestamp,
      },
    });
  } catch (error) {
    log.error("Error fetching project chat:", error.message);
    next(error);
  }
});

/**
 * GET /api/rooms/:roomId/chat/search
 * Search chat messages in a room
 *
 * Query params:
 *   - q: Search query (required)
 *   - limit: Maximum results (default 50)
 *   - username: Filter by username
 *
 * Returns: Array of matching messages
 */
router.get("/rooms/:roomId/chat/search", async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { pool } = req.app.locals;

    const query_text = req.query.q;
    if (!query_text || query_text.trim().length === 0) {
      return res.status(400).json({
        error: "Search query required",
        message: "Provide 'q' query parameter",
      });
    }

    let limit = parseInt(req.query.limit) || 50;
    limit = Math.min(Math.max(1, limit), 200);

    const usernameFilter = req.query.username || null;

    // Build search query with ILIKE for case-insensitive partial match
    let query = `
      SELECT
        id, room_id, project_id, user_id, username, message,
        timestamp, reply_to_id, thread_root_id, message_type, metadata
      FROM chat_messages
      WHERE room_id = $1
        AND deleted_at IS NULL
        AND message ILIKE $2
    `;
    const params = [roomId, `%${query_text}%`];
    let paramIndex = 3;

    if (usernameFilter) {
      query += ` AND username ILIKE $${paramIndex++}`;
      params.push(`%${usernameFilter}%`);
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);
    const messages = result.rows.map(formatMessage);

    log.debug(
      "Search returned",
      messages.length,
      "results for query:",
      query_text
    );

    res.json({
      roomId,
      query: query_text,
      messages,
      count: messages.length,
    });
  } catch (error) {
    log.error("Error searching chat:", error.message);
    next(error);
  }
});

/**
 * GET /api/rooms/:roomId/chat/stats
 * Get chat statistics for a room
 *
 * Returns: Message counts, active users, etc.
 */
router.get("/rooms/:roomId/chat/stats", async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { pool } = req.app.locals;

    // Get aggregate statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_messages,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT username) as unique_usernames,
        MIN(timestamp) as first_message,
        MAX(timestamp) as last_message,
        COUNT(*) FILTER (WHERE message_type != 'text') as non_text_messages
      FROM chat_messages
      WHERE room_id = $1 AND deleted_at IS NULL
    `;

    const result = await pool.query(statsQuery, [roomId]);
    const stats = result.rows[0];

    // Get top participants
    const participantsQuery = `
      SELECT username, COUNT(*) as message_count
      FROM chat_messages
      WHERE room_id = $1 AND deleted_at IS NULL AND username IS NOT NULL
      GROUP BY username
      ORDER BY message_count DESC
      LIMIT 10
    `;

    const participantsResult = await pool.query(participantsQuery, [roomId]);

    // Get message counts by day (last 30 days)
    const dailyQuery = `
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM chat_messages
      WHERE room_id = $1
        AND deleted_at IS NULL
        AND timestamp > NOW() - INTERVAL '30 days'
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `;

    const dailyResult = await pool.query(dailyQuery, [roomId]);

    res.json({
      roomId,
      stats: {
        totalMessages: parseInt(stats.total_messages),
        uniqueUsers: parseInt(stats.unique_users),
        uniqueUsernames: parseInt(stats.unique_usernames),
        firstMessage: stats.first_message,
        lastMessage: stats.last_message,
        nonTextMessages: parseInt(stats.non_text_messages),
      },
      topParticipants: participantsResult.rows.map((p) => ({
        username: p.username,
        messageCount: parseInt(p.message_count),
      })),
      dailyActivity: dailyResult.rows.map((d) => ({
        date: d.date,
        count: parseInt(d.count),
      })),
    });
  } catch (error) {
    log.error("Error fetching chat stats:", error.message);
    next(error);
  }
});

/**
 * Format a database row into API response format
 */
function formatMessage(row) {
  return {
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
    metadata: row.metadata || {},
  };
}

module.exports = router;
