/**
 * VR Interaction Context
 *
 * Manages cross-platform interaction state for VR and desktop.
 * Abstracts drag-and-drop into "intents" that work with VR tap-to-select.
 *
 * @module VRInteractionContext
 */

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useMemo,
} from 'react';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Interaction intents - what the user is trying to do
 */
export const INTERACTION_INTENTS = {
    LINK: 'link',           // Connect two items
    REORDER: 'reorder',     // Change order in a list
    MOVE: 'move',           // Reposition an element
    RESIZE: 'resize',       // Change size of an element
    TRANSFER: 'transfer',   // Move item between containers
    SELECT_REGION: 'select_region', // Select multiple items
    PAN: 'pan',             // Pan/scroll the view
    FILE_DROP: 'file_drop', // Import files
};

/**
 * Input modes available
 */
export const INPUT_MODES = {
    DESKTOP: 'desktop',
    VR_CONTROLLER: 'vr_controller',
    VR_HAND: 'vr_hand',
    TOUCH: 'touch',
};

/**
 * VR controller button mapping (Meta Quest standard)
 */
export const VR_CONTROLLER_MAPPING = {
    right: {
        trigger: 'select',
        grip: 'grab',
        a: 'confirm',
        b: 'cancel',
        thumbstick: 'navigate',
        thumbstickPress: 'contextMenu',
    },
    left: {
        trigger: 'selectSecondary',
        grip: 'grabSecondary',
        x: 'toggleMenu',
        y: 'home',
        thumbstick: 'move',
        thumbstickPress: 'recenter',
    },
};

// =============================================================================
// CONTEXT
// =============================================================================

const VRInteractionContext = createContext(null);

/**
 * VRInteractionProvider - Manages cross-platform interaction state
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function VRInteractionProvider({ children }) {
    // Current input mode
    const [inputMode, setInputMode] = useState(INPUT_MODES.DESKTOP);

    // Active interaction state
    const [activeInteraction, setActiveInteraction] = useState(null);
    // Shape: { intent, source, sourceData, step, startTime, targetId? }

    // Selection state for two-step interactions
    const [selection, setSelection] = useState(null);
    // Shape: { type, id, data }

    // Detect input mode on mount
    useEffect(() => {
        const detectInputMode = () => {
            // Check for touch
            if ('ontouchstart' in window && window.matchMedia('(pointer: coarse)').matches) {
                setInputMode(INPUT_MODES.TOUCH);
                return;
            }
            setInputMode(INPUT_MODES.DESKTOP);
        };

        detectInputMode();
    }, []);

    // Start an interaction
    const startInteraction = useCallback((intent, source, sourceData) => {
        setActiveInteraction({
            intent,
            source,
            sourceData,
            step: 1,
            startTime: Date.now(),
        });
    }, []);

    // End an interaction
    const endInteraction = useCallback(() => {
        setActiveInteraction(null);
    }, []);

    // Advance interaction step
    const advanceInteraction = useCallback((step, additionalData = {}) => {
        setActiveInteraction(prev => prev ? {
            ...prev,
            ...additionalData,
            step,
        } : null);
    }, []);

    // Select an item (for two-step operations)
    const select = useCallback((type, id, data) => {
        setSelection({ type, id, data });
    }, []);

    // Clear selection
    const clearSelection = useCallback(() => {
        setSelection(null);
    }, []);

    // Set VR mode (called by XR session manager)
    const setVRMode = useCallback((isVR, hasControllers = true) => {
        if (isVR) {
            setInputMode(hasControllers ? INPUT_MODES.VR_CONTROLLER : INPUT_MODES.VR_HAND);
        } else {
            setInputMode(INPUT_MODES.DESKTOP);
        }
    }, []);

    // Computed values
    const isVR = inputMode === INPUT_MODES.VR_CONTROLLER || inputMode === INPUT_MODES.VR_HAND;
    const isTouch = inputMode === INPUT_MODES.TOUCH;

    const contextValue = useMemo(() => ({
        inputMode,
        isVR,
        isTouch,
        setVRMode,
        activeInteraction,
        startInteraction,
        endInteraction,
        advanceInteraction,
        selection,
        select,
        clearSelection,
    }), [
        inputMode,
        isVR,
        isTouch,
        setVRMode,
        activeInteraction,
        startInteraction,
        endInteraction,
        advanceInteraction,
        selection,
        select,
        clearSelection,
    ]);

    return (
        <VRInteractionContext.Provider value={contextValue}>
            {children}
        </VRInteractionContext.Provider>
    );
}

/**
 * useVRInteraction - Access VR interaction context
 */
export function useVRInteraction() {
    const context = useContext(VRInteractionContext);
    if (!context) {
        throw new Error('useVRInteraction must be used within VRInteractionProvider');
    }
    return context;
}

// =============================================================================
// PLATFORM-ADAPTIVE HOOKS
// =============================================================================

/**
 * useLinkInteraction - Unified hook for linking views
 *
 * Desktop: Drag badge → Drop on target
 * VR: Select source → Select target → Confirm
 *
 * @param {Object} options
 * @param {Function} options.onLink - Called when link is created
 * @param {Function} options.onCancel - Called when link is cancelled
 */
export function useLinkInteraction({ onLink, onCancel }) {
    const {
        inputMode,
        isVR,
        activeInteraction,
        startInteraction,
        endInteraction,
        advanceInteraction,
    } = useVRInteraction();

    const isLinking = activeInteraction?.intent === INTERACTION_INTENTS.LINK;
    const linkSource = isLinking ? activeInteraction.sourceData : null;
    const linkStep = isLinking ? activeInteraction.step : 0;

    // Desktop: Drag handlers
    const createDesktopSourceHandlers = useCallback((sourceId, sourceData) => ({
        draggable: true,
        onDragStart: (e) => {
            e.dataTransfer.setData('application/x-cia-link', JSON.stringify({ sourceId, ...sourceData }));
            e.dataTransfer.effectAllowed = 'link';
            startInteraction(INTERACTION_INTENTS.LINK, sourceId, { sourceId, ...sourceData });
        },
        onDragEnd: () => {
            endInteraction();
        },
    }), [startInteraction, endInteraction]);

    const createDesktopTargetHandlers = useCallback((targetId, canAccept) => ({
        onDragOver: (e) => {
            if (canAccept && canAccept(linkSource)) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'link';
            }
        },
        onDrop: (e) => {
            e.preventDefault();
            if (canAccept && canAccept(linkSource)) {
                onLink?.(linkSource?.sourceId, targetId);
            }
            endInteraction();
        },
    }), [linkSource, onLink, endInteraction]);

    // VR/Touch: Two-step select handlers
    const createVRSourceHandlers = useCallback((sourceId, sourceData) => ({
        onClick: () => {
            if (!isLinking) {
                startInteraction(INTERACTION_INTENTS.LINK, sourceId, { sourceId, ...sourceData });
            } else if (linkSource?.sourceId === sourceId) {
                endInteraction();
                onCancel?.();
            }
        },
        'data-link-source': true,
        'data-link-active': linkSource?.sourceId === sourceId,
    }), [isLinking, linkSource, startInteraction, endInteraction, onCancel]);

    const createVRTargetHandlers = useCallback((targetId, canAccept) => ({
        onClick: () => {
            if (isLinking && linkStep === 1) {
                if (canAccept && canAccept(linkSource) && targetId !== linkSource?.sourceId) {
                    advanceInteraction(2, { targetId });
                    onLink?.(linkSource?.sourceId, targetId);
                    endInteraction();
                }
            }
        },
        'data-link-target': true,
        'data-link-valid': isLinking && canAccept?.(linkSource) && targetId !== linkSource?.sourceId,
    }), [isLinking, linkStep, linkSource, advanceInteraction, onLink, endInteraction]);

    // Return platform-appropriate handlers
    const createSourceHandlers = isVR ? createVRSourceHandlers : createDesktopSourceHandlers;
    const createTargetHandlers = isVR ? createVRTargetHandlers : createDesktopTargetHandlers;

    return {
        createSourceHandlers,
        createTargetHandlers,
        isLinking,
        linkSource,
        linkStep,
        cancelLink: useCallback(() => {
            endInteraction();
            onCancel?.();
        }, [endInteraction, onCancel]),
    };
}

/**
 * useReorderInteraction - Unified hook for reordering lists
 *
 * Desktop: Drag item up/down in list
 * VR: Select item → Use up/down buttons or thumbstick
 *
 * @param {Object} options
 * @param {Array} options.items - List items
 * @param {Function} options.onReorder - Called when reorder occurs
 */
export function useReorderInteraction({ items, onReorder }) {
    const { isVR, selection, select, clearSelection } = useVRInteraction();
    const [dragOverIndex, setDragOverIndex] = useState(null);

    const selectedItemId = selection?.type === 'reorder' ? selection.id : null;
    const selectedIndex = selectedItemId ? items.findIndex(item => item.id === selectedItemId) : -1;

    // Desktop: Drag handlers
    const createDesktopHandlers = useCallback((itemId, index) => ({
        draggable: true,
        onDragStart: (e) => {
            e.dataTransfer.setData('text/plain', itemId);
            e.dataTransfer.effectAllowed = 'move';
        },
        onDragOver: (e) => {
            e.preventDefault();
            setDragOverIndex(index);
        },
        onDragLeave: () => {
            setDragOverIndex(null);
        },
        onDrop: (e) => {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('text/plain');
            if (draggedId !== itemId) {
                onReorder?.(draggedId, index);
            }
            setDragOverIndex(null);
        },
    }), [onReorder]);

    // VR: Click to select
    const createVRHandlers = useCallback((itemId) => ({
        onClick: () => {
            if (selectedItemId === itemId) {
                clearSelection();
            } else {
                const index = items.findIndex(i => i.id === itemId);
                select('reorder', itemId, { index });
            }
        },
        'data-reorder-selected': selectedItemId === itemId,
    }), [selectedItemId, select, clearSelection, items]);

    // VR reorder controls
    const moveUp = useCallback(() => {
        if (selectedIndex > 0) {
            onReorder?.(selectedItemId, selectedIndex - 1);
            select('reorder', selectedItemId, { index: selectedIndex - 1 });
        }
    }, [selectedItemId, selectedIndex, onReorder, select]);

    const moveDown = useCallback(() => {
        if (selectedIndex < items.length - 1) {
            onReorder?.(selectedItemId, selectedIndex + 1);
            select('reorder', selectedItemId, { index: selectedIndex + 1 });
        }
    }, [selectedItemId, selectedIndex, items.length, onReorder, select]);

    const reorderControls = selectedItemId ? {
        canMoveUp: selectedIndex > 0,
        canMoveDown: selectedIndex < items.length - 1,
        moveUp,
        moveDown,
        done: clearSelection,
    } : null;

    return {
        createItemHandlers: isVR ? createVRHandlers : createDesktopHandlers,
        reorderControls,
        selectedItemId,
        dragOverIndex,
    };
}

/**
 * useMoveInteraction - Unified hook for moving/positioning elements
 *
 * Desktop: Drag to move
 * VR: Grip + move controller
 */
export function useMoveInteraction({ initialPosition, onMove, onMoveEnd, bounds }) {
    const { isVR } = useVRInteraction();
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState(initialPosition || { x: 0, y: 0 });

    // Desktop: Mouse drag
    const handleMouseDown = useCallback((e) => {
        if (isVR) return;

        setIsDragging(true);
        const startPos = { ...position };
        const startMouse = { x: e.clientX, y: e.clientY };

        const handleMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - startMouse.x;
            const dy = moveEvent.clientY - startMouse.y;
            const newPos = {
                x: startPos.x + dx,
                y: startPos.y + dy,
            };

            if (bounds) {
                newPos.x = Math.max(bounds.minX, Math.min(bounds.maxX, newPos.x));
                newPos.y = Math.max(bounds.minY, Math.min(bounds.maxY, newPos.y));
            }

            setPosition(newPos);
            onMove?.(newPos);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            onMoveEnd?.(position);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [isVR, position, bounds, onMove, onMoveEnd]);

    // VR handlers (placeholder - integrates with WebXR)
    const vrMoveHandlers = useMemo(() => ({
        onSelectStart: () => setIsDragging(true),
        onSelectEnd: () => {
            setIsDragging(false);
            onMoveEnd?.(position);
        },
        onMove: (controllerPosition) => {
            setPosition(controllerPosition);
            onMove?.(controllerPosition);
        },
    }), [position, onMove, onMoveEnd]);

    return {
        position,
        setPosition,
        isDragging,
        handlers: isVR ? vrMoveHandlers : { onMouseDown: handleMouseDown },
    };
}

/**
 * useResizeInteraction - Unified hook for resizing elements
 *
 * Desktop: Drag edge/corner
 * VR: Select edge → Thumbstick to resize
 */
export function useResizeInteraction({ initialSize, onResize, onResizeEnd, minSize, maxSize }) {
    const { isVR, selection, select, clearSelection } = useVRInteraction();
    const [size, setSize] = useState(initialSize || { width: 200, height: 200 });
    const [isResizing, setIsResizing] = useState(false);
    const [activeEdge, setActiveEdge] = useState(null);

    const selectedEdge = selection?.type === 'resize' ? selection.data?.edge : null;

    // Cursor mapping for edges
    const getCursorForEdge = (edge) => {
        const cursors = {
            n: 'ns-resize',
            s: 'ns-resize',
            e: 'ew-resize',
            w: 'ew-resize',
            ne: 'nesw-resize',
            sw: 'nesw-resize',
            nw: 'nwse-resize',
            se: 'nwse-resize',
        };
        return cursors[edge] || 'default';
    };

    // Desktop: Edge drag handlers
    const createEdgeHandlers = useCallback((edge) => {
        if (isVR) {
            return {
                onClick: () => {
                    if (selectedEdge === edge) {
                        clearSelection();
                    } else {
                        select('resize', 'current', { edge });
                    }
                },
                'data-resize-edge': edge,
                'data-resize-selected': selectedEdge === edge,
            };
        }

        return {
            onMouseDown: (e) => {
                e.preventDefault();
                setIsResizing(true);
                setActiveEdge(edge);

                const startSize = { ...size };
                const startMouse = { x: e.clientX, y: e.clientY };

                const handleMouseMove = (moveEvent) => {
                    const dx = moveEvent.clientX - startMouse.x;
                    const dy = moveEvent.clientY - startMouse.y;

                    let newSize = { ...startSize };

                    if (edge.includes('e')) newSize.width = startSize.width + dx;
                    if (edge.includes('w')) newSize.width = startSize.width - dx;
                    if (edge.includes('s')) newSize.height = startSize.height + dy;
                    if (edge.includes('n')) newSize.height = startSize.height - dy;

                    if (minSize) {
                        newSize.width = Math.max(minSize.width, newSize.width);
                        newSize.height = Math.max(minSize.height, newSize.height);
                    }
                    if (maxSize) {
                        newSize.width = Math.min(maxSize.width, newSize.width);
                        newSize.height = Math.min(maxSize.height, newSize.height);
                    }

                    setSize(newSize);
                    onResize?.(newSize);
                };

                const handleMouseUp = () => {
                    setIsResizing(false);
                    setActiveEdge(null);
                    onResizeEnd?.(size);
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            },
            style: { cursor: getCursorForEdge(edge) },
        };
    }, [isVR, selectedEdge, size, minSize, maxSize, onResize, onResizeEnd, select, clearSelection]);

    // VR resize controls
    const resizeControls = selectedEdge ? {
        edge: selectedEdge,
        increase: () => {
            const delta = 20;
            let newSize = { ...size };
            if (selectedEdge.includes('e') || selectedEdge.includes('w')) {
                newSize.width = Math.min(maxSize?.width || Infinity, size.width + delta);
            }
            if (selectedEdge.includes('s') || selectedEdge.includes('n')) {
                newSize.height = Math.min(maxSize?.height || Infinity, size.height + delta);
            }
            setSize(newSize);
            onResize?.(newSize);
        },
        decrease: () => {
            const delta = 20;
            let newSize = { ...size };
            if (selectedEdge.includes('e') || selectedEdge.includes('w')) {
                newSize.width = Math.max(minSize?.width || 0, size.width - delta);
            }
            if (selectedEdge.includes('s') || selectedEdge.includes('n')) {
                newSize.height = Math.max(minSize?.height || 0, size.height - delta);
            }
            setSize(newSize);
            onResize?.(newSize);
        },
        done: () => {
            clearSelection();
            onResizeEnd?.(size);
        },
    } : null;

    return {
        size,
        setSize,
        isResizing,
        activeEdge: isVR ? selectedEdge : activeEdge,
        createEdgeHandlers,
        resizeControls,
    };
}

/**
 * useVRControllerInput - Hook to handle VR controller events
 * Placeholder - actual implementation depends on WebXR framework
 */
export function useVRControllerInput(handlers) {
    const { isVR } = useVRInteraction();

    useEffect(() => {
        if (!isVR) return;
        // WebXR integration would go here
    }, [isVR, handlers]);
}

export default VRInteractionProvider;
