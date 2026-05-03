// src/core/vr/tools/VRSlicePlaneTool.js
// Interactive slicing plane tool for VR

import { VRToolInterface } from './VRToolInterface.js';
import { vr as log } from '@Utils/logger.js';

export class VRSlicePlaneTool extends VRToolInterface {
  constructor() {
    super({
      id: 'slice',
      name: 'Slice Plane',
      icon: 'scissors',
      category: 'visualization',
    });

    this._planes = [];
    this._activePlane = null;
    this._grabbedBy = null;
    this._initialGrabPose = null;
    this._initialPlaneTransform = null;
    this._lastTriggerState = false;
  }

  async activate(context) {
    await super.activate(context);

    // Create initial plane at data center if none exist
    if (this._planes.length === 0) {
      const bounds = context.vrContext.dataBounds;
      if (bounds) {
        const center = [
          (bounds[0] + bounds[1]) / 2,
          (bounds[2] + bounds[3]) / 2,
          (bounds[4] + bounds[5]) / 2,
        ];

        this._activePlane = await this._createPlane(center, [0, 1, 0]);
        this._planes.push(this._activePlane);
      }
    }

    log.debug('Slice plane tool activated');
  }

  async deactivate() {
    await super.deactivate();
    this._grabbedBy = null;
  }

  handleInput(inputState, frame) {
    const { controllers } = inputState;

    // Handle grab start (grip button)
    if (!this._grabbedBy) {
      for (const hand of ['left', 'right']) {
        const ctrl = controllers[hand];
        if (ctrl?.squeezePressed && this._isNearPlane(ctrl.pose)) {
          this._grabbedBy = hand;
          this._initialGrabPose = this._clonePose(ctrl.pose);
          this._initialPlaneTransform = {
            origin: [...this._activePlane.origin],
            normal: [...this._activePlane.normal],
          };
          return { type: 'grab-start', plane: this._activePlane };
        }
      }
    }

    // Handle active grab
    if (this._grabbedBy) {
      const ctrl = controllers[this._grabbedBy];

      // Released grip
      if (!ctrl?.squeezePressed) {
        this._grabbedBy = null;
        return { type: 'grab-end', plane: this._activePlane };
      }

      // Update plane position
      const delta = this._computePoseDelta(this._initialGrabPose, ctrl.pose);

      this._activePlane.origin = [
        this._initialPlaneTransform.origin[0] + delta.position.x,
        this._initialPlaneTransform.origin[1] + delta.position.y,
        this._initialPlaneTransform.origin[2] + delta.position.z,
      ];

      // Rotate normal
      this._activePlane.normal = this._rotateVector(
        this._initialPlaneTransform.normal,
        delta.rotation
      );

      // Update in handler
      this._context.handler.updateSlicePlane?.(
        this._context.vrContext,
        this._activePlane
      );

      return {
        type: 'slice-plane-updated',
        data: this._activePlane
      };
    }

    // Thumbstick to slide along normal
    const right = controllers.right;
    if (right && Math.abs(right.thumbstick?.y) > 0.1 && !this._grabbedBy) {
      const slideSpeed = 0.02;
      const slideAmount = right.thumbstick.y * slideSpeed;

      this._activePlane.origin = [
        this._activePlane.origin[0] + this._activePlane.normal[0] * slideAmount,
        this._activePlane.origin[1] + this._activePlane.normal[1] * slideAmount,
        this._activePlane.origin[2] + this._activePlane.normal[2] * slideAmount,
      ];

      this._context.handler.updateSlicePlane?.(
        this._context.vrContext,
        this._activePlane
      );

      return { type: 'slice-plane-updated', data: this._activePlane };
    }

    // Trigger to create new plane
    const rightTrigger = controllers.right?.triggerPressed;
    if (rightTrigger && !this._lastTriggerState) {
      // Raycast to find position
      const hit = this._performRaycast(controllers.right, frame);
      if (hit) {
        this._createPlane(hit.position, hit.normal).then(newPlane => {
          this._planes.push(newPlane);
          this._activePlane = newPlane;
        });
        return { type: 'slice-plane-creating' };
      }
    }
    this._lastTriggerState = rightTrigger;

    return null;
  }

  getControllerHints() {
    return {
      left: {
        grip: 'Grab plane to move',
      },
      right: {
        grip: 'Grab plane to move',
        thumbstick: 'Slide along normal',
        trigger: 'Create new plane',
      },
    };
  }

  async _createPlane(origin, normal) {
    const plane = {
      id: `slice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      origin: Array.isArray(origin) ? [...origin] : [origin.x, origin.y, origin.z],
      normal: Array.isArray(normal) ? [...normal] : [normal.x, normal.y, normal.z],
      visible: true,
      color: [1, 0.5, 0],
      opacity: 0.5,
    };

    await this._context.handler.addSlicePlane?.(
      this._context.vrContext,
      plane
    );

    return plane;
  }

  _isNearPlane(pose) {
    if (!pose || !this._activePlane) return false;

    const distance = this._distanceToPlane(
      pose.position,
      this._activePlane.origin,
      this._activePlane.normal
    );

    return Math.abs(distance) < 0.2; // 20cm threshold
  }

  _distanceToPlane(point, planeOrigin, planeNormal) {
    const d =
      (point.x - planeOrigin[0]) * planeNormal[0] +
      (point.y - planeOrigin[1]) * planeNormal[1] +
      (point.z - planeOrigin[2]) * planeNormal[2];
    return d;
  }

  _clonePose(pose) {
    return {
      position: { ...pose.position },
      orientation: { ...pose.orientation },
    };
  }

  _computePoseDelta(initial, current) {
    return {
      position: {
        x: current.position.x - initial.position.x,
        y: current.position.y - initial.position.y,
        z: current.position.z - initial.position.z,
      },
      rotation: this._getRotationDelta(initial.orientation, current.orientation),
    };
  }

  _getRotationDelta(q1, q2) {
    // Quaternion delta
    return {
      x: q2.x - q1.x,
      y: q2.y - q1.y,
      z: q2.z - q1.z,
      w: q2.w - q1.w,
    };
  }

  _rotateVector(vec, rotation) {
    // Apply quaternion rotation to vector
    // Simplified - for proper rotation, use quaternion math
    const q = rotation;
    const magnitude = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);

    if (magnitude < 0.001) {
      return vec; // No rotation
    }

    // Simplified rotation - keeping original for now
    // TODO: Implement proper quaternion-vector rotation
    return vec;
  }

  _performRaycast(controller, frame) {
    if (!controller?.targetRay) return null;

    // Delegate to handler
    return this._context.handler.raycastVR?.(
      this._context.vrContext,
      controller.targetRay
    );
  }

  /**
   * Get all planes
   */
  getPlanes() {
    return this._planes;
  }

  /**
   * Remove a plane
   */
  async removePlane(planeId) {
    const index = this._planes.findIndex(p => p.id === planeId);
    if (index === -1) return;

    await this._context.handler.removeSlicePlane?.(
      this._context.vrContext,
      planeId
    );

    this._planes.splice(index, 1);

    if (this._activePlane?.id === planeId) {
      this._activePlane = this._planes[0] || null;
    }
  }

  /**
   * Clear all planes
   */
  async clearPlanes() {
    for (const plane of this._planes) {
      await this._context.handler.removeSlicePlane?.(
        this._context.vrContext,
        plane.id
      );
    }
    this._planes = [];
    this._activePlane = null;
  }
}

export default VRSlicePlaneTool;
