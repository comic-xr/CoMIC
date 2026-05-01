/**
 * @file SectionHeader.jsx
 * @description Section header component for Canvas Map panels
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * SectionHeader - Collapsible section header with icon and actions
 *
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {string} [props.icon] - Icon name
 * @param {React.ReactNode} [props.actions] - Actions to render on the right
 * @param {boolean} [props.isCollapsed] - Whether section is collapsed
 * @param {Function} [props.onToggle] - Toggle handler
 * @param {boolean} [props.collapsible=true] - Whether section can be collapsed
 */
export const SectionHeader = memo(function SectionHeader({
  title,
  icon,
  actions,
  isCollapsed,
  onToggle,
  collapsible = true,
}) {
  return (
    <div
      className={`section-header ${collapsible ? 'section-header--collapsible' : ''}`}
      onClick={collapsible ? onToggle : undefined}
      role={collapsible ? 'button' : undefined}
      tabIndex={collapsible ? 0 : undefined}
      onKeyDown={collapsible ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle?.();
        }
      } : undefined}
    >
      <div className="section-header__left">
        {collapsible && (
          <Icon
            name={isCollapsed ? 'chevronRight' : 'chevronDown'}
            size={12}
            className="section-header__chevron"
          />
        )}
        {icon && (
          <Icon name={icon} size={14} className="section-header__icon" />
        )}
        <span className="section-header__title">{title}</span>
      </div>
      {actions && (
        <div className="section-header__actions" onClick={e => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
});

export default SectionHeader;
