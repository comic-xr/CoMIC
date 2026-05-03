/**
 * @file TimeSegmentHeader.jsx
 * @description Collapsible header for time segments in timeline view
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * TimeSegmentHeader - Collapsible section header
 *
 * @param {Object} props - Component props
 * @param {string} props.label - Segment label (e.g., "Today")
 * @param {number} props.count - Number of operations in segment
 * @param {boolean} props.isExpanded - Whether segment is expanded
 * @param {Function} props.onToggle - Toggle expand/collapse
 * @param {boolean} props.isSticky - Whether header should stick during scroll
 */
export function TimeSegmentHeader({
  label,
  count,
  isExpanded,
  onToggle,
  isSticky = false,
}) {
  return (
    <button
      className={`time-segment-header ${isSticky ? 'time-segment-header--sticky' : ''}`}
      onClick={onToggle}
      type="button"
    >
      <Icon
        name={isExpanded ? 'chevronDown' : 'chevronRight'}
        size={12}
        className="time-segment-header__chevron"
      />
      <span className="time-segment-header__label">{label}</span>
      <span className="time-segment-header__count">{count}</span>
    </button>
  );
}

export default TimeSegmentHeader;
