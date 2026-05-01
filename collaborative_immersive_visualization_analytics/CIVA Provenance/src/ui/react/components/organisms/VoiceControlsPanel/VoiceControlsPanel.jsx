/**
 * @file VoiceControlsPanel.jsx
 * @description Discord-style voice controls panel.
 * Shows compact join button when not in voice (with room selection),
 * full controls when connected with device selection and room switching.
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import './VoiceControlsPanel.scss';

// =============================================================================
// ROOM POPUP COMPONENT
// =============================================================================

const RoomPopup = memo(function RoomPopup({
    isOpen,
    onClose,
    anchorRef,
    rooms = [],
    currentRoom,
    onSelectRoom,
    title = 'Voice Channels',
}) {
    const popupRef = useRef(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    // Calculate position based on anchor element
    useEffect(() => {
        if (!isOpen || !anchorRef?.current) return;

        const updatePosition = () => {
            const rect = anchorRef.current.getBoundingClientRect();
            setPosition({
                top: rect.top - 8,
                left: rect.left + rect.width / 2,
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen, anchorRef]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target) &&
                anchorRef?.current && !anchorRef.current.contains(e.target)) {
                onClose();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose, anchorRef]);

    if (!isOpen) return null;

    // Default rooms if none provided
    const displayRooms = rooms.length > 0 ? rooms : [
        { id: 'main', name: 'General' },
        { id: 'team-a', name: 'Team A' },
        { id: 'team-b', name: 'Team B' },
    ];

    return (
        <div
            className="voice-room-popup"
            ref={popupRef}
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                transform: 'translate(-50%, -100%)',
            }}
        >
            <div className="voice-room-popup__header">
                <Icon name="headset" size={14} />
                <span>{title}</span>
            </div>
            <div className="voice-room-popup__list">
                {displayRooms.map((room) => (
                    <button
                        key={room.id}
                        type="button"
                        className={`voice-room-popup__item ${currentRoom?.id === room.id ? 'voice-room-popup__item--selected' : ''}`}
                        onClick={() => {
                            onSelectRoom(room);
                            onClose();
                        }}
                    >
                        <Icon name="volume" size={14} className="voice-room-popup__item-icon" />
                        <span className="voice-room-popup__item-name">{room.name}</span>
                        {currentRoom?.id === room.id && (
                            <Icon name="check" size={12} className="voice-room-popup__item-check" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
});

// =============================================================================
// DEVICE POPUP COMPONENT
// =============================================================================

const DevicePopup = memo(function DevicePopup({
    type, // 'input' or 'output'
    isOpen,
    onClose,
    anchorRef,
}) {
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const popupRef = useRef(null);

    // Calculate position based on anchor element
    useEffect(() => {
        if (!isOpen || !anchorRef?.current) return;

        const updatePosition = () => {
            const rect = anchorRef.current.getBoundingClientRect();
            setPosition({
                top: rect.top - 8, // 8px gap above anchor
                left: rect.left + rect.width / 2, // Center on anchor
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen, anchorRef]);

    // Load available devices
    useEffect(() => {
        if (!isOpen) return;

        const loadDevices = async () => {
            try {
                const allDevices = await navigator.mediaDevices.enumerateDevices();
                const filtered = allDevices.filter(d =>
                    type === 'input' ? d.kind === 'audioinput' : d.kind === 'audiooutput'
                );
                setDevices(filtered);
                setSelectedDevice('default');
            } catch (e) {
                console.error('Failed to enumerate devices:', e);
            }
        };

        loadDevices();
    }, [isOpen, type]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target) &&
                anchorRef?.current && !anchorRef.current.contains(e.target)) {
                onClose();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose, anchorRef]);

    if (!isOpen) return null;

    const handleSelectDevice = (deviceId) => {
        setSelectedDevice(deviceId);
        // TODO: Actually switch the device in voiceRoomService
        onClose();
    };

    return (
        <div
            className="voice-device-popup"
            ref={popupRef}
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                transform: 'translate(-50%, -100%)',
            }}
        >
            <div className="voice-device-popup__header">
                <Icon name={type === 'input' ? 'mic' : 'headphones'} size={14} />
                <span>{type === 'input' ? 'Input Device' : 'Output Device'}</span>
            </div>
            <div className="voice-device-popup__list">
                {devices.length === 0 ? (
                    <div className="voice-device-popup__empty">
                        No devices found
                    </div>
                ) : (
                    devices.map((device) => (
                        <button
                            key={device.deviceId}
                            type="button"
                            className={`voice-device-popup__item ${selectedDevice === device.deviceId ? 'voice-device-popup__item--selected' : ''}`}
                            onClick={() => handleSelectDevice(device.deviceId)}
                        >
                            <span className="voice-device-popup__item-name">
                                {device.label || `${type === 'input' ? 'Microphone' : 'Speaker'} ${devices.indexOf(device) + 1}`}
                            </span>
                            {selectedDevice === device.deviceId && (
                                <Icon name="check" size={12} className="voice-device-popup__item-check" />
                            )}
                        </button>
                    ))
                )}
            </div>
        </div>
    );
});

// =============================================================================
// JOIN BUTTON WITH ROOM SELECTION
// =============================================================================

const JoinVoiceButton = memo(function JoinVoiceButton({
    onJoin,
    rooms = [],
    defaultRoom,
    isJoining = false,
}) {
    const [showRoomPopup, setShowRoomPopup] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(defaultRoom);
    const buttonRef = useRef(null);

    const handleJoinClick = () => {
        if (isJoining) return; // Prevent double-click while joining

        if (rooms.length > 1) {
            setShowRoomPopup(true);
        } else {
            // Join default room directly
            onJoin(selectedRoom || rooms[0] || { id: 'main', name: 'General' });
        }
    };

    const handleSelectRoom = (room) => {
        setSelectedRoom(room);
        onJoin(room);
    };

    return (
        <div className="voice-join-container">
            <button
                ref={buttonRef}
                type="button"
                className={`voice-controls-panel__join-btn ${isJoining ? 'voice-controls-panel__join-btn--joining' : ''}`}
                onClick={handleJoinClick}
                title={isJoining ? 'Connecting...' : 'Join Voice Channel'}
                disabled={isJoining}
            >
                {isJoining ? (
                    <>
                        <Icon name="loader" size={16} className="voice-controls-panel__join-spinner" />
                        <span>Connecting...</span>
                    </>
                ) : (
                    <>
                        <Icon name="headsetMic" size={16} />
                        <span>Join Voice</span>
                        {rooms.length > 1 && (
                            <Icon name="chevronUp" size={12} className="voice-controls-panel__join-chevron" />
                        )}
                    </>
                )}
            </button>
            <RoomPopup
                isOpen={showRoomPopup}
                onClose={() => setShowRoomPopup(false)}
                anchorRef={buttonRef}
                rooms={rooms}
                currentRoom={selectedRoom}
                onSelectRoom={handleSelectRoom}
                title="Select Channel"
            />
        </div>
    );
});

// =============================================================================
// CONTROL BUTTON COMPONENT
// =============================================================================

const ControlButton = memo(function ControlButton({
    icon,
    label,
    active,
    muted,
    onClick,
    className = '',
    size = 'normal',
}) {
    return (
        <IconButton
            icon={icon}
            onClick={onClick}
            tooltip={label}
            active={active || muted}
            size={size === 'small' ? 'xs' : 'sm'}
            variant="ghost"
            className={`voice-controls-panel__ctrl-btn ${muted ? 'voice-controls-panel__ctrl-btn--muted' : ''} ${className}`}
        />
    );
});

// =============================================================================
// DEVICE BUTTON WITH POPUP
// =============================================================================

const DeviceButton = memo(function DeviceButton({
    type, // 'input' or 'output'
    groupRef, // Reference to the parent control group for popup positioning
}) {
    const [popupOpen, setPopupOpen] = useState(false);
    const buttonRef = useRef(null);

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                className="voice-controls-panel__device-btn"
                onClick={() => setPopupOpen(!popupOpen)}
                title={`${type === 'input' ? 'Input' : 'Output'} Options`}
            >
                <Icon name="chevronUp" size={10} />
            </button>
            <DevicePopup
                type={type}
                isOpen={popupOpen}
                onClose={() => setPopupOpen(false)}
                anchorRef={groupRef || buttonRef}
            />
        </>
    );
});

// =============================================================================
// CHANNEL DISPLAY WITH ROOM SWITCHING
// =============================================================================

const ChannelDisplay = memo(function ChannelDisplay({
    currentChannel,
    rooms = [],
    onChangeChannel,
}) {
    const [showRoomPopup, setShowRoomPopup] = useState(false);
    const displayRef = useRef(null);

    const handleClick = () => {
        if (rooms.length > 0 || onChangeChannel) {
            setShowRoomPopup(true);
        }
    };

    return (
        <div className="voice-channel-display-wrapper">
            <button
                ref={displayRef}
                type="button"
                className="voice-controls-panel__channel-display"
                onClick={handleClick}
                title="Switch Channel"
            >
                <Icon name="headset" size={12} className="voice-controls-panel__channel-icon" />
                <span className="voice-controls-panel__channel-name">
                    {currentChannel?.name || 'Voice Connected'}
                </span>
                <Icon name="chevronUp" size={10} className="voice-controls-panel__channel-chevron" />
            </button>
            <RoomPopup
                isOpen={showRoomPopup}
                onClose={() => setShowRoomPopup(false)}
                anchorRef={displayRef}
                rooms={rooms}
                currentRoom={currentChannel}
                onSelectRoom={(room) => {
                    onChangeChannel?.(room);
                    setShowRoomPopup(false);
                }}
                title="Switch Channel"
            />
        </div>
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function VoiceControlsPanel({
    isMuted = false,
    isDeafened = false,
    isInChannel = false,
    isJoining = false,
    currentChannel,
    channels = [],
    onToggleMute,
    onToggleDeafen,
    onJoinLeave,
    onChangeChannel,
    onOpenSettings,
    className = '',
}) {
    const inputGroupRef = useRef(null);
    const outputGroupRef = useRef(null);

    // If not in voice channel, show compact join button
    if (!isInChannel) {
        return (
            <div className={`voice-controls-panel voice-controls-panel--compact ${className}`}>
                <JoinVoiceButton
                    onJoin={(room) => onJoinLeave?.(room)}
                    rooms={channels}
                    defaultRoom={currentChannel}
                    isJoining={isJoining}
                />
            </div>
        );
    }

    // In voice channel - show full controls
    return (
        <div className={`voice-controls-panel ${className}`}>
            {/* Channel info - clickable to switch rooms */}
            <ChannelDisplay
                currentChannel={currentChannel}
                rooms={channels}
                onChangeChannel={onChangeChannel}
            />

            <div className="voice-controls-panel__divider" />

            {/* Mute with input device selector */}
            <div ref={inputGroupRef} className="voice-controls-panel__control-group">
                <ControlButton
                    icon={isMuted ? 'micOff' : 'mic'}
                    label={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                    active={!isMuted}
                    muted={isMuted}
                    onClick={onToggleMute}
                />
                <DeviceButton type="input" groupRef={inputGroupRef} />
            </div>

            {/* Deafen with output device selector */}
            <div ref={outputGroupRef} className="voice-controls-panel__control-group">
                <ControlButton
                    icon={isDeafened ? 'headsetOff' : 'headset'}
                    label={isDeafened ? 'Undeafen (D)' : 'Deafen (D)'}
                    active={!isDeafened}
                    muted={isDeafened}
                    onClick={onToggleDeafen}
                />
                <DeviceButton type="output" groupRef={outputGroupRef} />
            </div>

            <div className="voice-controls-panel__divider" />

            {/* Settings */}
            <ControlButton
                icon="settings"
                label="Voice Settings"
                onClick={onOpenSettings}
                size="small"
            />

            {/* Leave button - prominent red with text for clarity */}
            <LabeledButton
                icon="close"
                label="Leave"
                onClick={onJoinLeave}
                size="sm"
                variant="primary"
                color="red"
                className="voice-controls-panel__leave-btn"
            />
        </div>
    );
}

export default memo(VoiceControlsPanel);
export { VoiceControlsPanel };
