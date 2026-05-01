// src/core/vr/VRCursorSync.js
// Synchronizes cursor positions between desktop and VR users
//
// STUB: Structure only, implementation deferred per DEC-014
//
// Cross-Platform Cursor Visibility (DEC-017):
// - Desktop cursors visible in VR as floating dots/rays
// - VR controller pointers visible on desktop as projected rays
// - VR hand positions visible when hand tracking is active

import { cursor as log } from "@Utils/logger.js";
import { ydoc } from "@Collaboration/yjs/yjsSetup.js";

/**
 * VRCursorSync - Cross-platform cursor synchronization
 *
 * Uses Y.js to broadcast cursor positions between users.
 * Desktop users see VR pointers, VR users see desktop cursors.
 *
 * Cursor Types:
 * - 'desktop': 2D mouse position mapped to 3D world
 * - 'vr-controller': 6DOF controller ray
 * - 'vr-hand': Hand tracking position
 */
export class VRCursorSync {
  constructor() {
    // Y.js map for cursor synchronization
    this._yCursors = null;
    this._yHands = null;

    // Local user info
    this._localUserId = null;
    this._localUserName = null;
    this._localUserColor = "#00ff00";

    // Render callbacks per view
    this._renderCallbacks = new Map(); // viewId -> callback

    // Cached remote cursors
    this._remoteCursors = new Map(); // odUserId -> cursorData
    this._remoteHands = new Map(); // odUserId -> { left, right }

    // Throttle config
    this._updateThrottleMs = 50; // Max 20 updates/second
    this._lastUpdateTime = 0;

    // Observers
    this._cursorObserver = null;
    this._handObserver = null;
    this._handCallbacks = new Set();
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  /**
   * Initialize cursor sync with user info
   *
   * @param {string} userId - Current user's ID
   * @param {string} userName - Current user's display name
   * @param {string} userColor - Current user's color (hex)
   */
  initialize(userId, userName, userColor = "#00ff00") {
    log.debug(`VRCursorSync: Initializing for user ${userId}`);

    this._localUserId = userId;
    this._localUserName = userName;
    this._localUserColor = userColor;

    // Get Y.js maps
    this._yCursors = ydoc.getMap("vrCursors");
    this._yHands = ydoc.getMap("vrHands");

    // Set up observers
    this._setupObservers();

    log.debug("VRCursorSync: Initialized");
  }

  /**
   * Set up Y.js observers for remote cursor updates
   */
  _setupObservers() {
    if (this._cursorObserver) {
      this._yCursors.unobserve(this._cursorObserver);
    }
    if (this._handObserver) {
      this._yHands.unobserve(this._handObserver);
    }

    // Cursor updates
    this._cursorObserver = (event) => {
      event.changes.keys.forEach((change, odUserId) => {
        if (odUserId === this._localUserId) return; // Ignore own updates

        if (change.action === "delete") {
          this._remoteCursors.delete(odUserId);
          this._notifyRenderCallbacks(odUserId, null);
        } else {
          const cursorData = this._yCursors.get(odUserId);
          this._remoteCursors.set(odUserId, cursorData);
          this._notifyRenderCallbacks(odUserId, cursorData);
        }
      });
    };
    this._yCursors.observe(this._cursorObserver);

    // Hand tracking updates (separate for higher frequency)
    this._handObserver = (event) => {
      event.changes.keys.forEach((change, key) => {
        // Key format: odUserId_left or odUserId_right
        const [odUserId, hand] = key.split("_");
        if (odUserId === this._localUserId) return;

        if (change.action === "delete") {
          // Hand no longer tracked
          this._notifyHandCallbacks(odUserId, hand, null);
        } else {
          const handData = this._yHands.get(key);
          this._notifyHandCallbacks(odUserId, hand, handData);
        }
      });
    };
    this._yHands.observe(this._handObserver);
  }

  // ===========================================================================
  // BROADCASTING (Local -> Remote)
  // ===========================================================================

  /**
   * Broadcast desktop cursor position
   *
   * @param {string} viewId - Which view the cursor is over
   * @param {Object} screenPos - { x, y } normalized screen position (0-1)
   * @param {Object} worldPos - { x, y, z } 3D world position (if computed)
   */
  broadcastDesktopCursor(viewId, screenPos, worldPos = null) {
    if (!this._localUserId || !this._yCursors) return;
    if (!this._shouldUpdate()) return;

    const cursorData = {
      mode: "desktop",
      viewId,
      screenPos,
      worldPos,
      userName: this._localUserName,
      userColor: this._localUserColor,
      timestamp: Date.now(),
    };

    try {
      this._yCursors.set(this._localUserId, cursorData);
    } catch (error) {
      log.error("VRCursorSync: Failed to broadcast desktop cursor:", error);
    }
  }

  /**
   * Broadcast VR controller ray
   *
   * @param {string} viewId - Which view the ray intersects (if any)
   * @param {Object} rayOrigin - { x, y, z } controller position
   * @param {Object} rayDirection - { x, y, z } normalized direction
   * @param {string} hand - 'left' | 'right'
   */
  broadcastVRPointer(viewId, rayOrigin, rayDirection, hand = "right") {
    if (!this._localUserId || !this._yCursors) return;
    if (!this._shouldUpdate()) return;

    const cursorData = {
      mode: "vr-controller",
      viewId,
      rayOrigin,
      rayDirection,
      hand,
      userName: this._localUserName,
      userColor: this._localUserColor,
      timestamp: Date.now(),
    };

    try {
      this._yCursors.set(this._localUserId, cursorData);
    } catch (error) {
      log.error("VRCursorSync: Failed to broadcast VR pointer:", error);
    }
  }

  /**
   * Broadcast VR hand position (hand tracking)
   *
   * @param {string} hand - 'left' | 'right'
   * @param {Object} position - { x, y, z } hand position
   * @param {Object} rotation - { x, y, z, w } hand orientation quaternion
   * @param {Object} fingers - Optional finger joint data
   */
  broadcastHandPosition(hand, position, rotation, fingers = null) {
    if (!this._localUserId || !this._yHands) return;
    if (!this._shouldUpdate()) return;

    const key = `${this._localUserId}_${hand}`;
    const handData = {
      hand,
      position,
      rotation,
      fingers,
      userName: this._localUserName,
      userColor: this._localUserColor,
      timestamp: Date.now(),
    };

    try {
      this._yHands.set(key, handData);
    } catch (error) {
      log.error("VRCursorSync: Failed to broadcast hand position:", error);
    }
  }

  /**
   * Clear cursor when leaving a view or going idle
   */
  clearCursor() {
    if (!this._localUserId || !this._yCursors) return;

    try {
      this._yCursors.delete(this._localUserId);
    } catch (error) {
      log.error("VRCursorSync: Failed to clear cursor:", error);
    }
  }

  /**
   * Clear hand tracking data
   */
  clearHands() {
    if (!this._localUserId || !this._yHands) return;

    try {
      this._yHands.delete(`${this._localUserId}_left`);
      this._yHands.delete(`${this._localUserId}_right`);
    } catch (error) {
      log.error("VRCursorSync: Failed to clear hands:", error);
    }
  }

  // ===========================================================================
  // RECEIVING (Remote -> Local Rendering)
  // ===========================================================================

  /**
   * Register callback to render remote cursors for a specific view
   *
   * @param {string} viewId - View to receive cursor updates for
   * @param {Function} callback - Called with (odUserId, cursorData)
   * @returns {Function} Unsubscribe function
   */
  onRemoteCursor(viewId, callback) {
    if (!this._renderCallbacks.has(viewId)) {
      this._renderCallbacks.set(viewId, new Set());
    }
    this._renderCallbacks.get(viewId).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this._renderCallbacks.get(viewId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this._renderCallbacks.delete(viewId);
        }
      }
    };
  }

  /**
   * Get all current remote cursors
   * @returns {Array} Array of { odUserId, ...cursorData }
   */
  getRemoteCursors() {
    const cursors = [];
    this._remoteCursors.forEach((data, odUserId) => {
      cursors.push({ odUserId, ...data });
    });
    return cursors;
  }

  /**
   * Get remote cursors for a specific view
   * @param {string} viewId
   * @returns {Array}
   */
  getRemoteCursorsForView(viewId) {
    return this.getRemoteCursors().filter((cursor) => cursor.viewId === viewId);
  }

  /**
   * Subscribe to remote hand-tracking updates.
   *
   * @param {Function} callback - Called with (odUserId, hand, handData, handsForUser)
   * @returns {Function} Unsubscribe function
   */
  onRemoteHand(callback) {
    this._handCallbacks.add(callback);
    return () => {
      this._handCallbacks.delete(callback);
    };
  }

  /**
   * Get hand tracking state for one remote user or all remote users.
   */
  getRemoteHands(odUserId = null) {
    if (odUserId) {
      return this._remoteHands.get(odUserId) || { left: null, right: null };
    }

    return Array.from(this._remoteHands.entries()).map(([userId, hands]) => ({
      odUserId: userId,
      ...hands,
    }));
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Throttle updates to avoid flooding Y.js
   */
  _shouldUpdate() {
    const now = Date.now();
    if (now - this._lastUpdateTime < this._updateThrottleMs) {
      return false;
    }
    this._lastUpdateTime = now;
    return true;
  }

  /**
   * Notify render callbacks for a cursor update
   */
  _notifyRenderCallbacks(odUserId, cursorData) {
    if (!cursorData) {
      // Cursor removed - notify all views
      this._renderCallbacks.forEach((callbacks) => {
        callbacks.forEach((cb) => {
          try {
            cb(odUserId, null);
          } catch (error) {
            log.error("Cursor callback error:", error);
          }
        });
      });
      return;
    }

    // Notify callbacks for the specific view
    const callbacks = this._renderCallbacks.get(cursorData.viewId);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(odUserId, cursorData);
        } catch (error) {
          log.error("Cursor callback error:", error);
        }
      });
    }
  }

  /**
   * Notify hand tracking callbacks
   */
  _notifyHandCallbacks(odUserId, hand, handData) {
    const nextHands = {
      ...(this._remoteHands.get(odUserId) || { left: null, right: null }),
      [hand]: handData,
    };

    if (!nextHands.left && !nextHands.right) {
      this._remoteHands.delete(odUserId);
    } else {
      this._remoteHands.set(odUserId, nextHands);
    }

    this._handCallbacks.forEach((callback) => {
      try {
        callback(odUserId, hand, handData, nextHands);
      } catch (error) {
        log.error("Hand callback error:", error);
      }
    });
  }

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  /**
   * Update user color (for cursor visualization)
   */
  setUserColor(color) {
    this._localUserColor = color;
  }

  /**
   * Set update throttle rate
   * @param {number} ms - Minimum milliseconds between updates
   */
  setUpdateThrottle(ms) {
    this._updateThrottleMs = ms;
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Clean up cursor sync
   */
  dispose() {
    // Clear local cursor
    this.clearCursor();
    this.clearHands();

    // Clear callbacks
    this._renderCallbacks.clear();
    this._remoteCursors.clear();
    this._remoteHands.clear();
    this._handCallbacks.clear();

    if (this._yCursors && this._cursorObserver) {
      this._yCursors.unobserve(this._cursorObserver);
    }
    if (this._yHands && this._handObserver) {
      this._yHands.unobserve(this._handObserver);
    }

    // Clear references
    this._localUserId = null;
    this._yCursors = null;
    this._yHands = null;
    this._cursorObserver = null;
    this._handObserver = null;

    log.debug("VRCursorSync: Disposed");
  }
}

// Singleton instance
export const vrCursorSync = new VRCursorSync();
