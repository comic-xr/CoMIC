/**
 * @file MinimapGrid.jsx
 * @description Grid background and labels for Minimap
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { colToLetter } from '../../utils/gridUtils';
import { MAP_MODES } from '../../utils/constants';

/**
 * MinimapGrid - Grid cells with labels and markers
 *
 * @param {Object} props
 * @param {number} props.rows - Number of rows
 * @param {number} props.cols - Number of columns
 * @param {number} props.cellSize - Cell size in pixels
 * @param {number} props.gap - Gap between cells
 * @param {boolean} props.showLabels - Whether to show column/row labels
 * @param {Object} [props.homePosition] - Home position { row, col }
 * @param {Array} [props.bookmarks] - Bookmark positions
 * @param {boolean} props.showBookmarks - Whether to show bookmark markers
 * @param {string} props.mapMode - Current map mode
 */
export const MinimapGrid = memo(function MinimapGrid({
  rows,
  cols,
  cellSize,
  gap,
  showLabels,
  homePosition,
  bookmarks = [],
  showBookmarks,
  mapMode,
}) {
  return (
    <div className="minimap-grid">
      {/* Column headers (A, B, C...) */}
      {showLabels && (
        <div className="minimap-grid__col-headers">
          {Array.from({ length: cols }).map((_, col) => (
            <div
              key={`col-${col}`}
              className="minimap-grid__col-header"
              style={{ width: cellSize }}
            >
              {colToLetter(col)}
            </div>
          ))}
        </div>
      )}

      {/* Main grid area */}
      <div className="minimap-grid__area">
        {/* Row labels (1, 2, 3...) */}
        {showLabels && (
          <div className="minimap-grid__row-headers">
            {Array.from({ length: rows }).map((_, row) => (
              <div
                key={`row-${row}`}
                className="minimap-grid__row-header"
                style={{ height: cellSize }}
              >
                {row + 1}
              </div>
            ))}
          </div>
        )}

        {/* Grid cells */}
        <div
          className="minimap-grid__cells"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
            gap: `${gap}px`,
          }}
        >
          {Array.from({ length: rows * cols }).map((_, i) => {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const isHome = row === homePosition?.row && col === homePosition?.col;
            const bookmark = bookmarks.find(
              b => b.position.row === row && b.position.col === col
            );

            return (
              <div
                key={`cell-${row}-${col}`}
                className="minimap-grid__cell"
                data-row={row}
                data-col={col}
              >
                {isHome && mapMode === MAP_MODES.NAVIGATE && (
                  <Icon name="home" size={10} className="minimap-grid__home-icon" />
                )}
                {bookmark && mapMode === MAP_MODES.NAVIGATE && showBookmarks && (
                  <Icon
                    name={bookmark.isStarred ? 'star' : 'bookmark'}
                    size={10}
                    className="minimap-grid__bookmark-icon"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default MinimapGrid;
