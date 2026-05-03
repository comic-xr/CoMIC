// src/core/instances/features/ReductionFeature.js

import { FeatureInterface } from "./FeatureInterface.js";

/**
 * Reduction Feature Interface
 *
 * Defines the contract for dimensionality reduction features.
 * This extends FeatureInterface with reduction-specific methods.
 *
 * Handlers that support reduction implement this interface.
 * Different instance types (VTK, Plotly, etc.) would have their own
 * implementations that know how to extract/apply points in their format.
 */
export class ReductionFeature extends FeatureInterface {
  /**
   * Get available reduction methods for this instance type
   *
   * Different instance types might support different methods.
   * VTK might support PCA/t-SNE/UMAP.
   * A graph visualization might support force-directed layouts instead.
   *
   * @returns {Array<string>} Method names (e.g., ['pca', 'tsne', 'umap'])
   */
  getAvailableMethods() {
    throw new Error(
      "ReductionFeature.getAvailableMethods() must be implemented"
    );
  }

  /**
   * Apply a reduction method to the instance's data
   *
   * This is the main operation: take high-dimensional data and reduce it
   * to lower dimensions for visualization.
   *
   * @param {string} instanceId - Instance to apply to
   * @param {string} method - Reduction method name (from getAvailableMethods)
   * @param {number} components - Number of output dimensions (typically 2 or 3)
   * @param {Object} options - Method-specific options
   * @returns {Promise<void>}
   */
  async applyReduction(instanceId, method, components, options = {}) {
    throw new Error("ReductionFeature.applyReduction() must be implemented");
  }

  /**
   * Restore original data (undo reduction)
   *
   * Reverts the instance back to its original, unreduced data.
   *
   * @param {string} instanceId - Instance to restore
   * @returns {Promise<void>}
   */
  async restoreOriginal(instanceId) {
    throw new Error("ReductionFeature.restoreOriginal() must be implemented");
  }

  /**
   * Check if reduction is currently applied
   *
   * @param {string} instanceId - Instance to check
   * @returns {boolean} True if reduction is currently applied
   */
  isApplied(instanceId) {
    throw new Error("ReductionFeature.isApplied() must be implemented");
  }

  /**
   * Get reduction metadata
   *
   * Overrides FeatureInterface.getMetadata() with reduction-specific info.
   */
  getMetadata() {
    return {
      ...super.getMetadata(),
      category: "analysis",
      requiresData: true,
      computeIntensive: true,
    };
  }
}
