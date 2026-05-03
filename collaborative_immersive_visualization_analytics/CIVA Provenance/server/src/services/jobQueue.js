/**
 * Job Queue Service
 *
 * BullMQ-based job queue for compute operations.
 * Jobs are queued here and consumed by Python workers.
 */

const { Queue, QueueEvents } = require("bullmq");
const { createLogger } = require("../utils/logger");

const log = createLogger("queue");

// Redis connection config
const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};

// Queue instances by worker type
const queues = new Map();
const queueEvents = new Map();

/**
 * Get or create a queue for a worker type
 */
function getQueue(workerType) {
  if (!queues.has(workerType)) {
    const queue = new Queue(workerType, { connection });
    queues.set(workerType, queue);

    // Set up queue events for logging
    const events = new QueueEvents(workerType, { connection });
    events.on("completed", ({ jobId }) => {
      log.debug(`Job ${jobId} completed on queue ${workerType}`);
    });
    events.on("failed", ({ jobId, failedReason }) => {
      log.error(`Job ${jobId} failed on queue ${workerType}:`, failedReason);
    });
    queueEvents.set(workerType, events);

    log.info(`Created queue for worker type: ${workerType}`);
  }
  return queues.get(workerType);
}

/**
 * Add a compute job to the appropriate queue
 *
 * @param {Object} job - Job details
 * @param {string} job.id - Database job ID
 * @param {string} job.operation - Operation ID (e.g., 'mesh-decimation')
 * @param {string} job.workerType - Worker type to handle this job
 * @param {string} job.fileId - File to process
 * @param {string} job.fileStorageKey - MinIO storage key
 * @param {Object} job.params - Operation parameters
 * @param {number} job.priority - Job priority (higher = more urgent)
 * @param {string} job.cacheKey - Cache key for storing results
 * @returns {Promise<Object>} BullMQ job
 */
async function addJob(job) {
  const queue = getQueue(job.workerType);

  const bullJob = await queue.add(
    job.operation,
    {
      jobId: job.id,
      operation: job.operation,
      fileId: job.fileId,
      fileStorageKey: job.fileStorageKey,
      params: job.params,
      cacheKey: job.cacheKey,
      callbackUrl: `${
        process.env.API_URL || "http://localhost:3001"
      }/api/compute/internal`,
    },
    {
      priority: job.priority || 5,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 500, // Keep last 500 failed jobs
    }
  );

  log.info(`Queued job ${job.id} (${job.operation}) on ${job.workerType}`);
  return bullJob;
}

/**
 * Get queue statistics
 */
async function getQueueStats(workerType) {
  const queue = getQueue(workerType);

  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}

/**
 * Get all queue stats
 */
async function getAllQueueStats() {
  const stats = {};
  for (const [workerType] of queues) {
    stats[workerType] = await getQueueStats(workerType);
  }
  return stats;
}

/**
 * Cancel a job
 */
async function cancelJob(workerType, jobId) {
  const queue = getQueue(workerType);
  const job = await queue.getJob(jobId);

  if (job) {
    await job.remove();
    return true;
  }
  return false;
}

/**
 * Get job by ID
 */
async function getJob(workerType, jobId) {
  const queue = getQueue(workerType);
  return await queue.getJob(jobId);
}

/**
 * Close all queues (for graceful shutdown)
 */
async function closeAll() {
  for (const [name, queue] of queues) {
    await queue.close();
    log.info(`Closed queue: ${name}`);
  }
  for (const [, events] of queueEvents) {
    await events.close();
  }
  queues.clear();
  queueEvents.clear();
}

module.exports = {
  getQueue,
  addJob,
  getQueueStats,
  getAllQueueStats,
  cancelJob,
  getJob,
  closeAll,
};
