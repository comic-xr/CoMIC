/**
 * @file VoiceTab.jsx
 * @description Voice chat controls and participant management.
 * Part of the Right Panel collaboration hub.
 *
 * Features:
 * - Voice channel status and selection
 * - Mute/deafen/leave controls with keyboard shortcuts
 * - Participant list with speaking indicators
 * - Per-participant volume control
 * - LiveKit integration for real-time voice
 *
 * @see Right_Panel_Design_Specification.md - Voice Tab section
 *
 * @example
 * <VoiceTab workspaceId="ws-1" channels={channels} />
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Button } from '@UI/react/components/atoms/Button';
import { CollapsibleHeaderSection, StatusDot, StatBadge, SectionHeader } from '@UI/react/components/molecules/HeaderSection';

import { useVoiceTab, VOICE_MODES } from './hooks/useVoiceTab';
import { ParticipantCard } from './components/ParticipantCard';

import './VoiceTab.scss';

// =============================================================================
// INPUT LEVEL METER COMPONENT
// =============================================================================

/**
 * Visual microphone input level indicator
 */
function InputLevelMeter({ level, muted }) {
    // Calculate bar segments (10 segments)
    const segments = 10;
    const activeSegments = Math.round((level / 100) * segments);

    return (
        <div className={`input-level-meter ${muted ? 'input-level-meter--muted' : ''}`}>
            <Icon name="mic" size={12} className="input-level-meter__icon" />
            <div className="input-level-meter__bars">
                {Array.from({ length: segments }).map((_, i) => {
                    const isActive = i < activeSegments;
                    const isHigh = i >= 7; // Red zone
                    const isMedium = i >= 4 && i < 7; // Yellow zone
                    return (
                        <div
                            key={i}
                            className={`input-level-meter__bar ${isActive ? 'input-level-meter__bar--active' : ''} ${isHigh ? 'input-level-meter__bar--high' : ''} ${isMedium ? 'input-level-meter__bar--medium' : ''}`}
                        />
                    );
                })}
            </div>
            <span className="input-level-meter__value">{level}%</span>
        </div>
    );
}

/**
 * PTT indicator shown when Push-to-Talk is active
 */
function PTTIndicator({ isActive, voiceMode }) {
    if (voiceMode !== VOICE_MODES.PTT) return null;

    return (
        <div className={`ptt-indicator ${isActive ? 'ptt-indicator--active' : ''}`}>
            <Icon name={isActive ? 'radio' : 'radioReceiver'} size={14} />
            <span>{isActive ? 'Transmitting...' : 'Hold SPACE to talk'}</span>
        </div>
    );
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format duration in seconds to HH:MM:SS or MM:SS
 */
function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * @typedef {Object} VoiceTabProps
 * @property {string} [workspaceId] - Current workspace ID
 * @property {Array} [channels] - Available voice channels
 */

/**
 * Voice tab component.
 * Provides voice chat controls and participant management.
 *
 * @param {VoiceTabProps} props - Component props
 * @returns {React.ReactElement} The rendered tab
 */
export function VoiceTab({
    workspaceId,
    roomId,
    roomName,
    availableRooms = [],
    channels: propChannels,
}) {
    const derivedChannels = useMemo(() => {
        if (propChannels?.length) {
            return propChannels;
        }

        const roomChannels = (availableRooms || []).map((room) => ({
            id: room.id,
            name: room.name,
            participants: room.onlineCount || room.members?.length || 0,
        }));

        if (roomChannels.length > 0) {
            return roomChannels;
        }

        if (roomId || roomName) {
            return [
                {
                    id: roomId || 'main',
                    name: roomName || 'Main Room',
                    participants: 0,
                },
            ];
        }

        return propChannels;
    }, [availableRooms, propChannels, roomId, roomName]);

    const {
        channels,
        connectionState,
        isConnected,
        muted,
        deafened,
        currentChannel,
        participants,
        voiceMode,
        isPTTActive,
        inputLevel,
        handleJoin,
        handleLeave,
        handleToggleMute,
        handleToggleDeafen,
        handleChannelSelect,
        handleAdjustVolume,
        handleToggleVoiceMode,
    } = useVoiceTab({
        channels: derivedChannels,
        initialChannelId: roomId,
    });

    // Track connection duration
    const [connectionDuration, setConnectionDuration] = useState(0);
    const [connectionStartTime, setConnectionStartTime] = useState(null);

    // Update connection duration timer
    useEffect(() => {
        if (isConnected && !connectionStartTime) {
            setConnectionStartTime(Date.now());
        } else if (!isConnected) {
            setConnectionStartTime(null);
            setConnectionDuration(0);
        }
    }, [isConnected, connectionStartTime]);

    useEffect(() => {
        if (!connectionStartTime) return;

        const interval = setInterval(() => {
            setConnectionDuration(Math.floor((Date.now() - connectionStartTime) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [connectionStartTime]);

    // Get current channel object
    const currentChannelObj = channels.find(c => c.id === currentChannel);

    return (
        <div className="voice-panel">
            {/* Panel Header */}
            <div className="panel-header panel-header--green">
                <Icon name="mic" size={14} className="panel-header__icon" />
                <span className="panel-header__title">Voice</span>
                <div className="panel-header__spacer" />
                <span className="panel-header__count">
                    {isConnected ? `${participants.length} in call` : 'Not connected'}
                </span>
            </div>

            {/* Status Section - Collapsible, not resizable */}
            <div className="voice-panel__header">
                <CollapsibleHeaderSection
                    icon="wifi"
                    title="Connection Status"
                    color={isConnected ? "green" : "default"}
                    defaultExpanded={true}
                >
                    {/* Row 1: Room name centered as subheading */}
                    <div className="voice-status__room">
                        <Icon name="doorOpen" size={14} />
                        <span className="voice-status__room-name">
                            {currentChannelObj?.name || 'Not Connected'}
                        </span>
                    </div>

                    {/* Row 2: Connection status */}
                    {isConnected && (
                        <div className="voice-status__connection">
                            <StatusDot color="var(--color-accent-green)" pulse />
                            <span className="voice-status__state">Connected</span>
                        </div>
                    )}

                    {/* Row 2: Stats */}
                    {isConnected && (
                        <div className="voice-status__stats">
                            <StatBadge icon="users">
                                {participants.length} in voice
                            </StatBadge>
                            <StatBadge icon="clock">
                                {formatDuration(connectionDuration)}
                            </StatBadge>
                        </div>
                    )}

                    {/* Input Level Meter */}
                    {isConnected && (
                        <InputLevelMeter level={inputLevel} muted={muted} />
                    )}

                    {/* PTT Indicator */}
                    {isConnected && (
                        <PTTIndicator isActive={isPTTActive} voiceMode={voiceMode} />
                    )}

                    {/* Controls */}
                    {isConnected ? (
                        <div className="voice-status__controls">
                            <div className="voice-status__controls-left">
                                <Button
                                    icon={muted ? 'micOff' : 'mic'}
                                    variant={muted ? 'danger' : 'primary'}
                                    onClick={handleToggleMute}
                                    title={muted ? 'Unmute (M)' : 'Mute (M)'}
                                    disabled={voiceMode === VOICE_MODES.PTT}
                                />
                                <Button
                                    icon="headphones"
                                    variant={deafened ? 'danger' : 'secondary'}
                                    onClick={handleToggleDeafen}
                                    title={deafened ? 'Undeafen (D)' : 'Deafen (D)'}
                                />
                                <Button
                                    icon={voiceMode === VOICE_MODES.PTT ? 'radio' : 'activity'}
                                    variant={voiceMode === VOICE_MODES.PTT ? 'warning' : 'ghost'}
                                    onClick={handleToggleVoiceMode}
                                    title={voiceMode === VOICE_MODES.PTT ? 'Switch to Voice Activity' : 'Switch to Push-to-Talk'}
                                />
                                <Button
                                    icon="settings"
                                    variant="ghost"
                                    onClick={() => { }}
                                    title="Voice Settings"
                                />
                            </div>
                            <Button
                                icon="phoneOff"
                                variant="danger"
                                onClick={handleLeave}
                                title="Leave Voice"
                            />
                        </div>
                    ) : (
                        <div className="voice-status__join">
                            <Button
                                icon="phone"
                                variant="primary"
                                onClick={handleJoin}
                            >
                                Join Voice
                            </Button>
                        </div>
                    )}
                </CollapsibleHeaderSection>
            </div>

            {/* List Section - Scrollable */}
            <div className="voice-panel__list">
                <SectionHeader
                    icon="users"
                    color="var(--color-accent-green)"
                    count={participants.length}
                >
                    In Channel
                </SectionHeader>
                <div className="participants-list">
                    {!isConnected ? (
                        <div className="voice-panel__empty">
                            Join a voice channel to see participants
                        </div>
                    ) : participants.length === 0 ? (
                        <div className="voice-panel__empty">
                            No other participants yet
                        </div>
                    ) : (
                        participants.map(participant => (
                            <ParticipantCard
                                key={participant.id}
                                participant={participant}
                                onAdjustVolume={handleAdjustVolume}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// Export with both names for backwards compatibility
export { VoiceTab as VoicePanelContent };
export default VoiceTab;
