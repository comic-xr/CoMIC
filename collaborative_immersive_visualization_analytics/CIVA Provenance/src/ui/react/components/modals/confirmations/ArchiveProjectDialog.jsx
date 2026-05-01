/**
 * @file ArchiveProjectDialog.jsx
 * @description Confirmation dialog for archiving a project.
 * Owner only action. Shows impact list of what will be affected.
 *
 * @example
 * <ArchiveProjectDialog
 *   isOpen={showArchive}
 *   onClose={() => setShowArchive(false)}
 *   project={{
 *     name: 'Brain Study',
 *     memberCount: 5,
 *     datasetCount: 12,
 *     recordingCount: 3
 *   }}
 *   onConfirm={() => archiveProject(project.id)}
 * />
 */

import React from 'react';
import { ConfirmationDialog } from '../ConfirmationDialog';

/**
 * @typedef {Object} Project
 * @property {string} name - Project name
 * @property {number} [memberCount=0] - Number of project members
 * @property {number} [datasetCount=0] - Number of datasets
 * @property {number} [recordingCount=0] - Number of recordings
 */

/**
 * @typedef {Object} ArchiveProjectDialogProps
 * @property {boolean} isOpen - Whether dialog is visible
 * @property {() => void} onClose - Close handler
 * @property {Project} project - Project to archive
 * @property {() => void} onConfirm - Confirm archive handler
 */

/**
 * Confirmation dialog for archiving a project.
 * Shows the impact of archiving including affected members, datasets, and recordings.
 *
 * @param {ArchiveProjectDialogProps} props - Component props
 * @returns {React.ReactElement} The rendered dialog
 */
export function ArchiveProjectDialog({
    isOpen,
    onClose,
    project,
    onConfirm,
}) {
    const impactItems = [
        `${project?.memberCount || 0} members will lose access`,
        `${project?.datasetCount || 0} datasets will be archived`,
        `${project?.recordingCount || 0} recordings will be preserved`,
    ];

    return (
        <ConfirmationDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Archive Project?"
            description={`"${project?.name}" will be archived. Members will lose access but all data will be preserved. You can restore this project at any time.`}
            icon="archive"
            severity="warning"
            confirmLabel="Archive Project"
            onConfirm={onConfirm}
            itemList={impactItems}
        />
    );
}

export default ArchiveProjectDialog;