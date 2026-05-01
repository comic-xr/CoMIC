// src/ui/react/__mocks__/data/files.mock.js
// Project file mock data for FilesTab Storybook stories
//
// Provides:
// - Raw file data matching server response shape
// - Formatted file data for UI display
// - Starred files tracking
// - Utility functions for file operations

import { MOCK_USERS } from "./users.mock.js";

/**
 * Raw file data matching the shape returned by useProjectFiles() hook
 */
export const MOCK_FILES = [
  {
    id: "file-brain-scan",
    name: "Brain_Scan_001.nii",
    filename: "Brain_Scan_001.nii",
    fileType: "nii",
    size: 47394816, // ~45.2 MB
    folderId: "folder-medical",
    folderPath: "/Research/Medical Imaging",
    uploadedBy: MOCK_USERS.current,
    uploadedAt: new Date().toISOString(),
    thumbnailUrl: null,
  },
  {
    id: "file-ct-overlay",
    name: "CT_Overlay.dcm",
    filename: "CT_Overlay.dcm",
    fileType: "dcm",
    size: 134742016, // ~128.5 MB
    folderId: "folder-medical",
    folderPath: "/Research/Medical Imaging",
    uploadedBy: MOCK_USERS.drSmith,
    uploadedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    thumbnailUrl: null,
  },
  {
    id: "file-reference-atlas",
    name: "Reference_Atlas.nii",
    filename: "Reference_Atlas.nii",
    fileType: "nii",
    size: 93415833, // ~89.1 MB
    folderId: "folder-research",
    folderPath: "/Research",
    uploadedBy: MOCK_USERS.alexChen,
    uploadedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    thumbnailUrl: null,
  },
  {
    id: "file-analysis-results",
    name: "Analysis_Results.vtk",
    filename: "Analysis_Results.vtk",
    fileType: "vtk",
    size: 12897484, // ~12.3 MB
    folderId: "folder-analysis",
    folderPath: "/Research/Analysis Results",
    uploadedBy: MOCK_USERS.alexChen,
    uploadedAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    thumbnailUrl: null,
  },
  {
    id: "file-surface-model",
    name: "Surface_Model.vtp",
    filename: "Surface_Model.vtp",
    fileType: "vtp",
    size: 36385587, // ~34.7 MB
    folderId: null,
    folderPath: "/",
    uploadedBy: MOCK_USERS.current,
    uploadedAt: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
    thumbnailUrl: null,
  },
  {
    id: "file-tumor-region",
    name: "Tumor_Region.vtk",
    filename: "Tumor_Region.vtk",
    fileType: "vtk",
    size: 8912456, // ~8.5 MB
    folderId: "folder-shared",
    folderPath: "/Shared with Team",
    uploadedBy: MOCK_USERS.drSmith,
    uploadedAt: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
    thumbnailUrl: null,
  },
  {
    id: "file-spine-ct",
    name: "Spine_CT_Series.dcm",
    filename: "Spine_CT_Series.dcm",
    fileType: "dcm",
    size: 256789012, // ~244.9 MB
    folderId: "folder-shared",
    folderPath: "/Shared with Team",
    uploadedBy: MOCK_USERS.drJones,
    uploadedAt: new Date(Date.now() - 518400000).toISOString(), // 6 days ago
    thumbnailUrl: null,
  },
];

/**
 * Set of starred file/folder IDs
 */
export const MOCK_STARRED_IDS = new Set([
  "file-brain-scan",
  "file-reference-atlas",
  "folder-research",
]);

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export function formatFileSize(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Files formatted for UI display
 * Includes computed properties like formatted size and starred status
 */
export const MOCK_FILES_UI = MOCK_FILES.map((file) => ({
  ...file,
  size: formatFileSize(file.size),
  starred: MOCK_STARRED_IDS.has(file.id),
  loaded: file.id === "file-brain-scan" || file.id === "file-ct-overlay", // Some files pre-loaded
  thumbnail: true, // Assume all have thumbnails for visual testing
}));

/**
 * Get starred files
 * @returns {array} Array of starred files
 */
export function getStarredFiles() {
  return MOCK_FILES_UI.filter((f) => f.starred);
}

/**
 * Get recent files (sorted by upload date, limited to 4)
 * @param {number} limit - Max files to return
 * @returns {array} Array of recent files
 */
export function getRecentFiles(limit = 4) {
  return [...MOCK_FILES_UI]
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    .slice(0, limit);
}

/**
 * Get files in a specific folder
 * @param {string} folderId - Folder ID (null for root)
 * @returns {array} Array of files in folder
 */
export function getFilesInFolder(folderId = null) {
  return MOCK_FILES_UI.filter((f) => f.folderId === folderId);
}

/**
 * Get files at root level (no folder)
 * @returns {array} Array of root files
 */
export function getRootFiles() {
  return getFilesInFolder(null);
}

/**
 * Get files by type
 * @param {string} fileType - File extension (nii, dcm, vtk, vtp)
 * @returns {array} Array of files of that type
 */
export function getFilesByType(fileType) {
  return MOCK_FILES_UI.filter((f) => f.fileType === fileType);
}
