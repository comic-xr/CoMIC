// src/core/data/utils/flowLayoutEngine.js
// Flow layout engine for automatic view arrangement
//
// ARCHITECTURE:
// - Calculates optimal grid layout based on view count
// - Supports row and column flow directions
// - Auto-expands grid as views are added
// - Handles view removal and reflow

/**
 * Layout modes for canvas arrangement
 */
export const LAYOUT_MODES = {
  GRID: "grid", // Manual placement, cell merging, empty placeholders
  FLOW: "flow", // Auto-arrange, reflows on add/remove
};

/**
 * Flow directions for auto-layout
 */
export const FLOW_DIRECTIONS = {
  ROW: "row", // Fill left-to-right, wrap to new rows
  COLUMN: "column", // Fill top-to-bottom, wrap to new columns
};

/**
 * Calculate optimal grid dimensions for a given view count
 * @param {number} viewCount - Number of views to arrange
 * @returns {{ rows: number, cols: number }}
 */
export function calculateOptimalGrid(viewCount) {
  if (viewCount <= 0) return { rows: 1, cols: 1 };
  if (viewCount === 1) return { rows: 1, cols: 1 };
  if (viewCount === 2) return { rows: 1, cols: 2 };
  if (viewCount === 3) return { rows: 2, cols: 2 };
  if (viewCount === 4) return { rows: 2, cols: 2 };
  if (viewCount <= 6) return { rows: 2, cols: 3 };
  if (viewCount <= 9) return { rows: 3, cols: 3 };
  if (viewCount <= 12) return { rows: 3, cols: 4 };
  if (viewCount <= 16) return { rows: 4, cols: 4 };

  // For larger counts, use roughly square grid
  const cols = Math.ceil(Math.sqrt(viewCount));
  const rows = Math.ceil(viewCount / cols);
  return { rows, cols };
}

/**
 * Calculate placement positions for views in flow mode
 * @param {number} viewCount - Number of views to position
 * @param {string} direction - FLOW_DIRECTIONS.ROW or FLOW_DIRECTIONS.COLUMN
 * @returns {Array<{ row: number, col: number }>}
 */
export function calculateFlowPositions(
  viewCount,
  direction = FLOW_DIRECTIONS.ROW
) {
  const grid = calculateOptimalGrid(viewCount);
  const positions = [];

  for (let i = 0; i < viewCount; i++) {
    if (direction === FLOW_DIRECTIONS.ROW) {
      // Fill left-to-right, then wrap to new row
      const row = Math.floor(i / grid.cols);
      const col = i % grid.cols;
      positions.push({ row, col });
    } else {
      // Fill top-to-bottom, then wrap to new column
      const col = Math.floor(i / grid.rows);
      const row = i % grid.rows;
      positions.push({ row, col });
    }
  }

  return positions;
}

/**
 * Calculate special layout for 3 views (2 + 1 spanning)
 * @param {string} direction - Flow direction
 * @returns {Array<{ row: number, col: number, rowSpan: number, colSpan: number }>}
 */
export function calculateThreeViewLayout(direction = FLOW_DIRECTIONS.ROW) {
  if (direction === FLOW_DIRECTIONS.ROW) {
    return [
      { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 0, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 0, rowSpan: 1, colSpan: 2 }, // Bottom spanning both columns
    ];
  } else {
    return [
      { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 0, col: 1, rowSpan: 2, colSpan: 1 }, // Right side spanning both rows
    ];
  }
}

/**
 * Calculate flow layout placements for views
 * @param {Array<string>} viewIds - Array of view configuration IDs
 * @param {string} direction - Flow direction
 * @param {Object} options - Additional options
 * @returns {Array<{ row, col, rowSpan, colSpan, viewConfigurationId }>}
 */
export function calculateFlowLayout(
  viewIds,
  direction = FLOW_DIRECTIONS.ROW,
  options = {}
) {
  const viewCount = viewIds.length;

  if (viewCount === 0) {
    return [];
  }

  // Special case for 3 views with spanning
  if (viewCount === 3 && options.useSpanning !== false) {
    const layout = calculateThreeViewLayout(direction);
    return layout.map((pos, i) => ({
      ...pos,
      viewConfigurationId: viewIds[i],
    }));
  }

  // Standard flow layout
  const positions = calculateFlowPositions(viewCount, direction);
  return positions.map((pos, i) => ({
    row: pos.row,
    col: pos.col,
    rowSpan: 1,
    colSpan: 1,
    viewConfigurationId: viewIds[i],
  }));
}

/**
 * Calculate the next position for adding a view in flow mode
 * @param {number} currentViewCount - Current number of views
 * @param {string} direction - Flow direction
 * @returns {{ row: number, col: number, needsExpansion: boolean, newDimensions?: { rows: number, cols: number } }}
 */
export function calculateNextFlowPosition(
  currentViewCount,
  direction = FLOW_DIRECTIONS.ROW
) {
  const newCount = currentViewCount + 1;
  const currentGrid = calculateOptimalGrid(currentViewCount);
  const newGrid = calculateOptimalGrid(newCount);

  const needsExpansion =
    newGrid.rows > currentGrid.rows || newGrid.cols > currentGrid.cols;

  const positions = calculateFlowPositions(newCount, direction);
  const nextPos = positions[positions.length - 1];

  return {
    row: nextPos.row,
    col: nextPos.col,
    needsExpansion,
    newDimensions: needsExpansion ? newGrid : undefined,
  };
}

/**
 * Reflow all views after removal
 * @param {Array<{ id, viewConfigurationId }>} placements - Current placements with views
 * @param {string} direction - Flow direction
 * @returns {Array<{ id, row, col, rowSpan, colSpan }>}
 */
export function reflowPlacements(placements, direction = FLOW_DIRECTIONS.ROW) {
  const viewPlacements = placements.filter((p) => p.viewConfigurationId);
  const viewCount = viewPlacements.length;

  if (viewCount === 0) {
    return [];
  }

  // Special handling for 3 views
  if (viewCount === 3) {
    const layout = calculateThreeViewLayout(direction);
    return viewPlacements.map((p, i) => ({
      id: p.id,
      row: layout[i].row,
      col: layout[i].col,
      rowSpan: layout[i].rowSpan,
      colSpan: layout[i].colSpan,
    }));
  }

  // Standard reflow
  const positions = calculateFlowPositions(viewCount, direction);
  return viewPlacements.map((p, i) => ({
    id: p.id,
    row: positions[i].row,
    col: positions[i].col,
    rowSpan: 1,
    colSpan: 1,
  }));
}

/**
 * Calculate minimum required grid dimensions after reflow
 * @param {number} viewCount - Number of views
 * @returns {{ rows: number, cols: number }}
 */
export function calculateMinimumDimensions(viewCount) {
  return calculateOptimalGrid(viewCount);
}

/**
 * Check if grid needs to shrink after view removal
 * @param {{ rows: number, cols: number }} currentDimensions - Current grid size
 * @param {number} viewCount - Current view count
 * @returns {{ shouldShrink: boolean, newDimensions?: { rows: number, cols: number } }}
 */
export function checkForGridShrink(currentDimensions, viewCount) {
  const optimal = calculateOptimalGrid(viewCount);

  const shouldShrink =
    optimal.rows < currentDimensions.rows ||
    optimal.cols < currentDimensions.cols;

  return {
    shouldShrink,
    newDimensions: shouldShrink ? optimal : undefined,
  };
}

/**
 * FlowLayoutEngine class for managing flow-based layouts
 */
export class FlowLayoutEngine {
  constructor(options = {}) {
    this.direction = options.direction || FLOW_DIRECTIONS.ROW;
    this.useSpanning = options.useSpanning !== false;
  }

  /**
   * Set the flow direction
   * @param {string} direction - FLOW_DIRECTIONS.ROW or FLOW_DIRECTIONS.COLUMN
   */
  setDirection(direction) {
    this.direction = direction;
  }

  /**
   * Calculate layout for views
   * @param {Array<string>} viewIds - View IDs to layout
   * @returns {Array<{ row, col, rowSpan, colSpan, viewConfigurationId }>}
   */
  calculateLayout(viewIds) {
    return calculateFlowLayout(viewIds, this.direction, {
      useSpanning: this.useSpanning,
    });
  }

  /**
   * Get the next position for a new view
   * @param {number} currentViewCount - Current view count
   * @returns {{ row, col, needsExpansion, newDimensions? }}
   */
  getNextPosition(currentViewCount) {
    return calculateNextFlowPosition(currentViewCount, this.direction);
  }

  /**
   * Reflow placements after changes
   * @param {Array} placements - Current placements
   * @returns {Array<{ id, row, col, rowSpan, colSpan }>}
   */
  reflow(placements) {
    return reflowPlacements(placements, this.direction);
  }

  /**
   * Get optimal grid dimensions for view count
   * @param {number} viewCount - Number of views
   * @returns {{ rows, cols }}
   */
  getOptimalDimensions(viewCount) {
    return calculateOptimalGrid(viewCount);
  }
}

export default FlowLayoutEngine;
