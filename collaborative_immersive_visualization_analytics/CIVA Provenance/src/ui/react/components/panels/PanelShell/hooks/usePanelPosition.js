/**
 * usePanelPosition Hook
 *
 * Handles position persistence for panels.
 * Loads initial position from storage and provides update callbacks.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { STORAGE_KEY } from '../constants';

/**
 * @typedef {Object} UsePanelPositionOptions
 * @property {string} panelId - Panel identifier
 * @property {{x: number, y: number}} [defaultPosition] - Default position if none saved
 * @property {boolean} [persist=true] - Whether to persist position to storage
 */

/**
 * @typedef {Object} UsePanelPositionReturn
 * @property {{x: number, y: number}} position - Current position
 * @property {(pos: {x: number, y: number}) => void} setPosition - Update position
 * @property {() => void} resetPosition - Reset to default position
 * @property {boolean} isLoaded - Whether position has been loaded from storage
 */

/**
 * Hook for panel position persistence
 * @param {UsePanelPositionOptions} options
 * @returns {UsePanelPositionReturn}
 */
export function usePanelPosition({
  panelId,
  defaultPosition = { x: 100, y: 100 },
  persist = true,
}) {
  const [position, setPositionState] = useState(defaultPosition);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Load position from storage on mount
  useEffect(() => {
    if (!persist) {
      setIsLoaded(true);
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const panelData = data.panels?.[panelId];
        if (panelData?.position) {
          setPositionState(panelData.position);
        }
      }
    } catch (e) {
      console.warn(`Failed to load position for panel ${panelId}:`, e);
    }
    setIsLoaded(true);
  }, [panelId, persist]);

  // Save position to storage (debounced)
  const savePosition = useCallback((newPosition) => {
    if (!persist) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save to avoid excessive writes during drag
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const data = stored ? JSON.parse(stored) : { panels: {} };

        if (!data.panels) {
          data.panels = {};
        }

        if (!data.panels[panelId]) {
          data.panels[panelId] = {};
        }

        data.panels[panelId].position = newPosition;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn(`Failed to save position for panel ${panelId}:`, e);
      }
    }, 100);
  }, [panelId, persist]);

  // Update position
  const setPosition = useCallback((newPosition) => {
    setPositionState(newPosition);
    savePosition(newPosition);
  }, [savePosition]);

  // Reset to default position
  const resetPosition = useCallback(() => {
    setPositionState(defaultPosition);
    savePosition(defaultPosition);
  }, [defaultPosition, savePosition]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    position,
    setPosition,
    resetPosition,
    isLoaded,
  };
}

export default usePanelPosition;
