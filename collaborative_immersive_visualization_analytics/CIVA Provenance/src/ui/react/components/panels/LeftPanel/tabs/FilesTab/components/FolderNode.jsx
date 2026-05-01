/**
 * @file FolderNode.jsx
 * @description Expandable folder component for file tree navigation.
 * Shows nested folders and files with expand/collapse functionality.
 *
 * @example
 * <FolderNode
 *   folder={folder}
 *   files={allFiles}
 *   allFolders={folders}
 *   expanded={expandedFolders.has(folder.id)}
 *   onToggle={() => toggleFolder(folder.id)}
 *   depth={0}
 * />
 */

import React, { memo, useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { FileItemList } from './FileItem';
import { useAdaptive } from '@UI/react/context';
import './FolderNode.scss';

/**
 * @typedef {Object} Folder
 * @property {string} id - Folder identifier
 * @property {string} name - Folder name
 * @property {string|null} parentId - Parent folder ID
 * @property {string[]} [children] - Child folder/file IDs
 */

/**
 * @typedef {Object} FolderNodeProps
 * @property {Folder} folder - Folder data object
 * @property {Array} files - All files array
 * @property {Array} allFolders - All folders array
 * @property {boolean} expanded - Whether folder is expanded
 * @property {() => void} onToggle - Toggle handler
 * @property {number} [depth=0] - Nesting depth
 * @property {(fileId: string) => void} [onFileLoad] - File load handler
 * @property {(fileId: string) => void} [onToggleStar] - Toggle star handler
 * @property {(file: Object) => void} [onFileClick] - File click handler
 * @property {(file: Object) => void} [onFileDoubleClick] - File double-click handler
 */

/**
 * FolderNode - Expandable folder in file tree
 *
 * @param {FolderNodeProps} props - Component props
 * @returns {React.ReactElement} The rendered component
 */
export const FolderNode = memo(function FolderNode({
    folder,
    files,
    allFolders,
    expanded,
    onToggle,
    depth = 0,
    onFileLoad,
    onToggleStar,
    onFileClick,
    onFileDoubleClick,
}) {
    const { isVR } = useAdaptive();

    // Local expanded state for child folders
    const [expandedChildren, setExpandedChildren] = useState(new Set());

    // Toggle child folder
    const toggleChild = useCallback((childId) => {
        setExpandedChildren(prev => {
            const next = new Set(prev);
            next.has(childId) ? next.delete(childId) : next.add(childId);
            return next;
        });
    }, []);

    // Get child folders and files
    const childFolders = allFolders.filter(f => f.parentId === folder.id);
    const childFiles = files.filter(f => f.folderId === folder.id);
    const totalItems = childFolders.length + childFiles.length;

    const classList = [
        'folder-node',
        expanded && 'folder-node--expanded',
        isVR && 'folder-node--vr',
    ].filter(Boolean).join(' ');

    return (
        <div className={classList}>
            {/* Folder header */}
            <div
                className="folder-node__header"
                onClick={onToggle}
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                style={{ paddingLeft: depth * 16 + 8 }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onToggle();
                    }
                }}
            >
                <span className="folder-node__chevron">
                    <Icon
                        name={expanded ? 'chevronDown' : 'chevronRight'}
                        size={10}
                    />
                </span>
                <Icon
                    name="folder"
                    size={14}
                    className="folder-node__icon"
                />
                <span className="folder-node__name" title={folder.name}>
                    {folder.name}
                </span>
                <span className="folder-node__count">
                    {totalItems}
                </span>
            </div>

            {/* Children (when expanded) */}
            {expanded && (
                <div className="folder-node__children">
                    {/* Child folders */}
                    {childFolders.map(childFolder => (
                        <FolderNode
                            key={childFolder.id}
                            folder={childFolder}
                            files={files}
                            allFolders={allFolders}
                            expanded={expandedChildren.has(childFolder.id)}
                            onToggle={() => toggleChild(childFolder.id)}
                            depth={depth + 1}
                            onFileLoad={onFileLoad}
                            onToggleStar={onToggleStar}
                            onFileClick={onFileClick}
                            onFileDoubleClick={onFileDoubleClick}
                        />
                    ))}

                    {/* Child files */}
                    {childFiles.map(file => (
                        <FileItemList
                            key={file.id}
                            file={file}
                            depth={depth + 1}
                            onSelect={onFileClick}
                            onDoubleClick={onFileDoubleClick}
                            onStar={onToggleStar}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

export default FolderNode;
