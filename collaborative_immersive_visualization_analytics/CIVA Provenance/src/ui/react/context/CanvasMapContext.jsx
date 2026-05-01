/**
 * CanvasMapContext
 * Location: src/ui/react/context/CanvasMapContext.jsx
 *
 * Provides canvas map editing state management.
 * Tracks whether the canvas map panel is active and which VGs are placed.
 *
 * Features:
 * - Track canvas map panel active state
 * - Track placed VG IDs on the canvas
 * - Integration with unified companion panel
 *
 * @module CanvasMapContext
 */

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * @typedef {Object} CanvasMapContextValue
 * @property {boolean} isActive - Whether canvas map panel is open/active
 * @property {string[]} placedVGIds - IDs of ViewGroups placed on canvas
 * @property {function} activateCanvasMap - Mark canvas map as active
 * @property {function} deactivateCanvasMap - Mark canvas map as inactive
 * @property {function} placeVG - Add a VG to the canvas
 * @property {function} removeVG - Remove a VG from the canvas
 * @property {function} setPlacedVGs - Set all placed VG IDs at once
 * @property {function} isVGPlaced - Check if a VG is on canvas
 */

// =============================================================================
// CONTEXT
// =============================================================================

const CanvasMapContext = createContext(null);

// =============================================================================
// PROVIDER
// =============================================================================

/**
 * Provider component for Canvas Map context
 * Wrap your panel manager or workspace root with this provider
 */
export function CanvasMapProvider({ children }) {
  const [isActive, setIsActive] = useState(false);
  const [placedVGIds, setPlacedVGIds] = useState([]);

  /**
   * Mark canvas map as active (called when panel opens)
   */
  const activateCanvasMap = useCallback(() => {
    setIsActive(true);
  }, []);

  /**
   * Mark canvas map as inactive (called when panel closes)
   */
  const deactivateCanvasMap = useCallback(() => {
    setIsActive(false);
  }, []);

  /**
   * Add a ViewGroup to the canvas
   * @param {string} vgId - ViewGroup ID to place
   */
  const placeVG = useCallback((vgId) => {
    setPlacedVGIds((prev) => {
      if (prev.includes(vgId)) return prev;
      return [...prev, vgId];
    });
  }, []);

  /**
   * Remove a ViewGroup from the canvas
   * @param {string} vgId - ViewGroup ID to remove
   */
  const removeVG = useCallback((vgId) => {
    setPlacedVGIds((prev) => prev.filter((id) => id !== vgId));
  }, []);

  /**
   * Set all placed VG IDs at once (for sync with external state)
   * @param {string[]} vgIds - Array of placed VG IDs
   */
  const setPlacedVGs = useCallback((vgIds) => {
    setPlacedVGIds(vgIds);
  }, []);

  /**
   * Check if a specific VG is placed on canvas
   */
  const isVGPlaced = useCallback(
    (vgId) => {
      return placedVGIds.includes(vgId);
    },
    [placedVGIds]
  );

  const value = useMemo(
    () => ({
      isActive,
      placedVGIds,
      activateCanvasMap,
      deactivateCanvasMap,
      placeVG,
      removeVG,
      setPlacedVGs,
      isVGPlaced,
    }),
    [
      isActive,
      placedVGIds,
      activateCanvasMap,
      deactivateCanvasMap,
      placeVG,
      removeVG,
      setPlacedVGs,
      isVGPlaced,
    ]
  );

  return (
    <CanvasMapContext.Provider value={value}>
      {children}
    </CanvasMapContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to access Canvas Map context
 * @returns {CanvasMapContextValue|null} Context value or null if no provider
 */
export function useCanvasMap() {
  return useContext(CanvasMapContext);
}

/**
 * Hook that requires Canvas Map context
 * @throws {Error} If used outside provider
 * @returns {CanvasMapContextValue} Context value
 */
export function useCanvasMapRequired() {
  const context = useContext(CanvasMapContext);
  if (!context) {
    throw new Error('useCanvasMapRequired must be used within a CanvasMapProvider');
  }
  return context;
}

/**
 * Hook to check if canvas map is active
 * @returns {boolean} True if canvas map is active
 */
export function useCanvasMapActive() {
  const context = useContext(CanvasMapContext);
  return context?.isActive || false;
}

/**
 * Hook to get placed VG IDs
 * @returns {string[]} Array of placed VG IDs
 */
export function usePlacedVGIds() {
  const context = useContext(CanvasMapContext);
  return context?.placedVGIds || [];
}

/**
 * Hook to check if a specific VG is on canvas
 * @param {string} vgId - ViewGroup ID to check
 * @returns {boolean} True if the VG is placed
 */
export function useIsVGOnCanvas(vgId) {
  const context = useContext(CanvasMapContext);
  return context?.placedVGIds?.includes(vgId) || false;
}

export default CanvasMapContext;
