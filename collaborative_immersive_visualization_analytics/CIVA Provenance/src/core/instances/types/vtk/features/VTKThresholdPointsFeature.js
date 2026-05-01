// src/core/instances/types/vtk/features/VTKThresholdPointsFeature.js

/**
 * VTK Threshold Points Feature
 *
 * Filters points based on scalar values using various criteria.
 * More flexible than the cell-based threshold filter.
 *
 * Provides:
 * - Point filtering by scalar values
 * - Multiple comparison operations
 * - Multi-criteria filtering
 * - Real-time updates
 *
 * @see https://kitware.github.io/vtk-js/examples/ThresholdPoints.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// VTK.js imports
import vtkThresholdPoints from "@kitware/vtk.js/Filters/Core/ThresholdPoints";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Comparison operations
 */
const OPERATIONS = {
  greater: { name: 'Greater Than', value: 'GREATER_THAN' },
  greaterEqual: { name: 'Greater or Equal', value: 'GREATER_THAN_OR_EQUAL_TO' },
  less: { name: 'Less Than', value: 'LESS_THAN' },
  lessEqual: { name: 'Less or Equal', value: 'LESS_THAN_OR_EQUAL_TO' },
  equal: { name: 'Equal To', value: 'EQUAL_TO' },
  notEqual: { name: 'Not Equal', value: 'NOT_EQUAL_TO' },
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  enabled: false,
  criterias: [],
  selectedArray: null,
  operation: 'greater',
  thresholdValue: 0,
  scalarRange: [0, 1],
  showFilteredOnly: true,
};

// =============================================================================
// VTK THRESHOLD POINTS FEATURE
// =============================================================================

export class VTKThresholdPointsFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKThresholdPointsFeature',
      name: 'Threshold Points',
      description: 'Filter points by scalar values',
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
   * Initialize threshold points feature
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects } = instanceData;

    if (!sceneObjects) {
      log.warn(`Cannot initialize threshold points: no sceneObjects for ${instanceId}`);
      return;
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      instanceData,
      // Filter
      thresholdFilter: null,
      // Filtered display
      filteredActor: null,
      filteredMapper: null,
      // Available arrays
      availableArrays: [],
      // Original data backup
      originalPolydata: null,
      originalActorVisibility: true,
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Threshold points feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disableThreshold(state);

    this.instanceStates.delete(instanceId);
    log.debug(`Threshold points feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      enabled: state.enabled,
      selectedArray: state.selectedArray,
      operation: state.operation,
      thresholdValue: state.thresholdValue,
      scalarRange: state.scalarRange,
      availableArrays: state.availableArrays,
      showFilteredOnly: state.showFilteredOnly,
    };
  }

  // ===========================================================================
  // ARRAY SCANNING
  // ===========================================================================

  /**
   * Scan for available scalar arrays
   */
  scanAvailableArrays(instanceId, polydata) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.availableArrays = [];

    // Get point data arrays
    const pointData = polydata.getPointData();
    const numArrays = pointData.getNumberOfArrays();

    for (let i = 0; i < numArrays; i++) {
      const array = pointData.getArrayByIndex(i);
      const name = pointData.getArrayName(i);
      const numComponents = array.getNumberOfComponents();

      // Only single-component arrays for thresholding
      if (numComponents === 1) {
        const range = array.getRange();
        state.availableArrays.push({
          name,
          range: [range[0], range[1]],
          numTuples: array.getNumberOfTuples(),
        });
      }
    }

    // Auto-select first array
    if (state.availableArrays.length > 0 && !state.selectedArray) {
      const firstArray = state.availableArrays[0];
      state.selectedArray = firstArray.name;
      state.scalarRange = firstArray.range;
      state.thresholdValue = (firstArray.range[0] + firstArray.range[1]) / 2;
    }

    log.debug(`Found ${state.availableArrays.length} scalar arrays for point threshold`);
  }

  // ===========================================================================
  // THRESHOLD CONTROLS
  // ===========================================================================

  /**
   * Enable threshold filtering
   */
  enableThreshold(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || state.enabled) return;

    if (!state.selectedArray) {
      log.warn('No array selected for thresholding');
      return;
    }

    const { sceneObjects } = state;
    const { mapper, actor, renderer, renderWindow } = sceneObjects;

    if (!mapper || !renderer) {
      log.warn('Cannot enable threshold: missing mapper or renderer');
      return;
    }

    const inputData = mapper.getInputData();
    if (!inputData) {
      log.warn('Cannot enable threshold: no input data');
      return;
    }

    // Store original
    state.originalPolydata = inputData;
    state.originalActorVisibility = actor?.getVisibility() ?? true;

    // Create threshold filter
    const thresholdFilter = vtkThresholdPoints.newInstance();
    thresholdFilter.setInputData(inputData);

    // Apply criteria
    this._applyCriteria(state, thresholdFilter);

    // Create mapper for filtered points
    const filteredMapper = vtkMapper.newInstance();
    filteredMapper.setInputConnection(thresholdFilter.getOutputPort());

    // Create actor for filtered points
    const filteredActor = vtkActor.newInstance();
    filteredActor.setMapper(filteredMapper);

    // Copy properties from original actor
    if (actor) {
      const origProperty = actor.getProperty();
      const newProperty = filteredActor.getProperty();
      newProperty.setColor(...origProperty.getColor());
      newProperty.setPointSize(origProperty.getPointSize() || 5);
      newProperty.setRepresentation(0); // Points
    }

    // Add to renderer
    renderer.addActor(filteredActor);

    // Hide original if showing filtered only
    if (state.showFilteredOnly && actor) {
      actor.setVisibility(false);
    }

    // Store references
    state.thresholdFilter = thresholdFilter;
    state.filteredMapper = filteredMapper;
    state.filteredActor = filteredActor;
    state.enabled = true;

    renderWindow?.render();

    // Log stats
    const outputData = thresholdFilter.getOutputData();
    const originalPoints = inputData.getNumberOfPoints();
    const filteredPoints = outputData ? outputData.getNumberOfPoints() : 0;
    log.info(`Threshold: ${filteredPoints} / ${originalPoints} points pass filter`);
  }

  /**
   * Disable threshold filtering
   */
  disableThreshold(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    this._disableThreshold(state);
    state.sceneObjects.renderWindow?.render();

    log.debug(`Threshold points disabled for instance: ${instanceId}`);
  }

  /**
   * Internal disable helper
   */
  _disableThreshold(state) {
    const { sceneObjects, filteredActor, filteredMapper, thresholdFilter } = state;
    const { renderer, actor } = sceneObjects || {};

    // Remove filtered actor
    if (filteredActor && renderer) {
      renderer.removeActor(filteredActor);
      filteredActor.delete();
    }

    if (filteredMapper) {
      filteredMapper.delete();
    }

    if (thresholdFilter) {
      thresholdFilter.delete();
    }

    // Restore original actor visibility
    if (actor) {
      actor.setVisibility(state.originalActorVisibility);
    }

    state.filteredActor = null;
    state.filteredMapper = null;
    state.thresholdFilter = null;
    state.enabled = false;
  }

  /**
   * Apply threshold criteria to filter
   */
  _applyCriteria(state, filter) {
    const { selectedArray, operation, thresholdValue } = state;

    const opValue = OPERATIONS[operation]?.value || 'GREATER_THAN';

    filter.setCriterias([
      {
        arrayName: selectedArray,
        fieldAssociation: 'PointData',
        operation: opValue,
        value: thresholdValue,
      },
    ]);
  }

  /**
   * Toggle threshold on/off
   */
  toggleThreshold(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (state.enabled) {
      this.disableThreshold(instanceId);
    } else {
      this.enableThreshold(instanceId);
    }
  }

  /**
   * Set threshold value
   */
  setThresholdValue(instanceId, value) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.thresholdValue = Math.max(state.scalarRange[0], Math.min(state.scalarRange[1], value));

    if (state.enabled && state.thresholdFilter) {
      this._applyCriteria(state, state.thresholdFilter);
      state.sceneObjects.renderWindow?.render();
    }
  }

  /**
   * Set comparison operation
   */
  setOperation(instanceId, operation) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (!OPERATIONS[operation]) {
      log.warn(`Unknown operation: ${operation}`);
      return;
    }

    state.operation = operation;

    if (state.enabled && state.thresholdFilter) {
      this._applyCriteria(state, state.thresholdFilter);
      state.sceneObjects.renderWindow?.render();
    }
  }

  /**
   * Select array for thresholding
   */
  selectArray(instanceId, arrayName) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const arrayInfo = state.availableArrays.find(a => a.name === arrayName);
    if (!arrayInfo) {
      log.warn(`Array not found: ${arrayName}`);
      return;
    }

    state.selectedArray = arrayName;
    state.scalarRange = arrayInfo.range;
    state.thresholdValue = (arrayInfo.range[0] + arrayInfo.range[1]) / 2;

    if (state.enabled && state.thresholdFilter) {
      this._applyCriteria(state, state.thresholdFilter);
      state.sceneObjects.renderWindow?.render();
    }
  }

  /**
   * Toggle show filtered only
   */
  toggleShowFilteredOnly(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.showFilteredOnly = !state.showFilteredOnly;

    if (state.enabled) {
      const { actor } = state.sceneObjects;
      if (actor) {
        actor.setVisibility(!state.showFilteredOnly);
      }
      state.sceneObjects.renderWindow?.render();
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
    if (!state || state.availableArrays.length === 0) return [];

    const tools = [
      {
        id: 'threshold-points-toggle',
        type: 'toggle',
        icon: 'filter',
        label: state.enabled ? 'Point Filter On' : 'Filter Points',
        description: 'Filter points by scalar values',
        active: state.enabled,
        onClick: () => this.toggleThreshold(instanceId),
      },
    ];

    if (state.enabled) {
      tools.push(
        // Operation selection
        {
          id: 'threshold-operation',
          type: 'menu',
          icon: 'code',
          label: OPERATIONS[state.operation]?.name || 'Operation',
          description: 'Comparison operation',
          options: Object.entries(OPERATIONS).map(([id, op]) => ({
            id: `op-${id}`,
            label: op.name,
            active: state.operation === id,
            onClick: () => this.setOperation(instanceId, id),
          })),
        },
        // Value presets
        {
          id: 'threshold-value',
          type: 'menu',
          icon: 'sliders',
          label: `Value: ${state.thresholdValue.toFixed(2)}`,
          description: `Range: ${state.scalarRange[0].toFixed(2)} - ${state.scalarRange[1].toFixed(2)}`,
          options: [0, 0.25, 0.5, 0.75, 1].map(fraction => {
            const value = state.scalarRange[0] + fraction * (state.scalarRange[1] - state.scalarRange[0]);
            return {
              id: `val-${Math.round(fraction * 100)}`,
              label: `${Math.round(fraction * 100)}% (${value.toFixed(2)})`,
              onClick: () => this.setThresholdValue(instanceId, value),
            };
          }),
        },
        // Show original toggle
        {
          id: 'threshold-show-all',
          type: 'toggle',
          icon: state.showFilteredOnly ? 'eye-off' : 'eye',
          label: state.showFilteredOnly ? 'Filtered Only' : 'Show All',
          description: 'Toggle original points visibility',
          active: !state.showFilteredOnly,
          onClick: () => this.toggleShowFilteredOnly(instanceId),
        }
      );

      // Array selection (if multiple)
      if (state.availableArrays.length > 1) {
        tools.push({
          id: 'threshold-array',
          type: 'menu',
          icon: 'database',
          label: state.selectedArray || 'Array',
          description: 'Select array for filtering',
          options: state.availableArrays.map(arr => ({
            id: `arr-${arr.name}`,
            label: arr.name,
            active: state.selectedArray === arr.name,
            onClick: () => this.selectArray(instanceId, arr.name),
          })),
        });
      }
    }

    return tools;
  }
}

// Export singleton instance
export const vtkThresholdPointsFeature = new VTKThresholdPointsFeature();
export default vtkThresholdPointsFeature;
