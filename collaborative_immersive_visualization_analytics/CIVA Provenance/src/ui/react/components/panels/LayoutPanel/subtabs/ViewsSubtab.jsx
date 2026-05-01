/**
 * ViewsSubtab - Shows all active views from the canvas
 * 
 * REFACTORED: Now uses the shared ViewItem component instead of custom markup.
 * This ensures consistent styling and behavior across the app.
 * 
 * The ViewItem component handles:
 * - Drag and drop
 * - Hover actions (Settings, Close)
 * - Sliding panel with quick toggles
 * - Context menu
 * - Settings modal
 * 
 * This subtab adds:
 * - Search filtering
 * - Filter chips (Shared, Linked)
 * - Grouping by dataset
 */
import React, { memo, useCallback, useState, useMemo } from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { SearchBar } from '@UI/react/components/molecules/SearchBar';
import { ViewItem } from '@UI/react/components/molecules/ViewItem';
import { ChipGroup } from '@UI/react/components/molecules/ChipGroup';
import { getViewConfigurationManager, getCanvasManager } from '@Init/appInitializer.js';
import { toast } from '@UI/react/store/toastStore';
import './ViewsSubtab.scss';

// Filter chip configuration for Views
const VIEW_FILTERS = [
    { id: 'shared', label: 'Shared', icon: 'share2', color: 'pink' },
    { id: 'linked', label: 'Linked', icon: 'link2', color: 'teal' },
];

// View colors for display - matches INSTANCE_COLORS in CanvasNavigator
const VIEW_COLORS = ['#60a5fa', '#4ade80', '#f472b6', '#fbbf24', '#2dd4bf', '#a78bfa'];

/**
 * Map a cell (enriched placement) to the view format expected by ViewItem
 */
function cellToView(cell, colorIndex) {
    return {
        // Core identity
        id: cell.viewConfigurationId || cell.id,
        placementId: cell.id, // Keep placement ID for removal
        name: cell.name || `View ${cell.row + 1},${cell.col + 1}`,

        // Color - use hex value
        color: VIEW_COLORS[colorIndex % VIEW_COLORS.length],

        // Position on canvas (indicates "placed")
        position: { row: cell.row, col: cell.col },
        row: cell.row,
        col: cell.col,

        // Size
        rowSpan: cell.rowSpan || 1,
        colSpan: cell.colSpan || 1,

        // Dataset reference
        datasetId: cell.datasetId,
        datasetName: cell.datasetName,

        // Status flags (from ViewConfiguration)
        starredWorkspace: cell.starredWorkspace || false,
        starredPersonal: cell.starredPersonal || false,
        hasSavedState: cell.hasSavedState || false,
        isShared: cell.isShared || false,
        isLocked: cell.isLocked || false,

        // Link info
        linkedCount: cell.isLinked ? 1 : 0,
        links: cell.links || {},

        // Filter info
        filterCount: cell.filterCount || 0,

        // Visibility
        visibility: cell.visibility || 'private',

        // Owner
        ownerUserId: cell.ownerUserId,
        ownerUserName: cell.ownerUserName,
    };
}

export const ViewsSubtab = memo(function ViewsSubtab({ logic }) {
    const {
        cells,               // Array of enriched cell objects from logic
        groupByDataset,
        setGroupByDataset,
        searchQuery: logicSearchQuery,
        setSearchQuery: logicSetSearchQuery,
        activeFilters: logicActiveFilters,
        toggleFilter,
        navigateToCell,
        focusCell,           // Smart focus with minimum viewport movement
        closeView,
        removePlacement,
        resizePlacement,
        toggleViewExpanded,
        expandedViewId,
    } = logic;

    // Local state for UI - use logic state if available, otherwise local
    const [localSearchQuery, setLocalSearchQuery] = useState('');
    const [localActiveFilters, setLocalActiveFilters] = useState([]);
    const [collapsedGroups, setCollapsedGroups] = useState(new Set());

    // Use logic state if available, otherwise use local
    const searchQuery = logicSearchQuery !== undefined ? logicSearchQuery : localSearchQuery;
    const setSearchQuery = logicSetSearchQuery || setLocalSearchQuery;
    const activeFilters = logicActiveFilters !== undefined ? logicActiveFilters : localActiveFilters;

    // Filter cells based on search
    const filteredCells = useMemo(() => {
        if (!cells) return [];
        if (!searchQuery) return cells;
        const q = searchQuery.toLowerCase();
        return cells.filter(cell =>
            cell.name?.toLowerCase().includes(q) ||
            cell.datasetName?.toLowerCase().includes(q)
        );
    }, [cells, searchQuery]);

    // Apply active filters
    const finalFilteredCells = useMemo(() => {
        let result = filteredCells;

        if (activeFilters.includes('shared')) {
            result = result.filter(cell => cell.isShared);
        }
        if (activeFilters.includes('linked')) {
            result = result.filter(cell => cell.isLinked);
        }

        return result;
    }, [filteredCells, activeFilters]);

    // Group cells by dataset
    const groupedCells = useMemo(() => {
        if (!groupByDataset) {
            return [{ key: 'all', name: 'All Views', cells: finalFilteredCells }];
        }

        const groups = new Map();
        finalFilteredCells.forEach(cell => {
            const key = cell.datasetId || 'unknown';
            if (!groups.has(key)) {
                groups.set(key, { key, name: cell.datasetName || 'Unknown Dataset', cells: [] });
            }
            groups.get(key).cells.push(cell);
        });
        return Array.from(groups.values());
    }, [finalFilteredCells, groupByDataset]);

    // Track global color index for consistent coloring across groups
    const cellColorMap = useMemo(() => {
        const map = new Map();
        let colorIndex = 0;
        cells?.forEach(cell => {
            map.set(cell.id, colorIndex++);
        });
        return map;
    }, [cells]);

    const toggleGroup = useCallback((key) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }, []);

    // =========================================================================
    // VIEW ITEM CALLBACKS
    // =========================================================================

    const handleNavigate = useCallback((position) => {
        if (position) {
            navigateToCell?.(position.row, position.col);
        }
    }, [navigateToCell]);

    const handleClose = useCallback((viewId) => {
        // Find the cell by viewConfigurationId to get the placement ID
        const cell = cells?.find(c =>
            c.viewConfigurationId === viewId || c.id === viewId
        );
        if (cell) {
            // Use removePlacement with the placement ID
            removePlacement?.(cell.id) || closeView?.(cell.id);
        }
    }, [cells, removePlacement, closeView]);

    const handleSizeChange = useCallback((viewId, size) => {
        const cell = cells?.find(c =>
            c.viewConfigurationId === viewId || c.id === viewId
        );
        if (cell && resizePlacement) {
            resizePlacement(cell.id, size.rows, size.cols);
        }
    }, [cells, resizePlacement]);

    const handleSelect = useCallback((viewId) => {
        toggleViewExpanded?.(viewId);
    }, [toggleViewExpanded]);

    const handleFocus = useCallback((viewId) => {
        // Find the cell to get position and span info
        const cell = cells?.find(c =>
            c.viewConfigurationId === viewId || c.id === viewId
        );
        if (cell) {
            // Use smart focusCell which:
            // 1. Dispatches cia:instance-focused to make it active
            // 2. Only moves viewport if cell is not visible
            // 3. Uses minimum movement to bring cell into view
            focusCell?.(
                cell.viewConfigurationId || viewId,
                cell.row,
                cell.col,
                cell.rowSpan || 1,
                cell.colSpan || 1
            );
        }
    }, [cells, focusCell]);

    const handleVisibilityToggle = useCallback((viewId) => {
        // Use ViewLifecycleService for consistent handling
        const { getViewLifecycleService } = require('@Init/appInitializer.js');
        const viewLifecycleService = getViewLifecycleService();
        viewLifecycleService?.toggleViewVisibility(viewId);
    }, []);

    // =========================================================================
    // CONTEXT MENU ACTION CALLBACKS
    // =========================================================================

    const handleStarWorkspace = useCallback((viewId) => {
        const viewManager = getViewConfigurationManager();
        const view = viewManager?.getView(viewId);
        if (!view) return;

        // Toggle starred workspace status
        const newValue = !view.starredWorkspace;
        view.starredWorkspace = newValue;
        view.updatedAt = Date.now();

        // Sync to server (triggers internal _syncToServer)
        viewManager._syncToServer?.(view);
        viewManager._emit?.('viewUpdated', view);

        toast.success(newValue ? 'Added to workspace favorites' : 'Removed from workspace favorites');
    }, []);

    const handleStarPersonal = useCallback((viewId) => {
        const viewManager = getViewConfigurationManager();
        const view = viewManager?.getView(viewId);
        if (!view) return;

        // Toggle starred personal status
        const newValue = !view.starredPersonal;
        view.starredPersonal = newValue;
        view.updatedAt = Date.now();

        viewManager._syncToServer?.(view);
        viewManager._emit?.('viewUpdated', view);

        toast.success(newValue ? 'Added to personal favorites' : 'Removed from personal favorites');
    }, []);

    const handleSaveState = useCallback((viewId) => {
        const viewManager = getViewConfigurationManager();
        if (!viewManager) return;

        try {
            const snapshot = viewManager.createSnapshot(viewId, {
                name: `State ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                description: 'Quick save from views panel',
            });

            if (snapshot) {
                toast.success('View state saved');
            } else {
                toast.error('Failed to save view state');
            }
        } catch (error) {
            console.error('Save state error:', error);
            toast.error('Failed to save view state');
        }
    }, []);

    const handleLoadState = useCallback((viewId) => {
        // Dispatch event to show snapshot picker modal
        window.dispatchEvent(new CustomEvent('cia:show-snapshot-picker', {
            detail: { viewId },
        }));
    }, []);

    const handleShare = useCallback((viewId) => {
        // Dispatch event to show share modal
        window.dispatchEvent(new CustomEvent('cia:show-share-modal', {
            detail: { viewId },
        }));
    }, []);

    const handleDuplicate = useCallback(async (viewId) => {
        const viewManager = getViewConfigurationManager();
        const canvasManager = getCanvasManager();
        if (!viewManager) return;

        try {
            // Duplicate the view configuration
            const newView = await viewManager.duplicateView(viewId);

            if (newView) {
                // Find an empty cell on the canvas
                const emptyCell = canvasManager?.findFirstEmptyCell();
                if (emptyCell && canvasManager) {
                    // Create placement for the new view
                    canvasManager.createPlacement(
                        newView.id,
                        emptyCell.row,
                        emptyCell.col,
                        1, // rowSpan
                        1  // colSpan
                    );
                    toast.success(`View duplicated to row ${emptyCell.row + 1}, col ${emptyCell.col + 1}`);
                } else {
                    toast.success('View duplicated (place from Datasets panel)');
                }
            }
        } catch (error) {
            console.error('Duplicate view error:', error);
            toast.error('Failed to duplicate view');
        }
    }, []);

    const handleLock = useCallback((viewId) => {
        const viewManager = getViewConfigurationManager();
        const view = viewManager?.getView(viewId);
        if (!view) return;

        // Toggle locked status
        const newValue = !view.isLocked;
        view.isLocked = newValue;
        view.updatedAt = Date.now();

        viewManager._syncToServer?.(view);
        viewManager._emit?.('viewUpdated', view);

        toast.success(newValue ? 'View locked' : 'View unlocked');
    }, []);

    // =========================================================================
    // RENDER
    // =========================================================================

    // Empty state
    if (!cells || cells.length === 0) {
        return (
            <div className="views-subtab views-subtab--empty">
                <div className="views-subtab__empty">
                    <Icon name="layers" size={24} />
                    <p>No views on canvas</p>
                    <p className="views-subtab__empty-hint">
                        Drag a dataset to the canvas to create a view
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="views-subtab">
            {/* Search */}
            <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search views..."
            />

            {/* Filters */}
            <div className="views-subtab__filters">
                <Icon name="filter" size={10} className="views-subtab__filter-icon" />
                <ChipGroup
                    chips={VIEW_FILTERS}
                    activeChips={activeFilters}
                    onToggle={(id) => {
                        if (toggleFilter) {
                            toggleFilter(id);
                        } else {
                            setLocalActiveFilters(prev =>
                                prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
                            );
                        }
                    }}
                    size="sm"
                />
                <LabeledButton
                    icon="database"
                    label="Group"
                    onClick={() => setGroupByDataset?.(!groupByDataset)}
                    active={groupByDataset}
                    size="xs"
                    variant="ghost"
                    className="views-subtab__group-btn"
                />
                {activeFilters.length > 0 && (
                    <LabeledButton
                        label="Clear"
                        onClick={() => setLocalActiveFilters([])}
                        size="xs"
                        variant="ghost"
                        className="views-subtab__clear-btn"
                    />
                )}
            </div>

            {/* View count */}
            <div className="views-subtab__count">
                {finalFilteredCells.length} of {cells.length} view{cells.length !== 1 ? 's' : ''}
            </div>

            {/* View list */}
            <div className="views-subtab__list">
                {groupedCells.map(group => (
                    <div key={group.key} className="views-subtab__group">
                        {/* Group header - only show when grouping by dataset */}
                        {groupByDataset && (
                            <div
                                className="views-subtab__group-header"
                                onClick={() => toggleGroup(group.key)}
                            >
                                <IconButton
                                    icon={collapsedGroups.has(group.key) ? 'chevronRight' : 'chevronDown'}
                                    size="xs"
                                    variant="ghost"
                                    className="views-subtab__group-toggle"
                                />
                                <Icon name="database" size={10} className="views-subtab__group-icon" />
                                <span className="views-subtab__group-name">{group.name}</span>
                                <span className="views-subtab__group-count">
                                    ({group.cells.length})
                                </span>
                            </div>
                        )}

                        {/* Group items - ViewItem components */}
                        {!collapsedGroups.has(group.key) && (
                            <div className="views-subtab__group-items">
                                {group.cells.map((cell) => {
                                    const colorIndex = cellColorMap.get(cell.id) || 0;
                                    const view = cellToView(cell, colorIndex);

                                    return (
                                        <ViewItem
                                            key={cell.id}
                                            view={view}
                                            isActive={expandedViewId === cell.id}
                                            isSelected={false}
                                            isDragging={false}
                                            onSelect={handleSelect}
                                            onClose={handleClose}
                                            onTrash={handleClose}
                                            onNavigate={handleNavigate}
                                            onSizeChange={handleSizeChange}
                                            onFocus={handleFocus}
                                            onVisibilityToggle={handleVisibilityToggle}
                                            // These pass through to ViewItem's internal handling
                                            onDragStart={(e, id) => {
                                                e.dataTransfer.setData('application/json', JSON.stringify({
                                                    type: 'view-item',
                                                    viewId: view.id,
                                                    placementId: cell.id,
                                                    viewConfigId: cell.viewConfigurationId,
                                                    name: view.name,
                                                    row: view.row,
                                                    col: view.col,
                                                    rowSpan: view.rowSpan,
                                                    colSpan: view.colSpan,
                                                }));
                                            }}
                                            // Context menu actions
                                            onStarWorkspace={() => handleStarWorkspace(view.id)}
                                            onStarPersonal={() => handleStarPersonal(view.id)}
                                            onSaveState={() => handleSaveState(view.id)}
                                            onLoadState={() => handleLoadState(view.id)}
                                            onShare={() => handleShare(view.id)}
                                            onDuplicate={() => handleDuplicate(view.id)}
                                            onLock={() => handleLock(view.id)}
                                            className="views-subtab__view-item"
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}

                {/* No results after filtering */}
                {finalFilteredCells.length === 0 && cells.length > 0 && (
                    <div className="views-subtab__no-results">
                        <p>No views match your filters</p>
                        <LabeledButton
                            label="Clear filters"
                            onClick={() => {
                                setSearchQuery('');
                                setLocalActiveFilters([]);
                            }}
                            size="sm"
                            variant="ghost"
                            className="views-subtab__clear-filters-btn"
                        />
                    </div>
                )}
            </div>
        </div>
    );
});

export default ViewsSubtab;