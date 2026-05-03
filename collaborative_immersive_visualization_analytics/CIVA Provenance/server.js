// server.js - Y.js WebSocket Server with PostgreSQL Persistence
//
// Phase 2E: Adds persistence for chat audit trail, session recording foundation,
// and state hydration on reconnect.
//
// Architecture:
// - Y.js handles presence data only (cursors, avatars, chat)
// - PostgreSQL stores snapshots (fast hydration), updates (recording), chat (audit)
// - Datasets, views, annotations use REST API (not Y.js)

const WebSocket = require("ws");
const http = require("http");
const Y = require("yjs");
const { encoding, decoding } = require("lib0");
const syncProtocol = require("y-protocols/sync");
const awarenessProtocol = require("y-protocols/awareness");
const { createLogger } = require("./server/src/utils/logger");
const { DEV_BYPASS_AUTH, verifyJwtToken } = require("./server/src/middleware/auth");
const {
  YjsPersistenceService,
} = require("./server/src/services/yjsPersistence");
const { createMatrixBridge } = require("./server/src/services/matrixBridge");

const wsLog = createLogger("ws");
const serverLog = createLogger("server");
const syncLog = createLogger("sync");
const recordingLog = createLogger("recording");
const matrixLog = createLogger("matrix-bridge");

// Message types (Y.js protocol)
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MESSAGE_AUTH = 2;
const MESSAGE_QUERY_AWARENESS = 3;

// Build database connection config from environment
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "cia_analytics",
  user: process.env.DB_USER || "ciauser",
  password: process.env.DB_PASSWORD || "ciadevpassword",
};

// Initialize persistence service
let persistence = null;
try {
  persistence = YjsPersistenceService.create(dbConfig);
  syncLog.info("Y.js persistence service initialized");
} catch (err) {
  syncLog.error("Failed to initialize persistence:", err.message);
  syncLog.warn("Running without persistence - data will not be saved");
}

// Initialize Matrix bridge (if enabled)
let matrixBridge = null;
if (process.env.MATRIX_FEDERATION_ENABLED === 'true' && persistence) {
  try {
    matrixBridge = createMatrixBridge({
      enabled: true,
      homeserverUrl: process.env.MATRIX_BASE_URL || 'http://localhost:8008',
      serverName: process.env.MATRIX_SERVER_NAME || 'matrix.cia-web.local',
      asToken: process.env.MATRIX_AS_TOKEN,
      hsToken: process.env.MATRIX_HS_TOKEN,
      senderLocalpart: 'cia_bridge',
    });

    // Initialize Matrix bridge asynchronously
    (async () => {
      try {
        await matrixBridge.initialize(persistence, persistence.pool);

        // Set Matrix bridge on persistence service
        persistence.setMatrixBridge(matrixBridge);

        // Set up callback for inbound Matrix messages
        matrixBridge.onMessageFromMatrix = (messageData) => {
          // Find the Y.js room for this message
          const room = rooms.get(messageData.roomId);
          if (!room) {
            matrixLog.warn('Received Matrix message for unknown room:', messageData.roomId);
            return;
          }

          // Add the message to the Y.js chatMessages array
          const chatArray = room.doc.getArray('chatMessages');

          // Create message object matching Y.js chat format
          const yjsMessage = {
            id: messageData.messageId,
            userName: messageData.username,
            text: messageData.message,
            timestamp: messageData.timestamp.toISOString(),
            messageType: 'text',
            metadata: {
              ...messageData.federation,
              isFederated: true,
            },
          };

          // Add to Y.js array (this will sync to all connected clients)
          chatArray.push([yjsMessage]);

          matrixLog.info('Broadcast Matrix message to Y.js clients:', messageData.roomId);
        };

        matrixLog.info('Matrix federation enabled for Y.js chat');
      } catch (error) {
        matrixLog.error('Failed to initialize Matrix bridge:', error.message);
        matrixLog.warn('Chat will continue without Matrix federation');
      }
    })();
  } catch (error) {
    matrixLog.error('Failed to create Matrix bridge:', error.message);
  }
} else if (process.env.MATRIX_FEDERATION_ENABLED === 'true') {
  matrixLog.warn('Matrix federation enabled but persistence not available');
} else {
  matrixLog.info('Matrix federation disabled');
}

/**
 * Active recording cache
 * Maps projectId -> { recordingId, startTime, eventCount }
 */
const activeRecordings = new Map();

/**
 * Cursor throttling state
 * Maps clientId -> { x, y, z, timestamp }
 */
const lastCursorPositions = new Map();

// Cursor recording settings
const CURSOR_THROTTLE_MS = 66; // ~15 fps

/**
 * Refresh active recordings cache from database
 */
async function refreshActiveRecordings() {
  if (!persistence?.pool) return;

  try {
    const result = await persistence.pool.query(`
      SELECT id, project_id, started_at
      FROM session_recordings
      WHERE status = 'recording'
    `);

    // Clear and rebuild cache
    activeRecordings.clear();

    for (const row of result.rows) {
      activeRecordings.set(row.project_id, {
        recordingId: row.id,
        startTime: new Date(row.started_at).getTime(),
        eventCount: 0,
      });
    }

    if (result.rows.length > 0) {
      recordingLog.debug(`Recording cache: ${result.rows.length} active`);
    }
  } catch (err) {
    recordingLog.error("Failed to refresh recordings cache:", err.message);
  }
}

/**
 * Check if cursor update should be recorded (throttle + delta filter)
 */
function shouldRecordCursor(clientId, cursor) {
  if (!cursor || cursor.x === undefined || cursor.y === undefined) return false;

  const now = Date.now();
  const last = lastCursorPositions.get(clientId);

  // Time throttle (~15 fps)
  if (last && now - last.timestamp < CURSOR_THROTTLE_MS) {
    return false;
  }

  // Delta filter - skip if barely moved (use 2D since we get screen coords)
  if (last) {
    const dx = Math.abs((cursor.x || 0) - (last.x || 0));
    const dy = Math.abs((cursor.y || 0) - (last.y || 0));

    // Screen coordinates - use pixel threshold instead of percentage
    const MIN_PIXEL_MOVEMENT = 5; // 5 pixels
    if (dx < MIN_PIXEL_MOVEMENT && dy < MIN_PIXEL_MOVEMENT) {
      return false;
    }
  }

  // Update last position
  lastCursorPositions.set(clientId, {
    x: cursor.x || 0,
    y: cursor.y || 0,
    timestamp: now,
  });

  return true;
}

/**
 * Clean up cursor state when client disconnects
 */
function cleanupClientCursor(clientId) {
  lastCursorPositions.delete(clientId);
}

/**
 * Store an event to recording_events table
 * @param {string} projectId - Project UUID
 * @param {string} eventType - Type: 'yjs_update', 'chat', 'cursor', 'awareness'
 * @param {string} eventSource - More specific: 'chat:message', 'cursor:move', etc.
 * @param {object} eventData - Event payload
 * @param {string} userId - Optional user UUID
 * @param {number} clientId - Y.js awareness client ID
 */
async function recordEvent(
  projectId,
  eventType,
  eventSource,
  eventData,
  userId = null,
  clientId = null
) {
  const recording = activeRecordings.get(projectId);
  if (!recording || !persistence?.pool) return;

  try {
    const timestampOffset = Date.now() - recording.startTime;

    await persistence.pool.query(
      `INSERT INTO recording_events
       (recording_id, timestamp_offset_ms, event_type, event_source, event_data, user_id, client_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        recording.recordingId,
        timestampOffset,
        eventType,
        eventSource,
        JSON.stringify(eventData),
        userId,
        clientId ? String(clientId) : null,
      ]
    );

    recording.eventCount++;

    // Log every 100 events
    if (recording.eventCount % 100 === 0) {
      recordingLog.debug(
        `Recording ${recording.recordingId}: ${recording.eventCount} events`
      );
    }
  } catch (err) {
    recordingLog.error("Failed to record event:", err.message);
  }
}

const server = http.createServer();
const wss = new WebSocket.Server({ server });

/**
 * Room state - holds Y.Doc and connected clients
 */
class Room {
  constructor(roomId) {
    this.roomId = roomId;
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.clients = new Set();
    this.projectId = null;
    this.isLoaded = false;
    this.lastUpdateId = null;
    // Track which message IDs we've already persisted to avoid duplicates
    this.persistedMessageIds = new Set();

    // Track chat messages for persistence
    this.setupChatObserver();
  }

  /**
   * Set up observer to detect new chat messages
   */
  setupChatObserver() {
    const chatArray = this.doc.getArray("chatMessages");

    chatArray.observe((event) => {
      // Process chat message inserts from Y.js delta
      event.changes.delta.forEach((change) => {
        if (change.insert) {
          change.insert.forEach((message) => {
            // Skip if already persisted (by ID)
            if (
              message &&
              message.id &&
              !this.persistedMessageIds.has(message.id)
            ) {
              this.persistedMessageIds.add(message.id);
              this.persistChatMessage(message);
            }
          });
        }
      });
    });

    wsLog.debug("Chat observer set up for room:", this.roomId);
  }

  /**
   * Persist a chat message to the database
   * UPDATED: Also records to recording_events if recording is active
   */
  async persistChatMessage(message) {
    if (!persistence) return;

    try {
      const {
        userName,
        text,
        timestamp,
        messageType,
        metadata,
        id: messageId,
      } = message;

      await persistence.storeChatMessage(
        this.roomId,
        this.projectId,
        null, // userId - null until proper auth is implemented
        userName || "Anonymous",
        text || "",
        null,
        {
          clientTimestamp: timestamp,
          messageType: messageType || "text",
          ...metadata,
        }
      );

      wsLog.debug("Chat persisted:", userName, "in", this.roomId);

      // Record chat message to recording_events
      if (this.projectId && activeRecordings.has(this.projectId)) {
        await recordEvent(
          this.projectId,
          "chat",
          "chat:message",
          {
            messageId,
            userName,
            text: text?.substring(0, 500), // Truncate for storage
            messageType: messageType || "text",
            timestamp,
          },
          null,
          null
        );
      }
    } catch (err) {
      wsLog.error("Failed to persist chat:", err.message);
    }
  }

  /**
   * Load document state from database
   */
  async loadFromDB() {
    if (!persistence || this.isLoaded) return;

    try {
      const docRecord = await persistence.getOrCreateDocument(
        this.roomId,
        this.projectId
      );

      if (docRecord.documentState && docRecord.documentState.length > 0) {
        Y.applyUpdate(this.doc, docRecord.documentState);
        syncLog.info(
          "Loaded Y.Doc state for room:",
          this.roomId,
          "version:",
          docRecord.snapshotVersion
        );
      }

      this.lastUpdateId = docRecord.lastUpdateId;
      this.isLoaded = true;

      // Schedule periodic snapshots
      persistence.scheduleSnapshots(this.roomId, () =>
        Y.encodeStateAsUpdate(this.doc)
      );
    } catch (err) {
      syncLog.error("Failed to load document:", this.roomId, err.message);
    }
  }

  /**
   * Store a Y.js update to the database
   * UPDATED: Also records to recording_events if recording is active
   */
  async storeUpdate(update, origin, userId, clientId) {
    if (!persistence) return;

    try {
      // Existing persistence logic
      const result = await persistence.storeUpdate(
        this.roomId,
        update,
        origin,
        userId,
        clientId
      );

      if (result) {
        this.lastUpdateId = result.id;
      }

      // NEW: Record to recording_events if active
      if (this.projectId && activeRecordings.has(this.projectId)) {
        // Skip noisy cursor/awareness updates unless you want them
        if (
          origin !== "cursor" &&
          origin !== "presence" &&
          origin !== "avatar"
        ) {
          await recordEvent(
            this.projectId,
            "yjs_update",
            origin ? `yjs:${origin}` : "yjs:unknown",
            {
              updateSize: update.length,
              origin,
              sequenceNum: result?.sequenceNum,
            },
            userId,
            clientId
          );
        }
      }
    } catch (err) {
      syncLog.error("Failed to store update:", err.message);
    }
  }

  /**
   * Final snapshot when room is closed
   */
  async close() {
    if (!persistence) return;

    try {
      const state = Y.encodeStateAsUpdate(this.doc);
      await persistence.finalSnapshot(this.roomId, state);
    } catch (err) {
      syncLog.error("Failed to save final snapshot:", err.message);
    }
  }
}

// Store rooms by name
const rooms = new Map();

/**
 * Get or create a room
 */
async function getOrCreateRoom(roomName) {
  if (!rooms.has(roomName)) {
    const room = new Room(roomName);
    rooms.set(roomName, room);

    // Load state from database
    await room.loadFromDB();
  }

  return rooms.get(roomName);
}

/**
 * Send sync step 1 to a new client
 */
function sendSyncStep1(socket, doc) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, doc);
  send(socket, encoding.toUint8Array(encoder));
}

/**
 * Send awareness update to client
 */
function sendAwarenessUpdate(socket, awareness, changedClients) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
  );
  send(socket, encoding.toUint8Array(encoder));
}

/**
 * Broadcast to all clients in room except sender
 */
function broadcastToRoom(room, message, excludeSocket = null) {
  room.clients.forEach((client) => {
    if (client !== excludeSocket && client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        wsLog.error("Failed to broadcast:", error.message);
      }
    }
  });
}

/**
 * Safe send wrapper
 */
function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(message);
    } catch (error) {
      wsLog.error("Failed to send:", error.message);
    }
  }
}

/**
 * Handle incoming Y.js protocol messages
 */
async function handleMessage(socket, room, message) {
  try {
    const decoder = decoding.createDecoder(new Uint8Array(message));
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case MESSAGE_SYNC:
        handleSyncMessage(socket, room, decoder, message);
        break;

      case MESSAGE_AWARENESS:
        handleAwarenessMessage(socket, room, decoder, message);
        break;

      case MESSAGE_QUERY_AWARENESS:
        // Client requesting awareness state
        sendAwarenessUpdate(
          socket,
          room.awareness,
          Array.from(room.awareness.getStates().keys())
        );
        break;

      default:
        wsLog.warn("Unknown message type:", messageType);
    }
  } catch (error) {
    wsLog.error("Error handling message:", error.message);
  }
}

/**
 * Handle Y.js sync protocol messages
 */
function handleSyncMessage(socket, room, decoder, rawMessage) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);

  const syncMessageType = syncProtocol.readSyncMessage(
    decoder,
    encoder,
    room.doc,
    socket
  );

  // If we have a response to send back
  if (encoding.length(encoder) > 1) {
    send(socket, encoding.toUint8Array(encoder));
  }

  // Sync step 2 or update - relay to other clients
  if (syncMessageType === syncProtocol.messageYjsSyncStep2) {
    // State received from client - could store snapshot here
    syncLog.trace("Received sync step 2 from client in room:", room.roomId);
  } else if (syncMessageType === syncProtocol.messageYjsUpdate) {
    // This is an update - relay to others
    broadcastToRoom(room, rawMessage, socket);

    // Store update for recording (excluding noisy cursor updates)
    // The update origin is determined by observing the doc changes
    const update = decoding.readVarUint8Array(
      decoding.createDecoder(new Uint8Array(rawMessage).slice(2))
    );

    // Try to determine update origin from content
    const origin = detectUpdateOrigin(room.doc, update);
    room.storeUpdate(
      update,
      origin,
      socket.userId || null,
      socket.clientId || null
    );
  }
}

// ============================================================================
// CURSOR RECORDING FIX for server.js (Y.js WebSocket Server)
//
// Replace the handleAwarenessMessage function with this version.
// This fix properly extracts client IDs from awareness updates to record cursors.
// ============================================================================

/**
 * Decode client IDs from an awareness update
 * The awareness update format is:
 * - Number of clients (varUint)
 * - For each client: clientID (varUint), clock (varUint), state (nullable string)
 *
 * @param {Uint8Array} update - The awareness update binary
 * @returns {number[]} Array of client IDs in this update
 */
function decodeAwarenessUpdateClientIds(update) {
  const clientIds = [];
  try {
    const decoder = decoding.createDecoder(update);
    const numClients = decoding.readVarUint(decoder);

    for (let i = 0; i < numClients; i++) {
      const clientId = decoding.readVarUint(decoder);
      clientIds.push(clientId);
      // Skip clock and state - we just need the IDs
      decoding.readVarUint(decoder); // clock
      decoding.readVarString(decoder); // state (JSON string or empty)
    }
  } catch (err) {
    recordingLog.debug("Failed to decode awareness update:", err.message);
  }
  return clientIds;
}

/**
 * Handle awareness protocol messages
 * FIXED: Now properly extracts client IDs and records cursor positions
 */
function handleAwarenessMessage(socket, room, decoder, rawMessage) {
  const update = decoding.readVarUint8Array(decoder);

  // Apply the awareness update
  awarenessProtocol.applyAwarenessUpdate(room.awareness, update, socket);

  // Relay to other clients
  broadcastToRoom(room, rawMessage, socket);

  // Extract client IDs from this update
  const updatedClientIds = decodeAwarenessUpdateClientIds(update);

  // If this socket doesn't have a clientId yet, try to associate it
  // The first awareness update from a client typically contains their own state
  if (!socket.clientId && updatedClientIds.length > 0) {
    // Find which client ID in this update has user info matching this socket
    const states = room.awareness.getStates();
    for (const clientId of updatedClientIds) {
      const state = states.get(clientId);
      if (
        state?.user?.name === socket.username ||
        state?.userId === socket.userId
      ) {
        socket.clientId = clientId;
        recordingLog.debug(
          `Associated socket with clientId: ${clientId} for user: ${socket.username}`
        );
        break;
      }
    }
    // Fallback: just use the first client ID if we can't match
    if (!socket.clientId && updatedClientIds.length === 1) {
      socket.clientId = updatedClientIds[0];
      recordingLog.debug(
        `Fallback: Associated socket with clientId: ${socket.clientId}`
      );
    }
  }

  // Record cursor if recording is active
  if (room.projectId && activeRecordings.has(room.projectId)) {
    const states = room.awareness.getStates();

    // Check each updated client for cursor data
    for (const clientId of updatedClientIds) {
      const localState = states.get(clientId);

      if (!localState) continue;

      // Debug: Log what keys are in the awareness state
      if (recordingLog.isDebugEnabled?.()) {
        recordingLog.debug(
          `Client ${clientId} awareness keys: ${Object.keys(localState).join(
            ", "
          )}`
        );
      }

      // Check if this client has cursor data and it passes throttle/delta filter
      if (
        localState.cursor &&
        shouldRecordCursor(clientId, localState.cursor)
      ) {
        // Record the cursor event
        recordEvent(
          room.projectId,
          "cursor",
          "cursor:move",
          {
            instanceId: localState.cursor.instanceId,
            x: localState.cursor.x,
            y: localState.cursor.y,
            timestamp: localState.cursor.timestamp,
            user: localState.user
              ? {
                  name: localState.user.userName || localState.user.name,
                  color: localState.user.userColor || localState.user.color,
                }
              : null,
          },
          socket.userId,
          clientId // Use the actual client ID from the update
        );

        recordingLog.debug(
          `Recorded cursor for client ${clientId}: (${localState.cursor.x}, ${localState.cursor.y})`
        );
      }
    }
  }
}

/**
 * Detect update origin by examining what changed in the doc
 * This is heuristic - could be improved with client-side tagging
 */
function detectUpdateOrigin(doc, update) {
  // Check common Y.js shared types
  // Chat typically uses an array named "chatMessages"
  // Cursors use awareness or a map named "cursors"
  // This is a simplified heuristic

  try {
    // Create temp doc to see what the update affects
    const tempDoc = new Y.Doc();
    Y.applyUpdate(tempDoc, Y.encodeStateAsUpdate(doc));
    Y.applyUpdate(tempDoc, update);

    // Check what changed
    // (In a real implementation, you'd track this client-side)
    return "chat"; // Default to chat for now
  } catch {
    return null;
  }
}

/**
 * Authenticate a socket using Keycloak JWT
 */
async function authenticateSocket(socket, url) {
  // Keep the Y.js server aligned with the API middleware:
  // when Keycloak bypass is not explicitly enabled, the stack runs in
  // local collaboration mode and should accept fallback/mock identities.
  if (DEV_BYPASS_AUTH || !process.env.DEV_BYPASS_AUTH || process.env.DEV_BYPASS_AUTH === "false") {
    socket.userId =
      url.searchParams.get("userId") || "00000000-0000-0000-0000-000000000002";
    socket.username =
      url.searchParams.get("username") || "Development User";
    return true;
  }

  const token =
    url.searchParams.get("token") || url.searchParams.get("access_token");
  if (!token) {
    wsLog.warn("Missing access token for Y.js connection");
    socket.close(1008, "Missing access token");
    return false;
  }

  try {
    const user = await verifyJwtToken(token);
    socket.userId = user.id;
    socket.username = user.name || user.email || "User";
    return true;
  } catch (error) {
    wsLog.warn("Y.js authentication failed:", error.message);
    socket.close(1008, "Authentication failed");
    return false;
  }
}

/**
 * Check if user can access a project
 */
async function checkProjectAccess(projectId, userId) {
  if (!persistence?.pool) {
    wsLog.warn("Project access check skipped (no DB pool configured)");
    return false;
  }

  try {
    const result = await persistence.pool.query(
      `
      SELECT 1
      FROM project_members
      WHERE project_id = $1 AND user_id = $2
    `,
      [projectId, userId]
    );
    return result.rows.length > 0;
  } catch (error) {
    wsLog.error("Failed to check project access:", error.message);
    return false;
  }
}

/**
 * Handle new WebSocket connection
 */
wss.on("connection", async (socket, req) => {
  // Parse URL and query params
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomName =
    url.searchParams.get("room") || url.pathname.slice(1) || "default";

  // Authenticate connection
  const isAuthenticated = await authenticateSocket(socket, url);
  if (!isAuthenticated) {
    return;
  }

  // Extract projectId if present in room name or URL
  // Convention: room name format is "project:{projectId}" or just projectId
  let projectId = null;
  if (roomName.startsWith("project:")) {
    projectId = roomName.split(":")[1];
  } else if (roomName.match(/^[0-9a-f-]{36}$/i)) {
    // Looks like a UUID, treat as projectId
    projectId = roomName;
  }

  if (projectId) {
    const hasAccess = await checkProjectAccess(projectId, socket.userId);
    if (!hasAccess) {
      wsLog.warn("Access denied for user to project:", socket.userId, projectId);
      socket.close(1008, "Access denied");
      return;
    }
  }

  socket.clientId = null; // Will be set from awareness

  wsLog.info("Client connected to room:", roomName, "user:", socket.username);

  // Get or create room
  const room = await getOrCreateRoom(roomName);
  room.clients.add(socket);

  // Set projectId on room if we extracted it
  if (projectId && !room.projectId) {
    room.projectId = projectId;

    // Check if this project has an active recording
    await refreshActiveRecordings();
  }

  wsLog.debug("Total clients in room:", roomName, room.clients.size);

  // Send initial sync step 1 (request client state)
  sendSyncStep1(socket, room.doc);

  // Send current awareness state
  const awarenessStates = Array.from(room.awareness.getStates().keys());
  if (awarenessStates.length > 0) {
    sendAwarenessUpdate(socket, room.awareness, awarenessStates);
  }

  // Handle incoming messages
  socket.on("message", (message) => {
    handleMessage(socket, room, message);
  });

  // Handle disconnection
  socket.on("close", async () => {
    room.clients.delete(socket);

    // Clean up cursor state
    cleanupClientCursor(socket.clientId);

    // Remove from awareness
    awarenessProtocol.removeAwarenessStates(
      room.awareness,
      [room.doc.clientID],
      "disconnect"
    );

    wsLog.info("Client disconnected from:", roomName);
    wsLog.debug("Remaining clients:", room.clients.size);

    // Clean up empty rooms
    if (room.clients.size === 0) {
      // Store final snapshot
      await room.close();

      rooms.delete(roomName);
      wsLog.debug("Room closed and saved:", roomName);
    }
  });

  // Handle errors
  socket.on("error", (error) => {
    wsLog.error("WebSocket error:", error.message);
  });
});

// Listen for awareness changes to broadcast
// This is done per-room when clients join

const PORT = process.env.PORT || 9001;

// Refresh active recordings cache on startup
refreshActiveRecordings();

// Refresh every 30 seconds to catch new recordings
setInterval(refreshActiveRecordings, 30000);

server.listen(PORT, () => {
  serverLog.info("Y.js WebSocket server running on port:", PORT);
  serverLog.info(
    "PostgreSQL persistence:",
    persistence ? "enabled" : "disabled"
  );
  serverLog.info(
    "Recording integration:",
    persistence?.pool ? "enabled" : "disabled"
  );
  serverLog.debug("Database host:", dbConfig.host);
  serverLog.debug("Ready for connections");
});

// Handle server errors
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    serverLog.error("Port already in use:", PORT);
    serverLog.error("Kill the process using port", PORT, "or change the port.");
    process.exit(1);
  } else {
    serverLog.error("Server error:", error);
  }
});

// Graceful shutdown
async function shutdown() {
  serverLog.info("Shutting down server gracefully...");

  // Close all rooms (saves final snapshots)
  for (const [roomName, room] of rooms) {
    serverLog.debug("Closing room:", roomName);
    await room.close();
  }

  // Close all WebSocket connections
  wss.clients.forEach((client) => {
    client.close();
  });

  // Shutdown Matrix bridge
  if (matrixBridge) {
    await matrixBridge.shutdown();
  }

  // Shutdown persistence service
  if (persistence) {
    await persistence.shutdown();
  }

  server.close(() => {
    serverLog.info("Server closed");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

serverLog.info("Starting Y.js WebSocket server with persistence...");
