// src/ui/react/components/organisms/ViewModeToggle/ViewModeToggle.logic.js
// Headless logic for view mode toggle
// Handles Desktop/VR mode switching with WebXR detection

import { useState, useEffect, useCallback, useMemo } from "react";
import { view as log } from "@Utils/logger.js";

/**
 * View mode constants
 */
export const VIEW_MODES = {
  DESKTOP: "desktop",
  VR: "vr",
};

/**
 * Check if WebXR is available in the browser
 * @returns {Promise<{available: boolean, reason?: string}>}
 */
async function checkWebXRAvailability() {
  // Check if navigator.xr exists
  if (!navigator.xr) {
    return {
      available: false,
      reason: "WebXR not supported in this browser",
    };
  }

  try {
    // Check if immersive-vr session is supported
    const isSupported = await navigator.xr.isSessionSupported("immersive-vr");
    if (!isSupported) {
      return {
        available: false,
        reason: "VR headset not detected",
      };
    }

    return { available: true };
  } catch (error) {
    return {
      available: false,
      reason: `WebXR check failed: ${error.message}`,
    };
  }
}

/**
 * useWebXRAvailability - Detects WebXR/VR support
 *
 * @returns {Object} VR availability state
 */
export function useWebXRAvailability() {
  const [vrAvailable, setVrAvailable] = useState(false);
  const [vrUnavailableReason, setVrUnavailableReason] = useState(
    "Checking VR availability..."
  );
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    checkWebXRAvailability().then((result) => {
      if (!mounted) return;

      setVrAvailable(result.available);
      setVrUnavailableReason(result.reason || "");
      setIsChecking(false);
    });

    // Listen for VR device changes
    const handleDeviceChange = () => {
      checkWebXRAvailability().then((result) => {
        if (!mounted) return;
        setVrAvailable(result.available);
        setVrUnavailableReason(result.reason || "");
      });
    };

    // Some browsers fire this event when VR devices connect/disconnect
    if (navigator.xr) {
      navigator.xr.addEventListener?.("devicechange", handleDeviceChange);
    }

    return () => {
      mounted = false;
      if (navigator.xr) {
        navigator.xr.removeEventListener?.("devicechange", handleDeviceChange);
      }
    };
  }, []);

  return {
    vrAvailable,
    vrUnavailableReason,
    isChecking,
  };
}

/**
 * useViewModeToggle - Main hook for view mode toggle
 *
 * @param {Object} options
 * @param {string} options.initialMode - Initial mode ('desktop' | 'vr')
 * @param {Function} options.onModeChange - Callback when mode changes
 * @param {boolean} options.vrAvailable - Override VR availability (for testing)
 * @returns {Object} View mode state and actions
 */
export function useViewModeToggle({
  initialMode = VIEW_MODES.DESKTOP,
  onModeChange,
  vrAvailable: vrAvailableOverride,
} = {}) {
  const [mode, setModeInternal] = useState(initialMode);

  // Get WebXR availability (unless overridden)
  const webXRState = useWebXRAvailability();
  const vrAvailable = vrAvailableOverride ?? webXRState.vrAvailable;
  const vrUnavailableReason = webXRState.vrUnavailableReason;

  // Update mode when controlled prop changes
  useEffect(() => {
    if (initialMode && initialMode !== mode) {
      setModeInternal(initialMode);
    }
  }, [initialMode]);

  // Mode change handler
  const setMode = useCallback(
    (newMode) => {
      // Validate mode
      if (!Object.values(VIEW_MODES).includes(newMode)) {
        log.warn(`Invalid view mode: ${newMode}`);
        return;
      }

      // Don't allow VR if unavailable
      if (newMode === VIEW_MODES.VR && !vrAvailable) {
        log.warn("Cannot enter VR mode: VR not available");
        return;
      }

      setModeInternal(newMode);
      onModeChange?.(newMode);
    },
    [vrAvailable, onModeChange]
  );

  // Toggle between modes
  const toggleMode = useCallback(() => {
    const newMode =
      mode === VIEW_MODES.DESKTOP ? VIEW_MODES.VR : VIEW_MODES.DESKTOP;
    setMode(newMode);
  }, [mode, setMode]);

  // Computed states
  const isDesktop = mode === VIEW_MODES.DESKTOP;
  const isVR = mode === VIEW_MODES.VR;
  const canEnterVR = vrAvailable;

  return {
    // State
    mode,
    vrAvailable,
    vrUnavailableReason,

    // Computed
    isDesktop,
    isVR,
    canEnterVR,

    // Actions
    setMode,
    toggleMode,
  };
}

/**
 * useViewModeKeyboardShortcut - Adds keyboard shortcut for mode toggle
 *
 * Default: Ctrl/Cmd + Shift + V to toggle Desktop/VR
 *
 * @param {Object} options
 * @param {Function} options.onToggle - Toggle callback
 * @param {string} options.key - Keyboard key (default: 'v')
 * @param {boolean} options.ctrlKey - Require Ctrl/Cmd (default: true)
 * @param {boolean} options.shiftKey - Require Shift (default: true)
 * @param {boolean} options.enabled - Whether shortcut is enabled
 */
export function useViewModeKeyboardShortcut({
  onToggle,
  key = "v",
  ctrlKey = true,
  shiftKey = true,
  enabled = true,
} = {}) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event) => {
      // Ignore if typing in an input or textarea
      const target = event.target;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Check modifier keys
      const ctrlOrMeta = event.ctrlKey || event.metaKey;
      if (ctrlKey && !ctrlOrMeta) return;
      if (shiftKey && !event.shiftKey) return;

      // Check the key
      if (event.key.toLowerCase() === key.toLowerCase()) {
        event.preventDefault();
        onToggle?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggle, key, ctrlKey, shiftKey, enabled]);
}

/**
 * useGlobalKeyboardShortcuts - Registers multiple keyboard shortcuts
 *
 * @param {Array<Object>} shortcuts - Array of shortcut definitions
 * @param {boolean} enabled - Whether shortcuts are enabled
 *
 * @example
 * useGlobalKeyboardShortcuts([
 *   { key: 'v', ctrl: true, shift: true, action: toggleViewMode, label: 'Toggle VR' },
 *   { key: 'w', ctrl: true, action: openWorkspaceSelector, label: 'Workspaces' },
 * ]);
 */
export function useGlobalKeyboardShortcuts(shortcuts = [], enabled = true) {
  useEffect(() => {
    if (!enabled || shortcuts.length === 0) return;

    const handleKeyDown = (event) => {
      // Ignore if typing in an input or textarea
      const target = event.target;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const ctrlOrMeta = event.ctrlKey || event.metaKey;

      for (const shortcut of shortcuts) {
        const {
          key,
          ctrl = false,
          shift = false,
          alt = false,
          action,
        } = shortcut;

        // Check all modifiers
        if (ctrl && !ctrlOrMeta) continue;
        if (shift && !event.shiftKey) continue;
        if (alt && !event.altKey) continue;

        // Check the key
        if (event.key.toLowerCase() === key.toLowerCase()) {
          event.preventDefault();
          action?.();
          return; // Only trigger one shortcut
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);

  // Return shortcut info for help display
  return shortcuts.map((s) => ({
    key: s.key,
    modifiers: [
      s.ctrl && (navigator.platform.includes("Mac") ? "⌘" : "Ctrl"),
      s.shift && "Shift",
      s.alt && "Alt",
    ].filter(Boolean),
    label: s.label,
  }));
}
