// src/ui/react/hooks/usePresence.js
// React hook for subscribing to presence system updates
// Provides real-time user presence data from Y.js awareness

import { useState, useEffect, useCallback, useMemo } from "react";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";
import { createLogger } from "@Utils/logger.js";

const log = createLogger("presence");

/**
 * usePresence - Subscribe to presence system updates
 *
 * Returns real-time list of online users from Y.js awareness.
 * Automatically subscribes/unsubscribes on mount/unmount.
 *
 * @returns {Object} Presence state and helpers
 *
 * @example
 * const { users, onlineCount, currentUser, updateStatus } = usePresence();
 *
 * // Render user list
 * users.map(user => (
 *     <UserCard key={user.clientId} user={user} isYou={user.isYou} />
 * ));
 */
export function usePresence() {
  const [users, setUsers] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Subscribe to presence changes
  useEffect(() => {
    log.debug("usePresence: Subscribing to presence updates");

    // Check if presence system is ready
    if (!presenceSystem._initialized) {
      log.warn("Presence system not yet initialized");
      // Still set up listener - it will receive data once initialized
    }

    // Subscribe to presence changes
    // This returns a cleanup function
    const unsubscribe = presenceSystem.onPresenceChange((updatedUsers) => {
      log.trace("usePresence: Received", updatedUsers.length, "users");
      setUsers(updatedUsers);
      setIsInitialized(true);
    });

    // Get initial state
    const initialUsers = presenceSystem.getOnlineUsers();
    if (initialUsers.length > 0) {
      setUsers(initialUsers);
      setIsInitialized(true);
    }

    return () => {
      log.debug("usePresence: Unsubscribing from presence updates");
      unsubscribe();
    };
  }, []);

  // Update my status
  const updateStatus = useCallback((status) => {
    log.debug("Updating status to:", status);
    presenceSystem.updateStatus(status);
  }, []);

  // Update my presence with arbitrary data
  const updatePresence = useCallback((updates) => {
    log.trace("Updating presence:", updates);
    presenceSystem.setPresence(updates);
  }, []);

  // Computed values
  const currentUser = useMemo(() => {
    return users.find((u) => u.isYou) || null;
  }, [users]);

  const otherUsers = useMemo(() => {
    return users.filter((u) => !u.isYou);
  }, [users]);

  const onlineCount = users.length;

  // Group users by status
  const usersByStatus = useMemo(() => {
    return {
      active: users.filter((u) => u.status === "active"),
      idle: users.filter((u) => u.status === "idle"),
      away: users.filter((u) => u.status === "away"),
    };
  }, [users]);

  return {
    // Data
    users,
    currentUser,
    otherUsers,
    onlineCount,
    usersByStatus,
    isInitialized,

    // Actions
    updateStatus,
    updatePresence,
  };
}

/**
 * usePresenceUser - Get a specific user's presence
 *
 * @param {string} userId - User ID to track
 * @returns {Object|null} User presence data or null if not found
 */
export function usePresenceUser(userId) {
  const { users } = usePresence();

  return useMemo(() => {
    return users.find((u) => u.userId === userId) || null;
  }, [users, userId]);
}

/**
 * useOnlineCount - Simple hook for just the count
 *
 * @returns {number} Number of online users
 */
export function useOnlineCount() {
  const { onlineCount } = usePresence();
  return onlineCount;
}

export default usePresence;
