// src/ui/react/hooks/useDropTarget.js
// =============================================================================
// DROP TARGET HOOK
// =============================================================================
//
// Reusable hook for making elements accept drops with CIA-standard data parsing.
// Handles dragover/dragleave/drop events with rAF-throttled zone detection.
//
// WHY THIS EXISTS:
// - CanvasCell.jsx has the most robust drop parsing (6 MIME type fallbacks)
// - GridLayoutPreview.jsx and CanvasNavigator have simpler, less robust versions
// - DragLeave detection pattern is duplicated in 3+ files
// - This hook provides a single, consistent drop target implementation
//
// USAGE:
// const { dropProps, activeZone, isOver } = useDropTarget({
//     onDrop: (data, zone, modifiers) => handleDrop(data),
//     enableZones: true,
// });
// <div ref={dropRef} {...dropProps}>Drop here</div>
//
// =============================================================================

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { DROP_ZONES, parseDragData, getDropZone, hasAnyCIADragType } from './dragDropTypes';

/**
 * Hook for creating drop target elements
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.onDrop - Callback when drop occurs: (dropData, zone, modifiers) => void
 * @param {string[]} [options.acceptTypes] - Types to accept (not yet implemented - accepts all)
 * @param {boolean} [options.enableZones=false] - Enable edge zone detection (push zones)
 * @param {Function} [options.onZoneChange] - Callback when active zone changes
 * @param {Function} [options.onDragEnter] - Callback when drag enters
 * @param {Function} [options.onDragLeave] - Callback when drag leaves
 * @param {boolean} [options.disabled=false] - Whether dropping is disabled
 *
 * @returns {Object} Hook result
 * @returns {React.RefObject} result.dropRef - Ref to attach to the drop target element
 * @returns {Object} result.dropProps - Props to spread on drop target element
 * @returns {string} result.activeZone - Current drop zone from DROP_ZONES
 * @returns {boolean} result.isOver - Whether a drag is currently over the element
 *
 * @example
 * // Simple drop target
 * const { dropRef, dropProps, isOver } = useDropTarget({
 *     onDrop: (data) => {
 *         if (data.type === 'dataset') {
 *             handleDatasetDrop(data.datasetId);
 *         }
 *     },
 * });
 *
 * @example
 * // Drop target with zone detection
 * const { dropRef, dropProps, activeZone } = useDropTarget({
 *     onDrop: (data, zone, modifiers) => {
 *         if (zone === DROP_ZONES.PUSH_UP) {
 *             pushContentUp(data);
 *         } else if (zone === DROP_ZONES.PLACE) {
 *             placeContent(data);
 *         }
 *     },
 *     enableZones: true,
 *     onZoneChange: (zone) => setHighlightedZone(zone),
 * });
 */
export function useDropTarget({
    onDrop,
    acceptTypes,
    enableZones = false,
    onZoneChange,
    onDragEnter,
    onDragLeave,
    disabled = false,
    isEmpty = true, // For zone detection (PLACE vs SWAP)
}) {
    const [activeZone, setActiveZone] = useState(DROP_ZONES.NONE);
    const [isOver, setIsOver] = useState(false);

    const dropRef = useRef(null);
    const rafIdRef = useRef(null);
    const pendingZoneRef = useRef(DROP_ZONES.NONE);

    // Notify when zone changes
    useEffect(() => {
        onZoneChange?.(activeZone);
    }, [activeZone, onZoneChange]);

    // Cleanup rAF on unmount
    useEffect(() => {
        return () => {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, []);

    const handleDragEnter = useCallback((e) => {
        if (disabled) return;

        e.preventDefault();
        setIsOver(true);
        onDragEnter?.(e);
    }, [disabled, onDragEnter]);

    const handleDragOver = useCallback((e) => {
        if (disabled) return;

        e.preventDefault();

        // Set appropriate drop effect based on source
        const allowedEffect = e.dataTransfer.effectAllowed;
        if (allowedEffect === 'copy' || allowedEffect === 'copyMove') {
            e.dataTransfer.dropEffect = 'copy';
        } else {
            e.dataTransfer.dropEffect = 'move';
        }

        if (enableZones) {
            // Calculate which drop zone we're in
            const zone = getDropZone(e, dropRef, isEmpty);

            // Only schedule update if zone actually changed
            if (zone !== pendingZoneRef.current) {
                pendingZoneRef.current = zone;

                // Throttle with rAF - only one update per frame
                if (!rafIdRef.current) {
                    rafIdRef.current = requestAnimationFrame(() => {
                        rafIdRef.current = null;
                        setActiveZone(pendingZoneRef.current);
                    });
                }
            }
        } else if (!isOver) {
            setIsOver(true);
        }
    }, [disabled, enableZones, isEmpty, isOver]);

    const handleDragLeave = useCallback((e) => {
        // Only clear if leaving the element entirely (not entering a child)
        // Check if relatedTarget is a Node before calling contains
        const relatedTarget = e.relatedTarget;
        const isLeavingCompletely = !relatedTarget ||
            !(relatedTarget instanceof Node) ||
            !dropRef.current?.contains(relatedTarget);

        if (isLeavingCompletely) {
            // Cancel any pending rAF
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }

            pendingZoneRef.current = DROP_ZONES.NONE;
            setActiveZone(DROP_ZONES.NONE);
            setIsOver(false);
            onDragLeave?.(e);
        }
    }, [onDragLeave]);

    const handleDrop = useCallback((e) => {
        if (disabled) return;

        e.preventDefault();

        const dropZone = activeZone;

        // Reset state
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        pendingZoneRef.current = DROP_ZONES.NONE;
        setActiveZone(DROP_ZONES.NONE);
        setIsOver(false);

        // Parse the drop data
        const dropData = parseDragData(e.dataTransfer);
        if (!dropData) return;

        // Get modifier keys
        const modifiers = {
            shift: e.shiftKey,
            ctrl: e.ctrlKey || e.metaKey,
            alt: e.altKey,
        };

        onDrop?.(dropData, dropZone, modifiers);
    }, [disabled, activeZone, onDrop]);

    const dropProps = useMemo(() => ({
        onDragEnter: handleDragEnter,
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
    }), [handleDragEnter, handleDragOver, handleDragLeave, handleDrop]);

    return {
        /** Ref to attach to the drop target element */
        dropRef,
        /** Props to spread on the drop target element */
        dropProps,
        /** Current drop zone from DROP_ZONES */
        activeZone,
        /** Whether a drag is currently over the element */
        isOver,
    };
}

/**
 * Simpler drop target without zone detection
 * For basic drop scenarios like file upload areas
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.onDrop - Callback when drop occurs
 * @param {boolean} [options.disabled=false] - Whether dropping is disabled
 * @returns {Object} { dropRef, dropProps, isOver }
 */
export function useSimpleDropTarget({ onDrop, disabled = false }) {
    return useDropTarget({
        onDrop,
        disabled,
        enableZones: false,
    });
}

/**
 * Drop target for canvas cells with full zone detection
 * Convenience wrapper with cell-specific defaults
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.onDrop - Callback when drop occurs
 * @param {boolean} options.isEmpty - Whether the cell is empty
 * @param {Function} [options.onZoneChange] - Callback when zone changes
 * @returns {Object} { dropRef, dropProps, activeZone, isOver }
 */
export function useCanvasCellDropTarget({ onDrop, isEmpty, onZoneChange }) {
    return useDropTarget({
        onDrop,
        isEmpty,
        enableZones: true,
        onZoneChange,
    });
}

export default useDropTarget;
