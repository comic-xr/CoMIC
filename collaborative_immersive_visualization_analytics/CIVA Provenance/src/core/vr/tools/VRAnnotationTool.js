// src/core/vr/tools/VRAnnotationTool.js
// Annotation tool for VR - place markers and text annotations

import { VRToolInterface } from './VRToolInterface.js';
import { vr as log } from '@Utils/logger.js';

export class VRAnnotationTool extends VRToolInterface {
  constructor() {
    super({
      id: 'annotate',
      name: 'Annotate',
      icon: 'message-circle',
      category: 'collaboration',
    });

    this._annotations = [];
    this._pendingAnnotation = null;
    this._annotationMode = 'marker'; // 'marker' | 'text' | 'drawing'
  }

  async activate(context) {
    await super.activate(context);
    log.debug('Annotation tool activated');
  }

  async deactivate() {
    await super.deactivate();
    this._pendingAnnotation = null;
  }

  handleInput(inputState, frame) {
    const { controllers } = inputState;
    const rightCtrl = controllers.right;

    if (!rightCtrl) return null;

    // Trigger to place annotation
    if (rightCtrl.triggerPressed && !this._lastTriggerState) {
      const hit = this._performRaycast(rightCtrl, frame);

      if (hit) {
        const annotation = this._createAnnotation(hit);
        this._annotations.push(annotation);

        return {
          type: 'annotation-created',
          data: annotation
        };
      }
    }
    this._lastTriggerState = rightCtrl.triggerPressed;

    // Thumbstick to cycle annotation types
    const thumbstickX = rightCtrl.thumbstick?.x || 0;
    if (Math.abs(thumbstickX) > 0.8 && !this._lastThumbstickState) {
      if (thumbstickX > 0) {
        this._cycleAnnotationMode(1);
      } else {
        this._cycleAnnotationMode(-1);
      }
      return {
        type: 'annotation-mode-changed',
        data: { mode: this._annotationMode }
      };
    }
    this._lastThumbstickState = Math.abs(thumbstickX) > 0.8;

    // A button to undo last annotation
    if (rightCtrl.buttons?.a && !this._lastAButtonState) {
      if (this._annotations.length > 0) {
        const removed = this._annotations.pop();
        return {
          type: 'annotation-removed',
          data: removed
        };
      }
    }
    this._lastAButtonState = rightCtrl.buttons?.a || false;

    return null;
  }

  getControllerHints() {
    return {
      left: {},
      right: {
        trigger: `Place ${this._annotationMode}`,
        thumbstick: 'Change annotation type',
        a: 'Undo last',
      },
    };
  }

  _createAnnotation(hit) {
    const annotation = {
      id: `annot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: this._annotationMode,
      position: { ...hit.position },
      normal: hit.normal ? { ...hit.normal } : null,
      timestamp: Date.now(),
      text: '',
      color: this._getAnnotationColor(),
    };

    // Add type-specific data
    switch (this._annotationMode) {
      case 'marker':
        annotation.size = 0.02; // 2cm marker
        break;
      case 'text':
        annotation.text = 'Note'; // Placeholder - would use voice input
        annotation.fontSize = 0.05;
        break;
      case 'drawing':
        annotation.points = [hit.position];
        annotation.strokeWidth = 0.005;
        break;
    }

    return annotation;
  }

  _cycleAnnotationMode(direction) {
    const modes = ['marker', 'text', 'drawing'];
    const currentIndex = modes.indexOf(this._annotationMode);
    const newIndex = (currentIndex + direction + modes.length) % modes.length;
    this._annotationMode = modes[newIndex];
  }

  _getAnnotationColor() {
    // Get user color from context or use default
    return this._context?.vrContext?.userColor || [1, 0.5, 0];
  }

  _performRaycast(controller, frame) {
    if (!controller?.targetRay) return null;

    return this._context.handler.raycastVR?.(
      this._context.vrContext,
      controller.targetRay
    );
  }

  /**
   * Get all annotations
   */
  getAnnotations() {
    return this._annotations;
  }

  /**
   * Get current annotation mode
   */
  getAnnotationMode() {
    return this._annotationMode;
  }

  /**
   * Set annotation mode
   */
  setAnnotationMode(mode) {
    if (['marker', 'text', 'drawing'].includes(mode)) {
      this._annotationMode = mode;
    }
  }

  /**
   * Remove an annotation
   */
  removeAnnotation(annotationId) {
    const index = this._annotations.findIndex(a => a.id === annotationId);
    if (index !== -1) {
      this._annotations.splice(index, 1);
    }
  }

  /**
   * Clear all annotations
   */
  clearAnnotations() {
    this._annotations = [];
  }

  /**
   * Update annotation text (for voice input)
   */
  updateAnnotationText(annotationId, text) {
    const annotation = this._annotations.find(a => a.id === annotationId);
    if (annotation) {
      annotation.text = text;
    }
  }
}

export default VRAnnotationTool;
