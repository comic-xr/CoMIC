/**
 * @file FilesTabV2.jsx
 * @description Redesigned Files Tab with improved layout and features.
 *
 * Features:
 * - Global search and type filters (applies to all sections)
 * - Resizable Starred section with filter bypass
 * - Tabbed browser (Loaded/All Files)
 * - Folder navigation with breadcrumbs
 * - Compact mode for small containers
 * - VR-friendly with adaptive sizing
 *
 * Layout (Full Mode):
 * ┌─────────────────────────────────────┐
 * │ 📁 Files                    8 total │
 * ├─────────────────────────────────────┤
 * │ 🔍 [Search all files...]            │  ← Global search
 * │ [NIfTI][DICOM][CSV][Docs] Sort▼     │  ← Global type filters
 * │ [Filters active]                    │  ← Active indicator
 * ├─────────────────────────────────────┤
 * │ ▼ ⭐ Starred               2 of 3   │
 * │   [All] [Datasets] [Files]          │
 * │   file list...                      │
 * │   [Show all ↗] / [Restore filters]  │
 * │ ═══════════════════════════════════ │  ← Resize handle
 * ├─────────────────────────────────────┤
 * │ [📦 Loaded (2)] [📁 All Files (5)] │
 * │ 🏠 Root / Raw Scans        [≡][⊞]  │  ← Breadcrumb + view toggle
 * │   📁 folders + 📄 files             │
 * ├─────────────────────────────────────┤
 * │ [?]  [    ⬆ Upload Files    ]  [⟳] │
 * └─────────────────────────────────────┘
 *
 * @example
 * <FilesTabV2 workspaceId="ws-1" />
 */

import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { PanelFooter } from '@UI/react/components/molecules/PanelFooter';
import { StarredSection, TabbedFilesBrowser, CompactFilesPanel } from './sections';
import { FileContextMenu } from './components/FileContextMenu';
import { UploadDropzone } from './components/UploadDropzone';
import { GlobalFiltersBar } from './components/GlobalFiltersBar';
import { HelpPanel } from './components/HelpPanel';
import { NewFolderDialog } from './components/NewFolderDialog';
import { FileDetailsModal } from '@UI/react/components/modals/FileDetailsModal';
import { useFilesTab } from './hooks/useFilesTab';
import { useResponsiveMode } from '@UI/react/hooks/useResponsiveMode';
import { useGlobalFilters } from '@UI/react/hooks/useGlobalFilters';
import { useTagAnalysis, DEFAULT_TAG_CATEGORIES } from '@UI/react/hooks/useTagAnalysis';
import { useAdaptive } from '@UI/react/context';
import './FilesTab.scss';

// Sample tags for development (would come from API in production)
const SAMPLE_TAGS = [
    { id: 'pre-op', name: 'Pre-op', categoryId: 'phase' },
    { id: 'post-op', name: 'Post-op', categoryId: 'phase' },
    { id: 'baseline', name: 'Baseline', categoryId: 'phase' },
    { id: 'pending', name: 'Pending Review', categoryId: 'status' },
    { id: 'approved', name: 'Approved', categoryId: 'status' },
    { id: 'control', name: 'Control', categoryId: 'cohort' },
    { id: 'treatment', name: 'Treatment', categoryId: 'cohort' },
];

/**
 * @typedef {Object} FilesTabV2Props
 * @property {string} workspaceId - Current workspace ID
 * @property {Array} [mockFiles] - Mock files for testing
 * @property {Set} [mockStarredIds] - Mock starred IDs for testing
 * @property {boolean} [mockIsLoading] - Mock loading state
 * @property {string} [mockError] - Mock error state
 */

/**
 * FilesTabV2 - Redesigned Files Tab component
 *
 * @param {FilesTabV2Props} props - Component props
 * @returns {React.ReactElement} The rendered component
 */
export function FilesTabV2({
    workspaceId,
    mockFiles = null,
    mockStarredIds = null,
    mockIsLoading = null,
    mockError = null,
}) {
    const { isVR } = useAdaptive();
    const containerRef = useRef(null);

    // Responsive mode detection
    const { dimensions, isCompact, showLabels } = useResponsiveMode(containerRef);

    // Tag state - would come from API in production
    const [projectTags, setProjectTags] = useState(SAMPLE_TAGS);
    const allowTagCreation = true; // From project settings

    // Global filters state (with tag support)
    const {
        filters,
        setFilters,
        applyFilters,
        hasActiveFilters,
        activeFilterCount,
        clearFilters,
    } = useGlobalFilters({ tags: projectTags });

    // Core files tab logic
    const {
        // Files data
        files,
        allFiles,
        starredFiles,
        loadedDatasetsFormatted,
        loadedCount,
        isLoading,
        error,

        // Workspace files
        workspaceFiles,
        availableFiles,
        workspaceFileCount,
        isInWorkspace,

        // Folders
        folders,
        createFolder,

        // Actions
        handleStar,
        handleDragStart,
        handleDoubleClick,
        handleUpload,
        refetch,
        addToWorkspace,
        removeFromWorkspace,

        // Context menu
        contextMenu,
        handleContextMenu,
        handleMenuClick,
        closeContextMenu,
        handleContextAction,

        // Upload
        isDragOver,
        setIsDragOver,
    } = useFilesTab({
        workspaceId,
        mockFiles,
        mockStarredIds,
        mockIsLoading,
        mockError,
    });

    // Tag analysis for the dropdown and file display (after allFiles is available)
    const {
        tagsByCategory,
        getCategoryForTag,
    } = useTagAnalysis(allFiles, projectTags, DEFAULT_TAG_CATEGORIES);

    // Handle tag creation
    const handleCreateTag = useCallback(({ name, categoryId }) => {
        const newTag = {
            id: `tag-${Date.now()}`,
            name,
            categoryId,
        };
        setProjectTags(prev => [...prev, newTag]);
        // In production, this would call the API
    }, []);

    // Section states
    const [starredExpanded, setStarredExpanded] = useState(true);
    const [starredHeight, setStarredHeight] = useState(140);
    const [activeTab, setActiveTab] = useState('workspace');
    const [isResizing, setIsResizing] = useState(false);
    const [selectedFileId, setSelectedFileId] = useState(null);
    const [showHelpPanel, setShowHelpPanel] = useState(false);
    const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
    const [showFileDetails, setShowFileDetails] = useState(false);
    const [fileDetailsTarget, setFileDetailsTarget] = useState(null);

    // Starred section resize handler
    const handleResizeStart = useCallback((e) => {
        e.preventDefault();
        setIsResizing(true);
        const startY = e.clientY;
        const startHeight = starredHeight;

        const handleMouseMove = (moveEvent) => {
            const delta = moveEvent.clientY - startY;
            setStarredHeight(Math.max(80, Math.min(250, startHeight + delta)));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [starredHeight]);

    // File click handler
    const handleFileClick = useCallback((file) => {
        // Select file
    }, []);

    // View click handler
    const handleViewClick = useCallback((viewId) => {
        // Navigate to view
    }, []);

    // Help click handler
    const handleHelp = useCallback(() => {
        setShowHelpPanel(prev => !prev);
    }, []);

    // New folder handler
    const handleNewFolder = useCallback(() => {
        setShowNewFolderDialog(true);
    }, []);

    // Create folder handler
    const handleCreateFolder = useCallback(async ({ name, parentId, color }) => {
        try {
            await createFolder({ name, parentId, color });
        } catch (err) {
            console.error('Failed to create folder:', err);
        }
    }, [createFolder]);

    // Wrap context action to intercept "info" for file details
    const wrappedContextAction = useCallback((action, file, operation) => {
        if (action === 'info') {
            setFileDetailsTarget(file);
            setShowFileDetails(true);
            return;
        }
        handleContextAction(action, file, operation);
    }, [handleContextAction]);

    // Format loaded datasets with views for display
    const loadedDatasetsWithViews = useMemo(() => {
        return loadedDatasetsFormatted.map(ds => ({
            ...ds,
            views: ds.views || [], // Add views array if not present
        }));
    }, [loadedDatasetsFormatted]);

    const classList = [
        'files-tab',
        'files-tab-v2',
        isCompact && 'files-tab--compact',
        isVR && 'files-tab--vr',
    ].filter(Boolean).join(' ');

    // Handle drag events on the container
    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragOver(true);
        }
    }, [setIsDragOver]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only hide if leaving the container entirely
        if (e.currentTarget === e.target) {
            setIsDragOver(false);
        }
    }, [setIsDragOver]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Don't trigger shortcuts when typing in inputs
            const target = e.target;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                // Allow Escape to blur and clear filters
                if (e.key === 'Escape') {
                    target.blur();
                    clearFilters();
                }
                return;
            }

            // Don't trigger if any modal is open
            if (showHelpPanel || showNewFolderDialog) {
                if (e.key === 'Escape') {
                    setShowHelpPanel(false);
                    setShowNewFolderDialog(false);
                }
                return;
            }

            switch (e.key) {
                case '/':
                    // Focus search input
                    e.preventDefault();
                    const searchInput = containerRef.current?.querySelector('.global-filters-bar__search .search-input__field');
                    searchInput?.focus();
                    break;
                case 'Escape':
                    // Clear filters
                    clearFilters();
                    break;
                case 's':
                case 'S':
                    // Toggle starred section
                    if (!e.metaKey && !e.ctrlKey) {
                        e.preventDefault();
                        setStarredExpanded(prev => !prev);
                    }
                    break;
                case 'n':
                case 'N':
                    // New folder
                    if (!e.metaKey && !e.ctrlKey) {
                        e.preventDefault();
                        setShowNewFolderDialog(true);
                    }
                    break;
                case 'u':
                case 'U':
                    // Upload files
                    if (!e.metaKey && !e.ctrlKey) {
                        e.preventDefault();
                        document.getElementById('file-upload-input')?.click();
                    }
                    break;
                default:
                    break;
            }
        };

        // Only add listener if container is present
        const container = containerRef.current;
        if (container) {
            container.addEventListener('keydown', handleKeyDown);
            // Make container focusable
            if (!container.hasAttribute('tabindex')) {
                container.setAttribute('tabindex', '-1');
            }
        }

        return () => {
            if (container) {
                container.removeEventListener('keydown', handleKeyDown);
            }
        };
    }, [clearFilters, showHelpPanel, showNewFolderDialog]);

    return (
        <div
            className={classList}
            ref={containerRef}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            {/* Header */}
            <div className="panel-header panel-header--blue">
                <Icon name="folderOpen" size={14} className="panel-header__icon" />
                <span className="panel-header__title">Files</span>
                <div className="panel-header__spacer" />
                <span className="panel-header__count">{allFiles.length} files</span>
            </div>

            {/* Error message */}
            {error && (
                <div className="panel-error">
                    <span>Failed to load files: {error}</span>
                    <button onClick={refetch} className="panel-error__retry">
                        Retry
                    </button>
                </div>
            )}

            {/* Global Filters Bar - applies to all sections */}
            {!isCompact && (
                <GlobalFiltersBar
                    filters={filters}
                    onFiltersChange={setFilters}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onClearFilters={clearFilters}
                    tags={projectTags}
                    tagsByCategory={tagsByCategory}
                    allowTagCreation={allowTagCreation}
                    onCreateTag={handleCreateTag}
                />
            )}

            {/* Main content */}
            <div className="files-tab__content">
                {isCompact ? (
                    /* Compact Mode: 3-tab layout */
                    <CompactFilesPanel
                        starredFiles={starredFiles}
                        workspaceFiles={workspaceFiles}
                        availableFiles={availableFiles}
                        containerWidth={dimensions.width}
                        onToggleStar={handleStar}
                        onFileClick={handleFileClick}
                        onFileDoubleClick={handleDoubleClick}
                        onAddToWorkspace={addToWorkspace}
                        onRemoveFromWorkspace={removeFromWorkspace}
                    />
                ) : (
                    /* Full Mode: Starred + Tabbed Browser */
                    <>
                        <StarredSection
                            items={starredFiles}
                            filters={filters}
                            applyFilters={applyFilters}
                            expanded={starredExpanded}
                            onToggle={() => setStarredExpanded(!starredExpanded)}
                            height={starredHeight}
                            onResizeStart={handleResizeStart}
                            selectedFileId={selectedFileId}
                            onSelect={setSelectedFileId}
                            onToggleStar={handleStar}
                            onDoubleClick={handleDoubleClick}
                            onDragStart={handleDragStart}
                            onContextMenu={handleContextMenu}
                            onMenuClick={handleMenuClick}
                            tags={projectTags}
                            getCategoryForTag={getCategoryForTag}
                        />

                        <TabbedFilesBrowser
                            workspaceFiles={workspaceFiles}
                            availableFiles={availableFiles}
                            allFiles={allFiles}
                            folders={folders}
                            filters={filters}
                            applyFilters={applyFilters}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            selectedFileId={selectedFileId}
                            onSelect={setSelectedFileId}
                            onToggleStar={handleStar}
                            onDoubleClick={handleDoubleClick}
                            onDragStart={handleDragStart}
                            onContextMenu={handleContextMenu}
                            onMenuClick={handleMenuClick}
                            onAddToWorkspace={addToWorkspace}
                            tags={projectTags}
                            getCategoryForTag={getCategoryForTag}
                        />
                    </>
                )}
            </div>

            {/* Footer - sticks to bottom */}
            <PanelFooter
                onHelp={handleHelp}
                onNewFolder={handleNewFolder}
                onUpload={() => document.getElementById('file-upload-input')?.click()}
                onRefresh={refetch}
            />

            {/* Hidden upload input */}
            <input
                id="file-upload-input"
                type="file"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                    e.target.value = '';
                }}
                multiple
            />

            {/* Upload dropzone overlay (for drag-and-drop) */}
            <UploadDropzone
                onUpload={handleUpload}
                isDragOver={isDragOver}
                setIsDragOver={setIsDragOver}
            />

            {/* Loading overlay */}
            {isLoading && (
                <div className="panel-loading-overlay">
                    <div className="panel-loading-overlay__content">
                        <Icon name="loader" size={24} className="spin" />
                        <span>Loading files...</span>
                    </div>
                </div>
            )}

            {/* Help panel */}
            <HelpPanel
                isOpen={showHelpPanel}
                onClose={() => setShowHelpPanel(false)}
            />

            {/* New folder dialog */}
            <NewFolderDialog
                isOpen={showNewFolderDialog}
                onClose={() => setShowNewFolderDialog(false)}
                onSubmit={handleCreateFolder}
                folders={folders}
            />

            {/* Context menu */}
            {contextMenu && (
                <FileContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    file={contextMenu.file}
                    onClose={closeContextMenu}
                    onAction={wrappedContextAction}
                    isInWorkspace={isInWorkspace(contextMenu.file?.id)}
                />
            )}

            {/* File details modal */}
            <FileDetailsModal
                isOpen={showFileDetails}
                file={fileDetailsTarget}
                onClose={() => {
                    setShowFileDetails(false);
                    setFileDetailsTarget(null);
                }}
                onOpen={(file) => handleDoubleClick(file)}
                onDownload={(file) => {
                    // TODO: Implement file download
                    console.log('Download file:', file);
                }}
                onDelete={(file) => {
                    // TODO: Implement file deletion
                    console.log('Delete file:', file);
                }}
            />
        </div>
    );
}

export default FilesTabV2;
