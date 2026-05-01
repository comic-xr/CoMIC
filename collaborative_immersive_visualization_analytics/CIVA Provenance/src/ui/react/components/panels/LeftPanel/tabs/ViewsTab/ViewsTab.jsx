/**
 * @file ViewsTab.jsx
 * @description Centralized view management tab for the Left Panel.
 * Create, organize, place, and manage all ViewConfigurations in the workspace.
 *
 * Features:
 * - Canvas Navigator (shared with Layout tab, in Views mode)
 * - Multiple view modes: List, By Status, By Dataset, Grid
 * - Three sections: On Canvas, Not Placed, Recently Deleted
 * - View creation from datasets
 * - Drag-and-drop placement
 * - View lifecycle management (activate, deactivate, trash, restore)
 *
 * @see Left_Panel_Design_Specification.docx - Section 6 Views Tab
 *
 * @example
 * <ViewsPanelContent workspaceId="ws-1" />
 */

import React, { useMemo, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { PanelHeader } from '../../components/PanelHeader';
import { SectionNavGroup, FilterToolbar } from '@UI/react/components/organisms';
import { EmptyState } from '@UI/react/components/molecules/EmptyState';
import { ViewItem, InactiveViewItem, TrashedViewItem } from '@UI/react/components/molecules/ViewItem';
import {
    CanvasNavigator,
    useLayoutPanelContext,
    useLayoutPanel,
} from '@UI/react/components/panels/LayoutPanel';
import { useViewsTab, VIEW_MODES } from './hooks/useViewsTab';
import { viewLifecycleService } from '@Services';
import './ViewsTab.scss';

// =============================================================================
// VIEW MODE BUTTONS
// =============================================================================

const VIEW_MODE_OPTIONS = [
    { id: VIEW_MODES.BY_STATUS, icon: 'layoutList', label: 'By Status' },
    { id: VIEW_MODES.BY_DATASET, icon: 'database', label: 'By Dataset' },
    { id: VIEW_MODES.LIST, icon: 'layers', label: 'List' },
    { id: VIEW_MODES.GRID, icon: 'layoutGrid', label: 'Grid' },
];


// =============================================================================
// ACTIVE VIEW ITEM WRAPPER
// =============================================================================

function ActiveViewItemWrapper({ view, handlers }) {
    return (
        <ViewItem
            view={view}
            isActive={true}
            showPosition={true}
            availableViews={handlers.getAvailableViewsForLinking(view.id)}
            onSelect={handlers.handleSelectView}
            onClose={handlers.handleRemoveFromCanvas}
            onTrash={handlers.handleTrashView}
            onRename={handlers.handleRenameView}
            onNavigate={handlers.handleNavigateToView}
            onSizeChange={(size) => handlers.handleResizeView(view.id, size)}
            onFocus={handlers.handleFocusView}
            onVisibilityToggle={handlers.handleToggleVisibility}
            onBookmark={handlers.handleBookmarkView}
            onShare={handlers.handleShareView}
            onOpenTools={handlers.handleOpenTools}
            onDuplicate={handlers.handleDuplicateView}
            onFilterRemove={(filterId) => handlers.handleRemoveFilter(view.id, filterId)}
            onLinkPropertyChange={(propId, config) => handlers.handleLinkPropertyChange(view.id, propId, config)}
            onLinkModeChange={(mode) => handlers.handleLinkModeChange(view.id, mode)}
        />
    );
}

// =============================================================================
// DATASET GROUP COMPONENT
// =============================================================================

function DatasetGroup({ dataset, views, isExpanded, onToggle, handlers }) {
    const activeCount = views.filter(v => v.status === 'active').length;

    return (
        <div className="views-tab__dataset-group">
            <button
                className="views-tab__dataset-header"
                onClick={onToggle}
            >
                {isExpanded ? <Icon name="chevronDown" size={12} /> : <Icon name="chevronRight" size={12} />}
                <Icon name="database" size={12} className="icon-teal" />
                <span className="views-tab__dataset-name">{dataset.name}</span>
                <span className="views-tab__dataset-counts">
                    <span className="views-tab__dataset-active">{activeCount}</span>
                    /
                    <span className="views-tab__dataset-total">{views.length}</span>
                </span>
            </button>

            {isExpanded && (
                <div className="views-tab__dataset-views">
                    {views.map(view => (
                        view.status === 'active' ? (
                            <ActiveViewItemWrapper
                                key={view.id}
                                view={view}
                                handlers={handlers}
                            />
                        ) : (
                            <InactiveViewItem
                                key={view.id}
                                view={view}
                                onPlace={handlers.handlePlaceView}
                                onTrash={handlers.handleTrashView}
                            />
                        )
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ViewsPanelContent({ workspaceId }) {
    // =========================================================================
    // HOOKS
    // =========================================================================

    // Get layout panel context for CanvasNavigator
    // Note: useLayoutPanel must be called unconditionally (React hooks rules)
    // When context exists, we use context.logic; otherwise use standalone
    const layoutContext = useLayoutPanelContext();

    // Create standalone logic - this is always called but may not be used
    // Pass workspaceId for canvas initialization
    const standaloneLogic = useLayoutPanel({ canvasId: workspaceId });

    // Prefer context logic if available, fall back to standalone
    const layoutLogic = layoutContext?.logic || standaloneLogic;

    const {
        views,
        allViews,
        onCanvasViews,
        notPlacedViews,
        recentlyDeletedViews,
        viewsByDataset,
        filter,
        filterConfig,
        viewMode,
        setViewMode,
        expandedDatasets,
        toggleDatasetExpanded,
        handlePlaceView,
        handleRemoveFromCanvas,
        handleTrashView,
        handleRestoreView,
        handlePermanentDelete,
        handleCreateView,
        handleSelectView,
        handleNavigateToView,
        handleRenameView,
        handleResizeView,
        handleFocusView,
        handleToggleVisibility,
        // New handlers for expanded panel
        handleBookmarkView,
        handleShareView,
        handleOpenTools,
        handleDuplicateView,
        handleRemoveFilter,
        handleLinkPropertyChange,
        handleLinkModeChange,
    } = useViewsTab({ workspaceId });

    // Create available views list for linking (excluding current view)
    const getAvailableViewsForLinking = useCallback((currentViewId) => {
        return (allViews || [])
            .filter(v => v.id !== currentViewId && v.isOnCanvas)
            .map(v => ({ id: v.id, name: v.name }));
    }, [allViews]);

    // Bundle handlers for passing to child components
    const handlers = useMemo(() => ({
        handlePlaceView,
        handleRemoveFromCanvas,
        handleTrashView,
        handleRestoreView,
        handlePermanentDelete,
        handleSelectView,
        handleNavigateToView,
        handleRenameView,
        handleResizeView,
        handleFocusView,
        handleToggleVisibility,
        // New handlers for expanded panel
        handleBookmarkView,
        handleShareView,
        handleOpenTools,
        handleDuplicateView,
        handleRemoveFilter,
        handleLinkPropertyChange,
        handleLinkModeChange,
        getAvailableViewsForLinking,
    }), [
        handlePlaceView,
        handleRemoveFromCanvas,
        handleTrashView,
        handleRestoreView,
        handlePermanentDelete,
        handleSelectView,
        handleNavigateToView,
        handleRenameView,
        handleResizeView,
        handleFocusView,
        handleToggleVisibility,
        handleBookmarkView,
        handleShareView,
        handleOpenTools,
        handleDuplicateView,
        handleRemoveFilter,
        handleLinkPropertyChange,
        handleLinkModeChange,
        getAvailableViewsForLinking,
    ]);

    // =========================================================================
    // SECTION CONFIGURATIONS
    // =========================================================================

    // Build sections for SectionNavGroup (BY_STATUS view mode)
    const viewStatusSections = useMemo(() => [
        {
            id: 'navigator',
            icon: 'grid3x3',
            label: 'Canvas Navigator',
            color: '#c084fc', // purple
            content: (
                <CanvasNavigator
                    isDocked={true}
                    logic={layoutLogic}
                />
            ),
        },
        {
            id: 'onCanvas',
            icon: 'eye',
            label: 'On Canvas',
            color: '#4ade80', // green
            itemCount: onCanvasViews.length,
            content: onCanvasViews.length === 0 ? (
                <EmptyState
                    icon="eye"
                    title="No views on canvas"
                    description="Drag views here or click to place"
                    size="sm"
                />
            ) : (
                <div className="views-tab__list">
                    {onCanvasViews.map(view => (
                        <ActiveViewItemWrapper
                            key={view.id}
                            view={view}
                            handlers={handlers}
                        />
                    ))}
                </div>
            ),
        },
        {
            id: 'notPlaced',
            icon: 'eyeOff',
            label: 'Not Placed',
            color: '#9ca3af', // gray
            itemCount: notPlacedViews.length,
            content: notPlacedViews.length === 0 ? (
                <EmptyState
                    icon="layers"
                    title="All views are placed"
                    description="Create new views from Datasets tab"
                    size="sm"
                />
            ) : (
                <div className="views-tab__list">
                    {notPlacedViews.map(view => (
                        <InactiveViewItem
                            key={view.id}
                            view={view}
                            onPlace={handlePlaceView}
                            onTrash={handleTrashView}
                        />
                    ))}
                </div>
            ),
        },
        {
            id: 'deleted',
            icon: 'trash',
            label: 'Recently Deleted',
            color: '#f87171', // red
            itemCount: recentlyDeletedViews.length,
            content: recentlyDeletedViews.length === 0 ? (
                <EmptyState
                    icon="clock"
                    title="No deleted views"
                    description="Deleted views appear here for 30 days"
                    size="sm"
                />
            ) : (
                <div className="views-tab__list">
                    {recentlyDeletedViews.map(view => (
                        <TrashedViewItem
                            key={view.id}
                            view={view}
                            onRestore={handleRestoreView}
                            onPermanentDelete={handlePermanentDelete}
                        />
                    ))}
                </div>
            ),
        },
    ], [
        layoutLogic,
        onCanvasViews,
        notPlacedViews,
        recentlyDeletedViews,
        handlers,
        handlePlaceView,
        handleTrashView,
        handleRestoreView,
        handlePermanentDelete,
    ]);

    // =========================================================================
    // RENDER HELPERS
    // =========================================================================

    const renderByStatusContent = () => (
        <SectionNavGroup
            sections={viewStatusSections}
            defaultSectionId="navigator"
            size="sm"
        />
    );

    const renderByDatasetContent = () => (
        <div className="views-tab__by-dataset">
            {/* Canvas Navigator at top */}
            <div className="views-tab__navigator-container">
                <CanvasNavigator isDocked={true} logic={layoutLogic} />
            </div>

            {/* Dataset groups */}
            <div className="views-tab__dataset-list">
                {viewsByDataset.length === 0 ? (
                    <EmptyState
                        icon="database"
                        title="No views"
                        description="Load a dataset to create views"
                        size="sm"
                    />
                ) : (
                    viewsByDataset.map(group => (
                        <DatasetGroup
                            key={group.id}
                            dataset={group}
                            views={group.views}
                            isExpanded={expandedDatasets.has(group.id)}
                            onToggle={() => toggleDatasetExpanded(group.id)}
                            handlers={handlers}
                        />
                    ))
                )}
            </div>

            {/* Recently Deleted (collapsible) */}
            {recentlyDeletedViews.length > 0 && (
                <div className="views-tab__trash-section">
                    <div className="views-tab__trash-header">
                        <Icon name="delete" size={12} className="icon-red" />
                        <span>Recently Deleted ({recentlyDeletedViews.length})</span>
                    </div>
                    <div className="views-tab__trash-list">
                        {recentlyDeletedViews.map(view => (
                            <TrashedViewItem
                                key={view.id}
                                view={view}
                                onRestore={handleRestoreView}
                                onPermanentDelete={handlePermanentDelete}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderListContent = () => (
        <div className="views-tab__flat-list">
            {/* Canvas Navigator at top */}
            <div className="views-tab__navigator-container">
                <CanvasNavigator isDocked={true} logic={layoutLogic} />
            </div>

            {/* All views in a flat list */}
            <div className="views-tab__list views-tab__list--scrollable">
                {views.length === 0 ? (
                    <EmptyState
                        icon="layers"
                        title="No views"
                        description="Load a dataset to create views"
                        size="sm"
                    />
                ) : (
                    views.map(view => (
                        view.status === 'active' ? (
                            <ActiveViewItemWrapper
                                key={view.id}
                                view={view}
                                handlers={handlers}
                            />
                        ) : (
                            <InactiveViewItem
                                key={view.id}
                                view={view}
                                onPlace={handlePlaceView}
                                onTrash={handleTrashView}
                            />
                        )
                    ))
                )}
            </div>
        </div>
    );

    const renderGridContent = () => (
        <div className="views-tab__grid-view">
            {/* Canvas Navigator takes priority */}
            <div className="views-tab__navigator-container views-tab__navigator-container--large">
                <CanvasNavigator isDocked={true} logic={layoutLogic} />
            </div>

            {/* Compact view list below */}
            <div className="views-tab__grid-list">
                {views.map(view => (
                    <div
                        key={view.id}
                        className={`views-tab__grid-item ${view.status === 'active' ? 'views-tab__grid-item--active' : ''}`}
                        style={{ '--view-color': view.color }}
                        onClick={() => view.status === 'active' ? handleSelectView(view.id) : handlePlaceView(view.id)}
                        title={view.name}
                    >
                        <span className="views-tab__grid-item-name">{view.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    // =========================================================================
    // MAIN RENDER
    // =========================================================================

    return (
        <div className="views-tab">
            {/* Header */}
            <div className="panel-header panel-header--purple">
                <Icon name="layers" size={14} className="panel-header__icon" />
                <span className="panel-header__title">Views</span>
            </div>

            {/* Filters Toolbar */}
            <div className="views-tab__toolbar">
                {/* View Mode Toggle */}
                <div className="views-tab__mode-toggle">
                    {VIEW_MODE_OPTIONS.map(({ id, icon, label }) => (
                        <button
                            key={id}
                            className={`views-tab__mode-btn ${viewMode === id ? 'views-tab__mode-btn--active' : ''}`}
                            onClick={() => setViewMode(id)}
                            title={label}
                        >
                            <Icon name={icon} size={12} />
                        </button>
                    ))}
                </div>

                {/* Filter System */}
                <FilterToolbar
                    filter={filter}
                    config={filterConfig}
                    showQuickFilters={true}
                    searchPlaceholder="Search views..."
                />
            </div>

            {/* Content - varies by view mode */}
            <div className="views-tab__content">
                {viewMode === VIEW_MODES.BY_STATUS && renderByStatusContent()}
                {viewMode === VIEW_MODES.BY_DATASET && renderByDatasetContent()}
                {viewMode === VIEW_MODES.LIST && renderListContent()}
                {viewMode === VIEW_MODES.GRID && renderGridContent()}
            </div>

            {/* Footer */}
            <div className="panel-footer">
                <button
                    className="panel-footer__btn panel-footer__btn--primary"
                    onClick={handleCreateView}
                >
                    <Icon name="add" size={11} />
                    <span>New View</span>
                </button>
            </div>
        </div>
    );
}

export default ViewsPanelContent;