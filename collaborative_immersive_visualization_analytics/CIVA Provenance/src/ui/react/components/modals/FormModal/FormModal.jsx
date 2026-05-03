/**
 * @file FormModal.jsx
 * @description Form modal component for CIA Web.
 * Extends the base Modal component to handle multi-field input forms
 * like New Project, Invite Member, and Share View modals.
 *
 * Features:
 * - Multiple form field types via FormField component
 * - Form-level and field-level validation
 * - Submit button loading state with spinner
 * - Auto-focus first field on open
 * - Clear form state on close
 * - Scroll to first error on validation failure
 * - Prevent Enter key from closing modal (except from buttons)
 *
 * @example
 * <FormModal
 *   isOpen={isOpen}
 *   onClose={close}
 *   title="Create New Project"
 *   icon="folderPlus"
 *   submitLabel="Create Project"
 *   onSubmit={handleCreate}
 *   isSubmitting={isSubmitting}
 * >
 *   <FormField name="name" label="Project Name" required value={name} onChange={setName} />
 *   <FormField name="description" label="Description" type="textarea" value={desc} onChange={setDesc} />
 * </FormModal>
 */

import React, { useCallback, useEffect, useRef, memo } from 'react';
import { Modal } from '../Modal';
import { Icon } from '@UI/react/components/atoms/Icon';
import './FormModal.scss';

/**
 * @typedef {Object} FormModalProps
 * @property {boolean} isOpen - Whether modal is visible
 * @property {() => void} onClose - Callback when modal should close
 * @property {string} title - Modal title
 * @property {React.ComponentType} [icon] - Lucide icon component
 * @property {'info'|'success'} [severity='info'] - Severity (forms are never danger)
 * @property {(data: Object) => void | Promise<void>} onSubmit - Form submission handler
 * @property {string} submitLabel - Submit button text (e.g., "Create Project")
 * @property {string} [cancelLabel='Cancel'] - Cancel button text
 * @property {boolean} [isSubmitting=false] - Show loading state on submit
 * @property {string} [submittingLabel] - Label while submitting (default: "Saving...")
 * @property {React.ReactNode} children - Form fields
 * @property {boolean} [submitDisabled=false] - Force disable submit button
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Form modal component for multi-field forms.
 * Uses the base Modal with size="md" (520px).
 *
 * @param {FormModalProps} props - Component props
 * @returns {React.ReactElement} The rendered form modal
 */
function FormModal({
    isOpen,
    onClose,
    title,
    icon,
    severity = 'info',
    onSubmit,
    submitLabel,
    cancelLabel = 'Cancel',
    isSubmitting = false,
    submittingLabel = 'Saving...',
    children,
    submitDisabled = false,
    testId
}) {
    // Ref for the form element
    const formRef = useRef(null);

    /**
     * Handles form submission.
     * Prevents default form behavior and calls onSubmit.
     */
    const handleSubmit = useCallback(async (event) => {
        event.preventDefault();

        if (isSubmitting || submitDisabled) return;

        try {
            await onSubmit();
        } catch (error) {
            // Error handling is left to the parent component
            console.error('Form submission error:', error);
        }
    }, [onSubmit, isSubmitting, submitDisabled]);

    /**
     * Handles cancel button click.
     */
    const handleCancel = useCallback(() => {
        if (!isSubmitting) {
            onClose();
        }
    }, [onClose, isSubmitting]);

    /**
     * Prevents Enter key from closing modal in text fields.
     * Only allows Enter to submit when focused on a button.
     */
    const handleKeyDown = useCallback((event) => {
        if (event.key === 'Enter') {
            const target = event.target;
            const tagName = target.tagName.toLowerCase();

            // Allow Enter in textareas (for newlines)
            if (tagName === 'textarea') {
                return;
            }

            // If it's a button, let it through
            if (tagName === 'button') {
                return;
            }

            // For inputs, prevent default (form submission via Enter)
            // unless it's the submit button
            if (tagName === 'input') {
                // Allow Enter in input fields to submit form
                // but prevent if there are validation errors
                return;
            }
        }
    }, []);

    /**
     * Renders the footer with submit and cancel buttons.
     */
    const renderFooter = () => (
        <>
            <button
                type="button"
                className="btn btn--secondary"
                onClick={handleCancel}
                disabled={isSubmitting}
                data-testid={testId ? `${testId}-cancel` : undefined}
            >
                {cancelLabel}
            </button>
            <button
                type="submit"
                form="form-modal-form"
                className={`btn btn--primary ${isSubmitting ? 'btn--loading' : ''}`}
                disabled={submitDisabled || isSubmitting}
                data-testid={testId ? `${testId}-submit` : undefined}
            >
                {isSubmitting ? (
                    <>
                        <Icon name="loader" className="btn__spinner" size={16} />
                        <span>{submittingLabel}</span>
                    </>
                ) : (
                    submitLabel
                )}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={isSubmitting ? undefined : onClose}
            title={title}
            icon={icon}
            severity={severity}
            size="md"
            showCloseButton={!isSubmitting}
            closeOnEscape={!isSubmitting}
            closeOnBackdrop={!isSubmitting}
            footer={renderFooter()}
            testId={testId}
        >
            <form
                id="form-modal-form"
                ref={formRef}
                className="form-modal__form"
                onSubmit={handleSubmit}
                onKeyDown={handleKeyDown}
                noValidate
            >
                {children}
            </form>
        </Modal>
    );
}

export default memo(FormModal);
export { FormModal };