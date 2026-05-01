// server/src/services/matrixBridge.js
// Matrix Federation Bridge Service
//
// Bidirectional bridge between CIA Web Y.js chat and Matrix Protocol
// Architecture:
// - Y.js handles local real-time sync (sub-second latency)
// - Matrix handles cross-server federation
// - PostgreSQL is the authoritative source of truth
// - Bridge ensures messages sync both directions with deduplication

const { createLogger } = require('../utils/logger');

const log = createLogger('matrix-bridge');

// Matrix SDK (loaded dynamically as ES Module)
let matrixSdk = null;

/**
 * Circuit Breaker Pattern (Phase 8)
 * Prevents cascading failures when Matrix homeserver is unavailable
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, all requests fail fast
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 60 seconds
    this.resetTimeout = options.resetTimeout || 300000; // 5 minutes

    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.lastStateChange = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const error = new Error('Circuit breaker is OPEN');
        error.code = 'CIRCUIT_OPEN';
        throw error;
      } else {
        // Try half-open state
        this.state = 'HALF_OPEN';
        log.info('Circuit breaker entering HALF_OPEN state');
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure();
      throw error;
    }
  }

  _onSuccess() {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this._close();
      }
    }
  }

  _onFailure() {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.failureThreshold) {
      this._open();
    }
  }

  _open() {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.timeout;
    this.lastStateChange = Date.now();
    log.warn('Circuit breaker OPENED - Matrix API unavailable');
  }

  _close() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastStateChange = Date.now();
    log.info('Circuit breaker CLOSED - Matrix API recovered');
  }

  reset() {
    this._close();
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt,
      lastStateChange: this.lastStateChange,
    };
  }
}

/**
 * Matrix Bridge Service
 * Handles bidirectional message sync between CIA Web and Matrix Protocol
 */
class MatrixBridgeService {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.isConnected = false;
    this.isInitialized = false;

    // Room mapping: CIA roomId -> Matrix room_id
    this.roomMappings = new Map();

    // Deduplication: Track processed Matrix events to prevent loops
    // Map of matrix_event_id -> timestamp
    this.processedEvents = new Map();
    this.deduplicationTTL = 30 * 60 * 1000; // 30 minutes

    // Callbacks
    this.onMessageFromMatrix = null; // Called when Matrix message arrives
    this.onMembershipChange = null; // Called when Matrix user joins/leaves (Phase 5)
    this.yjsPersistence = null; // Reference to Y.js persistence service
    this.pool = null; // PostgreSQL connection pool

    // Phase 8: Error Handling & Resilience
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute
      resetTimeout: 300000, // 5 minutes
    });

    // Message retry queue (Phase 8)
    this.retryQueue = [];
    this.retryInterval = null;
    this.maxRetries = 3;
    this.retryBackoff = 5000; // Start with 5 seconds

    // Rate limiting (Phase 8)
    this.rateLimits = {
      roomJoins: new Map(), // userId -> timestamp
      directorySearches: new Map(), // userId -> timestamp
    };

    // Health check state (Phase 8)
    this.lastHealthCheck = null;
    this.healthCheckInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  /**
   * Initialize the Matrix bridge
   * @param {Object} yjsPersistence - Y.js persistence service
   * @param {Pool} pool - PostgreSQL connection pool
   * @returns {Promise<void>}
   */
  async initialize(yjsPersistence, pool) {
    if (this.isInitialized) {
      log.warn('Matrix bridge already initialized');
      return;
    }

    // Check if Matrix federation is enabled
    if (!this.config.enabled) {
      log.info('Matrix federation is disabled');
      return;
    }

    this.yjsPersistence = yjsPersistence;
    this.pool = pool;

    log.info('Initializing Matrix bridge...');
    log.info('Matrix homeserver:', this.config.homeserverUrl);

    try {
      // Load Matrix SDK dynamically (ES Module)
      if (!matrixSdk) {
        log.info('Loading matrix-js-sdk...');

        // Polyfill for Web Crypto API (required by matrix-js-sdk)
        if (!global.crypto) {
          const { webcrypto } = require('crypto');
          global.crypto = webcrypto;
        }

        matrixSdk = await import('matrix-js-sdk');
      }

      // Create Matrix client with application service credentials
      this.client = matrixSdk.createClient({
        baseUrl: this.config.homeserverUrl,
        accessToken: this.config.asToken, // Application service token
        userId: `@${this.config.senderLocalpart}:${this.config.serverName}`,
      });

      // Register event listeners
      this._setupEventListeners();

      // Start the client
      await this.client.startClient({ initialSyncLimit: 10 });

      this.isInitialized = true;
      this.isConnected = true;

      log.info('Matrix bridge initialized successfully');
      log.info('Bridge user:', this.client.getUserId());

      // Load existing room mappings from database
      await this._loadRoomMappings();

      // Start deduplication cleanup timer
      this._startDeduplicationCleanup();

      // Phase 8: Start retry queue and health check
      this._startRetryQueue();
      this._startHealthCheck();

    } catch (error) {
      log.error('Failed to initialize Matrix bridge:', error.message);
      throw error;
    }
  }

  /**
   * Set up Matrix event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen for sync state changes
    this.client.on('sync', (state, prevState, data) => {
      log.debug('Matrix sync state:', state);
      if (state === 'PREPARED') {
        this.isConnected = true;
        log.info('Matrix client synced and ready');
      }
    });

    // Listen for incoming messages
    this.client.on('Room.timeline', async (event, room, toStartOfTimeline) => {
      // Ignore old events (pagination)
      if (toStartOfTimeline) {
        return;
      }

      // Only handle message events
      if (event.getType() !== 'm.room.message') {
        return;
      }

      // Don't process our own messages
      if (event.getSender() === this.client.getUserId()) {
        return;
      }

      await this._handleIncomingMatrixMessage(event, room);
    });

    // Listen for room membership events (federated users joining/leaving)
    this.client.on('RoomMember.membership', async (event, member) => {
      await this._handleMembershipChange(event, member);
    });

    // Handle errors
    this.client.on('error', (error) => {
      log.error('Matrix client error:', error.message);
    });
  }

  /**
   * Load room mappings from database
   * @private
   */
  async _loadRoomMappings() {
    if (!this.pool) {
      log.debug('No database pool available for loading room mappings');
      return;
    }

    try {
      const result = await this.pool.query(
        `SELECT cia_room_id, matrix_room_id, matrix_alias, created_at
         FROM matrix_room_mappings
         WHERE status = 'active'
         ORDER BY created_at DESC`
      );

      for (const row of result.rows) {
        this.roomMappings.set(row.cia_room_id, {
          matrixRoomId: row.matrix_room_id,
          matrixAlias: row.matrix_alias,
          createdAt: row.created_at,
        });
      }

      log.info(`Loaded ${result.rows.length} room mappings from database`);
    } catch (error) {
      log.error('Failed to load room mappings:', error.message);
    }
  }

  /**
   * Handle incoming message from Matrix
   * @private
   */
  async _handleIncomingMatrixMessage(event, room) {
    try {
      const eventId = event.getId();
      const content = event.getContent();
      const sender = event.getSender();
      const matrixRoomId = room.roomId;

      // Check deduplication
      if (await this._isDuplicate(eventId)) {
        log.trace('Skipping duplicate Matrix event:', eventId);
        return;
      }

      // Get CIA Web room ID from mapping
      const ciaRoomId = await this._getCIARoomId(matrixRoomId);
      if (!ciaRoomId) {
        log.warn('No CIA room mapping for Matrix room:', matrixRoomId);
        return;
      }

      // Extract message text
      const messageText = content.body || '';
      const messageType = content.msgtype || 'm.text';

      log.info('Received Matrix message:', {
        eventId,
        sender,
        room: ciaRoomId,
        message: messageText.substring(0, 50),
      });

      // Resolve Matrix user to CIA Web user (or create guest)
      const ciaUser = await this._resolveMatrixUser(sender);

      // Store in PostgreSQL (source of truth)
      const chatMessage = await this.yjsPersistence.storeChatMessage(
        ciaRoomId,
        null, // projectId (will be resolved)
        ciaUser.userId,
        ciaUser.displayName,
        messageText,
        null, // yjsUpdateId
        {
          federation_source: 'matrix',
          matrix_event_id: eventId,
          matrix_room_id: matrixRoomId,
          matrix_sender: sender,
          matrix_msgtype: messageType,
        }
      );

      log.info('Stored federated message in CIA Web:', chatMessage.id);

      // Mark event as processed (with full context for event log)
      await this._markProcessed(eventId, chatMessage.id, 'inbound', matrixRoomId, ciaRoomId, sender);

      // Notify Y.js clients via callback
      if (this.onMessageFromMatrix) {
        this.onMessageFromMatrix({
          roomId: ciaRoomId,
          messageId: chatMessage.id,
          userId: ciaUser.userId,
          username: ciaUser.displayName,
          message: messageText,
          timestamp: chatMessage.timestamp,
          federation: {
            source: 'matrix',
            eventId,
            sender,
          },
        });
      }

    } catch (error) {
      log.error('Failed to handle Matrix message:', error.message);
    }
  }

  /**
   * Handle room membership changes (joins, leaves, invites, bans)
   * Phase 5: Enhanced user tracking
   * @private
   */
  async _handleMembershipChange(event, member) {
    try {
      const matrixUserId = member.userId;
      const membership = member.membership; // join, leave, invite, ban
      const matrixRoomId = member.roomId;
      const displayName = member.name || matrixUserId;

      // Skip our own membership events
      if (matrixUserId === this.client.getUserId()) {
        return;
      }

      log.info('Matrix membership change:', {
        user: matrixUserId,
        membership,
        room: matrixRoomId,
      });

      // Get CIA room ID
      const ciaRoomId = await this._getCIARoomId(matrixRoomId);
      if (!ciaRoomId) {
        log.debug('Membership change in unmapped room:', matrixRoomId);
        return;
      }

      // Update federated user cache
      if (membership === 'join') {
        await this._updateFederatedUser(member);

        // Notify Y.js clients of new federated member
        if (this.onMembershipChange) {
          this.onMembershipChange({
            type: 'member_joined',
            roomId: ciaRoomId,
            matrixRoomId,
            userId: matrixUserId,
            displayName,
          });
        }
      } else if (membership === 'leave' || membership === 'ban') {
        // Mark user as inactive
        await this._updateFederatedUserStatus(matrixUserId, membership === 'ban' ? 'banned' : 'inactive');

        // Notify Y.js clients of member leaving
        if (this.onMembershipChange) {
          this.onMembershipChange({
            type: 'member_left',
            roomId: ciaRoomId,
            matrixRoomId,
            userId: matrixUserId,
            displayName,
          });
        }
      }

    } catch (error) {
      log.error('Failed to handle membership change:', error.message);
    }
  }

  /**
   * Update federated user in database cache
   * @private
   */
  async _updateFederatedUser(member) {
    if (!this.pool) {
      return;
    }

    try {
      const matrixUserId = member.userId;
      const displayName = member.name || matrixUserId.split(':')[0].replace('@', '');
      const serverName = matrixUserId.split(':')[1] || 'unknown';

      // Get avatar URL (will be http:// URL if available)
      let avatarUrl = null;
      if (member.getAvatarUrl) {
        const mxcUrl = member.getAvatarUrl();
        if (mxcUrl) {
          avatarUrl = this.client.mxcUrlToHttp(mxcUrl, 48, 48, 'scale');
        }
      }

      await this.pool.query(
        `INSERT INTO federated_user_cache
         (matrix_user_id, display_name, avatar_url, server_name, last_seen, cached_at, status)
         VALUES ($1, $2, $3, $4, NOW(), NOW(), 'active')
         ON CONFLICT (matrix_user_id) DO UPDATE
         SET display_name = $2, avatar_url = $3, last_seen = NOW(), cached_at = NOW(), status = 'active'`,
        [matrixUserId, displayName, avatarUrl, serverName]
      );

      log.debug('Updated federated user cache:', matrixUserId);
    } catch (error) {
      log.error('Failed to update federated user:', error.message);
    }
  }

  /**
   * Update federated user status
   * @private
   */
  async _updateFederatedUserStatus(matrixUserId, status) {
    if (!this.pool) {
      return;
    }

    try {
      await this.pool.query(
        `UPDATE federated_user_cache SET status = $1, last_seen = NOW() WHERE matrix_user_id = $2`,
        [status, matrixUserId]
      );
      log.debug('Updated federated user status:', matrixUserId, status);
    } catch (error) {
      log.error('Failed to update federated user status:', error.message);
    }
  }

  /**
   * Sync a CIA Web message to Matrix
   * Called after a message is stored in PostgreSQL
   * @param {Object} message - Chat message object
   * @param {string} message.id - Message UUID
   * @param {string} message.roomId - CIA Web room ID
   * @param {string} message.userId - User UUID
   * @param {string} message.username - Display name
   * @param {string} message.message - Message text
   * @param {Object} message.metadata - Additional metadata
   * @returns {Promise<string|null>} Matrix event ID if sent
   */
  async syncToMatrix(message) {
    if (!this.isConnected) {
      log.warn('Cannot sync to Matrix: not connected');
      return null;
    }

    try {
      // Check if this message originated from Matrix (avoid loop)
      if (message.metadata?.federation_source === 'matrix') {
        log.trace('Skipping Matrix sync: message originated from Matrix');
        return null;
      }

      // Get Matrix room ID for CIA room
      const matrixRoomId = await this._getMatrixRoomId(message.roomId);
      if (!matrixRoomId) {
        log.warn('No Matrix room mapping for CIA room:', message.roomId);
        return null;
      }

      // Phase 8: Wrap with circuit breaker
      const eventId = await this.circuitBreaker.execute(async () => {
        return await this._sendMatrixMessage(
          matrixRoomId,
          message.message,
          message.username
        );
      });

      // Mark as processed to avoid echo
      await this._markProcessed(eventId, message.id, 'outbound', matrixRoomId, message.roomId, null);

      log.info('Synced message to Matrix:', {
        ciaMessageId: message.id,
        matrixEventId: eventId,
        room: message.roomId,
      });

      // Update chat_messages with Matrix event ID
      await this._updateMessageWithMatrixEventId(message.id, eventId, matrixRoomId);

      return eventId;

    } catch (error) {
      log.error('Failed to sync message to Matrix:', error.message);

      // Phase 8: Add to retry queue if circuit breaker is open or other failures
      if (error.code === 'CIRCUIT_OPEN' || this.retryQueue.length < 100) {
        this._addToRetryQueue(message);
      }

      return null;
    }
  }

  /**
   * Send a message to a Matrix room
   * @private
   */
  async _sendMatrixMessage(matrixRoomId, text, senderName) {
    const content = {
      msgtype: 'm.text',
      body: text,
      // Add sender info as formatted body for context
      format: 'org.matrix.custom.html',
      formatted_body: `<strong>${senderName}:</strong> ${text}`,
    };

    const response = await this.client.sendMessage(matrixRoomId, content);
    return response.event_id;
  }

  /**
   * Create or get a Matrix room for a CIA Web room
   * @param {string} ciaRoomId - CIA Web room identifier
   * @param {Object} roomInfo - Room metadata (name, topic, etc.)
   * @returns {Promise<string>} Matrix room ID
   */
  async createOrGetMatrixRoom(ciaRoomId, roomInfo = {}) {
    // Check if mapping already exists
    const existing = await this._getMatrixRoomId(ciaRoomId);
    if (existing) {
      log.debug('Matrix room already exists for CIA room:', ciaRoomId);
      return existing;
    }

    try {
      const roomAlias = `#cia_${ciaRoomId}:${this.config.serverName}`;
      const roomName = roomInfo.name || `CIA Web Room: ${ciaRoomId}`;
      const topic = roomInfo.topic || 'Federated room from CIA Web';

      log.info('Creating Matrix room:', roomAlias);

      // Create Matrix room
      const { room_id } = await this.client.createRoom({
        room_alias_name: `cia_${ciaRoomId}`,
        name: roomName,
        topic: topic,
        visibility: 'public',
        preset: 'public_chat',
        initial_state: [
          {
            type: 'm.room.guest_access',
            state_key: '',
            content: { guest_access: 'can_join' },
          },
        ],
      });

      log.info('Created Matrix room:', room_id, 'with alias:', roomAlias);

      // Store mapping
      await this._storeRoomMapping(ciaRoomId, room_id, roomAlias);

      return room_id;

    } catch (error) {
      log.error('Failed to create Matrix room:', error.message);
      throw error;
    }
  }

  /**
   * Store room mapping in memory and database
   * @private
   */
  async _storeRoomMapping(ciaRoomId, matrixRoomId, matrixAlias, projectId = null) {
    // Store in memory
    this.roomMappings.set(ciaRoomId, {
      matrixRoomId,
      matrixAlias,
      createdAt: new Date(),
    });

    // Store in database
    if (!this.pool) {
      log.debug('No database pool available, storing in memory only');
      return;
    }

    try {
      await this.pool.query(
        `INSERT INTO matrix_room_mappings (cia_room_id, matrix_room_id, matrix_alias, project_id, status)
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (cia_room_id) DO UPDATE
         SET matrix_room_id = $2, matrix_alias = $3, last_synced_at = NOW()`,
        [ciaRoomId, matrixRoomId, matrixAlias, projectId]
      );
      log.debug('Room mapping stored in database:', ciaRoomId, '->', matrixRoomId);
    } catch (error) {
      log.error('Failed to store room mapping in database:', error.message);
      // Continue anyway - in-memory mapping is still available
    }
  }

  /**
   * Get Matrix room ID for a CIA Web room
   * @private
   */
  async _getMatrixRoomId(ciaRoomId) {
    // Check memory first
    const mapping = this.roomMappings.get(ciaRoomId);
    if (mapping) {
      return mapping.matrixRoomId;
    }

    // Check database if not in memory
    if (this.pool) {
      try {
        const result = await this.pool.query(
          `SELECT matrix_room_id, matrix_alias FROM matrix_room_mappings
           WHERE cia_room_id = $1 AND status = 'active'`,
          [ciaRoomId]
        );

        if (result.rows.length > 0) {
          const row = result.rows[0];
          // Cache in memory
          this.roomMappings.set(ciaRoomId, {
            matrixRoomId: row.matrix_room_id,
            matrixAlias: row.matrix_alias,
            createdAt: new Date(),
          });
          return row.matrix_room_id;
        }
      } catch (error) {
        log.error('Failed to query room mapping:', error.message);
      }
    }

    return null;
  }

  /**
   * Get CIA Web room ID for a Matrix room
   * @private
   */
  async _getCIARoomId(matrixRoomId) {
    // Check memory first
    for (const [ciaRoomId, mapping] of this.roomMappings.entries()) {
      if (mapping.matrixRoomId === matrixRoomId) {
        return ciaRoomId;
      }
    }

    // Check database if not in memory
    if (this.pool) {
      try {
        const result = await this.pool.query(
          `SELECT cia_room_id, matrix_alias FROM matrix_room_mappings
           WHERE matrix_room_id = $1 AND status = 'active'`,
          [matrixRoomId]
        );

        if (result.rows.length > 0) {
          const row = result.rows[0];
          // Cache in memory
          this.roomMappings.set(row.cia_room_id, {
            matrixRoomId,
            matrixAlias: row.matrix_alias,
            createdAt: new Date(),
          });
          return row.cia_room_id;
        }
      } catch (error) {
        log.error('Failed to query room mapping:', error.message);
      }
    }

    return null;
  }

  /**
   * Update chat message with Matrix event ID after sending
   * @private
   */
  async _updateMessageWithMatrixEventId(ciaMessageId, matrixEventId, matrixRoomId) {
    if (!this.pool) {
      log.debug('No database pool available for updating message');
      return;
    }

    try {
      await this.pool.query(
        `UPDATE chat_messages
         SET matrix_event_id = $1, matrix_room_id = $2
         WHERE id = $3`,
        [matrixEventId, matrixRoomId, ciaMessageId]
      );
      log.trace('Updated message with Matrix event ID:', ciaMessageId);
    } catch (error) {
      log.error('Failed to update message with Matrix event ID:', error.message);
      // Non-fatal - message was still sent
    }
  }

  /**
   * Resolve Matrix user to CIA Web user
   * @private
   */
  async _resolveMatrixUser(matrixUserId) {
    // This will be implemented fully in matrixUserResolver.js
    // For now, return a basic federated user object
    return {
      userId: null, // Federated users don't have CIA Web user IDs yet
      displayName: matrixUserId.split(':')[0].replace('@', ''),
      matrixUserId,
      isFederated: true,
    };
  }

  /**
   * Check if a Matrix event has been processed
   * @private
   */
  async _isDuplicate(eventId) {
    // Check in-memory cache first (fast)
    if (this.processedEvents.has(eventId)) {
      return true;
    }

    // Check database for persistent deduplication
    if (this.pool) {
      try {
        const result = await this.pool.query(
          `SELECT 1 FROM matrix_event_log WHERE matrix_event_id = $1`,
          [eventId]
        );
        return result.rows.length > 0;
      } catch (error) {
        log.error('Failed to check event log:', error.message);
        // Fall back to in-memory only
      }
    }

    return false;
  }

  /**
   * Mark a Matrix event as processed
   * @private
   */
  async _markProcessed(eventId, ciaMessageId = null, direction = 'inbound', matrixRoomId = null, ciaRoomId = null, matrixUserId = null) {
    // Mark in memory
    this.processedEvents.set(eventId, Date.now());

    // Store in database for persistent deduplication
    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO matrix_event_log
           (matrix_event_id, cia_message_id, direction, matrix_room_id, cia_room_id, matrix_user_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (matrix_event_id) DO NOTHING`,
          [eventId, ciaMessageId, direction, matrixRoomId, ciaRoomId, matrixUserId]
        );
        log.trace('Event logged in database:', eventId);
      } catch (error) {
        log.error('Failed to log event in database:', error.message);
        // Continue anyway - in-memory deduplication still works
      }
    }
  }

  /**
   * Start cleanup timer for deduplication cache
   * @private
   */
  _startDeduplicationCleanup() {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [eventId, timestamp] of this.processedEvents.entries()) {
        if (now - timestamp > this.deduplicationTTL) {
          this.processedEvents.delete(eventId);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        log.debug('Cleaned up', cleaned, 'old deduplication entries');
      }
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  /**
   * Start message retry queue processor (Phase 8)
   * @private
   */
  _startRetryQueue() {
    if (this.retryInterval) {
      return;
    }

    this.retryInterval = setInterval(async () => {
      await this._processRetryQueue();
    }, this.retryBackoff);

    log.info('Message retry queue started');
  }

  /**
   * Process queued messages for retry (Phase 8)
   * @private
   */
  async _processRetryQueue() {
    if (this.retryQueue.length === 0) {
      return;
    }

    // Circuit breaker is open, skip retry
    if (this.circuitBreaker.getState().state === 'OPEN') {
      log.debug('Circuit breaker open, skipping retry queue processing');
      return;
    }

    const now = Date.now();
    const itemsToRetry = [];

    // Find messages ready for retry
    for (let i = this.retryQueue.length - 1; i >= 0; i--) {
      const item = this.retryQueue[i];
      if (now >= item.nextRetryTime) {
        itemsToRetry.push(item);
        this.retryQueue.splice(i, 1);
      }
    }

    // Retry messages
    for (const item of itemsToRetry) {
      try {
        log.info('Retrying message send:', { attempt: item.attempts + 1, messageId: item.message.id });
        await this.syncToMatrix(item.message);
        log.info('Message retry successful:', item.message.id);
      } catch (error) {
        item.attempts++;
        if (item.attempts < this.maxRetries) {
          // Re-queue with exponential backoff
          item.nextRetryTime = now + (this.retryBackoff * Math.pow(2, item.attempts));
          this.retryQueue.push(item);
          log.warn('Message retry failed, re-queued:', { messageId: item.message.id, nextRetry: new Date(item.nextRetryTime) });
        } else {
          log.error('Message retry failed after max attempts:', item.message.id);
        }
      }
    }
  }

  /**
   * Add message to retry queue (Phase 8)
   * @private
   */
  _addToRetryQueue(message) {
    const item = {
      message,
      attempts: 0,
      nextRetryTime: Date.now() + this.retryBackoff,
      addedAt: Date.now(),
    };

    this.retryQueue.push(item);
    log.info('Message added to retry queue:', message.id);
  }

  /**
   * Check rate limit for user action (Phase 8)
   * @param {string} action - Action type ('roomJoins', 'directorySearches')
   * @param {string} userId - User ID
   * @param {number} limitMs - Rate limit in milliseconds
   * @returns {boolean} True if allowed, false if rate limited
   */
  checkRateLimit(action, userId, limitMs = 60000) {
    if (!this.rateLimits[action]) {
      return true;
    }

    const lastAction = this.rateLimits[action].get(userId);
    const now = Date.now();

    if (lastAction && (now - lastAction) < limitMs) {
      log.warn('Rate limit exceeded:', { action, userId, lastAction: new Date(lastAction) });
      return false;
    }

    this.rateLimits[action].set(userId, now);
    return true;
  }

  /**
   * Start health check timer (Phase 8)
   * @private
   */
  _startHealthCheck() {
    if (this.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(async () => {
      await this._performHealthCheck();
    }, 60000); // Every minute

    log.info('Health check timer started');
  }

  /**
   * Perform health check on Matrix connection (Phase 8)
   * @private
   */
  async _performHealthCheck() {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      // Try a simple API call
      await this.circuitBreaker.execute(async () => {
        await this.client.getHomeserverUrl();
      });

      this.lastHealthCheck = {
        timestamp: Date.now(),
        status: 'healthy',
        connected: this.isConnected,
      };

      this.reconnectAttempts = 0;

    } catch (error) {
      this.lastHealthCheck = {
        timestamp: Date.now(),
        status: 'unhealthy',
        error: error.message,
        connected: false,
      };

      log.error('Health check failed:', error.message);

      // Attempt reconnect if not connected
      if (!this.isConnected) {
        await this._attemptReconnect();
      }
    }
  }

  /**
   * Attempt to reconnect to Matrix homeserver (Phase 8)
   * @private
   */
  async _attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      log.error('Max reconnect attempts reached, giving up');
      return;
    }

    this.reconnectAttempts++;
    log.info('Attempting to reconnect to Matrix:', { attempt: this.reconnectAttempts });

    try {
      if (this.client) {
        await this.client.startClient({ initialSyncLimit: 10 });
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.circuitBreaker.reset();
        log.info('Reconnected to Matrix successfully');
      }
    } catch (error) {
      log.error('Reconnect attempt failed:', error.message);
    }
  }

  /**
   * Get bridge status (Phase 8: Enhanced with circuit breaker and retry queue)
   * @returns {Object} Status information
   */
  getStatus() {
    const circuitState = this.circuitBreaker.getState();

    return {
      enabled: this.config.enabled,
      initialized: this.isInitialized,
      connected: this.isConnected,
      userId: this.client?.getUserId() || null,
      homeserver: this.config.homeserverUrl,
      roomMappings: this.roomMappings.size,
      processedEvents: this.processedEvents.size,
      // Phase 8: Additional status
      circuitBreaker: {
        state: circuitState.state,
        failureCount: circuitState.failureCount,
        lastStateChange: new Date(circuitState.lastStateChange),
      },
      retryQueue: {
        size: this.retryQueue.length,
        oldestItem: this.retryQueue[0] ? new Date(this.retryQueue[0].addedAt) : null,
      },
      lastHealthCheck: this.lastHealthCheck,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Graceful shutdown (Phase 8: Clean up timers)
   */
  async shutdown() {
    log.info('Shutting down Matrix bridge...');

    // Phase 8: Clear timers
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.client) {
      try {
        await this.client.stopClient();
        log.info('Matrix client stopped');
      } catch (error) {
        log.error('Error stopping Matrix client:', error.message);
      }
    }

    this.isConnected = false;
    this.isInitialized = false;
    this.roomMappings.clear();
    this.processedEvents.clear();
    this.retryQueue = [];

    log.info('Matrix bridge shut down');
  }
}

/**
 * Create Matrix bridge service instance
 * @param {Object} config - Bridge configuration
 * @returns {MatrixBridgeService}
 */
function createMatrixBridge(config) {
  const bridgeConfig = {
    enabled: config.enabled !== false, // Default to true
    homeserverUrl: config.homeserverUrl || 'http://localhost:8008',
    serverName: config.serverName || 'matrix.cia-web.local',
    asToken: config.asToken,
    hsToken: config.hsToken,
    senderLocalpart: config.senderLocalpart || 'cia_bridge',
  };

  // Validate required config
  if (bridgeConfig.enabled && !bridgeConfig.asToken) {
    throw new Error('Matrix AS token is required when federation is enabled');
  }

  return new MatrixBridgeService(bridgeConfig);
}

module.exports = {
  MatrixBridgeService,
  createMatrixBridge,
};
