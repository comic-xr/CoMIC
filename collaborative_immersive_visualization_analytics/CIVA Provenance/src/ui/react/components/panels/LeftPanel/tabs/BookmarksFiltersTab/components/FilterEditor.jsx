/**
 * @file FilterEditor.jsx
 * @description Modal editor for creating and editing saved filters.
 *
 * Features:
 * - Name and description fields
 * - Scope selection (View, Dataset, Workspace)
 * - Current filter capture
 * - Tag input
 * - Import/Export options
 *
 * @see Left_Panel_Design_Specification.docx - Section 10 Filters
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { FILTER_SCOPES } from '../hooks/useFiltersTab';

/**
 * FilterEditor component.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether editor is open
 * @param {Object|null} props.filter - Existing filter to edit (null for new)
 * @param {Function} props.onSave - Save handler
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.currentFilterConfig - Current filter configuration for capture
 */
export const FilterEditor = memo(function FilterEditor({
    isOpen,
    filter,
    onSave,
    onClose,
    currentFilterConfig,
}) {
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [scope, setScope] = useState('personal');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [capturedConfig, setCapturedConfig] = useState(null);

    // Validation state
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // Initialize form when filter changes
    useEffect(() => {
        if (filter) {
            setName(filter.name || '');
            setDescription(filter.description || '');
            setScope(filter.scope || 'personal');
            setTags(filter.tags || []);
            setCapturedConfig(filter.filterConfig || null);
        } else {
            // Reset for new filter
            setName('');
            setDescription('');
            setScope('personal');
            setTags([]);
            setCapturedConfig(currentFilterConfig || null);
        }
        setErrors({});
    }, [filter, currentFilterConfig, isOpen]);

    // Capture current filter configuration
    const handleCaptureFilter = useCallback(() => {
        if (currentFilterConfig) {
            setCapturedConfig(currentFilterConfig);
        }
    }, [currentFilterConfig]);

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

        if (!capturedConfig) {
            newErrors.filterConfig = 'Filter configuration is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [name, capturedConfig]);

    // Handle save
    const handleSave = useCallback(async () => {
        if (!validate()) return;

        setIsSaving(true);
        try {
            await onSave({
                name: name.trim(),
                description: description.trim(),
                scope,
                tags,
                filterConfig: capturedConfig,
            });
        } catch (err) {
            setErrors({ submit: err.message });
        } finally {
            setIsSaving(false);
        }
    }, [name, description, scope, tags, capturedConfig, validate, onSave]);

    // Format filter config summary
    const formatConfigSummary = useCallback((config) => {
        if (!config) return 'No filter captured';

        const parts = [];
        if (config.range) {
            parts.push(`Range: ${config.range.min}-${config.range.max}`);
        }
        if (config.categories?.length) {
            parts.push(`${config.categories.length} categories`);
        }
        if (config.spatial) {
            parts.push('Spatial region');
        }
        if (config.expression) {
            parts.push('Expression');
        }

        return parts.length > 0 ? parts.join(', ') : 'Empty filter';
    }, []);

    if (!isOpen) return null;

    const scopeIcons = {
        view: 'eye',
        dataset: 'database',
        workspace: 'layout',
    };

    return (
        <div className="filter-editor-overlay" onClick={onClose}>
            <div className="filter-editor" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="filter-editor__header">
                    <Icon name="filter" size={16} className="icon-amber" />
                    <span>{filter ? 'Edit Filter' : 'Save Filter'}</span>
                    <button className="filter-editor__close" onClick={onClose}>
                        <Icon name="close" size={14} />
                    </button>
                </div>

                {/* Form */}
                <div className="filter-editor__form">
                    {/* Name */}
                    <div className="filter-editor__field">
                        <label htmlFor="filter-name">Name *</label>
                        <input
                            id="filter-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter filter name"
                            className={errors.name ? 'error' : ''}
                        />
                        {errors.name && (
                            <span className="filter-editor__error">{errors.name}</span>
                        )}
                    </div>

                    {/* Description */}
                    <div className="filter-editor__field">
                        <label htmlFor="filter-description">Description</label>
                        <textarea
                            id="filter-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description"
                            rows={2}
                        />
                    </div>

                    {/* Scope */}
                    <div className="filter-editor__field">
                        <label>Scope</label>
                        <div className="filter-editor__button-group">
                            {Object.entries(FILTER_SCOPES).map(([key, config]) => {
                                const iconName = scopeIcons[key] || 'filter';
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        className={`filter-editor__scope-btn ${scope === key ? 'active' : ''}`}
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

                    {/* Filter Configuration */}
                    <div className="filter-editor__field">
                        <label>Filter Configuration</label>
                        <div className="filter-editor__config-row">
                            <span className={capturedConfig ? 'captured' : 'not-captured'}>
                                {formatConfigSummary(capturedConfig)}
                            </span>
                            <button
                                type="button"
                                className="filter-editor__capture-btn"
                                onClick={handleCaptureFilter}
                                disabled={!currentFilterConfig}
                            >
                                <Icon name="download" size={12} />
                                Capture Current
                            </button>
                        </div>
                        {errors.filterConfig && (
                            <span className="filter-editor__error">{errors.filterConfig}</span>
                        )}
                    </div>

                    {/* Tags */}
                    <div className="filter-editor__field">
                        <label>Tags</label>
                        <div className="filter-editor__tags-input">
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
                            <div className="filter-editor__tags">
                                {tags.map(tag => (
                                    <span key={tag} className="filter-editor__tag">
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
                        <div className="filter-editor__submit-error">
                            {errors.submit}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="filter-editor__footer">
                    <LabeledButton
                        label="Cancel"
                        onClick={onClose}
                        size="sm"
                        variant="ghost"
                    />
                    <LabeledButton
                        icon="save"
                        label={isSaving ? 'Saving...' : (filter ? 'Update' : 'Save')}
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

export default FilterEditor;