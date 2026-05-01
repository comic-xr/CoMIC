// src/core/data/models/ViewConfiguration.js
// v2.0: Server-authoritative - View IDs must come from server
//
// ARCHITECTURAL PRINCIPLES:
// 1. Views are SERVER-AUTHORITATIVE - server generates IDs for auditing
// 2. Views are INDEPENDENT by default - duplication creates a new entity
// 3. Properties can be SELECTIVELY LINKED - camera, cursors, filters, widgets independently
// 4. Links can DEGRADE GRACEFULLY - broken links preserve state, allow recovery
// 5. BROADCAST mode gives source full control, FOLLOW mode allows selective sync
// 6. Full AUDIT TRAIL - track forks, links, merges, permission changes
// 7. SNAPSHOTS for named save points
// 8. PRESETS for reusable property configurations
// 9. PRESENCE tracking for viewer awareness
//
// FUTURE: WorkspaceLayout will have its own annotation layer for cross-view notes

import { AnnotationDisplayConfig } from "@Core/data/models/Annotation.js";

// Ephemeral ID generator for view-local items (filters, widgets, snapshots)
// These don't need server IDs as they're stored within the view config JSON
function generateEphemeralId(prefix = "item") {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}_${timestamp}_${random}`;
}

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export const LINK_MODES = Object.freeze({
  NONE: "none", // Not linked (independent)
  FOLLOW: "follow", // One-way: this view follows source (read from source)
  BIDIRECTIONAL: "bidirectional", // Two-way: changes propagate both directions
  BROADCAST: "broadcast", // Source controls everything, followers are read-only
});

export const LINK_STATUS = Object.freeze({
  ACTIVE: "active", // Link is working normally
  BROKEN: "broken", // Source became inaccessible (private, deleted, etc.)
  PAUSED: "paused", // User temporarily paused sync
  PENDING: "pending", // Waiting for source to accept (future: link requests)
});

export const VIEW_VISIBILITY = Object.freeze({
  PRIVATE: "private", // Only owner can see
  GROUP: "group", // All members of the project/group
  SPECIFIC: "specific", // Specific users only (invite-based)
  PUBLIC: "public", // Anyone with link (future)
});

export const BROADCAST_STATE = Object.freeze({
  OFF: "off", // Not broadcasting
  ACTIVE: "active", // Currently broadcasting
  PAUSED: "paused", // Broadcast paused (followers see last state)
});

export const LINKABLE_PROPERTIES = Object.freeze([
  "camera",
  "cursors",
  "filters",
  "widgets",
  "annotationDisplay",
  "colorMaps",
]);

// =============================================================================
// LINK CONFIGURATION CLASS
// Represents a single link to another view for a specific property
// =============================================================================

export class LinkConfiguration {
  constructor(config = {}) {
    // Target view information
    this.targetViewId = config.targetViewId;
    this.targetServerId = config.targetServerId || null;
    this.targetViewName = config.targetViewName || null;
    this.targetOwnerName = config.targetOwnerName || null;

    // Link behavior
    this.mode = config.mode || LINK_MODES.FOLLOW;
    this.status = config.status || LINK_STATUS.ACTIVE;
    this.statusReason = config.statusReason || null;
    this.statusChangedAt = config.statusChangedAt || null;

    // Timestamps
    this.linkedAt = config.linkedAt || Date.now();
    this.lastSyncAt = config.lastSyncAt || null;

    // State snapshot (captured when link breaks, for recovery)
    this.snapshotAtBreak = config.snapshotAtBreak || null;
  }

  isActive() {
    return this.status === LINK_STATUS.ACTIVE;
  }
  isBroken() {
    return this.status === LINK_STATUS.BROKEN;
  }
  isPaused() {
    return this.status === LINK_STATUS.PAUSED;
  }

  markBroken(reason, currentValue = null) {
    this.status = LINK_STATUS.BROKEN;
    this.statusReason = reason;
    this.statusChangedAt = Date.now();
    if (currentValue !== null) {
      this.snapshotAtBreak = JSON.parse(JSON.stringify(currentValue));
    }
  }

  restore() {
    this.status = LINK_STATUS.ACTIVE;
    this.statusReason = "restored";
    this.statusChangedAt = Date.now();
    this.snapshotAtBreak = null;
  }

  pause() {
    this.status = LINK_STATUS.PAUSED;
    this.statusReason = "user_paused";
    this.statusChangedAt = Date.now();
  }

  resume() {
    this.status = LINK_STATUS.ACTIVE;
    this.statusReason = "user_resumed";
    this.statusChangedAt = Date.now();
  }

  updateLastSync() {
    this.lastSyncAt = Date.now();
  }

  toJSON() {
    return {
      targetViewId: this.targetViewId,
      targetServerId: this.targetServerId,
      targetViewName: this.targetViewName,
      targetOwnerName: this.targetOwnerName,
      mode: this.mode,
      status: this.status,
      statusReason: this.statusReason,
      statusChangedAt: this.statusChangedAt,
      linkedAt: this.linkedAt,
      lastSyncAt: this.lastSyncAt,
      snapshotAtBreak: this.snapshotAtBreak,
    };
  }

  static fromJSON(data) {
    return data ? new LinkConfiguration(data) : null;
  }
}

// =============================================================================
// VIEW SNAPSHOT CLASS
// Named save points for view state
// =============================================================================

export class ViewSnapshot {
  constructor(config = {}) {
    this.id = config.id || ViewSnapshot._generateId();
    this.viewId = config.viewId;
    this.name = config.name || `Snapshot ${new Date().toLocaleString()}`;
    this.description = config.description || "";

    this.createdBy = config.createdBy;
    this.createdByName = config.createdByName;
    this.createdAt = config.createdAt || Date.now();

    // Full state capture
    this.state = config.state || {};

    // Metadata
    this.isAutoSave = config.isAutoSave || false;
    this.restoredFrom = config.restoredFrom || null;
    this.tags = config.tags || [];

    // Extended metadata (for VR snapshots, etc.)
    this.metadata = config.metadata || {};
  }

  static fromView(view, options = {}) {
    return new ViewSnapshot({
      viewId: view.id,
      name: options.name,
      description: options.description,
      createdBy: options.userId,
      createdByName: options.userName,
      isAutoSave: options.isAutoSave || false,
      tags: options.tags || [],
      metadata: options.metadata || {},
      state: {
        camera: JSON.parse(JSON.stringify(view.camera)),
        filters: JSON.parse(JSON.stringify(view.filters)),
        widgets: JSON.parse(JSON.stringify(view.widgets)),
        colorMaps: JSON.parse(JSON.stringify(view.colorMaps)),
        annotationDisplay: JSON.parse(JSON.stringify(view.annotationDisplay)),
        cursorConfig: JSON.parse(JSON.stringify(view.cursorConfig)),
        vrHints: JSON.parse(JSON.stringify(view.vrHints)),
      },
    });
  }

  applyTo(view) {
    for (const [prop, value] of Object.entries(this.state)) {
      if (view[prop] !== undefined) {
        view[prop] = JSON.parse(JSON.stringify(value));
      }
    }
    view.updatedAt = Date.now();
  }

  static _generateId() {
    return generateEphemeralId("snapshot");
  }

  toJSON() {
    return {
      id: this.id,
      viewId: this.viewId,
      name: this.name,
      description: this.description,
      createdBy: this.createdBy,
      createdByName: this.createdByName,
      createdAt: this.createdAt,
      state: this.state,
      isAutoSave: this.isAutoSave,
      restoredFrom: this.restoredFrom,
      tags: this.tags,
      metadata: this.metadata,
    };
  }

  static fromJSON(data) {
    return data ? new ViewSnapshot(data) : null;
  }
}

// =============================================================================
// MERGE SOURCE TRACKING
// Tracks when a view was created by merging properties from multiple sources
// =============================================================================

export class MergeSource {
  constructor(config = {}) {
    this.viewId = config.viewId;
    this.serverId = config.serverId;
    this.viewName = config.viewName;
    this.ownerUserId = config.ownerUserId;
    this.ownerUserName = config.ownerUserName;
    this.properties = config.properties || []; // Which properties came from this source
    this.timestamp = config.timestamp || Date.now();
  }

  toJSON() {
    return { ...this };
  }

  static fromJSON(data) {
    return data ? new MergeSource(data) : null;
  }
}

// =============================================================================
// VIEW CONFIGURATION CLASS
// =============================================================================

export class ViewConfiguration {
  constructor(config = {}) {
    // =========================================================================
    // IDENTIFICATION
    // =========================================================================

    // ID MUST come from server (server-authoritative architecture)
    if (!config.id) {
      throw new Error("ViewConfiguration requires server-provided ID");
    }
    this.id = config.id; // Server-generated UUID

    this.datasetId = config.datasetId;
    this.name = config.name || "Untitled View";
    this.description = config.description || "";

    // =========================================================================
    // OWNERSHIP & SHARING
    // =========================================================================

    this.ownerUserId = config.ownerUserId || null;
    this.ownerUserName = config.ownerUserName || null;
    this.visibility = config.visibility || VIEW_VISIBILITY.PRIVATE;
    this.sharedWith = config.sharedWith || [];
    // Array of { userId, userName, role, canEdit, canDuplicate, addedAt }
    this.groupId = config.groupId || null;
    this.projectId = config.projectId || null;

    // =========================================================================
    // LINEAGE TRACKING (Audit Trail)
    // =========================================================================

    // Fork origin
    this.forkedFrom = config.forkedFrom || null;
    // Structure: { viewId, serverId, viewName, ownerUserId, ownerUserName, timestamp, reason }
    this.forkCount = config.forkCount || 0;

    // Merge origins (when created by merging others)
    this.mergedFrom = config.mergedFrom
      ? config.mergedFrom.map((m) => MergeSource.fromJSON(m))
      : null;

    // =========================================================================
    // BROADCAST CONFIGURATION (Source-side)
    // =========================================================================

    this.broadcast = config.broadcast || {
      state: BROADCAST_STATE.OFF,
      startedAt: null,
      followerCount: 0,
      allowDuplication: false,
      allowChat: true,
      allowAnnotations: false,
    };

    // =========================================================================
    // FOLLOWING CONFIGURATION (Follower-side)
    // =========================================================================

    this.following = config.following || null;
    // Structure when following: {
    //   sourceViewId, sourceServerId, sourceViewName, sourceOwnerName,
    //   startedAt, autoLeaveOnSourceEnd, syncCursor, syncAnnotations
    // }

    // =========================================================================
    // VISUALIZATION STATE
    // =========================================================================
    // These are TYPE-AGNOSTIC containers. The InstanceTypeHandler is responsible
    // for interpreting and providing defaults for these values.
    // ViewConfiguration stores them but doesn't understand their structure.

    this.camera = config.camera || null; // Handler provides default
    this.filters = config.filters || [];
    this.widgets = config.widgets || [];
    this.colorMaps = config.colorMaps || null; // Handler provides default
    this.cursorConfig = config.cursorConfig || {
      showOtherUsers: true,
      cursorStyle: "crosshair",
      showCursorTrails: false,
    };
    this.annotationDisplay =
      config.annotationDisplay instanceof AnnotationDisplayConfig
        ? config.annotationDisplay
        : new AnnotationDisplayConfig(config.annotationDisplay || {});

    // =========================================================================
    // VR RENDERING HINTS
    // These are preferences for VR rendering, NOT synced state
    // =========================================================================

    this.vrHints = config.vrHints || {
      vrScale: 1.0, // Default scale for VR
      vrOrigin: [0, 0, 0], // Default origin in data coords
      explorationMode: "fly", // Default exploration mode
      lastToolId: null, // Last used VR tool
      toolSettings: {}, // Per-tool settings
    };

    // =========================================================================
    // SELECTIVE LINKING
    // =========================================================================

    this.links = {
      camera: config.links?.camera
        ? LinkConfiguration.fromJSON(config.links.camera)
        : null,
      cursors: config.links?.cursors
        ? LinkConfiguration.fromJSON(config.links.cursors)
        : null,
      filters: config.links?.filters
        ? LinkConfiguration.fromJSON(config.links.filters)
        : null,
      widgets: config.links?.widgets
        ? LinkConfiguration.fromJSON(config.links.widgets)
        : null,
      annotationDisplay: config.links?.annotationDisplay
        ? LinkConfiguration.fromJSON(config.links.annotationDisplay)
        : null,
      colorMaps: config.links?.colorMaps
        ? LinkConfiguration.fromJSON(config.links.colorMaps)
        : null,
    };

    // =========================================================================
    // PRESENCE (Runtime only, not persisted)
    // =========================================================================

    this.presence = config.presence || {
      viewers: [], // [{ userId, userName, cursorPosition, lastActivity }]
      lastUpdate: null,
    };

    // =========================================================================
    // SNAPSHOTS
    // =========================================================================

    this.snapshots = config.snapshots
      ? config.snapshots.map((s) => ViewSnapshot.fromJSON(s))
      : [];
    this.maxSnapshots = config.maxSnapshots || 50;

    // =========================================================================
    // APPLIED PRESETS
    // =========================================================================

    this.appliedPresets = config.appliedPresets || [];
    // [{ presetId, presetName, appliedAt, appliedBy, properties }]

    // =========================================================================
    // LIFECYCLE
    // =========================================================================

    this.status = config.status || "active";
    this.activeInstanceCount = config.activeInstanceCount || 0;
    this.createdAt = config.createdAt || Date.now();
    this.updatedAt = config.updatedAt || Date.now();
    this.lastActiveTimestamp = config.lastActiveTimestamp || Date.now();
    this.savedByUser = config.savedByUser || false;
    this.lastSyncedToServer = config.lastSyncedToServer || null;
    this.serverVersion = config.serverVersion || 0;
    this.pendingServerSync = config.pendingServerSync || false;

    // =========================================================================
    // AUDIT LOG
    // =========================================================================

    this.auditLog = config.auditLog || [];
  }

  // ===========================================================================
  // LINKING METHODS
  // ===========================================================================

  linkProperty(property, targetView, mode = LINK_MODES.FOLLOW) {
    if (!LINKABLE_PROPERTIES.includes(property)) {
      throw new Error(`Cannot link unknown property: ${property}`);
    }

    const linkConfig = new LinkConfiguration({
      targetViewId: targetView.id,
      targetServerId: targetView.serverId,
      targetViewName: targetView.name,
      targetOwnerName: targetView.ownerUserName,
      mode,
    });

    this.links[property] = linkConfig;
    this._logAudit("link_created", {
      property,
      targetViewId: targetView.id,
      mode,
    });
    this.updatedAt = Date.now();

    return linkConfig;
  }

  unlinkProperty(property) {
    if (this.links[property]) {
      const targetViewId = this.links[property].targetViewId;
      this.links[property] = null;
      this._logAudit("link_removed", { property, targetViewId });
      this.updatedAt = Date.now();
    }
  }

  unlinkAll() {
    for (const property of LINKABLE_PROPERTIES) {
      this.links[property] = null;
    }
    this._logAudit("all_links_removed", {});
    this.updatedAt = Date.now();
  }

  isPropertyLinked(property) {
    return this.links[property]?.isActive() || false;
  }

  getActiveLinks() {
    const active = {};
    for (const property of LINKABLE_PROPERTIES) {
      if (this.links[property]?.isActive()) {
        active[property] = this.links[property];
      }
    }
    return active;
  }

  getBrokenLinks() {
    const broken = {};
    for (const property of LINKABLE_PROPERTIES) {
      if (this.links[property]?.isBroken()) {
        broken[property] = this.links[property];
      }
    }
    return broken;
  }

  handleLinkTargetLost(targetViewId, reason) {
    let affected = [];
    for (const property of LINKABLE_PROPERTIES) {
      const link = this.links[property];
      if (link && link.targetViewId === targetViewId) {
        link.markBroken(reason, this[property]);
        affected.push(property);
      }
    }
    if (affected.length > 0) {
      this._logAudit("links_broken", {
        targetViewId,
        reason,
        properties: affected,
      });
      this.updatedAt = Date.now();
    }
  }

  handleLinkTargetRestored(targetViewId) {
    let affected = [];
    for (const property of LINKABLE_PROPERTIES) {
      const link = this.links[property];
      if (link && link.targetViewId === targetViewId && link.isBroken()) {
        link.restore();
        affected.push(property);
      }
    }
    if (affected.length > 0) {
      this._logAudit("links_restored", { targetViewId, properties: affected });
      this.updatedAt = Date.now();
    }
  }

  pauseLink(property) {
    const link = this.links[property];
    if (link && link.isActive()) {
      link.pause();
      this._logAudit("link_paused", {
        property,
        targetViewId: link.targetViewId,
      });
      this.updatedAt = Date.now();
    }
  }

  resumeLink(property) {
    const link = this.links[property];
    if (link && link.isPaused()) {
      link.resume();
      this._logAudit("link_resumed", {
        property,
        targetViewId: link.targetViewId,
      });
      this.updatedAt = Date.now();
    }
  }

  // ===========================================================================
  // BROADCAST METHODS (Source-side)
  // ===========================================================================

  startBroadcast(options = {}) {
    this.broadcast = {
      state: BROADCAST_STATE.ACTIVE,
      startedAt: Date.now(),
      followerCount: 0,
      allowDuplication: options.allowDuplication || false,
      allowChat: options.allowChat !== false,
      allowAnnotations: options.allowAnnotations || false,
    };
    this._logAudit("broadcast_started", { options });
    this.updatedAt = Date.now();
  }

  stopBroadcast() {
    const followerCount = this.broadcast.followerCount;
    this.broadcast = {
      state: BROADCAST_STATE.OFF,
      startedAt: null,
      followerCount: 0,
      allowDuplication: false,
      allowChat: true,
      allowAnnotations: false,
    };
    this._logAudit("broadcast_stopped", { followerCount });
    this.updatedAt = Date.now();
  }

  pauseBroadcast() {
    this.broadcast.state = BROADCAST_STATE.PAUSED;
    this._logAudit("broadcast_paused", {});
    this.updatedAt = Date.now();
  }

  resumeBroadcast() {
    this.broadcast.state = BROADCAST_STATE.ACTIVE;
    this._logAudit("broadcast_resumed", {});
    this.updatedAt = Date.now();
  }

  isBroadcasting() {
    return this.broadcast.state === BROADCAST_STATE.ACTIVE;
  }

  incrementFollowerCount() {
    this.broadcast.followerCount++;
    this.updatedAt = Date.now();
  }

  decrementFollowerCount() {
    this.broadcast.followerCount = Math.max(
      0,
      this.broadcast.followerCount - 1
    );
    this.updatedAt = Date.now();
  }

  // ===========================================================================
  // FOLLOWING METHODS (Follower-side)
  // ===========================================================================

  startFollowing(sourceView, options = {}) {
    this.following = {
      sourceViewId: sourceView.id,
      sourceServerId: sourceView.serverId,
      sourceViewName: sourceView.name,
      sourceOwnerName: sourceView.ownerUserName,
      startedAt: Date.now(),
      autoLeaveOnSourceEnd: options.autoLeaveOnSourceEnd !== false,
      syncCursor: options.syncCursor !== false,
      syncAnnotations: options.syncAnnotations || false,
    };
    this._logAudit("following_started", { sourceViewId: sourceView.id });
    this.updatedAt = Date.now();
  }

  stopFollowing() {
    const sourceViewId = this.following?.sourceViewId;
    this.following = null;
    this._logAudit("following_stopped", { sourceViewId });
    this.updatedAt = Date.now();
  }

  isFollowing() {
    return this.following !== null;
  }

  // ===========================================================================
  // SNAPSHOT METHODS
  // ===========================================================================

  createSnapshot(options = {}) {
    const snapshot = ViewSnapshot.fromView(this, options);
    this.snapshots.push(snapshot);

    // Limit snapshot count
    while (this.snapshots.length > this.maxSnapshots) {
      const removed = this.snapshots.shift();
      this._logAudit("snapshot_auto_removed", { snapshotId: removed.id });
    }

    this._logAudit("snapshot_created", {
      snapshotId: snapshot.id,
      name: snapshot.name,
    });
    this.updatedAt = Date.now();
    return snapshot;
  }

  restoreSnapshot(snapshotId) {
    const snapshot = this.snapshots.find((s) => s.id === snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    // Auto-save current state before restore
    this.createSnapshot({
      name: `Auto-save before restore`,
      isAutoSave: true,
    });

    snapshot.applyTo(this);
    this._logAudit("snapshot_restored", { snapshotId, name: snapshot.name });
    this.updatedAt = Date.now();
  }

  deleteSnapshot(snapshotId) {
    const index = this.snapshots.findIndex((s) => s.id === snapshotId);
    if (index !== -1) {
      const removed = this.snapshots.splice(index, 1)[0];
      this._logAudit("snapshot_deleted", { snapshotId, name: removed.name });
      this.updatedAt = Date.now();
    }
  }

  // ===========================================================================
  // VR SNAPSHOT METHODS
  // ===========================================================================

  /**
   * Create a VR-specific snapshot with VR context metadata
   * @param {Object} options - Snapshot options
   * @param {Object} options.vrSession - VR exploration session
   * @param {string} options.name - Snapshot name
   * @param {string} options.userId - User ID
   * @param {string} options.userName - User name
   */
  createVRSnapshot(options = {}) {
    const { vrSession, name, userId, userName } = options;

    return this.createSnapshot({
      name: name || `VR: ${new Date().toLocaleTimeString()}`,
      userId,
      userName,
      metadata: {
        isVRSnapshot: true,
        vrSessionId: vrSession?.id,
        vrContext: {
          vrScale: this.vrHints.vrScale,
          vrOrigin: this.vrHints.vrOrigin,
          explorationMode: this.vrHints.explorationMode,
          activeTools: vrSession?.activeTools || [],
          participantCount: vrSession?.participants?.length || 1,
        },
      },
    });
  }

  /**
   * Get all VR snapshots
   */
  getVRSnapshots() {
    return this.snapshots.filter((s) => s.metadata?.isVRSnapshot);
  }

  /**
   * Get snapshots from a specific VR session
   * @param {string} vrSessionId - VR session ID
   */
  getSessionSnapshots(vrSessionId) {
    return this.snapshots.filter((s) => s.metadata?.vrSessionId === vrSessionId);
  }

  /**
   * Update VR hints
   * @param {Object} updates - Fields to update
   */
  updateVRHints(updates) {
    this.vrHints = { ...this.vrHints, ...updates };
    this.updatedAt = Date.now();
  }

  // ===========================================================================
  // FORKING / DUPLICATION
  // ===========================================================================

  fork(newOwnerId, newOwnerName, options = {}) {
    const forkedView = new ViewConfiguration({
      datasetId: this.datasetId,
      name: options.name || `${this.name} (copy)`,
      description: options.description || this.description,
      ownerUserId: newOwnerId,
      ownerUserName: newOwnerName,
      visibility: VIEW_VISIBILITY.PRIVATE,
      projectId: options.projectId || this.projectId,

      // Deep copy visualization state
      camera: JSON.parse(JSON.stringify(this.camera)),
      filters: JSON.parse(JSON.stringify(this.filters)),
      widgets: JSON.parse(JSON.stringify(this.widgets)),
      colorMaps: JSON.parse(JSON.stringify(this.colorMaps)),
      cursorConfig: JSON.parse(JSON.stringify(this.cursorConfig)),
      annotationDisplay: new AnnotationDisplayConfig(
        JSON.parse(JSON.stringify(this.annotationDisplay))
      ),

      // Track lineage
      forkedFrom: {
        viewId: this.id,
        serverId: this.serverId,
        viewName: this.name,
        ownerUserId: this.ownerUserId,
        ownerUserName: this.ownerUserName,
        timestamp: Date.now(),
        reason: options.reason || "user_fork",
      },
    });

    // Increment fork count on source
    this.forkCount++;
    this._logAudit("view_forked", {
      forkedViewId: forkedView.id,
      forkedByUserId: newOwnerId,
    });
    this.updatedAt = Date.now();

    return forkedView;
  }

  // ===========================================================================
  // PROPERTY UPDATES
  // ===========================================================================

  updateCamera(cameraState) {
    this.camera = { ...this.camera, ...cameraState };
    this.lastActiveTimestamp = Date.now();
    this.updatedAt = Date.now();
  }

  addFilter(filter) {
    const id = filter.id || this._generateId();
    this.filters.push({ ...filter, id });
    this._logAudit("filter_added", { filterId: id, type: filter.type });
    this.updatedAt = Date.now();
    return id;
  }

  updateFilter(filterId, updates) {
    const filter = this.filters.find((f) => f.id === filterId);
    if (filter) {
      Object.assign(filter, updates);
      this._logAudit("filter_updated", { filterId });
      this.updatedAt = Date.now();
    }
  }

  removeFilter(filterId) {
    const index = this.filters.findIndex((f) => f.id === filterId);
    if (index !== -1) {
      this.filters.splice(index, 1);
      this._logAudit("filter_removed", { filterId });
      this.updatedAt = Date.now();
    }
  }

  addWidget(widget) {
    const id = widget.id || this._generateId();
    this.widgets.push({ ...widget, id });
    this._logAudit("widget_added", { widgetId: id, type: widget.type });
    this.updatedAt = Date.now();
    return id;
  }

  updateWidget(widgetId, updates) {
    const widget = this.widgets.find((w) => w.id === widgetId);
    if (widget) {
      Object.assign(widget, updates);
      this._logAudit("widget_updated", { widgetId });
      this.updatedAt = Date.now();
    }
  }

  removeWidget(widgetId) {
    const index = this.widgets.findIndex((w) => w.id === widgetId);
    if (index !== -1) {
      this.widgets.splice(index, 1);
      this._logAudit("widget_removed", { widgetId });
      this.updatedAt = Date.now();
    }
  }

  updateAnnotationDisplay(updates) {
    Object.assign(this.annotationDisplay, updates);
    this._logAudit("annotation_display_updated", {
      updates: Object.keys(updates),
    });
    this.updatedAt = Date.now();
  }

  // ===========================================================================
  // SHARING & VISIBILITY
  // ===========================================================================

  share(userId, userName, options = {}) {
    const existingIndex = this.sharedWith.findIndex((s) => s.userId === userId);

    const shareEntry = {
      userId,
      userName,
      role: options.role || "viewer",
      canEdit: options.canEdit || false,
      canDuplicate: options.canDuplicate !== false,
      addedAt: Date.now(),
    };

    if (existingIndex !== -1) {
      this.sharedWith[existingIndex] = shareEntry;
    } else {
      this.sharedWith.push(shareEntry);
    }

    this._logAudit("view_shared", { userId, role: shareEntry.role });
    this.updatedAt = Date.now();
  }

  unshare(userId) {
    const index = this.sharedWith.findIndex((s) => s.userId === userId);
    if (index !== -1) {
      this.sharedWith.splice(index, 1);
      this._logAudit("view_unshared", { userId });
      this.updatedAt = Date.now();
    }
  }

  setVisibility(visibility) {
    const oldVisibility = this.visibility;
    this.visibility = visibility;
    this._logAudit("visibility_changed", {
      from: oldVisibility,
      to: visibility,
    });
    this.updatedAt = Date.now();
  }

  // ===========================================================================
  // LIFECYCLE & RESOURCE MANAGEMENT
  // ===========================================================================

  activate() {
    // Don't activate trashed or archived views - they must be restored first
    if (this.status === "trashed" || this.status === "archived") {
      return false;
    }
    this.status = "active";
    this.activeInstanceCount++;
    this.lastActiveTimestamp = Date.now();
    this.updatedAt = Date.now();
    return true;
  }

  deactivate() {
    this.activeInstanceCount = Math.max(0, this.activeInstanceCount - 1);
    if (this.activeInstanceCount === 0) {
      // Only change to inactive if not already trashed or archived
      // This prevents async cleanup from overwriting trashed/archived status
      if (this.status !== "trashed" && this.status !== "archived") {
        this.status = "inactive";
      }
    }
    this.updatedAt = Date.now();
  }

  archive() {
    this.status = "archived";
    this._logAudit("view_archived", {});
    this.updatedAt = Date.now();
  }

  unarchive() {
    this.status = "inactive";
    this._logAudit("view_unarchived", {});
    this.updatedAt = Date.now();
  }

  isActive() {
    return this.status === "active" && this.activeInstanceCount > 0;
  }

  isCleanupCandidate(inactiveThresholdMs = 10 * 60 * 1000) {
    if (this.savedByUser) return false;
    if (this.status === "active") return false;
    if (this.forkCount > 0) return false;
    if (this.sharedWith.length > 0) return false;
    const timeSinceActive = Date.now() - this.lastActiveTimestamp;
    return timeSinceActive > inactiveThresholdMs;
  }

  // ===========================================================================
  // PRESENCE METHODS (Runtime only)
  // ===========================================================================

  updatePresence(userId, userName, cursorPosition) {
    const existing = this.presence.viewers.find((v) => v.userId === userId);
    const viewerData = {
      userId,
      userName,
      cursorPosition,
      lastActivity: Date.now(),
    };

    if (existing) {
      Object.assign(existing, viewerData);
    } else {
      this.presence.viewers.push(viewerData);
    }
    this.presence.lastUpdate = Date.now();
  }

  removePresence(userId) {
    this.presence.viewers = this.presence.viewers.filter(
      (v) => v.userId !== userId
    );
    this.presence.lastUpdate = Date.now();
  }

  cleanupStalePresence(staleThresholdMs = 30000) {
    const now = Date.now();
    this.presence.viewers = this.presence.viewers.filter(
      (v) => now - v.lastActivity < staleThresholdMs
    );
    this.presence.lastUpdate = now;
  }

  // ===========================================================================
  // AUDIT LOGGING
  // ===========================================================================

  _logAudit(action, details = {}) {
    this.auditLog.push({
      timestamp: Date.now(),
      action,
      details,
      userId: this.ownerUserId,
    });

    // Keep audit log manageable
    if (this.auditLog.length > 100) {
      this.auditLog = this.auditLog.slice(-100);
    }
  }

  // ===========================================================================
  // SERIALIZATION
  // ===========================================================================

  toJSON() {
    return {
      id: this.id,
      serverId: this.serverId,
      datasetId: this.datasetId,
      name: this.name,
      description: this.description,

      ownerUserId: this.ownerUserId,
      ownerUserName: this.ownerUserName,
      visibility: this.visibility,
      sharedWith: this.sharedWith,
      groupId: this.groupId,
      projectId: this.projectId,

      forkedFrom: this.forkedFrom,
      forkCount: this.forkCount,
      mergedFrom: this.mergedFrom?.map((m) => m.toJSON()) || null,

      broadcast: this.broadcast,
      following: this.following,

      camera: this.camera,
      filters: this.filters,
      widgets: this.widgets,
      colorMaps: this.colorMaps,
      cursorConfig: this.cursorConfig,
      annotationDisplay:
        this.annotationDisplay instanceof AnnotationDisplayConfig
          ? this.annotationDisplay.toJSON()
          : this.annotationDisplay,

      vrHints: this.vrHints,

      links: {
        camera: this.links.camera?.toJSON() || null,
        cursors: this.links.cursors?.toJSON() || null,
        filters: this.links.filters?.toJSON() || null,
        widgets: this.links.widgets?.toJSON() || null,
        annotationDisplay: this.links.annotationDisplay?.toJSON() || null,
        colorMaps: this.links.colorMaps?.toJSON() || null,
      },

      // Don't persist presence - it's runtime only

      snapshots: this.snapshots.map((s) => s.toJSON()),
      maxSnapshots: this.maxSnapshots,

      appliedPresets: this.appliedPresets,

      status: this.status,
      activeInstanceCount: this.activeInstanceCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastActiveTimestamp: this.lastActiveTimestamp,
      savedByUser: this.savedByUser,
      lastSyncedToServer: this.lastSyncedToServer,
      serverVersion: this.serverVersion,
      pendingServerSync: this.pendingServerSync,

      auditLog: this.auditLog,
    };
  }

  static fromJSON(data) {
    return new ViewConfiguration({
      ...data,
      annotationDisplay:
        data.annotationDisplay instanceof AnnotationDisplayConfig
          ? data.annotationDisplay
          : AnnotationDisplayConfig.fromJSON
          ? AnnotationDisplayConfig.fromJSON(data.annotationDisplay)
          : new AnnotationDisplayConfig(data.annotationDisplay),
      snapshots: data.snapshots?.map((s) => ViewSnapshot.fromJSON(s)) || [],
      mergedFrom: data.mergedFrom?.map((m) => MergeSource.fromJSON(m)) || null,
    });
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  // Generate ephemeral IDs for view-local items (filters, widgets)
  // These are stored within the view config JSON, not as separate server entities
  _generateId(prefix = "item") {
    return generateEphemeralId(prefix);
  }

  // NOTE: No default camera/colorMaps here!
  // These are type-specific and should come from the InstanceTypeHandler.
  // ViewConfiguration stores them but doesn't define defaults.
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================
/*
// Create a new view for a dataset
const view = new ViewConfiguration({
  datasetId: dataset.id,
  name: 'Primary Analysis',
  ownerUserId: currentUser.id,
  ownerUserName: currentUser.name,
  projectId: currentProject.id,
});

// Link camera to another user's view (follow mode)
view.linkProperty('camera', colleagueView, LINK_MODES.FOLLOW);

// Link filters bidirectionally (both can edit)
view.linkProperty('filters', colleagueView, LINK_MODES.BIDIRECTIONAL);

// Start broadcasting this view to followers
view.startBroadcast({ allowChat: true, allowAnnotations: false });

// Fork someone's view to create your own copy
const myFork = sharedView.fork(currentUser.id, currentUser.name, {
  name: 'My Analysis',
  reason: 'user_fork',
});

// Create a named snapshot before making changes
view.createSnapshot({
  name: 'Before threshold adjustment',
  userId: currentUser.id,
  userName: currentUser.name,
});

// Restore to a previous snapshot
view.restoreSnapshot(snapshotId);

// Share with a colleague
view.share(colleagueId, colleagueName, { 
  role: 'editor', 
  canEdit: true,
  canDuplicate: true,
});

// Check for broken links after a source view was deleted
const brokenLinks = view.getBrokenLinks();
if (Object.keys(brokenLinks).length > 0) {
  // UI can show "Link broken" indicators
  // User can choose to unlink or wait for restoration
}
*/
