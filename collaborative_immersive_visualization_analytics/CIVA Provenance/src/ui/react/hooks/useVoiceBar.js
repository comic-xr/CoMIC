// src/ui/react/hooks/useVoiceBar.js
// Voice bar hooks - manages voice controls, canvas viewport, and workspace indicators
// Migrated from legacy SecondaryBottomBar.logic.js

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  voiceRoomService,
  VoiceConnectionState,
} from "@Services/voice/voiceRoomService.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";

/**
 * useCanvasViewport - Manages canvas position/viewport state
 *
 * @param {Object} options
 * @param {Object} options.canvasSize - Total canvas dimensions { rows, cols }
 * @param {Object} options.viewport - Current viewport { row, col, rows, cols }
 * @param {Function} options.onViewportChange - Callback when viewport changes
 * @returns {Object} Viewport state and minimap data
 */
export function useCanvasViewport({
  canvasSize = { rows: 4, cols: 5 },
  viewport = { row: 0, col: 0, rows: 2, cols: 3 },
  onViewportChange,
} = {}) {
  const [isHovering, setIsHovering] = useState(false);

  // Calculate viewport bounds
  const viewportBounds = useMemo(
    () => ({
      startRow: viewport.row,
      startCol: viewport.col,
      endRow: viewport.row + viewport.rows - 1,
      endCol: viewport.col + viewport.cols - 1,
    }),
    [viewport]
  );

  // Generate minimap cells
  const minimapCells = useMemo(() => {
    const cells = [];
    for (let row = 0; row < canvasSize.rows; row++) {
      for (let col = 0; col < canvasSize.cols; col++) {
        const inViewport =
          row >= viewportBounds.startRow &&
          row <= viewportBounds.endRow &&
          col >= viewportBounds.startCol &&
          col <= viewportBounds.endCol;
        cells.push({ row, col, inViewport });
      }
    }
    return cells;
  }, [canvasSize, viewportBounds]);

  // Format position string
  const positionString = useMemo(() => {
    const { startCol, startRow, endCol, endRow } = viewportBounds;
    return `(${startCol},${startRow}) → (${endCol},${endRow})`;
  }, [viewportBounds]);

  const sizeString = useMemo(() => {
    return `${canvasSize.cols}×${canvasSize.rows}`;
  }, [canvasSize]);

  return {
    canvasSize,
    viewport,
    viewportBounds,
    minimapCells,
    positionString,
    sizeString,
    isHovering,
    setIsHovering,
  };
}

/**
 * useVoiceControls - Manages voice chat state with LiveKit integration
 *
 * @param {Object} options
 * @param {string} options.roomId - Current room ID for voice context
 * @param {string} options.roomName - Current room name for display
 * @param {string} options.userName - Current user's display name
 * @param {Function} options.onJoinVoice - Callback for joining voice
 * @param {Function} options.onLeaveVoice - Callback for leaving voice
 * @returns {Object} Voice control state and actions
 */
export function useVoiceControls({
  roomId,
  roomName = "Main Room",
  userName = "Anonymous",
  onJoinVoice,
  onLeaveVoice,
} = {}) {
  // Connection state synced with voiceRoomService
  const [connectionState, setConnectionState] = useState(
    voiceRoomService.getConnectionState()
  );
  const [muted, setMuted] = useState(voiceRoomService.isMuted);
  const [deafened, setDeafened] = useState(voiceRoomService.isDeafened);
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Derived state
  const inVoice = connectionState === VoiceConnectionState.CONNECTED;
  const isConnecting = connectionState === VoiceConnectionState.CONNECTING;

  // Subscribe to voice service state changes
  useEffect(() => {
    const unsubConnection = voiceRoomService.onConnectionChange((state) => {
      setConnectionState(state);
      setIsJoining(false);
    });

    return () => {
      unsubConnection();
    };
  }, []);

  // Join voice in current room
  const joinVoice = useCallback(async () => {
    if (isJoining || inVoice) return;

    setIsJoining(true);
    try {
      const voiceRoomName = roomId ? `room-${roomId}` : "main-room";
      await voiceRoomService.joinRoom(voiceRoomName, userName);

      presenceSystem.updateVoiceState({
        inVoice: true,
        isMuted: voiceRoomService.isMuted,
        roomId: roomId,
      });

      setMuted(voiceRoomService.isMuted);
      onJoinVoice?.();
    } catch (error) {
      console.error("Failed to join voice:", error);
      setIsJoining(false);
    }
  }, [roomId, userName, isJoining, inVoice, onJoinVoice]);

  // Leave voice
  const leaveVoice = useCallback(async () => {
    await voiceRoomService.leaveRoom();

    presenceSystem.updateVoiceState({
      inVoice: false,
      isMuted: true,
      roomId: null,
    });

    setMuted(true);
    setDeafened(false);
    onLeaveVoice?.();
  }, [onLeaveVoice]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!inVoice) return;

    const newMuted = await voiceRoomService.toggleMute();
    setMuted(newMuted);

    presenceSystem.updateVoiceState({
      inVoice: true,
      isMuted: newMuted,
    });
  }, [inVoice]);

  // Toggle deafen
  const toggleDeafen = useCallback(() => {
    if (!inVoice) return;

    const newDeafened = voiceRoomService.toggleDeafen();
    setDeafened(newDeafened);
  }, [inVoice]);

  const toggleRoomDropdown = useCallback(() => {
    setShowRoomDropdown((prev) => !prev);
  }, []);

  return {
    inVoice,
    isConnecting,
    isJoining,
    muted,
    deafened,
    currentRoom: roomName,
    showRoomDropdown,
    connectionState,
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleDeafen,
    toggleRoomDropdown,
    closeRoomDropdown: () => setShowRoomDropdown(false),
  };
}

/**
 * useWorkspaceIndicator - Gets current workspace info for display
 *
 * @param {Object} currentWorkspace - Current workspace object
 * @returns {Object} Workspace indicator data
 */
export function useWorkspaceIndicator(currentWorkspace) {
  return useMemo(
    () => ({
      name: currentWorkspace?.name || "No Workspace",
      color: currentWorkspace?.color || "#666",
      type: currentWorkspace?.type || "personal",
    }),
    [currentWorkspace]
  );
}

/**
 * useSecondaryBottomBar - Combined hook for all voice bar state
 *
 * @param {Object} options - Configuration options
 * @returns {Object} All voice bar state and actions
 */
export function useSecondaryBottomBar({
  canvasSize,
  viewport,
  onViewportChange,
  initialInVoice,
  initialMuted,
  initialDeafened,
  currentVoiceRoom,
  onJoinVoice,
  onLeaveVoice,
  onMuteToggle,
  onDeafenToggle,
  currentWorkspace,
  instanceCount = 0,
} = {}) {
  const canvasViewport = useCanvasViewport({
    canvasSize,
    viewport,
    onViewportChange,
  });

  const voiceControls = useVoiceControls({
    initialInVoice,
    initialMuted,
    initialDeafened,
    currentRoom: currentVoiceRoom,
    onJoinVoice,
    onLeaveVoice,
    onMuteToggle,
    onDeafenToggle,
  });

  const workspaceIndicator = useWorkspaceIndicator(currentWorkspace);

  return {
    canvas: canvasViewport,
    voice: voiceControls,
    workspace: workspaceIndicator,
    instanceCount,
  };
}
