/**
 * @file VoiceSection.jsx
 * @description VOICE section of the RoomHeader.
 *
 * Two states:
 * A) Not in Voice: Split button (Join Voice main click + dropdown arrow for room picker)
 * B) In Voice: Voice channel indicator + mute/deafen/leave controls
 *
 * Voice can be in a room channel (green theme) or a breakout (purple theme).
 */

import React, { memo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';

const VoiceSection = memo(function VoiceSection({
    viewingRoom,
    viewingRoomId,
    voiceRoom,
    voiceRoomId,
    isInVoice,
    isInBreakout,
    activeBreakoutId,
    activeBreakout,
    currentVoiceName,
    currentVoiceUsers,
    breakouts = [],
    rooms = [],
    isMuted = false,
    isDeafened = false,
    onJoinVoice,
    onJoinBreakout,
    onLeaveVoice,
    onToggleMute,
    onToggleDeafen,
    // Dropdown state
    showVoiceDropdown,
    showJoinDropdown,
    onToggleVoice,
    onToggleJoin,
    onCloseDropdowns,
}) {
    const voiceDropdownRef = useRef(null);
    const joinDropdownRef = useRef(null);

    // Close dropdowns on outside click
    useEffect(() => {
        if (!showVoiceDropdown && !showJoinDropdown) return;
        const handleClickOutside = (e) => {
            if (showVoiceDropdown && voiceDropdownRef.current && !voiceDropdownRef.current.contains(e.target)) {
                onCloseDropdowns();
            }
            if (showJoinDropdown && joinDropdownRef.current && !joinDropdownRef.current.contains(e.target)) {
                onCloseDropdowns();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showVoiceDropdown, showJoinDropdown, onCloseDropdowns]);

    const themeColor = isInBreakout ? 'purple' : 'green';

    return (
        <div className="room-header__section room-header__voice-section">
            {isInVoice ? (
                /* ===== IN VOICE STATE ===== */
                <div className={`room-header__voice-active room-header__voice-active--${themeColor}`}>
                    {/* Voice Channel Dropdown Trigger */}
                    <div className="room-header__voice-channel" ref={voiceDropdownRef}>
                        <button
                            className={`room-header__voice-channel-btn room-header__voice-channel-btn--${themeColor}`}
                            onClick={onToggleVoice}
                        >
                            <Icon name={isInBreakout ? 'gitBranch' : 'headphones'} size={14} />
                            <div className="room-header__voice-info">
                                <span className="room-header__voice-label">
                                    {isInBreakout ? 'Breakout' : 'Voice'}
                                </span>
                                <span className="room-header__voice-name">
                                    {currentVoiceName}
                                </span>
                            </div>
                            <span className="room-header__voice-users">({currentVoiceUsers})</span>
                            <Icon name="chevronDown" size={12} />
                        </button>

                        {/* Voice Channel Dropdown */}
                        {showVoiceDropdown && (
                            <div className="room-header__voice-dropdown">
                                <div className="room-header__dropdown-content">
                                    {/* Room Voice */}
                                    <div className="room-header__dropdown-group-label room-header__dropdown-group-label--green">
                                        <Icon name="headphones" size={10} />
                                        Room Voice
                                    </div>
                                    <button
                                        className={`room-header__dropdown-item room-header__dropdown-item--full ${voiceRoomId === viewingRoomId && !isInBreakout ? 'room-header__dropdown-item--active-green' : ''}`}
                                        onClick={() => {
                                            onJoinVoice(viewingRoomId);
                                            onCloseDropdowns();
                                        }}
                                    >
                                        <span className="room-header__dropdown-dot" style={{ background: viewingRoom?.color }} />
                                        <span className="room-header__dropdown-name">{viewingRoom?.name}</span>
                                        {voiceRoomId === viewingRoomId && !isInBreakout && (
                                            <Icon name="check" size={12} className="room-header__dropdown-check--green" />
                                        )}
                                        <span className="room-header__dropdown-voice-count">
                                            {viewingRoom?.usersInVoice} in voice
                                        </span>
                                    </button>

                                    {/* Breakouts */}
                                    {breakouts.length > 0 && (
                                        <>
                                            <div className="room-header__dropdown-group-label room-header__dropdown-group-label--purple">
                                                <Icon name="gitBranch" size={10} />
                                                Workspace Breakouts
                                            </div>
                                            {breakouts.map(breakout => (
                                                <button
                                                    key={breakout.id}
                                                    className={`room-header__dropdown-item room-header__dropdown-item--full ${activeBreakoutId === breakout.id ? 'room-header__dropdown-item--active-purple' : ''}`}
                                                    onClick={() => {
                                                        onJoinBreakout(breakout.id);
                                                        onCloseDropdowns();
                                                    }}
                                                >
                                                    <Icon name="gitBranch" size={12} className="room-header__dropdown-breakout-icon" />
                                                    <span className="room-header__dropdown-name">{breakout.name}</span>
                                                    {activeBreakoutId === breakout.id && (
                                                        <Icon name="check" size={12} className="room-header__dropdown-check--purple" />
                                                    )}
                                                    <span className="room-header__dropdown-breakout-count">{breakout.usersInVoice}</span>
                                                </button>
                                            ))}
                                        </>
                                    )}

                                    {/* Leave */}
                                    <div className="room-header__dropdown-divider" />
                                    <button
                                        className="room-header__dropdown-leave"
                                        onClick={() => {
                                            onLeaveVoice();
                                            onCloseDropdowns();
                                        }}
                                    >
                                        <Icon name="phoneOff" size={12} />
                                        Leave Voice
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls Separator */}
                    <div className="room-header__voice-divider" />

                    {/* Mute */}
                    <button
                        className={`room-header__voice-control ${isMuted ? 'room-header__voice-control--danger' : `room-header__voice-control--${themeColor}`}`}
                        onClick={onToggleMute}
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        <Icon name={isMuted ? 'micOff' : 'mic'} size={14} />
                    </button>

                    {/* Deafen */}
                    <button
                        className={`room-header__voice-control room-header__voice-control--${themeColor}`}
                        onClick={onToggleDeafen}
                        title={isDeafened ? 'Undeafen' : 'Deafen'}
                    >
                        <Icon name={isDeafened ? 'volumeOff' : 'volume'} size={14} />
                    </button>

                    {/* Leave */}
                    <button
                        className="room-header__voice-control room-header__voice-control--danger"
                        onClick={onLeaveVoice}
                        title="Leave Voice"
                    >
                        <Icon name="phoneOff" size={14} />
                    </button>
                </div>
            ) : (
                /* ===== NOT IN VOICE STATE - Split Button ===== */
                <div className="room-header__join-split" ref={joinDropdownRef}>
                    <button
                        className="room-header__join-main"
                        onClick={() => onJoinVoice(viewingRoomId)}
                    >
                        <Icon name="phone" size={14} />
                        Join Voice
                    </button>
                    <button
                        className={`room-header__join-arrow ${showJoinDropdown ? 'room-header__join-arrow--open' : ''}`}
                        onClick={onToggleJoin}
                    >
                        <Icon name="chevronDown" size={12} />
                    </button>

                    {/* Join Voice Dropdown */}
                    {showJoinDropdown && (
                        <div className="room-header__join-dropdown">
                            <div className="room-header__dropdown-content">
                                <div className="room-header__dropdown-group-label">
                                    Join Voice In
                                </div>

                                {/* Current room (highlighted) */}
                                <button
                                    className="room-header__dropdown-item room-header__dropdown-item--full room-header__dropdown-item--current"
                                    onClick={() => {
                                        onJoinVoice(viewingRoomId);
                                        onCloseDropdowns();
                                    }}
                                >
                                    <span className="room-header__dropdown-dot" style={{ background: viewingRoom?.color }} />
                                    <span className="room-header__dropdown-name">{viewingRoom?.name}</span>
                                    <span className="room-header__dropdown-current-badge">Current</span>
                                </button>

                                {/* Active Breakouts */}
                                {breakouts.length > 0 && (
                                    <>
                                        <div className="room-header__dropdown-group-label room-header__dropdown-group-label--purple room-header__dropdown-group-label--small">
                                            <Icon name="gitBranch" size={10} />
                                            Active Breakouts
                                        </div>
                                        {breakouts.map(breakout => (
                                            <button
                                                key={breakout.id}
                                                className="room-header__dropdown-item room-header__dropdown-item--full"
                                                onClick={() => {
                                                    onJoinBreakout(breakout.id);
                                                    onCloseDropdowns();
                                                }}
                                            >
                                                <Icon name="gitBranch" size={12} className="room-header__dropdown-breakout-icon" />
                                                <span className="room-header__dropdown-name">{breakout.name}</span>
                                                <span className="room-header__dropdown-breakout-count">{breakout.usersInVoice} active</span>
                                            </button>
                                        ))}
                                    </>
                                )}

                                {/* Other Rooms */}
                                <div className="room-header__dropdown-group-label room-header__dropdown-group-label--small">
                                    Other Rooms
                                </div>
                                {rooms
                                    .filter(r => r.id !== viewingRoomId && r.type !== 'personal')
                                    .map(room => (
                                        <button
                                            key={room.id}
                                            className="room-header__dropdown-item room-header__dropdown-item--full room-header__dropdown-item--muted"
                                            onClick={() => {
                                                onJoinVoice(room.id);
                                                onCloseDropdowns();
                                            }}
                                        >
                                            <span className="room-header__dropdown-dot" style={{ background: room.color }} />
                                            <span className="room-header__dropdown-name">{room.name}</span>
                                            {room.usersInVoice > 0 && (
                                                <span className="room-header__dropdown-voice-count">
                                                    {room.usersInVoice} in voice
                                                </span>
                                            )}
                                        </button>
                                    ))
                                }
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

VoiceSection.propTypes = {
    viewingRoom: PropTypes.object,
    viewingRoomId: PropTypes.string,
    voiceRoom: PropTypes.object,
    voiceRoomId: PropTypes.string,
    isInVoice: PropTypes.bool,
    isInBreakout: PropTypes.bool,
    activeBreakoutId: PropTypes.string,
    activeBreakout: PropTypes.object,
    currentVoiceName: PropTypes.string,
    currentVoiceUsers: PropTypes.number,
    breakouts: PropTypes.array,
    rooms: PropTypes.array,
    isMuted: PropTypes.bool,
    isDeafened: PropTypes.bool,
    onJoinVoice: PropTypes.func.isRequired,
    onJoinBreakout: PropTypes.func,
    onLeaveVoice: PropTypes.func.isRequired,
    onToggleMute: PropTypes.func,
    onToggleDeafen: PropTypes.func,
    showVoiceDropdown: PropTypes.bool,
    showJoinDropdown: PropTypes.bool,
    onToggleVoice: PropTypes.func,
    onToggleJoin: PropTypes.func,
    onCloseDropdowns: PropTypes.func,
};

export { VoiceSection };
export default VoiceSection;
