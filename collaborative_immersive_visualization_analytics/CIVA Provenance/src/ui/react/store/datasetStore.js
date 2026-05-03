// src/ui/react/store/datasetStore.js
// React state synchronization for DatasetManager
// This store is now a THIN WRAPPER around DatasetManager for React reactivity

import { create } from "zustand";
import { store as log } from "@Utils/logger.js";

/**
 * Dataset Store
 *
 * ARCHITECTURAL ROLE:
 * This store is now a React-specific synchronization layer that mirrors
 * DatasetManager state for React components. It does NOT own the data -
 * DatasetManager does. This store just triggers React re-renders.
 *
 * WHY THIS EXISTS:
 * DatasetManager is vanilla JS and doesn't trigger React re-renders.
 * This Zustand store subscribes to DatasetManager events and updates
 * React state when data changes.
 *
 * MIGRATION NOTE:
 * Eventually, this could be replaced with a custom hook that uses
 * DatasetManager directly. But for now, keeping Zustand makes the
 * migration easier for existing components.
 */
export const useDatasetStore = create((set, get) => ({
  // Dataset IDs for rendering lists
  // We store IDs instead of full datasets to avoid stale data
  datasetIds: [],

  // Currently selected dataset for UI
  selectedDatasetId: null,

  // Refresh counter to force re-renders when needed
  _refreshCounter: 0,

  /**
   * Initialize store by subscribing to DatasetManager
   * Call this after DatasetManager is ready (in Phase 1/2)
   *
   * @param {DatasetManager} datasetManager - The dataset manager instance
   */
  initialize: (datasetManager) => {
    log.debug("Initializing dataset store sync with DatasetManager");

    // Subscribe to dataset changes
    datasetManager.on("datasetAdded", (dataset) => {
      log.debug("React: Dataset added:", dataset.id);
      get().refresh();
    });

    datasetManager.on("datasetRemoved", (datasetId) => {
      log.debug("React: Dataset removed:", datasetId);
      get().refresh();
    });

    datasetManager.on("datasetUpdated", (dataset) => {
      log.debug("React: Dataset updated:", dataset.id);
      get().refresh();
    });

    datasetManager.on("datasetLoaded", ({ datasetId }) => {
      log.debug("React: Dataset loaded:", datasetId);
      get().refresh();
    });

    // Initial load
    get().refresh();

    log.info("Dataset store initialized and synced");
  },

  /**
   * Force refresh of dataset IDs from DatasetManager
   * Called automatically when manager emits events
   */
  refresh: () => {
    // Import dynamically to avoid circular dependency
    import("@Init/appInitializer.js")
      .then(({ getDatasetManager }) => {
        if (!getDatasetManager()) {
          log.warn("DatasetManager not available yet");
          return;
        }

        const datasets = getDatasetManager()?.getAllDatasets();
        const ids = datasets.map((ds) => ds.id);

        set({
          datasetIds: ids,
          _refreshCounter: get()._refreshCounter + 1,
        });
      })
      .catch((error) => {
        log.error("Failed to refresh dataset store:", error);
        // Don't throw - just log the error to prevent unhandled rejection
      });
  },

  /**
   * Select a dataset for UI purposes
   * This is UI state only - doesn't affect the actual data
   *
   * @param {string} id - Dataset ID to select
   */
  setSelectedDataset: (id) => {
    set({ selectedDatasetId: id });
    log.debug(`UI: Selected dataset: ${id}`);
  },

  /**
   * Get selected dataset ID
   */
  getSelectedDataset: () => {
    return get().selectedDatasetId;
  },

  /**
   * Clear selection
   */
  clearSelection: () => {
    set({ selectedDatasetId: null });
  },

  /**
   * Add a dataset to the store
   * Called when a remote dataset is discovered
   */
  addDataset: (dataset) => {
    log.debug("React: Adding dataset to store:", dataset.id);

    // Import dynamically to avoid circular dependency
    import("@Init/appInitializer.js").then(({ getDatasetManager }) => {
      if (!getDatasetManager()) {
        log.warn("DatasetManager not available yet");
        return;
      }

      // Add to dataset manager if it's a placeholder/remote dataset
      if (dataset.isRemote || dataset.unavailable) {
        // Store in a separate map for remote/unavailable datasets
        // This is just for UI - we don't actually have the data
        const currentIds = get().datasetIds;
        if (!currentIds.includes(dataset.id)) {
          set({
            datasetIds: [...currentIds, dataset.id],
            _refreshCounter: get()._refreshCounter + 1,
          });
        }
      } else {
        // Refresh from manager for local datasets
        get().refresh();
      }
    });
  },

  /**
   * Remove a dataset from the store
   */
  removeDataset: (datasetId) => {
    log.debug("React: Removing dataset from store:", datasetId);

    const currentIds = get().datasetIds;
    set({
      datasetIds: currentIds.filter((id) => id !== datasetId),
      _refreshCounter: get()._refreshCounter + 1,
    });

    // Clear selection if this was the selected dataset
    if (get().selectedDatasetId === datasetId) {
      set({ selectedDatasetId: null });
    }
  },

  /**
   * Update annotations for a dataset
   */
  updateAnnotations: (datasetId, annotations) => {
    log.debug("React: Updating annotations for dataset:", datasetId);

    // Import dynamically to avoid circular dependency
    import("@Init/appInitializer.js").then(({ getDatasetManager }) => {
      if (!getDatasetManager()) {
        log.warn("DatasetManager not available yet");
        return;
      }

      const dataset = getDatasetManager()?.getDataset(datasetId);
      if (dataset) {
        // Update annotations in the dataset
        dataset.annotations = annotations;

        // Trigger refresh to update UI
        set({
          _refreshCounter: get()._refreshCounter + 1,
        });
      }
    });
  },
}));

/**
 * USAGE EXAMPLE IN REACT COMPONENTS:
 *
 * import { useDatasetStore } from '@UI/react/store/datasetStore.js';
 * import { getDatasetManager } from '@Init/appInitializer.js';
 *
 * function DatasetList() {
 *   // Get dataset IDs from store (triggers re-render on change)
 *   const datasetIds = useDatasetStore((state) => state.datasetIds);
 *
 *   return (
 *     <div>
 *       {datasetIds.map(id => {
 *         // Get actual dataset data from manager
 *         const dataset = getDatasetManager()?.getDataset(id);
 *
 *         return (
 *           <div key={id}>
 *             {dataset.filename} - {dataset.metadata.pointCount} points
 *           </div>
 *         );
 *       })}
 *     </div>
 *   );
 * }
 */
