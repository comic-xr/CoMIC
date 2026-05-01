// src/core/instances/types/vtk/features/VTKReductionFeature.js

import { ReductionFeature } from "@Core/instances/features/ReductionFeature.js";
import { performPCA } from "@Algorithms/dimensionality/pca.js";
import { performTSNE } from "@Algorithms/dimensionality/tsne.js";
import { performUMAP } from "@Algorithms/dimensionality/umap.js";
import clientConfig from "@Core/config/clientConfig.js";
import {
  extractPointsFromPolyData,
  applyReductionToPolyData,
  clonePolydata,
} from "@VTK/utils/VTKPointProcessing.js";
import vtkManifestData from "@VTK/manifest";
import { render as log } from "@Utils/logger.js";
import { useComputeJobStore, JobStatus } from "@UI/react/store/computeJobStore.js";

// Server operation IDs (shared via manifest/registry)
const SERVER_OPERATION_IDS = {
  pca: "dr-pca",
  tsne: "dr-tsne",
  umap: "dr-umap",
};

// File types this handler declares as server-compute capable for DR
const SERVER_SUPPORTED_INPUTS = new Set(["vtp", "ply", "obj", "stl"]);

function emitToast(message, type = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("cia:toast", {
      detail: { message, type },
    })
  );
}

/**
 * VTK Dimensionality Reduction Feature
 *
 * CRITICAL INITIALIZATION FIX:
 * We do NOT clone polydata during initialize() because there's no data yet!
 * Instead, we save the original polydata the FIRST time data is loaded.
 * This is stored in instanceStates and used for restoration.
 */
export class VTKReductionFeature extends ReductionFeature {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Ensure state exists for this instance (lazy init when called from handler)
   */
  _ensureState(instanceId, instanceData) {
    if (this.instanceStates.has(instanceId)) {
      return this.instanceStates.get(instanceId);
    }

    if (!instanceData?.sceneObjects) {
      return null;
    }

    const state = {
      method: null,
      components: null,
      isApplied: false,
      isProcessing: false,
      originalPolydata: null,
      sceneObjects: instanceData.sceneObjects,
      datasetId: instanceData.datasetId || null,
      projectId: instanceData.projectId || null,
    };

    this.instanceStates.set(instanceId, state);
    return state;
  }

  /**
   * Initialize for an instance
   *
   * IMPORTANT: At this point, there's no data loaded yet.
   * We just set up the empty state structure.
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects } = instanceData;

    // Create empty state - we'll save original data when it's first loaded
    this.instanceStates.set(instanceId, {
      method: null,
      components: null,
      isApplied: false,
      isProcessing: false, // Track if reduction is in progress
      originalPolydata: null, // Will be set when data is first loaded
      sceneObjects,
      datasetId: instanceData.datasetId || null,
      projectId: instanceData.projectId || null,
    });

    log.debug(`VTK Reduction feature initialized for instance: ${instanceId}`);
  }

  /**
   * Toggle a reduction method on/off
   * If the method is currently active, restore original data
   * If not active or a different method is active, apply new reduction
   *
   * @param {string} instanceId - Instance to toggle
   * @param {string} method - Method to toggle ('pca', 'tsne', 'umap')
   * @returns {Promise<void>}
   */
  async toggleReduction(instanceId, method, options = {}) {
    const state =
      this.instanceStates.get(instanceId) ||
      this._ensureState(instanceId, options.instanceData);

    if (!state) {
      log.warn(`Instance ${instanceId} not initialized for reduction`);
      emitToast("Reduction not available for this instance", "error");
      return;
    }

    // Prevent double-clicks while processing
    if (state.isProcessing) {
      log.debug(`Reduction already in progress for ${instanceId}`);
      return;
    }

    try {
      state.isProcessing = true;

      // If this method is currently active, turn it off
      if (state.isApplied && state.method === method) {
        await this.restoreOriginal(instanceId);
        emitToast("Restored original data", "success");
      } else {
        // Show loading indicator
        const methodName = method.toUpperCase();
        emitToast(`Applying ${methodName} reduction...`, "info");

        // Either no reduction active, or different method active
        // Apply this method with current components (default to 3D)
        const components = state.components || 3;
        await this.applyReduction(instanceId, method, components, options);

        // Show success toast
        emitToast(`${methodName} reduction applied!`, "success");
      }
    } catch (error) {
      log.error(`Reduction toggle failed: ${error?.message || error}`);
      emitToast(`Reduction failed: ${error?.message || "Unknown error"}`, "error");
    } finally {
      state.isProcessing = false;
    }
  }

  /**
   * Change number of components (2D vs 3D)
   * Only works if a reduction is currently applied
   *
   * @param {string} instanceId - Instance to update
   * @param {number} components - Number of dimensions (2 or 3)
   * @returns {Promise<void>}
   */
  async setComponents(instanceId, components, options = {}) {
    const state =
      this.instanceStates.get(instanceId) ||
      this._ensureState(instanceId, options.instanceData);

    if (!state) {
      log.warn(`Instance ${instanceId} not initialized for reduction`);
      return;
    }

    if (!state.isApplied || !state.method) {
      log.warn("No reduction applied - can't change components");
      return;
    }

    // Already at this dimension count?
    if (state.components === components) {
      log.debug(`Already using ${components} components`);
      return;
    }

    // Re-apply same method with new component count
    log.debug(`Changing from ${state.components}D to ${components}D`);

    // IMPORTANT: Save method before restoreOriginal clears it
    const methodToApply = state.method;

    // Restore original first (this clears state.method!)
    await this.restoreOriginal(instanceId);

    // Re-apply with new components using saved method
    await this.applyReduction(instanceId, methodToApply, components);
  }

  /**
   * Get current reduction components
   *
   * @param {string} instanceId - Instance to query
   * @returns {number|null} Number of components (2 or 3), or null if no reduction
   */
  getCurrentComponents(instanceId) {
    const state = this.instanceStates.get(instanceId);
    return state?.components || null;
  }

  /**
   * Check if any reduction is applied
   *
   * @param {string} instanceId - Instance to check
   * @returns {boolean} True if reduction is active
   */
  hasReduction(instanceId) {
    const state = this.instanceStates.get(instanceId);
    return state?.isApplied || false;
  }

  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);

    if (state && state.originalPolydata) {
      // Clean up the cloned polydata to free memory
      if (state.originalPolydata.delete) {
        state.originalPolydata.delete();
      }
    }

    this.instanceStates.delete(instanceId);
    log.debug(`VTK Reduction cleaned up for instance: ${instanceId}`);
  }

  getAvailableMethods() {
    return ["pca", "tsne", "umap"];
  }

  /**
   * Request server-side reduction (cached) if available
   * Returns reduced points array or null if not ready/available
   */
  async _computeViaServer({
    datasetId,
    projectId,
    method,
    components,
    params,
    onStatus,
    setCacheId,
  }) {
    const operation = SERVER_OPERATION_IDS[method];
    log.debug(`_computeViaServer: method=${method}, operation=${operation}, datasetId=${datasetId}`);
    if (!operation || !datasetId) {
      log.warn(`_computeViaServer: early return - operation=${operation}, datasetId=${datasetId}`);
      return null;
    }

    const apiBase = clientConfig.apiBaseUrl;

    // Ensure handler declares support for this operation/type
    const declaredOps =
      vtkManifestData.compute?.serverSide?.operations?.map((op) => op.id) || [];
    if (!declaredOps.includes(operation)) {
      log.warn(`Server operation ${operation} not declared for VTK handler`);
      return null;
    }
    const body = {
      fileId: datasetId,
      projectId,
      operation,
      params: { ...params, components },
      priority: 5,
    };

    const response = await fetch(`${apiBase}/compute/jobs`, {
      method: "POST",
      credentials: "include", // Include auth cookies
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Compute request failed: ${response.status}`);
    }

    const data = await response.json();

    // Cache hit path
    if (data.cached) {
      if (typeof setCacheId === "function" && data.cacheId) {
        setCacheId(data.cacheId);
      }
      onStatus?.("cache-hit", data.cacheId);
      const fromResult = this._extractPointsFromResult(data.result);
      if (fromResult) return fromResult;

      const cacheId = data.cacheId || data.cache_id;
      if (cacheId) {
        const meta = await this._fetchCacheMetadata(apiBase, cacheId);
        const fromMeta = this._extractPointsFromResult(meta);
        if (fromMeta) return fromMeta;

        const downloaded = await this._downloadCache(apiBase, cacheId);
        if (downloaded) return downloaded;
      }

      log.warn(`Cache hit for ${operation} but no usable result metadata`);
      return null;
    }

    // In-progress or newly queued: wait for completion and then fetch cache
    const jobId = data.job?.id || data.job?.jobId || data.job?.job_id;
    if (data.existing) {
      log.info(
        `Compute job already in progress for ${operation} on dataset ${datasetId}`
      );
      onStatus?.("existing");
    } else if (data.success) {
      log.info(
        `Queued server compute job ${jobId} for ${operation} (dataset ${datasetId})`
      );
      onStatus?.("queued");
    }

    if (!jobId) {
      return null;
    }

    // Register job with the compute store so WebSocket events can update it
    const store = useComputeJobStore.getState();
    store.addJob({
      id: jobId,
      fileId: datasetId,
      fileName: `Dataset ${datasetId.substring(0, 8)}`,
      operation,
      params: { ...params, components },
    });

    // Wait for job completion using WebSocket events via store subscription
    const result = await this._waitForJobViaStore(jobId, apiBase, onStatus);
    if (result?.cacheId && typeof setCacheId === "function") {
      setCacheId(result.cacheId);
    }
    return result?.points || null;
  }

  /**
   * Wait for job completion via store subscription (WebSocket events)
   * Falls back to HTTP polling if store doesn't update within timeout
   */
  async _waitForJobViaStore(jobId, apiBase, onStatus) {
    const maxWaitMs = 120000; // 2 minutes max wait

    return new Promise((resolve) => {
      let resolved = false;
      let unsubscribe = null;

      const cleanup = () => {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      };

      const handleComplete = async (job) => {
        if (resolved) return;
        resolved = true;
        cleanup();

        log.debug(`Job ${jobId} completed via WebSocket, cacheId=${job.result?.cacheId}`);
        onStatus?.("cache-hit", job.result?.cacheId);

        // Get the actual points from the cache
        if (job.result?.cacheId) {
          const downloaded = await this._downloadCache(apiBase, job.result.cacheId);
          if (downloaded) {
            resolve({ cacheId: job.result.cacheId, points: downloaded });
            return;
          }
        }

        // Fallback: try to get from cache metadata
        if (job.result?.metadata) {
          const fromMeta = this._extractPointsFromResult(job.result.metadata);
          if (fromMeta) {
            resolve({ cacheId: job.result?.cacheId, points: fromMeta });
            return;
          }
        }

        // If we got complete but no data, fall back to polling
        log.warn(`Job ${jobId} complete but no data from WebSocket, falling back to polling`);
        const polled = await this._waitForJobCache(apiBase, jobId, onStatus);
        resolve(polled);
      };

      const handleFailed = (job) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        log.error(`Job ${jobId} failed: ${job.error}`);
        onStatus?.("failed");
        resolve(null);
      };

      // Subscribe to store changes
      unsubscribe = useComputeJobStore.subscribe((state) => {
        const job = state.jobs[jobId];
        if (!job) return;

        if (job.status === JobStatus.COMPLETE) {
          handleComplete(job);
        } else if (job.status === JobStatus.FAILED) {
          handleFailed(job);
        }
      });

      // Check if already complete (in case we missed the event)
      const currentJob = useComputeJobStore.getState().jobs[jobId];
      if (currentJob?.status === JobStatus.COMPLETE) {
        handleComplete(currentJob);
        return;
      } else if (currentJob?.status === JobStatus.FAILED) {
        handleFailed(currentJob);
        return;
      }

      // Timeout fallback: switch to HTTP polling if WebSocket doesn't deliver
      setTimeout(async () => {
        if (resolved) return;

        log.warn(`Job ${jobId} WebSocket timeout after ${maxWaitMs}ms, falling back to HTTP polling`);
        cleanup();
        resolved = true;

        const polled = await this._waitForJobCache(apiBase, jobId, onStatus);
        resolve(polled);
      }, maxWaitMs);
    });
  }

  _extractPointsFromResult(result) {
    if (!result) return null;
    if (Array.isArray(result.reducedPoints)) return result.reducedPoints;
    if (Array.isArray(result.points)) return result.points;
    return null;
  }

  async _fetchCacheMetadata(apiBase, cacheId) {
    try {
      const res = await fetch(`${apiBase}/compute/cache/${cacheId}`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.cache?.result_metadata || null;
    } catch {
      return null;
    }
  }

  async _downloadCache(apiBase, cacheId) {
    try {
      const res = await fetch(`${apiBase}/compute/cache/${cacheId}/download`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const text = await res.text();
      try {
        const parsed = JSON.parse(text);
        return this._extractPointsFromResult(parsed) || parsed;
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * Poll a job until it completes and return reduced points from cache
   */
  async _waitForJobCache(apiBase, jobId, onStatus) {
    const maxAttempts = 30;
    const delayMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const res = await fetch(`${apiBase}/compute/jobs/${jobId}`, {
          credentials: "include",
        });
        if (!res.ok) {
          log.debug(`Job poll ${attempt + 1}/${maxAttempts}: HTTP ${res.status}`);
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        const data = await res.json();
        const job = data.job;

        // Handle both snake_case and camelCase field names from API
        const cacheId = job?.cache_id || job?.cacheId;
        const resultStorageKey = job?.result_storage_key || job?.resultStorageKey;
        const jobStatus = job?.status;

        log.debug(`Job poll ${attempt + 1}/${maxAttempts}: status=${jobStatus}, cacheId=${cacheId}, resultKey=${resultStorageKey}`);

        if (jobStatus === "complete" || jobStatus === "completed") {
          // Try to get from cache first
          if (cacheId) {
            const meta = await this._fetchCacheMetadata(apiBase, cacheId);
            const fromMeta = this._extractPointsFromResult(meta);
            if (fromMeta) {
              log.debug(`Got points from cache metadata: ${fromMeta.length} points`);
              onStatus?.("cache-hit", cacheId);
              return { cacheId, points: fromMeta };
            }

            const downloaded = await this._downloadCache(apiBase, cacheId);
            if (downloaded) {
              log.debug(`Got points from cache download: ${Array.isArray(downloaded) ? downloaded.length : 'object'}`);
              onStatus?.("cache-hit", cacheId);
              return { cacheId, points: downloaded };
            }
          }

          // Fallback: try to download from result_storage_key directly
          if (resultStorageKey) {
            log.debug(`Trying direct download from storage key: ${resultStorageKey}`);
            const directResult = await this._downloadFromStorageKey(apiBase, resultStorageKey);
            if (directResult) {
              log.debug(`Got points from direct download: ${Array.isArray(directResult) ? directResult.length : 'object'}`);
              onStatus?.("cache-hit", cacheId);
              return { cacheId, points: directResult };
            }
          }

          // Job complete but couldn't get results
          log.warn(`Job ${jobId} complete but couldn't retrieve results`);
        } else if (jobStatus === "failed") {
          onStatus?.("failed");
          throw new Error(job.error_message || job.errorMessage || "Compute job failed");
        }
      } catch (err) {
        log.warn(`Polling job ${jobId} failed: ${err?.message || err}`);
      }

      // Wait before next attempt
      await new Promise((r) => setTimeout(r, delayMs));
    }

    onStatus?.("timeout");
    return null;
  }

  /**
   * Download result directly from storage key (MinIO path)
   */
  async _downloadFromStorageKey(apiBase, storageKey) {
    try {
      const res = await fetch(`${apiBase}/files/download?key=${encodeURIComponent(storageKey)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        log.debug(`Direct download failed: ${res.status}`);
        return null;
      }
      const text = await res.text();
      try {
        const parsed = JSON.parse(text);
        return this._extractPointsFromResult(parsed) || parsed;
      } catch {
        return null;
      }
    } catch (err) {
      log.debug(`Direct download error: ${err?.message || err}`);
      return null;
    }
  }

  /**
   * Apply reduction to the instance's data
   *
   * CRITICAL: We save the original polydata the FIRST time this is called
   *
   * @param {boolean} options.skipSync - If true, don't call requestSync (used when applying remote state)
   * @param {boolean} options.forceServer - If true, do not fall back to local compute when cache/job is missing
   * @param {Object} options.params - Extra params for server compute (e.g., perplexity)
   * @param {Object} options.instanceData - Optional instanceData to lazy-init state when called from handler
   */
  async applyReduction(instanceId, method, components, options = {}) {
    const state =
      this.instanceStates.get(instanceId) ||
      this._ensureState(instanceId, options.instanceData);

    if (!state) {
      throw new Error(`Instance ${instanceId} not initialized for reduction`);
    }

    const { sceneObjects } = state;
    const { mapper, renderer, renderWindow } = sceneObjects;
    const currentPolydata = mapper.getInputData();

    // Guard: Check if there's actually data to reduce
    if (!currentPolydata) {
      log.warn(
        `Cannot apply reduction: no data loaded in instance ${instanceId}`
      );
      return;
    }

    // PERFORMANCE GUARD: Warn for large datasets
    const pointCount = currentPolydata.getPoints().getNumberOfPoints();
    if (pointCount > 100000) {
      log.warn(
        `Large dataset (${pointCount.toLocaleString()} points) - reduction may be slow`
      );
    }

    log.debug(
      `Applying ${method} reduction (${components}D) to ${pointCount.toLocaleString()} points`
    );

    try {
      // CRITICAL: Save original polydata the FIRST time we apply reduction
      // This lets us restore later
      if (!state.originalPolydata) {
        log.debug("Saving original polydata for restoration");
        state.originalPolydata = clonePolydata(currentPolydata);
      }

      // Prefer server-side compute when we have a datasetId (cached results)
      let reducedPoints = null;
      state.datasetId = options.datasetId || state.datasetId || null;
      state.projectId = options.projectId || state.projectId || null;

      const handleStatus = (status, _cacheId) => {
        switch (status) {
          case "cache-hit":
            emitToast("Using cached reduction", "success");
            break;
          case "queued":
            emitToast("Reduction queued on server…", "info");
            break;
          case "existing":
            emitToast("Reduction already running on server…", "info");
            break;
          default:
            break;
        }
      };

      log.debug(`applyReduction: state.datasetId=${state.datasetId}, options.datasetId=${options.datasetId}`);
      if (state.datasetId) {
        try {
          reducedPoints = await this._computeViaServer({
            datasetId: state.datasetId,
            projectId: state.projectId,
            method,
            components,
            params: options.params || {},
            onStatus: (status, cacheId) => {
              options.onStatus?.(status, cacheId);
              handleStatus(status, cacheId);
            },
            setCacheId: (cacheId) => {
              state.cacheId = cacheId;
            },
          });
        } catch (serverError) {
          log.warn(
            `Server-side ${method} failed, falling back to local compute:`,
            serverError?.message || serverError
          );
        }
      }

      // Fallback to local compute only for PCA (cheapest) unless forced off
      const allowLocalFallback =
        method === "pca" && options.forceServer !== true;

      if (!reducedPoints && allowLocalFallback) {
        const pointsMatrix = await extractPointsFromPolyData(currentPolydata);

        if (!pointsMatrix || pointsMatrix.length === 0) {
          throw new Error("No points to reduce");
        }

        log.debug(`Processing ${pointsMatrix.length.toLocaleString()} points`);

        switch (method) {
          case "pca":
            reducedPoints = await performPCA(pointsMatrix, components);
            break;

          case "tsne":
            reducedPoints = await performTSNE(
              pointsMatrix,
              components,
              options
            );
            break;

          case "umap":
            reducedPoints = await performUMAP(
              pointsMatrix,
              components,
              options
            );
            break;

          default:
            throw new Error(`Unknown reduction method: ${method}`);
        }
      } else if (!reducedPoints) {
        throw new Error(
          `Server-side ${method} unavailable and local fallback disabled`
        );
      }

      // Apply reduced points back to the polydata
      applyReductionToPolyData(currentPolydata, reducedPoints);

      // Update state
      state.method = method;
      state.components = components;
      state.isApplied = true;

      // Re-render
      mapper.setInputData(currentPolydata);
      renderer.resetCamera();
      renderWindow.render();

      log.debug("Reduction applied successfully");

      // REQUEST SYNC: Notify other users about the reduction (unless this is from remote state)
      if (!options.skipSync) {
        const workspaceManager = window.CIA?.workspaceManager;
        if (workspaceManager?.requestSync) {
          await workspaceManager.requestSync(instanceId);
          log.debug("Reduction synced to remote users");
        } else {
          log.debug("workspaceManager.requestSync not available; skipping sync");
        }
      }
    } catch (error) {
      log.error("Reduction failed:", error);
      emitToast(
        `Reduction failed: ${error?.message || error}`,
        "error"
      );
      throw error;
    }
  }

  /**
   * Restore original data
   *
   * @param {Object} options - Options
   * @param {boolean} options.skipSync - If true, don't call requestSync (used when applying remote state)
   */
  async restoreOriginal(instanceId, options = {}) {
    const state =
      this.instanceStates.get(instanceId) ||
      this._ensureState(instanceId, options.instanceData);

    if (!state || !state.isApplied) {
      return; // Nothing to restore
    }

    // Guard: Make sure we actually have original data saved
    if (!state.originalPolydata) {
      log.warn(
        `Cannot restore: no original data saved for instance ${instanceId}`
      );
      return;
    }

    const { sceneObjects } = state;
    const { mapper, renderer, renderWindow } = sceneObjects;

    log.debug(`Restoring original data for instance ${instanceId}`);

    // Clone the original (don't modify our backup!)
    const restoredPolydata = clonePolydata(state.originalPolydata);

    // Replace current data
    mapper.setInputData(restoredPolydata);

    // Update state
    state.isApplied = false;
    state.method = null;
    state.components = null;

    // Re-render
    renderer.resetCamera();
    renderWindow.render();

    log.debug("Original data restored");

    // REQUEST SYNC: Notify other users about the restoration (unless this is from remote state)
    if (!options.skipSync) {
      const workspaceManager = window.CIA?.workspaceManager;
      if (workspaceManager?.requestSync) {
        await workspaceManager.requestSync(instanceId);
        log.debug("Restoration synced to remote users");
      } else {
        log.debug("workspaceManager.requestSync not available; skipping sync");
      }
    }
  }

  isApplied(instanceId) {
    const state = this.instanceStates.get(instanceId);
    return state ? state.isApplied : false;
  }

  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);

    if (!state) {
      return null;
    }

    return {
      method: state.method,
      components: state.components,
      isApplied: state.isApplied,
      availableMethods: this.getAvailableMethods(),
    };
  }

  /**
   * Get tools for the toolbar
   */
  /**
   * Get tools for the toolbar
   *
   * Returns tool definitions using Lucide icon IDs (no emojis)
   */
  getTools(instanceId) {
    const state = this.instanceStates.get(instanceId);

    if (!state) {
      return [];
    }

    const tools = [];

    // ========================================================================
    // MAIN REDUCTION MENU
    // ========================================================================
    tools.push({
      id: "reduction",
      icon: "reduction", // → Maps to BarChart3
      label: "Dimensionality Reduction",
      description: "Reduce data to 2D or 3D",
      type: "menu",
      active: state.isApplied,
      options: [
        {
          id: "pca",
          icon: "pca", // → Maps to TrendingUp
          label: "PCA",
          description: "Principal Component Analysis - Fast, linear",
          active: state.isApplied && state.method === "pca",
          onClick: () => this._toggleReduction(instanceId, "pca"),
        },
        {
          id: "tsne",
          icon: "tsne", // → Maps to Network
          label: "t-SNE",
          description: "Preserves local structure, nonlinear",
          active: state.isApplied && state.method === "tsne",
          onClick: () => this._toggleReduction(instanceId, "tsne"),
        },
        {
          id: "umap",
          icon: "umap", // → Maps to Network
          label: "UMAP",
          description: "Balances local and global structure",
          active: state.isApplied && state.method === "umap",
          onClick: () => this._toggleReduction(instanceId, "umap"),
        },
        {
          type: "separator",
        },
        {
          id: "restore",
          icon: "restore", // → Maps to RotateCcw
          label: "Restore Original",
          description: "Reset to full-dimensional data",
          disabled: !state.isApplied,
          onClick: () => this.restoreOriginal(instanceId),
        },
      ],
    });

    // ========================================================================
    // DIMENSION SELECTOR (only shown when reduction is active)
    // ========================================================================
    if (state.isApplied) {
      tools.push({
        id: "dimensions",
        icon: "dimensions", // → Maps to Layers
        label: `${state.components}D Projection`,
        description: "Change projection dimensions",
        type: "menu",
        active: true,
        options: [
          {
            id: "dimension-2d",
            icon: "dimension-2d", // → Maps to Square
            label: "2D Projection",
            description: "Flatten to 2 dimensions",
            active: state.components === 2,
            onClick: () => this._changeDimensions(instanceId, 2),
          },
          {
            id: "dimension-3d",
            icon: "dimension-3d", // → Maps to Box
            label: "3D Projection",
            description: "Reduce to 3 dimensions",
            active: state.components === 3,
            onClick: () => this._changeDimensions(instanceId, 3),
          },
        ],
      });
    }

    return tools;
  }

  // Helper methods (no changes needed, included for completeness)
  async _toggleReduction(instanceId, method) {
    const state = this.instanceStates.get(instanceId);

    if (state.isApplied && state.method === method) {
      // If same method is active, restore original
      await this.restoreOriginal(instanceId);
    } else {
      // Apply reduction (defaults to 2D)
      await this.applyReduction(instanceId, method, 2);
    }
  }

  async _changeDimensions(instanceId, components) {
    const state = this.instanceStates.get(instanceId);

    if (state.isApplied && state.method) {
      // IMPORTANT: Save method before restoreOriginal clears it
      const methodToApply = state.method;
      // Restore original first, then reapply with new dimensions
      await this.restoreOriginal(instanceId);
      await this.applyReduction(instanceId, methodToApply, components);
    }
  }

  // ============================================================================
  // ICON CHOICES EXPLAINED
  // ============================================================================

  /*
Why these specific icons?

✅ reduction: BarChart3
   - Represents data analysis and statistical operations
   - Commonly used for analytics features

✅ pca: TrendingUp
   - PCA finds linear trends in data
   - Upward arrow suggests progressive transformation

✅ tsne / umap: Network
   - Both algorithms work with data manifolds and neighborhoods
   - Network icon represents interconnected data points

✅ restore: RotateCcw
   - Universal "undo" symbol
   - Counter-clockwise arrow suggests going back

✅ dimensions: Layers
   - Multiple layers represent multiple dimensions
   - Common metaphor for dimensional data

✅ dimension-2d: Square
   - Flat square represents 2D plane
   - Simple, clear geometric shape

✅ dimension-3d: Box
   - 3D cube represents 3D space
   - Obvious visual for three dimensions

ALTERNATIVES YOU COULD USE:

If you want different aesthetics:
- reduction: Network, GitBranch (branching paths)
- pca: GitBranch (component branches)
- tsne/umap: TrendingUp (data transformation)
- dimensions: Box (geometric), Maximize2 (expanding)

The key is consistency - pick icons that make sense together!
*/

  // Helper methods
  async _toggleReduction(instanceId, method) {
    const state = this.instanceStates.get(instanceId);

    if (state.isApplied && state.method === method) {
      await this.restoreOriginal(instanceId);
    } else {
      await this.applyReduction(instanceId, method, 2);
    }
  }

  async _changeDimensions(instanceId, components) {
    const state = this.instanceStates.get(instanceId);

    if (state.isApplied && state.method) {
      // IMPORTANT: Save method before restoreOriginal clears it
      const methodToApply = state.method;
      // Restore original first, then reapply with new dimensions
      await this.restoreOriginal(instanceId);
      await this.applyReduction(instanceId, methodToApply, components);
    }
  }
}
