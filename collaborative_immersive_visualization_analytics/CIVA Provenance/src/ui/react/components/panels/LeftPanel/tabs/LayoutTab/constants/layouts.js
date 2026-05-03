/**
 * @file layouts.js
 * @description Constants for Layout Tab V4.6
 *
 * Defines built-in layouts, ViewGroup colors, and view types.
 */

// =============================================================================
// BUILT-IN LAYOUTS
// =============================================================================

/**
 * Built-in layout configurations
 * @type {Array<{id: string, name: string, rows: number, cols: number, merged?: string}>}
 */
export const BUILTIN_LAYOUTS = [
    { id: 'single', name: 'Single', rows: 1, cols: 1 },
    { id: 'side-by-side', name: 'Side by Side', rows: 1, cols: 2 },
    { id: 'stacked', name: 'Stacked', rows: 2, cols: 1 },
    { id: '2x2', name: '2×2 Grid', rows: 2, cols: 2 },
    { id: '1+2', name: '1 + 2', rows: 2, cols: 2, merged: 'top' },
    { id: '2+1', name: '2 + 1', rows: 2, cols: 2, merged: 'right' },
    { id: '3-up', name: '3-up', rows: 1, cols: 3 },
    { id: '3x3', name: '3×3 Grid', rows: 3, cols: 3 },
];

// =============================================================================
// VIEWGROUP COLORS
// =============================================================================

/**
 * Color palette for ViewGroups
 * @type {string[]}
 */
export const VIEWGROUP_COLORS = [
    '#a855f7', // purple
    '#3b82f6', // blue
    '#22c55e', // green
    '#f59e0b', // amber
    '#ec4899', // pink
    '#22d3ee', // cyan
    '#f97316', // orange
    '#14b8a6', // teal
];

// =============================================================================
// VIEW TYPES
// =============================================================================

/**
 * View type definitions with colors and icons
 * @type {Object}
 */
export const VIEW_TYPES = {
    vtk: {
        id: 'vtk',
        name: 'VTK',
        color: '#22d3ee',
        icon: 'box',
    },
    slice: {
        id: 'slice',
        name: 'Slice',
        color: '#3b82f6',
        icon: 'layers',
    },
    volume: {
        id: 'volume',
        name: 'Volume',
        color: '#a855f7',
        icon: 'cube',
    },
    data: {
        id: 'data',
        name: 'Data',
        color: '#22c55e',
        icon: 'table',
    },
    chart: {
        id: 'chart',
        name: 'Chart',
        color: '#f59e0b',
        icon: 'barChart',
    },
    notes: {
        id: 'notes',
        name: 'Notes',
        color: '#ec4899',
        icon: 'fileText',
    },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the capacity (number of cells) for a layout
 * @param {Object} layout - Layout configuration
 * @returns {number} Number of cells in the layout
 */
export function getLayoutCapacity(layout) {
    if (!layout) return 1;
    // Merged layouts (1+2, 2+1) have 3 cells
    if (layout.merged === 'top' || layout.merged === 'right') return 3;
    return layout.rows * layout.cols;
}

/**
 * Get layout by ID
 * @param {string} layoutId - Layout ID
 * @param {Array} customLayouts - Custom layouts to include in search
 * @returns {Object|null} Layout configuration or null
 */
export function getLayoutById(layoutId, customLayouts = []) {
    return BUILTIN_LAYOUTS.find(l => l.id === layoutId)
        || customLayouts.find(l => l.id === layoutId)
        || null;
}

/**
 * Get next color for a new ViewGroup
 * @param {number} index - Index of the ViewGroup
 * @returns {string} Color hex value
 */
export function getViewGroupColor(index) {
    return VIEWGROUP_COLORS[index % VIEWGROUP_COLORS.length];
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a new ViewGroup
 * @param {Object} options - ViewGroup options
 * @returns {Object} ViewGroup object
 */
export function createViewGroup({
    id,
    name,
    layoutId = 'single',
    views = [],
    color,
    linkedTo = null,
}) {
    return {
        id,
        name,
        layoutId,
        views,
        color,
        linkedTo,
    };
}

/**
 * Create a new View
 * @param {Object} options - View options
 * @returns {Object} View object
 */
export function createView({
    id,
    type,
    name,
    datasetId = null,
    config = null,
}) {
    return {
        id,
        type,
        name,
        datasetId,
        config,
    };
}

/**
 * Create a new Viewport
 * @param {Object} options - Viewport options
 * @returns {Object} Viewport object
 */
export function createViewport({
    id,
    name,
    userId,
    position = { row: 0, col: 0 },
    size = { rows: 1, cols: 1 },
    mode = 'snap',
    snappedTo = null,
    isPrimary = false,
    isShared = false,
}) {
    return {
        id,
        name,
        userId,
        position,
        size,
        mode,
        snappedTo,
        isPrimary,
        isShared,
    };
}

/**
 * Create default canvas configuration
 * @param {Object} options - Canvas options
 * @returns {Object} Canvas object
 */
export function createCanvas({
    rows = 4,
    cols = 4,
    viewGroupPositions = [],
} = {}) {
    return {
        rows,
        cols,
        viewGroupPositions,
    };
}

/**
 * Create a ViewGroup position on canvas
 * @param {Object} options - Position options
 * @returns {Object} ViewGroupPosition object
 */
export function createViewGroupPosition({
    viewGroupId,
    row = 0,
    col = 0,
    rowSpan = 1,
    colSpan = 1,
}) {
    return {
        viewGroupId,
        row,
        col,
        rowSpan,
        colSpan,
    };
}
