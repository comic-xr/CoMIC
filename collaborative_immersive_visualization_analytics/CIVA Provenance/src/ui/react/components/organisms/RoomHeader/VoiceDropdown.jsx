/**
 * @file VoiceDropdown.jsx
 * @description Voice channel controls dropdown for RoomHeader
 */

import React, { memo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';

/**
 * VoiceDropdown - Voice channel switching and leave controls
 */
const VoiceDropdown = memo(function VoiceDropdown({
    isOpen,
    onClose,
    voiceRoom,
    availableRooms,
    onSwitchVoice,
    onLeaveVoice,
}) {
    const dropdownRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div ref={dropdownRef} className="voice-dropdown">
            <div className="voice-dropdown__header">
                Switch Voice To
            </div>

            <div className="voice-dropdown__list">
                {availableRooms.map(room => (
                    <button
                        key={room.id}
                        className="voice-dropdown__item"
                        onClick={() => {
                            onSwitchVoice(room.id);
                            onClose();
                        }}
                    >
                        <span
                            className="voice-dropdown__item-dot"
                            style={{ background: room.color }}
                        />
                        <span className="voice-dropdown__item-name">{room.name}</span>
                    </button>
                ))}
            </div>

            <div className="voice-dropdown__divider" />

            <button
                className="voice-dropdown__leave"
                onClick={() => {
                    onLeaveVoice();
                    onClose();
                }}
            >
                <Icon name="phoneOff" size={14} />
                <span>Leave Voice</span>
            </button>
        </div>
    );
});

VoiceDropdown.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    voiceRoom: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        color: PropTypes.string,
    }),
    availableRooms: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        color: PropTypes.string,
    })).isRequired,
    onSwitchVoice: PropTypes.func.isRequired,
    onLeaveVoice: PropTypes.func.isRequired,
};

export { VoiceDropdown };
export default VoiceDropdown;
