// src/core/vr/navigation/VRTeleportMode.js
// Teleportation navigation mode for VR exploration

import { vr as log } from "@Utils/logger.js";

export class VRTeleportMode {
  constructor(vrContext, options = {}) {
    this._vrContext = vrContext;
    this._options = {
      maxDistance: 50.0, // Maximum teleport distance in meters
      arcSegments: 30, // Number of segments in teleport arc
      arcHeight: 2.0, // Arc height for parabolic trajectory
      snapRotation: Math.PI / 4, // 45 degree snap rotation
      ...options,
    };

    // Teleport state
    this._isActive = false;
    this._isAiming = false;
    this._targetPosition = null;
    this._targetValid = false;
    this._arcPoints = [];
    this._snapRotationAngle = 0;
  }

  activate() {
    this._isActive = true;
    this._resetState();
    log.debug("VRTeleportMode activated");
  }

  deactivate() {
    this._isActive = false;
    this._resetState();
    log.debug("VRTeleportMode deactivated");
  }

  _resetState() {
    this._isAiming = false;
    this._targetPosition = null;
    this._targetValid = false;
    this._arcPoints = [];
    this._snapRotationAngle = 0;
  }

  /**
   * Update teleport based on input
   *
   * @param {Object} inputState - Controller input state
   * @param {XRFrame} frame - XR frame
   * @param {number} deltaTime - Time since last frame
   * @returns {Object} { position, orientation, teleporting, arcPoints }
   */
  update(inputState, frame, deltaTime) {
    if (!this._isActive) {
      return { position: null, orientation: null, teleporting: false };
    }

    const rightController = inputState.controllers?.right;
    if (!rightController) {
      return { position: null, orientation: null, teleporting: false };
    }

    const thumbstickY = rightController.thumbstick?.y || 0;
    const thumbstickX = rightController.thumbstick?.x || 0;
    const wasAiming = this._isAiming;

    // Start aiming when thumbstick pushed forward
    if (thumbstickY < -0.7 && !this._isAiming) {
      this._startAiming(rightController);
    }

    // Update aim while holding
    if (this._isAiming && thumbstickY < -0.3) {
      this._updateAim(rightController, inputState);

      // Handle snap rotation with thumbstick X
      if (Math.abs(thumbstickX) > 0.7) {
        this._snapRotationAngle =
          thumbstickX > 0
            ? -this._options.snapRotation
            : this._options.snapRotation;
      } else {
        this._snapRotationAngle = 0;
      }
    }

    // Release to teleport
    if (wasAiming && thumbstickY > -0.3) {
      const result = this._executeTeleport();
      this._resetState();
      return result;
    }

    // Return current state for rendering teleport arc
    return {
      position: null,
      orientation: null,
      teleporting: false,
      isAiming: this._isAiming,
      targetPosition: this._targetPosition,
      targetValid: this._targetValid,
      arcPoints: this._arcPoints,
      snapRotation: this._snapRotationAngle,
    };
  }

  /**
   * Start aiming teleport
   * @private
   */
  _startAiming(controller) {
    this._isAiming = true;
    log.debug("Teleport aiming started");
  }

  /**
   * Update teleport aim
   * @private
   */
  _updateAim(controller, inputState) {
    const targetRay = controller.targetRay;
    if (!targetRay) {
      this._targetValid = false;
      return;
    }

    // Get ray origin and direction from controller
    const origin = targetRay.position || { x: 0, y: 0, z: 0 };
    const matrix = targetRay.matrix;

    // Extract forward direction from transform matrix
    // Forward is negative Z in WebXR
    let direction;
    if (matrix) {
      direction = {
        x: -matrix[8],
        y: -matrix[9],
        z: -matrix[10],
      };
    } else {
      // Fallback: point forward from controller
      direction = { x: 0, y: 0, z: -1 };
    }

    // Calculate parabolic arc
    this._arcPoints = this._calculateArc(origin, direction);

    // Find intersection with ground or valid surface
    const intersection = this._findIntersection(this._arcPoints);

    if (intersection) {
      this._targetPosition = intersection.position;
      this._targetValid = intersection.valid;
    } else {
      this._targetPosition = this._arcPoints[this._arcPoints.length - 1];
      this._targetValid = false;
    }
  }

  /**
   * Calculate parabolic arc for teleport visualization
   * @private
   */
  _calculateArc(origin, direction) {
    const points = [];
    const segments = this._options.arcSegments;
    const maxDistance = this._options.maxDistance;
    const gravity = 9.8;

    // Initial velocity
    const speed = 10.0; // m/s
    const velocity = {
      x: direction.x * speed,
      y: direction.y * speed + 2.0, // Add upward component for arc
      z: direction.z * speed,
    };

    let position = { ...origin };
    const timeStep = 0.1;

    for (let i = 0; i < segments; i++) {
      points.push({ ...position });

      // Update position with simple projectile motion
      position.x += velocity.x * timeStep;
      position.y += velocity.y * timeStep - 0.5 * gravity * timeStep * timeStep;
      position.z += velocity.z * timeStep;

      // Update velocity
      velocity.y -= gravity * timeStep;

      // Check if we've gone far enough or hit ground
      const distance = Math.sqrt(
        (position.x - origin.x) ** 2 +
          (position.y - origin.y) ** 2 +
          (position.z - origin.z) ** 2
      );

      if (distance > maxDistance || position.y < -10) break;
    }

    return points;
  }

  /**
   * Find intersection of arc with valid teleport surface
   * @private
   */
  _findIntersection(arcPoints) {
    // Simple ground plane intersection for now
    // In a real implementation, this would raycast against the scene
    const groundY = 0;

    for (let i = 1; i < arcPoints.length; i++) {
      const prev = arcPoints[i - 1];
      const curr = arcPoints[i];

      // Check if arc crosses ground plane
      if (prev.y >= groundY && curr.y < groundY) {
        // Interpolate to find exact intersection point
        const t = (groundY - prev.y) / (curr.y - prev.y);
        return {
          position: {
            x: prev.x + t * (curr.x - prev.x),
            y: groundY,
            z: prev.z + t * (curr.z - prev.z),
          },
          valid: true,
        };
      }
    }

    return null;
  }

  /**
   * Execute the teleport
   * @private
   */
  _executeTeleport() {
    if (!this._targetValid || !this._targetPosition) {
      log.debug("Teleport cancelled - invalid target");
      return { position: null, orientation: null, teleporting: false };
    }

    log.debug("Executing teleport to:", this._targetPosition);

    // Trigger haptic feedback
    window.dispatchEvent(
      new CustomEvent("cia:vr-haptic", {
        detail: { type: "teleport", intensity: 0.7, duration: 50 },
      })
    );

    return {
      position: this._targetPosition,
      orientation: this._snapRotationAngle !== 0 ? this._snapRotationAngle : null,
      teleporting: true,
    };
  }

  /**
   * Get teleport arc for rendering
   */
  getArcPoints() {
    return this._arcPoints;
  }

  /**
   * Get current target info
   */
  getTargetInfo() {
    return {
      position: this._targetPosition,
      valid: this._targetValid,
      isAiming: this._isAiming,
    };
  }
}

export default VRTeleportMode;
