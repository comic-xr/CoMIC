// src/core/instances/types/vtk/features/VTKImplicitPlaneFeature.js

/**
 * VTK Implicit Plane Feature
 *
 * Provides interactive plane widget for clipping and cross-section visualization.
 * The plane can be positioned and oriented interactively in 3D space.
 *
 * Useful for:
 * - Interactive clipping of meshes and volumes
 * - Cross-section visualization
 * - Defining cutting planes for analysis
 *
 * @see https://kitware.github.io/vtk-js/examples/ImplicitPlaneWidget.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// VTK.js imports
import vtkImplicitPlaneWidget from "@kitware/vtk.js/Widgets/Widgets3D/ImplicitPlaneWidget";
import vtkPlane from "@kitware/vtk.js/Common/DataModel/Plane";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Plane orientation presets
 */
const PLANE_PRESETS = {
  axial: { name: 'Axial (Z)', normal: [0, 0, 1] },
  coronal: { name: 'Coronal (Y)', normal: [0, 1, 0] },
  sagittal: { name: 'Sagittal (X)', normal: [1, 0, 0] },
  diagonalXY: { name: 'Diagonal XY', normal: [0.707, 0.707, 0] },
  diagonalXZ: { name: 'Diagonal XZ', normal: [0.707, 0, 0.707] },
  diagonalYZ: { name: 'Diagonal YZ', normal: [0, 0.707, 0.707] },
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  enabled: false,
  // Plane parameters
  normal: [0, 0, 1],
  origin: [0, 0, 0],
  // Widget options
  lockNormalToCamera: false,
  // Clipping options
  clipEnabled: false,
  clipInside: true,
  // Visual options
  planeOpacity: 0.3,
  planeColor: [1, 1, 0],
  outlineColor: [1, 0.5, 0],
};

// =============================================================================
// VTK IMPLICIT PLANE FEATURE
// =============================================================================

export class VTKImplicitPlaneFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKImplicitPlaneFeature',
      name: 'Implicit Plane',
      description: 'Interactive clipping plane widget',
      version: '1.0.0',
      author: 'CIA Team',
    };
  }

  /**
   * Check if this feature is available
   */
  isAvailable(instanceId, instanceData) {
    return instanceData?.widgetManager != null && instanceData?.sceneObjects?.mapper != null;
  }

  /**
   * Initialize implicit plane feature
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects, widgetManager } = instanceData;

    if (!sceneObjects || !widgetManager) {
      log.warn(`Cannot initialize implicit plane: missing sceneObjects or widgetManager for ${instanceId}`);
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
      // Implicit plane for clipping
      implicitPlane: null,
      // Data bounds
      dataBounds: null,
      dataCenter: null,
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Implicit plane feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disablePlane(state);

    this.instanceStates.delete(instanceId);
    log.debug(`Implicit plane feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      enabled: state.enabled,
      normal: [...state.normal],
      origin: [...state.origin],
      clipEnabled: state.clipEnabled,
      clipInside: state.clipInside,
      lockNormalToCamera: state.lockNormalToCamera,
    };
  }

  // ===========================================================================
  // PLANE CONTROLS
  // ===========================================================================

  /**
   * Enable plane widget
   */
  enablePlane(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || state.enabled) return;

    const { sceneObjects, widgetManager } = state;
    const { mapper, renderWindow } = sceneObjects;

    if (!widgetManager || !mapper) {
      log.warn('Cannot enable plane: missing widget manager or mapper');
      return;
    }

    const inputData = mapper.getInputData();
    if (!inputData) {
      log.warn('Cannot enable plane: no input data');
      return;
    }

    try {
      // Get data bounds
      const bounds = inputData.getBounds();
      state.dataBounds = bounds;
      state.dataCenter = [
        (bounds[0] + bounds[1]) / 2,
        (bounds[2] + bounds[3]) / 2,
        (bounds[4] + bounds[5]) / 2,
      ];

      // Create implicit plane widget
      const widget = vtkImplicitPlaneWidget.newInstance();
      widget.placeWidget(bounds);

      // Configure initial plane
      const widgetState = widget.getWidgetState();
      widgetState.setOrigin(state.dataCenter);
      widgetState.setNormal(state.normal);

      // Add to widget manager
      const handle = widgetManager.addWidget(widget);
      handle.setEnabled(true);

      // Create implicit plane for clipping
      const implicitPlane = vtkPlane.newInstance();
      implicitPlane.setOrigin(state.dataCenter);
      implicitPlane.setNormal(state.normal);

      // Set up plane change callback
      widgetState.onModified(() => {
        this._onPlaneChanged(state);
      });

      // Store references
      state.widget = widget;
      state.handle = handle;
      state.implicitPlane = implicitPlane;
      state.origin = [...state.dataCenter];
      state.enabled = true;

      renderWindow?.render();

      log.debug(`Implicit plane enabled for instance: ${instanceId}`);
    } catch (error) {
      log.error(`Failed to enable implicit plane: ${error.message}`);
    }
  }

  /**
   * Disable plane widget
   */
  disablePlane(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    this._disablePlane(state);
    state.sceneObjects.renderWindow?.render();

    log.debug(`Implicit plane disabled for instance: ${instanceId}`);
  }

  /**
   * Internal disable helper
   */
  _disablePlane(state) {
    const { widgetManager, widget, handle, sceneObjects } = state;
    const { mapper } = sceneObjects || {};

    // Disable clipping
    if (mapper && mapper.removeClippingPlane && state.implicitPlane) {
      mapper.removeClippingPlane(state.implicitPlane);
    }

    if (handle && widgetManager) {
      handle.setEnabled(false);
      widgetManager.removeWidget(widget);
    }

    if (widget) {
      widget.delete();
    }

    if (state.implicitPlane) {
      state.implicitPlane.delete();
    }

    state.widget = null;
    state.handle = null;
    state.implicitPlane = null;
    state.enabled = false;
    state.clipEnabled = false;
  }

  /**
   * Toggle plane on/off
   */
  togglePlane(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (state.enabled) {
      this.disablePlane(instanceId);
    } else {
      this.enablePlane(instanceId);
    }
  }

  /**
   * Handle plane changes from widget
   */
  _onPlaneChanged(state) {
    if (!state.widget) return;

    const widgetState = state.widget.getWidgetState();
    state.origin = widgetState.getOrigin();
    state.normal = widgetState.getNormal();

    // Update implicit plane
    if (state.implicitPlane) {
      state.implicitPlane.setOrigin(state.origin);
      state.implicitPlane.setNormal(state.normal);
    }

    // Update clipping if enabled
    if (state.clipEnabled) {
      this._applyClipping(state);
    }

    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Apply clipping to mapper
   */
  _applyClipping(state) {
    const { mapper } = state.sceneObjects;
    if (!mapper || !state.implicitPlane) return;

    if (mapper.addClippingPlane) {
      // Remove existing and add updated plane
      mapper.removeAllClippingPlanes();
      mapper.addClippingPlane(state.implicitPlane);
    }
  }

  /**
   * Toggle clipping
   */
  toggleClipping(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    state.clipEnabled = !state.clipEnabled;

    const { mapper } = state.sceneObjects;
    if (!mapper) return;

    if (state.clipEnabled) {
      this._applyClipping(state);
    } else if (mapper.removeAllClippingPlanes) {
      mapper.removeAllClippingPlanes();
    }

    state.sceneObjects.renderWindow?.render();

    log.debug(`Clipping ${state.clipEnabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Flip clipping direction
   */
  flipClipping(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled || !state.implicitPlane) return;

    // Negate normal
    state.normal = state.normal.map(n => -n);

    // Update widget
    if (state.widget) {
      const widgetState = state.widget.getWidgetState();
      widgetState.setNormal(state.normal);
    }

    // Update implicit plane
    state.implicitPlane.setNormal(state.normal);

    if (state.clipEnabled) {
      this._applyClipping(state);
    }

    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Set plane orientation from preset
   */
  setOrientation(instanceId, presetName) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    const preset = PLANE_PRESETS[presetName];
    if (!preset) {
      log.warn(`Unknown plane preset: ${presetName}`);
      return;
    }

    state.normal = [...preset.normal];

    // Update widget
    if (state.widget) {
      const widgetState = state.widget.getWidgetState();
      widgetState.setNormal(state.normal);
    }

    // Update implicit plane
    if (state.implicitPlane) {
      state.implicitPlane.setNormal(state.normal);
    }

    if (state.clipEnabled) {
      this._applyClipping(state);
    }

    state.sceneObjects.renderWindow?.render();

    log.debug(`Plane orientation set to: ${presetName}`);
  }

  /**
   * Reset plane to center
   */
  resetPlane(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled || !state.dataCenter) return;

    state.origin = [...state.dataCenter];
    state.normal = [0, 0, 1];

    // Update widget
    if (state.widget) {
      const widgetState = state.widget.getWidgetState();
      widgetState.setOrigin(state.origin);
      widgetState.setNormal(state.normal);
    }

    // Update implicit plane
    if (state.implicitPlane) {
      state.implicitPlane.setOrigin(state.origin);
      state.implicitPlane.setNormal(state.normal);
    }

    if (state.clipEnabled) {
      this._applyClipping(state);
    }

    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Get implicit plane for external use (e.g., with cutter)
   */
  getImplicitPlane(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return null;

    return state.implicitPlane;
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
        id: 'implicit-plane-toggle',
        type: 'toggle',
        icon: 'square',
        label: state.enabled ? 'Plane On' : 'Clip Plane',
        description: 'Interactive clipping plane',
        active: state.enabled,
        onClick: () => this.togglePlane(instanceId),
      },
    ];

    if (state.enabled) {
      tools.push(
        {
          id: 'plane-orientation',
          type: 'menu',
          icon: 'compass',
          label: 'Orientation',
          description: 'Plane orientation presets',
          options: Object.entries(PLANE_PRESETS).map(([id, preset]) => ({
            id: `orient-${id}`,
            label: preset.name,
            onClick: () => this.setOrientation(instanceId, id),
          })),
        },
        {
          id: 'plane-clip-toggle',
          type: 'toggle',
          icon: 'scissors',
          label: state.clipEnabled ? 'Clipping On' : 'Enable Clip',
          description: 'Toggle mesh clipping',
          active: state.clipEnabled,
          onClick: () => this.toggleClipping(instanceId),
        },
        {
          id: 'plane-flip',
          type: 'action',
          icon: 'refresh-cw',
          label: 'Flip',
          description: 'Flip clipping direction',
          onClick: () => this.flipClipping(instanceId),
        },
        {
          id: 'plane-reset',
          type: 'action',
          icon: 'rotate-ccw',
          label: 'Reset',
          description: 'Reset plane to center',
          onClick: () => this.resetPlane(instanceId),
        }
      );
    }

    return tools;
  }
}

// Export singleton instance
export const vtkImplicitPlaneFeature = new VTKImplicitPlaneFeature();
export default vtkImplicitPlaneFeature;
