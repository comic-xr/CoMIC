/**
 * @file NewProjectModal.jsx
 * @description Form modal for creating a new project.
 * Allows users to set project name, description, template, and visibility.
 *
 * Features:
 * - Project name with character counter (required)
 * - Description textarea with character counter (optional)
 * - Rich template selector with icon cards
 * - Visibility selector with horizontal radio cards
 * - Form validation and loading state
 * - Auto-clear on close
 *
 * @example
 * import { NewProjectModal } from '@UI/react/components/modals/NewProjectModal';
 *
 * <NewProjectModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onCreate={async (data) => {
 *     await api.projects.create(data);
 *     toast.success('Project created');
 *   }}
 * />
 */

import React, { memo, useState, useCallback, useEffect } from 'react';
import { Icon, getIconComponent } from '@UI/react/components/atoms/Icon';
import { FormModal, FormField } from '../FormModal';
import './NewProjectModal.scss';

/**
 * Project template options
 */
const PROJECT_TEMPLATES = [
    {
        value: 'blank',
        label: 'Blank Project',
        description: 'Start from scratch with an empty canvas',
        icon: File,
    },
    {
        value: 'research',
        label: 'Research Lab',
        description: 'Pre-configured for scientific data analysis',
        icon: FlaskConical,
    },
    {
        value: 'analysis',
        label: 'Data Analysis',
        description: 'Includes common analysis tools and layouts',
        icon: BarChart3,
    },
    {
        value: 'review',
        label: 'Collaborative Review',
        description: 'Optimized for team review sessions',
        icon: Users,
    },
];

/**
 * Visibility options
 */
const VISIBILITY_OPTIONS = [
    {
        value: 'private',
        label: 'Private',
        description: 'Only you can access',
        icon: Lock,
    },
    {
        value: 'team',
        label: 'Team',
        description: 'Team members can access',
        icon: Users,
    },
    {
        value: 'organization',
        label: 'Organization',
        description: 'Everyone in your org',
        icon: Building,
    },
];

/**
 * @typedef {Object} NewProjectData
 * @property {string} name - Project name (required, max 100 chars)
 * @property {string} description - Project description (optional, max 500 chars)
 * @property {'blank'|'research'|'analysis'|'review'} template - Selected template
 * @property {'private'|'team'|'organization'} visibility - Access level
 */

/**
 * @typedef {Object} NewProjectModalProps
 * @property {boolean} isOpen - Whether modal is visible
 * @property {() => void} onClose - Close handler
 * @property {(project: NewProjectData) => Promise<void>} onCreate - Create project callback
 * @property {string} [className] - Additional CSS class
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Template selector component with rich cards.
 */
const TemplateSelector = memo(function TemplateSelector({
    value,
    onChange,
    disabled
}) {
    return (
        <div className="new-project-modal__templates" role="radiogroup" aria-label="Project template">
            {PROJECT_TEMPLATES.map((template) => {
                const Icon = template.icon;
                const isSelected = value === template.value;

                return (
                    <button
                        key={template.value}
                        type="button"
                        className={`new-project-modal__template-option ${isSelected ? 'new-project-modal__template-option--selected' : ''}`}
                        onClick={() => onChange(template.value)}
                        disabled={disabled}
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={template.label}
                    >
                        <span className="new-project-modal__template-option__icon">
                            <Icon size={18} />
                        </span>
                        <span className="new-project-modal__template-option__content">
                            <span className="new-project-modal__template-option__label">
                                {template.label}
                            </span>
                            <span className="new-project-modal__template-option__description">
                                {template.description}
                            </span>
                        </span>
                        <span className="new-project-modal__template-option__check">
                            <Icon name="check" size={16} />
                        </span>
                    </button>
                );
            })}
        </div>
    );
});

/**
 * Visibility selector component with horizontal cards.
 */
const VisibilitySelector = memo(function VisibilitySelector({
    value,
    onChange,
    disabled
}) {
    return (
        <div className="new-project-modal__visibility" role="radiogroup" aria-label="Project visibility">
            {VISIBILITY_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = value === option.value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        className={`new-project-modal__visibility-option ${isSelected ? 'new-project-modal__visibility-option--selected' : ''}`}
                        onClick={() => onChange(option.value)}
                        disabled={disabled}
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`${option.label}: ${option.description}`}
                    >
                        <span className="new-project-modal__visibility-option__icon">
                            <Icon size={20} />
                        </span>
                        <span className="new-project-modal__visibility-option__label">
                            {option.label}
                        </span>
                        <span className="new-project-modal__visibility-option__description">
                            {option.description}
                        </span>
                    </button>
                );
            })}
        </div>
    );
});

/**
 * Form modal for creating a new project.
 *
 * @param {NewProjectModalProps} props - Component props
 * @returns {React.ReactElement} The rendered modal
 */
function NewProjectModal({
    isOpen,
    onClose,
    onCreate,
    className = '',
    testId
}) {
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [template, setTemplate] = useState('blank');
    const [visibility, setVisibility] = useState('private');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setName('');
            setDescription('');
            setTemplate('blank');
            setVisibility('private');
            setError('');
        }
    }, [isOpen]);

    /**
     * Validate form data
     */
    const validateForm = useCallback(() => {
        if (!name.trim()) {
            setError('Project name is required');
            return false;
        }
        setError('');
        return true;
    }, [name]);

    /**
     * Handle form submission
     */
    const handleSubmit = useCallback(async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        setError('');

        try {
            await onCreate({
                name: name.trim(),
                description: description.trim(),
                template,
                visibility,
            });
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to create project');
        } finally {
            setIsSubmitting(false);
        }
    }, [name, description, template, visibility, onCreate, onClose, validateForm]);

    /**
     * Handle name change with validation reset
     */
    const handleNameChange = useCallback((value) => {
        setName(value);
        if (error) setError('');
    }, [error]);

    // Check if form is valid for submission
    const isFormValid = name.trim().length > 0;

    // Build content class names
    const contentClassNames = [
        'new-project-modal',
        className
    ].filter(Boolean).join(' ');

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Project"
            icon="folderPlus"
            submitLabel="Create Project"
            submittingLabel="Creating..."
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitDisabled={!isFormValid}
            testId={testId}
        >
            <div className={contentClassNames}>
                {/* Project Name */}
                <FormField
                    name="name"
                    label="Project Name"
                    type="text"
                    required
                    placeholder="Enter project name"
                    maxLength={100}
                    value={name}
                    onChange={handleNameChange}
                    error={error}
                    autoFocus
                />

                {/* Description */}
                <FormField
                    name="description"
                    label="Description"
                    type="textarea"
                    placeholder="Describe what this project is about..."
                    maxLength={500}
                    value={description}
                    onChange={setDescription}
                    helpText="Optional - help others understand your project"
                />

                {/* Template Selector */}
                <div className="form-field">
                    <label className="form-field__label">
                        Template
                    </label>
                    <TemplateSelector
                        value={template}
                        onChange={setTemplate}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Visibility Selector */}
                <div className="form-field">
                    <label className="form-field__label">
                        Visibility
                    </label>
                    <VisibilitySelector
                        value={visibility}
                        onChange={setVisibility}
                        disabled={isSubmitting}
                    />
                </div>
            </div>
        </FormModal>
    );
}

export default memo(NewProjectModal);
export { NewProjectModal, PROJECT_TEMPLATES, VISIBILITY_OPTIONS };