// src/ui/react/components/panels/LayoutPanel/LayoutPanelContext.js
// Layout Panel Context - SINGLE SOURCE OF TRUTH for navigator dock state
//
// IMPORTANT: This file is the ONLY place where:
// - DOCK_POSITIONS constants should be defined
// - dockPosition state should be managed
//
// All components should import DOCK_POSITIONS from THIS file, not from
// CanvasNavigator.logic.js or LayoutPanel.logic.js to avoid comparison bugs.

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useLayoutPanel } from "./LayoutPanel.logic";

// =============================================================================
// DOCK POSITIONS - SINGLE SOURCE OF TRUTH
// =============================================================================

/**
 * Navigator dock positions
 * Import ONLY from this file to ensure consistent comparisons
 */
export const DOCK_POSITIONS = {
  LEFT_PANEL: "left-panel",
  TOP_LEFT: "top-left",
  TOP_RIGHT: "top-right",
  BOTTOM_LEFT: "bottom-left",
  BOTTOM_RIGHT: "bottom-right",
  FLOAT: "float",
  MINIMIZED: "minimized",
};

// LocalStorage key
const DOCK_POSITION_KEY = "cia-navigator-dock-position";

// =============================================================================
// CONTEXT
// =============================================================================

const LayoutPanelContext = createContext(null);

// =============================================================================
// PROVIDER
// =============================================================================

/**
 * LayoutPanelProvider - Provides shared layout panel state to children
 *
 * This provider creates ONE source of truth for:
 * - Canvas/viewport state (from useLayoutPanel)
 * - Navigator dock position
 *
 * Both LayoutPanel and FloatingCanvasNavigator consume this context.
 *
 * @param {Object} props
 * @param {string} [props.canvasId] - Target canvas ID
 * @param {React.ReactNode} props.children - Child components
 */
export function LayoutPanelProvider({ canvasId, children }) {
  // Create the base logic instance (canvas state, cells, etc.)
  const baseLogic = useLayoutPanel({ canvasId });

  // ==========================================================================
  // DOCK POSITION STATE (persisted to localStorage)
  // ==========================================================================

  const [dockPosition, setDockPositionState] = useState(() => {
    try {
      const stored = localStorage.getItem(DOCK_POSITION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate it's a valid dock position
        if (Object.values(DOCK_POSITIONS).includes(parsed)) {
          console.log("[LayoutPanelContext] Loaded dock position:", parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn("[LayoutPanelContext] Failed to load dock position:", e);
    }
    // Default to FLOAT - this means FloatingCanvasNavigator renders
    return DOCK_POSITIONS.FLOAT;
  });

  // Persist dock position changes
  const setDockPosition = useCallback((position) => {
    console.log("[LayoutPanelContext] Setting dock position:", position);
    setDockPositionState(position);
    try {
      localStorage.setItem(DOCK_POSITION_KEY, JSON.stringify(position));
    } catch (e) {
      console.warn("[LayoutPanelContext] Failed to save dock position:", e);
    }
  }, []);

  // ==========================================================================
  // DERIVED STATE
  // ==========================================================================

  // Check if docked in left panel - used by both LayoutPanel and FloatingCanvasNavigator
  const navigatorDocked = dockPosition === DOCK_POSITIONS.LEFT_PANEL;

  // Convenience functions
  const dockNavigator = useCallback(() => {
    setDockPosition(DOCK_POSITIONS.LEFT_PANEL);
  }, [setDockPosition]);

  const undockNavigator = useCallback(() => {
    setDockPosition(DOCK_POSITIONS.FLOAT);
  }, [setDockPosition]);

  const toggleNavigatorDocked = useCallback(() => {
    setDockPosition(
      navigatorDocked ? DOCK_POSITIONS.FLOAT : DOCK_POSITIONS.LEFT_PANEL
    );
  }, [navigatorDocked, setDockPosition]);

  // ==========================================================================
  // COMBINED LOGIC OBJECT
  // ==========================================================================

  // Merge base logic with dock position state
  const logic = useMemo(
    () => ({
      ...baseLogic,
      // Dock position state (THE source of truth)
      dockPosition,
      setDockPosition,
      navigatorDocked,
      dockNavigator,
      undockNavigator,
      toggleNavigatorDocked,
    }),
    [
      baseLogic,
      dockPosition,
      setDockPosition,
      navigatorDocked,
      dockNavigator,
      undockNavigator,
      toggleNavigatorDocked,
    ]
  );

  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================

  const contextValue = useMemo(
    () => ({
      logic,
      canvasId,
      // Also expose dockPosition directly for easier access
      dockPosition,
      setDockPosition,
    }),
    [logic, canvasId, dockPosition, setDockPosition]
  );

  return (
    <LayoutPanelContext.Provider value={contextValue}>
      {children}
    </LayoutPanelContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * useLayoutPanelContext - Access shared layout panel state
 *
 * @returns {Object|null} { logic, canvasId, dockPosition, setDockPosition } or null
 */
export function useLayoutPanelContext() {
  const context = useContext(LayoutPanelContext);

  if (!context) {
    // Return null - allows components to check and handle gracefully
    return null;
  }

  return context;
}

/**
 * useLayoutPanelLogic - Convenience hook to get just the logic object
 *
 * @returns {Object|null} The logic object, or null if outside provider
 */
export function useLayoutPanelLogic() {
  const context = useLayoutPanelContext();
  return context?.logic || null;
}

/**
 * useNavigatorDocked - Hook for navigator dock state
 *
 * @returns {Object} Dock state and controls
 */
export function useNavigatorDocked() {
  const context = useLayoutPanelContext();

  if (!context?.logic) {
    // Return safe defaults when outside provider
    return {
      navigatorDocked: false,
      toggleNavigatorDocked: () => {},
      dockNavigator: () => {},
      undockNavigator: () => {},
      dockPosition: DOCK_POSITIONS.FLOAT,
      setDockPosition: () => {},
    };
  }

  const { logic } = context;
  return {
    navigatorDocked: logic.navigatorDocked,
    toggleNavigatorDocked: logic.toggleNavigatorDocked,
    dockNavigator: logic.dockNavigator,
    undockNavigator: logic.undockNavigator,
    dockPosition: logic.dockPosition,
    setDockPosition: logic.setDockPosition,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default LayoutPanelContext;
