// src/core/instances/types/vtk/features/VTKIsosurfaceFeature.js

/**
 * VTK Isosurface Extraction Feature
 *
 * Extracts surfaces from volumetric data at specified scalar values.
 * Uses Marching Cubes algorithm for real-time isosurface generation.
 *
 * Provides:
 * - Single or multiple isovalue extraction
 * - Interactive isovalue adjustment
 * - Surface coloring options
 * - Surface smoothing
 *
 * @see https://kitware.github.io/vtk-js/examples/Isosurface.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// VTK.js imports
import vtkImageMarchingCubes from "@kitware/vtk.js/Filters/General/ImageMarchingCubes";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Surface color presets
 */
const SURFACE_COLORS = {
  white: { name: 'White', rgb: [1.0, 1.0, 1.0] },
  bone: { name: 'Bone', rgb: [0.9, 0.85, 0.75] },
  skin: { name: 'Skin', rgb: [0.95, 0.8, 0.7] },
  red: { name: 'Red', rgb: [0.9, 0.2, 0.2] },
  green: { name: 'Green', rgb: [0.2, 0.9, 0.3] },
  blue: { name: 'Blue', rgb: [0.2, 0.4, 0.9] },
  gold: { name: 'Gold', rgb: [1.0, 0.84, 0.0] },
  silver: { name: 'Silver', rgb: [0.75, 0.75, 0.75] },
  copper: { name: 'Copper', rgb: [0.72, 0.45, 0.2] },
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  enabled: false,
  isovalue: 0.5,
  computeNormals: true,
  mergePoints: true,
  surfaceColor: 'bone',
  opacity: 1.0,
  // Lighting
  ambient: 0.1,
  diffuse: 0.7,
  specular: 0.3,
  specularPower: 20,
};

// =============================================================================
// VTK ISOSURFACE FEATURE
// =============================================================================

export class VTKIsosurfaceFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKIsosurfaceFeature',
      name: 'Isosurface Extraction',
      description: 'Extract surfaces from volumetric data at specified values',
      version: '1.0.0',
      author: 'CIA Team',
    };
  }

  /**
   * Check if this feature is available
   */
  isAvailable(instanceId, instanceData) {
    const datasetManager = window.CIA?.datasetManager;
    if (!datasetManager || !instanceData?.datasetId) return false;

    const dataset = datasetManager.getDataset(instanceData.datasetId);
    if (!dataset) return false;

    // Available for volumetric data
    const volumeTypes = ['vti', 'nrrd', 'mha', 'mhd'];
    return volumeTypes.includes(dataset.fileType?.toLowerCase());
  }

  /**
   * Initialize isosurface feature
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects } = instanceData;

    if (!sceneObjects) {
      log.warn(`Cannot initialize isosurface: no sceneObjects for ${instanceId}`);
      return;
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      // Isosurface objects
      marchingCubes: null,
      isoActor: null,
      isoMapper: null,
      // Data info
      imageData: null,
      scalarRange: [0, 1],
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Isosurface feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up isosurface resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disableIsosurface(state);

    this.instanceStates.delete(instanceId);
    log.debug(`Isosurface feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      enabled: state.enabled,
      isovalue: state.isovalue,
      scalarRange: state.scalarRange,
      surfaceColor: state.surfaceColor,
      opacity: state.opacity,
      computeNormals: state.computeNormals,
    };
  }

  // ===========================================================================
  // ISOSURFACE CONTROLS
  // ===========================================================================

  /**
   * Enable isosurface extraction with image data
   */
  async enableIsosurface(instanceId, imageData) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const { sceneObjects } = state;
    const { renderer, renderWindow } = sceneObjects;

    if (!renderer) {
      log.warn('Cannot enable isosurface: no renderer');
      return;
    }

    // Store image data and get scalar range
    state.imageData = imageData;

    const scalars = imageData.getPointData().getScalars();
    if (scalars) {
      const range = scalars.getRange();
      state.scalarRange = [range[0], range[1]];

      // Set default isovalue to middle of range
      if (state.isovalue === 0.5) {
        state.isovalue = (range[0] + range[1]) / 2;
      }
    }

    // Create Marching Cubes filter
    const marchingCubes = vtkImageMarchingCubes.newInstance({
      contourValue: state.isovalue,
      computeNormals: state.computeNormals,
      mergePoints: state.mergePoints,
    });
    marchingCubes.setInputData(imageData);

    // Create mapper
    const isoMapper = vtkMapper.newInstance();
    isoMapper.setInputConnection(marchingCubes.getOutputPort());

    // Create actor
    const isoActor = vtkActor.newInstance();
    isoActor.setMapper(isoMapper);

    // Apply surface color and properties
    this._applySurfaceProperties(state, isoActor);

    // Add to renderer
    renderer.addActor(isoActor);

    // Store references
    state.marchingCubes = marchingCubes;
    state.isoMapper = isoMapper;
    state.isoActor = isoActor;
    state.enabled = true;

    // Reset camera and render
    renderer.resetCamera();
    renderWindow?.render();

    log.debug(`Isosurface enabled at value: ${state.isovalue}`);
  }

  /**
   * Disable isosurface
   */
  disableIsosurface(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._disableIsosurface(state);
    state.sceneObjects.renderWindow?.render();

    log.debug(`Isosurface disabled for instance: ${instanceId}`);
  }

  /**
   * Internal disable
   */
  _disableIsosurface(state) {
    const { sceneObjects, isoActor, isoMapper, marchingCubes } = state;
    const { renderer } = sceneObjects || {};

    if (isoActor && renderer) {
      renderer.removeActor(isoActor);
      isoActor.delete();
    }

    if (isoMapper) {
      isoMapper.delete();
    }

    if (marchingCubes) {
      marchingCubes.delete();
    }

    state.isoActor = null;
    state.isoMapper = null;
    state.marchingCubes = null;
    state.enabled = false;
  }

  /**
   * Set isovalue
   */
  setIsovalue(instanceId, value) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    // Clamp to valid range
    const clamped = Math.max(state.scalarRange[0], Math.min(state.scalarRange[1], value));
    state.isovalue = clamped;

    if (state.marchingCubes) {
      state.marchingCubes.setContourValue(clamped);
      state.sceneObjects.renderWindow?.render();
    }

    log.debug(`Isovalue set to: ${clamped}`);
  }

  /**
   * Set surface color
   */
  setSurfaceColor(instanceId, colorName) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const colorPreset = SURFACE_COLORS[colorName];
    if (!colorPreset) {
      log.warn(`Unknown surface color: ${colorName}`);
      return;
    }

    state.surfaceColor = colorName;

    if (state.isoActor) {
      this._applySurfaceProperties(state, state.isoActor);
      state.sceneObjects.renderWindow?.render();
    }
  }

  /**
   * Set surface opacity
   */
  setOpacity(instanceId, opacity) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.opacity = Math.max(0, Math.min(1, opacity));

    if (state.isoActor) {
      state.isoActor.getProperty().setOpacity(state.opacity);
      state.sceneObjects.renderWindow?.render();
    }
  }

  /**
   * Apply surface properties to actor
   */
  _applySurfaceProperties(state, actor) {
    const { surfaceColor, opacity, ambient, diffuse, specular, specularPower } = state;
    const color = SURFACE_COLORS[surfaceColor]?.rgb || [1, 1, 1];

    const property = actor.getProperty();
    property.setColor(...color);
    property.setOpacity(opacity);
    property.setAmbient(ambient);
    property.setDiffuse(diffuse);
    property.setSpecular(specular);
    property.setSpecularPower(specularPower);
  }

  /**
   * Toggle compute normals (affects rendering quality)
   */
  toggleNormals(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.marchingCubes) return;

    state.computeNormals = !state.computeNormals;
    state.marchingCubes.setComputeNormals(state.computeNormals);
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
    if (!state || !state.enabled) return [];

    return [
      // Isovalue control (would be a slider in full implementation)
      {
        id: 'iso-value',
        icon: 'sliders',
        label: `Iso: ${state.isovalue.toFixed(1)}`,
        description: `Range: ${state.scalarRange[0].toFixed(1)} - ${state.scalarRange[1].toFixed(1)}`,
        type: 'menu',
        options: [
          // Quick value presets based on range
          ...[0.25, 0.5, 0.75].map(fraction => {
            const value = state.scalarRange[0] + fraction * (state.scalarRange[1] - state.scalarRange[0]);
            return {
              id: `iso-${Math.round(fraction * 100)}`,
              label: `${Math.round(fraction * 100)}% (${value.toFixed(1)})`,
              active: Math.abs(state.isovalue - value) < 0.01 * (state.scalarRange[1] - state.scalarRange[0]),
              onClick: () => this.setIsovalue(instanceId, value),
            };
          }),
        ],
      },
      // Surface color
      {
        id: 'iso-color',
        icon: 'palette',
        label: 'Surface Color',
        description: 'Change isosurface color',
        type: 'menu',
        options: Object.entries(SURFACE_COLORS).map(([id, preset]) => ({
          id: `color-${id}`,
          label: preset.name,
          active: state.surfaceColor === id,
          onClick: () => this.setSurfaceColor(instanceId, id),
        })),
      },
      // Opacity
      {
        id: 'iso-opacity',
        icon: 'eye',
        label: 'Opacity',
        description: 'Surface transparency',
        type: 'menu',
        options: [
          { id: 'opacity-100', label: '100%', active: state.opacity >= 0.95, onClick: () => this.setOpacity(instanceId, 1.0) },
          { id: 'opacity-75', label: '75%', active: state.opacity >= 0.7 && state.opacity < 0.95, onClick: () => this.setOpacity(instanceId, 0.75) },
          { id: 'opacity-50', label: '50%', active: state.opacity >= 0.45 && state.opacity < 0.7, onClick: () => this.setOpacity(instanceId, 0.5) },
          { id: 'opacity-25', label: '25%', active: state.opacity < 0.45, onClick: () => this.setOpacity(instanceId, 0.25) },
        ],
      },
      // Normals toggle
      {
        id: 'iso-normals',
        icon: state.computeNormals ? 'sun' : 'moon',
        label: state.computeNormals ? 'Smooth' : 'Flat',
        description: 'Toggle surface normals',
        type: 'toggle',
        active: state.computeNormals,
        onClick: () => this.toggleNormals(instanceId),
      },
    ];
  }
}

// Export singleton instance
export const vtkIsosurfaceFeature = new VTKIsosurfaceFeature();
export default vtkIsosurfaceFeature;
