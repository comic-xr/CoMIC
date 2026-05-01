// src/core/instances/types/vtk/vr/VTKVRController.js
// ----------------------------------------------------------------------------
// VR Controllers - Handle Meta Quest / Oculus Controllers in VTK scenes
// ----------------------------------------------------------------------------
//
// Per-instance controller management for WebXR VR sessions
// Creates visual representations of controllers and handles input events
//

import { vr as log } from "@Utils/logger.js";
import { raycastFromRay } from "@VTK/utils/vtkRaycaster.js";

// VTK imports for controller visualization
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkConeSource from "@kitware/vtk.js/Filters/Sources/ConeSource";
import vtkSphereSource from "@kitware/vtk.js/Filters/Sources/SphereSource";
import vtkCylinderSource from "@kitware/vtk.js/Filters/Sources/CylinderSource";
import vtkAppendPolyData from "@kitware/vtk.js/Filters/General/AppendPolyData";

/**
 * VRControllers - Per-instance VR controller management
 *
 * Handles:
 * - Creating visual representations of controllers
 * - Updating controller positions from XR poses
 * - Handling controller input events (select, squeeze)
 * - Raycasting from controller for interaction
 */
class VRControllers {
  constructor() {
    // Per-instance controller data: instanceId → ControllerData
    this.instanceControllers = new Map();
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  /**
   * Initialize VR controllers for an instance
   *
   * @param {string} instanceId - The instance ID
   * @param {Object} sceneObjects - VTK scene objects (renderer, etc.)
   * @param {XRSession} xrSession - Active WebXR session
   */
  initialize(instanceId, sceneObjects, xrSession) {
    log.info(`Initializing VR controllers for instance ${instanceId}`);

    const controllerData = {
      xrSession,
      sceneObjects,
      controllers: new Map(), // handedness → controller state
      rayVisuals: new Map(), // handedness → ray visual actor
      eventCleanup: [], // functions to call on cleanup
    };

    // Store in map
    this.instanceControllers.set(instanceId, controllerData);

    // Set up event listeners
    this._setupEventListeners(instanceId, xrSession);

    // Initialize controllers that may already be connected
    this._initializeExistingControllers(instanceId, xrSession);

    log.info(`VR controllers initialized for instance ${instanceId}`);
  }

  /**
   * Initialize controllers that are already connected when session starts
   * @private
   */
  _initializeExistingControllers(instanceId, xrSession) {
    if (!xrSession?.inputSources) return;

    for (const inputSource of xrSession.inputSources) {
      this._addController(instanceId, inputSource);
    }
  }

  /**
   * Set up XR session event listeners
   * @private
   */
  _setupEventListeners(instanceId, xrSession) {
    const data = this.instanceControllers.get(instanceId);
    if (!data) return;

    // Input sources change (controllers connected/disconnected)
    const onInputSourcesChange = (event) => {
      this._onInputSourcesChange(instanceId, event);
    };
    xrSession.addEventListener("inputsourceschange", onInputSourcesChange);
    data.eventCleanup.push(() =>
      xrSession.removeEventListener("inputsourceschange", onInputSourcesChange)
    );

    // Select (trigger) events
    const onSelectStart = (event) => this._onSelectStart(instanceId, event);
    const onSelectEnd = (event) => this._onSelectEnd(instanceId, event);
    const onSelect = (event) => this._onSelect(instanceId, event);

    xrSession.addEventListener("selectstart", onSelectStart);
    xrSession.addEventListener("selectend", onSelectEnd);
    xrSession.addEventListener("select", onSelect);

    data.eventCleanup.push(() => {
      xrSession.removeEventListener("selectstart", onSelectStart);
      xrSession.removeEventListener("selectend", onSelectEnd);
      xrSession.removeEventListener("select", onSelect);
    });

    // Squeeze (grip) events
    const onSqueezeStart = (event) => this._onSqueezeStart(instanceId, event);
    const onSqueezeEnd = (event) => this._onSqueezeEnd(instanceId, event);

    xrSession.addEventListener("squeezestart", onSqueezeStart);
    xrSession.addEventListener("squeezeend", onSqueezeEnd);

    data.eventCleanup.push(() => {
      xrSession.removeEventListener("squeezestart", onSqueezeStart);
      xrSession.removeEventListener("squeezeend", onSqueezeEnd);
    });
  }

  // ===========================================================================
  // CONTROLLER VISUALIZATION
  // ===========================================================================

  /**
   * Add a controller when connected
   * @private
   */
  _addController(instanceId, inputSource) {
    const data = this.instanceControllers.get(instanceId);
    if (!data) return;

    const handedness = inputSource.handedness || "none";
    log.debug(`Adding controller: ${handedness}`);

    // Don't add if already exists
    if (data.controllers.has(handedness)) return;

    // Create controller state
    const controller = {
      inputSource,
      handedness,
      pose: null,
      visualActor: null,
      rayActor: null,
      isSelecting: false,
      isSqueezing: false,
    };

    // Create visual representation
    controller.visualActor = this._createControllerVisual(handedness);
    controller.rayActor = this._createRayVisual(handedness);

    // Add to scene
    const { renderer } = data.sceneObjects;
    if (renderer) {
      renderer.addActor(controller.visualActor);
      renderer.addActor(controller.rayActor);
    }

    data.controllers.set(handedness, controller);
    log.debug(`Controller ${handedness} visual created and added to scene`);
  }

  /**
   * Remove a controller when disconnected
   * @private
   */
  _removeController(instanceId, inputSource) {
    const data = this.instanceControllers.get(instanceId);
    if (!data) return;

    const handedness = inputSource.handedness || "none";
    const controller = data.controllers.get(handedness);

    if (!controller) return;

    // Remove from scene
    const { renderer } = data.sceneObjects;
    if (renderer) {
      if (controller.visualActor) {
        renderer.removeActor(controller.visualActor);
      }
      if (controller.rayActor) {
        renderer.removeActor(controller.rayActor);
      }
    }

    data.controllers.delete(handedness);
    log.debug(`Controller ${handedness} removed`);
  }

  /**
   * Create visual representation of a controller
   *
   * Creates a simple controller model using VTK primitives:
   * - A cylinder for the grip
   * - A cone for the pointer direction
   *
   * @private
   */
  _createControllerVisual(handedness) {
    // Color based on handedness (left = red, right = blue)
    const color =
      handedness === "left"
        ? [0.8, 0.2, 0.2] // Red
        : handedness === "right"
        ? [0.2, 0.2, 0.8] // Blue
        : [0.5, 0.5, 0.5]; // Gray for unknown

    // Create grip (cylinder)
    const gripSource = vtkCylinderSource.newInstance({
      height: 0.1,
      radius: 0.015,
      resolution: 16,
    });

    // Create pointer (cone)
    const pointerSource = vtkConeSource.newInstance({
      height: 0.05,
      radius: 0.012,
      resolution: 16,
      direction: [0, 0, -1], // Point forward
      center: [0, 0, -0.05], // Position in front of grip
    });

    // Combine into single polydata
    const appendFilter = vtkAppendPolyData.newInstance();
    appendFilter.setInputConnection(gripSource.getOutputPort(), 0);
    appendFilter.addInputConnection(pointerSource.getOutputPort());

    // Create mapper and actor
    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(appendFilter.getOutputPort());

    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    actor.getProperty().setColor(...color);
    actor.getProperty().setOpacity(0.9);

    // Make it pickable for interactions
    actor.setPickable(false); // Controllers shouldn't be pickable

    return actor;
  }

  /**
   * Create ray visual (laser pointer from controller)
   * @private
   */
  _createRayVisual(handedness) {
    // Color matching controller
    const color =
      handedness === "left"
        ? [1.0, 0.4, 0.4] // Light red
        : handedness === "right"
        ? [0.4, 0.4, 1.0] // Light blue
        : [0.7, 0.7, 0.7]; // Light gray

    // Create thin cylinder for ray
    const raySource = vtkCylinderSource.newInstance({
      height: 5.0, // 5 meter ray
      radius: 0.002, // Very thin
      resolution: 8,
      center: [0, 0, -2.5], // Extend forward
    });

    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(raySource.getOutputPort());

    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    actor.getProperty().setColor(...color);
    actor.getProperty().setOpacity(0.5);
    actor.setPickable(false);

    // Initially hidden
    actor.setVisibility(false);

    return actor;
  }

  // ===========================================================================
  // POSE UPDATES
  // ===========================================================================

  /**
   * Update controller poses from XR frame data
   *
   * Called every frame to update controller positions
   *
   * @param {string} instanceId - Instance ID
   * @param {XRFrame} frame - Current XR frame
   * @param {XRReferenceSpace} referenceSpace - Reference space for pose calculation
   */
  updatePoses(instanceId, frame, referenceSpace) {
    const data = this.instanceControllers.get(instanceId);
    if (!data) return;

    // Store the reference space for use in raycasting (XRSession doesn't expose it directly)
    data.referenceSpace = referenceSpace;

    const { xrSession, controllers, sceneObjects } = data;

    for (const inputSource of xrSession.inputSources) {
      const handedness = inputSource.handedness || "none";
      const controller = controllers.get(handedness);

      if (!controller) {
        // Controller connected but not initialized yet
        this._addController(instanceId, inputSource);
        continue;
      }

      // Get grip pose (controller position/orientation)
      if (inputSource.gripSpace) {
        const gripPose = frame.getPose(inputSource.gripSpace, referenceSpace);
        if (gripPose) {
          controller.pose = gripPose;
          this._updateControllerVisual(controller, gripPose);
        }
      }

      // Get target ray pose (for pointer direction)
      if (inputSource.targetRaySpace) {
        const rayPose = frame.getPose(
          inputSource.targetRaySpace,
          referenceSpace
        );
        if (rayPose) {
          this._updateRayVisual(controller, rayPose);
        }
      }
    }

    // Render if we have controllers
    if (controllers.size > 0 && sceneObjects?.renderWindow) {
      // Note: The main render happens in VTKInstanceHandler._renderVRFrame
      // This is just for immediate updates if needed
    }
  }

  /**
   * Update controller visual position and orientation
   * @private
   */
  _updateControllerVisual(controller, pose) {
    if (!controller.visualActor || !pose) return;

    const { transform } = pose;
    const matrix = transform.matrix;

    // Extract position
    const position = [matrix[12], matrix[13], matrix[14]];

    // Set position
    controller.visualActor.setPosition(...position);

    // Set orientation from matrix
    // VTK uses row-major, WebXR uses column-major
    // Extract rotation and apply
    const orientation = this._matrixToEuler(matrix);
    controller.visualActor.setOrientation(...orientation);
  }

  /**
   * Update ray visual position and orientation
   * @private
   */
  _updateRayVisual(controller, pose) {
    if (!controller.rayActor || !pose) return;

    const { transform } = pose;
    const matrix = transform.matrix;

    // Position at controller
    const position = [matrix[12], matrix[13], matrix[14]];
    controller.rayActor.setPosition(...position);

    // Orient along target ray direction
    const orientation = this._matrixToEuler(matrix);
    controller.rayActor.setOrientation(...orientation);

    // Show ray when selecting
    controller.rayActor.setVisibility(controller.isSelecting);
  }

  /**
   * Convert 4x4 matrix to Euler angles (degrees)
   * @private
   */
  _matrixToEuler(matrix) {
    // Extract rotation from column-major 4x4 matrix
    // This is a simplified conversion - for precise work, use quaternions

    // Extract forward (Z), up (Y), right (X) vectors
    const m11 = matrix[0],
      m12 = matrix[4],
      m13 = matrix[8];
    const m21 = matrix[1],
      m22 = matrix[5],
      m23 = matrix[9];
    const m31 = matrix[2],
      m32 = matrix[6],
      m33 = matrix[10];

    const sy = Math.sqrt(m11 * m11 + m21 * m21);
    const singular = sy < 1e-6;

    let x, y, z;

    if (!singular) {
      x = Math.atan2(m32, m33);
      y = Math.atan2(-m31, sy);
      z = Math.atan2(m21, m11);
    } else {
      x = Math.atan2(-m23, m22);
      y = Math.atan2(-m31, sy);
      z = 0;
    }

    // Convert to degrees
    const toDeg = 180 / Math.PI;
    return [x * toDeg, y * toDeg, z * toDeg];
  }

  // ===========================================================================
  // INPUT EVENTS
  // ===========================================================================

  /**
   * Handle input sources change (controller connected/disconnected)
   * @private
   */
  _onInputSourcesChange(instanceId, event) {
    log.debug(`Input sources changed for instance ${instanceId}`);

    // Handle added controllers
    for (const inputSource of event.added) {
      log.debug(`Controller added: ${inputSource.handedness}`);
      this._addController(instanceId, inputSource);
    }

    // Handle removed controllers
    for (const inputSource of event.removed) {
      log.debug(`Controller removed: ${inputSource.handedness}`);
      this._removeController(instanceId, inputSource);
    }
  }

  /**
   * Handle select start (trigger pressed)
   * @private
   */
  _onSelectStart(instanceId, event) {
    const data = this.instanceControllers.get(instanceId);
    if (!data) return;

    const handedness = event.inputSource.handedness || "none";
    const controller = data.controllers.get(handedness);

    if (controller) {
      controller.isSelecting = true;
      // Show ray while selecting
      if (controller.rayActor) {
        controller.rayActor.setVisibility(true);
      }
    }

    log.debug(`Select start: ${handedness}`);

    // Emit event for handlers to respond
    this._emitControllerEvent(instanceId, "selectstart", {
      handedness,
      inputSource: event.inputSource,
      frame: event.frame,
    });
  }

  /**
   * Handle select end (trigger released)
   * @private
   */
  _onSelectEnd(instanceId, event) {
    const data = this.instanceControllers.get(instanceId);
    if (!data) return;

    const handedness = event.inputSource.handedness || "none";
    const controller = data.controllers.get(handedness);

    if (controller) {
      controller.isSelecting = false;
      // Hide ray after selecting
      if (controller.rayActor) {
        controller.rayActor.setVisibility(false);
      }
    }

    log.debug(`Select end: ${handedness}`);

    this._emitControllerEvent(instanceId, "selectend", {
      handedness,
      inputSource: event.inputSource,
      frame: event.frame,
    });
  }

  /**
   * Handle select (trigger press + release complete)
   * @private
   */
  _onSelect(instanceId, event) {
    const handedness = event.inputSource.handedness || "none";
    log.debug(`Select (click): ${handedness}`);

    // Perform raycast to see what was selected
    const hit = this._performRaycast(instanceId, event);

    this._emitControllerEvent(instanceId, "select", {
      handedness,
      inputSource: event.inputSource,
      frame: event.frame,
      hit,
    });
  }

  /**
   * Handle squeeze start (grip pressed)
   * @private
   */
  _onSqueezeStart(instanceId, event) {
    const data = this.instanceControllers.get(instanceId);
    if (!data) return;

    const handedness = event.inputSource.handedness || "none";
    const controller = data.controllers.get(handedness);

    if (controller) {
      controller.isSqueezing = true;
    }

    log.debug(`Squeeze start: ${handedness}`);

    this._emitControllerEvent(instanceId, "squeezestart", {
      handedness,
      inputSource: event.inputSource,
      frame: event.frame,
    });
  }

  /**
   * Handle squeeze end (grip released)
   * @private
   */
  _onSqueezeEnd(instanceId, event) {
    const data = this.instanceControllers.get(instanceId);
    if (!data) return;

    const handedness = event.inputSource.handedness || "none";
    const controller = data.controllers.get(handedness);

    if (controller) {
      controller.isSqueezing = false;
    }

    log.debug(`Squeeze end: ${handedness}`);

    this._emitControllerEvent(instanceId, "squeezeend", {
      handedness,
      inputSource: event.inputSource,
      frame: event.frame,
    });
  }

  // ===========================================================================
  // RAYCASTING
  // ===========================================================================

  /**
   * Perform raycast from controller to find intersections
   * @private
   */
  _performRaycast(instanceId, event) {
    const data = this.instanceControllers.get(instanceId);
    if (!data) return null;

    const { sceneObjects } = data;
    const { inputSource, frame } = event;

    if (!inputSource.targetRaySpace) return null;

    // Use the stored reference space (set by updatePoses each frame)
    const referenceSpace = data.referenceSpace;
    if (!referenceSpace) return null;

    const pose = frame.getPose(inputSource.targetRaySpace, referenceSpace);
    if (!pose) return null;

    // Extract ray origin and direction from WebXR pose matrix
    const matrix = pose.transform.matrix;
    const origin = [matrix[12], matrix[13], matrix[14]];
    const direction = [-matrix[8], -matrix[9], -matrix[10]]; // Forward is -Z in WebXR

    log.trace(`Raycast from ${origin} direction ${direction}`);

    // Use VTK raycaster for actual intersection testing
    const result = raycastFromRay(sceneObjects, origin, direction, {
      instanceId,
      maxDistance: 50, // 50 meter max ray distance for VR
    });

    return {
      origin,
      direction,
      actor: result.actor,
      point: result.worldPosition,
      hit: result.hit,
      cellId: result.cellId,
      normal: result.normal,
      distance: result.distance,
    };
  }

  // ===========================================================================
  // EVENT EMISSION
  // ===========================================================================

  /**
   * Emit controller event for external handlers
   * @private
   */
  _emitControllerEvent(instanceId, eventType, detail) {
    window.dispatchEvent(
      new CustomEvent(`cia:vr-controller-${eventType}`, {
        detail: {
          instanceId,
          ...detail,
        },
      })
    );
  }

  // ===========================================================================
  // CONTROLLER ACCESS
  // ===========================================================================

  /**
   * Get controller data for an instance
   */
  getControllers(instanceId) {
    const data = this.instanceControllers.get(instanceId);
    if (!data) return [];

    return Array.from(data.controllers.values()).map((c) => ({
      handedness: c.handedness,
      pose: c.pose,
      isSelecting: c.isSelecting,
      isSqueezing: c.isSqueezing,
    }));
  }

  /**
   * Get a specific controller
   */
  getController(instanceId, handedness) {
    const data = this.instanceControllers.get(instanceId);
    return data?.controllers.get(handedness) || null;
  }

  /**
   * Check if instance has VR controllers
   */
  hasControllers(instanceId) {
    const data = this.instanceControllers.get(instanceId);
    return data ? data.controllers.size > 0 : false;
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Clean up controllers for an instance
   */
  cleanup(instanceId) {
    const data = this.instanceControllers.get(instanceId);
    if (!data) return;

    log.info(`Cleaning up VR controllers for instance ${instanceId}`);

    // Remove event listeners
    data.eventCleanup.forEach((cleanup) => {
      try {
        cleanup();
      } catch (e) {
        log.warn("Error during event cleanup:", e);
      }
    });

    // Remove visual actors from scene
    const { renderer } = data.sceneObjects;
    if (renderer) {
      data.controllers.forEach((controller) => {
        if (controller.visualActor) {
          renderer.removeActor(controller.visualActor);
        }
        if (controller.rayActor) {
          renderer.removeActor(controller.rayActor);
        }
      });
    }

    // Clear maps
    data.controllers.clear();
    data.eventCleanup = [];

    // Remove from instance map
    this.instanceControllers.delete(instanceId);

    log.info(`VR controllers cleaned up for instance ${instanceId}`);
  }

  /**
   * Check if initialized for an instance
   */
  isInitialized(instanceId) {
    return this.instanceControllers.has(instanceId);
  }
}

// Export singleton instance
export const vrControllers = new VRControllers();
