// src/ui/react/hooks/useDatasetManager.js
// Single source of truth for accessing the datasetManager in React

/**
 * Get the datasetManager instance
 *
 * This is a simple accessor that ensures we always get the manager
 * from the same place. If it's not available, this will throw a
 * clear error that helps with debugging.
 */
export function getDatasetManager() {
  if (!window.CIA || !window.CIA.datasetManager) {
    throw new Error(
      "DatasetManager not initialized. Make sure Phase 1 initialization completed before rendering React components."
    );
  }
  return window.CIA.datasetManager;
}

/**
 * Hook version for use in components
 * This doesn't create any state, it just provides clean access
 */
export function useDatasetManager() {
  return getDatasetManager();
}
