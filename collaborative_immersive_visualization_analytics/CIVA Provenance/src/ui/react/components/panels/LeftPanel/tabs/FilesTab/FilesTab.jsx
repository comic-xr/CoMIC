/**
 * @file FilesTab.jsx
 * @description Project file storage and organization tab.
 * Upload, browse, organize, version, and prepare files for use.
 *
 * Features:
 * - Grid and list view modes with thumbnails
 * - Starred, Workspace Files, and Available Files sections (resizable)
 * - Nested folder support with drag-and-drop
 * - Context menu for file actions
 * - Upload dropzone with progress
 * - File state indicators (stored, loading, loaded, processing, error)
 *
 * Three-layer model:
 * - Files = Supply closet (all files in storage)
 * - Datasets = Palette (files loaded into memory)
 * - Views = Easel (what's on canvas)
 *
 * @see Left_Panel_Design_Specification.docx - Section 4 Files Tab
 *
 * @example
 * <FilesTab workspaceId="ws-1" />
 */

import React, { useCallback } from 'react';
import { Icon, IconButton, Tooltip } from '@UI/react/components/atoms';
import { LabeledButton, ToggleGroup } from '@UI/react/components/molecules';
import {
    ResizableSectionsContainer,
    ResizableSection,
} from '@UI/react/components/organisms/ResizableSections';
import { FilterToolbar } from '@UI/react/components/organisms';
import { useFilesTab } from './hooks/useFilesTab';
import { FileItemList, FileItemGrid } from './components/FileItem';
import { FileContextMenu } from './components/FileContextMenu';
import { UploadDropzone } from './components/UploadDropzone';
import './FilesTab.scss';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * @typedef {Object} FilesPanelContentProps
 * @property {string} workspaceId - Current workspace ID
 * @property {Array} [mockFiles] - Mock files for testing
 * @property {Set} [mockStarredIds] - Mock starred IDs for testing
 * @property {boolean} [mockIsLoading] - Mock loading state
 * @property {string} [mockError] - Mock error state
 */

/**
 * Files tab panel content component.
 *
 * @param {FilesPanelContentProps} props - Component props
 * @returns {React.ReactElement} The rendered panel content
 */
export function FilesPanelContent({
    workspaceId,
    mockFiles = null,
    mockStarredIds = null,
    mockIsLoading = null,
    mockError = null,
}) {
    const {
        // View state
        viewMode,
        setViewMode,

        // Filter system
        filter,
        filterConfig,
        activeFilters,

        // Selection
        selectedFileId,
        setSelectedFileId,
        expandedFolders,
        toggleFolder,

        // Section states (persisted)
        sectionStates,
        toggleSection,
        resizeSection,

        // Context menu
        contextMenu,
        handleContextMenu,
        handleMenuClick,
        closeContextMenu,
        handleContextAction,

        // Upload
        isDragOver,
        setIsDragOver,
        handleUpload,

        // Files data
        starredFiles,
        workspaceFiles,
        availableFiles,
        workspaceFileCount,
        loadedCount,
        supportedFileTypes,
        isLoading,
        error,

        // Actions
        handleStar,
        handleDragStart,
        handleDoubleClick,
        refetch,
        addToWorkspace,
        isInWorkspace,
    } = useFilesTab({
        workspaceId,
        mockFiles,
        mockStarredIds,
        mockIsLoading,
        mockError,
    });

    // Render file items based on view mode
    const renderFileItems = useCallback(
        (items, options = {}) => {
            const { showAddToWorkspace = false } = options;

            if (viewMode === 'grid') {
                return (
                    <div className="files-grid">
                        {items.map((file) => (
                            <FileItemGrid
                                key={file.id}
                                file={file}
                                isSelected={selectedFileId === file.id}
                                onSelect={setSelectedFileId}
                                onStar={handleStar}
                                onDragStart={handleDragStart}
                                onContextMenu={handleContextMenu}
                                onMenuClick={handleMenuClick}
                                onDoubleClick={showAddToWorkspace
                                    ? () => addToWorkspace(file.id)
                                    : handleDoubleClick
                                }
                            />
                        ))}
                    </div>
                );
            }
            return items.map((file) => (
                <FileItemList
                    key={file.id}
                    file={file}
                    isSelected={selectedFileId === file.id}
                    onSelect={setSelectedFileId}
                    onStar={handleStar}
                    onDragStart={handleDragStart}
                    onContextMenu={handleContextMenu}
                    onMenuClick={handleMenuClick}
                    onDoubleClick={showAddToWorkspace
                        ? () => addToWorkspace(file.id)
                        : handleDoubleClick
                    }
                    expandedFolders={expandedFolders}
                    onToggleFolder={toggleFolder}
                />
            ));
        },
        [
            viewMode,
            selectedFileId,
            expandedFolders,
            handleStar,
            handleDragStart,
            handleContextMenu,
            handleMenuClick,
            handleDoubleClick,
            setSelectedFileId,
            toggleFolder,
            addToWorkspace,
        ]
    );

    return (
        <div className="files-tab">
            {/* Header */}
            <div className="panel-header panel-header--blue">
                <Icon name="folderOpen" size={14} className="panel-header__icon" />
                <span className="panel-header__title">Files</span>
                <div className="panel-header__spacer" />
                <div className="panel-header__actions">
                    <Tooltip content="New Folder" placement="bottom">
                        <IconButton
                            icon="folderPlus"
                            label="New Folder"
                            size="xs"
                            variant="ghost"
                        />
                    </Tooltip>
                </div>
            </div>

            {/* Toolbar with view toggle and info */}
            <div className="panel-toolbar">
                <ToggleGroup
                    options={[
                        { value: 'list', icon: 'list' },
                        { value: 'grid', icon: 'grid3x3' },
                    ]}
                    value={viewMode}
                    onChange={setViewMode}
                    size="xs"
                />
                <div className="panel-toolbar__spacer" />
                <span className="panel-toolbar__info">
                    <strong>{workspaceFileCount}</strong> in workspace
                    {loadedCount > 0 && <> · <strong>{loadedCount}</strong> loaded</>}
                </span>
            </div>

            {/* Filter System */}
            <FilterToolbar
                filter={filter}
                config={filterConfig}
                showQuickFilters={true}
                searchPlaceholder="Search files..."
            />

            {/* Loading indicator */}
            {isLoading && (
                <div className="panel-loading">
                    <Icon name="loader" size={16} className="spin" />
                    <span>Loading files...</span>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="panel-error">
                    <span>Failed to load files: {error}</span>
                    <LabeledButton
                        label="Retry"
                        onClick={refetch}
                        size="xs"
                        variant="ghost"
                    />
                </div>
            )}

            {/* Resizable Sections */}
            <div className="files-tab__sections">
                <ResizableSectionsContainer
                    sectionStates={sectionStates}
                    onSectionToggle={toggleSection}
                    onSectionResize={resizeSection}
                >
                    {/* Starred Files Section */}
                    <ResizableSection
                        id="starred"
                        icon="star"
                        iconColorClass="icon--amber"
                        label="Starred"
                        count={starredFiles.length}
                        color="amber"
                        minHeight={60}
                    >
                        {starredFiles.length > 0 ? (
                            renderFileItems(starredFiles)
                        ) : (
                            <div className="section-empty">No starred files</div>
                        )}
                    </ResizableSection>

                    {/* Workspace Files Section */}
                    <ResizableSection
                        id="workspace"
                        icon="folder"
                        iconColorClass="icon--blue"
                        label="Workspace Files"
                        count={workspaceFileCount}
                        color="blue"
                        minHeight={80}
                    >
                        {workspaceFiles.length > 0 ? (
                            renderFileItems(workspaceFiles)
                        ) : (
                            <div className="section-empty">
                                <p>No files added to workspace</p>
                                <p className="section-empty__hint">
                                    Expand "Available Files" below to add files
                                </p>
                            </div>
                        )}
                    </ResizableSection>

                    {/* Available Files Section */}
                    <ResizableSection
                        id="available"
                        icon="folderOpen"
                        iconColorClass="icon--gray"
                        label="Available Files"
                        count={availableFiles.length}
                        color="default"
                        minHeight={60}
                    >
                        {availableFiles.length > 0 ? (
                            renderFileItems(availableFiles, { showAddToWorkspace: true })
                        ) : (
                            <div className="section-empty">
                                All files are in workspace
                            </div>
                        )}
                    </ResizableSection>
                </ResizableSectionsContainer>
            </div>

            {/* Footer with upload */}
            <UploadDropzone
                onUpload={handleUpload}
                onRefresh={refetch}
                isDragOver={isDragOver}
                setIsDragOver={setIsDragOver}
            />

            {/* Context menu */}
            {contextMenu && (
                <FileContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    file={contextMenu.file}
                    onClose={closeContextMenu}
                    onAction={handleContextAction}
                    isInWorkspace={isInWorkspace(contextMenu.file?.id)}
                />
            )}
        </div>
    );
}

export default FilesPanelContent;