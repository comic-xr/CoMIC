// src/ui/react/hooks/useWorkspaces.js
// Hook for managing workspace selection and state
// Connects to WorkspaceManager and provides React-friendly interface

import { useState, useEffect, useCallback, useMemo } from "react";
import { ui as log } from "@Utils/logger.js";
import { workspaceManager } from "@Core/data/managers/WorkspaceManager.js";
import { WorkspaceType } from "@Core/data/models/Workspace.js";

/**
 * Transform workspace model to UI-friendly format
 * @param {Workspace} workspace - Workspace model
 * @returns {Object} UI workspace object
 */
function transformWorkspace(workspace) {
  if (!workspace) return null;

  const typeColors = {
    [WorkspaceType.PROJECT]: "#60a5fa",
    [WorkspaceType.BREAKOUT]: "#c084fc",
    [WorkspaceType.PERSONAL]: "#34d399",
  };

  return {
    id: workspace.getEffectiveId(),
    localId: workspace.localId,
    name: workspace.name,
    description: workspace.description,
    type: workspace.type,
    color: typeColors[workspace.type] || "#60a5fa",
    ownerId: workspace.ownerId,
    roomId: workspace.roomId, // <-- ADD
    createdBy: workspace.createdBy,
    members: workspace.members,
    memberCount: workspace.members?.length || 0,
    canvasIds: workspace.canvasIds,
    activeCanvasId: workspace.activeCanvasId,
    isArchived: workspace.isArchived,
    isPending: workspace.isPending,
    expiresAt: workspace.expiresAt,
    isExpired: workspace.isExpired?.() || false,
    projectId: workspace.projectId,
  };
}

/**
 * useWorkspaces - Main hook for workspace management
 *
 * @param {Object} options
 * @param {string} options.userId - Current user ID
 * @param {string} options.projectId - Current project ID (optional)
 * @returns {Object} Workspace state and actions
 */
export function useWorkspaces({ userId, projectId, roomId } = {}) {
  // State
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const storageKey = useMemo(() => {
    if (!userId) return null;
    const scope = projectId || "default";
    const roomScope = roomId || "default";
    return `cia:last-workspace:${userId}:${scope}:${roomScope}`;
  }, [projectId, roomId, userId]);

  // Load workspaces on mount and when userId changes
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadWorkspaces = async () => {
      setIsLoading(true);
      setError(null);

      try {
        await workspaceManager.loadWorkspaces(userId, projectId, roomId);

        // Get or create personal workspace
        let personal = workspaceManager.getPersonalWorkspace(userId);
        if (!personal) {
          personal = await workspaceManager.createPersonalWorkspace(userId);
        }

        // Get all workspaces
        const allWorkspaces = [];

        // Add personal
        if (personal) {
          allWorkspaces.push(transformWorkspace(personal));
        }

        // Add project workspaces
        const projects = workspaceManager.getProjectWorkspaces();
        projects.forEach((ws) => {
          allWorkspaces.push(transformWorkspace(ws));
        });

        // Add breakouts for current project
        if (projectId) {
          const breakouts = workspaceManager.getBreakoutsForProject(projectId);
          breakouts.forEach((ws) => {
            allWorkspaces.push(transformWorkspace(ws));
          });
        }

        setWorkspaces(allWorkspaces);

        // Prefer last-used workspace if available, otherwise keep active or personal
        const activeWs = workspaceManager.getActiveWorkspace();
        const activeId = activeWs?.getEffectiveId() || null;
        let preferredId = null;

        if (storageKey) {
          try {
            preferredId = window.localStorage.getItem(storageKey);
          } catch (err) {
            log.debug("Workspace localStorage read failed:", err);
          }
        }

        const hasPreferred = preferredId && workspaceManager.getWorkspace(preferredId);
        const nextId = hasPreferred
          ? preferredId
          : activeId || personal?.getEffectiveId() || null;

        if (nextId) {
          setCurrentWorkspaceId(nextId);
          workspaceManager.setActiveWorkspace(nextId);
        }
      } catch (err) {
        log.error("Failed to load workspaces:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkspaces();
  }, [userId, projectId, roomId]);

  // Subscribe to workspace changes
  useEffect(() => {
    const handleChange = (event, data) => {
      log.debug("Workspace event:", event, data);

      // Refresh workspace list on changes
      const refreshWorkspaces = () => {
        const allWorkspaces = [];

        const personal = workspaceManager.getPersonalWorkspace(userId);
        if (personal) allWorkspaces.push(transformWorkspace(personal));

        const projects = workspaceManager.getProjectWorkspaces();
        projects.forEach((ws) => allWorkspaces.push(transformWorkspace(ws)));

        if (projectId) {
          const breakouts = workspaceManager.getBreakoutsForProject(projectId);
          breakouts.forEach((ws) => allWorkspaces.push(transformWorkspace(ws)));
        }

        setWorkspaces(allWorkspaces);
      };

      switch (event) {
        case "workspace:created":
        case "workspace:updated":
        case "workspace:deleted":
        case "workspace:confirmed":
        case "workspace:breakout-merged":
        case "workspace:canvas-added":
        case "workspace:canvas-removed":
          refreshWorkspaces();
          break;
        case "workspace:activated":
          setCurrentWorkspaceId(data.workspace?.getEffectiveId() || null);
          break;
      }
    };

    const unsubscribe = workspaceManager.subscribe(handleChange);
    return unsubscribe;
  }, [userId, projectId, roomId]);

  useEffect(() => {
    if (!storageKey || !currentWorkspaceId) return;
    try {
      window.localStorage.setItem(storageKey, currentWorkspaceId);
    } catch (err) {
      log.debug("Workspace localStorage write failed:", err);
    }
  }, [currentWorkspaceId, storageKey]);

  // Get current workspace object
  const currentWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === currentWorkspaceId) || null;
  }, [workspaces, currentWorkspaceId]);

  // Group workspaces by type
  const groupedWorkspaces = useMemo(
    () => ({
      project: workspaces.filter((w) => w.type === WorkspaceType.PROJECT),
      breakout: workspaces.filter((w) => w.type === WorkspaceType.BREAKOUT),
      personal: workspaces.filter((w) => w.type === WorkspaceType.PERSONAL),
    }),
    [workspaces]
  );

  // Actions
  const selectWorkspace = useCallback((workspaceId) => {
    const workspace = workspaceManager.getWorkspace(workspaceId);
    if (workspace) {
      workspaceManager.setActiveWorkspace(workspaceId);
      setCurrentWorkspaceId(workspaceId);
    }
  }, []);

  const clearActiveWorkspace = useCallback(() => {
    workspaceManager.clearActiveWorkspace?.();
    setCurrentWorkspaceId(null);
  }, []);

  const createBreakout = useCallback(
    async (name, expiresInHours = 2, roomId = null) => {
      if (!projectId || !userId) {
        throw new Error("Cannot create breakout: missing projectId or userId");
      }

      const breakout = await workspaceManager.createBreakout(
        projectId,
        name,
        userId,
        expiresInHours,
        roomId
      );

      return transformWorkspace(breakout);
    },
    [projectId, userId]
  );

  const createProjectWorkspace = useCallback(
    async (name, description = "") => {
      if (!userId) {
        throw new Error("Cannot create workspace: missing userId");
      }

      const project = await workspaceManager.createProjectWorkspace(
        name,
        description,
        projectId,
        roomId
      );

      return transformWorkspace(project);
    },
    [projectId, roomId, userId]
  );

  const createPersonalWorkspace = useCallback(
    async (name = "My Workspace") => {
      if (!userId) {
        throw new Error("Cannot create personal workspace: missing userId");
      }

      const personal = await workspaceManager.createPersonalWorkspace(userId, name, { projectId, roomId });
      return transformWorkspace(personal);
    },
    [userId, projectId, roomId]
  );

  const updateWorkspace = useCallback(async (workspaceId, updates = {}) => {
    const updated = await workspaceManager.updateWorkspace(workspaceId, updates);
    return transformWorkspace(updated);
  }, []);

  const deleteWorkspace = useCallback(async (workspaceId) => {
    await workspaceManager.deleteWorkspace(workspaceId);
  }, []);

  const mergeBreakout = useCallback(async (breakoutId) => {
    await workspaceManager.mergeBreakoutToProject(breakoutId);
  }, []);

  return {
    // State
    workspaces,
    currentWorkspace,
    currentWorkspaceId,
    groupedWorkspaces,
    isLoading,
    error,

    // Actions
    selectWorkspace,
    clearActiveWorkspace,
    createBreakout,
    createProjectWorkspace,
    createPersonalWorkspace,
    updateWorkspace,
    deleteWorkspace,
    mergeBreakout,
  };
}

/**
 * useWorkspacePresence - Get users in a specific workspace
 *
 * @param {string} workspaceId - Workspace ID to get presence for
 * @returns {Object} Users in the workspace
 */
export function useWorkspacePresence(workspaceId) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!workspaceId) {
      setUsers([]);
      return;
    }

    // Import dynamically to avoid circular deps
    import("@Collaboration/presence/presenceSystem.js").then(
      ({ presenceSystem }) => {
        const handlePresenceChange = (allUsers) => {
          // Filter users by workspace
          const workspaceUsers = allUsers.filter(
            (user) => user.workspaceId === workspaceId || !user.workspaceId
          );
          setUsers(workspaceUsers);
        };

        const cleanup = presenceSystem.onPresenceChange(handlePresenceChange);
        return cleanup;
      }
    );
  }, [workspaceId]);

  return {
    users,
    count: users.length,
    visibleUsers: users.slice(0, 4),
    overflowCount: Math.max(0, users.length - 4),
  };
}

export default useWorkspaces;
