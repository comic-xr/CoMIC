/**
 * @file OperationItem.jsx
 * @description A single operation row with checkbox selection for the transaction tab
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { OPERATION_TYPES } from '../CanvasOperationsPanel.logic';

/**
 * OperationItem - A single pending operation row
 *
 * @param {Object} props - Component props
 * @param {Object} props.operation - The operation object
 * @param {boolean} props.isSelected - Whether the operation is selected
 * @param {Function} props.onToggle - Toggle selection callback
 * @param {Function} props.onUndo - Undo this specific operation
 * @param {boolean} props.showCheckbox - Show selection checkbox
 * @param {boolean} props.showUser - Show user who made the operation
 */
export function OperationItem({
  operation,
  isSelected = false,
  onToggle,
  onUndo,
  showCheckbox = false,
  showUser = false,
}) {
  const config = OPERATION_TYPES[operation.type] || OPERATION_TYPES.MOVE;

  return (
    <div
      className={`operation-item ${isSelected ? 'operation-item--selected' : ''}`}
    >
      {showCheckbox && (
        <button
          className={`operation-item__checkbox ${isSelected ? 'operation-item__checkbox--checked' : ''}`}
          onClick={onToggle}
          type="button"
          aria-label={isSelected ? 'Deselect operation' : 'Select operation'}
        >
          {isSelected && <Icon name="check" size={10} />}
        </button>
      )}

      <div className={`cop-op-icon cop-op-icon--${config.color}`}>
        <Icon name={config.icon} size={12} />
      </div>

      <div className="operation-item__content">
        <div className="operation-item__detail">{operation.detail}</div>
        <div className="operation-item__meta">
          <span className={`operation-item__type operation-item__type--${config.color}`}>
            {config.label}
          </span>
          {showUser && operation.user && (
            <span className="operation-item__user">by {operation.user}</span>
          )}
          {operation.timestamp && (
            <span className="operation-item__time">{operation.timestamp}</span>
          )}
        </div>
      </div>

      {onUndo && (
        <button
          className="cop-button cop-button--icon-small"
          onClick={onUndo}
          title="Undo this operation"
          type="button"
        >
          <Icon name="undo" size={12} />
        </button>
      )}
    </div>
  );
}

export default OperationItem;
