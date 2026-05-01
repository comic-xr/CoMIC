/**
 * @file useModal.js
 * @description Custom hook for managing modal open/close state.
 * Provides a simple, reusable interface for controlling modal visibility.
 *
 * Features:
 * - Tracks open/closed state with optional default value
 * - Provides open, close, and toggle functions
 * - All functions are memoized to prevent unnecessary re-renders
 *
 * @example
 * function MyComponent() {
 *   const { isOpen, open, close, toggle } = useModal();
 *
 *   return (
 *     <>
 *       <button onClick={open}>Open Modal</button>
 *       <Modal isOpen={isOpen} onClose={close}>
 *         <p>Modal content</p>
 *       </Modal>
 *     </>
 *   );
 * }
 *
 * @example
 * // With default open state
 * const { isOpen, close } = useModal(true);
 */

import { useState, useCallback } from "react";

/**
 * Hook for managing modal open/close state.
 *
 * @param {boolean} [defaultOpen=false] - Initial open state of the modal
 * @returns {{
 *   isOpen: boolean,
 *   open: () => void,
 *   close: () => void,
 *   toggle: () => void
 * }} Object containing modal state and control functions
 */
export function useModal(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  /**
   * Opens the modal.
   * Memoized to prevent unnecessary re-renders of child components.
   */
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  /**
   * Closes the modal.
   * Memoized to prevent unnecessary re-renders of child components.
   */
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * Toggles the modal between open and closed states.
   * Memoized to prevent unnecessary re-renders of child components.
   */
  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

export default useModal;
