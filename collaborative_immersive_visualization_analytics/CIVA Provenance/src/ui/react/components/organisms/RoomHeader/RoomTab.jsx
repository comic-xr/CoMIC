/**
 * @file RoomTab.jsx
 * @description Individual room tab for RoomHeader
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';
import { useRoomStatus } from './RoomHeader.logic';

/**
 * RoomTab - Individual room tab button
 */
const RoomTab = memo(function RoomTab({
    room,
    viewingRoomId,
    voiceRoomId,
    onSelect,
}) {
    const { isViewing, isVoiceRoom } = useRoomStatus(room.id, viewingRoomId, voiceRoomId);

    return (
        <button
            className={`room-tab ${isViewing ? 'room-tab--active' : ''}`}
            style={{ '--room-color': room.color }}
            onClick={() => onSelect(room.id)}
        >
            <span className="room-tab__dot" style={{ background: room.color }} />
            <span className="room-tab__name">{room.name}</span>
            {isViewing && (
                <Icon
                    name="eye"
                    size={12}
                    className="room-tab__icon room-tab__icon--viewing"
                />
            )}
            {isVoiceRoom && (
                <Icon
                    name="mic"
                    size={12}
                    className="room-tab__icon room-tab__icon--voice"
                />
            )}
        </button>
    );
});

RoomTab.propTypes = {
    room: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        color: PropTypes.string.isRequired,
        usersOnline: PropTypes.number,
    }).isRequired,
    viewingRoomId: PropTypes.string,
    voiceRoomId: PropTypes.string,
    onSelect: PropTypes.func.isRequired,
};

export { RoomTab };
export default RoomTab;
