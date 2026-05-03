// src/core/data/managers/WorkspaceManager.js
// Manager for workspace hierarchy
//
// Handles workspace CRUD, membership, and hierarchy operations

import {
  Workspace,
  WorkspaceType,
  WorkspacePermission,
} from "../models/Workspace.js";
import { workspace as log } from "@Utils/logger.js";
import { config } from "@Core/config/clientConfig.js";
import { authService } from "@Services/authService.js";

/**
 * WorkspaceManager - Manages workspace hierarchy
 */
class WorkspaceManagerClass {
  constructor() {
    this._apiBaseUrl = config.apiBaseUrl || "http://localhost:3001/api";
    this._sessionManager = null;

    // Storage
    this.workspaces = new Map(); // id -> Workspace
    this.pendingByLocalId = new Map(); // localId -> Workspace

    // Index by type
    this.personalWorkspaces = new Map(); // userId -> Set<workspaceId>
    this.projectWorkspaces = new Set(); // workspaceIds
    this.breakoutWorkspaces = new Map(); // projectId -> Set<workspaceId>

    // Current state
    this.activeWorkspaceId = null;

    this.listeners = new Set();
  }

  /**
   * Initialize manager with shared config
   */
  initialize(options = {}) {
    if (options.apiBaseUrl) this._apiBaseUrl = options.apiBaseUrl;
    if (options.sessionManager) this._sessionManager = options.sessionManager;
    log.debug("Workspace data manager initialized");
  }

  /**
   * Subscribe to workspace changes
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners
   */
  notify(event, data) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (err) {
        log.error("WorkspaceManager listener error:", err);
      }
    });
  }

  async _fetch(endpoint, options = {}) {
    const url = `${this._apiBaseUrl}${endpoint}`;
    const headers = await authService.buildRequestHeaders({
      "Content-Type": "application/json",
      ...options.headers,
    });

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = new Error(`API error: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return response;
  }

  _resetCaches() {
    this.workspaces.clear();
    this.pendingByLocalId.clear();
    this.personalWorkspaces.clear();
    this.projectWorkspaces.clear();
    this.breakoutWorkspaces.clear();
    this.activeWorkspaceId = null;
  }

  _normalizeWorkspaceData(data = {}) {
    if (!data) return null;
    return {
      id: data.id,
      localId: data.local_id || data.localId,
      name: data.name,
      description: data.description,
      type: data.type,
      parentId: data.parent_id || data.parentId,
      projectId: data.project_id || data.projectId,
      roomId: data.room_id || data.roomId,
      ownerId: data.owner_id || data.ownerId,
      createdBy: data.created_by || data.createdBy,
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt,
      isArchived: data.is_archived ?? data.isArchived ?? false,
      archivedAt: data.archived_at || data.archivedAt,
      expiresAt: data.expires_at || data.expiresAt,
      autoMerge: data.auto_merge ?? data.autoMerge ?? false,
      members: (data.members || []).map((member) => ({
        userId: member.user_id || member.userId,
        permission: member.permission,
        joinedAt: member.joined_at || member.joinedAt,
      })),
      canvasIds: data.canvas_ids || data.canvasIds || [],
      activeCanvasId: data.active_canvas_id || data.activeCanvasId || null,
    };
  }

  _upsertWorkspace(workspace) {
    if (!workspace) return null;
    const id = workspace.getEffectiveId();
    this.workspaces.set(id, workspace);
    if (workspace.isPending) {
      this.pendingByLocalId.set(workspace.localId, workspace);
    }
    this._indexWorkspace(workspace);
    return workspace;
  }

  // ============ WORKSPACE CRUD ============

  /**
   * Create a new workspace
   */
  async createWorkspace(data) {
    try {
      const payload = {
        name: data?.name,
        description: data?.description,
        type: data?.type,
        project_id: data?.projectId || data?.project_id || null,
        room_id: data?.roomId || data?.room_id || null,
        expires_at: data?.expiresAt || data?.expires_at || null,
        auto_merge: data?.autoMerge ?? data?.auto_merge ?? false,
      };
      log.debug("WorkspaceManager.createWorkspace payload:", payload);
      const response = await this._fetch("/workspaces", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const serverData = await response.json();
      log.debug("WorkspaceManager.createWorkspace response:", serverData);
      const workspace = new Workspace(this._normalizeWorkspaceData(serverData));
      this._upsertWorkspace(workspace);
      this.notify("workspace:created", { workspace, pending: false });
      return workspace;
    } catch (err) {
      log.error("Failed to create workspace on server:", err);
      const workspace = new Workspace(data);
      this.workspaces.set(workspace.localId, workspace);
      this.pendingByLocalId.set(workspace.localId, workspace);
      this._indexWorkspace(workspace);
      this.notify("workspace:created", { workspace, pending: true });
      return workspace;
    }
  }

  /**
   * Create personal workspace for user
   */
  async createPersonalWorkspace(userId, name = "My Workspace", options = {}) {
    const {
      allowMultiple = false,
      projectId = null,
      roomId = null,
    } = options || {};

    if (!allowMultiple) {
      const existing = this.getPersonalWorkspace(userId);
      if (existing) return existing;
    }

    try {
      if (!allowMultiple) {
        const params = new URLSearchParams();
        if (projectId) params.set("project_id", projectId);
        const response = await this._fetch(
          `/workspaces/personal${params.toString() ? `?${params.toString()}` : ""}`
        );
        const serverData = await response.json();
        const workspace = new Workspace(this._normalizeWorkspaceData(serverData));
        this._upsertWorkspace(workspace);
        this.notify("workspace:created", { workspace, pending: false });
        return workspace;
      }

      const workspace = await this.createWorkspace({
        name,
        type: WorkspaceType.PERSONAL,
        projectId,
        roomId,
      });
      return workspace;
    } catch (err) {
      log.error("Failed to load personal workspace from server:", err);
      const workspace = Workspace.createPersonal(userId, name);
      workspace.projectId = projectId || null;
      workspace.roomId = roomId || null;
      return this.createWorkspace(workspace.toJSON());
    }
  }

  /**
   * Create project workspace
   */
  async createProjectWorkspace(name, description = "", projectId = null, roomId = null) {
    return this.createWorkspace({
      name,
      description,
      type: WorkspaceType.PROJECT,
      projectId: projectId || null,
      roomId: roomId || null,
    });
  }

  /**
   * Create breakout from project
   */
  async createBreakout(
    projectId,
    name,
    userId,
    expiresInHours = 2,
    roomId = null
  ) {
    try {
      const response = await this._fetch(`/workspaces/${projectId}/breakout`, {
        method: "POST",
        body: JSON.stringify({
          name,
          expires_hours: expiresInHours,
          room_id: roomId,
        }),
      });
      const serverData = await response.json();
      const workspace = new Workspace(this._normalizeWorkspaceData(serverData));
      this._upsertWorkspace(workspace);
      this.notify("workspace:created", { workspace, pending: false });
      return workspace;
    } catch (err) {
      log.error("Failed to create breakout on server:", err);
      const breakout = Workspace.createBreakout(
        projectId,
        name,
        userId,
        expiresInHours,
        roomId
      );
      return this.createWorkspace(breakout.toJSON());
    }
  }

  /**
   * Get workspace by ID
   */
  getWorkspace(id) {
    return this.workspaces.get(id) || null;
  }

  /**
   * Get personal workspace for user
   */
  getPersonalWorkspaces(userId) {
    const ids = this.personalWorkspaces.get(userId);
    if (!ids || ids.size === 0) return [];
    const workspaces = Array.from(ids)
      .map((id) => this.getWorkspace(id))
      .filter(Boolean);

    const normalizeName = (value) => (value || "").trim().toLowerCase();
    const hasPrimaryName = (ws) =>
      normalizeName(ws.name) === "my workspace";

    return workspaces.sort((a, b) => {
      const aPrimary = hasPrimaryName(a);
      const bPrimary = hasPrimaryName(b);
      if (aPrimary !== bPrimary) return aPrimary ? -1 : 1;
      const aCreated = new Date(a.createdAt || 0).getTime();
      const bCreated = new Date(b.createdAt || 0).getTime();
      return aCreated - bCreated;
    });
  }

  /**
   * Get primary personal workspace for user
   */
  getPersonalWorkspace(userId) {
    return this.getPersonalWorkspaces(userId)[0] || null;
  }

  /**
   * Get all project workspaces
   */
  getProjectWorkspaces() {
    return Array.from(this.projectWorkspaces)
      .map((id) => this.workspaces.get(id))
      .filter(Boolean);
  }

  /**
   * Get breakouts for a project
   */
  getBreakoutsForProject(projectId) {
    const ids = this.breakoutWorkspaces.get(projectId) || new Set();
    return Array.from(ids)
      .map((id) => this.workspaces.get(id))
      .filter(Boolean)
      .filter((w) => !w.isExpired());
  }

  /**
   * Update a workspace
   */
  async updateWorkspace(id, updates) {
    const workspace = this.getWorkspace(id);
    if (!workspace) return null;
    try {
      const payload = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.roomId !== undefined || updates.room_id !== undefined) {
        payload.room_id = updates.roomId ?? updates.room_id;
      }
      if (updates.canvasIds !== undefined || updates.canvas_ids !== undefined) {
        payload.canvas_ids = updates.canvasIds ?? updates.canvas_ids;
      }
      if (updates.activeCanvasId !== undefined || updates.active_canvas_id !== undefined) {
        payload.active_canvas_id = updates.activeCanvasId ?? updates.active_canvas_id;
      }
      const response = await this._fetch(`/workspaces/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const serverData = await response.json();
      const normalized = this._normalizeWorkspaceData({
        ...serverData,
        canvas_ids: workspace.canvasIds,
        active_canvas_id: workspace.activeCanvasId,
      });
      const updatedWorkspace = new Workspace(normalized);
      Object.assign(updatedWorkspace, updates);
      this._unindexWorkspace(workspace, workspace.type);
      this._upsertWorkspace(updatedWorkspace);
      this.notify("workspace:updated", { workspace: updatedWorkspace });
      return updatedWorkspace;
    } catch (err) {
      log.error("Failed to update workspace on server:", err);
      const oldType = workspace.type;
      Object.assign(workspace, updates);
      workspace.updatedAt = new Date().toISOString();

      if (updates.type && updates.type !== oldType) {
        this._unindexWorkspace(workspace, oldType);
        this._indexWorkspace(workspace);
      }

      this.notify("workspace:updated", { workspace });
      return workspace;
    }
  }

  /**
   * Delete a workspace
   */
  async deleteWorkspace(id) {
    const workspace = this.getWorkspace(id);
    if (!workspace) return false;
    try {
      await this._fetch(`/workspaces/${id}`, { method: "DELETE" });
    } catch (err) {
      log.error("Failed to delete workspace on server:", err);
    }

    this._unindexWorkspace(workspace, workspace.type);
    this.workspaces.delete(id);

    if (workspace.isPending) {
      this.pendingByLocalId.delete(workspace.localId);
    }

    if (this.activeWorkspaceId === id) {
      this.activeWorkspaceId = null;
    }

    this.notify("workspace:deleted", { id });

    return true;
  }

  /**
   * Confirm workspace with server ID
   */
  confirmWorkspace(localId, serverId) {
    const workspace = this.pendingByLocalId.get(localId);
    if (!workspace) return null;

    workspace.confirmWithServerId(serverId);

    this.workspaces.delete(localId);
    this.workspaces.set(serverId, workspace);

    // Re-index with server ID
    this._unindexWorkspace(workspace, workspace.type, localId);
    this._indexWorkspace(workspace);

    this.pendingByLocalId.delete(localId);
    this.notify("workspace:confirmed", { workspace, serverId });

    return workspace;
  }

  // ============ MEMBERSHIP ============

  /**
   * Add member to workspace
   */
  async addMember(
    workspaceId,
    userId,
    permission = WorkspacePermission.VIEWER
  ) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return null;

    workspace.addMember(userId, permission);

    // TODO: Sync to server
    this.notify("workspace:member-added", { workspace, userId, permission });

    return workspace;
  }

  /**
   * Remove member from workspace
   */
  async removeMember(workspaceId, userId) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return null;

    workspace.removeMember(userId);

    // TODO: Sync to server
    this.notify("workspace:member-removed", { workspace, userId });

    return workspace;
  }

  /**
   * Update member permission
   */
  async setMemberPermission(workspaceId, userId, permission) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return null;

    workspace.setMemberPermission(userId, permission);

    // TODO: Sync to server
    this.notify("workspace:member-updated", { workspace, userId, permission });

    return workspace;
  }

  // ============ ACTIVE WORKSPACE ============

  /**
   * Set active workspace
   */
  setActiveWorkspace(id) {
    const workspace = this.getWorkspace(id);
    if (!workspace) return null;

    this.activeWorkspaceId = id;
    this.notify("workspace:activated", { workspace });

    return workspace;
  }

  /**
   * Clear active workspace
   */
  clearActiveWorkspace() {
    this.activeWorkspaceId = null;
    this.notify("workspace:activated", { workspace: null });
  }

  /**
   * Get active workspace
   */
  getActiveWorkspace() {
    return this.activeWorkspaceId
      ? this.getWorkspace(this.activeWorkspaceId)
      : null;
  }

  // ============ CANVAS MANAGEMENT ============

  /**
   * Add canvas to workspace
   */
  async addCanvasToWorkspace(workspaceId, canvasId) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return null;

    workspace.addCanvas(canvasId);

    await this.updateWorkspace(workspaceId, {
      canvasIds: workspace.canvasIds,
      activeCanvasId: workspace.activeCanvasId,
    });
    this.notify("workspace:canvas-added", { workspace, canvasId });

    return workspace;
  }

  /**
   * Remove canvas from workspace
   */
  async removeCanvasFromWorkspace(workspaceId, canvasId) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return null;

    workspace.removeCanvas(canvasId);

    await this.updateWorkspace(workspaceId, {
      canvasIds: workspace.canvasIds,
      activeCanvasId: workspace.activeCanvasId,
    });
    this.notify("workspace:canvas-removed", { workspace, canvasId });

    return workspace;
  }

  // ============ BREAKOUT OPERATIONS ============

  /**
   * Merge breakout back to project
   */
  async mergeBreakoutToProject(breakoutId) {
    const breakout = this.getWorkspace(breakoutId);
    if (!breakout || !breakout.isBreakout()) return null;

    const project = this.getWorkspace(breakout.projectId);
    if (!project) return null;

    // Copy canvases to project
    for (const canvasId of breakout.canvasIds) {
      project.addCanvas(canvasId);
    }

    // Archive the breakout
    breakout.archive();

    // TODO: Sync to server
    this.notify("workspace:breakout-merged", { breakout, project });

    return project;
  }

  /**
   * Clean up expired breakouts
   */
  cleanupExpiredBreakouts() {
    const expired = [];

    for (const [projectId, breakoutIds] of this.breakoutWorkspaces) {
      for (const breakoutId of breakoutIds) {
        const breakout = this.getWorkspace(breakoutId);
        if (breakout?.isExpired() && !breakout.isArchived) {
          if (breakout.autoMerge) {
            this.mergeBreakoutToProject(breakoutId);
          } else {
            breakout.archive();
          }
          expired.push(breakoutId);
        }
      }
    }

    if (expired.length > 0) {
      this.notify("workspace:breakouts-expired", { expired });
    }

    return expired;
  }

  // ============ INTERNAL ============

  /**
   * Index workspace by type
   */
  _indexWorkspace(workspace) {
    const id = workspace.getEffectiveId();

    switch (workspace.type) {
      case WorkspaceType.PERSONAL:
        if (!this.personalWorkspaces.has(workspace.ownerId)) {
          this.personalWorkspaces.set(workspace.ownerId, new Set());
        }
        this.personalWorkspaces.get(workspace.ownerId).add(id);
        break;
      case WorkspaceType.PROJECT:
        this.projectWorkspaces.add(id);
        break;
      case WorkspaceType.BREAKOUT:
        if (!this.breakoutWorkspaces.has(workspace.projectId)) {
          this.breakoutWorkspaces.set(workspace.projectId, new Set());
        }
        this.breakoutWorkspaces.get(workspace.projectId).add(id);
        break;
    }
  }

  /**
   * Remove workspace from index
   */
  _unindexWorkspace(workspace, type, oldId = null) {
    const id = oldId || workspace.getEffectiveId();

    switch (type) {
      case WorkspaceType.PERSONAL:
        if (this.personalWorkspaces.has(workspace.ownerId)) {
          const ids = this.personalWorkspaces.get(workspace.ownerId);
          ids.delete(id);
          if (ids.size === 0) {
            this.personalWorkspaces.delete(workspace.ownerId);
          }
        }
        break;
      case WorkspaceType.PROJECT:
        this.projectWorkspaces.delete(id);
        break;
      case WorkspaceType.BREAKOUT:
        const breakouts = this.breakoutWorkspaces.get(workspace.projectId);
        if (breakouts) {
          breakouts.delete(id);
        }
        break;
    }
  }

  /**
   * Load workspaces from server
   */
  async loadWorkspaces(userId, projectId = null, roomId = null) {
    try {
      this._resetCaches();
      log.debug("WorkspaceManager.loadWorkspaces params:", {
        userId,
        projectId,
        roomId,
      });

      let personalWorkspace = null;
      try {
        const personalParams = new URLSearchParams();
        if (projectId) personalParams.set("project_id", projectId);
        const personalResponse = await this._fetch(
          `/workspaces/personal${personalParams.toString() ? `?${personalParams.toString()}` : ""}`
        );
        const personalData = await personalResponse.json();
        personalWorkspace = new Workspace(
          this._normalizeWorkspaceData(personalData)
        );
        this._upsertWorkspace(personalWorkspace);
      } catch (err) {
        log.debug("Personal workspace load failed:", err);
      }

      const params = new URLSearchParams();
      if (projectId) params.set("project_id", projectId);
      if (roomId) params.set("room_id", roomId);

      const response = await this._fetch(
        `/workspaces${params.toString() ? `?${params.toString()}` : ""}`
      );
      const data = await response.json();
      log.debug("WorkspaceManager.loadWorkspaces response:", data);
      let serverWorkspaces = data.workspaces || [];

      if (roomId && serverWorkspaces.length === 0) {
        try {
          const fallbackParams = new URLSearchParams();
          if (projectId) fallbackParams.set("project_id", projectId);
          const fallbackResponse = await this._fetch(
            `/workspaces${fallbackParams.toString() ? `?${fallbackParams.toString()}` : ""}`
          );
          const fallbackData = await fallbackResponse.json();
          const fallbackWorkspaces = fallbackData.workspaces || [];
          if (fallbackWorkspaces.length > 0) {
            const roomless = fallbackWorkspaces.filter((ws) => !ws.room_id && !ws.roomId);
            serverWorkspaces = roomless.length > 0 ? roomless : fallbackWorkspaces;
            await Promise.all(
              serverWorkspaces.map(async (workspace) => {
                try {
                  if (!workspace.room_id && !workspace.roomId) {
                    await this.updateWorkspace(workspace.id, { roomId });
                  }
                } catch (err) {
                  log.debug(
                    `Failed to assign room for workspace ${workspace.id}:`,
                    err
                  );
                }
              })
            );
          }
        } catch (err) {
          log.debug("Workspace fallback load failed:", err);
        }
      }

      const workspaceList = [];
      serverWorkspaces.forEach((row) => {
        const workspace = new Workspace(this._normalizeWorkspaceData(row));
        this._upsertWorkspace(workspace);
        workspaceList.push(workspace);
      });

      if (personalWorkspace && !workspaceList.find((ws) => ws.id === personalWorkspace.id)) {
        workspaceList.push(personalWorkspace);
      }

      await Promise.all(
        workspaceList.map(async (workspace) => {
          try {
            const canvasesResponse = await this._fetch(
              `/canvases?workspace_id=${workspace.id}`
            );
            const canvasesData = await canvasesResponse.json();
            const canvasIds = (canvasesData.canvases || []).map(
              (canvas) => canvas.id
            );
            workspace.canvasIds = canvasIds;
            if (!workspace.activeCanvasId && canvasIds.length > 0) {
              workspace.activeCanvasId = canvasIds[0];
              try {
                await this.updateWorkspace(workspace.id, {
                  canvasIds: workspace.canvasIds,
                  activeCanvasId: workspace.activeCanvasId,
                });
              } catch (error) {
                log.debug(
                  `Failed to persist active canvas for workspace ${workspace.id}:`,
                  error
                );
              }
            }
          } catch (err) {
            log.debug(
              `Failed to load canvases for workspace ${workspace.id}:`,
              err
            );
          }
        })
      );

      return {
        personal: personalWorkspace || this.getPersonalWorkspace(userId),
        projects: this.getProjectWorkspaces(),
        breakouts: projectId ? this.getBreakoutsForProject(projectId) : [],
      };
    } catch (err) {
      log.error("Failed to load workspaces from server:", err);
      return {
        personal: this.getPersonalWorkspace(userId),
        projects: this.getProjectWorkspaces(),
        breakouts: projectId ? this.getBreakoutsForProject(projectId) : [],
      };
    }
  }
}

// Singleton instance
export const workspaceManager = new WorkspaceManagerClass();
export default workspaceManager;
