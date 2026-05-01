/**
 * PanelDragHandle Component
 *
 * Visual drag handle indicator for FULL chrome panels.
 * Shows grip dots that indicate the panel can be dragged.
 */

import React from 'react';
import Icon from '@UI/react/components/atoms/Icon/Icon';
import './PanelDragHandle.scss';

/**
 * @typedef {Object} PanelDragHandleProps
 * @property {(e: MouseEvent | TouchEvent) => void} [onDragStart] - Drag start handler
 * @property {boolean} [vertical=true] - Whether to show vertical grip (default) or horizontal
 * @property {number} [size=12] - Icon size
 */

export function PanelDragHandle({
  onDragStart,
  vertical = true,
  size = 12,
}) {
  return (
    <div
      className={`panel-drag-handle ${vertical ? 'panel-drag-handle--vertical' : 'panel-drag-handle--horizontal'}`}
      onMouseDown={onDragStart}
      onTouchStart={onDragStart}
      role="button"
      tabIndex={0}
      aria-label="Drag to move panel"
    >
      <Icon
        name={vertical ? 'gripVertical' : 'gripHorizontal'}
        size={size}
      />
    </div>
  );
}

export default PanelDragHandle;
