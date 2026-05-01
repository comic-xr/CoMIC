/**
 * @file CompactFilesPanel.jsx
 * @description Compact mode panel with 3 tabs (Starred/Workspace/Available).
 * Used when container height is below threshold.
 *
 * Tabs:
 * - Starred: User's starred files (filter bypass enabled)
 * - Workspace: Files added to current workspace
 * - Available: All project files not yet in workspace
 *
 * @example
 * <CompactFilesPanel
 *   starredFiles={starredFiles}
 *   workspaceFiles={workspaceFiles}
 *   availableFiles={availableFiles}
 *   containerWidth={containerWidth}
 * />
 */

import React, { memo, useState, useMemo, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { TabButton } from '@UI/react/components/molecules/TabButton';
import { SearchBar } from '@UI/react/components/molecules/SearchBar';
import { EmptyState } from '@UI/react/components/molecules/EmptyState';
import { FileItemList } from '../components/FileItem';
import { useAdaptive } from '@UI/react/context';
import { LABEL_WIDTH_THRESHOLD } from '@UI/react/constants/filesTabConfig.js';
import './CompactFilesPanel.scss';

/**
 * @typedef {Object} CompactFilesPanelProps
 * @property {Array} starredFiles - Starred files
 * @property {Array} workspaceFiles - Files added to current workspace
 * @property {Array} availableFiles - Files not yet in workspace
 * @property {number} containerWidth - Container width in pixels
 * @property {(fileId: string) => void} [onFileLoad] - File load handler
 * @property {(fileId: string) => void} [onToggleStar] - Toggle star handler
 * @property {(file: Object) => void} [onFileClick] - File click handler
 * @property {(file: Object) => void} [onFileDoubleClick] - File double-click handler
 * @property {(fileId: string) => void} [onAddToWorkspace] - Add file to workspace handler
 * @property {(fileId: string) => void} [onRemoveFromWorkspace] - Remove file from workspace handler
 * @property {string} [className] - Additional CSS classes
 */

/**
 * CompactFilesPanel - 3-tab compact mode layout
 *
 * @param {CompactFilesPanelProps} props - Component props
 * @returns {React.ReactElement} The rendered component
 */
export const CompactFilesPanel = memo(function CompactFilesPanel({
    starredFiles = [],
    workspaceFiles = [],
    availableFiles = [],
    containerWidth = 320,
    onFileLoad,
    onToggleStar,
    onFileClick,
    onFileDoubleClick,
    onAddToWorkspace,
    onRemoveFromWorkspace,
    className = '',
}) {
    const { isVR } = useAdaptive();

    // Determine initial tab
    const initialTab = starredFiles.length > 0 ? 'starred' : 'workspace';
    const [activeTab, setActiveTab] = useState(initialTab);

    // Search query (for available tab)
    const [searchQuery, setSearchQuery] = useState('');

    // Show labels based on width
    const showLabels = containerWidth > LABEL_WIDTH_THRESHOLD;

    // Filtered files for search
    const filteredAvailableFiles = useMemo(() => {
        if (!searchQuery.trim()) return availableFiles;
        const q = searchQuery.toLowerCase();
        return availableFiles.filter(f =>
            (f.name || f.filename || '').toLowerCase().includes(q)
        );
    }, [availableFiles, searchQuery]);

    const classList = [
        'compact-files-panel',
        isVR && 'compact-files-panel--vr',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classList}>
            {/* 3-Tab Bar */}
            <div className="compact-files-panel__tabs">
                <TabButton
                    icon="star"
                    label={showLabels ? 'Starred' : ''}
                    active={activeTab === 'starred'}
                    badge={starredFiles.length}
                    color="amber"
                    onClick={() => setActiveTab('starred')}
                    iconOnly={!showLabels}
                />
                <TabButton
                    icon="briefcase"
                    label={showLabels ? 'Workspace' : ''}
                    active={activeTab === 'workspace'}
                    badge={workspaceFiles.length}
                    color="teal"
                    onClick={() => setActiveTab('workspace')}
                    iconOnly={!showLabels}
                />
                <TabButton
                    icon="folder"
                    label={showLabels ? 'Available' : ''}
                    active={activeTab === 'available'}
                    badge={availableFiles.length}
                    color="blue"
                    onClick={() => setActiveTab('available')}
                    iconOnly={!showLabels}
                />
            </div>

            {/* Search (for available tab) */}
            {activeTab === 'available' && (
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search available files..."
                />
            )}

            {/* Content */}
            <div className="compact-files-panel__content">
                {/* Starred Tab */}
                {activeTab === 'starred' && (
                    starredFiles.length > 0 ? (
                        starredFiles.map(file => (
                            <FileItemList
                                key={file.id}
                                file={file}
                                showStar={false}
                                onSelect={onFileClick}
                                onDoubleClick={onFileDoubleClick}
                            />
                        ))
                    ) : (
                        <EmptyState
                            icon="star"
                            title="No starred items"
                        />
                    )
                )}

                {/* Workspace Tab */}
                {activeTab === 'workspace' && (
                    workspaceFiles.length > 0 ? (
                        workspaceFiles.map(file => (
                            <FileItemList
                                key={file.id}
                                file={file}
                                onSelect={onFileClick}
                                onDoubleClick={onFileDoubleClick}
                                onStar={onToggleStar}
                                showRemoveFromWorkspace
                                onRemoveFromWorkspace={onRemoveFromWorkspace}
                            />
                        ))
                    ) : (
                        <EmptyState
                            icon="briefcase"
                            title="No files in workspace"
                            subtitle="Add files from Available tab"
                        />
                    )
                )}

                {/* Available Files Tab */}
                {activeTab === 'available' && (
                    filteredAvailableFiles.length > 0 ? (
                        filteredAvailableFiles.map(file => (
                            <FileItemList
                                key={file.id}
                                file={file}
                                onSelect={onFileClick}
                                onDoubleClick={onFileDoubleClick}
                                onStar={onToggleStar}
                                showAddToWorkspace
                                onAddToWorkspace={onAddToWorkspace}
                            />
                        ))
                    ) : (
                        <EmptyState
                            icon="folder"
                            title={searchQuery ? 'No files found' : 'No available files'}
                        />
                    )
                )}
            </div>
        </div>
    );
});

export default CompactFilesPanel;
