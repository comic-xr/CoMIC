// src/core/events/eventConstants.js
// =============================================================================
// CENTRALIZED EVENT CONSTANTS
// =============================================================================
//
// This file is the SINGLE SOURCE OF TRUTH for all event names in CIA Web.
// 
// WHY THIS EXISTS:
// - Prevents typos and mismatches (e.g., 'viewCreated' vs 'viewAdded')
// - IDE autocomplete helps find correct events
// - Easy to search for all usages of an event
// - Documents what events exist and their purpose
//
// USAGE:
// import { VIEW_EVENTS, CANVAS_EVENTS } from '@Core/events/eventConstants';
// viewManager.on(VIEW_EVENTS.ADDED, handler);
// window.dispatchEvent(new CustomEvent(CANVAS_EVENTS.SIZE_CHANGED, { detail }));
//
// =============================================================================

// =============================================================================
// VIEW CONFIGURATION MANAGER EVENTS
// Emitted by ViewConfigurationManager via EventEmitter pattern (manager.on/off)
// =============================================================================

export const VIEW_EVENTS = {
    // Lifecycle
    ADDED: 'viewAdded',           // New view created (local or remote)
    UPDATED: 'viewUpdated',       // View properties changed
    REMOVED: 'viewRemoved',       // View deleted (remote deletion)
    
    // Trash lifecycle
    TRASHED: 'viewTrashed',       // View moved to Recently Deleted
    RESTORED: 'viewRestored',     // View restored from Recently Deleted
    DELETED: 'viewDeleted',       // View permanently deleted
    
    // Linking
    LINK_CHANGED: 'linkChanged',  // Link added/removed/paused/resumed
    
    // Broadcasting
    BROADCAST_CHANGED: 'broadcastChanged', // Broadcast started/stopped/paused
    
    // Presence
    PRESENCE_UPDATED: 'presenceUpdated', // User joined/left view
};

// =============================================================================
// CANVAS MANAGER EVENTS
// Emitted by CanvasManager via EventEmitter pattern (manager.on/off)
// =============================================================================

export const CANVAS_MANAGER_EVENTS = {
    // Canvas lifecycle
    CREATED: 'canvasCreated',
    UPDATED: 'canvasUpdated',
    DELETED: 'canvasDeleted',
    
    // Placements
    PLACEMENT_ADDED: 'placementAdded',
    PLACEMENT_UPDATED: 'placementUpdated',
    PLACEMENT_REMOVED: 'placementRemoved',
    
    // Connection
    CONNECTION_STATE_CHANGED: 'connectionStateChanged',
    
    // Errors
    ERROR: 'error',
};

// =============================================================================
// DATASET MANAGER EVENTS
// Emitted by DatasetManager via EventEmitter pattern
// =============================================================================

export const DATASET_EVENTS = {
    ADDED: 'datasetAdded',
    UPDATED: 'datasetUpdated',
    REMOVED: 'datasetRemoved',
    LOADING: 'datasetLoading',
    LOADED: 'datasetLoaded',
    ERROR: 'datasetError',
};

// =============================================================================
// ANNOTATION EVENTS
// Emitted by AnnotationManager
// =============================================================================

export const ANNOTATION_EVENTS = {
    ADDED: 'annotationAdded',
    UPDATED: 'annotationUpdated',
    REMOVED: 'annotationRemoved',
    SELECTED: 'annotationSelected',
    DESELECTED: 'annotationDeselected',
};

// =============================================================================
// CUSTOM DOM EVENTS (window.dispatchEvent / window.addEventListener)
// Used for cross-component communication when not using manager subscriptions
// =============================================================================

export const DOM_EVENTS = {
    // View events
    VIEW_PLACED: 'cia:view-placed',
    VIEW_REMOVED: 'cia:view-removed',
    VIEW_SELECTED: 'cia:view-selected',
    CLOSE_VIEW: 'cia:close-view',
    REQUEST_INSTANCE: 'cia:request-instance',
    OPEN_CREATE_VIEW_MODAL: 'cia:open-create-view-modal',
    
    // Canvas events
    CANVAS_UPDATED: 'cia:canvas-updated',
    CANVAS_SIZE_CHANGED: 'cia:canvas-size-changed',
    CANVAS_TOOL_CHANGED: 'cia:canvas-tool-changed',
    
    // Layout events
    LAYOUT_MODE_CHANGED: 'cia:layout-mode-changed',
    FLOW_DIRECTION_CHANGED: 'cia:flow-direction-changed',
    SPAWN_SIZE_CHANGED: 'cia:spawn-size-changed',
    
    // Navigation events
    NAVIGATE_TO_CELL: 'cia:navigate-to-cell',
    VIEWPORT_MOVED: 'cia:viewport-moved',
    VIEWPORT_SIZE_CHANGED: 'cia:viewport-size-changed',
    
    // Placement events (DOM versions for cross-component)
    PLACEMENT_ADDED: 'cia:placement-added',
    PLACEMENT_REMOVED: 'cia:placement-removed',
    PLACEMENT_UPDATED: 'cia:placement-updated',
    
    // Instance events
    INSTANCE_READY: 'cia:instance-ready',
    INSTANCE_ERROR: 'cia:instance-error',
    INSTANCE_TOOLS_CHANGED: 'cia:instance-tools-changed',
    
    // Panel events
    PANEL_COLLAPSED: 'cia:panel-collapsed',
    PANEL_EXPANDED: 'cia:panel-expanded',
    TAB_CHANGED: 'cia:tab-changed',
    
    // Dataset events (DOM versions)
    DATASET_SELECTED: 'cia:dataset-selected',
    DATASET_DROPPED: 'cia:dataset-dropped',
};

// =============================================================================
// HELPER: Create typed custom event
// =============================================================================

/**
 * Create and dispatch a typed custom event
 * @param {string} eventName - Event name from DOM_EVENTS
 * @param {Object} detail - Event detail payload
 * @param {EventTarget} [target=window] - Target to dispatch on
 */
export function dispatchCIAEvent(eventName, detail = {}, target = window) {
    const event = new CustomEvent(eventName, { detail, bubbles: true });
    target.dispatchEvent(event);
}

/**
 * Subscribe to a CIA DOM event
 * @param {string} eventName - Event name from DOM_EVENTS
 * @param {Function} handler - Event handler
 * @param {EventTarget} [target=window] - Target to listen on
 * @returns {Function} Cleanup function to remove listener
 */
export function subscribeToCIAEvent(eventName, handler, target = window) {
    target.addEventListener(eventName, handler);
    return () => target.removeEventListener(eventName, handler);
}

// =============================================================================
// HELPER: Subscribe to multiple manager events
// =============================================================================

/**
 * Subscribe to multiple events on a manager
 * @param {Object} manager - Manager with on/off methods
 * @param {string[]} events - Array of event names
 * @param {Function} handler - Handler for all events
 * @returns {Function} Cleanup function to unsubscribe all
 */
export function subscribeToManagerEvents(manager, events, handler) {
    if (!manager?.on || !manager?.off) {
        console.warn('Manager does not support event subscription');
        return () => {};
    }
    
    events.forEach(event => manager.on(event, handler));
    
    return () => {
        events.forEach(event => manager.off(event, handler));
    };
}

/**
 * Get all VIEW_EVENTS that should trigger a refresh
 */
export function getViewRefreshEvents() {
    return [
        VIEW_EVENTS.ADDED,
        VIEW_EVENTS.UPDATED,
        VIEW_EVENTS.REMOVED,
        VIEW_EVENTS.TRASHED,
        VIEW_EVENTS.RESTORED,
        VIEW_EVENTS.DELETED,
    ];
}

/**
 * Get all DOM_EVENTS that should trigger a view list refresh
 */
export function getViewDOMRefreshEvents() {
    return [
        DOM_EVENTS.VIEW_PLACED,
        DOM_EVENTS.VIEW_REMOVED,
        DOM_EVENTS.CANVAS_UPDATED,
        DOM_EVENTS.PLACEMENT_ADDED,
        DOM_EVENTS.PLACEMENT_REMOVED,
    ];
}

// =============================================================================
// EXPORT ALL
// =============================================================================

export default {
    VIEW_EVENTS,
    CANVAS_MANAGER_EVENTS,
    DATASET_EVENTS,
    ANNOTATION_EVENTS,
    DOM_EVENTS,
    dispatchCIAEvent,
    subscribeToCIAEvent,
    subscribeToManagerEvents,
    getViewRefreshEvents,
    getViewDOMRefreshEvents,
};