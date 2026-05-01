// server/src/routes/matrix.js
// Matrix Federation API Endpoints
//
// Phase 5: Federated User Support
// Exposes federated user information to the frontend

const express = require('express');
const router = express.Router();
const { createLogger } = require('../utils/logger');
const { getUserId } = require('../middleware/auth');

const log = createLogger('matrix-api');

// ============================================================================
// FEDERATED USER ENDPOINTS
// ============================================================================

/**
 * GET /api/matrix/users/room/:roomId
 * Get all federated users in a specific room
 */
router.get('/users/room/:roomId', async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { pool, matrixBridge } = req.app.locals;

    if (!matrixBridge || !matrixBridge.isConnected) {
      return res.status(503).json({
        error: 'Matrix federation not available',
        federatedUsers: []
      });
    }

    // Get Matrix room ID for this CIA room
    const matrixRoomId = await matrixBridge._getMatrixRoomId(roomId);
    if (!matrixRoomId) {
      return res.json({ federatedUsers: [] });
    }

    // Query federated users who have been seen in this room
    // We'll use the matrix_event_log to find users who have sent messages
    const result = await pool.query(
      `SELECT DISTINCT
        f.matrix_user_id,
        f.display_name,
        f.avatar_url,
        f.server_name,
        f.last_seen,
        f.status
       FROM federated_user_cache f
       WHERE f.status = 'active'
       ORDER BY f.last_seen DESC`,
      []
    );

    res.json({
      roomId,
      matrixRoomId,
      federatedUsers: result.rows,
      count: result.rows.length,
    });

  } catch (error) {
    log.error('Error fetching federated users:', error);
    next(error);
  }
});

/**
 * GET /api/matrix/users/:matrixUserId
 * Get details for a specific federated user
 */
router.get('/users/:matrixUserId', async (req, res, next) => {
  try {
    const { matrixUserId } = req.params;
    const { pool, matrixUserResolver } = req.app.locals;

    // Try database cache first
    const cached = await pool.query(
      `SELECT * FROM federated_user_cache WHERE matrix_user_id = $1`,
      [matrixUserId]
    );

    if (cached.rows.length > 0) {
      return res.json(cached.rows[0]);
    }

    // If not in cache and resolver available, fetch from Matrix
    if (matrixUserResolver) {
      try {
        const profile = await matrixUserResolver.resolveUser(matrixUserId);
        return res.json(profile);
      } catch (err) {
        log.warn('Failed to resolve Matrix user:', err.message);
      }
    }

    // Fallback: return basic info
    res.json({
      matrix_user_id: matrixUserId,
      display_name: matrixUserId.split(':')[0].replace('@', ''),
      server_name: matrixUserId.split(':')[1] || 'unknown',
      status: 'unknown',
    });

  } catch (error) {
    log.error('Error fetching federated user:', error);
    next(error);
  }
});

/**
 * GET /api/matrix/rooms/:roomId/members
 * Get Matrix room members (including federated users)
 */
router.get('/rooms/:roomId/members', async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { matrixBridge } = req.app.locals;

    if (!matrixBridge || !matrixBridge.isConnected) {
      return res.status(503).json({ error: 'Matrix federation not available' });
    }

    // Get Matrix room ID
    const matrixRoomId = await matrixBridge._getMatrixRoomId(roomId);
    if (!matrixRoomId) {
      return res.status(404).json({ error: 'Matrix room not found' });
    }

    // Get room from Matrix client
    const room = matrixBridge.client.getRoom(matrixRoomId);
    if (!room) {
      return res.status(404).json({ error: 'Matrix room not loaded' });
    }

    // Get joined members
    const members = room.getJoinedMembers();
    const memberList = members.map(member => ({
      userId: member.userId,
      displayName: member.name,
      avatarUrl: member.getAvatarUrl(matrixBridge.client.baseUrl, 48, 48, 'scale', false),
      membership: member.membership,
      powerLevel: room.getMemberPowerLevel(member.userId),
    }));

    res.json({
      roomId,
      matrixRoomId,
      members: memberList,
      count: memberList.length,
    });

  } catch (error) {
    log.error('Error fetching room members:', error);
    next(error);
  }
});

// ============================================================================
// AVATAR PROXY ENDPOINT
// ============================================================================

/**
 * GET /api/matrix/avatar/:matrixUserId
 * Proxy Matrix avatar images through CIA Web server
 * Caches avatars locally to reduce Matrix API calls
 */
router.get('/avatar/:matrixUserId', async (req, res, next) => {
  try {
    const { matrixUserId } = req.params;
    const { pool, matrixBridge } = req.app.locals;

    if (!matrixBridge || !matrixBridge.isConnected) {
      return res.status(503).send('Matrix federation not available');
    }

    // Check cache for avatar URL
    const cached = await pool.query(
      `SELECT avatar_url FROM federated_user_cache WHERE matrix_user_id = $1 AND avatar_url IS NOT NULL`,
      [matrixUserId]
    );

    let avatarUrl = null;
    if (cached.rows.length > 0) {
      avatarUrl = cached.rows[0].avatar_url;
    } else {
      // Fetch from Matrix API
      try {
        const profile = await matrixBridge.client.getProfileInfo(matrixUserId);
        if (profile.avatar_url) {
          avatarUrl = matrixBridge.client.mxcUrlToHttp(
            profile.avatar_url,
            48,
            48,
            'scale'
          );

          // Update cache
          await pool.query(
            `UPDATE federated_user_cache SET avatar_url = $1, cached_at = NOW()
             WHERE matrix_user_id = $2`,
            [avatarUrl, matrixUserId]
          );
        }
      } catch (err) {
        log.warn('Failed to fetch avatar from Matrix:', err.message);
      }
    }

    if (!avatarUrl) {
      return res.status(404).send('Avatar not found');
    }

    // Redirect to the actual avatar URL
    // In production, you might want to fetch and cache the image binary
    res.redirect(avatarUrl);

  } catch (error) {
    log.error('Error proxying avatar:', error);
    next(error);
  }
});

// ============================================================================
// MATRIX STATUS ENDPOINT
// ============================================================================

/**
 * GET /api/matrix/status
 * Get Matrix federation status
 */
router.get('/status', (req, res) => {
  const { matrixBridge } = req.app.locals;

  if (!matrixBridge) {
    return res.json({
      enabled: false,
      connected: false,
    });
  }

  res.json(matrixBridge.getStatus());
});

/**
 * GET /api/matrix/rooms/:roomId/info
 * Get Matrix room information
 */
router.get('/rooms/:roomId/info', async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { matrixBridge, pool } = req.app.locals;

    if (!matrixBridge || !matrixBridge.isConnected) {
      return res.status(503).json({ error: 'Matrix federation not available' });
    }

    // Get mapping from database
    const mapping = await pool.query(
      `SELECT * FROM matrix_room_mappings WHERE cia_room_id = $1`,
      [roomId]
    );

    if (mapping.rows.length === 0) {
      return res.status(404).json({ error: 'Matrix room not found' });
    }

    const roomData = mapping.rows[0];
    const matrixRoomId = roomData.matrix_room_id;

    // Get room from Matrix client
    const room = matrixBridge.client.getRoom(matrixRoomId);

    let roomInfo = {
      ciaRoomId: roomId,
      matrixRoomId: matrixRoomId,
      matrixAlias: roomData.matrix_alias,
      status: roomData.status,
      createdAt: roomData.created_at,
    };

    if (room) {
      roomInfo.name = room.name;
      roomInfo.topic = room.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic;
      roomInfo.memberCount = room.getJoinedMemberCount();
      roomInfo.canJoin = true;
    }

    res.json(roomInfo);

  } catch (error) {
    log.error('Error fetching Matrix room info:', error);
    next(error);
  }
});

// ============================================================================
// ROOM DIRECTORY & DISCOVERY (Phase 7)
// ============================================================================

/**
 * GET /api/matrix/directory/search
 * Search public Matrix rooms in the room directory
 */
router.get('/directory/search', async (req, res, next) => {
  try {
    const { query, server, limit = 20 } = req.query;
    const userId = getUserId(req);
    const { matrixBridge } = req.app.locals;

    if (!matrixBridge || !matrixBridge.isConnected) {
      return res.status(503).json({ error: 'Matrix federation not available' });
    }

    // Phase 8: Rate limiting (1 search per 10 seconds per user)
    if (!matrixBridge.checkRateLimit('directorySearches', userId, 10000)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Please wait before searching again',
      });
    }

    // Search public rooms
    const searchParams = {
      limit: parseInt(limit, 10),
      filter: {},
    };

    if (query) {
      searchParams.filter.generic_search_term = query;
    }

    if (server) {
      searchParams.server = server;
    }

    log.info('Searching Matrix room directory:', searchParams);

    const results = await matrixBridge.client.publicRooms(searchParams);

    // Format results for frontend
    const rooms = results.chunk.map(room => ({
      roomId: room.room_id,
      alias: room.canonical_alias || room.aliases?.[0] || null,
      name: room.name || room.canonical_alias || 'Unnamed Room',
      topic: room.topic || '',
      memberCount: room.num_joined_members || 0,
      avatarUrl: room.avatar_url ? matrixBridge.client.mxcUrlToHttp(room.avatar_url, 48, 48, 'scale') : null,
      isWorldReadable: room.world_readable || false,
      guestCanJoin: room.guest_can_join || false,
    }));

    res.json({
      rooms,
      total: results.total_room_count_estimate || rooms.length,
      nextBatch: results.next_batch || null,
    });

  } catch (error) {
    log.error('Error searching room directory:', error);
    next(error);
  }
});

/**
 * POST /api/matrix/rooms/join
 * Join an external Matrix room and create CIA Web room mapping
 */
router.post('/rooms/join', async (req, res, next) => {
  const client = await req.app.locals.pool.connect();

  try {
    const { roomIdOrAlias, projectId } = req.body;
    const userId = getUserId(req);
    const { matrixBridge, pool } = req.app.locals;

    if (!matrixBridge || !matrixBridge.isConnected) {
      return res.status(503).json({ error: 'Matrix federation not available' });
    }

    if (!roomIdOrAlias) {
      return res.status(400).json({ error: 'Room ID or alias is required' });
    }

    // Phase 8: Rate limiting (1 join per minute per user)
    if (!matrixBridge.checkRateLimit('roomJoins', userId, 60000)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Please wait before joining another room',
      });
    }

    log.info('Joining Matrix room:', roomIdOrAlias);

    // Join the Matrix room
    const joinResult = await matrixBridge.client.joinRoom(roomIdOrAlias);
    const matrixRoomId = joinResult.roomId;

    log.info('Joined Matrix room:', matrixRoomId);

    // Get room details
    const room = matrixBridge.client.getRoom(matrixRoomId);
    const roomName = room?.name || roomIdOrAlias;
    const roomTopic = room?.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic || '';

    await client.query('BEGIN');

    // Create CIA Web room
    const roomResult = await client.query(
      `INSERT INTO rooms (project_id, name, description, room_type, is_main, is_public, created_by)
       VALUES ($1, $2, $3, 'breakout', NULL, true, $4)
       RETURNING *`,
      [projectId, roomName, roomTopic, userId]
    );

    const ciaRoom = roomResult.rows[0];

    // Add creator as admin
    await client.query(
      `INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [ciaRoom.id, userId]
    );

    // Create room mapping
    await client.query(
      `INSERT INTO matrix_room_mappings (cia_room_id, matrix_room_id, matrix_alias, project_id, status)
       VALUES ($1, $2, $3, $4, 'active')`,
      [ciaRoom.id, matrixRoomId, roomIdOrAlias, projectId]
    );

    await client.query('COMMIT');

    log.info('Created CIA room mapping for external Matrix room:', {
      ciaRoomId: ciaRoom.id,
      matrixRoomId,
    });

    res.status(201).json({
      ciaRoom,
      matrixRoomId,
      matrixAlias: roomIdOrAlias,
      message: 'Successfully joined Matrix room and created mapping',
    });

  } catch (error) {
    await client.query('ROLLBACK');
    log.error('Error joining Matrix room:', error);

    if (error.errcode === 'M_FORBIDDEN') {
      return res.status(403).json({ error: 'Not allowed to join this room' });
    } else if (error.errcode === 'M_NOT_FOUND') {
      return res.status(404).json({ error: 'Room not found' });
    }

    next(error);
  } finally {
    client.release();
  }
});

/**
 * GET /api/matrix/directory/servers
 * Get list of known Matrix servers for filtering
 */
router.get('/directory/servers', (req, res) => {
  // Common public Matrix servers
  const servers = [
    { name: 'matrix.org', description: 'The Matrix.org homeserver' },
    { name: 'mozilla.org', description: 'Mozilla Matrix server' },
    { name: 'kde.org', description: 'KDE Matrix server' },
    { name: 'gnome.org', description: 'GNOME Matrix server' },
    { name: 'fedora.im', description: 'Fedora Project Matrix server' },
    { name: 'opensuse.org', description: 'openSUSE Matrix server' },
  ];

  res.json({ servers });
});

module.exports = router;
