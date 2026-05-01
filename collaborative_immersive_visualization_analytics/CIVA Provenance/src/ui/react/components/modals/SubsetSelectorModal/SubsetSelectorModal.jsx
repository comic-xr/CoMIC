// src/ui/react/components/modals/SubsetSelectorModal/SubsetSelectorModal.jsx
// Modal for selecting a subset to view or creating a new one

import React, { useState, useCallback, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { getViewConfigurationManager, getDatasetManager } from '@Init/appInitializer.js';
import './SubsetSelectorModal.scss';

/**
 * Get display name for a placement/view
 */
function getPlacementDisplayName(placement) {
    if (!placement) return 'Unknown View';

    // If it's a view placement, get the name from ViewConfiguration
    if (placement.content?.type === 'view' && placement.content?.viewConfigurationId) {
        try {
            const viewConfig = getViewConfigurationManager()?.getView(placement.content.viewConfigurationId);
            if (viewConfig) {
                const dataset = getDatasetManager()?.getDataset(viewConfig.datasetId);
                return dataset?.filename || viewConfig.name || `View ${placement.row},${placement.col}`;
            }
        } catch (e) {
            // Fall through
        }
    }

    // Fallback to content name or position
    return placement.content?.name || `Cell ${placement.row},${placement.col}`;
}

/**
 * SubsetSelectorModal - Quick selector for subsets
 * Shows when user clicks "Subset" mode in toolbar
 *
 * Features:
 * - View existing subsets (click to open)
 * - Add selected views to existing subset (+ button)
 * - Create new subset from selected views
 * - Place subset on canvas as a card
 * - Search and filter subsets and views
 * - Expandable view list per subset
 * - Enter selection mode to select views
 */
export function SubsetSelectorModal({
    isOpen,
    onClose,
    subsets = [],
    allPlacements = [], // All placements on canvas for resolving names
    selectedPlacementIds = [],
    onSelectSubset,
    onCreateSubset,
    onAddToSubset,
    onPlaceOnCanvas,
    onEnterSelectionMode,
}) {
    const [newSubsetName, setNewSubsetName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isAdding, setIsAdding] = useState(null); // Track which subset is being added to
    const [placeOnCanvas, setPlaceOnCanvas] = useState(true); // Default ON - most users want this
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSubsetId, setExpandedSubsetId] = useState(null);

    // Build a map of placement ID to placement data for quick lookup
    const placementMap = useMemo(() => {
        const map = new Map();
        allPlacements.forEach(p => map.set(p.id, p));
        return map;
    }, [allPlacements]);

    // Filter subsets by search query
    const filteredSubsets = useMemo(() => {
        if (!searchQuery.trim()) return subsets;
        const query = searchQuery.toLowerCase();
        return subsets.filter(subset => {
            // Match subset name
            if (subset.name?.toLowerCase().includes(query)) return true;
            // Match any view name in the subset
            const viewNames = (subset.placementIds || []).map(id => {
                const placement = placementMap.get(id);
                return getPlacementDisplayName(placement).toLowerCase();
            });
            return viewNames.some(name => name.includes(query));
        });
    }, [subsets, searchQuery, placementMap]);

    const handleSelectSubset = useCallback((subset) => {
        onSelectSubset?.(subset);
        onClose?.();
    }, [onSelectSubset, onClose]);

    const handleAddToExistingSubset = useCallback(async (subset) => {
        if (selectedPlacementIds.length === 0) return;

        setIsAdding(subset.id);
        try {
            await onAddToSubset?.(subset.id, selectedPlacementIds);
            onClose?.();
        } finally {
            setIsAdding(null);
        }
    }, [selectedPlacementIds, onAddToSubset, onClose]);

    const handleCreateSubset = useCallback(async () => {
        if (!newSubsetName.trim()) return;

        setIsCreating(true);
        try {
            const result = await onCreateSubset?.({
                name: newSubsetName.trim(),
                placementIds: selectedPlacementIds,
            });

            // If "Place on Canvas" is checked and we got a subset back, place it
            if (placeOnCanvas && result?.id && onPlaceOnCanvas) {
                onPlaceOnCanvas(result.id);
            }

            setNewSubsetName('');
            setPlaceOnCanvas(false);
            onClose?.();
        } finally {
            setIsCreating(false);
        }
    }, [newSubsetName, selectedPlacementIds, onCreateSubset, onClose, placeOnCanvas, onPlaceOnCanvas]);

    const handleStartSelection = useCallback(() => {
        onEnterSelectionMode?.();
        onClose?.();
    }, [onEnterSelectionMode, onClose]);

    // Toggle subset expansion
    const toggleExpand = useCallback((subsetId, e) => {
        e.stopPropagation();
        setExpandedSubsetId(prev => prev === subsetId ? null : subsetId);
    }, []);

    // Clear search when closing
    const handleClose = useCallback(() => {
        setSearchQuery('');
        setExpandedSubsetId(null);
        onClose?.();
    }, [onClose]);

    if (!isOpen) return null;

    const hasSelectedPlacements = selectedPlacementIds.length > 0;
    const showSearch = subsets.length > 2 || allPlacements.length > 3;

    return (
        <div className="subset-selector-modal__backdrop" onClick={handleClose}>
            <div
                className="subset-selector-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="subset-selector-modal__header">
                    <Icon name="layers" size={18} />
                    <h3>{hasSelectedPlacements ? 'Add to Subset' : 'Select Subset'}</h3>
                    <button
                        className="subset-selector-modal__close"
                        onClick={handleClose}
                    >
                        <Icon name="close" size={16} />
                    </button>
                </div>

                {/* Search input */}
                {showSearch && (
                    <SearchInput
                        className="subset-selector-modal__search"
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search subsets or views..."
                        size="sm"
                        autoFocus
                    />
                )}

                <div className="subset-selector-modal__content">
                    {/* Selection info banner */}
                    {hasSelectedPlacements && (
                        <div className="subset-selector-modal__selection-info">
                            <Icon name="check" size={14} />
                            <span>{selectedPlacementIds.length} view{selectedPlacementIds.length !== 1 ? 's' : ''} selected</span>
                        </div>
                    )}

                    {/* Existing subsets */}
                    {filteredSubsets.length > 0 && (
                        <div className="subset-selector-modal__section">
                            <div className="subset-selector-modal__section-title">
                                {hasSelectedPlacements ? 'Add to Existing Subset' : 'Saved Subsets'}
                            </div>
                            <div className="subset-selector-modal__list">
                                {filteredSubsets.map((subset) => {
                                    const isExpanded = expandedSubsetId === subset.id;
                                    const subsetViews = (subset.placementIds || []).map(id => ({
                                        id,
                                        placement: placementMap.get(id),
                                        name: getPlacementDisplayName(placementMap.get(id)),
                                        isSelected: selectedPlacementIds.includes(id),
                                    }));

                                    return (
                                        <div key={subset.id} className={`subset-selector-modal__item-container ${isExpanded ? 'subset-selector-modal__item-container--expanded' : ''}`}>
                                            <div className="subset-selector-modal__item-row">
                                                {/* Expand/collapse toggle */}
                                                <button
                                                    className="subset-selector-modal__expand-btn"
                                                    onClick={(e) => toggleExpand(subset.id, e)}
                                                    title={isExpanded ? 'Collapse' : 'Expand to see views'}
                                                >
                                                    <Icon name={isExpanded ? 'chevronDown' : 'chevronRight'} size={12} />
                                                </button>

                                                <button
                                                    className="subset-selector-modal__item"
                                                    onClick={() => hasSelectedPlacements ? handleAddToExistingSubset(subset) : handleSelectSubset(subset)}
                                                >
                                                    <Icon name="layers" size={14} />
                                                    <span className="subset-selector-modal__item-name">
                                                        {subset.name}
                                                    </span>
                                                    <span className="subset-selector-modal__item-count">
                                                        {subset.placementIds?.length || 0} views
                                                    </span>
                                                    {hasSelectedPlacements && (
                                                        <span className="subset-selector-modal__item-action">
                                                            {isAdding === subset.id ? (
                                                                <Icon name="loader" size={14} />
                                                            ) : (
                                                                <Icon name="add" size={14} />
                                                            )}
                                                        </span>
                                                    )}
                                                </button>
                                                {onPlaceOnCanvas && (
                                                    <button
                                                        className="subset-selector-modal__add-to-canvas-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onPlaceOnCanvas(subset.id);
                                                            handleClose();
                                                        }}
                                                    >
                                                        <Icon name="plus" size={12} />
                                                        Add to Canvas
                                                    </button>
                                                )}
                                            </div>

                                            {/* Expanded view list */}
                                            {isExpanded && (
                                                <div className="subset-selector-modal__view-list">
                                                    {subsetViews.length === 0 ? (
                                                        <div className="subset-selector-modal__view-empty">
                                                            No views in this subset
                                                        </div>
                                                    ) : (
                                                        subsetViews.map((view) => (
                                                            <div
                                                                key={view.id}
                                                                className={`subset-selector-modal__view-item ${view.isSelected ? 'subset-selector-modal__view-item--selected' : ''}`}
                                                            >
                                                                <Icon name="box" size={12} />
                                                                <span className="subset-selector-modal__view-name">
                                                                    {view.name}
                                                                </span>
                                                                {view.isSelected && (
                                                                    <Icon name="check" size={12} className="subset-selector-modal__view-check" />
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* No results from search */}
                    {searchQuery && filteredSubsets.length === 0 && subsets.length > 0 && (
                        <div className="subset-selector-modal__no-results">
                            <Icon name="search" size={20} />
                            <span>No subsets match "{searchQuery}"</span>
                        </div>
                    )}

                    {/* Create new subset */}
                    {hasSelectedPlacements && (
                        <div className="subset-selector-modal__section">
                            <div className="subset-selector-modal__section-title">
                                Create New Subset
                            </div>
                            <div className="subset-selector-modal__create">
                                <input
                                    type="text"
                                    className="subset-selector-modal__input"
                                    placeholder="Subset name..."
                                    value={newSubsetName}
                                    onChange={(e) => setNewSubsetName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreateSubset();
                                    }}
                                    autoFocus={subsets.length === 0}
                                />
                                <label className="subset-selector-modal__checkbox">
                                    <input
                                        type="checkbox"
                                        checked={placeOnCanvas}
                                        onChange={(e) => setPlaceOnCanvas(e.target.checked)}
                                    />
                                    <span>Place on canvas</span>
                                </label>
                                <button
                                    className="subset-selector-modal__create-btn"
                                    onClick={handleCreateSubset}
                                    disabled={!newSubsetName.trim() || isCreating}
                                >
                                    {isCreating ? 'Creating...' : 'Create Subset'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* No selection - show selection mode prompt */}
                    {!hasSelectedPlacements && (
                        <div className="subset-selector-modal__section">
                            <div className="subset-selector-modal__section-title">
                                Create New Subset
                            </div>
                            <div className="subset-selector-modal__no-selection">
                                <p>Select views on the canvas to create a new subset.</p>
                                <button
                                    className="subset-selector-modal__selection-btn"
                                    onClick={handleStartSelection}
                                >
                                    <Icon name="pointer" size={14} />
                                    Enter Selection Mode
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {subsets.length === 0 && !hasSelectedPlacements && (
                        <div className="subset-selector-modal__empty">
                            <Icon name="layers" size={32} />
                            <p>No subsets yet</p>
                            <span>Create a subset to focus on specific views</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SubsetSelectorModal;
