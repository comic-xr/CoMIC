/**
 * @file DeleteNoteDialog.jsx
 * @description Confirmation dialog for deleting a note.
 * Special three-button layout: Cancel | Archive | Delete Permanently.
 * Uses Modal directly instead of ConfirmationDialog due to custom footer.
 *
 * @example
 * <DeleteNoteDialog
 *   isOpen={showDelete}
 *   onClose={() => setShowDelete(false)}
 *   note={{ id: '1', title: 'Meeting Notes' }}
 *   onArchive={() => archiveNote(note.id)}
 *   onDeletePermanently={() => deleteNote(note.id)}
 * />
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { getIconComponent } from '@UI/react/components/atoms/Icon';
import { Modal } from '../Modal';

/**
 * @typedef {Object} Note
 * @property {string} id - Note ID
 * @property {string} title - Note title
 */

/**
 * @typedef {Object} DeleteNoteDialogProps
 * @property {boolean} isOpen - Whether dialog is visible
 * @property {() => void} onClose - Close/cancel handler
 * @property {Note} note - Note to delete
 * @property {() => void} onArchive - Archive handler
 * @property {() => void} onDeletePermanently - Permanent delete handler
 */

/**
 * Confirmation dialog for deleting a note with archive option.
 * Uses three-button layout: Cancel, Archive, and Delete Permanently.
 *
 * @param {DeleteNoteDialogProps} props - Component props
 * @returns {React.ReactElement} The rendered dialog
 */
export function DeleteNoteDialog({
    isOpen,
    onClose,
    note,
    onArchive,
    onDeletePermanently,
}) {
    /**
     * Handle archive action.
     */
    const handleArchive = () => {
        onArchive?.();
        onClose();
    };

    /**
     * Handle permanent delete action.
     */
    const handleDelete = () => {
        onDeletePermanently?.();
        onClose();
    };

    /**
     * Render footer with three action buttons.
     */
    const renderFooter = () => (
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <LabeledButton
                label="Cancel"
                onClick={onClose}
                variant="ghost"
            />
            <div style={{ flex: 1 }} /> {/* Spacer */}
            <LabeledButton
                icon="archive"
                label="Archive"
                onClick={handleArchive}
                variant="secondary"
                color="amber"
            />
            <LabeledButton
                icon="delete"
                label="Delete Permanently"
                onClick={handleDelete}
                variant="primary"
                color="red"
            />
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Delete Note?"
            icon={getIconComponent('stickyNote')}
            severity="warning"
            size="sm"
            footer={renderFooter()}
        >
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                "<strong>{note?.title}</strong>" will be removed. You can archive it to restore later,
                or delete permanently.
            </p>
        </Modal>
    );
}

export default DeleteNoteDialog;