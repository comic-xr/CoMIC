/**
 * @file useVRPreprocessing.js
 * @description Hook for VR preprocessing state management.
 *
 * Provides:
 * - Preprocessing status checking
 * - Preprocessing job submission
 * - Real-time progress updates via WebSocket
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "@UI/react/store/toastStore.js";

// Preprocessing status constants (match server)
export const PreprocessingStatus = {
  NOT_NEEDED: "not_needed",
  PENDING: "pending",
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETE: "complete",
  FAILED: "failed",
};

/**
 * Hook for managing VR preprocessing for a dataset
 *
 * @param {string} datasetId - Dataset UUID
 * @param {string} projectId - Project UUID (for WebSocket events)
 * @returns {Object} Preprocessing state and actions
 */
export function useVRPreprocessing(datasetId, projectId) {
  // Status state
  const [status, setStatus] = useState(PreprocessingStatus.PENDING);
  const [progress, setProgress] = useState(0);
  const [operations, setOperations] = useState([]);
  const [error, setError] = useState(null);
  const [resultMetadata, setResultMetadata] = useState(null);

  // Loading states
  const [checking, setChecking] = useState(false);
  const [starting, setStarting] = useState(false);

  // Track if we're actively monitoring this dataset
  const isMonitoringRef = useRef(false);

  /**
   * Check if dataset is ready for VR
   */
  const checkReadiness = useCallback(async () => {
    if (!datasetId) return null;

    setChecking(true);
    try {
      const response = await fetch(`/api/vr/preprocessing/${datasetId}/ready`, {
        headers: {
          "x-user-id": localStorage.getItem("userId") || "anonymous",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to check VR readiness");
      }

      const readiness = await response.json();

      setStatus(readiness.status);
      setProgress(readiness.progress || 0);
      setResultMetadata(readiness.resultMetadata);

      return readiness;
    } catch (err) {
      console.error("Failed to check VR readiness:", err);
      setError(err.message);
      return null;
    } finally {
      setChecking(false);
    }
  }, [datasetId]);

  /**
   * Get detailed preprocessing status
   */
  const getStatus = useCallback(async () => {
    if (!datasetId) return null;

    try {
      const response = await fetch(`/api/vr/preprocessing/${datasetId}/status`, {
        headers: {
          "x-user-id": localStorage.getItem("userId") || "anonymous",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to get preprocessing status");
      }

      const statusData = await response.json();

      setStatus(statusData.status);
      setProgress(statusData.progress || 0);
      setOperations(statusData.operations || []);
      setError(statusData.error);
      setResultMetadata(statusData.resultMetadata);

      return statusData;
    } catch (err) {
      console.error("Failed to get preprocessing status:", err);
      return null;
    }
  }, [datasetId]);

  /**
   * Start preprocessing for the dataset
   */
  const startPreprocessing = useCallback(
    async (options = {}) => {
      if (!datasetId) return null;

      setStarting(true);
      setError(null);

      try {
        const response = await fetch(`/api/vr/preprocessing/${datasetId}/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": localStorage.getItem("userId") || "anonymous",
          },
          body: JSON.stringify({
            projectId,
            force: options.force || false,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to start preprocessing");
        }

        const result = await response.json();

        // Handle different response scenarios
        if (result.alreadyComplete) {
          setStatus(PreprocessingStatus.COMPLETE);
          setProgress(100);
          toast.success("Dataset already optimized for VR");
          return result;
        }

        if (result.inProgress) {
          setStatus(result.status);
          setProgress(result.progress || 0);
          toast.info("Preprocessing already in progress");
          return result;
        }

        if (result.status === PreprocessingStatus.NOT_NEEDED) {
          setStatus(PreprocessingStatus.NOT_NEEDED);
          setProgress(100);
          toast.success("Dataset ready for VR - no preprocessing needed");
          return result;
        }

        // Preprocessing queued
        setStatus(PreprocessingStatus.QUEUED);
        setProgress(0);
        setOperations(result.operations || []);
        isMonitoringRef.current = true;

        toast.info(
          `VR preprocessing started (${result.operations?.length || 0} operations)`
        );

        return result;
      } catch (err) {
        setError(err.message);
        toast.error(`Preprocessing failed: ${err.message}`);
        return null;
      } finally {
        setStarting(false);
      }
    },
    [datasetId, projectId]
  );

  // Listen for WebSocket preprocessing events
  useEffect(() => {
    if (!datasetId) return;

    const handleStarted = (event) => {
      const detail = event.detail || {};
      if (detail.datasetId === datasetId) {
        setStatus(PreprocessingStatus.QUEUED);
        setOperations(detail.operations || []);
        setProgress(0);
        isMonitoringRef.current = true;
      }
    };

    const handleProgress = (event) => {
      const detail = event.detail || {};
      if (detail.datasetId === datasetId) {
        setProgress(detail.progress || 0);
        if (detail.status) {
          setStatus(detail.status);
        }
      }
    };

    const handleComplete = (event) => {
      const detail = event.detail || {};
      if (detail.datasetId === datasetId) {
        setStatus(PreprocessingStatus.COMPLETE);
        setProgress(100);
        setResultMetadata(detail.results);
        isMonitoringRef.current = false;
        toast.success("VR preprocessing complete - dataset ready!");
      }
    };

    const handleFailed = (event) => {
      const detail = event.detail || {};
      if (detail.datasetId === datasetId) {
        setStatus(PreprocessingStatus.FAILED);
        setError(detail.error);
        isMonitoringRef.current = false;
        toast.error(`VR preprocessing failed: ${detail.error}`);
      }
    };

    window.addEventListener("cia:vr-preprocessing-started", handleStarted);
    window.addEventListener("cia:vr-preprocessing-progress", handleProgress);
    window.addEventListener("cia:vr-preprocessing-complete", handleComplete);
    window.addEventListener("cia:vr-preprocessing-failed", handleFailed);

    return () => {
      window.removeEventListener("cia:vr-preprocessing-started", handleStarted);
      window.removeEventListener("cia:vr-preprocessing-progress", handleProgress);
      window.removeEventListener("cia:vr-preprocessing-complete", handleComplete);
      window.removeEventListener("cia:vr-preprocessing-failed", handleFailed);
    };
  }, [datasetId]);

  // Check status on mount
  useEffect(() => {
    if (datasetId) {
      checkReadiness();
    }
  }, [datasetId, checkReadiness]);

  // Computed states
  const isReady =
    status === PreprocessingStatus.COMPLETE ||
    status === PreprocessingStatus.NOT_NEEDED;

  const isProcessing =
    status === PreprocessingStatus.QUEUED ||
    status === PreprocessingStatus.PROCESSING;

  const needsPreprocessing = status === PreprocessingStatus.PENDING;

  return {
    // Status
    status,
    progress,
    operations,
    error,
    resultMetadata,

    // Computed states
    isReady,
    isProcessing,
    needsPreprocessing,

    // Loading states
    checking,
    starting,

    // Actions
    checkReadiness,
    getStatus,
    startPreprocessing,
  };
}

export default useVRPreprocessing;
