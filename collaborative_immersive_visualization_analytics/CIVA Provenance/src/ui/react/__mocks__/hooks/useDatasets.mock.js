// src/ui/react/__mocks__/hooks/useDatasets.mock.js
// Mock implementation of useDatasets for Storybook
//
// Returns static mock data instead of reading from DatasetManager.
// Actions log to console for visibility in Storybook.

import { useState, useCallback, useMemo } from "react";
import {
  MOCK_DATASETS,
  MOCK_VIEWS,
  getViewsForDataset,
  MOCK_DATASETS_WITH_VIEWS,
} from "../data/datasets.mock.js";

/**
 * Mock implementation of useDatasets hook
 *
 * Returns loaded datasets with their metadata.
 * In production, this reads from DatasetManager.
 *
 * @returns {Array} Array of dataset objects
 */
export function useMockDatasets() {
  return MOCK_DATASETS;
}

/**
 * Mock implementation of useDatasetActions hook
 *
 * @returns {Object} Dataset action functions
 */
export function useMockDatasetActions() {
  const loadDataset = useCallback(async (file, publicPath) => {
    console.log("[Mock useDatasetActions] loadDataset:", file.name, publicPath);

    // Simulate loading delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    return `ds-${Date.now()}`;
  }, []);

  const unloadDataset = useCallback(async (datasetId) => {
    console.log("[Mock useDatasetActions] unloadDataset:", datasetId);
    return { success: true };
  }, []);

  const deleteDataset = useCallback(async (datasetId) => {
    console.log("[Mock useDatasetActions] deleteDataset:", datasetId);
    return { success: true };
  }, []);

  return {
    loadDataset,
    unloadDataset,
    deleteDataset,
  };
}

/**
 * Mock implementation of useViewConfigurations hook
 *
 * @param {string} datasetId - Optional filter by dataset
 * @returns {Object} Views data and actions
 */
export function useMockViewConfigurations(datasetId = null) {
  const [views, setViews] = useState(MOCK_VIEWS);

  // Filter views if datasetId provided
  const filteredViews = useMemo(() => {
    if (!datasetId) return views;
    return views.filter((v) => v.datasetId === datasetId);
  }, [views, datasetId]);

  const createView = useCallback(async (datasetId, name, config = {}) => {
    console.log("[Mock useViewConfigurations] createView:", {
      datasetId,
      name,
      config,
    });

    const newView = {
      id: `view-${Date.now()}`,
      datasetId,
      name,
      workspaceId: config.workspaceId || "ws-personal",
      workspaceScope: "personal",
      status: "active",
      instanceColor: config.color || "#60a5fa",
      camera: config.camera || {
        position: [0, 0, 100],
        focalPoint: [0, 0, 0],
        viewUp: [0, 1, 0],
      },
      filters: [],
      widgetStates: {},
      isShared: false,
      sharedWith: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setViews((prev) => [...prev, newView]);
    return newView;
  }, []);

  const updateView = useCallback(async (viewId, updates) => {
    console.log("[Mock useViewConfigurations] updateView:", {
      viewId,
      updates,
    });

    setViews((prev) =>
      prev.map((v) =>
        v.id === viewId
          ? { ...v, ...updates, updatedAt: new Date().toISOString() }
          : v
      )
    );

    return { success: true };
  }, []);

  const deleteView = useCallback(async (viewId) => {
    console.log("[Mock useViewConfigurations] deleteView:", viewId);

    setViews((prev) => prev.filter((v) => v.id !== viewId));
    return { success: true };
  }, []);

  const duplicateView = useCallback(
    async (viewId, newName) => {
      console.log("[Mock useViewConfigurations] duplicateView:", {
        viewId,
        newName,
      });

      const original = views.find((v) => v.id === viewId);
      if (!original) return null;

      const duplicate = {
        ...original,
        id: `view-${Date.now()}`,
        name: newName || `${original.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setViews((prev) => [...prev, duplicate]);
      return duplicate;
    },
    [views]
  );

  const shareView = useCallback(async (viewId, userIds) => {
    console.log("[Mock useViewConfigurations] shareView:", { viewId, userIds });
    return { success: true };
  }, []);

  return {
    views: filteredViews,
    isLoading: false,
    error: null,
    createView,
    updateView,
    deleteView,
    duplicateView,
    shareView,
  };
}

/**
 * Combined mock for datasets with their views
 * Useful for DatasetsTab display
 */
export function useMockDatasetsWithViews() {
  const datasets = useMockDatasets();
  const { views } = useMockViewConfigurations();

  return useMemo(() => {
    return datasets.map((dataset) => ({
      ...dataset,
      views: views.filter((v) => v.datasetId === dataset.id),
    }));
  }, [datasets, views]);
}
