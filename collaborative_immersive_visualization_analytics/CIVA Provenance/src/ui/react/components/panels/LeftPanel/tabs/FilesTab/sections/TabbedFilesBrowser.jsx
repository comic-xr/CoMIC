/**
 * @file TabbedFilesBrowser.jsx
 * @description Bottom section with Workspace/Available Files tabs.
 * Uses global filters from parent. Includes breadcrumb navigation and folder browsing.
 *
 * Tabs:
 * - Workspace: Files added to current workspace
 * - Available: All project files not yet in workspace
 *
 * @example
 * <TabbedFilesBrowser
 *   workspaceFiles={workspaceFiles}
 *   availableFiles={availableFiles}
 *   folders={folders}
 *   filters={filters}
 *   applyFilters={applyFilters}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 *   onAddToWorkspace={addToWorkspace}
 * />
 */

import React, { memo, useState, useMemo, useCallback } from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { TabButton } from '@UI/react/components/molecules/TabButton';
import { ToggleGroup } from '@UI/react/components/molecules/ToggleGroup';
import { Breadcrumb, buildBreadcrumbPath } from '@UI/react/components/molecules/Breadcrumb';
import { EmptyState } from '@UI/react/components/molecules/EmptyState';
import { FileItemList, FileItemGrid } from '../components/FileItem';
import { FolderNode } from '../components/FolderNode';
import { useAdaptive } from '@UI/react/context';
import './TabbedFilesBrowser.scss';

/**
 * @typedef {Object} TabbedFilesBrowserProps
 * @property {Array} workspaceFiles - Files added to current workspace
 * @property {Array} availableFiles - Files not yet in workspace
 * @property {Array} allFiles - All files in project (for folder navigation)
 * @property {Array} folders - Folder hierarchy
 * @property {Object} [filters] - Global filter state from parent
 * @property {(items: Array) => Array} [applyFilters] - Global filter function from parent
 * @property {'workspace'|'available'} activeTab - Currently active tab
 * @property {(tab: 'workspace'|'available') => void} onTabChange - Tab change handler
 * @property {string} [selectedFileId] - Currently selected file ID
 * @property {(fileId: string) => void} [onSelect] - File selection handler
 * @property {(fileId: string) => void} [onToggleStar] - Toggle star handler
 * @property {(file: Object) => void} [onDoubleClick] - File double-click handler
 * @property {(e: DragEvent, file: Object) => void} [onDragStart] - Drag start handler
 * @property {(e: MouseEvent, file: Object) => void} [onContextMenu] - Context menu handler
 * @property {(e: MouseEvent, file: Object) => void} [onMenuClick] - Menu button click handler
 * @property {(fileId: string) => void} [onAddToWorkspace] - Add file to workspace handler
 * @property {string} [className] - Additional CSS classes
 */

/**
 * TabbedFilesBrowser - Bottom section with Workspace/Available tabs
 *
 * @param {TabbedFilesBrowserProps} props - Component props
 * @returns {React.ReactElement} The rendered component
 */
export const TabbedFilesBrowser = memo(function TabbedFilesBrowser({
    workspaceFiles = [],
    availableFiles = [],
    allFiles = [],
    folders = [],
    filters = null,
    applyFilters = null,
    activeTab = 'workspace',
    onTabChange,
    selectedFileId,
    onSelect,
    onToggleStar,
    onDoubleClick,
    onDragStart,
    onContextMenu,
    onMenuClick,
    onAddToWorkspace,
    // V7: Tag display props
    tags,
    getCategoryForTag,
    className = '',
}) {
    const { isVR } = useAdaptive();

    // Local view state (not filtered globally)
    const [viewMode, setViewMode] = useState('list');
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [expandedFolders, setExpandedFolders] = useState(new Set());

    // Toggle folder expansion
    const toggleFolder = useCallback((id) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    // Build breadcrumb path
    const breadcrumbPath = useMemo(() => {
        return buildBreadcrumbPath(currentFolderId, folders);
    }, [currentFolderId, folders]);

    // Get root folders and files for current location
    const { rootFolders, rootFiles } = useMemo(() => {
        // Use workspace files for 'workspace' tab, available files for 'available' tab
        const currentFiles = activeTab === 'workspace' ? workspaceFiles :
                            activeTab === 'available' ? availableFiles : allFiles;
        return {
            rootFolders: folders.filter(f => (f.parentId ?? null) === currentFolderId),
            // At root (null), show files without a folder assignment
            rootFiles: currentFiles.filter(f => (f.folderId ?? null) === currentFolderId),
        };
    }, [folders, workspaceFiles, availableFiles, allFiles, currentFolderId, activeTab]);

    // Check if global filters are active
    const hasGlobalSearch = filters?.searchQuery?.trim();
    const hasGlobalFilters = hasGlobalSearch ||
        (filters?.typeFilters?.length > 0) ||
        (filters?.tagFilters?.length > 0);

    // Get current tab's base files
    const currentTabFiles = useMemo(() => {
        return activeTab === 'workspace' ? workspaceFiles :
               activeTab === 'available' ? availableFiles : allFiles;
    }, [activeTab, workspaceFiles, availableFiles, allFiles]);

    // Filter and sort files using global filters
    const filteredFiles = useMemo(() => {
        // When searching globally, search all files; otherwise show current folder contents
        const baseFiles = hasGlobalSearch ? currentTabFiles : rootFiles;

        // Apply global filters if available
        if (applyFilters) {
            return applyFilters(baseFiles);
        }

        // Fallback: return base files sorted by name
        return [...baseFiles].sort((a, b) =>
            (a.name || '').localeCompare(b.name || '')
        );
    }, [rootFiles, currentTabFiles, hasGlobalSearch, applyFilters]);

    const classList = [
        'tabbed-files-browser',
        isVR && 'tabbed-files-browser--vr',
        className,
    ].filter(Boolean).join(' ');

    // Handle double-click for available files (add to workspace)
    const handleAvailableDoubleClick = useCallback((file) => {
        if (onAddToWorkspace) {
            onAddToWorkspace(file.id);
        }
    }, [onAddToWorkspace]);

    return (
        <div className={classList}>
            {/* Tab bar */}
            <div className="tabbed-files-browser__tabs">
                <TabButton
                    icon="folder"
                    label="Workspace"
                    active={activeTab === 'workspace'}
                    badge={hasGlobalFilters && activeTab === 'workspace' ? filteredFiles.length : workspaceFiles.length}
                    color="blue"
                    onClick={() => onTabChange('workspace')}
                />
                <TabButton
                    icon="folderOpen"
                    label="Available"
                    active={activeTab === 'available'}
                    badge={hasGlobalFilters && activeTab === 'available' ? filteredFiles.length : availableFiles.length}
                    color="gray"
                    onClick={() => onTabChange('available')}
                />
            </div>

            {/* Workspace Files Tab Content */}
            {activeTab === 'workspace' && (
                <>
                    {/* Toolbar: Breadcrumb + View Toggle */}
                    <div className="tabbed-files-browser__toolbar">
                        <Breadcrumb
                            path={breadcrumbPath}
                            onNavigate={setCurrentFolderId}
                        />
                        <div className="tabbed-files-browser__toolbar-right">
                            <ToggleGroup
                                options={[
                                    { value: 'list', icon: 'list' },
                                    { value: 'grid', icon: 'grid3x3' },
                                ]}
                                value={viewMode}
                                onChange={setViewMode}
                                size="xs"
                            />
                        </div>
                    </div>

                    {/* File list/grid */}
                    <div className={`tabbed-files-browser__content ${viewMode === 'grid' ? 'tabbed-files-browser__content--grid' : ''}`}>
                        {/* Folders (when not searching globally, list view only) */}
                        {!hasGlobalSearch && viewMode === 'list' && rootFolders.map(folder => (
                            <FolderNode
                                key={folder.id}
                                folder={folder}
                                files={allFiles}
                                allFolders={folders}
                                expanded={expandedFolders.has(folder.id)}
                                onToggle={() => toggleFolder(folder.id)}
                                depth={0}
                                onToggleStar={onToggleStar}
                            />
                        ))}

                        {/* Files - Grid View */}
                        {viewMode === 'grid' && filteredFiles.length > 0 && (
                            <div className="files-grid">
                                {filteredFiles.filter(f => !f.isFolder).map(file => (
                                    <FileItemGrid
                                        key={file.id}
                                        file={file}
                                        isSelected={selectedFileId === file.id}
                                        onSelect={() => onSelect?.(file.id)}
                                        onDoubleClick={onDoubleClick}
                                        onStar={onToggleStar}
                                        onDragStart={onDragStart}
                                        onContextMenu={onContextMenu}
                                        onMenuClick={onMenuClick}
                                        tags={tags}
                                        getCategoryForTag={getCategoryForTag}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Files - List View */}
                        {viewMode === 'list' && filteredFiles.length > 0 && (
                            filteredFiles.map(file => (
                                <FileItemList
                                    key={file.id}
                                    file={file}
                                    isSelected={selectedFileId === file.id}
                                    onSelect={() => onSelect?.(file.id)}
                                    onDoubleClick={onDoubleClick}
                                    onStar={onToggleStar}
                                    onDragStart={onDragStart}
                                    onContextMenu={onContextMenu}
                                    onMenuClick={onMenuClick}
                                    expandedFolders={expandedFolders}
                                    onToggleFolder={toggleFolder}
                                    tags={tags}
                                    getCategoryForTag={getCategoryForTag}
                                />
                            ))
                        )}

                        {/* Empty state for workspace */}
                        {filteredFiles.length === 0 && !hasGlobalSearch && (
                            <EmptyState
                                icon="folder"
                                title="No files in workspace"
                                subtitle="Add files from the Available tab"
                            />
                        )}
                        {filteredFiles.length === 0 && hasGlobalSearch && (
                            <EmptyState
                                icon="search"
                                title="No files found"
                                subtitle={`No results for "${filters?.searchQuery}"`}
                            />
                        )}
                    </div>
                </>
            )}

            {/* Available Files Tab Content */}
            {activeTab === 'available' && (
                <>
                    {/* Toolbar: Breadcrumb + View Toggle */}
                    <div className="tabbed-files-browser__toolbar">
                        <Breadcrumb
                            path={breadcrumbPath}
                            onNavigate={setCurrentFolderId}
                        />
                        <div className="tabbed-files-browser__toolbar-right">
                            <ToggleGroup
                                options={[
                                    { value: 'list', icon: 'list' },
                                    { value: 'grid', icon: 'grid3x3' },
                                ]}
                                value={viewMode}
                                onChange={setViewMode}
                                size="xs"
                            />
                        </div>
                    </div>

                    {/* File list/grid */}
                    <div className={`tabbed-files-browser__content ${viewMode === 'grid' ? 'tabbed-files-browser__content--grid' : ''}`}>
                        {/* Files - Grid View */}
                        {viewMode === 'grid' && filteredFiles.length > 0 && (
                            <div className="files-grid">
                                {filteredFiles.filter(f => !f.isFolder).map(file => (
                                    <FileItemGrid
                                        key={file.id}
                                        file={file}
                                        isSelected={selectedFileId === file.id}
                                        onSelect={() => onSelect?.(file.id)}
                                        onDoubleClick={handleAvailableDoubleClick}
                                        onStar={onToggleStar}
                                        onDragStart={onDragStart}
                                        onContextMenu={onContextMenu}
                                        onMenuClick={onMenuClick}
                                        tags={tags}
                                        getCategoryForTag={getCategoryForTag}
                                        onAdd={onAddToWorkspace}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Files - List View */}
                        {viewMode === 'list' && filteredFiles.length > 0 && (
                            filteredFiles.map(file => (
                                <FileItemList
                                    key={file.id}
                                    file={file}
                                    isSelected={selectedFileId === file.id}
                                    onSelect={() => onSelect?.(file.id)}
                                    onDoubleClick={handleAvailableDoubleClick}
                                    onStar={onToggleStar}
                                    onDragStart={onDragStart}
                                    onContextMenu={onContextMenu}
                                    onMenuClick={onMenuClick}
                                    expandedFolders={expandedFolders}
                                    onToggleFolder={toggleFolder}
                                    tags={tags}
                                    getCategoryForTag={getCategoryForTag}
                                    onAdd={onAddToWorkspace}
                                />
                            ))
                        )}

                        {/* Empty state for available */}
                        {filteredFiles.length === 0 && !hasGlobalSearch && (
                            <EmptyState
                                icon="check"
                                title="All files in workspace"
                                subtitle="All project files have been added"
                            />
                        )}
                        {filteredFiles.length === 0 && hasGlobalSearch && (
                            <EmptyState
                                icon="search"
                                title="No files found"
                                subtitle={`No results for "${filters?.searchQuery}"`}
                            />
                        )}
                    </div>
                </>
            )}

        </div>
    );
});

export default TabbedFilesBrowser;
