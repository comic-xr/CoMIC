// src/core/instances/types/vtk/vtkInstanceTools.js
// REFACTORED: Thin coordination layer - No widget creation duplication!

import { instance as log } from "@Utils/logger.js";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkWidgetManager from "@kitware/vtk.js/Widgets/Core/WidgetManager";

// Import camera utilities for animated transitions
import {
  flyTo,
  getStandardViewState,
  captureCameraState,
  EASING_FUNCTIONS,
} from "@VTK/utils/cameraUtils.js";

// Import widget modules (already created!)
import { vtkPlaneWidget } from "@VTK/widgets/plane/VTKPlaneWidget.js";
import { vtkLineWidget } from "@VTK/widgets/line/VTKLineWidget.js";
import { vtkAngleWidget } from "@VTK/widgets/angle/VTKAngleWidget.js";
import { vtkOrientationWidget } from "@VTK/widgets/orientation/VTKOrientationWidget.js";

/**
 * InstanceToolsManager
 *
 * RESPONSIBILITIES:
 * - Basic rendering properties (opacity, representation, etc.)
 * - Widget coordination (thin wrappers that delegate to widget modules)
 * - State queries (convenience methods)
 *
 * NOT RESPONSIBLE FOR:
 * - VTK widget creation (that's in widget files!)
 * - Widget lifecycle details (that's in widget files!)
 */
class InstanceToolsManager {
  constructor() {
    this.instanceTools = new Map(); // instanceId -> tools
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize tools for an instance
   */
  initializeTools(instanceId, sceneObjects) {
    if (this.instanceTools.has(instanceId)) {
      log.warn(`Tools already initialized for instance: ${instanceId}`);
      return;
    }

    log.debug(`Initializing tools for instance: ${instanceId}`);

    const tools = {
      instanceId,
      sceneObjects,
      widgetManager: null,
      measurements: [],
      clipPosition: 50, // For slider
      colorMap: null,
      currentColormap: "viridis",
      opacityFunction: null,
    };

    // Create widget manager (shared by all widgets)
    tools.widgetManager = vtkWidgetManager.newInstance();
    tools.widgetManager.setRenderer(sceneObjects.renderer);

    this.instanceTools.set(instanceId, tools);
    log.debug(`Tools initialized for instance: ${instanceId}`);
  }

  // ==========================================================================
  // WIDGET STATE QUERIES
  // ==========================================================================

  /**
   * Check if a specific widget is active
   */
  isWidgetActive(instanceId, widgetType) {
    switch (widgetType) {
      case "orientation":
        return vtkOrientationWidget.isEnabled(instanceId);
      case "clipping":
      case "plane":
        return vtkPlaneWidget.isEnabled(instanceId);
      case "ruler":
      case "line":
        return vtkLineWidget.isEnabled(instanceId);
      case "angle":
        return vtkAngleWidget.isEnabled(instanceId);
      default:
        log.warn(`Unknown widget type: ${widgetType}`);
        return false;
    }
  }

  /**
   * Get current colormap ID
   */
  getCurrentColormap(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    return tools?.currentColormap || "viridis";
  }

  /**
   * Clean up tools for an instance
   */
  cleanupTools(instanceId) {
    log.debug(`Cleaning up tools for instance: ${instanceId}`);

    // Clean up all widgets first
    vtkPlaneWidget.cleanup(instanceId);
    vtkLineWidget.cleanup(instanceId);
    vtkAngleWidget.cleanup(instanceId);
    vtkOrientationWidget.cleanup(instanceId);

    // Clean up tools
    this.instanceTools.delete(instanceId);

    log.debug(`Tools cleaned up for instance: ${instanceId}`);
  }

  // ==========================================================================
  // BASIC RENDERING PROPERTIES (Not widgets - just VTK actor properties)
  // ==========================================================================

  // Add these methods to vtkInstanceTools.js (InstanceToolsManager class)
  // Place them in the "BASIC RENDERING PROPERTIES" section

  // ==========================================================================
  // CAMERA CONTROLS
  // ==========================================================================

  /**
   * Set camera to standard view
   * @param {string} instanceId - Instance identifier
   * @param {string} view - View name: 'front', 'back', 'top', 'bottom', 'left', 'right', 'isometric'
   */
  setCameraView(instanceId, view) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const { camera, renderer, renderWindow } = tools.sceneObjects;

    // Get bounds of the data for proper positioning
    const bounds = renderer.computeVisiblePropBounds();
    const center = [
      (bounds[0] + bounds[1]) / 2,
      (bounds[2] + bounds[3]) / 2,
      (bounds[4] + bounds[5]) / 2,
    ];

    // Calculate distance from center (for camera position)
    const diagonal = Math.sqrt(
      Math.pow(bounds[1] - bounds[0], 2) +
        Math.pow(bounds[3] - bounds[2], 2) +
        Math.pow(bounds[5] - bounds[4], 2)
    );
    const distance = diagonal * 1.5; // 1.5x diagonal for good view

    // Camera configurations for each standard view
    const views = {
      front: {
        position: [center[0], center[1], center[2] + distance],
        focalPoint: center,
        viewUp: [0, 1, 0],
      },
      back: {
        position: [center[0], center[1], center[2] - distance],
        focalPoint: center,
        viewUp: [0, 1, 0],
      },
      top: {
        position: [center[0], center[1] + distance, center[2]],
        focalPoint: center,
        viewUp: [0, 0, -1], // Z points down when looking from top
      },
      bottom: {
        position: [center[0], center[1] - distance, center[2]],
        focalPoint: center,
        viewUp: [0, 0, 1], // Z points up when looking from bottom
      },
      left: {
        position: [center[0] - distance, center[1], center[2]],
        focalPoint: center,
        viewUp: [0, 1, 0],
      },
      right: {
        position: [center[0] + distance, center[1], center[2]],
        focalPoint: center,
        viewUp: [0, 1, 0],
      },
      isometric: {
        position: [
          center[0] + distance * 0.7,
          center[1] + distance * 0.7,
          center[2] + distance * 0.7,
        ],
        focalPoint: center,
        viewUp: [0, 1, 0],
      },
    };

    const config = views[view];
    if (!config) {
      log.warn(`Unknown camera view: ${view}`);
      return;
    }

    // Apply camera configuration
    camera.setPosition(...config.position);
    camera.setFocalPoint(...config.focalPoint);
    camera.setViewUp(...config.viewUp);

    // Reset camera clipping range for new position
    renderer.resetCameraClippingRange();

    // Render
    renderWindow.render();

    log.trace(`Camera set to ${view} view for instance: ${instanceId}`);
  }

  /**
   * Reset camera to fit all data in view
   * @param {string} instanceId - Instance identifier
   */
  resetCamera(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const { renderer, renderWindow } = tools.sceneObjects;

    // Reset camera to show all actors
    renderer.resetCamera();

    // Render
    renderWindow.render();

    log.trace(`Camera reset for instance: ${instanceId}`);
  }

  /**
   * Get current camera state
   * @param {string} instanceId - Instance identifier
   * @returns {Object} Camera state with position, focalPoint, viewUp
   */
  getCameraState(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return null;

    const camera = tools.sceneObjects.camera;

    return {
      position: camera.getPosition(),
      focalPoint: camera.getFocalPoint(),
      viewUp: camera.getViewUp(),
      parallelScale: camera.getParallelScale(),
      clippingRange: camera.getClippingRange(),
      viewAngle: camera.getViewAngle(),
    };
  }

  /**
   * Set camera state (for sync or loading)
   * @param {string} instanceId - Instance identifier
   * @param {Object} cameraState - Camera configuration
   */
  setCameraState(instanceId, cameraState) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const { camera, renderer, renderWindow } = tools.sceneObjects;

    // Apply camera state
    if (cameraState.position) {
      camera.setPosition(...cameraState.position);
    }
    if (cameraState.focalPoint) {
      camera.setFocalPoint(...cameraState.focalPoint);
    }
    if (cameraState.viewUp) {
      camera.setViewUp(...cameraState.viewUp);
    }
    if (cameraState.parallelScale !== undefined) {
      camera.setParallelScale(cameraState.parallelScale);
    }
    if (cameraState.clippingRange) {
      camera.setClippingRange(...cameraState.clippingRange);
    }
    if (cameraState.viewAngle !== undefined) {
      camera.setViewAngle(cameraState.viewAngle);
    }

    // Reset clipping range for new position
    renderer.resetCameraClippingRange();

    // Render
    renderWindow.render();

    log.trace(`Camera state applied for instance: ${instanceId}`);
  }

  // ==========================================================================
  // ANIMATED CAMERA TRANSITIONS
  // ==========================================================================

  /**
   * Animate camera to a standard view with easing
   * @param {string} instanceId - Instance identifier
   * @param {string} view - View name: 'front', 'back', 'top', 'bottom', 'left', 'right', 'isometric'
   * @param {Object} options - Animation options
   * @param {number} options.duration - Animation duration in ms (default: 500)
   * @param {string} options.easing - Easing function name (default: 'easeInOut')
   * @param {Function} options.onComplete - Called when animation completes
   * @returns {Function} Cancel function to stop the animation
   */
  flyToView(instanceId, view, options = {}) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return () => {};

    const { renderer, renderWindow } = tools.sceneObjects;

    // Get target state for the view
    const targetState = getStandardViewState(renderer, view);
    if (!targetState) {
      log.warn(`Unknown camera view: ${view}`);
      return () => {};
    }

    log.debug(`Flying to ${view} view for instance: ${instanceId}`);

    return flyTo(renderer, renderWindow, targetState, {
      duration: options.duration ?? 500,
      easing: options.easing ?? "easeInOut",
      onProgress: options.onProgress,
      onComplete: () => {
        log.trace(`Camera animation to ${view} complete for: ${instanceId}`);
        options.onComplete?.();
      },
    });
  }

  /**
   * Animate camera to a specific camera state with easing
   * @param {string} instanceId - Instance identifier
   * @param {Object} targetState - Target camera state
   * @param {Object} options - Animation options
   * @returns {Function} Cancel function to stop the animation
   */
  flyToState(instanceId, targetState, options = {}) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return () => {};

    const { renderer, renderWindow } = tools.sceneObjects;

    log.debug(`Flying to custom camera state for instance: ${instanceId}`);

    return flyTo(renderer, renderWindow, targetState, {
      duration: options.duration ?? 500,
      easing: options.easing ?? "easeInOut",
      onProgress: options.onProgress,
      onComplete: () => {
        log.trace(`Camera animation complete for: ${instanceId}`);
        options.onComplete?.();
      },
    });
  }

  /**
   * Set the current camera position as the reset point
   * @param {string} instanceId - Instance identifier
   * @returns {Object|null} The captured camera state, or null on failure
   */
  setResetPoint(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return null;

    const { renderer } = tools.sceneObjects;
    const cameraState = captureCameraState(renderer);

    if (cameraState) {
      tools.customResetPoint = cameraState;
      log.debug(`Reset point set for instance: ${instanceId}`);

      // Emit event for UI sync
      window.dispatchEvent(
        new CustomEvent("cia:reset-point-changed", {
          detail: { instanceId, cameraState },
        })
      );
    }

    return cameraState;
  }

  /**
   * Get the custom reset point if set
   * @param {string} instanceId - Instance identifier
   * @returns {Object|null} The custom reset point camera state, or null if not set
   */
  getResetPoint(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    return tools?.customResetPoint || null;
  }

  /**
   * Check if a custom reset point is set
   * @param {string} instanceId - Instance identifier
   * @returns {boolean} True if a custom reset point is set
   */
  hasCustomResetPoint(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    return !!tools?.customResetPoint;
  }

  /**
   * Clear the custom reset point
   * @param {string} instanceId - Instance identifier
   */
  clearResetPoint(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (tools) {
      tools.customResetPoint = null;
      log.debug(`Reset point cleared for instance: ${instanceId}`);

      // Emit event for UI sync
      window.dispatchEvent(
        new CustomEvent("cia:reset-point-changed", {
          detail: { instanceId, cameraState: null },
        })
      );
    }
  }

  // ==========================================================================
  // ANIMATION PRESETS
  // ==========================================================================

  /**
   * Start an orbit animation around the current focal point
   * @param {string} instanceId - Instance identifier
   * @param {Object} options - Animation options
   * @param {number} options.duration - Full orbit duration in ms (default: 8000)
   * @param {boolean} options.clockwise - Orbit direction (default: true)
   * @returns {Function} Stop function
   */
  startOrbitAnimation(instanceId, options = {}) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return () => {};

    const { camera, renderer, renderWindow } = tools.sceneObjects;
    const duration = options.duration ?? 8000;
    const clockwise = options.clockwise ?? true;

    // Capture initial state
    const initialPosition = camera.getPosition();
    const focalPoint = camera.getFocalPoint();

    // Calculate orbit radius and initial angle
    const dx = initialPosition[0] - focalPoint[0];
    const dz = initialPosition[2] - focalPoint[2];
    const radius = Math.sqrt(dx * dx + dz * dz);
    const initialAngle = Math.atan2(dz, dx);
    const y = initialPosition[1];

    let startTime = null;
    let animationId = null;
    let stopped = false;

    const animate = (timestamp) => {
      if (stopped) return;

      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % duration) / duration;
      const angle = initialAngle + (clockwise ? -1 : 1) * progress * Math.PI * 2;

      // Calculate new position
      const newX = focalPoint[0] + radius * Math.cos(angle);
      const newZ = focalPoint[2] + radius * Math.sin(angle);

      camera.setPosition(newX, y, newZ);
      renderer.resetCameraClippingRange();
      renderWindow.render();

      animationId = requestAnimationFrame(animate);
    };

    tools.activeAnimation = "orbit";
    animationId = requestAnimationFrame(animate);

    return () => {
      stopped = true;
      tools.activeAnimation = null;
      if (animationId) cancelAnimationFrame(animationId);
    };
  }

  /**
   * Start a rock animation (oscillating left/right)
   * @param {string} instanceId - Instance identifier
   * @param {Object} options - Animation options
   * @param {number} options.duration - Full cycle duration in ms (default: 4000)
   * @param {number} options.amplitude - Rotation amplitude in degrees (default: 30)
   * @returns {Function} Stop function
   */
  startRockAnimation(instanceId, options = {}) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return () => {};

    const { camera, renderer, renderWindow } = tools.sceneObjects;
    const duration = options.duration ?? 4000;
    const amplitude = ((options.amplitude ?? 30) * Math.PI) / 180; // Convert to radians

    // Capture initial state
    const initialPosition = camera.getPosition();
    const focalPoint = camera.getFocalPoint();

    // Calculate orbit parameters
    const dx = initialPosition[0] - focalPoint[0];
    const dz = initialPosition[2] - focalPoint[2];
    const radius = Math.sqrt(dx * dx + dz * dz);
    const centerAngle = Math.atan2(dz, dx);
    const y = initialPosition[1];

    let startTime = null;
    let animationId = null;
    let stopped = false;

    const animate = (timestamp) => {
      if (stopped) return;

      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % duration) / duration;
      const angle = centerAngle + amplitude * Math.sin(progress * Math.PI * 2);

      const newX = focalPoint[0] + radius * Math.cos(angle);
      const newZ = focalPoint[2] + radius * Math.sin(angle);

      camera.setPosition(newX, y, newZ);
      renderer.resetCameraClippingRange();
      renderWindow.render();

      animationId = requestAnimationFrame(animate);
    };

    tools.activeAnimation = "rock";
    animationId = requestAnimationFrame(animate);

    return () => {
      stopped = true;
      tools.activeAnimation = null;
      if (animationId) cancelAnimationFrame(animationId);
    };
  }

  /**
   * Start a tumble animation (gentle random-like rotation)
   * @param {string} instanceId - Instance identifier
   * @param {Object} options - Animation options
   * @param {number} options.duration - Animation cycle in ms (default: 10000)
   * @returns {Function} Stop function
   */
  startTumbleAnimation(instanceId, options = {}) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return () => {};

    const { camera, renderer, renderWindow } = tools.sceneObjects;
    const duration = options.duration ?? 10000;

    const initialPosition = camera.getPosition();
    const focalPoint = camera.getFocalPoint();

    // Calculate orbit parameters
    const dx = initialPosition[0] - focalPoint[0];
    const dy = initialPosition[1] - focalPoint[1];
    const dz = initialPosition[2] - focalPoint[2];
    const radius = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Initial angles (spherical coordinates)
    const initialTheta = Math.atan2(Math.sqrt(dx * dx + dz * dz), dy);
    const initialPhi = Math.atan2(dz, dx);

    let startTime = null;
    let animationId = null;
    let stopped = false;

    const animate = (timestamp) => {
      if (stopped) return;

      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % duration) / duration;

      // Lissajous-like pattern for tumble effect
      const theta = initialTheta + Math.sin(progress * Math.PI * 2) * 0.3;
      const phi = initialPhi + progress * Math.PI * 2 * 0.7;

      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const newX = focalPoint[0] + radius * sinTheta * cosPhi;
      const newY = focalPoint[1] + radius * cosTheta;
      const newZ = focalPoint[2] + radius * sinTheta * sinPhi;

      camera.setPosition(newX, newY, newZ);
      renderer.resetCameraClippingRange();
      renderWindow.render();

      animationId = requestAnimationFrame(animate);
    };

    tools.activeAnimation = "tumble";
    animationId = requestAnimationFrame(animate);

    return () => {
      stopped = true;
      tools.activeAnimation = null;
      if (animationId) cancelAnimationFrame(animationId);
    };
  }

  /**
   * Get the currently active animation type
   * @param {string} instanceId - Instance identifier
   * @returns {string|null} Active animation type or null
   */
  getActiveAnimation(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    return tools?.activeAnimation || null;
  }

  // ==========================================================================
  // TRANSFORM CONTROLS
  // ==========================================================================

  /**
   * Set actor position
   * @param {string} instanceId - Instance identifier
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   */
  setPosition(instanceId, x, y, z) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools?.sceneObjects?.actor) return;

    tools.sceneObjects.actor.setPosition(x, y, z);
    tools.sceneObjects.renderWindow.render();

    // Emit transform change event
    this._emitTransformChange(instanceId);

    log.trace(`Position set to (${x}, ${y}, ${z}) for instance: ${instanceId}`);
  }

  /**
   * Get current actor position
   * @param {string} instanceId - Instance identifier
   * @returns {Array} [x, y, z] position
   */
  getPosition(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools?.sceneObjects?.actor) return [0, 0, 0];

    return tools.sceneObjects.actor.getPosition();
  }

  /**
   * Set actor rotation (orientation in degrees)
   * @param {string} instanceId - Instance identifier
   * @param {number} x - X rotation in degrees
   * @param {number} y - Y rotation in degrees
   * @param {number} z - Z rotation in degrees
   */
  setRotation(instanceId, x, y, z) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools?.sceneObjects?.actor) return;

    tools.sceneObjects.actor.setOrientation(x, y, z);
    tools.sceneObjects.renderWindow.render();

    // Emit transform change event
    this._emitTransformChange(instanceId);

    log.trace(`Rotation set to (${x}°, ${y}°, ${z}°) for instance: ${instanceId}`);
  }

  /**
   * Get current actor rotation (orientation in degrees)
   * @param {string} instanceId - Instance identifier
   * @returns {Array} [x, y, z] rotation in degrees
   */
  getRotation(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools?.sceneObjects?.actor) return [0, 0, 0];

    return tools.sceneObjects.actor.getOrientation();
  }

  /**
   * Set actor scale
   * @param {string} instanceId - Instance identifier
   * @param {number} x - X scale (1.0 = 100%)
   * @param {number} y - Y scale (1.0 = 100%)
   * @param {number} z - Z scale (1.0 = 100%)
   */
  setScale(instanceId, x, y, z) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools?.sceneObjects?.actor) return;

    tools.sceneObjects.actor.setScale(x, y, z);
    tools.sceneObjects.renderWindow.render();

    // Emit transform change event
    this._emitTransformChange(instanceId);

    log.trace(`Scale set to (${x}, ${y}, ${z}) for instance: ${instanceId}`);
  }

  /**
   * Get current actor scale
   * @param {string} instanceId - Instance identifier
   * @returns {Array} [x, y, z] scale
   */
  getScale(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools?.sceneObjects?.actor) return [1, 1, 1];

    return tools.sceneObjects.actor.getScale();
  }

  /**
   * Reset actor transform to default (origin, no rotation, 100% scale)
   * @param {string} instanceId - Instance identifier
   */
  resetTransform(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools?.sceneObjects?.actor) return;

    const actor = tools.sceneObjects.actor;
    actor.setPosition(0, 0, 0);
    actor.setOrientation(0, 0, 0);
    actor.setScale(1, 1, 1);
    tools.sceneObjects.renderWindow.render();

    // Emit transform change event
    this._emitTransformChange(instanceId);

    log.trace(`Transform reset for instance: ${instanceId}`);
  }

  /**
   * Get full transform state for an instance
   * @param {string} instanceId - Instance identifier
   * @returns {Object} Transform state {position, rotation, scale}
   */
  getTransformState(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools?.sceneObjects?.actor) {
      return {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };
    }

    const actor = tools.sceneObjects.actor;
    return {
      position: actor.getPosition(),
      rotation: actor.getOrientation(),
      scale: actor.getScale(),
    };
  }

  /**
   * Emit transform change event for UI sync
   * @private
   */
  _emitTransformChange(instanceId) {
    const state = this.getTransformState(instanceId);
    window.dispatchEvent(new CustomEvent('cia:transform-changed', {
      detail: {
        instanceId,
        ...state,
      },
    }));
  }

  // ==========================================================================
  // SLICE CONTROLS
  // ==========================================================================

  /**
   * Set slice orientation
   * @param {string} instanceId - Instance identifier
   * @param {string} orientation - 'axial', 'sagittal', or 'coronal'
   */
  setSliceOrientation(instanceId, orientation) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    // Store orientation for reference
    tools.sliceOrientation = orientation;

    // Get data bounds for slice calculation
    const { renderer, renderWindow } = tools.sceneObjects;
    const bounds = renderer.computeVisiblePropBounds();

    // Calculate slice normal and origin based on orientation
    const center = [
      (bounds[0] + bounds[1]) / 2,
      (bounds[2] + bounds[3]) / 2,
      (bounds[4] + bounds[5]) / 2,
    ];

    let normal;
    let extent;

    switch (orientation) {
      case 'axial':
        normal = [0, 0, 1];
        extent = bounds[5] - bounds[4]; // Z extent
        break;
      case 'sagittal':
        normal = [1, 0, 0];
        extent = bounds[1] - bounds[0]; // X extent
        break;
      case 'coronal':
        normal = [0, 1, 0];
        extent = bounds[3] - bounds[2]; // Y extent
        break;
      default:
        log.warn(`Unknown slice orientation: ${orientation}`);
        return;
    }

    // Store extent for slice position calculations
    tools.sliceExtent = extent;
    tools.sliceNormal = normal;
    tools.sliceCenter = center;

    renderWindow.render();
    log.trace(`Slice orientation set to ${orientation} for instance: ${instanceId}`);
  }

  /**
   * Get slice orientation
   * @param {string} instanceId - Instance identifier
   * @returns {string} Current orientation
   */
  getSliceOrientation(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    return tools?.sliceOrientation || 'axial';
  }

  /**
   * Set slice position as percentage (0-100)
   * @param {string} instanceId - Instance identifier
   * @param {number} position - Slice position (0-100 percentage through volume)
   */
  setSlicePosition(instanceId, position) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools?.sceneObjects?.mapper) return;

    tools.slicePosition = position;

    // If we have clipping planes set up, update them
    const { mapper, renderWindow } = tools.sceneObjects;

    // Use implicit function clipping for slice visualization
    // This creates a cross-section effect
    if (tools.sliceNormal && tools.sliceExtent && tools.sliceCenter) {
      const { sliceNormal, sliceExtent, sliceCenter } = tools;

      // Calculate actual position along the slice axis
      const offset = (position / 100 - 0.5) * sliceExtent;

      // Remove existing clipping planes
      mapper.removeAllClippingPlanes();

      // For a thin slice, we'd need two planes
      // For now, just store the position
      tools.calculatedSliceOffset = offset;
    }

    renderWindow.render();
    log.trace(`Slice position set to ${position}% for instance: ${instanceId}`);
  }

  /**
   * Get slice position
   * @param {string} instanceId - Instance identifier
   * @returns {number} Current slice position (0-100)
   */
  getSlicePosition(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    return tools?.slicePosition || 50;
  }

  /**
   * Get data dimensions for slice max calculation
   * @param {string} instanceId - Instance identifier
   * @returns {Object} Dimensions {x, y, z}
   */
  getDataDimensions(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools?.sceneObjects?.renderer) return { x: 256, y: 256, z: 256 };

    const bounds = tools.sceneObjects.renderer.computeVisiblePropBounds();
    return {
      x: Math.round(bounds[1] - bounds[0]),
      y: Math.round(bounds[3] - bounds[2]),
      z: Math.round(bounds[5] - bounds[4]),
    };
  }

  // ==========================================================================
  // WINDOW/LEVEL CONTROLS (for medical imaging)
  // ==========================================================================

  /**
   * Set window/level values for display range mapping
   * Window = contrast (range width), Level = brightness (center value)
   * @param {string} instanceId - Instance identifier
   * @param {number} windowWidth - Window width (contrast)
   * @param {number} windowLevel - Window level/center (brightness)
   */
  setWindowLevel(instanceId, windowWidth, windowLevel) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools?.sceneObjects?.actor) return;

    // Store values
    tools.windowValue = windowWidth;
    tools.levelValue = windowLevel;

    // Calculate the display range from window/level
    const lower = windowLevel - windowWidth / 2;
    const upper = windowLevel + windowWidth / 2;

    // Update the lookup table / color transfer function
    const mapper = tools.sceneObjects.actor.getMapper();
    if (mapper) {
      // For scalar mapping, set the scalar range
      mapper.setScalarRange(lower, upper);

      // If there's a color transfer function, update it
      if (tools.colorMap) {
        // Rebuild color map with new range
        this.rebuildColorMapForRange(instanceId, lower, upper);
      }
    }

    tools.sceneObjects.renderWindow.render();
    log.trace(`Window/Level set to ${windowWidth}/${windowLevel} for instance: ${instanceId}`);
  }

  /**
   * Rebuild color map for a new data range
   * @private
   */
  rebuildColorMapForRange(instanceId, lower, upper) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools?.colorMap) return;

    const ctf = tools.colorMap;
    const currentPreset = tools.currentColormap || 'grayscale';

    // Define presets
    const presets = {
      rainbow: [
        [0.0, 0, 0, 1],
        [0.33, 0, 1, 1],
        [0.66, 1, 1, 0],
        [1.0, 1, 0, 0],
      ],
      grayscale: [
        [0.0, 0, 0, 0],
        [1.0, 1, 1, 1],
      ],
      hot: [
        [0.0, 0, 0, 0],
        [0.33, 1, 0, 0],
        [0.66, 1, 1, 0],
        [1.0, 1, 1, 1],
      ],
      cool: [
        [0.0, 0, 0, 1],
        [0.5, 0, 1, 1],
        [1.0, 0, 1, 0],
      ],
    };

    const colors = presets[currentPreset] || presets.grayscale;

    // Clear and rebuild
    ctf.removeAllPoints();
    colors.forEach(([pos, r, g, b]) => {
      const value = lower + pos * (upper - lower);
      ctf.addRGBPoint(value, r, g, b);
    });
  }

  /**
   * Get current window/level values
   * @param {string} instanceId - Instance identifier
   * @returns {Object} {window, level}
   */
  getWindowLevel(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    return {
      window: tools?.windowValue || 400,
      level: tools?.levelValue || 40,
    };
  }

  /**
   * Apply a window/level preset
   * @param {string} instanceId - Instance identifier
   * @param {string} presetId - Preset identifier
   * @param {number} windowWidth - Window width
   * @param {number} windowLevel - Window level
   */
  applyWindowLevelPreset(instanceId, presetId, windowWidth, windowLevel) {
    const tools = this.instanceTools.get(instanceId);
    if (tools) {
      tools.windowLevelPreset = presetId;
    }
    this.setWindowLevel(instanceId, windowWidth, windowLevel);
    log.trace(`Window/Level preset '${presetId}' applied for instance: ${instanceId}`);
  }

  // ==========================================================================
  // OPACITY & REPRESENTATION
  // ==========================================================================

  /**
   * Set opacity (0.0 = transparent, 1.0 = opaque)
   */
  setOpacity(instanceId, opacity) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    tools.sceneObjects.actor.getProperty().setOpacity(opacity);
    tools.sceneObjects.renderWindow.render();

    log.trace(`Opacity set to ${opacity} for instance: ${instanceId}`);
  }

  /**
   * Get current opacity
   */
  getOpacity(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return 1.0;

    return tools.sceneObjects.actor.getProperty().getOpacity();
  }

  /**
   * Set representation mode (surface, wireframe, or points)
   */
  setRepresentation(instanceId, mode) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const modeMap = {
      surface: 2,
      wireframe: 1,
      points: 0,
    };

    const representation = modeMap[mode];
    if (representation === undefined) {
      log.warn(`Unknown representation mode: ${mode}`);
      return;
    }

    const property = tools.sceneObjects.actor.getProperty();
    property.setRepresentation(representation);

    // Preserve user's point/line size settings - don't auto-reset

    tools.sceneObjects.renderWindow.render();

    log.trace(`Representation set to ${mode} for instance: ${instanceId}`);
  }

  /**
   * Get current representation mode
   */
  getRepresentation(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return "surface";

    const rep = tools.sceneObjects.actor.getProperty().getRepresentation();
    const modeMap = { 0: "points", 1: "wireframe", 2: "surface" };

    return modeMap[rep] || "surface";
  }

  /**
   * Set point size
   */
  setPointSize(instanceId, size) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    tools.sceneObjects.actor.getProperty().setPointSize(size);
    tools.sceneObjects.renderWindow.render();

    log.trace(`Point size set to ${size} for instance: ${instanceId}`);
  }

  /**
   * Get current point size
   */
  getPointSize(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return 5;

    return tools.sceneObjects.actor.getProperty().getPointSize();
  }

  /**
   * Set line width (for wireframe representation)
   */
  setLineWidth(instanceId, width) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools?.sceneObjects?.actor) return;

    tools.sceneObjects.actor.getProperty().setLineWidth(width);
    tools.sceneObjects.renderWindow.render();

    log.trace(`Line width set to ${width}px for instance: ${instanceId}`);
  }

  /**
   * Get current line width
   */
  getLineWidth(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return 2;

    return tools.sceneObjects.actor.getProperty().getLineWidth();
  }

  /**
   * Set color map
   */
  setColorMap(instanceId, preset) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const { actor, renderWindow } = tools.sceneObjects;
    const ctf = vtkColorTransferFunction.newInstance();

    // Define presets
    const presets = {
      rainbow: [
        [0.0, 0, 0, 1],
        [0.33, 0, 1, 1],
        [0.66, 1, 1, 0],
        [1.0, 1, 0, 0],
      ],
      grayscale: [
        [0.0, 0, 0, 0],
        [1.0, 1, 1, 1],
      ],
      hot: [
        [0.0, 0, 0, 0],
        [0.33, 1, 0, 0],
        [0.66, 1, 1, 0],
        [1.0, 1, 1, 1],
      ],
      cool: [
        [0.0, 0, 0, 1],
        [0.5, 0, 1, 1],
        [1.0, 0, 1, 0],
      ],
    };

    const colors = presets[preset] || presets.rainbow;

    // Get data range
    const mapper = actor.getMapper();
    const dataRange = mapper
      .getInputData()
      .getPointData()
      .getScalars()
      .getRange();

    // Apply color map
    colors.forEach(([pos, r, g, b]) => {
      const value = dataRange[0] + pos * (dataRange[1] - dataRange[0]);
      ctf.addRGBPoint(value, r, g, b);
    });

    mapper.setLookupTable(ctf);
    tools.colorMap = ctf;
    tools.currentColormap = preset;

    renderWindow.render();
    log.trace(`Color map set to ${preset} for instance: ${instanceId}`);
  }

  /**
   * Force a render
   */
  forceRender(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (tools?.sceneObjects?.renderWindow) {
      tools.sceneObjects.renderWindow.render();
    }
  }

  // ==========================================================================
  // WIDGET COORDINATION (Thin wrappers that delegate to widget modules)
  // ==========================================================================

  /**
   * Toggle clipping plane widget
   * THIN WRAPPER - Delegates to VTKPlaneWidget module
   */
  toggleClippingPlane(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const isActive = vtkPlaneWidget.isEnabled(instanceId);

    if (isActive) {
      // Disable
      vtkPlaneWidget.cleanup(instanceId);
      log.debug(`Clipping plane disabled for instance: ${instanceId}`);
    } else {
      // Enable
      vtkPlaneWidget.initialize(instanceId, {
        widgetManager: tools.widgetManager,
        sceneObjects: tools.sceneObjects,
        placeFactor: 1.25,
      });
      log.debug(`Clipping plane enabled for instance: ${instanceId}`);
    }
  }

  /**
   * Toggle ruler measurement widget
   * THIN WRAPPER - Delegates to VTKLineWidget module
   */
  toggleRulerMeasurement(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const isActive = vtkLineWidget.isEnabled(instanceId);

    if (isActive) {
      // Disable
      vtkLineWidget.cleanup(instanceId);
      log.debug(`Ruler measurement disabled for instance: ${instanceId}`);
    } else {
      // Enable
      vtkLineWidget.initialize(instanceId, {
        widgetManager: tools.widgetManager,
        sceneObjects: tools.sceneObjects,
        onMeasurement: (measurement) => {
          tools.measurements.push(measurement);
          log.debug(`Distance measured: ${measurement.value.toFixed(2)}`);
        },
      });
      log.debug(`Ruler measurement enabled for instance: ${instanceId}`);
    }
  }

  /**
   * Toggle angle measurement widget
   * THIN WRAPPER - Delegates to VTKAngleWidget module
   */
  toggleAngleMeasurement(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const isActive = vtkAngleWidget.isEnabled(instanceId);

    if (isActive) {
      // Disable
      vtkAngleWidget.cleanup(instanceId);
      log.debug(`Angle measurement disabled for instance: ${instanceId}`);
    } else {
      // Enable
      vtkAngleWidget.initialize(instanceId, {
        widgetManager: tools.widgetManager,
        sceneObjects: tools.sceneObjects,
      });
      log.debug(`Angle measurement enabled for instance: ${instanceId}`);
    }
  }

  /**
   * Toggle orientation widget
   * THIN WRAPPER - Delegates to VTKOrientationWidget module
   */
  toggleOrientation(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const isActive = vtkOrientationWidget.isEnabled(instanceId);
    vtkOrientationWidget.setVisible(instanceId, !isActive);

    // ✅ CRITICAL: Force render to update display immediately
    tools.sceneObjects.renderWindow.render();

    log.debug(
      `Orientation ${
        !isActive ? "enabled" : "disabled"
      } for instance: ${instanceId}`
    );
  }

  /**
   * Initialize orientation widget tracking
   * Called by VTKInstanceHandler after orientation widget is created
   */
  initializeOrientationWidget(instanceId) {
    // Just for tracking - actual widget managed by vtkOrientationWidget module
    log.trace(`Orientation widget tracked for instance: ${instanceId}`);
  }

  /**
   * Set orientation widget style (cube, axes)
   * THIN WRAPPER - Delegates to VTKOrientationWidget module
   */
  setOrientationStyle(instanceId, style) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    vtkOrientationWidget.setStyle(instanceId, style);
    tools.sceneObjects.renderWindow.render();

    log.debug(`Orientation style set to '${style}' for instance: ${instanceId}`);
  }

  /**
   * Update orientation widget configuration (corner, size, etc.)
   * THIN WRAPPER - Delegates to VTKOrientationWidget module
   */
  updateOrientationConfig(instanceId, config) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    vtkOrientationWidget.updateConfig(instanceId, config);
    tools.sceneObjects.renderWindow.render();

    log.debug(`Orientation config updated for instance: ${instanceId}`);
  }

  /**
   * Get full orientation widget configuration
   */
  getOrientationConfig(instanceId) {
    return vtkOrientationWidget.getConfig(instanceId);
  }

  // ==========================================================================
  // CLIPPING STATE HELPERS (For slider support)
  // ==========================================================================

  /**
   * Get clipping state for UI
   */
  getClipState(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return { active: false, position: 50 };

    const isActive = vtkPlaneWidget.isEnabled(instanceId);

    return {
      active: isActive,
      position: tools.clipPosition || 50,
    };
  }

  /**
   * Set clipping plane position (0-100%)
   * Note: This just stores the position value.
   * The clipping plane position is controlled by user dragging the widget.
   */
  setClipPosition(instanceId, percentage) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    // Store position for UI display
    tools.clipPosition = percentage;

    // Note: VTKPlaneWidget doesn't have a programmatic setPosition method.
    // The plane position is controlled by the user dragging the widget handles.
    // This slider just tracks the approximate position for display purposes.

    log.trace(
      `Clip position tracked at ${percentage}% for instance: ${instanceId}`
    );
  }

  /**
   * Reset clipping
   */
  resetClipping(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    // Clean up widget
    vtkPlaneWidget.cleanup(instanceId);

    // Reset position
    tools.clipPosition = 50;

    // Remove any clipping from mapper
    tools.sceneObjects.mapper.removeAllClippingPlanes();
    tools.sceneObjects.renderWindow.render();

    log.debug(`Clipping reset for instance: ${instanceId}`);
  }

  // ==========================================================================
  // STATE QUERIES (Convenience methods)
  // ==========================================================================

  /**
   * Check if a specific widget is active
   */
  isWidgetActive(instanceId, widgetType) {
    switch (widgetType) {
      case "plane":
        return vtkPlaneWidget.isEnabled(instanceId);
      case "line":
        return vtkLineWidget.isEnabled(instanceId);
      case "angle":
        return vtkAngleWidget.isEnabled(instanceId);
      case "orientation":
        return vtkOrientationWidget.isEnabled(instanceId);
      default:
        return false;
    }
  }

  /**
   * Check if any measurement widgets are active
   */
  hasActiveWidgets(instanceId) {
    return (
      vtkLineWidget.isEnabled(instanceId) ||
      vtkAngleWidget.isEnabled(instanceId) ||
      vtkPlaneWidget.isEnabled(instanceId)
    );
  }

  /**
   * Get all measurements for an instance
   */
  getMeasurements(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    return tools?.measurements || [];
  }

  /**
   * Disable all measurement tools
   */
  disableMeasurementTools(instanceId) {
    vtkLineWidget.cleanup(instanceId);
    vtkAngleWidget.cleanup(instanceId);
    vtkPlaneWidget.cleanup(instanceId);

    const tools = this.instanceTools.get(instanceId);
    if (tools) {
      tools.measurements = [];
    }

    log.debug(`All measurement tools disabled for instance: ${instanceId}`);
  }

  /**
   * Disable all tools
   */
  disableAllTools(instanceId) {
    this.disableMeasurementTools(instanceId);
    vtkOrientationWidget.setVisible(instanceId, false);

    log.debug(`All tools disabled for instance: ${instanceId}`);
  }
}

// Export singleton
export const instanceTools = new InstanceToolsManager();
