/**
 * @file DatasetsTab.jsx
 * @description Datasets tab for the Left Panel
 * 
 * CLEAN MIGRATION: Removed getLucideIcon - uses <Icon name={...} /> directly
 * Structure matches DatasetsTab.scss styling
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { ChipGroup } from '@UI/react/components/molecules/ChipGroup';
import { SearchBar } from '@UI/react/components/molecules/SearchBar';
import { useDatasets } from '@UI/react/hooks/useDatasets.js';
import { getFileTypeDisplayInfo } from '@Core/instances/types/instanceTypesInit.js';
import { getViewConfigurationManager } from '@Init/appInitializer.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { dataset as log } from '@Utils/logger.js';
import { DatasetSettingsModal } from '@UI/react/components/modals/DatasetSettingsModal';
import { getCellColorHex } from '@UI/react/utils/canvasColors.js';
import { ViewItem } from '@UI/react/components/molecules/ViewItem';
import { viewLifecycleService } from '@Services';
import { formatFileSize, formatRelativeTime } from '@Utils/formatters.js';
import './DatasetsTab.scss';

// =============================================================================
// FILTER CHIPS CONFIGURATION
// =============================================================================

const getFilterChips = (counts) => [
    { id: 'active', label: 'Active', icon: 'eye', color: 'green', count: counts.active },
    { id: 'inactive', label: 'Inactive', icon: 'archive', color: 'gray', count: counts.inactive },
    { id: 'shared', label: 'Shared', icon: 'users', color: 'pink', count: counts.shared },
];

// =============================================================================
// DATASET TYPE CONFIG - Returns string icon names (NOT components!)
// =============================================================================

function getDatasetTypeConfig(fileType) {
    const displayInfo = getFileTypeDisplayInfo(fileType);

    if (displayInfo) {
        return {
            icon: displayInfo.icon,  // Already semantic!
            color: displayInfo.color,
            label: displayInfo.displayName || fileType?.toUpperCase() || 'Data',
        };
    }

    return {
        icon: 'database',
        color: '#6B7280',
        label: fileType?.toUpperCase() || 'Data',
    };
}

// =============================================================================
// VIEW ITEM WRAPPER
// =============================================================================

function DatasetViewItemWrapper({ view }) {
    const handleFocus = useCallback((viewId) => {
        viewLifecycleService.focusView(viewId);
    }, []);

    const handleClose = useCallback(async (viewId) => {
        await viewLifecycleService.removeViewFromCanvas(viewId);
    }, []);

    const handleTrash = useCallback(async (viewId) => {
        await viewLifecycleService.trashView(viewId);
    }, []);

    const handleRename = useCallback((viewId, newName) => {
        viewLifecycleService.renameView(viewId, newName);
    }, []);

    const handleNavigate = useCallback((viewId) => {
        viewLifecycleService.focusView(viewId);
    }, []);

    const handlePlace = useCallback(async (viewId) => {
        await viewLifecycleService.placeView(viewId);
    }, []);

    const handleVisibilityToggle = useCallback((viewId) => {
        viewLifecycleService.toggleViewVisibility?.(viewId);
    }, []);

    return (
        <ViewItem
            view={view}
            onFocus={handleFocus}
            onClose={handleClose}
            onTrash={handleTrash}
            onRename={handleRename}
            onNavigate={handleNavigate}
            onPlace={handlePlace}
            onVisibilityToggle={handleVisibilityToggle}
        />
    );
}

// =============================================================================
// DATASET PARENT COMPONENT - Matches SCSS structure
// =============================================================================

function DatasetParent({ dataset, views, isExpanded, onToggle }) {
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const cardRef = useRef(null);

    // Get icon config - returns string names!
    const typeConfig = getDatasetTypeConfig(dataset.fileType || dataset.type);

    const activeCount = views.filter(v => v.status === 'active').length;
    const totalCount = views.length;

    // Format metadata
    const sizeDisplay = dataset.fileSize ? formatFileSize(dataset.fileSize) : null;
    const loadedDisplay = dataset.loadedAt ? formatRelativeTime(dataset.loadedAt) : null;
    const handlerLabel = typeConfig.label || dataset.handlerType || 'Data';

    // =========================================================================
    // HANDLERS
    // =========================================================================

    const handleCreateView = useCallback(async (e) => {
        e?.stopPropagation();
        try {
            await viewLifecycleService.createAndPlaceView(dataset.id, {}, {
                name: `View of ${dataset.name || dataset.filename || 'Dataset'}`,
            });
            log.info(`Created and placed view for dataset: ${dataset.id}`);
        } catch (err) {
            log.error('Failed to create view:', err);
        }
    }, [dataset.id, dataset.name, dataset.filename]);

    const handleOpenSettings = useCallback((e) => {
        e?.stopPropagation();
        setShowSettingsModal(true);
        setMenuOpen(false);
    }, []);

    const handleMoreActions = useCallback((e) => {
        e?.stopPropagation();
        setMenuOpen(!menuOpen);
    }, [menuOpen]);

    const handleCloseMenu = useCallback(() => {
        setMenuOpen(false);
    }, []);

    // Drag handlers
    const handleDragStart = useCallback((e) => {
        setIsDragging(true);
        e.dataTransfer.setData('application/cia-dataset', JSON.stringify({
            datasetId: dataset.id,
            fileType: dataset.fileType,
            name: dataset.name || dataset.filename,
        }));
        e.dataTransfer.effectAllowed = 'copy';
    }, [dataset]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    return (
        <div
            className={`dataset-parent ${isDragging ? 'dataset-parent--dragging' : ''} ${isHovered ? 'dataset-parent--hovered' : ''}`}
            ref={cardRef}
        >
            <div className="dataset-parent__card">
                <div className="dataset-parent__header">
                    {/* Main clickable content area */}
                    <div
                        className="dataset-parent__header-content"
                        onClick={onToggle}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => { setIsHovered(false); if (!menuOpen) setMenuOpen(false); }}
                        draggable
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        {/* Chevron */}
                        <span className={`dataset-parent__chevron ${isExpanded ? 'dataset-parent__chevron--expanded' : ''}`}>
                            <Icon name="chevronDown" size={12} />
                        </span>

                        {/* Type icon with colored background */}
                        <div
                            className="dataset-parent__type-icon"
                            style={{ '--type-color': typeConfig.color || '#6B7280' }}
                        >
                            <Icon name={typeConfig.icon} size={14} />
                        </div>

                        {/* Name and metadata */}
                        <div className="dataset-parent__info">
                            <span className="dataset-parent__info-name">
                                {dataset.name || dataset.filename || 'Untitled'}
                            </span>
                            <div className="dataset-parent__info-meta">
                                <span
                                    className="dataset-parent__handler-badge"
                                    style={{ '--type-color': typeConfig.color || '#6B7280' }}
                                >
                                    {handlerLabel}
                                </span>
                                {sizeDisplay && (
                                    <span className="dataset-parent__meta-item">
                                        <Icon name="hardDrive" size={8} />
                                        {sizeDisplay}
                                    </span>
                                )}
                                {loadedDisplay && (
                                    <span className="dataset-parent__meta-item">
                                        <Icon name="clock" size={8} />
                                        {loadedDisplay}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* View count badge */}
                        <div className={`dataset-parent__view-count ${activeCount > 0 ? 'dataset-parent__view-count--has-active' : ''}`}>
                            <span className="dataset-parent__view-count-number">{activeCount}</span>
                            {totalCount > 0 && totalCount !== activeCount && (
                                <span className="dataset-parent__view-count-total">/{totalCount}</span>
                            )}
                        </div>
                    </div>

                    {/* Vertical action buttons (right edge) */}
                    <div className="dataset-parent__actions">
                        <button
                            className="dataset-parent__actions-btn"
                            onClick={handleCreateView}
                            title="Create view"
                        >
                            <Icon name="add" size={10} />
                        </button>
                        <button
                            className="dataset-parent__actions-btn"
                            onClick={handleOpenSettings}
                            title="Settings"
                        >
                            <Icon name="settings" size={10} />
                        </button>
                        <button
                            className="dataset-parent__actions-btn"
                            onClick={handleMoreActions}
                            title="More actions"
                        >
                            <Icon name="moreHorizontal" size={10} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Children (views) */}
            {isExpanded && (
                <div className="dataset-parent__children">
                    {views.length > 0 ? (
                        views.map(view => (
                            <DatasetViewItemWrapper key={view.id} view={view} />
                        ))
                    ) : (
                        <div className="dataset-parent__empty">
                            <span>No views</span>
                            <button
                                className="dataset-parent__empty-action"
                                onClick={handleCreateView}
                            >
                                <Icon name="add" size={10} />
                                Create view
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Settings Modal */}
            <DatasetSettingsModal
                isOpen={showSettingsModal}
                dataset={dataset}
                views={views}
                onClose={() => setShowSettingsModal(false)}
                onCreateView={() => handleCreateView()}
                onUnloadDataset={() => { }}
            />
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DatasetsPanelContent() {
    const [activeFilters, setActiveFilters] = useState([]);
    const [expandedDatasets, setExpandedDatasets] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [, forceUpdate] = useState(0);

    // Subscribe to view changes
    useEffect(() => {
        const handleViewUpdate = () => forceUpdate(n => n + 1);

        getViewConfigurationManager()?.on?.('viewUpdated', handleViewUpdate);
        getViewConfigurationManager()?.on?.('viewDeactivated', handleViewUpdate);
        getViewConfigurationManager()?.on?.('viewActivated', handleViewUpdate);
        getViewConfigurationManager()?.on?.('viewTrashed', handleViewUpdate);
        getViewConfigurationManager()?.on?.('viewRestored', handleViewUpdate);

        return () => {
            getViewConfigurationManager()?.off?.('viewUpdated', handleViewUpdate);
            getViewConfigurationManager()?.off?.('viewDeactivated', handleViewUpdate);
            getViewConfigurationManager()?.off?.('viewActivated', handleViewUpdate);
            getViewConfigurationManager()?.off?.('viewTrashed', handleViewUpdate);
            getViewConfigurationManager()?.off?.('viewRestored', handleViewUpdate);
        };
    }, []);

    const loadedDatasets = useDatasets();

    // Get views for a dataset
    const getViewsForDataset = useCallback((datasetId) => {
        try {
            const views = getViewConfigurationManager()?.getViewsForDataset?.(datasetId) || [];
            // Get dataset info to properly set datasetName on views
            const dataset = loadedDatasets?.find(d => d.id === datasetId);
            const datasetName = dataset?.name || dataset?.filename;

            return views
                .filter(v => v.status !== 'trashed' && v.status !== 'archived')
                .map(v => {
                    const placement = canvasManager?.getPlacementForView?.(v.id);

                    // For views ON the canvas, use position-based color (matches CanvasCell)
                    // For views NOT on canvas, use workspaceManager color or default
                    let viewColor;
                    if (placement) {
                        viewColor = getCellColorHex(placement.row, placement.col);
                    } else {
                        const instanceColorObj = workspaceManager?.getViewColor?.(v.id);
                        viewColor = instanceColorObj?.hex || instanceColorObj || v.color || '#60a5fa';
                    }

                    return {
                        ...v,
                        // Ensure datasetName is set from the parent dataset, not derived from view name
                        datasetName: v.datasetName || datasetName,
                        color: viewColor,
                        position: placement ? { row: placement.row, col: placement.col } : null,
                        status: v.status === 'active' || placement ? 'active' : 'inactive',
                    };
                });
        } catch (err) {
            log.warn('Error getting views for dataset:', err);
            return [];
        }
    }, [loadedDatasets]);

    // Filter views based on active filters
    const getFilteredViews = useCallback((dataset) => {
        const views = getViewsForDataset(dataset.id);
        if (activeFilters.length === 0) return views;

        return views.filter(view => {
            if (activeFilters.includes('active') && view.status === 'active') return true;
            if (activeFilters.includes('inactive') && view.status === 'inactive') return true;
            if (activeFilters.includes('shared') && view.shared) return true;
            return false;
        });
    }, [getViewsForDataset, activeFilters]);

    // Filter datasets by search
    const filteredDatasets = useMemo(() => {
        if (!loadedDatasets) return [];
        if (!searchQuery.trim()) return loadedDatasets;

        const query = searchQuery.toLowerCase();
        return loadedDatasets.filter(ds =>
            (ds.name || ds.filename || '').toLowerCase().includes(query) ||
            (ds.fileType || '').toLowerCase().includes(query)
        );
    }, [loadedDatasets, searchQuery]);

    // Count views for filter chips
    const viewCounts = useMemo(() => {
        let active = 0, inactive = 0, shared = 0;

        filteredDatasets.forEach(ds => {
            const views = getViewsForDataset(ds.id);
            views.forEach(view => {
                if (view.status === 'active') active++;
                else inactive++;
                if (view.shared) shared++;
            });
        });

        return { active, inactive, shared };
    }, [filteredDatasets, getViewsForDataset]);

    // Toggle dataset expansion
    const toggleDataset = useCallback((datasetId) => {
        setExpandedDatasets(prev => {
            const next = new Set(prev);
            if (next.has(datasetId)) {
                next.delete(datasetId);
            } else {
                next.add(datasetId);
            }
            return next;
        });
    }, []);

    // Handle filter change
    const handleFilterChange = useCallback((filterId) => {
        setActiveFilters(prev => {
            if (prev.includes(filterId)) {
                return prev.filter(f => f !== filterId);
            }
            return [...prev, filterId];
        });
    }, []);

    const handleLoadDataset = useCallback(() => {
        log.info('Load dataset clicked');
    }, []);

    return (
        <div className="datasets-tab">
            {/* Header - matches FilesTab pattern */}
            <div className="panel-header panel-header--teal">
                <Icon name="database" size={14} className="panel-header__icon" />
                <span className="panel-header__title">Datasets</span>
                <span className="panel-header__count">
                    {filteredDatasets.length} loaded
                </span>
            </div>

            {/* Search bar */}
            <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search datasets..."
            />

            {/* Filter chips */}
            <div className="panel-filters">
                <ChipGroup
                    chips={getFilterChips(viewCounts)}
                    activeChips={activeFilters}
                    onToggle={handleFilterChange}
                />
            </div>

            {/* Dataset tree */}
            <div className="datasets-tab__content">
                <div className="datasets-tab__tree">
                    {filteredDatasets.length === 0 ? (
                        <div className="datasets-tab__empty">
                            <Icon name="database" size={32} />
                            <h3>No datasets loaded</h3>
                            <p>Load a dataset to get started</p>
                        </div>
                    ) : (
                        filteredDatasets.map(ds => {
                            const views = getFilteredViews(ds);
                            return (
                                <DatasetParent
                                    key={ds.id}
                                    dataset={ds}
                                    views={views}
                                    isExpanded={expandedDatasets.has(ds.id)}
                                    onToggle={() => toggleDataset(ds.id)}
                                />
                            );
                        })
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="panel-footer">
                <button
                    className="panel-footer__btn panel-footer__btn--primary"
                    onClick={handleLoadDataset}
                >
                    <Icon name="folderOpen" size={11} />
                    <span>Load Dataset</span>
                </button>
                <button
                    className="panel-footer__btn panel-footer__btn--icon"
                    title="Refresh"
                >
                    <Icon name="refresh" size={11} />
                </button>
            </div>
        </div>
    );
}

export default DatasetsPanelContent;