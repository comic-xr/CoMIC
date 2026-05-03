/**
 * @file ViewContextBlock.jsx
 * @description View context block for the secondary footer.
 * Handles view mode toggle, active view selection, and mode-specific context.
 *
 * Layout:
 * Row 1: [Mode Toggle] | [Active View Selector (flex)] | [Quick Actions]
 * Row 2: [Mode Indicator] | [Contextual Info based on mode]
 *
 * @example
 * <ViewContextBlock
 *   viewMode="normal"
 *   onModeChange={handleModeChange}
 *   activeView={activeView}
 *   onCanvasViews={canvasViews}
 *   availableViews={availableViews}
 *   onSelectView={handleSelectView}
 * />
 */

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@UI/react/components/atoms/Icon';
import { IconButton } from '@UI/react/components/atoms/Button';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { formatGridPosition } from '@UI/react/utils/gridPosition.js';
import './ViewContextBlock.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const VIEW_MODES = [
    { id: 'normal', icon: 'grid', color: 'var(--color-accent-blue)', label: 'Normal' },
    { id: 'focus', icon: 'focus', color: 'var(--color-accent-amber)', label: 'Focus' },
    { id: 'subset', icon: 'compare', color: 'var(--color-accent-purple)', label: 'Subset' },
];

const VIEW_TYPE_ICONS = {
    volume: 'cube',
    slice: 'slice',
    chart: 'chart',
    points: 'scatterChart',
    mesh: 'box',
    '3d': 'box',
    default: 'eye',
};

const SORT_OPTIONS = [
    { id: 'name', label: 'Name A→Z' },
    { id: 'name-desc', label: 'Name Z→A' },
    { id: 'type', label: 'By Type' },
    { id: 'position', label: 'By Position' },
];

// Smart linking: some link types require same dataset, others work across any views
const LINK_TYPES = [
    {
        id: 'camera',
        icon: 'camera',
        label: 'Camera',
        color: 'var(--color-accent-teal)',
        requiresSameDataset: false, // Camera sync works across any views
        description: 'Sync view position and rotation',
    },
    {
        id: 'filters',
        icon: 'filter',
        label: 'Filters',
        color: 'var(--color-accent-amber)',
        requiresSameDataset: true, // Filters are data-specific
        description: 'Sync filter criteria',
    },
    {
        id: 'cursors',
        icon: 'crosshair',
        label: 'Cursors',
        color: 'var(--color-accent-purple)',
        requiresSameDataset: true, // Cursor position on data points
        description: 'Sync cursor/selection position',
    },
    {
        id: 'widgets',
        icon: 'ruler',
        label: 'Widgets',
        color: 'var(--color-accent-pink)',
        requiresSameDataset: true, // Measurements are data-bound
        description: 'Sync measurement widgets',
    },
    {
        id: 'colorMaps',
        icon: 'palette',
        label: 'Colors',
        color: 'var(--color-accent-cyan)',
        requiresSameDataset: true, // Color mapping is data-specific
        description: 'Sync color schemes',
    },
    {
        id: 'annotationDisplay',
        icon: 'edit',
        label: 'Annotations',
        color: 'var(--color-accent-orange)',
        requiresSameDataset: true, // Annotations are typically data-bound
        description: 'Sync annotation visibility',
    },
];

// Link direction modes matching LINK_MODES from ViewConfiguration
const LINK_DIRECTIONS = [
    { id: 'follow', icon: '←', label: 'Follow', description: 'Receive updates from target' },
    { id: 'bidirectional', icon: '↔', label: 'Sync', description: 'Two-way synchronization' },
    { id: 'broadcast', icon: '→', label: 'Broadcast', description: 'Push updates to target' },
];

const DIRECTION_LABELS = {
    follow: { icon: '←', label: 'Following' },
    bidirectional: { icon: '↔', label: 'Synced' },
    broadcast: { icon: '→', label: 'Broadcasting' },
};

// =============================================================================
// VIEW HUB FLYOUT
// =============================================================================

const ViewHubFlyout = memo(function ViewHubFlyout({
    views,
    available,
    activeView,
    isSubset,
    onSelect,
    onAction,
    onClose,
}) {
    const [search, setSearch] = useState('');
    const [typeFilters, setTypeFilters] = useState([]);
    const [sortBy, setSortBy] = useState('name');
    const [showFilters, setShowFilters] = useState(false);
    const [showSortMenu, setShowSortMenu] = useState(false);

    // Get all unique types from both lists
    const allTypes = useMemo(() => {
        const types = new Set([...views, ...available].map((v) => v.type).filter(Boolean));
        return Array.from(types);
    }, [views, available]);

    // Toggle type filter
    const toggleTypeFilter = useCallback((type) => {
        setTypeFilters((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
        );
    }, []);

    // Filter views by search and type
    const filterViews = useCallback(
        (arr) =>
            arr.filter((v) => {
                const matchesSearch =
                    !search || v.name?.toLowerCase().includes(search.toLowerCase());
                const matchesType = typeFilters.length === 0 || typeFilters.includes(v.type);
                return matchesSearch && matchesType;
            }),
        [search, typeFilters]
    );

    // Sort views
    const sortViews = useCallback(
        (arr) =>
            [...arr].sort((a, b) => {
                switch (sortBy) {
                    case 'name':
                        return (a.name || '').localeCompare(b.name || '');
                    case 'name-desc':
                        return (b.name || '').localeCompare(a.name || '');
                    case 'type':
                        return (a.type || '').localeCompare(b.type || '');
                    case 'position':
                        return (
                            ((a.position?.row || 0) * 10 + (a.position?.col || 0)) -
                            ((b.position?.row || 0) * 10 + (b.position?.col || 0))
                        );
                    default:
                        return 0;
                }
            }),
        [sortBy]
    );

    const filtered = sortViews(filterViews(views));
    const filteredAvail = sortViews(filterViews(available));
    const hasActiveFilters = typeFilters.length > 0 || search;

    const handleClearFilters = useCallback(() => {
        setTypeFilters([]);
        setSearch('');
    }, []);

    return (
        <div className="view-hub-flyout">
            {/* Subset mode header */}
            {isSubset && (
                <div className="view-hub-flyout__subset-header">
                    <Icon name="layers" size={12} />
                    <div className="view-hub-flyout__subset-info">
                        <span className="view-hub-flyout__subset-label">Subset Mode Active</span>
                        <span className="view-hub-flyout__subset-count">
                            Showing {views.length} views in subset
                        </span>
                    </div>
                </div>
            )}

            {/* Search + Filter + Sort */}
            <div className="view-hub-flyout__toolbar">
                <SearchInput
                    className="view-hub-flyout__search"
                    value={search}
                    onChange={setSearch}
                    placeholder="Search views..."
                    size="sm"
                    autoFocus
                />

                <button
                    type="button"
                    className={`view-hub-flyout__filter-btn ${showFilters || typeFilters.length > 0 ? 'view-hub-flyout__filter-btn--active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Icon name="filter" size={12} />
                    {typeFilters.length > 0 && (
                        <span className="view-hub-flyout__filter-badge">{typeFilters.length}</span>
                    )}
                </button>

                <div className="view-hub-flyout__sort-wrapper">
                    <button
                        type="button"
                        className={`view-hub-flyout__sort-btn ${showSortMenu ? 'view-hub-flyout__sort-btn--active' : ''}`}
                        onClick={() => setShowSortMenu(!showSortMenu)}
                    >
                        <Icon name="arrowUpDown" size={12} />
                    </button>
                    {showSortMenu && (
                        <div className="view-hub-flyout__sort-menu">
                            <div className="view-hub-flyout__sort-header">Sort by</div>
                            {SORT_OPTIONS.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    className={`view-hub-flyout__sort-option ${sortBy === option.id ? 'view-hub-flyout__sort-option--active' : ''}`}
                                    onClick={() => {
                                        setSortBy(option.id);
                                        setShowSortMenu(false);
                                    }}
                                >
                                    <span className="view-hub-flyout__sort-check">
                                        {sortBy === option.id && <Icon name="check" size={10} />}
                                    </span>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Type filters */}
            {showFilters && allTypes.length > 0 && (
                <div className="view-hub-flyout__type-filters">
                    {allTypes.map((type) => (
                        <button
                            key={type}
                            type="button"
                            className={`view-hub-flyout__type-pill ${typeFilters.includes(type) ? 'view-hub-flyout__type-pill--active' : ''}`}
                            onClick={() => toggleTypeFilter(type)}
                        >
                            <Icon name={VIEW_TYPE_ICONS[type] || VIEW_TYPE_ICONS.default} size={10} />
                            {type}
                        </button>
                    ))}
                    {typeFilters.length > 0 && (
                        <button
                            type="button"
                            className="view-hub-flyout__type-clear"
                            onClick={() => setTypeFilters([])}
                        >
                            Clear
                        </button>
                    )}
                </div>
            )}

            {/* View lists */}
            <div className="view-hub-flyout__list">
                {/* On Canvas section */}
                <div className="view-hub-flyout__section">
                    <div className="view-hub-flyout__section-header">
                        <span>
                            {isSubset ? 'In Subset' : 'On Canvas'} ({filtered.length}
                            {hasActiveFilters && ` of ${views.length}`})
                        </span>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                className="view-hub-flyout__clear-filters"
                                onClick={handleClearFilters}
                            >
                                Clear filters
                            </button>
                        )}
                    </div>

                    <div className="view-hub-flyout__section-items">
                        {filtered.length === 0 ? (
                            <div className="view-hub-flyout__empty">
                                {hasActiveFilters ? 'No views match filters' : 'No views on canvas'}
                            </div>
                        ) : (
                            filtered.map((v) => {
                                const isActive = activeView?.id === v.id;
                                return (
                                    <button
                                        key={v.id}
                                        type="button"
                                        className={`view-hub-flyout__item ${isActive ? 'view-hub-flyout__item--active' : ''}`}
                                        onClick={() => {
                                            onSelect(v);
                                            onClose();
                                        }}
                                    >
                                        <span
                                            className="view-hub-flyout__item-dot"
                                            style={{ background: v.color }}
                                        />
                                        <div className="view-hub-flyout__item-info">
                                            <div className="view-hub-flyout__item-name">{v.name}</div>
                                            <div className="view-hub-flyout__item-meta">
                                                <Icon
                                                    name={VIEW_TYPE_ICONS[v.type] || VIEW_TYPE_ICONS.default}
                                                    size={10}
                                                />
                                                <span>{v.type}</span>
                                                {v.position && (
                                                    <span className="view-hub-flyout__item-position">
                                                        {formatGridPosition(v.position.col, v.position.row)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Show close button for all views except in subset mode */}
                                        {!isSubset && (
                                            <button
                                                type="button"
                                                className="view-hub-flyout__item-remove"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onAction?.('remove', v);
                                                }}
                                                title="Remove from canvas"
                                            >
                                                <Icon name="close" size={10} />
                                            </button>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Available section - Always show in normal mode */}
                {!isSubset && (
                    <div className="view-hub-flyout__section view-hub-flyout__section--available">
                        <div className="view-hub-flyout__section-header">
                            <span>Available ({filteredAvail.length})</span>
                            <button
                                type="button"
                                className="view-hub-flyout__new-view"
                                onClick={() => onAction?.('create', null)}
                            >
                                <Icon name="add" size={10} /> New View
                            </button>
                        </div>
                        <div className="view-hub-flyout__section-items">
                            {filteredAvail.length === 0 ? (
                                <div className="view-hub-flyout__empty">
                                    {hasActiveFilters ? 'No views match filters' : 'No available views'}
                                </div>
                            ) : (
                                filteredAvail.map((v) => (
                                    <button
                                        key={v.id}
                                        type="button"
                                        className="view-hub-flyout__item view-hub-flyout__item--available"
                                        onClick={() => {
                                            onAction?.('place', v);
                                            onSelect(v);
                                            onClose();
                                        }}
                                    >
                                        <span
                                            className="view-hub-flyout__item-dot"
                                            style={{ background: v.color }}
                                        />
                                        <div className="view-hub-flyout__item-info">
                                            <div className="view-hub-flyout__item-name">{v.name}</div>
                                            <div className="view-hub-flyout__item-meta">
                                                <Icon
                                                    name={VIEW_TYPE_ICONS[v.type] || VIEW_TYPE_ICONS.default}
                                                    size={10}
                                                />
                                                <span>{v.type}</span>
                                            </div>
                                        </div>
                                        <span className="view-hub-flyout__item-add">
                                            <Icon name="add" size={10} /> Place
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

// =============================================================================
// SUBSET PICKER DROPDOWN
// =============================================================================

const SubsetPickerDropdown = memo(function SubsetPickerDropdown({
    views,
    selectedIds,
    onToggle,
    onClose,
}) {
    // Select all views
    const handleSelectAll = useCallback(() => {
        views.forEach((view) => {
            if (!selectedIds.includes(view.id)) {
                onToggle(view.id);
            }
        });
    }, [views, selectedIds, onToggle]);

    // Clear all except first (keep at least one)
    const handleClear = useCallback(() => {
        if (selectedIds.length <= 1) return;
        const firstId = selectedIds[0];
        selectedIds.forEach((id) => {
            if (id !== firstId) {
                onToggle(id);
            }
        });
    }, [selectedIds, onToggle]);

    return (
        <div className="subset-picker-dropdown">
            {/* Header */}
            <div className="subset-picker-dropdown__header">
                <div className="subset-picker-dropdown__title">Select Subset Views</div>
                <span className="subset-picker-dropdown__count">{selectedIds.length} selected</span>
            </div>

            {/* View list */}
            <div className="subset-picker-dropdown__list">
                {views.length === 0 ? (
                    <div className="subset-picker-dropdown__empty">No views on canvas</div>
                ) : (
                    views.map((view) => {
                        const isSelected = selectedIds.includes(view.id);
                        return (
                            <button
                                key={view.id}
                                type="button"
                                className={`subset-picker-dropdown__item ${isSelected ? 'subset-picker-dropdown__item--selected' : ''}`}
                                onClick={() => onToggle(view.id)}
                            >
                                {/* Checkbox */}
                                <span
                                    className={`subset-picker-dropdown__checkbox ${isSelected ? 'subset-picker-dropdown__checkbox--checked' : ''}`}
                                >
                                    {isSelected && <Icon name="check" size={12} />}
                                </span>

                                {/* Color dot */}
                                <span
                                    className="subset-picker-dropdown__dot"
                                    style={{ background: view.color }}
                                />

                                {/* View info */}
                                <div className="subset-picker-dropdown__info">
                                    <div className="subset-picker-dropdown__name">{view.name}</div>
                                    <div className="subset-picker-dropdown__meta">
                                        <Icon
                                            name={VIEW_TYPE_ICONS[view.type] || VIEW_TYPE_ICONS.default}
                                            size={10}
                                        />
                                        <span>{view.type}</span>
                                        {view.position && (
                                            <span className="subset-picker-dropdown__position">
                                                {formatGridPosition(view.position.col, view.position.row)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div className="subset-picker-dropdown__footer">
                <span className="subset-picker-dropdown__footer-count">
                    {selectedIds.length} of {views.length} in subset
                </span>
                <div className="subset-picker-dropdown__footer-actions">
                    <button
                        type="button"
                        className="subset-picker-dropdown__footer-btn subset-picker-dropdown__footer-btn--select"
                        onClick={handleSelectAll}
                        disabled={selectedIds.length === views.length}
                    >
                        Select All
                    </button>
                    <button
                        type="button"
                        className="subset-picker-dropdown__footer-btn subset-picker-dropdown__footer-btn--clear"
                        onClick={handleClear}
                        disabled={selectedIds.length <= 1}
                    >
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
});

// =============================================================================
// SYNC PANEL (Floating menu for view syncing)
// =============================================================================

const SORT_OPTIONS_SYNC = [
    { id: 'name', label: 'Name A→Z' },
    { id: 'name-desc', label: 'Name Z→A' },
    { id: 'dataset', label: 'Same dataset first' },
    { id: 'type', label: 'By type' },
];

const LinksDropdown = memo(function LinksDropdown({
    activeView,
    allViews,
    onUpdateLink,
    onClose,
    onSelectView,
    triggerRef,
}) {
    const [selectedProperty, setSelectedProperty] = useState('camera');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('dataset');
    const [showViewPicker, setShowViewPicker] = useState(false);
    const [viewPickerSearch, setViewPickerSearch] = useState('');
    const [viewPickerTypeFilter, setViewPickerTypeFilter] = useState(null);
    const [selectedDirection, setSelectedDirection] = useState('bidirectional');
    const dropdownRef = useRef(null);
    const searchRef = useRef(null);
    const viewPickerSearchRef = useRef(null);

    // Draggable position state
    const [position, setPosition] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const positionStartRef = useRef({ x: 0, y: 0 });

    // Calculate initial position - anchor to top-right area of screen
    const getInitialPosition = useCallback(() => {
        const panelWidth = 380;
        const panelHeight = 420;
        const padding = 16;

        let left = window.innerWidth - panelWidth - padding;
        let top = padding + 60;

        if (left < padding) left = padding;
        if (top + panelHeight > window.innerHeight - padding) {
            top = window.innerHeight - panelHeight - padding;
        }

        return { top, left };
    }, []);

    // Initialize position on mount
    useEffect(() => {
        if (!position) {
            setPosition(getInitialPosition());
        }
    }, [position, getInitialPosition]);

    const pos = position || getInitialPosition();

    // Drag handlers
    const handleDragStart = useCallback((e) => {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) {
            return; // Don't drag when clicking interactive elements
        }
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        positionStartRef.current = { x: pos.left, y: pos.top };
    }, [pos]);

    const handleDragMove = useCallback((e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        const panelWidth = 380;
        const panelHeight = 420;
        const padding = 8;

        let newLeft = positionStartRef.current.x + deltaX;
        let newTop = positionStartRef.current.y + deltaY;

        // Constrain to viewport
        newLeft = Math.max(padding, Math.min(window.innerWidth - panelWidth - padding, newLeft));
        newTop = Math.max(padding, Math.min(window.innerHeight - panelHeight - padding, newTop));

        setPosition({ top: newTop, left: newLeft });
    }, [isDragging]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Global mouse events for dragging
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
            return () => {
                document.removeEventListener('mousemove', handleDragMove);
                document.removeEventListener('mouseup', handleDragEnd);
            };
        }
    }, [isDragging, handleDragMove, handleDragEnd]);

    // Focus view picker search when opened
    useEffect(() => {
        if (showViewPicker && viewPickerSearchRef.current) {
            viewPickerSearchRef.current.focus();
        }
    }, [showViewPicker]);

    const links = activeView?.links || {};
    const otherViews = allViews.filter((v) => v.id !== activeView?.id);

    // Get current link type config
    const currentLinkType = LINK_TYPES.find(lt => lt.id === selectedProperty) || LINK_TYPES[0];

    // Check if view shares dataset with active view
    const viewSharesDataset = useCallback((view) => {
        if (!activeView?.datasetId || !view?.datasetId) return false;
        return activeView.datasetId === view.datasetId;
    }, [activeView?.datasetId]);

    // Get synced view IDs for current property
    const syncedViewIds = useMemo(() => {
        return links[selectedProperty]?.targets || [];
    }, [links, selectedProperty]);

    // Get synced views
    const syncedViews = useMemo(() => {
        return syncedViewIds.map(id => allViews.find(v => v.id === id)).filter(Boolean);
    }, [syncedViewIds, allViews]);

    // Filter and sort available views
    const availableViews = useMemo(() => {
        let views = otherViews.filter(v => !syncedViewIds.includes(v.id));

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            views = views.filter(v =>
                v.name?.toLowerCase().includes(query) ||
                v.datasetName?.toLowerCase().includes(query) ||
                v.type?.toLowerCase().includes(query)
            );
        }

        // Check compatibility (same dataset requirement)
        const isCompatible = (v) => !currentLinkType.requiresSameDataset || viewSharesDataset(v);

        // Sort views
        views.sort((a, b) => {
            // Incompatible views always go to bottom
            const aCompat = isCompatible(a);
            const bCompat = isCompatible(b);
            if (aCompat !== bCompat) return bCompat ? 1 : -1;

            switch (sortBy) {
                case 'name':
                    return (a.name || '').localeCompare(b.name || '');
                case 'name-desc':
                    return (b.name || '').localeCompare(a.name || '');
                case 'dataset':
                    const aShares = viewSharesDataset(a);
                    const bShares = viewSharesDataset(b);
                    if (aShares !== bShares) return bShares ? 1 : -1;
                    return (a.name || '').localeCompare(b.name || '');
                case 'type':
                    return (a.type || '').localeCompare(b.type || '');
                default:
                    return 0;
            }
        });

        return views.map(v => ({
            ...v,
            isCompatible: isCompatible(v),
        }));
    }, [otherViews, syncedViewIds, searchQuery, sortBy, currentLinkType, viewSharesDataset]);

    // Handle adding a view to sync group
    const handleAddToSync = useCallback((viewId) => {
        onUpdateLink?.(selectedProperty, viewId, selectedDirection);
    }, [onUpdateLink, selectedProperty, selectedDirection]);

    // Handle removing from sync group (leave group)
    const handleLeaveSync = useCallback(() => {
        onUpdateLink?.(selectedProperty, null, null);
    }, [onUpdateLink, selectedProperty]);

    // Handle switching the active view
    const handleSwitchView = useCallback((view) => {
        onSelectView?.(view);
        setShowViewPicker(false);
        setViewPickerSearch('');
    }, [onSelectView]);

    // Count synced properties
    const syncedPropertyCount = useMemo(() => {
        return LINK_TYPES.filter(lt => (links[lt.id]?.targets?.length || 0) > 0).length;
    }, [links]);

    // Get all unique types for the view picker filter
    const viewPickerTypes = useMemo(() => {
        const types = new Set(allViews.map(v => v.type).filter(Boolean));
        return Array.from(types).sort();
    }, [allViews]);

    // Get sync info for each view (which properties are synced)
    const viewSyncInfo = useMemo(() => {
        const syncMap = new Map();
        LINK_TYPES.forEach(lt => {
            const targets = links[lt.id]?.targets || [];
            targets.forEach(targetId => {
                if (!syncMap.has(targetId)) {
                    syncMap.set(targetId, []);
                }
                syncMap.get(targetId).push(lt);
            });
        });
        return syncMap;
    }, [links]);

    // Filter views for the view picker
    const filteredPickerViews = useMemo(() => {
        let views = allViews;

        // Apply type filter
        if (viewPickerTypeFilter) {
            views = views.filter(v => v.type === viewPickerTypeFilter);
        }

        // Apply search filter
        if (viewPickerSearch) {
            const query = viewPickerSearch.toLowerCase();
            views = views.filter(v =>
                v.name?.toLowerCase().includes(query) ||
                v.datasetName?.toLowerCase().includes(query) ||
                v.type?.toLowerCase().includes(query)
            );
        }

        return views;
    }, [allViews, viewPickerSearch, viewPickerTypeFilter]);

    return createPortal(
        <div
            ref={dropdownRef}
            className={`sync-panel ${isDragging ? 'sync-panel--dragging' : ''}`}
            style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                zIndex: 99999,
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Draggable Header with Instance Card and View Picker */}
            <div
                className="sync-panel__instance-header"
                onMouseDown={handleDragStart}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
                <div className="sync-panel__drag-handle" title="Drag to move">
                    <Icon name="gripVertical" size={12} />
                </div>
                <button
                    className="sync-panel__instance-card"
                    onClick={() => setShowViewPicker(!showViewPicker)}
                    style={{ '--instance-color': activeView?.color || '#60a5fa' }}
                >
                    <div className="sync-panel__instance-info">
                        <span className="sync-panel__instance-name">{activeView?.name || 'No view'}</span>
                        <span className="sync-panel__instance-meta">
                            {activeView?.type && <span>{activeView.type}</span>}
                            {activeView?.datasetName && <span>{activeView.datasetName}</span>}
                        </span>
                    </div>
                    {syncedPropertyCount > 0 && (
                        <span className="sync-panel__instance-badge">{syncedPropertyCount} synced</span>
                    )}
                    <Icon name="chevronDown" size={12} className={`sync-panel__instance-chevron ${showViewPicker ? 'sync-panel__instance-chevron--open' : ''}`} />
                </button>
                <button className="sync-panel__close" onClick={onClose} title="Close">
                    <Icon name="close" size={14} />
                </button>

                {/* View Picker Dropdown */}
                {showViewPicker && (
                    <div className="sync-panel__view-picker">
                        <SearchInput
                            ref={viewPickerSearchRef}
                            className="sync-panel__view-picker-search"
                            value={viewPickerSearch}
                            onChange={setViewPickerSearch}
                            placeholder="Search views..."
                            size="sm"
                        />
                        {/* Type filters */}
                        {viewPickerTypes.length > 1 && (
                            <div className="sync-panel__view-picker-filters">
                                <button
                                    className={`sync-panel__view-picker-filter ${!viewPickerTypeFilter ? 'sync-panel__view-picker-filter--active' : ''}`}
                                    onClick={() => setViewPickerTypeFilter(null)}
                                >
                                    All
                                </button>
                                {viewPickerTypes.map((type) => (
                                    <button
                                        key={type}
                                        className={`sync-panel__view-picker-filter ${viewPickerTypeFilter === type ? 'sync-panel__view-picker-filter--active' : ''}`}
                                        onClick={() => setViewPickerTypeFilter(viewPickerTypeFilter === type ? null : type)}
                                    >
                                        <Icon name={VIEW_TYPE_ICONS[type] || VIEW_TYPE_ICONS.default} size={10} />
                                        {type}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="sync-panel__view-picker-list">
                            {filteredPickerViews.length === 0 ? (
                                <div className="sync-panel__view-picker-empty">No views match</div>
                            ) : (
                                filteredPickerViews.map((view) => {
                                    const syncedProps = viewSyncInfo.get(view.id) || [];
                                    const isSynced = syncedProps.length > 0;
                                    return (
                                        <button
                                            key={view.id}
                                            className={`sync-panel__view-picker-item ${view.id === activeView?.id ? 'sync-panel__view-picker-item--active' : ''} ${isSynced ? 'sync-panel__view-picker-item--synced' : ''}`}
                                            onClick={() => handleSwitchView(view)}
                                        >
                                            <span className="sync-panel__view-dot" style={{ background: view.color }} />
                                            <div className="sync-panel__view-picker-info">
                                                <span className="sync-panel__view-name">{view.name}</span>
                                                {view.datasetName && (
                                                    <span className="sync-panel__view-dataset">{view.datasetName}</span>
                                                )}
                                            </div>
                                            {/* Sync indicators - show which properties are linked */}
                                            {isSynced && (
                                                <div className="sync-panel__view-picker-sync-icons">
                                                    {syncedProps.map(prop => (
                                                        <span
                                                            key={prop.id}
                                                            className="sync-panel__view-picker-sync-icon"
                                                            style={{ '--sync-color': prop.color }}
                                                            title={`${prop.label} synced`}
                                                        >
                                                            <Icon name={prop.icon} size={10} />
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {view.id === activeView?.id && <Icon name="check" size={12} />}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="sync-panel__body">
                {/* Left sidebar: Property tabs */}
                <div className="sync-panel__sidebar">
                    <div className="sync-panel__sidebar-label">Sync</div>
                    {LINK_TYPES.map((linkType) => {
                        const hasSynced = (links[linkType.id]?.targets?.length || 0) > 0;
                        const syncCount = links[linkType.id]?.targets?.length || 0;
                        return (
                            <button
                                key={linkType.id}
                                className={`sync-panel__tab ${selectedProperty === linkType.id ? 'sync-panel__tab--active' : ''} ${hasSynced ? 'sync-panel__tab--synced' : ''}`}
                                onClick={() => setSelectedProperty(linkType.id)}
                                style={{ '--tab-color': linkType.color }}
                                title={linkType.description}
                            >
                                <Icon name={linkType.icon} size={14} />
                                <span className="sync-panel__tab-label">{linkType.label}</span>
                                {hasSynced && (
                                    <span className="sync-panel__tab-count">{syncCount}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Right panel: Views */}
                <div className="sync-panel__content">
                    {/* Property description */}
                    <div className="sync-panel__property-info">
                        <Icon name={currentLinkType.icon} size={14} style={{ color: currentLinkType.color }} />
                        <span className="sync-panel__property-name">{currentLinkType.label}</span>
                        {currentLinkType.requiresSameDataset && (
                            <span className="sync-panel__property-note">
                                <Icon name="database" size={10} />
                                Same dataset
                            </span>
                        )}
                    </div>

                    {/* Direction selector */}
                    <div className="sync-panel__direction-row">
                        {LINK_DIRECTIONS.map((dir) => (
                            <button
                                key={dir.id}
                                className={`sync-panel__direction-btn ${selectedDirection === dir.id ? 'sync-panel__direction-btn--active' : ''}`}
                                onClick={() => setSelectedDirection(dir.id)}
                                title={dir.description}
                            >
                                <span className="sync-panel__direction-icon">{dir.icon}</span>
                                <span className="sync-panel__direction-label">{dir.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Synced views section */}
                    {syncedViews.length > 0 && (
                        <div className="sync-panel__section sync-panel__section--synced">
                            <div className="sync-panel__section-header">
                                <span className="sync-panel__section-title">
                                    Synced
                                    <span className="sync-panel__section-direction">
                                        {DIRECTION_LABELS[links[selectedProperty]?.direction]?.icon || '↔'}
                                    </span>
                                </span>
                                <button className="sync-panel__leave-btn" onClick={handleLeaveSync} title="Leave sync group">
                                    <Icon name="linkOff" size={11} />
                                </button>
                            </div>
                            <div className="sync-panel__synced-list">
                                {syncedViews.map((view) => (
                                    <div key={view.id} className="sync-panel__synced-item">
                                        <span className="sync-panel__view-dot" style={{ background: view.color }} />
                                        <span className="sync-panel__view-name">{view.name}</span>
                                        <span className="sync-panel__synced-direction" title={DIRECTION_LABELS[links[selectedProperty]?.direction]?.label || 'Synced'}>
                                            {DIRECTION_LABELS[links[selectedProperty]?.direction]?.icon || '↔'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Search bar */}
                    <div className="sync-panel__toolbar">
                        <SearchInput
                            ref={searchRef}
                            className="sync-panel__search"
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search..."
                            size="sm"
                        />
                        <select
                            className="sync-panel__sort-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            {SORT_OPTIONS_SYNC.map((option) => (
                                <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Available views section */}
                    <div className="sync-panel__available-list">
                        {availableViews.length === 0 ? (
                            <div className="sync-panel__empty">
                                {searchQuery ? 'No matches' : 'No views available'}
                            </div>
                        ) : (
                            availableViews.map((view) => (
                                <button
                                    key={view.id}
                                    className={`sync-panel__view-item ${!view.isCompatible ? 'sync-panel__view-item--disabled' : ''}`}
                                    onClick={() => view.isCompatible && handleAddToSync(view.id)}
                                    disabled={!view.isCompatible}
                                    title={!view.isCompatible ? 'Requires same dataset' : `Sync ${currentLinkType.label.toLowerCase()} with ${view.name}`}
                                >
                                    <span className="sync-panel__view-dot" style={{ background: view.color, opacity: view.isCompatible ? 1 : 0.4 }} />
                                    <div className="sync-panel__view-info">
                                        <span className="sync-panel__view-name">{view.name}</span>
                                        {view.datasetName && (
                                            <span className="sync-panel__view-dataset">{view.datasetName}</span>
                                        )}
                                    </div>
                                    {view.isCompatible ? (
                                        <Icon name="plus" size={14} className="sync-panel__view-add" />
                                    ) : (
                                        <Icon name="alert" size={12} className="sync-panel__view-incompatible" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function ViewContextBlock({
    viewMode = 'normal',
    onModeChange,
    activeView,
    onCanvasViews = [],
    availableViews = [],
    onSelectView,
    onViewAction,
    onUpdateLink,
    subsetIds = [],
    onSubsetChange,
    onSnapshot,
    onDuplicate,
    onOpenSettings,
    className = '',
}) {
    const [showHub, setShowHub] = useState(false);
    const [showLinks, setShowLinks] = useState(false);
    const [showSubset, setShowSubset] = useState(false);
    const hubRef = useRef(null);
    const linksRef = useRef(null);
    const linksBtnRef = useRef(null);
    const subsetRef = useRef(null);

    // Close dropdowns on outside click (but NOT the sync panel - it stays open for VR usability)
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (hubRef.current && !hubRef.current.contains(e.target)) {
                setShowHub(false);
            }
            // Sync panel stays open - user can interact with background and click X to close
            // This is intentional for VR usability
            if (subsetRef.current && !subsetRef.current.contains(e.target)) {
                setShowSubset(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ESC to exit focus mode
    useEffect(() => {
        if (viewMode !== 'focus') return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onModeChange?.('normal');
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, onModeChange]);

    const isSubset = viewMode === 'subset';
    const subsetViews = isSubset
        ? onCanvasViews.filter((v) => subsetIds.includes(v.id))
        : onCanvasViews;

    const currentMode = VIEW_MODES.find((m) => m.id === viewMode) || VIEW_MODES[0];

    const handleViewSelect = useCallback(
        (view) => {
            onSelectView?.(view);
        },
        [onSelectView]
    );

    // Toggle a view in the subset
    const handleSubsetToggle = useCallback(
        (viewId) => {
            const newSubsetIds = subsetIds.includes(viewId)
                ? subsetIds.filter((id) => id !== viewId)
                : [...subsetIds, viewId];
            onSubsetChange?.(newSubsetIds);
        },
        [subsetIds, onSubsetChange]
    );

    // Count active links for badge
    const activeLinkCount = useMemo(() => {
        if (!activeView?.links) return 0;
        return Object.values(activeView.links).filter((link) => link !== null).length;
    }, [activeView?.links]);

    // Quick action handlers
    const handleSnapshot = useCallback(() => {
        if (!activeView) return;
        if (onSnapshot) {
            onSnapshot(activeView);
        } else {
            // Fallback: dispatch event
            window.dispatchEvent(
                new CustomEvent('cia:view-snapshot', {
                    detail: { viewId: activeView.id, view: activeView },
                })
            );
        }
    }, [activeView, onSnapshot]);

    const handleDuplicate = useCallback(() => {
        if (!activeView) return;
        if (onDuplicate) {
            onDuplicate(activeView);
        } else {
            // Fallback: dispatch event
            window.dispatchEvent(
                new CustomEvent('cia:view-duplicate', {
                    detail: { viewId: activeView.id, view: activeView },
                })
            );
        }
    }, [activeView, onDuplicate]);

    const handleOpenSettings = useCallback(() => {
        if (!activeView) return;
        if (onOpenSettings) {
            onOpenSettings(activeView);
        } else {
            // Fallback: dispatch event
            window.dispatchEvent(
                new CustomEvent('cia:view-settings', {
                    detail: { viewId: activeView.id, view: activeView },
                })
            );
        }
    }, [activeView, onOpenSettings]);

    // Views available for linking (same as subset views for consistency)
    const viewsForLinks = isSubset ? subsetViews : onCanvasViews;

    return (
        <div className={`view-context-block ${className}`}>
            {/* Column-based layout for vertical alignment */}

            {/* Mode Column: Toggle + Indicator */}
            <div className="view-context-block__column view-context-block__column--mode">
                <div className="view-context-block__mode-toggle">
                    {VIEW_MODES.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            className={`view-context-block__mode-btn ${viewMode === m.id ? 'view-context-block__mode-btn--active' : ''}`}
                            style={{ '--mode-color': m.color }}
                            onClick={() => onModeChange?.(m.id)}
                            title={m.label}
                        >
                            <Icon name={m.icon} size={12} />
                        </button>
                    ))}
                </div>
                <div
                    className="view-context-block__mode-indicator"
                    style={{ '--mode-color': currentMode.color }}
                >
                    <Icon name={currentMode.icon} size={10} />
                    <span>
                        {viewMode === 'normal' && 'All Views'}
                        {viewMode === 'focus' && 'Focus'}
                        {viewMode === 'subset' && 'Compare'}
                    </span>
                </div>
            </div>

            <div className="view-context-block__divider view-context-block__divider--full" />

            {/* View Column: Selector + Context Info */}
            <div className="view-context-block__column view-context-block__column--view">
                <div ref={hubRef} className="view-context-block__view-selector">
                    <button
                        type="button"
                        className={`view-context-block__view-btn ${showHub ? 'view-context-block__view-btn--open' : ''}`}
                        style={{ '--view-color': currentMode.color }}
                        onClick={() => setShowHub(!showHub)}
                    >
                        <span
                            className="view-context-block__view-dot"
                            style={{ background: activeView?.color || 'var(--color-text-muted)' }}
                        />
                        <div className="view-context-block__view-info">
                            <div className="view-context-block__view-label">Active View</div>
                            <div className="view-context-block__view-name">
                                {activeView?.name || 'Select view...'}
                            </div>
                        </div>
                        {activeView?.type && (
                            <Icon
                                name={VIEW_TYPE_ICONS[activeView.type] || VIEW_TYPE_ICONS.default}
                                size={12}
                                className="view-context-block__view-type-icon"
                            />
                        )}
                        <Icon
                            name={showHub ? 'chevronUp' : 'chevronDown'}
                            size={10}
                            className="view-context-block__view-chevron"
                        />
                    </button>

                    {showHub && (
                        <ViewHubFlyout
                            views={subsetViews}
                            available={isSubset ? [] : availableViews}
                            activeView={activeView}
                            isSubset={isSubset}
                            onSelect={handleViewSelect}
                            onAction={onViewAction}
                            onClose={() => setShowHub(false)}
                        />
                    )}
                </div>

                {/* Contextual content below view selector */}
                <div className="view-context-block__context-content">
                    {viewMode === 'normal' && (
                        <div className="view-context-block__normal-info">
                            {activeView?.position && (
                                <span className="view-context-block__position">
                                    {formatGridPosition(activeView.position.col, activeView.position.row)}
                                </span>
                            )}
                            <span className="view-context-block__view-count">
                                {onCanvasViews.length} views on canvas
                            </span>
                        </div>
                    )}

                    {viewMode === 'focus' && (
                        <span className="view-context-block__escape-hint">
                            Press <kbd>Esc</kbd> to exit
                        </span>
                    )}

                    {viewMode === 'subset' && (
                        <div ref={subsetRef} className="view-context-block__subset-wrapper">
                            <button
                                type="button"
                                className={`view-context-block__subset-btn ${showSubset ? 'view-context-block__subset-btn--open' : ''}`}
                                onClick={() => setShowSubset(!showSubset)}
                            >
                                <Icon name="layers" size={10} />
                                <span>{subsetIds.length} in subset</span>
                                <div className="view-context-block__subset-dots">
                                    {subsetViews.slice(0, 4).map((v, i) => (
                                        <span
                                            key={v.id}
                                            className="view-context-block__subset-dot"
                                            style={{ background: v.color, marginLeft: i > 0 ? '-4px' : 0 }}
                                        />
                                    ))}
                                </div>
                                <Icon
                                    name={showSubset ? 'chevronUp' : 'chevronDown'}
                                    size={10}
                                    className="view-context-block__subset-chevron"
                                />
                            </button>

                            {showSubset && (
                                <SubsetPickerDropdown
                                    views={onCanvasViews}
                                    selectedIds={subsetIds}
                                    onToggle={handleSubsetToggle}
                                    onClose={() => setShowSubset(false)}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="view-context-block__divider view-context-block__divider--full" />

            {/* Links Column */}
            <div className="view-context-block__column view-context-block__column--links">
                <div ref={linksRef} className="view-context-block__links-wrapper">
                    <button
                        ref={linksBtnRef}
                        type="button"
                        className={`view-context-block__links-btn ${showLinks ? 'view-context-block__links-btn--open' : ''}`}
                        onClick={() => setShowLinks(!showLinks)}
                    >
                        <Icon name="link" size={12} />
                        <span>Links</span>
                        {activeLinkCount > 0 && (
                            <span className="view-context-block__links-badge">{activeLinkCount}</span>
                        )}
                        <Icon
                            name={showLinks ? 'chevronUp' : 'chevronDown'}
                            size={10}
                        />
                    </button>

                    {showLinks && (
                        <LinksDropdown
                            activeView={activeView}
                            allViews={viewsForLinks}
                            onUpdateLink={onUpdateLink}
                            onSelectView={handleViewSelect}
                            onClose={() => setShowLinks(false)}
                            triggerRef={linksBtnRef}
                        />
                    )}
                </div>
            </div>

            <div className="view-context-block__divider view-context-block__divider--full" />

            {/* Actions Column */}
            <div className="view-context-block__column view-context-block__column--actions">
                <div className="view-context-block__quick-actions">
                    <IconButton
                        icon="camera"
                        label="Snapshot"
                        size="sm"
                        disabled={!activeView}
                        onClick={handleSnapshot}
                    />
                    <IconButton
                        icon="copy"
                        label="Duplicate"
                        size="sm"
                        disabled={!activeView}
                        onClick={handleDuplicate}
                    />
                    <IconButton
                        icon="settings"
                        label="Settings"
                        size="sm"
                        disabled={!activeView}
                        onClick={handleOpenSettings}
                    />
                </div>
            </div>
        </div>
    );
}

export default memo(ViewContextBlock);
export { ViewContextBlock, ViewHubFlyout, VIEW_TYPE_ICONS, LinksDropdown };
