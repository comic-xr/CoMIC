// src/core/instances/types/vtk/features/VTKSliceFeature.js

/**
 * VTK Slice/Image Viewer Feature
 *
 * Enables 2D slice viewing from volumetric data (vti files).
 * Provides:
 * - Orthogonal slice viewing (axial, sagittal, coronal)
 * - Multi-planar reconstruction (MPR)
 * - Windowing (window/level adjustment)
 * - Crosshair navigation
 *
 * @see https://kitware.github.io/vtk-js/examples/MultiSliceImageMapper.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// VTK.js imports for slice viewing
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Slice orientation modes
 */
const SliceMode = {
  I: 0, // X direction (Sagittal)
  J: 1, // Y direction (Coronal)
  K: 2, // Z direction (Axial)
};

/**
 * Window/Level presets for different imaging modalities
 */
const WINDOW_LEVEL_PRESETS = {
  default: { window: 400, level: 200, name: 'Default' },
  ct_brain: { window: 80, level: 40, name: 'CT Brain' },
  ct_bone: { window: 2000, level: 400, name: 'CT Bone' },
  ct_lung: { window: 1500, level: -600, name: 'CT Lung' },
  ct_abdomen: { window: 400, level: 50, name: 'CT Abdomen' },
  ct_soft_tissue: { window: 400, level: 40, name: 'CT Soft Tissue' },
  mri_t1: { window: 500, level: 250, name: 'MRI T1' },
  mri_t2: { window: 400, level: 200, name: 'MRI T2' },
};

/**
 * Default slice settings
 */
const DEFAULT_SETTINGS = {
  enabled: false,
  sliceMode: SliceMode.K, // Axial by default
  sliceIndex: 0,
  windowWidth: 400,
  windowLevel: 200,
  windowPreset: 'default',
  showCrosshair: false,
  interpolate: true,
};

// =============================================================================
// VTK SLICE FEATURE
// =============================================================================

export class VTKSliceFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKSliceFeature',
      name: 'Slice Viewer',
      description: '2D slice viewing for volumetric data',
      version: '1.0.0',
      author: 'CIA Team',
    };
  }

  /**
   * Check if this feature is available for an instance
   * Only available for volumetric data (vti files)
   */
  isAvailable(instanceId, instanceData) {
    const datasetManager = window.CIA?.datasetManager;
    if (!datasetManager || !instanceData?.datasetId) return false;

    const dataset = datasetManager.getDataset(instanceData.datasetId);
    if (!dataset) return false;

    const volumeTypes = ['vti', 'nrrd', 'mha', 'mhd'];
    return volumeTypes.includes(dataset.fileType?.toLowerCase());
  }

  /**
   * Initialize slice feature for an instance
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects } = instanceData;

    if (!sceneObjects) {
      log.warn(`Cannot initialize slice feature: no sceneObjects for ${instanceId}`);
      return;
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      // Slice viewing objects
      imageSlice: null,
      imageMapper: null,
      colorTransferFunction: null,
      imageData: null,
      // Data extent for slice navigation
      extent: [0, 0, 0, 0, 0, 0],
      sliceRange: { min: 0, max: 0 },
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Slice feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up slice feature resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disableSliceViewing(state);

    this.instanceStates.delete(instanceId);
    log.debug(`Slice feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current slice state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      enabled: state.enabled,
      sliceMode: state.sliceMode,
      sliceIndex: state.sliceIndex,
      sliceRange: state.sliceRange,
      windowWidth: state.windowWidth,
      windowLevel: state.windowLevel,
      windowPreset: state.windowPreset,
      showCrosshair: state.showCrosshair,
      interpolate: state.interpolate,
    };
  }

  // ===========================================================================
  // SLICE VIEWING CONTROLS
  // ===========================================================================

  /**
   * Enable slice viewing with image data
   */
  async enableSliceViewing(instanceId, imageData) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const { sceneObjects } = state;
    const { renderer, renderWindow } = sceneObjects;

    if (!renderer) {
      log.warn('Cannot enable slice viewing: no renderer');
      return;
    }

    // Store the image data and get extent
    state.imageData = imageData;
    state.extent = imageData.getExtent();

    // Update slice range based on current mode
    this._updateSliceRange(state);

    // Create image mapper
    const imageMapper = vtkImageMapper.newInstance();
    imageMapper.setInputData(imageData);
    imageMapper.setSliceAtFocalPoint(false);
    imageMapper.setSlicingMode(state.sliceMode);
    imageMapper.setSlice(state.sliceIndex);

    // Create color transfer function for windowing
    const ctfun = vtkColorTransferFunction.newInstance();
    this._applyWindowLevel(state, ctfun);

    // Create image slice actor
    const imageSlice = vtkImageSlice.newInstance();
    imageSlice.setMapper(imageMapper);

    // Set up property for windowing
    const property = imageSlice.getProperty();
    property.setRGBTransferFunction(ctfun);
    property.setInterpolationType(state.interpolate ? 1 : 0); // 1 = linear, 0 = nearest

    // Add to renderer
    renderer.addActor(imageSlice);

    // Store references
    state.imageSlice = imageSlice;
    state.imageMapper = imageMapper;
    state.colorTransferFunction = ctfun;
    state.enabled = true;

    // Set initial slice to middle
    const middle = Math.floor((state.sliceRange.min + state.sliceRange.max) / 2);
    this.setSlice(instanceId, middle);

    // Reset camera for 2D viewing
    renderer.resetCamera();
    renderWindow?.render();

    log.debug(`Slice viewing enabled for instance: ${instanceId}`);
  }

  /**
   * Disable slice viewing
   */
  disableSliceViewing(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disableSliceViewing(state);
    state.sceneObjects.renderWindow?.render();

    log.debug(`Slice viewing disabled for instance: ${instanceId}`);
  }

  /**
   * Internal method to disable slice viewing
   */
  _disableSliceViewing(state) {
    const { sceneObjects, imageSlice, imageMapper, colorTransferFunction } = state;
    const { renderer } = sceneObjects || {};

    if (imageSlice && renderer) {
      renderer.removeActor(imageSlice);
      imageSlice.delete();
    }

    if (imageMapper) {
      imageMapper.delete();
    }

    if (colorTransferFunction) {
      colorTransferFunction.delete();
    }

    state.imageSlice = null;
    state.imageMapper = null;
    state.colorTransferFunction = null;
    state.enabled = false;
  }

  /**
   * Update slice range based on current mode
   */
  _updateSliceRange(state) {
    const extent = state.extent;
    switch (state.sliceMode) {
      case SliceMode.I: // Sagittal (X)
        state.sliceRange = { min: extent[0], max: extent[1] };
        break;
      case SliceMode.J: // Coronal (Y)
        state.sliceRange = { min: extent[2], max: extent[3] };
        break;
      case SliceMode.K: // Axial (Z)
      default:
        state.sliceRange = { min: extent[4], max: extent[5] };
        break;
    }
  }

  /**
   * Set slice orientation mode
   */
  setSliceMode(instanceId, mode) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    state.sliceMode = mode;
    this._updateSliceRange(state);

    if (state.imageMapper) {
      state.imageMapper.setSlicingMode(mode);
    }

    // Go to middle slice of new orientation
    const middle = Math.floor((state.sliceRange.min + state.sliceRange.max) / 2);
    this.setSlice(instanceId, middle);

    state.sceneObjects.renderer?.resetCamera();
    state.sceneObjects.renderWindow?.render();

    log.debug(`Slice mode set to: ${['Sagittal', 'Coronal', 'Axial'][mode]}`);
  }

  /**
   * Set current slice index
   */
  setSlice(instanceId, sliceIndex) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    // Clamp to valid range
    const clamped = Math.max(state.sliceRange.min, Math.min(state.sliceRange.max, sliceIndex));
    state.sliceIndex = clamped;

    if (state.imageMapper) {
      state.imageMapper.setSlice(clamped);
    }

    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Navigate to next slice
   */
  nextSlice(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    if (state.sliceIndex < state.sliceRange.max) {
      this.setSlice(instanceId, state.sliceIndex + 1);
    }
  }

  /**
   * Navigate to previous slice
   */
  previousSlice(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    if (state.sliceIndex > state.sliceRange.min) {
      this.setSlice(instanceId, state.sliceIndex - 1);
    }
  }

  /**
   * Set window/level from preset
   */
  setWindowLevelPreset(instanceId, presetName) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    const preset = WINDOW_LEVEL_PRESETS[presetName];
    if (!preset) {
      log.warn(`Unknown window/level preset: ${presetName}`);
      return;
    }

    state.windowPreset = presetName;
    state.windowWidth = preset.window;
    state.windowLevel = preset.level;

    this._applyWindowLevel(state, state.colorTransferFunction);
    state.sceneObjects.renderWindow?.render();

    log.debug(`Window/level preset set to: ${preset.name}`);
  }

  /**
   * Set custom window/level
   */
  setWindowLevel(instanceId, windowWidth, windowLevel) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    state.windowPreset = 'custom';
    state.windowWidth = windowWidth;
    state.windowLevel = windowLevel;

    this._applyWindowLevel(state, state.colorTransferFunction);
    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Apply window/level to color transfer function
   */
  _applyWindowLevel(state, ctfun) {
    const { windowWidth, windowLevel } = state;

    // Calculate low and high values from window/level
    const low = windowLevel - windowWidth / 2;
    const high = windowLevel + windowWidth / 2;

    // Create grayscale lookup
    ctfun.removeAllPoints();
    ctfun.addRGBPoint(low, 0, 0, 0);
    ctfun.addRGBPoint(high, 1, 1, 1);
  }

  /**
   * Toggle interpolation
   */
  toggleInterpolation(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.imageSlice) return;

    state.interpolate = !state.interpolate;
    const property = state.imageSlice.getProperty();
    property.setInterpolationType(state.interpolate ? 1 : 0);
    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Get available window/level presets
   */
  getWindowLevelPresets() {
    return WINDOW_LEVEL_PRESETS;
  }

  // ===========================================================================
  // TOOLS INTERFACE
  // ===========================================================================

  /**
   * Get tools for the toolbar
   */
  getTools(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return [];

    return [
      // Slice orientation selector
      {
        id: 'slice-orientation',
        icon: 'layers',
        label: 'Orientation',
        description: 'Slice viewing orientation',
        type: 'menu',
        options: [
          {
            id: 'slice-axial',
            label: 'Axial (Z)',
            description: 'Top-down slices',
            active: state.sliceMode === SliceMode.K,
            onClick: () => this.setSliceMode(instanceId, SliceMode.K),
          },
          {
            id: 'slice-coronal',
            label: 'Coronal (Y)',
            description: 'Front-back slices',
            active: state.sliceMode === SliceMode.J,
            onClick: () => this.setSliceMode(instanceId, SliceMode.J),
          },
          {
            id: 'slice-sagittal',
            label: 'Sagittal (X)',
            description: 'Left-right slices',
            active: state.sliceMode === SliceMode.I,
            onClick: () => this.setSliceMode(instanceId, SliceMode.I),
          },
        ],
      },
      // Window/Level presets
      {
        id: 'window-level',
        icon: 'contrast',
        label: 'Window/Level',
        description: 'Brightness and contrast',
        type: 'menu',
        options: Object.entries(WINDOW_LEVEL_PRESETS).map(([id, preset]) => ({
          id: `wl-${id}`,
          label: preset.name,
          description: `W:${preset.window} L:${preset.level}`,
          active: state.windowPreset === id,
          onClick: () => this.setWindowLevelPreset(instanceId, id),
        })),
      },
      // Slice navigation (slider would be shown in separate panel)
      {
        id: 'slice-info',
        icon: 'info',
        label: `Slice ${state.sliceIndex}/${state.sliceRange.max}`,
        description: `Current slice position`,
        type: 'button',
        disabled: true,
      },
      // Interpolation toggle
      {
        id: 'interpolation-toggle',
        icon: state.interpolate ? 'grid' : 'grid',
        label: state.interpolate ? 'Smooth' : 'Pixelated',
        description: 'Toggle interpolation',
        type: 'toggle',
        active: state.interpolate,
        onClick: () => this.toggleInterpolation(instanceId),
      },
    ];
  }
}

// Export singleton instance
export const vtkSliceFeature = new VTKSliceFeature();
export default vtkSliceFeature;
