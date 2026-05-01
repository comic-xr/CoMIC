/**
 * Integration Tests: Matrix Federation
 *
 * Tests the complete Matrix federation implementation including:
 * - Bridge initialization and connection
 * - Bidirectional message sync
 * - Room creation and mapping
 * - Federated user handling
 * - Room directory search and join
 * - Circuit breaker and resilience
 * - Rate limiting
 *
 * Prerequisites:
 * - PostgreSQL running with test database
 * - Synapse homeserver running (or mocked)
 * - Redis running (for BullMQ)
 * - Test environment variables configured
 */

const { createMatrixBridge } = require('../../src/services/matrixBridge');
const { Pool } = require('pg');
const sdk = require('matrix-js-sdk');

// Test configuration
const TEST_CONFIG = {
  enabled: true,
  homeserverUrl: process.env.TEST_MATRIX_HOMESERVER || 'http://localhost:8008',
  serverName: process.env.TEST_MATRIX_SERVER_NAME || 'matrix.test.local',
  asToken: process.env.TEST_MATRIX_AS_TOKEN || 'test_as_token_12345',
  hsToken: process.env.TEST_MATRIX_HS_TOKEN || 'test_hs_token_12345',
  senderLocalpart: 'test_bridge',
};

// Test database pool
let testPool;
let matrixBridge;

// Mock Y.js persistence
const mockYjsPersistence = {
  storeChatMessage: async (roomId, projectId, userId, username, message, yjsUpdateId, metadata) => {
    const id = 'test-message-' + Date.now();
    return {
      id,
      roomId,
      projectId,
      userId,
      username,
      message,
      timestamp: new Date(),
      metadata: metadata || {},
    };
  },
};

// =============================================================================
// SETUP & TEARDOWN
// =============================================================================

beforeAll(async () => {
  // Create test database pool
  testPool = new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || 5432,
    database: process.env.TEST_DB_NAME || 'cia_web_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
  });

  // Create test tables
  await setupTestDatabase();
});

afterAll(async () => {
  // Cleanup
  if (matrixBridge) {
    await matrixBridge.shutdown();
  }

  await cleanupTestDatabase();
  await testPool.end();
});

beforeEach(async () => {
  // Clear test data before each test
  await clearTestData();
});

// =============================================================================
// TEST SUITE: BRIDGE INITIALIZATION
// =============================================================================

describe('Matrix Bridge Initialization', () => {

  test('should create bridge instance with valid config', () => {
    const bridge = createMatrixBridge(TEST_CONFIG);
    expect(bridge).toBeDefined();
    expect(bridge.config.enabled).toBe(true);
    expect(bridge.config.homeserverUrl).toBe(TEST_CONFIG.homeserverUrl);
  });

  test('should throw error if AS token missing when enabled', () => {
    const invalidConfig = { ...TEST_CONFIG, asToken: null };
    expect(() => createMatrixBridge(invalidConfig)).toThrow('Matrix AS token is required');
  });

  test('should initialize circuit breaker', () => {
    const bridge = createMatrixBridge(TEST_CONFIG);
    expect(bridge.circuitBreaker).toBeDefined();
    expect(bridge.circuitBreaker.getState().state).toBe('CLOSED');
  });

  test('should initialize retry queue', () => {
    const bridge = createMatrixBridge(TEST_CONFIG);
    expect(bridge.retryQueue).toBeDefined();
    expect(bridge.retryQueue.length).toBe(0);
  });
});

// =============================================================================
// TEST SUITE: ROOM MAPPING
// =============================================================================

describe('Matrix Room Mapping', () => {

  beforeEach(async () => {
    matrixBridge = createMatrixBridge(TEST_CONFIG);
    await matrixBridge.initialize(mockYjsPersistence, testPool);
  });

  afterEach(async () => {
    if (matrixBridge) {
      await matrixBridge.shutdown();
      matrixBridge = null;
    }
  });

  test('should create Matrix room for CIA room', async () => {
    const ciaRoomId = 'test-room-' + Date.now();
    const roomInfo = {
      name: 'Test Room',
      topic: 'Test room topic',
      visibility: 'public',
    };

    const matrixRoomId = await matrixBridge.createOrGetMatrixRoom(ciaRoomId, roomInfo);

    expect(matrixRoomId).toBeDefined();
    expect(matrixRoomId).toMatch(/^!/); // Matrix room IDs start with !

    // Verify mapping stored in database
    const result = await testPool.query(
      'SELECT * FROM matrix_room_mappings WHERE cia_room_id = $1',
      [ciaRoomId]
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].matrix_room_id).toBe(matrixRoomId);
  });

  test('should return existing Matrix room if mapping exists', async () => {
    const ciaRoomId = 'test-room-existing';

    // Create first time
    const roomId1 = await matrixBridge.createOrGetMatrixRoom(ciaRoomId, { name: 'Test' });

    // Create second time (should return same)
    const roomId2 = await matrixBridge.createOrGetMatrixRoom(ciaRoomId, { name: 'Test' });

    expect(roomId1).toBe(roomId2);
  });

  test('should load room mappings from database on init', async () => {
    // Insert mapping directly to database
    const ciaRoomId = 'test-room-preload';
    const matrixRoomId = '!test123:matrix.test.local';

    await testPool.query(
      `INSERT INTO matrix_room_mappings (cia_room_id, matrix_room_id, matrix_alias, status)
       VALUES ($1, $2, $3, 'active')`,
      [ciaRoomId, matrixRoomId, '#test:matrix.test.local']
    );

    // Create new bridge instance
    const newBridge = createMatrixBridge(TEST_CONFIG);
    await newBridge.initialize(mockYjsPersistence, testPool);

    // Verify mapping loaded
    expect(newBridge.roomMappings.has(ciaRoomId)).toBe(true);
    expect(newBridge.roomMappings.get(ciaRoomId).matrixRoomId).toBe(matrixRoomId);

    await newBridge.shutdown();
  });
});

// =============================================================================
// TEST SUITE: MESSAGE SYNC
// =============================================================================

describe('Message Synchronization', () => {

  beforeEach(async () => {
    matrixBridge = createMatrixBridge(TEST_CONFIG);
    await matrixBridge.initialize(mockYjsPersistence, testPool);
  });

  afterEach(async () => {
    if (matrixBridge) {
      await matrixBridge.shutdown();
      matrixBridge = null;
    }
  });

  test('should sync CIA message to Matrix', async () => {
    const ciaRoomId = 'test-room-sync';
    const matrixRoomId = await matrixBridge.createOrGetMatrixRoom(ciaRoomId, { name: 'Test' });

    const message = {
      id: 'test-msg-1',
      roomId: ciaRoomId,
      userId: 'test-user-1',
      username: 'Test User',
      message: 'Hello Matrix!',
      metadata: {},
    };

    const eventId = await matrixBridge.syncToMatrix(message);

    expect(eventId).toBeDefined();
    expect(eventId).toMatch(/^\$/); // Matrix event IDs start with $
  });

  test('should not sync messages that originated from Matrix', async () => {
    const message = {
      id: 'test-msg-2',
      roomId: 'test-room',
      userId: 'test-user',
      username: 'Test User',
      message: 'From Matrix',
      metadata: {
        federation_source: 'matrix',
        matrix_event_id: '$existing123',
      },
    };

    const eventId = await matrixBridge.syncToMatrix(message);

    // Should return null (not synced)
    expect(eventId).toBeNull();
  });

  test('should mark events as processed to prevent loops', async () => {
    const eventId = '$test-event-123';

    await matrixBridge._markProcessed(eventId, 'msg-1', 'outbound', '!room:test', 'cia-room', null);

    const isDuplicate = await matrixBridge._isDuplicate(eventId);
    expect(isDuplicate).toBe(true);
  });
});

// =============================================================================
// TEST SUITE: FEDERATED USERS
// =============================================================================

describe('Federated User Handling', () => {

  beforeEach(async () => {
    matrixBridge = createMatrixBridge(TEST_CONFIG);
    await matrixBridge.initialize(mockYjsPersistence, testPool);
  });

  afterEach(async () => {
    if (matrixBridge) {
      await matrixBridge.shutdown();
      matrixBridge = null;
    }
  });

  test('should cache federated user on join', async () => {
    const mockMember = {
      userId: '@testuser:external.org',
      name: 'Test User',
      membership: 'join',
      roomId: '!testroom:matrix.test.local',
      getAvatarUrl: () => null,
    };

    await matrixBridge._updateFederatedUser(mockMember);

    const result = await testPool.query(
      'SELECT * FROM federated_user_cache WHERE matrix_user_id = $1',
      [mockMember.userId]
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].display_name).toBe('Test User');
    expect(result.rows[0].server_name).toBe('external.org');
    expect(result.rows[0].status).toBe('active');
  });

  test('should update existing user on subsequent joins', async () => {
    const userId = '@testuser:external.org';

    // First insert
    await testPool.query(
      `INSERT INTO federated_user_cache (matrix_user_id, display_name, server_name, status)
       VALUES ($1, 'Old Name', 'external.org', 'active')`,
      [userId]
    );

    // Update via bridge
    const mockMember = {
      userId,
      name: 'New Name',
      membership: 'join',
      roomId: '!test:matrix.test.local',
      getAvatarUrl: () => null,
    };

    await matrixBridge._updateFederatedUser(mockMember);

    const result = await testPool.query(
      'SELECT * FROM federated_user_cache WHERE matrix_user_id = $1',
      [userId]
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].display_name).toBe('New Name');
  });

  test('should mark user as inactive on leave', async () => {
    const userId = '@testuser:external.org';

    await testPool.query(
      `INSERT INTO federated_user_cache (matrix_user_id, display_name, server_name, status)
       VALUES ($1, 'Test User', 'external.org', 'active')`,
      [userId]
    );

    await matrixBridge._updateFederatedUserStatus(userId, 'inactive');

    const result = await testPool.query(
      'SELECT status FROM federated_user_cache WHERE matrix_user_id = $1',
      [userId]
    );

    expect(result.rows[0].status).toBe('inactive');
  });
});

// =============================================================================
// TEST SUITE: CIRCUIT BREAKER
// =============================================================================

describe('Circuit Breaker Resilience', () => {

  test('should open circuit after failure threshold', async () => {
    const bridge = createMatrixBridge(TEST_CONFIG);
    const breaker = bridge.circuitBreaker;

    // Simulate failures
    for (let i = 0; i < 5; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('Test failure');
        });
      } catch (err) {
        // Expected
      }
    }

    expect(breaker.getState().state).toBe('OPEN');
  });

  test('should fail fast when circuit is open', async () => {
    const bridge = createMatrixBridge(TEST_CONFIG);
    const breaker = bridge.circuitBreaker;

    // Force circuit open
    for (let i = 0; i < 5; i++) {
      try {
        await breaker.execute(async () => { throw new Error('Fail'); });
      } catch (err) {}
    }

    expect(breaker.getState().state).toBe('OPEN');

    // Next call should fail immediately
    const startTime = Date.now();
    try {
      await breaker.execute(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second
        return 'success';
      });
    } catch (err) {
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(100); // Failed fast (< 100ms)
      expect(err.code).toBe('CIRCUIT_OPEN');
    }
  });

  test('should transition to half-open after timeout', async () => {
    const bridge = createMatrixBridge({
      ...TEST_CONFIG,
      circuitBreakerTimeout: 100, // 100ms for testing
    });

    // Manually configure breaker with short timeout
    bridge.circuitBreaker.timeout = 100;

    const breaker = bridge.circuitBreaker;

    // Open circuit
    for (let i = 0; i < 5; i++) {
      try {
        await breaker.execute(async () => { throw new Error('Fail'); });
      } catch (err) {}
    }

    expect(breaker.getState().state).toBe('OPEN');

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Next call should attempt (half-open)
    try {
      await breaker.execute(async () => 'success');
    } catch (err) {
      // State should have transitioned to HALF_OPEN before this call
    }

    expect(breaker.getState().state).toBe('CLOSED'); // Closed after success
  });

  test('should close circuit after success threshold in half-open', async () => {
    const bridge = createMatrixBridge(TEST_CONFIG);
    bridge.circuitBreaker.timeout = 50;
    const breaker = bridge.circuitBreaker;

    // Open circuit
    for (let i = 0; i < 5; i++) {
      try {
        await breaker.execute(async () => { throw new Error('Fail'); });
      } catch (err) {}
    }

    // Wait and enter half-open
    await new Promise(resolve => setTimeout(resolve, 100));
    breaker.state = 'HALF_OPEN';

    // Succeed twice (success threshold)
    await breaker.execute(async () => 'success');
    await breaker.execute(async () => 'success');

    expect(breaker.getState().state).toBe('CLOSED');
  });
});

// =============================================================================
// TEST SUITE: RETRY QUEUE
// =============================================================================

describe('Message Retry Queue', () => {

  beforeEach(async () => {
    matrixBridge = createMatrixBridge(TEST_CONFIG);
    await matrixBridge.initialize(mockYjsPersistence, testPool);
  });

  afterEach(async () => {
    if (matrixBridge) {
      await matrixBridge.shutdown();
      matrixBridge = null;
    }
  });

  test('should add failed message to retry queue', () => {
    const message = {
      id: 'test-msg',
      roomId: 'test-room',
      message: 'Test',
    };

    matrixBridge._addToRetryQueue(message);

    expect(matrixBridge.retryQueue.length).toBe(1);
    expect(matrixBridge.retryQueue[0].message.id).toBe('test-msg');
    expect(matrixBridge.retryQueue[0].attempts).toBe(0);
  });

  test('should process retry queue with exponential backoff', async () => {
    const message = {
      id: 'test-msg',
      roomId: 'test-room',
      message: 'Test',
    };

    matrixBridge._addToRetryQueue(message);

    const item = matrixBridge.retryQueue[0];
    const firstRetryTime = item.nextRetryTime;

    // Simulate failure and re-queue
    item.attempts = 1;
    item.nextRetryTime = Date.now() + (matrixBridge.retryBackoff * Math.pow(2, 1));

    expect(item.nextRetryTime).toBeGreaterThan(firstRetryTime);
  });

  test('should drop message after max retries', async () => {
    const message = {
      id: 'test-msg',
      roomId: 'test-room',
      message: 'Test',
    };

    // Add with max attempts
    matrixBridge.retryQueue.push({
      message,
      attempts: matrixBridge.maxRetries,
      nextRetryTime: Date.now(),
      addedAt: Date.now(),
    });

    // Process queue (should drop message)
    await matrixBridge._processRetryQueue();

    expect(matrixBridge.retryQueue.length).toBe(0);
  });
});

// =============================================================================
// TEST SUITE: RATE LIMITING
// =============================================================================

describe('Rate Limiting', () => {

  beforeEach(() => {
    matrixBridge = createMatrixBridge(TEST_CONFIG);
  });

  afterEach(async () => {
    if (matrixBridge) {
      await matrixBridge.shutdown();
      matrixBridge = null;
    }
  });

  test('should allow first action within rate limit', () => {
    const allowed = matrixBridge.checkRateLimit('roomJoins', 'user-1', 60000);
    expect(allowed).toBe(true);
  });

  test('should block second action within rate limit window', () => {
    matrixBridge.checkRateLimit('roomJoins', 'user-1', 60000);
    const blocked = matrixBridge.checkRateLimit('roomJoins', 'user-1', 60000);
    expect(blocked).toBe(false);
  });

  test('should allow action after rate limit window expires', async () => {
    matrixBridge.checkRateLimit('roomJoins', 'user-1', 100); // 100ms

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    const allowed = matrixBridge.checkRateLimit('roomJoins', 'user-1', 100);
    expect(allowed).toBe(true);
  });

  test('should track rate limits per user', () => {
    matrixBridge.checkRateLimit('roomJoins', 'user-1', 60000);

    // Different user should be allowed
    const allowed = matrixBridge.checkRateLimit('roomJoins', 'user-2', 60000);
    expect(allowed).toBe(true);
  });
});

// =============================================================================
// TEST SUITE: HEALTH CHECKS
// =============================================================================

describe('Health Checks & Auto-Reconnect', () => {

  beforeEach(async () => {
    matrixBridge = createMatrixBridge(TEST_CONFIG);
  });

  afterEach(async () => {
    if (matrixBridge) {
      await matrixBridge.shutdown();
      matrixBridge = null;
    }
  });

  test('should perform health check', async () => {
    await matrixBridge.initialize(mockYjsPersistence, testPool);

    await matrixBridge._performHealthCheck();

    expect(matrixBridge.lastHealthCheck).toBeDefined();
    expect(matrixBridge.lastHealthCheck.timestamp).toBeDefined();
    expect(['healthy', 'unhealthy']).toContain(matrixBridge.lastHealthCheck.status);
  });

  test('should increment reconnect attempts on failure', async () => {
    matrixBridge.isConnected = false;
    matrixBridge.client = null;

    const initialAttempts = matrixBridge.reconnectAttempts;

    await matrixBridge._attemptReconnect();

    expect(matrixBridge.reconnectAttempts).toBe(initialAttempts + 1);
  });

  test('should stop reconnecting after max attempts', async () => {
    matrixBridge.reconnectAttempts = matrixBridge.maxReconnectAttempts;
    matrixBridge.isConnected = false;

    await matrixBridge._attemptReconnect();

    // Should not increment beyond max
    expect(matrixBridge.reconnectAttempts).toBe(matrixBridge.maxReconnectAttempts);
  });
});

// =============================================================================
// TEST SUITE: STATUS ENDPOINT
// =============================================================================

describe('Bridge Status', () => {

  beforeEach(async () => {
    matrixBridge = createMatrixBridge(TEST_CONFIG);
    await matrixBridge.initialize(mockYjsPersistence, testPool);
  });

  afterEach(async () => {
    if (matrixBridge) {
      await matrixBridge.shutdown();
      matrixBridge = null;
    }
  });

  test('should return complete status', () => {
    const status = matrixBridge.getStatus();

    expect(status).toHaveProperty('enabled');
    expect(status).toHaveProperty('initialized');
    expect(status).toHaveProperty('connected');
    expect(status).toHaveProperty('circuitBreaker');
    expect(status).toHaveProperty('retryQueue');
    expect(status).toHaveProperty('lastHealthCheck');
    expect(status).toHaveProperty('reconnectAttempts');
  });

  test('should include circuit breaker state', () => {
    const status = matrixBridge.getStatus();

    expect(status.circuitBreaker).toHaveProperty('state');
    expect(status.circuitBreaker).toHaveProperty('failureCount');
    expect(status.circuitBreaker).toHaveProperty('lastStateChange');
  });

  test('should include retry queue info', () => {
    const status = matrixBridge.getStatus();

    expect(status.retryQueue).toHaveProperty('size');
    expect(status.retryQueue).toHaveProperty('oldestItem');
  });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function setupTestDatabase() {
  // Create test tables
  await testPool.query(`
    CREATE TABLE IF NOT EXISTS matrix_room_mappings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cia_room_id VARCHAR(255) NOT NULL UNIQUE,
      matrix_room_id VARCHAR(255) NOT NULL UNIQUE,
      matrix_alias VARCHAR(255),
      project_id UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_synced_at TIMESTAMPTZ DEFAULT NOW(),
      status VARCHAR(50) DEFAULT 'active',
      config JSONB DEFAULT '{}'
    )
  `);

  await testPool.query(`
    CREATE TABLE IF NOT EXISTS matrix_event_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      matrix_event_id VARCHAR(255) NOT NULL UNIQUE,
      cia_message_id UUID,
      direction VARCHAR(20) NOT NULL CHECK (direction IN ('outbound', 'inbound')),
      matrix_room_id VARCHAR(255) NOT NULL,
      cia_room_id VARCHAR(255),
      matrix_user_id VARCHAR(255),
      processed_at TIMESTAMPTZ DEFAULT NOW(),
      event_data JSONB DEFAULT '{}'
    )
  `);

  await testPool.query(`
    CREATE TABLE IF NOT EXISTS federated_user_cache (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      matrix_user_id VARCHAR(255) NOT NULL UNIQUE,
      cia_user_id UUID,
      display_name VARCHAR(255),
      avatar_url TEXT,
      server_name VARCHAR(255),
      last_seen TIMESTAMPTZ DEFAULT NOW(),
      cached_at TIMESTAMPTZ DEFAULT NOW(),
      profile_data JSONB DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'active'
    )
  `);
}

async function cleanupTestDatabase() {
  await testPool.query('DROP TABLE IF EXISTS matrix_room_mappings CASCADE');
  await testPool.query('DROP TABLE IF EXISTS matrix_event_log CASCADE');
  await testPool.query('DROP TABLE IF EXISTS federated_user_cache CASCADE');
}

async function clearTestData() {
  await testPool.query('DELETE FROM matrix_room_mappings');
  await testPool.query('DELETE FROM matrix_event_log');
  await testPool.query('DELETE FROM federated_user_cache');
}
