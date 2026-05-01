// src/core/instances/types/vtk/features/VTKNormalsFeature.js

/**
 * VTK PolyData Normals Feature
 *
 * Computes and manages surface normals for polygon meshes.
 * Essential for proper lighting and shading.
 *
 * Provides:
 * - Point normals computation
 * - Cell normals computation
 * - Normal visualization with glyphs
 * - Flip normals option
 *
 * @see https://kitware.github.io/vtk-js/examples/PolyDataNormals.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// VTK.js imports
import vtkPolyDataNormals from "@kitware/vtk.js/Filters/Core/PolyDataNormals";
import vtkGlyph3DMapper from "@kitware/vtk.js/Rendering/Core/Glyph3DMapper";
import vtkArrowSource from "@kitware/vtk.js/Filters/Sources/ArrowSource";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  enabled: false,
  computePointNormals: true,
  computeCellNormals: false,
  // Visualization
  showNormalGlyphs: false,
  glyphScale: 0.1,
  glyphColor: [0.2, 0.8, 0.3],
};

// =============================================================================
// VTK NORMALS FEATURE
// =============================================================================

export class VTKNormalsFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKNormalsFeature',
      name: 'Surface Normals',
      description: 'Compute and visualize surface normals',
      version: '1.0.0',
      author: 'CIA Team',
    };
  }

  /**
   * Check if this feature is available
   */
  isAvailable(instanceId, instanceData) {
    const meshTypes = ['vtp', 'vtk', 'ply', 'stl', 'obj'];
    const datasetManager = window.CIA?.datasetManager;
    if (!datasetManager || !instanceData?.datasetId) return false;

    const dataset = datasetManager.getDataset(instanceData.datasetId);
    return dataset && meshTypes.includes(dataset.fileType?.toLowerCase());
  }

  /**
   * Initialize normals feature
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects } = instanceData;

    if (!sceneObjects) {
      log.warn(`Cannot initialize normals: no sceneObjects for ${instanceId}`);
      return;
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      instanceData,
      // Filter
      normalsFilter: null,
      // Glyph visualization
      glyphActor: null,
      glyphMapper: null,
      arrowSource: null,
      // Original data backup
      originalPolydata: null,
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Normals feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up normals resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disableNormals(state);
    this._hideNormalGlyphs(state);

    this.instanceStates.delete(instanceId);
    log.debug(`Normals feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      enabled: state.enabled,
      computePointNormals: state.computePointNormals,
      computeCellNormals: state.computeCellNormals,
      showNormalGlyphs: state.showNormalGlyphs,
      glyphScale: state.glyphScale,
    };
  }

  // ===========================================================================
  // NORMALS CONTROLS
  // ===========================================================================

  /**
   * Compute normals for polydata
   */
  computeNormals(instanceId, options = {}) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    const { sceneObjects } = state;
    const { mapper, renderWindow } = sceneObjects;

    if (!mapper) {
      log.warn('Cannot compute normals: no mapper');
      return null;
    }

    const inputData = mapper.getInputData();
    if (!inputData) {
      log.warn('Cannot compute normals: no input data');
      return null;
    }

    // Store original for revert
    if (!state.originalPolydata) {
      state.originalPolydata = inputData;
    }

    // Apply options
    if (options.computePointNormals !== undefined) {
      state.computePointNormals = options.computePointNormals;
    }
    if (options.computeCellNormals !== undefined) {
      state.computeCellNormals = options.computeCellNormals;
    }

    // Create normals filter
    const normalsFilter = vtkPolyDataNormals.newInstance();
    normalsFilter.setInputData(inputData);
    normalsFilter.setComputePointNormals(state.computePointNormals);
    normalsFilter.setComputeCellNormals(state.computeCellNormals);

    // Get output with normals
    const outputData = normalsFilter.getOutputData();

    // Update mapper with data containing normals
    mapper.setInputData(outputData);

    // Store filter reference
    if (state.normalsFilter) {
      state.normalsFilter.delete();
    }
    state.normalsFilter = normalsFilter;
    state.enabled = true;

    renderWindow?.render();

    // Check if normals were added
    const pointNormals = outputData.getPointData().getNormals();
    const cellNormals = outputData.getCellData().getNormals();

    log.info(`Normals computed - Point normals: ${pointNormals ? 'yes' : 'no'}, Cell normals: ${cellNormals ? 'yes' : 'no'}`);

    return {
      hasPointNormals: !!pointNormals,
      hasCellNormals: !!cellNormals,
    };
  }

  /**
   * Revert to original data
   */
  revertNormals(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.originalPolydata) return;

    this._disableNormals(state);
    this._hideNormalGlyphs(state);

    const { sceneObjects } = state;
    if (sceneObjects.mapper && state.originalPolydata) {
      sceneObjects.mapper.setInputData(state.originalPolydata);
    }

    sceneObjects.renderWindow?.render();

    log.debug(`Reverted normals for instance: ${instanceId}`);
  }

  /**
   * Internal disable helper
   */
  _disableNormals(state) {
    if (state.normalsFilter) {
      state.normalsFilter.delete();
      state.normalsFilter = null;
    }
    state.enabled = false;
  }

  /**
   * Toggle normals computation
   */
  toggleNormals(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (state.enabled) {
      this.revertNormals(instanceId);
    } else {
      this.computeNormals(instanceId);
    }
  }

  // ===========================================================================
  // NORMAL VISUALIZATION
  // ===========================================================================

  /**
   * Show normal vectors as arrow glyphs
   */
  showNormalGlyphs(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || state.showNormalGlyphs) return;

    const { sceneObjects } = state;
    const { mapper, renderer, renderWindow } = sceneObjects;

    if (!mapper || !renderer) {
      log.warn('Cannot show normal glyphs: missing mapper or renderer');
      return;
    }

    const inputData = mapper.getInputData();
    if (!inputData) {
      log.warn('Cannot show normal glyphs: no input data');
      return;
    }

    // Check if normals exist
    const normals = inputData.getPointData().getNormals();
    if (!normals) {
      log.warn('No point normals available - computing them first');
      this.computeNormals(instanceId, { computePointNormals: true });
    }

    // Create arrow source for glyphs
    const arrowSource = vtkArrowSource.newInstance();

    // Create glyph mapper
    const glyphMapper = vtkGlyph3DMapper.newInstance();
    glyphMapper.setInputData(mapper.getInputData());
    glyphMapper.setSourceConnection(arrowSource.getOutputPort());
    glyphMapper.setOrientationArray('Normals');
    glyphMapper.setScaleFactor(state.glyphScale);

    // Create actor
    const glyphActor = vtkActor.newInstance();
    glyphActor.setMapper(glyphMapper);
    glyphActor.getProperty().setColor(...state.glyphColor);

    // Add to renderer
    renderer.addActor(glyphActor);

    // Store references
    state.arrowSource = arrowSource;
    state.glyphMapper = glyphMapper;
    state.glyphActor = glyphActor;
    state.showNormalGlyphs = true;

    renderWindow?.render();

    log.debug(`Normal glyphs shown for instance: ${instanceId}`);
  }

  /**
   * Hide normal glyphs
   */
  hideNormalGlyphs(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.showNormalGlyphs) return;

    this._hideNormalGlyphs(state);
    state.sceneObjects.renderWindow?.render();

    log.debug(`Normal glyphs hidden for instance: ${instanceId}`);
  }

  /**
   * Internal hide helper
   */
  _hideNormalGlyphs(state) {
    const { sceneObjects, glyphActor, glyphMapper, arrowSource } = state;
    const { renderer } = sceneObjects || {};

    if (glyphActor && renderer) {
      renderer.removeActor(glyphActor);
      glyphActor.delete();
    }

    if (glyphMapper) {
      glyphMapper.delete();
    }

    if (arrowSource) {
      arrowSource.delete();
    }

    state.glyphActor = null;
    state.glyphMapper = null;
    state.arrowSource = null;
    state.showNormalGlyphs = false;
  }

  /**
   * Toggle normal glyph visibility
   */
  toggleNormalGlyphs(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (state.showNormalGlyphs) {
      this.hideNormalGlyphs(instanceId);
    } else {
      this.showNormalGlyphs(instanceId);
    }
  }

  /**
   * Set glyph scale
   */
  setGlyphScale(instanceId, scale) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.glyphScale = Math.max(0.01, Math.min(1, scale));

    if (state.glyphMapper) {
      state.glyphMapper.setScaleFactor(state.glyphScale);
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
        id: 'normals-compute',
        type: 'toggle',
        icon: 'trending-up',
        label: state.enabled ? 'Normals On' : 'Compute Normals',
        description: 'Compute surface normals for better lighting',
        active: state.enabled,
        onClick: () => this.toggleNormals(instanceId),
      },
      {
        id: 'normals-visualize',
        type: 'toggle',
        icon: 'arrow-up',
        label: state.showNormalGlyphs ? 'Hide Normals' : 'Show Normals',
        description: 'Visualize normal vectors as arrows',
        active: state.showNormalGlyphs,
        onClick: () => this.toggleNormalGlyphs(instanceId),
      },
      ...(state.showNormalGlyphs ? [{
        id: 'normals-scale',
        type: 'menu',
        icon: 'maximize',
        label: `Scale: ${Math.round(state.glyphScale * 100)}%`,
        description: 'Normal arrow size',
        options: [
          { id: 'scale-5', label: '5%', onClick: () => this.setGlyphScale(instanceId, 0.05) },
          { id: 'scale-10', label: '10%', onClick: () => this.setGlyphScale(instanceId, 0.1) },
          { id: 'scale-20', label: '20%', onClick: () => this.setGlyphScale(instanceId, 0.2) },
          { id: 'scale-50', label: '50%', onClick: () => this.setGlyphScale(instanceId, 0.5) },
        ],
      }] : []),
    ];
  }
}

// Export singleton instance
export const vtkNormalsFeature = new VTKNormalsFeature();
export default vtkNormalsFeature;
