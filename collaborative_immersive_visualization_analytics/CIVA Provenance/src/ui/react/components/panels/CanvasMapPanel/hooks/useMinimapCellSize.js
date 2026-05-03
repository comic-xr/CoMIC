/**
 * @file useMinimapCellSize.js
 * @description Hook for responsive minimap cell size calculation
 *
 * Calculates optimal cell size based on:
 * - Container dimensions
 * - Canvas grid size
 * - Zoom level
 * - Whether showing grid labels
 */

import { useMemo } from 'react';
import { MINIMAP_CONSTANTS } from '../utils/constants';

/**
 * useMinimapCellSize - Calculate responsive cell size
 *
 * @param {Object} options
 * @param {number} options.containerWidth - Available width in pixels
 * @param {number} options.containerHeight - Available height in pixels
 * @param {number} options.rows - Number of grid rows
 * @param {number} options.cols - Number of grid columns
 * @param {number} options.zoom - Zoom percentage (50-200)
 * @param {boolean} options.showLabels - Whether grid labels are shown
 * @param {Object} [options.focusedVG] - Focused VG (for responsive sizing)
 * @returns {Object} Cell sizing information
 */
export function useMinimapCellSize({
  containerWidth = 300,
  containerHeight = 300,
  rows = 4,
  cols = 4,
  zoom = 100,
  showLabels = true,
  focusedVG = null,
} = {}) {
  return useMemo(() => {
    const { GRID_GAP, HEADER_SIZE, SCROLL_PADDING } = MINIMAP_CONSTANTS;

    // Account for labels if shown
    const labelOffset = showLabels ? HEADER_SIZE : 0;
    const padding = SCROLL_PADDING * 2;
    const availableWidth = Math.max(0, containerWidth - labelOffset - padding);
    const availableHeight = Math.max(0, containerHeight - labelOffset - padding);

    const effectiveCols = focusedVG?.position?.colSpan || cols || 1;
    const effectiveRows = focusedVG?.position?.rowSpan || rows || 1;

    // Calculate cell size that would fit focused VG or full grid
    const maxCellWidth = (availableWidth - (effectiveCols - 1) * GRID_GAP) / effectiveCols;
    const maxCellHeight = (availableHeight - (effectiveRows - 1) * GRID_GAP) / effectiveRows;
    const fitCellSize = Math.floor(Math.min(maxCellWidth, maxCellHeight));

    // Clamp between min and max sizes
    const baseSize = Math.min(55, Math.max(20, fitCellSize));

    // Apply zoom
    const cellSize = Math.floor(baseSize * (zoom / 100));

    // Calculate total content dimensions
    const contentWidth = cols * cellSize + (cols - 1) * GRID_GAP;
    const contentHeight = rows * cellSize + (rows - 1) * GRID_GAP;

    // Determine if content overflows (needs panning)
    const overflowsWidth = contentWidth > availableWidth;
    const overflowsHeight = contentHeight > availableHeight;
    const needsPanning = overflowsWidth || overflowsHeight;

    // Calculate how much the content is scaled relative to fitting
    const scaleFactor = fitCellSize > 0 ? cellSize / fitCellSize : 1;

    return {
      // Cell dimensions
      cellSize,
      gap: GRID_GAP,
      headerSize: HEADER_SIZE,

      // Content dimensions
      contentWidth,
      contentHeight,
      totalWidth: contentWidth + labelOffset,
      totalHeight: contentHeight + labelOffset,

      // Available space
      availableWidth,
      availableHeight,

      // Overflow state
      overflowsWidth,
      overflowsHeight,
      needsPanning,

      // Fit calculations
      fitCellSize,
      scaleFactor,

      // Whether content fits without scrolling
      fitsInView: !needsPanning,
    };
  }, [containerWidth, containerHeight, rows, cols, zoom, showLabels, focusedVG]);
}

export default useMinimapCellSize;
