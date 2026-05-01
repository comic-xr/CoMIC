// src/core/session/sessionManager.js
// Centralized management of session identity and routing
// This is the single source of truth for "which room am I in?"
import { config } from "@Core/config/clientConfig.js";
import { auth as log } from "@Utils/logger.js";

class SessionManager {
  constructor() {
    this.roomId = null;
    this.roomName = null;
    this.userId = null;
    this.sessionStartedAt = null;
  }

  /**
   * Initialize session from URL or default
   * This should be called once during application startup, before Y.js connects
   */
  initializeFromURL() {
    // The room identity can come from several sources, checked in priority order:

    // 1. URL path parameter (future: /rooms/project-123)
    const pathMatch = window.location.pathname.match(/^\/rooms\/([^\/]+)/);
    if (pathMatch) {
      this.roomId = pathMatch[1];
      this.roomName = this.roomId; // For now, ID and name are the same
      log.info(`Session initialized from URL path: ${this.roomId}`);
      return this.roomId;
    }

    // 2. URL query parameter (?room=analytics-project)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room");
    if (roomParam) {
      this.roomId = roomParam;
      this.roomName = roomParam;
      log.info(`Session initialized from query param: ${this.roomId}`);
      return this.roomId;
    }

    // 3. localStorage (for returning users)
    const savedRoom = localStorage.getItem("cia_last_room");
    if (savedRoom) {
      this.roomId = savedRoom;
      this.roomName = savedRoom;
      log.info(`Session initialized from localStorage: ${this.roomId}`);
      return this.roomId;
    }

    // 4. Default room (for development/testing)
    // Use demo project ID from config (server-compatible UUID)
    this.roomId = config.defaultSessionId;
    this.roomName = "Demo Project";
    log.info(`Session initialized with default room: ${this.roomId}`);

    return this.roomId;
  }

  /**
   * Get the current room ID
   * This is what gets passed to Y.js WebsocketProvider
   */
  getRoomId() {
    if (!this.roomId) {
      throw new Error(
        "Session not initialized - call initializeFromURL() first"
      );
    }
    return this.roomId;
  }

  /**
   * Get the display name for the current room
   * This is what gets shown in the UI
   */
  getRoomName() {
    return this.roomName || this.roomId;
  }

  /**
   * Update the room name (display name only, doesn't change the room)
   * Useful when you fetch project metadata from a server later
   */
  setRoomDisplayName(displayName) {
    this.roomName = displayName;
    log.debug(`Room display name updated: ${displayName}`);
  }

  /**
   * Save current room to localStorage so returning users go to the same room
   */
  saveCurrentRoomToStorage() {
    if (this.roomId) {
      localStorage.setItem("cia_last_room", this.roomId);
    }
  }

  /**
   * Navigate to a different room (this will reload the page)
   * In the future, this might use client-side routing instead
   */
  switchRoom(newRoomId) {
    // Save the new room as the last visited room
    localStorage.setItem("cia_last_room", newRoomId);

    // Update URL to reflect new room
    const newUrl = `/rooms/${newRoomId}`;
    window.history.pushState({}, "", newUrl);

    // For now, we need to reload to reconnect Y.js
    // In the future, you might implement hot room switching
    log.info(`Switching to room: ${newRoomId}`);
    window.location.reload();
  }

  /*
   * Get current user ID
   * Returns a per-browser persistent id if not set, to avoid collisions between
   * different browser windows/tabs in development setups without auth.
   */
  getUserId() {
    // If a userId was explicitly set, return it.
    if (this.userId) return this.userId;

    // Try to load a per-browser persistent id from localStorage. This
    // ensures different browser windows/tabs do not collide when no
    // authentication is present.
    try {
      if (typeof window !== "undefined") {
        // Use sessionStorage so each tab/window gets a distinct id
        const stored = sessionStorage.getItem("cia_user_id");
        if (stored) {
          this.userId = stored;
          return this.userId;
        }
      }
    } catch (e) {
      // ignore storage errors
    }

    // Generate a short random id and persist it for this tab/window
    this.userId = generateShortId();
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("cia_user_id", this.userId);
      }
    } catch (e) {
      // ignore storage errors
    }
    return this.userId;
  }

  /**
   * Get current user email
   * Returns CIA Admin email if not set (for development)
   */
  getUserEmail() {
    return this.userEmail || "admin@cia-web.local";
  }

  /**
   * Set user info (called after authentication)
   */
  setUserInfo(userId, email) {
    this.userId = userId;
    this.userEmail = email;
    try {
      if (typeof window !== "undefined") {
        // Persist authenticated user id to sessionStorage to keep tab-scoped
        sessionStorage.setItem("cia_user_id", userId);
      }
    } catch (e) {
      // ignore storage errors
    }
    log.debug(`User info set: ${email} (${userId})`);
  }

  /**
   * Set the cached auth token (called by authService on auth success/refresh)
   */
  setToken(token) {
    this._cachedToken = token;
  }

  /**
   * Get the current auth token (cached for sync access)
   * This is used by CanvasManager and other services for authenticated API calls
   */
  getToken() {
    return this._cachedToken || null;
  }

  /**
   * Clear session (useful for logout or switching contexts)
   */
  clearSession() {
    this.roomId = null;
    this.roomName = null;
    this.userId = null;
    this.userEmail = null;
    this._cachedToken = null;
    localStorage.removeItem("cia_last_room");
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("cia_user_id");
      }
    } catch (e) {
      // ignore
    }
  }

  /**
   * Get complete session info for debugging
   */
  getSessionInfo() {
    return {
      roomId: this.roomId,
      roomName: this.roomName,
      userId: this.userId,
      sessionStartedAt: this.sessionStartedAt,
      url: window.location.href,
    };
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Convenience export for backward compatibility
export function getRoomName() {
  return sessionManager.getRoomName();
}

function generateShortId() {
  return (
    "user-" +
    Math.random().toString(36).slice(2, 10) +
    "-" +
    Date.now().toString(36).slice(-6)
  );
}
