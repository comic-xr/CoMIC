/**
 * @file UploadDropzone.jsx
 * @description Drag-and-drop upload overlay for files.
 * Shows an overlay when files are dragged over the panel.
 *
 * @example
 * <UploadDropzone onUpload={handleUpload} isDragOver={isDragOver} setIsDragOver={setIsDragOver} />
 */

import React, { useState, useCallback, memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * @typedef {Object} UploadDropzoneProps
 * @property {Function} onUpload - Upload handler
 * @property {boolean} [isDragOver] - External drag over state
 * @property {Function} [setIsDragOver] - External drag over setter
 */

/**
 * Upload dropzone overlay component.
 * Only shows when files are being dragged over.
 *
 * @param {UploadDropzoneProps} props - Component props
 * @returns {React.ReactElement|null} The rendered dropzone overlay or null
 */
export const UploadDropzone = memo(function UploadDropzone({
    onUpload,
    isDragOver: externalIsDragOver,
    setIsDragOver: externalSetIsDragOver,
}) {
    const [internalIsDragOver, setInternalIsDragOver] = useState(false);

    // Use external or internal state
    const isDragOver = externalIsDragOver ?? internalIsDragOver;
    const setIsDragOver = externalSetIsDragOver ?? setInternalIsDragOver;

    const handleDragOver = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
        },
        []
    );

    const handleDragLeave = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
        },
        [setIsDragOver]
    );

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);

            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                files.forEach((file) => onUpload(file));
            }
        },
        [onUpload, setIsDragOver]
    );

    // Only render when dragging
    if (!isDragOver) return null;

    return (
        <div
            className="upload-dropzone-overlay"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="upload-dropzone-overlay__content">
                <Icon name="upload" size={24} />
                <span>Drop files to upload</span>
            </div>
        </div>
    );
});

export default UploadDropzone;
