/**
 * usePanelState - Manages panel open/peek/preview state with grace period
 *
 * Handles the state machine for overlay panels:
 * - Closed: Panel not visible
 * - Preview: Temporary panel shown on hover/dwell
 * - Pinned: Panel explicitly opened and stays open
 *
 * @module usePanelState
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';

/**
 * Hook for managing panel visibility state
 *
 * @param {string} side - 'left' or 'right'
 * @param {Object} options - Configuration options
 * @param {number} options.gracePeriod - Grace period before peek auto-closes (ms)
 * @returns {Object} Panel state and controls
 */
export function usePanelState(side, options = {}) {
    const { tokens } = useAdaptive();
    const gracePeriod = options.gracePeriod ?? tokens.peekGracePeriod ?? 400;

    // State
    const [activeTab, setActiveTabInternal] = useState(null);
    const [peekingTab, setPeekingTab] = useState(null);
    const [mouseInside, setMouseInside] = useState(false);
    const [inGracePeriod, setInGracePeriod] = useState(false);

    // Refs
    const graceTimeoutRef = useRef(null);

    // ==========================================================================
    // Derived State Helpers
    // ==========================================================================

    /**
     * Check if a panel should be visible
     * @param {string} tabId - Tab ID to check
     * @returns {boolean} Whether panel should show
     */
    const shouldShow = useCallback((tabId) => {
        if (activeTab === tabId) return true;
        if (peekingTab === tabId && !activeTab) return true;
        if (peekingTab === tabId && (mouseInside || inGracePeriod)) return true;
        return false;
    }, [activeTab, peekingTab, mouseInside, inGracePeriod]);

    /**
     * Check if panel is in preview (non-pinned) mode
     * @param {string} tabId - Tab ID to check
     * @returns {boolean} Whether panel is in preview mode
     */
    const isPreview = useCallback((tabId) => {
        return shouldShow(tabId) && activeTab !== tabId;
    }, [shouldShow, activeTab]);

    // ==========================================================================
    // Actions
    // ==========================================================================

    /**
     * Set active (pinned) tab - toggles if same tab clicked
     * @param {string|null} tabId - Tab ID to activate, or null to close
     */
    const setActiveTab = useCallback((tabId) => {
        // Toggle if same tab, otherwise switch
        setActiveTabInternal(prev => prev === tabId ? null : tabId);
        setPeekingTab(null);
        setMouseInside(false);
        setInGracePeriod(false);
        if (graceTimeoutRef.current) {
            clearTimeout(graceTimeoutRef.current);
            graceTimeoutRef.current = null;
        }
    }, []);

    /**
     * Start peeking a tab (hover preview)
     * @param {string} tabId - Tab ID to peek
     */
    const startPeek = useCallback((tabId) => {
        // Only start peek if no panel is pinned open
        if (!activeTab) {
            setPeekingTab(tabId);
        }
    }, [activeTab]);

    /**
     * End peeking - starts grace period before closing
     */
    const endPeek = useCallback(() => {
        // Start grace period before closing
        if (!activeTab && peekingTab && !mouseInside) {
            setInGracePeriod(true);
            graceTimeoutRef.current = setTimeout(() => {
                setInGracePeriod(false);
                setPeekingTab(null);
            }, gracePeriod);
        }
    }, [activeTab, peekingTab, mouseInside, gracePeriod]);

    /**
     * Pin current peek to active (convert preview to pinned)
     */
    const pinPeek = useCallback(() => {
        if (peekingTab) {
            setActiveTabInternal(peekingTab);
            setPeekingTab(null);
            setMouseInside(false);
            setInGracePeriod(false);
        }
    }, [peekingTab]);

    /**
     * Close panel (both pinned and preview)
     */
    const closePanel = useCallback(() => {
        setActiveTabInternal(null);
        setPeekingTab(null);
        setMouseInside(false);
        setInGracePeriod(false);
        if (graceTimeoutRef.current) {
            clearTimeout(graceTimeoutRef.current);
            graceTimeoutRef.current = null;
        }
    }, []);

    // ==========================================================================
    // Mouse Handlers
    // ==========================================================================

    /**
     * Call when mouse enters the panel
     */
    const onPanelMouseEnter = useCallback(() => {
        if (graceTimeoutRef.current) {
            clearTimeout(graceTimeoutRef.current);
            graceTimeoutRef.current = null;
        }
        setInGracePeriod(false);
        setMouseInside(true);
    }, []);

    /**
     * Call when mouse leaves the panel
     */
    const onPanelMouseLeave = useCallback(() => {
        setMouseInside(false);

        // Start grace period if in preview mode
        if (!activeTab && peekingTab) {
            setInGracePeriod(true);
            graceTimeoutRef.current = setTimeout(() => {
                setInGracePeriod(false);
                setPeekingTab(null);
            }, gracePeriod);
        }
    }, [activeTab, peekingTab, gracePeriod]);

    // ==========================================================================
    // Cleanup
    // ==========================================================================

    useEffect(() => {
        return () => {
            if (graceTimeoutRef.current) {
                clearTimeout(graceTimeoutRef.current);
            }
        };
    }, []);

    return {
        /** Currently pinned (open) tab ID, or null */
        activeTab,
        /** Currently peeking tab ID, or null */
        peekingTab,
        /** Check if panel should be visible: shouldShow(tabId) */
        shouldShow,
        /** Check if panel is in preview mode: isPreview(tabId) */
        isPreview,
        /** Set active tab (toggle/switch): setActiveTab(tabId) */
        setActiveTab,
        /** Start peeking: startPeek(tabId) */
        startPeek,
        /** End peeking (with grace period): endPeek() */
        endPeek,
        /** Pin current peek to active: pinPeek() */
        pinPeek,
        /** Close panel: closePanel() */
        closePanel,
        /** Mouse entered panel handler */
        onPanelMouseEnter,
        /** Mouse left panel handler */
        onPanelMouseLeave,
    };
}

export default usePanelState;
