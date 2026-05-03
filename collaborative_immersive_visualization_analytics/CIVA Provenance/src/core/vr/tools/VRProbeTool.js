// src/core/vr/tools/VRProbeTool.js
// Data probe tool for VR - inspect data values at positions

import { VRToolInterface } from './VRToolInterface.js';
import { vr as log } from '@Utils/logger.js';

export class VRProbeTool extends VRToolInterface {
  constructor() {
    super({
      id: 'probe',
      name: 'Probe',
      icon: 'crosshair',
      category: 'analysis',
    });

    this._probeHistory = [];
    this._currentProbe = null;
    this._continuousMode = false;
    this._maxHistorySize = 50;
  }

  async activate(context) {
    await super.activate(context);
    log.debug('Probe tool activated');
  }

  async deactivate() {
    await super.deactivate();
    this._currentProbe = null;
  }

  handleInput(inputState, frame) {
    const { controllers } = inputState;
    const rightCtrl = controllers.right;

    if (!rightCtrl) return null;

    // Continuous probing while trigger held
    if (this._continuousMode && rightCtrl.triggerValue > 0.5) {
      const hit = this._performRaycast(rightCtrl, frame);
      if (hit) {
        const probeData = this._probeAtPosition(hit.position);
        this._currentProbe = {
          position: { ...hit.position },
          data: probeData,
          timestamp: Date.now(),
        };

        return {
          type: 'probe-continuous',
          data: this._currentProbe
        };
      }
    }

    // Single probe on trigger press
    if (rightCtrl.triggerPressed && !this._lastTriggerState) {
      const hit = this._performRaycast(rightCtrl, frame);

      if (hit) {
        const probeData = this._probeAtPosition(hit.position);

        const probe = {
          id: `probe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          position: { ...hit.position },
          normal: hit.normal ? { ...hit.normal } : null,
          data: probeData,
          timestamp: Date.now(),
        };

        this._currentProbe = probe;
        this._addToHistory(probe);

        return {
          type: 'probe-created',
          data: probe
        };
      }
    }
    this._lastTriggerState = rightCtrl.triggerPressed;

    // A button to toggle continuous mode
    if (rightCtrl.buttons?.a && !this._lastAButtonState) {
      this._continuousMode = !this._continuousMode;
      this._lastAButtonState = true;

      return {
        type: 'probe-mode-changed',
        data: { continuous: this._continuousMode }
      };
    }
    this._lastAButtonState = rightCtrl.buttons?.a || false;

    // B button to clear history
    if (rightCtrl.buttons?.b && !this._lastBButtonState) {
      this._probeHistory = [];
      this._currentProbe = null;
      this._lastBButtonState = true;

      return { type: 'probe-history-cleared' };
    }
    this._lastBButtonState = rightCtrl.buttons?.b || false;

    // Thumbstick to navigate history
    const thumbstickY = rightCtrl.thumbstick?.y || 0;
    if (Math.abs(thumbstickY) > 0.8 && !this._lastThumbstickState && this._probeHistory.length > 0) {
      const currentIndex = this._currentProbe
        ? this._probeHistory.findIndex(p => p.id === this._currentProbe.id)
        : -1;

      let newIndex;
      if (thumbstickY > 0) {
        newIndex = currentIndex < this._probeHistory.length - 1 ? currentIndex + 1 : 0;
      } else {
        newIndex = currentIndex > 0 ? currentIndex - 1 : this._probeHistory.length - 1;
      }

      this._currentProbe = this._probeHistory[newIndex];
      this._lastThumbstickState = true;

      return {
        type: 'probe-history-navigated',
        data: this._currentProbe
      };
    }
    if (Math.abs(thumbstickY) < 0.3) {
      this._lastThumbstickState = false;
    }

    return null;
  }

  getControllerHints() {
    return {
      left: {},
      right: {
        trigger: this._continuousMode ? 'Probe (hold)' : 'Probe',
        thumbstick: 'Navigate history',
        a: this._continuousMode ? 'Single mode' : 'Continuous mode',
        b: 'Clear history',
      },
    };
  }

  _probeAtPosition(position) {
    // Delegate to handler to get actual data values
    const probeResult = this._context.handler.probeDataVR?.(
      this._context.vrContext,
      position
    );

    if (probeResult) {
      return probeResult;
    }

    // Fallback data
    return {
      position: { ...position },
      value: null,
      arrayName: null,
      pointId: null,
      cellId: null,
    };
  }

  _performRaycast(controller, frame) {
    if (!controller?.targetRay) return null;

    return this._context.handler.raycastVR?.(
      this._context.vrContext,
      controller.targetRay
    );
  }

  _addToHistory(probe) {
    this._probeHistory.push(probe);

    // Trim history if too long
    if (this._probeHistory.length > this._maxHistorySize) {
      this._probeHistory.shift();
    }
  }

  /**
   * Get current probe
   */
  getCurrentProbe() {
    return this._currentProbe;
  }

  /**
   * Get probe history
   */
  getProbeHistory() {
    return this._probeHistory;
  }

  /**
   * Check if in continuous mode
   */
  isContinuousMode() {
    return this._continuousMode;
  }

  /**
   * Set continuous mode
   */
  setContinuousMode(enabled) {
    this._continuousMode = enabled;
  }

  /**
   * Clear probe history
   */
  clearHistory() {
    this._probeHistory = [];
    this._currentProbe = null;
  }

  /**
   * Export probe history for analysis
   */
  exportHistory() {
    return this._probeHistory.map(probe => ({
      id: probe.id,
      position: probe.position,
      data: probe.data,
      timestamp: probe.timestamp,
    }));
  }
}

export default VRProbeTool;
