/**
 * usePanelDrag Hook
 *
 * Handles drag behavior for panels.
 * Supports mouse and touch events.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * @typedef {Object} UsePanelDragOptions
 * @property {string} panelId - Panel identifier
 * @property {{x: number, y: number}} position - Current position
 * @property {(pos: {x: number, y: number}) => void} onMove - Position update callback
 * @property {() => void} [onDragStart] - Called when drag starts
 * @property {() => void} [onDragEnd] - Called when drag ends
 */

/**
 * Hook for panel dragging functionality
 * @param {UsePanelDragOptions} options
 * @returns {{isDragging: boolean, handleDragStart: (e: MouseEvent | TouchEvent) => void}}
 */
export function usePanelDrag({ panelId, position, onMove, onDragStart, onDragEnd }) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });

  const handleDragStart = useCallback((e) => {
    // Only left mouse button for mouse events
    if (e.type === 'mousedown' && e.button !== 0) return;

    e.preventDefault();
    setIsDragging(true);

    // Get client coordinates (mouse or touch)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragStart.current = { x: clientX, y: clientY };
    positionStart.current = { ...position };
    onDragStart?.();
  }, [position, onDragStart]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragStart.current.x;
      const deltaY = clientY - dragStart.current.y;

      // Constrain to viewport with some padding
      const newX = Math.max(0, Math.min(
        window.innerWidth - 100,
        positionStart.current.x + deltaX
      ));
      const newY = Math.max(0, Math.min(
        window.innerHeight - 50,
        positionStart.current.y + deltaY
      ));

      onMove?.({ x: newX, y: newY });
    };

    const handleEnd = () => {
      setIsDragging(false);
      onDragEnd?.();
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
  }, [isDragging, onMove, onDragEnd]);

  return { isDragging, handleDragStart };
}

export default usePanelDrag;
