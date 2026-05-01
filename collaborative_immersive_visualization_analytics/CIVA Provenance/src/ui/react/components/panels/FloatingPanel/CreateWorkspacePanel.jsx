/**
 * @file CreateWorkspacePanel.jsx
 * @description VR-compatible panel for creating new workspaces.
 * Uses PriorityPanel instead of modal for VR compatibility.
 *
 * Features:
 * - Workspace name and description
 * - Workspace type selection (Project/Breakout)
 * - Auto-switch to new workspace on creation
 *
 * @example
 * <CreateWorkspacePanel
 *   isOpen={showPanel}
 *   onClose={() => setShowPanel(false)}
 *   onCreate={handleCreateWorkspace}
 *   userId={currentUserId}
 *   projectId={currentProjectId}
 * />
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { PriorityPanel } from './PriorityPanel';
import { Icon } from '@UI/react/components/atoms/Icon';
import './CreateWorkspacePanel.scss';

// =============================================================================
// WORKSPACE TYPE OPTIONS
// =============================================================================

const WORKSPACE_TYPES = [
    {
        id: 'project',
        icon: 'globe',
        label: 'Project Workspace',
        description: 'Shared workspace for team collaboration',
        color: 'blue',
    },
    {
        id: 'personal',
        icon: 'user',
        label: 'Scratch Pad',
        description: 'Personal workspace for quick experiments',
        color: 'green',
    },
    {
        id: 'breakout',
        icon: 'gitBranch',
        label: 'Breakout Workspace',
        description: 'Temporary workspace for focused work',
        color: 'purple',
    },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CreateWorkspacePanel({
    isOpen,
    onClose,
    onCreate,
    initialType = 'project',
    initialNamePrefix,
    allowedTypes = null,
    userId,
    projectId,
}) {
    // ---------------------------------------------------------------------------
    // STATE
    // ---------------------------------------------------------------------------

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [workspaceType, setWorkspaceType] = useState('project');
    const [errors, setErrors] = useState({});
    const [isCreating, setIsCreating] = useState(false);

    // ---------------------------------------------------------------------------
    // RESET STATE ON OPEN
    // ---------------------------------------------------------------------------

    useEffect(() => {
        if (isOpen) {
            // Generate default name with timestamp
            const timestamp = new Date().toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
            const resolvedPrefix = initialNamePrefix
                || (initialType === 'breakout'
                    ? 'Breakout'
                    : initialType === 'personal'
                        ? 'Scratch Pad'
                        : 'Workspace');
            setName(`${resolvedPrefix} ${timestamp}`);
            setDescription('');
            const allowedList = Array.isArray(allowedTypes) && allowedTypes.length > 0
                ? allowedTypes
                : null;
            const nextType = allowedList?.includes(initialType) ? initialType : (allowedList?.[0] || initialType || 'project');
            setWorkspaceType(nextType);
            setErrors({});
            setIsCreating(false);
        }
    }, [allowedTypes, initialNamePrefix, initialType, isOpen]);

    const workspaceTypeOptions = useMemo(() => {
        if (Array.isArray(allowedTypes) && allowedTypes.length > 0) {
            return WORKSPACE_TYPES.filter((type) => allowedTypes.includes(type.id));
        }
        return WORKSPACE_TYPES;
    }, [allowedTypes]);

    // ---------------------------------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------------------------------

    const validate = useCallback(() => {
        const newErrors = {};

        if (!name.trim()) {
            newErrors.name = 'Workspace name is required';
        } else if (name.length > 100) {
            newErrors.name = 'Workspace name must be under 100 characters';
        }

        if (description.length > 500) {
            newErrors.description = 'Description must be under 500 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [name, description]);

    // ---------------------------------------------------------------------------
    // HANDLERS
    // ---------------------------------------------------------------------------

    const handleSubmit = useCallback(
        async (e) => {
            e?.preventDefault();

            if (!validate()) return;

            setIsCreating(true);

            try {
                await onCreate({
                    name: name.trim(),
                    description: description.trim(),
                    type: workspaceType,
                    userId,
                    projectId,
                });

                onClose();
            } catch (error) {
                setErrors({ submit: error.message });
            } finally {
                setIsCreating(false);
            }
        },
        [name, description, workspaceType, userId, projectId, onCreate, onClose, validate]
    );

    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
            }
        },
        [handleSubmit]
    );

    // ---------------------------------------------------------------------------
    // FOOTER BUTTONS
    // ---------------------------------------------------------------------------

    const footer = (
        <div className="create-workspace-panel__actions">
            <button
                type="button"
                className="btn btn--secondary"
                onClick={onClose}
                disabled={isCreating}
            >
                Cancel
            </button>
            <button
                type="button"
                className="btn btn--primary"
                onClick={handleSubmit}
                disabled={isCreating || !name.trim()}
            >
                {isCreating ? (
                    <>
                        <Icon name="loader" size={14} className="btn__icon--spin" />
                        Creating...
                    </>
                ) : (
                    <>
                        <Icon name="add" size={14} />
                        Create Workspace
                    </>
                )}
            </button>
        </div>
    );

    // ---------------------------------------------------------------------------
    // RENDER
    // ---------------------------------------------------------------------------

    return (
        <PriorityPanel
            id="create-workspace"
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Workspace"
            icon="grid3x3"
            severity="info"
            size="md"
            footer={footer}
            showCloseButton={true}
            closeOnEscape={!isCreating}
            closeOnBackdrop={false}
            testId="create-workspace-panel"
        >
            <form className="create-workspace-panel__form" onSubmit={handleSubmit}>
                {/* Name Field */}
                <div className="form-field">
                    <label htmlFor="workspace-name" className="form-field__label">
                        Workspace Name
                        <span className="form-field__required">*</span>
                    </label>
                    <input
                        id="workspace-name"
                        type="text"
                        className={`form-field__input ${errors.name ? 'form-field__input--error' : ''}`}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter workspace name"
                        maxLength={100}
                        autoFocus
                        disabled={isCreating}
                    />
                    {errors.name && <span className="form-field__error">{errors.name}</span>}
                    <span className="form-field__hint">{name.length}/100 characters</span>
                </div>

                {/* Description Field */}
                <div className="form-field">
                    <label htmlFor="workspace-description" className="form-field__label">
                        Description
                        <span className="form-field__optional">(Optional)</span>
                    </label>
                    <textarea
                        id="workspace-description"
                        className={`form-field__textarea ${errors.description ? 'form-field__textarea--error' : ''}`}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What's this workspace for?"
                        rows={3}
                        maxLength={500}
                        disabled={isCreating}
                    />
                    {errors.description && <span className="form-field__error">{errors.description}</span>}
                    <span className="form-field__hint">{description.length}/500 characters</span>
                </div>

                {/* Workspace Type */}
                <div className="form-field">
                    <label className="form-field__label">Workspace Type</label>
                    <div className="workspace-type-selector">
                        {workspaceTypeOptions.map((type) => {
                            const isSelected = workspaceType === type.id;
                            return (
                                <button
                                    key={type.id}
                                    type="button"
                                    className={`workspace-type-option ${
                                        isSelected ? 'workspace-type-option--selected' : ''
                                    }`}
                                    onClick={() => setWorkspaceType(type.id)}
                                    disabled={isCreating}
                                    data-color={type.color}
                                >
                                    <div className="workspace-type-option__header">
                                        <Icon name={type.icon} size={16} />
                                        <span className="workspace-type-option__label">{type.label}</span>
                                        {isSelected && (
                                            <Icon name="check" size={14} className="workspace-type-option__check" />
                                        )}
                                    </div>
                                    <p className="workspace-type-option__description">{type.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Submit Error */}
                {errors.submit && (
                    <div className="form-field__error form-field__error--submit">
                        <Icon name="alertCircle" size={14} />
                        {errors.submit}
                    </div>
                )}

                {/* Keyboard Hint */}
                <div className="form-field__hint form-field__hint--center">
                    Press <kbd>⌘</kbd> + <kbd>Enter</kbd> to create
                </div>
            </form>
        </PriorityPanel>
    );
}

export default CreateWorkspacePanel;
