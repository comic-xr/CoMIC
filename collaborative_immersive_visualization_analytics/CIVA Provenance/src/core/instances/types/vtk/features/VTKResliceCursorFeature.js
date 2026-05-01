// src/core/instances/types/vtk/features/VTKResliceCursorFeature.js

/**
 * VTK Reslice Cursor Feature
 *
 * Provides interactive 3D reslicing cursor for volumetric data.
 * Allows dynamic plane positioning and orientation for MPR viewing.
 *
 * Provides:
 * - Interactive 3D cursor for volume reslicing
 * - Axial, Sagittal, Coronal plane control
 * - Rotation and translation of reslice planes
 * - Integration with slice viewing
 *
 * @see https://kitware.github.io/vtk-js/examples/ResliceCursorWidget.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// VTK.js imports
import vtkResliceCursorWidget from "@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * View orientations
 */
const VIEW_TYPES = {
  axial: { name: 'Axial', index: 2 },
  sagittal: { name: 'Sagittal', index: 0 },
  coronal: { name: 'Coronal', index: 1 },
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  enabled: false,
  showCenter: true,
  keepOrthogonality: true,
  rotationHandlePosition: 0.5,
};

// =============================================================================
// VTK RESLICE CURSOR FEATURE
// =============================================================================

export class VTKResliceCursorFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKResliceCursorFeature',
      name: 'Reslice Cursor',
      description: 'Interactive 3D reslicing cursor for volume data',
      version: '1.0.0',
      author: 'CIA Team',
    };
  }

  /**
   * Check if this feature is available
   */
  isAvailable(instanceId, instanceData) {
    // Only for volumetric data
    return instanceData?.isVolumetric === true && instanceData?.widgetManager != null;
  }

  /**
   * Initialize reslice cursor feature
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects, widgetManager } = instanceData;

    if (!sceneObjects) {
      log.warn(`Cannot initialize reslice cursor: no sceneObjects for ${instanceId}`);
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
      // Current center position
      center: null,
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Reslice cursor feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up reslice cursor resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disableResliceCursor(state);

    this.instanceStates.delete(instanceId);
    log.debug(`Reslice cursor feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      enabled: state.enabled,
      center: state.center,
      showCenter: state.showCenter,
      keepOrthogonality: state.keepOrthogonality,
    };
  }

  // ===========================================================================
  // RESLICE CURSOR CONTROLS
  // ===========================================================================

  /**
   * Enable reslice cursor
   */
  enableResliceCursor(instanceId, imageData) {
    const state = this.instanceStates.get(instanceId);
    if (!state || state.enabled) return;

    const { sceneObjects, widgetManager } = state;
    const { renderer, renderWindow } = sceneObjects;

    if (!widgetManager) {
      log.warn('Cannot enable reslice cursor: no widget manager');
      return;
    }

    try {
      // Create reslice cursor widget
      const widget = vtkResliceCursorWidget.newInstance();

      // Configure widget
      if (imageData) {
        const bounds = imageData.getBounds();
        state.center = [
          (bounds[0] + bounds[1]) / 2,
          (bounds[2] + bounds[3]) / 2,
          (bounds[4] + bounds[5]) / 2,
        ];

        widget.getWidgetState().setCenter(state.center);
        widget.setImage(imageData);
      }

      // Set options
      widget.setKeepOrthogonality(state.keepOrthogonality);

      // Add to widget manager
      const handle = widgetManager.addWidget(widget);
      handle.setEnabled(true);

      // Store references
      state.widget = widget;
      state.handle = handle;
      state.enabled = true;

      renderWindow?.render();

      log.debug(`Reslice cursor enabled for instance: ${instanceId}`);
    } catch (error) {
      log.error(`Failed to enable reslice cursor: ${error.message}`);
    }
  }

  /**
   * Disable reslice cursor
   */
  disableResliceCursor(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    this._disableResliceCursor(state);
    state.sceneObjects.renderWindow?.render();

    log.debug(`Reslice cursor disabled for instance: ${instanceId}`);
  }

  /**
   * Internal disable helper
   */
  _disableResliceCursor(state) {
    const { widgetManager, widget, handle } = state;

    if (handle && widgetManager) {
      handle.setEnabled(false);
      widgetManager.removeWidget(widget);
    }

    if (widget) {
      widget.delete();
    }

    state.widget = null;
    state.handle = null;
    state.enabled = false;
  }

  /**
   * Toggle reslice cursor
   */
  toggleResliceCursor(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (state.enabled) {
      this.disableResliceCursor(instanceId);
    } else if (state.instanceData?.polydata) {
      this.enableResliceCursor(instanceId, state.instanceData.polydata);
    }
  }

  /**
   * Set center position
   */
  setCenter(instanceId, center) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled || !state.widget) return;

    state.center = center;
    state.widget.getWidgetState().setCenter(center);
    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Reset to center of data
   */
  resetCenter(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    const { instanceData } = state;
    if (instanceData?.polydata) {
      const bounds = instanceData.polydata.getBounds();
      const center = [
        (bounds[0] + bounds[1]) / 2,
        (bounds[2] + bounds[3]) / 2,
        (bounds[4] + bounds[5]) / 2,
      ];
      this.setCenter(instanceId, center);
    }
  }

  /**
   * Toggle keep orthogonality
   */
  toggleOrthogonality(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.keepOrthogonality = !state.keepOrthogonality;

    if (state.widget) {
      state.widget.setKeepOrthogonality(state.keepOrthogonality);
      state.sceneObjects.renderWindow?.render();
    }
  }

  /**
   * Get current plane parameters
   */
  getPlaneParameters(instanceId, viewType) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.widget) return null;

    const widgetState = state.widget.getWidgetState();
    const planeIndex = VIEW_TYPES[viewType]?.index ?? 0;

    return {
      center: widgetState.getCenter(),
      normal: widgetState.getPlanes()[planeIndex]?.normal || [0, 0, 1],
    };
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
        id: 'reslice-cursor-toggle',
        type: 'toggle',
        icon: 'crosshair',
        label: state.enabled ? 'Reslice On' : 'Reslice Cursor',
        description: 'Interactive volume reslicing',
        active: state.enabled,
        onClick: () => this.toggleResliceCursor(instanceId),
      },
    ];

    if (state.enabled) {
      tools.push(
        {
          id: 'reslice-reset',
          type: 'action',
          icon: 'rotate-ccw',
          label: 'Reset',
          description: 'Reset to data center',
          onClick: () => this.resetCenter(instanceId),
        },
        {
          id: 'reslice-ortho',
          type: 'toggle',
          icon: 'grid',
          label: state.keepOrthogonality ? 'Ortho On' : 'Ortho Off',
          description: 'Keep planes orthogonal',
          active: state.keepOrthogonality,
          onClick: () => this.toggleOrthogonality(instanceId),
        }
      );
    }

    return tools;
  }
}

// Export singleton instance
export const vtkResliceCursorFeature = new VTKResliceCursorFeature();
export default vtkResliceCursorFeature;
