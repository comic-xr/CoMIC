/**
 * @file FilterOverflowMenu.jsx
 * @description Overflow menu for quick filters that don't fit in the visible row.
 *
 * FEATURES:
 * - "+N more" trigger button
 * - Dropdown with remaining filter chips
 * - Badge shows count of active filters in overflow
 */

import React, { memo, useState, useRef } from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/atoms/Icon';
import { DropdownPortal } from '@UI/react/components/atoms/DropdownPortal';
import { QuickFilterChip } from '@UI/react/components/molecules/QuickFilterChip';
import './FilterOverflowMenu.scss';

/**
 * FilterOverflowMenu - Overflow menu for quick filters
 *
 * @param {Object} props
 * @param {Array} props.filters - Filter definitions that overflow
 * @param {string[]} props.activeFilters - Currently active filter IDs
 * @param {Object} props.counts - Counts per filter: { filterId: number }
 * @param {Function} props.onToggle - Toggle filter handler (filterId) => void
 * @param {number} [props.activeCount=0] - Count of active filters in overflow
 * @param {string} [props.className] - Additional CSS classes
 */
export const FilterOverflowMenu = memo(function FilterOverflowMenu({
  filters = [],
  activeFilters = [],
  counts = {},
  onToggle,
  activeCount = 0,
  className = '',
}) {
  const { isVR } = useAdaptive();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);

  if (filters.length === 0) {
    return null;
  }

  const classList = [
    'filter-overflow-menu',
    isVR && 'filter-overflow-menu--vr',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={[
          'filter-overflow-menu__trigger',
          isOpen && 'filter-overflow-menu__trigger--open',
          activeCount > 0 && 'filter-overflow-menu__trigger--has-active',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span>+{filters.length} more</span>
        {activeCount > 0 && (
          <span className="filter-overflow-menu__badge">{activeCount}</span>
        )}
      </button>

      <DropdownPortal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
        align="start"
        position="bottom"
        offset={4}
        className={classList}
      >
        <div className="filter-overflow-menu__panel">
          <div className="filter-overflow-menu__header">
            <Icon name="filter" size={11} />
            <span>More Filters</span>
          </div>

          <div className="filter-overflow-menu__filters">
            {filters.map((filter) => (
              <QuickFilterChip
                key={filter.id}
                id={filter.id}
                label={filter.label}
                icon={filter.icon}
                count={counts[filter.id] || 0}
                active={activeFilters.includes(filter.id)}
                onClick={() => onToggle(filter.id)}
              />
            ))}
          </div>
        </div>
      </DropdownPortal>
    </>
  );
});

export default FilterOverflowMenu;
