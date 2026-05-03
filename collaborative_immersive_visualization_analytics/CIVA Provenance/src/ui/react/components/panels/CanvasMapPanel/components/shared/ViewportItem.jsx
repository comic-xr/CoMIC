/**
 * @file ViewportItem.jsx
 * @description Viewport list item for user viewports
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { formatRangeRef } from '../../utils/gridUtils';

/**
 * ViewportItem - User viewport list item
 *
 * @param {Object} props
 * @param {Object} props.viewport - Viewport data
 * @param {boolean} props.isSelected - Whether this viewport is selected
 * @param {Function} props.onClick - Click handler
 * @param {Function} [props.onDelete] - Delete handler
 * @param {Function} [props.onSetPrimary] - Set as primary handler
 */
export const ViewportItem = memo(function ViewportItem({
  viewport,
  isSelected,
  onClick,
  onDelete,
  onSetPrimary,
}) {
  const { name, position, size, isPrimary, syncMode } = viewport;

  return (
    <div
      className={`viewport-item ${isSelected ? 'viewport-item--selected' : ''}`}
      onClick={() => onClick?.(viewport.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(viewport.id);
        }
      }}
    >
      {/* Primary indicator */}
      {isPrimary && (
        <Icon name="star" size={12} className="viewport-item__primary" />
      )}

      {/* Name */}
      <span className="viewport-item__name">{name}</span>

      {/* Sync mode indicator */}
      {syncMode && (
        <span className={`viewport-item__sync viewport-item__sync--${syncMode}`}>
          {syncMode === 'broadcast' && <Icon name="radio" size={10} />}
          {syncMode === 'follow' && <Icon name="eye" size={10} />}
          {syncMode === 'bidirectional' && <Icon name="refreshCw" size={10} />}
        </span>
      )}

      {/* Position */}
      <span className="viewport-item__position">
        {formatRangeRef(position.row, position.col, size.rows, size.cols)}
      </span>

      {/* Actions */}
      {!isPrimary && onSetPrimary && (
        <button
          className="viewport-item__action"
          onClick={(e) => {
            e.stopPropagation();
            onSetPrimary(viewport.id);
          }}
          title="Set as primary"
        >
          <Icon name="star" size={10} />
        </button>
      )}

      {!isPrimary && onDelete && (
        <button
          className="viewport-item__action viewport-item__action--delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(viewport.id);
          }}
          title="Delete viewport"
        >
          <Icon name="x" size={10} />
        </button>
      )}
    </div>
  );
});

export default ViewportItem;
