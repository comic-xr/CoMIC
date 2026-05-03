// src/core/instances/types/vtk/features/VTKSceneFeature.js

/**
 * VTK Scene Feature
 *
 * Controls scene-level visualization settings:
 * - Background color (solid or gradient)
 * - Grid plane display
 * - Axes display (CubeAxes for data bounds)
 * - Orientation marker (XYZ axes indicator)
 *
 * These features enhance spatial understanding and presentation quality.
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// VTK.js imports for scene features
import vtkCubeAxesActor from "@kitware/vtk.js/Rendering/Core/CubeAxesActor";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkPlaneSource from "@kitware/vtk.js/Filters/Sources/PlaneSource";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Predefined background colors
 */
const BACKGROUND_PRESETS = {
  dark: { top: [0.04, 0.04, 0.04], bottom: [0.04, 0.04, 0.04] },
  darkGradient: { top: [0.15, 0.15, 0.2], bottom: [0.02, 0.02, 0.02] },
  light: { top: [0.95, 0.95, 0.95], bottom: [0.95, 0.95, 0.95] },
  lightGradient: { top: [1.0, 1.0, 1.0], bottom: [0.85, 0.85, 0.9] },
  blue: { top: [0.1, 0.2, 0.4], bottom: [0.02, 0.05, 0.1] },
  scientific: { top: [0.2, 0.2, 0.25], bottom: [0.05, 0.05, 0.08] },
  presentation: { top: [1.0, 1.0, 1.0], bottom: [0.9, 0.9, 0.95] },
};

/**
 * Default scene settings
 */
const DEFAULT_SETTINGS = {
  backgroundPreset: 'light',
  backgroundColorTop: [0.95, 0.95, 0.95],
  backgroundColorBottom: [0.95, 0.95, 0.95],
  useGradient: false,
  showGrid: false,
  gridSize: 10,
  gridDivisions: 10,
  gridColor: [0.3, 0.3, 0.3],
  gridOpacity: 0.5,
  gridPlane: 'xz', // 'xy', 'xz', or 'yz'
  showAxes: false,
  axesColor: [0.7, 0.7, 0.7],
  axesFontSize: 12,
  showAxisLabels: true,
  showTickLabels: true,
};

// =============================================================================
// VTK SCENE FEATURE
// =============================================================================

export class VTKSceneFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKSceneFeature',
      name: 'Scene Settings',
      description: 'Background, grid, and axes visualization controls',
      version: '1.0.0',
      author: 'CIA Team',
    };
  }

  /**
   * Initialize scene feature for an instance
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects } = instanceData;

    if (!sceneObjects) {
      log.warn(`Cannot initialize scene feature: no sceneObjects for ${instanceId}`);
      return;
    }

    // Create state for this instance
    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      // Scene actors (created lazily)
      gridActor: null,
      cubeAxesActor: null,
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Scene feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up scene feature resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const { sceneObjects, gridActor, cubeAxesActor } = state;
    const { renderer } = sceneObjects || {};

    // Remove and delete grid actor
    if (gridActor && renderer) {
      renderer.removeActor(gridActor);
      gridActor.delete();
    }

    // Remove and delete cube axes actor
    if (cubeAxesActor && renderer) {
      renderer.removeActor(cubeAxesActor);
      cubeAxesActor.delete();
    }

    this.instanceStates.delete(instanceId);
    log.debug(`Scene feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current scene state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      backgroundPreset: state.backgroundPreset,
      backgroundColorTop: state.backgroundColorTop,
      backgroundColorBottom: state.backgroundColorBottom,
      useGradient: state.useGradient,
      showGrid: state.showGrid,
      gridPlane: state.gridPlane,
      gridColor: state.gridColor,
      gridOpacity: state.gridOpacity,
      showAxes: state.showAxes,
      axesColor: state.axesColor,
      showAxisLabels: state.showAxisLabels,
      showTickLabels: state.showTickLabels,
    };
  }

  // ===========================================================================
  // BACKGROUND CONTROLS
  // ===========================================================================

  /**
   * Set background from preset
   */
  setBackgroundPreset(instanceId, presetName) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const preset = BACKGROUND_PRESETS[presetName];
    if (!preset) {
      log.warn(`Unknown background preset: ${presetName}`);
      return;
    }

    state.backgroundPreset = presetName;
    state.backgroundColorTop = preset.top;
    state.backgroundColorBottom = preset.bottom;
    state.useGradient = preset.top !== preset.bottom;

    this._applyBackground(state);
    log.debug(`Background preset set to: ${presetName}`);
  }

  /**
   * Set custom background color
   */
  setBackgroundColor(instanceId, color, options = {}) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const { gradient = false, bottomColor = null } = options;

    // Normalize color input (supports hex, rgb array, or rgb object)
    const topRgb = this._normalizeColor(color);
    const bottomRgb = gradient && bottomColor
      ? this._normalizeColor(bottomColor)
      : topRgb;

    state.backgroundPreset = 'custom';
    state.backgroundColorTop = topRgb;
    state.backgroundColorBottom = bottomRgb;
    state.useGradient = gradient;

    this._applyBackground(state);
    log.debug(`Background color set to: [${topRgb.join(', ')}]`);
  }

  /**
   * Apply background to renderer
   */
  _applyBackground(state) {
    const { sceneObjects, backgroundColorTop, backgroundColorBottom, useGradient } = state;
    const { renderer, renderWindow } = sceneObjects;

    if (!renderer) return;

    // Check if gradient background is supported
    const supportsGradient = typeof renderer.setGradientBackground === 'function';

    if (useGradient && supportsGradient) {
      // VTK.js supports gradient backgrounds
      renderer.setBackground(...backgroundColorBottom);
      renderer.setBackground2(...backgroundColorTop);
      renderer.setGradientBackground(true);
    } else if (useGradient && !supportsGradient) {
      // Fallback: use average color if gradient not supported
      const avgColor = [
        (backgroundColorTop[0] + backgroundColorBottom[0]) / 2,
        (backgroundColorTop[1] + backgroundColorBottom[1]) / 2,
        (backgroundColorTop[2] + backgroundColorBottom[2]) / 2,
      ];
      renderer.setBackground(...avgColor);
      log.debug('Gradient background not supported, using solid color fallback');
    } else {
      renderer.setBackground(...backgroundColorTop);
      if (supportsGradient) {
        renderer.setGradientBackground(false);
      }
    }

    renderWindow?.render();
  }

  /**
   * Get available background presets
   */
  getBackgroundPresets() {
    return Object.keys(BACKGROUND_PRESETS);
  }

  // ===========================================================================
  // GRID CONTROLS
  // ===========================================================================

  /**
   * Toggle grid visibility
   */
  toggleGrid(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.showGrid = !state.showGrid;

    if (state.showGrid) {
      this._createGrid(state);
    } else {
      this._removeGrid(state);
    }

    state.sceneObjects.renderWindow?.render();
    log.debug(`Grid ${state.showGrid ? 'shown' : 'hidden'}`);
  }

  /**
   * Set grid visibility
   */
  setGridVisible(instanceId, visible) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (state.showGrid === visible) return;
    state.showGrid = visible;

    if (visible) {
      this._createGrid(state);
    } else {
      this._removeGrid(state);
    }

    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Set grid plane orientation
   */
  setGridPlane(instanceId, plane) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (!['xy', 'xz', 'yz'].includes(plane)) {
      log.warn(`Invalid grid plane: ${plane}`);
      return;
    }

    state.gridPlane = plane;

    if (state.showGrid) {
      // Recreate grid with new orientation
      this._removeGrid(state);
      this._createGrid(state);
      state.sceneObjects.renderWindow?.render();
    }
  }

  /**
   * Set grid color
   */
  setGridColor(instanceId, color, opacity = null) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.gridColor = this._normalizeColor(color);
    if (opacity !== null) {
      state.gridOpacity = Math.max(0, Math.min(1, opacity));
    }

    if (state.gridActor) {
      const property = state.gridActor.getProperty();
      property.setColor(...state.gridColor);
      property.setOpacity(state.gridOpacity);
      state.sceneObjects.renderWindow?.render();
    }
  }

  /**
   * Create grid plane
   */
  _createGrid(state) {
    const { sceneObjects, gridPlane, gridSize, gridDivisions, gridColor, gridOpacity } = state;
    const { renderer } = sceneObjects;

    if (!renderer) return;

    // Remove existing grid
    this._removeGrid(state);

    // Get data bounds to position grid appropriately
    const bounds = renderer.computeVisiblePropBounds();
    const center = [
      (bounds[0] + bounds[1]) / 2,
      (bounds[2] + bounds[3]) / 2,
      (bounds[4] + bounds[5]) / 2,
    ];

    // Calculate grid size based on data bounds
    const xSize = Math.max(bounds[1] - bounds[0], 1) * 1.5;
    const ySize = Math.max(bounds[3] - bounds[2], 1) * 1.5;
    const zSize = Math.max(bounds[5] - bounds[4], 1) * 1.5;

    // Create plane source
    const planeSource = vtkPlaneSource.newInstance();
    planeSource.setXResolution(gridDivisions);
    planeSource.setYResolution(gridDivisions);

    // Set plane orientation and position
    switch (gridPlane) {
      case 'xy':
        planeSource.setOrigin(center[0] - xSize/2, center[1] - ySize/2, bounds[4]);
        planeSource.setPoint1(center[0] + xSize/2, center[1] - ySize/2, bounds[4]);
        planeSource.setPoint2(center[0] - xSize/2, center[1] + ySize/2, bounds[4]);
        break;
      case 'xz':
        planeSource.setOrigin(center[0] - xSize/2, bounds[2], center[2] - zSize/2);
        planeSource.setPoint1(center[0] + xSize/2, bounds[2], center[2] - zSize/2);
        planeSource.setPoint2(center[0] - xSize/2, bounds[2], center[2] + zSize/2);
        break;
      case 'yz':
        planeSource.setOrigin(bounds[0], center[1] - ySize/2, center[2] - zSize/2);
        planeSource.setPoint1(bounds[0], center[1] + ySize/2, center[2] - zSize/2);
        planeSource.setPoint2(bounds[0], center[1] - ySize/2, center[2] + zSize/2);
        break;
    }

    // Create mapper and actor
    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(planeSource.getOutputPort());

    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);

    // Style the grid
    const property = actor.getProperty();
    property.setRepresentation(1); // Wireframe
    property.setColor(...gridColor);
    property.setOpacity(gridOpacity);
    property.setLineWidth(1);

    // Add to scene
    renderer.addActor(actor);
    state.gridActor = actor;
  }

  /**
   * Remove grid from scene
   */
  _removeGrid(state) {
    if (state.gridActor && state.sceneObjects?.renderer) {
      state.sceneObjects.renderer.removeActor(state.gridActor);
      state.gridActor.delete();
      state.gridActor = null;
    }
  }

  // ===========================================================================
  // AXES CONTROLS
  // ===========================================================================

  /**
   * Toggle axes visibility
   */
  toggleAxes(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.showAxes = !state.showAxes;

    if (state.showAxes) {
      this._createAxes(state);
    } else {
      this._removeAxes(state);
    }

    state.sceneObjects.renderWindow?.render();
    log.debug(`Axes ${state.showAxes ? 'shown' : 'hidden'}`);
  }

  /**
   * Set axes visibility
   */
  setAxesVisible(instanceId, visible) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (state.showAxes === visible) return;
    state.showAxes = visible;

    if (visible) {
      this._createAxes(state);
    } else {
      this._removeAxes(state);
    }

    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Configure axes display
   */
  setAxesOptions(instanceId, options = {}) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const { color, showAxisLabels, showTickLabels, fontSize } = options;

    if (color) state.axesColor = this._normalizeColor(color);
    if (showAxisLabels !== undefined) state.showAxisLabels = showAxisLabels;
    if (showTickLabels !== undefined) state.showTickLabels = showTickLabels;
    if (fontSize) state.axesFontSize = fontSize;

    if (state.showAxes && state.cubeAxesActor) {
      this._updateAxesStyle(state);
      state.sceneObjects.renderWindow?.render();
    }
  }

  /**
   * Create CubeAxes actor
   */
  _createAxes(state) {
    const { sceneObjects, axesColor, axesFontSize, showAxisLabels, showTickLabels } = state;
    const { renderer, camera } = sceneObjects;

    if (!renderer) return;

    // Remove existing axes
    this._removeAxes(state);

    // Get data bounds
    const bounds = renderer.computeVisiblePropBounds();

    // Create CubeAxes actor
    const cubeAxesActor = vtkCubeAxesActor.newInstance();
    cubeAxesActor.setCamera(camera);
    cubeAxesActor.setDataBounds(...bounds);

    // Configure appearance
    cubeAxesActor.setAxisLabels(['X', 'Y', 'Z']);

    // Set visibility options
    cubeAxesActor.setGridLines(true);

    // Apply color to all axes
    const [r, g, b] = axesColor;
    for (let i = 0; i < 3; i++) {
      cubeAxesActor.getProperty().setColor(r, g, b);
    }

    // Add to renderer
    renderer.addActor(cubeAxesActor);
    state.cubeAxesActor = cubeAxesActor;
  }

  /**
   * Update axes styling
   */
  _updateAxesStyle(state) {
    const { cubeAxesActor, axesColor } = state;
    if (!cubeAxesActor) return;

    const [r, g, b] = axesColor;
    cubeAxesActor.getProperty().setColor(r, g, b);
  }

  /**
   * Remove axes from scene
   */
  _removeAxes(state) {
    if (state.cubeAxesActor && state.sceneObjects?.renderer) {
      state.sceneObjects.renderer.removeActor(state.cubeAxesActor);
      state.cubeAxesActor.delete();
      state.cubeAxesActor = null;
    }
  }

  /**
   * Update axes bounds when data changes
   */
  updateAxesBounds(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.showAxes || !state.cubeAxesActor) return;

    const bounds = state.sceneObjects.renderer.computeVisiblePropBounds();
    state.cubeAxesActor.setDataBounds(...bounds);
    state.sceneObjects.renderWindow?.render();
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
      // Background menu
      {
        id: 'scene-background',
        icon: 'palette',
        label: 'Background',
        description: 'Change scene background',
        type: 'menu',
        options: [
          {
            id: 'bg-dark',
            icon: 'moon',
            label: 'Dark',
            description: 'Dark solid background',
            active: state.backgroundPreset === 'dark',
            onClick: () => this.setBackgroundPreset(instanceId, 'dark'),
          },
          {
            id: 'bg-dark-gradient',
            icon: 'moon',
            label: 'Dark Gradient',
            description: 'Dark gradient background',
            active: state.backgroundPreset === 'darkGradient',
            onClick: () => this.setBackgroundPreset(instanceId, 'darkGradient'),
          },
          {
            id: 'bg-light',
            icon: 'sun',
            label: 'Light',
            description: 'Light solid background',
            active: state.backgroundPreset === 'light',
            onClick: () => this.setBackgroundPreset(instanceId, 'light'),
          },
          {
            id: 'bg-light-gradient',
            icon: 'sun',
            label: 'Light Gradient',
            description: 'Light gradient background',
            active: state.backgroundPreset === 'lightGradient',
            onClick: () => this.setBackgroundPreset(instanceId, 'lightGradient'),
          },
          {
            id: 'bg-scientific',
            icon: 'flask',
            label: 'Scientific',
            description: 'Neutral scientific background',
            active: state.backgroundPreset === 'scientific',
            onClick: () => this.setBackgroundPreset(instanceId, 'scientific'),
          },
          {
            id: 'bg-presentation',
            icon: 'presentation',
            label: 'Presentation',
            description: 'Clean white for presentations',
            active: state.backgroundPreset === 'presentation',
            onClick: () => this.setBackgroundPreset(instanceId, 'presentation'),
          },
          { type: 'separator' },
          {
            id: 'bg-custom',
            type: 'color-picker',
            icon: 'colorize',
            label: 'Custom Color',
            value: state.backgroundColorTop,
            active: state.backgroundPreset === 'custom',
            onChange: (rgb) => {
              this.setBackgroundColor(instanceId, rgb);
            },
          },
        ],
      },
      // Grid toggle
      {
        id: 'scene-grid',
        icon: 'grid',
        label: 'Grid',
        description: state.showGrid ? 'Hide grid' : 'Show grid',
        type: 'toggle',
        active: state.showGrid,
        onClick: () => this.toggleGrid(instanceId),
      },
      // Axes toggle
      {
        id: 'scene-axes',
        icon: 'axis3d',
        label: 'Axes',
        description: state.showAxes ? 'Hide axes' : 'Show data axes',
        type: 'toggle',
        active: state.showAxes,
        onClick: () => this.toggleAxes(instanceId),
      },
      // Grid plane selector (only when grid is visible)
      ...(state.showGrid ? [{
        id: 'scene-grid-plane',
        icon: 'layers',
        label: `Grid: ${state.gridPlane.toUpperCase()}`,
        description: 'Change grid plane',
        type: 'menu',
        options: [
          {
            id: 'grid-xy',
            label: 'XY Plane',
            description: 'Horizontal grid (floor)',
            active: state.gridPlane === 'xy',
            onClick: () => this.setGridPlane(instanceId, 'xy'),
          },
          {
            id: 'grid-xz',
            label: 'XZ Plane',
            description: 'Vertical grid (front)',
            active: state.gridPlane === 'xz',
            onClick: () => this.setGridPlane(instanceId, 'xz'),
          },
          {
            id: 'grid-yz',
            label: 'YZ Plane',
            description: 'Vertical grid (side)',
            active: state.gridPlane === 'yz',
            onClick: () => this.setGridPlane(instanceId, 'yz'),
          },
        ],
      }] : []),
    ];
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  /**
   * Normalize color input to RGB array [0-1]
   */
  _normalizeColor(color) {
    // Already an array
    if (Array.isArray(color)) {
      // Check if values are 0-255 range
      if (color.some(v => v > 1)) {
        return color.map(v => v / 255);
      }
      return color;
    }

    // Hex string
    if (typeof color === 'string' && color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return [r, g, b];
    }

    // RGB object
    if (color && typeof color === 'object') {
      const r = (color.r ?? color.red ?? 0) / (color.r > 1 || color.red > 1 ? 255 : 1);
      const g = (color.g ?? color.green ?? 0) / (color.g > 1 || color.green > 1 ? 255 : 1);
      const b = (color.b ?? color.blue ?? 0) / (color.b > 1 || color.blue > 1 ? 255 : 1);
      return [r, g, b];
    }

    // Default to light
    return [0.95, 0.95, 0.95];
  }
}

// Export singleton instance
export const vtkSceneFeature = new VTKSceneFeature();
export default vtkSceneFeature;
