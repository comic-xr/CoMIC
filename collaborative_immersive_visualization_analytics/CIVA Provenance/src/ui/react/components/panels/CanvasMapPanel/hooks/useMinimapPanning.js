/**
 * @file useMinimapPanning.js
 * @description Hook for minimap panning functionality
 *
 * Provides drag-to-pan behavior with bounds checking for the minimap.
 * When the canvas content exceeds the viewport, users can drag to pan.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { clamp } from '../utils/gridUtils';
import { MINIMAP_CONSTANTS } from '../utils/constants';

/**
 * useMinimapPanning - Drag panning logic for minimap
 *
 * @param {Object} options
 * @param {number} options.contentWidth - Total content width in pixels
 * @param {number} options.contentHeight - Total content height in pixels
 * @param {number} options.viewportWidth - Visible viewport width in pixels
 * @param {number} options.viewportHeight - Visible viewport height in pixels
 * @param {boolean} [options.enabled=true] - Whether panning is enabled
 * @param {number} [options.companionOffset=0] - Extra offset when companion panel is open
 * @param {'left' | 'right' | null} [options.companionSide=null] - Which side companion is on
 * @param {number} [options.cellPitch=0] - Cell size + gap (for calculating padding)
 * @param {boolean} [options.companionOpen=false] - Whether companion panel is open
 * @returns {Object} Panning state and handlers
 */
export function useMinimapPanning({
  contentWidth,
  contentHeight,
  viewportWidth,
  viewportHeight,
  enabled = true,
  companionOffset = 0,
  companionSide = null,
  cellPitch = 0,
  companionOpen = false,
} = {}) {
  // Current pan offset
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  // Calculate pan bounds with extended padding (V2Spec: ~3 cells beyond bounds)
  // This allows users to access obstructed areas
  const panPaddingCells = MINIMAP_CONSTANTS.PAN_PADDING_CELLS ?? 3;
  const panPadding = cellPitch > 0 ? cellPitch * panPaddingCells : 50;

  // Add companion width to pan limits on BOTH sides when open
  // This allows user to access full map when companion overlays part of it
  const companionPanExtra = companionOpen ? companionOffset : 0;

  // Extended bounds: can pan beyond content in both directions
  const minPanX = Math.min(0, viewportWidth - contentWidth) - panPadding - companionPanExtra;
  const minPanY = Math.min(0, viewportHeight - contentHeight) - panPadding;
  const maxPanX = panPadding + companionPanExtra;
  const maxPanY = panPadding;

  const canPan = enabled;

  /**
   * Clamp pan offset to valid bounds
   */
  const clampPan = useCallback((x, y) => {
    return {
      x: clamp(x, minPanX, maxPanX),
      y: clamp(y, minPanY, maxPanY),
    };
  }, [minPanX, maxPanX, minPanY, maxPanY]);

  /**
   * Handle mouse/touch down - start dragging
   */
  const handlePanStart = useCallback((e) => {
    if (!enabled || !canPan) return;

    // Get client coordinates from mouse or touch event
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = { x: clientX, y: clientY };
    panStartRef.current = { ...panOffset };
    setIsDragging(true);

    // Prevent default to avoid text selection
    e.preventDefault();
  }, [enabled, canPan, panOffset]);

  /**
   * Handle mouse/touch move - update pan position
   */
  const handlePanMove = useCallback((e) => {
    if (!isDragging) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const deltaX = dragStartRef.current.x - clientX;
    const deltaY = dragStartRef.current.y - clientY;

    const newPan = clampPan(
      panStartRef.current.x + deltaX,
      panStartRef.current.y + deltaY
    );

    setPanOffset(newPan);
  }, [isDragging, clampPan]);

  /**
   * Handle mouse/touch up - stop dragging
   */
  const handlePanEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  /**
   * Reset pan to origin
   */
  const resetPan = useCallback(() => {
    setPanOffset({ x: 0, y: 0 });
  }, []);

  /**
   * Pan to show a specific position (centered if possible)
   */
  const panToPosition = useCallback((x, y) => {
    const targetX = x - viewportWidth / 2;
    const targetY = y - viewportHeight / 2;
    setPanOffset(clampPan(targetX, targetY));
  }, [viewportWidth, viewportHeight, clampPan]);

  /**
   * Pan to show a specific grid cell
   */
  const panToCell = useCallback((row, col, cellSize, gap) => {
    const x = col * (cellSize + gap) + cellSize / 2;
    const y = row * (cellSize + gap) + cellSize / 2;
    panToPosition(x, y);
  }, [panToPosition]);

  // Add global mouse/touch event listeners when dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => handlePanMove(e);
    const handleEnd = () => handlePanEnd();

    // Mouse events
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    // Touch events
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [isDragging, handlePanMove, handlePanEnd]);

  // Reset pan when content/viewport size changes significantly
  useEffect(() => {
    // Clamp current pan to new bounds
    setPanOffset(prev => clampPan(prev.x, prev.y));
  }, [contentWidth, contentHeight, viewportWidth, viewportHeight, clampPan]);

  return {
    // State
    panOffset,
    isDragging,
    canPan,
    minPanX,
    maxPanX,
    minPanY,
    maxPanY,

    // Event handlers (attach to minimap container)
    handlePanStart,
    handlePanMove,
    handlePanEnd,

    // Imperative methods
    resetPan,
    panToPosition,
    panToCell,
    setPanOffset,

    // Props to spread on container
    panProps: {
      onMouseDown: handlePanStart,
      onTouchStart: handlePanStart,
      style: {
        cursor: canPan ? (isDragging ? 'grabbing' : 'grab') : 'default',
      },
    },
  };
}

export default useMinimapPanning;
