/**
 * @file CollaboratorItem.jsx
 * @description Collaborator list item for team presence
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Toggle } from '@UI/react/components/atoms/Toggle';
import { formatCellRef } from '../../utils/gridUtils';

/**
 * CollaboratorItem - Team member list item
 *
 * @param {Object} props
 * @param {Object} props.collaborator - Collaborator data
 * @param {boolean} [props.showLocation=true] - Whether to show location info
 * @param {Function} [props.onFollow] - Follow button handler
 * @param {Function} [props.onLocate] - Locate/go to handler
 * @param {boolean} [props.showCursorToggle=false] - Whether to show cursor toggle
 * @param {boolean} [props.cursorVisible=true] - Current cursor visibility
 * @param {Function} [props.onToggleCursor] - Toggle cursor visibility
 */
export const CollaboratorItem = memo(function CollaboratorItem({
  collaborator,
  showLocation = true,
  onFollow,
  onLocate,
  showCursorToggle = false,
  cursorVisible = true,
  onToggleCursor,
}) {
  const { name, avatar, color, viewport, cursor, isBroadcasting, isOnline } = collaborator;

  const locationText = viewport
    ? formatCellRef(viewport.row, viewport.col)
    : 'Not on canvas';

  return (
    <div
      className={`collaborator-item ${!isOnline ? 'collaborator-item--offline' : ''}`}
      style={{ '--collab-color': color }}
    >
      {/* Avatar */}
      <div className="collaborator-item__avatar">
        <span>{avatar}</span>
        {isOnline && (
          <span className="collaborator-item__status" />
        )}
      </div>

      {/* Info */}
      <div className="collaborator-item__info">
        <div className="collaborator-item__name">
          {name}
          {isBroadcasting && (
            <Icon
              name="radio"
              size={12}
              className="collaborator-item__broadcast-icon"
            />
          )}
        </div>
        {showLocation && (
          <div className="collaborator-item__location">
            {isOnline ? (viewport ? `at ${locationText}` : 'Online') : 'Offline'}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="collaborator-item__actions">
        {showCursorToggle && (
          <div className="collaborator-item__cursor-toggle">
            <Icon name="mousePointer" size={12} />
            <Toggle
              checked={cursorVisible}
              onChange={() => onToggleCursor?.(collaborator.id)}
              size="sm"
            />
          </div>
        )}

        {onLocate && isOnline && viewport && (
          <button
            className="collaborator-item__action"
            onClick={() => onLocate(collaborator.id)}
            title={`Go to ${name}'s location`}
          >
            <Icon name="crosshair" size={12} />
          </button>
        )}

        {onFollow && isOnline && viewport && (
          <button
            className="collaborator-item__follow"
            onClick={() => onFollow(collaborator.id)}
            title={`Follow ${name}`}
          >
            <Icon name="userPlus" size={12} />
            Follow
          </button>
        )}
      </div>
    </div>
  );
});

export default CollaboratorItem;
