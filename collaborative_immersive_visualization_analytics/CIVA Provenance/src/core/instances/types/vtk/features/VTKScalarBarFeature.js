// src/core/instances/types/vtk/features/VTKScalarBarFeature.js

/**
 * VTK Scalar Bar Feature
 *
 * Displays a color legend (scalar bar) showing the mapping between
 * scalar values and colors in the visualization.
 *
 * Provides:
 * - Color scale legend display
 * - Customizable positioning
 * - Axis labels and tick marks
 * - Integration with scalar coloring feature
 *
 * @see https://kitware.github.io/vtk-js/examples/ScalarBarActor.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// VTK.js imports
import vtkScalarBarActor from "@kitware/vtk.js/Rendering/Core/ScalarBarActor";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Position presets for scalar bar
 */
const POSITION_PRESETS = {
  right: { name: 'Right', position: [0.9, 0.1], size: [0.08, 0.8] },
  left: { name: 'Left', position: [0.02, 0.1], size: [0.08, 0.8] },
  top: { name: 'Top', position: [0.1, 0.9], size: [0.8, 0.08], horizontal: true },
  bottom: { name: 'Bottom', position: [0.1, 0.02], size: [0.8, 0.08], horizontal: true },
  topRight: { name: 'Top Right', position: [0.85, 0.7], size: [0.08, 0.25] },
  bottomRight: { name: 'Bottom Right', position: [0.85, 0.05], size: [0.08, 0.25] },
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  enabled: false,
  position: 'right',
  axisLabel: '',
  showTickLabels: true,
  numberOfLabels: 5,
  drawNanAnnotation: false,
  drawBelowRangeSwatch: false,
  drawAboveRangeSwatch: false,
};

// =============================================================================
// VTK SCALAR BAR FEATURE
// =============================================================================

export class VTKScalarBarFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKScalarBarFeature',
      name: 'Scalar Bar',
      description: 'Color legend for scalar visualization',
      version: '1.0.0',
      author: 'CIA Team',
    };
  }

  /**
   * Check if this feature is available
   */
  isAvailable(instanceId, instanceData) {
    // Available for any instance with scalar coloring active
    return instanceData?.sceneObjects?.renderer != null;
  }

  /**
   * Initialize scalar bar feature
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects } = instanceData;

    if (!sceneObjects) {
      log.warn(`Cannot initialize scalar bar: no sceneObjects for ${instanceId}`);
      return;
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      // Scalar bar actor
      scalarBarActor: null,
      // Reference to lookup table
      lookupTable: null,
      scalarRange: [0, 1],
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Scalar bar feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up scalar bar resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disableScalarBar(state);

    this.instanceStates.delete(instanceId);
    log.debug(`Scalar bar feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      enabled: state.enabled,
      position: state.position,
      axisLabel: state.axisLabel,
      showTickLabels: state.showTickLabels,
      scalarRange: state.scalarRange,
    };
  }

  // ===========================================================================
  // SCALAR BAR CONTROLS
  // ===========================================================================

  /**
   * Enable scalar bar with a lookup table
   */
  enableScalarBar(instanceId, lookupTable, options = {}) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const { sceneObjects } = state;
    const { renderer, renderWindow } = sceneObjects;

    if (!renderer) {
      log.warn('Cannot enable scalar bar: no renderer');
      return;
    }

    // Disable existing if present
    if (state.enabled) {
      this._disableScalarBar(state);
    }

    // Store lookup table reference
    state.lookupTable = lookupTable;

    // Get range from lookup table
    if (typeof lookupTable.getRange === 'function') {
      state.scalarRange = lookupTable.getRange();
    } else if (typeof lookupTable.getMappingRange === 'function') {
      state.scalarRange = lookupTable.getMappingRange();
    }

    // Apply options
    if (options.axisLabel) state.axisLabel = options.axisLabel;
    if (options.position) state.position = options.position;

    // Create scalar bar actor
    const scalarBarActor = vtkScalarBarActor.newInstance();

    // Configure scalar bar
    scalarBarActor.setScalarsToColors(lookupTable);

    if (state.axisLabel) {
      scalarBarActor.setAxisLabel(state.axisLabel);
    }

    // Configure display options
    if (typeof scalarBarActor.setDrawNanAnnotation === 'function') {
      scalarBarActor.setDrawNanAnnotation(state.drawNanAnnotation);
    }
    if (typeof scalarBarActor.setDrawBelowRangeSwatch === 'function') {
      scalarBarActor.setDrawBelowRangeSwatch(state.drawBelowRangeSwatch);
    }
    if (typeof scalarBarActor.setDrawAboveRangeSwatch === 'function') {
      scalarBarActor.setDrawAboveRangeSwatch(state.drawAboveRangeSwatch);
    }

    // Add to renderer
    renderer.addActor(scalarBarActor);

    state.scalarBarActor = scalarBarActor;
    state.enabled = true;

    renderWindow?.render();
    log.debug(`Scalar bar enabled for instance: ${instanceId}`);
  }

  /**
   * Disable scalar bar
   */
  disableScalarBar(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    this._disableScalarBar(state);
    state.sceneObjects.renderWindow?.render();

    log.debug(`Scalar bar disabled for instance: ${instanceId}`);
  }

  /**
   * Internal disable helper
   */
  _disableScalarBar(state) {
    const { sceneObjects, scalarBarActor } = state;
    const { renderer } = sceneObjects || {};

    if (scalarBarActor && renderer) {
      renderer.removeActor(scalarBarActor);
      scalarBarActor.delete();
    }

    state.scalarBarActor = null;
    state.lookupTable = null;
    state.enabled = false;
  }

  /**
   * Toggle scalar bar visibility
   */
  toggleScalarBar(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (state.enabled) {
      this.disableScalarBar(instanceId);
    } else if (state.lookupTable) {
      this.enableScalarBar(instanceId, state.lookupTable);
    }
  }

  /**
   * Set scalar bar position
   */
  setPosition(instanceId, positionName) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const preset = POSITION_PRESETS[positionName];
    if (!preset) {
      log.warn(`Unknown scalar bar position: ${positionName}`);
      return;
    }

    state.position = positionName;

    // Note: VTK.js ScalarBarActor positioning is automatic
    // Custom positioning would require manual coordinate adjustment
    // For now, we store the preference for future use

    if (state.enabled) {
      state.sceneObjects.renderWindow?.render();
    }

    log.debug(`Scalar bar position set to: ${positionName}`);
  }

  /**
   * Set axis label
   */
  setAxisLabel(instanceId, label) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.axisLabel = label;

    if (state.scalarBarActor) {
      state.scalarBarActor.setAxisLabel(label);
      state.sceneObjects.renderWindow?.render();
    }
  }

  /**
   * Update lookup table (when colormap changes)
   */
  updateLookupTable(instanceId, lookupTable) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    state.lookupTable = lookupTable;

    if (state.scalarBarActor) {
      state.scalarBarActor.setScalarsToColors(lookupTable);

      // Update range
      if (typeof lookupTable.getRange === 'function') {
        state.scalarRange = lookupTable.getRange();
      } else if (typeof lookupTable.getMappingRange === 'function') {
        state.scalarRange = lookupTable.getMappingRange();
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

    return [
      {
        id: 'scalar-bar-toggle',
        type: 'toggle',
        icon: 'bar-chart-2',
        label: state.enabled ? 'Legend On' : 'Legend',
        description: 'Toggle color legend visibility',
        active: state.enabled,
        disabled: !state.lookupTable,
        onClick: () => this.toggleScalarBar(instanceId),
      },
      ...(state.enabled ? [{
        id: 'scalar-bar-position',
        type: 'menu',
        icon: 'move',
        label: POSITION_PRESETS[state.position]?.name || 'Position',
        description: 'Scalar bar position',
        options: Object.entries(POSITION_PRESETS).map(([id, preset]) => ({
          id: `pos-${id}`,
          label: preset.name,
          active: state.position === id,
          onClick: () => this.setPosition(instanceId, id),
        })),
      }] : []),
    ];
  }
}

// Export singleton instance
export const vtkScalarBarFeature = new VTKScalarBarFeature();
export default vtkScalarBarFeature;
