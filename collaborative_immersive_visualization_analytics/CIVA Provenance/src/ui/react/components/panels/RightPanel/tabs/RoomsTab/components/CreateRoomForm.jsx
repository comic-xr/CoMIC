/**
 * @file CreateRoomForm.jsx
 * @description Inline form for creating new breakout rooms.
 */

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * @typedef {Object} CreateRoomFormProps
 * @property {function} onSubmit - Callback when form is submitted
 * @property {function} onCancel - Callback when form is cancelled
 */

/**
 * Create room form component.
 * Inline form for creating breakout rooms.
 *
 * @param {CreateRoomFormProps} props - Component props
 * @returns {React.ReactElement} The rendered form
 */
export function CreateRoomForm({ onSubmit, onCancel }) {
    const [name, setName] = useState('');
    const [access, setAccess] = useState('open');
    const [hasVoice, setHasVoice] = useState(true);
    const [hasText, setHasText] = useState(true);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onSubmit({ name, access, hasVoice, hasText });
        }
    };

    return (
        <form className="create-room-form" onSubmit={handleSubmit}>
            <div className="create-room-form__header">
                <span>Create Breakout Room</span>
                <button type="button" onClick={onCancel}>
                    <Icon name="close" size={14} />
                </button>
            </div>

            <div className="create-room-form__field">
                <label>Room Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Deep Dive Discussion"
                    autoFocus
                />
            </div>

            <div className="create-room-form__field">
                <label>Access</label>
                <div className="create-room-form__access-options">
                    <button
                        type="button"
                        className={access === 'open' ? 'active' : ''}
                        onClick={() => setAccess('open')}
                    >
                        <Icon name="unlock" size={12} />
                        Open
                    </button>
                    <button
                        type="button"
                        className={access === 'invite' ? 'active' : ''}
                        onClick={() => setAccess('invite')}
                    >
                        <Icon name="lock" size={12} />
                        Invite Only
                    </button>
                    <button
                        type="button"
                        className={access === 'invisible' ? 'active' : ''}
                        onClick={() => setAccess('invisible')}
                    >
                        <Icon name="eyeOff" size={12} />
                        Private
                    </button>
                </div>
            </div>

            <div className="create-room-form__field">
                <label>Features</label>
                <div className="create-room-form__features">
                    <label className="create-room-form__checkbox">
                        <input
                            type="checkbox"
                            checked={hasVoice}
                            onChange={(e) => setHasVoice(e.target.checked)}
                        />
                        <Icon name="volume" size={12} />
                        Voice Chat
                    </label>
                    <label className="create-room-form__checkbox">
                        <input
                            type="checkbox"
                            checked={hasText}
                            onChange={(e) => setHasText(e.target.checked)}
                        />
                        <Icon name="messageSquare" size={12} />
                        Text Chat
                    </label>
                </div>
            </div>

            <div className="create-room-form__actions">
                <button type="button" onClick={onCancel}>
                    Cancel
                </button>
                <button type="submit" disabled={!name.trim()}>
                    Create Room
                </button>
            </div>
        </form>
    );
}

export default CreateRoomForm;