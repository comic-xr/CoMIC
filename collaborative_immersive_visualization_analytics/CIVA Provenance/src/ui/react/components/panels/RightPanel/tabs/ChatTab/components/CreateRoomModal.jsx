/**
 * @file CreateRoomModal.jsx
 * @description Modal for creating new chat rooms
 */

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { sync as log } from '@Utils/logger.js';
import './CreateRoomModal.scss';

/**
 * Modal for creating a new chat room
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onRoomCreated - Called when room is created with new room data
 * @param {string} props.projectId - Current project ID
 */
export function CreateRoomModal({ isOpen, onClose, onRoomCreated, projectId }) {
    const [roomName, setRoomName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!roomName.trim()) {
            setError('Room name is required');
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            const response = await fetch(`/api/projects/${projectId}/rooms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: roomName.trim(),
                    description: description.trim() || null,
                    isPublic,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create room');
            }

            const newRoom = await response.json();
            log.info('Room created:', newRoom);

            // Reset form
            setRoomName('');
            setDescription('');
            setIsPublic(true);

            // Notify parent
            onRoomCreated(newRoom);
            onClose();
        } catch (err) {
            log.error('Failed to create room:', err);
            setError(err.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleClose = () => {
        if (!isCreating) {
            setRoomName('');
            setDescription('');
            setIsPublic(true);
            setError(null);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="create-room-modal-overlay" onClick={handleClose}>
            <div className="create-room-modal" onClick={(e) => e.stopPropagation()}>
                <div className="create-room-modal__header">
                    <h3>
                        <Icon name="plus" size={16} />
                        Create New Room
                    </h3>
                    <button
                        className="create-room-modal__close"
                        onClick={handleClose}
                        disabled={isCreating}
                    >
                        <Icon name="x" size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="create-room-modal__form">
                    {error && (
                        <div className="create-room-modal__error">
                            <Icon name="alertCircle" size={14} />
                            {error}
                        </div>
                    )}

                    <div className="create-room-modal__field">
                        <label htmlFor="room-name">
                            Room Name <span className="required">*</span>
                        </label>
                        <input
                            id="room-name"
                            type="text"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder="e.g., Team Alpha, Data Analysis"
                            maxLength={100}
                            disabled={isCreating}
                            autoFocus
                        />
                    </div>

                    <div className="create-room-modal__field">
                        <label htmlFor="room-description">Description</label>
                        <textarea
                            id="room-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What is this room for?"
                            rows={3}
                            maxLength={500}
                            disabled={isCreating}
                        />
                    </div>

                    <div className="create-room-modal__field create-room-modal__field--checkbox">
                        <label>
                            <input
                                type="checkbox"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                disabled={isCreating}
                            />
                            <span>Public room</span>
                        </label>
                        <p className="create-room-modal__hint">
                            {isPublic
                                ? 'Anyone in the project can join this room'
                                : 'Only invited members can join this room'}
                        </p>
                    </div>

                    <div className="create-room-modal__actions">
                        <button
                            type="button"
                            className="create-room-modal__button create-room-modal__button--secondary"
                            onClick={handleClose}
                            disabled={isCreating}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="create-room-modal__button create-room-modal__button--primary"
                            disabled={isCreating || !roomName.trim()}
                        >
                            {isCreating ? (
                                <>
                                    <Icon name="loader" size={14} className="spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Icon name="plus" size={14} />
                                    Create Room
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
