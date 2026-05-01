/**
 * FilterBar Organism
 *
 * A comprehensive filter/search bar that combines multiple molecules.
 * Used for filtering lists, tables, and content.
 *
 * Composes:
 * - SearchInput molecule
 * - ChipGroup molecule
 * - ToggleGroup molecule
 * - IconButton atom
 */

import React, { memo, useState, useCallback } from 'react';
import { useAdaptive } from '@UI/react/context';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { ToggleGroup } from '@UI/react/components/molecules/ToggleGroup';
import { Chip } from '@UI/react/components/atoms/Chip';
import { IconButton } from '@UI/react/components/atoms/Button';
import { Divider } from '@UI/react/components/atoms/Divider';
import './FilterBar.scss';

/**
 * FilterBar - Filter and search bar
 *
 * @param {string} searchValue - Current search value
 * @param {function} onSearchChange - Search value change handler
 * @param {string} searchPlaceholder - Search input placeholder
 * @param {Array} filters - Array of filter chip configurations
 * @param {Array} activeFilters - Array of active filter ids
 * @param {function} onFilterChange - Called when filters change
 * @param {Array} viewModes - View mode toggle options (e.g., grid/list)
 * @param {string} activeViewMode - Current view mode
 * @param {function} onViewModeChange - View mode change handler
 * @param {Array} sortOptions - Sort option configurations
 * @param {string} activeSort - Current sort option
 * @param {function} onSortChange - Sort change handler
 * @param {Array} actions - Additional action buttons
 * @param {function} onClearAll - Clear all filters handler
 * @param {boolean} showClearAll - Show clear all button when filters are active
 * @param {string} className - Additional CSS classes
 */
export const FilterBar = memo(function FilterBar({
    // Search
    searchValue = '',
    onSearchChange,
    searchPlaceholder = 'Search...',

    // Filters
    filters = [],
    activeFilters = [],
    onFilterChange,

    // View modes
    viewModes = [],
    activeViewMode,
    onViewModeChange,

    // Sort
    sortOptions = [],
    activeSort,
    onSortChange,

    // Actions
    actions = [],
    onClearAll,
    showClearAll = true,

    className = '',
}) {
    const { isVR } = useAdaptive();

    const hasActiveFilters = activeFilters.length > 0 || searchValue.length > 0;

    const handleFilterToggle = useCallback((filterId) => {
        if (!onFilterChange) return;

        const newFilters = activeFilters.includes(filterId)
            ? activeFilters.filter(id => id !== filterId)
            : [...activeFilters, filterId];

        onFilterChange(newFilters);
    }, [activeFilters, onFilterChange]);

    const handleClearAll = useCallback(() => {
        onSearchChange?.('');
        onFilterChange?.([]);
        onClearAll?.();
    }, [onSearchChange, onFilterChange, onClearAll]);

    const classList = [
        'filter-bar',
        isVR && 'filter-bar--vr',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classList}>
            {/* Search Input */}
            {onSearchChange && (
                <div className="filter-bar__search">
                    <SearchInput
                        value={searchValue}
                        onChange={onSearchChange}
                        placeholder={searchPlaceholder}
                        size={isVR ? 'md' : 'sm'}
                    />
                </div>
            )}

            {/* Filter Chips */}
            {filters.length > 0 && (
                <>
                    {onSearchChange && <Divider orientation="vertical" />}
                    <div className="filter-bar__filters">
                        {filters.map(filter => (
                            <Chip
                                key={filter.id}
                                label={filter.label}
                                icon={filter.icon}
                                color={filter.color}
                                selected={activeFilters.includes(filter.id)}
                                onClick={() => handleFilterToggle(filter.id)}
                                size="sm"
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Spacer */}
            <div className="filter-bar__spacer" />

            {/* Sort Options */}
            {sortOptions.length > 0 && onSortChange && (
                <div className="filter-bar__sort">
                    <ToggleGroup
                        options={sortOptions}
                        value={activeSort}
                        onChange={onSortChange}
                        size="sm"
                    />
                </div>
            )}

            {/* View Mode Toggle */}
            {viewModes.length > 0 && onViewModeChange && (
                <>
                    {sortOptions.length > 0 && <Divider orientation="vertical" />}
                    <div className="filter-bar__view-modes">
                        <ToggleGroup
                            options={viewModes}
                            value={activeViewMode}
                            onChange={onViewModeChange}
                            size="sm"
                        />
                    </div>
                </>
            )}

            {/* Clear All */}
            {showClearAll && hasActiveFilters && onClearAll && (
                <>
                    <Divider orientation="vertical" />
                    <IconButton
                        icon="x"
                        tooltip="Clear all filters"
                        onClick={handleClearAll}
                        size="sm"
                        variant="ghost"
                    />
                </>
            )}

            {/* Additional Actions */}
            {actions.length > 0 && (
                <>
                    <Divider orientation="vertical" />
                    <div className="filter-bar__actions">
                        {actions.map(action => (
                            <IconButton
                                key={action.id}
                                icon={action.icon}
                                tooltip={action.tooltip}
                                onClick={action.onClick}
                                size="sm"
                                variant={action.variant || 'ghost'}
                                disabled={action.disabled}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
});

export default FilterBar;
