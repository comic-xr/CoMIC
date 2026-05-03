/**
 * @file NoteEditor.jsx
 * @description Note editor component for creating and editing notes.
 * Features rich text toolbar, note types, visibility options, and checklists.
 *
 * Note Types:
 * - standard: Rich text content
 * - checklist: To-do items with checkboxes
 * - anchored: Linked to annotation/view
 * - template: Pre-defined structure
 *
 * @see Right_Panel_Design_Specification.md - Notes Tab section
 */

import React, { useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';

// =============================================================================
// CONSTANTS
// =============================================================================

const NOTE_TYPES = [
    { id: 'standard', icon: 'file', label: 'Standard Note', color: 'teal' },
    { id: 'checklist', icon: 'listCheck', label: 'Checklist', color: 'green' },
    { id: 'anchored', icon: 'mapPin', label: 'Anchored', color: 'purple' },
];

const VISIBILITY_OPTIONS = [
    { id: 'project', icon: 'globe', label: 'Project', description: 'All project members' },
    { id: 'room', icon: 'doorOpen', label: 'Room', description: 'Room members only' },
    { id: 'personal', icon: 'user', label: 'Personal', description: 'Only you' },
];

const TOOLBAR_GROUPS = [
    { icons: ['bold', 'italic', 'underline', 'strikethrough'], separator: true },
    { icons: ['list', 'listOrdered'], separator: true },
    { icons: ['quote', 'code'], separator: true },
    { icons: ['link', 'image', 'mapPin'], separator: false },
];

// =============================================================================
// CHECKLIST ITEM COMPONENT
// =============================================================================

function ChecklistItem({ item, index, onToggle, onChange, onRemove, onAddAssignee }) {
    return (
        <div className="checklist-item">
            <input
                type="checkbox"
                className="checklist-item__checkbox"
                checked={item.completed}
                onChange={() => onToggle(index)}
            />
            <input
                type="text"
                className={`checklist-item__text ${item.completed ? 'checklist-item__text--completed' : ''}`}
                value={item.text}
                onChange={(e) => onChange(index, e.target.value)}
                placeholder="Task description..."
            />
            {item.assignee && (
                <span className="checklist-item__assignee" style={{ color: item.assignee.color }}>
                    @{item.assignee.name}
                </span>
            )}
            <div className="checklist-item__actions">
                <Tooltip content="Assign">
                    <button
                        className="checklist-item__btn"
                        onClick={() => onAddAssignee(index)}
                    >
                        <Icon name="userPlus" size={12} />
                    </button>
                </Tooltip>
                <button
                    className="checklist-item__btn checklist-item__btn--remove"
                    onClick={() => onRemove(index)}
                >
                    <Icon name="close" size={12} />
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * @typedef {Object} NoteEditorProps
 * @property {Object} [note] - Existing note to edit (null for new)
 * @property {boolean} [isNew] - Whether this is a new note
 * @property {function} onSave - Callback when note is saved
 * @property {function} onCancel - Callback when editing is cancelled
 */

/**
 * Note editor component.
 * Provides rich text editing for notes with checklist support.
 *
 * @param {NoteEditorProps} props - Component props
 * @returns {React.ReactElement} The rendered editor
 */
export function NoteEditor({ note, isNew, onSave, onCancel }) {
    const [title, setTitle] = useState(note?.title || '');
    const [content, setContent] = useState(note?.content || '');
    const [noteType, setNoteType] = useState(note?.type || 'standard');
    const [visibility, setVisibility] = useState(note?.visibility || 'project');
    const [checklistItems, setChecklistItems] = useState(note?.checklistItems || [
        { text: '', completed: false, assignee: null },
    ]);

    // Checklist handlers
    const handleToggleItem = useCallback((index) => {
        setChecklistItems(prev => prev.map((item, i) =>
            i === index ? { ...item, completed: !item.completed } : item
        ));
    }, []);

    const handleChangeItem = useCallback((index, text) => {
        setChecklistItems(prev => prev.map((item, i) =>
            i === index ? { ...item, text } : item
        ));
    }, []);

    const handleRemoveItem = useCallback((index) => {
        setChecklistItems(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleAddItem = useCallback(() => {
        setChecklistItems(prev => [...prev, { text: '', completed: false, assignee: null }]);
    }, []);

    const handleAddAssignee = useCallback((index) => {
        // TODO: Open people picker modal
        console.log('Add assignee for item:', index);
    }, []);

    // Calculate checklist progress
    const completedCount = checklistItems.filter(item => item.completed).length;
    const totalCount = checklistItems.filter(item => item.text.trim()).length;
    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const handleSave = () => {
        if (isNew) {
            if (!title.trim()) return;
            onSave({
                title,
                content,
                type: noteType,
                visibility,
                checklistItems: noteType === 'checklist' ? checklistItems : undefined,
            });
        } else {
            onSave({
                ...note,
                content,
                type: noteType,
                visibility,
                checklistItems: noteType === 'checklist' ? checklistItems : undefined,
            });
        }
    };

    return (
        <div className="note-edit-view">
            {/* Header */}
            <div className="note-edit-view__header">
                <span className="note-edit-view__title">
                    {isNew ? 'New Note' : note?.title || 'Edit Note'}
                </span>
                <button className="note-edit-view__close" onClick={onCancel}>
                    <Icon name="close" size={16} />
                </button>
            </div>

            {/* Title input for new notes */}
            {isNew && (
                <input
                    type="text"
                    className="note-edit-view__title-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Note title..."
                />
            )}

            {/* Note Type Selector */}
            <div className="note-edit-view__type-selector">
                {NOTE_TYPES.map((type) => (
                    <Tooltip key={type.id} content={type.label}>
                        <button
                            className={`note-edit-view__type-btn ${noteType === type.id ? 'note-edit-view__type-btn--active' : ''}`}
                            onClick={() => setNoteType(type.id)}
                            data-color={type.color}
                        >
                            <Icon name={type.icon} size={14} />
                        </button>
                    </Tooltip>
                ))}
                <div className="note-edit-view__type-divider" />
                {/* Visibility selector */}
                {VISIBILITY_OPTIONS.map((option) => (
                    <Tooltip key={option.id} content={`${option.label}: ${option.description}`}>
                        <button
                            className={`note-edit-view__visibility-btn ${visibility === option.id ? 'note-edit-view__visibility-btn--active' : ''}`}
                            onClick={() => setVisibility(option.id)}
                        >
                            <Icon name={option.icon} size={12} />
                        </button>
                    </Tooltip>
                ))}
            </div>

            {/* Formatting toolbar - only for standard/anchored notes */}
            {noteType !== 'checklist' && (
                <div className="note-edit-view__toolbar">
                    {TOOLBAR_GROUPS.map((group, gi) => (
                        <React.Fragment key={gi}>
                            {group.icons.map((iconName) => (
                                <button key={iconName} className="note-edit-view__toolbar-btn">
                                    <Icon name={iconName} size={14} />
                                </button>
                            ))}
                            {group.separator && <div className="note-edit-view__toolbar-separator" />}
                        </React.Fragment>
                    ))}
                </div>
            )}

            {/* Content area - switches based on note type */}
            {noteType === 'checklist' ? (
                <div className="note-edit-view__checklist">
                    {/* Progress bar */}
                    <div className="note-edit-view__progress">
                        <div className="note-edit-view__progress-bar">
                            <div
                                className="note-edit-view__progress-fill"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className="note-edit-view__progress-text">
                            {completedCount}/{totalCount} complete
                        </span>
                    </div>

                    {/* Checklist items */}
                    <div className="note-edit-view__checklist-items">
                        {checklistItems.map((item, index) => (
                            <ChecklistItem
                                key={index}
                                item={item}
                                index={index}
                                onToggle={handleToggleItem}
                                onChange={handleChangeItem}
                                onRemove={handleRemoveItem}
                                onAddAssignee={handleAddAssignee}
                            />
                        ))}
                    </div>

                    {/* Add item button */}
                    <LabeledButton
                        icon="add"
                        label="Add item"
                        onClick={handleAddItem}
                        variant="ghost"
                        size="sm"
                        className="note-edit-view__add-item"
                    />
                </div>
            ) : (
                <textarea
                    className="note-edit-view__textarea"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your note..."
                />
            )}

            {/* Actions */}
            <div className="note-edit-view__actions">
                <LabeledButton
                    label="Cancel"
                    onClick={onCancel}
                    variant="ghost"
                />
                <LabeledButton
                    icon={isNew ? 'check' : 'save'}
                    label={isNew ? 'Create' : 'Save'}
                    onClick={handleSave}
                    disabled={isNew && !title.trim()}
                    variant="primary"
                />
            </div>
        </div>
    );
}

export default NoteEditor;