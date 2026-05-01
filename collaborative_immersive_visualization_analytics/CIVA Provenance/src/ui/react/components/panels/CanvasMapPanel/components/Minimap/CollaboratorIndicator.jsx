/**
 * @file CollaboratorIndicator.jsx
 * @description Collaborator viewport overlay on minimap
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * CollaboratorIndicator - Collaborator viewport on minimap
 *
 * @param {Object} props
 * @param {Object} props.collaborator - Collaborator data
 * @param {number} props.cellSize - Size of each cell in pixels
 * @param {number} props.gap - Gap between cells
 * @param {boolean} props.showName - Whether to show collaborator name
 */
export const CollaboratorIndicator = memo(function CollaboratorIndicator({
  collaborator,
  cellSize,
  gap = 4,
  showName,
}) {
  const { name, avatar, color, viewport, isBroadcasting } = collaborator;
  if (!viewport) return null;

  return (
    <div
      className={`collaborator-indicator ${isBroadcasting ? 'collaborator-indicator--broadcasting' : ''}`}
      style={{
        left: viewport.col * (cellSize + gap),
        top: viewport.row * (cellSize + gap),
        width: `${viewport.cols * cellSize + (viewport.cols - 1) * gap}px`,
        height: `${viewport.rows * cellSize + (viewport.rows - 1) * gap}px`,
        '--collab-color': color,
      }}
      title={`${name}${isBroadcasting ? ' (Broadcasting)' : ''}`}
    >
      {/* Avatar badge */}
      <div className="collaborator-indicator__avatar">
        <span>{avatar}</span>
        {isBroadcasting && (
          <Icon name="radio" size={8} className="collaborator-indicator__broadcast" />
        )}
      </div>

      {/* Name label */}
      {showName && (
        <span className="collaborator-indicator__name">{name.split(' ')[0]}</span>
      )}
    </div>
  );
});

export default CollaboratorIndicator;
