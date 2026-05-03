/**
 * @file LinkItem.jsx
 * @description Link list item for VG and View links
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * Link type icons mapping
 */
const LINK_TYPE_ICONS = {
  camera: 'video',
  filters: 'filter',
  widgets: 'layoutGrid',
  windowLevel: 'sliders',
  slice: 'layers',
  colormap: 'palette',
  data: 'database',
  all: 'link2',
};

/**
 * LinkItem - VG or View link list item
 *
 * @param {Object} props
 * @param {Object} props.link - Link data { id, type, mode, from, to }
 * @param {string} props.fromName - Name of source
 * @param {string} props.toName - Name of target
 * @param {string} [props.fromColor] - Color of source
 * @param {string} [props.toColor] - Color of target
 * @param {boolean} [props.isHighlighted] - Whether link is highlighted
 * @param {Function} props.onClick - Click handler
 * @param {Function} [props.onDelete] - Delete handler
 */
export const LinkItem = memo(function LinkItem({
  link,
  fromName,
  toName,
  fromColor,
  toColor,
  isHighlighted,
  onClick,
  onDelete,
}) {
  const icon = LINK_TYPE_ICONS[link.type] || 'link2';

  return (
    <div
      className={`link-item ${isHighlighted ? 'link-item--highlighted' : ''}`}
      onClick={() => onClick?.(link.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(link.id);
        }
      }}
    >
      <div className="link-item__type">
        <Icon name={icon} size={12} />
        <span>{link.type}</span>
      </div>

      <div className="link-item__connection">
        <span className="link-item__source" style={fromColor ? { color: fromColor } : undefined}>
          {fromName}
        </span>
        <Icon
          name={link.mode === 'bidirectional' ? 'arrowLeftRight' : 'arrowRight'}
          size={12}
          className="link-item__arrow"
        />
        <span className="link-item__target" style={toColor ? { color: toColor } : undefined}>
          {toName}
        </span>
      </div>

      {onDelete && (
        <button
          className="link-item__delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(link.id);
          }}
          title="Delete link"
        >
          <Icon name="unlink2" size={12} />
        </button>
      )}
    </div>
  );
});

export default LinkItem;
