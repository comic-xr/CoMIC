/**
 * @file InstanceHeader.jsx
 * @description Instance info display header
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { formatGridPosition } from '@UI/react/utils/gridPosition.js';

/**
 * InstanceHeader - Displays current instance info
 */
export const InstanceHeader = memo(function InstanceHeader({
  instanceInfo,
}) {
  if (!instanceInfo) return null;

  const { name, dataset, type, color, position } = instanceInfo;

  // Format position as letter + number (A1, B2, etc.)
  const positionLabel = position
    ? formatGridPosition(position.col, position.row)
    : null;

  return (
    <div
      className="instance-header"
      style={{ '--instance-color': color }}
    >
      <div className="instance-header__icon">
        <Icon name="box" size={16} />
      </div>

      <div className="instance-header__info">
        <div className="instance-header__name-row">
          <span className="instance-header__name">{name}</span>
          <span className="instance-header__type">{type}</span>
        </div>
        <span className="instance-header__dataset">{dataset}</span>
      </div>

      {positionLabel && (
        <span className="instance-header__position">{positionLabel}</span>
      )}
    </div>
  );
});

export default InstanceHeader;
