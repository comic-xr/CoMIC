// src/core/instances/types/vtk/features/VTKTransferFunctionFeature.js

/**
 * VTK Transfer Function Feature
 *
 * Provides interactive transfer function editing for volume rendering.
 * Uses PiecewiseGaussianWidget for opacity control with histogram visualization.
 *
 * Provides:
 * - Gaussian-based opacity transfer function
 * - Interactive widget for opacity editing
 * - Integration with volume rendering
 * - Preset transfer functions
 *
 * @see https://kitware.github.io/vtk-js/examples/PiecewiseGaussianWidget.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// VTK.js imports
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Transfer function presets
 */
const TF_PRESETS = {
  linear: {
    name: 'Linear',
    description: 'Linear opacity ramp',
    gaussians: [
      { position: 0.5, height: 1.0, width: 0.5, xBias: 0, yBias: 0 },
    ],
  },
  soft: {
    name: 'Soft Tissue',
    description: 'Enhanced soft tissue visibility',
    gaussians: [
      { position: 0.3, height: 0.5, width: 0.2, xBias: 0, yBias: 0 },
      { position: 0.6, height: 0.3, width: 0.15, xBias: 0, yBias: 0 },
    ],
  },
  bone: {
    name: 'Bone',
    description: 'Highlight bone structures',
    gaussians: [
      { position: 0.7, height: 1.0, width: 0.15, xBias: 0, yBias: 0 },
    ],
  },
  skin: {
    name: 'Skin Surface',
    description: 'Show skin surface',
    gaussians: [
      { position: 0.25, height: 0.4, width: 0.1, xBias: 0.2, yBias: 0 },
    ],
  },
  mip: {
    name: 'MIP Style',
    description: 'Maximum intensity projection style',
    gaussians: [
      { position: 0.5, height: 0.1, width: 0.5, xBias: 0, yBias: 0 },
    ],
  },
  bimodal: {
    name: 'Bimodal',
    description: 'Two distinct peaks',
    gaussians: [
      { position: 0.25, height: 0.6, width: 0.12, xBias: 0, yBias: 0 },
      { position: 0.75, height: 0.8, width: 0.12, xBias: 0, yBias: 0 },
    ],
  },
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  enabled: false,
  preset: 'linear',
  gaussians: [],
  scalarRange: [0, 1],
};

// =============================================================================
// VTK TRANSFER FUNCTION FEATURE
// =============================================================================

export class VTKTransferFunctionFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKTransferFunctionFeature',
      name: 'Transfer Function',
      description: 'Interactive transfer function editor for volume rendering',
      version: '1.0.0',
      author: 'CIA Team',
    };
  }

  /**
   * Check if this feature is available
   */
  isAvailable(instanceId, instanceData) {
    // Available for volumetric data
    return instanceData?.isVolumetric === true;
  }

  /**
   * Initialize transfer function feature
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects } = instanceData;

    if (!sceneObjects) {
      log.warn(`Cannot initialize transfer function: no sceneObjects for ${instanceId}`);
      return;
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      instanceData,
      // Transfer function objects
      piecewiseFunction: null,
      colorTransferFunction: null,
      // Widget (if we add DOM-based widget later)
      widget: null,
      widgetContainer: null,
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Transfer function feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up transfer function resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disableTransferFunction(state);

    this.instanceStates.delete(instanceId);
    log.debug(`Transfer function feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      enabled: state.enabled,
      preset: state.preset,
      gaussians: state.gaussians,
      scalarRange: state.scalarRange,
    };
  }

  // ===========================================================================
  // TRANSFER FUNCTION CONTROLS
  // ===========================================================================

  /**
   * Enable transfer function with piecewise function
   */
  enableTransferFunction(instanceId, imageData, volumeProperty) {
    const state = this.instanceStates.get(instanceId);
    if (!state || state.enabled) return;

    // Get scalar range from data
    const scalars = imageData.getPointData().getScalars();
    if (scalars) {
      const range = scalars.getRange();
      state.scalarRange = [range[0], range[1]];
    }

    // Create piecewise function for opacity
    const piecewiseFunction = vtkPiecewiseFunction.newInstance();

    // Create color transfer function
    const colorTransferFunction = vtkColorTransferFunction.newInstance();

    // Store references
    state.piecewiseFunction = piecewiseFunction;
    state.colorTransferFunction = colorTransferFunction;
    state.volumeProperty = volumeProperty;
    state.imageData = imageData;

    // Apply default preset
    this.setPreset(instanceId, state.preset);

    state.enabled = true;
    log.debug(`Transfer function enabled for instance: ${instanceId}`);
  }

  /**
   * Disable transfer function
   */
  disableTransferFunction(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    this._disableTransferFunction(state);
    log.debug(`Transfer function disabled for instance: ${instanceId}`);
  }

  /**
   * Internal disable helper
   */
  _disableTransferFunction(state) {
    if (state.piecewiseFunction) {
      state.piecewiseFunction.delete();
      state.piecewiseFunction = null;
    }

    if (state.colorTransferFunction) {
      state.colorTransferFunction.delete();
      state.colorTransferFunction = null;
    }

    state.enabled = false;
    state.gaussians = [];
  }

  /**
   * Set transfer function preset
   */
  setPreset(instanceId, presetName) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const preset = TF_PRESETS[presetName];
    if (!preset) {
      log.warn(`Unknown transfer function preset: ${presetName}`);
      return;
    }

    state.preset = presetName;
    state.gaussians = preset.gaussians.map(g => ({ ...g }));

    if (state.enabled && state.piecewiseFunction) {
      this._applyGaussians(state);
    }

    log.debug(`Transfer function preset set to: ${presetName}`);
  }

  /**
   * Add a gaussian to the transfer function
   */
  addGaussian(instanceId, position, height = 1.0, width = 0.1, xBias = 0, yBias = 0) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const gaussian = { position, height, width, xBias, yBias };
    state.gaussians.push(gaussian);
    state.preset = 'custom';

    if (state.enabled && state.piecewiseFunction) {
      this._applyGaussians(state);
    }
  }

  /**
   * Clear all gaussians
   */
  clearGaussians(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.gaussians = [];
    state.preset = 'custom';

    if (state.piecewiseFunction) {
      state.piecewiseFunction.removeAllPoints();
      state.sceneObjects.renderWindow?.render();
    }
  }

  /**
   * Apply gaussians to piecewise function
   */
  _applyGaussians(state) {
    const { piecewiseFunction, gaussians, scalarRange, volumeProperty, sceneObjects } = state;

    if (!piecewiseFunction) return;

    // Clear existing points
    piecewiseFunction.removeAllPoints();

    // Sample the gaussian functions to create piecewise function
    const numSamples = 256;
    const rangeWidth = scalarRange[1] - scalarRange[0];

    for (let i = 0; i < numSamples; i++) {
      const x = scalarRange[0] + (i / (numSamples - 1)) * rangeWidth;
      const normalizedX = (x - scalarRange[0]) / rangeWidth;

      // Sum contributions from all gaussians
      let opacity = 0;
      for (const g of gaussians) {
        const dx = normalizedX - g.position;
        const gaussValue = g.height * Math.exp(-(dx * dx) / (2 * g.width * g.width));
        opacity += gaussValue;
      }

      // Clamp opacity
      opacity = Math.max(0, Math.min(1, opacity));
      piecewiseFunction.addPoint(x, opacity);
    }

    // Apply to volume property if available
    if (volumeProperty) {
      volumeProperty.setScalarOpacity(0, piecewiseFunction);
    }

    sceneObjects.renderWindow?.render();
  }

  /**
   * Get piecewise function for external use
   */
  getPiecewiseFunction(instanceId) {
    const state = this.instanceStates.get(instanceId);
    return state?.piecewiseFunction || null;
  }

  /**
   * Get color transfer function for external use
   */
  getColorTransferFunction(instanceId) {
    const state = this.instanceStates.get(instanceId);
    return state?.colorTransferFunction || null;
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

    // Only show if volumetric data and volume feature is active
    if (!state.instanceData?.isVolumetric) return [];

    return [
      {
        id: 'transfer-function',
        type: 'menu',
        icon: 'activity',
        label: state.enabled ? `TF: ${TF_PRESETS[state.preset]?.name || 'Custom'}` : 'Transfer Function',
        description: 'Volume opacity transfer function',
        options: [
          ...Object.entries(TF_PRESETS).map(([id, preset]) => ({
            id: `tf-${id}`,
            label: preset.name,
            description: preset.description,
            active: state.preset === id,
            onClick: () => this.setPreset(instanceId, id),
          })),
          { type: 'separator' },
          {
            id: 'tf-clear',
            label: 'Clear All',
            description: 'Remove all opacity points',
            onClick: () => this.clearGaussians(instanceId),
          },
        ],
      },
    ];
  }
}

// Export singleton instance
export const vtkTransferFunctionFeature = new VTKTransferFunctionFeature();
export default vtkTransferFunctionFeature;
