/**
 * @file FilterToolbarCompact.jsx
 * @description Compact filter toolbar with search + toggle button
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';

/**
 * FilterToolbarCompact - Search + filter toggle for small panels
 *
 * @param {Object} props
 * @param {string} props.searchQuery
 * @param {Function} props.onSearchChange
 * @param {Function} props.onToggleFilters
 * @param {boolean} props.filtersOpen
 * @param {number} props.activeFilterCount
 * @param {string} [props.placeholder]
 */
export const FilterToolbarCompact = memo(function FilterToolbarCompact({
  searchQuery,
  onSearchChange,
  onToggleFilters,
  filtersOpen = false,
  activeFilterCount = 0,
  placeholder = 'Search...',
}) {
  return (
    <div className="contextual-panel__filter-bar">
      <SearchInput
        value={searchQuery}
        onChange={onSearchChange}
        placeholder={placeholder}
        size="sm"
      />
      <button
        type="button"
        className={`contextual-panel__filter-btn ${filtersOpen ? 'contextual-panel__filter-btn--active' : ''}`}
        onClick={onToggleFilters}
        title="Toggle filters"
      >
        <Icon name="filterList" size={14} />
        {activeFilterCount > 0 && (
          <span className="contextual-panel__filter-badge">
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  );
});

export default FilterToolbarCompact;
