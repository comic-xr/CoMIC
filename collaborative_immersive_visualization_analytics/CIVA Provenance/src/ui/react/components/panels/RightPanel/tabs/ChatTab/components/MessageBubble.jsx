/**
 * @file MessageBubble.jsx
 * @description Message bubble component for displaying chat messages.
 * Supports user messages with avatars, editing, and system messages.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * @typedef {Object} Message
 * @property {string} id - Message ID
 * @property {string} userId - Sender user ID
 * @property {string} [userEmail] - Sender email (for robust ownership checks)
 * @property {string} userName - Sender display name
 * @property {string} userColor - Sender color
 * @property {string} text - Message content
 * @property {number} timestamp - Message timestamp
 * @property {boolean} [isEdited] - Whether message has been edited
 * @property {number} [editedAt] - Timestamp of last edit
 * @property {boolean} [isSystem] - Whether this is a system message
 * @property {Object} [metadata] - Additional message metadata
 * @property {boolean} [metadata.isFederated] - Whether message is from Matrix federation
 * @property {string} [metadata.federation_source] - Federation source (e.g., 'matrix')
 * @property {string} [metadata.matrix_sender] - Matrix user ID of sender
 */

/**
 * @typedef {Object} MessageBubbleProps
 * @property {Message} message - The message to display
 * @property {string} currentUserId - Current user's ID
 * @property {string} [currentUserEmail] - Current user's email (for robust ownership check)
 * @property {function} onEdit - Callback when message is edited (messageId, newText) => boolean
 * @property {function} onDelete - Callback when delete is clicked
 */

/**
 * Message bubble component.
 * Displays a chat message with avatar, content, edit/delete actions.
 *
 * @param {MessageBubbleProps} props - Component props
 * @returns {React.ReactElement} The rendered message
 */
export function MessageBubble({ message, currentUserId, currentUserEmail, onEdit, onDelete }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(message.text);
    const editInputRef = useRef(null);

    // Check ownership by ID or email (email is more stable across sessions)
    const isMe = message.userId === currentUserId ||
        (currentUserEmail && message.userEmail && message.userEmail === currentUserEmail);
    const isSystem = message.isSystem;
    const isFederated = message.metadata?.isFederated || message.metadata?.federation_source === 'matrix';
    const matrixSender = message.metadata?.matrix_sender;

    // Focus input when entering edit mode
    useEffect(() => {
        if (isEditing && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [isEditing]);

    // Handle starting edit
    const handleStartEdit = () => {
        setEditText(message.text);
        setIsEditing(true);
    };

    // Handle canceling edit
    const handleCancelEdit = () => {
        setEditText(message.text);
        setIsEditing(false);
    };

    // Handle saving edit
    const handleSaveEdit = () => {
        const trimmedText = editText.trim();
        if (trimmedText && trimmedText !== message.text) {
            const success = onEdit?.(message.id, trimmedText);
            if (success) {
                setIsEditing(false);
            }
        } else {
            // No change or empty, just cancel
            handleCancelEdit();
        }
    };

    // Handle key press in edit input
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

    if (isSystem) {
        return (
            <div className="message message--system">
                {message.text}
            </div>
        );
    }

    const initials = (message.userName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2);
    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
    const userColor = message.userColor || '#2196F3';

    // Extract server name from Matrix user ID for display
    const serverName = matrixSender ? matrixSender.split(':')[1] : null;

    return (
        <div className={`message ${isMe ? 'message--me' : ''} ${isFederated ? 'message--federated' : ''} ${isEditing ? 'message--editing' : ''}`}>
            <div
                className="message__avatar"
                style={{ '--avatar-color': userColor }}
            >
                {initials}
            </div>

            <div className="message__content">
                {!isMe && (
                    <div className="message__user-info">
                        <span className="message__user" style={{ color: userColor }}>
                            {message.userName}
                        </span>
                        {isFederated && (
                            <span
                                className="message__federation-badge"
                                title={`Federated user from ${serverName || 'Matrix server'}`}
                            >
                                <Icon name="globe" size={10} />
                                {serverName && <span className="message__server-name">{serverName}</span>}
                            </span>
                        )}
                    </div>
                )}

                {isEditing ? (
                    <div className="message__edit-container">
                        <textarea
                            ref={editInputRef}
                            className="message__edit-input"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                        />
                        <div className="message__edit-actions">
                            <button
                                className="message__edit-btn message__edit-btn--save"
                                onClick={handleSaveEdit}
                                title="Save (Enter)"
                            >
                                <Icon name="check" size={12} />
                            </button>
                            <button
                                className="message__edit-btn message__edit-btn--cancel"
                                onClick={handleCancelEdit}
                                title="Cancel (Esc)"
                            >
                                <Icon name="x" size={12} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="message__bubble">
                        {message.text}
                        {message.isEdited && (
                            <span className="message__edited" title={`Edited ${new Date(message.editedAt).toLocaleString()}`}>
                                (edited)
                            </span>
                        )}
                    </div>
                )}

                <span className="message__time">{time}</span>
            </div>

            {isMe && !isEditing && (
                <div className="message__actions">
                    <button
                        className="message__action-btn"
                        onClick={handleStartEdit}
                        title="Edit message"
                    >
                        <Icon name="edit" size={12} />
                    </button>
                    <button
                        className="message__action-btn message__action-btn--delete"
                        onClick={() => onDelete(message.id)}
                        title="Delete message"
                    >
                        <Icon name="delete" size={12} />
                    </button>
                </div>
            )}
        </div>
    );
}

export default MessageBubble;
