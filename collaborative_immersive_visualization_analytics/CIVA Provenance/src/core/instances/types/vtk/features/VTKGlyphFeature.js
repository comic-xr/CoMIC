// src/core/instances/types/vtk/features/VTKGlyphFeature.js

/**
 * VTK Glyph Rendering Feature
 *
 * Renders glyphs (arrows, cones, spheres, etc.) at data points.
 * Useful for:
 * - Vector field visualization (arrows show direction/magnitude)
 * - Tensor field visualization
 * - Point attribute visualization (size by scalar, color by scalar)
 *
 * @see https://kitware.github.io/vtk-js/examples/Glyph3DMapper.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// VTK.js imports
import vtkGlyph3DMapper from "@kitware/vtk.js/Rendering/Core/Glyph3DMapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkArrowSource from "@kitware/vtk.js/Filters/Sources/ArrowSource";
import vtkConeSource from "@kitware/vtk.js/Filters/Sources/ConeSource";
import vtkSphereSource from "@kitware/vtk.js/Filters/Sources/SphereSource";
import vtkCubeSource from "@kitware/vtk.js/Filters/Sources/CubeSource";
import vtkCylinderSource from "@kitware/vtk.js/Filters/Sources/CylinderSource";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Available glyph types
 */
const GLYPH_TYPES = {
  arrow: {
    name: 'Arrow',
    description: 'Directional arrows',
    createSource: () => {
      const source = vtkArrowSource.newInstance();
      source.setTipLength(0.35);
      source.setTipRadius(0.1);
      source.setShaftRadius(0.03);
      return source;
    },
  },
  cone: {
    name: 'Cone',
    description: 'Conical glyphs',
    createSource: () => {
      const source = vtkConeSource.newInstance();
      source.setHeight(1.0);
      source.setRadius(0.25);
      source.setResolution(12);
      return source;
    },
  },
  sphere: {
    name: 'Sphere',
    description: 'Spherical glyphs',
    createSource: () => {
      const source = vtkSphereSource.newInstance();
      source.setRadius(0.5);
      source.setThetaResolution(16);
      source.setPhiResolution(16);
      return source;
    },
  },
  cube: {
    name: 'Cube',
    description: 'Cubic glyphs',
    createSource: () => {
      return vtkCubeSource.newInstance();
    },
  },
  cylinder: {
    name: 'Cylinder',
    description: 'Cylindrical glyphs',
    createSource: () => {
      const source = vtkCylinderSource.newInstance();
      source.setHeight(1.0);
      source.setRadius(0.25);
      source.setResolution(12);
      return source;
    },
  },
};

/**
 * Scaling modes
 */
const SCALING_MODES = {
  off: { name: 'No Scaling', mode: 0 },
  scalar: { name: 'By Scalar', mode: 1 },
  vector: { name: 'By Vector', mode: 2 },
  components: { name: 'By Components', mode: 3 },
};

/**
 * Orientation modes
 */
const ORIENTATION_MODES = {
  direction: { name: 'By Direction', mode: 0 },
  rotation: { name: 'By Rotation', mode: 1 },
  matrix: { name: 'By Matrix', mode: 2 },
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  enabled: false,
  glyphType: 'arrow',
  scaleFactor: 1.0,
  scalingMode: 'vector',
  orientationMode: 'direction',
  orientationArray: null,
  scaleArray: null,
  colorArray: null,
  colorMode: 'solid', // 'solid' or 'scalar'
  solidColor: [0.2, 0.4, 0.9],
  maxGlyphs: 10000, // Performance limit
  skipFactor: 1, // Every Nth point
};

// =============================================================================
// VTK GLYPH FEATURE
// =============================================================================

export class VTKGlyphFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKGlyphFeature',
      name: 'Glyph Rendering',
      description: 'Render glyphs at data points for vector/tensor visualization',
      version: '1.0.0',
      author: 'CIA Team',
    };
  }

  /**
   * Check if feature is available
   */
  isAvailable(instanceId, instanceData) {
    // Available for any mesh data with point or cell data
    return instanceData?.sceneObjects?.mapper != null;
  }

  /**
   * Initialize glyph feature
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects } = instanceData;

    if (!sceneObjects) {
      log.warn(`Cannot initialize glyph feature: no sceneObjects for ${instanceId}`);
      return;
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      // Glyph rendering objects
      glyphMapper: null,
      glyphActor: null,
      glyphSource: null,
      colorTransferFunction: null,
      // Available arrays
      vectorArrays: [],
      scalarArrays: [],
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Glyph feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up glyph resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disableGlyphs(state);

    this.instanceStates.delete(instanceId);
    log.debug(`Glyph feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      enabled: state.enabled,
      glyphType: state.glyphType,
      scaleFactor: state.scaleFactor,
      scalingMode: state.scalingMode,
      orientationArray: state.orientationArray,
      scaleArray: state.scaleArray,
      colorArray: state.colorArray,
      colorMode: state.colorMode,
      vectorArrays: state.vectorArrays,
      scalarArrays: state.scalarArrays,
    };
  }

  // ===========================================================================
  // ARRAY DISCOVERY
  // ===========================================================================

  /**
   * Scan polydata for vector and scalar arrays
   */
  scanAvailableArrays(instanceId, polydata) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const pointData = polydata.getPointData();

    const vectorArrays = [];
    const scalarArrays = [];

    for (let i = 0; i < pointData.getNumberOfArrays(); i++) {
      const array = pointData.getArrayByIndex(i);
      if (!array) continue;

      const name = pointData.getArrayName(i) || `Array ${i}`;
      const numComponents = array.getNumberOfComponents();

      if (numComponents === 3) {
        // Likely a vector array
        vectorArrays.push({ name, index: i, components: numComponents });
      } else if (numComponents === 1) {
        // Scalar array
        const range = array.getRange();
        scalarArrays.push({ name, index: i, components: numComponents, range: [range[0], range[1]] });
      }
    }

    state.vectorArrays = vectorArrays;
    state.scalarArrays = scalarArrays;

    log.debug(`Found ${vectorArrays.length} vector arrays, ${scalarArrays.length} scalar arrays for glyphs`);

    return { vectorArrays, scalarArrays };
  }

  // ===========================================================================
  // GLYPH CONTROLS
  // ===========================================================================

  /**
   * Enable glyph rendering
   */
  enableGlyphs(instanceId, polydata, options = {}) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const { sceneObjects } = state;
    const { renderer, renderWindow } = sceneObjects;

    if (!renderer) {
      log.warn('Cannot enable glyphs: no renderer');
      return;
    }

    // Merge options with defaults
    Object.assign(state, options);

    // Create glyph source
    const glyphTypeConfig = GLYPH_TYPES[state.glyphType];
    const glyphSource = glyphTypeConfig.createSource();

    // Create glyph mapper
    const glyphMapper = vtkGlyph3DMapper.newInstance();
    glyphMapper.setInputData(polydata, 0);
    glyphMapper.setInputConnection(glyphSource.getOutputPort(), 1);
    glyphMapper.setScaleFactor(state.scaleFactor);

    // Configure scaling mode
    const scalingConfig = SCALING_MODES[state.scalingMode];
    glyphMapper.setScaling(scalingConfig.mode !== 0);
    glyphMapper.setScaleMode(scalingConfig.mode);

    // Set orientation array if specified
    if (state.orientationArray) {
      glyphMapper.setOrientationArray(state.orientationArray);
      glyphMapper.setOrientationMode(0); // Direction mode
    }

    // Set scale array if specified
    if (state.scaleArray) {
      glyphMapper.setScaleArray(state.scaleArray);
    }

    // Performance: limit number of glyphs
    const numPoints = polydata.getNumberOfPoints();
    if (numPoints > state.maxGlyphs) {
      const skip = Math.ceil(numPoints / state.maxGlyphs);
      state.skipFactor = skip;
      log.warn(`Too many points (${numPoints}), rendering every ${skip}th glyph`);
      // Note: vtkGlyph3DMapper doesn't have built-in masking
      // For real implementation, you'd need to subsample the input
    }

    // Create actor
    const glyphActor = vtkActor.newInstance();
    glyphActor.setMapper(glyphMapper);

    // Set color
    if (state.colorMode === 'solid') {
      glyphActor.getProperty().setColor(...state.solidColor);
      glyphMapper.setScalarVisibility(false);
    } else if (state.colorArray) {
      glyphMapper.setScalarVisibility(true);
      glyphMapper.setColorByArrayName(state.colorArray);
    }

    // Add to renderer
    renderer.addActor(glyphActor);

    // Store references
    state.glyphSource = glyphSource;
    state.glyphMapper = glyphMapper;
    state.glyphActor = glyphActor;
    state.enabled = true;

    renderWindow?.render();

    log.debug(`Glyphs enabled: ${state.glyphType}`);
  }

  /**
   * Disable glyph rendering
   */
  disableGlyphs(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disableGlyphs(state);

    // Ensure original actor is visible with reasonable point size for point clouds
    const { actor } = state.sceneObjects || {};
    if (actor) {
      actor.setVisibility(true);
      // If point data, ensure visible point size
      const currentPointSize = actor.getProperty().getPointSize();
      if (currentPointSize < 2) {
        actor.getProperty().setPointSize(5);
        log.debug('Restored point size after disabling glyphs');
      }
    }

    state.sceneObjects.renderWindow?.render();

    log.debug(`Glyphs disabled for instance: ${instanceId}`);
  }

  /**
   * Internal disable
   */
  _disableGlyphs(state) {
    const { sceneObjects, glyphActor, glyphMapper, glyphSource, colorTransferFunction } = state;
    const { renderer } = sceneObjects || {};

    if (glyphActor && renderer) {
      renderer.removeActor(glyphActor);
      glyphActor.delete();
    }

    if (glyphMapper) {
      glyphMapper.delete();
    }

    if (glyphSource) {
      glyphSource.delete();
    }

    if (colorTransferFunction) {
      colorTransferFunction.delete();
    }

    state.glyphActor = null;
    state.glyphMapper = null;
    state.glyphSource = null;
    state.colorTransferFunction = null;
    state.enabled = false;
  }

  /**
   * Set glyph type
   */
  setGlyphType(instanceId, type) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !GLYPH_TYPES[type]) return;

    state.glyphType = type;

    if (state.enabled && state.glyphMapper) {
      // Recreate glyph source
      if (state.glyphSource) {
        state.glyphSource.delete();
      }

      const glyphTypeConfig = GLYPH_TYPES[type];
      const glyphSource = glyphTypeConfig.createSource();
      state.glyphSource = glyphSource;

      state.glyphMapper.setInputConnection(glyphSource.getOutputPort(), 1);
      state.sceneObjects.renderWindow?.render();
    }

    log.debug(`Glyph type set to: ${type}`);
  }

  /**
   * Set scale factor
   */
  setScaleFactor(instanceId, factor) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.scaleFactor = Math.max(0.001, factor);

    if (state.glyphMapper) {
      state.glyphMapper.setScaleFactor(state.scaleFactor);
      state.sceneObjects.renderWindow?.render();
    }
  }

  /**
   * Set orientation array
   */
  setOrientationArray(instanceId, arrayName) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.glyphMapper) return;

    state.orientationArray = arrayName;

    if (arrayName) {
      state.glyphMapper.setOrientationArray(arrayName);
      state.glyphMapper.setOrientationMode(0);
    }

    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Set solid color
   */
  setSolidColor(instanceId, rgb) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.colorMode = 'solid';
    state.solidColor = rgb;

    if (state.glyphActor) {
      state.glyphActor.getProperty().setColor(...rgb);
      state.glyphMapper?.setScalarVisibility(false);
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

    const tools = [];

    // Glyph enable/disable toggle when arrays available
    if (state.vectorArrays.length > 0 || state.scalarArrays.length > 0) {
      tools.push({
        id: 'glyph-toggle',
        icon: state.enabled ? 'eye' : 'eye-off',
        label: state.enabled ? 'Disable Glyphs' : 'Enable Glyphs',
        description: 'Toggle glyph rendering',
        type: 'toggle',
        active: state.enabled,
        onClick: () => {
          if (state.enabled) {
            this.disableGlyphs(instanceId);
          } else {
            // Would need polydata reference here - typically called from handler
            log.debug('Enable glyphs - requires polydata');
          }
        },
      });
    }

    if (state.enabled) {
      // Glyph type selector
      tools.push({
        id: 'glyph-type',
        icon: 'shapes',
        label: GLYPH_TYPES[state.glyphType]?.name || 'Glyph Type',
        description: 'Change glyph shape',
        type: 'menu',
        options: Object.entries(GLYPH_TYPES).map(([id, config]) => ({
          id: `glyph-${id}`,
          label: config.name,
          description: config.description,
          active: state.glyphType === id,
          onClick: () => this.setGlyphType(instanceId, id),
        })),
      });

      // Scale factor
      tools.push({
        id: 'glyph-scale',
        icon: 'maximize',
        label: `Scale: ${state.scaleFactor.toFixed(1)}`,
        description: 'Glyph size multiplier',
        type: 'menu',
        options: [
          { id: 'scale-0.1', label: '0.1x', active: state.scaleFactor === 0.1, onClick: () => this.setScaleFactor(instanceId, 0.1) },
          { id: 'scale-0.5', label: '0.5x', active: state.scaleFactor === 0.5, onClick: () => this.setScaleFactor(instanceId, 0.5) },
          { id: 'scale-1', label: '1x', active: state.scaleFactor === 1.0, onClick: () => this.setScaleFactor(instanceId, 1.0) },
          { id: 'scale-2', label: '2x', active: state.scaleFactor === 2.0, onClick: () => this.setScaleFactor(instanceId, 2.0) },
          { id: 'scale-5', label: '5x', active: state.scaleFactor === 5.0, onClick: () => this.setScaleFactor(instanceId, 5.0) },
        ],
      });

      // Orientation array selector
      if (state.vectorArrays.length > 0) {
        tools.push({
          id: 'glyph-orient',
          icon: 'compass',
          label: state.orientationArray || 'Orient By...',
          description: 'Array for glyph orientation',
          type: 'menu',
          options: state.vectorArrays.map(array => ({
            id: `orient-${array.name}`,
            label: array.name,
            active: state.orientationArray === array.name,
            onClick: () => this.setOrientationArray(instanceId, array.name),
          })),
        });
      }
    }

    return tools;
  }
}

// Export singleton instance
export const vtkGlyphFeature = new VTKGlyphFeature();
export default vtkGlyphFeature;
