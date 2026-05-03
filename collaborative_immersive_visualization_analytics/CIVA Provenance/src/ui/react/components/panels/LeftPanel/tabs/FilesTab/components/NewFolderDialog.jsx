/**
 * @file NewFolderDialog.jsx
 * @description Modal dialog for creating new folders in the Files Tab.
 * Includes name input, parent folder selection, and optional color picker.
 *
 * @example
 * <NewFolderDialog
 *   isOpen={showNewFolder}
 *   onClose={() => setShowNewFolder(false)}
 *   onSubmit={handleCreateFolder}
 *   folders={folders}
 *   currentFolderId={currentFolderId}
 * />
 */

import React, { memo, useState, useEffect, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useAdaptive } from '@UI/react/context';
import './NewFolderDialog.scss';

// Available folder colors
const COLOR_OPTIONS = [
    { id: null, label: 'Default', color: '#fbbf24' },
    { id: 'teal', label: 'Teal', color: '#2dd4bf' },
    { id: 'green', label: 'Green', color: '#34d399' },
    { id: 'blue', label: 'Blue', color: '#3b82f6' },
    { id: 'purple', label: 'Purple', color: '#a855f7' },
    { id: 'pink', label: 'Pink', color: '#ec4899' },
    { id: 'orange', label: 'Orange', color: '#f97316' },
];

/**
 * NewFolderDialog - Modal for creating new folders
 */
export const NewFolderDialog = memo(function NewFolderDialog({
    isOpen,
    onClose,
    onSubmit,
    folders = [],
    currentFolderId = null,
    className = '',
}) {
    const { isVR } = useAdaptive();

    const [name, setName] = useState('');
    const [parentId, setParentId] = useState(currentFolderId);
    const [selectedColor, setSelectedColor] = useState(null);
    const [error, setError] = useState(null);

    // Reset state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setName('');
            setParentId(currentFolderId);
            setSelectedColor(null);
            setError(null);
        }
    }, [isOpen, currentFolderId]);

    // Get root-level folders for parent selection
    const rootFolders = folders.filter(f => f.parentId === null);

    // Handle name input change
    const handleNameChange = useCallback((e) => {
        setName(e.target.value);
        setError(null);
    }, []);

    // Handle form submission
    const handleSubmit = useCallback(() => {
        // Validation
        if (!name.trim()) {
            setError('Folder name is required');
            return;
        }

        // Check for duplicate names in same parent
        const siblings = folders.filter(f => f.parentId === parentId);
        if (siblings.some(f => f.name.toLowerCase() === name.trim().toLowerCase())) {
            setError('A folder with this name already exists here');
            return;
        }

        // Submit
        const colorOption = COLOR_OPTIONS.find(c => c.id === selectedColor);
        onSubmit({
            name: name.trim(),
            parentId,
            color: colorOption?.color || null,
        });
        onClose();
    }, [name, parentId, selectedColor, folders, onSubmit, onClose]);

    // Handle key press
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        } else if (e.key === 'Escape') {
            onClose();
        }
    }, [handleSubmit, onClose]);

    if (!isOpen) return null;

    const classList = [
        'new-folder-dialog',
        isVR && 'new-folder-dialog--vr',
        className,
    ].filter(Boolean).join(' ');

    return (
        <>
            {/* Backdrop */}
            <div className="new-folder-dialog__backdrop" onClick={onClose} />

            {/* Dialog */}
            <div className={classList}>
                {/* Header */}
                <div className="new-folder-dialog__header">
                    <Icon name="folderPlus" size={18} className="new-folder-dialog__header-icon" />
                    <span className="new-folder-dialog__title">New Folder</span>
                </div>

                {/* Name input */}
                <div className="new-folder-dialog__field">
                    <label className="new-folder-dialog__label">Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={handleNameChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Folder name..."
                        autoFocus
                        className={`new-folder-dialog__input ${error ? 'new-folder-dialog__input--error' : ''}`}
                    />
                    {error && <span className="new-folder-dialog__error">{error}</span>}
                </div>

                {/* Parent folder select */}
                <div className="new-folder-dialog__field">
                    <label className="new-folder-dialog__label">Location</label>
                    <select
                        value={parentId || ''}
                        onChange={(e) => setParentId(e.target.value || null)}
                        className="new-folder-dialog__select"
                    >
                        <option value="">Root</option>
                        {rootFolders.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>
                </div>

                {/* Color picker */}
                <div className="new-folder-dialog__field">
                    <label className="new-folder-dialog__label">Color (optional)</label>
                    <div className="new-folder-dialog__colors">
                        {COLOR_OPTIONS.map(opt => (
                            <button
                                key={opt.id || 'default'}
                                type="button"
                                onClick={() => setSelectedColor(opt.id)}
                                className={`new-folder-dialog__color ${selectedColor === opt.id ? 'new-folder-dialog__color--selected' : ''}`}
                                style={{ background: opt.color }}
                                title={opt.label}
                                aria-label={opt.label}
                            />
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="new-folder-dialog__actions">
                    <button
                        type="button"
                        onClick={onClose}
                        className="new-folder-dialog__button new-folder-dialog__button--cancel"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!name.trim()}
                        className="new-folder-dialog__button new-folder-dialog__button--submit"
                    >
                        Create
                    </button>
                </div>
            </div>
        </>
    );
});

export default NewFolderDialog;
