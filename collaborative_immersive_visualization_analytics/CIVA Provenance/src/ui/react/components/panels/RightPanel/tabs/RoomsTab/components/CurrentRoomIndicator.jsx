/**
 * @file CurrentRoomIndicator.jsx
 * @description Shows the user's current room location.
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * Get icon for room type
 */
function getTypeIcon(type) {
    switch (type) {
        case 'project': return 'globe';
        case 'breakout': return 'layout';
        case 'personal': return 'user';
        default: return 'layout';
    }
}

/**
 * @typedef {Object} CurrentRoomIndicatorProps
 * @property {Object} room - Current room object
 * @property {function} onLeave - Callback to leave room
 */

/**
 * Current room indicator component.
 * Shows where the user currently is.
 *
 * @param {CurrentRoomIndicatorProps} props - Component props
 * @returns {React.ReactElement|null} The rendered indicator
 */
export function CurrentRoomIndicator({ room, onLeave }) {
    if (!room) return null;

    const typeIconName = getTypeIcon(room.type);

    return (
        <div className="current-room-indicator">
            <div className="current-room-indicator__info">
                <div className="current-room-indicator__label">Currently in</div>
                <div className="current-room-indicator__name">
                    <Icon name={typeIconName} size={14} />
                    <span>{room.name}</span>
                </div>
            </div>
            {room.type !== 'project' && (
                <button
                    className="current-room-indicator__leave"
                    onClick={onLeave}
                    title="Leave room"
                >
                    <Icon name="logout" size={14} />
                    Leave
                </button>
            )}
        </div>
    );
}

export default CurrentRoomIndicator;