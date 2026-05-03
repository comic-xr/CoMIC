/**
 * @file VGListItem.jsx
 * @description ViewGroup list item with layout preview
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Badge } from '@UI/react/components/atoms/Badge';
import { LayoutMiniPreview } from '@UI/react/components/molecules/LayoutMiniPreview';
import { getVGDisplayName, formatRangeRef } from '../../utils/gridUtils';
import { LAYOUTS } from '../../utils/constants';

/**
 * VGListItem - ViewGroup list item
 *
 * @param {Object} props
 * @param {Object} props.vg - ViewGroup data
 * @param {string} [props.displayName] - Pre-computed display name
 * @param {boolean} props.isSelected - Whether this VG is selected
 * @param {boolean} [props.isInactive=false] - Whether this is an inactive VG
 * @param {Function} props.onClick - Click handler
 * @param {Function} props.onDoubleClick - Double-click handler
 * @param {Function} [props.onRestore] - Restore handler for inactive VGs
 */
export const VGListItem = memo(function VGListItem({
  vg,
  displayName,
  isSelected,
  isInactive = false,
  onClick,
  onDoubleClick,
  onRestore,
}) {
  const name = displayName || getVGDisplayName(vg);
  const viewCount = vg.views?.length || 0;

  return (
    <div
      className={`vg-list-item ${isSelected ? 'vg-list-item--selected' : ''} ${isInactive ? 'vg-list-item--inactive' : ''}`}
      style={{ '--vg-color': vg.color }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick?.();
        if (e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Layout Preview */}
      <LayoutMiniPreview
        layoutId={vg.layoutId}
        color={vg.color}
        filledCount={viewCount}
        size={18}
        layouts={LAYOUTS}
      />

      {/* Name */}
      <span className="vg-list-item__name">{name}</span>

      {/* Position (only for active VGs) */}
      {vg.position && !isInactive && (
        <span className="vg-list-item__position">
          {formatRangeRef(
            vg.position.row,
            vg.position.col,
            vg.position.rowSpan,
            vg.position.colSpan
          )}
        </span>
      )}

      {/* View count */}
      <span className="vg-list-item__count">{viewCount}v</span>

      {/* Implicit badge */}
      {!vg.isExplicit && (
        <Badge size="sm" color="warning">implicit</Badge>
      )}

      {/* Restore button for inactive VGs */}
      {isInactive && onRestore && (
        <button
          className="vg-list-item__restore"
          onClick={(e) => {
            e.stopPropagation();
            onRestore(vg.id);
          }}
          title="Restore to canvas"
        >
          <Icon name="rotateCcw" size={12} />
        </button>
      )}
    </div>
  );
});

export default VGListItem;
