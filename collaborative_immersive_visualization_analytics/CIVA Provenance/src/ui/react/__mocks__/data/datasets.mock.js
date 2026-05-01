// src/ui/react/__mocks__/data/datasets.mock.js
// Dataset and View mock data for Storybook stories
//
// Provides:
// - MOCK_DATASETS - Loaded datasets
// - MOCK_VIEWS - View configurations
// - Utility functions for filtering and grouping

import { MOCK_USERS } from "./users.mock.js";

// =============================================================================
// MOCK DATASETS
// =============================================================================

/**
 * Mock datasets matching the shape from DatasetManager
 */
export const MOCK_DATASETS = [
  {
    id: "ds-brain-scan",
    name: "Brain_Scan_001.nii",
    filename: "Brain_Scan_001.nii",
    fileType: "nii",
    handlerType: "vtk",
    size: 47394816, // ~45.2 MB
    status: "loaded",
    loadedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    uploadedBy: MOCK_USERS.current,
    annotations: 5,
    metadata: {
      dimensions: [256, 256, 180],
      spacing: [1, 1, 1],
      origin: [0, 0, 0],
    },
  },
  {
    id: "ds-ct-overlay",
    name: "CT_Overlay.dcm",
    filename: "CT_Overlay.dcm",
    fileType: "dcm",
    handlerType: "vtk",
    size: 134742016, // ~128.5 MB
    status: "loaded",
    loadedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    uploadedBy: MOCK_USERS.drSmith,
    annotations: 3,
    metadata: {
      dimensions: [512, 512, 256],
      spacing: [0.5, 0.5, 1],
      origin: [0, 0, 0],
    },
  },
  {
    id: "ds-surface-model",
    name: "Surface_Model.vtp",
    filename: "Surface_Model.vtp",
    fileType: "vtp",
    handlerType: "vtk",
    size: 36385587, // ~34.7 MB
    status: "loaded",
    loadedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    uploadedBy: MOCK_USERS.alexChen,
    annotations: 2,
    metadata: {
      numberOfPoints: 125000,
      numberOfCells: 250000,
    },
  },
  {
    id: "ds-analysis-results",
    name: "Analysis_Results.vtk",
    filename: "Analysis_Results.vtk",
    fileType: "vtk",
    handlerType: "vtk",
    size: 12897484, // ~12.3 MB
    status: "loaded",
    loadedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    uploadedBy: MOCK_USERS.current,
    annotations: 0,
    metadata: {
      dataType: "structured_grid",
      dimensions: [64, 64, 64],
    },
  },
  {
    id: "ds-loading",
    name: "Large_Dataset.nii",
    filename: "Large_Dataset.nii",
    fileType: "nii",
    handlerType: "vtk",
    size: 524288000, // ~500 MB
    status: "loading",
    loadProgress: 45,
    uploadedBy: MOCK_USERS.current,
    annotations: 0,
  },
];

// =============================================================================
// MOCK VIEWS (ViewConfigurations)
// =============================================================================

/**
 * Mock view configurations
 */
export const MOCK_VIEWS = [
  // Brain Scan views
  {
    id: "view-brain-main",
    name: "Main View",
    datasetId: "ds-brain-scan",
    workspaceId: "ws-personal",
    workspaceScope: "personal",
    status: "active",
    instanceColor: "#60a5fa", // Blue
    activeInstanceCount: 1,
    camera: {
      position: [0, 0, 300],
      focalPoint: [128, 128, 90],
      viewUp: [0, 1, 0],
    },
    filters: [],
    widgetStates: {},
    isShared: false,
    sharedWith: [],
    scope: "personal",
    createdBy: MOCK_USERS.current.id,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "view-brain-axial",
    name: "Axial Slice",
    datasetId: "ds-brain-scan",
    workspaceId: "ws-personal",
    workspaceScope: "personal",
    status: "active",
    instanceColor: "#34d399", // Green
    activeInstanceCount: 1,
    camera: {
      position: [128, 128, 300],
      focalPoint: [128, 128, 90],
      viewUp: [0, 1, 0],
    },
    filters: [{ type: "slice", axis: "z", value: 90 }],
    widgetStates: {},
    isShared: false,
    sharedWith: [],
    scope: "personal",
    createdBy: MOCK_USERS.current.id,
    createdAt: new Date(Date.now() - 3000000).toISOString(),
    updatedAt: new Date(Date.now() - 1200000).toISOString(),
  },
  {
    id: "view-brain-shared",
    name: "Dr. Smith's Analysis",
    datasetId: "ds-brain-scan",
    workspaceId: "ws-team",
    workspaceScope: "shared",
    status: "inactive",
    instanceColor: "#fb7185", // Pink
    activeInstanceCount: 0,
    camera: {
      position: [200, 150, 250],
      focalPoint: [128, 128, 90],
      viewUp: [0, 1, 0],
    },
    filters: [],
    widgetStates: {},
    isShared: true,
    sharedWith: [MOCK_USERS.drSmith.id],
    scope: "shared",
    createdBy: MOCK_USERS.drSmith.id,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  // CT Overlay views
  {
    id: "view-ct-main",
    name: "CT Overview",
    datasetId: "ds-ct-overlay",
    workspaceId: "ws-personal",
    workspaceScope: "personal",
    status: "active",
    instanceColor: "#a78bfa", // Purple
    activeInstanceCount: 1,
    camera: {
      position: [256, 256, 400],
      focalPoint: [256, 256, 128],
      viewUp: [0, 1, 0],
    },
    filters: [],
    widgetStates: {},
    isShared: false,
    sharedWith: [],
    scope: "personal",
    createdBy: MOCK_USERS.current.id,
    createdAt: new Date(Date.now() - 5400000).toISOString(),
    updatedAt: new Date(Date.now() - 2700000).toISOString(),
  },
  {
    id: "view-ct-bone",
    name: "Bone Window",
    datasetId: "ds-ct-overlay",
    workspaceId: "ws-personal",
    workspaceScope: "personal",
    status: "inactive",
    instanceColor: "#fbbf24", // Amber
    activeInstanceCount: 0,
    camera: {
      position: [256, 256, 400],
      focalPoint: [256, 256, 128],
      viewUp: [0, 1, 0],
    },
    filters: [{ type: "windowLevel", window: 2000, level: 400 }],
    widgetStates: {},
    isShared: false,
    sharedWith: [],
    scope: "personal",
    createdBy: MOCK_USERS.current.id,
    createdAt: new Date(Date.now() - 4800000).toISOString(),
    updatedAt: new Date(Date.now() - 4800000).toISOString(),
  },
  // Surface Model views
  {
    id: "view-surface-main",
    name: "Surface View",
    datasetId: "ds-surface-model",
    workspaceId: "ws-personal",
    workspaceScope: "personal",
    status: "inactive",
    instanceColor: "#22d3d1", // Cyan
    activeInstanceCount: 0,
    camera: {
      position: [0, 0, 200],
      focalPoint: [0, 0, 0],
      viewUp: [0, 1, 0],
    },
    filters: [],
    widgetStates: {},
    isShared: false,
    sharedWith: [],
    scope: "personal",
    createdBy: MOCK_USERS.alexChen.id,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
  },
  // Analysis Results - no views yet
];

// =============================================================================
// GROUPED DATA
// =============================================================================

/**
 * Datasets grouped by status
 */
export const MOCK_DATASETS_GROUPED = {
  loaded: MOCK_DATASETS.filter((d) => d.status === "loaded"),
  loading: MOCK_DATASETS.filter((d) => d.status === "loading"),
  error: MOCK_DATASETS.filter((d) => d.status === "error"),
};

/**
 * Datasets with their views attached
 */
export const MOCK_DATASETS_WITH_VIEWS = MOCK_DATASETS.map((dataset) => ({
  ...dataset,
  views: MOCK_VIEWS.filter((v) => v.datasetId === dataset.id),
}));

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get views for a specific dataset
 * @param {string} datasetId - Dataset ID
 * @returns {Array} Array of views for the dataset
 */
export function getViewsForDataset(datasetId) {
  return MOCK_VIEWS.filter((v) => v.datasetId === datasetId);
}

/**
 * Get datasets with active views
 * @returns {Array} Datasets that have at least one active view
 */
export function getActiveDatasets() {
  const activeDatasetIds = new Set(
    MOCK_VIEWS.filter((v) => v.status === "active").map((v) => v.datasetId)
  );
  return MOCK_DATASETS.filter((d) => activeDatasetIds.has(d.id));
}

/**
 * Get datasets with no active views
 * @returns {Array} Datasets with only inactive views or no views
 */
export function getInactiveDatasets() {
  const activeDatasetIds = new Set(
    MOCK_VIEWS.filter((v) => v.status === "active").map((v) => v.datasetId)
  );
  return MOCK_DATASETS.filter(
    (d) => d.status === "loaded" && !activeDatasetIds.has(d.id)
  );
}

/**
 * Get datasets that have shared views
 * @returns {Array} Datasets with at least one shared view
 */
export function getSharedDatasets() {
  const sharedDatasetIds = new Set(
    MOCK_VIEWS.filter((v) => v.isShared).map((v) => v.datasetId)
  );
  return MOCK_DATASETS.filter((d) => sharedDatasetIds.has(d.id));
}

/**
 * Get datasets currently loading
 * @returns {Array} Datasets with status "loading"
 */
export function getLoadingDatasets() {
  return MOCK_DATASETS.filter((d) => d.status === "loading");
}

/**
 * Get a specific dataset by ID
 * @param {string} datasetId - Dataset ID
 * @returns {Object|null} Dataset object or null
 */
export function getDatasetById(datasetId) {
  return MOCK_DATASETS.find((d) => d.id === datasetId) || null;
}

/**
 * Get a specific view by ID
 * @param {string} viewId - View ID
 * @returns {Object|null} View object or null
 */
export function getViewById(viewId) {
  return MOCK_VIEWS.find((v) => v.id === viewId) || null;
}
