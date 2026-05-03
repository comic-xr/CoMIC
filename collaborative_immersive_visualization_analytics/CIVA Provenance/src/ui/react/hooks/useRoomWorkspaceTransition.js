// src/ui/react/hooks/useRoomWorkspaceTransition.js
// Manages room changes with optional workspace picker
//
// Flow:
// 1. User selects a room to enter
// 2. If room has workspaces, show picker modal
// 3. User picks workspace (or keeps current)
// 4. Room + workspace change together
//
// UPDATED: Now matches CIAWebApp.jsx expected API

import { useState, useCallback } from "react";
import { createLogger } from "@Utils/logger.js";

const log = createLogger("room-transition");

/**
 * useRoomWorkspaceTransition - Manages room changes with workspace picker
 *
 * @param {Object} options
 * @param {string} options.currentRoomId - Current room ID
 * @param {Function} options.setCurrentRoomId - Setter for room ID
 * @param {Function} options.setCurrentRoomName - Setter for room name
 * @param {any} options.pendingRoomChange - Pending room change state (external)
 * @param {Function} options.setPendingRoomChange - Setter for pending change
 * @param {Function} options.selectWorkspace - Function to select a workspace
 * @returns {Object} Room transition state and handlers
 */
export function useRoomWorkspaceTransition({
  currentRoomId,
  setCurrentRoomId,
  setCurrentRoomName,
  pendingRoomChange,
  setPendingRoomChange,
  selectWorkspace,
} = {}) {
  // Internal state for picker visibility
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false);

  // ---------------------------------------------------------------------------
  // HANDLE ROOM SELECT
  // Called when user clicks a room in the dropdown
  // ---------------------------------------------------------------------------
  const handleRoomSelect = useCallback(
    (roomId, roomName) => {
      // If same room, do nothing
      if (roomId === currentRoomId) {
        log.debug("Already in room:", roomName);
        return;
      }

      log.info("Room selected:", roomName);

      // Store the pending room change
      setPendingRoomChange?.({ roomId, roomName });

      // For now, directly enter the room without workspace picker
      // TODO: Check if room has multiple workspaces and show picker
      setCurrentRoomId?.(roomId);
      setCurrentRoomName?.(roomName);

      // If you want to show workspace picker instead:
      // setShowWorkspacePicker(true);
    },
    [currentRoomId, setCurrentRoomId, setCurrentRoomName, setPendingRoomChange]
  );

  // ---------------------------------------------------------------------------
  // HANDLE WORKSPACE SELECT
  // Called when user picks a workspace from the picker modal
  // ---------------------------------------------------------------------------
  const handleWorkspaceSelect = useCallback(
    (workspaceId) => {
      if (!pendingRoomChange) {
        log.warn("No pending room change for workspace select");
        return;
      }

      log.info(
        "Workspace selected:",
        workspaceId,
        "for room:",
        pendingRoomChange.roomName
      );

      // Apply the room change
      setCurrentRoomId?.(pendingRoomChange.roomId);
      setCurrentRoomName?.(pendingRoomChange.roomName);

      // Apply the workspace change
      selectWorkspace?.(workspaceId);

      // Clear pending state and close picker
      setPendingRoomChange?.(null);
      setShowWorkspacePicker(false);
    },
    [
      pendingRoomChange,
      setCurrentRoomId,
      setCurrentRoomName,
      selectWorkspace,
      setPendingRoomChange,
    ]
  );

  // ---------------------------------------------------------------------------
  // HANDLE CREATE WORKSPACE FOR ROOM
  // Called when user wants to create a new workspace in the target room
  // ---------------------------------------------------------------------------
  const handleCreateWorkspaceForRoom = useCallback(
    async (workspaceType = "breakout", roomId = null) => {
      const targetRoomId = roomId || pendingRoomChange?.roomId;

      if (!targetRoomId) {
        log.warn("No room ID for workspace creation");
        return null;
      }

      log.info("Creating workspace for room:", targetRoomId);

      // TODO: Implement workspace creation API call
      // For now, just log and return mock
      const mockWorkspace = {
        id: `ws-${Date.now()}`,
        name: `New ${workspaceType} workspace`,
        type: workspaceType,
        roomId: targetRoomId,
      };

      // After creation, select it
      selectWorkspace?.(mockWorkspace.id);

      // Complete the room transition
      if (pendingRoomChange) {
        setCurrentRoomId?.(pendingRoomChange.roomId);
        setCurrentRoomName?.(pendingRoomChange.roomName);
        setPendingRoomChange?.(null);
      }

      setShowWorkspacePicker(false);

      return mockWorkspace;
    },
    [
      pendingRoomChange,
      setCurrentRoomId,
      setCurrentRoomName,
      selectWorkspace,
      setPendingRoomChange,
    ]
  );

  // ---------------------------------------------------------------------------
  // HANDLE CANCEL WORKSPACE PICKER
  // Called when user cancels the workspace picker modal
  // ---------------------------------------------------------------------------
  const handleCancelWorkspacePicker = useCallback(() => {
    log.debug("Workspace picker cancelled");
    setPendingRoomChange?.(null);
    setShowWorkspacePicker(false);
  }, [setPendingRoomChange]);

  // ---------------------------------------------------------------------------
  // RETURN API
  // ---------------------------------------------------------------------------
  return {
    // State
    showWorkspacePicker,
    pendingRoomChange,

    // Handlers matching CIAWebApp expectations
    handleRoomSelect,
    handleWorkspaceSelect,
    handleCreateWorkspaceForRoom,
    handleCancelWorkspacePicker,

    // Additional utilities
    setShowWorkspacePicker,
  };
}

export default useRoomWorkspaceTransition;
