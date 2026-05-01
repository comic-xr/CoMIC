/**
 * @file GlobalFiltersBar.jsx
 * @description Collapsible global filters bar for the Files Tab V7.
 * Features search (always visible), collapsible type filter chips, tags dropdown,
 * active tag display, and sort controls.
 *
 * @example
 * <GlobalFiltersBar
 *   filters={filters}
 *   onFiltersChange={setFilters}
 *   hasActiveFilters={hasActiveFilters}
 *   activeFilterCount={activeFilterCount}
 *   onClearFilters={clearFilters}
 *   tags={tags}
 *   tagsByCategory={tagsByCategory}
 *   allowTagCreation={projectSettings.allowUserTagCreation}
 *   onCreateTag={handleCreateTag}
 * />
 */

import React, { memo, useState, useCallback, useRef } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { TagChip } from '@UI/react/components/atoms/TagChip';
import { ChipGroup } from '@UI/react/components/molecules/ChipGroup';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { SortDropdown } from '@UI/react/components/molecules/SortDropdown';
import { TagsDropdown } from '@UI/react/components/molecules/TagsDropdown';
import { useAdaptive } from '@UI/react/context';
import { FILE_TYPE_FILTER_OPTIONS, SORT_OPTIONS } from '@UI/react/constants/filesTabConfig.js';
import './GlobalFiltersBar.scss';

/**
 * GlobalFiltersBar - Collapsible search, filters, and sort bar
 */
export const GlobalFiltersBar = memo(function GlobalFiltersBar({
    filters,
    onFiltersChange,
    hasActiveFilters,
    activeFilterCount = 0,
    onClearFilters,
    // Tag system props (V7)
    tags = [],
    tagsByCategory = {},
    allowTagCreation = false,
    onCreateTag,
    className = '',
}) {
    const { isVR } = useAdaptive();
    const { searchQuery, typeFilters, tagFilters = [], sortBy } = filters;

    // Refs
    const tagsTriggerRef = useRef(null);

    // Collapsible state for category filter chips
    const [isExpanded, setIsExpanded] = useState(false);
    const [showTagsDropdown, setShowTagsDropdown] = useState(false);

    // Handle search input change
    const handleSearchChange = useCallback((value) => {
        onFiltersChange({ searchQuery: value });
    }, [onFiltersChange]);

    // Handle search clear
    const handleSearchClear = useCallback(() => {
        onFiltersChange({ searchQuery: '' });
    }, [onFiltersChange]);

    // Handle type filter toggle
    const handleTypeToggle = useCallback((typeId) => {
        const newFilters = typeFilters.includes(typeId)
            ? typeFilters.filter(t => t !== typeId)
            : [...typeFilters, typeId];
        onFiltersChange({ typeFilters: newFilters });
    }, [typeFilters, onFiltersChange]);

    // Handle tag filter toggle
    const handleTagToggle = useCallback((tagId) => {
        const newFilters = tagFilters.includes(tagId)
            ? tagFilters.filter(t => t !== tagId)
            : [...tagFilters, tagId];
        onFiltersChange({ tagFilters: newFilters });
    }, [tagFilters, onFiltersChange]);

    // Remove a single tag filter
    const handleRemoveTag = useCallback((e, tag) => {
        onFiltersChange({
            tagFilters: tagFilters.filter(t => t !== tag.id),
        });
    }, [tagFilters, onFiltersChange]);

    // Handle sort change
    const handleSortChange = useCallback((newSortBy) => {
        onFiltersChange({ sortBy: newSortBy });
    }, [onFiltersChange]);

    // Clear type and tag filters (keep search)
    const handleClearTypeFilters = useCallback(() => {
        onFiltersChange({ typeFilters: [], tagFilters: [] });
    }, [onFiltersChange]);

    // Build type filter chips with selection state
    const typeFilterChips = FILE_TYPE_FILTER_OPTIONS.map(opt => ({
        ...opt,
        selected: typeFilters.includes(opt.id),
    }));

    // Get selected tag objects for display
    const selectedTagObjects = tagFilters
        .map(tagId => tags.find(t => t.id === tagId))
        .filter(Boolean);

    // Get category for a tag
    const getCategoryForTag = useCallback((tagId) => {
        const tag = tags.find(t => t.id === tagId);
        if (!tag) return null;
        return tagsByCategory[tag.categoryId] || null;
    }, [tags, tagsByCategory]);

    const hasTypeOrTagFilters = typeFilters.length > 0 || tagFilters.length > 0;

    const classList = [
        'global-filters-bar',
        isVR && 'global-filters-bar--vr',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classList}>
            {/* Search Row with inline controls */}
            <div className="global-filters-bar__search-row">
                <SearchInput
                    className="global-filters-bar__search"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search all files..."
                    size="sm"
                    onClear={handleSearchClear}
                />

                {/* Filter expand toggle */}
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`global-filters-bar__filter-toggle ${typeFilters.length > 0 ? 'global-filters-bar__filter-toggle--active' : ''}`}
                    aria-label={isExpanded ? 'Collapse filters' : 'Expand filters'}
                    aria-expanded={isExpanded}
                >
                    <Icon name="filter" size={11} />
                    <Icon
                        name="chevronDown"
                        size={9}
                        className={`global-filters-bar__toggle-chevron ${isExpanded ? 'global-filters-bar__toggle-chevron--expanded' : ''}`}
                    />
                </button>

                {/* Tags dropdown trigger */}
                <button
                    ref={tagsTriggerRef}
                    type="button"
                    onClick={() => setShowTagsDropdown(!showTagsDropdown)}
                    className={`global-filters-bar__tags-trigger ${tagFilters.length > 0 ? 'global-filters-bar__tags-trigger--active' : ''}`}
                    aria-label="Filter by tags"
                >
                    <Icon name="tag" size={11} />
                    {tagFilters.length > 0 && (
                        <span className="global-filters-bar__tags-count">{tagFilters.length}</span>
                    )}
                    <Icon name="chevronDown" size={9} />
                </button>

                <TagsDropdown
                    isOpen={showTagsDropdown}
                    onClose={() => setShowTagsDropdown(false)}
                    triggerRef={tagsTriggerRef}
                    tags={tags}
                    tagsByCategory={tagsByCategory}
                    selectedTags={tagFilters}
                    onToggleTag={handleTagToggle}
                    allowCreation={allowTagCreation}
                    onCreateTag={onCreateTag}
                />

                {/* Sort Dropdown */}
                <SortDropdown
                    value={sortBy}
                    onChange={handleSortChange}
                    options={SORT_OPTIONS}
                />
            </div>

            {/* Collapsible Type Filter Chips */}
            {isExpanded && (
                <div className="global-filters-bar__filters">
                    <div className="global-filters-bar__type-filters">
                        <ChipGroup
                            chips={typeFilterChips}
                            activeChips={typeFilters}
                            onToggle={handleTypeToggle}
                            size="sm"
                        />

                        {/* Clear type/tag filters button */}
                        {hasTypeOrTagFilters && (
                            <button
                                type="button"
                                onClick={handleClearTypeFilters}
                                className="global-filters-bar__clear-btn"
                            >
                                <Icon name="x" size={10} />
                                <span>Clear</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Active Tag Chips */}
            {selectedTagObjects.length > 0 && (
                <div className="global-filters-bar__active-tags">
                    <span className="global-filters-bar__tags-label">Tags:</span>
                    {selectedTagObjects.map(tag => (
                        <TagChip
                            key={tag.id}
                            tag={tag}
                            category={getCategoryForTag(tag.id)}
                            size="sm"
                            removable
                            onRemove={handleRemoveTag}
                        />
                    ))}
                </div>
            )}

            {/* Active filters indicator */}
            {hasActiveFilters && (
                <div className="global-filters-bar__indicator">
                    <div className="global-filters-bar__indicator-badge">
                        <Icon name="filter" size={8} />
                        <span>{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClearFilters}
                        className="global-filters-bar__clear-all"
                    >
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
});

export default GlobalFiltersBar;
