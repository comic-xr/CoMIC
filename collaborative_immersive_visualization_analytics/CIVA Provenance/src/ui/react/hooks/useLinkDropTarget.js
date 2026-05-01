// src/ui/react/hooks/useLinkDropTarget.js
// Hook for making elements drop targets for link creation

import { useState, useCallback } from 'react';
import { useDragLink } from '@UI/react/context/DragLinkContext';

/**
 * useLinkDropTarget - Hook for making views drop targets
 *
 * Usage:
 * const { dropHandlers, isOver, isValid } = useLinkDropTarget(view, canAcceptLink);
 * <div {...dropHandlers}>Drop here</div>
 *
 * @param {object} view - View object with id, name, color
 * @param {function} canAcceptLink - Optional validator (sourceView, targetView) => boolean
 * @returns {object} { dropHandlers, isOver, isValid }
 */
export function useLinkDropTarget(view, canAcceptLink) {
    const { updateDrag, dragState } = useDragLink();
    const [isOver, setIsOver] = useState(false);

    // Determine if this is a valid drop target
    const isValidTarget = useCallback(() => {
        if (!dragState.sourceView) return false;
        if (dragState.sourceView.id === view.id) return false; // Can't link to self
        if (canAcceptLink && !canAcceptLink(dragState.sourceView, view))
            return false;
        return true;
    }, [dragState.sourceView, view, canAcceptLink]);

    const handleDragEnter = useCallback(
        (e) => {
            e.preventDefault();
            const valid = isValidTarget();
            setIsOver(true);
            updateDrag(dragState.currentPosition, view, valid);
        },
        [isValidTarget, updateDrag, dragState.currentPosition, view]
    );

    const handleDragOver = useCallback(
        (e) => {
            e.preventDefault();
            const valid = isValidTarget();
            e.dataTransfer.dropEffect = valid ? 'link' : 'none';
            updateDrag({ x: e.clientX, y: e.clientY }, view, valid);
        },
        [isValidTarget, updateDrag, view]
    );

    const handleDragLeave = useCallback(
        (e) => {
            e.preventDefault();
            setIsOver(false);
            updateDrag(dragState.currentPosition, null, false);
        },
        [updateDrag, dragState.currentPosition]
    );

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsOver(false);
        // Drop is handled by DragLinkProvider via endDrag
    }, []);

    return {
        dropHandlers: {
            onDragEnter: handleDragEnter,
            onDragOver: handleDragOver,
            onDragLeave: handleDragLeave,
            onDrop: handleDrop,
        },
        isOver,
        isValid: isOver && isValidTarget(),
    };
}

export default useLinkDropTarget;
