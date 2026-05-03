/**
 * @file DeleteRecordingDialog.jsx
 * @description Confirmation dialog for deleting a recording.
 * Shows recording details (name, duration, size) and compliance note if applicable.
 *
 * @example
 * <DeleteRecordingDialog
 *   isOpen={showDelete}
 *   onClose={() => setShowDelete(false)}
 *   recording={{ id: '1', name: 'Team Meeting', duration: 3600, size: 524288000 }}
 *   hasRetentionPolicy={true}
 *   onConfirm={() => deleteRecording(recording.id)}
 * />
 */

import React from 'react';
import { ConfirmationDialog } from '../ConfirmationDialog';

/**
 * @typedef {Object} Recording
 * @property {string} id - Recording ID
 * @property {string} name - Recording name
 * @property {number} duration - Duration in seconds
 * @property {number} size - Size in bytes
 */

/**
 * @typedef {Object} DeleteRecordingDialogProps
 * @property {boolean} isOpen - Whether dialog is visible
 * @property {() => void} onClose - Close handler
 * @property {Recording} recording - Recording to delete
 * @property {boolean} [hasRetentionPolicy=false] - Whether retention policy applies
 * @property {() => void} onConfirm - Confirm deletion handler
 */

/**
 * Formats duration in seconds to MM:SS format.
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats bytes to human-readable size.
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
function formatSize(bytes) {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Confirmation dialog for deleting a recording.
 *
 * @param {DeleteRecordingDialogProps} props - Component props
 * @returns {React.ReactElement} The rendered dialog
 */
export function DeleteRecordingDialog({
    isOpen,
    onClose,
    recording,
    hasRetentionPolicy = false,
    onConfirm,
}) {
    const description = (
        <>
            <strong>"{recording?.name}"</strong> ({formatDuration(recording?.duration)}, {formatSize(recording?.size)})
            will be permanently deleted. This cannot be undone.
            {hasRetentionPolicy && (
                <p style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Note: Recording metadata will be retained for compliance.
                </p>
            )}
        </>
    );

    return (
        <ConfirmationDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Delete Recording?"
            description={description}
            icon="video"
            severity="danger"
            confirmLabel="Delete Recording"
            onConfirm={onConfirm}
        />
    );
}

export default DeleteRecordingDialog;