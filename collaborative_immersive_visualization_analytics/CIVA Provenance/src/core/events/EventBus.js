// src/core/events/EventBus.js
// =============================================================================
// TYPED EVENT BUS
// =============================================================================
//
// Central event bus for cross-component communication in CIA Web.
//
// WHY THIS EXISTS:
// - Provides single, consistent API for all event communication
// - Coexists with manager events (managers emit their own events internally)
// - Services use EventBus for cross-component notifications
// - Typed events prevent name mismatches and enable IDE autocomplete
// - Supports wildcard subscriptions for debugging/logging
//
// ARCHITECTURE:
// - Singleton pattern - one bus for entire application
// - Managers continue emitting their own events (for internal subscribers)
// - ViewLifecycleService emits through EventBus for UI updates
// - Components subscribe to EventBus OR manager events (not both for same event)
//
// USAGE:
// import { eventBus, BUS_EVENTS } from '@Core/events/EventBus';
//
// // Subscribe
// const unsub = eventBus.on(BUS_EVENTS.VIEW_CREATED, (data) => { ... });
//
// // Emit
// eventBus.emit(BUS_EVENTS.VIEW_CREATED, { viewId, datasetId });
//
// // Cleanup
// unsub();
//
// =============================================================================

import { events as log } from "@Utils/logger.js";

// =============================================================================
// BUS EVENT TYPES
// =============================================================================
// These are events emitted through the EventBus (not manager events).
// Naming convention: DOMAIN_ACTION (e.g., VIEW_CREATED, PLACEMENT_ADDED)
// =============================================================================

export const BUS_EVENTS = {
  // -------------------------------------------------------------------------
  // VIEW LIFECYCLE EVENTS
  // Emitted by ViewLifecycleService when view operations complete
  // -------------------------------------------------------------------------
  VIEW_CREATED: "view:created", // New view created
  VIEW_DUPLICATED: "view:duplicated", // View duplicated from source
  VIEW_PLACED: "view:placed", // View placed on canvas
  VIEW_REMOVED: "view:removed", // View removed from canvas (not deleted)
  VIEW_TRASHED: "view:trashed", // View moved to trash
  VIEW_RESTORED: "view:restored", // View restored from trash
  VIEW_DELETED: "view:deleted", // View permanently deleted
  VIEW_RENAMED: "view:renamed", // View name changed
  VIEW_FOCUSED: "view:focused", // View received focus/selection
  VIEW_LINK_CHANGED: "view:linkChanged", // View link configuration changed

  // -------------------------------------------------------------------------
  // CANVAS EVENTS
  // Emitted when canvas structure changes
  // -------------------------------------------------------------------------
  CANVAS_LOADED: "canvas:loaded", // Canvas loaded/ready
  CANVAS_UPDATED: "canvas:updated", // Canvas properties changed
  CANVAS_RESIZED: "canvas:resized", // Canvas dimensions changed

  // -------------------------------------------------------------------------
  // PLACEMENT EVENTS
  // Emitted when placements change
  // -------------------------------------------------------------------------
  PLACEMENT_ADDED: "placement:added", // New placement on canvas
  PLACEMENT_MOVED: "placement:moved", // Placement position changed
  PLACEMENT_RESIZED: "placement:resized", // Placement span changed
  PLACEMENT_REMOVED: "placement:removed", // Placement removed

  // -------------------------------------------------------------------------
  // NAVIGATION EVENTS
  // Emitted for viewport/navigation changes
  // -------------------------------------------------------------------------
  NAVIGATE_TO_VIEW: "nav:toView", // Navigate to show a view
  NAVIGATE_TO_CELL: "nav:toCell", // Navigate to specific cell
  VIEWPORT_CHANGED: "nav:viewportChanged", // Viewport position changed

  // -------------------------------------------------------------------------
  // DATASET EVENTS
  // Emitted for dataset operations
  // -------------------------------------------------------------------------
  DATASET_LOADED: "dataset:loaded", // Dataset loaded and ready
  DATASET_SELECTED: "dataset:selected", // Dataset selected in UI

  // -------------------------------------------------------------------------
  // UI STATE EVENTS
  // For UI coordination
  // -------------------------------------------------------------------------
  SELECTION_CHANGED: "ui:selectionChanged", // Selection state changed
  EDIT_MODE_CHANGED: "ui:editModeChanged", // Edit mode toggled

  // -------------------------------------------------------------------------
  // ERROR EVENTS
  // For error handling
  // -------------------------------------------------------------------------
  ERROR: "error", // Generic error event
  VIEW_ERROR: "view:error", // View operation failed
  PLACEMENT_ERROR: "placement:error", // Placement operation failed
};

// =============================================================================
// EVENT BUS CLASS
// =============================================================================

class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();

    /** @type {Set<Function>} Wildcard listeners (receive all events) */
    this._wildcardListeners = new Set();

    /** @type {boolean} Enable debug logging */
    this._debug = false;

    /** @type {Array<{event: string, data: any, timestamp: number}>} */
    this._history = [];

    /** @type {number} Max history entries to keep */
    this._maxHistory = 100;
  }

  // =========================================================================
  // SUBSCRIPTION
  // =========================================================================

  /**
   * Subscribe to an event
   *
   * @param {string} event - Event name from BUS_EVENTS
   * @param {Function} handler - Handler function (data) => void
   * @returns {Function} Unsubscribe function
   *
   * @example
   * const unsub = eventBus.on(BUS_EVENTS.VIEW_CREATED, (data) => {
   *     console.log('View created:', data.viewId);
   * });
   * // Later: unsub();
   */
  on(event, handler) {
    if (typeof handler !== "function") {
      log.warn(
        `EventBus.on: handler must be a function, got ${typeof handler}`
      );
      return () => {};
    }

    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }

    this._listeners.get(event).add(handler);

    if (this._debug) {
      log.debug(
        `EventBus: subscribed to "${event}" (${
          this._listeners.get(event).size
        } listeners)`
      );
    }

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event (one-time only)
   * Handler is automatically removed after first invocation
   *
   * @param {string} event - Event name
   * @param {Function} handler - Handler function
   * @returns {Function} Unsubscribe function
   */
  once(event, handler) {
    const wrappedHandler = (data) => {
      this.off(event, wrappedHandler);
      handler(data);
    };
    return this.on(event, wrappedHandler);
  }

  /**
   * Subscribe to ALL events (for debugging/logging)
   *
   * @param {Function} handler - Handler (event, data) => void
   * @returns {Function} Unsubscribe function
   */
  onAll(handler) {
    if (typeof handler !== "function") {
      log.warn("EventBus.onAll: handler must be a function");
      return () => {};
    }

    this._wildcardListeners.add(handler);
    return () => this._wildcardListeners.delete(handler);
  }

  /**
   * Unsubscribe from an event
   *
   * @param {string} event - Event name
   * @param {Function} handler - Handler to remove
   */
  off(event, handler) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(handler);

      if (this._debug) {
        log.debug(
          `EventBus: unsubscribed from "${event}" (${listeners.size} remaining)`
        );
      }

      // Clean up empty sets
      if (listeners.size === 0) {
        this._listeners.delete(event);
      }
    }
  }

  /**
   * Remove all listeners for an event (or all events)
   *
   * @param {string} [event] - Event to clear (omit to clear all)
   */
  clear(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
      this._wildcardListeners.clear();
    }
  }

  // =========================================================================
  // EMISSION
  // =========================================================================

  /**
   * Emit an event
   *
   * @param {string} event - Event name from BUS_EVENTS
   * @param {Object} [data={}] - Event data payload
   *
   * @example
   * eventBus.emit(BUS_EVENTS.VIEW_CREATED, {
   *     viewId: 'view-123',
   *     datasetId: 'dataset-456'
   * });
   */
  emit(event, data = {}) {
    const timestamp = Date.now();

    // Add to history
    this._addToHistory(event, data, timestamp);

    if (this._debug) {
      log.debug(`EventBus: emit "${event}"`, data);
    }

    // Call specific listeners
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const handler of listeners) {
        try {
          handler(data);
        } catch (error) {
          log.error(`EventBus: handler error for "${event}":`, error);
        }
      }
    }

    // Call wildcard listeners
    for (const handler of this._wildcardListeners) {
      try {
        handler(event, data);
      } catch (error) {
        log.error(`EventBus: wildcard handler error:`, error);
      }
    }
  }

  /**
   * Emit an event asynchronously (next tick)
   * Useful when you need to ensure current call stack completes first
   *
   * @param {string} event - Event name
   * @param {Object} [data={}] - Event data
   */
  emitAsync(event, data = {}) {
    queueMicrotask(() => this.emit(event, data));
  }

  // =========================================================================
  // HISTORY & DEBUGGING
  // =========================================================================

  /**
   * Add event to history
   * @private
   */
  _addToHistory(event, data, timestamp) {
    this._history.push({ event, data, timestamp });

    // Trim history if needed
    if (this._history.length > this._maxHistory) {
      this._history = this._history.slice(-this._maxHistory);
    }
  }

  /**
   * Get event history (for debugging)
   *
   * @param {string} [filterEvent] - Optional event type to filter
   * @param {number} [limit=50] - Max entries to return
   * @returns {Array<{event: string, data: any, timestamp: number}>}
   */
  getHistory(filterEvent, limit = 50) {
    let history = this._history;

    if (filterEvent) {
      history = history.filter((h) => h.event === filterEvent);
    }

    return history.slice(-limit);
  }

  /**
   * Enable/disable debug mode
   * @param {boolean} enabled
   */
  setDebug(enabled) {
    this._debug = enabled;
    log.info(`EventBus: debug mode ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Get listener count for an event
   * @param {string} event
   * @returns {number}
   */
  listenerCount(event) {
    return this._listeners.get(event)?.size || 0;
  }

  /**
   * Get all registered event names
   * @returns {string[]}
   */
  getEventNames() {
    return Array.from(this._listeners.keys());
  }

  /**
   * Check if event has listeners
   * @param {string} event
   * @returns {boolean}
   */
  hasListeners(event) {
    return (
      (this._listeners.get(event)?.size || 0) > 0 ||
      this._wildcardListeners.size > 0
    );
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const eventBus = new EventBus();

// =============================================================================
// REACT HOOK HELPER
// =============================================================================

/**
 * Helper for creating useEffect subscriptions
 *
 * @param {string} event - Event to subscribe to
 * @param {Function} handler - Handler function
 * @returns {{ event: string, handler: Function }}
 *
 * @example
 * // In a React component:
 * useEffect(() => {
 *     return eventBus.on(BUS_EVENTS.VIEW_CREATED, handleViewCreated);
 * }, [handleViewCreated]);
 */
export function createSubscription(event, handler) {
  return { event, handler };
}

// =============================================================================
// DEBUG UTILITIES (available on window in development)
// =============================================================================

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  window.CIA = window.CIA || {};
  window.CIA.eventBus = eventBus;
  window.CIA.BUS_EVENTS = BUS_EVENTS;

  // Convenience method to log all events
  window.CIA.traceEvents = () => {
    eventBus.setDebug(true);
    return eventBus.onAll((event, data) => {
      console.log(`🔔 ${event}`, data);
    });
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default eventBus;
