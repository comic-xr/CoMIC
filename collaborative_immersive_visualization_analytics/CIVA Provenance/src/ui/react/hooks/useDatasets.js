// src/ui/react/hooks/useDatasets.js
import { useState, useCallback } from "react";
import { ui as log } from "@Utils/logger.js";
import { getDatasetManager } from "./useDatasetManager.js";
import { useManagerSubscriptionWithInit } from "./useManagerSubscription";

/**
 * Hook to subscribe to dataset changes and get transformed dataset list
 * Uses centralized useManagerSubscription for consistent subscription handling
 *
 * @returns {Array} Array of transformed dataset objects
 */
export function useDatasets() {
  const [datasets, setDatasets] = useState([]);

  // Get the manager (this will throw a clear error if not ready)
  const datasetManager = getDatasetManager();

  const updateDatasets = useCallback(() => {
    log.debug("useDatasets: Updating datasets");

    // Get all datasets from the datasetManager
    const allDatasets = datasetManager.getAllDatasets();

    // Transform them for React consumption
    const transformed = allDatasets.map((dataset) => ({
      id: dataset.id,
      name: dataset.filename,
      fileType: dataset.fileType,
      fileId: dataset.id, // For cross-referencing with server files
      sourceFileId: dataset.serverId,
      hash: dataset.metadata?.hash,
      pointCount: dataset.metadata?.pointCount || 0,
      cellCount: dataset.metadata?.cellCount || 0,
      uploadedBy: dataset.metadata?.uploadedBy,
      uploadedByName: dataset.metadata?.uploadedByName || "Unknown",
      uploadedAt: dataset.metadata?.uploadedAt,
      publicPath: dataset.metadata?.publicPath,
      bounds: dataset.metadata?.bounds,
      annotations: dataset.annotations || [],
      hasPolydata: !!dataset.polydata,
      isAnalyzed: dataset.isAnalyzed(),
      // Data state properties
      dataState: dataset.getDataState(),
      isDataLoaded: dataset.isDataLoaded(),
      isDataLoading: dataset.isDataLoading(),
    }));

    setDatasets(transformed);
  }, [datasetManager]);

  // Subscribe to all dataset events with automatic initial call
  // This replaces 4 separate .on() calls and manual cleanup
  useManagerSubscriptionWithInit(
    datasetManager,
    ["datasetAdded", "datasetUpdated", "datasetRemoved", "datasetLoaded"],
    updateDatasets
  );

  return datasets;
}
