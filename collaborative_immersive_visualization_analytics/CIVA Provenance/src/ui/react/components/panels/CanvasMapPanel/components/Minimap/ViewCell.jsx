/**
 * @file ViewCell.jsx
 * @description Individual view cell on minimap (View display mode)
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { VIEW_TYPES } from '../../utils/constants';
import { formatCellRef } from '../../utils/gridUtils';

/**
 * ViewCell - Individual view on minimap
 *
 * @param {Object} props
 * @param {Object} props.view - Flattened view data with canvas position
 * @param {number} props.cellSize - Size of each cell in pixels
 * @param {boolean} props.isSelected - Whether this view's VG is selected
 * @param {Function} props.onClick - Click handler
 */
export const ViewCell = memo(function ViewCell({
  view,
  cellSize,
  gap = 4,
  isSelected,
  onClick,
}) {
  const viewType = VIEW_TYPES[view.type] || VIEW_TYPES.data;
  const showName = cellSize >= 50;
  const left = (view.canvasCol || 0) * (cellSize + gap);
  const top = (view.canvasRow || 0) * (cellSize + gap);

  return (
    <div
      className={`view-cell ${isSelected ? 'view-cell--selected' : ''}`}
      style={{
        left,
        top,
        '--view-color': view.vgColor || `var(--accent-${viewType.color})`,
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      title={`${view.name}\n${formatCellRef(view.canvasRow, view.canvasCol)}\n${viewType.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <Icon name={viewType.icon} size={cellSize > 36 ? 16 : 12} className="view-cell__icon" />
      {showName && (
        <span className="view-cell__name">{view.name}</span>
      )}
    </div>
  );
});

export default ViewCell;
