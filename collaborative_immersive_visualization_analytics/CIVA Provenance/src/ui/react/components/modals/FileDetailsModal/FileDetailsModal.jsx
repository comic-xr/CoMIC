/**
 * @file FileDetailsModal.jsx
 * @description Modal dialog showing detailed file information.
 * Uses the base Modal component for consistent styling and behavior.
 *
 * Features:
 * - File icon preview based on file type
 * - File metadata display (type, size, modified date, path)
 * - Quick actions: Open, Download, Delete
 * - Tags display if present
 *
 * @example
 * <FileDetailsModal
 *   isOpen={showDetails}
 *   file={selectedFile}
 *   onClose={() => setShowDetails(false)}
 *   onOpen={(file) => openFile(file)}
 *   onDownload={(file) => downloadFile(file)}
 *   onDelete={(file) => deleteFile(file)}
 * />
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { getIconComponent } from '@UI/react/components/atoms/Icon';
import { Modal } from '@UI/react/components/modals/Modal';
import { getFileTypeDisplayInfo } from '@Core/instances/types/instanceTypesInit.js';
import './FileDetailsModal.scss';

/**
 * @typedef {Object} FileInfo
 * @property {string} [filename] - File name
 * @property {string} [name] - Alternative name field
 * @property {string} [fileType] - File type
 * @property {number} [size] - Size in bytes
 * @property {string} [modifiedAt] - Modified date string
 * @property {string} [uploadedAt] - Upload date string
 * @property {string} [path] - File path
 * @property {string[]} [tags] - File tags
 */

/**
 * @typedef {Object} FileDetailsModalProps
 * @property {boolean} isOpen - Whether modal is visible
 * @property {FileInfo} file - File to display
 * @property {() => void} onClose - Close handler
 * @property {(file: FileInfo) => void} [onOpen] - Open file handler
 * @property {(file: FileInfo) => void} [onDownload] - Download file handler
 * @property {(file: FileInfo) => void} [onDelete] - Delete file handler
 */

/**
 * Formats bytes to human-readable size.
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
function formatFileSize(bytes) {
    if (!bytes) return 'Unknown';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i++;
    }
    return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Formats date string to locale string.
 * @param {string} dateString - Date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
}

/**
 * Modal displaying detailed file information.
 *
 * @param {FileDetailsModalProps} props - Component props
 * @returns {React.ReactElement|null} The rendered modal
 */
export function FileDetailsModal({
    isOpen,
    file,
    onClose,
    onOpen,
    onDownload,
    onDelete
}) {
    if (!file) return null;

    // Get file type display info for icon
    const displayInfo = getFileTypeDisplayInfo(file.fileType);
    let IconComponent = getIconComponent('file');

    if (displayInfo) {
        IconComponent = getIconComponent(displayInfo.icon) || getIconComponent('file');
    }

    /**
     * Handle open action.
     */
    const handleOpen = () => {
        onOpen?.(file);
        onClose();
    };

    /**
     * Handle download action.
     */
    const handleDownload = () => {
        onDownload?.(file);
    };

    /**
     * Handle delete action.
     */
    const handleDelete = () => {
        onDelete?.(file);
        onClose();
    };

    /**
     * Render footer with action buttons.
     */
    const renderFooter = () => (
        <>
            <LabeledButton
                icon="eye"
                label="Open"
                onClick={handleOpen}
                variant="primary"
            />
            <LabeledButton
                icon="download"
                label="Download"
                onClick={handleDownload}
                variant="ghost"
            />
            <LabeledButton
                icon="delete"
                label="Delete"
                onClick={handleDelete}
                variant="primary"
                color="red"
            />
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={file.filename || file.name || 'File Details'}
            icon={IconComponent}
            size="sm"
            footer={renderFooter()}
        >
            <div className="file-details-modal">
                {/* Icon Preview */}
                <div className="file-details-modal__icon-preview">
                    <div
                        className="icon-wrapper"
                        style={displayInfo?.color ? { color: displayInfo.color } : undefined}
                    >
                        <IconComponent />
                    </div>
                </div>

                {/* File Info */}
                <div className="file-details-modal__info">
                    <div className="file-details-modal__row">
                        <Icon name="tag" size={14} />
                        <span className="label">Type</span>
                        <span className="value">{file.fileType || 'Unknown'}</span>
                    </div>

                    <div className="file-details-modal__row">
                        <Icon name="hardDrive" size={14} />
                        <span className="label">Size</span>
                        <span className="value">{formatFileSize(file.size)}</span>
                    </div>

                    <div className="file-details-modal__row">
                        <Icon name="calendar" size={14} />
                        <span className="label">Modified</span>
                        <span className="value">{formatDate(file.modifiedAt || file.uploadedAt)}</span>
                    </div>

                    {file.path && (
                        <div className="file-details-modal__row">
                            <Icon name="folder" size={14} />
                            <span className="label">Path</span>
                            <span className="value">{file.path}</span>
                        </div>
                    )}
                </div>

                {/* Tags if present */}
                {file.tags && file.tags.length > 0 && (
                    <div className="file-details-modal__tags">
                        {file.tags.map((tag, index) => (
                            <span key={index} className="tag">{tag}</span>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default FileDetailsModal;