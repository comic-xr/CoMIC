/**
 * usePanelResize Hook
 *
 * Handles resize behavior for panels.
 * Supports mouse and touch events with min/max constraints.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * @typedef {Object} UsePanelResizeOptions
 * @property {string} panelId - Panel identifier
 * @property {{width: number, height: number}} size - Current size
 * @property {number} minWidth - Minimum width
 * @property {number} minHeight - Minimum height
 * @property {number} maxWidth - Maximum width
 * @property {number} maxHeight - Maximum height
 * @property {(size: {width: number, height: number}) => void} onResize - Size update callback
 * @property {() => void} [onResizeStart] - Called when resize starts
 * @property {() => void} [onResizeEnd] - Called when resize ends
 */

/**
 * Hook for panel resizing functionality
 * @param {UsePanelResizeOptions} options
 * @returns {{isResizing: boolean, handleResizeStart: (e: MouseEvent | TouchEvent) => void}}
 */
export function usePanelResize({
  panelId,
  size,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  onResize,
  onResizeStart,
  onResizeEnd,
}) {
  const [isResizing, setIsResizing] = useState(false);
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const handleResizeStart = useCallback((e) => {
    // Only left mouse button for mouse events
    if (e.type === 'mousedown' && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    // Get client coordinates (mouse or touch)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    resizeStart.current = {
      x: clientX,
      y: clientY,
      width: size.width,
      height: size.height,
    };

    onResizeStart?.();
  }, [size, onResizeStart]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - resizeStart.current.x;
      const deltaY = clientY - resizeStart.current.y;

      // Apply constraints
      const newWidth = Math.min(
        maxWidth,
        Math.max(minWidth, resizeStart.current.width + deltaX)
      );
      const newHeight = Math.min(
        maxHeight,
        Math.max(minHeight, resizeStart.current.height + deltaY)
      );

      onResize?.({ width: newWidth, height: newHeight });
    };

    const handleEnd = () => {
      setIsResizing(false);
      onResizeEnd?.();
    };

    // Mouse events
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);

    // Touch events
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
    };
  }, [isResizing, minWidth, minHeight, maxWidth, maxHeight, onResize, onResizeEnd]);

  return { isResizing, handleResizeStart };
}

export default usePanelResize;
