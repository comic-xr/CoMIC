// src/ui/react/hooks/useViewportSize.js
// React hook for managing viewport size (visible grid cells)
//
// Controls how many grid cells are visible at once, enabling users to:
// - Focus on a single cell (1x1) for detailed analysis
// - Use default view (2x3) for normal work
// - Expand view (e.g., 3x4) for overview/comparison
// - Scale up to full canvas view (10x10) for maximum overview
//
// USAGE EXAMPLE:
// ```jsx
// import { useViewportSize } from '@UI/react/hooks';
//
// function ViewportControls({ canvasDimensions }) {
//   const {
//     viewportSize,
//     setViewportSize,
//     incrementViewportSize,
//     decrementViewportSize,
//     resetViewportSize,
//   } = useViewportSize(canvasDimensions);
//
//   return (
//     <div className="viewport-controls">
//       <button onClick={decrementViewportSize}>Focus (−)</button>
//       <span>{viewportSize.rows}×{viewportSize.cols}</span>
//       <button onClick={incrementViewportSize}>Overview (+)</button>
//       <button onClick={resetViewportSize}>Reset</button>
//       <button onClick={() => setViewportSize(1, 1)}>Single Cell</button>
//     </div>
//   );
// }
// ```

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  VIEWPORT_STORAGE_KEY as STORAGE_KEY,
  VIEWPORT_SIZE_EVENT as EVENT_NAME,
  DEFAULT_VIEWPORT_SIZE,
  MIN_VIEWPORT_SIZE as MIN_SIZE,
  MAX_VIEWPORT_SIZE,
  VIEWPORT_SIZE_PRESETS as SIZE_PRESETS,
  loadViewportSize as loadSavedSize,
  saveViewportSize as saveSize,
  dispatchViewportSizeChanged as emitSizeChanged,
  clampViewportSize as clampSize,
  findPresetIndex,
} from "./viewportState.js";

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * useViewportSize - Hook for managing viewport size with persistence
 *
 * @param {{ rows: number, cols: number }} canvasDimensions - Maximum canvas dimensions for clamping
 * @param {{ rows: number, cols: number }} [initialSize] - Initial size (overrides localStorage)
 * @returns {Object} Viewport size state and controls
 */
export function useViewportSize(
  canvasDimensions = { rows: 10, cols: 10 },
  initialSize = null
) {
  // Memoize max dimensions to avoid dependency issues with object references
  const maxRows = canvasDimensions?.rows ?? 10;
  const maxCols = canvasDimensions?.cols ?? 10;
  const maxSize = useMemo(
    () => ({ rows: maxRows, cols: maxCols }),
    [maxRows, maxCols]
  );

  // Initialize from saved preference, initial override, or default
  const [viewportSize, setViewportSizeState] = useState(() => {
    const maxSize = { rows: maxRows, cols: maxCols };

    if (initialSize) {
      return clampSize(initialSize.rows, initialSize.cols, maxSize);
    }

    const saved = loadSavedSize();
    if (saved) {
      return clampSize(saved.rows, saved.cols, maxSize);
    }

    return clampSize(
      DEFAULT_VIEWPORT_SIZE.rows,
      DEFAULT_VIEWPORT_SIZE.cols,
      maxSize
    );
  });

  // Track previous size for event emission
  const previousSizeRef = useRef(viewportSize);

  // Re-clamp when canvas dimensions change
  useEffect(() => {
    setViewportSizeState((current) => {
      const clamped = clampSize(current.rows, current.cols, maxSize);
      if (clamped.rows !== current.rows || clamped.cols !== current.cols) {
        return clamped;
      }
      return current;
    });
  }, [maxSize]);

  // Persist and emit events on size change
  useEffect(() => {
    const prev = previousSizeRef.current;
    if (prev.rows !== viewportSize.rows || prev.cols !== viewportSize.cols) {
      saveSize(viewportSize);
      emitSizeChanged(viewportSize, prev);
      previousSizeRef.current = viewportSize;
    }
  }, [viewportSize]);

  // Add this effect to sync with external sources
  useEffect(() => {
    const handleExternalSync = (e) => {
      const { size } = e.detail;
      if (size?.rows && size?.cols) {
        setViewportSize({
          rows: Math.max(MIN_SIZE.rows, Math.min(maxSize.rows, size.rows)),
          cols: Math.max(MIN_SIZE.cols, Math.min(maxSize.cols, size.cols)),
        });
      }
    };

    window.addEventListener(EVENT_NAME, handleExternalSync);
    return () => window.removeEventListener(EVENT_NAME, handleExternalSync);
  }, [maxSize]);

  // =========================================================================
  // LISTEN FOR EXTERNAL VIEWPORT SIZE CHANGES
  // =========================================================================
  // When other components (like Navigator) dispatch viewport size events,
  // this hook needs to update its internal state to stay in sync.

  useEffect(() => {
    const handleExternalSizeChange = (e) => {
      const { size } = e.detail;
      if (!size?.rows || !size?.cols) return;

      // Check if this event was triggered by our own state change
      // to prevent infinite loops
      const currentSize = previousSizeRef.current;
      if (size.rows === currentSize.rows && size.cols === currentSize.cols) {
        return; // Ignore - this is our own event echoing back
      }

      // Clamp to valid range and update state
      const clamped = clampSize(size.rows, size.cols, maxSize);

      if (process.env.NODE_ENV === "development") {
        console.log(
          `[useViewportSize] External change: ${currentSize.rows}×${currentSize.cols} → ${clamped.rows}×${clamped.cols}`
        );
      }

      // Update internal state - this will trigger re-render
      setViewportSizeState(clamped);

      // Update ref to prevent our own emit from triggering another update
      previousSizeRef.current = clamped;
    };

    window.addEventListener(EVENT_NAME, handleExternalSizeChange);
    return () =>
      window.removeEventListener(EVENT_NAME, handleExternalSizeChange);
  }, [maxSize]);

  /**
   * Set exact viewport size
   * @param {number} rows
   * @param {number} cols
   */
  const setViewportSize = useCallback(
    (rows, cols) => {
      const clamped = clampSize(rows, cols, maxSize);
      setViewportSizeState(clamped);
    },
    [maxSize]
  );

  /**
   * Increment viewport size (show more cells / zoom out)
   * Moves to the next larger preset
   */
  const incrementViewportSize = useCallback(() => {
    setViewportSizeState((current) => {
      const currentIndex = findPresetIndex(current);
      const nextIndex = Math.min(currentIndex + 1, SIZE_PRESETS.length - 1);
      const nextPreset = SIZE_PRESETS[nextIndex];

      // Clamp to canvas dimensions
      return clampSize(nextPreset.rows, nextPreset.cols, maxSize);
    });
  }, [maxSize]);

  /**
   * Decrement viewport size (show fewer cells / zoom in / focus)
   * Moves to the next smaller preset
   */
  const decrementViewportSize = useCallback(() => {
    setViewportSizeState((current) => {
      const currentIndex = findPresetIndex(current);
      const prevIndex = Math.max(currentIndex - 1, 0);
      const prevPreset = SIZE_PRESETS[prevIndex];

      return clampSize(prevPreset.rows, prevPreset.cols, maxSize);
    });
  }, [maxSize]);

  /**
   * Reset viewport size to default (2x3)
   */
  const resetViewportSize = useCallback(() => {
    const clamped = clampSize(
      DEFAULT_VIEWPORT_SIZE.rows,
      DEFAULT_VIEWPORT_SIZE.cols,
      maxSize
    );
    setViewportSizeState(clamped);
  }, [maxSize]);

  // Computed values
  const cellCount = viewportSize.rows * viewportSize.cols;
  const isMinSize =
    viewportSize.rows <= MIN_SIZE.rows && viewportSize.cols <= MIN_SIZE.cols;
  const isMaxSize =
    viewportSize.rows >= maxSize.rows && viewportSize.cols >= maxSize.cols;
  const isDefaultSize =
    viewportSize.rows === DEFAULT_VIEWPORT_SIZE.rows &&
    viewportSize.cols === DEFAULT_VIEWPORT_SIZE.cols;

  return {
    // State
    viewportSize,
    cellCount,

    // Status flags
    isMinSize,
    isMaxSize,
    isDefaultSize,

    // Actions
    setViewportSize,
    incrementViewportSize,
    decrementViewportSize,
    resetViewportSize,

    // Constants (for UI display)
    minSize: MIN_SIZE,
    maxSize,
    defaultSize: DEFAULT_VIEWPORT_SIZE,
    presets: SIZE_PRESETS,
  };
}

export default useViewportSize;
