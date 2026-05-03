// server/src/services/websocket.js
// WebSocket manager for real-time event broadcasting
// Server-authoritative: all state changes are broadcast from server to clients

const WebSocket = require("ws");
const { createLogger } = require("../utils/logger");
const { DEV_BYPASS_AUTH, verifyJwtToken } = require("../middleware/auth");

const ws = createLogger("ws");
const auth = createLogger("auth");

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map<userId, Set<WebSocket>>
    this.rooms = new Map(); // Map<projectId, Set<WebSocket>>
    this.pool = null;
  }

  /**
   * Initialize WebSocket server
   * @param {http.Server} server - HTTP server instance
   */
  initialize(server, pool = null) {
    this.wss = new WebSocket.Server({ server, path: "/ws" });
    this.pool = pool;

    this.wss.on("connection", (wsClient, req) => {
      ws.info("WebSocket client connected");

      // Store connection metadata
      wsClient.isAlive = true;
      wsClient.userId = null;
      wsClient.user = null;
      wsClient.isAuthenticated = false;
      wsClient.projectId = null;

      // Handle pong responses
      wsClient.on("pong", () => {
        wsClient.isAlive = true;
      });

      // Handle incoming messages
      wsClient.on("message", (data) => {
        void this._handleMessage(wsClient, data);
      });

      // Handle disconnection
      wsClient.on("close", () => {
        this._handleDisconnect(wsClient);
      });

      // Handle errors
      wsClient.on("error", (error) => {
        ws.error("WebSocket error:", error);
      });

      // Send welcome message
      this._send(wsClient, {
        type: "connected",
        serverTime: new Date().toISOString(),
      });
    });

    // Heartbeat interval to detect dead connections
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((client) => {
        if (!client.isAlive) {
          ws.warn("Terminating dead WebSocket connection");
          return client.terminate();
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);

    ws.info("WebSocket server initialized");
  }

  /**
   * Handle incoming WebSocket messages
   */
  async _handleMessage(socket, data) {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case "ping":
          this._send(socket, {
            type: "pong",
            serverTime: new Date().toISOString(),
          });
          break;

        case "auth":
          await this._handleAuth(socket, message);
          break;

        case "join:project":
          await this._handleJoinProject(socket, message.projectId);
          break;

        case "leave:project":
          this._handleLeaveProject(socket);
          break;

        default:
          ws.warn("Unknown message type:", message.type);
      }
    } catch (error) {
      ws.error("Failed to parse WebSocket message:", error);
    }
  }

  /**
   * Handle authentication
   */
  async _handleAuth(socket, message) {
    try {
      let user = null;

      if (DEV_BYPASS_AUTH) {
        const userId = message.userId;
        if (!userId) {
          throw new Error("Missing userId in dev bypass mode");
        }
        user = {
          id: userId,
          email: message.userEmail || "developer@localhost",
          name: message.userName || "Development User",
          roles: message.roles || ["user", "admin"],
        };
      } else {
        const token = message.token || message.accessToken;
        user = await verifyJwtToken(token);
      }

      socket.userId = user.id;
      socket.user = user;
      socket.isAuthenticated = true;

      // Add to clients map
      if (!this.clients.has(socket.userId)) {
        this.clients.set(socket.userId, new Set());
      }
      this.clients.get(socket.userId).add(socket);

      this._send(socket, {
        type: "auth:success",
        userId: socket.userId,
      });

      auth.info("User authenticated via WebSocket:", socket.userId);
    } catch (error) {
      auth.warn("WebSocket auth failed:", error.message);
      this._send(socket, { type: "auth:error", error: error.message });
      socket.close(1008, "Authentication failed");
    }
  }

  /**
   * Handle joining a project room
   */
  async _handleJoinProject(socket, projectId) {
    if (!socket.isAuthenticated || !socket.userId) {
      this._send(socket, {
        type: "project:join-error",
        error: "Authentication required",
      });
      return;
    }

    if (!projectId) {
      this._send(socket, {
        type: "project:join-error",
        error: "Missing projectId",
      });
      return;
    }

    const hasAccess = await this._checkProjectAccess(projectId, socket.userId);
    if (!hasAccess) {
      this._send(socket, {
        type: "project:join-error",
        error: "Access denied",
      });
      return;
    }

    // Leave previous room if any
    if (socket.projectId) {
      this._handleLeaveProject(socket);
    }

    socket.projectId = projectId;

    // Add to room
    if (!this.rooms.has(projectId)) {
      this.rooms.set(projectId, new Set());
    }
    this.rooms.get(projectId).add(socket);

    ws.info("User joined project:", socket.userId, projectId);

    // Notify room members
    this.broadcastToProject(
      projectId,
      {
        type: "member:joined",
        projectId,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      },
      socket
    );

    // Send confirmation
    this._send(socket, {
      type: "project:joined",
      projectId,
    });
  }

  /**
   * Check if a user has access to a project
   */
  async _checkProjectAccess(projectId, userId) {
    if (!this.pool) {
      ws.warn("Project access check skipped (no DB pool configured)");
      return false;
    }

    try {
      const result = await this.pool.query(
        `
        SELECT 1
        FROM project_members
        WHERE project_id = $1 AND user_id = $2
      `,
        [projectId, userId]
      );
      return result.rows.length > 0;
    } catch (error) {
      ws.error("Failed to check project access:", error);
      return false;
    }
  }

  /**
   * Handle leaving a project room
   */
  _handleLeaveProject(socket) {
    if (!socket.projectId) return;

    const projectId = socket.projectId;
    const room = this.rooms.get(projectId);

    if (room) {
      room.delete(socket);
      if (room.size === 0) {
        this.rooms.delete(projectId);
      }
    }

    // Notify room members
    this.broadcastToProject(projectId, {
      type: "member:left",
      projectId,
      userId: socket.userId,
      timestamp: new Date().toISOString(),
    });

    socket.projectId = null;
    ws.info("User left project:", socket.userId, projectId);
  }

  /**
   * Handle client disconnection
   */
  _handleDisconnect(socket) {
    // Leave project room
    this._handleLeaveProject(socket);

    // Remove from clients map
    if (socket.userId && this.clients.has(socket.userId)) {
      this.clients.get(socket.userId).delete(socket);
      if (this.clients.get(socket.userId).size === 0) {
        this.clients.delete(socket.userId);
      }
    }

    ws.info("WebSocket client disconnected");
  }

  /**
   * Send message to a single client
   */
  _send(socket, message) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to all clients in a project
   * @param {string} projectId - Project ID
   * @param {object} message - Message to broadcast
   * @param {WebSocket} exclude - Optional client to exclude
   */
  broadcastToProject(projectId, message, exclude = null) {
    const room = this.rooms.get(projectId);
    if (!room) return;

    const payload = JSON.stringify(message);
    room.forEach((ws) => {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  /**
   * Alias for broadcastToProject - used by route handlers
   * @param {string} projectId - Project ID
   * @param {object} message - Message to broadcast
   */
  broadcast(projectId, message) {
    this.broadcastToProject(projectId, message);
  }

  /**
   * Broadcast message to a specific user (all their connections)
   * @param {string} userId - User ID
   * @param {object} message - Message to broadcast
   */
  broadcastToUser(userId, message) {
    const userSockets = this.clients.get(userId);
    if (!userSockets) return;

    const payload = JSON.stringify(message);
    userSockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  /**
   * Broadcast message to all connected clients
   * @param {object} message - Message to broadcast
   */
  broadcastAll(message) {
    if (!this.wss) return;

    const payload = JSON.stringify(message);
    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  // ============================================================================
  // EVENT HELPERS - Call these from route handlers after mutations
  // ============================================================================

  /**
   * Broadcast file added event
   */
  fileAdded(projectId, file) {
    const room = this.rooms.get(projectId);
    ws.debug(
      "Broadcasting file:added:",
      file.filename,
      "to project:",
      projectId
    );
    ws.debug("Room exists:", !!room, "clients in room:", room ? room.size : 0);

    this.broadcastToProject(projectId, {
      type: "file:added",
      projectId,
      file,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast file removed event
   */
  fileRemoved(projectId, fileId) {
    this.broadcastToProject(projectId, {
      type: "file:removed",
      projectId,
      fileId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast file version added event
   */
  fileVersionAdded(projectId, fileId, version) {
    this.broadcastToProject(projectId, {
      type: "file:version-added",
      projectId,
      fileId,
      version,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast annotation created event
   */
  annotationCreated(projectId, fileId, annotation) {
    this.broadcastToProject(projectId, {
      type: "annotation:created",
      projectId,
      fileId,
      annotation,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast annotation updated event
   */
  annotationUpdated(projectId, fileId, annotation) {
    this.broadcastToProject(projectId, {
      type: "annotation:updated",
      projectId,
      fileId,
      annotation,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast annotation deleted event
   */
  annotationDeleted(projectId, fileId, annotationId) {
    this.broadcastToProject(projectId, {
      type: "annotation:deleted",
      projectId,
      fileId,
      annotationId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast view created event
   */
  viewCreated(projectId, view) {
    this.broadcastToProject(projectId, {
      type: "view:created",
      projectId,
      view,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast view updated event
   */
  viewUpdated(projectId, view) {
    this.broadcastToProject(projectId, {
      type: "view:updated",
      projectId,
      view,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast view deleted event
   */
  viewDeleted(projectId, viewId) {
    this.broadcastToProject(projectId, {
      type: "view:deleted",
      projectId,
      viewId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast computation progress
   */
  computeProgress(userId, jobId, progress, message = null) {
    this.broadcastToUser(userId, {
      type: "compute:progress",
      jobId,
      progress,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast computation complete
   */
  computeComplete(userId, jobId, result) {
    this.broadcastToUser(userId, {
      type: "compute:complete",
      jobId,
      result,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast computation failed
   */
  computeFailed(userId, jobId, error) {
    this.broadcastToUser(userId, {
      type: "compute:failed",
      jobId,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================================================
  // VR SESSION EVENTS
  // ============================================================================

  /**
   * Broadcast VR session created event
   */
  vrSessionCreated(projectId, session) {
    this.broadcastToProject(projectId, {
      type: "vr:session-created",
      projectId,
      session: {
        id: session.id,
        ownerUserId: session.owner_user_id,
        ownerUserName: session.owner_user_name,
        datasetId: session.dataset_id,
        viewConfigurationId: session.view_configuration_id,
        status: session.status,
        allowJoin: session.allow_join,
        createdAt: session.created_at,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast VR session updated event
   */
  vrSessionUpdated(projectId, sessionId, updates) {
    this.broadcastToProject(projectId, {
      type: "vr:session-updated",
      projectId,
      sessionId,
      updates,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast VR session ended event
   */
  vrSessionEnded(projectId, sessionId) {
    this.broadcastToProject(projectId, {
      type: "vr:session-ended",
      projectId,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast VR participant joined event
   */
  vrParticipantJoined(projectId, sessionId, participant) {
    this.broadcastToProject(projectId, {
      type: "vr:participant-joined",
      projectId,
      sessionId,
      participant: {
        odUserId: participant.od_user_id,
        userName: participant.user_name,
        mode: participant.mode,
        joinedAt: participant.joined_at,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast VR participant left event
   */
  vrParticipantLeft(projectId, sessionId, userId) {
    this.broadcastToProject(projectId, {
      type: "vr:participant-left",
      projectId,
      sessionId,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast VR snapshot created event
   */
  vrSnapshotCreated(projectId, sessionId, snapshot) {
    this.broadcastToProject(projectId, {
      type: "vr:snapshot-created",
      projectId,
      sessionId,
      snapshot: {
        id: snapshot.id,
        name: snapshot.name,
        createdBy: snapshot.created_by,
        createdByName: snapshot.created_by_name,
        timestamp: snapshot.timestamp,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast provenance update event
   */
  provenanceUpdated(projectId, payload) {
    this.broadcastToProject(projectId, {
      type: "provenance:updated",
      projectId,
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast analysis snapshot created event
   */
  analysisSnapshotCreated(projectId, snapshot) {
    this.broadcastToProject(projectId, {
      type: "analysis:snapshot-created",
      projectId,
      snapshot,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get count of connected clients
   */
  getClientCount() {
    return this.wss ? this.wss.clients.size : 0;
  }

  /**
   * Get count of clients in a project room
   */
  getProjectClientCount(projectId) {
    const room = this.rooms.get(projectId);
    return room ? room.size : 0;
  }

  /**
   * Cleanup on server shutdown
   */
  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.wss) {
      this.wss.close();
    }
  }
}

// Singleton instance
const wsManager = new WebSocketManager();

module.exports = wsManager;
