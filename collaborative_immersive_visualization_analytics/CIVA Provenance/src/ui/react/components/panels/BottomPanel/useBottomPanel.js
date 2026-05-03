// src/ui/react/components/panels/BottomPanel/useBottomPanel.js
// State management for the bottom panel
//
// Handles:
// - Expand/collapse state
// - Active tab selection
// - Panel height (for resize)
// - Persists preferences to localStorage

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "cia-bottom-panel-prefs";
const DEFAULT_HEIGHT = 200;
const MIN_HEIGHT = 100;
const MAX_HEIGHT = 400;

/**
 * Available tabs in the bottom panel
 * Add new tabs here as features are added
 */
export const BottomPanelTabs = Object.freeze({
  LOGS: "logs",
  COMPUTE: "compute", // Future: Compute job status
  CONSOLE: "console", // Future: Debug console
});

/**
 * Load preferences from localStorage
 */
function loadPreferences() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Failed to load bottom panel preferences:", e);
  }
  return null;
}

/**
 * Save preferences to localStorage
 */
function savePreferences(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn("Failed to save bottom panel preferences:", e);
  }
}

/**
 * useBottomPanel - Headless state management
 *
 * @returns {Object} Panel state and controls
 */
export function useBottomPanel() {
  // Load initial state from localStorage or use defaults
  const [state, setState] = useState(() => {
    const prefs = loadPreferences();
    return {
      isExpanded: prefs?.isExpanded ?? false,
      activeTab: prefs?.activeTab ?? BottomPanelTabs.LOGS,
      height: prefs?.height ?? DEFAULT_HEIGHT,
    };
  });

  // Persist preferences when they change
  useEffect(() => {
    savePreferences({
      isExpanded: state.isExpanded,
      activeTab: state.activeTab,
      height: state.height,
    });
  }, [state.isExpanded, state.activeTab, state.height]);

  // Toggle expanded/collapsed
  const toggle = useCallback(() => {
    setState((prev) => ({ ...prev, isExpanded: !prev.isExpanded }));
  }, []);

  // Expand panel (optionally to a specific tab)
  const expand = useCallback((tab = null) => {
    setState((prev) => ({
      ...prev,
      isExpanded: true,
      activeTab: tab ?? prev.activeTab,
    }));
  }, []);

  // Collapse panel
  const collapse = useCallback(() => {
    setState((prev) => ({ ...prev, isExpanded: false }));
  }, []);

  // Set active tab
  const setActiveTab = useCallback((tab) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  // Resize panel (with bounds checking)
  const setHeight = useCallback((newHeight) => {
    const clampedHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));
    setState((prev) => ({ ...prev, height: clampedHeight }));
  }, []);

  // Expand to logs tab specifically (convenience for StatusBar)
  const showLogs = useCallback(() => {
    expand(BottomPanelTabs.LOGS);
  }, [expand]);

  // Expand to compute tab specifically
  const showCompute = useCallback(() => {
    expand(BottomPanelTabs.COMPUTE);
  }, [expand]);

  return {
    // State
    isExpanded: state.isExpanded,
    activeTab: state.activeTab,
    height: state.height,

    // Actions
    toggle,
    expand,
    collapse,
    setActiveTab,
    setHeight,

    // Convenience
    showLogs,
    showCompute,

    // Constants
    minHeight: MIN_HEIGHT,
    maxHeight: MAX_HEIGHT,
  };
}

// =============================================================================
// GLOBAL INSTANCE (for StatusBar integration)
// =============================================================================
// This allows StatusBar to control the panel without prop drilling

let globalPanelControls = null;

/**
 * Register panel controls for global access
 * Called by BottomPanel on mount
 */
export function registerBottomPanelControls(controls) {
  globalPanelControls = controls;
}

/**
 * Get global panel controls
 * Used by StatusBar to toggle panel
 */
export function getBottomPanelControls() {
  return globalPanelControls;
}
