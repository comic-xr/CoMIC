/**
 * @file DatasetItem.jsx
 * @description Dataset list item for companion panel
 *
 * Features:
 * - Collapsible tree view with nested views
 * - Drag-and-drop support for datasets
 * - Shows dataset metadata (type, size, view count)
 * - Keyboard accessible
 */

import React, { memo, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { ViewListItem } from './ViewListItem';

/**
 * Dataset type icons
 */
const DATASET_TYPE_ICONS = {
  dicom: 'activity',
  volume: 'box',
  mesh: 'cube',
  csv: 'fileSpreadsheet',
  json: 'fileJson',
  image: 'image',
  default: 'database',
};

/**
 * DatasetItem - Dataset in companion panel with collapsible views
 *
 * @param {Object} props
 * @param {Object} props.dataset - Dataset data
 * @param {boolean} props.isExpanded - Whether children are expanded
 * @param {Function} props.onToggle - Toggle expand handler
 * @param {Function} props.onClick - Click handler
 * @param {Function} [props.onDragStart] - Drag start handler
 * @param {Function} [props.onDragEnd] - Drag end handler
 * @param {Object} [props.viewTypes] - View type definitions (passed to nested ViewListItems)
 * @param {Function} [props.onViewClick] - Handler for clicking a nested view
 * @param {Function} [props.onViewDragStart] - Handler for dragging a nested view
 */
export const DatasetItem = memo(function DatasetItem({
  dataset,
  isExpanded,
  onToggle,
  onClick,
  onDragStart,
  onDragEnd,
  viewTypes,
  onViewClick,
  onViewDragStart,
}) {
  const icon = DATASET_TYPE_ICONS[dataset.type] || DATASET_TYPE_ICONS.default;
  const hasViews = dataset.views && dataset.views.length > 0;
  const hasChildren = dataset.children && dataset.children.length > 0;
  const hasExpandableContent = hasViews || hasChildren;
  const viewCount = dataset.viewCount ?? dataset.views?.length ?? 0;

  const handleToggle = useCallback(
    (e) => {
      e.stopPropagation();
      onToggle?.(dataset.id);
    },
    [dataset.id, onToggle]
  );

  const handleClick = useCallback(() => {
    onClick?.(dataset);
  }, [dataset, onClick]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.(dataset);
      } else if (e.key === 'ArrowRight' && !isExpanded && hasExpandableContent) {
        e.preventDefault();
        onToggle?.(dataset.id);
      } else if (e.key === 'ArrowLeft' && isExpanded) {
        e.preventDefault();
        onToggle?.(dataset.id);
      }
    },
    [dataset, onClick, onToggle, isExpanded, hasExpandableContent]
  );

  const handleDragStart = (e) => {
    if (onDragStart) {
      onDragStart(e, dataset);
    }
  };

  const handleDragEnd = (e) => {
    onDragEnd?.(e, dataset);
  };

  return (
    <div className="dataset-item" data-expanded={isExpanded}>
      {/* Dataset header row */}
      <div
        className="dataset-item__header"
        onClick={handleClick}
        draggable={!!onDragStart}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        role="treeitem"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-expanded={hasExpandableContent ? isExpanded : undefined}
      >
        {/* Expand/collapse toggle */}
        {hasExpandableContent ? (
          <button
            className="dataset-item__toggle"
            onClick={handleToggle}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            type="button"
          >
            <Icon name={isExpanded ? 'chevronDown' : 'chevronRight'} size={12} />
          </button>
        ) : (
          <span className="dataset-item__toggle-spacer" />
        )}

        {/* Dataset type icon */}
        <Icon name={icon} size={14} className="dataset-item__icon" />

        {/* Dataset name */}
        <span className="dataset-item__name">{dataset.name}</span>

        {/* View count badge */}
        {viewCount > 0 && (
          <span className="dataset-item__view-count" title={`${viewCount} view${viewCount !== 1 ? 's' : ''}`}>
            {viewCount}v
          </span>
        )}

        {/* Size info */}
        {dataset.size && <span className="dataset-item__size">{dataset.size}</span>}
      </div>

      {/* Nested views (Datasets tab tree view) */}
      {hasViews && isExpanded && (
        <div className="dataset-item__views" role="group">
          {dataset.views.map((view) => (
            <ViewListItem
              key={view.id}
              view={view}
              onClick={onViewClick}
              onDragStart={onViewDragStart}
              viewTypes={viewTypes}
              useCount={view.useCount}
            />
          ))}
        </div>
      )}

      {/* Nested datasets (recursive) */}
      {hasChildren && isExpanded && (
        <div className="dataset-item__children" role="group">
          {dataset.children.map((child) => (
            <DatasetItem
              key={child.id}
              dataset={child}
              isExpanded={false}
              onToggle={onToggle}
              onClick={onClick}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              viewTypes={viewTypes}
              onViewClick={onViewClick}
              onViewDragStart={onViewDragStart}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default DatasetItem;
