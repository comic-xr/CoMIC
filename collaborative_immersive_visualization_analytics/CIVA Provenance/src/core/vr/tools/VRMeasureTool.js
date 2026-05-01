// src/core/vr/tools/VRMeasureTool.js
// Distance measurement tool for VR

import { VRToolInterface } from './VRToolInterface.js';
import { vr as log } from '@Utils/logger.js';

export class VRMeasureTool extends VRToolInterface {
  constructor() {
    super({
      id: 'measure',
      name: 'Measure',
      icon: 'ruler',
      category: 'analysis',
    });

    this._measurements = [];
    this._activeMeasurement = null;
    this._measurementState = 'idle'; // 'idle' | 'placing-start' | 'placing-end'
  }

  async activate(context) {
    await super.activate(context);
    this._measurementState = 'placing-start';
    log.debug('Measure tool activated');
  }

  async deactivate() {
    await super.deactivate();
    this._measurementState = 'idle';
    this._activeMeasurement = null;
  }

  handleInput(inputState, frame) {
    const { controllers } = inputState;
    const rightCtrl = controllers.right;

    if (!rightCtrl) return null;

    // Trigger to place measurement points
    if (rightCtrl.triggerPressed && !this._lastTriggerState) {
      const hit = this._performRaycast(rightCtrl, frame);

      if (hit) {
        if (this._measurementState === 'placing-start') {
          // Start new measurement
          this._activeMeasurement = {
            id: `measure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            startPoint: { ...hit.position },
            endPoint: null,
            distance: 0,
            unit: 'units',
          };
          this._measurementState = 'placing-end';

          return {
            type: 'measurement-start-placed',
            data: this._activeMeasurement
          };

        } else if (this._measurementState === 'placing-end') {
          // Complete measurement
          this._activeMeasurement.endPoint = { ...hit.position };
          this._activeMeasurement.distance = this._calculateDistance(
            this._activeMeasurement.startPoint,
            this._activeMeasurement.endPoint
          );

          this._measurements.push(this._activeMeasurement);

          const completedMeasurement = { ...this._activeMeasurement };

          // Reset for next measurement
          this._activeMeasurement = null;
          this._measurementState = 'placing-start';

          return {
            type: 'measurement-created',
            data: completedMeasurement
          };
        }
      }
    }
    this._lastTriggerState = rightCtrl.triggerPressed;

    // B button to cancel current measurement
    if (rightCtrl.buttons?.b && this._measurementState === 'placing-end') {
      this._activeMeasurement = null;
      this._measurementState = 'placing-start';
      return { type: 'measurement-cancelled' };
    }

    // Update preview line if placing end point
    if (this._measurementState === 'placing-end' && this._activeMeasurement) {
      const hit = this._performRaycast(rightCtrl, frame);
      if (hit) {
        const previewDistance = this._calculateDistance(
          this._activeMeasurement.startPoint,
          hit.position
        );
        return {
          type: 'measurement-preview',
          data: {
            startPoint: this._activeMeasurement.startPoint,
            endPoint: hit.position,
            distance: previewDistance,
          }
        };
      }
    }

    return null;
  }

  getControllerHints() {
    const hints = {
      left: {},
      right: {
        trigger: this._measurementState === 'placing-start'
          ? 'Place start point'
          : 'Place end point',
      },
    };

    if (this._measurementState === 'placing-end') {
      hints.right.b = 'Cancel';
    }

    return hints;
  }

  _calculateDistance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  _performRaycast(controller, frame) {
    if (!controller?.targetRay) return null;

    return this._context.handler.raycastVR?.(
      this._context.vrContext,
      controller.targetRay
    );
  }

  /**
   * Get all measurements
   */
  getMeasurements() {
    return this._measurements;
  }

  /**
   * Remove a measurement
   */
  removeMeasurement(measurementId) {
    const index = this._measurements.findIndex(m => m.id === measurementId);
    if (index !== -1) {
      this._measurements.splice(index, 1);
    }
  }

  /**
   * Clear all measurements
   */
  clearMeasurements() {
    this._measurements = [];
  }

  /**
   * Get current measurement state
   */
  getMeasurementState() {
    return this._measurementState;
  }
}

export default VRMeasureTool;
