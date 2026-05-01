// src/core/vr/navigation/VRFlyMode.js
// Free-flying navigation mode for VR exploration

import { vr as log } from "@Utils/logger.js";

export class VRFlyMode {
  constructor(vrContext, options = {}) {
    this._vrContext = vrContext;
    this._options = {
      baseSpeed: 2.0, // meters per second at scale 1.0
      boostMultiplier: 3.0,
      deadzone: 0.15, // Thumbstick deadzone
      rotationSpeed: 1.5, // radians per second
      smoothing: 0.9, // Velocity smoothing factor
      groundLocked: false, // If true, Y movement is locked (walk mode)
      ...options,
    };

    // Movement state
    this._velocity = { x: 0, y: 0, z: 0 };
    this._angularVelocity = 0;
    this._isActive = false;
  }

  activate() {
    this._isActive = true;
    this._velocity = { x: 0, y: 0, z: 0 };
    this._angularVelocity = 0;
    log.debug("VRFlyMode activated");
  }

  deactivate() {
    this._isActive = false;
    log.debug("VRFlyMode deactivated");
  }

  /**
   * Update navigation based on input
   *
   * @param {Object} inputState - Controller input state
   * @param {XRFrame} frame - XR frame
   * @param {number} deltaTime - Time since last frame in seconds
   * @returns {Object} { position, orientation }
   */
  update(inputState, frame, deltaTime) {
    if (!this._isActive) return { position: null, orientation: null };

    const leftController = inputState.controllers?.left;
    const rightController = inputState.controllers?.right;

    // Get current scale for speed adjustment
    const vrScale = this._vrContext.vrScale || 1.0;
    const scaledSpeed = this._options.baseSpeed * vrScale;

    // Calculate desired movement from left thumbstick
    const moveInput = this._getMovementInput(leftController);

    // Calculate rotation from right thumbstick
    const rotateInput = this._getRotationInput(rightController);

    // Check for boost (trigger held)
    const boost = rightController?.triggerValue > 0.5;
    const speed = boost
      ? scaledSpeed * this._options.boostMultiplier
      : scaledSpeed;

    // Calculate target velocity
    const targetVelocity = {
      x: moveInput.x * speed,
      y: this._options.groundLocked ? 0 : moveInput.y * speed,
      z: moveInput.z * speed,
    };

    // Smooth velocity
    const smoothing = this._options.smoothing;
    this._velocity = {
      x: this._velocity.x * smoothing + targetVelocity.x * (1 - smoothing),
      y: this._velocity.y * smoothing + targetVelocity.y * (1 - smoothing),
      z: this._velocity.z * smoothing + targetVelocity.z * (1 - smoothing),
    };

    // Calculate position delta
    const positionDelta = {
      x: this._velocity.x * deltaTime,
      y: this._velocity.y * deltaTime,
      z: this._velocity.z * deltaTime,
    };

    // Calculate rotation
    this._angularVelocity =
      this._angularVelocity * smoothing +
      rotateInput * this._options.rotationSpeed * (1 - smoothing);

    const rotationDelta = this._angularVelocity * deltaTime;

    // Transform movement by head orientation
    const headOrientation = inputState.headPose?.orientation;
    const transformedDelta = this._transformByOrientation(
      positionDelta,
      headOrientation
    );

    return {
      positionDelta: transformedDelta,
      rotationDelta: rotationDelta,
      isBoosting: boost,
      speed: Math.sqrt(
        this._velocity.x ** 2 + this._velocity.y ** 2 + this._velocity.z ** 2
      ),
    };
  }

  /**
   * Get movement input from left controller thumbstick
   * @private
   */
  _getMovementInput(controller) {
    if (!controller?.thumbstick) {
      return { x: 0, y: 0, z: 0 };
    }

    const { x, y } = controller.thumbstick;
    const deadzone = this._options.deadzone;

    // Apply deadzone
    const adjustedX = Math.abs(x) > deadzone ? x : 0;
    const adjustedY = Math.abs(y) > deadzone ? y : 0;

    // Map thumbstick to movement
    // X = strafe left/right
    // Y = forward/back (inverted so push forward moves forward)
    // Vertical movement from A/B buttons or squeeze
    let verticalInput = 0;
    if (controller.buttons?.a) verticalInput = 1;
    if (controller.buttons?.b) verticalInput = -1;
    if (controller.squeezeValue > 0.5) verticalInput = controller.squeezeValue;

    return {
      x: adjustedX, // Strafe
      y: verticalInput, // Up/down
      z: -adjustedY, // Forward/back
    };
  }

  /**
   * Get rotation input from right controller thumbstick
   * @private
   */
  _getRotationInput(controller) {
    if (!controller?.thumbstick) return 0;

    const { x } = controller.thumbstick;
    const deadzone = this._options.deadzone;

    // Apply deadzone
    return Math.abs(x) > deadzone ? -x : 0;
  }

  /**
   * Transform movement vector by head orientation
   * @private
   */
  _transformByOrientation(movement, orientation) {
    if (!orientation) return movement;

    // Extract yaw from quaternion (we only want horizontal rotation)
    const { x: qx, y: qy, z: qz, w: qw } = orientation;

    // Calculate yaw angle from quaternion
    const siny_cosp = 2 * (qw * qy + qz * qx);
    const cosy_cosp = 1 - 2 * (qx * qx + qy * qy);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);

    // Rotate movement vector around Y axis
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);

    return {
      x: movement.x * cos - movement.z * sin,
      y: movement.y, // Keep vertical component
      z: movement.x * sin + movement.z * cos,
    };
  }
}

export default VRFlyMode;
