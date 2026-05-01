// src/core/instances/types/vtk/features/VTKCutterFeature.js

/**
 * VTK Cutter Feature
 *
 * Cuts geometry with a plane to extract cross-section contours.
 * Useful for visualizing internal structures of 3D models.
 *
 * Provides:
 * - Plane-based geometry cutting
 * - Interactive plane positioning
 * - Cross-section visualization
 * - Multiple plane orientations
 *
 * @see https://kitware.github.io/vtk-js/examples/Cutter.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// VTK.js imports
import vtkCutter from "@kitware/vtk.js/Filters/Core/Cutter";
import vtkPlane from "@kitware/vtk.js/Common/DataModel/Plane";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Plane orientation presets
 */
const PLANE_PRESETS = {
  axial: { name: 'Axial (XY)', normal: [0, 0, 1] },
  coronal: { name: 'Coronal (XZ)', normal: [0, 1, 0] },
  sagittal: { name: 'Sagittal (YZ)', normal: [1, 0, 0] },
  diagonal: { name: 'Diagonal', normal: [0.577, 0.577, 0.577] },
};

/**
 * Line color presets
 */
const LINE_COLORS = {
  red: { name: 'Red', rgb: [1.0, 0.2, 0.2] },
  green: { name: 'Green', rgb: [0.2, 1.0, 0.3] },
  blue: { name: 'Blue', rgb: [0.2, 0.4, 1.0] },
  yellow: { name: 'Yellow', rgb: [1.0, 1.0, 0.2] },
  cyan: { name: 'Cyan', rgb: [0.2, 1.0, 1.0] },
  magenta: { name: 'Magenta', rgb: [1.0, 0.2, 1.0] },
  white: { name: 'White', rgb: [1.0, 1.0, 1.0] },
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  enabled: false,
  planeOrientation: 'axial',
  planePosition: 0.5, // 0-1 along normal direction
  lineColor: 'yellow',
  lineWidth: 2,
  showOriginal: true,
  originalOpacity: 0.3,
};

// =============================================================================
// VTK CUTTER FEATURE
// =============================================================================

export class VTKCutterFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKCutterFeature',
      name: 'Geometry Cutter',
      description: 'Cut geometry with a plane to show cross-sections',
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
   * Initialize cutter feature
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects } = instanceData;

    if (!sceneObjects) {
      log.warn(`Cannot initialize cutter: no sceneObjects for ${instanceId}`);
      return;
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      // Cutter objects
      cutter: null,
      cutPlane: null,
      cutActor: null,
      cutMapper: null,
      // Data bounds
      bounds: null,
      center: null,
      // Original actor state
      originalOpacityBackup: 1.0,
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Cutter feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up cutter resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disableCutter(state);

    this.instanceStates.delete(instanceId);
    log.debug(`Cutter feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      enabled: state.enabled,
      planeOrientation: state.planeOrientation,
      planePosition: state.planePosition,
      lineColor: state.lineColor,
      showOriginal: state.showOriginal,
    };
  }

  // ===========================================================================
  // CUTTER CONTROLS
  // ===========================================================================

  /**
   * Enable cutter
   */
  enableCutter(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || state.enabled) return;

    const { sceneObjects } = state;
    const { mapper, actor, renderer, renderWindow } = sceneObjects;

    if (!mapper || !renderer) {
      log.warn('Cannot enable cutter: missing mapper or renderer');
      return;
    }

    const inputData = mapper.getInputData();
    if (!inputData) {
      log.warn('Cannot enable cutter: no input data');
      return;
    }

    // Get data bounds
    const bounds = inputData.getBounds();
    state.bounds = bounds;
    state.center = [
      (bounds[0] + bounds[1]) / 2,
      (bounds[2] + bounds[3]) / 2,
      (bounds[4] + bounds[5]) / 2,
    ];

    // Create cutting plane
    const cutPlane = vtkPlane.newInstance();

    // Create cutter filter
    const cutter = vtkCutter.newInstance();
    cutter.setCutFunction(cutPlane);
    cutter.setInputData(inputData);

    // Create mapper for cut result
    const cutMapper = vtkMapper.newInstance();
    cutMapper.setInputConnection(cutter.getOutputPort());

    // Create actor for cut lines
    const cutActor = vtkActor.newInstance();
    cutActor.setMapper(cutMapper);

    // Style the cut lines
    const color = LINE_COLORS[state.lineColor]?.rgb || [1, 1, 0];
    const property = cutActor.getProperty();
    property.setColor(...color);
    property.setLineWidth(state.lineWidth);
    property.setRepresentation(1); // Wireframe for contour lines

    // Add cut actor to renderer
    renderer.addActor(cutActor);

    // Store references
    state.cutPlane = cutPlane;
    state.cutter = cutter;
    state.cutMapper = cutMapper;
    state.cutActor = cutActor;

    // Backup and adjust original actor opacity
    if (actor && state.showOriginal) {
      state.originalOpacityBackup = actor.getProperty().getOpacity();
      actor.getProperty().setOpacity(state.originalOpacity);
    }

    // Apply initial plane position
    this._updatePlane(state);

    state.enabled = true;
    renderWindow?.render();

    log.debug(`Cutter enabled for instance: ${instanceId}`);
  }

  /**
   * Disable cutter
   */
  disableCutter(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    this._disableCutter(state);
    state.sceneObjects.renderWindow?.render();

    log.debug(`Cutter disabled for instance: ${instanceId}`);
  }

  /**
   * Internal disable helper
   */
  _disableCutter(state) {
    const { sceneObjects, cutActor, cutMapper, cutter, cutPlane } = state;
    const { renderer, actor } = sceneObjects || {};

    // Remove cut actor
    if (cutActor && renderer) {
      renderer.removeActor(cutActor);
      cutActor.delete();
    }

    if (cutMapper) {
      cutMapper.delete();
    }

    if (cutter) {
      cutter.delete();
    }

    if (cutPlane) {
      cutPlane.delete();
    }

    // Restore original actor opacity
    if (actor && state.enabled) {
      actor.getProperty().setOpacity(state.originalOpacityBackup);
    }

    state.cutActor = null;
    state.cutMapper = null;
    state.cutter = null;
    state.cutPlane = null;
    state.enabled = false;
  }

  /**
   * Toggle cutter on/off
   */
  toggleCutter(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (state.enabled) {
      this.disableCutter(instanceId);
    } else {
      this.enableCutter(instanceId);
    }
  }

  /**
   * Update plane position and orientation
   */
  _updatePlane(state) {
    const { cutPlane, bounds, center, planeOrientation, planePosition } = state;

    if (!cutPlane || !bounds) return;

    const preset = PLANE_PRESETS[planeOrientation];
    const normal = preset?.normal || [0, 0, 1];

    // Calculate plane origin based on position (0-1)
    // along the data extent in the normal direction
    const origin = [...center];

    // Determine which axis to move along
    if (normal[0] > 0.5) {
      // Moving along X
      origin[0] = bounds[0] + planePosition * (bounds[1] - bounds[0]);
    } else if (normal[1] > 0.5) {
      // Moving along Y
      origin[1] = bounds[2] + planePosition * (bounds[3] - bounds[2]);
    } else if (normal[2] > 0.5) {
      // Moving along Z
      origin[2] = bounds[4] + planePosition * (bounds[5] - bounds[4]);
    } else {
      // Diagonal - move along all axes
      origin[0] = bounds[0] + planePosition * (bounds[1] - bounds[0]);
      origin[1] = bounds[2] + planePosition * (bounds[3] - bounds[2]);
      origin[2] = bounds[4] + planePosition * (bounds[5] - bounds[4]);
    }

    cutPlane.setNormal(...normal);
    cutPlane.setOrigin(...origin);

    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Set plane orientation
   */
  setPlaneOrientation(instanceId, orientation) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (!PLANE_PRESETS[orientation]) {
      log.warn(`Unknown plane orientation: ${orientation}`);
      return;
    }

    state.planeOrientation = orientation;

    if (state.enabled) {
      this._updatePlane(state);
    }

    log.debug(`Cutter plane orientation set to: ${orientation}`);
  }

  /**
   * Set plane position (0-1)
   */
  setPlanePosition(instanceId, position) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.planePosition = Math.max(0, Math.min(1, position));

    if (state.enabled) {
      this._updatePlane(state);
    }
  }

  /**
   * Set line color
   */
  setLineColor(instanceId, colorName) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const colorPreset = LINE_COLORS[colorName];
    if (!colorPreset) {
      log.warn(`Unknown line color: ${colorName}`);
      return;
    }

    state.lineColor = colorName;

    if (state.cutActor) {
      state.cutActor.getProperty().setColor(...colorPreset.rgb);
      state.sceneObjects.renderWindow?.render();
    }
  }

  /**
   * Toggle original geometry visibility
   */
  toggleShowOriginal(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    state.showOriginal = !state.showOriginal;

    const { actor } = state.sceneObjects;
    if (actor) {
      if (state.showOriginal) {
        actor.getProperty().setOpacity(state.originalOpacity);
      } else {
        actor.getProperty().setOpacity(0);
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
    if (!state) return [];

    const tools = [
      {
        id: 'cutter-toggle',
        type: 'toggle',
        icon: 'minus-square',
        label: state.enabled ? 'Cutter On' : 'Cross-Section',
        description: 'Cut geometry with a plane',
        active: state.enabled,
        onClick: () => this.toggleCutter(instanceId),
      },
    ];

    if (state.enabled) {
      tools.push(
        // Plane orientation
        {
          id: 'cutter-orientation',
          type: 'menu',
          icon: 'layers',
          label: PLANE_PRESETS[state.planeOrientation]?.name || 'Orientation',
          description: 'Cutting plane orientation',
          options: Object.entries(PLANE_PRESETS).map(([id, preset]) => ({
            id: `orient-${id}`,
            label: preset.name,
            active: state.planeOrientation === id,
            onClick: () => this.setPlaneOrientation(instanceId, id),
          })),
        },
        // Position presets
        {
          id: 'cutter-position',
          type: 'menu',
          icon: 'move',
          label: `Pos: ${Math.round(state.planePosition * 100)}%`,
          description: 'Cutting plane position',
          options: [
            { id: 'pos-0', label: '0%', onClick: () => this.setPlanePosition(instanceId, 0) },
            { id: 'pos-25', label: '25%', onClick: () => this.setPlanePosition(instanceId, 0.25) },
            { id: 'pos-50', label: '50%', onClick: () => this.setPlanePosition(instanceId, 0.5) },
            { id: 'pos-75', label: '75%', onClick: () => this.setPlanePosition(instanceId, 0.75) },
            { id: 'pos-100', label: '100%', onClick: () => this.setPlanePosition(instanceId, 1) },
          ],
        },
        // Line color
        {
          id: 'cutter-color',
          type: 'menu',
          icon: 'palette',
          label: LINE_COLORS[state.lineColor]?.name || 'Color',
          description: 'Cut line color',
          options: Object.entries(LINE_COLORS).map(([id, color]) => ({
            id: `color-${id}`,
            label: color.name,
            active: state.lineColor === id,
            onClick: () => this.setLineColor(instanceId, id),
          })),
        },
        // Show original toggle
        {
          id: 'cutter-show-original',
          type: 'toggle',
          icon: state.showOriginal ? 'eye' : 'eye-off',
          label: state.showOriginal ? 'Mesh Visible' : 'Mesh Hidden',
          description: 'Toggle original mesh visibility',
          active: state.showOriginal,
          onClick: () => this.toggleShowOriginal(instanceId),
        }
      );
    }

    return tools;
  }
}

// Export singleton instance
export const vtkCutterFeature = new VTKCutterFeature();
export default vtkCutterFeature;
