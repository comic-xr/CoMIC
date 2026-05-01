/**
 * @file ConfirmationDialog.jsx
 * @description Confirmation dialog component for CIA Web.
 * Extends the base Modal component to handle all confirmation dialogs (10 total),
 * including dangerous actions with type-to-confirm functionality.
 *
 * VR CLASSIFICATION: PRIORITY PANEL
 * All confirmation dialogs use FloatingPanel with priority={true}
 * See: docs/specs/FloatingPanel_Component_Specification.md
 *
 * VR Behavior:
 * - Forces decision, follows user gaze if they look away
 * - Cannot be dismissed by clicking backdrop
 * - Escape key maps to Cancel action
 * - B button on controller = Cancel
 *
 * Features:
 * - Three severity levels: info, warning, danger
 * - Type-to-confirm input for dangerous operations
 * - "Don't ask again" checkbox option
 * - Item list display for bulk operations
 * - Enter key disabled by default for danger severity
 * - Full accessibility support via base Modal
 *
 * @example
 * // Simple confirmation
 * <ConfirmationDialog
 *   isOpen={isOpen}
 *   onClose={close}
 *   title="Close All Tabs?"
 *   description="This will close all open tabs in your workspace."
 *   severity="warning"
 *   confirmLabel="Close All"
 *   onConfirm={handleCloseAll}
 * />
 *
 * @example
 * // Dangerous action with type-to-confirm
 * <ConfirmationDialog
 *   isOpen={isOpen}
 *   onClose={close}
 *   title="Delete Project?"
 *   description="This will permanently delete the project and all its data."
 *   severity="danger"
 *   confirmLabel="Delete Project"
 *   onConfirm={handleDelete}
 *   showInput={true}
 *   inputPlaceholder="Type DELETE to confirm"
 *   inputMatchValue="DELETE"
 * />
 *
 * @example
 * // Bulk operation with item list
 * <ConfirmationDialog
 *   isOpen={isOpen}
 *   onClose={close}
 *   title="Delete Selected Items?"
 *   description="The following items will be permanently deleted:"
 *   severity="danger"
 *   confirmLabel="Delete Items"
 *   onConfirm={handleDeleteItems}
 *   itemList={['dataset_1.nii', 'dataset_2.nii', 'analysis.vtk']}
 * />
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '../Modal';
import { Icon, getIconComponent } from '@UI/react/components/atoms/Icon';
import './ConfirmationDialog.scss';

/**
 * @typedef {Object} ConfirmationDialogProps
 * @property {boolean} isOpen - Whether dialog is visible
 * @property {() => void} onClose - Callback when dialog should close
 * @property {string} title - Dialog title
 * @property {string} description - Explanation of the action and consequences
 * @property {React.ComponentType} [icon] - Lucide icon (defaults based on severity)
 * @property {'info'|'warning'|'danger'} [severity='info'] - Severity level
 * @property {string} confirmLabel - Text for confirm button (e.g., "Delete", "Close All")
 * @property {string} [cancelLabel='Cancel'] - Text for cancel button
 * @property {() => void} onConfirm - Callback when confirmed
 * @property {() => void} [onCancel] - Callback when cancelled (defaults to onClose)
 * @property {boolean} [confirmDisabled=false] - Disable confirm button
 * @property {boolean} [showInput=false] - Show type-to-confirm input
 * @property {string} [inputPlaceholder] - Placeholder for confirm input
 * @property {string} [inputMatchValue] - Value user must type to enable confirm
 * @property {(value: string) => boolean} [inputValidation] - Custom validation function
 * @property {boolean} [showCheckbox=false] - Show "Don't ask again" checkbox
 * @property {string} [checkboxLabel="Don't ask me again"] - Checkbox label
 * @property {boolean} [checkboxChecked=false] - Initial checkbox state
 * @property {(checked: boolean) => void} [onCheckboxChange] - Checkbox change handler
 * @property {string[]} [itemList] - List of items to show (for bulk operations)
 * @property {boolean} [enterKeyEnabled=true] - Allow Enter to confirm (auto-false for danger)
 * @property {string} [className] - Additional class for modal/content
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Default icon names for each severity level.
 * Used when no custom icon is provided.
 */
const DEFAULT_ICONS = {
    info: 'info',
    warning: 'warning',
    danger: 'delete'
};

/**
 * Maximum number of items to show before truncating with "and X more".
 */
const MAX_VISIBLE_ITEMS = 5;

/**
 * Confirmation dialog component for handling user confirmations.
 * Extends the base Modal with confirmation-specific features.
 *
 * @param {ConfirmationDialogProps} props - Component props
 * @returns {React.ReactElement} The rendered confirmation dialog
 */
function ConfirmationDialog({
    isOpen,
    onClose,
    title,
    description,
    icon,
    severity = 'info',
    confirmLabel,
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    confirmDisabled = false,
    showInput = false,
    inputPlaceholder = '',
    inputMatchValue = '',
    inputValidation,
    showCheckbox = false,
    checkboxLabel = "Don't ask me again",
    checkboxChecked = false,
    onCheckboxChange,
    itemList,
    enterKeyEnabled,
    className = '',
    testId
}) {
    // State for the confirmation input
    const [inputValue, setInputValue] = useState('');

    // State for the checkbox
    const [isCheckboxChecked, setIsCheckboxChecked] = useState(checkboxChecked);

    // Ref for the input element
    const inputRef = useRef(null);

    // Determine if Enter key should trigger confirm
    // Default: disabled for danger severity, enabled for others
    const isEnterEnabled = enterKeyEnabled !== undefined
        ? enterKeyEnabled
        : severity !== 'danger';

    // Determine the icon to use - get the component from the Icon system
    const iconName = icon || DEFAULT_ICONS[severity] || 'info';
    const IconComponent = typeof iconName === 'string' ? getIconComponent(iconName) : iconName;

    /**
     * Validates the confirmation input.
     * @returns {boolean} Whether the input is valid
     */
    const isInputValid = useCallback(() => {
        if (!showInput) return true;

        // Custom validation takes precedence
        if (inputValidation) {
            return inputValidation(inputValue);
        }

        // Default: exact match with inputMatchValue (case-sensitive)
        if (inputMatchValue) {
            return inputValue === inputMatchValue;
        }

        // If no match value specified, just require non-empty
        return inputValue.trim().length > 0;
    }, [showInput, inputValue, inputValidation, inputMatchValue]);

    /**
     * Determines if the confirm button should be disabled.
     * @returns {boolean} Whether confirm button is disabled
     */
    const isConfirmDisabled = useCallback(() => {
        if (confirmDisabled) return true;
        if (showInput && !isInputValid()) return true;
        return false;
    }, [confirmDisabled, showInput, isInputValid]);

    /**
     * Handles the confirm action.
     */
    const handleConfirm = useCallback(() => {
        if (isConfirmDisabled()) return;
        onConfirm();
    }, [isConfirmDisabled, onConfirm]);

    /**
     * Handles the cancel action.
     */
    const handleCancel = useCallback(() => {
        if (onCancel) {
            onCancel();
        } else {
            onClose();
        }
    }, [onCancel, onClose]);

    /**
     * Handles checkbox change.
     */
    const handleCheckboxChange = useCallback((event) => {
        const checked = event.target.checked;
        setIsCheckboxChecked(checked);
        if (onCheckboxChange) {
            onCheckboxChange(checked);
        }
    }, [onCheckboxChange]);

    /**
     * Handles keyboard events.
     */
    const handleKeyDown = useCallback((event) => {
        if (event.key === 'Enter' && isEnterEnabled && !isConfirmDisabled()) {
            event.preventDefault();
            handleConfirm();
        }
    }, [isEnterEnabled, isConfirmDisabled, handleConfirm]);

    // Reset input value when dialog opens/closes
    useEffect(() => {
        if (isOpen) {
            setInputValue('');
            setIsCheckboxChecked(checkboxChecked);
        }
    }, [isOpen, checkboxChecked]);

    // Focus input when dialog opens with showInput
    useEffect(() => {
        if (isOpen && showInput && inputRef.current) {
            // Small delay to ensure Modal's focus trap has initialized
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen, showInput]);

    // Add keydown listener for Enter key
    useEffect(() => {
        if (isOpen && isEnterEnabled) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, isEnterEnabled, handleKeyDown]);

    /**
     * Renders the item list with truncation.
     */
    const renderItemList = () => {
        if (!itemList || itemList.length === 0) return null;

        const visibleItems = itemList.slice(0, MAX_VISIBLE_ITEMS);
        const remainingCount = itemList.length - MAX_VISIBLE_ITEMS;

        return (
            <div className="confirmation-dialog__item-list">
                <ul className="confirmation-dialog__items">
                    {visibleItems.map((item, index) => (
                        <li key={index} className="confirmation-dialog__item">
                            {item}
                        </li>
                    ))}
                </ul>
                {remainingCount > 0 && (
                    <p className="confirmation-dialog__more-items">
                        and {remainingCount} more item{remainingCount !== 1 ? 's' : ''}
                    </p>
                )}
            </div>
        );
    };

    /**
     * Renders the confirmation input field.
     */
    const renderInput = () => {
        if (!showInput) return null;

        return (
            <div className="confirmation-dialog__input-wrapper">
                <input
                    ref={inputRef}
                    type="text"
                    className={`confirmation-dialog__input ${isInputValid() ? 'confirmation-dialog__input--valid' : ''}`}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={inputPlaceholder}
                    aria-label="Confirmation input"
                    data-testid={testId ? `${testId}-input` : undefined}
                />
                {inputMatchValue && (
                    <p className="confirmation-dialog__input-hint">
                        Type <strong>{inputMatchValue}</strong> to confirm
                    </p>
                )}
            </div>
        );
    };

    /**
     * Renders the checkbox option.
     */
    const renderCheckbox = () => {
        if (!showCheckbox) return null;

        return (
            <label className="confirmation-dialog__checkbox-label">
                <input
                    type="checkbox"
                    className="confirmation-dialog__checkbox"
                    checked={isCheckboxChecked}
                    onChange={handleCheckboxChange}
                    data-testid={testId ? `${testId}-checkbox` : undefined}
                />
                <span className="confirmation-dialog__checkbox-text">{checkboxLabel}</span>
            </label>
        );
    };

    /**
     * Renders the footer with action buttons.
     */
    const renderFooter = () => (
        <>
            <button
                type="button"
                className="btn btn--secondary"
                onClick={handleCancel}
                data-testid={testId ? `${testId}-cancel` : undefined}
            >
                {cancelLabel}
            </button>
            <button
                type="button"
                className={`btn btn--${severity === 'danger' ? 'danger' : severity === 'warning' ? 'warning' : 'primary'}`}
                onClick={handleConfirm}
                disabled={isConfirmDisabled()}
                data-testid={testId ? `${testId}-confirm` : undefined}
            >
                {confirmLabel}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            icon={IconComponent}
            severity={severity}
            size="sm"
            closeOnBackdrop={false}
            footer={renderFooter()}
            className={className}
            testId={testId}
        >
            <div className={`confirmation-dialog ${className}`}>
                <p className="confirmation-dialog__description">
                    {description}
                </p>

                {renderItemList()}
                {renderInput()}
                {renderCheckbox()}
            </div>
        </Modal>
    );
}

export default ConfirmationDialog;
