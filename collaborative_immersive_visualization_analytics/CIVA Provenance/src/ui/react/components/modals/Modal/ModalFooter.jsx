/**
 * @file ModalFooter.jsx
 * @description Footer component for the Modal.
 * Provides a flex container for action buttons with proper alignment.
 *
 * Features:
 * - Flex container with 12px gap between buttons
 * - Buttons aligned to the right (justify-content: flex-end)
 * - Consistent padding (16px 20px)
 * - Optional className for additional styling
 *
 * @example
 * <ModalFooter>
 *   <button className="btn btn--secondary" onClick={close}>Cancel</button>
 *   <button className="btn btn--danger" onClick={handleDelete}>Delete</button>
 * </ModalFooter>
 */

import React, { memo } from 'react';

/**
 * @typedef {Object} ModalFooterProps
 * @property {React.ReactNode} children - Footer content (typically buttons)
 * @property {string} [className] - Additional CSS class names
 */

/**
 * Modal footer component for action buttons.
 * Provides proper layout and alignment for modal actions.
 *
 * @param {ModalFooterProps} props - Component props
 * @returns {React.ReactElement} The rendered footer component
 */
function ModalFooter({
    children,
    className = ''
}) {
    const classNames = ['modal__footer', className].filter(Boolean).join(' ');

    return (
        <div className={classNames}>
            {children}
        </div>
    );
}

// Memoize the component to prevent unnecessary re-renders when children are stable
export default memo(ModalFooter);