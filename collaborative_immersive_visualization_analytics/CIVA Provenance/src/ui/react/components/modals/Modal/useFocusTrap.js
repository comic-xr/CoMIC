/**
 * @file useFocusTrap.js
 * @description Custom hook for trapping focus within a container element.
 * Implements accessible focus management for modal dialogs following WAI-ARIA guidelines.
 *
 * Features:
 * - Stores the previously focused element when activated
 * - Queries all focusable elements within the container
 * - Handles Tab key navigation to cycle focus within the container
 * - Handles Shift+Tab for backwards focus cycling
 * - Provides a returnFocus function to restore focus to the original element
 * - Auto-focuses the first focusable element when activated
 *
 * @example
 * const containerRef = useRef(null);
 * const { returnFocus } = useFocusTrap(containerRef, isOpen);
 *
 * // When closing the modal:
 * const handleClose = () => {
 *   returnFocus();
 *   onClose();
 * };
 */

import { useEffect, useRef, useCallback } from "react";

/**
 * Selector string for all focusable elements within a container.
 * Excludes elements with tabindex="-1" as they are intentionally not tabbable.
 */
const FOCUSABLE_ELEMENTS_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Custom hook for focus trapping within a modal container.
 * Ensures keyboard navigation stays within the modal when it's active,
 * and restores focus to the trigger element when the modal closes.
 *
 * @param {React.RefObject<HTMLElement>} containerRef - Ref to the modal container element
 * @param {boolean} isActive - Whether the focus trap is currently active
 * @returns {{ returnFocus: () => void }} Object containing the returnFocus function
 */
export function useFocusTrap(containerRef, isActive) {
  // Store the element that was focused before the modal opened
  const previouslyFocusedElementRef = useRef(null);

  /**
   * Returns focus to the element that was focused before the modal opened.
   * Should be called when the modal is closing.
   */
  const returnFocus = useCallback(() => {
    if (
      previouslyFocusedElementRef.current &&
      typeof previouslyFocusedElementRef.current.focus === "function"
    ) {
      // Use setTimeout to ensure focus happens after any state updates
      setTimeout(() => {
        previouslyFocusedElementRef.current?.focus();
      }, 0);
    }
  }, []);

  /**
   * Gets all focusable elements within the container.
   * @returns {HTMLElement[]} Array of focusable elements
   */
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    const elements = containerRef.current.querySelectorAll(
      FOCUSABLE_ELEMENTS_SELECTOR
    );
    return Array.from(elements).filter((el) => {
      // Additional check: element must be visible
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    });
  }, [containerRef]);

  /**
   * Handles keydown events for focus trapping.
   * @param {KeyboardEvent} event - The keyboard event
   */
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      // Shift + Tab: Move backwards
      if (event.shiftKey) {
        if (
          activeElement === firstElement ||
          !containerRef.current?.contains(activeElement)
        ) {
          event.preventDefault();
          lastElement.focus();
        }
      }
      // Tab: Move forwards
      else {
        if (
          activeElement === lastElement ||
          !containerRef.current?.contains(activeElement)
        ) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [getFocusableElements, containerRef]
  );

  // Effect: Store previously focused element and set up focus trap when activated
  useEffect(() => {
    if (!isActive) return;

    // Store the currently focused element
    previouslyFocusedElementRef.current = document.activeElement;

    // Focus the first focusable element in the container
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        focusableElements[0].focus();
      });
    }

    // Add keydown listener for focus trapping
    const container = containerRef.current;
    if (container) {
      document.addEventListener("keydown", handleKeyDown);
    }

    // Cleanup: Remove event listener
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive, getFocusableElements, handleKeyDown, containerRef]);

  return { returnFocus };
}

export default useFocusTrap;
