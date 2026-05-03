/**
 * @file CollapsibleSection.jsx
 * @description Collapsible section header for CompanionPanel
 *
 * Used in:
 * - ViewGroups tab: Recent, My Saved, Shared sections
 * - Datasets tab: Could be used for grouping
 */

import React, { memo, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * CollapsibleSection - Section with expandable content
 *
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {string} [props.icon] - Icon name for section
 * @param {number} [props.count] - Item count to show
 * @param {boolean} props.isExpanded - Whether section is expanded
 * @param {Function} props.onToggle - Toggle handler
 * @param {React.ReactNode} props.children - Section content
 * @param {string} [props.accentColor] - Accent color for section header
 */
export const CollapsibleSection = memo(function CollapsibleSection({
  title,
  icon,
  count,
  isExpanded,
  onToggle,
  children,
  accentColor,
}) {
  const handleToggle = useCallback(() => {
    onToggle?.();
  }, [onToggle]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggle?.();
      }
    },
    [onToggle]
  );

  return (
    <div className="collapsible-section" data-expanded={isExpanded}>
      <button
        className="collapsible-section__header"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        type="button"
        style={accentColor ? { '--section-accent': accentColor } : undefined}
      >
        <Icon
          name={isExpanded ? 'chevronDown' : 'chevronRight'}
          size={12}
          className="collapsible-section__chevron"
        />
        {icon && <Icon name={icon} size={14} className="collapsible-section__icon" />}
        <span className="collapsible-section__title">{title}</span>
        {count !== undefined && (
          <span className="collapsible-section__count">{count}</span>
        )}
      </button>

      {isExpanded && (
        <div className="collapsible-section__content">{children}</div>
      )}
    </div>
  );
});

export default CollapsibleSection;
