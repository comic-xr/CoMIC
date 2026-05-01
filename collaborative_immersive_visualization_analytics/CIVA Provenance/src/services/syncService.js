// src/services/syncService.js
// Handles client-server state reconciliation

import clientConfig from "@Core/config/clientConfig.js";
import { sync as log } from "@Utils/logger.js";

// localStorage key for sync state
const SYNC_STATE_KEY = "cia_sync_state";

// Divergence thresholds
const THRESHOLDS = {
  SILENT: 5, // 0-5 orphans: silent cleanup
  MODERATE: 20, // 6-20 orphans: toast notification
  // 20+ or version mismatch: major divergence
};

/**
 * Divergence levels for UI decisions
 */
export const DivergenceLevel = {
  NONE: "none",
  MINOR: "minor", // 1-5 orphans, silent cleanup
  MODERATE: "moderate", // 6-20 orphans, show toast
  MAJOR: "major", // Server reset detected
  OFFLINE: "offline", // Can't reach server
};

/**
 * Get stored sync state from localStorage
 */
function getStoredSyncState() {
  try {
    const stored = localStorage.getItem(SYNC_STATE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    log.warn("Failed to read sync state:", e);
    return null;
  }
}

/**
 * Save sync state to localStorage
 */
function saveSyncState(state) {
  try {
    localStorage.setItem(
      SYNC_STATE_KEY,
      JSON.stringify({
        ...state,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (e) {
    log.warn("Failed to save sync state:", e);
  }
}

/**
 * Clear stored sync state
 */
export function clearSyncState() {
  localStorage.removeItem(SYNC_STATE_KEY);
  log.debug("Sync state cleared");
}

/**
 * Fetch server sync status
 */
export async function fetchServerStatus() {
  try {
    const response = await fetch(`${clientConfig.apiBaseUrl}/sync/status`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    log.error("Failed to fetch server status:", error);
    return null;
  }
}

/**
 * Check if server has been reset since last sync
 */
export async function checkForServerReset() {
  const serverStatus = await fetchServerStatus();

  if (!serverStatus) {
    return { reset: false, serverStatus: null, offline: true };
  }

  const storedState = getStoredSyncState();

  // First time syncing
  if (!storedState || !storedState.serverInstanceId) {
    log.debug("First sync - no previous state");
    return { reset: false, serverStatus, firstSync: true };
  }

  // Compare server instance IDs
  const reset = storedState.serverInstanceId !== serverStatus.serverInstanceId;

  if (reset) {
    log.warn("Server reset detected!");
    log.warn(`  Previous: ${storedState.serverInstanceId}`);
    log.warn(`  Current:  ${serverStatus.serverInstanceId}`);
  }

  return { reset, serverStatus };
}

/**
 * Calculate divergence level based on orphan count
 */
export function calculateDivergence(orphanCount, serverReset) {
  if (serverReset) return DivergenceLevel.MAJOR;
  if (orphanCount === 0) return DivergenceLevel.NONE;
  if (orphanCount <= THRESHOLDS.SILENT) return DivergenceLevel.MINOR;
  if (orphanCount <= THRESHOLDS.MODERATE) return DivergenceLevel.MODERATE;
  return DivergenceLevel.MAJOR;
}

/**
 * Update sync state after successful reconciliation
 */
export function updateSyncState(serverStatus, reconciliationResult) {
  saveSyncState({
    serverInstanceId: serverStatus.serverInstanceId,
    schemaVersion: serverStatus.schemaVersion,
    lastSyncAt: new Date().toISOString(),
    lastReconciliation: {
      orphansRemoved: reconciliationResult.orphansRemoved || 0,
      added: reconciliationResult.added || 0,
      total: reconciliationResult.total || 0,
    },
  });
  log.debug("Sync state updated");
}

/**
 * Main sync check - called early in app initialization
 */
export async function checkSyncStatus() {
  log.info("Checking sync status...");

  const { reset, serverStatus, offline, firstSync } =
    await checkForServerReset();

  if (offline) {
    log.warn("Server unreachable - continuing with local state");
    return {
      divergence: DivergenceLevel.OFFLINE,
      serverStatus: null,
      canContinue: true,
      message: "Working offline",
    };
  }

  if (reset) {
    return {
      divergence: DivergenceLevel.MAJOR,
      serverStatus,
      canContinue: true, // Will clear state automatically
      message: "Server database was reset",
      requiresClear: true,
    };
  }

  return {
    divergence: DivergenceLevel.NONE,
    serverStatus,
    canContinue: true,
    firstSync,
  };
}

/**
 * Perform full reconciliation
 */
export async function performReconciliation(
  datasetManager,
  viewManager,
  serverStatus
) {
  log.info("Performing reconciliation...");

  const results = {
    datasets: { orphansRemoved: 0, added: 0 },
    views: { orphansRemoved: 0, added: 0 },
  };

  // Reconcile datasets first
  if (datasetManager?.reconcileWithServer) {
    results.datasets = await datasetManager.reconcileWithServer();
  }

  // Then views
  if (viewManager?.reconcileWithServer) {
    results.views = await viewManager.reconcileWithServer();
  }

  // Calculate divergence
  const totalOrphans =
    results.datasets.orphansRemoved + results.views.orphansRemoved;
  const divergence = calculateDivergence(totalOrphans, false);

  // Update stored state
  if (serverStatus) {
    updateSyncState(serverStatus, {
      orphansRemoved: totalOrphans,
      added: results.datasets.added + results.views.added,
      total: (results.datasets.total || 0) + (results.views.total || 0),
    });
  }

  return { ...results, totalOrphansRemoved: totalOrphans, divergence };
}

// Debug access
if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.syncService = {
    checkSyncStatus,
    fetchServerStatus,
    clearSyncState,
    getStoredSyncState,
  };
}
