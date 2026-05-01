/**
 * @file DeleteViewDialog.jsx
 * @description Confirmation dialog for deleting a view.
 * The view moves to Recently Deleted and can be restored for 30 days.
 *
 * @see Modal_Design_Specification.md - Group 1: Confirmation Dialogs
 *
 * @example
 * <DeleteViewDialog
 *   isOpen={showDelete}
 *   onClose={() => setShowDelete(false)}
 *   view={{ id: 'view-1', name: 'Axial Slice' }}
 *   onConfirm={() => deleteView(view.id)}
 * />
 */

import React from 'react';
import ConfirmationDialog from '../ConfirmationDialog';

/**
 * @typedef {Object} View
 * @property {string} id - View ID
 * @property {string} name - View name
 */

/**
 * @typedef {Object} DeleteViewDialogProps
 * @property {boolean} isOpen - Whether dialog is visible
 * @property {() => void} onClose - Close handler
 * @property {View} view - View to delete
 * @property {() => void} onConfirm - Delete confirmation handler
 */

/**
 * Confirmation dialog for deleting a view.
 * Views are moved to Recently Deleted and can be restored for 30 days.
 *
 * @param {DeleteViewDialogProps} props - Component props
 * @returns {React.ReactElement} The rendered dialog
 */
export function DeleteViewDialog({
    isOpen,
    onClose,
    view,
    onConfirm,
}) {
    const handleConfirm = () => {
        onConfirm?.();
        onClose();
    };

    return (
        <ConfirmationDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Delete View?"
            description={`"${view?.name || 'This view'}" will be moved to Recently Deleted and can be restored for 30 days.`}
            severity="danger"
            confirmLabel="Delete View"
            onConfirm={handleConfirm}
            testId="delete-view-dialog"
        />
    );
}

export default DeleteViewDialog;
