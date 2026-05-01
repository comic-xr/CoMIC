// src/ui/react/hooks/useComputeJobs.js
// Hook to track and manage compute jobs from BullMQ
//
// Features:
// - Fetches jobs from the server API
// - Real-time updates via WebSocket
// - Actions: cancel, retry, clear completed
//
// Usage:
//   const { jobs, isLoading, cancelJob, retryJob } = useComputeJobs();

import { useState, useEffect, useCallback, useRef } from "react";
import { config } from "@Core/config/clientConfig.js";
import { compute as log } from "@Utils/logger.js";

// Job status constants (match server-side)
export const JobStatus = Object.freeze({
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETE: "complete",
  FAILED: "failed",
  CANCELLED: "cancelled",
});

/**
 * useComputeJobs - Track and manage compute jobs
 *
 * @param {Object} options
 * @param {string} options.projectId - Filter jobs by project (optional)
 * @param {boolean} options.includeCompleted - Include completed jobs (default: true)
 * @param {number} options.maxJobs - Max jobs to fetch (default: 50)
 * @returns {Object} Jobs data and actions
 */
export function useComputeJobs(options = {}) {
  const { projectId = null, includeCompleted = true, maxJobs = 50 } = options;

  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // =========================================================================
  // FETCH JOBS FROM API
  // =========================================================================

  const fetchJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      if (includeCompleted) params.set("includeCompleted", "true");
      params.set("limit", maxJobs.toString());

      const response = await fetch(
        `${config.apiBaseUrl}/compute/jobs?${params}`,
        {
          headers: {
            Accept: "application/json",
            // Add auth header if needed
            // "Authorization": `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.status}`);
      }

      const data = await response.json();

      // Transform server jobs to UI format
      const transformedJobs = (data.jobs || []).map(transformJob);
      setJobs(transformedJobs);
      setError(null);

      log.debug(`Fetched ${transformedJobs.length} compute jobs`);
    } catch (err) {
      log.error("Failed to fetch compute jobs:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, includeCompleted, maxJobs]);

  // =========================================================================
  // WEBSOCKET FOR REAL-TIME UPDATES
  // =========================================================================

  const handleWebSocketMessage = useCallback((message) => {
    switch (message.type) {
      case "job:created":
        setJobs((prev) => [transformJob(message.job), ...prev]);
        break;

      case "job:progress":
        setJobs((prev) =>
          prev.map((job) =>
            job.id === message.jobId
              ? { ...job, progress: message.progress, status: "running" }
              : job
          )
        );
        break;

      case "job:complete":
        setJobs((prev) =>
          prev.map((job) =>
            job.id === message.jobId
              ? {
                  ...job,
                  status: "completed",
                  progress: 100,
                  completedAt: Date.now(),
                  duration: message.duration,
                  result: message.result,
                }
              : job
          )
        );
        break;

      case "job:failed":
        setJobs((prev) =>
          prev.map((job) =>
            job.id === message.jobId
              ? { ...job, status: "failed", error: message.error }
              : job
          )
        );
        break;

      case "job:cancelled":
        setJobs((prev) =>
          prev.map((job) =>
            job.id === message.jobId
              ? { ...job, status: "failed", error: "Cancelled" }
              : job
          )
        );
        break;

      default:
        log.debug("Unknown compute message type:", message.type);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    // Use the Y.js WebSocket URL base, or construct from API URL
    const wsUrl = config.yjsWebSocketUrl.replace("/yjs", "") + "/compute";

    try {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Capture 'ws' in closure to avoid race conditions with wsRef.current
      ws.onopen = () => {
        log.debug("Compute WebSocket connected");
        // Ensure this is still the current WebSocket and it's actually open
        if (ws === wsRef.current && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "subscribe",
              channel: "compute-jobs",
              projectId,
            })
          );
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (err) {
          log.warn("Invalid WebSocket message:", event.data);
        }
      };

      ws.onclose = () => {
        log.debug("Compute WebSocket disconnected");
        // Only reconnect if this is still the current WebSocket
        if (ws === wsRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 5000);
        }
      };

      ws.onerror = (err) => {
        log.warn("Compute WebSocket error:", err);
      };
    } catch (err) {
      log.warn("Failed to connect compute WebSocket:", err);
    }
  }, [projectId, handleWebSocketMessage]);

  // =========================================================================
  // JOB ACTIONS
  // =========================================================================

  /**
   * Cancel a running or queued job
   */
  const cancelJob = useCallback(async (jobId) => {
    try {
      log.info(`Cancelling job: ${jobId}`);

      const response = await fetch(
        `${config.apiBaseUrl}/compute/jobs/${jobId}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to cancel job: ${response.status}`);
      }

      // Optimistically update UI
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId
            ? { ...job, status: "failed", error: "Cancelled by user" }
            : job
        )
      );

      return { success: true };
    } catch (err) {
      log.error("Failed to cancel job:", err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Retry a failed job
   */
  const retryJob = useCallback(async (jobId) => {
    try {
      log.info(`Retrying job: ${jobId}`);

      const response = await fetch(
        `${config.apiBaseUrl}/compute/jobs/${jobId}/retry`,
        {
          method: "POST",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to retry job: ${response.status}`);
      }

      const data = await response.json();

      // Update with new job (retry creates a new job)
      if (data.job) {
        setJobs((prev) => [
          transformJob(data.job),
          ...prev.filter((j) => j.id !== jobId),
        ]);
      }

      return { success: true, newJobId: data.job?.id };
    } catch (err) {
      log.error("Failed to retry job:", err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Clear completed jobs from the list
   */
  const clearCompleted = useCallback(() => {
    setJobs((prev) => prev.filter((job) => job.status !== "completed"));
    log.debug("Cleared completed jobs from UI");
  }, []);

  /**
   * Refresh jobs list
   */
  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchJobs();
  }, [fetchJobs]);

  // =========================================================================
  // LIFECYCLE
  // =========================================================================

  // Initial fetch
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // WebSocket connection
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

  // Periodic refresh as fallback (every 30s)
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if WebSocket is not connected
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        fetchJobs();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchJobs]);

  return {
    jobs,
    isLoading,
    error,
    cancelJob,
    retryJob,
    clearCompleted,
    refresh,
  };
}

// =============================================================================
// HELPER: Transform server job to UI format
// =============================================================================

function transformJob(serverJob) {
  // Map server status to UI status
  const statusMap = {
    queued: "pending",
    processing: "running",
    complete: "completed",
    failed: "failed",
    cancelled: "failed",
  };

  // Map operation to type for display
  const typeMap = {
    "pca-reduction": "pca",
    "tsne-reduction": "tsne",
    "umap-reduction": "umap",
    "mesh-decimation": "vtk_process",
    "mesh-smoothing": "vtk_process",
    "point-subsampling": "vtk_process",
    "compute-statistics": "data_transform",
    "lod-generation": "vtk_process",
  };

  return {
    id: serverJob.id,
    type: typeMap[serverJob.operation] || "default",
    name: formatOperationName(serverJob.operation),
    datasetName: serverJob.filename || serverJob.file_name || null,
    status: statusMap[serverJob.status] || "pending",
    progress: serverJob.progress || 0,
    createdAt: serverJob.queued_at
      ? new Date(serverJob.queued_at).getTime()
      : Date.now(),
    startedAt: serverJob.started_at
      ? new Date(serverJob.started_at).getTime()
      : null,
    completedAt: serverJob.completed_at
      ? new Date(serverJob.completed_at).getTime()
      : null,
    duration: serverJob.compute_time_ms || null,
    error: serverJob.error_message || null,
    result: serverJob.result_metadata || null,
  };
}

function formatOperationName(operation) {
  if (!operation) return "Unknown Operation";

  return operation
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// =============================================================================
// COMPUTE OPERATIONS HOOK
// =============================================================================

/**
 * useComputeOperations - Submit new compute jobs
 *
 * Usage:
 *   const { submitJob, availableOperations } = useComputeOperations();
 *   await submitJob('mesh-decimation', fileId, { ratio: 0.5 });
 */
export function useComputeOperations() {
  const [availableOperations, setAvailableOperations] = useState([]);

  // Fetch available operations on mount
  useEffect(() => {
    async function fetchOperations() {
      try {
        const response = await fetch(`${config.apiBaseUrl}/compute/operations`);
        if (response.ok) {
          const data = await response.json();
          setAvailableOperations(data.operations || []);
        }
      } catch (err) {
        log.warn("Failed to fetch compute operations:", err);
      }
    }
    fetchOperations();
  }, []);

  /**
   * Submit a new compute job
   */
  const submitJob = useCallback(
    async (operation, fileId, params = {}, options = {}) => {
      try {
        log.info(`Submitting compute job: ${operation} for file ${fileId}`);

        const response = await fetch(`${config.apiBaseUrl}/compute/jobs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            fileId,
            operation,
            params,
            priority: options.priority || 5,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(
            error.error || `Failed to submit job: ${response.status}`
          );
        }

        const data = await response.json();
        log.info(`Job submitted: ${data.job?.id}`);

        return { success: true, job: data.job };
      } catch (err) {
        log.error("Failed to submit compute job:", err);
        return { success: false, error: err.message };
      }
    },
    []
  );

  /**
   * Get operations available for a specific file type
   */
  const getOperationsForFile = useCallback(
    (fileType) => {
      return availableOperations.filter((op) =>
        op.inputFormats?.includes(fileType.toLowerCase())
      );
    },
    [availableOperations]
  );

  return {
    submitJob,
    availableOperations,
    getOperationsForFile,
  };
}
