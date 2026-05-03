/**
 * @file BookmarkEditor.jsx
 * @description Modal editor for creating and editing bookmarks.
 *
 * Features:
 * - Name and description fields
 * - Type selection (Position, State, Comparison)
 * - Scope selection (Personal, Shared, Template)
 * - Tag input
 * - Camera state capture
 * - Filter association
 *
 * @see Left_Panel_Design_Specification.docx - Section 9 Bookmarks
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { BOOKMARK_TYPES, BOOKMARK_SCOPES } from '../hooks/useBookmarksTab';

/**
 * BookmarkEditor component.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether editor is open
 * @param {Object|null} props.bookmark - Existing bookmark to edit (null for new)
 * @param {Function} props.onSave - Save handler
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.currentCameraState - Current camera state for capture
 * @param {string[]} props.activeFilterIds - Currently active filter IDs
 */
export const BookmarkEditor = memo(function BookmarkEditor({
    isOpen,
    bookmark,
    onSave,
    onClose,
    currentCameraState,
    activeFilterIds = [],
}) {
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('position');
    const [scope, setScope] = useState('personal');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [capturedCameraState, setCapturedCameraState] = useState(null);
    const [includeFilters, setIncludeFilters] = useState(false);

    // Validation state
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // Initialize form when bookmark changes
    useEffect(() => {
        if (bookmark) {
            setName(bookmark.name || '');
            setDescription(bookmark.description || '');
            setType(bookmark.type || 'position');
            setScope(bookmark.scope || 'personal');
            setTags(bookmark.tags || []);
            setCapturedCameraState(bookmark.cameraState || null);
            setIncludeFilters(bookmark.filterIds?.length > 0);
        } else {
            // Reset for new bookmark
            setName('');
            setDescription('');
            setType('position');
            setScope('personal');
            setTags([]);
            setCapturedCameraState(currentCameraState || null);
            setIncludeFilters(false);
        }
        setErrors({});
    }, [bookmark, currentCameraState, isOpen]);

    // Capture current camera state
    const handleCaptureCamera = useCallback(() => {
        if (currentCameraState) {
            setCapturedCameraState(currentCameraState);
        }
    }, [currentCameraState]);

    // Add tag
    const handleAddTag = useCallback(() => {
        const trimmed = tagInput.trim();
        if (trimmed && !tags.includes(trimmed)) {
            setTags(prev => [...prev, trimmed]);
            setTagInput('');
        }
    }, [tagInput, tags]);

    // Remove tag
    const handleRemoveTag = useCallback((tagToRemove) => {
        setTags(prev => prev.filter(t => t !== tagToRemove));
    }, []);

    // Handle tag input key press
    const handleTagKeyPress = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    }, [handleAddTag]);

    // Validate form
    const validate = useCallback(() => {
        const newErrors = {};

        if (!name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!capturedCameraState && type !== 'comparison') {
            newErrors.cameraState = 'Camera state is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [name, capturedCameraState, type]);

    // Handle save
    const handleSave = useCallback(async () => {
        if (!validate()) return;

        setIsSaving(true);
        try {
            await onSave({
                name: name.trim(),
                description: description.trim(),
                type,
                scope,
                tags,
                camera_state: capturedCameraState,
                filter_ids: includeFilters ? activeFilterIds : [],
            });
        } catch (err) {
            setErrors({ submit: err.message });
        } finally {
            setIsSaving(false);
        }
    }, [name, description, type, scope, tags, capturedCameraState, includeFilters, activeFilterIds, validate, onSave]);

    if (!isOpen) return null;

    const typeIcons = {
        position: 'navigation',
        state: 'layers',
        comparison: 'gitCompare',
    };

    const scopeIcons = {
        personal: 'userCircle',
        shared: 'users',
        template: 'globe',
    };

    return (
        <div className="bookmark-editor-overlay" onClick={onClose}>
            <div className="bookmark-editor" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bookmark-editor__header">
                    <Icon name="bookmark" size={16} className="icon-purple" />
                    <span>{bookmark ? 'Edit Bookmark' : 'New Bookmark'}</span>
                    <button className="bookmark-editor__close" onClick={onClose}>
                        <Icon name="close" size={14} />
                    </button>
                </div>

                {/* Form */}
                <div className="bookmark-editor__form">
                    {/* Name */}
                    <div className="bookmark-editor__field">
                        <label htmlFor="bookmark-name">Name *</label>
                        <input
                            id="bookmark-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter bookmark name"
                            className={errors.name ? 'error' : ''}
                        />
                        {errors.name && (
                            <span className="bookmark-editor__error">{errors.name}</span>
                        )}
                    </div>

                    {/* Description */}
                    <div className="bookmark-editor__field">
                        <label htmlFor="bookmark-description">Description</label>
                        <textarea
                            id="bookmark-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description"
                            rows={2}
                        />
                    </div>

                    {/* Type */}
                    <div className="bookmark-editor__field">
                        <label>Type</label>
                        <div className="bookmark-editor__button-group">
                            {Object.entries(BOOKMARK_TYPES).map(([key, config]) => {
                                const iconName = typeIcons[key];
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        className={`bookmark-editor__type-btn ${type === key ? 'active' : ''}`}
                                        onClick={() => setType(key)}
                                        title={config.description}
                                    >
                                        <Icon name={iconName} size={12} />
                                        {config.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Scope */}
                    <div className="bookmark-editor__field">
                        <label>Visibility</label>
                        <div className="bookmark-editor__button-group">
                            {Object.entries(BOOKMARK_SCOPES).map(([key, config]) => {
                                const iconName = scopeIcons[key];
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        className={`bookmark-editor__scope-btn ${scope === key ? 'active' : ''}`}
                                        onClick={() => setScope(key)}
                                        title={config.description}
                                    >
                                        <Icon name={iconName} size={12} />
                                        {config.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Camera State */}
                    <div className="bookmark-editor__field">
                        <label>Camera Position</label>
                        <div className="bookmark-editor__camera-row">
                            <span className={capturedCameraState ? 'captured' : 'not-captured'}>
                                {capturedCameraState ? 'Position captured' : 'No position captured'}
                            </span>
                            <button
                                type="button"
                                className="bookmark-editor__capture-btn"
                                onClick={handleCaptureCamera}
                                disabled={!currentCameraState}
                            >
                                <Icon name="camera" size={12} />
                                Capture Current
                            </button>
                        </div>
                        {errors.cameraState && (
                            <span className="bookmark-editor__error">{errors.cameraState}</span>
                        )}
                    </div>

                    {/* Include Filters */}
                    {type === 'state' && (
                        <div className="bookmark-editor__field">
                            <label className="bookmark-editor__checkbox">
                                <input
                                    type="checkbox"
                                    checked={includeFilters}
                                    onChange={(e) => setIncludeFilters(e.target.checked)}
                                />
                                Include current filters ({activeFilterIds.length} active)
                            </label>
                        </div>
                    )}

                    {/* Tags */}
                    <div className="bookmark-editor__field">
                        <label>Tags</label>
                        <div className="bookmark-editor__tags-input">
                            <Icon name="tag" size={12} />
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyPress={handleTagKeyPress}
                                placeholder="Add tag and press Enter"
                            />
                            <button
                                type="button"
                                onClick={handleAddTag}
                                disabled={!tagInput.trim()}
                            >
                                <Icon name="add" size={12} />
                            </button>
                        </div>
                        {tags.length > 0 && (
                            <div className="bookmark-editor__tags">
                                {tags.map(tag => (
                                    <span key={tag} className="bookmark-editor__tag">
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(tag)}
                                        >
                                            <Icon name="close" size={8} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Error message */}
                    {errors.submit && (
                        <div className="bookmark-editor__submit-error">
                            {errors.submit}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bookmark-editor__footer">
                    <LabeledButton
                        label="Cancel"
                        onClick={onClose}
                        size="sm"
                        variant="ghost"
                    />
                    <LabeledButton
                        icon="save"
                        label={isSaving ? 'Saving...' : (bookmark ? 'Update' : 'Create')}
                        onClick={handleSave}
                        disabled={isSaving}
                        size="sm"
                        variant="primary"
                    />
                </div>
            </div>
        </div>
    );
});

export default BookmarkEditor;