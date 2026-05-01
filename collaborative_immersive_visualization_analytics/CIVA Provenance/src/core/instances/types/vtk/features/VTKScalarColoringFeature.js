// src/core/instances/types/vtk/features/VTKScalarColoringFeature.js

/**
 * VTK Scalar Coloring (Heat Map) Feature
 *
 * Enables coloring of geometry based on scalar data arrays.
 * Provides:
 * - Array selection (choose which data array to color by)
 * - Colormap selection (viridis, plasma, rainbow, etc.)
 * - Scalar range control (min/max values)
 * - Scalar bar (legend) display
 *
 * @see https://kitware.github.io/vtk-js/examples/GeometryViewer.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// VTK.js imports
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkScalarBarActor from "@kitware/vtk.js/Rendering/Core/ScalarBarActor";
import vtkColorMaps from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Available colormaps
 */
const COLORMAP_PRESETS = {
  viridis: { name: 'Viridis', description: 'Perceptually uniform (default)' },
  plasma: { name: 'Plasma', description: 'Warm colors, high contrast' },
  inferno: { name: 'Inferno', description: 'Dark to bright' },
  magma: { name: 'Magma', description: 'Dark purples to yellow' },
  cividis: { name: 'Cividis', description: 'Colorblind-friendly' },
  rainbow: { name: 'Rainbow', description: 'Classic rainbow' },
  coolToWarm: { name: 'Cool to Warm', description: 'Blue to red diverging' },
  grayscale: { name: 'Grayscale', description: 'Black to white' },
  jet: { name: 'Jet', description: 'Classic scientific' },
  turbo: { name: 'Turbo', description: 'Improved rainbow' },
  hot: { name: 'Hot', description: 'Black to white via red/orange' },
  winter: { name: 'Winter', description: 'Blue to green' },
  summer: { name: 'Summer', description: 'Green to yellow' },
  spring: { name: 'Spring', description: 'Magenta to yellow' },
  autumn: { name: 'Autumn', description: 'Red to yellow' },
  bone: { name: 'Bone', description: 'Grayscale with blue tint' },
  copper: { name: 'Copper', description: 'Black to copper' },
  pink: { name: 'Pink', description: 'Pastel pink gradient' },
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  enabled: false,
  activeArray: null,
  activeArrayType: 'point', // 'point' or 'cell'
  colormap: 'viridis',
  scalarRangeMode: 'auto', // 'auto' or 'custom'
  scalarRange: [0, 1],
  showScalarBar: true,
  scalarBarPosition: 'right', // 'left', 'right', 'top', 'bottom'
};

// =============================================================================
// VTK SCALAR COLORING FEATURE
// =============================================================================

export class VTKScalarColoringFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKScalarColoringFeature',
      name: 'Scalar Coloring',
      description: 'Color geometry by data values (heat map)',
      version: '1.0.0',
      author: 'CIA Team',
    };
  }

  /**
   * Initialize scalar coloring feature for an instance
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects } = instanceData;

    if (!sceneObjects) {
      log.warn(`Cannot initialize scalar coloring: no sceneObjects for ${instanceId}`);
      return;
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      // Color transfer function
      colorTransferFunction: null,
      // Scalar bar actor
      scalarBarActor: null,
      // Available arrays
      availableArrays: {
        point: [],
        cell: [],
      },
      // Data range for current array
      dataRange: [0, 1],
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Scalar coloring feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up scalar coloring resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disableScalarColoring(state);

    this.instanceStates.delete(instanceId);
    log.debug(`Scalar coloring feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      enabled: state.enabled,
      activeArray: state.activeArray,
      activeArrayType: state.activeArrayType,
      colormap: state.colormap,
      scalarRangeMode: state.scalarRangeMode,
      scalarRange: state.scalarRange,
      showScalarBar: state.showScalarBar,
      availableArrays: state.availableArrays,
      dataRange: state.dataRange,
    };
  }

  // ===========================================================================
  // ARRAY DISCOVERY
  // ===========================================================================

  /**
   * Scan polydata for available scalar arrays
   */
  scanAvailableArrays(instanceId, polydata) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const pointData = polydata.getPointData();
    const cellData = polydata.getCellData();

    // Get point data arrays
    const pointArrays = [];
    for (let i = 0; i < pointData.getNumberOfArrays(); i++) {
      const array = pointData.getArrayByIndex(i);
      if (array) {
        const name = pointData.getArrayName(i) || `Array ${i}`;
        const numComponents = array.getNumberOfComponents();
        const range = array.getRange();

        pointArrays.push({
          name,
          index: i,
          components: numComponents,
          range: [range[0], range[1]],
        });
      }
    }

    // Get cell data arrays
    const cellArrays = [];
    for (let i = 0; i < cellData.getNumberOfArrays(); i++) {
      const array = cellData.getArrayByIndex(i);
      if (array) {
        const name = cellData.getArrayName(i) || `Array ${i}`;
        const numComponents = array.getNumberOfComponents();
        const range = array.getRange();

        cellArrays.push({
          name,
          index: i,
          components: numComponents,
          range: [range[0], range[1]],
        });
      }
    }

    state.availableArrays = {
      point: pointArrays,
      cell: cellArrays,
    };

    log.debug(`Found ${pointArrays.length} point arrays, ${cellArrays.length} cell arrays`);

    return state.availableArrays;
  }

  // ===========================================================================
  // SCALAR COLORING CONTROLS
  // ===========================================================================

  /**
   * Enable scalar coloring by an array
   */
  enableScalarColoring(instanceId, arrayName, arrayType = 'point') {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const { sceneObjects } = state;
    const { mapper, renderer, renderWindow } = sceneObjects;

    if (!mapper) {
      log.warn('Cannot enable scalar coloring: no mapper');
      return;
    }

    // Find the array info
    const arrays = arrayType === 'point' ? state.availableArrays.point : state.availableArrays.cell;
    const arrayInfo = arrays.find(a => a.name === arrayName);

    if (!arrayInfo) {
      log.warn(`Array not found: ${arrayName} (${arrayType})`);
      return;
    }

    // Store state
    state.activeArray = arrayName;
    state.activeArrayType = arrayType;
    state.dataRange = arrayInfo.range;

    // Calculate scalar range
    if (state.scalarRangeMode === 'auto') {
      state.scalarRange = [...arrayInfo.range];
    }

    // Create color transfer function
    const ctfun = vtkColorTransferFunction.newInstance();

    // Apply colormap
    this._applyColormap(state, ctfun);

    // Configure mapper
    mapper.setScalarVisibility(true);
    mapper.setLookupTable(ctfun);

    if (arrayType === 'point') {
      mapper.setScalarModeToUsePointFieldData();
    } else {
      mapper.setScalarModeToCellFieldData();
    }

    mapper.setArrayAccessMode(1); // By name
    mapper.setColorByArrayName(arrayName);
    mapper.setScalarRange(state.scalarRange[0], state.scalarRange[1]);

    // Store reference
    state.colorTransferFunction = ctfun;
    state.enabled = true;

    // Add scalar bar if enabled
    if (state.showScalarBar) {
      this._createScalarBar(state);
    }

    renderWindow?.render();

    log.debug(`Scalar coloring enabled: ${arrayName} (${arrayType})`);
  }

  /**
   * Disable scalar coloring
   */
  disableScalarColoring(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disableScalarColoring(state);
    state.sceneObjects.renderWindow?.render();

    log.debug(`Scalar coloring disabled for instance: ${instanceId}`);
  }

  /**
   * Internal method to disable scalar coloring
   */
  _disableScalarColoring(state) {
    const { sceneObjects, colorTransferFunction, scalarBarActor } = state;
    const { mapper, renderer } = sceneObjects || {};

    // Disable scalar coloring on mapper
    if (mapper) {
      mapper.setScalarVisibility(false);
    }

    // Remove scalar bar
    if (scalarBarActor && renderer) {
      renderer.removeActor(scalarBarActor);
      scalarBarActor.delete();
    }

    // Clean up color transfer function
    if (colorTransferFunction) {
      colorTransferFunction.delete();
    }

    state.colorTransferFunction = null;
    state.scalarBarActor = null;
    state.activeArray = null;
    state.enabled = false;
  }

  /**
   * Set colormap
   */
  setColormap(instanceId, colormapName) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.colormap = colormapName;

    if (state.enabled && state.colorTransferFunction) {
      this._applyColormap(state, state.colorTransferFunction);
      state.sceneObjects.mapper?.setLookupTable(state.colorTransferFunction);
      state.sceneObjects.renderWindow?.render();
    }

    log.debug(`Colormap set to: ${colormapName}`);
  }

  /**
   * Apply colormap to color transfer function
   */
  _applyColormap(state, ctfun) {
    const { colormap, scalarRange } = state;

    // Try to get VTK preset
    const preset = vtkColorMaps.getPresetByName(colormap);

    if (preset) {
      ctfun.applyColorMap(preset);
      ctfun.setMappingRange(scalarRange[0], scalarRange[1]);
      ctfun.updateRange();
    } else {
      // Fallback to simple grayscale
      ctfun.removeAllPoints();
      ctfun.addRGBPoint(scalarRange[0], 0, 0, 0);
      ctfun.addRGBPoint(scalarRange[1], 1, 1, 1);
    }
  }

  /**
   * Set scalar range
   */
  setScalarRange(instanceId, min, max) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.scalarRangeMode = 'custom';
    state.scalarRange = [min, max];

    if (state.enabled) {
      const { mapper, colorTransferFunction, renderWindow } = state.sceneObjects;

      if (colorTransferFunction) {
        this._applyColormap(state, colorTransferFunction);
      }

      if (mapper) {
        mapper.setScalarRange(min, max);
      }

      renderWindow?.render();
    }
  }

  /**
   * Reset to auto scalar range
   */
  resetScalarRange(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.scalarRangeMode = 'auto';
    state.scalarRange = [...state.dataRange];

    if (state.enabled) {
      const { mapper, colorTransferFunction, renderWindow } = state.sceneObjects;

      if (colorTransferFunction) {
        this._applyColormap(state, colorTransferFunction);
      }

      if (mapper) {
        mapper.setScalarRange(state.scalarRange[0], state.scalarRange[1]);
      }

      renderWindow?.render();
    }
  }

  // ===========================================================================
  // SCALAR BAR (LEGEND)
  // ===========================================================================

  /**
   * Create scalar bar actor
   */
  _createScalarBar(state) {
    const { sceneObjects, colorTransferFunction, activeArray } = state;
    const { renderer } = sceneObjects;

    if (!renderer || !colorTransferFunction) return;

    // Remove existing scalar bar
    this._removeScalarBar(state);

    // Create scalar bar actor
    const scalarBarActor = vtkScalarBarActor.newInstance();
    scalarBarActor.setScalarsToColors(colorTransferFunction);

    // Configure appearance
    scalarBarActor.setAxisLabel(activeArray || 'Scalar');
    scalarBarActor.setDrawNanAnnotation(false);
    scalarBarActor.setAutomated(true);

    // Position based on setting
    // Note: VTK.js ScalarBarActor positioning may vary
    // This is a simplified version

    renderer.addActor2D(scalarBarActor);
    state.scalarBarActor = scalarBarActor;
  }

  /**
   * Remove scalar bar
   */
  _removeScalarBar(state) {
    const { sceneObjects, scalarBarActor } = state;
    const { renderer } = sceneObjects || {};

    if (scalarBarActor && renderer) {
      renderer.removeActor2D(scalarBarActor);
      scalarBarActor.delete();
      state.scalarBarActor = null;
    }
  }

  /**
   * Toggle scalar bar visibility
   */
  toggleScalarBar(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.showScalarBar = !state.showScalarBar;

    if (state.enabled) {
      if (state.showScalarBar) {
        this._createScalarBar(state);
      } else {
        this._removeScalarBar(state);
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

    const { availableArrays, enabled, activeArray, activeArrayType, colormap, showScalarBar } = state;

    // Combine available arrays with type prefix
    const allArrays = [
      ...availableArrays.point.map(a => ({ ...a, type: 'point', prefix: 'P:' })),
      ...availableArrays.cell.map(a => ({ ...a, type: 'cell', prefix: 'C:' })),
    ];

    if (allArrays.length === 0) {
      return []; // No arrays to color by
    }

    const tools = [];

    // Array selector
    tools.push({
      id: 'scalar-array',
      icon: 'database',
      label: enabled ? activeArray : 'Color By...',
      description: 'Select data array for coloring',
      type: 'menu',
      options: [
        {
          id: 'scalar-none',
          label: 'None (Solid Color)',
          description: 'Disable scalar coloring',
          active: !enabled,
          onClick: () => this.disableScalarColoring(instanceId),
        },
        { type: 'separator' },
        ...allArrays.map(array => ({
          id: `scalar-${array.type}-${array.name}`,
          label: `${array.prefix} ${array.name}`,
          description: `Range: ${array.range[0].toFixed(2)} - ${array.range[1].toFixed(2)}`,
          active: enabled && activeArray === array.name && activeArrayType === array.type,
          onClick: () => this.enableScalarColoring(instanceId, array.name, array.type),
        })),
      ],
    });

    // Only show colormap and scalar bar options when coloring is enabled
    if (enabled) {
      // Colormap selector
      tools.push({
        id: 'colormap-select',
        icon: 'palette',
        label: COLORMAP_PRESETS[colormap]?.name || 'Colormap',
        description: 'Change color mapping',
        type: 'menu',
        options: Object.entries(COLORMAP_PRESETS).map(([id, preset]) => ({
          id: `cmap-${id}`,
          label: preset.name,
          description: preset.description,
          active: colormap === id,
          onClick: () => this.setColormap(instanceId, id),
        })),
      });

      // Scalar bar toggle
      tools.push({
        id: 'scalar-bar-toggle',
        icon: 'list',
        label: showScalarBar ? 'Hide Legend' : 'Show Legend',
        description: 'Toggle color scale legend',
        type: 'toggle',
        active: showScalarBar,
        onClick: () => this.toggleScalarBar(instanceId),
      });

      // Reset range
      tools.push({
        id: 'reset-range',
        icon: 'refresh',
        label: 'Auto Range',
        description: 'Reset to automatic scalar range',
        type: 'button',
        onClick: () => this.resetScalarRange(instanceId),
      });
    }

    return tools;
  }
}

// Export singleton instance
export const vtkScalarColoringFeature = new VTKScalarColoringFeature();
export default vtkScalarColoringFeature;
