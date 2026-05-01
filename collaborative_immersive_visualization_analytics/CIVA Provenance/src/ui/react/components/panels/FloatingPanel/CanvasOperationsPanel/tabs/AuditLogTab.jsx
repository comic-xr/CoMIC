/**
 * @file AuditLogTab.jsx
 * @description Audit log with grouped and timeline views, filters, and non-destructive undo.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { ToggleGroup } from '@UI/react/components/molecules';
import { OperationRow } from '../components/OperationRow';
import { TransactionBox } from '../components/TransactionBox';
import { TransactionGroup } from '../components/TransactionGroup';
import { TimeSegmentHeader } from '../components/TimeSegmentHeader';
import { FilterToolbar } from '../components/FilterToolbar';
import {
  AUDIT_VIEW,
  OPERATION_TYPES,
  getUserColor,
  groupTransactionsBySegment,
  filterTransactions,
  getTransactionStatus,
} from '../CanvasOperationsPanel.logic';

// =============================================================================
// GROUPED VIEW
// =============================================================================

function GroupedView({
  transactions,
  userFilter,
  onUndoTransaction,
  onRevertOperation,
  revertedOps,
  currentUserId,
}) {
  const [expandedTx, setExpandedTx] = useState(new Set([0]));

  const filteredTransactions = userFilter
    ? transactions.filter(tx => tx.user === userFilter)
    : transactions;

  const toggleExpanded = useCallback((index) => {
    setExpandedTx(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  return (
    <div className="cop-scroll-list">
      <div className="cop-list cop-list--gap-md">
        {filteredTransactions.map((tx, i) => (
          <TransactionGroup
            key={tx.id || i}
            transaction={tx}
            expanded={expandedTx.has(i)}
            onToggle={() => toggleExpanded(i)}
            onUndoAll={() => onUndoTransaction(tx.id)}
            onRevertOperation={onRevertOperation}
            revertedOps={revertedOps}
            userColor={getUserColor(tx.user, tx.user === 'You')}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// TIMELINE VIEW
// =============================================================================

function TimelineView({
  transactions,
  sortOrder,
  userFilter,
  typeFilter,
  revertedOps,
  onRevertOperation,
  onUndoTransaction,
  currentUserId,
}) {
  const [expandedSegments, setExpandedSegments] = useState(
    new Set(['today', 'yesterday'])
  );

  // Group and filter transactions
  const segments = useMemo(() => {
    let filtered = filterTransactions(transactions, userFilter, typeFilter);

    // Sort
    if (sortOrder === 'asc') {
      filtered = [...filtered].reverse();
    }

    // Group by segment
    const grouped = groupTransactionsBySegment(filtered);

    return [
      { id: 'today', label: 'Today', items: grouped.today || [] },
      { id: 'yesterday', label: 'Yesterday', items: grouped.yesterday || [] },
      { id: 'thisWeek', label: 'This Week', items: grouped.thisWeek || [] },
      { id: 'earlier', label: 'Earlier', items: grouped.earlier || [] },
    ].filter(s => s.items.length > 0);
  }, [transactions, userFilter, typeFilter, sortOrder]);

  const toggleSegment = useCallback((segmentId) => {
    setExpandedSegments(prev => {
      const next = new Set(prev);
      if (next.has(segmentId)) next.delete(segmentId);
      else next.add(segmentId);
      return next;
    });
  }, []);

  const getOperationCount = (items) => {
    return items.reduce((acc, tx) => acc + tx.operations.length, 0);
  };

  return (
    <div className="cop-scroll-list cop-scroll-list--no-padding">
      {segments.map(segment => (
        <div key={segment.id}>
          <TimeSegmentHeader
            label={segment.label}
            count={getOperationCount(segment.items)}
            isExpanded={expandedSegments.has(segment.id)}
            onToggle={() => toggleSegment(segment.id)}
            isSticky={segment.id === 'today' || segment.id === 'yesterday'}
          />

          {expandedSegments.has(segment.id) && (
            <div className="time-segment-content">
              {segment.items.map((tx) => {
                const userColor = getUserColor(tx.user, tx.user === 'You');

                // Single operation = simple row
                if (tx.operations.length === 1) {
                  const op = tx.operations[0];
                  const opId = `${tx.id}-0`;
                  return (
                    <OperationRow
                      key={tx.id}
                      operation={op}
                      userColor={userColor}
                      showUser
                      isReverted={revertedOps.has(opId)}
                      onRevert={() => onRevertOperation(opId, tx.id)}
                    />
                  );
                }

                // Multiple operations = transaction box
                return (
                  <TransactionBox
                    key={tx.id}
                    transaction={tx}
                    userColor={userColor}
                    revertedOps={revertedOps}
                    onUndoAll={() => onUndoTransaction(tx.id)}
                    onRevertOperation={(opId) => onRevertOperation(opId, tx.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * AuditLogTab - History of all canvas operations
 *
 * @param {Object} props - Component props
 * @param {Array} props.transactions - Array of transaction objects
 * @param {Array} props.collaborators - Array of collaborator objects
 * @param {Object} props.auditState - Audit log state
 * @param {Function} props.setAuditState - Update audit state
 * @param {Function} props.onRevertOperation - Revert a specific operation
 * @param {Function} props.onUndoTransaction - Undo entire transaction
 * @param {string} props.currentUserId - Current user's ID
 */
export function AuditLogTab({
  transactions = [],
  collaborators = [],
  auditState,
  setAuditState,
  onRevertOperation,
  onUndoTransaction,
  currentUserId,
}) {
  const {
    viewMode,
    sortOrder,
    filters,
    revertedOperations,
  } = auditState;

  // Update handlers
  const setViewMode = useCallback((mode) => {
    setAuditState(prev => ({ ...prev, viewMode: mode }));
  }, [setAuditState]);

  const setSortOrder = useCallback((order) => {
    setAuditState(prev => ({ ...prev, sortOrder: order }));
  }, [setAuditState]);

  const setUserFilter = useCallback((user) => {
    setAuditState(prev => ({
      ...prev,
      filters: { ...prev.filters, user },
    }));
  }, [setAuditState]);

  const setTypeFilter = useCallback((types) => {
    setAuditState(prev => ({
      ...prev,
      filters: { ...prev.filters, types },
    }));
  }, [setAuditState]);

  const setDatePreset = useCallback((preset) => {
    setAuditState(prev => ({
      ...prev,
      filters: { ...prev.filters, datePreset: preset },
    }));
  }, [setAuditState]);

  const setCustomDateRange = useCallback((range) => {
    setAuditState(prev => ({
      ...prev,
      filters: { ...prev.filters, customDateRange: range },
    }));
  }, [setAuditState]);

  // Get unique users from transactions
  const users = useMemo(() => {
    const userSet = new Set(transactions.map(tx => tx.user));
    return Array.from(userSet).map(name => ({ name }));
  }, [transactions]);

  return (
    <div className="audit-log-tab">
      {/* Toolbar Row 1: View toggle + Sort */}
      <div className="cop-toolbar">
        <ToggleGroup
          options={[
            { value: AUDIT_VIEW.GROUPED, icon: 'grid3x3', label: 'Grouped' },
            { value: AUDIT_VIEW.TIMELINE, icon: 'list', label: 'Timeline' },
          ]}
          value={viewMode}
          onChange={setViewMode}
          size="sm"
        />

        <div className="cop-toolbar__spacer" />

        <ToggleGroup
          options={[
            { value: 'desc', icon: 'arrowDown' },
            { value: 'asc', icon: 'arrowUp' },
          ]}
          value={sortOrder}
          onChange={setSortOrder}
          size="sm"
        />
      </div>

      {/* Toolbar Row 2: Filters */}
      <FilterToolbar
        users={users}
        userFilter={filters.user}
        onUserFilterChange={setUserFilter}
        typeFilter={filters.types}
        onTypeFilterChange={setTypeFilter}
        datePreset={filters.datePreset}
        onDatePresetChange={setDatePreset}
        customDateRange={filters.customDateRange}
        onCustomDateRangeChange={setCustomDateRange}
      />

      {/* Content */}
      <div className="audit-log-tab__content">
        {viewMode === AUDIT_VIEW.GROUPED ? (
          <GroupedView
            transactions={transactions}
            userFilter={filters.user}
            onUndoTransaction={onUndoTransaction}
            onRevertOperation={onRevertOperation}
            revertedOps={revertedOperations}
            currentUserId={currentUserId}
          />
        ) : (
          <TimelineView
            transactions={transactions}
            sortOrder={sortOrder}
            userFilter={filters.user}
            typeFilter={filters.types}
            revertedOps={revertedOperations}
            onRevertOperation={onRevertOperation}
            onUndoTransaction={onUndoTransaction}
            currentUserId={currentUserId}
          />
        )}
      </div>
    </div>
  );
}

export default AuditLogTab;
