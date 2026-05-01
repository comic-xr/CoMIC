/**
 * @file useFilesTab.js
 * @description Hook for FilesTab state management.
 * Provides file loading, filtering, and actions.
 *
 * @example
 * const { files, starredFiles, handleStar, handleUpload } = useFilesTab({ workspaceId });
 */

import { useState, useMemo, useCallback } from "react";
import { ui as log } from "@Utils/logger.js";
import { useProjectFiles } from "@UI/react/hooks/useProjectFiles.js";
import { useComputeJobs } from "@UI/react/hooks/useComputeJobs.js";
import { useDatasets } from "@UI/react/hooks/useDatasets.js";
import { useDatasetManager } from "@UI/react/hooks/useDatasetManager.js";
import { useSectionStates } from "@UI/react/components/organisms/ResizableSections";
import { useListFilter, FILES_FILTER_CONFIG } from "@UI/react/hooks";
import { formatFileSize } from "@Utils/formatters.js";
import { getHandlerForFileType } from "@Core/instances/types/instanceTypesInit.js";
import { instanceTypeRegistry } from "@Core/instances/types/instanceTypeRegistry.js";
import { getViewConfigurationManager } from "@Init/appInitializer.js";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { useWorkspaceFiles } from "./useWorkspaceFiles.js";

/**
 * Check if a file type can be visualized
 * @param {string} fileType - File type extension
 * @returns {boolean}
 */
export const canVisualize = (fileType) => {
  if (!fileType) return false;
  return getHandlerForFileType(fileType) !== null;
};

/**
 * @typedef {Object} UseFilesTabOptions
 * @property {string} workspaceId - Current workspace ID
 * @property {Array} [mockFiles] - Mock files for testing
 * @property {Set} [mockStarredIds] - Mock starred IDs for testing
 * @property {boolean} [mockIsLoading] - Mock loading state
 * @property {string} [mockError] - Mock error state
 */

/**
 * Hook for FilesTab state management.
 *
 * @param {UseFilesTabOptions} options - Hook options
 * @returns {Object} Hook return value
 */
export function useFilesTab({
  workspaceId,
  mockFiles = null,
  mockStarredIds = null,
  mockIsLoading = null,
  mockError = null,
}) {
  // View state
  const [viewMode, setViewMode] = useState("list");

  // Unified filter system
  const filter = useListFilter({
    ...FILES_FILTER_CONFIG,
    searchFields: (file) => [file.name],
  });

  // Selection and expansion state
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set([1]));

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);

  // Upload drag state
  const [isDragOver, setIsDragOver] = useState(false);

  // Optimistic star updates (for immediate UI feedback)
  const [optimisticStars, setOptimisticStars] = useState({});

  // Section states (VS Code-style) - persisted to localStorage
  const {
    states: sectionStates,
    toggleSection,
    resizeSection,
  } = useSectionStates(
    {
      starred: { expanded: true, flexGrow: 1 },
      workspace: { expanded: true, flexGrow: 2 }, // Workspace files section
      available: { expanded: true, flexGrow: 2 }, // Available files (expanded by default so users can add files)
    },
    { storageKey: "files_tab_sections_v2" } // v2: workspace/available structure
  );

  // Fetch files from server
  const {
    files: hookFiles,
    folders: hookFolders,
    isLoading: hookLoading,
    error: hookError,
    refetch,
    uploadFile,
    toggleStar,
    createFolder,
  } = useProjectFiles();

  // Compute jobs hook
  const { submitJob } = useComputeJobs();

  // Loaded datasets from DatasetManager
  const loadedDatasets = useDatasets();

  // DatasetManager for unloading
  const datasetManager = useDatasetManager();

  // Use mock data if provided
  const serverFiles = mockFiles ?? hookFiles;
  const isLoading = mockIsLoading ?? hookLoading;
  const error = mockError ?? hookError;

  // Create a Map of file IDs to their data state for checking loaded status
  // Only files with isDataLoaded=true are considered "loaded" (data in memory)
  const fileDataStates = useMemo(() => {
    const states = new Map();
    loadedDatasets.forEach((ds) => {
      const state = {
        isDataLoaded: ds.isDataLoaded,
        isDataLoading: ds.isDataLoading,
        dataState: ds.dataState,
      };
      // Map by all possible IDs
      if (ds.fileId) states.set(ds.fileId, state);
      if (ds.sourceFileId) states.set(ds.sourceFileId, state);
      states.set(ds.id, state);
    });
    return states;
  }, [loadedDatasets]);

  // Transform server files to UI format (with optimistic star updates)
  const files = useMemo(() => {
    if (!serverFiles || serverFiles.length === 0) return [];

    return serverFiles.map((file) => {
      // Check for optimistic star update
      const hasOptimisticUpdate = file.id in optimisticStars;
      const starredState = hasOptimisticUpdate
        ? optimisticStars[file.id]
        : mockStarredIds
          ? mockStarredIds.has(file.id)
          : file.starred ?? false;

      // Get the data state for this file
      const dataStateInfo = fileDataStates.get(file.id);

      // File is "loaded" only if its data is actually in memory
      const isLoaded = dataStateInfo?.isDataLoaded ?? false;

      // Determine the load state for UI display
      // 'stored' = on server, not in memory
      // 'loading' = currently loading
      // 'loaded' = data in memory
      // 'processing' = running compute operation
      let loadState = 'stored';
      if (dataStateInfo) {
        loadState = dataStateInfo.dataState || 'stored';
      }

      return {
        id: file.id,
        name: file.name || file.filename,
        fileType: file.fileType,
        size:
          file.sizeFormatted ||
          (typeof file.size === "number"
            ? formatFileSize(file.size)
            : file.size) ||
          "",
        starred: starredState,
        loaded: isLoaded,
        loadState: loadState, // For LoadStateIndicator
        thumbnail: file.thumbnail ?? canVisualize(file.fileType),
        date: file.uploadedAt,
        isFolder: false,
      };
    });
  }, [serverFiles, mockStarredIds, optimisticStars, fileDataStates]);

  // Workspace files management
  const {
    workspaceFileIds,
    workspaceFiles,
    availableFiles,
    workspaceFileCount,
    addToWorkspace,
    addMultipleToWorkspace,
    removeFromWorkspace,
    isInWorkspace,
  } = useWorkspaceFiles({
    workspaceId,
    allFiles: files,
  });

  // Starred files (can be from workspace or available)
  const starredFiles = useMemo(() => {
    return files.filter((f) => f.starred);
  }, [files]);

  // Loaded datasets formatted for display - ONLY datasets with data actually in memory
  const loadedDatasetsFormatted = useMemo(() => {
    return loadedDatasets
      .filter((ds) => ds.isDataLoaded) // Only include datasets with data in memory
      .map((ds) => ({
        id: ds.id,
        name: ds.name,
        fileType: ds.fileType,
        size: ds.pointCount ? `${ds.pointCount.toLocaleString()} pts` : "",
        starred: false,
        loaded: true, // These are all loaded by definition (filtered above)
        loadState: ds.dataState,
        thumbnail: true,
        date: ds.uploadedAt,
        isFolder: false,
        isDataset: true,
      }));
  }, [loadedDatasets]);

  // Loaded count
  const loadedCount = useMemo(() => {
    return files.filter((f) => f.loaded).length;
  }, [files]);

  // Get all supported file types
  const supportedFileTypes = useMemo(() => {
    const handlers = instanceTypeRegistry.getAvailableHandlers();
    const types = new Set();

    handlers.forEach(({ handler }) => {
      const supported = handler.getSupportedFileTypes();
      supported.forEach((t) => types.add(t.extension));
    });

    return Array.from(types);
  }, []);

  // Filter files using unified filter system
  const filteredFiles = useMemo(() => {
    let result = filter.applyFilters(files);

    // Apply quick filters (OR logic for file status)
    if (filter.quickFilters.length > 0) {
      result = result.filter((file) => {
        return filter.quickFilters.some((filterId) => {
          if (filterId === "starred") return file.starred;
          if (filterId === "loaded") return file.loaded;
          if (filterId === "stored") return !file.loaded;
          return true;
        });
      });
    }

    return result;
  }, [files, filter]);

  // Handlers
  const toggleFolder = useCallback((id) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleStar = useCallback(
    async (id) => {
      // Find current starred state
      const file = files.find(f => f.id === id);
      const currentlyStarred = file?.starred || false;

      // Optimistically update UI
      setOptimisticStars(prev => ({
        ...prev,
        [id]: !currentlyStarred,
      }));

      try {
        await toggleStar({ type: "file", targetId: id });
        log.debug("Toggled star for file:", id);
        // Clear optimistic state after success (refetch will provide real data)
        setOptimisticStars(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } catch (err) {
        log.error("Failed to toggle star:", err);
        // Revert optimistic update on error
        setOptimisticStars(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [toggleStar, files]
  );

  const handleDragStart = useCallback((e, file) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "file",
        ...file,
        isFile: true,
      })
    );
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  const handleDoubleClick = useCallback((file) => {
    log.info(`Double-click to open: ${file.name}`);
    window.dispatchEvent(
      new CustomEvent("cia:request-instance", {
        detail: {
          datasetId: file.id,
          fileId: file.id,
          fileName: file.name,
        },
      })
    );
  }, []);

  const handleContextMenu = useCallback((e, file) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  }, []);

  const handleMenuClick = useCallback((e, file) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({ x: rect.right, y: rect.top, file });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleContextAction = useCallback(
    async (action, file, operation) => {
      log.debug("Context action:", action, file, operation);

      switch (action) {
        case "open":
          log.info(`Opening file in instance: ${file.name}`);
          window.dispatchEvent(
            new CustomEvent("cia:request-instance", {
              detail: {
                datasetId: file.id,
                fileId: file.id,
                fileName: file.name,
              },
            })
          );
          break;

        case "cancelLoad":
        case "cancelProcess":
          log.info(`Canceling load/process for file: ${file.name}`);
          try {
            // Find the dataset ID associated with this file
            const cancelDataset = loadedDatasets.find(
              (ds) => ds.fileId === file.id || ds.sourceFileId === file.id || ds.id === file.id
            );
            if (cancelDataset) {
              const cancelled = await datasetManager.cancelLoadDataset(cancelDataset.id);
              if (cancelled) {
                log.info(`Successfully cancelled operation for: ${cancelDataset.id}`);
              } else {
                log.warn(`Could not cancel operation for: ${cancelDataset.id}`);
              }
            } else {
              log.warn(`No dataset found for file: ${file.id}`);
            }
          } catch (err) {
            log.error("Failed to cancel operation:", err);
          }
          break;

        case "unload":
          log.info(`Unloading file from memory: ${file.name}`);
          try {
            // Find the dataset ID associated with this file
            const dataset = loadedDatasets.find(
              (ds) => ds.fileId === file.id || ds.sourceFileId === file.id || ds.id === file.id
            );
            if (dataset) {
              // Check if any views using this dataset are on the canvas
              const viewManager = getViewConfigurationManager();
              const viewsForDataset = viewManager?.getViewsForDataset?.(dataset.id) || [];
              const viewsOnCanvas = viewsForDataset.filter(view =>
                canvasManager?.isViewOnCanvas?.(view.id)
              );

              if (viewsOnCanvas.length > 0) {
                log.warn(`Cannot unload: ${viewsOnCanvas.length} view(s) on canvas use this dataset`);
                // TODO: Show a toast/notification to the user
                // For now, just log and don't unload
                break;
              }

              // Release data from memory but keep the dataset reference
              const released = await datasetManager.releaseDatasetData(dataset.id);
              if (released) {
                log.info(`Successfully released data for dataset: ${dataset.id}`);
              } else {
                log.warn(`Dataset ${dataset.id} had no data to release`);
              }
            } else {
              log.warn(`No loaded dataset found for file: ${file.id}`);
            }
          } catch (err) {
            log.error("Failed to release dataset data:", err);
          }
          break;

        case "info":
          log.info(`Show details for: ${file.name}`);
          break;

        case "rename":
          log.info(`Rename file: ${file.name}`);
          break;

        case "star":
          await handleStar(file.id);
          break;

        case "delete":
          log.info(`Delete file: ${file.name}`);
          // TODO: Implement file deletion with confirmation dialog
          break;

        case "process":
          if (operation) {
            try {
              log.info(`Submitting ${operation.id} job for file ${file.id}`);
              await submitJob(
                file.id,
                operation.id,
                operation.defaultParams || {},
                {
                  fileName: file.name,
                }
              );
            } catch (err) {
              log.error("Failed to submit compute job:", err);
            }
          }
          break;

        case "addToWorkspace":
          log.info(`Adding file to workspace: ${file.name}`);
          addToWorkspace(file.id);
          break;

        case "removeFromWorkspace":
          log.info(`Removing file from workspace: ${file.name}`);
          removeFromWorkspace(file.id);
          break;

        default:
          log.warn(`Unknown context action: ${action}`);
      }
    },
    [submitJob, handleStar, loadedDatasets, datasetManager, addToWorkspace, removeFromWorkspace]
  );

  const handleUpload = useCallback(
    async (file) => {
      try {
        const uploadResult = await uploadFile({ file });

        // Register the uploaded file with the client-side dataset manager
        // so it shows up immediately in the Datasets tab without a reload.
        if (uploadResult?.file?.id) {
          await datasetManager.loadDataset(file, null, {
            serverId: uploadResult.file.id,
            serverMetadata: {
              uploadedBy: uploadResult.file.uploaded_by,
              uploadedAt: uploadResult.file.uploaded_at,
              fileSize: uploadResult.file.file_size ?? file.size,
              hash: uploadResult.file.hash,
              pointCount: uploadResult.file.point_count,
              cellCount: uploadResult.file.cell_count,
              bounds: uploadResult.file.bounds,
              dataArrays: uploadResult.file.data_arrays,
            },
          });
        }

        refetch();
      } catch (err) {
        log.error("Upload failed:", err);
      }
    },
    [uploadFile, refetch, datasetManager]
  );

  return {
    // View state
    viewMode,
    setViewMode,

    // Unified filter system
    filter,
    filterConfig: FILES_FILTER_CONFIG,

    // Backwards compatibility aliases
    searchQuery: filter.search,
    setSearchQuery: filter.setSearch,
    activeFilters: { types: filter.types },
    toggleTypeFilter: filter.toggleType,
    clearFilters: filter.clearAll,

    // Selection
    selectedFileId,
    setSelectedFileId,
    expandedFolders,
    toggleFolder,

    // Section states
    sectionStates,
    toggleSection,
    resizeSection,

    // Context menu
    contextMenu,
    handleContextMenu,
    handleMenuClick,
    closeContextMenu,
    handleContextAction,

    // Upload
    isDragOver,
    setIsDragOver,
    handleUpload,

    // Files data
    files: filteredFiles,
    allFiles: files,
    starredFiles,
    loadedDatasetsFormatted,
    loadedCount,
    supportedFileTypes,
    isLoading,
    error,

    // Workspace files
    workspaceFiles,
    availableFiles,
    workspaceFileCount,
    workspaceFileIds,
    isInWorkspace,

    // Actions
    handleStar,
    handleDragStart,
    handleDoubleClick,
    refetch,

    // Workspace actions
    addToWorkspace,
    addMultipleToWorkspace,
    removeFromWorkspace,

    // Folder actions
    folders: hookFolders || [],
    createFolder,
  };
}

export default useFilesTab;
