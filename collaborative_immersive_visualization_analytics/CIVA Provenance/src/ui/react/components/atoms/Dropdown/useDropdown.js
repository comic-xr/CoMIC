/**
 * @file useDropdown.js
 * @description Custom hook for managing dropdown state, positioning, and interactions.
 * Handles open/close state, viewport-aware positioning, and keyboard/click events.
 *
 * Features:
 * - Controlled and uncontrolled modes
 * - Viewport-aware positioning with flip behavior
 * - Click outside detection
 * - Escape key handling
 * - Scroll/resize repositioning
 * - RTL layout support
 *
 * @example
 * // Basic usage
 * const { isOpen, toggle, triggerRef, dropdownRef, position } = useDropdown({
 *   placement: 'bottom-start',
 *   offset: 4
 * });
 *
 * @example
 * // Controlled mode
 * const [open, setOpen] = useState(false);
 * const dropdown = useDropdown({
 *   isOpen: open,
 *   onOpenChange: setOpen
 * });
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";

/**
 * Placement options for dropdown positioning
 * @typedef {'bottom-start'|'bottom-end'|'bottom'|'top-start'|'top-end'|'top'|'left'|'right'} Placement
 */

/**
 * Position coordinates
 * @typedef {Object} Position
 * @property {number} x - Horizontal position
 * @property {number} y - Vertical position
 */

/**
 * Hook options
 * @typedef {Object} UseDropdownOptions
 * @property {boolean} [defaultOpen=false] - Initial open state (uncontrolled)
 * @property {boolean} [isOpen] - Controlled open state
 * @property {(open: boolean) => void} [onOpenChange] - Callback when open state changes
 * @property {Placement} [placement='bottom-start'] - Dropdown placement
 * @property {number} [offset=4] - Distance from trigger in pixels
 * @property {boolean} [closeOnClickOutside=true] - Close when clicking outside
 * @property {boolean} [closeOnEscape=true] - Close when Escape is pressed
 * @property {boolean} [matchTriggerWidth=false] - Match dropdown width to trigger
 */

/**
 * Hook return value
 * @typedef {Object} UseDropdownReturn
 * @property {boolean} isOpen - Current open state
 * @property {boolean} isPositioned - Whether position has been calculated
 * @property {() => void} open - Open the dropdown
 * @property {() => void} close - Close the dropdown
 * @property {() => void} toggle - Toggle open state
 * @property {React.RefObject<HTMLElement>} triggerRef - Ref for trigger element
 * @property {React.RefObject<HTMLElement>} dropdownRef - Ref for dropdown panel
 * @property {Object} triggerProps - Props to spread on trigger
 * @property {Object} dropdownProps - Props to spread on dropdown
 * @property {Position} position - Calculated position { x, y }
 * @property {string} actualPlacement - Actual placement after flip
 * @property {number|null} triggerWidth - Trigger element width
 */

/**
 * Calculate dropdown position based on trigger element and placement
 * @param {DOMRect} triggerRect - Trigger element bounding rect
 * @param {DOMRect} dropdownRect - Dropdown element bounding rect
 * @param {Placement} placement - Desired placement
 * @param {number} offset - Offset from trigger
 * @returns {{ position: Position, actualPlacement: Placement }}
 */
function calculatePosition(triggerRect, dropdownRect, placement, offset) {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  // Parse placement
  const [side, align = "center"] = placement.split("-");

  let x = 0;
  let y = 0;
  let actualPlacement = placement;

  // Calculate base position based on side
  switch (side) {
    case "bottom":
      y = triggerRect.bottom + offset;
      break;
    case "top":
      y = triggerRect.top - dropdownRect.height - offset;
      break;
    case "left":
      x = triggerRect.left - dropdownRect.width - offset;
      y = triggerRect.top;
      break;
    case "right":
      x = triggerRect.right + offset;
      y = triggerRect.top;
      break;
    default:
      y = triggerRect.bottom + offset;
  }

  // Calculate horizontal alignment for top/bottom placements
  if (side === "bottom" || side === "top") {
    switch (align) {
      case "start":
        x = triggerRect.left;
        break;
      case "end":
        x = triggerRect.right - dropdownRect.width;
        break;
      case "center":
      default:
        x = triggerRect.left + (triggerRect.width - dropdownRect.width) / 2;
        break;
    }
  }

  // Calculate vertical alignment for left/right placements
  if (side === "left" || side === "right") {
    y = triggerRect.top + (triggerRect.height - dropdownRect.height) / 2;
  }

  // Flip if not enough space
  const wouldOverflowBottom = y + dropdownRect.height > viewport.height - 8;
  const wouldOverflowTop = y < 8;
  const wouldOverflowRight = x + dropdownRect.width > viewport.width - 8;
  const wouldOverflowLeft = x < 8;

  // Vertical flip
  if (side === "bottom" && wouldOverflowBottom && !wouldOverflowTop) {
    y = triggerRect.top - dropdownRect.height - offset;
    actualPlacement = placement.replace("bottom", "top");
  } else if (side === "top" && wouldOverflowTop && !wouldOverflowBottom) {
    y = triggerRect.bottom + offset;
    actualPlacement = placement.replace("top", "bottom");
  }

  // Horizontal flip
  if (side === "right" && wouldOverflowRight && !wouldOverflowLeft) {
    x = triggerRect.left - dropdownRect.width - offset;
    actualPlacement = "left";
  } else if (side === "left" && wouldOverflowLeft && !wouldOverflowRight) {
    x = triggerRect.right + offset;
    actualPlacement = "right";
  }

  // Constrain to viewport
  x = Math.max(8, Math.min(x, viewport.width - dropdownRect.width - 8));
  y = Math.max(8, Math.min(y, viewport.height - dropdownRect.height - 8));

  return {
    position: { x: Math.round(x), y: Math.round(y) },
    actualPlacement,
  };
}

/**
 * Custom hook for managing dropdown state and positioning.
 *
 * @param {UseDropdownOptions} [options={}] - Hook options
 * @returns {UseDropdownReturn} Dropdown state and utilities
 */
export function useDropdown(options = {}) {
  const {
    defaultOpen = false,
    isOpen: controlledIsOpen,
    onOpenChange,
    placement = "bottom-start",
    offset = 4,
    closeOnClickOutside = true,
    closeOnEscape = true,
    matchTriggerWidth = false,
  } = options;

  // Determine if controlled
  const isControlled = controlledIsOpen !== undefined;

  // Internal state for uncontrolled mode
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  // Actual open state
  const isOpen = isControlled ? controlledIsOpen : internalOpen;

  // Position state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [actualPlacement, setActualPlacement] = useState(placement);
  const [triggerWidth, setTriggerWidth] = useState(null);
  const [isPositioned, setIsPositioned] = useState(false);

  // Refs
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Unique ID for ARIA
  const dropdownId = useRef(
    `dropdown-${Math.random().toString(36).slice(2, 9)}`
  );

  /**
   * Update open state
   * @param {boolean} newOpen - New open state
   */
  const setOpen = useCallback(
    (newOpen) => {
      if (!isControlled) {
        setInternalOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange]
  );

  /**
   * Open the dropdown
   */
  const open = useCallback(() => {
    setOpen(true);
  }, [setOpen]);

  /**
   * Close the dropdown
   */
  const close = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  /**
   * Toggle the dropdown
   */
  const toggle = useCallback(() => {
    setOpen(!isOpen);
  }, [isOpen, setOpen]);

  /**
   * Update position based on trigger and dropdown elements
   */
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !dropdownRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();

    setTriggerWidth(triggerRect.width);

    const { position: newPosition, actualPlacement: newPlacement } =
      calculatePosition(triggerRect, dropdownRect, placement, offset);

    setPosition(newPosition);
    setActualPlacement(newPlacement);
  }, [placement, offset]);

  // Reset isPositioned when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setIsPositioned(false);
    }
  }, [isOpen]);

  // Update position when open or placement changes
  useEffect(() => {
    if (isOpen) {
      // Use double requestAnimationFrame to ensure dropdown is in DOM with dimensions
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updatePosition();
          setIsPositioned(true);
        });
      });
    }
  }, [isOpen, updatePosition]);

  // Handle scroll and resize
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollResize = () => {
      updatePosition();
    };

    // Listen for scroll on all scrollable ancestors
    window.addEventListener("scroll", handleScrollResize, true);
    window.addEventListener("resize", handleScrollResize);

    // ResizeObserver for trigger size changes
    let resizeObserver;
    if (triggerRef.current && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleScrollResize);
      resizeObserver.observe(triggerRef.current);
    }

    return () => {
      window.removeEventListener("scroll", handleScrollResize, true);
      window.removeEventListener("resize", handleScrollResize);
      resizeObserver?.disconnect();
    };
  }, [isOpen, updatePosition]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen || !closeOnClickOutside) return;

    const handleClickOutside = (event) => {
      const target = event.target;

      // Check if click is outside both trigger and dropdown
      const isOutsideTrigger =
        triggerRef.current && !triggerRef.current.contains(target);
      const isOutsideDropdown =
        dropdownRef.current && !dropdownRef.current.contains(target);

      if (isOutsideTrigger && isOutsideDropdown) {
        close();
      }
    };

    // Use mousedown to handle before focus changes
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen, closeOnClickOutside, close]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        // Return focus to trigger
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, closeOnEscape, close]);

  // Props to spread on trigger element
  const triggerProps = useMemo(
    () => ({
      ref: triggerRef,
      "aria-haspopup": "true",
      "aria-expanded": isOpen,
      "aria-controls": isOpen ? dropdownId.current : undefined,
      onClick: toggle,
    }),
    [isOpen, toggle]
  );

  // Props to spread on dropdown element
  const dropdownProps = useMemo(
    () => ({
      ref: dropdownRef,
      id: dropdownId.current,
      role: "menu",
      "aria-labelledby": triggerRef.current?.id,
      style: {
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        visibility: isPositioned ? "visible" : "hidden",
        ...(matchTriggerWidth && triggerWidth
          ? { width: `${triggerWidth}px` }
          : {}),
      },
    }),
    [position.x, position.y, isPositioned, matchTriggerWidth, triggerWidth]
  );

  return {
    isOpen,
    isPositioned,
    open,
    close,
    toggle,
    triggerRef,
    dropdownRef,
    triggerProps,
    dropdownProps,
    position,
    actualPlacement,
    triggerWidth,
    dropdownId: dropdownId.current,
  };
}

export default useDropdown;
