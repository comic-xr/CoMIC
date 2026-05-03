/**
 * @file UserItem.jsx
 * @description A single user row showing their status and action buttons
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * UserItem - Single collaborator row
 *
 * @param {Object} props - Component props
 * @param {Object} props.user - User object with name, online, editing, viewport, cursor
 * @param {string} props.userColor - Assigned color name
 * @param {boolean} props.isFollowing - Whether currently following this user
 * @param {Function} props.onGoToViewport - Navigate to viewport
 * @param {Function} props.onGoToCursor - Navigate to cursor
 * @param {Function} props.onFollow - Toggle follow
 * @param {boolean} props.isCurrentUser - Whether this is the current user
 */
export function UserItem({
  user,
  userColor = 'teal',
  isFollowing = false,
  onGoToViewport,
  onGoToCursor,
  onFollow,
  isCurrentUser = false,
}) {
  // Build status text
  const getStatusText = () => {
    if (user.editing) {
      return { text: 'Editing canvas', icon: 'edit', isEditing: true };
    }
    if (user.viewport) {
      return {
        text: `Viewing (${user.viewport.col}, ${user.viewport.row})`,
        isEditing: false,
      };
    }
    return { text: user.online ? 'Online' : 'Offline', isEditing: false };
  };

  const status = getStatusText();

  return (
    <div
      className={`user-item ${isFollowing ? 'user-item--following' : ''}`}
      style={{
        '--user-color': `var(--color-accent-${userColor})`,
      }}
    >
      {/* Avatar */}
      <div className={`cop-avatar cop-avatar--${userColor}`}>
        {user.name[0]}
        <div
          className={`cop-avatar__online-dot ${user.online ? 'cop-avatar__online-dot--online' : 'cop-avatar__online-dot--offline'}`}
        />
      </div>

      {/* Info */}
      <div className="user-item__info">
        <div className="user-item__name">{user.name}</div>
        <div
          className={`user-item__status ${status.isEditing ? 'user-item__status--editing' : ''}`}
        >
          {status.icon && <Icon name={status.icon} size={10} />} {status.text}
        </div>
      </div>

      {/* Action buttons - hide for current user */}
      {!isCurrentUser && (
        <div className="user-item__actions">
          <button
            className="user-item__action-btn"
            onClick={onGoToViewport}
            title="Go to their viewport"
            type="button"
            aria-label="Go to user viewport"
          >
            <Icon name="navigation" size={12} />
          </button>
          <button
            className="user-item__action-btn"
            onClick={onGoToCursor}
            title="Go to their cursor"
            type="button"
            aria-label="Go to user cursor"
          >
            <Icon name="crosshair" size={12} />
          </button>
          <button
            className={`user-item__action-btn ${isFollowing ? 'user-item__action-btn--following' : ''}`}
            onClick={onFollow}
            title={isFollowing ? 'Stop following' : 'Follow this user'}
            type="button"
            aria-label={isFollowing ? 'Stop following' : 'Follow this user'}
            style={isFollowing ? {
              '--user-color': `var(--color-accent-${userColor})`,
            } : undefined}
          >
            <Icon name="eye" size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

export default UserItem;
