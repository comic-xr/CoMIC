/**
 * @file RoomsTab.jsx
 * @description Breakout rooms management for spatial organization.
 * Part of the Right Panel collaboration hub.
 *
 * Features:
 * - Room list with project, breakout, and personal rooms
 * - Current location indicator
 * - Create new breakout rooms
 * - Join/leave rooms with voice integration
 * - Room settings and permissions
 *
 * @see Right_Panel_Design_Specification.md - Rooms Tab section
 *
 * @example
 * <RoomsTab workspaceId="ws-1" />
 */

import React, { useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { CollapsibleHeaderSection, StatBadge, SectionHeader } from '@UI/react/components/molecules/HeaderSection';
import { SearchBar } from '@UI/react/components/molecules/SearchBar';
import { LeaveRoomDialog } from '@UI/react/components/modals/confirmations';

import { useRoomsTab } from './hooks/useRoomsTab';
import { RoomCard } from './components/RoomCard';
import { CreateRoomForm } from './components/CreateRoomForm';

import './RoomsTab.scss';

// =============================================================================
// ROOM GROUP ICONS
// =============================================================================

const GROUP_ICONS = {
    project: 'globe',
    breakout: 'layout',
    personal: 'layout',
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * @typedef {Object} RoomsTabProps
 * @property {string} [workspaceId] - Current workspace ID
 */

/**
 * Rooms tab component.
 * Provides breakout room management and navigation.
 *
 * @param {RoomsTabProps} props - Component props
 * @returns {React.ReactElement} The rendered tab
 */
export function RoomsTab({ workspaceId, roomId, projectId, onSwitchRoom }) {
    const {
        rooms,
        currentRoom,
        error,
        searchQuery,
        setSearchQuery,
        showCreateForm,
        setShowCreateForm,
        groupedRooms,
        handleJoinRoom,
        handleLeaveRoom,
        handleCreateRoom,
        handleDeleteRoom,
    } = useRoomsTab({ projectId, activeRoomId: roomId, onSwitchRoom });

    // Leave room confirmation state
    const [leaveRoomTarget, setLeaveRoomTarget] = useState(null);

    // Wrapper to show confirmation dialog before leaving
    const handleLeaveRoomWithConfirm = useCallback((roomId) => {
        const room = rooms.find(r => r.id === roomId);
        if (room) {
            setLeaveRoomTarget(room);
        }
    }, [rooms]);

    // Confirmed leave handler
    const handleConfirmLeave = useCallback(() => {
        if (leaveRoomTarget) {
            handleLeaveRoom(leaveRoomTarget.id);
        }
    }, [leaveRoomTarget, handleLeaveRoom]);

    // Calculate stats for the header
    const onlineCount = rooms.reduce((sum, r) => sum + r.members.length, 0);
    const voiceCount = rooms.filter(r => r.hasVoice && r.members.length > 0)
        .reduce((sum, r) => sum + r.members.length, 0);
    const vrCount = 0; // Placeholder - would come from real data

    // Get current project/workspace info (placeholder)
    const currentProject = { name: 'Research Project' };
    const currentWorkspace = { name: 'Default Workspace' };

    return (
        <div className="rooms-panel">
            {/* Panel Header */}
            <div className="panel-header panel-header--purple">
                <Icon name="doorOpen" size={14} className="panel-header__icon" />
                <span className="panel-header__title">Rooms</span>
                <div className="panel-header__spacer" />
                <span className="panel-header__count">{rooms.length} rooms</span>
            </div>

            {/* Location Section - Current Location */}
            <div className="rooms-panel__header">
                <CollapsibleHeaderSection
                    icon="mapPin"
                    title="Your Location"
                    color="purple"
                    defaultExpanded={true}
                >
                    {/* Project name - centered subheader */}
                    <div className="location-status__project">
                        <Icon name="layers" size={14} />
                        <span className="location-status__project-name">
                            {currentProject?.name || 'No Project'}
                        </span>
                    </div>

                    {/* Room and Workspace details */}
                    <div className="location-status__details">
                        <div className="location-status__detail">
                            <Icon name="doorOpen" size={12} />
                            <span className="location-status__label">Room</span>
                            <span className="location-status__value">
                                {currentRoom?.name || 'Main Room'}
                            </span>
                        </div>
                        <div className="location-status__detail location-status__detail--subtle">
                            <Icon name="grid3x3" size={12} />
                            <span className="location-status__label">Workspace</span>
                            <span className="location-status__value">
                                {currentWorkspace?.name || 'Default'}
                            </span>
                        </div>
                    </div>

                    {/* Stats row with divider */}
                    <div className="location-status__stats">
                        <StatBadge icon="users">{onlineCount} online</StatBadge>
                        <div className="location-status__stats-right">
                            <StatBadge icon="mic" color="var(--color-accent-green)">
                                {voiceCount} in voice
                            </StatBadge>
                            {vrCount > 0 && (
                                <StatBadge icon="eye" color="var(--color-accent-purple)">
                                    {vrCount} in VR
                                </StatBadge>
                            )}
                        </div>
                    </div>
                </CollapsibleHeaderSection>
            </div>

            {/* Rooms List Section */}
            <div className="rooms-panel__list">
                {/* Search */}
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search rooms..."
                />

                <SectionHeader
                    icon="doorOpen"
                    color="var(--color-accent-purple)"
                    count={rooms.length}
                    actions={
                        <button
                            className="rooms-section__create-btn"
                            onClick={() => setShowCreateForm(true)}
                            title="Create breakout room"
                        >
                            <Icon name="add" size={12} />
                        </button>
                    }
                >
                    All Rooms
                </SectionHeader>

                <div className="rooms-list">
                    {error && (
                        <div className="rooms-list__error" role="alert">
                            <Icon name="alertCircle" size={14} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Create form */}
                    {showCreateForm && (
                        <CreateRoomForm
                            onSubmit={handleCreateRoom}
                            onCancel={() => setShowCreateForm(false)}
                        />
                    )}

                    {/* Room groups */}
                    {['project', 'breakout', 'personal'].map(type => {
                        const roomsOfType = groupedRooms[type];
                        if (roomsOfType.length === 0) return null;

                        const groupIconName = GROUP_ICONS[type];
                        const labels = {
                            project: 'Project Rooms',
                            breakout: 'Breakout Rooms',
                            personal: 'Personal Spaces',
                        };

                        return (
                            <div key={type} className="rooms-list__group">
                                <div className="rooms-list__group-header">
                                    <Icon name={groupIconName} size={12} />
                                    {labels[type]}
                                </div>
                                {roomsOfType.map(room => (
                                    <RoomCard
                                        key={room.id}
                                        room={room}
                                        onJoin={handleJoinRoom}
                                        onLeave={handleLeaveRoomWithConfirm}
                                        onSettings={() => { }}
                                        onDelete={handleDeleteRoom}
                                    />
                                ))}
                            </div>
                        );
                    })}

                    {/* Empty state */}
                    {rooms.length === 0 && (
                        <div className="rooms-list__empty">
                            <Icon name="layout" size={24} />
                            <span>No rooms available</span>
                            <button onClick={() => setShowCreateForm(true)}>
                                <Icon name="add" size={12} />
                                Create Room
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Leave Room Confirmation Dialog */}
            <LeaveRoomDialog
                isOpen={leaveRoomTarget !== null}
                onClose={() => setLeaveRoomTarget(null)}
                room={leaveRoomTarget ? {
                    id: leaveRoomTarget.id,
                    name: leaveRoomTarget.name,
                    participantCount: leaveRoomTarget.members?.length || 0
                } : null}
                onConfirm={handleConfirmLeave}
            />
        </div>
    );
}

// Export with both names for backwards compatibility
export { RoomsTab as RoomsPanelContent };
export default RoomsTab;
