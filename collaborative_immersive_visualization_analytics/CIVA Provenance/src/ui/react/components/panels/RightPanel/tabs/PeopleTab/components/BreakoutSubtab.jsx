/**
 * @file BreakoutSubtab.jsx
 * @description Breakout subtab showing users viewing the current workspace.
 * Displays users with cursor visibility settings.
 *
 * @example
 * <BreakoutSubtab
 *   workspaceId="ws-1"
 *   searchQuery=""
 *   selectedMember={null}
 *   onSelectMember={handleSelect}
 * />
 */

import React, { useMemo } from 'react';
import { MemberRow } from '@UI/react/components/molecules/MemberRow';
import { EmptyState } from '@UI/react/components/molecules/EmptyState';
import { useWorkspacePresence } from '@UI/react/hooks/useRoomPresence.js';
import '../PeopleTab.scss';

/**
 * @typedef {Object} BreakoutSubtabProps
 * @property {string} workspaceId - Current workspace ID
 * @property {string} searchQuery - Search filter query
 * @property {string|null} selectedMember - Selected member ID
 * @property {(memberId: string) => void} onSelectMember - Selection handler
 * @property {Object|null} [localCapabilities] - Local capability profile
 */

/**
 * Breakout subtab component.
 * Shows users viewing the current workspace with cursor settings.
 *
 * @param {BreakoutSubtabProps} props - Component props
 * @returns {React.ReactElement} The rendered subtab
 */
export function BreakoutSubtab({
    workspaceId,
    searchQuery,
    selectedMember,
    onSelectMember,
    localCapabilities,
}) {
    const { users } = useWorkspacePresence(workspaceId);

    // Filter by search query
    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;
        const q = searchQuery.toLowerCase();
        return users.filter(u => u.userName?.toLowerCase().includes(q));
    }, [users, searchQuery]);

    return (
        <div className="people-tab__subtab-content">
            <div className="people-tab__user-list">
                <div className="people-tab__section-header">
                    Viewing This Workspace ({filteredUsers.length})
                </div>

                {filteredUsers.length === 0 ? (
                    <EmptyState
                        icon="layout"
                        title="No one else viewing"
                        description="You're the only one here"
                        size="sm"
                    />
                ) : (
                    filteredUsers.map(user => (
                        <MemberRow
                            key={user.clientId || user.userId}
                            user={user}
                            isSelected={selectedMember === (user.clientId || user.userId)}
                            onSelect={onSelectMember}
                            showViewing
                            localCapabilities={localCapabilities}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default BreakoutSubtab;
