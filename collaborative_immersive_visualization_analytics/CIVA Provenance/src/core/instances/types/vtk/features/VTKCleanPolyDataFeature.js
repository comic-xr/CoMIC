// src/core/instances/types/vtk/features/VTKCleanPolyDataFeature.js

/**
 * VTK Clean PolyData Feature
 *
 * Cleans and optimizes polygon mesh data by:
 * - Merging duplicate points
 * - Removing degenerate cells
 * - Removing unused points
 * - Optimizing mesh topology
 *
 * Useful for:
 * - Reducing memory usage
 * - Improving rendering performance
 * - Preparing data for further processing
 *
 * @see https://kitware.github.io/vtk-js/api/Filters_Core_CleanPolyData.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// VTK.js imports
import vtkCleanPolyData from "@kitware/vtk.js/Filters/Core/CleanPolyData";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  // Point merging
  pointMerging: true,
  tolerance: 0.0,
  toleranceIsAbsolute: false,
  // Degenerate handling
  removeDegenerate: true,
  // Output settings
  outputPointsPrecision: 'DEFAULT', // 'SINGLE', 'DOUBLE', 'DEFAULT'
};

/**
 * Precision options
 */
const PRECISION_OPTIONS = {
  default: { name: 'Default', value: 'DEFAULT' },
  single: { name: 'Single (32-bit)', value: 'SINGLE' },
  double: { name: 'Double (64-bit)', value: 'DOUBLE' },
};

// =============================================================================
// VTK CLEAN POLYDATA FEATURE
// =============================================================================

export class VTKCleanPolyDataFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKCleanPolyDataFeature',
      name: 'Clean PolyData',
      description: 'Clean and optimize mesh data',
      version: '1.0.0',
      author: 'CIA Team',
    };
  }

  /**
   * Check if this feature is available
   */
  isAvailable(instanceId, instanceData) {
    return instanceData?.sceneObjects?.mapper != null;
  }

  /**
   * Initialize clean polydata feature
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects } = instanceData;

    if (!sceneObjects) {
      log.warn(`Cannot initialize clean polydata: no sceneObjects for ${instanceId}`);
      return;
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      instanceData,
      // Filter
      cleanFilter: null,
      // Statistics
      stats: null,
      // Original data
      originalPolydata: null,
      isCleaningActive: false,
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Clean polydata feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._restoreOriginal(state);

    if (state.cleanFilter) {
      state.cleanFilter.delete();
    }

    this.instanceStates.delete(instanceId);
    log.debug(`Clean polydata feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      isCleaningActive: state.isCleaningActive,
      pointMerging: state.pointMerging,
      tolerance: state.tolerance,
      toleranceIsAbsolute: state.toleranceIsAbsolute,
      removeDegenerate: state.removeDegenerate,
      stats: state.stats,
    };
  }

  // ===========================================================================
  // CLEANING OPERATIONS
  // ===========================================================================

  /**
   * Apply cleaning to the mesh
   */
  applyClean(instanceId, options = {}) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    const { sceneObjects } = state;
    const { mapper, renderWindow } = sceneObjects;

    if (!mapper) {
      log.warn('Cannot clean: no mapper available');
      return null;
    }

    const inputData = mapper.getInputData();
    if (!inputData) {
      log.warn('Cannot clean: no input data');
      return null;
    }

    // Store original if not already stored
    if (!state.originalPolydata) {
      state.originalPolydata = inputData;
    }

    // Get original stats
    const originalPoints = inputData.getNumberOfPoints();
    const originalCells = inputData.getNumberOfCells();

    // Create and configure clean filter
    const cleanFilter = vtkCleanPolyData.newInstance();
    cleanFilter.setInputData(state.originalPolydata);

    // Apply settings
    const pointMerging = options.pointMerging ?? state.pointMerging;
    const tolerance = options.tolerance ?? state.tolerance;
    const toleranceIsAbsolute = options.toleranceIsAbsolute ?? state.toleranceIsAbsolute;

    cleanFilter.setPointMerging(pointMerging);
    cleanFilter.setTolerance(tolerance);
    cleanFilter.setToleranceIsAbsolute(toleranceIsAbsolute);

    // Update state
    state.pointMerging = pointMerging;
    state.tolerance = tolerance;
    state.toleranceIsAbsolute = toleranceIsAbsolute;

    // Execute filter
    cleanFilter.update();
    const cleanedData = cleanFilter.getOutputData();

    if (!cleanedData) {
      log.error('Clean filter produced no output');
      return null;
    }

    // Get cleaned stats
    const cleanedPoints = cleanedData.getNumberOfPoints();
    const cleanedCells = cleanedData.getNumberOfCells();

    // Calculate reduction
    state.stats = {
      originalPoints,
      originalCells,
      cleanedPoints,
      cleanedCells,
      pointsRemoved: originalPoints - cleanedPoints,
      cellsRemoved: originalCells - cleanedCells,
      pointReduction: ((originalPoints - cleanedPoints) / originalPoints * 100).toFixed(2),
      cellReduction: ((originalCells - cleanedCells) / originalCells * 100).toFixed(2),
    };

    // Apply cleaned data to mapper
    mapper.setInputData(cleanedData);

    // Store filter reference
    if (state.cleanFilter) {
      state.cleanFilter.delete();
    }
    state.cleanFilter = cleanFilter;
    state.isCleaningActive = true;

    renderWindow?.render();

    log.info(`Mesh cleaned: ${state.stats.pointsRemoved} points removed (${state.stats.pointReduction}%), ` +
             `${state.stats.cellsRemoved} cells removed (${state.stats.cellReduction}%)`);

    return state.stats;
  }

  /**
   * Restore original mesh
   */
  restoreOriginal(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._restoreOriginal(state);
    state.sceneObjects.renderWindow?.render();

    log.debug(`Original mesh restored for instance: ${instanceId}`);
  }

  /**
   * Internal restore helper
   */
  _restoreOriginal(state) {
    if (!state.isCleaningActive || !state.originalPolydata) return;

    const { mapper } = state.sceneObjects;
    if (mapper) {
      mapper.setInputData(state.originalPolydata);
    }

    if (state.cleanFilter) {
      state.cleanFilter.delete();
      state.cleanFilter = null;
    }

    state.isCleaningActive = false;
    state.stats = null;
  }

  /**
   * Toggle cleaning on/off
   */
  toggleClean(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (state.isCleaningActive) {
      this.restoreOriginal(instanceId);
    } else {
      this.applyClean(instanceId);
    }
  }

  /**
   * Set point merging tolerance
   */
  setTolerance(instanceId, tolerance, isAbsolute = false) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.tolerance = Math.max(0, tolerance);
    state.toleranceIsAbsolute = isAbsolute;

    if (state.isCleaningActive) {
      this.applyClean(instanceId);
    }
  }

  /**
   * Toggle point merging
   */
  togglePointMerging(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.pointMerging = !state.pointMerging;

    if (state.isCleaningActive) {
      this.applyClean(instanceId);
    }
  }

  // ===========================================================================
  // TOOLS INTERFACE
  // ===========================================================================

  /**
   * Get tools for the toolbar
   */
  getTools(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return [];

    const tools = [
      {
        id: 'clean-mesh-toggle',
        type: 'toggle',
        icon: 'sparkles',
        label: state.isCleaningActive ? 'Mesh Cleaned' : 'Clean Mesh',
        description: state.stats
          ? `Removed ${state.stats.pointsRemoved} points (${state.stats.pointReduction}%)`
          : 'Remove duplicate points and degenerate cells',
        active: state.isCleaningActive,
        onClick: () => this.toggleClean(instanceId),
      },
    ];

    if (state.isCleaningActive) {
      tools.push(
        {
          id: 'clean-tolerance',
          type: 'menu',
          icon: 'sliders',
          label: `Tolerance: ${state.tolerance}`,
          description: 'Point merging tolerance',
          options: [
            { id: 'tol-0', label: '0 (exact)', onClick: () => this.setTolerance(instanceId, 0) },
            { id: 'tol-0001', label: '0.0001', onClick: () => this.setTolerance(instanceId, 0.0001) },
            { id: 'tol-001', label: '0.001', onClick: () => this.setTolerance(instanceId, 0.001) },
            { id: 'tol-01', label: '0.01', onClick: () => this.setTolerance(instanceId, 0.01) },
            { id: 'tol-1', label: '0.1', onClick: () => this.setTolerance(instanceId, 0.1) },
          ],
        },
        {
          id: 'clean-merge-toggle',
          type: 'toggle',
          icon: 'git-merge',
          label: state.pointMerging ? 'Merging On' : 'Merging Off',
          description: 'Toggle point merging',
          active: state.pointMerging,
          onClick: () => this.togglePointMerging(instanceId),
        }
      );
    }

    return tools;
  }
}

// Export singleton instance
export const vtkCleanPolyDataFeature = new VTKCleanPolyDataFeature();
export default vtkCleanPolyDataFeature;
