// src/ui/react/components/organisms/LayoutModeToggle/LayoutModeToggle.logic.js
// Headless logic for layout mode toggle
// Handles Normal/Isolation/Subset mode switching

import { useState, useEffect, useCallback } from "react";
import { view as log } from "@Utils/logger.js";

/**
 * Layout mode constants
 */
export const LAYOUT_MODES = {
  NORMAL: "normal",
  ISOLATION: "isolation",
  SUBSET: "subset",
};

/**
 * Layout mode metadata (labels, descriptions)
 */
export const LAYOUT_MODE_INFO = {
  [LAYOUT_MODES.NORMAL]: {
    label: "Normal",
    description: "Standard grid layout with all cells visible",
  },
  [LAYOUT_MODES.ISOLATION]: {
    label: "Isolation",
    description: "Focus on a single cell in fullscreen",
  },
  [LAYOUT_MODES.SUBSET]: {
    label: "Subset",
    description: "View a filtered subset of cells",
  },
};

/**
 * useLayoutModeToggle - Main hook for layout mode toggle
 *
 * @param {Object} options
 * @param {string} options.initialMode - Initial mode ('normal' | 'isolation' | 'subset')
 * @param {Function} options.onModeChange - Callback when mode changes
 * @param {string[]} options.disabledModes - Array of modes to disable
 * @returns {Object} Layout mode state and actions
 */
export function useLayoutModeToggle({
  initialMode = LAYOUT_MODES.NORMAL,
  onModeChange,
  disabledModes = [],
} = {}) {
  const [mode, setModeInternal] = useState(initialMode);

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
      if (!Object.values(LAYOUT_MODES).includes(newMode)) {
        log.warn("Invalid layout mode:", newMode);
        return;
      }

      // Check if mode is disabled
      if (disabledModes.includes(newMode)) {
        log.warn("Layout mode is disabled:", newMode);
        return;
      }

      log.debug("Layout mode changed:", newMode);
      setModeInternal(newMode);
      onModeChange?.(newMode);
    },
    [disabledModes, onModeChange]
  );

  // Cycle through modes
  const cycleMode = useCallback(() => {
    const modes = Object.values(LAYOUT_MODES).filter(
      (m) => !disabledModes.includes(m)
    );
    const currentIndex = modes.indexOf(mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
  }, [mode, disabledModes, setMode]);

  // Check if a specific mode is active
  const isModeActive = useCallback((targetMode) => mode === targetMode, [mode]);

  // Check if a specific mode is disabled
  const isModeDisabled = useCallback(
    (targetMode) => disabledModes.includes(targetMode),
    [disabledModes]
  );

  // Computed states
  const isNormal = mode === LAYOUT_MODES.NORMAL;
  const isIsolation = mode === LAYOUT_MODES.ISOLATION;
  const isSubset = mode === LAYOUT_MODES.SUBSET;

  return {
    // State
    mode,

    // Computed
    isNormal,
    isIsolation,
    isSubset,

    // Helpers
    isModeActive,
    isModeDisabled,

    // Actions
    setMode,
    cycleMode,
  };
}

/**
 * useLayoutModeKeyboardShortcut - Adds keyboard shortcuts for mode switching
 *
 * Default shortcuts:
 * - Ctrl/Cmd + 1: Normal mode
 * - Ctrl/Cmd + 2: Isolation mode
 * - Ctrl/Cmd + 3: Subset mode
 *
 * @param {Object} options
 * @param {Function} options.setMode - Mode setter function
 * @param {boolean} options.enabled - Whether shortcuts are enabled
 */
export function useLayoutModeKeyboardShortcut({
  setMode,
  enabled = true,
} = {}) {
  useEffect(() => {
    if (!enabled || !setMode) return;

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

      // Check for Ctrl/Cmd modifier
      const ctrlOrMeta = event.ctrlKey || event.metaKey;
      if (!ctrlOrMeta) return;

      // Map number keys to modes
      const keyModeMap = {
        1: LAYOUT_MODES.NORMAL,
        2: LAYOUT_MODES.ISOLATION,
        3: LAYOUT_MODES.SUBSET,
      };

      const targetMode = keyModeMap[event.key];
      if (targetMode) {
        event.preventDefault();
        log.debug("Keyboard shortcut triggered:", event.key, "→", targetMode);
        setMode(targetMode);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setMode, enabled]);
}
