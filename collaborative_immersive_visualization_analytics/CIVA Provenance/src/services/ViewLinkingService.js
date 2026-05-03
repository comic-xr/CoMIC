// src/services/ViewLinkingService.js
// =============================================================================
// VIEW LINKING SERVICE
// =============================================================================
//
// Manages synchronized property propagation between linked views.
// When views are linked, changes to one view's properties propagate to linked views.
//
// FEATURES:
// - Property-level linking (camera, cursors, filters, widgets, etc.)
// - Multiple link modes (Follow, Bidirectional, Broadcast)
// - Automatic propagation of changes
// - Link health monitoring (detect broken links)
// - Full-linking helper for drop-to-link workflows
//
// USAGE:
// import { viewLinkingService } from '@Services';
//
// // Link all properties between views
// viewLinkingService.linkViewsFully(sourceViewId, targetViewId);
//
// // Unlink a specific property
// viewLinkingService.unlinkProperty(viewId, 'camera');
//
// // Propagate a change
// viewLinkingService.propagateChange(viewId, 'camera', newCameraState);
//
// =============================================================================

import { getViewConfigurationManager } from "@Init/appInitializer.js";
import { eventBus, BUS_EVENTS } from "@Core/events/EventBus.js";
import {
  LINKABLE_PROPERTIES,
  LINK_MODES,
  LINK_STATUS,
} from "@Core/data/models/ViewConfiguration.js";
import { view as log } from "@Utils/logger.js";

// =============================================================================
// EVENTS
// =============================================================================

export const LINKING_EVENTS = {
  VIEWS_LINKED: "cia:views-linked",
  VIEWS_UNLINKED: "cia:views-unlinked",
  PROPERTY_LINKED: "cia:property-linked",
  PROPERTY_UNLINKED: "cia:property-unlinked",
  PROPERTY_PROPAGATED: "cia:property-propagated",
  LINK_BROKEN: "cia:link-broken",
  LINK_RESTORED: "cia:link-restored",
};

// =============================================================================
// SERVICE CLASS
// =============================================================================

class ViewLinkingService {
  constructor() {
    /** @type {boolean} Service initialized */
    this._initialized = false;

    /** @type {Set<string>} Views currently being updated (prevent loops) */
    this._updatingViews = new Set();

    /** @type {Map<string, Set<string>>} Reverse lookup: viewId -> set of views linking TO it */
    this._inboundLinks = new Map();

    /** @type {Function[]} Cleanup functions */
    this._cleanupFunctions = [];
  }

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  initialize() {
    if (this._initialized) {
      log.warn("ViewLinkingService already initialized");
      return;
    }

    log.info("Initializing ViewLinkingService...");

    // Listen for view property changes
    this._setupEventListeners();

    // Build initial inbound links map
    this._rebuildInboundLinks();

    this._initialized = true;
    log.info("ViewLinkingService initialized");
  }

  _setupEventListeners() {
    // Listen for camera changes
    const handleCameraChange = (data) => {
      if (data?.viewId && data?.camera) {
        this.propagateChange(data.viewId, "camera", data.camera);
      }
    };

    // Listen for filter changes
    const handleFiltersChange = (data) => {
      if (data?.viewId && data?.filters) {
        this.propagateChange(data.viewId, "filters", data.filters);
      }
    };

    // Listen for view deletion (break links)
    const handleViewDeleted = (data) => {
      if (data?.viewId) {
        this._handleViewDeleted(data.viewId);
      }
    };

    // Listen for view restored (restore links)
    const handleViewRestored = (data) => {
      if (data?.viewId) {
        this._handleViewRestored(data.viewId);
      }
    };

    eventBus.on(BUS_EVENTS.CAMERA_CHANGED, handleCameraChange);
    eventBus.on(BUS_EVENTS.FILTERS_CHANGED, handleFiltersChange);
    eventBus.on(BUS_EVENTS.VIEW_DELETED, handleViewDeleted);
    eventBus.on(BUS_EVENTS.VIEW_TRASHED, handleViewDeleted);
    eventBus.on(BUS_EVENTS.VIEW_RESTORED, handleViewRestored);

    this._cleanupFunctions.push(
      () => eventBus.off(BUS_EVENTS.CAMERA_CHANGED, handleCameraChange),
      () => eventBus.off(BUS_EVENTS.FILTERS_CHANGED, handleFiltersChange),
      () => eventBus.off(BUS_EVENTS.VIEW_DELETED, handleViewDeleted),
      () => eventBus.off(BUS_EVENTS.VIEW_TRASHED, handleViewDeleted),
      () => eventBus.off(BUS_EVENTS.VIEW_RESTORED, handleViewRestored)
    );
  }

  dispose() {
    this._cleanupFunctions.forEach((cleanup) => cleanup());
    this._cleanupFunctions = [];
    this._updatingViews.clear();
    this._inboundLinks.clear();
    this._initialized = false;
    log.info("ViewLinkingService disposed");
  }

  // =========================================================================
  // PUBLIC API - FULL LINKING (for drop-to-link)
  // =========================================================================

  /**
   * Link all properties between two views.
   * Used when drag-dropping a view onto an existing one.
   *
   * @param {string} sourceViewId - The existing view (source of truth)
   * @param {string} newViewId - The new view to link
   * @param {Object} [options] - Linking options
   * @param {string} [options.mode='bidirectional'] - Link mode
   * @param {string[]} [options.properties] - Properties to link (defaults to all)
   * @returns {{ success: boolean, linkedProperties: string[] }}
   */
  linkViewsFully(sourceViewId, newViewId, options = {}) {
    const viewManager = getViewConfigurationManager();
    if (!viewManager) {
      log.error("ViewConfigurationManager not initialized");
      return { success: false, linkedProperties: [] };
    }

    const sourceView = viewManager.getView(sourceViewId);
    const newView = viewManager.getView(newViewId);

    if (!sourceView || !newView) {
      log.error("Cannot link views - one or both views not found", {
        sourceViewId,
        newViewId,
      });
      return { success: false, linkedProperties: [] };
    }

    const mode = options.mode || LINK_MODES.BIDIRECTIONAL;
    const propertiesToLink = options.properties || [...LINKABLE_PROPERTIES];
    const linkedProperties = [];

    log.info(`Linking views fully: ${newViewId} -> ${sourceViewId}`, {
      mode,
      properties: propertiesToLink,
    });

    // Link each property
    for (const property of propertiesToLink) {
      try {
        newView.linkProperty(property, sourceView, mode);
        linkedProperties.push(property);

        // Copy initial value from source
        if (sourceView[property] !== undefined && sourceView[property] !== null) {
          newView[property] = JSON.parse(JSON.stringify(sourceView[property]));
        }

        log.debug(`Linked property "${property}" from ${sourceViewId} to ${newViewId}`);
      } catch (error) {
        log.error(`Failed to link property "${property}":`, error);
      }
    }

    // Update inbound links map
    this._addInboundLink(sourceViewId, newViewId);

    // Emit event
    eventBus.emit(LINKING_EVENTS.VIEWS_LINKED, {
      sourceViewId,
      newViewId,
      mode,
      linkedProperties,
    });

    return { success: true, linkedProperties };
  }

  /**
   * Unlink all properties between views.
   *
   * @param {string} viewId - View to unlink
   * @returns {boolean} Success
   */
  unlinkViewFully(viewId) {
    const viewManager = getViewConfigurationManager();
    const view = viewManager?.getView(viewId);

    if (!view) {
      log.warn(`Cannot unlink - view not found: ${viewId}`);
      return false;
    }

    const unlinkedFrom = new Set();

    // Collect source views before unlinking
    for (const property of LINKABLE_PROPERTIES) {
      if (view.links[property]?.targetViewId) {
        unlinkedFrom.add(view.links[property].targetViewId);
      }
    }

    view.unlinkAll();

    // Update inbound links map
    for (const sourceId of unlinkedFrom) {
      this._removeInboundLink(sourceId, viewId);
    }

    eventBus.emit(LINKING_EVENTS.VIEWS_UNLINKED, { viewId });

    log.info(`Fully unlinked view: ${viewId}`);
    return true;
  }

  // =========================================================================
  // PUBLIC API - PROPERTY-LEVEL LINKING
  // =========================================================================

  /**
   * Link a specific property to a source view.
   *
   * @param {string} viewId - View to modify
   * @param {string} property - Property to link
   * @param {string} sourceViewId - Source view to link to
   * @param {string} [mode='follow'] - Link mode
   * @returns {boolean} Success
   */
  linkProperty(viewId, property, sourceViewId, mode = LINK_MODES.FOLLOW) {
    const viewManager = getViewConfigurationManager();
    const view = viewManager?.getView(viewId);
    const sourceView = viewManager?.getView(sourceViewId);

    if (!view || !sourceView) {
      log.error("Cannot link property - view(s) not found");
      return false;
    }

    if (!LINKABLE_PROPERTIES.includes(property)) {
      log.error(`Invalid linkable property: ${property}`);
      return false;
    }

    try {
      view.linkProperty(property, sourceView, mode);
      this._addInboundLink(sourceViewId, viewId);

      eventBus.emit(LINKING_EVENTS.PROPERTY_LINKED, {
        viewId,
        property,
        sourceViewId,
        mode,
      });

      log.debug(`Linked property "${property}": ${viewId} -> ${sourceViewId}`);
      return true;
    } catch (error) {
      log.error(`Failed to link property:`, error);
      return false;
    }
  }

  /**
   * Unlink a specific property.
   *
   * @param {string} viewId - View to modify
   * @param {string} property - Property to unlink
   * @returns {boolean} Success
   */
  unlinkProperty(viewId, property) {
    const viewManager = getViewConfigurationManager();
    const view = viewManager?.getView(viewId);

    if (!view) {
      log.warn(`Cannot unlink property - view not found: ${viewId}`);
      return false;
    }

    const previousTarget = view.links[property]?.targetViewId;
    view.unlinkProperty(property);

    if (previousTarget) {
      // Check if we still have any links to this source
      const hasOtherLinks = LINKABLE_PROPERTIES.some(
        (p) => view.links[p]?.targetViewId === previousTarget
      );
      if (!hasOtherLinks) {
        this._removeInboundLink(previousTarget, viewId);
      }
    }

    eventBus.emit(LINKING_EVENTS.PROPERTY_UNLINKED, { viewId, property });

    log.debug(`Unlinked property "${property}" from view ${viewId}`);
    return true;
  }

  // =========================================================================
  // PUBLIC API - PROPAGATION
  // =========================================================================

  /**
   * Propagate a property change to linked views.
   * Called when a view's property changes.
   *
   * @param {string} sourceViewId - View that changed
   * @param {string} property - Property that changed
   * @param {*} value - New value
   */
  propagateChange(sourceViewId, property, value) {
    // Prevent infinite loops
    if (this._updatingViews.has(sourceViewId)) {
      return;
    }

    const viewManager = getViewConfigurationManager();
    if (!viewManager) return;

    const sourceView = viewManager.getView(sourceViewId);
    if (!sourceView) return;

    // Get views that link TO this source
    const linkedViewIds = this._inboundLinks.get(sourceViewId) || new Set();
    if (linkedViewIds.size === 0) return;

    this._updatingViews.add(sourceViewId);

    try {
      for (const targetViewId of linkedViewIds) {
        const targetView = viewManager.getView(targetViewId);
        if (!targetView) continue;

        const link = targetView.links[property];
        if (!link || link.targetViewId !== sourceViewId) continue;
        if (!link.isActive()) continue;

        // Check link mode
        const shouldSync =
          link.mode === LINK_MODES.FOLLOW ||
          link.mode === LINK_MODES.BIDIRECTIONAL ||
          link.mode === LINK_MODES.BROADCAST;

        if (shouldSync) {
          this._applyPropertyChange(targetView, property, value);
          link.updateLastSync();

          log.trace(
            `Propagated "${property}" from ${sourceViewId} to ${targetViewId}`
          );
        }
      }

      // For bidirectional links, also check if source has links
      for (const property of LINKABLE_PROPERTIES) {
        const sourceLink = sourceView.links[property];
        if (
          sourceLink?.isActive() &&
          sourceLink.mode === LINK_MODES.BIDIRECTIONAL
        ) {
          const targetViewId = sourceLink.targetViewId;
          const targetView = viewManager.getView(targetViewId);
          if (targetView && !this._updatingViews.has(targetViewId)) {
            this._applyPropertyChange(targetView, property, value);
            sourceLink.updateLastSync();
          }
        }
      }
    } finally {
      this._updatingViews.delete(sourceViewId);
    }
  }

  _applyPropertyChange(view, property, value) {
    // Deep clone to prevent reference issues
    const clonedValue = JSON.parse(JSON.stringify(value));

    switch (property) {
      case "camera":
        view.updateCamera(clonedValue);
        break;
      case "filters":
        view.filters = clonedValue;
        break;
      case "widgets":
        view.widgets = clonedValue;
        break;
      case "colorMaps":
        view.colorMaps = clonedValue;
        break;
      case "cursors":
        view.cursorConfig = clonedValue;
        break;
      case "annotationDisplay":
        view.updateAnnotationDisplay(clonedValue);
        break;
      default:
        if (view[property] !== undefined) {
          view[property] = clonedValue;
        }
    }

    view.updatedAt = Date.now();
  }

  // =========================================================================
  // QUERY METHODS
  // =========================================================================

  /**
   * Get all linked properties for a view.
   *
   * @param {string} viewId - View ID
   * @returns {Object} Map of property -> link config
   */
  getLinkedProperties(viewId) {
    const viewManager = getViewConfigurationManager();
    const view = viewManager?.getView(viewId);
    return view?.getActiveLinks() || {};
  }

  /**
   * Check if a view has any active links.
   *
   * @param {string} viewId - View ID
   * @returns {boolean}
   */
  isViewLinked(viewId) {
    const links = this.getLinkedProperties(viewId);
    return Object.keys(links).length > 0;
  }

  /**
   * Get all views that are linked to a source view.
   *
   * @param {string} sourceViewId - Source view ID
   * @returns {string[]} Array of linked view IDs
   */
  getViewsLinkedTo(sourceViewId) {
    return Array.from(this._inboundLinks.get(sourceViewId) || []);
  }

  /**
   * Get the source view that a view is linked to (for a property).
   *
   * @param {string} viewId - View ID
   * @param {string} property - Property name
   * @returns {string|null} Source view ID or null
   */
  getLinkSource(viewId, property) {
    const viewManager = getViewConfigurationManager();
    const view = viewManager?.getView(viewId);
    return view?.links[property]?.targetViewId || null;
  }

  /**
   * Get link status for a view and property.
   *
   * @param {string} viewId - View ID
   * @param {string} property - Property name
   * @returns {{ isLinked: boolean, mode: string, status: string, targetViewId: string|null }}
   */
  getLinkStatus(viewId, property) {
    const viewManager = getViewConfigurationManager();
    const view = viewManager?.getView(viewId);
    const link = view?.links[property];

    if (!link) {
      return { isLinked: false, mode: null, status: null, targetViewId: null };
    }

    return {
      isLinked: true,
      mode: link.mode,
      status: link.status,
      targetViewId: link.targetViewId,
    };
  }

  // =========================================================================
  // INTERNAL HELPERS
  // =========================================================================

  _rebuildInboundLinks() {
    this._inboundLinks.clear();

    const viewManager = getViewConfigurationManager();
    if (!viewManager) return;

    const views = viewManager.getAllViews?.() || [];

    for (const view of views) {
      for (const property of LINKABLE_PROPERTIES) {
        const link = view.links[property];
        if (link?.targetViewId) {
          this._addInboundLink(link.targetViewId, view.id);
        }
      }
    }

    log.debug(`Rebuilt inbound links map: ${this._inboundLinks.size} sources`);
  }

  _addInboundLink(sourceViewId, targetViewId) {
    if (!this._inboundLinks.has(sourceViewId)) {
      this._inboundLinks.set(sourceViewId, new Set());
    }
    this._inboundLinks.get(sourceViewId).add(targetViewId);
  }

  _removeInboundLink(sourceViewId, targetViewId) {
    const set = this._inboundLinks.get(sourceViewId);
    if (set) {
      set.delete(targetViewId);
      if (set.size === 0) {
        this._inboundLinks.delete(sourceViewId);
      }
    }
  }

  _handleViewDeleted(viewId) {
    const viewManager = getViewConfigurationManager();

    // Find views that were linked to this deleted view
    const affectedViews = this.getViewsLinkedTo(viewId);

    for (const targetViewId of affectedViews) {
      const targetView = viewManager?.getView(targetViewId);
      if (targetView) {
        targetView.handleLinkTargetLost(viewId, "source_deleted");
        log.info(`Marked links as broken for view ${targetViewId}`);
      }
    }

    // Remove from inbound links map
    this._inboundLinks.delete(viewId);

    eventBus.emit(LINKING_EVENTS.LINK_BROKEN, {
      sourceViewId: viewId,
      affectedViews,
      reason: "source_deleted",
    });
  }

  _handleViewRestored(viewId) {
    const viewManager = getViewConfigurationManager();

    // Find views that had broken links to this view
    const views = viewManager?.getAllViews?.() || [];

    for (const view of views) {
      const brokenLinks = view.getBrokenLinks();
      for (const [property, link] of Object.entries(brokenLinks)) {
        if (link.targetViewId === viewId) {
          view.handleLinkTargetRestored(viewId);
          this._addInboundLink(viewId, view.id);
          log.info(`Restored link for view ${view.id} to ${viewId}`);
        }
      }
    }

    eventBus.emit(LINKING_EVENTS.LINK_RESTORED, { sourceViewId: viewId });
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const viewLinkingService = new ViewLinkingService();

// =============================================================================
// DEBUG UTILITIES
// =============================================================================

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  window.CIA = window.CIA || {};
  window.CIA.viewLinkingService = viewLinkingService;
}

export default viewLinkingService;
