/**
 * @file TransactionBox.jsx
 * @description A box containing multiple operations from the same transaction
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { OperationRow } from './OperationRow';
import { getTransactionStatus } from '../CanvasOperationsPanel.logic';

/**
 * TransactionBox - Groups multiple operations in a dashed border box
 *
 * @param {Object} props - Component props
 * @param {Object} props.transaction - Transaction with operations array
 * @param {string} props.userColor - User's assigned color
 * @param {Set} props.revertedOps - Set of reverted operation IDs
 * @param {Function} props.onUndoAll - Undo all operations in transaction
 * @param {Function} props.onRevertOperation - Revert a specific operation
 */
export function TransactionBox({
  transaction,
  userColor = 'teal',
  revertedOps = new Set(),
  onUndoAll,
  onRevertOperation,
}) {
  const opCount = transaction.operations.length;
  const status = getTransactionStatus(
    transaction.operations,
    revertedOps,
    transaction.id
  );
  const isFullyReverted = status === 'reverted';
  const isPartiallyReverted = status === 'partial';

  return (
    <div
      className={`transaction-box ${isFullyReverted ? 'transaction-box--reverted' : ''}`}
    >
      {/* Header */}
      <div className="transaction-box__header">
        {/* User avatar */}
        <div className={`cop-avatar cop-avatar--small cop-avatar--${userColor}`}>
          {transaction.user[0]}
        </div>

        {/* Info */}
        <div className="transaction-box__info">
          Transaction by{' '}
          <span
            className="transaction-box__user"
            style={{ color: `var(--color-accent-${userColor})` }}
          >
            {transaction.user}
          </span>
          {' • '}{opCount} op{opCount !== 1 ? 's' : ''}
        </div>

        {/* Status badges */}
        {isFullyReverted && (
          <span className="cop-badge cop-badge--green">REVERTED</span>
        )}
        {isPartiallyReverted && (
          <span className="cop-badge cop-badge--amber">PARTIAL</span>
        )}

        {/* Undo All button */}
        {!isFullyReverted && (
          <button
            className="cop-button cop-button--outline-red cop-button--small"
            onClick={onUndoAll}
            type="button"
          >
            <Icon name="undo" size={10} />
            Undo All
          </button>
        )}
      </div>

      {/* Operations */}
      <div className="transaction-box__operations">
        {transaction.operations.map((op, i) => {
          const opId = `${transaction.id}-${i}`;
          const isReverted = revertedOps.has(opId);
          return (
            <OperationRow
              key={i}
              operation={op}
              userColor={userColor}
              isReverted={isReverted}
              showUser={false}
              onRevert={() => onRevertOperation(opId)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default TransactionBox;
