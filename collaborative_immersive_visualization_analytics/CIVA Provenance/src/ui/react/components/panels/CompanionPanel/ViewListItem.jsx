/**
 * @file ViewListItem.jsx
 * @description View list item for companion panel
 *
 * Features:
 * - Displays view name, type, and optional dataset/VG info
 * - Non-blocking usage indicators (shows count, doesn't disable)
 * - Drag-and-drop support
 * - Keyboard accessible
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * Default view type definitions
 */
const DEFAULT_VIEW_TYPES = {
  volume: { icon: 'box', color: 'purple', name: 'Volume' },
  slice: { icon: 'layers', color: 'blue', name: 'Slice' },
  data: { icon: 'barChart', color: 'green', name: 'Data' },
  chart: { icon: 'lineChart', color: 'amber', name: 'Chart' },
  notes: { icon: 'fileText', color: 'pink', name: 'Notes' },
};

/**
 * ViewListItem - Individual view in companion panel
 *
 * @param {Object} props
 * @param {Object} props.view - View data
 * @param {string} [props.datasetName] - Parent dataset name (shown in subtitle)
 * @param {string} [props.vgColor] - Parent VG color (for left border accent)
 * @param {boolean} [props.isSelected] - Whether view is selected
 * @param {boolean} [props.disabled] - Whether view is disabled (e.g., incompatible type)
 * @param {Function} props.onClick - Click handler
 * @param {Function} [props.onDragStart] - Drag start handler
 * @param {Function} [props.onDragEnd] - Drag end handler
 * @param {Object} [props.viewTypes] - Custom view type definitions
 * @param {number} [props.useCount] - Number of times view is in use (0 = not in use)
 * @param {string} [props.usageLabel='In Use'] - Label for usage badge
 */
export const ViewListItem = memo(function ViewListItem({
  view,
  datasetName,
  vgColor,
  isSelected,
  disabled,
  onClick,
  onDragStart,
  onDragEnd,
  viewTypes = DEFAULT_VIEW_TYPES,
  useCount = 0,
  usageLabel = 'In Use',
}) {
  const viewType = viewTypes[view.type] || viewTypes.data || DEFAULT_VIEW_TYPES.data;
  const isInUse = useCount > 0;

  const handleClick = () => {
    if (!disabled) {
      onClick?.(view);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      onClick?.(view);
    }
  };

  const handleDragStart = (e) => {
    if (!disabled && onDragStart) {
      onDragStart(e, view);
    }
  };

  const handleDragEnd = (e) => {
    onDragEnd?.(e, view);
  };

  return (
    <div
      className={`view-list-item ${isSelected ? 'view-list-item--selected' : ''} ${disabled ? 'view-list-item--disabled' : ''}`}
      style={{ '--view-color': vgColor || `var(--accent-${viewType.color})` }}
      onClick={handleClick}
      draggable={!disabled && !!onDragStart}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      aria-disabled={disabled}
    >
      {/* Drag handle (only show if draggable) */}
      {onDragStart && !disabled && (
        <Icon name="gripVertical" size={12} className="view-list-item__grip" />
      )}

      {/* Type icon */}
      <Icon name={viewType.icon} size={14} className="view-list-item__icon" />

      {/* Info */}
      <div className="view-list-item__info">
        <span className="view-list-item__name">{view.name}</span>
        {datasetName && (
          <span className="view-list-item__dataset">{datasetName}</span>
        )}
      </div>

      {/* Usage indicator (non-blocking, informational) */}
      {isInUse && (
        <span className="view-list-item__usage" title={`${usageLabel}: ${useCount}`}>
          {useCount > 1 ? `x${useCount}` : usageLabel}
        </span>
      )}

      {/* Type label */}
      <span className="view-list-item__type">{viewType.name}</span>
    </div>
  );
});

export default ViewListItem;
