// src/ui/react/hooks/useRoomIndicator.js
// Combined hook for RoomPresenceIndicator component
//
// Provides:
// - Room list from API
// - Presence data for current room
// - Actions for switching rooms
// - Create room functionality

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { config } from "@Core/config/clientConfig.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";
import { authService } from "@Services/authService.js";
import { useAuth } from "@UI/react/hooks/useAuth.js";
import {
  useRoomPresence,
  useRoomActions,
} from "@UI/react/hooks/useRoomPresence.js";
import {
  useAsyncData,
  useAsyncMutation,
} from "@UI/react/hooks/useAsyncData.js";
import { createLogger } from "@Utils/logger.js";

const log = createLogger("room-indicator");

/**
 * useRoomIndicator - Complete hook for RoomPresenceIndicator component
 *
 * Combines:
 * - Room list fetching from API
 * - Presence data for current room members
 * - Room switching actions
 * - Create room functionality
 *
 * @param {Object} options
 * @param {string} options.projectId - Current project ID
 * @param {string} options.userId - Current user ID
 * @param {string} options.initialRoomId - Initial room ID (optional)
 * @param {Function} options.onRoomChange - Callback when room changes (optional)
 * @returns {Object} Room indicator state and actions
 *
 * @example
 * const {
 *   currentRoom,
 *   availableRooms,
 *   roomMembers,
 *   isLoading,
 *   switchRoom,
 *   createRoom,
 * } = useRoomIndicator({ projectId, userId });
 */
export function useRoomIndicator({
  projectId,
  userId,
  initialRoomId = null,
  onRoomChange,
} = {}) {
  const apiBase = config.apiBaseUrl || "http://localhost:3001/api";
  const { isAuthenticated } = useAuth();
  const inviteRoomId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("inviteRoom")
      : null;
  const inviteFresh =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("inviteFresh")
      : null;
  const inviteHandledRef = useRef(false);

  // ===========================================================================
  // CURRENT ROOM STATE
  // ===========================================================================
  const [currentRoomId, setCurrentRoomId] = useState(initialRoomId);
  const [currentRoomName, setCurrentRoomName] = useState("Main Room");
  const [currentRoomType, setCurrentRoomType] = useState("main");

  // Room actions from presence system
  const { setRoom } = useRoomActions();

  const buildAuthHeaders = useCallback(async (includeContentType = true) => {
    const baseHeaders = includeContentType
      ? { "Content-Type": "application/json" }
      : {};
    return authService.buildRequestHeaders(baseHeaders);
  }, []);

  // ===========================================================================
  // FETCH ROOMS FROM API
  // ===========================================================================
  const fetchRooms = useCallback(
    async (signal) => {
      if (!projectId) return [];

      try {
        const headers = await buildAuthHeaders();

        const response = await fetch(`${apiBase}/projects/${projectId}/rooms`, {
          signal,
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch rooms: ${response.status}`);
        }

        const data = await response.json();
        if (Array.isArray(data)) {
          return data;
        }
        return data.rooms || [];
      } catch (error) {
        if (error.name !== "AbortError") {
          log.error("Failed to fetch rooms:", error);
        }
        throw error;
      }
    },
    [apiBase, buildAuthHeaders, projectId]
  );

  const {
    data: rooms,
    isLoading: isLoadingRooms,
    error: roomsError,
    refetch: refetchRooms,
  } = useAsyncData(fetchRooms, [projectId, isAuthenticated], {
    initialData: [],
    enabled: !!projectId,
  });

  // ===========================================================================
  // AUTO-SELECT MAIN ROOM ON LOAD
  // ===========================================================================
  useEffect(() => {
    if (rooms.length > 0 && !currentRoomId) {
      // Find main room or use first room
      const mainRoom = rooms.find((r) => r.room_type === "main") || rooms[0];
      if (mainRoom) {
        setCurrentRoomId(mainRoom.id);
        setCurrentRoomName(mainRoom.name);
        setCurrentRoomType(mainRoom.room_type || "main");
        setRoom(mainRoom.id);
        log.info("Auto-selected main room:", mainRoom.name);
      }
    }
  }, [rooms, currentRoomId, setRoom]);

  useEffect(() => {
    const unsubscribe = presenceSystem.onRoomChange((nextRoomId) => {
      setCurrentRoomId(nextRoomId || null);

      if (!nextRoomId) {
        setCurrentRoomName("No Room");
        setCurrentRoomType("breakout");
        return;
      }

      const nextRoom = rooms.find((room) => room.id === nextRoomId);
      if (nextRoom) {
        setCurrentRoomName(nextRoom.name);
        setCurrentRoomType(nextRoom.room_type || "main");
      }
    });

    return unsubscribe;
  }, [rooms]);

  // ===========================================================================
  // PRESENCE DATA FOR CURRENT ROOM
  // ===========================================================================
  const { users: presenceUsers, onlineCount } = useRoomPresence(currentRoomId);

  // Transform presence users to member format expected by RoomPresenceIndicator
  const roomMembers = useMemo(() => {
    return presenceUsers.map((user) => ({
      id: user.userId || user.id || user.clientId,
      name: user.userName || user.username || user.name || "Anonymous",
      color: user.userColor || user.color || "#60a5fa",
      avatar: user.avatarUrl || null,
      status: user.status || "active",
      isYou: user.isYou || false,
    }));
  }, [presenceUsers]);

  // ===========================================================================
  // CURRENT ROOM OBJECT
  // ===========================================================================
  const currentRoom = useMemo(() => {
    if (!currentRoomId) return null;

    // Try to find in fetched rooms
    const found = rooms.find((r) => r.id === currentRoomId);

    return {
      id: currentRoomId,
      name: found?.name || currentRoomName,
      type: found?.room_type || currentRoomType,
      isLocked: found?.is_locked || false,
      memberCount: onlineCount,
    };
  }, [currentRoomId, currentRoomName, currentRoomType, rooms, onlineCount]);

  // ===========================================================================
  // AVAILABLE ROOMS (formatted for dropdown)
  // ===========================================================================
  const availableRooms = useMemo(() => {
    return rooms.map((room) => ({
      id: room.id,
      name: room.name,
      type: room.room_type || "main",
      memberCount: presenceSystem.getRoomUserCount(room.id),
      isLocked: room.is_locked || false,
      myRole: room.my_role,
    }));
  }, [rooms]);

  // ===========================================================================
  // SWITCH ROOM ACTION
  // ===========================================================================
  const switchRoom = useCallback(
    (roomId, roomName) => {
      const targetRoom = rooms.find((r) => r.id === roomId);

      if (targetRoom) {
        setCurrentRoomId(roomId);
        setCurrentRoomName(roomName || targetRoom.name);
        setCurrentRoomType(targetRoom.room_type || "main");

        // Update presence system
        setRoom(roomId);

        log.info("Switched to room:", roomName || targetRoom.name);

        // Notify parent
        onRoomChange?.(roomId, roomName || targetRoom.name);
      } else {
        log.warn("Room not found:", roomId);
      }
    },
    [rooms, setRoom, onRoomChange]
  );

  const joinRoomById = useCallback(
    async (roomId) => {
      if (!projectId || !roomId) return false;

      const headers = await buildAuthHeaders();
      const response = await fetch(
        `${apiBase}/projects/${projectId}/rooms/${roomId}/join`,
        {
          method: "POST",
          credentials: "include",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to join room: ${response.status}`);
      }

      return true;
    },
    [apiBase, buildAuthHeaders, projectId]
  );

  useEffect(() => {
    if (inviteHandledRef.current) return;
    if (!inviteRoomId) return;
    if (!projectId || rooms.length === 0) return;

    const invitedRoom = rooms.find((room) => room.id === inviteRoomId);
    if (!invitedRoom) return;

    inviteHandledRef.current = true;

    (async () => {
      try {
        await joinRoomById(inviteRoomId);
        switchRoom(inviteRoomId, invitedRoom.name);

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("inviteRoom");
        nextUrl.searchParams.delete("inviteFresh");
        window.history.replaceState({}, "", nextUrl.toString());

        log.info("Joined room from invite link:", invitedRoom.name);
      } catch (error) {
        inviteHandledRef.current = false;
        log.error("Failed to process room invite:", error);
      }
    })();
  }, [inviteFresh, inviteRoomId, joinRoomById, projectId, rooms, switchRoom]);

  // ===========================================================================
  // CREATE ROOM MUTATION
  // ===========================================================================
  const createRoomFn = useCallback(
    async (roomData) => {
      const headers = await buildAuthHeaders();

      const response = await fetch(`${apiBase}/projects/${projectId}/rooms`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: roomData.name,
          room_type: roomData.type || "breakout",
          is_locked: roomData.isLocked || false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create room");
      }

      const data = await response.json();
      return data.room;
    },
    [apiBase, buildAuthHeaders, projectId]
  );

  const {
    mutate: createRoom,
    isLoading: isCreating,
    error: createError,
  } = useAsyncMutation(createRoomFn, {
    onSuccess: (newRoom) => {
      log.info("Room created:", newRoom.name);
      refetchRooms();
      // Optionally switch to new room
      if (newRoom) {
        switchRoom(newRoom.id, newRoom.name);
      }
    },
    onError: (error) => {
      log.error("Failed to create room:", error);
    },
  });

  // ===========================================================================
  // DELETE ROOM MUTATION
  // ===========================================================================
  const deleteRoomFn = useCallback(
    async (roomId) => {
      const headers = await buildAuthHeaders(false);

      const response = await fetch(
        `${apiBase}/projects/${projectId}/rooms/${roomId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete room");
      }

      return { id: roomId };
    },
    [apiBase, buildAuthHeaders, projectId]
  );

  const { mutate: deleteRoom, isLoading: isDeleting } = useAsyncMutation(
    deleteRoomFn,
    {
      onSuccess: (result) => {
        log.info("Room deleted:", result.id);
        refetchRooms();

        // If we deleted current room, switch to main
        if (result.id === currentRoomId) {
          const mainRoom = rooms.find((r) => r.room_type === "main");
          if (mainRoom) {
            switchRoom(mainRoom.id, mainRoom.name);
          }
        }
      },
    }
  );

  // ===========================================================================
  // RETURN
  // ===========================================================================
  return {
    // Current room state
    currentRoom,
    currentRoomId,
    currentRoomName,

    // Room list
    availableRooms,
    rooms, // Raw rooms from API

    // Presence
    roomMembers,
    onlineCount,

    // Loading states
    isLoading: isLoadingRooms,
    isCreating,
    isDeleting,

    // Errors
    error: roomsError || createError,

    // Actions
    switchRoom,
    createRoom,
    deleteRoom,
    refetchRooms,
  };
}

export default useRoomIndicator;
