/**
 * @file ModalContent.jsx
 * @description Content wrapper component for the Modal.
 * Provides proper padding and scrollable area for modal content.
 *
 * Features:
 * - Correct padding (20px) for content area
 * - Overflow-y: auto for scrollable content when content exceeds max height
 * - Custom scrollbar styling matching the app theme
 * - Optional description ID for accessibility (aria-describedby)
 *
 * @example
 * <ModalContent descriptionId="modal-description-1">
 *   <p>Are you sure you want to delete this item?</p>
 *   <p>This action cannot be undone.</p>
 * </ModalContent>
 */

import React, { memo } from 'react';

/**
 * @typedef {Object} ModalContentProps
 * @property {React.ReactNode} children - The content to render inside the modal body
 * @property {string} [descriptionId] - ID for the description element (for aria-describedby)
 * @property {string} [className] - Additional CSS class names
 */

/**
 * Modal content wrapper component.
 * Provides proper styling and scrollable behavior for modal body content.
 *
 * @param {ModalContentProps} props - Component props
 * @returns {React.ReactElement} The rendered content component
 */
function ModalContent({
    children,
    descriptionId,
    className = ''
}) {
    const classNames = ['modal__content', className].filter(Boolean).join(' ');

    return (
        <div
            className={classNames}
            id={descriptionId}
        >
            {children}
        </div>
    );
}

// Memoize the component to prevent unnecessary re-renders when children are stable
export default memo(ModalContent);