// src/ui/react/hooks/useAnnotations.js
// Hook for accessing and managing annotations
//
// REFACTORED: Uses useAsyncData and useWebSocketEvents
// Before: ~250 lines | After: ~180 lines

import { useState, useCallback, useMemo } from "react";
import { annotationManager } from "@Core/data/managers/AnnotationManager.js";
import { getDatasetManager } from "@Init/appInitializer.js";
import { apiClient } from "@Services/apiClient.js";
import { getUserId } from "@Collaboration/presence/userManagement.js";
import { annotation as log } from "@Utils/logger.js";

import { useAsyncData, useAsyncMutation } from "./useAsyncData";
import { useServerSyncEvents } from "./useWebSocketEvents";

/**
 * useAnnotations - Hook for annotation management
 *
 * @param {Object} options - Configuration options
 * @param {string} options.datasetId - Filter by specific dataset (optional)
 * @param {string} options.projectId - Project context (required for server calls)
 * @param {string} options.workspaceId - Filter by workspace (optional)
 * @returns {Object} Annotation state and actions
 */
export function useAnnotations(options = {}) {
  const { datasetId, projectId, workspaceId } = options;

  // Local state for scope filtering
  const [activeScope, setActiveScope] = useState("all"); // 'all' | 'mine' | 'shared'

  // Get current user for filtering
  const currentUserId = getUserId();

  // ---------------------------------------------------------------------------
  // FETCH ANNOTATIONS
  // ---------------------------------------------------------------------------

  const fetchAnnotations = useCallback(
    async (signal) => {
      if (!getDatasetManager()) {
        log.warn("DatasetManager not initialized");
        return [];
      }

      let allAnnotations = [];

      if (datasetId) {
        // Fetch for specific dataset from server
        try {
          const result = await apiClient.get(
            `/annotations?fileId=${datasetId}`
          );
          allAnnotations = result.annotations || [];
        } catch (err) {
          // Fall back to local cache if server fails
          log.warn("Server fetch failed, using local cache:", err.message);
          const dataset = getDatasetManager()?.getDataset(datasetId);
          if (dataset) {
            allAnnotations = dataset.annotations || [];
          }
        }
      } else {
        // Get all annotations from all loaded datasets
        const datasets = getDatasetManager()?.getAllDatasets();
        for (const dataset of datasets) {
          if (dataset.annotations) {
            allAnnotations.push(
              ...dataset.annotations.map((a) => ({
                ...a,
                datasetId: dataset.id,
                datasetName: dataset.filename,
              }))
            );
          }
        }
      }

      return allAnnotations;
    },
    [datasetId]
  );

  const {
    data: annotations,
    isLoading,
    error,
    refetch,
  } = useAsyncData(fetchAnnotations, [datasetId], {
    initialData: [],
  });

  // ---------------------------------------------------------------------------
  // WEBSOCKET EVENTS
  // ---------------------------------------------------------------------------

  useServerSyncEvents("annotation", {
    onCreate: (detail) => {
      log.debug("Annotation created event received", detail);
      refetch();
    },
    onUpdate: (detail) => {
      log.debug("Annotation updated event received", detail);
      refetch();
    },
    onDelete: (detail) => {
      log.debug("Annotation deleted event received", detail);
      refetch();
    },
  });

  // ---------------------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------------------

  const { mutate: createAnnotation, isLoading: isCreating } = useAsyncMutation(
    async (annotationData) => {
      const { targetDatasetId, ...data } = annotationData;
      const dsId = targetDatasetId || datasetId;

      if (!dsId) {
        throw new Error("No dataset specified for annotation");
      }

      // Use AnnotationManager if available, otherwise direct API
      if (annotationManager) {
        return annotationManager.createAnnotation(dsId, data);
      }

      const result = await apiClient.post("/annotations", {
        ...data,
        fileId: dsId,
        createdBy: currentUserId,
      });

      log.info(`Annotation created: ${result.annotation?.id}`);
      return result.annotation;
    },
    { onSuccess: refetch }
  );

  const { mutate: updateAnnotation, isLoading: isUpdating } = useAsyncMutation(
    async ({ id, targetDatasetId, updates }) => {
      const dsId = targetDatasetId || datasetId;

      if (annotationManager && dsId) {
        return annotationManager.updateAnnotation(dsId, id, updates);
      }

      const result = await apiClient.put(`/annotations/${id}`, updates);
      log.info(`Annotation updated: ${id}`);
      return result.annotation;
    },
    { onSuccess: refetch }
  );

  const { mutate: deleteAnnotation, isLoading: isDeleting } = useAsyncMutation(
    async ({ id, targetDatasetId }) => {
      const dsId = targetDatasetId || datasetId;

      if (annotationManager && dsId) {
        return annotationManager.deleteAnnotation(dsId, id);
      }

      await apiClient.delete(`/annotations/${id}`);
      log.info(`Annotation deleted: ${id}`);
      return { id };
    },
    { onSuccess: refetch }
  );

  // ---------------------------------------------------------------------------
  // FILTERING
  // ---------------------------------------------------------------------------

  const filteredAnnotations = useMemo(() => {
    if (activeScope === "all") {
      return annotations;
    }

    if (activeScope === "mine") {
      return annotations.filter((a) => a.createdBy === currentUserId);
    }

    if (activeScope === "shared") {
      return annotations.filter((a) => a.createdBy !== currentUserId);
    }

    return annotations;
  }, [annotations, activeScope, currentUserId]);

  // Group by dataset for multi-dataset views
  const annotationsByDataset = useMemo(() => {
    const grouped = {};
    for (const annotation of filteredAnnotations) {
      const dsId = annotation.datasetId || "unknown";
      if (!grouped[dsId]) {
        grouped[dsId] = [];
      }
      grouped[dsId].push(annotation);
    }
    return grouped;
  }, [filteredAnnotations]);

  // Group by type
  const annotationsByType = useMemo(
    () => ({
      point: filteredAnnotations.filter((a) => a.type === "point"),
      region: filteredAnnotations.filter((a) => a.type === "region"),
      measurement: filteredAnnotations.filter((a) => a.type === "measurement"),
      text: filteredAnnotations.filter((a) => a.type === "text"),
      other: filteredAnnotations.filter(
        (a) => !["point", "region", "measurement", "text"].includes(a.type)
      ),
    }),
    [filteredAnnotations]
  );

  // Stats
  const stats = useMemo(
    () => ({
      total: annotations.length,
      mine: annotations.filter((a) => a.createdBy === currentUserId).length,
      shared: annotations.filter((a) => a.createdBy !== currentUserId).length,
    }),
    [annotations, currentUserId]
  );

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Data
    annotations: filteredAnnotations,
    allAnnotations: annotations,
    annotationsByDataset,
    annotationsByType,
    stats,
    isLoading,
    error,

    // Scope filtering
    activeScope,
    setActiveScope,

    // Mutation states
    isCreating,
    isUpdating,
    isDeleting,

    // Actions
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    refetch,
  };
}

export default useAnnotations;
