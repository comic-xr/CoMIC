/**
 * @file Modal.jsx
 * @description Base Modal component for CIA Web.
 * This is the foundation component for all 21 modals in the application.
 * Now uses PriorityPanel internally for VR compatibility.
 *
 * Features:
 * - Full accessibility support (role="dialog", aria-modal, aria-labelledby)
 * - Focus trapping with Tab/Shift+Tab cycling
 * - Return focus to trigger element on close
 * - Auto-focus first interactive element on open
 * - Escape key closes modal (configurable)
 * - Click backdrop to close (configurable)
 * - CSS animations for enter/exit transitions
 * - Portal rendering at document.body
 * - Body scroll lock when modal is open
 * - Three size variants: sm (400px), md (520px), lg (640px)
 * - Four severity levels: info, warning, danger, success
 * - VR compatibility: In VR mode, follows user gaze
 *
 * @example
 * import { Modal, useModal } from '@UI/react/components/modals/Modal';
 *
 * function DeleteConfirmation({ itemName, onDelete }) {
 *   const { isOpen, open, close } = useModal();
 *
 *   const handleConfirm = () => {
 *     onDelete();
 *     close();
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={open}>Delete</button>
 *       <Modal
 *         isOpen={isOpen}
 *         onClose={close}
 *         title="Delete Item?"
 *         icon="delete"
 *         severity="danger"
 *         size="sm"
 *         footer={
 *           <>
 *             <button className="btn btn--secondary" onClick={close}>Cancel</button>
 *             <button className="btn btn--danger" onClick={handleConfirm}>Delete</button>
 *           </>
 *         }
 *       >
 *         <p>Are you sure you want to delete "{itemName}"? This action cannot be undone.</p>
 *       </Modal>
 *     </>
 *   );
 * }
 */

import React, { useId } from 'react';
import { PriorityPanel } from '@UI/react/components/panels/FloatingPanel';
import './Modal.scss';

/**
 * @typedef {Object} ModalProps
 * @property {boolean} isOpen - Whether the modal is visible
 * @property {() => void} onClose - Callback when modal should close
 * @property {string} title - Modal title text
 * @property {React.ComponentType} [icon] - Lucide icon component
 * @property {'info'|'warning'|'danger'|'success'} [severity='info'] - Severity level
 * @property {'sm'|'md'|'lg'} [size='md'] - Modal width (400px|520px|640px)
 * @property {boolean} [showCloseButton=true] - Show X button in header
 * @property {boolean} [closeOnEscape=true] - Close when Escape pressed
 * @property {boolean} [closeOnBackdrop=true] - Close when backdrop clicked
 * @property {React.ReactNode} children - Modal content
 * @property {React.ReactNode} [footer] - Footer content (buttons)
 * @property {string} [className] - Additional CSS class
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Base Modal component for CIA Web.
 * Serves as the foundation for all modal dialogs in the application.
 * Uses PriorityPanel internally for VR compatibility.
 *
 * @param {ModalProps} props - Component props
 * @returns {JSX.Element|null} PriorityPanel component, or null if not open
 */
function Modal({
    isOpen,
    onClose,
    title,
    icon,
    severity = 'info',
    size = 'md',
    showCloseButton = true,
    closeOnEscape = true,
    closeOnBackdrop = true,
    children,
    footer,
    className = '',
    testId
}) {
    // Generate unique ID for accessibility
    const uniqueId = useId();
    const modalId = `modal-${uniqueId}`;

    // Build combined class names for backwards compatibility
    const modalClasses = [
        'modal',
        `modal--${size}`,
        `modal--${severity}`,
        className
    ].filter(Boolean).join(' ');

    return (
        <PriorityPanel
            id={modalId}
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            icon={icon}
            severity={severity}
            size={size}
            showCloseButton={showCloseButton}
            closeOnEscape={closeOnEscape}
            closeOnBackdrop={closeOnBackdrop}
            className={modalClasses}
            testId={testId}
            footer={footer}
        >
            {children}
        </PriorityPanel>
    );
}

export default Modal;