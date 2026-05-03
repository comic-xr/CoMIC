// src/ui/react/hooks/useSmartDropdownPosition.js
// Hook to intelligently position dropdowns within viewport

import { useEffect, useRef, useState } from "react";

/**
 * useSmartDropdownPosition
 *
 * Automatically positions dropdown menus to stay within viewport.
 * Detects overflow and adjusts position accordingly.
 *
 * USAGE:
 * const { dropdownRef, positionClasses } = useSmartDropdownPosition(isOpen);
 *
 * <div className={`toolbar-menu-dropdown ${positionClasses}`} ref={dropdownRef}>
 *   {options}
 * </div>
 */
export function useSmartDropdownPosition(isOpen, options = {}) {
  const dropdownRef = useRef(null);
  const [positionClasses, setPositionClasses] = useState("");

  const {
    offsetY = 4, // Gap between button and dropdown
    offsetX = 0, // Horizontal offset
    edgePadding = 10, // Minimum distance from viewport edge
    preferredPosition = "bottom", // 'bottom' | 'top'
  } = options;

  useEffect(() => {
    if (!isOpen || !dropdownRef.current) {
      return;
    }

    const calculatePosition = () => {
      const dropdown = dropdownRef.current;
      const button = dropdown.parentElement.querySelector(".toolbar-icon-btn");

      if (!button) return;

      const dropdownRect = dropdown.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      let classes = [];

      // =====================================================================
      // VERTICAL POSITIONING: Check if dropdown fits below button
      // =====================================================================
      const spaceBelow = viewportHeight - buttonRect.bottom - offsetY;
      const spaceAbove = buttonRect.top - offsetY;

      const shouldPositionAbove =
        preferredPosition === "top"
          ? spaceAbove >= dropdownRect.height || spaceAbove > spaceBelow
          : spaceBelow < dropdownRect.height && spaceAbove > spaceBelow;

      if (shouldPositionAbove) {
        classes.push("position-top");
      }

      // =====================================================================
      // HORIZONTAL POSITIONING: Check if dropdown fits within viewport
      // =====================================================================
      const spaceRight = viewportWidth - buttonRect.left;
      const willOverflowRight =
        buttonRect.left + dropdownRect.width > viewportWidth - edgePadding;

      if (willOverflowRight && spaceRight < dropdownRect.width) {
        // Position from right edge instead
        classes.push("position-right");
      }

      setPositionClasses(classes.join(" "));
    };

    // Calculate position on mount and when window resizes
    calculatePosition();

    const handleResize = () => {
      calculatePosition();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true); // Capture scroll in ancestors

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isOpen, offsetY, offsetX, edgePadding, preferredPosition]);

  return { dropdownRef, positionClasses };
}

/**
 * Example integration into InstanceViewport.jsx:
 *
 * function InstanceViewport() {
 *   const [openMenuId, setOpenMenuId] = useState(null);
 *
 *   const renderTool = (tool, index) => {
 *     if (tool.type === 'menu') {
 *       const isOpen = openMenuId === tool.id;
 *       const { dropdownRef, positionClasses } = useSmartDropdownPosition(isOpen);
 *
 *       return (
 *         <div
 *           key={tool.id}
 *           className="toolbar-menu"
 *           onMouseEnter={() => setOpenMenuId(tool.id)}
 *           onMouseLeave={() => setOpenMenuId(null)}
 *         >
 *           <button className="toolbar-icon-btn">
 *             <Icon />
 *           </button>
 *
 *           {isOpen && (
 *             <div
 *               ref={dropdownRef}
 *               className={`toolbar-menu-dropdown ${positionClasses}`}
 *             >
 *               {tool.options.map(renderOption)}
 *             </div>
 *           )}
 *         </div>
 *       );
 *     }
 *     // ... other tool types
 *   };
 * }
 */

/**
 * Alternative: Portal-based positioning (more robust for complex cases)
 * Use when dropdowns need to escape overflow:hidden containers
 */
export function usePortalDropdownPosition(triggerRef, isOpen, options = {}) {
  const [position, setPosition] = useState({ x: 0, y: 0, placement: "bottom" });

  const { offsetY = 4, offsetX = 0, edgePadding = 10 } = options;

  useEffect(() => {
    if (!isOpen || !triggerRef.current) {
      return;
    }

    const calculatePosition = () => {
      const trigger = triggerRef.current;
      const rect = trigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Estimate dropdown dimensions (will need adjustment based on content)
      const estimatedDropdownHeight = 300;
      const estimatedDropdownWidth = 220;

      let x = rect.left + offsetX;
      let y = rect.bottom + offsetY;
      let placement = "bottom";

      // Check vertical overflow
      if (y + estimatedDropdownHeight > viewportHeight - edgePadding) {
        // Try positioning above
        const yAbove = rect.top - estimatedDropdownHeight - offsetY;
        if (yAbove >= edgePadding) {
          y = yAbove;
          placement = "top";
        } else {
          // Clamp to viewport
          y = Math.max(
            edgePadding,
            Math.min(y, viewportHeight - estimatedDropdownHeight - edgePadding)
          );
        }
      }

      // Check horizontal overflow
      if (x + estimatedDropdownWidth > viewportWidth - edgePadding) {
        x = Math.max(
          edgePadding,
          viewportWidth - estimatedDropdownWidth - edgePadding
        );
      }

      setPosition({ x, y, placement });
    };

    calculatePosition();
    window.addEventListener("resize", calculatePosition);
    window.addEventListener("scroll", calculatePosition, true);

    return () => {
      window.removeEventListener("resize", calculatePosition);
      window.removeEventListener("scroll", calculatePosition, true);
    };
  }, [isOpen, triggerRef, offsetY, offsetX, edgePadding]);

  return position;
}