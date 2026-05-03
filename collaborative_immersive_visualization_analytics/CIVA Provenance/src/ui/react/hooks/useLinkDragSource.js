// src/ui/react/hooks/useLinkDragSource.js
// Hook for making elements draggable for link creation

import { useState, useCallback } from 'react';
import { useDragLink } from '@UI/react/context/DragLinkContext';

/**
 * useLinkDragSource - Hook for making LinkBadge draggable
 *
 * Usage:
 * const { dragHandlers, isDragging } = useLinkDragSource(view);
 * <button {...dragHandlers}>🔗</button>
 *
 * @param {object} view - View object with id, name, color
 * @returns {object} { dragHandlers, isDragging }
 */
export function useLinkDragSource(view) {
    const { startDrag, updateDrag, endDrag, dragState } = useDragLink();
    const [isDragging, setIsDragging] = useState(false);

    const handleDragStart = useCallback(
        (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const startPos = { x: e.clientX, y: e.clientY };

            // Set drag image (transparent)
            const img = new Image();
            img.src =
                'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            e.dataTransfer.setDragImage(img, 0, 0);

            // Store view ID in drag data
            e.dataTransfer.setData(
                'application/x-cia-view-link',
                JSON.stringify({
                    viewId: view.id,
                    viewName: view.name,
                    viewColor: view.color,
                })
            );
            e.dataTransfer.effectAllowed = 'link';

            startDrag(view, rect, startPos);
            setIsDragging(true);
        },
        [view, startDrag]
    );

    const handleDrag = useCallback(
        (e) => {
            // Ignore final drag event with zero coordinates
            if (e.clientX === 0 && e.clientY === 0) return;
            updateDrag(
                { x: e.clientX, y: e.clientY },
                dragState.targetView,
                dragState.isValidTarget
            );
        },
        [updateDrag, dragState.targetView, dragState.isValidTarget]
    );

    const handleDragEnd = useCallback(
        (e) => {
            const dropped = e.dataTransfer.dropEffect !== 'none';
            const modifiers = {
                shift: e.shiftKey,
                alt: e.altKey,
                ctrl: e.ctrlKey,
                meta: e.metaKey,
            };
            endDrag(dropped, { x: e.clientX, y: e.clientY }, modifiers);
            setIsDragging(false);
        },
        [endDrag]
    );

    return {
        dragHandlers: {
            draggable: true,
            onDragStart: handleDragStart,
            onDrag: handleDrag,
            onDragEnd: handleDragEnd,
        },
        isDragging,
    };
}

export default useLinkDragSource;
