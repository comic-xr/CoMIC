/**
 * useFocusMode - Manages focus mode state and panel restoration
 *
 * Focus mode collapses all panels to maximize canvas space.
 * When exiting focus mode, panels are restored to their previous state.
 *
 * Triggers:
 * - F key: Toggle focus mode
 * - Double-click cell: Enter focus mode + focus cell
 * - Esc: Exit focused cell, then exit focus mode
 *
 * @module useFocusMode
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for managing focus mode
 *
 * @param {Object} leftPanelState - State from usePanelState('left')
 * @param {Object} rightPanelState - State from usePanelState('right')
 * @returns {Object} Focus mode state and controls
 */
export function useFocusMode(leftPanelState, rightPanelState) {
    const [focusMode, setFocusMode] = useState(false);
    const [focusedCell, setFocusedCell] = useState(null);

    // Store panel state before entering focus mode
    const preFocusStateRef = useRef({ left: null, right: null });

    // ==========================================================================
    // Actions
    // ==========================================================================

    /**
     * Enter focus mode - collapses all panels
     * @param {string|null} cellId - Optional cell ID to focus
     */
    const enterFocusMode = useCallback((cellId = null) => {
        // Save current panel state
        preFocusStateRef.current = {
            left: leftPanelState.activeTab,
            right: rightPanelState.activeTab,
        };

        // Collapse panels
        leftPanelState.closePanel();
        rightPanelState.closePanel();

        // Enter focus mode
        setFocusMode(true);
        if (cellId) {
            setFocusedCell(cellId);
        }
    }, [leftPanelState, rightPanelState]);

    /**
     * Exit focus mode - restores panel state
     */
    const exitFocusMode = useCallback(() => {
        // Restore panel state
        const { left, right } = preFocusStateRef.current;

        if (left) {
            leftPanelState.setActiveTab(left);
        }
        if (right) {
            rightPanelState.setActiveTab(right);
        }

        // Exit focus mode
        setFocusMode(false);
        setFocusedCell(null);
    }, [leftPanelState, rightPanelState]);

    /**
     * Toggle focus mode
     */
    const toggleFocusMode = useCallback(() => {
        if (focusMode) {
            exitFocusMode();
        } else {
            enterFocusMode();
        }
    }, [focusMode, enterFocusMode, exitFocusMode]);

    /**
     * Focus a specific cell (enters focus mode if not already in it)
     * @param {string} cellId - Cell ID to focus
     */
    const focusCell = useCallback((cellId) => {
        if (!focusMode) {
            enterFocusMode(cellId);
        } else {
            setFocusedCell(cellId);
        }
    }, [focusMode, enterFocusMode]);

    /**
     * Exit focused cell (stay in focus mode)
     */
    const exitCell = useCallback(() => {
        setFocusedCell(null);
        // Stay in focus mode, just unfocus the cell
    }, []);

    // ==========================================================================
    // Keyboard Shortcuts
    // ==========================================================================

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Don't handle if typing in input
            if (e.target.closest('input, textarea, [contenteditable="true"]')) {
                return;
            }

            // F key toggles focus mode
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                toggleFocusMode();
            }

            // Escape exits focus
            if (e.key === 'Escape') {
                if (focusedCell) {
                    // First, exit focused cell
                    exitCell();
                } else if (focusMode) {
                    // Then, exit focus mode
                    exitFocusMode();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [focusMode, focusedCell, toggleFocusMode, exitFocusMode, exitCell]);

    return {
        /** Whether focus mode is active */
        focusMode,
        /** Currently focused cell ID, or null */
        focusedCell,
        /** Enter focus mode: enterFocusMode(cellId?) */
        enterFocusMode,
        /** Exit focus mode (restores panels): exitFocusMode() */
        exitFocusMode,
        /** Toggle focus mode: toggleFocusMode() */
        toggleFocusMode,
        /** Focus a specific cell: focusCell(cellId) */
        focusCell,
        /** Exit focused cell (stay in focus mode): exitCell() */
        exitCell,
    };
}

export default useFocusMode;
