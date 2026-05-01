// server/src/services/workerRegistry.js
// Worker registry for routing computation jobs to workers
//
// v2.0 Architecture: Config-based first, self-registration later
// Workers are configured via environment or config file
// Later: Workers can self-register with heartbeat

const { server: log, compute: computeLog } = require("../utils/logger");

// ============================================================================
// WORKER TYPES
// ============================================================================

const WORKER_TYPES = {
  // Point cloud processing
  POINT_CLOUD: "point_cloud",
  // VTK/VTI mesh processing
  MESH: "mesh",
  // Isosurface extraction
  ISOSURFACE: "isosurface",
  // Decimation and simplification
  DECIMATION: "decimation",
  // Thumbnail generation (headless browser)
  THUMBNAIL: "thumbnail",
  // VR preprocessing (LOD, octree, bounds)
  VR_PREPROCESSING: "vr-preprocessing",
  // General compute (catch-all)
  GENERAL: "general",
};

// ============================================================================
// OPERATION -> WORKER TYPE MAPPING
// ============================================================================

const OPERATION_WORKER_MAP = {
  // Point cloud operations
  "decimate-point-cloud": WORKER_TYPES.POINT_CLOUD,
  "point-cloud-to-mesh": WORKER_TYPES.POINT_CLOUD,
  "estimate-normals": WORKER_TYPES.POINT_CLOUD,
  "filter-points": WORKER_TYPES.POINT_CLOUD,

  // Isosurface operations
  "extract-isosurface": WORKER_TYPES.ISOSURFACE,
  "marching-cubes": WORKER_TYPES.ISOSURFACE,

  // Mesh operations
  "decimate-mesh": WORKER_TYPES.DECIMATION,
  "simplify-mesh": WORKER_TYPES.DECIMATION,
  "smooth-mesh": WORKER_TYPES.MESH,
  "clip-mesh": WORKER_TYPES.MESH,

  // Thumbnail operations
  "generate-thumbnail": WORKER_TYPES.THUMBNAIL,
  "regenerate-thumbnail": WORKER_TYPES.THUMBNAIL,

  // General operations
  "compute-bounds": WORKER_TYPES.GENERAL,
  "compute-histogram": WORKER_TYPES.GENERAL,
  "dr-pca": WORKER_TYPES.GENERAL,
  "dr-tsne": WORKER_TYPES.GENERAL,
  "dr-umap": WORKER_TYPES.GENERAL,

  // VR preprocessing operations
  "vr-lod-generation": WORKER_TYPES.VR_PREPROCESSING,
  "vr-octree-build": WORKER_TYPES.VR_PREPROCESSING,
  "vr-bounds-calculation": WORKER_TYPES.VR_PREPROCESSING,
  "vr-texture-compress": WORKER_TYPES.VR_PREPROCESSING,
};

// ============================================================================
// WORKER REGISTRY
// ============================================================================

class WorkerRegistry {
  constructor() {
    // Registered workers (from config or self-registration)
    this.workers = new Map();

    // Worker health status
    this.workerHealth = new Map();

    // Round-robin counters for load balancing
    this.roundRobinCounters = new Map();

    // Configuration
    this.config = {
      healthCheckIntervalMs: 30000, // 30 seconds
      unhealthyThresholdMs: 60000, // 60 seconds
      maxRetries: 3,
    };

    // Initialize from environment
    this._initializeFromConfig();
  }

  /**
   * Initialize workers from environment configuration
   * Format: WORKER_{TYPE}_{INDEX}_URL=http://host:port
   * Example: WORKER_POINT_CLOUD_1_URL=http://worker1:8080
   */
  _initializeFromConfig() {
    log.info("Initializing worker registry from config...");

    // Look for worker URLs in environment
    for (const [key, value] of Object.entries(process.env)) {
      const match = key.match(/^WORKER_(\w+)_(\d+)_URL$/);
      if (match) {
        const workerType = match[1].toLowerCase();
        const workerId = `${workerType}_${match[2]}`;

        this.registerWorker({
          id: workerId,
          type: workerType,
          url: value,
          source: "config",
        });
      }
    }

    // Default workers from COMPUTE_WORKER_URL (legacy single-worker setup)
    if (process.env.COMPUTE_WORKER_URL) {
      this.registerWorker({
        id: "general_default",
        type: WORKER_TYPES.GENERAL,
        url: process.env.COMPUTE_WORKER_URL,
        source: "config",
        capabilities: Object.values(WORKER_TYPES), // Can handle anything
      });
    }

    // Log results
    const workerCount = this.workers.size;
    if (workerCount === 0) {
      log.warn(
        "No workers configured. Set WORKER_{TYPE}_{INDEX}_URL or COMPUTE_WORKER_URL"
      );
    } else {
      log.info(`Registered ${workerCount} worker(s) from config`);
      this.workers.forEach((worker, id) => {
        log.debug(`  ${id}: ${worker.url} (${worker.type})`);
      });
    }
  }

  /**
   * Register a worker
   * @param {object} worker - { id, type, url, source, capabilities }
   */
  registerWorker(worker) {
    const { id, type, url, source = "manual", capabilities = [] } = worker;

    if (!id || !type || !url) {
      throw new Error("Worker registration requires id, type, and url");
    }

    this.workers.set(id, {
      id,
      type,
      url,
      source,
      capabilities: capabilities.length > 0 ? capabilities : [type],
      registeredAt: Date.now(),
      lastHeartbeat: Date.now(),
    });

    this.workerHealth.set(id, {
      healthy: true,
      lastCheck: Date.now(),
      consecutiveFailures: 0,
    });

    log.info(`Registered worker: ${id} (${type}) at ${url}`);
    return true;
  }

  /**
   * Unregister a worker
   * @param {string} workerId - Worker ID
   */
  unregisterWorker(workerId) {
    if (this.workers.has(workerId)) {
      this.workers.delete(workerId);
      this.workerHealth.delete(workerId);
      log.info(`Unregistered worker: ${workerId}`);
      return true;
    }
    return false;
  }

  /**
   * Get a worker for an operation
   * Uses type mapping and load balancing
   *
   * @param {string} operation - Operation name (e.g., "decimate-point-cloud")
   * @returns {object|null} - Worker info or null if none available
   */
  getWorkerForOperation(operation) {
    // Get worker type for this operation
    const workerType = OPERATION_WORKER_MAP[operation] || WORKER_TYPES.GENERAL;

    // Find workers that can handle this type
    const availableWorkers = [];

    for (const [id, worker] of this.workers) {
      const health = this.workerHealth.get(id);

      // Skip unhealthy workers
      if (!health?.healthy) {
        continue;
      }

      // Check if worker can handle this type
      if (
        worker.type === workerType ||
        worker.capabilities.includes(workerType)
      ) {
        availableWorkers.push(worker);
      }
    }

    // Fallback to general workers if no specific ones available
    if (availableWorkers.length === 0) {
      for (const [id, worker] of this.workers) {
        const health = this.workerHealth.get(id);
        if (health?.healthy && worker.type === WORKER_TYPES.GENERAL) {
          availableWorkers.push(worker);
        }
      }
    }

    if (availableWorkers.length === 0) {
      log.warn(`No healthy workers available for operation: ${operation}`);
      return null;
    }

    // Round-robin load balancing
    const counter = this.roundRobinCounters.get(workerType) || 0;
    const selectedWorker = availableWorkers[counter % availableWorkers.length];
    this.roundRobinCounters.set(workerType, counter + 1);

    computeLog.debug(`Selected worker ${selectedWorker.id} for ${operation}`);
    return selectedWorker;
  }

  /**
   * Update worker health after a successful call
   * @param {string} workerId - Worker ID
   */
  markWorkerHealthy(workerId) {
    const health = this.workerHealth.get(workerId);
    if (health) {
      health.healthy = true;
      health.lastCheck = Date.now();
      health.consecutiveFailures = 0;
    }
  }

  /**
   * Update worker health after a failed call
   * @param {string} workerId - Worker ID
   */
  markWorkerUnhealthy(workerId) {
    const health = this.workerHealth.get(workerId);
    if (health) {
      health.consecutiveFailures++;
      health.lastCheck = Date.now();

      if (health.consecutiveFailures >= this.config.maxRetries) {
        health.healthy = false;
        log.warn(
          `Worker ${workerId} marked unhealthy after ${health.consecutiveFailures} failures`
        );
      }
    }
  }

  /**
   * Record heartbeat from self-registering worker
   * @param {string} workerId - Worker ID
   */
  recordHeartbeat(workerId) {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.lastHeartbeat = Date.now();
      this.markWorkerHealthy(workerId);
    }
  }

  /**
   * Get status of all workers
   * @returns {object} - Worker status summary
   */
  getStatus() {
    const status = {
      totalWorkers: this.workers.size,
      healthyWorkers: 0,
      workersByType: {},
      workers: [],
    };

    for (const [id, worker] of this.workers) {
      const health = this.workerHealth.get(id);
      const isHealthy = health?.healthy ?? false;

      if (isHealthy) {
        status.healthyWorkers++;
      }

      // Count by type
      status.workersByType[worker.type] =
        (status.workersByType[worker.type] || 0) + 1;

      status.workers.push({
        id: worker.id,
        type: worker.type,
        url: worker.url,
        healthy: isHealthy,
        source: worker.source,
        lastHeartbeat: worker.lastHeartbeat,
        consecutiveFailures: health?.consecutiveFailures || 0,
      });
    }

    return status;
  }

  /**
   * Get list of supported operations
   * @returns {string[]} - List of operation names
   */
  getSupportedOperations() {
    return Object.keys(OPERATION_WORKER_MAP);
  }

  /**
   * Check if an operation is supported
   * @param {string} operation - Operation name
   * @returns {boolean}
   */
  isOperationSupported(operation) {
    return operation in OPERATION_WORKER_MAP;
  }
}

// Singleton instance
const workerRegistry = new WorkerRegistry();

// ============================================================================
// SELF-REGISTRATION API (Future)
// Workers can call these endpoints to register themselves
// ============================================================================

/**
 * Handle worker self-registration
 * Called when a worker starts up and announces itself
 *
 * @param {object} registration - { id, type, url, capabilities }
 * @returns {object} - { success, registrationId }
 */
function handleWorkerRegistration(registration) {
  try {
    workerRegistry.registerWorker({
      ...registration,
      source: "self-registration",
    });

    return {
      success: true,
      registrationId: registration.id,
      heartbeatIntervalMs: workerRegistry.config.healthCheckIntervalMs,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Handle worker heartbeat
 * Called periodically by workers to indicate they're still alive
 *
 * @param {string} workerId - Worker ID
 * @returns {object} - { success, nextHeartbeatMs }
 */
function handleWorkerHeartbeat(workerId) {
  workerRegistry.recordHeartbeat(workerId);

  return {
    success: true,
    nextHeartbeatMs: workerRegistry.config.healthCheckIntervalMs,
  };
}

/**
 * Handle worker deregistration
 * Called when a worker is shutting down gracefully
 *
 * @param {string} workerId - Worker ID
 * @returns {object} - { success }
 */
function handleWorkerDeregistration(workerId) {
  const removed = workerRegistry.unregisterWorker(workerId);

  return {
    success: removed,
    message: removed ? "Worker unregistered" : "Worker not found",
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  workerRegistry,
  WORKER_TYPES,
  OPERATION_WORKER_MAP,
  handleWorkerRegistration,
  handleWorkerHeartbeat,
  handleWorkerDeregistration,
};
