// src/core/instances/types/vtk/features/VTKImageCroppingFeature.js

/**
 * VTK Image Cropping Feature
 *
 * Provides interactive cropping widget for volumetric data.
 * Allows users to define a region of interest (ROI) by manipulating
 * a bounding box widget.
 *
 * Useful for:
 * - Focusing on specific regions in medical imaging
 * - Reducing rendering load by hiding unneeded volume portions
 * - Isolating areas of interest for analysis
 *
 * @see https://kitware.github.io/vtk-js/examples/ImageCroppingWidget.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// VTK.js imports
import vtkImageCroppingWidget from "@kitware/vtk.js/Widgets/Widgets3D/ImageCroppingWidget";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Cropping presets
 */
const CROPPING_PRESETS = {
  full: { name: 'Full Volume', factor: [0, 1, 0, 1, 0, 1] },
  centerHalf: { name: 'Center Half', factor: [0.25, 0.75, 0.25, 0.75, 0.25, 0.75] },
  centerQuarter: { name: 'Center Quarter', factor: [0.375, 0.625, 0.375, 0.625, 0.375, 0.625] },
  topHalf: { name: 'Top Half', factor: [0, 1, 0, 1, 0.5, 1] },
  bottomHalf: { name: 'Bottom Half', factor: [0, 1, 0, 1, 0, 0.5] },
  leftHalf: { name: 'Left Half', factor: [0, 0.5, 0, 1, 0, 1] },
  rightHalf: { name: 'Right Half', factor: [0.5, 1, 0, 1, 0, 1] },
  frontHalf: { name: 'Front Half', factor: [0, 1, 0, 0.5, 0, 1] },
  backHalf: { name: 'Back Half', factor: [0, 1, 0.5, 1, 0, 1] },
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  enabled: false,
  // Cropping planes (normalized 0-1 for each axis pair: xmin, xmax, ymin, ymax, zmin, zmax)
  croppingPlanes: [0, 1, 0, 1, 0, 1],
  // Handle visibility
  showHandles: true,
  // Face visibility
  showFaces: true,
  // Edge visibility
  showEdges: true,
};

// =============================================================================
// VTK IMAGE CROPPING FEATURE
// =============================================================================

export class VTKImageCroppingFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKImageCroppingFeature',
      name: 'Image Cropping',
      description: 'Interactive volume cropping widget',
      version: '1.0.0',
      author: 'CIA Team',
    };
  }

  /**
   * Check if this feature is available
   */
  isAvailable(instanceId, instanceData) {
    // Only for volumetric data with widget manager
    return instanceData?.isVolumetric === true && instanceData?.widgetManager != null;
  }

  /**
   * Initialize image cropping feature
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects, widgetManager } = instanceData;

    if (!sceneObjects || !widgetManager) {
      log.warn(`Cannot initialize image cropping: missing sceneObjects or widgetManager for ${instanceId}`);
      return;
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      widgetManager,
      instanceData,
      // Widget objects
      widget: null,
      handle: null,
      // Volume reference
      volumeMapper: null,
      // Image data bounds
      imageBounds: null,
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Image cropping feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disableCropping(state);

    this.instanceStates.delete(instanceId);
    log.debug(`Image cropping feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      enabled: state.enabled,
      croppingPlanes: [...state.croppingPlanes],
      showHandles: state.showHandles,
      showFaces: state.showFaces,
      showEdges: state.showEdges,
    };
  }

  // ===========================================================================
  // CROPPING CONTROLS
  // ===========================================================================

  /**
   * Enable cropping widget
   */
  enableCropping(instanceId, imageData, volumeMapper) {
    const state = this.instanceStates.get(instanceId);
    if (!state || state.enabled) return;

    const { sceneObjects, widgetManager } = state;
    const { renderWindow } = sceneObjects;

    if (!widgetManager || !imageData) {
      log.warn('Cannot enable cropping: missing widget manager or image data');
      return;
    }

    try {
      // Store volume mapper reference
      state.volumeMapper = volumeMapper;
      state.imageBounds = imageData.getBounds();

      // Create cropping widget
      const widget = vtkImageCroppingWidget.newInstance();

      // Configure widget with image data
      widget.copyImageDataDescription(imageData);

      // Add to widget manager
      const handle = widgetManager.addWidget(widget);
      handle.setEnabled(true);

      // Set up cropping planes change callback
      widget.onCroppingPlanesChanged(() => {
        this._updateCroppingPlanes(state);
      });

      // Store references
      state.widget = widget;
      state.handle = handle;
      state.enabled = true;

      // Apply initial cropping if needed
      if (volumeMapper && volumeMapper.setCroppingPlanes) {
        this._applyCroppingToVolume(state);
      }

      renderWindow?.render();

      log.debug(`Image cropping enabled for instance: ${instanceId}`);
    } catch (error) {
      log.error(`Failed to enable image cropping: ${error.message}`);
    }
  }

  /**
   * Disable cropping widget
   */
  disableCropping(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    this._disableCropping(state);
    state.sceneObjects.renderWindow?.render();

    log.debug(`Image cropping disabled for instance: ${instanceId}`);
  }

  /**
   * Internal disable helper
   */
  _disableCropping(state) {
    const { widgetManager, widget, handle, volumeMapper } = state;

    if (handle && widgetManager) {
      handle.setEnabled(false);
      widgetManager.removeWidget(widget);
    }

    if (widget) {
      widget.delete();
    }

    // Reset volume cropping
    if (volumeMapper && volumeMapper.setCroppingPlanes && state.imageBounds) {
      volumeMapper.setCroppingPlanes(state.imageBounds);
    }

    state.widget = null;
    state.handle = null;
    state.enabled = false;
    state.croppingPlanes = [0, 1, 0, 1, 0, 1];
  }

  /**
   * Toggle cropping on/off
   */
  toggleCropping(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (state.enabled) {
      this.disableCropping(instanceId);
    } else {
      // Need to get image data and volume mapper from instance
      const { instanceData } = state;
      if (instanceData?.imageData && instanceData?.volumeMapper) {
        this.enableCropping(instanceId, instanceData.imageData, instanceData.volumeMapper);
      } else {
        log.warn('Cannot enable cropping: no image data available');
      }
    }
  }

  /**
   * Update cropping planes from widget
   */
  _updateCroppingPlanes(state) {
    if (!state.widget) return;

    const planes = state.widget.getCroppingPlanes();
    if (planes && state.imageBounds) {
      // Convert to normalized 0-1 values
      const bounds = state.imageBounds;
      state.croppingPlanes = [
        (planes[0] - bounds[0]) / (bounds[1] - bounds[0]),
        (planes[1] - bounds[0]) / (bounds[1] - bounds[0]),
        (planes[2] - bounds[2]) / (bounds[3] - bounds[2]),
        (planes[3] - bounds[2]) / (bounds[3] - bounds[2]),
        (planes[4] - bounds[4]) / (bounds[5] - bounds[4]),
        (planes[5] - bounds[4]) / (bounds[5] - bounds[4]),
      ];
    }

    this._applyCroppingToVolume(state);
  }

  /**
   * Apply cropping to volume mapper
   */
  _applyCroppingToVolume(state) {
    const { volumeMapper, widget } = state;

    if (!volumeMapper || !widget) return;

    const planes = widget.getCroppingPlanes();
    if (planes && volumeMapper.setCroppingPlanes) {
      volumeMapper.setCroppingPlanes(planes);
      state.sceneObjects.renderWindow?.render();
    }
  }

  /**
   * Apply a cropping preset
   */
  applyPreset(instanceId, presetName) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled || !state.widget) return;

    const preset = CROPPING_PRESETS[presetName];
    if (!preset) {
      log.warn(`Unknown cropping preset: ${presetName}`);
      return;
    }

    const bounds = state.imageBounds;
    if (!bounds) return;

    // Convert normalized factors to actual bounds
    const factor = preset.factor;
    const planes = [
      bounds[0] + factor[0] * (bounds[1] - bounds[0]),
      bounds[0] + factor[1] * (bounds[1] - bounds[0]),
      bounds[2] + factor[2] * (bounds[3] - bounds[2]),
      bounds[2] + factor[3] * (bounds[3] - bounds[2]),
      bounds[4] + factor[4] * (bounds[5] - bounds[4]),
      bounds[4] + factor[5] * (bounds[5] - bounds[4]),
    ];

    state.widget.setCroppingPlanes(planes);
    state.croppingPlanes = [...factor];

    this._applyCroppingToVolume(state);

    log.debug(`Applied cropping preset: ${presetName}`);
  }

  /**
   * Reset to full volume
   */
  resetCropping(instanceId) {
    this.applyPreset(instanceId, 'full');
  }

  /**
   * Set cropping planes directly (normalized 0-1 values)
   */
  setCroppingPlanes(instanceId, planes) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled || !state.widget) return;

    const bounds = state.imageBounds;
    if (!bounds) return;

    // Convert normalized to actual bounds
    const actualPlanes = [
      bounds[0] + planes[0] * (bounds[1] - bounds[0]),
      bounds[0] + planes[1] * (bounds[1] - bounds[0]),
      bounds[2] + planes[2] * (bounds[3] - bounds[2]),
      bounds[2] + planes[3] * (bounds[3] - bounds[2]),
      bounds[4] + planes[4] * (bounds[5] - bounds[4]),
      bounds[4] + planes[5] * (bounds[5] - bounds[4]),
    ];

    state.widget.setCroppingPlanes(actualPlanes);
    state.croppingPlanes = [...planes];

    this._applyCroppingToVolume(state);
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

    // Only show for volumetric data
    if (!state.instanceData?.isVolumetric) return [];

    const tools = [
      {
        id: 'image-crop-toggle',
        type: 'toggle',
        icon: 'crop',
        label: state.enabled ? 'Cropping On' : 'Crop Volume',
        description: 'Interactive volume cropping',
        active: state.enabled,
        onClick: () => this.toggleCropping(instanceId),
      },
    ];

    if (state.enabled) {
      tools.push(
        {
          id: 'crop-presets',
          type: 'menu',
          icon: 'layout',
          label: 'Presets',
          description: 'Cropping region presets',
          options: Object.entries(CROPPING_PRESETS).map(([id, preset]) => ({
            id: `preset-${id}`,
            label: preset.name,
            onClick: () => this.applyPreset(instanceId, id),
          })),
        },
        {
          id: 'crop-reset',
          type: 'action',
          icon: 'expand',
          label: 'Reset',
          description: 'Show full volume',
          onClick: () => this.resetCropping(instanceId),
        }
      );
    }

    return tools;
  }
}

// Export singleton instance
export const vtkImageCroppingFeature = new VTKImageCroppingFeature();
export default vtkImageCroppingFeature;
