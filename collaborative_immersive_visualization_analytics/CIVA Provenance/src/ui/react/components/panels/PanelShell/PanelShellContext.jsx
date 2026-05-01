/**
 * PanelShellContext
 *
 * State management for the PanelShell component system.
 * Handles panel positions, sizes, z-index, and persistence.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { STORAGE_KEY, BASE_Z_INDEX } from './constants';

// =============================================================================
// CONTEXT
// =============================================================================

const PanelShellContext = createContext(null);

/**
 * Hook to access PanelShell context
 * @throws {Error} If used outside of PanelShellProvider
 */
export function usePanelShell() {
  const context = useContext(PanelShellContext);
  if (!context) {
    throw new Error('usePanelShell must be used within PanelShellProvider');
  }
  return context;
}

// =============================================================================
// PROVIDER
// =============================================================================

/**
 * @typedef {Object} PanelState
 * @property {string} id - Panel identifier
 * @property {boolean} isOpen - Whether panel is visible
 * @property {{x: number, y: number}} position - Screen position
 * @property {{width: number, height: number}} size - Panel dimensions
 * @property {number} zIndex - Stack order
 * @property {boolean} minimized - Whether panel is minimized
 */

/**
 * Provider for PanelShell state management
 */
export function PanelShellProvider({ children }) {
  const [panels, setPanels] = useState({});
  const [topZIndex, setTopZIndex] = useState(BASE_Z_INDEX);

  // Load saved state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.panels) {
          setPanels(parsed.panels);
          // Restore top z-index
          const maxZ = Object.values(parsed.panels).reduce(
            (max, p) => Math.max(max, p.zIndex || BASE_Z_INDEX),
            BASE_Z_INDEX
          );
          setTopZIndex(maxZ);
        }
      }
    } catch (e) {
      console.warn('Failed to load panel state:', e);
    }
  }, []);

  // Save state on change (debounced would be better for performance)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ panels }));
    } catch (e) {
      console.warn('Failed to save panel state:', e);
    }
  }, [panels]);

  /**
   * Open a panel with optional configuration
   */
  const openPanel = useCallback((panelId, config = {}) => {
    setPanels(prev => {
      const existing = prev[panelId];
      const newZIndex = topZIndex + 1;

      return {
        ...prev,
        [panelId]: {
          id: panelId,
          isOpen: true,
          position: config.position || existing?.position || { x: 100, y: 100 },
          size: config.size || existing?.size || { width: 320, height: 400 },
          zIndex: newZIndex,
          minimized: false,
          ...config,
        },
      };
    });
    setTopZIndex(z => z + 1);
  }, [topZIndex]);

  /**
   * Close a panel (keeps state for reopening)
   */
  const closePanel = useCallback((panelId) => {
    setPanels(prev => ({
      ...prev,
      [panelId]: { ...prev[panelId], isOpen: false },
    }));
  }, []);

  /**
   * Toggle a panel open/closed
   */
  const togglePanel = useCallback((panelId, config = {}) => {
    setPanels(prev => {
      const existing = prev[panelId];
      if (existing?.isOpen) {
        return {
          ...prev,
          [panelId]: { ...existing, isOpen: false },
        };
      }
      // Opening panel
      const newZIndex = topZIndex + 1;
      setTopZIndex(z => z + 1);
      return {
        ...prev,
        [panelId]: {
          id: panelId,
          isOpen: true,
          position: existing?.position || config.position || { x: 100, y: 100 },
          size: existing?.size || config.size || { width: 320, height: 400 },
          zIndex: newZIndex,
          minimized: false,
          ...config,
        },
      };
    });
  }, [topZIndex]);

  /**
   * Update panel position
   */
  const updatePosition = useCallback((panelId, position) => {
    setPanels(prev => {
      if (!prev[panelId]) return prev;
      return {
        ...prev,
        [panelId]: { ...prev[panelId], position },
      };
    });
  }, []);

  /**
   * Update panel size
   */
  const updateSize = useCallback((panelId, size) => {
    setPanels(prev => {
      if (!prev[panelId]) return prev;
      return {
        ...prev,
        [panelId]: { ...prev[panelId], size },
      };
    });
  }, []);

  /**
   * Bring panel to front (highest z-index)
   */
  const bringToFront = useCallback((panelId) => {
    setPanels(prev => {
      if (!prev[panelId]) return prev;
      const newZIndex = topZIndex + 1;
      return {
        ...prev,
        [panelId]: { ...prev[panelId], zIndex: newZIndex },
      };
    });
    setTopZIndex(z => z + 1);
  }, [topZIndex]);

  /**
   * Toggle panel minimized state
   */
  const toggleMinimize = useCallback((panelId) => {
    setPanels(prev => {
      if (!prev[panelId]) return prev;
      return {
        ...prev,
        [panelId]: { ...prev[panelId], minimized: !prev[panelId].minimized },
      };
    });
  }, []);

  /**
   * Get panel state by ID
   */
  const getPanelState = useCallback((panelId) => {
    return panels[panelId] || null;
  }, [panels]);

  /**
   * Check if panel is currently open
   */
  const isPanelOpen = useCallback((panelId) => {
    return panels[panelId]?.isOpen || false;
  }, [panels]);

  /**
   * Get all open panels
   */
  const getOpenPanels = useCallback(() => {
    return Object.values(panels).filter(p => p.isOpen);
  }, [panels]);

  const value = {
    panels,
    openPanel,
    closePanel,
    togglePanel,
    updatePosition,
    updateSize,
    bringToFront,
    toggleMinimize,
    getPanelState,
    isPanelOpen,
    getOpenPanels,
  };

  return (
    <PanelShellContext.Provider value={value}>
      {children}
    </PanelShellContext.Provider>
  );
}

export default PanelShellContext;
