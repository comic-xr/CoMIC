import { describe, it, expect, vi, beforeEach } from 'vitest';

// Setup Y.js mock before importing ProvenanceManager to ensure module replacement
const { mockDoc, mockProvenanceMap } = vi.hoisted(() => {
  const backingMap = new Map();
  return {
    mockDoc: {
      transact: (callback) => callback(),
    },
    mockProvenanceMap: {
      clear: () => backingMap.clear(),
      get: (key) => backingMap.get(key),
      set: (key, value) => backingMap.set(key, value),
      values: () => backingMap.values(),
    },
  };
});

vi.mock('@Collaboration/yjs/yjsSetup', () => ({
  ydoc: mockDoc,
  yProvenance: mockProvenanceMap,
}));

import ProvenanceManager from './ProvenanceManager';

describe('ProvenanceManager', () => {
  beforeEach(() => {
    // Clear the map between tests
    mockProvenanceMap.clear();
  });

  describe('commitState', () => {
    it('should successfully commit a node into the Y.js map', () => {
      const intent = 'Added Threshold filter';
      const state = { id: 'view-1', filters: ['f1'] };
      const user = { id: 'user-1', name: 'Alice' };

      const id = ProvenanceManager.commitState(intent, state, user, null);

      expect(id).toBeTypeOf('string');
      
      const savedNode = mockProvenanceMap.get(id);
      expect(savedNode).toBeDefined();
      expect(savedNode.id).toBe(id);
      expect(savedNode.intent).toBe(intent);
      expect(savedNode.state).toEqual(state);
      expect(savedNode.user).toEqual(user);
      expect(savedNode.parentId).toBeNull();
      expect(savedNode.timestamp).toBeTypeOf('number');
    });

    it('should deep clone the state payload to prevent reference mutation', () => {
      const state = { id: 'view-1', data: { nested: true } };
      const id = ProvenanceManager.commitState('Intent', state, { id: 'u1' }, null);
      
      // Mutate original
      state.data.nested = false;
      
      const savedNode = mockProvenanceMap.get(id);
      expect(savedNode.state.data.nested).toBe(true); // Should remain true
    });

    it('should keep parentIds and branch metadata for derived nodes', () => {
      const rootId = ProvenanceManager.commitState(
        'Root',
        { id: 'view-1' },
        { id: 'u1', name: 'Alice' },
        null
      );

      const childId = ProvenanceManager.commitState(
        'Child',
        { id: 'view-1', filters: ['f1'] },
        { id: 'u1', name: 'Alice' },
        rootId,
        { branchId: 'branch:view-1:fork' }
      );

      const child = mockProvenanceMap.get(childId);
      expect(child.parentId).toBe(rootId);
      expect(child.parentIds).toEqual([rootId]);
      expect(child.branchId).toBe('branch:view-1:fork');
    });
  });

  describe('Graph Query Methods', () => {
    it('getGraphNodes should return all values in the provenance map', () => {
      ProvenanceManager.commitState('Node 1', {}, { id: 'u1' }, null);
      ProvenanceManager.commitState('Node 2', {}, { id: 'u1' }, null);
      
      const nodes = ProvenanceManager.getGraphNodes();
      expect(nodes).toHaveLength(2);
    });

    it('getNode should retrieve a specific node by id', () => {
      const id = ProvenanceManager.commitState('Target', {}, { id: 'u1' }, null);
      const node = ProvenanceManager.getNode(id);
      expect(node.intent).toBe('Target');
    });

    it('getNode should return null for missing IDs', () => {
      expect(ProvenanceManager.getNode('missing-id')).toBeNull();
    });

    it('getChildren should return descendants for a node', () => {
      const rootId = ProvenanceManager.commitState('Root', { id: 'view-1' }, { id: 'u1' }, null);
      const childA = ProvenanceManager.commitState('A', { id: 'view-1' }, { id: 'u1' }, rootId);
      const childB = ProvenanceManager.commitState('B', { id: 'view-1' }, { id: 'u2' }, rootId);

      const children = ProvenanceManager.getChildren(rootId);
      expect(children.map((node) => node.id)).toEqual([childA, childB]);
    });

    it('searchNodes should match intent, tags, and metadata', () => {
      ProvenanceManager.commitState('Threshold', { id: 'view-1' }, { id: 'u1', name: 'Alice' }, null, {
        tags: ['filter'],
        metadata: { detail: 'density slider' },
      });
      ProvenanceManager.commitState('Camera move', { id: 'view-1' }, { id: 'u2', name: 'Bob' }, null);

      expect(ProvenanceManager.searchNodes('density')).toHaveLength(1);
      expect(ProvenanceManager.searchNodes('alice')).toHaveLength(1);
      expect(ProvenanceManager.searchNodes('camera')).toHaveLength(1);
    });
  });

  describe('getLatestNode (Chronological Parent Tracking)', () => {
    it('should return null if there are no nodes for the specified view', () => {
      ProvenanceManager.commitState('Other View', { id: 'view-2' }, { id: 'u1' }, null);
      expect(ProvenanceManager.getLatestNode('view-1')).toBeNull();
    });

    it('should return the chronologically latest node for a specific viewId', async () => {
      // Node A: Older node for view-1
      const idA = ProvenanceManager.commitState('Older', { id: 'view-1' }, { id: 'u1' }, null);
      
      // Artificial delay (vitest fake timers aren't strictly necessary since we can just mock Date.now if needed, 
      // but setTimeout works fine here or we can manually edit the timestamp property directly for deterministic tests)
      const nodeA = mockProvenanceMap.get(idA);
      
      const idB = ProvenanceManager.commitState('Middle', { id: 'view-2' }, { id: 'u1' }, null); // Different view
      
      const idC = ProvenanceManager.commitState('Latest', { id: 'view-1' }, { id: 'u1' }, null);
      const nodeC = mockProvenanceMap.get(idC);
      
      // Force timestamps to guarantee order mathematically 
      nodeA.timestamp = 1000;
      nodeC.timestamp = 2000;
      
      // Save back adjusted nodes
      mockProvenanceMap.set(idA, nodeA);
      mockProvenanceMap.set(idC, nodeC);

      const latest = ProvenanceManager.getLatestNode('view-1');
      expect(latest.id).toBe(idC);
      expect(latest.intent).toBe('Latest');
    });
  });

  describe('advanced provenance flows', () => {
    it('mergeStates should create a merge node with multiple parents', () => {
      const leftId = ProvenanceManager.commitState('Left branch', { id: 'view-1', left: true }, { id: 'u1' }, null);
      const rightId = ProvenanceManager.commitState('Right branch', { id: 'view-1', right: true }, { id: 'u2' }, leftId, {
        branchId: 'branch:view-1:right',
      });

      const mergeId = ProvenanceManager.mergeStates(
        'Merged branches',
        { id: 'view-1', merged: true },
        { id: 'u3', name: 'Carol' },
        [leftId, rightId]
      );

      const mergeNode = ProvenanceManager.getNode(mergeId);
      expect(mergeNode.type).toBe('merge');
      expect(mergeNode.parentIds).toEqual([leftId, rightId]);
      expect(mergeNode.mergedFrom).toHaveLength(2);
    });

    it('restoreNode should call the restore callback and create a restore branch', async () => {
      const sourceId = ProvenanceManager.commitState(
        'Original state',
        { id: 'view-1', filters: [{ id: 'f1' }] },
        { id: 'u1', name: 'Alice' },
        null
      );

      const onRestore = vi.fn(async () => {});
      const result = await ProvenanceManager.restoreNode(sourceId, {
        user: { id: 'u2', name: 'Bob' },
        onRestore,
      });

      expect(onRestore).toHaveBeenCalledTimes(1);
      expect(result.restoredState).toEqual({ id: 'view-1', filters: [{ id: 'f1' }] });

      const restoredNode = ProvenanceManager.getNode(result.restoredNodeId);
      expect(restoredNode.type).toBe('restore');
      expect(restoredNode.parentId).toBe(sourceId);
      expect(restoredNode.restoredFrom).toBe(sourceId);
      expect(restoredNode.branchId).toContain(':fork:');
    });
  });
});
