/**
 * @file VRSessionFloating.jsx
 * @description VR Session Panel as a floating panel - shows active VR session controls.
 *
 * Opens when a VR session is active, showing participants, navigation controls,
 * and session management actions.
 *
 * Uses the FloatingPanel system for position/size management.
 */

import React, { memo, useCallback, useEffect, useState } from "react";
import { FloatingPanel } from "./FloatingPanel";
import { useFloatingPanels } from "./FloatingPanelContext";
import { VRSessionPanel } from "@UI/react/components/panels/VRSessionPanel";
import { useVRSession } from "@UI/react/hooks/useVRSession";
import { vrManager } from "@Core/vr/VRManager.js";

// =============================================================================
// CONSTANTS
// =============================================================================

export const VR_SESSION_PANEL_ID = "vrSession";

export const VR_SESSION_CONFIG = {
  title: "VR Session",
  icon: "vr",
  color: "purple",
  defaultWidth: 320,
  defaultHeight: 400,
  minWidth: 280,
  minHeight: 300,
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * useVRSessionFloating - Hook to manage VR Session floating panel
 *
 * @example
 * const { isOpen, open, close, toggle } = useVRSessionFloating();
 */
export function useVRSessionFloating() {
  const { popOutPanel, dockPanel, isPoppedOut, bringToFront } =
    useFloatingPanels();

  const isOpen = isPoppedOut(VR_SESSION_PANEL_ID);

  const open = useCallback(
    (position = {}) => {
      // Default position: bottom-right corner
      const defaultX = window.innerWidth - VR_SESSION_CONFIG.defaultWidth - 20;
      const defaultY = window.innerHeight - VR_SESSION_CONFIG.defaultHeight - 80;

      popOutPanel(VR_SESSION_PANEL_ID, {
        ...VR_SESSION_CONFIG,
        x: position.x ?? defaultX,
        y: position.y ?? defaultY,
        width: VR_SESSION_CONFIG.defaultWidth,
        height: VR_SESSION_CONFIG.defaultHeight,
      });
    },
    [popOutPanel]
  );

  const close = useCallback(() => {
    dockPanel(VR_SESSION_PANEL_ID);
  }, [dockPanel]);

  const toggle = useCallback(
    (position) => {
      if (isOpen) {
        close();
      } else {
        open(position);
      }
    },
    [isOpen, open, close]
  );

  const focus = useCallback(() => {
    bringToFront(VR_SESSION_PANEL_ID);
  }, [bringToFront]);

  return {
    isOpen,
    open,
    close,
    toggle,
    focus,
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * VRSessionFloating - Floating VR Session panel
 *
 * This component should be rendered in AllFloatingPanels.
 * It auto-opens when a VR session becomes active and closes when it ends.
 */
export const VRSessionFloating = memo(function VRSessionFloating({
  projectId,
}) {
  const { floatingPanels, dockPanel, bringToFront, popOutPanel } =
    useFloatingPanels();

  const panelState = floatingPanels[VR_SESSION_PANEL_ID];

  // Get VR session state
  const {
    currentSession,
    participants,
    isInVR,
    isOwner,
    leaveSession,
    endSession,
    createSnapshot,
  } = useVRSession(projectId);

  // Auto-open panel when VR session becomes active
  useEffect(() => {
    if (currentSession && !panelState) {
      // Open panel automatically when session starts
      popOutPanel(VR_SESSION_PANEL_ID, {
        ...VR_SESSION_CONFIG,
        x: window.innerWidth - VR_SESSION_CONFIG.defaultWidth - 20,
        y: window.innerHeight - VR_SESSION_CONFIG.defaultHeight - 80,
        width: VR_SESSION_CONFIG.defaultWidth,
        height: VR_SESSION_CONFIG.defaultHeight,
      });
    }
  }, [currentSession, panelState, popOutPanel]);

  // Auto-close panel when session ends
  useEffect(() => {
    if (!currentSession && panelState) {
      dockPanel(VR_SESSION_PANEL_ID);
    }
  }, [currentSession, panelState, dockPanel]);

  // Listen for VR session events
  useEffect(() => {
    const handleSessionStarted = () => {
      if (!panelState) {
        popOutPanel(VR_SESSION_PANEL_ID, {
          ...VR_SESSION_CONFIG,
          x: window.innerWidth - VR_SESSION_CONFIG.defaultWidth - 20,
          y: window.innerHeight - VR_SESSION_CONFIG.defaultHeight - 80,
          width: VR_SESSION_CONFIG.defaultWidth,
          height: VR_SESSION_CONFIG.defaultHeight,
        });
      } else {
        bringToFront(VR_SESSION_PANEL_ID);
      }
    };

    const handleSessionEnded = () => {
      dockPanel(VR_SESSION_PANEL_ID);
    };

    // Listen for open panel event
    const handleOpenVRSessionPanel = (event) => {
      const detail = event.detail || {};

      let x = window.innerWidth - VR_SESSION_CONFIG.defaultWidth - 20;
      let y = window.innerHeight - VR_SESSION_CONFIG.defaultHeight - 80;

      if (detail.x !== undefined && detail.y !== undefined) {
        x = detail.x;
        y = detail.y;
      }

      if (panelState) {
        bringToFront(VR_SESSION_PANEL_ID);
      } else {
        popOutPanel(VR_SESSION_PANEL_ID, {
          ...VR_SESSION_CONFIG,
          x,
          y,
          width: VR_SESSION_CONFIG.defaultWidth,
          height: VR_SESSION_CONFIG.defaultHeight,
        });
      }
    };

    vrManager.on("sessionStarted", handleSessionStarted);
    vrManager.on("sessionEnded", handleSessionEnded);
    window.addEventListener("cia:open-vr-session-panel", handleOpenVRSessionPanel);

    return () => {
      vrManager.off("sessionStarted", handleSessionStarted);
      vrManager.off("sessionEnded", handleSessionEnded);
      window.removeEventListener("cia:open-vr-session-panel", handleOpenVRSessionPanel);
    };
  }, [popOutPanel, dockPanel, bringToFront, panelState]);

  // Handle close
  const handleClose = useCallback(() => {
    dockPanel(VR_SESSION_PANEL_ID);
  }, [dockPanel]);

  // Don't render if not open
  if (!panelState) return null;

  const currentUserId = localStorage.getItem("userId") || "anonymous";

  return (
    <FloatingPanel
      panelId={VR_SESSION_PANEL_ID}
      color={VR_SESSION_CONFIG.color}
      onDock={handleClose}
    >
      <VRSessionPanel
        session={currentSession}
        participants={participants}
        isOwner={isOwner}
        currentUserId={currentUserId}
        onEndSession={endSession}
        onLeaveSession={leaveSession}
        onCreateSnapshot={createSnapshot}
      />
    </FloatingPanel>
  );
});

export default VRSessionFloating;
