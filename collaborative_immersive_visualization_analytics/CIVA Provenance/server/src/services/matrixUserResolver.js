// server/src/services/matrixUserResolver.js
// Matrix User Resolution Service
//
// Handles resolving Matrix user IDs to display names and avatars
// Caches federated user information to reduce Matrix API calls

const { createLogger } = require('../utils/logger');

const log = createLogger('matrix-user-resolver');

/**
 * Matrix User Resolver Service
 * Resolves Matrix user IDs to display names, avatars, and profiles
 */
class MatrixUserResolver {
  constructor(matrixClient, pool) {
    this.client = matrixClient;
    this.pool = pool;

    // In-memory cache: matrixUserId -> user profile
    this.userCache = new Map();
    this.cacheTTL = 15 * 60 * 1000; // 15 minutes

    // Start cache cleanup timer
    this._startCacheCleanup();
  }

  /**
   * Resolve a Matrix user ID to profile information
   * @param {string} matrixUserId - Matrix user ID (e.g., @user:server.org)
   * @param {string} roomId - Optional room ID for room-specific display names
   * @returns {Promise<Object>} User profile
   */
  async resolveUser(matrixUserId, roomId = null) {
    try {
      // Check memory cache first
      const cached = this._getCached(matrixUserId);
      if (cached) {
        log.trace('User resolved from cache:', matrixUserId);
        return cached;
      }

      // Fetch from Matrix API
      const profile = await this._fetchUserProfile(matrixUserId, roomId);

      // Cache the result
      this._setCached(matrixUserId, profile);

      // Store in database for persistence (Phase 3)
      await this._storeInDatabase(profile);

      log.debug('User resolved from Matrix API:', matrixUserId);
      return profile;

    } catch (error) {
      log.error('Failed to resolve Matrix user:', matrixUserId, error.message);

      // Return fallback profile
      return this._getFallbackProfile(matrixUserId);
    }
  }

  /**
   * Fetch user profile from Matrix API
   * @private
   */
  async _fetchUserProfile(matrixUserId, roomId) {
    try {
      // Get user profile
      const profile = await this.client.getProfileInfo(matrixUserId);

      // Get room-specific display name if room provided
      let displayName = profile.displayname || this._extractLocalpart(matrixUserId);
      let avatarUrl = profile.avatar_url || null;

      if (roomId) {
        try {
          const room = this.client.getRoom(roomId);
          if (room) {
            const member = room.getMember(matrixUserId);
            if (member) {
              displayName = member.name || displayName;
              avatarUrl = member.getAvatarUrl(
                this.client.baseUrl,
                48,
                48,
                'scale',
                false
              ) || avatarUrl;
            }
          }
        } catch (err) {
          log.trace('Could not get room-specific display name:', err.message);
        }
      }

      // Convert Matrix avatar URL to HTTP URL
      const avatarHttpUrl = avatarUrl
        ? this.client.mxcUrlToHttp(avatarUrl, 48, 48, 'scale')
        : null;

      return {
        matrixUserId,
        displayName,
        avatarUrl: avatarHttpUrl,
        serverName: this._extractServerName(matrixUserId),
        isFederated: true,
        lastSeen: new Date(),
      };

    } catch (error) {
      log.warn('Matrix API error fetching profile:', matrixUserId, error.message);
      throw error;
    }
  }

  /**
   * Store user profile in database cache
   * @private
   */
  async _storeInDatabase(profile) {
    if (!this.pool) {
      log.trace('No database pool available for storing user profile');
      return;
    }

    try {
      await this.pool.query(
        `INSERT INTO federated_user_cache
         (matrix_user_id, display_name, avatar_url, server_name, last_seen, cached_at, status)
         VALUES ($1, $2, $3, $4, $5, NOW(), 'active')
         ON CONFLICT (matrix_user_id) DO UPDATE
         SET display_name = $2, avatar_url = $3, last_seen = $5, cached_at = NOW()`,
        [
          profile.matrixUserId,
          profile.displayName,
          profile.avatarUrl,
          profile.serverName,
          profile.lastSeen,
        ]
      );
      log.trace('User profile stored in database:', profile.matrixUserId);
    } catch (error) {
      log.error('Failed to store user profile in database:', error.message);
      // Non-fatal - in-memory cache still works
    }
  }

  /**
   * Resolve multiple users in batch
   * @param {Array<string>} matrixUserIds - Array of Matrix user IDs
   * @param {string} roomId - Optional room ID
   * @returns {Promise<Map<string, Object>>} Map of userId -> profile
   */
  async resolveUsers(matrixUserIds, roomId = null) {
    const results = new Map();

    // Resolve in parallel
    const promises = matrixUserIds.map(async (userId) => {
      const profile = await this.resolveUser(userId, roomId);
      results.set(userId, profile);
    });

    await Promise.all(promises);

    return results;
  }

  /**
   * Get cached user profile
   * @private
   */
  _getCached(matrixUserId) {
    const cached = this.userCache.get(matrixUserId);
    if (!cached) return null;

    // Check if cache entry is still valid
    const age = Date.now() - cached.cachedAt;
    if (age > this.cacheTTL) {
      this.userCache.delete(matrixUserId);
      return null;
    }

    return cached.profile;
  }

  /**
   * Cache user profile
   * @private
   */
  _setCached(matrixUserId, profile) {
    this.userCache.set(matrixUserId, {
      profile,
      cachedAt: Date.now(),
    });
  }

  /**
   * Get fallback profile for when resolution fails
   * @private
   */
  _getFallbackProfile(matrixUserId) {
    return {
      matrixUserId,
      displayName: this._extractLocalpart(matrixUserId),
      avatarUrl: null,
      serverName: this._extractServerName(matrixUserId),
      isFederated: true,
      lastSeen: new Date(),
    };
  }

  /**
   * Extract localpart from Matrix user ID
   * @private
   */
  _extractLocalpart(matrixUserId) {
    // @username:server.org -> username
    return matrixUserId.split(':')[0].replace('@', '');
  }

  /**
   * Extract server name from Matrix user ID
   * @private
   */
  _extractServerName(matrixUserId) {
    // @username:server.org -> server.org
    const parts = matrixUserId.split(':');
    return parts.length > 1 ? parts[1] : 'unknown';
  }

  /**
   * Invalidate cached user profile
   * @param {string} matrixUserId - Matrix user ID
   */
  invalidateCache(matrixUserId) {
    this.userCache.delete(matrixUserId);
    log.debug('Invalidated cache for user:', matrixUserId);
  }

  /**
   * Clear all cached profiles
   */
  clearCache() {
    const size = this.userCache.size;
    this.userCache.clear();
    log.info('Cleared user cache:', size, 'entries');
  }

  /**
   * Start cache cleanup timer
   * @private
   */
  _startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [userId, cached] of this.userCache.entries()) {
        const age = now - cached.cachedAt;
        if (age > this.cacheTTL) {
          this.userCache.delete(userId);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        log.debug('Cleaned up', cleaned, 'expired user cache entries');
      }
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      size: this.userCache.size,
      ttl: this.cacheTTL,
    };
  }

  /**
   * Preload users for a room
   * Useful when a room is opened to avoid lazy loading
   * @param {string} roomId - Matrix room ID
   * @returns {Promise<number>} Number of users preloaded
   */
  async preloadRoomMembers(roomId) {
    try {
      const room = this.client.getRoom(roomId);
      if (!room) {
        log.warn('Cannot preload members: room not found:', roomId);
        return 0;
      }

      const members = room.getJoinedMembers();
      const memberIds = members.map((m) => m.userId);

      log.info('Preloading', memberIds.length, 'members for room:', roomId);

      await this.resolveUsers(memberIds, roomId);

      return memberIds.length;

    } catch (error) {
      log.error('Failed to preload room members:', error.message);
      return 0;
    }
  }
}

/**
 * Create Matrix user resolver instance
 * @param {MatrixClient} matrixClient - Matrix SDK client
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {MatrixUserResolver}
 */
function createMatrixUserResolver(matrixClient, pool) {
  if (!matrixClient) {
    throw new Error('Matrix client is required for user resolver');
  }

  return new MatrixUserResolver(matrixClient, pool);
}

module.exports = {
  MatrixUserResolver,
  createMatrixUserResolver,
};
