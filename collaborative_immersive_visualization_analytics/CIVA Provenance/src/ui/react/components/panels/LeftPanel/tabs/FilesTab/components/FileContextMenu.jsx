/**
 * @file FileContextMenu.jsx
 * @description Context menu for file actions.
 * Supports submenus for processing operations.
 *
 * @example
 * <FileContextMenu x={100} y={200} file={file} onClose={handleClose} onAction={handleAction} />
 */

import React, { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@UI/react/components/atoms/Icon';
import { ui as log } from '@Utils/logger.js';
import { config } from '@Core/config/clientConfig.js';
import { getHandlerForFileType } from '@Core/instances/types/instanceTypesInit.js';

// Default/fallback processing operations when server doesn't provide any
const DEFAULT_OPERATIONS = {
    volumetric: [
        { id: 'threshold', name: 'Threshold Filter', icon: 'sliders', description: 'Apply intensity threshold' },
        { id: 'gaussian', name: 'Gaussian Smooth', icon: 'blur', description: 'Apply Gaussian smoothing' },
        { id: 'extract_surface', name: 'Extract Surface', icon: 'box', description: 'Generate surface mesh' },
        { id: 'resample', name: 'Resample', icon: 'grid', description: 'Change resolution' },
    ],
    mesh: [
        { id: 'decimate', name: 'Decimate', icon: 'minimize', description: 'Reduce polygon count' },
        { id: 'smooth', name: 'Smooth Surface', icon: 'blur', description: 'Smooth mesh surface' },
        { id: 'normals', name: 'Compute Normals', icon: 'arrowUp', description: 'Recalculate normals' },
    ],
    default: [
        { id: 'convert', name: 'Convert Format', icon: 'refresh', description: 'Convert to different format' },
        { id: 'compress', name: 'Compress', icon: 'archive', description: 'Compress file' },
    ],
};

// Get default operations based on file type
function getDefaultOperations(fileType) {
    const volumetricTypes = ['nifti', 'dicom', 'nrrd', 'vti'];
    const meshTypes = ['vtp', 'stl', 'obj', 'ply', 'gltf'];

    if (volumetricTypes.includes(fileType?.toLowerCase())) {
        return DEFAULT_OPERATIONS.volumetric;
    }
    if (meshTypes.includes(fileType?.toLowerCase())) {
        return DEFAULT_OPERATIONS.mesh;
    }
    return DEFAULT_OPERATIONS.default;
}

/**
 * @typedef {Object} FileContextMenuProps
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {Object} file - File object
 * @property {Function} onClose - Close handler
 * @property {Function} onAction - Action handler
 * @property {boolean} [isInWorkspace] - Whether file is in current workspace
 */

/**
 * Context menu component with submenu support.
 *
 * @param {FileContextMenuProps} props - Component props
 * @returns {React.ReactElement} The rendered context menu
 */
export const FileContextMenu = memo(function FileContextMenu({ x, y, onClose, onAction, file, isInWorkspace = false }) {
    const [activeSubmenu, setActiveSubmenu] = useState(null);
    const [operations, setOperations] = useState([]);
    const [loadingOps, setLoadingOps] = useState(false);

    // Fetch available operations when Process submenu is hovered
    useEffect(() => {
        if (activeSubmenu !== 'process' || !file) return;

        const fetchOperations = async () => {
            setLoadingOps(true);
            try {
                const handler = getHandlerForFileType(file.fileType);
                if (!handler) {
                    // Use default operations as fallback
                    setOperations(getDefaultOperations(file.fileType));
                    return;
                }

                const handlerType = handler.id || 'vtk';
                const url = new URL(`${config.apiBaseUrl}/compute/operations`);
                url.searchParams.set('handlerType', handlerType);
                url.searchParams.set('fileType', file.fileType);

                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    const serverOps = data.operations || [];
                    // Use server operations if available, otherwise use defaults
                    setOperations(serverOps.length > 0 ? serverOps : getDefaultOperations(file.fileType));
                } else {
                    // Use default operations as fallback
                    setOperations(getDefaultOperations(file.fileType));
                }
            } catch (err) {
                log.error('Failed to fetch operations:', err);
                // Use default operations as fallback
                setOperations(getDefaultOperations(file.fileType));
            } finally {
                setLoadingOps(false);
            }
        };

        fetchOperations();
    }, [activeSubmenu, file]);

    // Build menu items based on file state
    const isLoaded = file?.loaded;
    const isLoading = file?.loadState === 'loading';
    const isProcessing = file?.loadState === 'processing';

    // Determine the load/unload action based on state
    const getLoadAction = () => {
        if (isLoading) {
            return { id: 'cancelLoad', icon: 'x', label: 'Cancel Loading' };
        }
        if (isProcessing) {
            return { id: 'cancelProcess', icon: 'x', label: 'Cancel Processing' };
        }
        if (isLoaded) {
            return { id: 'unload', icon: 'x', label: 'Unload from Memory' };
        }
        return { id: 'open', icon: 'eye', label: 'Load in Instance' };
    };

    const menuItems = [
        // Show Load, Cancel, or Unload based on current state
        getLoadAction(),
        { id: 'info', icon: 'info', label: 'File Details...' },
        { divider: true },
        // Workspace actions
        isInWorkspace
            ? { id: 'removeFromWorkspace', icon: 'folderMinus', label: 'Remove from Workspace' }
            : { id: 'addToWorkspace', icon: 'folderPlus', label: 'Add to Workspace' },
        { divider: true },
        { id: 'process', icon: 'zap', label: 'Process', hasSubmenu: true },
        { divider: true },
        { id: 'rename', icon: 'edit', label: 'Rename...' },
        { id: 'star', icon: file?.starred ? 'star' : 'starOutline', label: file?.starred ? 'Unstar' : 'Star' },
        { divider: true },
        { id: 'delete', icon: 'trash', label: 'Delete...', danger: true },
    ];

    const handleMouseEnter = (itemId) => {
        if (itemId === 'process') {
            setActiveSubmenu('process');
        } else {
            setActiveSubmenu(null);
        }
    };

    return createPortal(
        <>
            <div className="context-menu-backdrop" onClick={onClose} />
            <div
                className="context-menu"
                style={{ top: y, left: x }}
                onClick={(e) => e.stopPropagation()}
            >
                {menuItems.map((item, index) =>
                    item.divider ? (
                        <div key={index} className="context-menu__divider" />
                    ) : (
                        <div
                            key={item.id}
                            className="context-menu__item-wrapper"
                            onMouseEnter={() => handleMouseEnter(item.id)}
                        >
                            <button
                                className={`context-menu__item ${item.hasSubmenu ? 'has-submenu' : ''} ${item.danger ? 'context-menu__item--danger' : ''}`}
                                onClick={() => {
                                    if (!item.hasSubmenu) {
                                        onAction(item.id, file);
                                        onClose();
                                    }
                                }}
                            >
                                <Icon name={item.icon} size={12} />
                                <span>{item.label}</span>
                                {item.hasSubmenu && (
                                    <Icon name="chevronRight" size={10} className="submenu-arrow" />
                                )}
                            </button>

                            {/* Process submenu */}
                            {item.id === 'process' && activeSubmenu === 'process' && (
                                <div className="context-menu__submenu">
                                    {loadingOps ? (
                                        <div className="context-menu__item context-menu__item--loading">
                                            <Icon name="loader" size={12} className="spin" />
                                            <span>Loading...</span>
                                        </div>
                                    ) : operations.length === 0 ? (
                                        <div className="context-menu__item context-menu__item--disabled">
                                            <span>No operations available</span>
                                        </div>
                                    ) : (
                                        operations.map((op) => (
                                            <button
                                                key={op.id}
                                                className="context-menu__item"
                                                onClick={() => {
                                                    onAction('process', file, op);
                                                    onClose();
                                                }}
                                            >
                                                <span>{op.name}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )
                )}
            </div>
        </>,
        document.body
    );
});

export default FileContextMenu;