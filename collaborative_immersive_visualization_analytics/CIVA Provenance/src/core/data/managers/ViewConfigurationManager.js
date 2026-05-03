// src/core/data/managers/ViewConfigurationManager.js
// Manages Layer 2 (ViewConfigurations) - the collaborative unit
//
// v2.0 SERVER-AUTHORITY ARCHITECTURE:
// - Server is the source of truth for view state
// - REST API for CRUD operations, WebSocket for real-time sync
// - Y.js used ONLY for presence (viewPresence map)
// - Handles linking, broadcasting, and view lifecycle

import { view as log } from "@Utils/logger.js";
import {
  ViewConfiguration,
  LINK_MODES,
  LINK_STATUS,
  LINKABLE_PROPERTIES,
} from "@Core/data/models/ViewConfiguration.js";
import {
  getUserId,
  getUserName,
} from "@Collaboration/presence/userManagement.js";
import { ydoc } from "@Collaboration/yjs/yjsSetup.js";
import { instanceTypeRegistry } from "@Core/instances/types/instanceTypeRegistry.js";
import { config } from "@Core/config/clientConfig.js";
import { sessionManager } from "@Core/session/sessionManager.js";
import { apiClient } from "@Services/apiClient.js";
import { BaseManager } from "@Core/data/managers/BaseManager.js";
import ProvenanceManager from "@Collaboration/provenance/ProvenanceManager.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";

export class ViewConfigurationManager extends BaseManager {
  constructor(config = {}) {
    super({
      events: [
        "viewCreated",
        "viewUpdated",
        "viewDeleted",
        "viewActivated",
        "viewDeactivated",
        "presenceChanged",
        "cameraChanged",
        "filterChanged",
        "annotationChanged",
      ],
      logCategory: "viewConfig",
    });

    this._viewConfigs = new Map();
    this._pendingSyncs = new Map();
    this._syncThrottleMs = config.syncThrottleMs || 100;
    this._presenceThrottleMs = config.presenceThrottleMs || 50;
    this._lastPresenceUpdate = new Map(); // viewId -> timestamp

    // Cleanup settings
    this._inactiveThresholdMs = 10 * 60 * 1000; // 10 minutes
    this._cleanupIntervalMs = 60 * 1000; // Check every minute
    this._cleanupInterval = null;

    // Track which views we're observing for link updates
    this._linkObservers = new Map(); // targetViewId -> Set of subscriberViewIds

    // Track provenance debounces for high-frequency sliders
    this._provenanceDebounceTimers = new Map();

    // Sync groups: property -> Map<hubViewId, Set<memberViewIds>>
    // Each property can have multiple independent sync groups
    // All members of a group link to the hub, hub broadcasts to all
    this._syncGroups = new Map();
    for (const prop of LINKABLE_PROPERTIES) {
      this._syncGroups.set(prop, new Map());
    }
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  initialize() {
    log.info("Initializing...");

    // Get project ID for API calls
    this._projectId =
      sessionManager.getProjectId?.() || config.defaultSessionId;

    // Start cleanup task
    this._startCleanupTask();

    // Note: Views are loaded from server via loadFromServer() called by appInitializer
    // This is async and happens after initialize() returns

    log.info(`Initialized with ${this._viewConfigs.size} views`);
  }

  /**
   * Load views from server API
   * Called by appInitializer after WebSocket is connected
   */
  async loadFromServer() {
    log.info("Loading views from server...");

    try {
      const data = await apiClient.get(
        `/views?projectId=${this._projectId}&status=active`
      );
      const serverViews = data.views || [];

      log.debug(`Found ${serverViews.length} view(s) on server`);

      let addedCount = 0;
      for (const serverView of serverViews) {
        if (this._viewConfigs.has(serverView.id)) {
          continue;
        }

        try {
          const viewData = this._serverToClientFormat(serverView);
          const view = new ViewConfiguration(viewData);
          this._viewConfigs.set(view.id, view);
          this._setupLinkObserversForView(view);
          addedCount++;
        } catch (error) {
          log.error(`Failed to load view ${serverView.id}:`, error);
        }
      }

      log.info(`Loaded ${addedCount} view(s) from server`);

      // Mark as ready and emit event
      this._isReady = true;
      this._emit("ready", { viewCount: this._viewConfigs.size });

      return serverViews.length;
    } catch (error) {
      log.error("Failed to load from server:", error);
      // Still mark ready (with 0 views) so UI doesn't hang
      this._isReady = true;
      this._emit("ready", { viewCount: 0, error: error.message });
      throw error;
    }
  }

  /**
   * Handle view broadcast from server (via WebSocket)
   * Called by serverSync when receiving view:created/updated/deleted events
   */
  handleServerBroadcast(type, data) {
    switch (type) {
      case "view:created":
        this._handleRemoteViewCreated(data.view);
        break;
      case "view:updated":
        this._handleRemoteViewUpdated(data.view);
        break;
      case "view:deleted":
        this._handleRemoteViewDeleted(data.viewId);
        break;
      default:
        log.warn(`Unknown view broadcast type: ${type}`);
    }
  }

  _handleRemoteViewCreated(serverView) {
    const viewId = serverView.id;

    // Skip if we already have it (we created it)
    if (this._viewConfigs.has(viewId)) {
      return;
    }

    log.debug(`Remote view created: ${viewId}`);

    try {
      const viewData = this._serverToClientFormat(serverView);
      const view = new ViewConfiguration(viewData);
      this._viewConfigs.set(viewId, view);
      this._setupLinkObserversForView(view);
      this._emit("viewAdded", view);
    } catch (error) {
      log.error(`Failed to add remote view ${viewId}:`, error);
    }
  }

  _handleRemoteViewUpdated(serverView) {
    const viewId = serverView.id;

    log.debug(`Remote view updated: ${viewId}`);

    try {
      const viewData = this._serverToClientFormat(serverView);
      const view = new ViewConfiguration(viewData);
      this._viewConfigs.set(viewId, view);
      this._setupLinkObserversForView(view);
      this._emit("viewUpdated", view);
      this._notifyLinkedViews(viewId, view);
    } catch (error) {
      log.error(`Failed to update remote view ${viewId}:`, error);
    }
  }

  _handleRemoteViewDeleted(viewId) {
    if (!this._viewConfigs.has(viewId)) {
      return;
    }

    log.debug(`Remote view deleted: ${viewId}`);

    this._handleLinkTargetDeleted(viewId);
    this._viewConfigs.delete(viewId);
    this._emit("viewRemoved", viewId);
  }

  /**
   * Convert server response (snake_case) to client model (camelCase)
   */
  _serverToClientFormat(serverView) {
    return {
      id: serverView.id,
      datasetId: serverView.dataset_id,
      projectId: serverView.project_id,
      name: serverView.name,
      description: serverView.description,
      ownerUserId: serverView.owner_user_id,
      ownerUserName: serverView.owner_user_name,
      visibility: serverView.visibility,
      sharedWith: serverView.shared_with || [],
      savedByUser: serverView.saved_by_user,
      camera: serverView.camera,
      filters: serverView.filters || [],
      widgets: serverView.widgets || [],
      colorMaps: serverView.color_maps,
      cursorConfig: serverView.cursor_config,
      annotationDisplay: serverView.annotation_display,
      links: serverView.links || {},
      forkedFrom: serverView.forked_from,
      forkCount: serverView.fork_count || 0,
      mergedFrom: serverView.merged_from,
      broadcast: serverView.broadcast,
      following: serverView.following,
      snapshots: serverView.snapshots || [],
      maxSnapshots: serverView.max_snapshots || 50,
      appliedPresets: serverView.applied_presets || [],
      status: serverView.status || "active",
      activeInstanceCount: serverView.active_instance_count || 0,
      lastActiveTimestamp: serverView.last_active_timestamp,
      trashedAt: serverView.trashed_at,
      trashedBy: serverView.trashed_by,
      serverVersion: serverView.server_version || 1,
      createdAt: serverView.created_at,
      updatedAt: serverView.updated_at,
    };
  }

  /**
   * Convert client model (camelCase) to server format (snake_case)
   */
  _clientToServerFormat(view) {
    return {
      dataset_id: view.datasetId,
      project_id: view.projectId || this._projectId,
      name: view.name,
      description: view.description,
      owner_user_id: view.ownerUserId,
      owner_user_name: view.ownerUserName,
      visibility: view.visibility,
      shared_with: view.sharedWith,
      saved_by_user: view.savedByUser,
      camera: view.camera,
      filters: view.filters,
      widgets: view.widgets,
      color_maps: view.colorMaps,
      cursor_config: view.cursorConfig,
      annotation_display:
        view.annotationDisplay?.toJSON?.() || view.annotationDisplay,
      links: this._serializeLinks(view.links),
      forked_from: view.forkedFrom,
      fork_count: view.forkCount,
      merged_from: view.mergedFrom?.map((m) => m.toJSON?.() || m),
      broadcast: view.broadcast,
      following: view.following,
      snapshots: view.snapshots?.map((s) => s.toJSON?.() || s),
      max_snapshots: view.maxSnapshots,
      applied_presets: view.appliedPresets,
      status: view.status,
      active_instance_count: view.activeInstanceCount,
      trashed_at: view.trashedAt,
      trashed_by: view.trashedBy,
    };
  }

  _serializeLinks(links) {
    if (!links) return {};
    const result = {};
    for (const [prop, link] of Object.entries(links)) {
      if (link) {
        result[prop] = link.toJSON?.() || link;
      }
    }
    return result;
  }

  // ===========================================================================
  // VIEW LIFECYCLE
  // ===========================================================================

  /**
   * Create a new view configuration for a dataset
   * v2.0: Creates on server first, then caches locally
   *
   * @param {string} datasetId - The dataset this view is for
   * @param {Object} viewConfig - Optional configuration overrides
   * @returns {Promise<ViewConfiguration>} The created view
   */
  async createView(datasetId, viewConfig = {}) {
    const userId = getUserId();
    const userName = getUserName();
    const resolvedProjectId =
      viewConfig.projectId
      || this._projectId
      || sessionManager.getProjectId?.()
      || sessionManager.getRoomId?.()
      || config.defaultSessionId
      || null;

    // Get default visualization state from handler if not provided
    let camera = viewConfig.camera || null;
    let colorMaps = viewConfig.colorMaps || null;

    if (camera === null || colorMaps === null) {
      const handler =
        viewConfig.handler ||
        instanceTypeRegistry.getCompatibleHandlers({
          fileType: viewConfig.fileType,
        })?.[0]?.handler;
      if (handler) {
        const defaults = handler.getDefaultViewState();
        if (camera === null) camera = defaults.camera;
        if (colorMaps === null) colorMaps = defaults.colorMaps;
      }
    }

    // Prepare request body for server (using server's expected field names)
    const requestBody = {
      fileId: datasetId, // Server expects fileId, not datasetId
      projectId: resolvedProjectId,
      name: viewConfig.name || "Untitled View",
      description: viewConfig.description || "",
      camera,
      filters: viewConfig.filters || [],
      widgets: viewConfig.widgets || [],
      colorMaps,
      annotationsVisible: viewConfig.annotationsVisible !== false,
      visibility: viewConfig.visibility || "private",
      isShared: viewConfig.isShared || false,
    };

    try {
      // Create on server first to get server-generated ID
      const { view: serverView } = await apiClient.post("/views", requestBody);

      // Convert server response to client format and create ViewConfiguration
      const viewData = this._serverToClientFormat(serverView);
      viewData.ownerUserId = userId;
      viewData.ownerUserName = userName;

      const view = new ViewConfiguration(viewData);

      // Store locally
      this._viewConfigs.set(view.id, view);

      // Set up link observers
      this._setupLinkObserversForView(view);

      // Emit event
      this._emit("viewAdded", view);

      log.info(`View created: ${view.id} for dataset ${datasetId}`);

      return view;
    } catch (error) {
      log.error(`Failed to create view for dataset ${datasetId}:`, error);
      throw error;
    }
  }

  /**
   * Duplicate an existing view configuration
   * v2.0: Creates a new view on server with copied settings
   *
   * @param {string} sourceViewId - The view to duplicate
   * @param {Object} overrides - Optional configuration overrides
   * @returns {Promise<ViewConfiguration>} The new duplicated view
   */
  async duplicateView(sourceViewId, overrides = {}) {
    const sourceView = this._viewConfigs.get(sourceViewId);
    if (!sourceView) {
      throw new Error(`Source view ${sourceViewId} not found`);
    }

    // Create new view with source settings
    const newViewConfig = {
      name: overrides.name || `${sourceView.name} (copy)`,
      description: overrides.description || sourceView.description,
      camera: overrides.camera || sourceView.camera,
      filters: overrides.filters || [...(sourceView.filters || [])],
      widgets: overrides.widgets || [...(sourceView.widgets || [])],
      colorMaps: overrides.colorMaps || sourceView.colorMaps,
      annotationsVisible:
        overrides.annotationsVisible ?? sourceView.annotationsVisible,
      visibility: overrides.visibility || "private",
      isShared: overrides.isShared || false,
      forkedFrom: {
        viewId: sourceViewId,
        viewName: sourceView.name,
        ownerUserId: sourceView.ownerUserId,
        ownerUserName: sourceView.ownerUserName,
        timestamp: Date.now(),
      },
    };

    // Use createView to handle server creation
    const newView = await this.createView(sourceView.datasetId, newViewConfig);

    log.debug(`Duplicated view ${sourceViewId} to ${newView.id}`);

    return newView;
  }

  /**
   * Get a view configuration by ID
   */
  getView(viewId) {
    return this._viewConfigs.get(viewId) || null;
  }

  /**
   * Get all view configurations for a dataset
   */
  getViewsForDataset(datasetId) {
    return Array.from(this._viewConfigs.values()).filter(
      (view) => view.datasetId === datasetId
    );
  }

  /**
   * Get all active view configurations
   */
  getActiveViews() {
    return Array.from(this._viewConfigs.values()).filter((view) =>
      view.isActive()
    );
  }

  /**
   * Get views owned by current user
   */
  getMyViews() {
    const userId = getUserId();
    return Array.from(this._viewConfigs.values()).filter(
      (view) => view.ownerUserId === userId
    );
  }

  /**
   * Get views shared with current user
   */
  getSharedWithMe() {
    const userId = getUserId();
    return Array.from(this._viewConfigs.values()).filter(
      (view) =>
        view.ownerUserId !== userId &&
        view.sharedWith.some((s) => s.userId === userId)
    );
  }

  // ===========================================================================
  // VIEW ACTIVATION TRACKING
  // ===========================================================================

  /**
   * Mark a view as active (an instance is using it)
   * Called when an InstanceViewport mounts with this view
   *
   * @param {string} viewId - The view being activated
   */
  activateView(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) {
      log.warn(`Cannot activate view ${viewId}: not found`);
      return;
    }

    view.activeInstanceCount = (view.activeInstanceCount || 0) + 1;
    view.lastActiveTimestamp = Date.now();
    view.status = "active";

    log.debug(
      `View ${viewId} activated (${view.activeInstanceCount} instance(s))`
    );

    this._syncToServer(view);
    this._emit("viewUpdated", view);
  }

  /**
   * Mark a view as no longer active (instance was closed)
   * Called when an InstanceViewport unmounts
   *
   * @param {string} viewId - The view being deactivated
   */
  deactivateView(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) {
      return; // View may have been deleted
    }

    view.activeInstanceCount = Math.max(0, (view.activeInstanceCount || 1) - 1);
    view.lastActiveTimestamp = Date.now();

    // If no instances remain, mark as inactive (but don't delete)
    if (view.activeInstanceCount === 0) {
      view.status = "inactive";
      log.debug(`View ${viewId} deactivated (no instances remaining)`);
    } else {
      log.trace(
        `View ${viewId} has ${view.activeInstanceCount} instance(s) remaining`
      );
    }

    this._syncToServer(view);
    this._emit("viewUpdated", view);
  }

  /**
   * Check if a view has any active instances
   *
   * @param {string} viewId - The view to check
   * @returns {boolean} Whether the view has active instances
   */
  isViewActive(viewId) {
    const view = this._viewConfigs.get(viewId);
    return view && view.activeInstanceCount > 0;
  }

  /**
   * Get count of active instances for a view
   *
   * @param {string} viewId - The view to check
   * @returns {number} Number of active instances
   */
  getActiveInstanceCount(viewId) {
    const view = this._viewConfigs.get(viewId);
    return view?.activeInstanceCount || 0;
  }

  /**
   * Delete a view configuration
   * v2.0: Deletes on server (archives), then removes from local cache
   *
   * @param {string} viewId - The view ID to delete
   * @returns {Promise<boolean>} Whether deletion succeeded
   */
  async deleteView(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return false;

    // Only owner can delete
    if (view.ownerUserId !== getUserId()) {
      log.warn(`Cannot delete view ${viewId}: not owner`);
      return false;
    }

    try {
      // Delete on server (archives the view)
      await apiClient.delete(`/views/${viewId}`);

      // Remove locally
      this._viewConfigs.delete(viewId);

      // Notify linked views
      this._handleLinkTargetDeleted(viewId);

      // Emit event
      this._emit("viewRemoved", viewId);

      log.info(`View deleted: ${viewId}`);

      return true;
    } catch (error) {
      log.error(`Failed to delete view ${viewId}:`, error);
      throw error;
    }
  }

  /**
   * Check if views have been loaded from server
   */
  isReady() {
    return this._isReady;
  }

  /**
   * Subscribe to ready event (fires immediately if already ready)
   */
  onReady(callback) {
    if (this._isReady) {
      callback({ viewCount: this._viewConfigs.size });
      return () => {}; // noop unsubscribe
    }

    const handler = (data) => {
      callback(data);
      // Auto-unsubscribe after first call
      this.off("ready", handler);
    };

    this.on("ready", handler);
    return () => this.off("ready", handler);
  }

  // ===========================================================================
  // STATE UPDATES
  // ===========================================================================

  /**
   * Update entire view state directly (e.g., when restoring Time Travel snapshots)
   * @param {string} viewId 
   * @param {Object} updates 
   */
  updateView(viewId, updates) {
    const view = this._viewConfigs.get(viewId);
    if (!view) {
      log.warn(`Cannot update view ${viewId}: not found`);
      return;
    }

    // Apply updates using full parsing to prevent reference leaking
    for (const [prop, value] of Object.entries(updates)) {
      if (view[prop] !== undefined && prop !== 'id') {
        view[prop] = typeof value === 'object' && value !== null
          ? JSON.parse(JSON.stringify(value))
          : value;
      }
    }
    view.updatedAt = Date.now();

    this._syncToServer(view);
    this._emit("viewUpdated", view);
    this._dispatchViewUpdateEvent(view);
  }

  /**
   * Rename a view
   * @param {string} viewId - The view to rename
   * @param {string} newName - The new name
   */
  renameView(viewId, newName) {
    if (!this._checkPresenterLock()) return null;
    const view = this._viewConfigs.get(viewId);
    if (!view) {
      log.warn(`Cannot rename view ${viewId}: not found`);
      return null;
    }

    view.name = newName;
    view.updatedAt = Date.now();

    log.debug(`View ${viewId} renamed to "${newName}"`);

    this._syncToServer(view);
    this._commitProvenance(view, `Renamed view to "${newName}"`);
    this._emit("viewUpdated", view);

    // Also dispatch window event for components that listen to global events
    this._dispatchViewUpdateEvent(view);

    return view;
  }

  /**
   * Dispatch a window event when a view is updated
   * This allows React components to listen for updates without direct manager access
   * @private
   */
  _dispatchViewUpdateEvent(view) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cia:view-updated", {
          detail: { view, viewId: view?.id },
        })
      );
    }
  }

  /**
   * Update view camera state and propagate to linked views
   */
  updateCamera(viewId, cameraState) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.updateCamera(cameraState);
    this._syncToServer(view);

    // Emit camera changed event for this view
    this._emit("cameraChanged", { viewId, camera: cameraState });

    // Propagate to views that are linked to this one (followers)
    this._propagateCameraToLinkedViews(viewId, cameraState);
  }

  /**
   * Propagate camera state to all views in the same sync group (Hub Model)
   *
   * When any member of a sync group updates camera, ALL other members receive it.
   * This provides true multi-view synchronization.
   *
   * @private
   */
  _propagateCameraToLinkedViews(sourceViewId, cameraState) {
    // Find the sync group for this view's camera property
    const group = this._findSyncGroup(sourceViewId, "camera");

    if (!group) {
      // Not in a sync group, nothing to propagate
      return;
    }

    const { members } = group;

    // Propagate to all other members of the group
    for (const memberId of members) {
      if (memberId === sourceViewId) continue; // Don't send back to source

      const memberView = this._viewConfigs.get(memberId);
      if (!memberView) continue;

      // Update the member's camera state
      memberView.updateCamera(cameraState);

      // Update sync timestamp if link exists
      const cameraLink = memberView.links?.camera;
      if (cameraLink?.updateLastSync) {
        cameraLink.updateLastSync();
      }

      // Emit event so workspaceManager can update the actual instance
      this._emit("cameraChanged", {
        viewId: memberId,
        camera: cameraState,
        sourceViewId: sourceViewId,
        isLinkedUpdate: true,
      });
    }

    log.trace(`Propagated camera from ${sourceViewId} to ${members.size - 1} group members`);
  }

  /**
   * Add a filter to a view
   */
  addFilter(viewId, filter) {
    if (!this._checkPresenterLock()) return null;
    const view = this._viewConfigs.get(viewId);
    if (!view) return null;

    const filterId = view.addFilter(filter);
    this._syncToServer(view);
    this._commitProvenance(view, `Added ${filter.type || 'new'} filter`);
    presenceSystem?.setActivity?.('filtering', `Added ${filter.type || 'Filter'}`, viewId);
    this._emit("filterChanged", {
      viewId,
      action: "added",
      filterId,
      filter,
    });
    return filterId;
  }

  /**
   * Update a filter
   */
  updateFilter(viewId, filterId, updates) {
    if (!this._checkPresenterLock()) return;
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.updateFilter(filterId, updates);
    this._syncToServer(view);
    this._commitProvenanceDebounced(view, `Adjusted filter settings`);
    presenceSystem?.setActivity?.('filtering', `Adjusting Filter`, viewId);
    this._emit("filterChanged", {
      viewId,
      action: "updated",
      filterId,
      updates,
    });
  }

  /**
   * Remove a filter
   */
  removeFilter(viewId, filterId) {
    if (!this._checkPresenterLock()) return;
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.removeFilter(filterId);
    this._syncToServer(view);
    this._commitProvenance(view, `Removed filter`);
    presenceSystem?.setActivity?.('filtering', `Removed Filter`, viewId);
    this._emit("filterChanged", {
      viewId,
      action: "removed",
      filterId,
    });
  }

  /**
   * Add a widget to a view
   */
  addWidget(viewId, widget) {
    if (!this._checkPresenterLock()) return null;
    const view = this._viewConfigs.get(viewId);
    if (!view) return null;

    const widgetId = view.addWidget(widget);
    this._syncToServer(view);
    this._commitProvenance(view, `Added ${widget.type || 'new'} widget`);
    presenceSystem?.setActivity?.('measuring', `Added ${widget.type || 'Widget'}`, viewId);
    return widgetId;
  }

  /**
   * Update a widget
   */
  updateWidget(viewId, widgetId, updates) {
    if (!this._checkPresenterLock()) return;
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.updateWidget(widgetId, updates);
    this._syncToServer(view);
    this._commitProvenanceDebounced(view, `Adjusted widget settings`);
    presenceSystem?.setActivity?.('measuring', `Adjusting Widget`, viewId);
  }

  /**
   * Remove a widget
   */
  removeWidget(viewId, widgetId) {
    if (!this._checkPresenterLock()) return;
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.removeWidget(widgetId);
    this._syncToServer(view);
    this._commitProvenance(view, `Removed widget`);
    presenceSystem?.setActivity?.('measuring', `Removed Widget`, viewId);
  }

  /**
   * Update annotation display settings
   */
  updateAnnotationDisplay(viewId, updates) {
    if (!this._checkPresenterLock()) return;
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.updateAnnotationDisplay(updates);
    this._syncToServer(view);
    this._emit("annotationChanged", {
      viewId,
      updates,
    });
  }

  // ===========================================================================
  // LINKING
  // ===========================================================================

  /**
   * Link a property of one view to another using the Hub Model
   *
   * Hub Model: All views in a sync group link to a single "hub" view.
   * - When joining an existing group, the new view links to the hub
   * - When creating a new group, the target becomes the hub
   * - Hub broadcasts updates to all members, members send updates to hub
   *
   * @param {string} viewId - The view to link (will join/create group)
   * @param {string} property - The property to link (camera, filters, etc.)
   * @param {string} targetViewId - The target view (or any member of target's group)
   * @param {string} mode - Link mode (for hub model, always treated as bidirectional)
   */
  linkProperty(viewId, property, targetViewId, mode = LINK_MODES.BIDIRECTIONAL) {
    const view = this._viewConfigs.get(viewId);
    const targetView = this._viewConfigs.get(targetViewId);

    if (!view || !targetView) {
      log.error(`Cannot link: view or target not found`);
      return null;
    }

    // Can't link to self
    if (viewId === targetViewId) {
      log.warn(`Cannot link view to itself`);
      return null;
    }

    // If source is already in this group, nothing to do
    const sourceGroup = this._findSyncGroup(viewId, property);
    const targetGroup = this._findSyncGroup(targetViewId, property);

    if (sourceGroup && targetGroup && sourceGroup.hubId === targetGroup.hubId) {
      log.debug(`View ${viewId} already in same sync group as ${targetViewId}`);
      return view.links[property];
    }

    // Remove source from its current group (if any)
    if (sourceGroup) {
      this.unlinkProperty(viewId, property);
    }

    // Determine the hub - either target's existing hub or target itself
    let hubId;
    if (targetGroup) {
      hubId = targetGroup.hubId;
      log.debug(`Joining existing sync group (hub: ${hubId})`);
    } else {
      // Create new group with target as hub
      hubId = targetViewId;
      this._addToSyncGroup(targetViewId, property, hubId, mode);
      log.debug(`Created new sync group with hub: ${hubId}`);
    }

    // Add source to the group
    this._addToSyncGroup(viewId, property, hubId, mode);

    // Get hub view for linking
    const hubView = this._viewConfigs.get(hubId);
    if (!hubView) {
      log.error(`Hub view ${hubId} not found`);
      return null;
    }

    // Create link from source to hub (non-hub members link to hub)
    const link = view.linkProperty(property, hubView, LINK_MODES.BIDIRECTIONAL);
    this._registerLinkObserver(hubId, viewId);

    // Apply initial state from hub
    this._applyLinkedProperty(view, property, hubView);

    // Sync changes
    this._syncToServer(view);

    // Emit events for UI updates
    this._emit("linkChanged", {
      viewId,
      property,
      targetViewId: hubId,
      mode: LINK_MODES.BIDIRECTIONAL,
      action: "created",
      groupMembers: Array.from(this._syncGroups.get(property).get(hubId) || []),
    });

    // Also emit for hub so its UI updates to show new member
    this._emit("linkChanged", {
      viewId: hubId,
      property,
      action: "memberAdded",
      groupMembers: Array.from(this._syncGroups.get(property).get(hubId) || []),
    });

    return link;
  }

  // ===========================================================================
  // SYNC GROUP HELPERS (Hub Model)
  // ===========================================================================

  /**
   * Find the sync group a view belongs to for a property
   * @returns {{ hubId: string, members: Set<string> } | null}
   */
  _findSyncGroup(viewId, property) {
    const groups = this._syncGroups.get(property);
    if (!groups) return null;

    for (const [hubId, members] of groups) {
      if (members.has(viewId)) {
        return { hubId, members };
      }
    }
    return null;
  }

  /**
   * Get all members of a view's sync group (excluding itself)
   */
  getSyncGroupMembers(viewId, property) {
    const group = this._findSyncGroup(viewId, property);
    if (!group) return [];
    return Array.from(group.members).filter(id => id !== viewId);
  }

  /**
   * Get the hub of a view's sync group
   */
  getSyncGroupHub(viewId, property) {
    const group = this._findSyncGroup(viewId, property);
    return group?.hubId || null;
  }

  /**
   * Add a view to a sync group (creates link to hub)
   * @private
   */
  _addToSyncGroup(viewId, property, hubId, mode) {
    const groups = this._syncGroups.get(property);
    if (!groups.has(hubId)) {
      groups.set(hubId, new Set([hubId]));
    }
    groups.get(hubId).add(viewId);
    log.debug(`Added ${viewId} to sync group for ${property} (hub: ${hubId})`);
  }

  /**
   * Remove a view from its sync group
   * @private
   * @returns {string|null} New hub ID if hub was transferred, null otherwise
   */
  _removeFromSyncGroup(viewId, property) {
    const group = this._findSyncGroup(viewId, property);
    if (!group) return null;

    const { hubId, members } = group;
    members.delete(viewId);

    // If group is now empty, remove it
    if (members.size === 0) {
      this._syncGroups.get(property).delete(hubId);
      log.debug(`Removed empty sync group for ${property}`);
      return null;
    }

    // If the hub was removed, elect a new hub
    if (viewId === hubId && members.size > 0) {
      const newHubId = members.values().next().value;
      const groupMembers = new Set(members);

      // Remove old group, create new one with new hub
      this._syncGroups.get(property).delete(hubId);
      this._syncGroups.get(property).set(newHubId, groupMembers);

      log.debug(`Transferred hub for ${property} from ${hubId} to ${newHubId}`);
      return newHubId;
    }

    return null;
  }

  /**
   * Relink all group members to a new hub
   * @private
   */
  _relinkGroupToNewHub(property, oldHubId, newHubId, members) {
    const newHubView = this._viewConfigs.get(newHubId);
    if (!newHubView) return;

    // Clear the new hub's outgoing link (hub doesn't link out)
    newHubView.unlinkProperty(property);
    this._syncToServer(newHubView);

    // Update all other members to link to new hub
    for (const memberId of members) {
      if (memberId === newHubId) continue;

      const memberView = this._viewConfigs.get(memberId);
      if (!memberView) continue;

      // Update link to point to new hub
      memberView.linkProperty(property, newHubView, LINK_MODES.BIDIRECTIONAL);
      this._registerLinkObserver(newHubId, memberId);
      this._syncToServer(memberView);

      this._emit("linkChanged", {
        viewId: memberId,
        property,
        targetViewId: newHubId,
        mode: LINK_MODES.BIDIRECTIONAL,
        action: "created",
      });
    }

    // Emit for new hub
    this._emit("linkChanged", {
      viewId: newHubId,
      property,
      action: "hubChanged",
    });
  }

  // ===========================================================================
  // LINK OPERATIONS
  // ===========================================================================

  /**
   * Unlink a property - removes view from its sync group
   */
  unlinkProperty(viewId, property) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    const existingGroup = this._findSyncGroup(viewId, property);
    if (!existingGroup) {
      // Not in a group, just clear any local link
      view.unlinkProperty(property);
      this._syncToServer(view);
      this._emit("linkChanged", { viewId, property, action: "removed" });
      return;
    }

    const { hubId, members } = existingGroup;
    const wasHub = viewId === hubId;

    // Remove from group and potentially elect new hub
    const newHubId = this._removeFromSyncGroup(viewId, property);

    // Clear this view's link
    if (view.links[property]) {
      this._unregisterLinkObserver(view.links[property].targetViewId, viewId);
    }
    view.unlinkProperty(property);
    this._syncToServer(view);

    // If this was the hub, relink remaining members to new hub
    if (wasHub && newHubId) {
      const remainingMembers = this._syncGroups.get(property).get(newHubId);
      if (remainingMembers) {
        this._relinkGroupToNewHub(property, hubId, newHubId, remainingMembers);
      }
    }

    // Emit for this view
    this._emit("linkChanged", { viewId, property, action: "removed" });
  }

  /**
   * Unlink all properties
   */
  unlinkAll(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    // Unregister from all targets
    for (const property of LINKABLE_PROPERTIES) {
      const link = view.links[property];
      if (link) {
        this._unregisterLinkObserver(link.targetViewId, viewId);
      }
    }

    view.unlinkAll();
    this._syncToServer(view);

    this._emit("linkChanged", { viewId, action: "all_removed" });
  }

  /**
   * Pause a link (stop syncing but keep the connection)
   */
  pauseLink(viewId, property) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.pauseLink(property);
    this._syncToServer(view);

    this._emit("linkChanged", { viewId, property, action: "paused" });
  }

  /**
   * Resume a paused link
   */
  resumeLink(viewId, property) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.resumeLink(property);

    // Re-apply current state from target
    const link = view.links[property];
    if (link && link.isActive()) {
      const targetView = this._viewConfigs.get(link.targetViewId);
      if (targetView) {
        this._applyLinkedProperty(view, property, targetView);
      }
    }

    this._syncToServer(view);

    this._emit("linkChanged", { viewId, property, action: "resumed" });
  }

  // ===========================================================================
  // BROADCASTING
  // ===========================================================================

  /**
   * Start broadcasting a view (one-to-many presentation mode)
   */
  startBroadcast(viewId, options = {}) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    // Only owner can broadcast
    if (view.ownerUserId !== getUserId()) {
      log.warn(`Cannot broadcast view ${viewId}: not owner`);
      return;
    }

    view.startBroadcast(options);
    this._syncToServer(view);

    this._emit("broadcastChanged", { viewId, action: "started", options });
  }

  /**
   * Stop broadcasting
   */
  stopBroadcast(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.stopBroadcast();
    this._syncToServer(view);

    this._emit("broadcastChanged", { viewId, action: "stopped" });
  }

  /**
   * Pause broadcast
   */
  pauseBroadcast(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.pauseBroadcast();
    this._syncToServer(view);

    this._emit("broadcastChanged", { viewId, action: "paused" });
  }

  /**
   * Resume broadcast
   */
  resumeBroadcast(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.resumeBroadcast();
    this._syncToServer(view);

    this._emit("broadcastChanged", { viewId, action: "resumed" });
  }

  /**
   * Start following a broadcasting view
   */
  followBroadcast(viewId, sourceViewId, options = {}) {
    const view = this._viewConfigs.get(viewId);
    const sourceView = this._viewConfigs.get(sourceViewId);

    if (!view || !sourceView) return;

    if (!sourceView.isBroadcasting()) {
      log.warn(`Cannot follow ${sourceViewId}: not broadcasting`);
      return;
    }

    view.startFollowing(sourceView, options);
    sourceView.incrementFollowerCount();

    // Link all properties in broadcast mode
    for (const property of LINKABLE_PROPERTIES) {
      view.linkProperty(property, sourceView, LINK_MODES.BROADCAST);
    }

    this._syncToServer(view);
    this._syncToServer(sourceView);

    this._emit("broadcastChanged", {
      viewId,
      sourceViewId,
      action: "following_started",
    });
  }

  /**
   * Stop following a broadcast
   */
  stopFollowing(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view || !view.isFollowing()) return;

    const sourceViewId = view.following.sourceViewId;
    const sourceView = this._viewConfigs.get(sourceViewId);

    if (sourceView) {
      sourceView.decrementFollowerCount();
      this._syncToServer(sourceView);
    }

    // Unlink all properties
    view.unlinkAll();
    view.stopFollowing();

    this._syncToServer(view);

    this._emit("broadcastChanged", {
      viewId,
      sourceViewId,
      action: "following_stopped",
    });
  }

  /**
   * Get all views currently broadcasting
   */
  getBroadcastingViews() {
    return Array.from(this._viewConfigs.values()).filter((view) =>
      view.isBroadcasting()
    );
  }

  // ===========================================================================
  // FORKING
  // ===========================================================================

  /**
   * Fork a view (create a copy with lineage tracking)
   */
  forkView(viewId, options = {}) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return null;

    const userId = getUserId();
    const userName = getUserName();

    const forkedView = view.fork(userId, userName, options);

    // Store locally
    this._viewConfigs.set(forkedView.id, forkedView);

    // Sync to Y.js
    this._syncToServer(forkedView);
    this._syncToServer(view); // Update fork count on original

    // Emit event
    this._emit("viewAdded", forkedView);

    log.debug(`View forked: ${view.id} -> ${forkedView.id}`);

    return forkedView;
  }

  // ===========================================================================
  // SNAPSHOTS
  // ===========================================================================

  /**
   * Create a snapshot of a view
   */
  createSnapshot(viewId, options = {}) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return null;

    const snapshot = view.createSnapshot({
      ...options,
      userId: getUserId(),
      userName: getUserName(),
    });

    this._syncToServer(view);
    this._commitProvenance(view, `Saved Snapshot: ${snapshot.name}`);

    return snapshot;
  }

  /**
   * Restore a snapshot
   */
  restoreSnapshot(viewId, snapshotId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.restoreSnapshot(snapshotId);
    this._syncToServer(view);

    this._emit("viewUpdated", view);
  }

  /**
   * Delete a snapshot
   */
  deleteSnapshot(viewId, snapshotId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.deleteSnapshot(snapshotId);
    this._syncToServer(view);
  }

  // ===========================================================================
  // SHARING
  // ===========================================================================

  /**
   * Share a view with another user
   */
  shareView(viewId, targetUserId, targetUserName, options = {}) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    // Only owner can share
    if (view.ownerUserId !== getUserId()) {
      log.warn(`Cannot share view ${viewId}: not owner`);
      return;
    }

    view.share(targetUserId, targetUserName, options);
    this._syncToServer(view);

    this._emit("viewShared", { viewId, targetUserId, options });
  }

  /**
   * Unshare a view
   */
  unshareView(viewId, targetUserId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.unshare(targetUserId);
    this._syncToServer(view);
  }

  /**
   * Change view visibility
   */
  setViewVisibility(viewId, visibility) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.setVisibility(visibility);
    this._syncToServer(view);
  }

  // ===========================================================================
  // PRESENCE
  // ===========================================================================

  /**
   * Update cursor position for presence
   */
  updatePresence(viewId, cursorPosition) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    // Throttle presence updates
    const now = Date.now();
    const lastUpdate = this._lastPresenceUpdate.get(viewId) || 0;
    if (now - lastUpdate < this._presenceThrottleMs) {
      return;
    }
    this._lastPresenceUpdate.set(viewId, now);

    const userId = getUserId();
    const userName = getUserName();

    view.updatePresence(userId, userName, cursorPosition);

    // Only sync presence data, not full view
    this._syncPresenceToYjs(viewId, view.presence);

    this._emit("presenceChanged", { viewId, userId, cursorPosition });
  }

  /**
   * Remove presence when leaving a view
   */
  removePresence(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    const userId = getUserId();
    view.removePresence(userId);

    this._syncPresenceToYjs(viewId, view.presence);
  }

  // ===========================================================================
  // LIFECYCLE MANAGEMENT
  // ===========================================================================

  /**
   * Mark a view as active (instance opened)
   */
  activateView(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.activate();
    this._syncToServer(view);
  }

  /**
   * Mark a view as inactive (instance closed)
   */
  deactivateView(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.deactivate();
    this._syncToServer(view);
    this._emit("viewDeactivated", { viewId, view });
    this._emit("viewUpdated", view);
  }

  // ===========================================================================
  // PRIVATE: Y.JS SYNC
  // ===========================================================================

  /**
   * Sync view state to server (throttled)
   * v2.0: Server is source of truth, not Y.js
   */
  _syncToServer(view) {
    // Cancel any pending sync for this view
    if (this._pendingSyncs.has(view.id)) {
      clearTimeout(this._pendingSyncs.get(view.id));
    }

    // Throttle syncs to avoid excessive API calls
    const timeout = setTimeout(async () => {
      this._pendingSyncs.delete(view.id);

      try {
        const updateData = this._clientToServerFormat(view);
        const { view: serverView } = await apiClient.put(
          `/views/${view.id}`,
          updateData
        );

        // Update server version from response
        if (serverView?.server_version) {
          view.serverVersion = serverView.server_version;
        }
        view.lastSyncedToServer = Date.now();
        view.pendingServerSync = false;
      } catch (error) {
        log.error(`Failed to sync view ${view.id} to server:`, error);
        view.pendingServerSync = true;
      }
    }, this._syncThrottleMs);

    this._pendingSyncs.set(view.id, timeout);
    view.pendingServerSync = true;
  }

  _syncPresenceToYjs(viewId, presence) {
    // Use a separate Y.js map for high-frequency presence updates
    // to avoid syncing full view state on every cursor move
    const yPresence = ydoc.getMap("viewPresence");
    try {
      yPresence.set(viewId, presence);
    } catch (error) {
      log.error(`Failed to sync presence for ${viewId}:`, error);
    }
  }

  // ===========================================================================
  // PRIVATE: PROVENANCE (TEMPORAL GRAPH) HOOKS
  // ===========================================================================

  _commitProvenance(view, intent) {
    try {
      const userId = getUserId();
      const userName = getUserName();
      const user = { id: userId, name: userName };
      
      const latestNode = ProvenanceManager.getLatestNode(view.id);
      const parentId = latestNode ? latestNode.id : null;
      
      const state = this._clientToServerFormat(view);
      state.id = view.id; 
      
      ProvenanceManager.commitState(intent, state, user, parentId);
      log.debug(`Saved Provenance Node: ${intent} [parent=${parentId}]`);
    } catch (e) {
      log.warn("Failed to commit provenance step:", e);
    }
  }

  _commitProvenanceDebounced(view, intent, debounceMs = 1000) {
    const key = `${view.id}-provenance-throttle`;
    if (this._provenanceDebounceTimers.has(key)) {
      clearTimeout(this._provenanceDebounceTimers.get(key));
    }
    
    // Store latest intent locally to avoid race conditions capturing stale intents inside the closure
    const timer = setTimeout(() => {
      this._commitProvenance(view, intent);
      this._provenanceDebounceTimers.delete(key);
    }, debounceMs);
    
    this._provenanceDebounceTimers.set(key, timer);
  }

  // ===========================================================================
  // PRIVATE: FLOOR CONTROL HOOKS (SOCIAL TRANSLUCENCE)
  // ===========================================================================

  _checkPresenterLock() {
    if (!presenceSystem) return true;
    
    const users = presenceSystem.getOnlineUsers();
    const presenter = users.find(u => u.role === 'presenter');
    
    // If no one is actively presenting, the floor is open
    if (!presenter) return true;

    const currentUserId = getUserId();
    // If we are the presenter, we are free to edit
    if (presenter.userId === currentUserId || presenter.id === currentUserId) return true;

    // Floor is locked by someone else!
    log.warn("Action blocked: Presenter lock is currently active.");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cia:toast", {
        detail: { type: "warning", message: "A presenter is active. Analysis tools are locked." }
      }));
    }
    return false;
  }

  // ===========================================================================
  // PRIVATE: LINK MANAGEMENT
  // ===========================================================================

  _setupLinkObserversForView(view) {
    for (const property of LINKABLE_PROPERTIES) {
      const link = view.links[property];
      if (link && link.isActive()) {
        this._registerLinkObserver(link.targetViewId, view.id);
      }
    }
  }

  _registerLinkObserver(targetViewId, subscriberViewId) {
    if (!this._linkObservers.has(targetViewId)) {
      this._linkObservers.set(targetViewId, new Set());
    }
    this._linkObservers.get(targetViewId).add(subscriberViewId);
  }

  _unregisterLinkObserver(targetViewId, subscriberViewId) {
    const subscribers = this._linkObservers.get(targetViewId);
    if (subscribers) {
      subscribers.delete(subscriberViewId);
      if (subscribers.size === 0) {
        this._linkObservers.delete(targetViewId);
      }
    }
  }

  _notifyLinkedViews(targetViewId, targetView) {
    const subscribers = this._linkObservers.get(targetViewId);
    if (!subscribers) return;

    for (const subscriberViewId of subscribers) {
      const subscriberView = this._viewConfigs.get(subscriberViewId);
      if (!subscriberView) continue;

      // Apply linked properties from target
      for (const property of LINKABLE_PROPERTIES) {
        const link = subscriberView.links[property];
        if (link && link.targetViewId === targetViewId && link.isActive()) {
          const mode = link.mode;

          if (mode === LINK_MODES.FOLLOW || mode === LINK_MODES.BROADCAST) {
            this._applyLinkedProperty(subscriberView, property, targetView);
          }
          // BIDIRECTIONAL handled separately to avoid loops
        }
      }
    }
  }

  _applyLinkedProperty(view, property, sourceView) {
    // Deep copy the property value from source to view
    const value = sourceView[property];
    if (value !== undefined) {
      view[property] = JSON.parse(JSON.stringify(value));
      view.updatedAt = Date.now();

      // Update link sync timestamp
      if (view.links[property]) {
        view.links[property].updateLastSync();
      }
    }
  }

  _handleLinkTargetDeleted(targetViewId) {
    const subscribers = this._linkObservers.get(targetViewId);
    if (!subscribers) return;

    for (const subscriberViewId of subscribers) {
      const subscriberView = this._viewConfigs.get(subscriberViewId);
      if (!subscriberView) continue;

      // Mark links as broken
      subscriberView.handleLinkTargetLost(targetViewId, "target_deleted");
      this._syncToServer(subscriberView);

      this._emit("linkChanged", {
        viewId: subscriberViewId,
        targetViewId,
        action: "broken",
        reason: "target_deleted",
      });
    }

    // Clear the observer list for this target
    this._linkObservers.delete(targetViewId);
  }

  // ===========================================================================
  // PRIVATE: CLEANUP
  // ===========================================================================

  _startCleanupTask() {
    this._cleanupInterval = setInterval(() => {
      this._performCleanup();
    }, this._cleanupIntervalMs);
  }

  _performCleanup() {
    const toRemove = [];

    for (const [viewId, view] of this._viewConfigs) {
      // Only cleanup our own views
      if (view.ownerUserId !== getUserId()) continue;

      if (view.isCleanupCandidate(this._inactiveThresholdMs)) {
        toRemove.push(viewId);
      }

      // Also cleanup stale presence
      view.cleanupStalePresence();
    }

    for (const viewId of toRemove) {
      log.debug(`Auto-cleaning inactive view: ${viewId}`);
      this._viewConfigs.delete(viewId);
      this._emit("viewRemoved", viewId);
    }
  }

  // ===========================================================================
  // RECONCILIATION
  // ===========================================================================

  /**
   * Reconcile local views with server
   * Should be called AFTER DatasetManager.reconcileWithServer()
   *
   * @returns {Promise<ReconciliationResult>}
   */
  async reconcileWithServer() {
    log.info("ViewConfigurationManager: Starting reconciliation...");

    const startTime = Date.now();

    try {
      // 1. Fetch views from server
      const data = await apiClient.get(`/views?projectId=${this._projectId}`);
      const serverViews = data.views || [];

      log.debug(`Server has ${serverViews.length} view(s)`);

      // Build server lookup
      const serverViewIds = new Set(serverViews.map((v) => v.id));

      // 2. Find orphan views
      const orphans = [];
      const invalidDatasetRefs = [];

      // Get datasetManager reference (from global or import)
      const datasetManager =
        window.CIA?.datasetManager || window.__CIA_MANAGERS?.datasetManager;

      for (const [viewId, view] of this._viewConfigs) {
        if (!serverViewIds.has(viewId)) {
          orphans.push(view);
          continue;
        }

        // Check if dataset still exists
        if (datasetManager && view.datasetId) {
          const dataset = datasetManager.getDataset(view.datasetId);
          if (!dataset) {
            log.warn(
              `View ${viewId} references deleted dataset ${view.datasetId}`
            );
            invalidDatasetRefs.push(view);
          }
        }
      }

      // 3. Remove orphan views
      for (const orphan of orphans) {
        log.debug(`Removing orphan view: ${orphan.name} (${orphan.id})`);
        this._viewConfigs.delete(orphan.id);
        this._cleanupLinkObserversForView(orphan);
      }

      // 4. Remove views with invalid dataset refs
      for (const invalid of invalidDatasetRefs) {
        log.warn(`Removing view with invalid dataset: ${invalid.name}`);
        this._viewConfigs.delete(invalid.id);
        this._cleanupLinkObserversForView(invalid);
      }

      // 5. Add views from server
      let added = 0;

      for (const serverView of serverViews) {
        if (this._viewConfigs.has(serverView.id)) continue;

        // Validate dataset exists
        const datasetId =
          serverView.file_id || serverView.fileId || serverView.dataset_id;
        if (datasetManager && datasetId) {
          const dataset = datasetManager.getDataset(datasetId);
          if (!dataset) {
            log.warn(`Skipping view ${serverView.id} - dataset not found`);
            continue;
          }
        }

        try {
          const viewData = this._serverToClientFormat(serverView);
          const view = new ViewConfiguration(viewData);
          this._viewConfigs.set(view.id, view);
          this._setupLinkObserversForView(view);
          added++;
        } catch (err) {
          log.error(`Failed to add server view ${serverView.id}:`, err);
        }
      }

      // 6. Result
      const result = {
        orphansRemoved: orphans.length,
        invalidDatasetRefs: invalidDatasetRefs.length,
        added,
        total: this._viewConfigs.size,
        wasClean:
          orphans.length === 0 &&
          invalidDatasetRefs.length === 0 &&
          added === 0,
        durationMs: Date.now() - startTime,
      };

      if (!result.wasClean) {
        log.info(`View reconciliation complete in ${result.durationMs}ms`);
        this._emit("reconciled", result);
      }

      return result;
    } catch (error) {
      log.error("View reconciliation failed:", error);
      throw error;
    }
  }

  /**
   * Clean up link observers when a view is removed
   * @private
   */
  _cleanupLinkObserversForView(view) {
    if (!view) return;

    // Remove as observer of other views
    for (const property of LINKABLE_PROPERTIES) {
      const link = view.links?.[property];
      if (link?.targetViewId) {
        this._unregisterLinkObserver(link.targetViewId, view.id);
      }
    }

    // Remove as target
    const subscribers = this._linkObservers.get(view.id);
    if (subscribers) {
      for (const subscriberId of subscribers) {
        const subscriber = this._viewConfigs.get(subscriberId);
        if (!subscriber) continue;

        for (const property of LINKABLE_PROPERTIES) {
          const link = subscriber.links?.[property];
          if (link?.targetViewId === view.id) {
            link.status = LINK_STATUS.BROKEN;
            link.brokenAt = Date.now();
            link.brokenReason = "target_deleted";
          }
        }
      }
      this._linkObservers.delete(view.id);
    }
  }

  /**
   * Force clear all local view data
   */
  async forceReset() {
    log.warn("Force resetting all view state...");

    for (const [viewId, view] of this._viewConfigs) {
      this._cleanupLinkObserversForView(view);
    }

    this._viewConfigs.clear();
    this._linkObservers.clear();
    this._emit("reset");

    log.info("View state reset complete");
  }

  /**
   * Get IDs of all local views
   */
  getLocalViewIds() {
    return Array.from(this._viewConfigs.keys());
  }

  // ===========================================================================
  // SHUTDOWN
  // ===========================================================================

  shutdown() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }

    // Remove presence from all views
    const userId = getUserId();
    for (const [viewId, view] of this._viewConfigs) {
      view.removePresence(userId);
    }

    this._viewConfigs.clear();
    this._linkObservers.clear();
    this._lastPresenceUpdate.clear();

    log.info("Shutdown complete");
  }

  /**
   * Move a view to Recently Deleted (soft delete)
   * View is recoverable for 24 hours
   */
  trashView(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return false;

    // Set trashed status with timestamp
    view.status = "trashed";
    view.trashedAt = Date.now();
    view.trashedBy = getUserId();
    view.updatedAt = Date.now();

    // Deactivate any active instances
    view.activeInstanceCount = 0;

    this._viewConfigs.set(viewId, view);
    log.info(`View ${viewId} moved to trash`);
    this._emit("viewTrashed", { viewId, view });

    // Sync to server
    this._syncToServer(view);

    return true;
  }

  /**
   * Restore a view from Recently Deleted
   */
  restoreView(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view || view.status !== "trashed") return false;

    // Restore to inactive status
    view.status = "inactive";
    view.trashedAt = null;
    view.trashedBy = null;
    view.updatedAt = Date.now();

    this._viewConfigs.set(viewId, view);
    log.info(`View ${viewId} restored from trash`);
    this._emit("viewRestored", { viewId, view });

    // Sync to server
    this._syncToServer(view);

    return true;
  }

  /**
   * Permanently delete a view (cannot be undone)
   */
  async permanentlyDeleteView(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return false;

    try {
      // Delete from server
      await apiClient.delete(`/views/${viewId}`);

      // Remove from local cache
      this._viewConfigs.delete(viewId);

      // Notify linked views
      this._handleLinkTargetDeleted?.(viewId);

      log.info(`View ${viewId} permanently deleted`);
      this._emit("viewDeleted", { viewId });

      return true;
    } catch (error) {
      log.error(`Failed to permanently delete view ${viewId}:`, error);
      // Still remove locally even if server fails
      this._viewConfigs.delete(viewId);
      this._emit("viewDeleted", { viewId });
      return true;
    }
  }

  /**
   * Get all trashed views (for Recently Deleted section)
   */
  getTrashedViews() {
    const trashed = [];
    const now = Date.now();
    const RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

    this._viewConfigs.forEach((view, id) => {
      if (view.status === "trashed") {
        const age = now - view.trashedAt;
        const expiresIn = RETENTION_MS - age;

        trashed.push({
          ...view,
          id,
          expiresIn,
          expiresInHours: Math.max(0, Math.floor(expiresIn / (60 * 60 * 1000))),
        });
      }
    });

    // Sort by most recently trashed
    return trashed.sort((a, b) => b.trashedAt - a.trashedAt);
  }

  /**
   * Clean up expired trashed views (call periodically)
   */
  purgeExpiredViews() {
    const now = Date.now();
    const RETENTION_MS = 24 * 60 * 60 * 1000;

    this._viewConfigs.forEach((view, id) => {
      if (view.status === "trashed" && now - view.trashedAt > RETENTION_MS) {
        this.permanentlyDeleteView(id);
      }
    });
  }
}

// Export singleton
export const viewConfigurationManager = new ViewConfigurationManager();
