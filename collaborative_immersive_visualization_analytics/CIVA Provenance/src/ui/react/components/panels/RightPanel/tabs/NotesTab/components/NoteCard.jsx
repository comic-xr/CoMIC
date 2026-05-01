/**
 * @file NoteCard.jsx
 * @description Note card component for displaying note summaries.
 * Shows title, content preview, metadata, and actions.
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * @typedef {Object} Note
 * @property {string} id - Note ID
 * @property {string} title - Note title
 * @property {string} content - Note content
 * @property {string} createdBy - Author name
 * @property {string} timestamp - Creation/update time
 * @property {boolean} pinned - Whether note is pinned
 * @property {boolean} shared - Whether note is shared
 * @property {boolean} hasImage - Whether note has images
 */

/**
 * @typedef {Object} NoteCardProps
 * @property {Note} note - The note to display
 * @property {boolean} isSelected - Whether this note is selected
 * @property {function} onSelect - Callback when card is clicked
 * @property {function} onTogglePin - Callback to toggle pin status
 * @property {function} onEdit - Callback to edit note
 * @property {function} onDelete - Callback to delete note
 */

/**
 * Note card component.
 * Displays a note with expandable actions.
 *
 * @param {NoteCardProps} props - Component props
 * @returns {React.ReactElement} The rendered card
 */
export function NoteCard({ note, isSelected, onSelect, onTogglePin, onEdit, onDelete }) {
    return (
        <div
            className={`note-card ${isSelected ? 'note-card--selected' : ''}`}
            onClick={() => onSelect(isSelected ? null : note.id)}
        >
            <div className="note-card__header">
                <span className="note-card__title">{note.title}</span>
                <div className="note-card__badges">
                    {note.pinned && <Icon name="pin" size={10} className="icon-amber" />}
                    {note.shared && <Icon name="share" size={10} className="icon-pink" />}
                    {note.hasImage && <Icon name="image" size={10} className="icon-teal" />}
                </div>
            </div>

            <div className="note-card__content">{note.content}</div>

            <div className="note-card__meta">
                <span className="note-card__meta-item">
                    <Icon name="user" size={8} />
                    {note.createdBy}
                </span>
                <span className="note-card__meta-item">
                    <Icon name="clock" size={8} />
                    {note.timestamp}
                </span>
            </div>

            {/* Expanded actions */}
            {isSelected && (
                <div className="note-card__actions">
                    <button
                        className="note-card__action-btn"
                        data-color="blue"
                        onClick={(e) => { e.stopPropagation(); onEdit(note); }}
                    >
                        <Icon name="edit" size={10} />
                        Edit
                    </button>
                    <button
                        className={`note-card__action-btn ${note.pinned ? 'note-card__action-btn--active' : ''}`}
                        data-color="amber"
                        onClick={(e) => { e.stopPropagation(); onTogglePin(note.id); }}
                    >
                        {note.pinned ? <Icon name="pinOff" size={10} /> : <Icon name="pin" size={10} />}
                        {note.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                        className="note-card__action-btn"
                        data-color="pink"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Icon name="share" size={10} />
                    </button>
                    <button
                        className="note-card__action-btn"
                        onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                    >
                        <Icon name="delete" size={10} />
                    </button>
                </div>
            )}
        </div>
    );
}

export default NoteCard;