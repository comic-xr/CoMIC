/**
 * GroupMembersList Component
 *
 * Displays a list of members in a link/sync group.
 * Shows avatar, name, view name, and link mode for each member.
 *
 * @module GroupMembersList
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { UserAvatar } from '@UI/react/components/atoms/UserAvatar';
import { ColorDot } from '@UI/react/components/atoms/ColorDot';
import { LINK_MODES, getModeById } from '@UI/react/components/organisms/LinkManagerPanels/linkConstants';
import './GroupMembersList.scss';

/**
 * Single member row in the group list
 */
const GroupMemberRow = memo(function GroupMemberRow({
    member,
    isCurrentUser = false,
    onRemove,
    showMode = true,
    propertyColor,
}) {
    const mode = getModeById(member.mode);

    return (
        <div className={`group-member ${isCurrentUser ? 'group-member--current' : ''}`}>
            <UserAvatar
                userName={member.userName}
                color={member.userColor}
                size="sm"
            />

            <div className="group-member__info">
                <div className="group-member__name">
                    {member.userName}
                    {isCurrentUser && <span className="group-member__you">(You)</span>}
                </div>
                <div className="group-member__view">
                    {member.viewColor && (
                        <ColorDot color={member.viewColor} size="xs" />
                    )}
                    <span>{member.viewName || 'Unnamed View'}</span>
                </div>
            </div>

            {showMode && mode && (
                <div
                    className="group-member__mode"
                    title={mode.description}
                    style={{ '--mode-color': propertyColor || mode.color }}
                >
                    <Icon name={mode.icon} size={12} />
                    <span>{mode.label}</span>
                </div>
            )}

            {onRemove && (
                <button
                    className="group-member__remove"
                    onClick={() => onRemove(member)}
                    title="Remove from group"
                >
                    <Icon name="x" size={14} />
                </button>
            )}
        </div>
    );
});

/**
 * GroupMembersList - List of members in a link group
 *
 * @param {Array} members - Array of member objects
 * @param {string} currentUserId - ID of current user
 * @param {function} onRemoveMember - Handler when removing a member
 * @param {boolean} showModes - Whether to show mode indicators
 * @param {string} propertyColor - Accent color for the property
 * @param {string} emptyMessage - Message when no members
 * @param {string} className - Additional CSS classes
 */
export const GroupMembersList = memo(function GroupMembersList({
    members = [],
    currentUserId,
    onRemoveMember,
    showModes = true,
    propertyColor,
    emptyMessage = 'No members in this group',
    className = '',
}) {
    if (!members.length) {
        return (
            <div className={`group-members-list group-members-list--empty ${className}`}>
                <div className="group-members-list__empty">
                    <Icon name="users" size={20} />
                    <span>{emptyMessage}</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`group-members-list ${className}`}>
            {members.map((member, index) => (
                <GroupMemberRow
                    key={member.clientId || member.userId || member.id || index}
                    member={member}
                    isCurrentUser={member.clientId === currentUserId || member.userId === currentUserId}
                    onRemove={onRemoveMember}
                    showMode={showModes}
                    propertyColor={propertyColor}
                />
            ))}
        </div>
    );
});

/**
 * Compact variant - shows just avatars in a row
 */
export const GroupMembersCompact = memo(function GroupMembersCompact({
    members = [],
    max = 5,
    size = 'sm',
    className = '',
}) {
    const visibleMembers = members.slice(0, max);
    const remainingCount = Math.max(0, members.length - max);

    return (
        <div className={`group-members-compact ${className}`}>
            {visibleMembers.map((member, index) => (
                <UserAvatar
                    key={member.clientId || member.userId || member.id || index}
                    userName={member.userName}
                    color={member.userColor}
                    size={size}
                    className="group-members-compact__avatar"
                />
            ))}
            {remainingCount > 0 && (
                <div
                    className={`group-members-compact__overflow user-avatar--${size}`}
                    title={`${remainingCount} more member${remainingCount > 1 ? 's' : ''}`}
                >
                    +{remainingCount}
                </div>
            )}
        </div>
    );
});

export default GroupMembersList;
