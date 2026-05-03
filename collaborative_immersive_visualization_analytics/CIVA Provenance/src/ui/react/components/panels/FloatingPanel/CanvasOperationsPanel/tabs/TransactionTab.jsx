/**
 * @file TransactionTab.jsx
 * @description Shows pending operations that haven't been committed to the collaborative state.
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { OperationItem } from '../components/OperationItem';

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState() {
  return (
    <div className="cop-empty-state">
      <div className="cop-empty-state__icon">
        <Icon name="check" size={24} />
      </div>
      <div className="cop-empty-state__title">No pending changes</div>
      <div className="cop-empty-state__description">
        Drag views in the minimap to make changes
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Transaction Tab - Shows pending operations for review
 *
 * @param {Object} props - Component props
 * @param {Array} props.operations - Array of pending operations
 * @param {Array} props.selectedOps - Array of boolean for selection state
 * @param {Function} props.onToggleOp - Toggle operation selection
 * @param {Function} props.onSelectAll - Select all operations
 * @param {Function} props.onClearSelection - Clear all selections
 * @param {Function} props.onApply - Apply selected operations
 * @param {Function} props.onCancel - Cancel all pending operations
 * @param {boolean} props.hasChanges - Whether there are pending changes
 * @param {number} props.selectedCount - Number of selected operations
 */
export function TransactionTab({
  operations = [],
  selectedOps = [],
  onToggleOp,
  onSelectAll,
  onClearSelection,
  onApply,
  onCancel,
  hasChanges,
  selectedCount = 0,
}) {
  if (!hasChanges) {
    return <EmptyState />;
  }

  return (
    <div className="transaction-tab">
      {/* Header */}
      <div className="cop-toolbar">
        <span className="transaction-tab__count">
          {selectedCount} of {operations.length} selected
        </span>
        <div className="cop-toolbar__spacer" />
        <LabeledButton
          label="Select All"
          onClick={onSelectAll}
          size="sm"
          variant="ghost"
        />
        <LabeledButton
          label="Clear"
          onClick={onClearSelection}
          size="sm"
          variant="ghost"
        />
      </div>

      {/* Operations list */}
      <div className="cop-scroll-list">
        <div className="cop-list">
          {operations.map((op, i) => (
            <OperationItem
              key={op.id || i}
              operation={op}
              isSelected={selectedOps[i]}
              onToggle={() => onToggleOp(i)}
              showCheckbox
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="cop-actions">
        <LabeledButton
          label="Cancel"
          onClick={onCancel}
          variant="ghost"
        />
        <LabeledButton
          label={`Apply ${selectedCount} Changes`}
          onClick={onApply}
          disabled={selectedCount === 0}
          variant="primary"
        />
      </div>
    </div>
  );
}

export default TransactionTab;
