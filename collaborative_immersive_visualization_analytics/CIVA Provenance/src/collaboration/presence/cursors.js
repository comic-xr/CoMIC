// ----------------------------------------------------------------------------
// Collaborative Cursor System - Generic Coordination Layer
//
// ARCHITECTURE:
// This file handles cursor POSITION TRACKING and Y.js SYNCHRONIZATION only.
// It does NOT render cursors - that's the responsibility of instance type handlers.
//
// Instance handlers (VTKInstanceCursors, PlotlyInstanceCursors, etc.) subscribe
// to cursor updates and render cursors in their own coordinate systems.
// ----------------------------------------------------------------------------

import {
  getUserId,
  getUserName,
  getUserColor,
} from "@Collaboration/presence/userManagement.js";
import { ydoc, awareness } from "@Collaboration/yjs/yjsSetup.js";
import { NETWORK_CONFIG } from "@Core/config/constants.js";
import { cursor as log } from "@Utils/logger.js";

// Separate Y.js maps for position and preferences
const yCursors = ydoc.getMap("cursors"); // Position data only
const yCursorPrefs = ydoc.getMap("cursorPreferences"); // Visibility, style

// Cursor position tracking
let lastMousePosition = { x: 0, y: 0, timestamp: 0 };
let lastBroadcastTime = 0;
let broadcastPending = false;
let lastWindowActive = true;

// Local display preferences (not synced - each user controls their own view)
let showCursorNames = true;
const cursorNameListeners = new Set();

// Self-cursor visibility (whether to show your own projected cursor)
let showSelfCursor = true;
const selfCursorListeners = new Set();

// Show others' cursors (local preference)
let showOthersCursors = true;
const othersCursorsListeners = new Set();

// 3D world position (set by instance handlers like VTK)
let lastWorldPosition = null; // { x, y, z } or null
let lastWorldNormal = null; // { x, y, z } or null (surface normal for orientation)

// Listeners for cursor updates (instance handlers subscribe here)
const cursorUpdateListeners = new Set();
const cursorRemoveListeners = new Set();

// Track which instance is currently active
let activeInstanceId = null;
// Track which viewConfig is currently active (shared across collaborators)
let activeViewConfigId = null;

export function setActiveInstance(instanceId, viewConfigId = null) {
  const previousInstanceId = activeInstanceId;
  activeInstanceId = instanceId;

  // Update viewConfigId if provided
  if (viewConfigId !== null) {
    activeViewConfigId = viewConfigId;
  }

  // Clear world position when switching instances (3D coordinates are instance-specific)
  if (previousInstanceId !== instanceId) {
    lastWorldPosition = null;
    lastWorldNormal = null;
  }

  // Re-broadcast with new instance context
  if (lastMousePosition.timestamp > 0) {
    broadcastCursorPosition();
  }
}

export function getActiveInstance() {
  return activeInstanceId;
}

export function getActiveViewConfig() {
  return activeViewConfigId;
}

// ----------------------------------------------------------------------------
// Mouse Tracking (Global Page Coordinates)
// ----------------------------------------------------------------------------

export function initializeCursorTracking() {
  log.debug("Initializing cursor tracking");

  document.addEventListener("mousemove", (event) => {
    const now = Date.now();
    lastMousePosition = {
      x: event.clientX,
      y: event.clientY,
      timestamp: now,
    };

    // Render locally at input rate, throttle Y.js sync separately
    notifyLocalCursorUpdate(true);
    scheduleBroadcast(true);
  });

  // Handle window focus/blur
  window.addEventListener("blur", () => {
    lastWindowActive = false;
    notifyLocalCursorUpdate(false);
    scheduleBroadcast(false);
    // Clear cursor from awareness when window loses focus
    const currentState = awareness.getLocalState() || {};
    awareness.setLocalState({
      ...currentState,
      cursor: null,
    });
  });

  window.addEventListener("focus", () => {
    lastWindowActive = true;
    if (lastMousePosition.timestamp > 0) {
      notifyLocalCursorUpdate(true);
      scheduleBroadcast(true);
    }
  });

  log.debug("Cursor tracking initialized");
}

// ----------------------------------------------------------------------------
// Cursor Position Broadcasting
// ----------------------------------------------------------------------------

function broadcastCursorPosition(windowActive = true) {
  const cursorData = buildCursorData(windowActive);
  if (!cursorData) return;

  yCursors.set(getUserId(), cursorData);

  // Also update awareness for server-side recording
  const currentState = awareness.getLocalState() || {};
  awareness.setLocalState({
    ...currentState,
    cursor: {
      instanceId: activeInstanceId,
      viewConfigId: activeViewConfigId,
      screen: { x: lastMousePosition.x, y: lastMousePosition.y },
      x: lastMousePosition.x,
      y: lastMousePosition.y,
      world: lastWorldPosition ? { ...lastWorldPosition } : null,
      normal: lastWorldNormal ? { ...lastWorldNormal } : null,
      timestamp: lastMousePosition.timestamp,
    },
  });
}

function buildCursorData(windowActive = true) {
  if (!lastMousePosition || lastMousePosition.timestamp === 0) return null;

  // Read visibility preference
  const prefs = yCursorPrefs.get(getUserId()) || {
    visible: true,
    style: "pointer",
  };

  // Update position data in Y.js
  if (!activeInstanceId) return null;

  return {
    instanceId: activeInstanceId,
    // ViewConfigId for collaborative matching (shared across users viewing same content)
    viewConfigId: activeViewConfigId,
    // Screen coordinates (always present)
    screen: {
      x: lastMousePosition.x,
      y: lastMousePosition.y,
    },
    // Legacy fields for backward compatibility
    x: lastMousePosition.x,
    y: lastMousePosition.y,
    // World coordinates (optional, set by 3D handlers)
    world: lastWorldPosition ? { ...lastWorldPosition } : null,
    // Surface normal (optional, for orientation)
    normal: lastWorldNormal ? { ...lastWorldNormal } : null,
    // Metadata
    timestamp: lastMousePosition.timestamp,
    color: getUserColor(getUserId()),
    name: getUserName(),
    windowActive: windowActive,
    visible: prefs.visible, // Include visibility in position data for convenience
  };
}

function notifyLocalCursorUpdate(windowActive = true) {
  const cursorData = buildCursorData(windowActive);
  if (!cursorData) return;

  const userId = getUserId();
  if (cursorData.visible !== false) {
    cursorUpdateListeners.forEach((callback) => {
      try {
        callback({ userId, cursorData });
      } catch (error) {
        log.error("Error in cursor update listener:", error);
      }
    });
  } else {
    cursorRemoveListeners.forEach((callback) => {
      try {
        callback({ userId });
      } catch (error) {
        log.error("Error in cursor remove listener:", error);
      }
    });
  }
}

function scheduleBroadcast(windowActive = lastWindowActive) {
  if (broadcastPending) return;
  broadcastPending = true;

  requestAnimationFrame(() => {
    broadcastPending = false;
    const now = Date.now();
    const elapsed = now - lastBroadcastTime;

    if (elapsed < NETWORK_CONFIG.CURSOR_UPDATE_THROTTLE) {
      setTimeout(() => {
        scheduleBroadcast(windowActive);
      }, NETWORK_CONFIG.CURSOR_UPDATE_THROTTLE - elapsed);
      return;
    }

    lastBroadcastTime = now;
    broadcastCursorPosition(windowActive);
  });
}

// ----------------------------------------------------------------------------
// Cursor Visibility Control
// ----------------------------------------------------------------------------

export function setMyCursorVisible(visible) {
  const prefs = yCursorPrefs.get(getUserId()) || { style: "pointer" };
  prefs.visible = visible;
  yCursorPrefs.set(getUserId(), prefs);

  // Update current position with new visibility
  notifyLocalCursorUpdate(lastWindowActive);
  scheduleBroadcast(lastWindowActive);

  log.debug(`My cursor visibility: ${visible}`);
}

export function getMyCursorVisible() {
  const prefs = yCursorPrefs.get(getUserId());
  return prefs?.visible !== false; // Default to visible
}

// ----------------------------------------------------------------------------
// Cursor Name Display (Local Preference)
// ----------------------------------------------------------------------------

/**
 * Set whether to show names on other users' cursors.
 * This is a local preference - each user controls their own view.
 * @param {boolean} visible - Whether to show cursor names
 */
export function setCursorNamesVisible(visible) {
  showCursorNames = visible;
  log.debug(`Cursor names visibility: ${visible}`);

  // Notify all listeners
  cursorNameListeners.forEach((callback) => {
    try {
      callback(visible);
    } catch (error) {
      log.error("Error in cursor name visibility listener:", error);
    }
  });
}

/**
 * Get whether cursor names are currently shown
 * @returns {boolean}
 */
export function getCursorNamesVisible() {
  return showCursorNames;
}

/**
 * Subscribe to cursor name visibility changes
 * @param {Function} callback - Called with (visible: boolean)
 * @returns {Function} Cleanup function
 */
export function onCursorNamesVisibilityChange(callback) {
  cursorNameListeners.add(callback);
  return () => {
    cursorNameListeners.delete(callback);
  };
}

// ----------------------------------------------------------------------------
// Self-Cursor Display (Local Preference)
// ----------------------------------------------------------------------------

/**
 * Set whether to show your own projected cursor in viewports.
 * When disabled, only other users' cursors are shown.
 * @param {boolean} visible - Whether to show self cursor
 */
export function setSelfCursorVisible(visible) {
  showSelfCursor = visible;
  log.debug(`Self cursor visibility: ${visible}`);

  // Notify all listeners
  selfCursorListeners.forEach((callback) => {
    try {
      callback(visible);
    } catch (error) {
      log.error("Error in self cursor visibility listener:", error);
    }
  });
}

/**
 * Get whether self cursor is currently shown
 * @returns {boolean}
 */
export function getSelfCursorVisible() {
  return showSelfCursor;
}

/**
 * Subscribe to self cursor visibility changes
 * @param {Function} callback - Called with (visible: boolean)
 * @returns {Function} Cleanup function
 */
export function onSelfCursorVisibilityChange(callback) {
  selfCursorListeners.add(callback);
  return () => {
    selfCursorListeners.delete(callback);
  };
}

// ----------------------------------------------------------------------------
// Show Others' Cursors (Local Preference)
// ----------------------------------------------------------------------------

/**
 * Set whether to show other users' cursors in viewports.
 * @param {boolean} visible - Whether to show others' cursors
 */
export function setShowOthersCursors(visible) {
  showOthersCursors = visible;
  log.debug(`Show others cursors: ${visible}`);

  // Notify all listeners
  othersCursorsListeners.forEach((callback) => {
    try {
      callback(visible);
    } catch (error) {
      log.error("Error in others cursors visibility listener:", error);
    }
  });
}

/**
 * Get whether others' cursors are currently shown
 * @returns {boolean}
 */
export function getShowOthersCursors() {
  return showOthersCursors;
}

/**
 * Subscribe to others' cursors visibility changes
 * @param {Function} callback - Called with (visible: boolean)
 * @returns {Function} Cleanup function
 */
export function onShowOthersCursorsChange(callback) {
  othersCursorsListeners.add(callback);
  return () => {
    othersCursorsListeners.delete(callback);
  };
}

// ----------------------------------------------------------------------------
// Cursor Color (Synced via Y.js)
// ----------------------------------------------------------------------------

/**
 * Set my cursor color
 * @param {string} color - Hex color string (e.g., "#60a5fa")
 */
export function setMyCursorColor(color) {
  const prefs = yCursorPrefs.get(getUserId()) || {
    visible: true,
    style: "pointer",
  };
  prefs.color = color;
  yCursorPrefs.set(getUserId(), prefs);

  // Update current position with new color
  notifyLocalCursorUpdate(lastWindowActive);
  scheduleBroadcast(lastWindowActive);

  log.debug(`My cursor color: ${color}`);
}

/**
 * Get my cursor color
 * @returns {string} Hex color string
 */
export function getMyCursorColor() {
  const prefs = yCursorPrefs.get(getUserId());
  return prefs?.color || getUserColor(getUserId());
}

// ----------------------------------------------------------------------------
// 3D World Position Updates (For Instance Handlers like VTK)
// ----------------------------------------------------------------------------

/**
 * Update the cursor's 3D world position.
 * Called by instance handlers (VTK, etc.) when they can compute world coordinates
 * from screen coordinates (e.g., via ray picking).
 *
 * @param {{ x: number, y: number, z: number } | null} worldPos - World coordinates or null to clear
 * @param {{ x: number, y: number, z: number } | null} normal - Surface normal at cursor position (optional)
 */
export function updateCursorWorldPosition(worldPos, normal = null) {
  // Validate and store world position
  if (
    worldPos &&
    typeof worldPos.x === "number" &&
    typeof worldPos.y === "number" &&
    typeof worldPos.z === "number"
  ) {
    lastWorldPosition = {
      x: worldPos.x,
      y: worldPos.y,
      z: worldPos.z,
    };
  } else {
    lastWorldPosition = null;
  }

  // Validate and store normal
  if (
    normal &&
    typeof normal.x === "number" &&
    typeof normal.y === "number" &&
    typeof normal.z === "number"
  ) {
    lastWorldNormal = {
      x: normal.x,
      y: normal.y,
      z: normal.z,
    };
  } else {
    lastWorldNormal = null;
  }

  // Broadcast the updated position (includes world coordinates now)
  if (lastMousePosition.timestamp > 0) {
    notifyLocalCursorUpdate(lastWindowActive);
    scheduleBroadcast(lastWindowActive);
  }
}

/**
 * Clear the 3D world position (e.g., when cursor leaves the 3D surface)
 */
export function clearCursorWorldPosition() {
  lastWorldPosition = null;
  lastWorldNormal = null;

  if (lastMousePosition.timestamp > 0) {
    notifyLocalCursorUpdate(lastWindowActive);
    scheduleBroadcast(lastWindowActive);
  }
}

/**
 * Get the current world position (for local use)
 * @returns {{ x: number, y: number, z: number } | null}
 */
export function getCursorWorldPosition() {
  return lastWorldPosition ? { ...lastWorldPosition } : null;
}

/**
 * Get the current world normal (for local use)
 * @returns {{ x: number, y: number, z: number } | null}
 */
export function getCursorWorldNormal() {
  return lastWorldNormal ? { ...lastWorldNormal } : null;
}

// ----------------------------------------------------------------------------
// Cursor Display Position Helper
// ----------------------------------------------------------------------------

/**
 * Get the display position for a cursor based on the requested mode.
 * Provides backward compatibility - falls back to screen coordinates if world is unavailable.
 *
 * @param {Object} cursorData - Cursor data from the subscription callback
 * @param {'screen' | 'world' | 'auto'} mode - Position mode:
 *   - 'screen': Always return screen coordinates
 *   - 'world': Return world coordinates (or null if unavailable)
 *   - 'auto': Return world if available, otherwise screen
 * @returns {{ type: 'screen' | 'world', position: { x: number, y: number, z?: number }, normal?: { x: number, y: number, z: number } } | null}
 */
export function getCursorDisplayPosition(cursorData, mode = "auto") {
  if (!cursorData) return null;

  // Get screen coordinates (with backward compatibility)
  const screenPos = cursorData.screen || { x: cursorData.x, y: cursorData.y };

  switch (mode) {
    case "screen":
      return {
        type: "screen",
        position: { x: screenPos.x, y: screenPos.y },
      };

    case "world":
      if (cursorData.world) {
        return {
          type: "world",
          position: {
            x: cursorData.world.x,
            y: cursorData.world.y,
            z: cursorData.world.z,
          },
          normal: cursorData.normal || null,
        };
      }
      return null; // World coordinates not available

    case "auto":
    default:
      if (cursorData.world) {
        return {
          type: "world",
          position: {
            x: cursorData.world.x,
            y: cursorData.world.y,
            z: cursorData.world.z,
          },
          normal: cursorData.normal || null,
        };
      }
      return {
        type: "screen",
        position: { x: screenPos.x, y: screenPos.y },
      };
  }
}

/**
 * Check if cursor data has valid world coordinates
 * @param {Object} cursorData - Cursor data from subscription
 * @returns {boolean}
 */
export function hasWorldPosition(cursorData) {
  return !!(
    cursorData?.world &&
    typeof cursorData.world.x === "number" &&
    typeof cursorData.world.y === "number" &&
    typeof cursorData.world.z === "number"
  );
}

// ----------------------------------------------------------------------------
// Subscribe to Cursor Updates (For Instance Handlers)
// ----------------------------------------------------------------------------

/**
 * Subscribe to cursor position updates from other users
 * Instance handlers call this to get notified of cursor movements
 *
 * @param {Function} callback - Called with { userId, cursorData }
 * @returns {Function} cleanup function
 */
export function onCursorUpdate(callback) {
  cursorUpdateListeners.add(callback);

  // Return cleanup function
  return () => {
    cursorUpdateListeners.delete(callback);
  };
}

/**
 * Subscribe to cursor removal events
 *
 * @param {Function} callback - Called with { userId }
 * @returns {Function} cleanup function
 */
export function onCursorRemove(callback) {
  cursorRemoveListeners.add(callback);

  return () => {
    cursorRemoveListeners.delete(callback);
  };
}

// ----------------------------------------------------------------------------
// Y.js Observer (Broadcasts to Instance Handlers)
// ----------------------------------------------------------------------------

// Observe cursor changes and notify all subscribers
// NOTE: We include own cursor updates so users can see their own cursor rendered
// in their color, matching what others see. VTKInstanceCursors handles self-cursor
// specially (no name label, hides native OS cursor).
yCursors.observe((event) => {
  event.changes.keys.forEach((change, userId) => {
    if (userId === getUserId()) return;
    if (change.action === "add" || change.action === "update") {
      const cursorData = yCursors.get(userId);

      if (cursorData && cursorData.visible !== false) {
        // Notify all instance handlers
        cursorUpdateListeners.forEach((callback) => {
          try {
            callback({ userId, cursorData });
          } catch (error) {
            log.error("Error in cursor update listener:", error);
          }
        });
      } else {
        // Cursor is hidden, notify removal
        cursorRemoveListeners.forEach((callback) => {
          try {
            callback({ userId });
          } catch (error) {
            log.error("Error in cursor remove listener:", error);
          }
        });
      }
    } else if (change.action === "delete") {
      // User disconnected
      cursorRemoveListeners.forEach((callback) => {
        try {
          callback({ userId });
        } catch (error) {
          log.error("Error in cursor remove listener:", error);
        }
      });
    }
  });
});

log.debug("Cursor coordination system initialized");
