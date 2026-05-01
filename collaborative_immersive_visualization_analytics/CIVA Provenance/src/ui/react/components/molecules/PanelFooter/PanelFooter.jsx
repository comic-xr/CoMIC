/**
 * @file PanelFooter.jsx
 * @description Footer component for panel with Help, Upload, and Refresh actions.
 * Used at the bottom of the Files Tab.
 *
 * @example
 * <PanelFooter
 *   onHelp={handleHelp}
 *   onUpload={handleUpload}
 *   onRefresh={handleRefresh}
 * />
 */

import React, { memo, useRef } from 'react';
import { Icon, IconButton, Tooltip } from '@UI/react/components/atoms';
import { useAdaptive } from '@UI/react/context';
import './PanelFooter.scss';

/**
 * @typedef {Object} PanelFooterProps
 * @property {() => void} [onHelp] - Help button click handler
 * @property {() => void} [onNewFolder] - New folder button click handler
 * @property {(file: File) => void} [onUpload] - Upload button click handler
 * @property {() => void} [onRefresh] - Refresh button click handler
 * @property {boolean} [isUploading=false] - Whether upload is in progress
 * @property {boolean} [isRefreshing=false] - Whether refresh is in progress
 * @property {string} [uploadLabel='Upload Files'] - Custom upload button label
 * @property {string} [className] - Additional CSS classes
 */

/**
 * PanelFooter - Panel footer with action buttons
 *
 * @param {PanelFooterProps} props - Component props
 * @returns {React.ReactElement} The rendered footer
 */
export const PanelFooter = memo(function PanelFooter({
    onHelp,
    onNewFolder,
    onUpload,
    onRefresh,
    isUploading = false,
    isRefreshing = false,
    uploadLabel = 'Upload Files',
    className = '',
}) {
    const { isVR, tokens } = useAdaptive();
    const fileInputRef = useRef(null);

    const classList = [
        'panel-footer',
        isVR && 'panel-footer--vr',
        className,
    ].filter(Boolean).join(' ');

    const handleUploadClick = () => {
        // Trigger the hidden file input
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileSelected = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0 && onUpload) {
            // Call onUpload for each selected file
            files.forEach(file => {
                onUpload(file);
            });
        }
        // Reset the input so the same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={classList}>
            {/* Help button */}
            {onHelp && (
                <Tooltip content="Help">
                    <button
                        type="button"
                        className="panel-footer__action panel-footer__action--help"
                        onClick={onHelp}
                        aria-label="Help"
                    >
                        <Icon name="helpCircle" size={isVR ? 20 : 16} />
                    </button>
                </Tooltip>
            )}

            {/* New Folder button */}
            {onNewFolder && (
                <Tooltip content="New Folder">
                    <button
                        type="button"
                        className="panel-footer__action panel-footer__action--folder"
                        onClick={onNewFolder}
                        aria-label="New Folder"
                    >
                        <Icon name="folderPlus" size={isVR ? 20 : 16} />
                    </button>
                </Tooltip>
            )}

            {/* Upload button */}
            {onUpload && (
                <>
                    <button
                        type="button"
                        className="panel-footer__upload"
                        onClick={handleUploadClick}
                        disabled={isUploading}
                        aria-label={uploadLabel}
                    >
                        <Icon
                            name={isUploading ? 'loader' : 'upload'}
                            size={isVR ? 18 : 14}
                            className={isUploading ? 'spin' : ''}
                        />
                        <span className="panel-footer__upload-label">{uploadLabel}</span>
                    </button>
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFileSelected}
                        accept=".vtp,.vtk,.obj,.ply,.stl,.gltf,.glb,.fbx,.usdz"
                    />
                </>
            )}

            {/* Refresh button */}
            {onRefresh && (
                <Tooltip content="Refresh">
                    <button
                        type="button"
                        className="panel-footer__action panel-footer__action--refresh"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        aria-label="Refresh"
                    >
                        <Icon
                            name="refresh"
                            size={isVR ? 20 : 16}
                            className={isRefreshing ? 'spin' : ''}
                        />
                    </button>
                </Tooltip>
            )}
        </div>
    );
});

export default PanelFooter;
