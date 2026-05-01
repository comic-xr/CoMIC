// src/ui/react/hooks/useViewStack.js
// View stack navigation for canvas (Grid → Focus → Subset)
//
// Provides stack-based navigation with back/forward/home support.
// Manages view transitions with CSS animations.

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// =============================================================================
// VIEW TYPES
// =============================================================================

export const VIEW_TYPES = {
    GRID: 'grid',       // Main canvas grid view
    FOCUS: 'focus',     // Single view focused (fills canvas)
    SUBSET: 'subset',   // Subset view (2x2 or 3x3 of subset views)
};

// =============================================================================
// CONTEXT
// =============================================================================

const ViewStackContext = createContext(null);

// =============================================================================
// PROVIDER
// =============================================================================

/**
 * ViewStackProvider - Manages navigation stack for canvas views
 *
 * Navigation model:
 * - Grid View (default)
 *   ├── Double-click cell → Focus View
 *   │   └── Back → Grid View
 *   └── Double-click subset → Subset View
 *       ├── Double-click cell → Focus View
 *       │   └── Back → Subset View
 *       └── Back → Grid View
 */
export function ViewStackProvider({ children }) {
    // Stack of views: [{ type, data, label }]
    // Always starts with grid view at index 0
    const [viewStack, setViewStack] = useState([
        { type: VIEW_TYPES.GRID, data: null, label: 'Canvas' }
    ]);

    // Current position in stack (for back/forward)
    const [currentIndex, setCurrentIndex] = useState(0);

    // Animation state for transitions
    const [transition, setTransition] = useState(null); // { direction: 'in'|'out', from?, to? }

    // Current view (derived)
    const currentView = useMemo(() => viewStack[currentIndex], [viewStack, currentIndex]);

    // Navigation state
    const canGoBack = currentIndex > 0;
    const canGoForward = currentIndex < viewStack.length - 1;
    const isAtRoot = currentIndex === 0;

    // Breadcrumb trail (all items from root to current)
    const breadcrumbs = useMemo(() =>
        viewStack.slice(0, currentIndex + 1).map((view, index) => ({
            ...view,
            index,
            isActive: index === currentIndex,
        })),
        [viewStack, currentIndex]
    );

    // ==========================================================================
    // NAVIGATION METHODS
    // ==========================================================================

    /**
     * Push a new view onto the stack
     * Clears any forward history (like browser navigation)
     */
    const pushView = useCallback((type, data = null, label = null) => {
        // Generate label if not provided
        const viewLabel = label || (
            type === VIEW_TYPES.FOCUS ? (data?.name || 'View') :
            type === VIEW_TYPES.SUBSET ? (data?.name || 'Subset') :
            'Canvas'
        );

        const newView = { type, data, label: viewLabel };

        // Trigger transition animation
        setTransition({ direction: 'in', type });

        // Clear forward history and push new view
        setViewStack(prev => [...prev.slice(0, currentIndex + 1), newView]);
        setCurrentIndex(prev => prev + 1);

        // Clear transition after animation
        setTimeout(() => setTransition(null), 300);
    }, [currentIndex]);

    /**
     * Go back one step (Escape key behavior)
     * If at root, just deselects any active cell (caller handles this)
     */
    const goBack = useCallback(() => {
        if (!canGoBack) return false;

        setTransition({ direction: 'out' });
        setCurrentIndex(prev => prev - 1);

        setTimeout(() => setTransition(null), 250);
        return true;
    }, [canGoBack]);

    /**
     * Go forward one step (if available)
     */
    const goForward = useCallback(() => {
        if (!canGoForward) return false;

        setTransition({ direction: 'in' });
        setCurrentIndex(prev => prev + 1);

        setTimeout(() => setTransition(null), 250);
        return true;
    }, [canGoForward]);

    /**
     * Go directly to root (Home button)
     */
    const goHome = useCallback(() => {
        if (isAtRoot) return false;

        setTransition({ direction: 'out' });
        setCurrentIndex(0);

        setTimeout(() => setTransition(null), 250);
        return true;
    }, [isAtRoot]);

    /**
     * Navigate to a specific index in the breadcrumb
     */
    const goToIndex = useCallback((index) => {
        if (index < 0 || index >= viewStack.length || index === currentIndex) {
            return false;
        }

        const direction = index > currentIndex ? 'in' : 'out';
        setTransition({ direction });
        setCurrentIndex(index);

        setTimeout(() => setTransition(null), 250);
        return true;
    }, [viewStack.length, currentIndex]);

    /**
     * Replace current view (without adding to stack)
     */
    const replaceView = useCallback((type, data = null, label = null) => {
        const viewLabel = label || (
            type === VIEW_TYPES.FOCUS ? (data?.name || 'View') :
            type === VIEW_TYPES.SUBSET ? (data?.name || 'Subset') :
            'Canvas'
        );

        const newView = { type, data, label: viewLabel };

        setViewStack(prev => [
            ...prev.slice(0, currentIndex),
            newView,
            ...prev.slice(currentIndex + 1)
        ]);
    }, [currentIndex]);

    /**
     * Reset stack to just the root grid view
     */
    const resetStack = useCallback(() => {
        setViewStack([{ type: VIEW_TYPES.GRID, data: null, label: 'Canvas' }]);
        setCurrentIndex(0);
        setTransition(null);
    }, []);

    // ==========================================================================
    // HELPER METHODS
    // ==========================================================================

    /**
     * Focus on a view (push focus view)
     */
    const focusView = useCallback((viewConfig) => {
        pushView(VIEW_TYPES.FOCUS, viewConfig, viewConfig?.name);
    }, [pushView]);

    /**
     * Open a subset (push subset view)
     */
    const openSubset = useCallback((subsetConfig) => {
        pushView(VIEW_TYPES.SUBSET, subsetConfig, subsetConfig?.name);
    }, [pushView]);

    // ==========================================================================
    // CONTEXT VALUE
    // ==========================================================================

    const value = useMemo(() => ({
        // Current state
        currentView,
        currentIndex,
        viewStack,
        breadcrumbs,
        transition,

        // Navigation state
        canGoBack,
        canGoForward,
        isAtRoot,
        depth: currentIndex,

        // View type checks
        isGridView: currentView?.type === VIEW_TYPES.GRID,
        isFocusView: currentView?.type === VIEW_TYPES.FOCUS,
        isSubsetView: currentView?.type === VIEW_TYPES.SUBSET,

        // Navigation methods
        pushView,
        goBack,
        goForward,
        goHome,
        goToIndex,
        replaceView,
        resetStack,

        // Helper methods
        focusView,
        openSubset,
    }), [
        currentView, currentIndex, viewStack, breadcrumbs, transition,
        canGoBack, canGoForward, isAtRoot,
        pushView, goBack, goForward, goHome, goToIndex, replaceView, resetStack,
        focusView, openSubset,
    ]);

    return (
        <ViewStackContext.Provider value={value}>
            {children}
        </ViewStackContext.Provider>
    );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * useViewStack - Access view stack navigation
 * Must be used within ViewStackProvider
 */
export function useViewStack() {
    const context = useContext(ViewStackContext);
    if (!context) {
        throw new Error('useViewStack must be used within ViewStackProvider');
    }
    return context;
}

export default useViewStack;
