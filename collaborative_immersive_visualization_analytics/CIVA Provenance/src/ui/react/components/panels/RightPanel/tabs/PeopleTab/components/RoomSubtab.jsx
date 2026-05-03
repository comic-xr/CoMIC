/**
 * @file RoomSubtab.jsx
 * @description Room subtab showing users in the current room.
 * Displays users grouped by voice status (in voice vs in room).
 *
 * @example
 * <RoomSubtab
 *   roomId="room-1"
 *   searchQuery=""
 *   selectedMember={null}
 *   onSelectMember={handleSelect}
 * />
 */

import React, { useMemo } from 'react';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates,
} from '@UI/react/components/organisms/ResizableSections';
import { MemberRow } from '@UI/react/components/molecules/MemberRow';
import { EmptyState } from '@UI/react/components/molecules/EmptyState';
import { useRoomPresence } from '@UI/react/hooks/useRoomPresence.js';

/**
 * @typedef {Object} RoomSubtabProps
 * @property {string} roomId - Current room ID
 * @property {string} searchQuery - Search filter query
 * @property {string|null} selectedMember - Selected member ID
 * @property {(memberId: string) => void} onSelectMember - Selection handler
 * @property {Object|null} [localCapabilities] - Local capability profile
 */

/**
 * Room subtab component.
 * Shows users in current room, grouped by voice status.
 *
 * @param {RoomSubtabProps} props - Component props
 * @returns {React.ReactElement} The rendered subtab
 */
export function RoomSubtab({
    roomId,
    searchQuery,
    selectedMember,
    onSelectMember,
    localCapabilities,
}) {
    const { inVoice, notInVoice, inVR } = useRoomPresence(roomId);

    // Filter by search query
    const filteredInVR = useMemo(() => {
        if (!inVR) return [];
        if (!searchQuery.trim()) return inVR;
        const q = searchQuery.toLowerCase();
        return inVR.filter(u => u.userName?.toLowerCase().includes(q));
    }, [inVR, searchQuery]);

    const filteredInVoice = useMemo(() => {
        if (!searchQuery.trim()) return inVoice;
        const q = searchQuery.toLowerCase();
        return inVoice.filter(u => u.userName?.toLowerCase().includes(q));
    }, [inVoice, searchQuery]);

    const filteredNotInVoice = useMemo(() => {
        if (!searchQuery.trim()) return notInVoice;
        const q = searchQuery.toLowerCase();
        return notInVoice.filter(u => u.userName?.toLowerCase().includes(q));
    }, [notInVoice, searchQuery]);

    // Section states for resizable sections
    const hasVRUsers = filteredInVR.length > 0;
    const { states: sectionStates, toggleSection } = useSectionStates({
        vr: { expanded: true, flexGrow: 1 },
        voice: { expanded: true, flexGrow: 1 },
        room: { expanded: true, flexGrow: 2 },
    });

    return (
        <ResizableSectionsContainer
            className="people-tab__sections"
            sectionStates={sectionStates}
            onSectionToggle={toggleSection}
        >
            {/* In VR Section - only show if there are VR users */}
            {hasVRUsers && (
                <ResizableSection
                    id="vr"
                    icon="vr"
                    iconColorClass="icon-purple"
                    label="In VR"
                    count={filteredInVR.length}
                >
                    {filteredInVR.map(user => (
                        <MemberRow
                            key={user.clientId || user.userId}
                            user={user}
                            isSelected={selectedMember === (user.clientId || user.userId)}
                            onSelect={onSelectMember}
                            showVRSession
                            showActions
                            localCapabilities={localCapabilities}
                        />
                    ))}
                </ResizableSection>
            )}

            <ResizableSection
                id="voice"
                icon="mic"
                iconColorClass="icon-green"
                label="In Voice"
                count={filteredInVoice.length}
            >
                {filteredInVoice.length === 0 ? (
                    <EmptyState
                        icon="mic"
                        title="No one in voice"
                        size="sm"
                    />
                ) : (
                    filteredInVoice.map(user => (
                        <MemberRow
                            key={user.clientId || user.userId}
                            user={user}
                            isSelected={selectedMember === (user.clientId || user.userId)}
                            onSelect={onSelectMember}
                            showVoiceStatus
                            localCapabilities={localCapabilities}
                        />
                    ))
                )}
            </ResizableSection>

            <ResizableSection
                id="room"
                icon="users"
                iconColorClass="icon-blue"
                label="In Room"
                count={filteredNotInVoice.length}
            >
                {filteredNotInVoice.length === 0 ? (
                    <EmptyState
                        icon="users"
                        title="No other users in room"
                        size="sm"
                    />
                ) : (
                    filteredNotInVoice.map(user => (
                        <MemberRow
                            key={user.clientId || user.userId}
                            user={user}
                            isSelected={selectedMember === (user.clientId || user.userId)}
                            onSelect={onSelectMember}
                            localCapabilities={localCapabilities}
                        />
                    ))
                )}
            </ResizableSection>
        </ResizableSectionsContainer>
    );
}

export default RoomSubtab;
