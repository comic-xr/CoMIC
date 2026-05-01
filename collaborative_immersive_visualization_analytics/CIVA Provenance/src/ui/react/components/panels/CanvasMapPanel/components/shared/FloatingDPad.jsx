/**
 * @file FloatingDPad.jsx
 * @description Circular floating D-Pad navigation control with drag support
 *
 * Features:
 * - Circular design with wedge buttons for each direction
 * - Draggable positioning via handle
 * - Center button for "go home" action
 * - Glassmorphism styling with glow effects
 * - VR-compatible with pointer events
 */

import React, { memo, useState, useCallback, useRef } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { tokens } from '@UI/react/styles/tokens';

/**
 * FloatingDPad - Circular draggable D-Pad navigation control
 *
 * @param {Object} props
 * @param {'minimal' | 'compact' | 'standard'} [props.sizeMode='standard'] - Size variant
 * @param {{x: number, y: number}} [props.position] - Position when not docked
 * @param {number} [props.zIndex=30] - Z-index for layering
 * @param {boolean} [props.docked=false] - Whether to use relative positioning
 * @param {boolean} [props.showHandle=true] - Whether to show drag handle
 * @param {React.ReactNode} [props.centerContent] - Custom content for center button
 * @param {Function} props.onMove - Called with direction ('up', 'down', 'left', 'right')
 * @param {Function} props.onGoHome - Called when center button is pressed
 * @param {Function} [props.onPositionChange] - Called when dragged to new position
 */
export const FloatingDPad = memo(function FloatingDPad({
  sizeMode = 'standard',
  position,
  zIndex = 30,
  docked = false,
  showHandle = true,
  centerContent,
  onMove,
  onGoHome,
  onPositionChange,
}) {
  const size = sizeMode === 'minimal' ? 70 : sizeMode === 'compact' ? 82 : 96;
  const centerSize = sizeMode === 'minimal' ? 34 : sizeMode === 'compact' ? 38 : 42;
  const handleSize = sizeMode === 'minimal' ? 18 : 20;
  const iconSize = sizeMode === 'minimal' ? 14 : sizeMode === 'compact' ? 16 : 18;
  const wedgeInset = sizeMode === 'minimal' ? 3 : sizeMode === 'compact' ? 4 : 5;
  const iconOffset = sizeMode === 'minimal' ? 14 : sizeMode === 'compact' ? 16 : 18;

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const posStartRef = useRef({ x: 0, y: 0 });

  const handleDragStart = useCallback((e) => {
    if (!onPositionChange) return;
    e.stopPropagation();
    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = { x: clientX, y: clientY };
    posStartRef.current = position || { x: 0, y: 0 };
    setIsDragging(true);

    const handleDragMove = (moveEvent) => {
      const moveX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const moveY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const deltaX = moveX - dragStartRef.current.x;
      const deltaY = moveY - dragStartRef.current.y;

      onPositionChange({
        x: posStartRef.current.x + deltaX,
        y: posStartRef.current.y + deltaY,
      });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
  }, [position, onPositionChange]);

  const wedgeStyle = {
    position: 'absolute',
    inset: wedgeInset,
    borderRadius: '50%',
    border: '1px solid rgba(96, 165, 250, 0.18)',
    background: 'linear-gradient(160deg, rgba(96, 165, 250, 0.22), rgba(10, 16, 28, 0.65))',
    color: 'rgba(248, 250, 252, 0.95)',
    textShadow: '0 1px 6px rgba(15, 23, 42, 0.8)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(6px)',
    transition: 'all 0.18s ease',
    padding: 0,
  };

  const directions = [
    { id: 'up', clipPath: 'polygon(50% 50%, 0% 0%, 100% 0%)', translateY: -iconOffset },
    { id: 'right', clipPath: 'polygon(50% 50%, 100% 0%, 100% 100%)', translateX: iconOffset },
    { id: 'down', clipPath: 'polygon(50% 50%, 100% 100%, 0% 100%)', translateY: iconOffset },
    { id: 'left', clipPath: 'polygon(50% 50%, 0% 100%, 0% 0%)', translateX: -iconOffset },
  ];

  const getIconName = (direction) => {
    switch (direction) {
      case 'up': return 'chevronUp';
      case 'down': return 'chevronDown';
      case 'left': return 'chevronLeft';
      case 'right': return 'chevronRight';
      default: return 'chevronUp';
    }
  };

  return (
    <div
      style={{
        position: docked ? 'relative' : 'absolute',
        left: docked ? undefined : position?.x,
        top: docked ? undefined : position?.y,
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, rgba(96, 165, 250, 0.18), rgba(2, 6, 16, 0.92))',
        border: '1px solid rgba(96, 165, 250, 0.2)',
        boxShadow: '0 0 0 2px rgba(15, 23, 42, 0.6), 0 12px 24px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex,
        transformOrigin: 'center',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Inner glow ring */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '1px solid rgba(96, 165, 250, 0.18)',
          boxShadow: 'inset 0 0 0 1px rgba(2, 6, 16, 0.65)',
          pointerEvents: 'none',
        }}
      />

      {/* Direction wedges */}
      {directions.map((dir) => (
        <button
          key={dir.id}
          type="button"
          onClick={() => onMove?.(dir.id)}
          style={{
            ...wedgeStyle,
            clipPath: dir.clipPath,
          }}
          aria-label={`Move ${dir.id}`}
        >
          <Icon
            name={getIconName(dir.id)}
            size={iconSize}
            style={{
              transform: `translate(${dir.translateX || 0}px, ${dir.translateY || 0}px)`,
              color: 'rgba(248, 250, 252, 0.95)',
            }}
          />
        </button>
      ))}

      {/* Cross dividers */}
      <div
        style={{
          position: 'absolute',
          top: wedgeInset + 1,
          bottom: wedgeInset + 1,
          left: '50%',
          width: 1,
          transform: 'translateX(-0.5px)',
          background: 'rgba(5, 8, 16, 0.6)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: wedgeInset + 1,
          right: wedgeInset + 1,
          top: '50%',
          height: 1,
          transform: 'translateY(-0.5px)',
          background: 'rgba(5, 8, 16, 0.6)',
          pointerEvents: 'none',
        }}
      />

      {/* Center button */}
      <button
        type="button"
        onClick={onGoHome}
        style={{
          width: centerSize,
          height: centerSize,
          borderRadius: '50%',
          border: '1px solid rgba(96, 165, 250, 0.45)',
          background: 'radial-gradient(circle at 35% 35%, rgba(96, 165, 250, 0.4), rgba(8, 14, 24, 0.95))',
          color: tokens.colors.accent.amber,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.14), 0 0 18px rgba(59, 130, 246, 0.45)',
          zIndex: 2,
          padding: 0,
        }}
        aria-label="Go to home position"
      >
        {centerContent || (
          <Icon name="home" size={iconSize} style={{ color: tokens.colors.accent.amber }} />
        )}
      </button>

      {/* Drag handle */}
      {showHandle && onPositionChange && (
        <div
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          style={{
            position: 'absolute',
            right: -4,
            top: -4,
            width: handleSize,
            height: handleSize,
            borderRadius: '50%',
            background: tokens.colors.bg.secondary,
            border: `1px solid ${tokens.colors.border.subtle}`,
            color: tokens.colors.text.muted,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        >
          <Icon name="grip" size={10} />
        </div>
      )}
    </div>
  );
});

export default FloatingDPad;
