/**
 * @file TiledCanvasView.logic.js
 * @description Logic hooks for TiledCanvasView component
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Design tokens for canvas sizing
 */
export const CANVAS_SIZING = {
    minCanvasWidth: 280,
    minCanvasHeight: 200,
    dividerSize: 6,
    splitRatioMin: 0.2,
    splitRatioMax: 0.8,
};

/**
 * Workspace type configurations
 */
export const WORKSPACE_TYPE_CONFIG = {
    workspace: { icon: 'square', prefix: null, color: 'blue' },
    subset: { icon: 'filter', prefix: 'Subset:', color: 'amber' },
    scratch: { icon: 'pencil', prefix: null, color: 'green' },
};

/**
 * Hook to manage split ratio and divider dragging
 */
export function useSplitRatio(initialRatio = { h: 0.5, v: 0.5 }) {
    const [splitRatio, setSplitRatio] = useState(initialRatio);
    const [isDragging, setIsDragging] = useState(null);
    const containerRef = useRef(null);

    const clampRatio = useCallback((ratio, size, minSize) => {
        if (!size || size <= 0) return ratio;
        const minBySize = minSize / size;
        const minRatio = Math.max(CANVAS_SIZING.splitRatioMin, minBySize);
        const maxRatio = Math.min(CANVAS_SIZING.splitRatioMax, 1 - minBySize);
        if (minRatio >= maxRatio) return 0.5;
        return Math.max(minRatio, Math.min(maxRatio, ratio));
    }, []);

    const clampSplitRatio = useCallback((nextRatio) => {
        if (!containerRef.current) return nextRatio;
        const rect = containerRef.current.getBoundingClientRect();
        return {
            h: clampRatio(nextRatio.h, rect.width, CANVAS_SIZING.minCanvasWidth),
            v: clampRatio(nextRatio.v, rect.height, CANVAS_SIZING.minCanvasHeight),
        };
    }, [clampRatio]);

    const handleDividerMouseDown = useCallback((type) => (e) => {
        e.preventDefault();
        setIsDragging(type);
    }, []);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();

            if (isDragging === 'h') {
                const newRatio = (e.clientX - rect.left) / rect.width;
                setSplitRatio(prev => clampSplitRatio({
                    ...prev,
                    h: newRatio,
                }));
            } else if (isDragging === 'v') {
                const newRatio = (e.clientY - rect.top) / rect.height;
                setSplitRatio(prev => clampSplitRatio({
                    ...prev,
                    v: newRatio,
                }));
            }
        };

        const handleMouseUp = () => {
            setIsDragging(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [clampSplitRatio, isDragging]);

    useEffect(() => {
        if (!containerRef.current) return undefined;
        const observer = new ResizeObserver(() => {
            setSplitRatio(prev => clampSplitRatio(prev));
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [clampSplitRatio]);

    return {
        splitRatio,
        setSplitRatio,
        isDragging,
        setIsDragging,
        containerRef,
        handleDividerMouseDown,
    };
}

/**
 * Hook to get open workspaces (max 4)
 */
export function useOpenWorkspaces(workspaces) {
    const openWorkspaces = workspaces.filter(w => w.isOpen);
    const visibleCount = Math.min(openWorkspaces.length, 4);
    const visibleWorkspaces = openWorkspaces.slice(0, 4);

    return {
        openWorkspaces: visibleWorkspaces,
        count: visibleCount,
    };
}

/**
 * Get layout configuration based on count
 */
export function getLayoutConfig(count) {
    switch (count) {
        case 1:
            return { type: 'single' };
        case 2:
            return { type: 'horizontal-split' };
        case 3:
        case 4:
            return { type: 'grid' };
        default:
            return { type: 'empty' };
    }
}
