/**
 * @file VGBlock.jsx
 * @description ViewGroup block on minimap (VG display mode)
 *
 * Visual States:
 * - Default: 25% opacity fill, 80% opacity border
 * - Selected: 40% opacity fill, 100% border, glow shadow
 * - Ghosted (links mode): 10% opacity fill, 30% border, 40% overall opacity
 * - Explicit: Solid border
 * - Implicit: Dashed border
 */

import React, { memo, useMemo } from 'react';
import { LAYOUTS } from '../../utils/constants';
import { getVGDisplayName } from '../../utils/gridUtils';

/**
 * VGBlock - ViewGroup on minimap
 *
 * @param {Object} props
 * @param {Object} props.vg - ViewGroup data
 * @param {string} [props.displayName] - Pre-computed display name
 * @param {number} props.cellSize - Size of each cell in pixels
 * @param {number} props.gap - Gap between cells
 * @param {boolean} props.isSelected - Whether this VG is selected
 * @param {boolean} props.isGhosted - Whether to show ghosted (for links mode)
 * @param {boolean} props.showInternals - Whether to show internal layout grid
 * @param {boolean} [props.subtle=false] - Subtle mode: thinner borders, no fill, click-through
 *   Used when showing both VG outlines AND views (views take priority for interaction)
 * @param {Function} props.onClick - Click handler
 * @param {Function} props.onDoubleClick - Double-click handler
 */
export const VGBlock = memo(function VGBlock({
  vg,
  displayName,
  cellSize,
  gap = 4,
  isSelected,
  isGhosted,
  showInternals,
  subtle = false,
  onClick,
  onDoubleClick,
}) {
  const name = displayName || getVGDisplayName(vg);
  const layout = LAYOUTS[vg.layoutId] || LAYOUTS.single;
  const { position, color, isExplicit, views = [] } = vg;

  // Calculate position and size
  const style = useMemo(() => {
    const left = position.col * (cellSize + gap);
    const top = position.row * (cellSize + gap);
    return {
      left,
      top,
      '--vg-color': color,
      '--vg-width': `${position.colSpan * cellSize + (position.colSpan - 1) * gap}px`,
      '--vg-height': `${position.rowSpan * cellSize + (position.rowSpan - 1) * gap}px`,
    };
  }, [position, cellSize, color, gap]);

  // Calculate internal grid cells
  const internalCells = useMemo(() => {
    if (!showInternals) return [];

    const cells = [];
    const { rows, cols, merged } = layout;
    const padding = 4;
    const internalGap = 2;
    const internalWidth = position.colSpan * cellSize + (position.colSpan - 1) * gap - padding * 2;
    const internalHeight = position.rowSpan * cellSize + (position.rowSpan - 1) * gap - padding * 2;
    const cellWidth = (internalWidth - (cols - 1) * internalGap) / cols;
    const cellHeight = (internalHeight - (rows - 1) * internalGap) / rows;

    if (merged === 'top') {
      // 1+2 layout
      cells.push({
        x: padding,
        y: padding,
        width: internalWidth,
        height: cellHeight,
        filled: views.length > 0,
      });
      cells.push({
        x: padding,
        y: padding + cellHeight + internalGap,
        width: cellWidth,
        height: cellHeight,
        filled: views.length > 1,
      });
      cells.push({
        x: padding + cellWidth + internalGap,
        y: padding + cellHeight + internalGap,
        width: cellWidth,
        height: cellHeight,
        filled: views.length > 2,
      });
    } else if (merged === 'right') {
      // 2+1 layout
      cells.push({
        x: padding,
        y: padding,
        width: cellWidth,
        height: cellHeight,
        filled: views.length > 0,
      });
      cells.push({
        x: padding,
        y: padding + cellHeight + internalGap,
        width: cellWidth,
        height: cellHeight,
        filled: views.length > 1,
      });
      cells.push({
        x: padding + cellWidth + internalGap,
        y: padding,
        width: cellWidth,
        height: internalHeight,
        filled: views.length > 2,
      });
    } else {
      // Standard grid
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          if (idx < layout.cells) {
            cells.push({
              x: padding + c * (cellWidth + internalGap),
              y: padding + r * (cellHeight + internalGap),
              width: cellWidth,
              height: cellHeight,
              filled: idx < views.length,
            });
          }
        }
      }
    }

    return cells;
  }, [showInternals, layout, position, cellSize, gap, views.length]);

  return (
    <div
      className={`vg-block
        ${isSelected ? 'vg-block--selected' : ''}
        ${isGhosted ? 'vg-block--ghosted' : ''}
        ${!isExplicit ? 'vg-block--implicit' : ''}
        ${subtle ? 'vg-block--subtle' : ''}`}
      style={style}
      onClick={subtle ? undefined : onClick}
      onDoubleClick={subtle ? undefined : onDoubleClick}
      role={subtle ? undefined : 'button'}
      tabIndex={subtle ? -1 : 0}
      title={`${name} (${position.rowSpan}x${position.colSpan})`}
      onKeyDown={subtle ? undefined : (e) => {
        if (e.key === 'Enter') onClick?.();
        if (e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Name label */}
      <span className="vg-block__name">{name}</span>

      {/* Internal layout grid */}
      {showInternals && internalCells.length > 0 && (
        <div className="vg-block__internals">
          {internalCells.map((cell, i) => (
            <div
              key={i}
              className={`vg-block__internal-cell ${cell.filled ? 'vg-block__internal-cell--filled' : ''}`}
              style={{
                left: cell.x,
                top: cell.y,
                width: cell.width,
                height: cell.height,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default VGBlock;
