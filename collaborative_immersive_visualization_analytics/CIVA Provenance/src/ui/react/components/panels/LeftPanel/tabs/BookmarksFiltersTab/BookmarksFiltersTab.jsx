/**
 * @file BookmarksFiltersTab.jsx
 * @description Combined Bookmarks & Filters tab with extracted subtabs.
 *
 * Features:
 * - Sub-tabs for Bookmarks and Filters
 * - Scope filtering (Project | Room | Personal)
 * - Search across both types
 * - Quick-save keyboard shortcut (B key)
 * - Batch operations for multi-select
 * - Extracted subtab components for separation of concerns
 *
 * @see Left_Panel_Design_Specification.docx - Sections 9-10
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { ChipGroup } from '@UI/react/components/molecules/ChipGroup';
import { SearchBar } from '@UI/react/components/molecules/SearchBar';
import { PanelHeader } from '../../components/PanelHeader';
import { getScopeChips } from './constants';
import { BookmarksSubtab } from './subtabs/BookmarksSubtab';
import { FiltersSubtab } from './subtabs/FiltersSubtab';
import { useBookmarks } from '@UI/react/hooks/useBookmarks.js';
import { useFilters } from '@UI/react/hooks/useFilters.js';
import './BookmarksFiltersTab.scss';

// =============================================================================
// SUB-TABS (dark etched style)
// =============================================================================

/**
 * SubTabs component for switching between Bookmarks and Filters.
 *
 * @param {Object} props
 * @param {'bookmarks' | 'filters'} props.activeTab - Active subtab
 * @param {Function} props.onTabChange - Tab change handler
 */
function SubTabs({ activeTab, onTabChange }) {
    return (
        <div className="bf-sub-tabs">
            <button
                className={`bf-sub-tabs__btn ${activeTab === 'bookmarks' ? 'bf-sub-tabs__btn--active' : ''}`}
                data-color="purple"
                onClick={() => onTabChange('bookmarks')}
            >
                <Icon name="bookmark" size={12} />
                Bookmarks
            </button>
            <button
                className={`bf-sub-tabs__btn ${activeTab === 'filters' ? 'bf-sub-tabs__btn--active' : ''}`}
                data-color="amber"
                onClick={() => onTabChange('filters')}
            >
                <Icon name="sliders" size={12} />
                Filters
            </button>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * BookmarksFiltersPanelContent component.
 *
 * Main container for the Bookmarks & Filters tab, managing:
 * - Subtab switching
 * - Scope filtering
 * - Search functionality
 * - Add button behavior
 *
 * @param {Object} props
 * @param {Object} props.currentCameraState - Current camera state for bookmark capture
 * @param {string[]} props.activeFilterIds - Currently active filter IDs
 * @param {Object} props.currentFilterConfig - Current filter configuration
 */
export function BookmarksFiltersPanelContent({
    currentCameraState,
    activeFilterIds = [],
    currentFilterConfig,
}) {
    // Sub-tab state
    const [activeSubTab, setActiveSubTab] = useState('bookmarks');

    // Scope filter state - all selected by default
    const [activeScopes, setActiveScopes] = useState(['project', 'room', 'personal']);

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Editor state (controlled from parent for add button)
    const [showEditor, setShowEditor] = useState(false);

    // Batch selection mode
    const [batchMode, setBatchMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);

    // Get data and actions for scope counts
    const { bookmarks, createBookmark, deleteBookmark } = useBookmarks();
    const { filters, deleteFilter } = useFilters();

    // ==========================================================================
    // KEYBOARD SHORTCUTS
    // ==========================================================================

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Skip if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // B key - Quick-save bookmark (per spec)
            if (e.key === 'b' || e.key === 'B') {
                if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    handleQuickSave();
                }
            }

            // Escape - Exit batch mode
            if (e.key === 'Escape' && batchMode) {
                setBatchMode(false);
                setSelectedItems([]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [batchMode]);

    // Quick-save creates bookmark with current state
    const handleQuickSave = useCallback(() => {
        if (currentCameraState) {
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            createBookmark?.({
                name: `Quick Save ${timestamp}`,
                type: 'position',
                scope: 'personal',
                cameraState: currentCameraState,
                filterIds: activeFilterIds,
            });
        }
    }, [currentCameraState, activeFilterIds, createBookmark]);

    // Listen for external bookmark creation requests (e.g., from view snapshot)
    useEffect(() => {
        const handleCreateBookmarkEvent = (e) => {
            const bookmarkData = e.detail;
            if (bookmarkData && createBookmark) {
                createBookmark({
                    name: bookmarkData.name,
                    description: bookmarkData.description,
                    scope: bookmarkData.scope || 'personal',
                    view_config_id: bookmarkData.view_config_id,
                    dataset_id: bookmarkData.dataset_id,
                    camera_state: bookmarkData.camera_state,
                    filter_ids: bookmarkData.filter_ids || [],
                    tags: bookmarkData.tags || [],
                });
            }
        };

        window.addEventListener('cia:create-bookmark', handleCreateBookmarkEvent);
        return () => window.removeEventListener('cia:create-bookmark', handleCreateBookmarkEvent);
    }, [createBookmark]);

    // Batch operations
    const handleBatchDelete = useCallback(async () => {
        if (selectedItems.length === 0) return;

        const itemType = activeSubTab === 'bookmarks' ? 'bookmark' : 'filter';
        const deleteFunc = activeSubTab === 'bookmarks' ? deleteBookmark : deleteFilter;

        if (!deleteFunc) {
            console.error(`Delete function not available for ${itemType}s`);
            return;
        }

        // Delete items sequentially to avoid overwhelming the server
        let successCount = 0;
        let failCount = 0;

        for (const id of selectedItems) {
            try {
                await deleteFunc(id);
                successCount++;
            } catch (error) {
                console.error(`Failed to delete ${itemType} ${id}:`, error);
                failCount++;
            }
        }

        // Show result via toast event
        if (successCount > 0) {
            window.dispatchEvent(new CustomEvent('cia:toast', {
                detail: {
                    message: `Deleted ${successCount} ${itemType}${successCount !== 1 ? 's' : ''}${failCount > 0 ? ` (${failCount} failed)` : ''}`,
                    type: failCount > 0 ? 'warning' : 'success',
                },
            }));
        } else if (failCount > 0) {
            window.dispatchEvent(new CustomEvent('cia:toast', {
                detail: {
                    message: `Failed to delete ${failCount} ${itemType}${failCount !== 1 ? 's' : ''}`,
                    type: 'error',
                },
            }));
        }

        setSelectedItems([]);
        setBatchMode(false);
    }, [selectedItems, activeSubTab, deleteBookmark, deleteFilter]);

    const handleBatchExport = useCallback(() => {
        if (selectedItems.length === 0) return;

        // Get the items to export
        const items = activeSubTab === 'bookmarks' ? bookmarks : filters;
        const exportItems = items.filter(item => selectedItems.includes(item.id));

        if (exportItems.length === 0) {
            window.dispatchEvent(new CustomEvent('cia:toast', {
                detail: {
                    message: 'No items to export',
                    type: 'warning',
                },
            }));
            return;
        }

        // Create export data
        const exportData = {
            exportedAt: new Date().toISOString(),
            type: activeSubTab,
            count: exportItems.length,
            items: exportItems.map(item => ({
                ...item,
                // Remove internal fields that shouldn't be exported
                _id: undefined,
                __v: undefined,
            })),
        };

        // Create and download JSON file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${activeSubTab}-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        window.dispatchEvent(new CustomEvent('cia:toast', {
            detail: {
                message: `Exported ${exportItems.length} ${activeSubTab === 'bookmarks' ? 'bookmark' : 'filter'}${exportItems.length !== 1 ? 's' : ''}`,
                type: 'success',
            },
        }));
    }, [selectedItems, activeSubTab, bookmarks, filters]);

    const toggleItemSelection = useCallback((id) => {
        setSelectedItems(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    }, []);

    // Calculate scope counts
    const bookmarkCounts = useMemo(() => ({
        project: bookmarks.filter(b => b.scope === 'project').length,
        room: bookmarks.filter(b => b.scope === 'room' || b.scope === 'workspace').length,
        personal: bookmarks.filter(b => b.scope === 'personal' || !b.scope).length,
    }), [bookmarks]);

    const filterCounts = useMemo(() => ({
        project: filters.filter(f => f.scope === 'project').length,
        room: filters.filter(f => f.scope === 'room' || f.scope === 'workspace').length,
        personal: filters.filter(f => f.scope === 'personal' || !f.scope).length,
    }), [filters]);

    // Toggle scope filter
    const toggleScope = useCallback((scope) => {
        setActiveScopes(prev =>
            prev.includes(scope)
                ? prev.filter(s => s !== scope)
                : [...prev, scope]
        );
    }, []);

    // Generate scope chips with counts
    const scopeChips = useMemo(() => {
        const counts = activeSubTab === 'bookmarks' ? bookmarkCounts : filterCounts;
        return getScopeChips(counts);
    }, [activeSubTab, bookmarkCounts, filterCounts]);

    // Handle add button
    const handleAdd = useCallback(() => {
        setShowEditor(true);
    }, []);

    return (
        <div className="bookmarks-filters-tab">
            {/* Header with pop-out/close buttons */}
            <PanelHeader icon="bookmark" color="indigo" title="Bookmarks" />

            {/* Sub-tabs */}
            <SubTabs activeTab={activeSubTab} onTabChange={setActiveSubTab} />

            {/* Scope chips - centered */}
            <div className="bookmarks-filters-tab__scope-bar">
                <ChipGroup
                    chips={scopeChips}
                    activeChips={activeScopes}
                    onToggle={toggleScope}
                    size="sm"
                />
            </div>

            {/* Search */}
            <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={`Search ${activeSubTab}...`}
            />

            {/* Keyboard hints */}
            {activeSubTab === 'bookmarks' && (
                <div className="bookmarks-filters-tab__keyboard-hint">
                    <kbd>B</kbd>
                    <span>Quick-save current view</span>
                </div>
            )}

            {/* Batch mode toolbar */}
            {batchMode && selectedItems.length > 0 && (
                <div className="bookmarks-filters-tab__batch-toolbar">
                    <span className="batch-count">{selectedItems.length} selected</span>
                    <div className="batch-actions">
                        <button onClick={handleBatchExport} className="batch-action">
                            <Icon name="download" size={12} />
                            Export
                        </button>
                        <button onClick={handleBatchDelete} className="batch-action batch-action--danger">
                            <Icon name="trash" size={12} />
                            Delete
                        </button>
                        <button onClick={() => { setBatchMode(false); setSelectedItems([]); }} className="batch-action">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Subtab Content */}
            {activeSubTab === 'bookmarks' ? (
                <BookmarksSubtab
                    activeScopes={activeScopes}
                    searchQuery={searchQuery}
                    currentCameraState={currentCameraState}
                    activeFilterIds={activeFilterIds}
                />
            ) : (
                <FiltersSubtab
                    activeScopes={activeScopes}
                    searchQuery={searchQuery}
                    currentFilterConfig={currentFilterConfig}
                />
            )}

            {/* Footer - Add button */}
            <div className="panel-footer">
                <button
                    className="panel-footer__btn panel-footer__btn--primary"
                    onClick={handleAdd}
                >
                    <Icon name="add" size={11} />
                    <span>{activeSubTab === 'bookmarks' ? 'Add Bookmark' : 'Save Current Filter'}</span>
                </button>
            </div>
        </div>
    );
}

export default BookmarksFiltersPanelContent;