// src/ui/react/context/DragLinkContext.jsx
// Context provider for drag-to-link operations

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
} from 'react';
import { DragLinkOverlay } from '@UI/react/components/molecules/DragLinkOverlay';
import { QuickLinkPopup } from '@UI/react/components/molecules/QuickLinkPopup';

// =============================================================================
// CONTEXT
// =============================================================================

const DragLinkContext = createContext(null);

/**
 * DragLinkProvider - Wraps the canvas/workspace to enable drag-to-link
 *
 * Usage:
 * <DragLinkProvider onCreateLink={handleCreateLink}>
 *   <Canvas />
 * </DragLinkProvider>
 */
export function DragLinkProvider({ children, onCreateLink, onOpenLinkPanel }) {
    const [dragState, setDragState] = useState({
        isDragging: false,
        sourceView: null,
        sourceRect: null,
        currentPosition: { x: 0, y: 0 },
        targetView: null,
        isValidTarget: false,
    });

    const [showQuickLinkPopup, setShowQuickLinkPopup] = useState(false);
    const [quickLinkPosition, setQuickLinkPosition] = useState({ x: 0, y: 0 });
    const [pendingLink, setPendingLink] = useState(null);

    // Start drag operation
    const startDrag = useCallback((sourceView, sourceRect, startPosition) => {
        setDragState({
            isDragging: true,
            sourceView,
            sourceRect,
            currentPosition: startPosition,
            targetView: null,
            isValidTarget: false,
        });
    }, []);

    // Update drag position (called on mousemove)
    const updateDrag = useCallback((position, targetView, isValidTarget) => {
        setDragState((prev) => ({
            ...prev,
            currentPosition: position,
            targetView,
            isValidTarget,
        }));
    }, []);

    // End drag operation
    const endDrag = useCallback(
        (dropped, dropPosition, modifiers = {}) => {
            if (dropped && dragState.targetView && dragState.isValidTarget) {
                const link = {
                    sourceView: dragState.sourceView,
                    targetView: dragState.targetView,
                };

                // Handle modifier keys
                if (modifiers.ctrl || modifiers.meta) {
                    // Ctrl/Cmd+Drop: Open full link panel
                    onOpenLinkPanel?.(link.sourceView, link.targetView);
                } else if (modifiers.shift) {
                    // Shift+Drop: Link all properties with sync mode
                    onCreateLink?.(
                        link.sourceView.id,
                        link.targetView.id,
                        'all', // All properties
                        'sync'
                    );
                } else if (modifiers.alt) {
                    // Alt+Drop: Quick camera sync
                    onCreateLink?.(
                        link.sourceView.id,
                        link.targetView.id,
                        'camera',
                        'sync'
                    );
                } else {
                    // Default: Show Quick Link Popup
                    setPendingLink(link);
                    setQuickLinkPosition(dropPosition);
                    setShowQuickLinkPopup(true);
                }
            }

            setDragState({
                isDragging: false,
                sourceView: null,
                sourceRect: null,
                currentPosition: { x: 0, y: 0 },
                targetView: null,
                isValidTarget: false,
            });
        },
        [dragState, onCreateLink, onOpenLinkPanel]
    );

    // Cancel drag (Escape key)
    const cancelDrag = useCallback(() => {
        setDragState({
            isDragging: false,
            sourceView: null,
            sourceRect: null,
            currentPosition: { x: 0, y: 0 },
            targetView: null,
            isValidTarget: false,
        });
    }, []);

    // Handle Quick Link confirmation
    const confirmQuickLink = useCallback(
        (properties, mode) => {
            if (pendingLink && onCreateLink) {
                onCreateLink(
                    pendingLink.sourceView.id,
                    pendingLink.targetView.id,
                    properties,
                    mode
                );
            }
            setShowQuickLinkPopup(false);
            setPendingLink(null);
        },
        [pendingLink, onCreateLink]
    );

    // Cancel Quick Link
    const cancelQuickLink = useCallback(() => {
        setShowQuickLinkPopup(false);
        setPendingLink(null);
    }, []);

    // Keyboard handler for Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (showQuickLinkPopup) {
                    cancelQuickLink();
                } else if (dragState.isDragging) {
                    cancelDrag();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [dragState.isDragging, showQuickLinkPopup, cancelDrag, cancelQuickLink]);

    const contextValue = {
        dragState,
        startDrag,
        updateDrag,
        endDrag,
        cancelDrag,
        showQuickLinkPopup,
        quickLinkPosition,
        pendingLink,
        confirmQuickLink,
        cancelQuickLink,
    };

    return (
        <DragLinkContext.Provider value={contextValue}>
            {children}

            {/* Drag Line Overlay */}
            {dragState.isDragging && (
                <DragLinkOverlay
                    sourceRect={dragState.sourceRect}
                    currentPosition={dragState.currentPosition}
                    isValidTarget={dragState.isValidTarget}
                    targetView={dragState.targetView}
                />
            )}

            {/* Quick Link Popup */}
            {showQuickLinkPopup && pendingLink && (
                <QuickLinkPopup
                    sourceView={pendingLink.sourceView}
                    targetView={pendingLink.targetView}
                    position={quickLinkPosition}
                    onConfirm={confirmQuickLink}
                    onCancel={cancelQuickLink}
                />
            )}
        </DragLinkContext.Provider>
    );
}

/**
 * useDragLink - Hook to access drag-to-link context
 */
export function useDragLink() {
    const context = useContext(DragLinkContext);
    if (!context) {
        throw new Error('useDragLink must be used within DragLinkProvider');
    }
    return context;
}

export default DragLinkContext;
