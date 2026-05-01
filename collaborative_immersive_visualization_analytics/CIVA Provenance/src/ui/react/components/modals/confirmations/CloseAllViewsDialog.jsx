/**
 * @file CloseAllViewsDialog.jsx
 * @description Confirmation dialog for closing all views on the canvas.
 * Views move to 'Not Placed' and can be reopened. Includes "Don't ask again" option.
 *
 * @see Modal_Design_Specification.md - Group 1: Confirmation Dialogs
 *
 * @example
 * <CloseAllViewsDialog
 *   isOpen={showCloseAll}
 *   onClose={() => setShowCloseAll(false)}
 *   viewCount={12}
 *   onConfirm={(dontAskAgain) => closeAllViews(dontAskAgain)}
 * />
 */

import React from 'react';
import ConfirmationDialog from '../ConfirmationDialog';

/**
 * @typedef {Object} CloseAllViewsDialogProps
 * @property {boolean} isOpen - Whether dialog is visible
 * @property {() => void} onClose - Close handler
 * @property {number} viewCount - Number of views to close
 * @property {(dontAskAgain: boolean) => void} onConfirm - Confirmation handler
 */

/**
 * Confirmation dialog for closing all views on the canvas.
 * Views move to 'Not Placed' and can be reopened.
 *
 * @param {CloseAllViewsDialogProps} props - Component props
 * @returns {React.ReactElement} The rendered dialog
 */
export function CloseAllViewsDialog({
    isOpen,
    onClose,
    viewCount = 0,
    onConfirm,
}) {
    const handleConfirm = () => {
        onConfirm?.();
        onClose();
    };

    const handleCheckboxChange = (checked) => {
        // Store preference - would typically be saved to user settings
        if (checked) {
            localStorage.setItem('cia_dontAskCloseAll', 'true');
        } else {
            localStorage.removeItem('cia_dontAskCloseAll');
        }
    };

    return (
        <ConfirmationDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Close All Views?"
            description={`This will close ${viewCount > 0 ? `all ${viewCount} views` : 'all views'} currently placed on the canvas. Views will move to 'Not Placed' and can be reopened.`}
            severity="warning"
            confirmLabel="Close All"
            onConfirm={handleConfirm}
            showCheckbox={true}
            checkboxLabel="Don't ask me again"
            onCheckboxChange={handleCheckboxChange}
            testId="close-all-views-dialog"
        />
    );
}

export default CloseAllViewsDialog;
