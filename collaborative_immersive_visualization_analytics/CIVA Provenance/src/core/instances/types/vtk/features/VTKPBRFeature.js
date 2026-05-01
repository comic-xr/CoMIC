// src/core/instances/types/vtk/features/VTKPBRFeature.js

/**
 * VTK PBR (Physically Based Rendering) Feature
 *
 * Enables realistic material rendering using PBR shading model.
 * Provides metallic/roughness workflow with environment mapping.
 *
 * Provides:
 * - Metallic/roughness controls
 * - Material presets (metal, plastic, ceramic, etc.)
 * - Environment lighting
 * - Normal/roughness map support
 *
 * @see https://kitware.github.io/vtk-js/examples/PBR.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Material presets with PBR parameters
 */
const MATERIAL_PRESETS = {
  default: {
    name: 'Default',
    metallic: 0.0,
    roughness: 0.4,
    baseColor: [0.8, 0.8, 0.8],
    ambient: 0.1,
  },
  polishedMetal: {
    name: 'Polished Metal',
    metallic: 1.0,
    roughness: 0.1,
    baseColor: [0.9, 0.9, 0.9],
    ambient: 0.05,
  },
  brushedMetal: {
    name: 'Brushed Metal',
    metallic: 1.0,
    roughness: 0.4,
    baseColor: [0.7, 0.7, 0.7],
    ambient: 0.1,
  },
  copper: {
    name: 'Copper',
    metallic: 1.0,
    roughness: 0.3,
    baseColor: [0.955, 0.637, 0.538],
    ambient: 0.05,
  },
  gold: {
    name: 'Gold',
    metallic: 1.0,
    roughness: 0.2,
    baseColor: [1.0, 0.843, 0.0],
    ambient: 0.05,
  },
  silver: {
    name: 'Silver',
    metallic: 1.0,
    roughness: 0.15,
    baseColor: [0.972, 0.960, 0.915],
    ambient: 0.05,
  },
  plastic: {
    name: 'Plastic',
    metallic: 0.0,
    roughness: 0.4,
    baseColor: [0.9, 0.1, 0.1],
    ambient: 0.15,
  },
  glossyPlastic: {
    name: 'Glossy Plastic',
    metallic: 0.0,
    roughness: 0.1,
    baseColor: [0.2, 0.5, 0.9],
    ambient: 0.1,
  },
  rubber: {
    name: 'Rubber',
    metallic: 0.0,
    roughness: 0.9,
    baseColor: [0.1, 0.1, 0.1],
    ambient: 0.2,
  },
  ceramic: {
    name: 'Ceramic',
    metallic: 0.0,
    roughness: 0.3,
    baseColor: [0.95, 0.95, 0.92],
    ambient: 0.15,
  },
  glass: {
    name: 'Glass',
    metallic: 0.0,
    roughness: 0.0,
    baseColor: [0.9, 0.95, 1.0],
    ambient: 0.05,
    opacity: 0.3,
  },
  marble: {
    name: 'Marble',
    metallic: 0.0,
    roughness: 0.2,
    baseColor: [0.95, 0.93, 0.88],
    ambient: 0.1,
  },
  wood: {
    name: 'Wood',
    metallic: 0.0,
    roughness: 0.6,
    baseColor: [0.55, 0.35, 0.2],
    ambient: 0.15,
  },
  skin: {
    name: 'Skin',
    metallic: 0.0,
    roughness: 0.5,
    baseColor: [0.95, 0.76, 0.65],
    ambient: 0.2,
  },
  bone: {
    name: 'Bone',
    metallic: 0.0,
    roughness: 0.4,
    baseColor: [0.9, 0.85, 0.75],
    ambient: 0.15,
  },
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  enabled: false,
  preset: 'default',
  metallic: 0.0,
  roughness: 0.4,
  baseColor: [0.8, 0.8, 0.8],
  ambient: 0.1,
  opacity: 1.0,
  // Original material backup
  originalMaterial: null,
};

// =============================================================================
// VTK PBR FEATURE
// =============================================================================

export class VTKPBRFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKPBRFeature',
      name: 'PBR Materials',
      description: 'Physically-based rendering materials',
      version: '1.0.0',
      author: 'CIA Team',
    };
  }

  /**
   * Check if this feature is available
   */
  isAvailable(instanceId, instanceData) {
    // Available for any mesh with an actor
    return instanceData?.sceneObjects?.actor != null;
  }

  /**
   * Initialize PBR feature
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects } = instanceData;

    if (!sceneObjects) {
      log.warn(`Cannot initialize PBR: no sceneObjects for ${instanceId}`);
      return;
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      // Original values backup
      originalMaterial: null,
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`PBR feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up PBR resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    // Restore original material if PBR was enabled
    if (state.enabled && state.originalMaterial) {
      this._restoreOriginalMaterial(state);
    }

    this.instanceStates.delete(instanceId);
    log.debug(`PBR feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      enabled: state.enabled,
      preset: state.preset,
      metallic: state.metallic,
      roughness: state.roughness,
      baseColor: state.baseColor,
      ambient: state.ambient,
      opacity: state.opacity,
    };
  }

  // ===========================================================================
  // PBR CONTROLS
  // ===========================================================================

  /**
   * Enable PBR rendering
   */
  enablePBR(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || state.enabled) return;

    const { sceneObjects } = state;
    const { actor, renderWindow } = sceneObjects;

    if (!actor) {
      log.warn('Cannot enable PBR: no actor');
      return;
    }

    const property = actor.getProperty();

    // Check if PBR is supported
    const supportsPBR = typeof property.setInterpolationToPBR === 'function';

    if (!supportsPBR) {
      log.warn('PBR rendering not supported in this VTK.js version, using enhanced Phong shading');
    }

    // Backup original material settings
    state.originalMaterial = {
      ambient: property.getAmbient(),
      diffuse: property.getDiffuse(),
      specular: property.getSpecular(),
      specularPower: property.getSpecularPower(),
      color: property.getColor(),
      opacity: property.getOpacity(),
    };

    // Enable PBR interpolation if supported
    if (supportsPBR) {
      property.setInterpolationToPBR();
      this._applyPBRSettings(state, property);
    } else {
      // Fallback to enhanced Phong-based material simulation
      this._applyPhongFallback(state, property);
    }

    state.enabled = true;
    state.supportsPBR = supportsPBR;
    renderWindow?.render();

    log.debug(`PBR enabled for instance: ${instanceId} (native: ${supportsPBR})`);
  }

  /**
   * Disable PBR rendering
   */
  disablePBR(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    this._restoreOriginalMaterial(state);
    state.sceneObjects.renderWindow?.render();

    log.debug(`PBR disabled for instance: ${instanceId}`);
  }

  /**
   * Restore original material
   */
  _restoreOriginalMaterial(state) {
    const { sceneObjects, originalMaterial } = state;
    const { actor } = sceneObjects;

    if (!actor || !originalMaterial) return;

    const property = actor.getProperty();

    // Restore standard interpolation
    property.setInterpolationToPhong();

    // Restore original values
    property.setAmbient(originalMaterial.ambient);
    property.setDiffuse(originalMaterial.diffuse);
    property.setSpecular(originalMaterial.specular);
    property.setSpecularPower(originalMaterial.specularPower);
    property.setColor(...originalMaterial.color);
    property.setOpacity(originalMaterial.opacity);

    state.enabled = false;
  }

  /**
   * Toggle PBR on/off
   */
  togglePBR(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (state.enabled) {
      this.disablePBR(instanceId);
    } else {
      this.enablePBR(instanceId);
    }
  }

  /**
   * Apply PBR settings to property (native PBR)
   */
  _applyPBRSettings(state, property) {
    const { metallic, roughness, baseColor, ambient, opacity } = state;

    property.setMetallic(metallic);
    property.setRoughness(roughness);
    property.setColor(...baseColor);
    property.setAmbient(ambient);
    property.setDiffuse(1.0);  // PBR uses baseColor
    property.setSpecular(0.0);  // PBR calculates this from metallic
    property.setOpacity(opacity);
  }

  /**
   * Apply Phong-based material simulation when PBR is not supported
   * Maps PBR parameters to Phong equivalents
   */
  _applyPhongFallback(state, property) {
    const { metallic, roughness, baseColor, ambient, opacity } = state;

    // Map metallic/roughness to Phong parameters
    // High metallic = high specular, low diffuse
    // Low roughness = high specular power (shiny)
    const specular = metallic * 0.8 + 0.2;
    const diffuse = 1.0 - metallic * 0.5;
    const specularPower = Math.max(1, (1 - roughness) * 100);

    property.setColor(...baseColor);
    property.setAmbient(ambient);
    property.setDiffuse(diffuse);
    property.setSpecular(specular);
    property.setSpecularPower(specularPower);
    property.setOpacity(opacity);
  }

  /**
   * Apply current settings based on whether native PBR is supported
   */
  _applyCurrentSettings(state, property) {
    if (state.supportsPBR) {
      this._applyPBRSettings(state, property);
    } else {
      this._applyPhongFallback(state, property);
    }
  }

  /**
   * Set material preset
   */
  setPreset(instanceId, presetName) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const preset = MATERIAL_PRESETS[presetName];
    if (!preset) {
      log.warn(`Unknown material preset: ${presetName}`);
      return;
    }

    state.preset = presetName;
    state.metallic = preset.metallic;
    state.roughness = preset.roughness;
    state.baseColor = [...preset.baseColor];
    state.ambient = preset.ambient;
    if (preset.opacity !== undefined) {
      state.opacity = preset.opacity;
    }

    if (state.enabled) {
      const property = state.sceneObjects.actor?.getProperty();
      if (property) {
        this._applyCurrentSettings(state, property);
        state.sceneObjects.renderWindow?.render();
      }
    }

    log.debug(`Material preset set to: ${presetName}`);
  }

  /**
   * Set metallic value
   */
  setMetallic(instanceId, value) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.metallic = Math.max(0, Math.min(1, value));
    state.preset = 'custom';

    if (state.enabled) {
      const property = state.sceneObjects.actor?.getProperty();
      if (property) {
        if (state.supportsPBR) {
          property.setMetallic(state.metallic);
        } else {
          this._applyPhongFallback(state, property);
        }
        state.sceneObjects.renderWindow?.render();
      }
    }
  }

  /**
   * Set roughness value
   */
  setRoughness(instanceId, value) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.roughness = Math.max(0, Math.min(1, value));
    state.preset = 'custom';

    if (state.enabled) {
      const property = state.sceneObjects.actor?.getProperty();
      if (property) {
        if (state.supportsPBR) {
          property.setRoughness(state.roughness);
        } else {
          this._applyPhongFallback(state, property);
        }
        state.sceneObjects.renderWindow?.render();
      }
    }
  }

  /**
   * Set base color
   */
  setBaseColor(instanceId, r, g, b) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.baseColor = [
      Math.max(0, Math.min(1, r)),
      Math.max(0, Math.min(1, g)),
      Math.max(0, Math.min(1, b)),
    ];
    state.preset = 'custom';

    if (state.enabled) {
      const property = state.sceneObjects.actor?.getProperty();
      if (property) {
        property.setColor(...state.baseColor);
        state.sceneObjects.renderWindow?.render();
      }
    }
  }

  /**
   * Set opacity
   */
  setOpacity(instanceId, value) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.opacity = Math.max(0, Math.min(1, value));

    if (state.enabled) {
      const property = state.sceneObjects.actor?.getProperty();
      if (property) {
        property.setOpacity(state.opacity);
        state.sceneObjects.renderWindow?.render();
      }
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
      // Main toggle
      {
        id: 'pbr-toggle',
        icon: state.enabled ? 'sun' : 'circle',
        label: state.enabled ? 'PBR On' : 'PBR Off',
        description: 'Toggle physically-based rendering',
        type: 'toggle',
        active: state.enabled,
        onClick: () => this.togglePBR(instanceId),
      },
    ];

    // Additional tools when enabled
    if (state.enabled) {
      tools.push(
        // Material presets
        {
          id: 'pbr-preset',
          icon: 'package',
          label: MATERIAL_PRESETS[state.preset]?.name || 'Custom',
          description: 'Material preset',
          type: 'menu',
          options: Object.entries(MATERIAL_PRESETS).map(([id, preset]) => ({
            id: `preset-${id}`,
            label: preset.name,
            active: state.preset === id,
            onClick: () => this.setPreset(instanceId, id),
          })),
        },
        // Metallic control
        {
          id: 'pbr-metallic',
          icon: 'disc',
          label: `Metal: ${Math.round(state.metallic * 100)}%`,
          description: 'Metallic factor',
          type: 'menu',
          options: [0, 0.25, 0.5, 0.75, 1].map(value => ({
            id: `metallic-${value * 100}`,
            label: `${Math.round(value * 100)}%`,
            active: Math.abs(state.metallic - value) < 0.1,
            onClick: () => this.setMetallic(instanceId, value),
          })),
        },
        // Roughness control
        {
          id: 'pbr-roughness',
          icon: 'droplet',
          label: `Rough: ${Math.round(state.roughness * 100)}%`,
          description: 'Surface roughness',
          type: 'menu',
          options: [0, 0.25, 0.5, 0.75, 1].map(value => ({
            id: `roughness-${value * 100}`,
            label: `${Math.round(value * 100)}%`,
            active: Math.abs(state.roughness - value) < 0.1,
            onClick: () => this.setRoughness(instanceId, value),
          })),
        },
        // Opacity
        {
          id: 'pbr-opacity',
          icon: 'eye',
          label: `Opacity: ${Math.round(state.opacity * 100)}%`,
          description: 'Material transparency',
          type: 'menu',
          options: [
            { id: 'opacity-100', label: '100%', active: state.opacity >= 0.95, onClick: () => this.setOpacity(instanceId, 1.0) },
            { id: 'opacity-75', label: '75%', active: state.opacity >= 0.7 && state.opacity < 0.95, onClick: () => this.setOpacity(instanceId, 0.75) },
            { id: 'opacity-50', label: '50%', active: state.opacity >= 0.45 && state.opacity < 0.7, onClick: () => this.setOpacity(instanceId, 0.5) },
            { id: 'opacity-25', label: '25%', active: state.opacity < 0.45, onClick: () => this.setOpacity(instanceId, 0.25) },
          ],
        }
      );
    }

    return tools;
  }
}

// Export singleton instance
export const vtkPBRFeature = new VTKPBRFeature();
export default vtkPBRFeature;
