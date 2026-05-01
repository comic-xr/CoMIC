/**
 * @file OperationRow.jsx
 * @description A single operation row for the timeline view with user color indicator
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { OPERATION_TYPES } from '../CanvasOperationsPanel.logic';

/**
 * OperationRow - A single operation in the timeline
 *
 * @param {Object} props - Component props
 * @param {Object} props.operation - The operation object
 * @param {string} props.userColor - User's assigned color
 * @param {boolean} props.showUser - Whether to show user name
 * @param {boolean} props.isReverted - Whether this operation was reverted
 * @param {Function} props.onRevert - Callback to revert this operation
 */
export function OperationRow({
  operation,
  userColor = 'teal',
  showUser = false,
  isReverted = false,
  onRevert,
}) {
  const config = OPERATION_TYPES[operation.type] || OPERATION_TYPES.MOVE;

  return (
    <div
      className={`operation-row operation-row--${userColor} ${isReverted ? 'operation-row--reverted' : ''}`}
    >
      {/* Operation icon */}
      <div className={`cop-op-icon cop-op-icon--${config.color}`}>
        <Icon name={config.icon} size={11} />
      </div>

      {/* Details */}
      <div className="operation-row__content">
        <div className="operation-row__detail">{operation.detail}</div>
      </div>

      {/* User name */}
      {showUser && operation.user && (
        <span
          className="operation-row__user"
          style={{ color: `var(--color-accent-${userColor})` }}
        >
          {operation.user}
        </span>
      )}

      {/* Timestamp */}
      <span className="operation-row__time">
        {operation.timeAgo || operation.timestamp}
      </span>

      {/* Revert button or Reverted badge */}
      {isReverted ? (
        <div className="cop-badge cop-badge--green">
          <Icon name="check" size={10} />
          Reverted
        </div>
      ) : (
        <button
          className="cop-button cop-button--icon-small"
          onClick={onRevert}
          title="Revert this operation"
          type="button"
        >
          <Icon name="close" size={11} />
        </button>
      )}
    </div>
  );
}

export default OperationRow;
