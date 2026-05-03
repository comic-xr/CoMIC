/**
 * @file FilterChips.jsx
 * @description Filter chip group for Canvas Map panels
 */

import React, { memo } from 'react';

/**
 * FilterChips - Horizontal chip group for filtering
 *
 * @param {Object} props
 * @param {Array} props.chips - Chip definitions [{ id, label, count?, icon? }]
 * @param {string|Array} props.activeChips - Active chip id(s)
 * @param {Function} props.onToggle - Toggle handler (chipId) => void
 * @param {boolean} [props.allowMultiple=false] - Allow multiple selections
 * @param {string} [props.size='sm'] - Size variant
 */
export const FilterChips = memo(function FilterChips({
  chips,
  activeChips,
  onToggle,
  allowMultiple = false,
  size = 'sm',
}) {
  const activeSet = new Set(Array.isArray(activeChips) ? activeChips : [activeChips]);

  return (
    <div className={`filter-chips filter-chips--${size}`}>
      {chips.map(chip => {
        const isActive = activeSet.has(chip.id);

        return (
          <button
            key={chip.id}
            className={`filter-chips__chip ${isActive ? 'filter-chips__chip--active' : ''}`}
            onClick={() => onToggle(chip.id)}
            type="button"
          >
            {chip.label}
            {chip.count !== undefined && (
              <span className="filter-chips__count">{chip.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
});

export default FilterChips;
