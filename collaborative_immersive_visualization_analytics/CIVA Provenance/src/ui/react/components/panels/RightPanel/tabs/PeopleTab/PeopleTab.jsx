/**
 * @file PeopleTab.jsx
 * @description People tab showing project members with presence status.
 * Part of the Right Panel collaboration hub.
 *
 * Features:
 * - Sub-tabs: Room (current), Breakout (all rooms), Project (full roster)
 * - Presence indicators (online, voice, VR, away, DND)
 * - Quick actions (message, go to view, toggle cursor)
 * - VR session cards with join options
 * - Settings for presence preferences
 *
 * @see Right_Panel_Design_Specification.md - People Tab section
 *
 * @example
 * <PeopleTab workspaceId="ws-1" roomId="room-1" />
 */

import React, { useCallback } from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { SubtabBar } from '@UI/react/components/molecules/SubtabBar';
import { SearchBar } from '@UI/react/components/molecules/SearchBar';
import { usePresence } from '@UI/react/hooks/usePresence.js';
import { toast } from '@UI/react/store/toastStore';
import { presenceSystem } from '@Collaboration/presence/presenceSystem.js';

import { usePeopleTab } from './hooks/usePeopleTab';
import { RoomSubtab } from './components/RoomSubtab';
import { BreakoutSubtab } from './components/BreakoutSubtab';
import { ProjectSubtab } from './components/ProjectSubtab';

import './PeopleTab.scss';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * @typedef {Object} PeopleTabProps
 * @property {string} [workspaceId] - Current workspace ID
 * @property {string} [roomId] - Current room ID
 */

/**
 * People tab component.
 * Shows project members organized by room, breakout, or project scope.
 *
 * @param {PeopleTabProps} props - Component props
 * @returns {React.ReactElement} The rendered tab
 */
export function PeopleTab({ workspaceId, roomId }) {
    const {
        activeSubtab,
        setActiveSubtab,
        subtabs,
        searchQuery,
        setSearchQuery,
        clearSearch,
        searchPlaceholder,
        selectedMember,
        handleSelectMember,
        onlineCount,
        isInitialized,
    } = usePeopleTab();
    const { currentUser } = usePresence();
    const localCapabilities = currentUser?.capabilities || null;
    const activePresenter = presenceSystem.getActivePresenter(roomId);
    const hasPresenter = !!activePresenter && !activePresenter.isYou;
    const handleInvite = useCallback(async () => {
        const inviteUrl = new URL(window.location.href);
        const effectiveRoomId = roomId || currentUser?.roomId || presenceSystem.getRoom?.() || null;

        if (effectiveRoomId) {
            inviteUrl.searchParams.set('inviteRoom', effectiveRoomId);
        } else {
            inviteUrl.searchParams.delete('inviteRoom');
        }

        inviteUrl.searchParams.set('inviteFresh', '1');

        inviteUrl.searchParams.delete('devUser');
        inviteUrl.searchParams.delete('demoPeople');
        inviteUrl.searchParams.delete('demoDataset');
        inviteUrl.searchParams.delete('demoScene');

        const inviteLink = inviteUrl.toString();

        try {
            await navigator.clipboard.writeText(inviteLink);
            toast.success(`${effectiveRoomId ? 'Room' : 'Project'} invite link copied to clipboard.`, {
                description: effectiveRoomId
                    ? 'Open it in another browser or send it to a collaborator.'
                    : 'This link opens the current project even when no breakout room is selected.',
            });
        } catch (error) {
            window.prompt('Copy this invite link', inviteLink);
            toast.info(`${effectiveRoomId ? 'Room' : 'Project'} invite link is ready to copy.`);
        }
    }, [currentUser?.roomId, roomId]);

    return (
        <div className="people-tab">
            {/* Header */}
            <div className="panel-header panel-header--pink">
                <Icon name="users" size={14} className="panel-header__icon" />
                <span className="panel-header__title">People</span>
                <div className="panel-header__spacer" />
                <span className="panel-header__count">{onlineCount} online</span>
            </div>

            {/* Subtab Bar */}
            <SubtabBar
                tabs={subtabs}
                activeTab={activeSubtab}
                onTabChange={setActiveSubtab}
            />

            {/* Search */}
            <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={searchPlaceholder}
            />

            {/* Connection Status */}
            {!isInitialized && (
                <div className="people-tab__connection-status">
                    Connecting to presence server...
                </div>
            )}

            {/* Subtab Content */}
            <div className="people-tab__content">
                {activeSubtab === 'room' && (
                    <RoomSubtab
                        roomId={roomId}
                        searchQuery={searchQuery}
                        selectedMember={selectedMember}
                        onSelectMember={handleSelectMember}
                        localCapabilities={localCapabilities}
                    />
                )}
                {activeSubtab === 'breakout' && (
                    <BreakoutSubtab
                        workspaceId={workspaceId}
                        searchQuery={searchQuery}
                        selectedMember={selectedMember}
                        onSelectMember={handleSelectMember}
                        localCapabilities={localCapabilities}
                    />
                )}
                {activeSubtab === 'project' && (
                    <ProjectSubtab
                        searchQuery={searchQuery}
                        selectedMember={selectedMember}
                        onSelectMember={handleSelectMember}
                        localCapabilities={localCapabilities}
                    />
                )}
            </div>

            {/* Footer */}
            <div className="panel-footer">
                <LabeledButton
                    icon="userPlus"
                    label="Invite"
                    size="sm"
                    onClick={handleInvite}
                />
                <IconButton
                    icon="eye"
                    size="sm"
                    variant="ghost"
                    tooltip="View Following"
                    onClick={() => window.dispatchEvent(new CustomEvent('cia:open-user-following'))}
                />
                <IconButton
                    icon="hand"
                    size="sm"
                    variant={currentUser?.handRaised ? "primary" : "ghost"}
                    tooltip={currentUser?.handRaised ? "Lower Hand" : "Raise Hand"}
                    onClick={() => presenceSystem.toggleHandRaised()}
                />
                <IconButton
                    icon="star"
                    size="sm"
                    variant={currentUser?.role === 'presenter' ? "primary" : "ghost"}
                    tooltip={
                        hasPresenter && currentUser?.role !== 'presenter'
                            ? `Presenter Lock Taken by ${activePresenter?.userName || 'another user'}`
                            : (currentUser?.role === 'presenter' ? "Release Presenter Lock" : "Take Presenter Lock")
                    }
                    disabled={hasPresenter && currentUser?.role !== 'presenter'}
                    onClick={() => {
                        const isPresenter = currentUser?.role === 'presenter';
                        if (isPresenter) {
                            presenceSystem.releasePresenterRole();
                            return;
                        }

                        presenceSystem.requestPresenterRole({ roomId });
                    }}
                />
                <IconButton
                    icon="settings"
                    size="sm"
                    variant="ghost"
                    tooltip="Settings"
                />
            </div>
        </div>
    );
}

// Export with both names for backwards compatibility
export { PeopleTab as PeoplePanelContent };
export default PeopleTab;
