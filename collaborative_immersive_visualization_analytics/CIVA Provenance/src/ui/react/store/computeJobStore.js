// src/ui/react/store/computeJobStore.js
//
// Zustand store for compute job state management
// Tracks active jobs, completed results, and handles WebSocket updates

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Job status enum
 */
export const JobStatus = {
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETE: "complete",
  FAILED: "failed",
};

/**
 * Compute job store
 *
 * Persists to localStorage so jobs survive page refresh.
 * Completed jobs are kept for 24 hours then auto-cleaned.
 */
export const useComputeJobStore = create(
  persist(
    (set, get) => ({
      // Active and recent jobs: Map<jobId, JobState>
      jobs: {},

      // ============================================================
      // ACTIONS
      // ============================================================

      /**
       * Add a new job (called when submitting)
       */
      addJob: (job) => {
        set((state) => ({
          jobs: {
            ...state.jobs,
            [job.id]: {
              id: job.id,
              fileId: job.fileId,
              fileName: job.fileName,
              operation: job.operation,
              params: job.params,
              status: JobStatus.QUEUED,
              progress: 0,
              message: "Queued",
              submittedAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
        }));
      },

      /**
       * Update job progress (from WebSocket)
       */
      updateProgress: (jobId, progress, message) => {
        set((state) => {
          const job = state.jobs[jobId];
          if (!job) {
            return state;
          }
          return {
            jobs: {
              ...state.jobs,
              [jobId]: {
                ...job,
                status: JobStatus.PROCESSING,
                progress,
                message: message || `Processing (${progress}%)`,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      /**
       * Mark job complete (from WebSocket)
       */
      completeJob: (jobId, result) => {
        set((state) => {
          const job = state.jobs[jobId];
          if (!job) {
            return state;
          }
          return {
            jobs: {
              ...state.jobs,
              [jobId]: {
                ...job,
                status: JobStatus.COMPLETE,
                progress: 100,
                message: "Complete",
                result: {
                  cacheId: result.cacheId,
                  metadata: result.metadata,
                  derivedFileId: result.derivedFileId,
                },
                completedAt: Date.now(),
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      /**
       * Mark job failed (from WebSocket)
       */
      failJob: (jobId, error) => {
        set((state) => {
          const job = state.jobs[jobId];
          if (!job) {
            return state;
          }
          return {
            jobs: {
              ...state.jobs,
              [jobId]: {
                ...job,
                status: JobStatus.FAILED,
                progress: 0,
                message: error || "Job failed",
                error,
                completedAt: Date.now(),
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      /**
       * Remove a job from the store
       */
      removeJob: (jobId) => {
        set((state) => {
          const { [jobId]: removed, ...rest } = state.jobs;
          return { jobs: rest };
        });
      },

      /**
       * Clear completed/failed jobs older than maxAge (ms)
       */
      cleanupOldJobs: (maxAgeMs = 24 * 60 * 60 * 1000) => {
        const cutoff = Date.now() - maxAgeMs;
        set((state) => {
          const cleaned = {};
          Object.entries(state.jobs).forEach(([id, job]) => {
            const isActive =
              job.status === JobStatus.QUEUED ||
              job.status === JobStatus.PROCESSING;
            const isRecent = (job.completedAt || job.updatedAt) > cutoff;
            if (isActive || isRecent) {
              cleaned[id] = job;
            }
          });
          return { jobs: cleaned };
        });
      },

      // ============================================================
      // SELECTORS (as functions for convenience)
      // ============================================================

      /**
       * Get all active (queued or processing) jobs
       */
      getActiveJobs: () => {
        const { jobs } = get();
        return Object.values(jobs).filter(
          (j) =>
            j.status === JobStatus.QUEUED || j.status === JobStatus.PROCESSING
        );
      },

      /**
       * Get jobs for a specific file
       */
      getJobsForFile: (fileId) => {
        const { jobs } = get();
        return Object.values(jobs).filter((j) => j.fileId === fileId);
      },

      /**
       * Get a specific job
       */
      getJob: (jobId) => {
        return get().jobs[jobId] || null;
      },

      /**
       * Check if any jobs are active
       */
      hasActiveJobs: () => {
        return get().getActiveJobs().length > 0;
      },
    }),
    {
      name: "cia-compute-jobs",
      version: 1,
      // Only persist essential fields
      partialize: (state) => ({ jobs: state.jobs }),
    }
  )
);
