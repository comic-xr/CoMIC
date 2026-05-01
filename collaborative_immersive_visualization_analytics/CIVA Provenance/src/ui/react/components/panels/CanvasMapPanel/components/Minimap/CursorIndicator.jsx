/**
 * @file CursorIndicator.jsx
 * @description Collaborator cursor indicator on minimap for real-time cursor tracking
 */

import React, { memo } from 'react';

/**
 * CursorIndicator - Shows collaborator cursor position on minimap
 *
 * @param {Object} props
 * @param {Object} props.collaborator - Collaborator data with cursor position
 * @param {number} props.cellSize - Size of each cell in pixels
 * @param {number} props.gap - Gap between cells
 * @param {boolean} props.showName - Whether to show name label
 */
export const CursorIndicator = memo(function CursorIndicator({
  collaborator,
  cellSize,
  gap = 4,
  showName,
}) {
  const { name, avatar, color, cursor } = collaborator;

  // Cursor is a precise position, not grid-based
  if (!cursor) return null;

  // Calculate pixel position from canvas coordinates
  const x = cursor.col * (cellSize + gap) + cursor.colOffset * cellSize;
  const y = cursor.row * (cellSize + gap) + cursor.rowOffset * cellSize;

  return (
    <div
      className="cursor-indicator"
      style={{
        '--cursor-color': color,
        transform: `translate(${x}px, ${y}px)`,
      }}
      title={name}
    >
      {/* Cursor pointer */}
      <svg
        className="cursor-indicator__pointer"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path
          d="M1 1L6.5 14L8.5 8.5L14 6.5L1 1Z"
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>

      {/* Name label */}
      {showName && (
        <span className="cursor-indicator__name">{name.split(' ')[0]}</span>
      )}

      {/* Avatar (shown when name is hidden) */}
      {!showName && (
        <span className="cursor-indicator__avatar">{avatar}</span>
      )}
    </div>
  );
});

export default CursorIndicator;
