// src/core/vr/VRControllerRenderer.js
// Renders VR controllers and hand tracking visualization
//
// Provides visual feedback for:
// - Controller positions (simple geometric representation)
// - Pointer rays for interaction
// - Hand tracking (if available)
// - Button press feedback

import { vr as log } from "@Utils/logger.js";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkCylinderSource from "@kitware/vtk.js/Filters/Sources/CylinderSource";
import vtkSphereSource from "@kitware/vtk.js/Filters/Sources/SphereSource";
import vtkLineSource from "@kitware/vtk.js/Filters/Sources/LineSource";
import vtkAppendPolyData from "@kitware/vtk.js/Filters/General/AppendPolyData";

/**
 * VRControllerRenderer - Visualizes VR controllers in the scene
 */
export class VRControllerRenderer {
  constructor(renderer, options = {}) {
    this._renderer = renderer;
    this._vrScale = options.vrScale || 1.0;
    this._vrOrigin = options.vrOrigin || [0, 0, 0];

    // Controller actors
    this._controllers = {
      left: null,
      right: null,
    };

    // Pointer ray actors
    this._pointerRays = {
      left: null,
      right: null,
    };

    // Hand tracking actors (joint spheres)
    this._handActors = {
      left: [],
      right: [],
    };

    // Controller colors
    this._colors = {
      left: [0.2, 0.6, 1.0], // Blue
      right: [1.0, 0.4, 0.2], // Orange
      leftHighlight: [0.4, 0.8, 1.0],
      rightHighlight: [1.0, 0.6, 0.4],
    };

    // Ray settings
    this._rayLength = 5.0; // meters in VR
    this._rayWidth = 0.002;

    // Initialize controllers
    this._initializeControllers();
  }

  /**
   * Initialize controller visual representations
   */
  _initializeControllers() {
    for (const hand of ["left", "right"]) {
      // Create controller actor
      const controllerActor = this._createControllerActor(hand);
      this._controllers[hand] = controllerActor;
      this._renderer.addActor(controllerActor);

      // Create pointer ray actor
      const rayActor = this._createPointerRayActor(hand);
      this._pointerRays[hand] = rayActor;
      this._renderer.addActor(rayActor);

      // Initially hide
      controllerActor.setVisibility(false);
      rayActor.setVisibility(false);
    }

    log.debug("VR controllers initialized");
  }

  /**
   * Create a controller visual actor
   *
   * @param {string} hand - 'left' or 'right'
   * @returns {vtkActor}
   */
  _createControllerActor(hand) {
    // Create a simple controller shape (cylinder for grip, sphere for tip)
    const appendFilter = vtkAppendPolyData.newInstance();

    // Grip (cylinder)
    const gripSource = vtkCylinderSource.newInstance({
      height: 0.12,
      radius: 0.02,
      resolution: 16,
      center: [0, 0, 0],
    });

    // Pointer tip (small sphere at front)
    const tipSource = vtkSphereSource.newInstance({
      radius: 0.015,
      phiResolution: 12,
      thetaResolution: 12,
      center: [0, 0.07, 0],
    });

    appendFilter.addInputConnection(gripSource.getOutputPort());
    appendFilter.addInputConnection(tipSource.getOutputPort());

    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(appendFilter.getOutputPort());

    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);

    // Set color based on hand
    const color = this._colors[hand];
    actor.getProperty().setColor(...color);
    actor.getProperty().setOpacity(0.9);

    // Rotate to align with controller grip
    actor.rotateX(90);

    return actor;
  }

  /**
   * Create a pointer ray actor
   *
   * @param {string} hand - 'left' or 'right'
   * @returns {vtkActor}
   */
  _createPointerRayActor(hand) {
    const lineSource = vtkLineSource.newInstance({
      point1: [0, 0, 0],
      point2: [0, 0, -this._rayLength],
    });

    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(lineSource.getOutputPort());

    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);

    // Set color
    const color = this._colors[hand];
    actor.getProperty().setColor(...color);
    actor.getProperty().setOpacity(0.6);
    actor.getProperty().setLineWidth(2);

    // Store reference to update line endpoints
    actor._lineSource = lineSource;

    return actor;
  }

  /**
   * Update controller positions from input state
   *
   * @param {Object} inputState - Controller input state from VRSceneRenderer
   */
  update(inputState) {
    for (const hand of ["left", "right"]) {
      const controller = inputState.controllers?.[hand];
      const controllerActor = this._controllers[hand];
      const rayActor = this._pointerRays[hand];

      if (controller?.pose) {
        // Show controller
        controllerActor.setVisibility(true);

        // Transform position from VR space to scene space
        const pos = controller.pose.position;
        const scenePos = this._vrToScenePosition(pos);
        controllerActor.setPosition(...scenePos);

        // Apply orientation from pose
        if (controller.pose.orientation) {
          this._applyOrientation(controllerActor, controller.pose.orientation);
        }

        // Update color based on button state
        this._updateControllerHighlight(
          controllerActor,
          hand,
          controller.triggerPressed || controller.squeezePressed
        );

        // Update pointer ray
        if (controller.targetRay) {
          rayActor.setVisibility(true);
          this._updatePointerRay(rayActor, controller.targetRay);
        } else {
          rayActor.setVisibility(false);
        }
      } else {
        // Hide controller
        controllerActor.setVisibility(false);
        rayActor.setVisibility(false);
      }
    }

    // Update hand tracking if available
    this._updateHandTracking(inputState.hands);
  }

  /**
   * Convert VR position to scene position
   */
  _vrToScenePosition(vrPos) {
    return [
      vrPos.x / this._vrScale + this._vrOrigin[0],
      vrPos.y / this._vrScale + this._vrOrigin[1],
      vrPos.z / this._vrScale + this._vrOrigin[2],
    ];
  }

  /**
   * Apply quaternion orientation to actor
   */
  _applyOrientation(actor, quat) {
    // Convert quaternion to rotation matrix
    // VTK.js actors use setOrientation (roll, pitch, yaw in degrees)
    // For simplicity, we'll use the quaternion to construct the rotation

    const { x, y, z, w } = quat;

    // Convert quaternion to Euler angles (in degrees)
    // Roll (x-axis rotation)
    const sinr_cosp = 2 * (w * x + y * z);
    const cosr_cosp = 1 - 2 * (x * x + y * y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp) * (180 / Math.PI);

    // Pitch (y-axis rotation)
    const sinp = 2 * (w * y - z * x);
    let pitch;
    if (Math.abs(sinp) >= 1) {
      pitch = (Math.sign(sinp) * Math.PI) / 2 * (180 / Math.PI);
    } else {
      pitch = Math.asin(sinp) * (180 / Math.PI);
    }

    // Yaw (z-axis rotation)
    const siny_cosp = 2 * (w * z + x * y);
    const cosy_cosp = 1 - 2 * (y * y + z * z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp) * (180 / Math.PI);

    actor.setOrientation(roll, pitch, yaw);
  }

  /**
   * Update controller color highlight
   */
  _updateControllerHighlight(actor, hand, isPressed) {
    const color = isPressed ? this._colors[`${hand}Highlight`] : this._colors[hand];
    actor.getProperty().setColor(...color);
  }

  /**
   * Update pointer ray position and direction
   */
  _updatePointerRay(rayActor, targetRay) {
    const origin = targetRay.position;
    const sceneOrigin = this._vrToScenePosition(origin);

    // Direction from target ray matrix
    const matrix = targetRay.matrix;
    if (matrix) {
      // Forward direction is negative Z
      const direction = [
        -matrix[8],
        -matrix[9],
        -matrix[10],
      ];

      // Calculate end point
      const rayLengthScene = this._rayLength / this._vrScale;
      const endPoint = [
        sceneOrigin[0] + direction[0] * rayLengthScene,
        sceneOrigin[1] + direction[1] * rayLengthScene,
        sceneOrigin[2] + direction[2] * rayLengthScene,
      ];

      // Update line source
      rayActor._lineSource.setPoint1(...sceneOrigin);
      rayActor._lineSource.setPoint2(...endPoint);
    }

    rayActor.setPosition(0, 0, 0); // Reset position since we set absolute points
  }

  /**
   * Update hand tracking visualization
   */
  _updateHandTracking(hands) {
    for (const hand of ["left", "right"]) {
      const handData = hands?.[hand];

      if (handData) {
        // Create joint actors if needed
        this._ensureHandActors(hand, Object.keys(handData).length);

        // Update joint positions
        let i = 0;
        for (const [jointName, jointData] of Object.entries(handData)) {
          if (i < this._handActors[hand].length) {
            const actor = this._handActors[hand][i];
            actor.setVisibility(true);

            const pos = this._vrToScenePosition(jointData.position);
            actor.setPosition(...pos);

            // Scale by joint radius
            const scale = (jointData.radius || 0.005) / this._vrScale;
            actor.setScale(scale, scale, scale);
          }
          i++;
        }

        // Hide unused actors
        for (; i < this._handActors[hand].length; i++) {
          this._handActors[hand][i].setVisibility(false);
        }
      } else {
        // Hide all hand actors
        for (const actor of this._handActors[hand]) {
          actor.setVisibility(false);
        }
      }
    }
  }

  /**
   * Ensure we have enough hand joint actors
   */
  _ensureHandActors(hand, count) {
    while (this._handActors[hand].length < count) {
      const sphereSource = vtkSphereSource.newInstance({
        radius: 1.0, // Will be scaled
        phiResolution: 8,
        thetaResolution: 8,
      });

      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(sphereSource.getOutputPort());

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);

      const color = this._colors[hand];
      actor.getProperty().setColor(...color);
      actor.getProperty().setOpacity(0.7);

      this._handActors[hand].push(actor);
      this._renderer.addActor(actor);
    }
  }

  /**
   * Update VR scale and origin
   */
  setVRTransform(vrScale, vrOrigin) {
    this._vrScale = vrScale;
    this._vrOrigin = vrOrigin;
  }

  /**
   * Show/hide controllers
   */
  setVisible(visible) {
    for (const actor of Object.values(this._controllers)) {
      actor.setVisibility(visible);
    }
    for (const actor of Object.values(this._pointerRays)) {
      actor.setVisibility(visible);
    }
  }

  /**
   * Clean up controller visualization
   */
  dispose() {
    // Remove controller actors
    for (const actor of Object.values(this._controllers)) {
      this._renderer.removeActor(actor);
    }

    // Remove ray actors
    for (const actor of Object.values(this._pointerRays)) {
      this._renderer.removeActor(actor);
    }

    // Remove hand actors
    for (const hand of ["left", "right"]) {
      for (const actor of this._handActors[hand]) {
        this._renderer.removeActor(actor);
      }
    }

    this._controllers = { left: null, right: null };
    this._pointerRays = { left: null, right: null };
    this._handActors = { left: [], right: [] };

    log.debug("VR controller renderer disposed");
  }
}

export default VRControllerRenderer;
