// src/ui/react/__mocks__/hooks/useWorkspaces.mock.js
// Mock implementation of useWorkspaces for Storybook
//
// Workspaces are organizational containers for views and instances.
// Actions log to console for visibility in Storybook.

import { useState, useCallback, useMemo } from "react";
import { MOCK_WORKSPACES } from "../data/workspaces.mock.js";
import { MOCK_USERS } from "../data/users.mock.js";

/**
 * Mock implementation of useWorkspaces hook
 *
 * @returns {Object} Workspace data and actions
 */
export function useMockWorkspaces() {
  const [workspaces, setWorkspaces] = useState(MOCK_WORKSPACES);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("ws-personal");

  // Get active workspace
  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId),
    [workspaces, activeWorkspaceId]
  );

  // Group workspaces by type
  const groupedWorkspaces = useMemo(() => {
    return {
      personal: workspaces.filter((w) => w.type === "personal"),
      shared: workspaces.filter((w) => w.type === "shared"),
      project: workspaces.filter((w) => w.type === "project"),
    };
  }, [workspaces]);

  // Create workspace
  const createWorkspace = useCallback(async (data) => {
    console.log("[Mock useWorkspaces] createWorkspace:", data);

    const newWorkspace = {
      id: `ws-${Date.now()}`,
      name: data.name || "New Workspace",
      description: data.description || "",
      type: data.type || "personal",
      color: data.color || "#60a5fa",
      members: data.type === "personal" ? [MOCK_USERS.current] : [],
      viewCount: 0,
      instanceCount: 0,
      isDefault: false,
      createdBy: MOCK_USERS.current,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setWorkspaces((prev) => [...prev, newWorkspace]);
    return newWorkspace;
  }, []);

  // Update workspace
  const updateWorkspace = useCallback(async (workspaceId, updates) => {
    console.log("[Mock useWorkspaces] updateWorkspace:", {
      workspaceId,
      updates,
    });

    setWorkspaces((prev) =>
      prev.map((w) =>
        w.id === workspaceId
          ? { ...w, ...updates, updatedAt: new Date().toISOString() }
          : w
      )
    );
    return { success: true };
  }, []);

  // Delete workspace
  const deleteWorkspace = useCallback(
    async (workspaceId) => {
      console.log("[Mock useWorkspaces] deleteWorkspace:", workspaceId);

      // Prevent deleting default workspace
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (workspace?.isDefault) {
        console.warn("Cannot delete default workspace");
        return { success: false, error: "Cannot delete default workspace" };
      }

      setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));

      // Switch to personal if deleting active workspace
      if (workspaceId === activeWorkspaceId) {
        setActiveWorkspaceId("ws-personal");
      }

      return { success: true };
    },
    [workspaces, activeWorkspaceId]
  );

  // Switch active workspace
  const switchWorkspace = useCallback((workspaceId) => {
    console.log("[Mock useWorkspaces] switchWorkspace:", workspaceId);
    setActiveWorkspaceId(workspaceId);
  }, []);

  // Add member to workspace
  const addMember = useCallback(async (workspaceId, userId) => {
    console.log("[Mock useWorkspaces] addMember:", { workspaceId, userId });

    setWorkspaces((prev) =>
      prev.map((w) => {
        if (w.id !== workspaceId) return w;
        const newMember = Object.values(MOCK_USERS).find(
          (u) => u.id === userId
        );
        if (!newMember || w.members.some((m) => m.id === userId)) return w;
        return { ...w, members: [...w.members, newMember] };
      })
    );
    return { success: true };
  }, []);

  // Remove member from workspace
  const removeMember = useCallback(async (workspaceId, userId) => {
    console.log("[Mock useWorkspaces] removeMember:", { workspaceId, userId });

    setWorkspaces((prev) =>
      prev.map((w) =>
        w.id === workspaceId
          ? { ...w, members: w.members.filter((m) => m.id !== userId) }
          : w
      )
    );
    return { success: true };
  }, []);

  return {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    groupedWorkspaces,
    isLoading: false,
    error: null,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    switchWorkspace,
    addMember,
    removeMember,
  };
}
