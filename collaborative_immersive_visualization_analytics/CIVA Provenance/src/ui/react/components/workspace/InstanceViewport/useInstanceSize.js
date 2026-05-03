// src/ui/react/components/workspace/InstanceViewport/useInstanceSize.js
// Custom hook for tracking instance viewport size and determining UI mode

import { useState, useEffect, useCallback, useRef } from "react";

// Size constraints for the viewport
export const TOOLBAR_HEIGHT = 36;
export const MIN_WIDTH = 200;
export const MIN_HEIGHT = TOOLBAR_HEIGHT * 6; // 216px

// UI mode breakpoints
export const BREAKPOINTS = {
  EXPANDED: 500,
  STANDARD: 380,
  COMPACT: 280,
  MINI: 200,
  GEAR_ONLY_WIDTH: 120,
  GEAR_ONLY_HEIGHT: 100,
};

/**
 * Determine the UI mode based on viewport dimensions
 * @param {number} width - Container width
 * @param {number} height - Container height
 * @returns {'expanded'|'standard'|'compact'|'mini'|'corner-controls'|'gear-only'}
 */
export const getUIMode = (width, height) => {
  // If not measured yet, default to expanded (assume normal size)
  if (width === 0 || height === 0) {
    return "expanded";
  }

  // Super tiny - gear only
  if (
    width < BREAKPOINTS.GEAR_ONLY_WIDTH ||
    height < BREAKPOINTS.GEAR_ONLY_HEIGHT
  ) {
    return "gear-only";
  }

  // Too small for full toolbars - show corner controls
  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    return "corner-controls";
  }

  // Normal modes based on width
  if (width >= BREAKPOINTS.EXPANDED) return "expanded";
  if (width >= BREAKPOINTS.STANDARD) return "standard";
  if (width >= BREAKPOINTS.COMPACT) return "compact";
  return "mini";
};

/**
 * Get the reason why the viewport is constrained
 * @param {number} width - Container width
 * @param {number} height - Container height
 * @returns {null|'narrow'|'short'|'small'}
 */
export const getConstraintReason = (width, height) => {
  // Not measured yet - no constraint
  if (width === 0 || height === 0) {
    return null;
  }

  if (width >= MIN_WIDTH && height >= MIN_HEIGHT) {
    return null;
  }

  if (width < MIN_WIDTH && height < MIN_HEIGHT) {
    return "small";
  }

  if (width < MIN_WIDTH) {
    return "narrow";
  }

  return "short";
};

/**
 * Get human-readable constraint message
 * @param {'narrow'|'short'|'small'|null} reason
 * @returns {string|null}
 */
export const getConstraintMessage = (reason) => {
  switch (reason) {
    case "narrow":
      return "Too narrow";
    case "short":
      return "Too short";
    case "small":
      return "Too small";
    default:
      return null;
  }
};

/**
 * Custom hook for tracking viewport size and UI mode
 * @param {React.RefObject<HTMLElement>} containerRef - Ref to the container element
 * @returns {{
 *   width: number,
 *   height: number,
 *   uiMode: 'expanded'|'standard'|'compact'|'mini'|'corner-controls'|'gear-only',
 *   constraintReason: null|'narrow'|'short'|'small',
 *   constraintMessage: string|null,
 *   isConstrained: boolean,
 *   showFullToolbars: boolean
 * }}
 */
export function useInstanceSize(containerRef) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const resizeObserverRef = useRef(null);
  const observedElementRef = useRef(null);

  // Resize handler
  const handleResize = useCallback((entries) => {
    if (entries[0]) {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    }
  }, []);

  useEffect(() => {
    // Cleanup previous observer if element changed
    if (resizeObserverRef.current && observedElementRef.current) {
      resizeObserverRef.current.unobserve(observedElementRef.current);
    }

    const element = containerRef.current;
    if (!element) return;

    // Track which element we're observing
    observedElementRef.current = element;

    // Create ResizeObserver if it doesn't exist
    if (!resizeObserverRef.current) {
      resizeObserverRef.current = new ResizeObserver(handleResize);
    }

    // Observe the element
    resizeObserverRef.current.observe(element);

    // Initial measurement
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      setDimensions({ width: rect.width, height: rect.height });
    }

    return () => {
      if (resizeObserverRef.current && observedElementRef.current) {
        resizeObserverRef.current.unobserve(observedElementRef.current);
      }
    };
  }, [handleResize]); // Note: containerRef is intentionally not in deps - refs don't change

  // Also try to measure on mount/update in case ref wasn't set initially
  useEffect(() => {
    const element = containerRef.current;
    if (element && dimensions.width === 0 && dimensions.height === 0) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, []);

  const { width, height } = dimensions;
  const uiMode = getUIMode(width, height);
  const constraintReason = getConstraintReason(width, height);
  const constraintMessage = getConstraintMessage(constraintReason);
  const isConstrained = constraintReason !== null;
  const showFullToolbars =
    uiMode !== "corner-controls" && uiMode !== "gear-only";

  return {
    width,
    height,
    uiMode,
    constraintReason,
    constraintMessage,
    isConstrained,
    showFullToolbars,
  };
}

export default useInstanceSize;
