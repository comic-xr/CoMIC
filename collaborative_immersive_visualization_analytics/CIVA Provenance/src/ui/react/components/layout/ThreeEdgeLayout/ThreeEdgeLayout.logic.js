// src/ui/react/components/layout/ThreeEdgeLayout/ThreeEdgeLayout.logic.js
// Pure logic hooks for layout state management
// Separates business logic from presentation (headless pattern)

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ui as log } from "@Utils/logger.js";

/**
 * Panel dimension constraints
 * Ensures panels don't get too small or too large
 */
export const PANEL_CONSTRAINTS = {
  left: {
    min: 400, // Wide enough for adaptive/VR controls
    max: 600,
    default: 400, // Match minimum for consistent experience
    collapsed: 48,
  },
  right: {
    min: 400, // Wide enough for adaptive/VR controls
    max: 600,
    default: 400, // Match minimum for consistent experience
    collapsed: 48,
  },
};

/**
 * Minimum widths for secondary bar zones
 * Ensures controls remain usable even when panels are collapsed
 */
export const SECONDARY_BAR_MIN_WIDTHS = {
  left: 180, // Workspace dropdown needs space
  right: 180, // Voice controls need space
};

/**
 * useLayoutState - Manages panel open/closed state and dimensions
 *
 * @returns {Object} Layout state and setters
 */
export function useLayoutState() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(PANEL_CONSTRAINTS.left.default);
  const [rightWidth, setRightWidth] = useState(PANEL_CONSTRAINTS.right.default);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = loadLayoutState();
    if (savedState) {
      setLeftOpen(savedState.leftOpen ?? true);
      // Always show the right panel by default (ignore stored "closed" state)
      setRightOpen(savedState.rightOpen === false ? true : (savedState.rightOpen ?? true));
      setLeftWidth(savedState.leftWidth ?? PANEL_CONSTRAINTS.left.default);
      setRightWidth(savedState.rightWidth ?? PANEL_CONSTRAINTS.right.default);
    }
  }, []);

  return {
    leftOpen,
    setLeftOpen,
    rightOpen,
    setRightOpen,
    leftWidth,
    setLeftWidth: (width) => {
      const constrained = constrainWidth(width, "left");
      setLeftWidth(constrained);
    },
    rightWidth,
    setRightWidth: (width) => {
      const constrained = constrainWidth(width, "right");
      setRightWidth(constrained);
    },
  };
}

/**
 * useResizeHandler - Handles drag-to-resize logic for panels
 *
 * @param {string} side - 'left' or 'right'
 * @param {Function} onWidthChange - Callback when width changes
 * @returns {Object} Resize handlers
 */
export function useResizeHandler(side, onWidthChange) {
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback((e) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      let newWidth;

      if (side === "left") {
        // Left panel: width = mouse X position
        newWidth = e.clientX;
      } else {
        // Right panel: width = window width - mouse X position
        newWidth = window.innerWidth - e.clientX;
      }

      // Apply constraints
      const constrained = constrainWidth(newWidth, side);
      onWidthChange(constrained);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, side, onWidthChange]);

  return {
    isResizing,
    handleMouseDown,
  };
}

/**
 * usePanelPersistence - Saves layout state to localStorage
 * Uses debouncing to avoid excessive writes during resize operations
 * Also saves on page unload to ensure state is captured
 *
 * @param {Object} state - Current layout state
 */
export function usePanelPersistence(state) {
  const stateRef = useRef(state);
  const timeoutRef = useRef(null);

  // Keep ref updated
  stateRef.current = state;

  // Debounced save (300ms delay during resize operations)
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveLayoutState(state);
      log.debug("Layout state saved:", state);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state.leftOpen, state.rightOpen, state.leftWidth, state.rightWidth]);

  // Save immediately on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveLayoutState(stateRef.current);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveLayoutState(stateRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}

/**
 * useSecondaryBarZoneWidths - Calculates zone widths for secondary bars
 * Ensures minimum widths are maintained even when panels are collapsed
 *
 * @param {Object} options
 * @param {number} options.leftPanelWidth - Current left panel width
 * @param {number} options.rightPanelWidth - Current right panel width
 * @param {boolean} options.leftPanelOpen - Is left panel expanded
 * @param {boolean} options.rightPanelOpen - Is right panel expanded
 * @returns {Object} Calculated zone widths
 */
export function useSecondaryBarZoneWidths({
  leftPanelWidth,
  rightPanelWidth,
  leftPanelOpen,
  rightPanelOpen,
}) {
  // Left zone: use panel width when open, minimum when collapsed
  const leftZoneWidth = leftPanelOpen
    ? leftPanelWidth
    : Math.max(PANEL_CONSTRAINTS.left.collapsed, SECONDARY_BAR_MIN_WIDTHS.left);

  // Right zone: use panel width when open, minimum when collapsed
  const rightZoneWidth = rightPanelOpen
    ? rightPanelWidth
    : Math.max(
        PANEL_CONSTRAINTS.right.collapsed,
        SECONDARY_BAR_MIN_WIDTHS.right
      );

  return {
    leftZoneWidth,
    rightZoneWidth,
    // For components that need to know if they should show compact vs full UI
    leftZoneCompact: !leftPanelOpen,
    rightZoneCompact: !rightPanelOpen,
  };
}

/**
 * Constrain width to min/max values
 *
 * @param {number} width - Proposed width
 * @param {string} side - 'left' or 'right'
 * @returns {number} Constrained width
 */
function constrainWidth(width, side) {
  const constraints = PANEL_CONSTRAINTS[side];
  return Math.max(constraints.min, Math.min(constraints.max, width));
}

/**
 * Load layout state from localStorage
 *
 * @returns {Object|null} Saved state or null
 */
function loadLayoutState() {
  try {
    const saved = localStorage.getItem("ciaLayoutState");
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    log.error("Failed to load layout state:", error);
    return null;
  }
}

/**
 * Save layout state to localStorage
 *
 * @param {Object} state - State to save
 */
function saveLayoutState(state) {
  try {
    localStorage.setItem("ciaLayoutState", JSON.stringify(state));
  } catch (error) {
    log.error("Failed to save layout state:", error);
  }
}
