/**
 * @file DangerZone.jsx
 * @description Danger zone section with destructive actions.
 * Owner-only section for archiving, transferring, or deleting the project.
 */

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Button } from '@UI/react/components/atoms/Button';
import '../SettingsTab.scss';

/**
 * Danger action card component
 */
function DangerAction({ icon: iconName, title, description, buttonText, buttonVariant = 'danger', onClick }) {
    return (
        <div className="settings-tab__danger-action">
            <div className="settings-tab__danger-icon">
                <Icon name={iconName} size={16} />
            </div>
            <div className="settings-tab__danger-info">
                <h4 className="settings-tab__danger-title">{title}</h4>
                <p className="settings-tab__danger-desc">{description}</p>
            </div>
            <Button
                variant={buttonVariant}
                size="sm"
                onClick={onClick}
            >
                {buttonText}
            </Button>
        </div>
    );
}

/**
 * Confirmation dialog component
 */
function ConfirmDialog({ title, message, confirmText, onConfirm, onCancel }) {
    const [inputValue, setInputValue] = useState('');
    const expectedValue = 'DELETE';
    const isConfirmEnabled = inputValue === expectedValue;

    return (
        <div className="settings-tab__confirm-overlay">
            <div className="settings-tab__confirm-dialog">
                <div className="settings-tab__confirm-header">
                    <Icon name="alertTriangle" size={20} className="settings-tab__confirm-icon" />
                    <h3>{title}</h3>
                </div>
                <p className="settings-tab__confirm-message">{message}</p>
                <div className="settings-tab__confirm-input">
                    <label>
                        Type <strong>{expectedValue}</strong> to confirm:
                    </label>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={expectedValue}
                    />
                </div>
                <div className="settings-tab__confirm-actions">
                    <Button variant="secondary" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={onConfirm}
                        disabled={!isConfirmEnabled}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/**
 * @typedef {Object} Project
 * @property {string} id - Project ID
 * @property {string} name - Project name
 */

/**
 * @typedef {Object} DangerZoneProps
 * @property {Project} project - Project data
 */

/**
 * Danger Zone section component.
 * Only visible to project owners.
 *
 * @param {DangerZoneProps} props - Component props
 * @returns {React.ReactElement} The rendered section
 */
export function DangerZone({ project }) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleArchive = () => {
        // TODO: Implement archive
        console.log('Archiving project:', project?.id);
    };

    const handleTransfer = () => {
        // TODO: Implement transfer ownership modal
        console.log('Transferring project:', project?.id);
    };

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        // TODO: Implement delete
        console.log('Deleting project:', project?.id);
        setShowDeleteConfirm(false);
    };

    return (
        <div className="settings-tab__section settings-tab__section--danger">
            <div className="settings-tab__danger-warning">
                <Icon name="alertTriangle" size={14} />
                <span>These actions are permanent and cannot be undone.</span>
            </div>

            <div className="settings-tab__danger-actions">
                <DangerAction
                    icon="archive"
                    title="Archive Project"
                    description="Make this project read-only. All data will be preserved but no changes can be made."
                    buttonText="Archive"
                    buttonVariant="warning"
                    onClick={handleArchive}
                />

                <DangerAction
                    icon="userCog"
                    title="Transfer Ownership"
                    description="Transfer this project to another team member. They will become the new owner."
                    buttonText="Transfer"
                    buttonVariant="warning"
                    onClick={handleTransfer}
                />

                <DangerAction
                    icon="delete"
                    title="Delete Project"
                    description="Permanently delete this project and all its data. This action cannot be undone."
                    buttonText="Delete"
                    buttonVariant="danger"
                    onClick={handleDelete}
                />
            </div>

            {showDeleteConfirm && (
                <ConfirmDialog
                    title="Delete Project"
                    message={`Are you sure you want to delete "${project?.name}"? All data including rooms, recordings, and files will be permanently deleted.`}
                    confirmText="Delete Project"
                    onConfirm={confirmDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            )}
        </div>
    );
}

export default DangerZone;