/**
 * @file ClearChatDialog.jsx
 * @description Confirmation dialog for clearing chat history.
 * Admin only action. Notes that messages are retained in audit log.
 *
 * @example
 * <ClearChatDialog
 *   isOpen={showClear}
 *   onClose={() => setShowClear(false)}
 *   roomName="Team Discussion"
 *   onConfirm={() => clearChatHistory(roomId)}
 * />
 */

import React from 'react';
import { ConfirmationDialog } from '../ConfirmationDialog';

/**
 * @typedef {Object} ClearChatDialogProps
 * @property {boolean} isOpen - Whether dialog is visible
 * @property {() => void} onClose - Close handler
 * @property {string} roomName - Name of the room whose chat will be cleared
 * @property {() => void} onConfirm - Confirm clear handler
 */

/**
 * Confirmation dialog for clearing chat history.
 * Warns that messages will be cleared for all participants.
 *
 * @param {ClearChatDialogProps} props - Component props
 * @returns {React.ReactElement} The rendered dialog
 */
export function ClearChatDialog({
    isOpen,
    onClose,
    roomName,
    onConfirm,
}) {
    return (
        <ConfirmationDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Clear Chat History?"
            description={`All messages in "${roomName}" will be cleared for all participants. Messages are retained in the audit log for compliance.`}
            icon="messageSquare"
            severity="danger"
            confirmLabel="Clear Chat"
            onConfirm={onConfirm}
        />
    );
}

export default ClearChatDialog;