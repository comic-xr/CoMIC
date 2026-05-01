/**
 * @file EmailTagInput.jsx
 * @description Custom email tag input component for entering multiple email addresses.
 * Renders emails as removable pills with validation feedback.
 *
 * Features:
 * - Tag rendering as pills inside input
 * - Enter, comma, or space creates tag
 * - Backspace removes last tag when input empty
 * - Invalid emails show with error styling
 * - Click × on tag to remove
 * - Paste multiple emails (comma/newline separated)
 * - Keyboard navigation between tags
 *
 * @example
 * <EmailTagInput
 *   value={emails}
 *   onChange={setEmails}
 *   placeholder="Enter email addresses"
 *   error={error}
 * />
 */

import React, { memo, useState, useRef, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Check if email is valid
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
export function isValidEmail(email) {
    return EMAIL_REGEX.test(email.trim());
}

/**
 * Parse emails from input string
 * @param {string} input - Input string with emails
 * @returns {string[]} Array of email strings
 */
export function parseEmails(input) {
    return input
        .split(/[,;\n\s]+/)
        .map(e => e.trim())
        .filter(e => e.length > 0);
}

/**
 * @typedef {Object} EmailTagInputProps
 * @property {string[]} value - Array of email strings
 * @property {(emails: string[]) => void} onChange - Change handler
 * @property {string} [placeholder] - Input placeholder
 * @property {boolean} [disabled] - Disable input
 * @property {string} [error] - Error message
 * @property {boolean} [autoFocus] - Auto-focus on mount
 * @property {string} [className] - Additional CSS class
 */

/**
 * Email tag input component.
 *
 * @param {EmailTagInputProps} props - Component props
 * @returns {React.ReactElement} The rendered component
 */
function EmailTagInput({
    value = [],
    onChange,
    placeholder = 'Enter email addresses',
    disabled = false,
    error,
    autoFocus = false,
    className = ''
}) {
    const [inputValue, setInputValue] = useState('');
    const [invalidEmails, setInvalidEmails] = useState(new Set());
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    /**
     * Add an email to the list
     */
    const addEmail = useCallback((email) => {
        const trimmed = email.trim().toLowerCase();
        if (!trimmed) return false;

        // Check for duplicates
        if (value.includes(trimmed)) {
            setInputValue('');
            return false;
        }

        // Validate email
        const isValid = isValidEmail(trimmed);
        if (!isValid) {
            setInvalidEmails(prev => new Set([...prev, trimmed]));
        }

        onChange([...value, trimmed]);
        setInputValue('');
        return true;
    }, [value, onChange]);

    /**
     * Add multiple emails from parsed input
     */
    const addEmails = useCallback((emails) => {
        const newEmails = [...value];
        const newInvalid = new Set(invalidEmails);

        emails.forEach(email => {
            const trimmed = email.trim().toLowerCase();
            if (trimmed && !newEmails.includes(trimmed)) {
                newEmails.push(trimmed);
                if (!isValidEmail(trimmed)) {
                    newInvalid.add(trimmed);
                }
            }
        });

        onChange(newEmails);
        setInvalidEmails(newInvalid);
        setInputValue('');
    }, [value, invalidEmails, onChange]);

    /**
     * Remove an email from the list
     */
    const removeEmail = useCallback((emailToRemove) => {
        onChange(value.filter(email => email !== emailToRemove));
        setInvalidEmails(prev => {
            const next = new Set(prev);
            next.delete(emailToRemove);
            return next;
        });
        // Focus input after removing
        inputRef.current?.focus();
    }, [value, onChange]);

    /**
     * Handle input keydown
     */
    const handleKeyDown = useCallback((event) => {
        const { key } = event;

        // Enter, comma, or space to add email
        if (key === 'Enter' || key === ',' || key === ' ') {
            event.preventDefault();
            if (inputValue.trim()) {
                addEmail(inputValue);
            }
            return;
        }

        // Backspace to remove last email when input is empty
        if (key === 'Backspace' && !inputValue && value.length > 0) {
            removeEmail(value[value.length - 1]);
            return;
        }

        // Tab to add email and move focus
        if (key === 'Tab' && inputValue.trim()) {
            addEmail(inputValue);
            // Don't prevent default - allow tab to move focus
        }
    }, [inputValue, value, addEmail, removeEmail]);

    /**
     * Handle paste event for multiple emails
     */
    const handlePaste = useCallback((event) => {
        event.preventDefault();
        const pastedText = event.clipboardData.getData('text');
        const emails = parseEmails(pastedText);

        if (emails.length > 0) {
            addEmails(emails);
        }
    }, [addEmails]);

    /**
     * Handle blur - add current input as email
     */
    const handleBlur = useCallback(() => {
        if (inputValue.trim()) {
            addEmail(inputValue);
        }
    }, [inputValue, addEmail]);

    /**
     * Handle container click - focus input
     */
    const handleContainerClick = useCallback(() => {
        if (!disabled) {
            inputRef.current?.focus();
        }
    }, [disabled]);

    /**
     * Handle input change
     */
    const handleInputChange = useCallback((event) => {
        const val = event.target.value;
        // Check if user typed a delimiter
        if (val.includes(',') || val.includes(' ') || val.includes(';')) {
            const emails = parseEmails(val);
            if (emails.length > 0) {
                addEmails(emails);
            }
        } else {
            setInputValue(val);
        }
    }, [addEmails]);

    // Build container class names
    const containerClassNames = [
        'email-tag-input',
        error && 'email-tag-input--error',
        disabled && 'email-tag-input--disabled',
        className
    ].filter(Boolean).join(' ');

    return (
        <div
            ref={containerRef}
            className={containerClassNames}
            onClick={handleContainerClick}
            role="listbox"
            aria-label="Email addresses"
            aria-describedby={error ? 'email-input-error' : undefined}
        >
            {/* Email tags */}
            {value.map((email) => {
                const isInvalid = invalidEmails.has(email);
                return (
                    <span
                        key={email}
                        className={`email-tag ${isInvalid ? 'email-tag--invalid' : ''}`}
                        role="option"
                        aria-selected="true"
                    >
                        <span className="email-tag__text" title={email}>
                            {email}
                        </span>
                        <button
                            type="button"
                            className="email-tag__remove"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeEmail(email);
                            }}
                            disabled={disabled}
                            aria-label={`Remove ${email}`}
                            tabIndex={-1}
                        >
                            <Icon name="close" size={10} />
                        </button>
                    </span>
                );
            })}

            {/* Input field */}
            <input
                ref={inputRef}
                type="email"
                className="email-tag-input__input"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onBlur={handleBlur}
                placeholder={value.length === 0 ? placeholder : ''}
                disabled={disabled}
                autoFocus={autoFocus}
                autoComplete="off"
                aria-label="Add email address"
            />
        </div>
    );
}

export default memo(EmailTagInput);
export { EmailTagInput };