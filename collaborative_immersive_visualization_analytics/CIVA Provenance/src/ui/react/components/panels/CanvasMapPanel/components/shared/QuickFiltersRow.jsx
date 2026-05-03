/**
 * @file QuickFiltersRow.jsx
 * @description Quick filters row for compact contextual panels
 */

import React, { memo } from 'react';
import { QuickFilterChip } from '@UI/react/components/molecules/QuickFilterChip';

/**
 * QuickFiltersRow - Inline quick filter chips
 *
 * @param {Object} props
 * @param {Array} props.quickFilterDefs
 * @param {Array} props.activeFilters
 * @param {Object} props.counts
 * @param {Function} props.onToggle
 * @param {boolean} [props.compact=false]
 */
export const QuickFiltersRow = memo(function QuickFiltersRow({
  quickFilterDefs = [],
  activeFilters = [],
  counts = {},
  onToggle,
  compact = false,
}) {
  if (!quickFilterDefs.length) return null;

  return (
    <div className="contextual-panel__quick-filters">
      {quickFilterDefs.map((def) => (
        <QuickFilterChip
          key={def.id}
          id={def.id}
          label={def.label}
          icon={def.icon}
          count={counts[def.id] || 0}
          active={activeFilters.includes(def.id)}
          onClick={onToggle}
          compact={compact}
        />
      ))}
    </div>
  );
});

export default QuickFiltersRow;
