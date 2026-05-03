/**
 * @file PinnedSection.jsx
 * @description PINNED section of the RoomHeader: quick-access room pills.
 *
 * Shows compact buttons for pinned rooms. Clicking switches the viewing room.
 * Pinned rooms exclude the currently viewing room (no duplicate).
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';

const PinnedSection = memo(function PinnedSection({
    pinnedRooms = [],
    voiceRoomId,
    onSelectRoom,
}) {
    if (pinnedRooms.length === 0) {
        return (
            <div className="room-header__section room-header__pinned-section">
                <span className="room-header__pinned-empty">No pinned rooms</span>
            </div>
        );
    }

    return (
        <div className="room-header__section room-header__pinned-section">
            {pinnedRooms.map(room => {
                const isVoice = room.id === voiceRoomId;
                return (
                    <button
                        key={room.id}
                        className="room-header__pinned-pill"
                        onClick={() => onSelectRoom(room.id)}
                        title={room.name}
                    >
                        <span className="room-header__pinned-dot" style={{ background: room.color }} />
                        <span className="room-header__pinned-name">{room.name}</span>
                        {isVoice && <Icon name="mic" size={9} className="room-header__pinned-voice" />}
                    </button>
                );
            })}
        </div>
    );
});

PinnedSection.propTypes = {
    pinnedRooms: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        color: PropTypes.string,
    })),
    voiceRoomId: PropTypes.string,
    onSelectRoom: PropTypes.func.isRequired,
};

export { PinnedSection };
export default PinnedSection;
