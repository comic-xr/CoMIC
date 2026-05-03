/**
 * @file UsersTab.jsx
 * @description Shows all collaborators with their current state and action buttons.
 */

import React from 'react';
import { UserItem } from '../components/UserItem';
import { getUserColor } from '../CanvasOperationsPanel.logic';

/**
 * UsersTab - Shows collaborators
 *
 * @param {Object} props - Component props
 * @param {Array} props.collaborators - Array of collaborator objects
 * @param {string|null} props.followingUser - ID of user being followed
 * @param {Function} props.onFollow - Toggle following a user
 * @param {Function} props.onGoToViewport - Navigate to user's viewport
 * @param {Function} props.onGoToCursor - Navigate to user's cursor
 * @param {string} props.currentUserId - Current user's ID
 */
export function UsersTab({
  collaborators = [],
  followingUser,
  onFollow,
  onGoToViewport,
  onGoToCursor,
  currentUserId,
}) {
  return (
    <div className="cop-scroll-list">
      <div className="cop-list cop-list--gap-md">
        {collaborators.map((user) => {
          const isCurrentUser = user.id === currentUserId || user.name === 'You';
          const userColor = getUserColor(user.name, isCurrentUser);

          return (
            <UserItem
              key={user.id || user.name}
              user={user}
              userColor={userColor}
              isFollowing={followingUser === user.id || followingUser === user.name}
              onGoToViewport={() => onGoToViewport?.(user)}
              onGoToCursor={() => onGoToCursor?.(user)}
              onFollow={() => onFollow?.(user.id || user.name)}
              isCurrentUser={isCurrentUser}
            />
          );
        })}
      </div>
    </div>
  );
}

export default UsersTab;
