// src/core/instances/types/vtk/features/VTKThresholdFeature.js

/**
 * VTK Threshold Feature
 *
 * Filters data points/cells based on scalar values.
 * Useful for isolating regions of interest in datasets.
 *
 * Provides:
 * - Scalar-based thresholding
 * - Min/max range selection
 * - Array selection for multi-scalar data
 * - Preview of affected points
 *
 * @see https://kitware.github.io/vtk-js/api/Filters_General_Calculator.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// VTK.js imports
import vtkCalculator from "@kitware/vtk.js/Filters/General/Calculator";
import { FieldDataTypes } from "@kitware/vtk.js/Common/DataModel/DataSet/Constants";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Threshold modes
 */
const THRESHOLD_MODES = {
  between: { name: 'Between', description: 'Show values between min and max' },
  above: { name: 'Above', description: 'Show values above threshold' },
  below: { name: 'Below', description: 'Show values below threshold' },
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  enabled: false,
  mode: 'between',
  minValue: 0,
  maxValue: 1,
  selectedArray: null,
  showOriginal: false,  // Show original data as wireframe
};

// =============================================================================
// VTK THRESHOLD FEATURE
// =============================================================================

export class VTKThresholdFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKThresholdFeature',
      name: 'Threshold Filter',
      description: 'Filter data by scalar value ranges',
      version: '1.0.0',
      author: 'CIA Team',
    };
  }

  /**
   * Check if this feature is available
   */
  isAvailable(instanceId, instanceData) {
    const datasetManager = window.CIA?.datasetManager;
    if (!datasetManager || !instanceData?.datasetId) return false;

    const dataset = datasetManager.getDataset(instanceData.datasetId);
    if (!dataset) return false;

    // Available for mesh data types
    const meshTypes = ['vtp', 'vtk', 'ply', 'stl', 'obj'];
    return meshTypes.includes(dataset.fileType?.toLowerCase());
  }

  /**
   * Initialize threshold feature
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects } = instanceData;

    if (!sceneObjects) {
      log.warn(`Cannot initialize threshold: no sceneObjects for ${instanceId}`);
      return;
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      // Original data reference
      originalPolydata: null,
      originalActor: null,
      // Threshold objects
      calculator: null,
      thresholdMapper: null,
      thresholdActor: null,
      // Array info
      availableArrays: [],
      scalarRange: [0, 1],
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Threshold feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up threshold resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disableThreshold(state);

    this.instanceStates.delete(instanceId);
    log.debug(`Threshold feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      enabled: state.enabled,
      mode: state.mode,
      minValue: state.minValue,
      maxValue: state.maxValue,
      selectedArray: state.selectedArray,
      availableArrays: state.availableArrays,
      scalarRange: state.scalarRange,
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

    state.originalPolydata = polydata;
    state.availableArrays = [];

    // Get point data arrays
    const pointData = polydata.getPointData();
    const numPointArrays = pointData.getNumberOfArrays();

    for (let i = 0; i < numPointArrays; i++) {
      const array = pointData.getArrayByIndex(i);
      const name = pointData.getArrayName(i);
      const numComponents = array.getNumberOfComponents();

      // Only single-component arrays (scalars) for thresholding
      if (numComponents === 1) {
        const range = array.getRange();
        state.availableArrays.push({
          name,
          type: 'point',
          range: [range[0], range[1]],
          numTuples: array.getNumberOfTuples(),
        });
      }
    }

    // Get cell data arrays
    const cellData = polydata.getCellData();
    const numCellArrays = cellData.getNumberOfArrays();

    for (let i = 0; i < numCellArrays; i++) {
      const array = cellData.getArrayByIndex(i);
      const name = cellData.getArrayName(i);
      const numComponents = array.getNumberOfComponents();

      if (numComponents === 1) {
        const range = array.getRange();
        state.availableArrays.push({
          name,
          type: 'cell',
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
      state.minValue = firstArray.range[0];
      state.maxValue = firstArray.range[1];
    }

    log.debug(`Found ${state.availableArrays.length} scalar arrays for thresholding`);
  }

  // ===========================================================================
  // THRESHOLD CONTROLS
  // ===========================================================================

  /**
   * Enable thresholding
   */
  enableThreshold(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || state.enabled) return;

    if (state.availableArrays.length === 0) {
      log.warn('No scalar arrays available for thresholding');
      return;
    }

    const { sceneObjects, originalPolydata } = state;
    const { renderer, renderWindow, actor } = sceneObjects;

    if (!renderer || !originalPolydata) {
      log.warn('Cannot enable threshold: missing renderer or data');
      return;
    }

    // Store reference to original actor
    state.originalActor = actor;

    // Create calculator for filtering
    const calculator = vtkCalculator.newInstance();
    calculator.setInputData(originalPolydata);

    // Create threshold mapper and actor
    const thresholdMapper = vtkMapper.newInstance();
    thresholdMapper.setInputConnection(calculator.getOutputPort());

    const thresholdActor = vtkActor.newInstance();
    thresholdActor.setMapper(thresholdMapper);

    // Copy properties from original actor
    if (actor) {
      const origProperty = actor.getProperty();
      const newProperty = thresholdActor.getProperty();
      newProperty.setColor(...origProperty.getColor());
      newProperty.setOpacity(origProperty.getOpacity());
    }

    // Store references
    state.calculator = calculator;
    state.thresholdMapper = thresholdMapper;
    state.thresholdActor = thresholdActor;

    // Apply threshold formula
    this._applyThreshold(state);

    // Hide original actor and show threshold actor
    if (actor) {
      actor.setVisibility(false);
    }
    renderer.addActor(thresholdActor);

    state.enabled = true;
    renderWindow?.render();

    log.debug(`Threshold enabled for instance: ${instanceId}`);
  }

  /**
   * Disable thresholding
   */
  disableThreshold(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    this._disableThreshold(state);
    state.sceneObjects.renderWindow?.render();

    log.debug(`Threshold disabled for instance: ${instanceId}`);
  }

  /**
   * Internal disable helper
   */
  _disableThreshold(state) {
    const { sceneObjects, thresholdActor, thresholdMapper, calculator, originalActor } = state;
    const { renderer } = sceneObjects || {};

    // Remove threshold actor
    if (thresholdActor && renderer) {
      renderer.removeActor(thresholdActor);
      thresholdActor.delete();
    }

    if (thresholdMapper) {
      thresholdMapper.delete();
    }

    if (calculator) {
      calculator.delete();
    }

    // Restore original actor visibility
    if (originalActor) {
      originalActor.setVisibility(true);
    }

    state.calculator = null;
    state.thresholdMapper = null;
    state.thresholdActor = null;
    state.enabled = false;
  }

  /**
   * Apply threshold formula
   */
  _applyThreshold(state) {
    const { calculator, selectedArray, minValue, maxValue, mode } = state;

    if (!calculator || !selectedArray) return;

    // Build formula based on mode
    let formula;
    switch (mode) {
      case 'above':
        formula = `${selectedArray} >= ${minValue} ? ${selectedArray} : NaN`;
        break;
      case 'below':
        formula = `${selectedArray} <= ${maxValue} ? ${selectedArray} : NaN`;
        break;
      case 'between':
      default:
        formula = `(${selectedArray} >= ${minValue} && ${selectedArray} <= ${maxValue}) ? ${selectedArray} : NaN`;
        break;
    }

    // Configure calculator
    calculator.setFormula({
      getArrays: (inputDataSets) => ({
        input: [{ location: FieldDataTypes.POINT, name: selectedArray }],
        output: [
          {
            location: FieldDataTypes.POINT,
            name: 'ThresholdResult',
            dataType: 'Float32Array',
            numberOfComponents: 1,
          },
        ],
      }),
      evaluate: (arraysIn, arraysOut) => {
        const [inputArray] = arraysIn;
        const [outputArray] = arraysOut;
        const inputData = inputArray.getData();
        const outputData = outputArray.getData();

        for (let i = 0; i < inputData.length; i++) {
          const value = inputData[i];
          let include = false;

          switch (mode) {
            case 'above':
              include = value >= minValue;
              break;
            case 'below':
              include = value <= maxValue;
              break;
            case 'between':
            default:
              include = value >= minValue && value <= maxValue;
              break;
          }

          outputData[i] = include ? value : NaN;
        }
      },
    });

    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Set threshold mode
   */
  setMode(instanceId, mode) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (!THRESHOLD_MODES[mode]) {
      log.warn(`Unknown threshold mode: ${mode}`);
      return;
    }

    state.mode = mode;

    if (state.enabled) {
      this._applyThreshold(state);
    }
  }

  /**
   * Set minimum threshold value
   */
  setMinValue(instanceId, value) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.minValue = Math.max(state.scalarRange[0], Math.min(state.maxValue, value));

    if (state.enabled) {
      this._applyThreshold(state);
    }
  }

  /**
   * Set maximum threshold value
   */
  setMaxValue(instanceId, value) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.maxValue = Math.min(state.scalarRange[1], Math.max(state.minValue, value));

    if (state.enabled) {
      this._applyThreshold(state);
    }
  }

  /**
   * Set threshold range
   */
  setRange(instanceId, minValue, maxValue) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.minValue = Math.max(state.scalarRange[0], minValue);
    state.maxValue = Math.min(state.scalarRange[1], maxValue);

    // Ensure min <= max
    if (state.minValue > state.maxValue) {
      [state.minValue, state.maxValue] = [state.maxValue, state.minValue];
    }

    if (state.enabled) {
      this._applyThreshold(state);
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

    // Reset range to full extent
    state.minValue = arrayInfo.range[0];
    state.maxValue = arrayInfo.range[1];

    if (state.enabled) {
      this._applyThreshold(state);
    }
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
      // Main toggle
      {
        id: 'threshold-toggle',
        icon: state.enabled ? 'filter' : 'filter',
        label: state.enabled ? 'Threshold On' : 'Threshold Off',
        description: 'Toggle scalar thresholding',
        type: 'toggle',
        active: state.enabled,
        onClick: () => this.toggleThreshold(instanceId),
      },
    ];

    // Additional tools when enabled
    if (state.enabled) {
      tools.push(
        // Mode selection
        {
          id: 'threshold-mode',
          icon: 'sliders',
          label: THRESHOLD_MODES[state.mode].name,
          description: 'Threshold mode',
          type: 'menu',
          options: Object.entries(THRESHOLD_MODES).map(([id, mode]) => ({
            id: `mode-${id}`,
            label: mode.name,
            description: mode.description,
            active: state.mode === id,
            onClick: () => this.setMode(instanceId, id),
          })),
        },
        // Quick range presets
        {
          id: 'threshold-range',
          icon: 'expand',
          label: 'Range',
          description: `${state.minValue.toFixed(2)} - ${state.maxValue.toFixed(2)}`,
          type: 'menu',
          options: [
            {
              id: 'range-full',
              label: 'Full Range',
              onClick: () => this.setRange(instanceId, state.scalarRange[0], state.scalarRange[1]),
            },
            {
              id: 'range-lower-half',
              label: 'Lower Half',
              onClick: () => {
                const mid = (state.scalarRange[0] + state.scalarRange[1]) / 2;
                this.setRange(instanceId, state.scalarRange[0], mid);
              },
            },
            {
              id: 'range-upper-half',
              label: 'Upper Half',
              onClick: () => {
                const mid = (state.scalarRange[0] + state.scalarRange[1]) / 2;
                this.setRange(instanceId, mid, state.scalarRange[1]);
              },
            },
            {
              id: 'range-middle',
              label: 'Middle 50%',
              onClick: () => {
                const quarter = (state.scalarRange[1] - state.scalarRange[0]) / 4;
                this.setRange(instanceId, state.scalarRange[0] + quarter, state.scalarRange[1] - quarter);
              },
            },
          ],
        }
      );

      // Array selection (if multiple arrays)
      if (state.availableArrays.length > 1) {
        tools.push({
          id: 'threshold-array',
          icon: 'database',
          label: state.selectedArray || 'Array',
          description: 'Select array for thresholding',
          type: 'menu',
          options: state.availableArrays.map(arr => ({
            id: `array-${arr.name}`,
            label: `${arr.name} (${arr.type})`,
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
export const vtkThresholdFeature = new VTKThresholdFeature();
export default vtkThresholdFeature;
