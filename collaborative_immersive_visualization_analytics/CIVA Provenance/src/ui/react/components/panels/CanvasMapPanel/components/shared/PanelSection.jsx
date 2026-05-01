/**
 * @file PanelSection.jsx
 * @description Compact section component for Canvas Map contextual panels
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * PanelSection - Compact section wrapper with header + content
 *
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {string} [props.icon] - Icon name
 * @param {React.ReactNode} [props.actions] - Right-side actions
 * @param {React.ReactNode} props.children - Section content
 * @param {string} [props.sizeMode='standard'] - Size mode for compact rendering
 * @param {string} [props.className] - Additional class names
 */
export const PanelSection = memo(function PanelSection({
  title,
  icon,
  actions,
  children,
  sizeMode = 'standard',
  className = '',
}) {
  const isCompact = sizeMode === 'compact';

  return (
    <div className={`panel-section ${className}`.trim()} data-size-mode={sizeMode}>
      <div className="panel-section__header">
        <div className="panel-section__title">
          {icon && <Icon name={icon} size={isCompact ? 12 : 14} />}
          <span>{title}</span>
        </div>
        {actions && <div className="panel-section__actions">{actions}</div>}
      </div>
      <div className="panel-section__content">
        {children}
      </div>
    </div>
  );
});

export default PanelSection;
