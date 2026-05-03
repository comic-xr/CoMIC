/**
 * @file DeleteProjectDialog.jsx
 * @description Maximum danger confirmation dialog for permanently deleting a project.
 * Requires user to type the exact project name to confirm deletion.
 * Enter key is disabled - user must explicitly click the delete button.
 *
 * Safety features:
 * - Type-to-confirm with exact project name match (case-sensitive)
 * - Enter key disabled to prevent accidental confirmation
 * - Full impact list showing what will be deleted
 * - Danger severity styling
 *
 * @example
 * <DeleteProjectDialog
 *   isOpen={showDelete}
 *   onClose={() => setShowDelete(false)}
 *   project={{
 *     name: 'Brain Study',
 *     memberCount: 5,
 *     datasetCount: 12,
 *     recordingCount: 3
 *   }}
 *   onConfirm={async () => {
 *     await deleteProject(project.id);
 *     navigateToProjectList();
 *   }}
 * />
 */

import React from 'react';
import { ConfirmationDialog } from '../ConfirmationDialog';

/**
 * @typedef {Object} Project
 * @property {string} name - Project name (used for confirmation input)
 * @property {number} [memberCount=0] - Number of project members
 * @property {number} [datasetCount=0] - Number of datasets
 * @property {number} [recordingCount=0] - Number of recordings
 */

/**
 * @typedef {Object} DeleteProjectDialogProps
 * @property {boolean} isOpen - Whether dialog is visible
 * @property {() => void} onClose - Close handler
 * @property {Project} project - Project to delete
 * @property {() => void} onConfirm - Confirm deletion handler
 */

/**
 * Maximum danger confirmation dialog for permanently deleting a project.
 * Requires typing the exact project name (case-sensitive) to enable deletion.
 * Enter key is disabled for safety - user must click the delete button.
 *
 * @param {DeleteProjectDialogProps} props - Component props
 * @returns {React.ReactElement} The rendered dialog
 */
export function DeleteProjectDialog({
    isOpen,
    onClose,
    project,
    onConfirm,
}) {
    /**
     * Build impact list showing what will be deleted.
     */
    const impactItems = [
        `${project?.memberCount || 0} members will lose access`,
        `${project?.datasetCount || 0} datasets will be permanently deleted`,
        `${project?.recordingCount || 0} recordings will be permanently deleted`,
        'All chat history will be deleted',
        'All annotations and notes will be deleted',
    ];

    return (
        <ConfirmationDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Delete Project Permanently?"
            description={
                <>
                    This action is <strong>permanent and cannot be undone</strong>.
                    All project data will be permanently deleted.
                </>
            }
            icon="delete"
            severity="danger"
            confirmLabel="Delete Project"
            onConfirm={onConfirm}
            itemList={impactItems}
            showInput
            inputPlaceholder={`Type "${project?.name}" to confirm`}
            inputMatchValue={project?.name}
            enterKeyEnabled={false}
            testId="delete-project-dialog"
        />
    );
}

export default DeleteProjectDialog;