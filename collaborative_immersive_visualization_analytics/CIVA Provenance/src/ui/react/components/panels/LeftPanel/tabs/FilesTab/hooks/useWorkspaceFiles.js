/**
 * @file useWorkspaceFiles.js
 * @description Hook for managing files added to the current workspace.
 *
 * Workspace files are files the user has explicitly added to work with
 * in this workspace. This is separate from:
 * - All project files (available to add)
 * - Loaded files (data currently in memory)
 *
 * Persistence: Currently uses localStorage, can be upgraded to server-side.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { ui as log } from "@Utils/logger.js";

// localStorage key prefix
const STORAGE_KEY_PREFIX = "cia_workspace_files_";

/**
 * Get storage key for a workspace
 * @param {string} workspaceId - Workspace identifier
 * @returns {string} Storage key
 */
function getStorageKey(workspaceId) {
  return `${STORAGE_KEY_PREFIX}${workspaceId || "default"}`;
}

/**
 * Load workspace files from localStorage
 * @param {string} workspaceId - Workspace identifier
 * @returns {Set<string>} Set of file IDs
 */
function loadFromStorage(workspaceId) {
  try {
    const key = getStorageKey(workspaceId);
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Set(Array.isArray(parsed) ? parsed : []);
    }
  } catch (err) {
    log.warn("Failed to load workspace files from storage:", err);
  }
  return new Set();
}

/**
 * Save workspace files to localStorage
 * @param {string} workspaceId - Workspace identifier
 * @param {Set<string>} fileIds - Set of file IDs
 */
function saveToStorage(workspaceId, fileIds) {
  try {
    const key = getStorageKey(workspaceId);
    localStorage.setItem(key, JSON.stringify([...fileIds]));
  } catch (err) {
    log.warn("Failed to save workspace files to storage:", err);
  }
}

/**
 * Hook for managing workspace files
 *
 * @param {Object} options - Hook options
 * @param {string} [options.workspaceId] - Current workspace ID
 * @param {Array} [options.allFiles] - All available files (for filtering)
 * @returns {Object} Hook return value
 */
export function useWorkspaceFiles({ workspaceId = "default", allFiles = [] } = {}) {
  // Set of file IDs added to this workspace
  const [workspaceFileIds, setWorkspaceFileIds] = useState(() =>
    loadFromStorage(workspaceId)
  );

  // Reload when workspace changes
  useEffect(() => {
    setWorkspaceFileIds(loadFromStorage(workspaceId));
  }, [workspaceId]);

  // Save to storage when file IDs change
  useEffect(() => {
    saveToStorage(workspaceId, workspaceFileIds);
  }, [workspaceId, workspaceFileIds]);

  /**
   * Add a file to the workspace
   */
  const addToWorkspace = useCallback((fileId) => {
    setWorkspaceFileIds((prev) => {
      const next = new Set(prev);
      next.add(fileId);
      log.debug(`Added file ${fileId} to workspace`);
      return next;
    });
  }, []);

  /**
   * Add multiple files to the workspace
   */
  const addMultipleToWorkspace = useCallback((fileIds) => {
    setWorkspaceFileIds((prev) => {
      const next = new Set(prev);
      fileIds.forEach((id) => next.add(id));
      log.debug(`Added ${fileIds.length} files to workspace`);
      return next;
    });
  }, []);

  /**
   * Remove a file from the workspace
   */
  const removeFromWorkspace = useCallback((fileId) => {
    setWorkspaceFileIds((prev) => {
      const next = new Set(prev);
      next.delete(fileId);
      log.debug(`Removed file ${fileId} from workspace`);
      return next;
    });
  }, []);

  /**
   * Check if a file is in the workspace
   */
  const isInWorkspace = useCallback((fileId) => {
    return workspaceFileIds.has(fileId);
  }, [workspaceFileIds]);

  /**
   * Clear all files from workspace
   */
  const clearWorkspace = useCallback(() => {
    setWorkspaceFileIds(new Set());
    log.debug("Cleared all files from workspace");
  }, []);

  /**
   * Get workspace files (filtered from allFiles)
   */
  const workspaceFiles = useMemo(() => {
    if (!allFiles || allFiles.length === 0) return [];
    return allFiles.filter((file) => workspaceFileIds.has(file.id));
  }, [allFiles, workspaceFileIds]);

  /**
   * Get files NOT in workspace (for "Add Files" section)
   */
  const availableFiles = useMemo(() => {
    if (!allFiles || allFiles.length === 0) return [];
    return allFiles.filter((file) => !workspaceFileIds.has(file.id));
  }, [allFiles, workspaceFileIds]);

  return {
    // Data
    workspaceFileIds,
    workspaceFiles,
    availableFiles,
    workspaceFileCount: workspaceFileIds.size,

    // Actions
    addToWorkspace,
    addMultipleToWorkspace,
    removeFromWorkspace,
    isInWorkspace,
    clearWorkspace,
  };
}

export default useWorkspaceFiles;
