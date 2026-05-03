/**
 * @file PopoutWindow.logic.js
 * @description Logic hooks for PopoutWindow component - snap calculations and drag/resize handling
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Snap configuration tokens
 */
export const SNAP_CONFIG = {
    threshold: 20,      // Pixels to trigger snap
    gridSize: 50,       // Grid snap size
    minWidth: 200,      // Minimum popout width
    minHeight: 150,     // Minimum popout height
};

/**
 * View type icon mapping
 */
export const VIEW_TYPE_ICONS = {
    'vtk-slice': 'layers',
    'vtk-volume': 'box',
    'table': 'barChart3',
    default: 'square',
};

/**
 * Hook for snap calculations
 */
export function useSnapCalculation(snapEnabled, gridSnapEnabled, containerBounds) {
    const calculateSnap = useCallback((pos, currentSize, shiftHeld) => {
        if (shiftHeld || (!snapEnabled && !gridSnapEnabled)) {
            return { pos, indicator: null };
        }

        let snappedPos = { ...pos };
        let indicator = null;
        const threshold = SNAP_CONFIG.threshold;

        // Grid snap takes priority
        if (gridSnapEnabled) {
            snappedPos.x = Math.round(pos.x / SNAP_CONFIG.gridSize) * SNAP_CONFIG.gridSize;
            snappedPos.y = Math.round(pos.y / SNAP_CONFIG.gridSize) * SNAP_CONFIG.gridSize;
            return { pos: snappedPos, indicator: 'grid' };
        }

        // Edge snap
        if (snapEnabled && containerBounds) {
            // Left edge
            if (Math.abs(pos.x) < threshold) {
                snappedPos.x = 0;
                indicator = 'left';
            }
            // Right edge
            if (Math.abs(pos.x + currentSize.width - containerBounds.width) < threshold) {
                snappedPos.x = containerBounds.width - currentSize.width;
                indicator = 'right';
            }
            // Top edge
            if (Math.abs(pos.y) < threshold) {
                snappedPos.y = 0;
                indicator = indicator ? indicator + '-top' : 'top';
            }
            // Bottom edge
            if (Math.abs(pos.y + currentSize.height - containerBounds.height) < threshold) {
                snappedPos.y = containerBounds.height - currentSize.height;
                indicator = indicator ? indicator + '-bottom' : 'bottom';
            }
            // Center horizontal
            const centerX = (containerBounds.width - currentSize.width) / 2;
            if (Math.abs(pos.x - centerX) < threshold) {
                snappedPos.x = centerX;
                indicator = 'center-h';
            }
            // Center vertical
            const centerY = (containerBounds.height - currentSize.height) / 2;
            if (Math.abs(pos.y - centerY) < threshold) {
                snappedPos.y = centerY;
                indicator = indicator === 'center-h' ? 'center' : 'center-v';
            }
        }

        return { pos: snappedPos, indicator };
    }, [snapEnabled, gridSnapEnabled, containerBounds]);

    return { calculateSnap };
}

/**
 * Hook for drag handling
 */
export function useDrag(position, size, onPositionChange, onFocus, calculateSnap) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [snapIndicator, setSnapIndicator] = useState(null);

    const handleDragStart = useCallback((e) => {
        if (e.target.closest('button')) return;
        setIsDragging(true);
        setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
        onFocus?.();
    }, [position, onFocus]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            const rawPos = { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y };
            const { pos, indicator } = calculateSnap(rawPos, size, e.shiftKey);
            onPositionChange?.(pos);
            setSnapIndicator(indicator);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setSnapIndicator(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, calculateSnap, size, onPositionChange]);

    return { isDragging, snapIndicator, handleDragStart };
}

/**
 * Hook for resize handling
 */
export function useResize(position, onSizeChange, onFocus) {
    const [isResizing, setIsResizing] = useState(false);

    const handleResizeStart = useCallback((e) => {
        e.stopPropagation();
        setIsResizing(true);
        onFocus?.();
    }, [onFocus]);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e) => {
            const newWidth = Math.max(SNAP_CONFIG.minWidth, e.clientX - position.x);
            const newHeight = Math.max(SNAP_CONFIG.minHeight, e.clientY - position.y);
            onSizeChange?.({ width: newWidth, height: newHeight });
        };

        const handleMouseUp = () => setIsResizing(false);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, position, onSizeChange]);

    return { isResizing, handleResizeStart };
}
