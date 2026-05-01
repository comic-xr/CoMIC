/**
 * @file FormField.jsx
 * @description Reusable form field component for FormModal.
 * Supports text, textarea, select, radio, and tag input types.
 *
 * Features:
 * - Multiple field types: text, textarea, select, radio, tags, email
 * - Required field indicator with asterisk
 * - Character counter for maxLength fields
 * - Error and help text display
 * - Tag input with email validation
 * - Custom styled radio buttons
 * - Validation on blur
 *
 * @example
 * <FormField
 *   name="email"
 *   label="Email Address"
 *   type="email"
 *   required
 *   placeholder="Enter your email"
 *   value={email}
 *   onChange={setEmail}
 *   error={errors.email}
 * />
 */

import React, { useState, useRef, useCallback, memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * @typedef {Object} FormFieldProps
 * @property {string} name - Field name (used as key in form data)
 * @property {string} label - Field label
 * @property {'text'|'textarea'|'select'|'radio'|'tags'|'email'} [type='text'] - Field type
 * @property {boolean} [required=false] - Whether field is required (shows asterisk)
 * @property {string} [placeholder] - Placeholder text
 * @property {number} [maxLength] - Max character count
 * @property {string} [error] - Error message to display
 * @property {string} [helpText] - Helper text below field
 * @property {Array<{value: string, label: string}>} [options] - Options for select/radio
 * @property {boolean} [disabled=false] - Disable field
 * @property {boolean} [autoFocus=false] - Auto-focus this field
 * @property {string|string[]} value - Current value
 * @property {(value: any) => void} onChange - Value change handler
 * @property {(name: string) => void} [onBlur] - Blur handler for validation
 */

/**
 * Validates an email address format.
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

/**
 * Text input field component.
 */
const TextField = memo(function TextField({
    name,
    type,
    value,
    onChange,
    onBlur,
    placeholder,
    maxLength,
    disabled,
    autoFocus,
    hasError
}) {
    const handleChange = useCallback((e) => {
        onChange(e.target.value);
    }, [onChange]);

    const handleBlur = useCallback(() => {
        if (onBlur) onBlur(name);
    }, [name, onBlur]);

    return (
        <input
            type={type === 'email' ? 'email' : 'text'}
            className={`form-field__input ${hasError ? 'form-field__input--error' : ''}`}
            name={name}
            value={value || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            autoFocus={autoFocus}
            autoComplete="off"
        />
    );
});

/**
 * Textarea field component.
 */
const TextareaField = memo(function TextareaField({
    name,
    value,
    onChange,
    onBlur,
    placeholder,
    maxLength,
    disabled,
    autoFocus,
    hasError
}) {
    const handleChange = useCallback((e) => {
        onChange(e.target.value);
    }, [onChange]);

    const handleBlur = useCallback(() => {
        if (onBlur) onBlur(name);
    }, [name, onBlur]);

    // Prevent form submission on Enter (allow newlines)
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            e.stopPropagation();
        }
    }, []);

    return (
        <textarea
            className={`form-field__textarea ${hasError ? 'form-field__input--error' : ''}`}
            name={name}
            value={value || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            autoFocus={autoFocus}
        />
    );
});

/**
 * Select dropdown field component.
 */
const SelectField = memo(function SelectField({
    name,
    value,
    onChange,
    onBlur,
    options = [],
    disabled,
    hasError
}) {
    const handleChange = useCallback((e) => {
        onChange(e.target.value);
    }, [onChange]);

    const handleBlur = useCallback(() => {
        if (onBlur) onBlur(name);
    }, [name, onBlur]);

    return (
        <div className="form-field__select-wrapper">
            <select
                className={`form-field__select ${hasError ? 'form-field__input--error' : ''}`}
                name={name}
                value={value || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={disabled}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <Icon name="chevronDown" className="form-field__select-icon" size={16} />
        </div>
    );
});

/**
 * Radio button group field component.
 */
const RadioField = memo(function RadioField({
    name,
    value,
    onChange,
    options = [],
    disabled
}) {
    const handleChange = useCallback((optionValue) => {
        onChange(optionValue);
    }, [onChange]);

    // Use vertical layout for 4+ options
    const isVertical = options.length >= 4;

    return (
        <div className={`radio-group ${isVertical ? 'radio-group--vertical' : ''}`}>
            {options.map((option) => (
                <label key={option.value} className="radio-option">
                    <input
                        type="radio"
                        className="radio-option__input"
                        name={name}
                        value={option.value}
                        checked={value === option.value}
                        onChange={() => handleChange(option.value)}
                        disabled={disabled}
                    />
                    <span className="radio-option__label">{option.label}</span>
                </label>
            ))}
        </div>
    );
});

/**
 * Tag input field component for emails or other tag-based inputs.
 */
const TagInputField = memo(function TagInputField({
    name,
    value = [],
    onChange,
    onBlur,
    placeholder,
    disabled,
    autoFocus,
    hasError
}) {
    const [inputValue, setInputValue] = useState('');
    const [invalidTags, setInvalidTags] = useState(new Set());
    const inputRef = useRef(null);

    /**
     * Adds a tag to the list.
     */
    const addTag = useCallback((tagValue) => {
        const trimmed = tagValue.trim();
        if (!trimmed) return;

        // Check if already exists
        if (value.includes(trimmed)) {
            setInputValue('');
            return;
        }

        // Validate email
        const isValid = isValidEmail(trimmed);
        if (!isValid) {
            setInvalidTags((prev) => new Set([...prev, trimmed]));
        }

        onChange([...value, trimmed]);
        setInputValue('');
    }, [value, onChange]);

    /**
     * Removes a tag from the list.
     */
    const removeTag = useCallback((tagToRemove) => {
        onChange(value.filter((tag) => tag !== tagToRemove));
        setInvalidTags((prev) => {
            const next = new Set(prev);
            next.delete(tagToRemove);
            return next;
        });
    }, [value, onChange]);

    /**
     * Handles input keydown events.
     */
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
            removeTag(value[value.length - 1]);
        }
    }, [inputValue, value, addTag, removeTag]);

    /**
     * Handles paste events for multiple emails.
     */
    const handlePaste = useCallback((e) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        const emails = pastedText.split(/[,;\s\n]+/).filter(Boolean);

        const newTags = [...value];
        const newInvalid = new Set(invalidTags);

        emails.forEach((email) => {
            const trimmed = email.trim();
            if (trimmed && !newTags.includes(trimmed)) {
                newTags.push(trimmed);
                if (!isValidEmail(trimmed)) {
                    newInvalid.add(trimmed);
                }
            }
        });

        onChange(newTags);
        setInvalidTags(newInvalid);
        setInputValue('');
    }, [value, invalidTags, onChange]);

    /**
     * Handles blur - add current input as tag.
     */
    const handleBlur = useCallback(() => {
        if (inputValue.trim()) {
            addTag(inputValue);
        }
        if (onBlur) onBlur(name);
    }, [inputValue, name, onBlur, addTag]);

    /**
     * Focus the input when clicking the container.
     */
    const handleContainerClick = useCallback(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <div
            className={`tag-input ${hasError ? 'tag-input--error' : ''}`}
            onClick={handleContainerClick}
        >
            {value.map((tag) => (
                <span
                    key={tag}
                    className={`tag-input__tag ${invalidTags.has(tag) ? 'tag-input__tag--invalid' : ''}`}
                >
                    {tag}
                    <button
                        type="button"
                        className="tag-input__tag-remove"
                        onClick={(e) => {
                            e.stopPropagation();
                            removeTag(tag);
                        }}
                        disabled={disabled}
                        aria-label={`Remove ${tag}`}
                    >
                        <Icon name="close" size={12} />
                    </button>
                </span>
            ))}
            <input
                ref={inputRef}
                type="text"
                className="tag-input__input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onBlur={handleBlur}
                placeholder={value.length === 0 ? placeholder : ''}
                disabled={disabled}
                autoFocus={autoFocus}
            />
        </div>
    );
});

/**
 * Character counter component.
 */
const CharacterCounter = memo(function CharacterCounter({ current, max }) {
    const remaining = max - current;
    const percentage = (current / max) * 100;

    let className = 'form-field__char-count';
    if (percentage >= 100) {
        className += ' form-field__char-count--at-limit';
    } else if (percentage >= 90) {
        className += ' form-field__char-count--near-limit';
    }

    return (
        <span className={className}>
            {current}/{max}
        </span>
    );
});

/**
 * Form field component that renders different input types.
 *
 * @param {FormFieldProps} props - Component props
 * @returns {React.ReactElement} The rendered form field
 */
function FormField({
    name,
    label,
    type = 'text',
    required = false,
    placeholder,
    maxLength,
    error,
    helpText,
    options,
    disabled = false,
    autoFocus = false,
    value,
    onChange,
    onBlur
}) {
    const hasError = Boolean(error);
    const currentLength = typeof value === 'string' ? value.length : 0;

    /**
     * Renders the appropriate field type.
     */
    const renderField = () => {
        switch (type) {
            case 'textarea':
                return (
                    <TextareaField
                        name={name}
                        value={value}
                        onChange={onChange}
                        onBlur={onBlur}
                        placeholder={placeholder}
                        maxLength={maxLength}
                        disabled={disabled}
                        autoFocus={autoFocus}
                        hasError={hasError}
                    />
                );

            case 'select':
                return (
                    <SelectField
                        name={name}
                        value={value}
                        onChange={onChange}
                        onBlur={onBlur}
                        options={options}
                        disabled={disabled}
                        hasError={hasError}
                    />
                );

            case 'radio':
                return (
                    <RadioField
                        name={name}
                        value={value}
                        onChange={onChange}
                        options={options}
                        disabled={disabled}
                    />
                );

            case 'tags':
                return (
                    <TagInputField
                        name={name}
                        value={value}
                        onChange={onChange}
                        onBlur={onBlur}
                        placeholder={placeholder}
                        disabled={disabled}
                        autoFocus={autoFocus}
                        hasError={hasError}
                    />
                );

            case 'email':
            case 'text':
            default:
                return (
                    <TextField
                        name={name}
                        type={type}
                        value={value}
                        onChange={onChange}
                        onBlur={onBlur}
                        placeholder={placeholder}
                        maxLength={maxLength}
                        disabled={disabled}
                        autoFocus={autoFocus}
                        hasError={hasError}
                    />
                );
        }
    };

    return (
        <div className={`form-field ${hasError ? 'form-field--error' : ''}`}>
            {/* Label */}
            <label
                className={`form-field__label ${required ? 'form-field__label--required' : ''}`}
                htmlFor={name}
            >
                {label}
            </label>

            {/* Field */}
            {renderField()}

            {/* Footer row: error/help text + character counter */}
            <div className="form-field__footer">
                <div className="form-field__messages">
                    {error && (
                        <span className="form-field__error" role="alert">
                            {error}
                        </span>
                    )}
                    {!error && helpText && (
                        <span className="form-field__help">
                            {helpText}
                        </span>
                    )}
                </div>

                {maxLength && type !== 'tags' && type !== 'radio' && type !== 'select' && (
                    <CharacterCounter current={currentLength} max={maxLength} />
                )}
            </div>
        </div>
    );
}

export default memo(FormField);
export { FormField };