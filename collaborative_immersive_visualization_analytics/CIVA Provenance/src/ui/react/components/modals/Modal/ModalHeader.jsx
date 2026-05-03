/**
 * @file ModalHeader.jsx
 * @description Header component for the Modal.
 * Renders the icon (with severity-based color), title, and optional close button.
 *
 * Features:
 * - Displays an optional icon with severity-based coloring
 * - Renders the modal title with proper accessibility attributes
 * - Optional close button with X icon and 32px hit area
 * - Subtle hover state on close button
 *
 * @example
 * <ModalHeader
 *   title="Delete Item?"
 *   titleId="modal-title-1"
 *   icon="delete"
 *   severity="danger"
 *   showCloseButton={true}
 *   onClose={handleClose}
 * />
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * @typedef {Object} ModalHeaderProps
 * @property {string} title - The modal title text
 * @property {string} titleId - Unique ID for the title element (for aria-labelledby)
 * @property {string} [icon] - Icon name string (e.g., "delete", "warning", "info")
 * @property {'info'|'warning'|'danger'|'success'} [severity='info'] - Severity level for icon color
 * @property {boolean} [showCloseButton=true] - Whether to show the close button
 * @property {() => void} [onClose] - Callback when close button is clicked
 */

/**
 * Modal header component with icon, title, and close button.
 *
 * @param {ModalHeaderProps} props - Component props
 * @returns {React.ReactElement} The rendered header component
 */
function ModalHeader({
    title,
    titleId,
    icon,           // Now a string like "delete", not a component
    severity = 'info',
    showCloseButton = true,
    onClose
}) {
    return (
        <div className="modal__header">
            <div className="modal__header-content">
                {icon && (
                    <div className={`modal__icon modal__icon--${severity}`}>
                        <Icon name={icon} size={20} aria-hidden={true} />
                    </div>
                )}
                <h2
                    id={titleId}
                    className="modal__title"
                >
                    {title}
                </h2>
            </div>

            {showCloseButton && onClose && (
                <button
                    type="button"
                    className="modal__close-button"
                    onClick={onClose}
                    aria-label="Close modal"
                >
                    <Icon name="close" size={18} />
                </button>
            )}
        </div>
    );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(ModalHeader);