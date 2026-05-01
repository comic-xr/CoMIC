/**
 * @file DatasetSettingsModal.jsx
 * @description Modal for configuring dataset-level settings.
 * Uses the base Modal component for consistent styling and behavior.
 *
 * Features:
 * - Dataset info display (type, view count)
 * - List of views with active status indicators
 * - Quick actions: Create View, Unload Dataset
 * - Placeholder section for future settings
 *
 * @example
 * <DatasetSettingsModal
 *   isOpen={showSettings}
 *   dataset={selectedDataset}
 *   views={datasetViews}
 *   onClose={() => setShowSettings(false)}
 *   onCreateView={(datasetId) => createView(datasetId)}
 *   onUnloadDataset={(datasetId) => unloadDataset(datasetId)}
 * />
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { getIconComponent } from '@UI/react/components/atoms/Icon';
import { Modal } from '@UI/react/components/modals/Modal';
import './DatasetSettingsModal.scss';

/**
 * @typedef {Object} Dataset
 * @property {string} id - Dataset ID
 * @property {string} [filename] - Dataset filename
 * @property {string} [name] - Dataset name
 * @property {string} [fileType] - File type (e.g., 'nifti', 'dicom')
 */

/**
 * @typedef {Object} View
 * @property {string} id - View ID
 * @property {string} [name] - View name
 * @property {boolean} [isActive] - Whether view is currently active
 */

/**
 * @typedef {Object} DatasetSettingsModalProps
 * @property {boolean} isOpen - Whether modal is visible
 * @property {Dataset} dataset - Dataset to configure
 * @property {View[]} [views=[]] - Views for this dataset
 * @property {() => void} onClose - Close handler
 * @property {(datasetId: string) => void} [onCreateView] - Create view handler
 * @property {(datasetId: string) => void} [onUnloadDataset] - Unload dataset handler
 */

/**
 * Modal for configuring dataset-level settings.
 *
 * @param {DatasetSettingsModalProps} props - Component props
 * @returns {React.ReactElement|null} The rendered modal
 */
export function DatasetSettingsModal({
    isOpen,
    dataset,
    views = [],
    onClose,
    onCreateView,
    onUnloadDataset,
}) {
    if (!dataset) return null;

    const activeViews = views.filter(v => v.isActive);

    /**
     * Handle create view action.
     */
    const handleCreateView = () => {
        onCreateView?.(dataset.id);
        onClose();
    };

    /**
     * Handle unload dataset action.
     */
    const handleUnload = () => {
        onUnloadDataset?.(dataset.id);
        onClose();
    };

    /**
     * Render footer with action buttons.
     */
    const renderFooter = () => (
        <>
            <LabeledButton
                icon="add"
                label="Create View"
                onClick={handleCreateView}
                variant="primary"
            />
            <LabeledButton
                icon="delete"
                label="Unload"
                onClick={handleUnload}
                variant="primary"
                color="red"
            />
            <LabeledButton
                label="Close"
                onClick={onClose}
                variant="ghost"
            />
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={dataset.filename || dataset.name || 'Dataset Settings'}
            icon={getIconComponent('database')}
            size="sm"
            footer={renderFooter()}
        >
            <div className="dataset-settings-modal">
                {/* Dataset Info Section */}
                <div className="dataset-settings-modal__section">
                    <h4>
                        <Icon name="file" size={14} />
                        Dataset Info
                    </h4>
                    <div className="dataset-settings-modal__info-grid">
                        <div className="dataset-settings-modal__info-item">
                            <span className="label">Type</span>
                            <span className="value">{dataset.fileType || 'Unknown'}</span>
                        </div>
                        <div className="dataset-settings-modal__info-item">
                            <span className="label">Views</span>
                            <span className="value">
                                {activeViews.length} active / {views.length} total
                            </span>
                        </div>
                    </div>
                </div>

                {/* Views Section */}
                <div className="dataset-settings-modal__section">
                    <h4>
                        <Icon name="eye" size={14} />
                        Views
                    </h4>
                    {views.length === 0 ? (
                        <p className="dataset-settings-modal__empty">
                            No views created yet
                        </p>
                    ) : (
                        <div className="dataset-settings-modal__view-list">
                            {views.slice(0, 5).map(view => (
                                <div key={view.id} className="dataset-settings-modal__view-item">
                                    <span className={`status ${view.isActive ? 'active' : ''}`} />
                                    <span className="name">{view.name || 'Untitled View'}</span>
                                </div>
                            ))}
                            {views.length > 5 && (
                                <p className="dataset-settings-modal__more">
                                    +{views.length - 5} more view{views.length - 5 !== 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Placeholder for future settings */}
                <div className="dataset-settings-modal__section">
                    <h4>
                        <Icon name="settings" size={14} />
                        More Settings
                    </h4>
                    <div className="dataset-settings-modal__placeholder">
                        Additional dataset settings will be available here
                    </div>
                </div>
            </div>
        </Modal>
    );
}

export default DatasetSettingsModal;