/**
 * PanelResizeHandle Component
 *
 * Corner resize handle for panels.
 * Supports mouse and touch events.
 */

import React from 'react';
import './PanelResizeHandle.scss';

/**
 * @typedef {Object} PanelResizeHandleProps
 * @property {(e: MouseEvent | TouchEvent) => void} onResizeStart - Resize start handler
 */

export function PanelResizeHandle({ onResizeStart }) {
  return (
    <div
      className="panel-resize-handle"
      onMouseDown={onResizeStart}
      onTouchStart={onResizeStart}
    >
      <div className="panel-resize-handle__indicator" />
    </div>
  );
}

export default PanelResizeHandle;
