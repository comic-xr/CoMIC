/**
 * @file ProjectSubtab.jsx
 * @description Project subtab showing all project members grouped by room.
 * Displays full project roster with room groupings.
 *
 * @example
 * <ProjectSubtab
 *   searchQuery=""
 *   selectedMember={null}
 *   onSelectMember={handleSelect}
 * />
 */

import React, { useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { MemberRow } from '@UI/react/components/molecules/MemberRow';
import { EmptyState } from '@UI/react/components/molecules/EmptyState';
import { useProjectPresence } from '@UI/react/hooks/useRoomPresence.js';
import '../PeopleTab.scss';

/**
 * @typedef {Object} ProjectSubtabProps
 * @property {string} searchQuery - Search filter query
 * @property {string|null} selectedMember - Selected member ID
 * @property {(memberId: string) => void} onSelectMember - Selection handler
 * @property {Object|null} [localCapabilities] - Local capability profile
 */

/**
 * Project subtab component.
 * Shows all project members grouped by their current room.
 *
 * @param {ProjectSubtabProps} props - Component props
 * @returns {React.ReactElement} The rendered subtab
 */
export function ProjectSubtab({
    searchQuery,
    selectedMember,
    onSelectMember,
    localCapabilities,
}) {
    const { allUsers, totalOnline } = useProjectPresence();

    // Filter by search query
    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return allUsers;
        const q = searchQuery.toLowerCase();
        return allUsers.filter(u => u.userName?.toLowerCase().includes(q));
    }, [allUsers, searchQuery]);

    // Group filtered users by room
    const groupedByRoom = useMemo(() => {
        const groups = {};
        filteredUsers.forEach(user => {
            const roomId = user.roomId || 'unknown';
            if (!groups[roomId]) {
                groups[roomId] = {
                    roomName: user.roomName || 'Unknown Room',
                    users: [],
                };
            }
            groups[roomId].users.push(user);
        });
        return groups;
    }, [filteredUsers]);

    const roomIds = Object.keys(groupedByRoom);

    return (
        <div className="people-tab__subtab-content people-tab__subtab-content--scrollable">
            <div className="people-tab__section-header">
                All Project Members ({totalOnline} online)
            </div>

            {filteredUsers.length === 0 ? (
                <EmptyState
                    icon="globe"
                    title="No users online"
                    description="No project members are currently online"
                    size="sm"
                />
            ) : (
                roomIds.map(roomId => (
                    <div key={roomId} className="people-tab__room-group">
                        <div className="people-tab__room-header">
                            <Icon name="home" size={10} />
                            <span>{groupedByRoom[roomId].roomName}</span>
                            <span className="people-tab__room-count">
                                ({groupedByRoom[roomId].users.length})
                            </span>
                        </div>
                        {groupedByRoom[roomId].users.map(user => (
                            <MemberRow
                                key={user.clientId || user.userId}
                                user={user}
                                isSelected={selectedMember === (user.clientId || user.userId)}
                                onSelect={onSelectMember}
                                localCapabilities={localCapabilities}
                            />
                        ))}
                    </div>
                ))
            )}
        </div>
    );
}

export default ProjectSubtab;
