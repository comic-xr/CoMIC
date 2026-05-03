// src/ui/react/hooks/useBookmarks.js
// Hook for managing bookmarks (saved view states)
//
// REFACTORED: Uses useAsyncData and useWebSocketEvents
// Before: ~350 lines | After: ~200 lines

import { useCallback, useMemo } from "react";
import { sessionManager } from "@Core/session/sessionManager.js";
import { config } from "@Core/config/clientConfig.js";
import { api as log } from "@Utils/logger.js";

import { useAsyncData, useAsyncMutation } from "./useAsyncData";
import { useServerSyncEvents } from "./useWebSocketEvents";

/**
 * Hook for managing bookmarks
 *
 * @param {Object} options
 * @param {string} options.projectId - Override project ID (defaults to current session)
 * @param {string} options.scope - Bookmark scope: 'personal' | 'workspace' | 'project' | 'all'
 * @param {string} options.workspaceId - Workspace ID (required if scope='workspace')
 * @param {string} options.datasetId - Filter by dataset (optional)
 * @returns {Object} Bookmarks data and actions
 */
export function useBookmarks(options = {}) {
  const {
    projectId: overrideProjectId,
    scope = "all",
    workspaceId = null,
    datasetId = null,
  } = options;

  // Derived values
  const projectId = overrideProjectId || sessionManager.getRoomId?.();
  const apiBase = config.apiBaseUrl || "http://localhost:3001/api";

  // Helper for auth headers
  const getHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      "x-user-id":
        sessionManager.getUserId?.() || "00000000-0000-0000-0000-000000000002",
      "x-user-email": sessionManager.getUserEmail?.() || "demo@cia-web.local",
      "x-user-name": sessionManager.getUserName?.() || "Demo User",
    }),
    []
  );

  // ---------------------------------------------------------------------------
  // FETCH BOOKMARKS
  // ---------------------------------------------------------------------------

  const fetchBookmarks = useCallback(
    async (signal) => {
      if (!projectId) return [];

      let url = `${apiBase}/projects/${projectId}/bookmarks?scope=${scope}`;
      if (workspaceId) url += `&workspaceId=${workspaceId}`;
      if (datasetId) url += `&datasetId=${datasetId}`;

      const response = await fetch(url, {
        signal,
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch bookmarks: ${response.status}`);
      }

      const data = await response.json();
      return data.bookmarks || [];
    },
    [apiBase, projectId, scope, workspaceId, datasetId, getHeaders]
  );

  const {
    data: bookmarks,
    isLoading,
    error,
    refetch,
  } = useAsyncData(fetchBookmarks, [projectId, scope, workspaceId, datasetId], {
    initialData: [],
    enabled: !!projectId,
  });

  // ---------------------------------------------------------------------------
  // WEBSOCKET EVENTS
  // ---------------------------------------------------------------------------

  useServerSyncEvents("bookmark", {
    onCreate: () => {
      log.debug("Bookmark created event received");
      refetch();
    },
    onUpdate: () => {
      log.debug("Bookmark updated event received");
      refetch();
    },
    onDelete: () => {
      log.debug("Bookmark deleted event received");
      refetch();
    },
  });

  // ---------------------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------------------

  const { mutate: createBookmark, isLoading: isCreating } = useAsyncMutation(
    async ({ name, ...bookmarkOptions }) => {
      const response = await fetch(
        `${apiBase}/projects/${projectId}/bookmarks`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            name,
            description: bookmarkOptions.description,
            scope: bookmarkOptions.scope || "personal",
            workspace_id: bookmarkOptions.workspace_id,
            dataset_id: bookmarkOptions.dataset_id,
            view_config_id: bookmarkOptions.view_config_id,
            camera_state: bookmarkOptions.camera_state,
            filter_ids: bookmarkOptions.filter_ids || [],
            tags: bookmarkOptions.tags || [],
            is_pinned: bookmarkOptions.is_pinned || false,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to create bookmark: ${response.status}`
        );
      }

      const data = await response.json();
      log.info(`Bookmark created: ${data.bookmark.id}`);
      return data.bookmark;
    },
    { onSuccess: refetch }
  );

  const { mutate: updateBookmark, isLoading: isUpdating } = useAsyncMutation(
    async ({ id, updates }) => {
      const response = await fetch(
        `${apiBase}/projects/${projectId}/bookmarks/${id}`,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to update bookmark: ${response.status}`
        );
      }

      const data = await response.json();
      log.info(`Bookmark updated: ${id}`);
      return data.bookmark;
    },
    { onSuccess: refetch }
  );

  const { mutate: deleteBookmark, isLoading: isDeleting } = useAsyncMutation(
    async (id) => {
      const response = await fetch(
        `${apiBase}/projects/${projectId}/bookmarks/${id}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to delete bookmark: ${response.status}`
        );
      }

      log.info(`Bookmark deleted: ${id}`);
      return { id };
    },
    { onSuccess: refetch }
  );

  const { mutate: uploadThumbnail } = useAsyncMutation(
    async ({ id, imageBlob }) => {
      const formData = new FormData();
      formData.append("thumbnail", imageBlob, "thumbnail.jpg");

      const response = await fetch(
        `${apiBase}/projects/${projectId}/bookmarks/${id}/thumbnail`,
        {
          method: "POST",
          headers: {
            "x-user-id":
              sessionManager.getUserId?.() ||
              "00000000-0000-0000-0000-000000000001",
            "x-user-email":
              sessionManager.getUserEmail?.() || "demo@cia-web.local",
            "x-user-name": sessionManager.getUserName?.() || "Demo User",
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to upload thumbnail: ${response.status}`
        );
      }

      log.info(`Thumbnail uploaded for bookmark: ${id}`);
      return response.json();
    },
    { onSuccess: refetch }
  );

  // ---------------------------------------------------------------------------
  // HELPER ACTIONS
  // ---------------------------------------------------------------------------

  const togglePin = useCallback(
    (id) => {
      const bookmark = bookmarks.find((b) => b.id === id);
      if (!bookmark) throw new Error("Bookmark not found");
      return updateBookmark({ id, updates: { is_pinned: !bookmark.isPinned } });
    },
    [bookmarks, updateBookmark]
  );

  const navigateToBookmark = useCallback(
    (id) => {
      const bookmark = bookmarks.find((b) => b.id === id);
      if (!bookmark) {
        log.warn(`Bookmark not found: ${id}`);
        return null;
      }

      // Dispatch event for other components to handle navigation
      window.dispatchEvent(
        new CustomEvent("cia:bookmark-navigate", {
          detail: {
            bookmarkId: id,
            cameraState: bookmark.cameraState,
            filterIds: bookmark.filterIds,
            datasetId: bookmark.datasetId,
            viewConfigId: bookmark.viewConfigId,
          },
        })
      );

      return bookmark;
    },
    [bookmarks]
  );

  const getThumbnailUrl = useCallback(
    (id) => {
      if (!projectId) return null;
      return `${apiBase}/projects/${projectId}/bookmarks/${id}/thumbnail`;
    },
    [projectId, apiBase]
  );

  // ---------------------------------------------------------------------------
  // COMPUTED
  // ---------------------------------------------------------------------------

  const groupedBookmarks = useMemo(
    () => ({
      personal: bookmarks.filter((b) => b.scope === "personal"),
      workspace: bookmarks.filter((b) => b.scope === "workspace"),
      project: bookmarks.filter((b) => b.scope === "project"),
    }),
    [bookmarks]
  );

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Data
    bookmarks,
    groupedBookmarks,
    isLoading,
    error,
    projectId,

    // Mutation states
    isCreating,
    isUpdating,
    isDeleting,

    // Actions
    createBookmark,
    updateBookmark,
    deleteBookmark,
    togglePin,
    uploadThumbnail,
    navigateToBookmark,
    getThumbnailUrl,
    refetch,
  };
}

export default useBookmarks;
