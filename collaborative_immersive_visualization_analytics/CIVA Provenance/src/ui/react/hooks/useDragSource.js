// src/ui/react/hooks/useDragSource.js
// =============================================================================
// DRAG SOURCE HOOK
// =============================================================================
//
// Reusable hook for making elements draggable with CIA-standard data format.
// Handles drag start/end events and provides consistent MIME type handling.
//
// WHY THIS EXISTS:
// - DatasetsTab.jsx and DatasetParent.jsx have IDENTICAL drag start code
// - ViewItem.jsx has similar but slightly different implementation
// - This hook provides a single, consistent drag source implementation
//
// USAGE:
// const { dragProps, isDragging } = useDragSource({
//     type: 'VIEWITEM',
//     data: { id: view.id, name: view.name, ... },
// });
// <div {...dragProps}>Draggable content</div>
//
// =============================================================================

import { useState, useCallback, useMemo } from 'react';
import { DRAG_TYPES, setDragData } from './dragDropTypes';

/**
 * Hook for creating draggable elements
 *
 * @param {Object} options - Configuration options
 * @param {'VIEWITEM' | 'DATASET'} options.type - The type of data being dragged
 * @param {Object} options.data - The data to attach to the drag operation
 * @param {'move' | 'copy' | 'link' | 'copyMove'} [options.effectAllowed='move'] - Allowed drag effects
 * @param {Function} [options.onDragStart] - Callback when drag starts
 * @param {Function} [options.onDragEnd] - Callback when drag ends
 * @param {boolean} [options.disabled=false] - Whether dragging is disabled
 *
 * @returns {Object} Hook result
 * @returns {Object} result.dragProps - Props to spread on draggable element
 * @returns {boolean} result.isDragging - Whether currently dragging
 *
 * @example
 * // Dragging a view item
 * const { dragProps, isDragging } = useDragSource({
 *     type: 'VIEWITEM',
 *     data: {
 *         id: view.id,
 *         viewConfigId: view.id,
 *         name: view.name,
 *         color: view.color,
 *         datasetId: view.datasetId,
 *     },
 *     onDragStart: () => setDragging(true),
 *     onDragEnd: () => setDragging(false),
 * });
 *
 * @example
 * // Dragging a dataset
 * const { dragProps, isDragging } = useDragSource({
 *     type: 'DATASET',
 *     data: {
 *         datasetId: dataset.id,
 *         name: dataset.name,
 *         fileType: dataset.fileType,
 *     },
 *     effectAllowed: 'copy',
 * });
 */
export function useDragSource({
    type,
    data,
    effectAllowed = 'move',
    onDragStart,
    onDragEnd,
    disabled = false,
}) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragStart = useCallback((e) => {
        if (disabled) {
            e.preventDefault();
            return;
        }

        // Set data using centralized utility
        setDragData(e.dataTransfer, type, data, effectAllowed);

        setIsDragging(true);

        // Add a body class for global styling during drag
        document.body.classList.add('cia-dragging');
        document.body.classList.add(`cia-dragging-${type.toLowerCase()}`);

        onDragStart?.(e, data);
    }, [type, data, effectAllowed, disabled, onDragStart]);

    const handleDragEnd = useCallback((e) => {
        setIsDragging(false);

        // Remove body classes
        document.body.classList.remove('cia-dragging');
        document.body.classList.remove(`cia-dragging-${type.toLowerCase()}`);

        onDragEnd?.(e);
    }, [type, onDragEnd]);

    const dragProps = useMemo(() => ({
        draggable: !disabled,
        onDragStart: handleDragStart,
        onDragEnd: handleDragEnd,
    }), [disabled, handleDragStart, handleDragEnd]);

    return {
        /** Props to spread on the draggable element */
        dragProps,
        /** Whether the element is currently being dragged */
        isDragging,
    };
}

/**
 * Create drag props for a view item
 * Convenience wrapper with view-specific defaults
 *
 * @param {Object} view - View object
 * @param {Object} [options] - Additional options
 * @returns {Object} { dragProps, isDragging }
 */
export function useViewItemDragSource(view, options = {}) {
    return useDragSource({
        type: 'VIEWITEM',
        data: {
            type: 'view-item',
            id: view?.id,
            viewConfigId: view?.id,
            viewId: view?.id,
            name: view?.name,
            color: view?.color,
            datasetId: view?.datasetId,
            datasetName: view?.datasetName,
            rowSpan: view?.rowSpan || 1,
            colSpan: view?.colSpan || 1,
        },
        effectAllowed: 'move',
        ...options,
    });
}

/**
 * Create drag props for a dataset
 * Convenience wrapper with dataset-specific defaults
 *
 * @param {Object} dataset - Dataset object
 * @param {Object} [options] - Additional options
 * @returns {Object} { dragProps, isDragging }
 */
export function useDatasetDragSource(dataset, options = {}) {
    return useDragSource({
        type: 'DATASET',
        data: {
            datasetId: dataset?.id,
            id: dataset?.id,
            name: dataset?.name || dataset?.filename,
            fileType: dataset?.fileType,
        },
        effectAllowed: 'copy',
        ...options,
    });
}

export default useDragSource;
