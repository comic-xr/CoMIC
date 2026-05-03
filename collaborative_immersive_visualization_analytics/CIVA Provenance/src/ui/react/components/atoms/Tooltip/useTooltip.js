/**
 * @file useTooltip.js
 * @description Custom hook for managing tooltip state, positioning, and timing.
 * Handles show/hide delays, positioning, and viewport constraints.
 *
 * Features:
 * - Configurable show/hide delays
 * - Viewport-aware positioning with flip behavior
 * - Skip delay for rapid tooltip viewing
 * - Scroll/resize handling
 * - Support for different trigger modes
 *
 * @example
 * // Basic usage
 * const { isVisible, show, hide, position, triggerRef, tooltipRef } = useTooltip({
 *   placement: 'top',
 *   delay: 400
 * });
 *
 * @example
 * // With skip delay integration
 * const tooltip = useTooltip({
 *   placement: 'bottom',
 *   delay: 400,
 *   skipDelay: true
 * });
 */

import { useState, useRef, useCallback, useEffect, useId } from "react";

/**
 * Placement options for tooltip positioning
 * @typedef {'top'|'bottom'|'left'|'right'} Placement
 */

/**
 * Position coordinates
 * @typedef {Object} Position
 * @property {number} x - Horizontal position
 * @property {number} y - Vertical position
 */

/**
 * Arrow position
 * @typedef {Object} ArrowPosition
 * @property {number} x - Horizontal offset for arrow
 * @property {number} y - Vertical offset for arrow
 */

/**
 * Hook options
 * @typedef {Object} UseTooltipOptions
 * @property {Placement} [placement='top'] - Tooltip placement
 * @property {number} [delay=400] - Delay before showing (ms)
 * @property {number} [hideDelay=0] - Delay before hiding (ms)
 * @property {number} [offset=8] - Distance from trigger
 * @property {boolean} [interactive=false] - Allow hovering over tooltip
 * @property {boolean} [disabled=false] - Disable tooltip
 * @property {Function} [onOpenChange] - Callback when visibility changes
 */

/**
 * Hook return value
 * @typedef {Object} UseTooltipReturn
 * @property {boolean} isVisible - Whether tooltip is currently visible
 * @property {() => void} show - Show the tooltip (with delay)
 * @property {() => void} hide - Hide the tooltip (with delay)
 * @property {() => void} showImmediate - Show tooltip immediately
 * @property {() => void} hideImmediate - Hide tooltip immediately
 * @property {Position} position - Calculated position { x, y }
 * @property {ArrowPosition} arrowPosition - Arrow offset position
 * @property {Placement} actualPlacement - Actual placement after flip
 * @property {React.RefObject<HTMLElement>} triggerRef - Ref for trigger element
 * @property {React.RefObject<HTMLElement>} tooltipRef - Ref for tooltip element
 * @property {string} tooltipId - Unique ID for ARIA
 * @property {Object} triggerProps - Props to spread on trigger
 * @property {Object} tooltipProps - Props to spread on tooltip
 */

// Global state for skip delay behavior
let lastHideTime = 0;
const SKIP_DELAY_DURATION = 300;

/**
 * Calculate tooltip position based on trigger element and placement
 * @param {DOMRect} triggerRect - Trigger element bounding rect
 * @param {DOMRect} tooltipRect - Tooltip element bounding rect
 * @param {Placement} placement - Desired placement
 * @param {number} offset - Offset from trigger
 * @returns {{ position: Position, arrowPosition: ArrowPosition, actualPlacement: Placement }}
 */
function calculatePosition(triggerRect, tooltipRect, placement, offset) {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  let x = 0;
  let y = 0;
  let actualPlacement = placement;

  // Calculate center points
  const triggerCenterX = triggerRect.left + triggerRect.width / 2;
  const triggerCenterY = triggerRect.top + triggerRect.height / 2;

  // Calculate base position based on placement
  switch (placement) {
    case "top":
      x = triggerCenterX - tooltipRect.width / 2;
      y = triggerRect.top - tooltipRect.height - offset;
      break;
    case "bottom":
      x = triggerCenterX - tooltipRect.width / 2;
      y = triggerRect.bottom + offset;
      break;
    case "left":
      x = triggerRect.left - tooltipRect.width - offset;
      y = triggerCenterY - tooltipRect.height / 2;
      break;
    case "right":
      x = triggerRect.right + offset;
      y = triggerCenterY - tooltipRect.height / 2;
      break;
    default:
      x = triggerCenterX - tooltipRect.width / 2;
      y = triggerRect.top - tooltipRect.height - offset;
  }

  // Check if tooltip would overflow and flip if needed
  const wouldOverflowTop = y < 8;
  const wouldOverflowBottom = y + tooltipRect.height > viewport.height - 8;
  const wouldOverflowLeft = x < 8;
  const wouldOverflowRight = x + tooltipRect.width > viewport.width - 8;

  // Vertical flip
  if (placement === "top" && wouldOverflowTop && !wouldOverflowBottom) {
    y = triggerRect.bottom + offset;
    actualPlacement = "bottom";
  } else if (
    placement === "bottom" &&
    wouldOverflowBottom &&
    !wouldOverflowTop
  ) {
    y = triggerRect.top - tooltipRect.height - offset;
    actualPlacement = "top";
  }

  // Horizontal flip
  if (placement === "left" && wouldOverflowLeft && !wouldOverflowRight) {
    x = triggerRect.right + offset;
    actualPlacement = "right";
  } else if (
    placement === "right" &&
    wouldOverflowRight &&
    !wouldOverflowLeft
  ) {
    x = triggerRect.left - tooltipRect.width - offset;
    actualPlacement = "left";
  }

  // Constrain to viewport
  x = Math.max(8, Math.min(x, viewport.width - tooltipRect.width - 8));
  y = Math.max(8, Math.min(y, viewport.height - tooltipRect.height - 8));

  // Calculate arrow position (center relative to trigger)
  let arrowX = triggerCenterX - x;
  let arrowY = triggerCenterY - y;

  // Constrain arrow within tooltip bounds
  const arrowPadding = 12; // Min distance from edge
  if (actualPlacement === "top" || actualPlacement === "bottom") {
    arrowX = Math.max(
      arrowPadding,
      Math.min(arrowX, tooltipRect.width - arrowPadding)
    );
  } else {
    arrowY = Math.max(
      arrowPadding,
      Math.min(arrowY, tooltipRect.height - arrowPadding)
    );
  }

  return {
    position: { x: Math.round(x), y: Math.round(y) },
    arrowPosition: { x: arrowX, y: arrowY },
    actualPlacement,
  };
}

/**
 * Check if should skip delay (recent tooltip was shown)
 * @returns {boolean}
 */
function shouldSkipDelay() {
  const timeSinceLastHide = Date.now() - lastHideTime;
  return timeSinceLastHide < SKIP_DELAY_DURATION;
}

/**
 * Update last hide time for skip delay tracking
 */
function updateLastHideTime() {
  lastHideTime = Date.now();
}

/**
 * Custom hook for managing tooltip state and positioning.
 *
 * @param {UseTooltipOptions} [options={}] - Hook options
 * @returns {UseTooltipReturn} Tooltip state and utilities
 */
export function useTooltip(options = {}) {
  const {
    placement = "top",
    delay = 400,
    hideDelay = 0,
    offset = 8,
    interactive = false,
    disabled = false,
    onOpenChange,
  } = options;

  // State
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [arrowPosition, setArrowPosition] = useState({ x: 0, y: 0 });
  const [actualPlacement, setActualPlacement] = useState(placement);

  // Refs
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const showTimeoutRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const isHoveringTooltipRef = useRef(false);

  // Generate unique ID for ARIA
  const tooltipId = useId();

  /**
   * Clear all pending timeouts
   */
  const clearTimeouts = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  /**
   * Update tooltip position
   */
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    const result = calculatePosition(
      triggerRect,
      tooltipRect,
      placement,
      offset
    );

    setPosition(result.position);
    setArrowPosition(result.arrowPosition);
    setActualPlacement(result.actualPlacement);
  }, [placement, offset]);

  /**
   * Show tooltip immediately
   */
  const showImmediate = useCallback(() => {
    if (disabled) return;

    clearTimeouts();
    setIsVisible(true);
    onOpenChange?.(true);
  }, [disabled, clearTimeouts, onOpenChange]);

  /**
   * Hide tooltip immediately
   */
  const hideImmediate = useCallback(() => {
    clearTimeouts();
    setIsVisible(false);
    updateLastHideTime();
    onOpenChange?.(false);
  }, [clearTimeouts, onOpenChange]);

  /**
   * Show tooltip with delay
   */
  const show = useCallback(() => {
    if (disabled) return;

    clearTimeouts();

    // Skip delay if recently viewed another tooltip
    const actualDelay = shouldSkipDelay() ? 0 : delay;

    if (actualDelay === 0) {
      showImmediate();
    } else {
      showTimeoutRef.current = setTimeout(() => {
        showImmediate();
      }, actualDelay);
    }
  }, [disabled, delay, clearTimeouts, showImmediate]);

  /**
   * Hide tooltip with delay
   */
  const hide = useCallback(() => {
    clearTimeouts();

    // For interactive tooltips, check if hovering over tooltip
    if (interactive && isHoveringTooltipRef.current) {
      return;
    }

    if (hideDelay === 0) {
      hideImmediate();
    } else {
      hideTimeoutRef.current = setTimeout(() => {
        hideImmediate();
      }, hideDelay);
    }
  }, [hideDelay, interactive, clearTimeouts, hideImmediate]);

  /**
   * Handle tooltip mouse enter (for interactive tooltips)
   */
  const handleTooltipMouseEnter = useCallback(() => {
    if (interactive) {
      isHoveringTooltipRef.current = true;
      clearTimeouts();
    }
  }, [interactive, clearTimeouts]);

  /**
   * Handle tooltip mouse leave (for interactive tooltips)
   */
  const handleTooltipMouseLeave = useCallback(() => {
    if (interactive) {
      isHoveringTooltipRef.current = false;
      hide();
    }
  }, [interactive, hide]);

  // Update position when visible
  useEffect(() => {
    if (isVisible) {
      // Use requestAnimationFrame to ensure tooltip is rendered
      requestAnimationFrame(() => {
        updatePosition();
      });
    }
  }, [isVisible, updatePosition]);

  // Handle scroll and resize
  useEffect(() => {
    if (!isVisible) return;

    const handleScrollResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollResize, true);
    window.addEventListener("resize", handleScrollResize);

    return () => {
      window.removeEventListener("scroll", handleScrollResize, true);
      window.removeEventListener("resize", handleScrollResize);
    };
  }, [isVisible, updatePosition]);

  // Hide tooltip on global visibility changes to prevent "stuck" states
  useEffect(() => {
    if (!isVisible) return;

    const handleBlur = () => hideImmediate();
    const handleVisibility = () => {
      if (document.hidden) {
        hideImmediate();
      }
    };
    const handleMouseOut = (event) => {
      if (!event.relatedTarget) {
        hideImmediate();
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("mouseout", handleMouseOut);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("mouseout", handleMouseOut);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isVisible, hideImmediate]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  // Props to spread on trigger element
  const triggerProps = {
    ref: triggerRef,
    "aria-describedby": isVisible ? tooltipId : undefined,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  };

  // Props to spread on tooltip element
  const tooltipProps = {
    ref: tooltipRef,
    id: tooltipId,
    role: interactive ? "dialog" : "tooltip",
    onMouseEnter: handleTooltipMouseEnter,
    onMouseLeave: handleTooltipMouseLeave,
    style: {
      position: "fixed",
      left: `${position.x}px`,
      top: `${position.y}px`,
    },
  };

  return {
    isVisible,
    show,
    hide,
    showImmediate,
    hideImmediate,
    position,
    arrowPosition,
    actualPlacement,
    triggerRef,
    tooltipRef,
    tooltipId,
    triggerProps,
    tooltipProps,
    updatePosition,
  };
}

export default useTooltip;
