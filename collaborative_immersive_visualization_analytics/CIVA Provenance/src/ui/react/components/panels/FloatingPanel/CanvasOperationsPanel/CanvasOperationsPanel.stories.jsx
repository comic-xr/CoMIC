/**
 * @file CanvasOperationsPanel.stories.jsx
 * @description Storybook stories for the Canvas Operations Panel.
 * Demonstrates all tabs: Transaction, Audit Log, Users, and Save Points.
 */

import React, { useState } from 'react';
import { CanvasOperationsPanel } from './CanvasOperationsPanel';

export default {
  title: 'Organisms/CanvasOperationsPanel',
  component: CanvasOperationsPanel,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'canvas',
      values: [
        { name: 'canvas', value: '#06060a' },
        { name: 'dark', value: '#0a0a0f' },
      ],
    },
  },
};

// =============================================================================
// MOCK DATA
// =============================================================================

const mockPendingOperations = [
  {
    id: 'op1',
    type: 'MOVE',
    detail: 'Moved "Brain Scan" to (2, 1)',
    timestamp: 'Just now',
  },
  {
    id: 'op2',
    type: 'SWAP',
    detail: 'Swapped (1, 1) ↔ (3, 2)',
    timestamp: 'Just now',
  },
  {
    id: 'op3',
    type: 'PUSH',
    detail: 'Pushed "CT Data" → right',
    timestamp: 'Just now',
  },
];

const mockTransactions = [
  {
    id: 'tx1',
    user: 'Alice',
    timestamp: '2 minutes ago',
    segment: 'today',
    operations: [
      { type: 'MOVE', detail: 'Moved "Brain Scan" to (2, 1)', timeAgo: '2m' },
      { type: 'MOVE', detail: 'Moved "CT Data" to (2, 2)', timeAgo: '2m' },
    ],
  },
  {
    id: 'tx2',
    user: 'Bob',
    timestamp: '5 minutes ago',
    segment: 'today',
    operations: [
      { type: 'SWAP', detail: 'Swapped (1, 1) ↔ (3, 1)', timeAgo: '5m' },
    ],
  },
  {
    id: 'tx3',
    user: 'Alice',
    timestamp: '8 minutes ago',
    segment: 'today',
    operations: [
      { type: 'MERGE', detail: 'Merged cells (1, 1)-(1, 3)', timeAgo: '8m' },
      { type: 'PUSH', detail: 'Pushed "Scan A" → down', timeAgo: '8m' },
      { type: 'PUSH', detail: 'Pushed "Scan B" → down', timeAgo: '8m' },
    ],
  },
  {
    id: 'tx4',
    user: 'You',
    timestamp: 'Yesterday 3:45 PM',
    segment: 'yesterday',
    operations: [
      { type: 'RESIZE', detail: 'Resized canvas to 4×4', timeAgo: '1d' },
    ],
  },
  {
    id: 'tx5',
    user: 'Carol',
    timestamp: 'Yesterday 2:30 PM',
    segment: 'yesterday',
    operations: [
      { type: 'ADD', detail: 'Added "MRI Scan" to (1, 1)', timeAgo: '1d' },
      { type: 'ADD', detail: 'Added "X-Ray" to (1, 2)', timeAgo: '1d' },
    ],
  },
  {
    id: 'tx6',
    user: 'Bob',
    timestamp: 'Dec 20',
    segment: 'thisWeek',
    operations: [
      { type: 'DELETE', detail: 'Deleted "Old Scan" from (2, 2)', timeAgo: '5d' },
    ],
  },
];

const mockCollaborators = [
  {
    id: 'user1',
    name: 'You',
    online: true,
    editing: false,
    viewport: { row: 1, col: 1 },
    cursor: { row: 1, col: 2 },
  },
  {
    id: 'user2',
    name: 'Alice',
    online: true,
    editing: true,
    viewport: { row: 2, col: 1 },
    cursor: { row: 2, col: 2 },
  },
  {
    id: 'user3',
    name: 'Bob',
    online: true,
    editing: false,
    viewport: { row: 1, col: 3 },
    cursor: { row: 1, col: 3 },
  },
  {
    id: 'user4',
    name: 'Carol',
    online: false,
    editing: false,
    viewport: { row: 1, col: 1 },
    cursor: { row: 1, col: 1 },
  },
];

const mockSavePoints = [
  {
    id: 'sp1',
    name: 'Before reorganization',
    timestamp: 'Today 10:30 AM',
    user: 'You',
    viewCount: 6,
  },
  {
    id: 'sp2',
    name: 'Initial layout',
    timestamp: 'Yesterday 9:00 AM',
    user: 'Alice',
    viewCount: 4,
  },
  {
    id: 'sp3',
    name: 'After adding CT scans',
    timestamp: 'Dec 18, 2:15 PM',
    user: 'Bob',
    viewCount: 8,
  },
];

// =============================================================================
// INTERACTIVE STORY
// =============================================================================

function InteractiveStory() {
  const [isOpen, setIsOpen] = useState(true);
  const [pendingOps, setPendingOps] = useState(mockPendingOperations);
  const [transactions, setTransactions] = useState(mockTransactions);
  const [savePoints, setSavePoints] = useState(mockSavePoints);
  const [currentSavePoint, setCurrentSavePoint] = useState(null);

  const handleApplyOperations = (ops) => {
    console.log('Applied operations:', ops);
    // Add to transactions
    const newTx = {
      id: `tx-${Date.now()}`,
      user: 'You',
      timestamp: 'Just now',
      segment: 'today',
      operations: ops.map(op => ({
        ...op,
        timeAgo: 'now',
      })),
    };
    setTransactions([newTx, ...transactions]);
    setPendingOps([]);
  };

  const handleCancelOperations = () => {
    console.log('Cancelled all pending operations');
    setPendingOps([]);
  };

  const handleRevertOperation = (opId, txId) => {
    console.log('Reverted operation:', opId, 'in transaction:', txId);
  };

  const handleUndoTransaction = (txId) => {
    console.log('Undid transaction:', txId);
  };

  const handleFollowUser = (userId) => {
    console.log('Following user:', userId);
  };

  const handleGoToViewport = (user) => {
    console.log('Going to viewport of:', user.name);
  };

  const handleGoToCursor = (user) => {
    console.log('Going to cursor of:', user.name);
  };

  const handleCreateSavePoint = () => {
    const newSavePoint = {
      id: `sp-${Date.now()}`,
      name: `Save point ${savePoints.length + 1}`,
      timestamp: 'Just now',
      user: 'You',
      viewCount: 8,
    };
    setSavePoints([newSavePoint, ...savePoints]);
    setCurrentSavePoint(0);
    console.log('Created save point:', newSavePoint);
  };

  const handleRevertToSavePoint = (index) => {
    setCurrentSavePoint(index);
    console.log('Reverted to save point:', savePoints[index]?.name);
  };

  const handleDeleteSavePoint = (index) => {
    setSavePoints(prev => prev.filter((_, i) => i !== index));
    console.log('Deleted save point at index:', index);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: '12px 24px',
          borderRadius: 8,
          background: '#60a5fa',
          border: 'none',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Open Canvas Operations Panel
      </button>
    );
  }

  return (
    <CanvasOperationsPanel
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onMinimize={() => console.log('Minimized')}
      pendingOperations={pendingOps}
      transactions={transactions}
      collaborators={mockCollaborators}
      savePoints={savePoints}
      currentUserId="user1"
      onApplyOperations={handleApplyOperations}
      onCancelOperations={handleCancelOperations}
      onRevertOperation={handleRevertOperation}
      onUndoTransaction={handleUndoTransaction}
      onFollowUser={handleFollowUser}
      onGoToViewport={handleGoToViewport}
      onGoToCursor={handleGoToCursor}
      onCreateSavePoint={handleCreateSavePoint}
      onRevertToSavePoint={handleRevertToSavePoint}
      onDeleteSavePoint={handleDeleteSavePoint}
    />
  );
}

export const Interactive = () => <InteractiveStory />;
Interactive.storyName = 'Interactive Demo';

// =============================================================================
// INDIVIDUAL TAB STORIES
// =============================================================================

export const WithPendingChanges = () => (
  <CanvasOperationsPanel
    isOpen={true}
    onClose={() => {}}
    onMinimize={() => {}}
    pendingOperations={mockPendingOperations}
    transactions={[]}
    collaborators={[]}
    savePoints={[]}
    currentUserId="user1"
  />
);
WithPendingChanges.storyName = 'Transaction Tab - With Changes';

export const NoPendingChanges = () => (
  <CanvasOperationsPanel
    isOpen={true}
    onClose={() => {}}
    onMinimize={() => {}}
    pendingOperations={[]}
    transactions={mockTransactions}
    collaborators={[]}
    savePoints={[]}
    currentUserId="user1"
  />
);
NoPendingChanges.storyName = 'Transaction Tab - Empty';

export const AuditLogWithHistory = () => (
  <CanvasOperationsPanel
    isOpen={true}
    onClose={() => {}}
    onMinimize={() => {}}
    pendingOperations={[]}
    transactions={mockTransactions}
    collaborators={mockCollaborators}
    savePoints={[]}
    currentUserId="user1"
  />
);
AuditLogWithHistory.storyName = 'Audit Log - With History';

export const UsersOnline = () => (
  <CanvasOperationsPanel
    isOpen={true}
    onClose={() => {}}
    onMinimize={() => {}}
    pendingOperations={[]}
    transactions={[]}
    collaborators={mockCollaborators}
    savePoints={[]}
    currentUserId="user1"
  />
);
UsersOnline.storyName = 'Users Tab - Collaborators';

export const SavePointsExist = () => (
  <CanvasOperationsPanel
    isOpen={true}
    onClose={() => {}}
    onMinimize={() => {}}
    pendingOperations={[]}
    transactions={[]}
    collaborators={[]}
    savePoints={mockSavePoints}
    currentUserId="user1"
  />
);
SavePointsExist.storyName = 'Save Points Tab - With Saves';

export const EmptyState = () => (
  <CanvasOperationsPanel
    isOpen={true}
    onClose={() => {}}
    onMinimize={() => {}}
    pendingOperations={[]}
    transactions={[]}
    collaborators={[]}
    savePoints={[]}
    currentUserId="user1"
  />
);
EmptyState.storyName = 'Empty State';
