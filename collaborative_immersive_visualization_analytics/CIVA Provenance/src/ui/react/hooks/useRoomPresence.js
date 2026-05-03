// src/ui/react/hooks/useRoomPresence.js
// React hooks for room and workspace presence tracking
// Provides filtered user lists based on room/workspace context

import { useState, useEffect, useCallback, useMemo } from "react";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";
import { createLogger } from "@Utils/logger.js";

const log = createLogger("presence");

/**
 * useRoomPresence - Get users in a specific room
 *
 * @param {string} roomId - Room ID to filter by (uses current room if null)
 * @returns {Object} Room presence data
 *
 * @example
 * const { users, inVoice, notInVoice, onlineCount } = useRoomPresence(roomId);
 */
export function useRoomPresence(roomId = null) {
  const [allUsers, setAllUsers] = useState([]);
  const [currentRoomId, setCurrentRoomId] = useState(
    roomId || presenceSystem.getRoom()
  );

  // Subscribe to presence changes
  useEffect(() => {
    const unsubscribe = presenceSystem.onPresenceChange((updatedUsers) => {
      setAllUsers(updatedUsers);
    });

    // Get initial state
    setAllUsers(presenceSystem.getOnlineUsers());

    return unsubscribe;
  }, []);

  // Subscribe to room changes if we're tracking current room
  useEffect(() => {
    if (roomId) {
      // Using explicit roomId, don't listen for changes
      setCurrentRoomId(roomId);
      return;
    }

    // Listen for current room changes
    const unsubscribe = presenceSystem.onRoomChange((newRoomId) => {
      setCurrentRoomId(newRoomId);
    });

    return unsubscribe;
  }, [roomId]);

  // Filter users to those in this room
  const roomUsers = useMemo(() => {
    if (!currentRoomId) return allUsers; // Show all if no room selected
    return allUsers.filter((user) => user.roomId === currentRoomId);
  }, [allUsers, currentRoomId]);

  // Separate users by voice status
  const inVR = useMemo(() => {
    return roomUsers.filter(
      (user) =>
        user.inVR ||
        user.deviceType === "vr" ||
        user.capabilities?.xrCapable
    );
  }, [roomUsers]);

  const inVoice = useMemo(() => {
    return roomUsers.filter((user) => user.inVoice);
  }, [roomUsers]);

  const notInVoice = useMemo(() => {
    return roomUsers.filter((user) => !user.inVoice);
  }, [roomUsers]);

  // Group by status
  const byStatus = useMemo(
    () => ({
      active: roomUsers.filter((u) => u.status === "active"),
      idle: roomUsers.filter((u) => u.status === "idle"),
      away: roomUsers.filter((u) => u.status === "away"),
    }),
    [roomUsers]
  );

  return {
    users: roomUsers,
    inVR,
    inVoice,
    notInVoice,
    byStatus,
    onlineCount: roomUsers.length,
    vrCount: inVR.length,
    voiceCount: inVoice.length,
    roomId: currentRoomId,
  };
}

/**
 * useWorkspacePresence - Get users viewing a specific workspace
 *
 * @param {string} workspaceId - Workspace ID to filter by (uses current workspace if null)
 * @returns {Object} Workspace presence data
 *
 * @example
 * const { users, onlineCount } = useWorkspacePresence(workspaceId);
 */
export function useWorkspacePresence(workspaceId = null) {
  const [allUsers, setAllUsers] = useState([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(
    workspaceId || presenceSystem.getWorkspace()
  );

  // Subscribe to presence changes
  useEffect(() => {
    const unsubscribe = presenceSystem.onPresenceChange((updatedUsers) => {
      setAllUsers(updatedUsers);
    });

    // Get initial state
    setAllUsers(presenceSystem.getOnlineUsers());

    return unsubscribe;
  }, []);

  // Subscribe to workspace changes if we're tracking current workspace
  useEffect(() => {
    if (workspaceId) {
      setCurrentWorkspaceId(workspaceId);
      return;
    }

    const unsubscribe = presenceSystem.onWorkspaceChange((newWorkspaceId) => {
      setCurrentWorkspaceId(newWorkspaceId);
    });

    return unsubscribe;
  }, [workspaceId]);

  // Filter users to those in this workspace
  const workspaceUsers = useMemo(() => {
    if (!currentWorkspaceId) return [];
    return allUsers.filter((user) => user.workspaceId === currentWorkspaceId);
  }, [allUsers, currentWorkspaceId]);

  // Current user
  const currentUser = useMemo(() => {
    return workspaceUsers.find((u) => u.isYou) || null;
  }, [workspaceUsers]);

  // Other users (not you)
  const otherUsers = useMemo(() => {
    return workspaceUsers.filter((u) => !u.isYou);
  }, [workspaceUsers]);

  return {
    users: workspaceUsers,
    currentUser,
    otherUsers,
    onlineCount: workspaceUsers.length,
    workspaceId: currentWorkspaceId,
  };
}

/**
 * useProjectPresence - Get all users grouped by room
 * Useful for the "All Project" view in the presence panel
 *
 * @returns {Object} Project-wide presence data grouped by room
 */
export function useProjectPresence() {
  const [allUsers, setAllUsers] = useState([]);

  // Subscribe to presence changes
  useEffect(() => {
    const unsubscribe = presenceSystem.onPresenceChange((updatedUsers) => {
      setAllUsers(updatedUsers);
    });

    setAllUsers(presenceSystem.getOnlineUsers());

    return unsubscribe;
  }, []);

  // Group users by room
  const byRoom = useMemo(() => {
    const grouped = {};
    allUsers.forEach((user) => {
      const roomId = user.roomId || "unknown";
      if (!grouped[roomId]) {
        grouped[roomId] = [];
      }
      grouped[roomId].push(user);
    });
    return grouped;
  }, [allUsers]);

  // Get room IDs with user counts
  const roomCounts = useMemo(() => {
    const counts = {};
    Object.entries(byRoom).forEach(([roomId, users]) => {
      counts[roomId] = {
        total: users.length,
        inVoice: users.filter((u) => u.inVoice).length,
      };
    });
    return counts;
  }, [byRoom]);

  return {
    allUsers,
    byRoom,
    roomCounts,
    totalOnline: allUsers.length,
  };
}

/**
 * useRoomActions - Actions for room/workspace management
 *
 * @returns {Object} Room action callbacks
 */
export function useRoomActions() {
  const setRoom = useCallback((roomId) => {
    log.info("Switching to room:", roomId);
    presenceSystem.setRoom(roomId);
  }, []);

  const setWorkspace = useCallback((workspaceId) => {
    log.debug("Switching to workspace:", workspaceId);
    presenceSystem.setWorkspace(workspaceId);
  }, []);

  const updateVoiceState = useCallback((voiceState) => {
    presenceSystem.updateVoiceState(voiceState);
  }, []);

  const setSpeaking = useCallback((isSpeaking) => {
    presenceSystem.setSpeaking(isSpeaking);
  }, []);

  return {
    setRoom,
    setWorkspace,
    updateVoiceState,
    setSpeaking,
  };
}

/**
 * useRoomUserCount - Get user count for a specific room
 * Lightweight hook for displaying counts in room selectors
 *
 * @param {string} roomId - Room ID to count
 * @returns {number} Number of users in the room
 */
export function useRoomUserCount(roomId) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setCount(presenceSystem.getRoomUserCount(roomId));
    };

    const unsubscribe = presenceSystem.onPresenceChange(updateCount);
    updateCount();

    return unsubscribe;
  }, [roomId]);

  return count;
}

export default useRoomPresence;
