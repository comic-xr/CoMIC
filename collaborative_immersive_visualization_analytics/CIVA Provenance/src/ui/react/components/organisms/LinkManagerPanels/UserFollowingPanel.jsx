/**
 * UserFollowingPanel Component
 *
 * Panel for following other collaborators' viewports (separate from view linking).
 * Shows who you're following, follow options, workspace members, and who follows you.
 *
 * @module UserFollowingPanel
 */

import React, { memo, useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { UserAvatar } from '@UI/react/components/atoms/UserAvatar';
import './UserFollowingPanel.scss';

/**
 * Status indicator for online/busy/away
 */
const StatusIndicator = memo(function StatusIndicator({ status = 'online' }) {
    const statusConfig = {
        online: { color: 'var(--color-success)', label: 'Online' },
        active: { color: 'var(--color-success)', label: 'Active' },
        busy: { color: 'var(--color-error)', label: 'Busy' },
        idle: { color: 'var(--color-warning)', label: 'Idle' },
        away: { color: 'var(--color-warning)', label: 'Away' },
        offline: { color: 'var(--color-text-muted)', label: 'Offline' },
    };

    const config = statusConfig[status] || statusConfig.online;

    return (
        <span
            className="status-indicator"
            style={{ '--status-color': config.color }}
            title={config.label}
        />
    );
});

/**
 * Follow options checkboxes
 */
const FollowOptions = memo(function FollowOptions({ options, onChange }) {
    const optionsList = [
        { id: 'jumpToView', label: 'Jump to their active view', icon: 'eye' },
        { id: 'showCursor', label: 'Show their cursor', icon: 'crosshair' },
        { id: 'mirrorCamera', label: 'Mirror their camera angle', icon: 'camera' },
        { id: 'autoFollowViews', label: 'Auto-follow view changes', icon: 'layers' },
    ];

    return (
        <div className="follow-options">
            {optionsList.map(option => (
                <label key={option.id} className="follow-options__item">
                    <input
                        type="checkbox"
                        checked={options[option.id] || false}
                        onChange={(e) => onChange({ ...options, [option.id]: e.target.checked })}
                    />
                    <Icon name={option.icon} size={12} />
                    <span>{option.label}</span>
                </label>
            ))}
        </div>
    );
});

/**
 * Currently following section - shows when following someone
 */
const CurrentlyFollowing = memo(function CurrentlyFollowing({
    followingUser,
    followOptions,
    onFollowOptionsChange,
    onStopFollowing,
}) {
    if (!followingUser) return null;

    return (
        <div className="currently-following">
            <div className="currently-following__header">
                <Icon name="eye" size={14} />
                <span>You Are Following</span>
            </div>

            <div className="currently-following__card">
                <div className="currently-following__user">
                    <div className="currently-following__avatar-wrapper">
                        <UserAvatar
                            userName={followingUser.userName}
                            color={followingUser.userColor}
                            size="lg"
                        />
                        <StatusIndicator status={followingUser.status} />
                    </div>
                    <div className="currently-following__info">
                        <div className="currently-following__name">{followingUser.userName}</div>
                        <div className="currently-following__view">
                            Viewing: {followingUser.activeView || 'No active view'}
                        </div>
                    </div>
                </div>

                <FollowOptions
                    options={followOptions}
                    onChange={onFollowOptionsChange}
                />

                <button
                    className="currently-following__stop-btn"
                    onClick={() => onStopFollowing(followingUser)}
                >
                    Stop Following
                </button>
            </div>
        </div>
    );
});

/**
 * Empty state when not following anyone
 */
const NotFollowingState = memo(function NotFollowingState() {
    return (
        <div className="not-following-state">
            <Icon name="eye" size={24} />
            <span>Not following anyone</span>
        </div>
    );
});

/**
 * Single member row in the workspace members list
 */
const MemberRow = memo(function MemberRow({
    member,
    isFollowing,
    onFollow,
}) {
    return (
        <div className="member-row">
            <div className="member-row__avatar-wrapper">
                <UserAvatar
                    userName={member.userName}
                    color={member.userColor}
                    size="sm"
                />
                <StatusIndicator status={member.status} />
            </div>

            <div className="member-row__info">
                <div className="member-row__name">{member.userName}</div>
                <div className="member-row__view">
                    {member.activeView || 'No active view'}
                </div>
            </div>

            <button
                className={`member-row__follow-btn ${isFollowing ? 'member-row__follow-btn--following' : ''}`}
                onClick={() => !isFollowing && onFollow(member)}
                disabled={isFollowing}
            >
                {isFollowing ? 'Following' : 'Follow →'}
            </button>
        </div>
    );
});

/**
 * Followers section - shows who is following the current user
 */
const FollowersSection = memo(function FollowersSection({ followers }) {
    if (!followers || followers.length === 0) return null;

    return (
        <div className="followers-section">
            <div className="followers-section__header">
                <span className="followers-section__label">Following You</span>
                <span className="followers-section__count">
                    {followers.length} {followers.length === 1 ? 'person' : 'people'}
                </span>
            </div>
            <div className="followers-section__list">
                {followers.map((follower, index) => (
                    <div key={follower.clientId || follower.userId || index} className="followers-section__item">
                        <UserAvatar
                            userName={follower.userName}
                            color={follower.userColor}
                            size="xs"
                        />
                        <span>{follower.userName}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

/**
 * UserFollowingPanel - Follow collaborators' viewports
 *
 * @param {Array} users - List of users in the workspace
 * @param {string} currentUserId - ID of current user
 * @param {Object} followingUser - User currently being followed (if any)
 * @param {Array} followers - Users who are following the current user
 * @param {function} onFollow - Handler to start following a user
 * @param {function} onUnfollow - Handler to stop following a user
 * @param {function} onStartPresenting - Handler to start presenting mode
 * @param {function} onClose - Close panel handler
 * @param {string} className - Additional CSS classes
 */
export const UserFollowingPanel = memo(function UserFollowingPanel({
    users = [],
    currentUserId,
    followingUser,
    followers = [],
    onFollow,
    onUnfollow,
    onStartPresenting,
    onClose,
    className = '',
}) {
    const [followOptions, setFollowOptions] = useState({
        jumpToView: true,
        showCursor: true,
        mirrorCamera: false,
        autoFollowViews: false,
    });

    // Filter out current user from the list
    const otherUsers = users.filter(user =>
        user.clientId !== currentUserId && user.userId !== currentUserId
    );

    // Count online users
    const onlineCount = otherUsers.filter(u =>
        u.status === 'online' || u.status === 'active'
    ).length;

    const handleFollow = useCallback((user) => {
        onFollow?.(user);
    }, [onFollow]);

    const handleUnfollow = useCallback((user) => {
        onUnfollow?.(user);
    }, [onUnfollow]);

    return (
        <div className={`user-following-panel ${className}`}>
            {/* Header */}
            <div className="user-following-panel__header">
                <div className="user-following-panel__title">
                    <Icon name="users" size={16} />
                    <span>Following</span>
                </div>
                {onClose && (
                    <button className="user-following-panel__close" onClick={onClose}>
                        <Icon name="x" size={16} />
                    </button>
                )}
            </div>

            {/* Currently Following Section */}
            {followingUser ? (
                <CurrentlyFollowing
                    followingUser={followingUser}
                    followOptions={followOptions}
                    onFollowOptionsChange={setFollowOptions}
                    onStopFollowing={handleUnfollow}
                />
            ) : (
                <div className="user-following-panel__not-following">
                    <NotFollowingState />
                </div>
            )}

            {/* Separator */}
            <div className="user-following-panel__separator" />

            {/* Workspace Members */}
            <div className="user-following-panel__members">
                <div className="user-following-panel__members-header">
                    <span className="user-following-panel__members-label">Workspace Members</span>
                    <span className="user-following-panel__online-count">
                        {onlineCount} online
                    </span>
                </div>

                <div className="user-following-panel__members-list">
                    {otherUsers.length > 0 ? (
                        otherUsers.map((member, index) => (
                            <MemberRow
                                key={member.clientId || member.userId || index}
                                member={member}
                                isFollowing={
                                    (followingUser?.clientId && followingUser.clientId === member.clientId) ||
                                    (followingUser?.userId && followingUser.userId === member.userId)
                                }
                                onFollow={handleFollow}
                            />
                        ))
                    ) : (
                        <div className="user-following-panel__empty">
                            <span>No other users in workspace</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Followers Section */}
            <FollowersSection followers={followers} />

            {/* Start Presenting */}
            {onStartPresenting && (
                <div className="user-following-panel__presenting">
                    <button
                        className="user-following-panel__present-btn"
                        onClick={onStartPresenting}
                    >
                        <Icon name="radio" size={14} />
                        <span>Start Presenting</span>
                    </button>
                    <div className="user-following-panel__present-desc">
                        Followers will see what you see
                    </div>
                </div>
            )}
        </div>
    );
});

export default UserFollowingPanel;
