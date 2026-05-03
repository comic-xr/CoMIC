// src/ui/react/__mocks__/hooks/useProjectFiles.mock.js
// Mock implementation of useProjectFiles for Storybook
//
// Returns static mock data instead of fetching from server.
// Actions log to console for visibility in Storybook.

import { useState, useCallback, useMemo } from "react";
import {
  MOCK_FILES,
  MOCK_STARRED_IDS,
  formatFileSize,
} from "../data/files.mock.js";
import { MOCK_FOLDERS_TREE, MOCK_FOLDERS_FLAT } from "../data/folders.mock.js";

/**
 * Mock implementation of useProjectFiles hook
 *
 * Use this in Storybook to display the FilesTab with realistic data
 * without needing a running backend.
 *
 * @param {Object} options - Hook options (ignored in mock)
 * @returns {Object} Mock file data and actions
 */
export function useMockProjectFiles(options = {}) {
  // Use local state so starring works in the story
  const [starredIds, setStarredIds] = useState(new Set(MOCK_STARRED_IDS));
  const [files, setFiles] = useState(MOCK_FILES);
  const [folders, setFolders] = useState(MOCK_FOLDERS_TREE);

  // Static states
  const [isLoading] = useState(false);
  const [error] = useState(null);

  // Transform files for UI
  const filesForUI = useMemo(() => {
    return files.map((file) => ({
      ...file,
      size: formatFileSize(file.size),
      starred: starredIds.has(file.id),
      loaded: false, // Would check against loaded datasets
    }));
  }, [files, starredIds]);

  // === Actions ===

  const refetch = useCallback(() => {
    console.log("[Mock useProjectFiles] refetch() called");
  }, []);

  const createFolder = useCallback(async (name, parentId = null) => {
    console.log("[Mock useProjectFiles] createFolder:", { name, parentId });
    const newFolder = {
      id: `folder-${Date.now()}`,
      name,
      parentId,
      path: parentId
        ? `${MOCK_FOLDERS_FLAT.find((f) => f.id === parentId)?.path}/${name}`
        : `/${name}`,
      fileCount: 0,
      children: [],
      createdAt: new Date().toISOString(),
    };
    // In real implementation, would update state
    return newFolder;
  }, []);

  const renameFolder = useCallback(async (folderId, newName) => {
    console.log("[Mock useProjectFiles] renameFolder:", { folderId, newName });
    return { success: true };
  }, []);

  const moveFolder = useCallback(async (folderId, newParentId) => {
    console.log("[Mock useProjectFiles] moveFolder:", {
      folderId,
      newParentId,
    });
    return { success: true };
  }, []);

  const deleteFolder = useCallback(async (folderId) => {
    console.log("[Mock useProjectFiles] deleteFolder:", folderId);
    return { success: true };
  }, []);

  const toggleStar = useCallback(
    async (targetType, targetId) => {
      console.log("[Mock useProjectFiles] toggleStar:", {
        targetType,
        targetId,
      });

      // Actually update local state so UI reflects the change
      setStarredIds((prev) => {
        const next = new Set(prev);
        if (next.has(targetId)) {
          next.delete(targetId);
          return next;
        } else {
          next.add(targetId);
          return next;
        }
      });

      return { starred: !starredIds.has(targetId) };
    },
    [starredIds]
  );

  const moveFile = useCallback(async (fileId, folderId) => {
    console.log("[Mock useProjectFiles] moveFile:", { fileId, folderId });
    return { success: true };
  }, []);

  const uploadFile = useCallback(async (file, options = {}) => {
    console.log("[Mock useProjectFiles] uploadFile:", file.name, options);

    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const newFile = {
      id: `file-${Date.now()}`,
      name: file.name,
      filename: file.name,
      fileType: file.name.split(".").pop(),
      size: file.size,
      hash: `mock-hash-${Date.now()}`,
      folderId: null,
      folderPath: "/",
      uploadedAt: new Date().toISOString(),
    };

    // Add to local state
    setFiles((prev) => [newFile, ...prev]);

    return newFile;
  }, []);

  const addFileToProject = useCallback(async (fileId, options = {}) => {
    console.log("[Mock useProjectFiles] addFileToProject:", {
      fileId,
      options,
    });
    return { success: true };
  }, []);

  return {
    // Data
    files: filesForUI,
    folders,
    starredIds,
    isLoading,
    error,
    projectId: "mock-project-123",

    // Actions
    refetch,
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder,
    toggleStar,
    moveFile,
    uploadFile,
    addFileToProject,
  };
}

/**
 * Mock implementation of useAllAccessibleFiles hook
 */
export function useMockAllAccessibleFiles() {
  const [files] = useState(MOCK_FILES);
  const [isLoading] = useState(false);
  const [error] = useState(null);

  return {
    files,
    isLoading,
    error,
    refetch: () => console.log("[Mock useAllAccessibleFiles] refetch()"),
  };
}
