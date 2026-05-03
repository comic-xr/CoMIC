// src/ui/react/__mocks__/index.js
// Central export for all mock data and hooks
//
// Usage in Storybook stories:
//   import { MOCK_FILES, useMockProjectFiles } from '@UI/react/__mocks__';
//
// Usage with MockDataProvider:
//   import { MockDataProvider } from '@UI/react/__mocks__';
//   <MockDataProvider><YourComponent /></MockDataProvider>

// =============================================================================
// DATA EXPORTS
// =============================================================================

export {
  MOCK_USERS,
  MOCK_OTHER_USERS,
  MOCK_ALL_USERS,
  MOCK_ONLINE_USERS,
  MOCK_PRESENCE,
  getRandomUsers,
} from "./data/users.mock.js";

export {
  MOCK_FOLDERS_TREE,
  MOCK_FOLDERS_FLAT,
  getFolderById,
  getFolderPath,
  getFolderChildren,
  getRootFolders,
} from "./data/folders.mock.js";

export {
  MOCK_FILES,
  MOCK_STARRED_IDS,
  MOCK_FILES_UI,
  getStarredFiles,
  getRecentFiles,
  getFilesInFolder,
  getRootFiles,
  formatFileSize,
} from "./data/files.mock.js";

export {
  MOCK_DATASETS,
  MOCK_VIEWS,
  MOCK_DATASETS_GROUPED,
  MOCK_DATASETS_WITH_VIEWS,
  getViewsForDataset,
  getActiveDatasets,
  getInactiveDatasets,
  getSharedDatasets,
  getLoadingDatasets,
} from "./data/datasets.mock.js";

export { MOCK_ANNOTATIONS } from "./data/annotations.mock.js";

export { MOCK_ROOMS } from "./data/rooms.mock.js";

export { MOCK_WORKSPACES } from "./data/workspaces.mock.js";

// =============================================================================
// MOCK HOOK EXPORTS
// =============================================================================

export {
  useMockProjectFiles,
  useMockAllAccessibleFiles,
} from "./hooks/useProjectFiles.mock.js";

export {
  useMockDatasets,
  useMockDatasetActions,
  useMockViewConfigurations,
  useMockDatasetsWithViews,
} from "./hooks/useDatasets.mock.js";

export { useMockComputeJobs } from "./hooks/useComputeJobs.mock.js";

export { useMockRooms } from "./hooks/useRooms.mock.js";

// NEW: Additional mock hooks
export { useMockAnnotations } from "./hooks/useAnnotations.mock.js";

export { useMockBookmarks, MOCK_BOOKMARKS } from "./hooks/useBookmarks.mock.js";

export {
  useMockFilters,
  MOCK_SAVED_FILTERS,
  FILTER_TYPES,
} from "./hooks/useFilters.mock.js";

export { useMockWorkspaces } from "./hooks/useWorkspaces.mock.js";

// =============================================================================
// PROVIDER EXPORT
// =============================================================================

export { MockDataProvider, useMockDataMode } from "./MockDataProvider.jsx";

// =============================================================================
// CONVENIENCE: VOICE & ACTIVITY MOCKS FOR RIGHT PANEL STORIES
// =============================================================================

export const VOICE_MOCK = {
  channels: [
    { id: "main", name: "Main Room", participants: 3 },
    { id: "breakout-1", name: "Team Discussion", participants: 2 },
  ],
  participants: [
    { id: "user-1", name: "You", isMuted: false, isSpeaking: false },
    { id: "user-2", name: "Dr. Smith", isMuted: true, isSpeaking: false },
    { id: "user-3", name: "Alex Chen", isMuted: false, isSpeaking: true },
  ],
};

export const ACTIVITY_MOCK = {
  activities: [
    {
      id: "act-1",
      type: "annotation",
      user: "Dr. Smith",
      action: "added annotation",
      target: "Brain_Scan_001.nii",
      timestamp: Date.now() - 60000,
    },
    {
      id: "act-2",
      type: "view",
      user: "Alex Chen",
      action: "created view",
      target: "Axial Slice",
      timestamp: Date.now() - 180000,
    },
    {
      id: "act-3",
      type: "filter",
      user: "You",
      action: "applied filter",
      target: "Tumor Threshold",
      timestamp: Date.now() - 300000,
    },
    {
      id: "act-4",
      type: "dataset",
      user: "Dr. Jones",
      action: "loaded dataset",
      target: "CT_Overlay.dcm",
      timestamp: Date.now() - 600000,
    },
  ],
  filters: ["all", "annotations", "views", "filters", "datasets"],
};
