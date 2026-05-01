/**
 * @file useRoomsTab.js
 * @description Logic hook for RoomsTab component.
 * Handles room state, filtering, and room operations.
 *
 * @example
 * const {
 *   rooms,
 *   currentRoom,
 *   groupedRooms,
 *   handleJoinRoom,
 *   handleCreateRoom,
 * } = useRoomsTab();
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { config } from "@Core/config/clientConfig.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";
import { sessionManager } from "@Core/session/sessionManager.js";
import { authService } from "@Services/authService.js";
import { createLogger } from "@Utils/logger.js";

const log = createLogger("rooms");

/**
 * Sample current user
 */
const SAMPLE_CURRENT_USER = {
  id: "current",
  name: "You",
  color: "#2dd4bf",
};

/**
 * Sample rooms data
 */
const SAMPLE_ROOMS = [
  {
    id: "main",
    name: "Main Room",
    type: "project",
    access: "open",
    hasVoice: true,
    hasText: true,
    isPersistent: true,
    members: [
      { id: "u1", name: "Dr. Smith", color: "#fb7185", isOwner: true },
      { id: "u2", name: "Dr. Jones", color: "#fbbf24" },
      { id: "current", name: "You", color: "#2dd4bf" },
    ],
    isCurrentRoom: true,
  },
  {
    id: "breakout-1",
    name: "Tumor Analysis",
    type: "breakout",
    access: "open",
    hasVoice: true,
    hasText: true,
    isPersistent: false,
    members: [
      { id: "u3", name: "Alice Chen", color: "#60a5fa", isOwner: true },
      { id: "u4", name: "Bob Wilson", color: "#c084fc" },
    ],
    isCurrentRoom: false,
  },
  {
    id: "breakout-2",
    name: "Private Discussion",
    type: "breakout",
    access: "invite",
    hasVoice: false,
    hasText: true,
    isPersistent: false,
    members: [{ id: "u1", name: "Dr. Smith", color: "#fb7185", isOwner: true }],
    isCurrentRoom: false,
  },
  {
    id: "personal-1",
    name: "My Scratch Space",
    type: "personal",
    access: "invisible",
    hasVoice: false,
    hasText: false,
    isPersistent: true,
    members: [{ id: "current", name: "You", color: "#2dd4bf", isOwner: true }],
    isCurrentRoom: false,
  },
];

/**
 * Hook for RoomsTab logic and state management.
 *
 * @param {Object} options - Hook options
 * @param {string} [options.workspaceId] - Current workspace ID
 * @param {string} [options.projectId] - Current project ID
 * @returns {Object} Rooms state and handlers
 */
export function useRoomsTab(options = {}) {
  const {
    projectId: propProjectId,
    activeRoomId = null,
    onSwitchRoom = null,
  } = options;

  // Get project ID from props or sessionManager
  const projectId = propProjectId || sessionManager.getProjectId?.() || sessionManager.getRoomId?.();

  // Debug: Log which projectId we're using
  log.debug("useRoomsTab initialized with projectId:", {
    fromProps: propProjectId,
    fromSessionManager: sessionManager.getProjectId?.(),
    fromRoomId: sessionManager.getRoomId?.(),
    final: projectId,
  });

  // State
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentRoomId, setCurrentRoomId] = useState(
    activeRoomId || presenceSystem.getRoom?.() || null
  );
  const [presenceVersion, setPresenceVersion] = useState(0);

  useEffect(() => {
    const unsubscribePresence = presenceSystem.onPresenceChange(() => {
      setPresenceVersion((prev) => prev + 1);
    });
    const unsubscribeRoom = presenceSystem.onRoomChange((roomId) => {
      setCurrentRoomId(roomId || null);
    });

    setCurrentRoomId(presenceSystem.getRoom?.() || null);

    return () => {
      unsubscribePresence?.();
      unsubscribeRoom?.();
    };
  }, []);

  useEffect(() => {
    if (activeRoomId !== undefined) {
      setCurrentRoomId(activeRoomId || null);
    }
  }, [activeRoomId]);

  // Fetch rooms from API
  useEffect(() => {
    if (!projectId) {
      log.warn("No projectId provided, skipping room fetch");
      setIsLoading(false);
      return;
    }

    log.debug("Fetching rooms for project:", projectId);

    const fetchRooms = async () => {
      setIsLoading(true);
      setError(null);
      setRooms([]); // Clear existing rooms before fetch

      try {
        const headers = await authService.buildRequestHeaders();

        const url = `${config.apiBaseUrl}/projects/${projectId}/rooms`;
        log.debug("Fetching from URL:", url);

        const response = await fetch(url, {
          credentials: "include",
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch rooms: ${response.status}`);
        }

        const data = await response.json();
        const fetchedRooms = Array.isArray(data) ? data : data.rooms || [];

        // Debug: Log raw API response
        log.debug("Raw rooms from API:", fetchedRooms);
        log.debug("Number of rooms:", fetchedRooms.length);

        // Check for duplicate main rooms
        const mainRoomsRaw = fetchedRooms.filter(r => r.room_type === 'main');
        if (mainRoomsRaw.length > 1) {
          log.warn("Multiple main rooms detected for project:", projectId, mainRoomsRaw);
        }

        // Transform API rooms to UI format
        const transformedRooms = fetchedRooms.map((room) => ({
          id: room.id,
          name: room.name,
          type: room.room_type || room.type, // Use room_type from database
          access:
            room.settings?.access || (room.is_public ? "open" : "private"),
          hasVoice: room.settings?.hasVoice ?? true,
          hasText: room.settings?.hasText ?? true,
          isPersistent: room.room_type === "main" || room.is_main,
          members: room.members || [],
          isCurrentRoom: room.id === currentRoomId,
          settings: room.settings,
          createdAt: room.created_at,
          memberCount: room.member_count || 0,
          onlineCount: presenceSystem.getRoomUserCount(room.id),
          myRole: room.my_role,
        }));

        // Deduplicate rooms by ID
        let uniqueRooms = transformedRooms.filter((room, index, self) =>
          index === self.findIndex((r) => r.id === room.id)
        );

        // SPECIAL FIX: If there are multiple "main" type rooms, keep only one
        // This handles the seed project bug where there are 2 main rooms
        const mainRoomsAfterDedup = uniqueRooms.filter(r => r.type === "main");
        log.debug("Main rooms found after ID dedup:", mainRoomsAfterDedup.length, mainRoomsAfterDedup);

        if (mainRoomsAfterDedup.length > 1) {
          log.warn(`Found ${mainRoomsAfterDedup.length} main rooms, keeping only the first one`);
          // Keep the first main room, remove the rest
          const firstMainRoom = mainRoomsAfterDedup[0];
          uniqueRooms = uniqueRooms.filter(r =>
            r.type !== "main" || r.id === firstMainRoom.id
          );
          log.debug("After removing duplicate main rooms:", uniqueRooms.filter(r => r.type === "main"));
        }

        if (uniqueRooms.length !== transformedRooms.length) {
          log.warn(`Removed ${transformedRooms.length - uniqueRooms.length} duplicate/extra rooms`);
        }

        setRooms(uniqueRooms);

        if (!currentRoomId) {
          const mainRoom = transformedRooms.find((room) => room.type === "main");
          if (mainRoom) {
            setCurrentRoomId(mainRoom.id);
            presenceSystem.setRoom(mainRoom.id);
          }
        }
      } catch (err) {
        log.error("Failed to fetch rooms:", err);
        setError(err.message);
        // DO NOT fallback to sample data - keep rooms empty to see the real error
        // setRooms(SAMPLE_ROOMS);
        setRooms([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRooms();
  }, [currentRoomId, projectId]);

  // Get current room
  const currentRoom = useMemo(() => {
    return rooms.find((r) => r.isCurrentRoom || r.id === currentRoomId);
  }, [rooms, currentRoomId, presenceVersion]);

  // Filter rooms by search and group by type
  const groupedRooms = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const enrichedRooms = rooms.map((room) => ({
      ...room,
      onlineCount: presenceSystem.getRoomUserCount(room.id),
      isCurrentRoom: room.id === currentRoomId,
    }));

    const filtered = enrichedRooms.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.members.some((m) => m.name?.toLowerCase().includes(query))
    );

    const grouped = {
      // "main" rooms are displayed as "project" rooms in the UI
      project: filtered.filter((r) => r.type === "main" || r.type === "project"),
      breakout: filtered.filter((r) => r.type === "breakout"),
      personal: filtered.filter((r) => r.type === "personal"),
    };

    // Debug: Log grouped rooms
    log.debug("Grouped rooms:", {
      project: grouped.project.map(r => ({ id: r.id, name: r.name, type: r.type })),
      breakout: grouped.breakout.map(r => ({ id: r.id, name: r.name, type: r.type })),
      personal: grouped.personal.map(r => ({ id: r.id, name: r.name, type: r.type })),
    });

    return grouped;
  }, [presenceVersion, rooms, searchQuery]);

  // Handlers
  const handleJoinRoom = useCallback(async (roomId) => {
    if (!projectId) return;

    try {
      const headers = await authService.buildRequestHeaders({
        "Content-Type": "application/json",
      });

      const response = await fetch(
        `${config.apiBaseUrl}/projects/${projectId}/rooms/${roomId}/join`,
        {
          method: "POST",
          credentials: "include",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to join room: ${response.status}`);
      }

      const joinedRoom = rooms.find((room) => room.id === roomId);
      onSwitchRoom?.(roomId, joinedRoom?.name);
      presenceSystem.setRoom(roomId);
      setRooms((prev) =>
        prev.map((r) => ({
          ...r,
          isCurrentRoom: r.id === roomId,
          onlineCount: presenceSystem.getRoomUserCount(r.id),
        }))
      );
      setCurrentRoomId(roomId);
    } catch (err) {
      log.error("Failed to join room:", err);
    }
  }, [onSwitchRoom, projectId, rooms]);

  const handleLeaveRoom = useCallback(async (roomId) => {
    if (!projectId) return;

    try {
      const headers = await authService.buildRequestHeaders({
        "Content-Type": "application/json",
      });

      const response = await fetch(
        `${config.apiBaseUrl}/projects/${projectId}/rooms/${roomId}/leave`,
        {
          method: "POST",
          credentials: "include",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to leave room: ${response.status}`);
      }

      // Go back to main room
      const mainRoom = rooms.find((r) => r.type === "main");
      if (mainRoom) {
        onSwitchRoom?.(mainRoom.id, mainRoom.name);
        presenceSystem.setRoom(mainRoom.id);
        setCurrentRoomId(mainRoom.id);
        setRooms((prev) =>
          prev.map((r) => ({
            ...r,
            isCurrentRoom: r.id === mainRoom.id,
            onlineCount: presenceSystem.getRoomUserCount(r.id),
          }))
        );
      }
    } catch (err) {
      log.error("Failed to leave room:", err);
    }
  }, [onSwitchRoom, projectId, rooms]);

  const handleCreateRoom = useCallback(async (roomConfig) => {
    if (!projectId) return;

    try {
      setError(null);
      const headers = await authService.buildRequestHeaders({
        "Content-Type": "application/json",
      });

      const response = await fetch(
        `${config.apiBaseUrl}/projects/${projectId}/rooms`,
        {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({
            name: roomConfig.name,
            roomType: "breakout",  // Server expects roomType, not type
            isPublic: roomConfig.access === "open",
            settings: {
              access: roomConfig.access,
              hasVoice: roomConfig.hasVoice,
              hasText: roomConfig.hasText,
            },
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = `Failed to create room: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Keep the status-based fallback when the response isn't JSON.
        }
        throw new Error(errorMessage);
      }

      // Server returns room as flat object, not nested under data.room
      const newRoom = await response.json();

      // Add to local state
      setRooms((prev) => [
        ...prev,
        {
          id: newRoom.id,
          name: newRoom.name,
          type: newRoom.room_type || newRoom.type || "breakout",
          access: newRoom.settings?.access || "open",
          hasVoice: newRoom.settings?.hasVoice ?? true,
          hasText: newRoom.settings?.hasText ?? true,
          isPersistent: false,
          members: newRoom.participants || newRoom.members || [],
          isCurrentRoom: false,
          settings: newRoom.settings,
          createdAt: newRoom.created_at,
          onlineCount: 0,
        },
      ]);
      setShowCreateForm(false);
    } catch (err) {
      log.error("Failed to create room:", err);
      setError(err.message || "Failed to create room");
    }
  }, [projectId]);

  const handleDeleteRoom = useCallback(async (roomId) => {
    if (!projectId) return;

    try {
      setError(null);
      const headers = await authService.buildRequestHeaders();

      const response = await fetch(
        `${config.apiBaseUrl}/projects/${projectId}/rooms/${roomId}`,
        {
          method: "DELETE",
          credentials: "include",
          headers,
        }
      );

      if (!response.ok) {
        let errorMessage = `Failed to delete room: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Keep the status-based fallback when the response isn't JSON.
        }
        throw new Error(errorMessage);
      }

      // Remove from local state
      const deletedCurrentRoom = currentRoomId === roomId;
      const remainingRooms = rooms.filter((r) => r.id !== roomId);
      setRooms(remainingRooms);

      if (deletedCurrentRoom) {
        const mainRoom = remainingRooms.find((room) => room.type === "main");
        if (mainRoom) {
          onSwitchRoom?.(mainRoom.id, mainRoom.name);
          presenceSystem.setRoom(mainRoom.id);
          setCurrentRoomId(mainRoom.id);
        } else {
          presenceSystem.setRoom(null);
          setCurrentRoomId(null);
        }
      }
    } catch (err) {
      log.error("Failed to delete room:", err);
      setError(err.message || "Failed to delete room");
    }
  }, [currentRoomId, onSwitchRoom, projectId, rooms]);

  return {
    // Data
    rooms,
    currentRoom,
    groupedRooms,
    isLoading,
    error,

    // Search state
    searchQuery,
    setSearchQuery,

    // Create form state
    showCreateForm,
    setShowCreateForm,

    // Handlers
    handleJoinRoom,
    handleLeaveRoom,
    handleCreateRoom,
    handleDeleteRoom,
  };
}

export default useRoomsTab;
