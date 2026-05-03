// src/core/vr/tools/VRClipBoxTool.js
// Clipping box tool for VR - define region of interest

import { VRToolInterface } from './VRToolInterface.js';
import { vr as log } from '@Utils/logger.js';

export class VRClipBoxTool extends VRToolInterface {
  constructor() {
    super({
      id: 'clip',
      name: 'Clip Box',
      icon: 'box',
      category: 'visualization',
    });

    this._clipBox = null;
    this._grabbedFace = null;
    this._initialGrabPose = null;
    this._initialBounds = null;
  }

  async activate(context) {
    await super.activate(context);

    // Create initial clip box from data bounds
    const bounds = context.vrContext.dataBounds;
    if (bounds && !this._clipBox) {
      this._clipBox = {
        id: `clipbox_${Date.now()}`,
        bounds: [...bounds], // [xMin, xMax, yMin, yMax, zMin, zMax]
        visible: true,
        inverted: false, // false = show inside, true = show outside
      };

      // Notify handler
      await context.handler.setClipBox?.(context.vrContext, this._clipBox);
    }

    log.debug('Clip box tool activated');
  }

  async deactivate() {
    await super.deactivate();
    this._grabbedFace = null;
  }

  handleInput(inputState, frame) {
    const { controllers } = inputState;

    if (!this._clipBox) return null;

    // Check for grab on clip box faces
    if (!this._grabbedFace) {
      for (const hand of ['left', 'right']) {
        const ctrl = controllers[hand];
        if (ctrl?.squeezePressed) {
          const face = this._detectFaceGrab(ctrl.pose);
          if (face) {
            this._grabbedFace = { face, hand };
            this._initialGrabPose = this._clonePose(ctrl.pose);
            this._initialBounds = [...this._clipBox.bounds];
            return { type: 'clip-grab-start', face };
          }
        }
      }
    }

    // Handle active grab
    if (this._grabbedFace) {
      const ctrl = controllers[this._grabbedFace.hand];

      if (!ctrl?.squeezePressed) {
        // Released
        this._grabbedFace = null;
        return { type: 'clip-grab-end', bounds: this._clipBox.bounds };
      }

      // Update bounds based on drag
      const delta = this._computePoseDelta(this._initialGrabPose, ctrl.pose);
      this._updateBoundsFromDrag(this._grabbedFace.face, delta);

      // Notify handler
      this._context.handler.updateClipBox?.(this._context.vrContext, this._clipBox);

      return { type: 'clip-box-updated', data: this._clipBox };
    }

    // Thumbstick to uniformly scale clip box
    const right = controllers.right;
    if (right && Math.abs(right.thumbstick?.y) > 0.1) {
      const scaleSpeed = 0.01;
      const scaleFactor = 1 + right.thumbstick.y * scaleSpeed;
      this._scaleClipBox(scaleFactor);

      this._context.handler.updateClipBox?.(this._context.vrContext, this._clipBox);

      return { type: 'clip-box-updated', data: this._clipBox };
    }

    // A button to toggle inversion
    if (right?.buttons?.a && !this._lastAButtonState) {
      this._clipBox.inverted = !this._clipBox.inverted;
      this._context.handler.updateClipBox?.(this._context.vrContext, this._clipBox);

      this._lastAButtonState = true;
      return {
        type: 'clip-inversion-toggled',
        data: { inverted: this._clipBox.inverted }
      };
    }
    this._lastAButtonState = right?.buttons?.a || false;

    // B button to reset to data bounds
    if (right?.buttons?.b && !this._lastBButtonState) {
      const dataBounds = this._context.vrContext.dataBounds;
      if (dataBounds) {
        this._clipBox.bounds = [...dataBounds];
        this._context.handler.updateClipBox?.(this._context.vrContext, this._clipBox);

        this._lastBButtonState = true;
        return { type: 'clip-box-reset', data: this._clipBox };
      }
    }
    this._lastBButtonState = right?.buttons?.b || false;

    return null;
  }

  getControllerHints() {
    return {
      left: {
        grip: 'Grab face to resize',
      },
      right: {
        grip: 'Grab face to resize',
        thumbstick: 'Scale box',
        a: this._clipBox?.inverted ? 'Show inside' : 'Show outside',
        b: 'Reset to bounds',
      },
    };
  }

  _detectFaceGrab(pose) {
    if (!pose || !this._clipBox) return null;

    const pos = pose.position;
    const bounds = this._clipBox.bounds;
    const threshold = 0.1; // 10cm grab threshold

    // Check each face
    const faces = [
      { name: 'xMin', axis: 0, value: bounds[0], normal: [-1, 0, 0] },
      { name: 'xMax', axis: 0, value: bounds[1], normal: [1, 0, 0] },
      { name: 'yMin', axis: 1, value: bounds[2], normal: [0, -1, 0] },
      { name: 'yMax', axis: 1, value: bounds[3], normal: [0, 1, 0] },
      { name: 'zMin', axis: 2, value: bounds[4], normal: [0, 0, -1] },
      { name: 'zMax', axis: 2, value: bounds[5], normal: [0, 0, 1] },
    ];

    const posArr = [pos.x, pos.y, pos.z];

    for (const face of faces) {
      // Check if position is near the face
      const distToFace = Math.abs(posArr[face.axis] - face.value);
      if (distToFace < threshold) {
        // Check if within the other bounds
        const otherAxes = [0, 1, 2].filter(a => a !== face.axis);
        const inBounds = otherAxes.every(axis => {
          const min = bounds[axis * 2];
          const max = bounds[axis * 2 + 1];
          return posArr[axis] >= min - threshold && posArr[axis] <= max + threshold;
        });

        if (inBounds) {
          return face.name;
        }
      }
    }

    return null;
  }

  _updateBoundsFromDrag(faceName, delta) {
    const faceMap = {
      xMin: 0, xMax: 1,
      yMin: 2, yMax: 3,
      zMin: 4, zMax: 5,
    };

    const axisMap = {
      xMin: 'x', xMax: 'x',
      yMin: 'y', yMax: 'y',
      zMin: 'z', zMax: 'z',
    };

    const boundsIndex = faceMap[faceName];
    const axis = axisMap[faceName];
    const movement = delta.position[axis];

    this._clipBox.bounds[boundsIndex] = this._initialBounds[boundsIndex] + movement;

    // Ensure min < max
    const isMin = boundsIndex % 2 === 0;
    if (isMin) {
      const maxIndex = boundsIndex + 1;
      if (this._clipBox.bounds[boundsIndex] > this._clipBox.bounds[maxIndex] - 0.01) {
        this._clipBox.bounds[boundsIndex] = this._clipBox.bounds[maxIndex] - 0.01;
      }
    } else {
      const minIndex = boundsIndex - 1;
      if (this._clipBox.bounds[boundsIndex] < this._clipBox.bounds[minIndex] + 0.01) {
        this._clipBox.bounds[boundsIndex] = this._clipBox.bounds[minIndex] + 0.01;
      }
    }
  }

  _scaleClipBox(factor) {
    const bounds = this._clipBox.bounds;
    const center = [
      (bounds[0] + bounds[1]) / 2,
      (bounds[2] + bounds[3]) / 2,
      (bounds[4] + bounds[5]) / 2,
    ];

    for (let i = 0; i < 6; i++) {
      const axis = Math.floor(i / 2);
      const diff = bounds[i] - center[axis];
      this._clipBox.bounds[i] = center[axis] + diff * factor;
    }
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
    };
  }

  /**
   * Get current clip box
   */
  getClipBox() {
    return this._clipBox;
  }

  /**
   * Set clip box visibility
   */
  setVisible(visible) {
    if (this._clipBox) {
      this._clipBox.visible = visible;
      this._context.handler.updateClipBox?.(this._context.vrContext, this._clipBox);
    }
  }

  /**
   * Disable clip box
   */
  async disable() {
    if (this._clipBox) {
      await this._context.handler.removeClipBox?.(this._context.vrContext);
      this._clipBox = null;
    }
  }
}

export default VRClipBoxTool;
