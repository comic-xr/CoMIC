// server/src/services/audit.js
// Audit logging service for compliance and tracking
// Supports configurable audit levels per organization

const { createLogger } = require("../utils/logger");
const log = createLogger("audit");

/**
 * Audit levels and what they capture
 */
const AUDIT_LEVELS = {
  minimal: {
    events: [
      "auth:login",
      "auth:logout",
      "file:upload",
      "file:delete",
      "annotation:create",
      "annotation:delete",
    ],
    captureChanges: false,
    sessionRecording: false,
  },
  standard: {
    events: [
      // Includes minimal
      "auth:login",
      "auth:logout",
      "file:upload",
      "file:delete",
      "annotation:create",
      "annotation:delete",
      // Plus these
      "file:version_create",
      "annotation:update",
      "view:create",
      "view:update",
      "view:delete",
      "project:member_add",
      "project:member_remove",
      "project:settings_change",
      "branch:create",
      "branch:merge",
    ],
    captureChanges: true,
    sessionRecording: false,
  },
  detailed: {
    events: [
      // Includes standard plus
      "file:access",
      "file:download",
      "annotation:view",
      "view:access",
      "presence:join",
      "presence:leave",
      "compute:request",
      "compute:complete",
    ],
    captureChanges: true,
    sessionRecording: true,
    recordingIntervalMs: 1000, // 1 FPS
  },
  forensic: {
    events: ["*"], // Everything
    captureChanges: true,
    sessionRecording: true,
    recordingIntervalMs: 100, // 10 FPS
    captureNetwork: true,
    captureErrors: true,
  },
};

/**
 * Critical events that should be logged immediately (not buffered)
 */
const CRITICAL_EVENTS = [
  "auth:login",
  "auth:logout",
  "file:upload",
  "file:delete",
  "annotation:delete",
  "project:delete",
  "project:member_remove",
];

class AuditLogger {
  constructor() {
    this.pool = null;
    this.buffer = [];
    this.flushInterval = null;
    this.orgConfigs = new Map(); // Cache of org audit configs
  }

  /**
   * Initialize the audit logger
   * @param {Pool} pool - PostgreSQL connection pool
   */
  initialize(pool) {
    this.pool = pool;

    // Flush buffer every second
    this.flushInterval = setInterval(() => {
      this.flush().catch((err) => {
        log.error("Audit flush error:", err);
      });
    }, 1000);

    log.info("Audit logger initialized");
  }

  /**
   * Get audit configuration for an organization
   */
  async getOrgConfig(orgId) {
    if (!orgId) {
      return AUDIT_LEVELS.standard; // Default level
    }

    // Check cache first
    if (this.orgConfigs.has(orgId)) {
      return this.orgConfigs.get(orgId);
    }

    // Fetch from database
    try {
      const result = await this.pool.query(
        "SELECT audit_config FROM organizations WHERE id = $1",
        [orgId]
      );

      if (result.rows.length > 0) {
        const config = result.rows[0].audit_config || { level: "standard" };
        const levelConfig = AUDIT_LEVELS[config.level] || AUDIT_LEVELS.standard;
        this.orgConfigs.set(orgId, levelConfig);
        return levelConfig;
      }
    } catch (error) {
      log.error("Failed to fetch org audit config:", error);
    }

    return AUDIT_LEVELS.standard;
  }

  /**
   * Clear cached org config (call when org settings change)
   */
  clearOrgConfigCache(orgId) {
    this.orgConfigs.delete(orgId);
  }

  /**
   * Check if an event should be logged at the given level
   */
  shouldLog(action, levelConfig) {
    if (levelConfig.events.includes("*")) return true;
    return levelConfig.events.includes(action);
  }

  /**
   * Check if an event is critical (requires immediate flush)
   */
  isCritical(action) {
    return CRITICAL_EVENTS.includes(action);
  }

  /**
   * Log an audit event
   * @param {object} event - Audit event data
   * @param {string} event.action - Action type (e.g., 'file:upload')
   * @param {string} event.orgId - Organization ID
   * @param {string} event.projectId - Project ID
   * @param {string} event.userId - User ID
   * @param {string} event.entityType - Entity type (e.g., 'file', 'annotation')
   * @param {string} event.entityId - Entity ID
   * @param {object} event.before - State before change (optional)
   * @param {object} event.after - State after change (optional)
   * @param {object} event.details - Additional details (optional)
   * @param {string} event.ipAddress - Client IP address (optional)
   * @param {string} event.userAgent - Client user agent (optional)
   * @param {string} event.sessionRecordingId - Session recording ID (optional)
   */
  async log(event) {
    // Get org-specific config
    const levelConfig = await this.getOrgConfig(event.orgId);

    // Check if this event should be logged at current level
    if (!this.shouldLog(event.action, levelConfig)) {
      return null;
    }

    const record = {
      timestamp: new Date(),
      org_id: event.orgId || null,
      project_id: event.projectId || null,
      user_id: event.userId || null,
      action: event.action,
      entity_type: event.entityType || null,
      entity_id: event.entityId || null,
      before_state: levelConfig.captureChanges ? event.before || null : null,
      after_state: levelConfig.captureChanges ? event.after || null : null,
      details: event.details || {},
      ip_address: event.ipAddress || null,
      user_agent: event.userAgent || null,
      session_recording_id: event.sessionRecordingId || null,
    };

    this.buffer.push(record);

    // Immediate flush for critical events
    if (this.isCritical(event.action)) {
      await this.flush();
    }

    return record;
  }

  /**
   * Flush buffered audit logs to database
   */
  async flush() {
    if (this.buffer.length === 0 || !this.pool) return;

    const records = this.buffer.splice(0, this.buffer.length);

    try {
      // Build batch insert query
      const values = [];
      const placeholders = [];

      records.forEach((record, i) => {
        const offset = i * 12;
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${
            offset + 5
          }, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${
            offset + 10
          }, $${offset + 11}, $${offset + 12})`
        );
        values.push(
          record.timestamp,
          record.org_id,
          record.project_id,
          record.user_id,
          record.action,
          record.entity_type,
          record.entity_id,
          JSON.stringify(record.before_state),
          JSON.stringify(record.after_state),
          JSON.stringify(record.details),
          record.ip_address,
          record.user_agent
        );
      });

      await this.pool.query(
        `
        INSERT INTO audit_log (
          timestamp, organization_id, project_id, user_id,
          action, entity_type, entity_id,
          before_state, after_state, details,
          ip_address, user_agent
        )
        VALUES ${placeholders.join(", ")}
      `,
        values
      );
    } catch (error) {
      log.error("Failed to flush audit logs:", error);
      // Put records back in buffer for retry
      this.buffer.unshift(...records);
    }
  }

  /**
   * Query audit logs
   * @param {object} filters - Query filters
   * @returns {Promise<Array>} Matching audit records
   */
  async query(filters = {}) {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (filters.orgId) {
      conditions.push(`organization_id = $${paramIndex++}`);
      values.push(filters.orgId);
    }

    if (filters.projectId) {
      conditions.push(`project_id = $${paramIndex++}`);
      values.push(filters.projectId);
    }

    if (filters.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(filters.userId);
    }

    if (filters.action) {
      conditions.push(`action = $${paramIndex++}`);
      values.push(filters.action);
    }

    if (filters.entityType) {
      conditions.push(`entity_type = $${paramIndex++}`);
      values.push(filters.entityType);
    }

    if (filters.entityId) {
      conditions.push(`entity_id = $${paramIndex++}`);
      values.push(filters.entityId);
    }

    if (filters.startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(filters.endDate);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const result = await this.pool.query(
      `
      SELECT * FROM audit_log
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `,
      [...values, limit, offset]
    );

    return result.rows;
  }

  /**
   * Shutdown the audit logger
   */
  async shutdown() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush(); // Final flush
    log.info("Audit logger shut down");
  }
}

// Singleton instance
const auditLogger = new AuditLogger();

/**
 * Express middleware to add audit context to requests
 */
function auditMiddleware(req, res, next) {
  // Add audit helper to request
  req.audit = async (event) => {
    return auditLogger.log({
      ...event,
      userId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });
  };

  next();
}

module.exports = {
  auditLogger,
  auditMiddleware,
  AUDIT_LEVELS,
};
