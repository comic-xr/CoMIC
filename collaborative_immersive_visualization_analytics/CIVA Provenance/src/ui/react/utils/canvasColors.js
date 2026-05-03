/**
 * @file canvasColors.js
 * @description Shared color constants and utilities for canvas cells
 *
 * This is the single source of truth for position-based cell coloring.
 * Uses diagonal stripe pattern: color = (row + col) % numColors
 * This ensures adjacent cells (horizontal, vertical, diagonal) have different colors.
 */

// Re-export shared color utilities
export { hexToRgbString, hexToRgb } from '@Utils/colorUtils.js';

// =============================================================================
// CELL COLORS - Position-based palette
// =============================================================================

/**
 * Position-based color palette for canvas cells
 * Colors rotate by position so adjacent cells have different colors
 */
export const CELL_COLORS = [
    { name: 'blue', hex: '#60a5fa' },
    { name: 'green', hex: '#34d399' },
    { name: 'purple', hex: '#c084fc' },
    { name: 'pink', hex: '#fb7185' },
    { name: 'amber', hex: '#fbbf24' },
    { name: 'teal', hex: '#7dd3fc' },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get color for a cell based on its grid position
 * Uses diagonal stripe pattern: color = (row + col) % numColors
 * This ensures adjacent cells (horizontal and vertical) have different colors
 *
 * @param {number} row - Row index (0-based)
 * @param {number} col - Column index (0-based)
 * @returns {{ name: string, hex: string }} Color object
 */
export const getCellColorByPosition = (row, col) => {
    const safeRow = row ?? 0;
    const safeCol = col ?? 0;
    const index = (safeRow + safeCol) % CELL_COLORS.length;
    return CELL_COLORS[index];
};

/**
 * Get just the hex color string for a cell position
 *
 * @param {number} row - Row index (0-based)
 * @param {number} col - Column index (0-based)
 * @returns {string} Hex color string (e.g., '#60a5fa')
 */
export const getCellColorHex = (row, col) => {
    return getCellColorByPosition(row, col).hex;
};

// =============================================================================
// VIEW COLORS - ID-based palette (for views not on canvas)
// =============================================================================

/**
 * View colors for ID-based coloring (views not yet placed on canvas)
 */
export const VIEW_COLORS = [
    '#60a5fa', // Blue
    '#34d399', // Green
    '#2dd4bf', // Teal
    '#fb7185', // Pink
    '#c084fc', // Purple
    '#fbbf24', // Amber
];

/**
 * Get consistent color for a view based on its ID (hash-based)
 *
 * @param {string} viewId - View ID
 * @param {number} index - Optional index offset
 * @returns {string} Hex color string
 */
export const getViewColor = (viewId, index = 0) => {
    if (!viewId) return VIEW_COLORS[0];
    const hash = viewId
        .split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return VIEW_COLORS[(hash + index) % VIEW_COLORS.length];
};
