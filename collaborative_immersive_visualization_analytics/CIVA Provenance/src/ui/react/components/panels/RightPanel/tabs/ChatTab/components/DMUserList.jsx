/**
 * @file DMUserList.jsx
 * @description User list for starting direct message conversations
 */

import React, { useState, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { sync as log } from '@Utils/logger.js';
import { apiClient } from '@Services/apiClient.js';
import './DMUserList.scss';

/**
 * Component for displaying users available for DMs
 * @param {Object} props - Component props
 * @param {string} props.projectId - Current project ID
 * @param {string} props.currentUserId - Current user's ID
 * @param {Function} props.onUserSelected - Called when user is clicked with DM room info
 */
export function DMUserList({ projectId, currentUserId, onUserSelected }) {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [existingDMs, setExistingDMs] = useState([]);

    // Fetch available users for DM
    useEffect(() => {
        const fetchUsers = async () => {
            if (!projectId) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);

                // Fetch project members using apiClient (handles auth headers)
                const membersData = await apiClient.get(`/projects/${projectId}/members`);

                // Filter out current user
                const otherUsers = membersData.filter(user => user.id !== currentUserId);
                setUsers(otherUsers);

                // Fetch existing DM rooms
                try {
                    const dmsData = await apiClient.get(`/projects/${projectId}/rooms?type=dm`);
                    setExistingDMs(dmsData);
                } catch (dmError) {
                    // DM rooms fetch is optional, don't fail the whole component
                    log.debug('Could not fetch existing DMs:', dmError.message);
                }

                log.debug('Loaded users for DM:', otherUsers.length);
            } catch (err) {
                log.error('Failed to fetch users:', err);
                setError(err.message || 'Failed to load project members');
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [projectId, currentUserId]);

    // Find existing DM room with a user
    const findExistingDM = (userId) => {
        return existingDMs.find(dm => {
            // DM rooms have participants array or name pattern
            if (dm.participants) {
                return dm.participants.includes(userId) && dm.participants.includes(currentUserId);
            }
            // Fallback: check room name pattern (dm_userId1_userId2)
            const dmName = dm.name || '';
            return dmName.includes(userId) && dmName.includes(currentUserId);
        });
    };

    // Handle user click to start/open DM
    const handleUserClick = async (user) => {
        try {
            // Check if DM already exists
            const existingDM = findExistingDM(user.id);

            if (existingDM) {
                log.info('Opening existing DM:', existingDM.id);
                onUserSelected({ room: existingDM, user, isNew: false });
                return;
            }

            // Create new DM room
            log.info('Creating new DM with user:', user.id);

            // Create DM room name (consistent ordering for deduplication)
            const userIds = [currentUserId, user.id].sort();
            const dmName = `dm_${userIds[0]}_${userIds[1]}`;

            const newDMRoom = await apiClient.post(`/projects/${projectId}/rooms`, {
                name: dmName,
                description: `Direct message with ${user.name || user.email}`,
                isPublic: false,
                roomType: 'dm',
                participants: [currentUserId, user.id],
            });
            log.info('DM room created:', newDMRoom.id);

            // Add to existing DMs list
            setExistingDMs(prev => [...prev, newDMRoom]);

            // Notify parent
            onUserSelected({ room: newDMRoom, user, isNew: true });
        } catch (err) {
            log.error('Failed to start DM:', err);
            setError(err.message);
        }
    };

    if (isLoading) {
        return (
            <div className="dm-user-list">
                <div className="dm-user-list__loading">
                    <Icon name="loader" size={24} className="spin" />
                    <span>Loading users...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dm-user-list">
                <div className="dm-user-list__error">
                    <Icon name="alertCircle" size={24} />
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="dm-user-list">
                <div className="dm-user-list__empty">
                    <Icon name="users" size={32} />
                    <span>No other users in this project</span>
                    <span className="dm-user-list__hint">Invite team members to start conversations</span>
                </div>
            </div>
        );
    }

    return (
        <div className="dm-user-list">
            <div className="dm-user-list__header">
                <Icon name="messageSquare" size={14} />
                <span>Start a conversation</span>
            </div>

            <div className="dm-user-list__users">
                {users.map(user => {
                    const existingDM = findExistingDM(user.id);
                    const hasExistingDM = !!existingDM;

                    return (
                        <button
                            key={user.id}
                            className={`dm-user-list__user ${hasExistingDM ? 'dm-user-list__user--existing' : ''}`}
                            onClick={() => handleUserClick(user)}
                            title={hasExistingDM ? 'Continue conversation' : 'Start new conversation'}
                        >
                            <div
                                className="dm-user-list__avatar"
                                style={{
                                    '--avatar-color': user.color || '#3b82f6',
                                }}
                            >
                                {(user.name || user.email || '?')[0].toUpperCase()}
                            </div>
                            <div className="dm-user-list__info">
                                <span className="dm-user-list__name">
                                    {user.name || user.email || 'Unknown User'}
                                </span>
                                {user.email && (
                                    <span className="dm-user-list__email">{user.email}</span>
                                )}
                                {hasExistingDM && (
                                    <span className="dm-user-list__status">
                                        <Icon name="messageCircle" size={10} />
                                        Active conversation
                                    </span>
                                )}
                            </div>
                            <Icon
                                name={hasExistingDM ? 'arrowRight' : 'plus'}
                                size={16}
                                className="dm-user-list__action-icon"
                            />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
