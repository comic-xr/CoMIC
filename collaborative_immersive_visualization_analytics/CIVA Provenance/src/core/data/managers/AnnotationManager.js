// src/core/data/managers/AnnotationManager.js
//
// v2.0: Server-authoritative - annotations sync via REST API + WebSocket
// Y.js sync removed. Real-time updates come via serverSync.js broadcasts.
//
// MIGRATED: Now extends BaseManager for standardized event handling

import { Annotation } from "@Core/data/models/Annotation.js";
import {
  getUserId,
  getUserName,
  getUserColor,
} from "@Collaboration/presence/userManagement.js";
import { config } from "@Core/config/clientConfig.js";
import { annotation as log } from "@Utils/logger.js";
import { apiClient } from "@Services/apiClient.js";
import { BaseManager } from "@Core/data/managers/BaseManager.js";

/**
 * AnnotationManager - Unified annotation system for the three-layer architecture
 *
 * ARCHITECTURE INTEGRATION:
 * - Annotations belong to Datasets (Layer 1), not views or instances
 * - Server is the source of truth for annotations
 * - Real-time sync via WebSocket broadcasts (serverSync.js)
 * - DatasetManager owns the annotations, this manager provides the interface
 * - ViewConfigurations filter which annotations to display
 * - Instance handlers render the filtered annotations
 */
export class AnnotationManager extends BaseManager {
  constructor(datasetManager) {
    super({
      events: ["annotationAdded", "annotationRemoved", "annotationUpdated"],
      logCategory: "annotation",
    });

    // Reference to DatasetManager (owns the annotations)
    this._datasetManager = datasetManager;

    // Server API configuration
    this._apiBaseUrl = config.apiBaseUrl;
  }

  // ==================== INITIALIZATION ====================

  /**
   * Initialize the annotation manager
   */
  initialize() {
    this._log.debug("Initializing...");
    this._log.info("Initialized (server-authoritative mode)");
  }

  /**
   * Handle server broadcast for annotation events
   * Called by serverSync.js when annotation events are received
   */
  handleServerBroadcast(eventType, msg) {
    switch (eventType) {
      case "annotation:created":
        this._handleRemoteAnnotationCreated(msg);
        break;
      case "annotation:updated":
        this._handleRemoteAnnotationUpdated(msg);
        break;
      case "annotation:deleted":
        this._handleRemoteAnnotationDeleted(msg);
        break;
    }
  }

  _handleRemoteAnnotationCreated(msg) {
    const { fileId, annotation: annotationData } = msg;
    const dataset = this._datasetManager.getDataset(fileId);
    if (!dataset) {
      this._log.debug(`Dataset ${fileId} not found for remote annotation`);
      return;
    }

    const annotation = Annotation.fromJSON(annotationData);
    dataset.addAnnotation(annotation);
    this._emit("annotationAdded", { datasetId: fileId, annotation });
    this._log.debug(`Remote annotation added: ${annotation.id}`);
  }

  _handleRemoteAnnotationUpdated(msg) {
    const { annotation: annotationData } = msg;
    const dataset = this._datasetManager.getDataset(annotationData.fileId);
    if (!dataset) return;

    const annotation = dataset.getAnnotation(annotationData.id);
    if (annotation) {
      Object.assign(annotation, annotationData);
      this._emit("annotationUpdated", {
        datasetId: annotationData.fileId,
        annotation,
      });
    }
  }

  _handleRemoteAnnotationDeleted(msg) {
    const { annotationId, fileId } = msg;
    const dataset = this._datasetManager.getDataset(fileId);
    if (!dataset) return;

    dataset.removeAnnotation(annotationId);
    this._emit("annotationRemoved", { datasetId: fileId, annotationId });
  }

  // ==================== ANNOTATION LIFECYCLE ====================

  /**
   * Create a new annotation on a dataset
   *
   * Delegates to DatasetManager which has the correct server API integration.
   *
   * @param {string} datasetId - Dataset to annotate
   * @param {object} config - Annotation configuration
   * @param {array} config.position - [x, y, z] in dataset coordinates
   * @param {string} config.text - Annotation text
   * @param {string} config.type - Annotation type (point, line, region, etc.)
   * @param {array} config.tags - Optional tags for categorization
   * @param {string} config.visibility - 'public' or 'private'
   * @param {object} options - { projectId }
   * @returns {Promise<Annotation>} - The created annotation
   */
  async createAnnotation(datasetId, annotationConfig, options = {}) {
    const annotation = await this._datasetManager.addAnnotation(
      datasetId,
      annotationConfig,
      getUserId(),
      options
    );

    // DatasetManager already emits 'annotationAdded', but we also emit our own
    // for any listeners subscribed directly to AnnotationManager
    this._emit("annotationAdded", { datasetId, annotation });

    this._log.debug(`Annotation created via DatasetManager: ${annotation.id}`);
    return annotation;
  }

  /**
   * Update an annotation
   *
   * @param {string} datasetId - Dataset ID
   * @param {string} annotationId - Annotation ID
   * @param {object} updates - Updates to apply
   * @returns {Promise<Annotation>}
   */
  async updateAnnotation(datasetId, annotationId, updates) {
    const dataset = this._datasetManager.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    const annotation = dataset.getAnnotation(annotationId);
    if (!annotation) {
      throw new Error(`Annotation ${annotationId} not found`);
    }

    try {
      const result = await apiClient.put(
        `/annotations/${annotationId}`,
        updates
      );

      // Update local copy
      Object.assign(annotation, updates);
      this._emit("annotationUpdated", { datasetId, annotation });

      this._log.debug(`Annotation updated: ${annotationId}`);
      return annotation;
    } catch (error) {
      this._log.error(`Failed to update annotation ${annotationId}:`, error);
      throw error;
    }
  }

  /**
   * Delete an annotation
   *
   * @param {string} datasetId - Dataset ID
   * @param {string} annotationId - Annotation ID
   * @returns {Promise<void>}
   */
  async deleteAnnotation(datasetId, annotationId) {
    const dataset = this._datasetManager.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    try {
      await apiClient.delete(`/annotations/${annotationId}`);

      dataset.removeAnnotation(annotationId);
      this._emit("annotationRemoved", { datasetId, annotationId });

      this._log.debug(`Annotation deleted: ${annotationId}`);
    } catch (error) {
      this._log.error(`Failed to delete annotation ${annotationId}:`, error);
      throw error;
    }
  }

  // ==================== QUERY METHODS ====================

  /**
   * Get all annotations for a dataset
   *
   * @param {string} datasetId - Dataset ID
   * @param {object} filter - Optional filter (e.g., { type: 'point' })
   * @returns {Annotation[]}
   */
  getAnnotations(datasetId, filter = null) {
    const dataset = this._datasetManager.getDataset(datasetId);
    if (!dataset) return [];

    return dataset.getAnnotations(filter, getUserId());
  }

  /**
   * Get annotations filtered for a view configuration
   *
   * @param {string} datasetId - Dataset ID
   * @param {AnnotationDisplayConfig} displayConfig - View's display config
   * @returns {Annotation[]}
   */
  getAnnotationsForView(datasetId, displayConfig) {
    const dataset = this._datasetManager.getDataset(datasetId);
    if (!dataset) return [];

    return displayConfig.filterAnnotations(dataset.annotations, getUserId());
  }

  // ==================== CLEANUP ====================
  // NOTE: dispose() is inherited from BaseManager - no need to override
  // unless we have AnnotationManager-specific cleanup
}

// Export singleton instance (will be initialized in appInitializer)
export let annotationManager = null;

/**
 * Initialize the annotation manager
 * Called from appInitializer.js after DatasetManager is ready
 */
export function initializeAnnotationManager(datasetManager) {
  annotationManager = new AnnotationManager(datasetManager);
  annotationManager.initialize();
  return annotationManager;
}
