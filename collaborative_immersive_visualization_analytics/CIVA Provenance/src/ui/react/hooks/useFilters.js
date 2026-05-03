// src/ui/react/hooks/useFilters.js
// Hook for managing saved filters
//
// REFACTORED: Uses useAsyncData and useWebSocketEvents
// Before: ~200 lines | After: ~120 lines

import { useCallback, useMemo } from "react";
import { sessionManager } from "@Core/session/sessionManager.js";
import { config } from "@Core/config/clientConfig.js";
import { api as log } from "@Utils/logger.js";

import { useAsyncData, useAsyncMutation } from "./useAsyncData";
import { useServerSyncEvents } from "./useWebSocketEvents";

/**
 * Hook for managing saved filters
 *
 * @param {Object} options
 * @param {string} options.projectId - Override project ID (defaults to current session)
 * @param {string} options.scope - Filter scope: 'personal' | 'workspace' | 'project' | 'all'
 * @param {string} options.workspaceId - Workspace ID (required if scope='workspace')
 * @returns {Object} Filters data and actions
 */
export function useFilters(options = {}) {
  const {
    projectId: overrideProjectId,
    scope = "all",
    workspaceId = null,
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
  // FETCH FILTERS
  // ---------------------------------------------------------------------------

  const fetchFilters = useCallback(
    async (signal) => {
      if (!projectId) return [];

      const params = new URLSearchParams();
      params.append("projectId", projectId);
      if (scope !== "all") params.append("scope", scope);
      if (workspaceId) params.append("workspaceId", workspaceId);

      const response = await fetch(`${apiBase}/filters?${params}`, {
        signal,
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch filters: ${response.status}`);
      }

      const data = await response.json();
      return data.filters || [];
    },
    [apiBase, projectId, scope, workspaceId, getHeaders]
  );

  const {
    data: filters,
    isLoading,
    error,
    refetch,
  } = useAsyncData(fetchFilters, [projectId, scope, workspaceId], {
    initialData: [],
    enabled: !!projectId,
  });

  // ---------------------------------------------------------------------------
  // WEBSOCKET EVENTS
  // ---------------------------------------------------------------------------

  useServerSyncEvents("filter", {
    onCreate: () => {
      log.debug("Filter created event received");
      refetch();
    },
    onUpdate: () => {
      log.debug("Filter updated event received");
      refetch();
    },
    onDelete: () => {
      log.debug("Filter deleted event received");
      refetch();
    },
  });

  // ---------------------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------------------

  const { mutate: createFilter, isLoading: isCreating } = useAsyncMutation(
    async (filterData) => {
      const response = await fetch(`${apiBase}/filters`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          ...filterData,
          projectId,
          createdBy: sessionManager.getUserId?.(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to create filter: ${response.status}`
        );
      }

      return response.json();
    },
    { onSuccess: refetch }
  );

  const { mutate: updateFilter, isLoading: isUpdating } = useAsyncMutation(
    async ({ id, updates }) => {
      const response = await fetch(`${apiBase}/filters/${id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to update filter: ${response.status}`
        );
      }

      return response.json();
    },
    { onSuccess: refetch }
  );

  const { mutate: deleteFilter, isLoading: isDeleting } = useAsyncMutation(
    async (id) => {
      const response = await fetch(`${apiBase}/filters/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to delete filter: ${response.status}`
        );
      }

      return { id };
    },
    { onSuccess: refetch }
  );

  // ---------------------------------------------------------------------------
  // HELPER ACTIONS
  // ---------------------------------------------------------------------------

  const togglePin = useCallback(
    (id, currentPinned) => {
      return updateFilter({ id, updates: { isPinned: !currentPinned } });
    },
    [updateFilter]
  );

  const applyFilter = useCallback(
    (id) => {
      const filter = filters.find((f) => f.id === id);
      if (!filter) {
        log.warn(`Filter not found: ${id}`);
        return null;
      }
      return filter.filterConfig;
    },
    [filters]
  );

  // ---------------------------------------------------------------------------
  // COMPUTED
  // ---------------------------------------------------------------------------

  const groupedFilters = useMemo(
    () => ({
      personal: filters.filter((f) => f.scope === "personal"),
      workspace: filters.filter((f) => f.scope === "workspace"),
      project: filters.filter((f) => f.scope === "project"),
    }),
    [filters]
  );

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Data
    filters,
    groupedFilters,
    isLoading,
    error,
    projectId,

    // Mutation states
    isCreating,
    isUpdating,
    isDeleting,

    // Actions
    createFilter,
    updateFilter,
    deleteFilter,
    togglePin,
    applyFilter,
    refetch,
  };
}

export default useFilters;
