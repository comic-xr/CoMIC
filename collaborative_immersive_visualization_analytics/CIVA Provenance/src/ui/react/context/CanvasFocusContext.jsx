// src/ui/react/context/CanvasFocusContext.jsx
// Context provider for canvas/pane-scoped state management in tile mode
//
// Problem: In tile mode, multiple canvases are visible simultaneously.
// Each pane (viewport into a canvas) should have its own:
// - Active instance
// - Focus state
// - Navigation event handling
//
// Solution: CanvasFocusProvider wraps each pane and provides scoped state.
// Components inside can use useCanvasFocus() to get pane-specific context.

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useMemo,
    useRef,
} from 'react';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { ui as log } from '@Utils/logger.js';

// =============================================================================
// CONTEXT
// =============================================================================

const CanvasFocusContext = createContext(null);

/**
 * Generate a unique pane ID
 * Combines canvasId with an optional viewport index for multi-viewport support
 *
 * @param {string} canvasId - The canvas ID
 * @param {number} [viewportIndex] - Optional viewport index (for multiple viewports of same canvas)
 * @returns {string} Unique pane ID
 */
export function generatePaneId(canvasId, viewportIndex = 0) {
    if (viewportIndex === 0) {
        return canvasId; // Backward compatible - single viewport uses just canvasId
    }
    return `${canvasId}:viewport-${viewportIndex}`;
}

/**
 * CanvasFocusProvider - Provides canvas/pane-scoped state to children
 *
 * Wrap each tile pane with this provider to enable:
 * - Per-pane active instance tracking
 * - Focus state management
 * - Scoped navigation event handling
 *
 * Usage:
 * ```jsx
 * <CanvasFocusProvider
 *   canvasId={workspace.activeCanvasId}
 *   paneId={paneId}
 *   isFocused={isActivePane}
 * >
 *   <CanvasPanel ... />
 * </CanvasFocusProvider>
 * ```
 *
 * @param {Object} props
 * @param {string} props.canvasId - The canvas ID this pane displays
 * @param {string} [props.paneId] - Unique pane ID (defaults to canvasId)
 * @param {boolean} props.isFocused - Whether this pane has focus
 * @param {React.ReactNode} props.children - Child components
 */
export function CanvasFocusProvider({
    children,
    canvasId,
    paneId: propPaneId,
    isFocused = false,
}) {
    // Use provided paneId or fall back to canvasId
    const paneId = propPaneId || canvasId;

    // Track active instance for this pane
    const [activeInstanceId, setActiveInstanceIdState] = useState(() => {
        return workspaceManager.getActiveInstanceForPane(paneId)?.instanceId || null;
    });

    // Ref to track if we're the one who triggered the focus
    const selfTriggeredRef = useRef(false);

    // Sync with workspaceManager when focus changes
    useEffect(() => {
        if (isFocused && paneId) {
            workspaceManager.setFocusedPane(paneId);
            canvasManager.setFocusedPane(paneId);
        }
    }, [isFocused, paneId]);

    // Listen for workspaceManager changes
    useEffect(() => {
        const updateFromManager = () => {
            const instance = workspaceManager.getActiveInstanceForPane(paneId);
            setActiveInstanceIdState(instance?.instanceId || null);
        };

        const unsubscribe = workspaceManager.subscribe(updateFromManager);
        return unsubscribe;
    }, [paneId]);

    // Listen for pane focus changes from other sources
    useEffect(() => {
        const handlePaneFocusChanged = (e) => {
            if (selfTriggeredRef.current) {
                selfTriggeredRef.current = false;
                return;
            }
            // Update our local state if needed
            const instance = workspaceManager.getActiveInstanceForPane(paneId);
            setActiveInstanceIdState(instance?.instanceId || null);
        };

        window.addEventListener('cia:pane-focus-changed', handlePaneFocusChanged);
        return () => {
            window.removeEventListener('cia:pane-focus-changed', handlePaneFocusChanged);
        };
    }, [paneId]);

    /**
     * Set the active instance for THIS pane
     * This is the scoped version - affects only this pane
     */
    const setActiveInstance = useCallback(
        (instanceId) => {
            if (!paneId) {
                log.warn('CanvasFocusContext: Cannot set active instance without paneId');
                return;
            }

            // DEBUG: Log instance focus changes with full context
            console.log(`[CanvasFocusContext] setActiveInstance called:`, {
                paneId,
                canvasId,
                instanceId,
                isFocused,
                stack: new Error().stack?.split('\n').slice(2, 5).join(' <- '),
            });

            log.debug(`CanvasFocusContext: Setting active instance for pane ${paneId}: ${instanceId}`);

            // Update workspaceManager (source of truth)
            workspaceManager.setActiveInstanceForPane(paneId, instanceId);

            // Also update global active instance if this pane is focused
            if (isFocused) {
                workspaceManager.setActiveInstance(instanceId);
            }

            // Update local state
            setActiveInstanceIdState(instanceId);

            // Dispatch event for other components
            window.dispatchEvent(
                new CustomEvent('cia:instance-focused', {
                    detail: {
                        instanceId,
                        paneId,
                        canvasId,
                        viewId: workspaceManager.getInstance(instanceId)?.viewConfigId,
                        source: 'CanvasFocusContext',
                    },
                })
            );
        },
        [paneId, canvasId, isFocused]
    );

    /**
     * Get the active instance object for this pane
     */
    const activeInstance = useMemo(() => {
        if (!activeInstanceId) return null;
        return workspaceManager.getInstance(activeInstanceId);
    }, [activeInstanceId]);

    /**
     * Focus this pane (request focus from parent)
     * This should be called when user interacts with the pane
     */
    const requestFocus = useCallback(() => {
        if (!paneId) return;

        selfTriggeredRef.current = true;
        workspaceManager.setFocusedPane(paneId);
        canvasManager.setFocusedPane(paneId);

        // Dispatch focus request event for parent to handle
        window.dispatchEvent(
            new CustomEvent('cia:pane-focus-requested', {
                detail: { paneId, canvasId },
            })
        );
    }, [paneId, canvasId]);

    // Build context value
    const contextValue = useMemo(
        () => ({
            // Identity
            paneId,
            canvasId,

            // Focus state
            isFocused,
            requestFocus,

            // Active instance (scoped to this pane)
            activeInstanceId,
            activeInstance,
            setActiveInstance,

            // Convenience getters
            hasActiveInstance: !!activeInstanceId,
        }),
        [
            paneId,
            canvasId,
            isFocused,
            requestFocus,
            activeInstanceId,
            activeInstance,
            setActiveInstance,
        ]
    );

    return (
        <CanvasFocusContext.Provider value={contextValue}>
            {children}
        </CanvasFocusContext.Provider>
    );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * useCanvasFocus - Access canvas/pane focus context
 *
 * Returns:
 * - paneId: Unique identifier for this pane
 * - canvasId: The canvas this pane displays
 * - isFocused: Whether this pane has focus
 * - requestFocus: Function to request focus for this pane
 * - activeInstanceId: Active instance ID for this pane
 * - activeInstance: Active instance object for this pane
 * - setActiveInstance: Function to set active instance for this pane
 * - hasActiveInstance: Boolean indicating if pane has an active instance
 *
 * @returns {Object|null} Context value or null if not within provider
 */
export function useCanvasFocus() {
    return useContext(CanvasFocusContext);
}

/**
 * useCanvasFocusRequired - Same as useCanvasFocus but throws if not in provider
 *
 * Use this when the component MUST be within a CanvasFocusProvider
 */
export function useCanvasFocusRequired() {
    const context = useContext(CanvasFocusContext);
    if (!context) {
        throw new Error('useCanvasFocusRequired must be used within CanvasFocusProvider');
    }
    return context;
}

/**
 * useScopedActiveInstance - Get the active instance with automatic scoping
 *
 * When inside CanvasFocusProvider, returns pane-scoped active instance.
 * When outside, falls back to global active instance.
 *
 * This allows components to work in both single-canvas and tile modes.
 *
 * @returns {Object} { activeInstanceId, activeInstance, setActiveInstance }
 */
export function useScopedActiveInstance() {
    const canvasFocus = useCanvasFocus();

    // If inside CanvasFocusProvider, use scoped state
    if (canvasFocus) {
        return {
            activeInstanceId: canvasFocus.activeInstanceId,
            activeInstance: canvasFocus.activeInstance,
            setActiveInstance: canvasFocus.setActiveInstance,
            isScopedToPane: true,
            paneId: canvasFocus.paneId,
        };
    }

    // Fallback to global state
    const [activeInstanceId, setActiveInstanceIdState] = useState(() => {
        return workspaceManager.activeInstanceId;
    });

    useEffect(() => {
        const update = () => {
            setActiveInstanceIdState(workspaceManager.activeInstanceId);
        };
        const unsub = workspaceManager.subscribe(update);
        return unsub;
    }, []);

    const setActiveInstance = useCallback((instanceId) => {
        workspaceManager.setActiveInstance(instanceId);
    }, []);

    const activeInstance = useMemo(() => {
        return activeInstanceId ? workspaceManager.getInstance(activeInstanceId) : null;
    }, [activeInstanceId]);

    return {
        activeInstanceId,
        activeInstance,
        setActiveInstance,
        isScopedToPane: false,
        paneId: null,
    };
}

/**
 * useIsPaneFocused - Check if a specific pane has focus
 *
 * @param {string} paneId - Pane ID to check
 * @returns {boolean} Whether the pane is focused
 */
export function useIsPaneFocused(paneId) {
    const [isFocused, setIsFocused] = useState(() => {
        return workspaceManager.getFocusedPaneId() === paneId;
    });

    useEffect(() => {
        const handleFocusChange = () => {
            setIsFocused(workspaceManager.getFocusedPaneId() === paneId);
        };

        window.addEventListener('cia:pane-focus-changed', handleFocusChange);
        const unsub = workspaceManager.subscribe(handleFocusChange);

        return () => {
            window.removeEventListener('cia:pane-focus-changed', handleFocusChange);
            unsub?.();
        };
    }, [paneId]);

    return isFocused;
}

export default CanvasFocusContext;
