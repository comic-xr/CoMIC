/**
 * @file TransactionGroup.jsx
 * @description An expandable transaction group for the grouped view
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { OperationRow } from './OperationRow';

/**
 * TransactionGroup - Expandable card for grouped view
 *
 * @param {Object} props - Component props
 * @param {Object} props.transaction - Transaction object
 * @param {boolean} props.expanded - Whether the group is expanded
 * @param {Function} props.onToggle - Toggle expand/collapse
 * @param {Function} props.onUndoAll - Undo entire transaction
 * @param {Function} props.onRevertOperation - Revert specific operation
 * @param {Set} props.revertedOps - Set of reverted operation IDs
 * @param {string} props.userColor - User's assigned color
 */
export function TransactionGroup({
  transaction,
  expanded = false,
  onToggle,
  onUndoAll,
  onRevertOperation,
  revertedOps = new Set(),
  userColor = 'teal',
}) {
  const opCount = transaction.operations.length;

  return (
    <div className="transaction-group">
      {/* Header - clickable to expand */}
      <button
        className="transaction-group__header"
        onClick={onToggle}
        type="button"
      >
        <Icon
          name={expanded ? 'chevronDown' : 'chevronRight'}
          size={14}
          className="transaction-group__chevron"
        />

        {/* User avatar */}
        <div className={`cop-avatar cop-avatar--${userColor}`}>
          {transaction.user[0]}
        </div>

        {/* Info */}
        <div className="transaction-group__info">
          <div className="transaction-group__title">
            {transaction.user} • {opCount} operation{opCount !== 1 ? 's' : ''}
          </div>
          <div className="transaction-group__timestamp">
            {transaction.timestamp}
          </div>
        </div>

        {/* Undo All button */}
        <button
          className="cop-button cop-button--outline-red cop-button--small"
          onClick={(e) => {
            e.stopPropagation();
            onUndoAll();
          }}
          title="Undo entire transaction"
          type="button"
        >
          <Icon name="undo" size={10} />
          Undo All
        </button>
      </button>

      {/* Expanded operations */}
      {expanded && (
        <div className="transaction-group__operations">
          {transaction.operations.map((op, i) => {
            const opId = `${transaction.id}-${i}`;
            return (
              <OperationRow
                key={i}
                operation={op}
                userColor={userColor}
                showUser={false}
                isReverted={revertedOps.has(opId)}
                onRevert={() => onRevertOperation(opId, transaction.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TransactionGroup;
