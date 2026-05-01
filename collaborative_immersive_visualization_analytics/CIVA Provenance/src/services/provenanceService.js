import { apiClient } from "./apiClient.js";
import { sessionManager } from "@Core/session/sessionManager.js";

function resolveProjectId(projectId) {
  return projectId || sessionManager.getRoomId();
}

class ProvenanceServiceClient {
  async getHistory({ projectId, viewId = null, limit = 50, offset = 0 } = {}) {
    const resolvedProjectId = resolveProjectId(projectId);
    const params = new URLSearchParams();
    if (viewId) params.set("viewId", viewId);
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    return apiClient.get(
      `/projects/${resolvedProjectId}/provenance/history?${params.toString()}`
    );
  }

  async getGraph({ projectId, viewId = null } = {}) {
    const resolvedProjectId = resolveProjectId(projectId);
    const params = new URLSearchParams();
    if (viewId) params.set("viewId", viewId);

    const query = params.toString();
    return apiClient.get(
      `/projects/${resolvedProjectId}/provenance/graph${query ? `?${query}` : ""}`
    );
  }

  async getSnapshots({ projectId, viewId = null, limit = 100, offset = 0 } = {}) {
    const resolvedProjectId = resolveProjectId(projectId);
    const params = new URLSearchParams();
    if (viewId) params.set("viewId", viewId);
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    return apiClient.get(
      `/projects/${resolvedProjectId}/provenance/snapshots?${params.toString()}`
    );
  }

  async createSnapshot({
    projectId,
    viewId,
    name,
    description = "",
    actionIntent = "save_checkpoint",
    metadata = {},
  }) {
    const resolvedProjectId = resolveProjectId(projectId);
    return apiClient.post(`/projects/${resolvedProjectId}/provenance/snapshots`, {
      viewId,
      name,
      description,
      actionIntent,
      metadata,
    });
  }

  async restoreSnapshot({ projectId, snapshotId }) {
    const resolvedProjectId = resolveProjectId(projectId);
    return apiClient.post(
      `/projects/${resolvedProjectId}/provenance/snapshots/${snapshotId}/restore`
    );
  }

  async restoreHistoryEvent({ projectId, historyId }) {
    const resolvedProjectId = resolveProjectId(projectId);
    return apiClient.post(
      `/projects/${resolvedProjectId}/provenance/history/${historyId}/restore`
    );
  }

  async explainSnapshotDiff({ projectId, snapshotAId, snapshotBId }) {
    const resolvedProjectId = resolveProjectId(projectId);
    return apiClient.post(
      `/projects/${resolvedProjectId}/provenance/snapshots/explain-diff`,
      {
        snapshotAId,
        snapshotBId,
      }
    );
  }
}

export const provenanceService = new ProvenanceServiceClient();
