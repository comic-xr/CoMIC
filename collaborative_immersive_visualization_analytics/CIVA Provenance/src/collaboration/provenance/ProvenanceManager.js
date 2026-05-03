/**
 * @file ProvenanceManager.js
 * @description Manages temporal provenance graphs for collaborative analysis.
 *
 * The graph is stored in Y.js so branches, restores, and merges remain visible
 * to every collaborator in real time.
 */

import { v4 as uuidv4 } from "uuid";
import { ydoc, yProvenance } from "../yjs/yjsSetup";

function cloneSerializable(value) {
  return value == null ? null : JSON.parse(JSON.stringify(value));
}

function normalizeParentIds(parentId = null, parentIds = []) {
  const ids = [...parentIds];
  if (parentId) {
    ids.unshift(parentId);
  }
  return [...new Set(ids.filter(Boolean))];
}

function sortByTimestampAsc(nodes) {
  return [...nodes].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

function deriveFallbackBranchId(state, parents) {
  const inherited = parents.find((node) => node?.branchId)?.branchId;
  if (inherited) return inherited;

  const viewId = state?.id || state?.viewId || "global";
  return `branch:${viewId}`;
}

class ProvenanceManager {
  static commitState(intent, state, user, parentId = null, options = {}) {
    const id = uuidv4();
    const parentIds = normalizeParentIds(parentId, options.parentIds || []);
    const parentNodes = parentIds
      .map((candidateId) => yProvenance.get(candidateId))
      .filter(Boolean);
    const timestamp = options.timestamp || Date.now();
    const branchId =
      options.branchId ||
      deriveFallbackBranchId(state, parentNodes);

    const node = {
      id,
      parentId: parentIds[0] || null,
      parentIds,
      intent,
      type: options.type || "state",
      branchId,
      state: cloneSerializable(state),
      timestamp,
      user: cloneSerializable(user) || {},
      metadata: cloneSerializable(options.metadata) || {},
      tags: [...new Set(options.tags || [])],
      mergedFrom: cloneSerializable(options.mergedFrom) || [],
      restoredFrom: options.restoredFrom || null,
    };

    ydoc.transact(() => {
      yProvenance.set(id, node);
    }, options.transactionOrigin || "provenance-commit");

    return id;
  }

  static mergeStates(intent, state, user, parentIds, options = {}) {
    const normalizedParents = normalizeParentIds(null, parentIds);
    if (normalizedParents.length < 2) {
      throw new Error("mergeStates requires at least two parent nodes");
    }

    return this.commitState(intent, state, user, normalizedParents[0], {
      ...options,
      type: "merge",
      parentIds: normalizedParents,
      mergedFrom:
        options.mergedFrom ||
        normalizedParents.map((nodeId) => ({
          nodeId,
          branchId: this.getNode(nodeId)?.branchId || null,
        })),
      branchId:
        options.branchId ||
        deriveFallbackBranchId(state, normalizedParents.map((id) => this.getNode(id))),
      transactionOrigin: options.transactionOrigin || "provenance-merge",
    });
  }

  static async restoreNode(nodeId, options = {}) {
    const sourceNode = this.getNode(nodeId);
    if (!sourceNode) {
      throw new Error(`Cannot restore missing provenance node: ${nodeId}`);
    }

    const restoredState = cloneSerializable(sourceNode.state);
    if (!restoredState?.id && !restoredState?.viewId) {
      throw new Error(`Provenance node ${nodeId} does not contain a restorable view ID`);
    }

    if (typeof options.onRestore === "function") {
      await options.onRestore(restoredState, sourceNode);
    }

    const nextBranchId =
      options.branchId ||
      `${sourceNode.branchId || deriveFallbackBranchId(restoredState, [sourceNode])}:fork:${uuidv4().slice(0, 8)}`;

    const restoredNodeId = this.commitState(
      options.intent || `Restored to: ${sourceNode.intent}`,
      restoredState,
      options.user || sourceNode.user || {},
      sourceNode.id,
      {
        ...options,
        type: options.type || "restore",
        branchId: nextBranchId,
        restoredFrom: sourceNode.id,
        metadata: {
          restoredFromIntent: sourceNode.intent,
          ...(options.metadata || {}),
        },
        transactionOrigin: options.transactionOrigin || "provenance-restore",
      }
    );

    return {
      restoredNodeId,
      restoredState,
      sourceNode,
      branchId: nextBranchId,
    };
  }

  static getGraphNodes(filters = {}) {
    const {
      viewId = null,
      branchId = null,
      type = null,
      sort = "asc",
    } = filters;

    let nodes = Array.from(yProvenance.values());

    if (viewId) {
      nodes = nodes.filter(
        (node) => node?.state?.id === viewId || node?.state?.viewId === viewId
      );
    }

    if (branchId) {
      nodes = nodes.filter((node) => node.branchId === branchId);
    }

    if (type) {
      nodes = nodes.filter((node) => node.type === type);
    }

    const sorted = sortByTimestampAsc(nodes);
    return sort === "desc" ? sorted.reverse() : sorted;
  }

  static getNode(id) {
    return yProvenance.get(id) || null;
  }

  static getChildren(nodeId) {
    return this.getGraphNodes().filter((node) =>
      (node.parentIds || [node.parentId].filter(Boolean)).includes(nodeId)
    );
  }

  static getLineage(nodeId) {
    const lineage = [];
    let current = this.getNode(nodeId);
    const visited = new Set();

    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      lineage.unshift(current);
      current = current.parentId ? this.getNode(current.parentId) : null;
    }

    return lineage;
  }

  static searchNodes(query, filters = {}) {
    const normalizedQuery = `${query || ""}`.trim().toLowerCase();
    if (!normalizedQuery) {
      return this.getGraphNodes(filters);
    }

    return this.getGraphNodes(filters).filter((node) => {
      const haystack = [
        node.intent,
        node.user?.name,
        node.branchId,
        node.type,
        ...(node.tags || []),
        Object.values(node.metadata || {}).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }

  static getLatestNode(viewId) {
    const viewNodes = this.getGraphNodes({ viewId, sort: "desc" });
    return viewNodes[0] || null;
  }
}

export default ProvenanceManager;
