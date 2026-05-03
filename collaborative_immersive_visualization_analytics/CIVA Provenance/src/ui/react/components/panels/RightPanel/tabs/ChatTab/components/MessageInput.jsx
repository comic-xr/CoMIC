/**
 * @file MessageInput.jsx
 * @description Message input component for composing chat messages.
 * Features textarea with send on Enter and action buttons.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IconButton, Tooltip } from '@UI/react/components/atoms';

/**
 * @typedef {Object} MessageInputProps
 * @property {function} onSend - Callback when message is sent
 * @property {boolean} [disabled] - Whether input is disabled
 */

/**
 * Message input component.
 * Provides textarea and buttons for composing messages.
 *
 * @param {MessageInputProps} props - Component props
 * @returns {React.ReactElement} The rendered input
 */
export function MessageInput({ onSend, disabled }) {
    const [message, setMessage] = useState('');
    const textareaRef = useRef(null);

    // Auto-expand textarea as user types
    const adjustTextareaHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset to auto to get correct scrollHeight
            textarea.style.height = `${textarea.scrollHeight}px`; // Set to content height
        }
    }, []);

    // Adjust height when message changes
    useEffect(() => {
        adjustTextareaHeight();
    }, [message, adjustTextareaHeight]);

    const handleSend = () => {
        if (message.trim() && !disabled) {
            onSend(message);
            setMessage('');
            // Reset textarea height after sending
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chat-input">
            <div className="chat-input__wrapper">
                <textarea
                    ref={textareaRef}
                    className="chat-input__textarea"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={disabled ? "Connecting..." : "Type a message..."}
                    rows={1}
                    disabled={disabled}
                />

                <div className="chat-input__actions">
                    <Tooltip content="Attach file" placement="top">
                        <IconButton
                            icon="paperclip"
                            disabled={disabled}
                            size="xs"
                            variant="ghost"
                            label="Attach file"
                            className="chat-input__btn"
                        />
                    </Tooltip>

                    <Tooltip content="Mention user" placement="top">
                        <IconButton
                            icon="at_sign"
                            disabled={disabled}
                            size="xs"
                            variant="ghost"
                            label="Mention user"
                            className="chat-input__btn"
                        />
                    </Tooltip>

                    <Tooltip content="Add emoji" placement="top">
                        <IconButton
                            icon="smile"
                            disabled={disabled}
                            size="xs"
                            variant="ghost"
                            label="Add emoji"
                            className="chat-input__btn"
                        />
                    </Tooltip>

                    <Tooltip content="Send message" placement="top">
                        <IconButton
                            icon="send"
                            onClick={handleSend}
                            disabled={!message.trim() || disabled}
                            size="xs"
                            variant="primary"
                            label="Send message"
                            className={`chat-input__send ${message.trim() && !disabled ? 'chat-input__send--active' : ''}`}
                        />
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}

export default MessageInput;