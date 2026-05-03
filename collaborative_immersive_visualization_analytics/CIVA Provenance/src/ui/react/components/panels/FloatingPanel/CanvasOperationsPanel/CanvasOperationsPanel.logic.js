/**
 * @file CanvasOperationsPanel.logic.js
 * @description Data models, constants, and utility functions for the Canvas Operations Panel
 */

// =============================================================================
// OPERATION TYPES
// =============================================================================

export const OPERATION_TYPES = {
  MOVE: { icon: 'move', color: 'green', label: 'Move' },
  SWAP: { icon: 'swapHoriz', color: 'amber', label: 'Swap' },
  MERGE: { icon: 'merge', color: 'purple', label: 'Merge' },
  UNMERGE: { icon: 'layers', color: 'amber', label: 'Unmerge' },
  PUSH: { icon: 'arrowForward', color: 'teal', label: 'Push' },
  DELETE: { icon: 'trash', color: 'red', label: 'Delete' },
  ADD: { icon: 'add', color: 'blue', label: 'Add' },
  RESIZE: { icon: 'aspectRatio', color: 'purple', label: 'Resize' },
  REVERT: { icon: 'undo', color: 'amber', label: 'Revert' },
};

// =============================================================================
// VIEW MODES
// =============================================================================

export const AUDIT_VIEW = {
  GROUPED: 'grouped',
  TIMELINE: 'timeline',
};

// =============================================================================
// DATE PRESETS
// =============================================================================

export const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: '7days' },
  { label: 'Last 30 days', value: '30days' },
  { label: 'All time', value: 'all' },
  { label: 'Custom...', value: 'custom' },
];

// =============================================================================
// TABS
// =============================================================================

export const TABS = {
  TRANSACTION: 'transaction',
  AUDIT: 'audit',
  USERS: 'users',
  SAVEPOINTS: 'savepoints',
};

export const TAB_CONFIG = [
  { id: TABS.TRANSACTION, icon: 'layers', label: 'Transaction', badgeKey: 'pendingCount' },
  { id: TABS.AUDIT, icon: 'clock', label: 'Audit Log', badgeKey: null },
  { id: TABS.USERS, icon: 'group', label: 'Users', badgeKey: 'onlineCount' },
  { id: TABS.SAVEPOINTS, icon: 'save', label: 'Save Points', badgeKey: null },
];

// =============================================================================
// USER COLORS
// =============================================================================

// Color palette for collaborators (cycling)
export const COLOR_PALETTE = [
  'pink',
  'blue',
  'purple',
  'amber',
  'green',
  'red',
];

// Track user color assignments (current user is always teal)
const userColorMap = new Map();

/**
 * Get or assign a color for a user
 * @param {string} userName - User's name
 * @param {boolean} isCurrentUser - Whether this is the current user
 * @returns {string} Color name
 */
export function getUserColor(userName, isCurrentUser = false) {
  if (isCurrentUser) return 'teal';

  if (userColorMap.has(userName)) {
    return userColorMap.get(userName);
  }

  const index = userColorMap.size % COLOR_PALETTE.length;
  const color = COLOR_PALETTE[index];
  userColorMap.set(userName, color);
  return color;
}

/**
 * Reset user colors (for testing or session reset)
 */
export function resetUserColors() {
  userColorMap.clear();
}

// =============================================================================
// TIME UTILITIES
// =============================================================================

/**
 * Get relative time string (e.g., "2m", "1h", "1d")
 * @param {Date} date - The date to format
 * @returns {string} Relative time string
 */
export function getRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

/**
 * Get time segment for a date
 * @param {Date} date - The date to categorize
 * @returns {string} Segment name: 'today', 'yesterday', 'thisWeek', 'earlier'
 */
export function getTimeSegment(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (date >= today) return 'today';
  if (date >= yesterday) return 'yesterday';
  if (date >= weekAgo) return 'thisWeek';
  return 'earlier';
}

// =============================================================================
// TRANSACTION UTILITIES
// =============================================================================

/**
 * Get transaction status based on reverted operations
 * @param {Array} operations - Array of operations
 * @param {Set} revertedOps - Set of reverted operation IDs
 * @param {string} transactionId - Transaction ID
 * @returns {string} 'active', 'partial', or 'reverted'
 */
export function getTransactionStatus(operations, revertedOps, transactionId) {
  const revertedCount = operations.filter((_, i) =>
    revertedOps.has(`${transactionId}-${i}`)
  ).length;

  if (revertedCount === 0) return 'active';
  if (revertedCount === operations.length) return 'reverted';
  return 'partial';
}

/**
 * Group transactions by time segment
 * @param {Array} transactions - Array of transactions
 * @returns {Object} Grouped transactions { today: [], yesterday: [], thisWeek: [], earlier: [] }
 */
export function groupTransactionsBySegment(transactions) {
  return transactions.reduce((acc, tx) => {
    const segment = tx.segment || getTimeSegment(new Date(tx.timestamp));
    if (!acc[segment]) acc[segment] = [];
    acc[segment].push(tx);
    return acc;
  }, { today: [], yesterday: [], thisWeek: [], earlier: [] });
}

/**
 * Filter transactions by user and operation types
 * @param {Array} transactions - Transactions to filter
 * @param {string|null} userFilter - User name filter
 * @param {Array} typeFilter - Operation type filter
 * @returns {Array} Filtered transactions
 */
export function filterTransactions(transactions, userFilter, typeFilter) {
  let filtered = transactions;

  if (userFilter) {
    filtered = filtered.filter(tx => tx.user === userFilter);
  }

  if (typeFilter.length > 0 && typeFilter.length < Object.keys(OPERATION_TYPES).length) {
    filtered = filtered.map(tx => ({
      ...tx,
      operations: tx.operations.filter(op => typeFilter.includes(op.type))
    })).filter(tx => tx.operations.length > 0);
  }

  return filtered;
}

// =============================================================================
// DEFAULT STATE
// =============================================================================

export const DEFAULT_AUDIT_STATE = {
  viewMode: AUDIT_VIEW.TIMELINE,
  sortOrder: 'desc',
  filters: {
    user: null,
    types: Object.keys(OPERATION_TYPES),
    datePreset: 'all',
    customDateRange: { start: null, end: null },
  },
  expandedSegments: new Set(['today', 'yesterday']),
  expandedTransactions: new Set(),
  revertedOperations: new Set(),
};
