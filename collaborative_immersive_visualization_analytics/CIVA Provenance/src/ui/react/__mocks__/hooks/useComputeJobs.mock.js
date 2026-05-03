// src/ui/react/__mocks__/hooks/useComputeJobs.mock.js
// Mock implementation of useComputeJobs for Storybook

import { useState, useCallback } from "react";

// Sample job data
const MOCK_JOBS = [
  {
    id: "job-001",
    type: "tsne",
    name: "t-SNE Reduction",
    datasetName: "brain_scan.vtp",
    status: "running",
    progress: 67,
    createdAt: Date.now() - 45000,
    startedAt: Date.now() - 40000,
  },
  {
    id: "job-002",
    type: "pca",
    name: "PCA Analysis",
    datasetName: "cell_data.vtp",
    status: "pending",
    progress: 0,
    createdAt: Date.now() - 30000,
  },
  {
    id: "job-003",
    type: "umap",
    name: "UMAP Embedding",
    datasetName: "protein_structure.vtp",
    status: "completed",
    progress: 100,
    createdAt: Date.now() - 120000,
    startedAt: Date.now() - 115000,
    completedAt: Date.now() - 60000,
    duration: 55000,
  },
  {
    id: "job-004",
    type: "vtk_process",
    name: "Mesh Decimation",
    datasetName: "terrain.vtp",
    status: "failed",
    progress: 23,
    createdAt: Date.now() - 180000,
    startedAt: Date.now() - 175000,
    error: "Out of memory",
  },
  {
    id: "job-005",
    type: "data_transform",
    name: "Normalize Coordinates",
    datasetName: "point_cloud.vtp",
    status: "completed",
    progress: 100,
    createdAt: Date.now() - 300000,
    startedAt: Date.now() - 295000,
    completedAt: Date.now() - 290000,
    duration: 5000,
  },
];

/**
 * Mock implementation of useComputeJobs
 * Returns sample data for Storybook
 */
export function useMockComputeJobs() {
  const [jobs, setJobs] = useState(MOCK_JOBS);
  const [isLoading, setIsLoading] = useState(false);

  const cancelJob = useCallback((jobId) => {
    console.log("[Mock useComputeJobs] Cancel job:", jobId);
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, status: "failed", error: "Cancelled by user" }
          : job
      )
    );
  }, []);

  const retryJob = useCallback((jobId) => {
    console.log("[Mock useComputeJobs] Retry job:", jobId);
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, status: "pending", progress: 0, error: null }
          : job
      )
    );
  }, []);

  const clearCompleted = useCallback(() => {
    console.log("[Mock useComputeJobs] Clear completed jobs");
    setJobs((prev) => prev.filter((job) => job.status !== "completed"));
  }, []);

  const refresh = useCallback(() => {
    console.log("[Mock useComputeJobs] Refresh");
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  return {
    jobs,
    isLoading,
    cancelJob,
    retryJob,
    clearCompleted,
    refresh,
  };
}

// =============================================================================
// REAL HOOK PLACEHOLDER
// =============================================================================
// If you don't have useComputeJobs.js yet, create this file:
// src/ui/react/hooks/useComputeJobs.js

/*
import { useState, useEffect, useCallback } from "react";
import { compute as log } from "@Utils/logger.js";

// Connect to your BullMQ backend here
export function useComputeJobs() {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch jobs on mount
  useEffect(() => {
    fetchJobs();
    
    // Set up WebSocket listener for real-time updates
    // const ws = new WebSocket(...);
    // ws.onmessage = handleJobUpdate;
    // return () => ws.close();
  }, []);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/compute/jobs');
      const data = await response.json();
      setJobs(data.jobs);
    } catch (error) {
      log.error('Failed to fetch jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelJob = useCallback(async (jobId) => {
    try {
      await fetch(`/api/compute/jobs/${jobId}/cancel`, { method: 'POST' });
      fetchJobs();
    } catch (error) {
      log.error('Failed to cancel job:', error);
    }
  }, []);

  const retryJob = useCallback(async (jobId) => {
    try {
      await fetch(`/api/compute/jobs/${jobId}/retry`, { method: 'POST' });
      fetchJobs();
    } catch (error) {
      log.error('Failed to retry job:', error);
    }
  }, []);

  const clearCompleted = useCallback(async () => {
    try {
      await fetch('/api/compute/jobs/clear-completed', { method: 'POST' });
      fetchJobs();
    } catch (error) {
      log.error('Failed to clear jobs:', error);
    }
  }, []);

  return {
    jobs,
    isLoading,
    cancelJob,
    retryJob,
    clearCompleted,
    refresh: fetchJobs,
  };
}

export function useComputeOperations() {
  // Hook for submitting new compute jobs
  const submitJob = useCallback(async (type, options) => {
    const response = await fetch('/api/compute/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...options }),
    });
    return response.json();
  }, []);

  return { submitJob };
}
*/
