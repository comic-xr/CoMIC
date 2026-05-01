// src/ui/react/__mocks__/data/folders.mock.js
// Folder structure mock data for FilesTab Storybook stories
//
// Provides:
// - Hierarchical folder tree for navigation
// - Flat folder list for lookups
// - Utility functions for folder operations

import { MOCK_USERS } from "./users.mock.js";

/**
 * Hierarchical folder tree structure
 * Used for folder navigation and nested display
 */
export const MOCK_FOLDERS_TREE = [
  {
    id: "folder-research",
    name: "Research",
    parentId: null,
    path: "/Research",
    fileCount: 5,
    createdBy: MOCK_USERS.current,
    children: [
      {
        id: "folder-medical",
        name: "Medical Imaging",
        parentId: "folder-research",
        path: "/Research/Medical Imaging",
        fileCount: 3,
        createdBy: MOCK_USERS.current,
        children: [],
      },
      {
        id: "folder-analysis",
        name: "Analysis Results",
        parentId: "folder-research",
        path: "/Research/Analysis Results",
        fileCount: 2,
        createdBy: MOCK_USERS.drSmith,
        children: [],
      },
    ],
  },
  {
    id: "folder-shared",
    name: "Shared with Team",
    parentId: null,
    path: "/Shared with Team",
    fileCount: 4,
    createdBy: MOCK_USERS.drSmith,
    children: [],
  },
  {
    id: "folder-archive",
    name: "Archive",
    parentId: null,
    path: "/Archive",
    fileCount: 8,
    createdBy: MOCK_USERS.current,
    children: [
      {
        id: "folder-2024",
        name: "2024",
        parentId: "folder-archive",
        path: "/Archive/2024",
        fileCount: 5,
        createdBy: MOCK_USERS.current,
        children: [],
      },
      {
        id: "folder-2023",
        name: "2023",
        parentId: "folder-archive",
        path: "/Archive/2023",
        fileCount: 3,
        createdBy: MOCK_USERS.current,
        children: [],
      },
    ],
  },
];

/**
 * Flat folder list for quick lookups
 * Each folder has id, name, parentId, and path
 */
export const MOCK_FOLDERS_FLAT = [
  {
    id: "folder-research",
    name: "Research",
    parentId: null,
    path: "/Research",
  },
  {
    id: "folder-medical",
    name: "Medical Imaging",
    parentId: "folder-research",
    path: "/Research/Medical Imaging",
  },
  {
    id: "folder-analysis",
    name: "Analysis Results",
    parentId: "folder-research",
    path: "/Research/Analysis Results",
  },
  {
    id: "folder-shared",
    name: "Shared with Team",
    parentId: null,
    path: "/Shared with Team",
  },
  { id: "folder-archive", name: "Archive", parentId: null, path: "/Archive" },
  {
    id: "folder-2024",
    name: "2024",
    parentId: "folder-archive",
    path: "/Archive/2024",
  },
  {
    id: "folder-2023",
    name: "2023",
    parentId: "folder-archive",
    path: "/Archive/2023",
  },
];

/**
 * Get folder by ID
 * @param {string} id - Folder ID
 * @returns {object|null} Folder object or null
 */
export function getFolderById(id) {
  return MOCK_FOLDERS_FLAT.find((f) => f.id === id) || null;
}

/**
 * Get full path for a folder
 * @param {string} id - Folder ID
 * @returns {string} Full path string
 */
export function getFolderPath(id) {
  const folder = getFolderById(id);
  return folder ? folder.path : "/";
}

/**
 * Get children of a folder from the tree
 * @param {string} parentId - Parent folder ID (null for root)
 * @returns {array} Array of child folders
 */
export function getFolderChildren(parentId = null) {
  if (parentId === null) {
    return MOCK_FOLDERS_TREE;
  }

  // Find folder in tree and return its children
  const findInTree = (folders) => {
    for (const folder of folders) {
      if (folder.id === parentId) {
        return folder.children || [];
      }
      if (folder.children?.length) {
        const found = findInTree(folder.children);
        if (found) return found;
      }
    }
    return null;
  };

  return findInTree(MOCK_FOLDERS_TREE) || [];
}

/**
 * Get root folders
 * @returns {array} Array of root folders
 */
export function getRootFolders() {
  return MOCK_FOLDERS_TREE;
}
