// src/ui/react/hooks/useWorkspaceBar.js
// Workspace bar hooks - manages workspace selection, view modes, and presence
// Migrated from legacy SecondaryTopBar.logic.js

import { useState, useCallback, useMemo, useEffect } from "react";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";

/**
 * View mode options for the workspace layout
 */
export const VIEW_MODES = {
  NORMAL: "normal",
  ISOLATION: "isolation",
  SUBSET: "subset",
};

/**
 * Workspace types for categorization
 */
export const WORKSPACE_TYPES = {
  PROJECT: "project",
  BREAKOUT: "breakout",
  PERSONAL: "personal",
};

/**
 * useWorkspaceSelector - Manages workspace selection state
 *
 * @param {Object} options
 * @param {Array} options.workspaces - Available workspaces
 * @param {string} options.initialWorkspaceId - Initial selected workspace
 * @param {string} options.currentRoomId - Current room ID for filtering room workspaces
 * @param {string} options.currentRoomName - Current room name for display
 * @param {Function} options.onWorkspaceChange - Callback when workspace changes
 * @returns {Object} Workspace selector state and actions
 */
export function useWorkspaceSelector({
  workspaces = [],
  initialWorkspaceId = null,
  currentRoomId = null,
  currentRoomName = "Room",
  onWorkspaceChange,
} = {}) {
  const [selectedId, setSelectedId] = useState(initialWorkspaceId);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get current workspace object
  const currentWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === selectedId) || workspaces[0] || null;
  }, [workspaces, selectedId]);

  // Update presence system when workspace changes
  useEffect(() => {
    if (currentWorkspace?.id) {
      presenceSystem.setWorkspace(currentWorkspace.id);
    }
  }, [currentWorkspace?.id]);

  // Filter workspaces by search query
  const filteredWorkspaces = useMemo(() => {
    if (!searchQuery.trim()) return workspaces;
    const query = searchQuery.toLowerCase();
    return workspaces.filter((w) => w.name.toLowerCase().includes(query));
  }, [workspaces, searchQuery]);

  // Group workspaces by scope with room awareness
  const groupedWorkspaces = useMemo(() => {
    const personal = filteredWorkspaces.filter(
      (w) => w.type === WORKSPACE_TYPES.PERSONAL
    );

    const room = filteredWorkspaces.filter(
      (w) =>
        w.type === WORKSPACE_TYPES.BREAKOUT &&
        (!currentRoomId || w.roomId === currentRoomId || !w.roomId)
    );

    const project = filteredWorkspaces.filter(
      (w) => w.type === WORKSPACE_TYPES.PROJECT
    );

    return {
      personal,
      room,
      project,
      breakout: room, // Legacy alias
    };
  }, [filteredWorkspaces, currentRoomId]);

  // Select workspace handler
  const selectWorkspace = useCallback(
    (workspaceId) => {
      setSelectedId(workspaceId);
      setIsOpen(false);
      setSearchQuery("");
      onWorkspaceChange?.(workspaceId);
    },
    [onWorkspaceChange]
  );

  // Toggle dropdown
  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (!isOpen) setSearchQuery("");
  }, [isOpen]);

  // Close dropdown
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
  }, []);

  return {
    currentWorkspace,
    isOpen,
    searchQuery,
    filteredWorkspaces,
    groupedWorkspaces,
    currentRoomName,
    selectWorkspace,
    toggleDropdown,
    closeDropdown,
    setSearchQuery,
  };
}

/**
 * useViewMode - Manages the workspace view mode
 *
 * @param {Object} options
 * @param {string} options.initialMode - Initial view mode
 * @param {Function} options.onModeChange - Callback when mode changes
 * @returns {Object} View mode state and actions
 */
export function useViewMode({
  initialMode = VIEW_MODES.NORMAL,
  onModeChange,
} = {}) {
  const [viewMode, setViewMode] = useState(initialMode);

  const changeMode = useCallback(
    (mode) => {
      if (Object.values(VIEW_MODES).includes(mode)) {
        setViewMode(mode);
        onModeChange?.(mode);
      }
    },
    [onModeChange]
  );

  return {
    viewMode,
    setViewMode: changeMode,
    isNormal: viewMode === VIEW_MODES.NORMAL,
    isIsolation: viewMode === VIEW_MODES.ISOLATION,
    isSubset: viewMode === VIEW_MODES.SUBSET,
  };
}

/**
 * useWorkspacePresence - Gets users in the current workspace
 *
 * @param {string} workspaceId - Current workspace ID
 * @returns {Object} Presence state for workspace
 */
export function useWorkspacePresence(workspaceId) {
  const [users, setUsers] = useState([]);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;

    const handlePresenceUpdate = (allUsers) => {
      const workspaceUsers = allUsers.filter(
        (u) => u.workspaceId === workspaceId || !u.workspaceId
      );
      setUsers(workspaceUsers);
    };

    const cleanup = presenceSystem.onPresenceChange(handlePresenceUpdate);
    return cleanup;
  }, [workspaceId]);

  const visibleUsers = users.slice(0, 4);
  const overflowCount = Math.max(0, users.length - 4);

  return {
    users,
    visibleUsers,
    overflowCount,
    totalCount: users.length,
    isHovering,
    setIsHovering,
  };
}

/**
 * useSecondaryTopBar - Combined hook for all workspace bar state
 *
 * @param {Object} options - Configuration options
 * @returns {Object} All workspace bar state and actions
 */
export function useSecondaryTopBar({
  workspaces = [],
  initialWorkspaceId = null,
  currentRoomId = null,
  currentRoomName = "Room",
  initialViewMode = VIEW_MODES.NORMAL,
  onWorkspaceChange,
  onViewModeChange,
  onAddCell,
  onResetLayout,
  onLinkViews,
  onShare,
} = {}) {
  // Workspace selector state
  const workspaceSelector = useWorkspaceSelector({
    workspaces,
    initialWorkspaceId,
    currentRoomId,
    currentRoomName,
    onWorkspaceChange,
  });

  // View mode state
  const viewModeState = useViewMode({
    initialMode: initialViewMode,
    onModeChange: onViewModeChange,
  });

  // Presence for current workspace
  const presence = useWorkspacePresence(workspaceSelector.currentWorkspace?.id);

  // Action handlers
  const actions = useMemo(
    () => ({
      addCell: () => onAddCell?.(),
      resetLayout: () => onResetLayout?.(),
      linkViews: () => onLinkViews?.(),
      share: () => onShare?.(),
    }),
    [onAddCell, onResetLayout, onLinkViews, onShare]
  );

  return {
    workspace: workspaceSelector,
    viewMode: viewModeState,
    presence,
    actions,
  };
}
