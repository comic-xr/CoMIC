/**
 * @file QuickFilterChip.jsx
 * @description Toggleable filter chip with count badge.
 *
 * MODES:
 * - Full: Icon + Label + Count
 * - Compact: Icon + Count (with tooltip for label)
 *
 * ADAPTIVE:
 * - Uses useAdaptive() for VR sizing
 * - VR always shows label (no tooltips in VR)
 */

import React, { memo } from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import './QuickFilterChip.scss';

/**
 * QuickFilterChip - Toggleable filter chip with count badge
 *
 * @param {Object} props
 * @param {string} props.id - Unique filter identifier
 * @param {string} props.label - Display label
 * @param {string} props.icon - Icon name from registry
 * @param {number} props.count - Number of items matching this filter
 * @param {boolean} [props.active=false] - Whether filter is currently active
 * @param {boolean} [props.compact=false] - Show icon-only mode (label in tooltip)
 * @param {Function} props.onClick - Click handler to toggle filter
 * @param {boolean} [props.disabled=false] - Disable the chip
 * @param {string} [props.className] - Additional CSS classes
 */
export const QuickFilterChip = memo(function QuickFilterChip({
  id,
  label,
  icon,
  count = 0,
  active = false,
  compact = false,
  onClick,
  disabled = false,
  className = '',
}) {
  const { isVR } = useAdaptive();

  // VR always shows labels (can't rely on tooltips)
  const showLabel = isVR || !compact;
  const needsTooltip = !showLabel && !isVR;

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(id);
    }
  };

  const chip = (
    <button
      type="button"
      onClick={handleClick}
      className={[
        'quick-filter-chip',
        active && 'quick-filter-chip--active',
        compact && 'quick-filter-chip--compact',
        isVR && 'quick-filter-chip--vr',
        disabled && 'quick-filter-chip--disabled',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-pressed={active}
      aria-label={`${label}: ${count} items`}
      disabled={disabled}
      data-filter-id={id}
    >
      {icon && (
        <span className="quick-filter-chip__icon">
          <Icon name={icon} size={compact ? 12 : 11} />
        </span>
      )}
      {showLabel && (
        <span className="quick-filter-chip__label">{label}</span>
      )}
      <span className="quick-filter-chip__count">{count}</span>
    </button>
  );

  if (needsTooltip) {
    return <Tooltip content={label}>{chip}</Tooltip>;
  }

  return chip;
});

export default QuickFilterChip;
