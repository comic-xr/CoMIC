/**
 * @file InviteMemberModal.jsx
 * @description Form modal for inviting members to a project.
 * Allows admins to enter multiple email addresses and assign roles.
 *
 * Features:
 * - Email tag input for multiple addresses
 * - Role selection with descriptions
 * - Optional personal message
 * - Email validation
 * - Dynamic submit button label
 * - Form validation and loading state
 *
 * @example
 * import { InviteMemberModal } from '@UI/react/components/modals/InviteMemberModal';
 *
 * <InviteMemberModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   projectName="My Research Project"
 *   onInvite={async (data) => {
 *     await api.projects.inviteMembers(data);
 *     toast.success(`Sent ${data.emails.length} invitation(s)`);
 *   }}
 * />
 */

import React, { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { Icon, getIconComponent } from '@UI/react/components/atoms/Icon';
import { FormModal, FormField } from '../FormModal';
import EmailTagInput, { isValidEmail } from './EmailTagInput';
import './InviteMemberModal.scss';

/**
 * Role options configuration
 */
const ROLE_OPTIONS = [
    {
        value: 'viewer',
        label: 'Viewer',
        description: 'Can view content but not make changes',
        icon: 'eye',
    },
    {
        value: 'member',
        label: 'Member',
        description: 'Can view, edit, and create content',
        icon: 'user',
    },
    {
        value: 'admin',
        label: 'Admin',
        description: 'Full access including project settings',
        icon: 'shield',
    },
];

/**
 * @typedef {Object} InviteData
 * @property {string[]} emails - Array of email addresses
 * @property {'viewer'|'member'|'admin'} role - Role to assign
 * @property {string} [message] - Optional personal message
 */

/**
 * @typedef {Object} InviteMemberModalProps
 * @property {boolean} isOpen - Whether modal is visible
 * @property {() => void} onClose - Close handler
 * @property {string} projectName - Name of project to display in title
 * @property {(data: InviteData) => Promise<void>} onInvite - Send invites callback
 * @property {Array<{email: string}>} [existingMembers] - Existing members to warn about
 * @property {string} [className] - Additional CSS class
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Custom role selector with icons and descriptions.
 */
const RoleSelector = memo(function RoleSelector({
    value,
    onChange,
    disabled
}) {
    return (
        <div className="role-selector" role="radiogroup" aria-label="Member role">
            {ROLE_OPTIONS.map((option) => {
                const isSelected = value === option.value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        className={`role-selector__option ${isSelected ? 'role-selector__option--selected' : ''}`}
                        onClick={() => onChange(option.value)}
                        disabled={disabled}
                        role="radio"
                        aria-checked={isSelected}
                    >
                        <span className="role-selector__icon">
                            <Icon name={option.icon} size={18} />
                        </span>
                        <span className="role-selector__content">
                            <span className="role-selector__label">{option.label}</span>
                            <span className="role-selector__description">{option.description}</span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
});

/**
 * Form modal for inviting members to a project.
 *
 * @param {InviteMemberModalProps} props - Component props
 * @returns {React.ReactElement} The rendered modal
 */
function InviteMemberModal({
    isOpen,
    onClose,
    projectName,
    onInvite,
    existingMembers = [],
    className = '',
    testId
}) {
    // Form state
    const [emails, setEmails] = useState([]);
    const [role, setRole] = useState('member');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setEmails([]);
            setRole('member');
            setMessage('');
            setError('');
        }
    }, [isOpen]);

    /**
     * Check if any emails are already members
     */
    const duplicateEmails = useMemo(() => {
        if (!existingMembers.length) return [];
        const memberEmails = existingMembers.map(m => m.email?.toLowerCase());
        return emails.filter(email => memberEmails.includes(email.toLowerCase()));
    }, [emails, existingMembers]);

    /**
     * Check if all emails are valid
     */
    const invalidEmails = useMemo(() => {
        return emails.filter(email => !isValidEmail(email));
    }, [emails]);

    /**
     * Validate form data
     */
    const validateForm = useCallback(() => {
        if (emails.length === 0) {
            setError('Please enter at least one email address');
            return false;
        }

        if (invalidEmails.length > 0) {
            setError(`Invalid email format: ${invalidEmails.join(', ')}`);
            return false;
        }

        if (duplicateEmails.length > 0) {
            setError(`Already a member: ${duplicateEmails.join(', ')}`);
            return false;
        }

        setError('');
        return true;
    }, [emails, invalidEmails, duplicateEmails]);

    /**
     * Handle form submission
     */
    const handleSubmit = useCallback(async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        setError('');

        try {
            await onInvite({
                emails,
                role,
                message: message.trim() || undefined,
            });
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to send invitations');
        } finally {
            setIsSubmitting(false);
        }
    }, [emails, role, message, onInvite, onClose, validateForm]);

    /**
     * Handle email change with error reset
     */
    const handleEmailsChange = useCallback((newEmails) => {
        setEmails(newEmails);
        if (error) setError('');
    }, [error]);

    // Check if form is valid for submission
    const validEmailCount = emails.filter(e => isValidEmail(e)).length;
    const isFormValid = validEmailCount > 0 && invalidEmails.length === 0;

    // Build submit button label
    const submitLabel = useMemo(() => {
        if (validEmailCount === 0) return 'Send Invite';
        if (validEmailCount === 1) return 'Send 1 Invite';
        return `Send ${validEmailCount} Invites`;
    }, [validEmailCount]);

    // Build content class names
    const contentClassNames = [
        'invite-member-modal',
        className
    ].filter(Boolean).join(' ');

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Invite to ${projectName}`}
            icon={getIconComponent('userPlus')}
            submitLabel={submitLabel}
            submittingLabel="Sending..."
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitDisabled={!isFormValid}
            testId={testId}
        >
            <div className={contentClassNames}>
                {/* Email Addresses */}
                <div className="form-field">
                    <label className="form-field__label form-field__label--required">
                        Email Addresses
                    </label>
                    <EmailTagInput
                        value={emails}
                        onChange={handleEmailsChange}
                        placeholder="Enter email addresses"
                        disabled={isSubmitting}
                        error={error}
                        autoFocus
                    />
                    <div className="form-field__footer">
                        <div className="form-field__messages">
                            {error ? (
                                <span className="form-field__error" role="alert">{error}</span>
                            ) : (
                                <span className="form-field__help">
                                    Press Enter, comma, or space to add
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Role Selector */}
                <div className="form-field">
                    <label className="form-field__label">
                        Role
                    </label>
                    <RoleSelector
                        value={role}
                        onChange={setRole}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Personal Message */}
                <FormField
                    name="message"
                    label="Personal Message"
                    type="textarea"
                    placeholder="Add a personal note to the invitation..."
                    maxLength={200}
                    value={message}
                    onChange={setMessage}
                    helpText="Optional - will be included in the invitation email"
                />
            </div>
        </FormModal>
    );
}

export default memo(InviteMemberModal);
export { InviteMemberModal, ROLE_OPTIONS };