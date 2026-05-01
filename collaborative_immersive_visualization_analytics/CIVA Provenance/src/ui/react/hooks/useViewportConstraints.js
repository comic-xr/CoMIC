// src/ui/react/hooks/useViewportConstraints.js
// =============================================================================
// VIEWPORT CONSTRAINTS HOOK
// =============================================================================
//
// Provides viewport size constraints relative to canvas dimensions.
// Single source of truth for viewport validation logic.
//
// WHY THIS EXISTS:
// - ViewportSizeDisplay.jsx used hardcoded max of 10
// - CanvasNavigator correctly constrains to canvas dimensions
// - This hook provides consistent constraints everywhere
//
// USAGE:
// const { maxRows, maxCols, clampViewport, isValid } = useViewportConstraints(canvasSize);
//
// =============================================================================

import { useMemo } from 'react';
import {
    MIN_VIEWPORT_SIZE,
    MAX_VIEWPORT_SIZE,
    clampViewportSize,
    isValidViewportSize,
} from './viewportState';

/**
 * Hook providing viewport size constraints relative to canvas dimensions
 *
 * @param {{ rows: number, cols: number } | null} canvasSize - Current canvas dimensions
 * @returns {Object} Constraint utilities
 *
 * @example
 * function ViewportControls({ canvasSize, viewportSize, onChange }) {
 *     const { maxRows, maxCols, clampViewport } = useViewportConstraints(canvasSize);
 *
 *     const handleIncrement = (dimension) => {
 *         const newSize = { ...viewportSize };
 *         newSize[dimension] = Math.min(newSize[dimension] + 1, dimension === 'rows' ? maxRows : maxCols);
 *         onChange(clampViewport(newSize));
 *     };
 *
 *     return (
 *         <button disabled={viewportSize.rows >= maxRows}>+</button>
 *     );
 * }
 */
export function useViewportConstraints(canvasSize) {
    return useMemo(() => {
        // Use canvas size as max, fall back to global max if canvas not available
        const effectiveMaxRows = Math.min(
            canvasSize?.rows ?? MAX_VIEWPORT_SIZE.rows,
            MAX_VIEWPORT_SIZE.rows
        );
        const effectiveMaxCols = Math.min(
            canvasSize?.cols ?? MAX_VIEWPORT_SIZE.cols,
            MAX_VIEWPORT_SIZE.cols
        );

        const maxSize = { rows: effectiveMaxRows, cols: effectiveMaxCols };

        return {
            /** Minimum viewport rows (always 1) */
            minRows: MIN_VIEWPORT_SIZE.rows,
            /** Minimum viewport cols (always 1) */
            minCols: MIN_VIEWPORT_SIZE.cols,
            /** Maximum viewport rows (constrained to canvas) */
            maxRows: effectiveMaxRows,
            /** Maximum viewport cols (constrained to canvas) */
            maxCols: effectiveMaxCols,
            /** Max size object for convenience */
            maxSize,

            /**
             * Clamp a viewport size to valid range
             * @param {{ rows: number, cols: number }} size - Size to clamp
             * @returns {{ rows: number, cols: number }} Clamped size
             */
            clampViewport: (size) => clampViewportSize(size.rows, size.cols, maxSize),

            /**
             * Check if a viewport size is valid within current constraints
             * @param {{ rows: number, cols: number }} size - Size to validate
             * @returns {boolean} True if valid
             */
            isValid: (size) => {
                if (!isValidViewportSize(size)) return false;
                return size.rows <= effectiveMaxRows && size.cols <= effectiveMaxCols;
            },

            /**
             * Increment a dimension by delta, respecting constraints
             * @param {{ rows: number, cols: number }} size - Current size
             * @param {'rows' | 'cols'} dimension - Dimension to change
             * @param {number} delta - Amount to change (+1 or -1)
             * @returns {{ rows: number, cols: number }} New clamped size
             */
            adjustDimension: (size, dimension, delta) => {
                const newSize = { ...size };
                const max = dimension === 'rows' ? effectiveMaxRows : effectiveMaxCols;
                const min = dimension === 'rows' ? MIN_VIEWPORT_SIZE.rows : MIN_VIEWPORT_SIZE.cols;
                newSize[dimension] = Math.max(min, Math.min(max, size[dimension] + delta));
                return newSize;
            },

            /**
             * Check if at maximum size for a dimension
             * @param {{ rows: number, cols: number }} size - Current size
             * @param {'rows' | 'cols'} dimension - Dimension to check
             * @returns {boolean} True if at max
             */
            isAtMax: (size, dimension) => {
                const max = dimension === 'rows' ? effectiveMaxRows : effectiveMaxCols;
                return size[dimension] >= max;
            },

            /**
             * Check if at minimum size for a dimension
             * @param {{ rows: number, cols: number }} size - Current size
             * @param {'rows' | 'cols'} dimension - Dimension to check
             * @returns {boolean} True if at min
             */
            isAtMin: (size, dimension) => {
                const min = dimension === 'rows' ? MIN_VIEWPORT_SIZE.rows : MIN_VIEWPORT_SIZE.cols;
                return size[dimension] <= min;
            },
        };
    }, [canvasSize?.rows, canvasSize?.cols]);
}

export default useViewportConstraints;
