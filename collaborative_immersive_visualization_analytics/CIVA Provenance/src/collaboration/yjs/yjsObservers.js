// src/collaboration/yjs/yjsObservers.js
// Y.js observers for PRESENCE DATA ONLY
//
// v2.0 ARCHITECTURE:
// ============================================================================
// Y.js is used ONLY for ephemeral presence data:
// - Cursor positions
// - VR avatars and controller poses
// - View presence (who's viewing what)
//
// PERSISTENT STATE comes from SERVER via REST API + WebSocket broadcast:
// - Datasets → /api/files + serverSync.js
// - Annotations → /api/annotations + serverSync.js
// - Views → /api/views + serverSync.js
// ============================================================================

import {
  yCursors,
  yCameras,
  yAvatars,
  yViewPresence,
} from "@Collaboration/yjs/yjsSetup.js";
import { getUserId } from "@Collaboration/presence/userManagement.js";
import { sync as log } from "@Utils/logger.js";

// ============================================================================
// LEGACY COMPATIBILITY EXPORTS
// These are kept for backward compatibility with appInitializer.js
// ============================================================================

let isSystemReady = false;

/**
 * Mark system as ready for processing
 * @deprecated v2.0 - Kept for backward compatibility, now a no-op
 */
export function markSystemReady() {
  log.debug("System marked as ready (no-op in v2.0 - state comes from server)");
  isSystemReady = true;
}

// ============================================================================
// PRESENCE OBSERVERS (Active in v2.0)
// ============================================================================

/**
 * Cursor presence observer
 * Watches for remote cursor updates and notifies listeners
 */
let cursorChangeCallbacks = [];

export function onCursorChange(callback) {
  cursorChangeCallbacks.push(callback);
  return () => {
    cursorChangeCallbacks = cursorChangeCallbacks.filter(
      (cb) => cb !== callback
    );
  };
}

export function initializeCursorObserver() {
  log.debug("Setting up cursor presence observer");

  yCursors.observe((event) => {
    const myId = getUserId();

    event.changes.keys.forEach((change, cursorUserId) => {
      // Skip own cursor
      if (cursorUserId === myId) return;

      const cursorData = yCursors.get(cursorUserId);
      cursorChangeCallbacks.forEach((cb) => {
        try {
          cb({ action: change.action, userId: cursorUserId, data: cursorData });
        } catch (error) {
          log.error("Cursor observer callback error:", error);
        }
      });
    });
  });

  log.debug("Cursor observer initialized");
}

/**
 * VR avatar presence observer
 * Watches for remote avatar updates
 */
let avatarChangeCallbacks = [];

export function onAvatarChange(callback) {
  avatarChangeCallbacks.push(callback);
  return () => {
    avatarChangeCallbacks = avatarChangeCallbacks.filter(
      (cb) => cb !== callback
    );
  };
}

export function initializeAvatarObserver() {
  log.debug("Setting up avatar presence observer");

  yAvatars.observe((event) => {
    const myId = getUserId();

    event.changes.keys.forEach((change, avatarUserId) => {
      // Skip own avatar
      if (avatarUserId === myId) return;

      const avatarData = yAvatars.get(avatarUserId);
      avatarChangeCallbacks.forEach((cb) => {
        try {
          cb({ action: change.action, userId: avatarUserId, data: avatarData });
        } catch (error) {
          log.error("Avatar observer callback error:", error);
        }
      });
    });
  });

  log.debug("Avatar observer initialized");
}

/**
 * View presence observer
 * Tracks who is viewing which view configuration
 */
let viewPresenceChangeCallbacks = [];

export function onViewPresenceChange(callback) {
  viewPresenceChangeCallbacks.push(callback);
  return () => {
    viewPresenceChangeCallbacks = viewPresenceChangeCallbacks.filter(
      (cb) => cb !== callback
    );
  };
}

export function initializeViewPresenceObserver() {
  log.debug("Setting up view presence observer");

  yViewPresence.observe((event) => {
    event.changes.keys.forEach((change, viewId) => {
      const presenceData = yViewPresence.get(viewId);
      viewPresenceChangeCallbacks.forEach((cb) => {
        try {
          cb({ action: change.action, viewId, data: presenceData });
        } catch (error) {
          log.error("View presence observer callback error:", error);
        }
      });
    });
  });

  log.debug("View presence observer initialized");
}

/**
 * Camera presence observer
 * Watches for remote camera updates for real-time smooth synchronization
 * This enables smooth camera sync between users viewing the same view
 */
let cameraChangeCallbacks = [];

export function onCameraChange(callback) {
  cameraChangeCallbacks.push(callback);
  return () => {
    cameraChangeCallbacks = cameraChangeCallbacks.filter(
      (cb) => cb !== callback
    );
  };
}

export function initializeCameraObserver() {
  log.debug("Setting up camera presence observer");

  yCameras.observe((event) => {
    const myId = getUserId();

    event.changes.keys.forEach((change, viewId) => {
      const cameraData = yCameras.get(viewId);

      // Skip if this is our own camera update
      if (cameraData && cameraData.userId === myId) return;

      cameraChangeCallbacks.forEach((cb) => {
        try {
          cb({
            action: change.action,
            viewId,
            camera: cameraData?.camera,
            userId: cameraData?.userId,
          });
        } catch (error) {
          log.error("Camera observer callback error:", error);
        }
      });
    });
  });

  log.debug("Camera observer initialized");
}

// ============================================================================
// Initialize All Observers
// ============================================================================

export function initializeAllObservers() {
  log.debug("Setting up Y.js observers (v2.0 - presence only)");

  // v2.0: Only presence observers are active
  initializeCursorObserver();
  initializeAvatarObserver();
  initializeViewPresenceObserver();
  initializeCameraObserver(); // Real-time camera sync

  // State (datasets, views, annotations) comes from server via:
  // - REST API: useProjectFiles, DatasetManager.fetchDatasetsFromServer
  // - WebSocket: serverSync.js broadcasts

  log.info("Y.js observers initialized (presence only)");
}
