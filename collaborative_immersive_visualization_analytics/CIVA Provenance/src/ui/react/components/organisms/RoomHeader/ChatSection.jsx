/**
 * @file ChatSection.jsx
 * @description CHAT section of the RoomHeader: chat icon with unread badge.
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';

const ChatSection = memo(function ChatSection({
    unreadMessages = 0,
    onOpenChat,
}) {
    return (
        <div className="room-header__section room-header__chat-section">
            <button
                className="room-header__chat-btn"
                onClick={onOpenChat}
                title="Room Chat"
            >
                <Icon name="messageSquare" size={16} />
                {unreadMessages > 0 && (
                    <span className="room-header__chat-badge" />
                )}
            </button>
        </div>
    );
});

ChatSection.propTypes = {
    unreadMessages: PropTypes.number,
    onOpenChat: PropTypes.func,
};

export { ChatSection };
export default ChatSection;
