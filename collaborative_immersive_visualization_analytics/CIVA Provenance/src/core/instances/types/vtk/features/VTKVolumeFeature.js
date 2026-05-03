// src/core/instances/types/vtk/features/VTKVolumeFeature.js

/**
 * VTK Volume Rendering Feature
 *
 * Enables volumetric visualization for vti (VTK ImageData) files.
 * Provides:
 * - Volume rendering with transfer functions
 * - Opacity/color transfer function editing
 * - Render mode selection (GPU raycasting, composite, MIP)
 * - Sample distance control
 * - Ambient/diffuse/specular lighting
 *
 * @see https://kitware.github.io/vtk-js/examples/VolumeViewer.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// VTK.js imports for volume rendering
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";

// Import VTK volume profile (required for WebGL volume rendering)
import "@kitware/vtk.js/Rendering/Profiles/Volume";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Predefined transfer function presets
 */
const TRANSFER_FUNCTION_PRESETS = {
  grayscale: {
    name: 'Grayscale',
    colorPoints: [
      { x: 0, r: 0, g: 0, b: 0 },
      { x: 1, r: 1, g: 1, b: 1 },
    ],
    opacityPoints: [
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ],
  },
  bone: {
    name: 'Bone',
    colorPoints: [
      { x: 0, r: 0, g: 0, b: 0 },
      { x: 0.3, r: 0.3, g: 0.2, b: 0.1 },
      { x: 0.6, r: 0.8, g: 0.7, b: 0.5 },
      { x: 1, r: 1, g: 0.95, b: 0.9 },
    ],
    opacityPoints: [
      { x: 0, y: 0 },
      { x: 0.2, y: 0 },
      { x: 0.4, y: 0.3 },
      { x: 0.6, y: 0.6 },
      { x: 1, y: 1 },
    ],
  },
  coolToWarm: {
    name: 'Cool to Warm',
    colorPoints: [
      { x: 0, r: 0.23, g: 0.3, b: 0.75 },
      { x: 0.5, r: 0.87, g: 0.87, b: 0.87 },
      { x: 1, r: 0.7, g: 0.02, b: 0.15 },
    ],
    opacityPoints: [
      { x: 0, y: 0.2 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ],
  },
  viridis: {
    name: 'Viridis',
    colorPoints: [
      { x: 0, r: 0.27, g: 0, b: 0.33 },
      { x: 0.25, r: 0.28, g: 0.47, b: 0.56 },
      { x: 0.5, r: 0.13, g: 0.66, b: 0.52 },
      { x: 0.75, r: 0.55, g: 0.81, b: 0.19 },
      { x: 1, r: 0.99, g: 0.91, b: 0.14 },
    ],
    opacityPoints: [
      { x: 0, y: 0 },
      { x: 0.2, y: 0.15 },
      { x: 0.5, y: 0.5 },
      { x: 0.8, y: 0.85 },
      { x: 1, y: 1 },
    ],
  },
  plasma: {
    name: 'Plasma',
    colorPoints: [
      { x: 0, r: 0.05, g: 0.03, b: 0.53 },
      { x: 0.25, r: 0.49, g: 0.02, b: 0.66 },
      { x: 0.5, r: 0.8, g: 0.28, b: 0.47 },
      { x: 0.75, r: 0.97, g: 0.58, b: 0.25 },
      { x: 1, r: 0.94, g: 0.98, b: 0.13 },
    ],
    opacityPoints: [
      { x: 0, y: 0 },
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.7 },
      { x: 1, y: 1 },
    ],
  },
  ct_skin: {
    name: 'CT Skin',
    colorPoints: [
      { x: 0, r: 0, g: 0, b: 0 },
      { x: 0.4, r: 0.4, g: 0.2, b: 0.1 },
      { x: 0.7, r: 0.8, g: 0.6, b: 0.4 },
      { x: 1, r: 1, g: 0.9, b: 0.8 },
    ],
    opacityPoints: [
      { x: 0, y: 0 },
      { x: 0.3, y: 0 },
      { x: 0.5, y: 0.2 },
      { x: 0.7, y: 0.6 },
      { x: 1, y: 1 },
    ],
  },
};

/**
 * Default volume settings
 */
const DEFAULT_SETTINGS = {
  enabled: false,
  preset: 'grayscale',
  sampleDistance: 1.0,
  opacity: 1.0,
  shade: true,
  ambient: 0.2,
  diffuse: 0.7,
  specular: 0.3,
  specularPower: 10,
  blendMode: 0, // 0 = Composite, 1 = Maximum Intensity
  autoAdjustSampleDistance: true,
};

// =============================================================================
// VTK VOLUME FEATURE
// =============================================================================

export class VTKVolumeFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKVolumeFeature',
      name: 'Volume Rendering',
      description: 'GPU-accelerated volume rendering for volumetric data',
      version: '1.0.0',
      author: 'CIA Team',
    };
  }

  /**
   * Check if this feature is available for an instance
   * Only available for volumetric data (vti files)
   */
  isAvailable(instanceId, instanceData) {
    // Check if the loaded data is volumetric
    const datasetManager = window.CIA?.datasetManager;
    if (!datasetManager || !instanceData?.datasetId) return false;

    const dataset = datasetManager.getDataset(instanceData.datasetId);
    if (!dataset) return false;

    // Volume rendering is for image data types
    const volumeTypes = ['vti', 'nrrd', 'mha', 'mhd'];
    return volumeTypes.includes(dataset.fileType?.toLowerCase());
  }

  /**
   * Initialize volume feature for an instance
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects } = instanceData;

    if (!sceneObjects) {
      log.warn(`Cannot initialize volume feature: no sceneObjects for ${instanceId}`);
      return;
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      // Volume rendering objects (created when enabled)
      volume: null,
      volumeMapper: null,
      colorTransferFunction: null,
      opacityFunction: null,
      imageData: null, // Cached image data
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Volume feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up volume feature resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disableVolumeRendering(state);

    this.instanceStates.delete(instanceId);
    log.debug(`Volume feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current volume state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      enabled: state.enabled,
      preset: state.preset,
      sampleDistance: state.sampleDistance,
      opacity: state.opacity,
      shade: state.shade,
      ambient: state.ambient,
      diffuse: state.diffuse,
      specular: state.specular,
      blendMode: state.blendMode,
    };
  }

  // ===========================================================================
  // VOLUME RENDERING CONTROLS
  // ===========================================================================

  /**
   * Enable volume rendering with image data
   */
  async enableVolumeRendering(instanceId, imageData) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const { sceneObjects } = state;
    const { renderer, renderWindow } = sceneObjects;

    if (!renderer) {
      log.warn('Cannot enable volume rendering: no renderer');
      return;
    }

    // Store the image data
    state.imageData = imageData;

    // Create color transfer function
    const ctfun = vtkColorTransferFunction.newInstance();

    // Create opacity transfer function
    const ofun = vtkPiecewiseFunction.newInstance();

    // Apply default preset
    this._applyPreset(state, ctfun, ofun);

    // Create volume mapper
    const volumeMapper = vtkVolumeMapper.newInstance();
    volumeMapper.setInputData(imageData);
    volumeMapper.setSampleDistance(state.sampleDistance);
    volumeMapper.setAutoAdjustSampleDistances(state.autoAdjustSampleDistance);
    volumeMapper.setBlendMode(state.blendMode);

    // Create volume actor
    const volume = vtkVolume.newInstance();
    volume.setMapper(volumeMapper);

    // Set up volume property
    const volumeProperty = volume.getProperty();
    volumeProperty.setRGBTransferFunction(0, ctfun);
    volumeProperty.setScalarOpacity(0, ofun);
    volumeProperty.setInterpolationTypeToLinear();

    // Set lighting
    if (state.shade) {
      volumeProperty.setShade(true);
      volumeProperty.setAmbient(state.ambient);
      volumeProperty.setDiffuse(state.diffuse);
      volumeProperty.setSpecular(state.specular);
      volumeProperty.setSpecularPower(state.specularPower);
    }

    // Add to renderer
    renderer.addVolume(volume);

    // Store references
    state.volume = volume;
    state.volumeMapper = volumeMapper;
    state.colorTransferFunction = ctfun;
    state.opacityFunction = ofun;
    state.enabled = true;

    // Reset camera and render
    renderer.resetCamera();
    renderWindow?.render();

    log.debug(`Volume rendering enabled for instance: ${instanceId}`);
  }

  /**
   * Disable volume rendering
   */
  disableVolumeRendering(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disableVolumeRendering(state);
    state.sceneObjects.renderWindow?.render();

    log.debug(`Volume rendering disabled for instance: ${instanceId}`);
  }

  /**
   * Internal method to disable volume rendering
   */
  _disableVolumeRendering(state) {
    const { sceneObjects, volume, volumeMapper, colorTransferFunction, opacityFunction } = state;
    const { renderer } = sceneObjects || {};

    if (volume && renderer) {
      renderer.removeVolume(volume);
      volume.delete();
    }

    if (volumeMapper) {
      volumeMapper.delete();
    }

    if (colorTransferFunction) {
      colorTransferFunction.delete();
    }

    if (opacityFunction) {
      opacityFunction.delete();
    }

    state.volume = null;
    state.volumeMapper = null;
    state.colorTransferFunction = null;
    state.opacityFunction = null;
    state.enabled = false;
  }

  /**
   * Set transfer function preset
   */
  setPreset(instanceId, presetName) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    const preset = TRANSFER_FUNCTION_PRESETS[presetName];
    if (!preset) {
      log.warn(`Unknown volume preset: ${presetName}`);
      return;
    }

    state.preset = presetName;
    this._applyPreset(state, state.colorTransferFunction, state.opacityFunction);
    state.sceneObjects.renderWindow?.render();

    log.debug(`Volume preset set to: ${presetName}`);
  }

  /**
   * Apply preset to transfer functions
   */
  _applyPreset(state, ctfun, ofun) {
    const preset = TRANSFER_FUNCTION_PRESETS[state.preset];
    if (!preset) return;

    const imageData = state.imageData;
    if (!imageData) return;

    // Get scalar range
    const scalars = imageData.getPointData().getScalars();
    const dataRange = scalars ? scalars.getRange() : [0, 255];
    const rangeWidth = dataRange[1] - dataRange[0];

    // Clear existing points
    ctfun.removeAllPoints();
    ofun.removeAllPoints();

    // Add color points (normalize x from 0-1 to data range)
    preset.colorPoints.forEach(point => {
      const x = dataRange[0] + point.x * rangeWidth;
      ctfun.addRGBPoint(x, point.r, point.g, point.b);
    });

    // Add opacity points (normalize x from 0-1 to data range)
    preset.opacityPoints.forEach(point => {
      const x = dataRange[0] + point.x * rangeWidth;
      ofun.addPoint(x, point.y);
    });
  }

  /**
   * Set sample distance (affects quality/performance)
   */
  setSampleDistance(instanceId, distance) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.volumeMapper) return;

    state.sampleDistance = Math.max(0.1, Math.min(10, distance));
    state.volumeMapper.setSampleDistance(state.sampleDistance);
    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Set global opacity
   */
  setOpacity(instanceId, opacity) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.volume) return;

    state.opacity = Math.max(0, Math.min(1, opacity));
    state.volume.getProperty().setScalarOpacityUnitDistance(0, state.opacity);
    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Set blend mode (Composite, MIP, etc.)
   */
  setBlendMode(instanceId, mode) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.volumeMapper) return;

    state.blendMode = mode;
    state.volumeMapper.setBlendMode(mode);
    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Toggle shading
   */
  setShading(instanceId, enabled) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.volume) return;

    state.shade = enabled;
    const property = state.volume.getProperty();
    property.setShade(enabled);

    if (enabled) {
      property.setAmbient(state.ambient);
      property.setDiffuse(state.diffuse);
      property.setSpecular(state.specular);
      property.setSpecularPower(state.specularPower);
    }

    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Get available presets
   */
  getPresets() {
    return Object.keys(TRANSFER_FUNCTION_PRESETS);
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

    const tools = [];

    if (state.enabled) {
      // Only show volume controls when volume rendering is active
      tools.push({
        id: 'volume-preset',
        icon: 'palette',
        label: 'Volume Preset',
        description: 'Transfer function presets',
        type: 'menu',
        options: Object.entries(TRANSFER_FUNCTION_PRESETS).map(([id, preset]) => ({
          id: `preset-${id}`,
          label: preset.name,
          description: `Apply ${preset.name} transfer function`,
          active: state.preset === id,
          onClick: () => this.setPreset(instanceId, id),
        })),
      });

      tools.push({
        id: 'volume-quality',
        icon: 'sliders',
        label: 'Quality',
        description: 'Volume rendering quality settings',
        type: 'menu',
        options: [
          {
            id: 'quality-low',
            label: 'Low Quality (Fast)',
            description: 'Lower sample rate for faster rendering',
            active: state.sampleDistance >= 2.0,
            onClick: () => this.setSampleDistance(instanceId, 2.0),
          },
          {
            id: 'quality-medium',
            label: 'Medium Quality',
            description: 'Balanced quality and performance',
            active: state.sampleDistance >= 1.0 && state.sampleDistance < 2.0,
            onClick: () => this.setSampleDistance(instanceId, 1.0),
          },
          {
            id: 'quality-high',
            label: 'High Quality (Slow)',
            description: 'Higher sample rate for better quality',
            active: state.sampleDistance < 1.0,
            onClick: () => this.setSampleDistance(instanceId, 0.5),
          },
        ],
      });

      tools.push({
        id: 'volume-blend',
        icon: 'layers',
        label: 'Blend Mode',
        description: 'Volume rendering blend mode',
        type: 'menu',
        options: [
          {
            id: 'blend-composite',
            label: 'Composite',
            description: 'Standard volume rendering',
            active: state.blendMode === 0,
            onClick: () => this.setBlendMode(instanceId, 0),
          },
          {
            id: 'blend-mip',
            label: 'Maximum Intensity (MIP)',
            description: 'Show maximum values along rays',
            active: state.blendMode === 1,
            onClick: () => this.setBlendMode(instanceId, 1),
          },
          {
            id: 'blend-min',
            label: 'Minimum Intensity',
            description: 'Show minimum values along rays',
            active: state.blendMode === 2,
            onClick: () => this.setBlendMode(instanceId, 2),
          },
          {
            id: 'blend-average',
            label: 'Average Intensity',
            description: 'Show average values along rays',
            active: state.blendMode === 3,
            onClick: () => this.setBlendMode(instanceId, 3),
          },
        ],
      });

      tools.push({
        id: 'volume-shade',
        icon: state.shade ? 'sun' : 'moon',
        label: state.shade ? 'Disable Shading' : 'Enable Shading',
        description: 'Toggle lighting calculations',
        type: 'toggle',
        active: state.shade,
        onClick: () => this.setShading(instanceId, !state.shade),
      });
    }

    return tools;
  }
}

// Export singleton instance
export const vtkVolumeFeature = new VTKVolumeFeature();
export default vtkVolumeFeature;
