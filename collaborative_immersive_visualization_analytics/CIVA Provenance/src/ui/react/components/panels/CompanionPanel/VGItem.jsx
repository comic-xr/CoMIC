/**
 * @file VGItem.jsx
 * @description ViewGroup template item for companion panel
 *
 * Features:
 * - Drag handle (always active)
 * - Layout mini-preview (colored grid cells)
 * - Name (bold, ellipsis)
 * - Grid dimensions badge (e.g., 2×2)
 * - Source datasets (comma-separated)
 * - View count badge
 * - Scope icon (personal/team/project)
 * - Placed count OR time-ago
 */

import React, { memo, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { LayoutMiniPreview } from '@UI/react/components/molecules/LayoutMiniPreview';

/**
 * Scope icons and colors
 */
const SCOPE_CONFIG = {
  personal: { icon: 'user', color: 'var(--accent-blue)', label: 'Personal' },
  team: { icon: 'users', color: 'var(--accent-purple)', label: 'Team' },
  project: { icon: 'globe', color: 'var(--accent-teal)', label: 'Project' },
};

/**
 * Format relative time (e.g., "2h ago", "3d ago")
 */
function formatTimeAgo(dateString) {
  if (!dateString) return null;

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

/**
 * VGItem - ViewGroup template row in companion panel
 *
 * @param {Object} props
 * @param {Object} props.viewGroup - ViewGroup template data
 * @param {boolean} [props.isSelected] - Whether VG is selected
 * @param {boolean} [props.disabled] - Whether VG is disabled
 * @param {Function} props.onClick - Click handler
 * @param {Function} [props.onDragStart] - Drag start handler
 * @param {Function} [props.onDragEnd] - Drag end handler
 * @param {boolean} [props.showCreator] - Show creator name (for Shared section)
 */
export const VGItem = memo(function VGItem({
  viewGroup,
  isSelected,
  disabled,
  onClick,
  onDragStart,
  onDragEnd,
  showCreator = false,
}) {
  const {
    id,
    name,
    layoutId,
    rows = 1,
    cols = 1,
    color = 'var(--accent-blue)',
    viewCount = 0,
    scope = 'personal',
    createdBy,
    lastUsed,
    datasets = [],
    placedCount = 0,
  } = viewGroup;

  const scopeConfig = SCOPE_CONFIG[scope] || SCOPE_CONFIG.personal;
  const isOnCanvas = placedCount > 0;
  const timeAgo = formatTimeAgo(lastUsed);

  const handleClick = useCallback(() => {
    if (!disabled) {
      onClick?.(viewGroup);
    }
  }, [disabled, onClick, viewGroup]);

  const handleKeyDown = useCallback(
    (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        onClick?.(viewGroup);
      }
    },
    [disabled, onClick, viewGroup]
  );

  const handleDragStart = useCallback(
    (e) => {
      if (!disabled && onDragStart) {
        onDragStart(e, viewGroup);
      }
    },
    [disabled, onDragStart, viewGroup]
  );

  const handleDragEnd = useCallback(
    (e) => {
      onDragEnd?.(e, viewGroup);
    },
    [onDragEnd, viewGroup]
  );

  return (
    <div
      className={`vg-item ${isSelected ? 'vg-item--selected' : ''} ${disabled ? 'vg-item--disabled' : ''}`}
      style={{ '--vg-color': color }}
      onClick={handleClick}
      draggable={!disabled && !!onDragStart}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      aria-disabled={disabled}
    >
      {/* Drag handle */}
      {onDragStart && !disabled && (
        <Icon name="gripVertical" size={12} className="vg-item__grip" />
      )}

      {/* Layout mini-preview */}
      <LayoutMiniPreview
        layoutId={layoutId}
        rows={rows}
        cols={cols}
        viewCount={viewCount}
        color={color}
        size={28}
      />

      {/* Info */}
      <div className="vg-item__info">
        <div className="vg-item__header-row">
          <span className="vg-item__name">{name}</span>
          <span className="vg-item__dimensions">{rows}×{cols}</span>
        </div>
        <div className="vg-item__subtitle-row">
          {datasets.length > 0 && (
            <span className="vg-item__datasets" title={datasets.join(', ')}>
              {datasets.slice(0, 2).join(', ')}
              {datasets.length > 2 && ` +${datasets.length - 2}`}
            </span>
          )}
          {showCreator && createdBy && (
            <span className="vg-item__creator">by {createdBy}</span>
          )}
        </div>
      </div>

      {/* View count badge */}
      <span className="vg-item__view-count" title={`${viewCount} view${viewCount !== 1 ? 's' : ''}`}>
        {viewCount}v
      </span>

      {/* Scope icon */}
      <Icon
        name={scopeConfig.icon}
        size={12}
        className="vg-item__scope"
        style={{ color: scopeConfig.color }}
        title={scopeConfig.label}
      />

      {/* Placed count or time */}
      <span className="vg-item__status">
        {isOnCanvas ? (
          <>
            <Icon name="copy" size={10} className="vg-item__status-icon" />
            x{placedCount}
          </>
        ) : (
          timeAgo || '—'
        )}
      </span>
    </div>
  );
});

export default VGItem;
