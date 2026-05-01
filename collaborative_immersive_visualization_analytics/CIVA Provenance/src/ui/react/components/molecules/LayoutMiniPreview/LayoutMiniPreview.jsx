/**
 * @file LayoutMiniPreview.jsx
 * @description Tiny pixel-art layout preview (max 18x18px)
 *
 * Renders a miniature representation of a grid layout:
 * - Filled cells = occupied/active
 * - Empty cells = available slots
 * - Supports merged layouts (1+2, 2+1)
 *
 * Use cases:
 * - ViewGroup layout previews in lists
 * - Grid template previews
 * - Any compact grid visualization
 */

import React, { memo, useMemo } from 'react';
import './LayoutMiniPreview.scss';

/**
 * Default layout configurations
 * Can be overridden via the layouts prop
 */
export const DEFAULT_LAYOUTS = {
  'single': { rows: 1, cols: 1, cells: 1 },
  'side-by-side': { rows: 1, cols: 2, cells: 2 },
  'stacked': { rows: 2, cols: 1, cells: 2 },
  '2x2': { rows: 2, cols: 2, cells: 4 },
  '1+2': { rows: 2, cols: 2, cells: 3, merged: 'top' },
  '2+1': { rows: 2, cols: 2, cells: 3, merged: 'right' },
  '3x3': { rows: 3, cols: 3, cells: 9 },
  '1x3': { rows: 1, cols: 3, cells: 3 },
  '3x1': { rows: 3, cols: 1, cells: 3 },
};

/**
 * LayoutMiniPreview - Pixel art layout representation
 *
 * @param {Object} props
 * @param {string} [props.layoutId] - Layout identifier ('single', '2x2', '1+2', etc.)
 * @param {number} [props.rows] - Grid rows (used when layoutId doesn't match a predefined layout)
 * @param {number} [props.cols] - Grid columns (used when layoutId doesn't match a predefined layout)
 * @param {string} props.color - Color for filled cells (CSS color value)
 * @param {number} [props.filledCount] - Number of cells to show as filled
 * @param {number} [props.viewCount] - Alias for filledCount (for backwards compatibility)
 * @param {number} [props.size=16] - Total size in pixels
 * @param {Object} [props.layouts] - Custom layouts config (defaults to DEFAULT_LAYOUTS)
 * @param {string} [props.className] - Additional CSS classes
 */
export const LayoutMiniPreview = memo(function LayoutMiniPreview({
  layoutId,
  rows: propRows,
  cols: propCols,
  color,
  filledCount,
  viewCount, // Alias for filledCount
  size = 16,
  layouts = DEFAULT_LAYOUTS,
  className = '',
}) {
  // Support viewCount as alias for filledCount
  const effectiveFilledCount = filledCount ?? viewCount;

  // Determine layout from layoutId or generate from rows/cols
  const layout = useMemo(() => {
    // First try to find a predefined layout
    if (layoutId && layouts[layoutId]) {
      return layouts[layoutId];
    }
    // Generate dynamic layout from rows/cols
    if (propRows && propCols) {
      const totalCells = propRows * propCols;
      return { rows: propRows, cols: propCols, cells: totalCells };
    }
    // Default fallback
    return layouts.single || DEFAULT_LAYOUTS.single;
  }, [layoutId, propRows, propCols, layouts]);

  const gap = 1;

  /**
   * Calculate cell positions based on layout type
   */
  const cells = useMemo(() => {
    const result = [];
    const { rows, cols, merged, cells: totalCells } = layout;

    // Calculate cell dimensions
    const cellWidth = (size - (cols - 1) * gap) / cols;
    const cellHeight = (size - (rows - 1) * gap) / rows;

    // Handle merged layouts specially
    if (merged === 'top') {
      // 1+2 layout: top spans both columns, bottom has two cells
      // Top cell (spans full width)
      result.push({
        x: 0,
        y: 0,
        width: size,
        height: cellHeight,
        filled: effectiveFilledCount > 0,
      });
      // Bottom left
      result.push({
        x: 0,
        y: cellHeight + gap,
        width: cellWidth,
        height: cellHeight,
        filled: effectiveFilledCount > 1,
      });
      // Bottom right
      result.push({
        x: cellWidth + gap,
        y: cellHeight + gap,
        width: cellWidth,
        height: cellHeight,
        filled: effectiveFilledCount > 2,
      });
    } else if (merged === 'right') {
      // 2+1 layout: left has two cells, right spans both rows
      // Left top
      result.push({
        x: 0,
        y: 0,
        width: cellWidth,
        height: cellHeight,
        filled: effectiveFilledCount > 0,
      });
      // Left bottom
      result.push({
        x: 0,
        y: cellHeight + gap,
        width: cellWidth,
        height: cellHeight,
        filled: effectiveFilledCount > 1,
      });
      // Right (spans full height)
      result.push({
        x: cellWidth + gap,
        y: 0,
        width: cellWidth,
        height: size,
        filled: effectiveFilledCount > 2,
      });
    } else {
      // Standard grid layout
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cellIndex = r * cols + c;
          if (cellIndex < totalCells) {
            result.push({
              x: c * (cellWidth + gap),
              y: r * (cellHeight + gap),
              width: cellWidth,
              height: cellHeight,
              filled: cellIndex < effectiveFilledCount,
            });
          }
        }
      }
    }

    return result;
  }, [layout, size, effectiveFilledCount, gap]);

  const classList = [
    'layout-mini-preview',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classList}
      style={{
        width: size,
        height: size,
        '--preview-color': color,
      }}
    >
      {cells.map((cell, i) => (
        <div
          key={i}
          className={`layout-mini-preview__cell ${cell.filled ? 'layout-mini-preview__cell--filled' : ''}`}
          style={{
            left: cell.x,
            top: cell.y,
            width: cell.width,
            height: cell.height,
          }}
        />
      ))}
    </div>
  );
});

export default LayoutMiniPreview;
