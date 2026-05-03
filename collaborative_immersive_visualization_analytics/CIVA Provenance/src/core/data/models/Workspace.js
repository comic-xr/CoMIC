// src/core/data/models/Workspace.js
// Workspace model for canvas hierarchy
//
// Workspace types:
// - Personal: Private canvas for individual user
// - Breakout: Temporary shared canvas for small group work
// - Project: Persistent shared canvas for team collaboration

import { generateId } from "@Utils/idGenerator.js";

/**
 * Workspace types enum
 */
export const WorkspaceType = {
  PERSONAL: "personal",
  BREAKOUT: "breakout",
  PROJECT: "project",
};

/**
 * Workspace permission levels
 */
export const WorkspacePermission = {
  OWNER: "owner",
  EDITOR: "editor",
  VIEWER: "viewer",
};

/**
 * Workspace - Container for one or more canvases
 */
export class Workspace {
  constructor(data = {}) {
    // Server-authoritative ID
    this.id = data.id || null;
    this.localId = data.localId || generateId("workspace");
    this.isPending = !data.id;

    // Workspace info
    this.name = data.name || "Untitled Workspace";
    this.description = data.description || "";
    this.type = data.type || WorkspaceType.PERSONAL;

    // Hierarchy
    this.parentId = data.parentId || null; // For nested workspaces
    this.projectId = data.projectId ?? data.project_id ?? null; // Parent project if breakout
    this.roomId = data.roomId ?? data.room_id ?? null; // Room association for breakout workspaces

    // Ownership
    this.ownerId = data.ownerId ?? data.owner_id ?? null;
    this.createdBy = data.createdBy ?? data.created_by ?? null;
    this.createdAt = data.createdAt ?? data.created_at ?? new Date().toISOString();
    this.updatedAt = data.updatedAt ?? data.updated_at ?? new Date().toISOString();

    // Members (for shared workspaces)
    this.members = data.members || []; // Array of { userId, permission, joinedAt }

    // Canvas IDs in this workspace
    this.canvasIds = data.canvasIds ?? data.canvas_ids ?? [];
    this.activeCanvasId = data.activeCanvasId ?? data.active_canvas_id ?? null;

    // State
    this.isArchived = data.isArchived ?? data.is_archived ?? false;
    this.archivedAt = data.archivedAt ?? data.archived_at ?? null;

    // Breakout-specific
    this.expiresAt = data.expiresAt ?? data.expires_at ?? null; // For temporary breakouts
    this.autoMerge = data.autoMerge ?? data.auto_merge ?? false; // Merge back to project on close
  }

  /**
   * Check if user has permission
   */
  hasPermission(userId, requiredPermission) {
    if (this.ownerId === userId) return true;

    const member = this.members.find((m) => m.userId === userId);
    if (!member) return false;

    const levels = {
      [WorkspacePermission.OWNER]: 3,
      [WorkspacePermission.EDITOR]: 2,
      [WorkspacePermission.VIEWER]: 1,
    };

    return levels[member.permission] >= levels[requiredPermission];
  }

  /**
   * Check if workspace is personal
   */
  isPersonal() {
    return this.type === WorkspaceType.PERSONAL;
  }

  /**
   * Check if workspace is a breakout room
   */
  isBreakout() {
    return this.type === WorkspaceType.BREAKOUT;
  }

  /**
   * Check if workspace is a project
   */
  isProject() {
    return this.type === WorkspaceType.PROJECT;
  }

  /**
   * Check if breakout has expired
   */
  isExpired() {
    if (!this.expiresAt) return false;
    return new Date(this.expiresAt) < new Date();
  }

  /**
   * Add a member
   */
  addMember(userId, permission = WorkspacePermission.VIEWER) {
    if (this.members.some((m) => m.userId === userId)) return;

    this.members.push({
      userId,
      permission,
      joinedAt: new Date().toISOString(),
    });
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Remove a member
   */
  removeMember(userId) {
    this.members = this.members.filter((m) => m.userId !== userId);
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Update member permission
   */
  setMemberPermission(userId, permission) {
    const member = this.members.find((m) => m.userId === userId);
    if (member) {
      member.permission = permission;
      this.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Add a canvas
   */
  addCanvas(canvasId) {
    if (!this.canvasIds.includes(canvasId)) {
      this.canvasIds.push(canvasId);
      if (!this.activeCanvasId) {
        this.activeCanvasId = canvasId;
      }
      this.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Remove a canvas
   */
  removeCanvas(canvasId) {
    this.canvasIds = this.canvasIds.filter((id) => id !== canvasId);
    if (this.activeCanvasId === canvasId) {
      this.activeCanvasId = this.canvasIds[0] || null;
    }
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Archive the workspace
   */
  archive() {
    this.isArchived = true;
    this.archivedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Unarchive the workspace
   */
  unarchive() {
    this.isArchived = false;
    this.archivedAt = null;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Confirm with server-assigned ID
   */
  confirmWithServerId(serverId) {
    this.id = serverId;
    this.isPending = false;
  }

  /**
   * Get the effective ID
   */
  getEffectiveId() {
    return this.id || this.localId;
  }

  /**
   * Serialize for storage
   */
  toJSON() {
    return {
      id: this.id,
      localId: this.localId,
      isPending: this.isPending,
      name: this.name,
      description: this.description,
      type: this.type,
      parentId: this.parentId,
      projectId: this.projectId,
      roomId: this.roomId,
      ownerId: this.ownerId,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      members: this.members,
      canvasIds: this.canvasIds,
      activeCanvasId: this.activeCanvasId,
      isArchived: this.isArchived,
      archivedAt: this.archivedAt,
      expiresAt: this.expiresAt,
      autoMerge: this.autoMerge,
    };
  }

  /**
   * Serialize for sending to server (snake_case format)
   */
  toServerJSON() {
    return {
      id: this.id,
      local_id: this.localId,
      name: this.name,
      description: this.description,
      type: this.type,
      parent_id: this.parentId,
      project_id: this.projectId,
      room_id: this.roomId,
      owner_id: this.ownerId,
      expires_at: this.expiresAt,
      auto_merge: this.autoMerge,
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(json) {
    return new Workspace(json);
  }

  /**
   * Create a personal workspace
   */
  static createPersonal(userId, name = "My Workspace") {
    return new Workspace({
      name,
      type: WorkspaceType.PERSONAL,
      ownerId: userId,
      createdBy: userId,
    });
  }

  /**
   * Create a breakout from a project
   * @param {string} projectId
   * @param {string} name
   * @param {string} creatorId
   * @param {number} expiresInHours
   * @param {string} roomId - Optional room to associate with
   */
  static createBreakout(
    projectId,
    name,
    creatorId,
    expiresInHours = 2,
    roomId = null
  ) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    return new Workspace({
      name,
      type: WorkspaceType.BREAKOUT,
      projectId,
      roomId,
      ownerId: creatorId,
      createdBy: creatorId,
      expiresAt: expiresAt.toISOString(),
      autoMerge: true,
    });
  }

  /**
   * Create a project workspace
   */
  static createProject(name, creatorId, description = "") {
    return new Workspace({
      name,
      description,
      type: WorkspaceType.PROJECT,
      ownerId: creatorId,
      createdBy: creatorId,
    });
  }
}

export default Workspace;
