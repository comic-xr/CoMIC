/**
 * @file VoiceControls.jsx
 * @description Main voice control buttons (mute, deafen, leave).
 */

import React from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { VoiceConnectionState } from '@Services/voice/voiceRoomService.js';

/**
 * @typedef {Object} VoiceControlsProps
 * @property {string} connectionState - Current connection state
 * @property {boolean} muted - Whether mic is muted
 * @property {boolean} deafened - Whether audio is deafened
 * @property {function} onToggleMute - Callback to toggle mute
 * @property {function} onToggleDeafen - Callback to toggle deafen
 * @property {function} onJoin - Callback to join voice
 * @property {function} onLeave - Callback to leave voice
 */

/**
 * Voice controls component.
 * Displays mute/deafen/leave buttons or join button.
 *
 * @param {VoiceControlsProps} props - Component props
 * @returns {React.ReactElement} The rendered controls
 */
export function VoiceControls({
    connectionState,
    muted,
    deafened,
    onToggleMute,
    onToggleDeafen,
    onLeave,
    onJoin
}) {
    const isConnected = connectionState === VoiceConnectionState.CONNECTED;
    const isConnecting = connectionState === VoiceConnectionState.CONNECTING;
    const isReconnecting = connectionState === VoiceConnectionState.RECONNECTING;

    if (!isConnected && !isReconnecting) {
        return (
            <div className="voice-controls voice-controls--disconnected">
                <LabeledButton
                    icon="radio"
                    label={isConnecting ? 'Connecting...' : 'Join Voice'}
                    onClick={onJoin}
                    disabled={isConnecting}
                    variant="primary"
                    className="voice-controls__join-btn"
                />
            </div>
        );
    }

    return (
        <div className="voice-controls">
            {isReconnecting && (
                <div className="voice-controls__status">Reconnecting...</div>
            )}
            <IconButton
                icon={muted ? 'micOff' : 'mic'}
                onClick={onToggleMute}
                tooltip={muted ? 'Unmute (M)' : 'Mute (M)'}
                active={muted}
                size="md"
                variant="ghost"
                className="voice-controls__btn"
            />

            <IconButton
                icon={deafened ? 'headphoneOff' : 'headphones'}
                onClick={onToggleDeafen}
                tooltip={deafened ? 'Undeafen' : 'Deafen'}
                active={deafened}
                size="md"
                variant="ghost"
                className="voice-controls__btn"
            />

            <IconButton
                icon="phoneOff"
                onClick={onLeave}
                tooltip="Leave Voice"
                size="md"
                variant="ghost"
                color="red"
                className="voice-controls__btn voice-controls__btn--leave"
            />

            <IconButton
                icon="settings"
                tooltip="Voice Settings"
                size="md"
                variant="ghost"
                className="voice-controls__btn"
            />
        </div>
    );
}

export default VoiceControls;