// src/core/instances/types/vtk/utils/cameraUtils.js
// VTK-specific camera utilities
//
// This file contains VTK-specific code that was previously in useBookmarks.js
// Camera capture is instance-type-specific, so it belongs in the VTK plugin.
//
// Usage (in VTK-aware code only):
//   import { captureCameraState, applyCameraState } from '@VTK/utils/cameraUtils.js';

import { instance as log } from "@Utils/logger.js";

/**
 * Capture current camera state from a VTK renderer
 *
 * Call this when creating a bookmark to capture the current view.
 * This is VTK-specific - other instance types will have their own capture methods.
 *
 * @param {Object} renderer - VTK renderer instance
 * @returns {Object|null} Camera state object or null if capture fails
 *
 * @example
 * // In a VTK-aware component or handler:
 * const cameraState = captureCameraState(sceneObjects.renderer);
 * await createBookmark({ name: 'My View', camera_state: cameraState });
 */
export function captureCameraState(renderer) {
  if (!renderer) {
    log.warn("No renderer provided to captureCameraState");
    return null;
  }

  try {
    const camera = renderer.getActiveCamera?.();
    if (!camera) {
      log.warn("No active camera found");
      return null;
    }

    return {
      position: camera.getPosition?.() || [0, 0, 1],
      focalPoint: camera.getFocalPoint?.() || [0, 0, 0],
      viewUp: camera.getViewUp?.() || [0, 1, 0],
      viewAngle: camera.getViewAngle?.() || 30,
      parallelScale: camera.getParallelScale?.() || 1,
      clippingRange: camera.getClippingRange?.() || [0.1, 1000],
    };
  } catch (error) {
    log.error("Failed to capture camera state:", error);
    return null;
  }
}

/**
 * Apply a saved camera state to a VTK renderer
 *
 * @param {Object} renderer - VTK renderer instance
 * @param {Object} cameraState - Saved camera state object
 * @param {Object} options - Options
 * @param {boolean} options.animate - Whether to animate the transition (future)
 * @returns {boolean} True if applied successfully
 *
 * @example
 * applyCameraState(sceneObjects.renderer, bookmark.cameraState);
 * sceneObjects.renderWindow.render();
 */
export function applyCameraState(renderer, cameraState, options = {}) {
  if (!renderer || !cameraState) {
    log.warn("Missing renderer or cameraState");
    return false;
  }

  try {
    const camera = renderer.getActiveCamera?.();
    if (!camera) {
      log.warn("No active camera found");
      return false;
    }

    // Apply position
    if (cameraState.position) {
      camera.setPosition(...cameraState.position);
    }

    // Apply focal point (some legacy bookmarks use 'target')
    const focalPoint = cameraState.focalPoint || cameraState.target;
    if (focalPoint) {
      camera.setFocalPoint(...focalPoint);
    }

    // Apply view up vector
    if (cameraState.viewUp || cameraState.up) {
      camera.setViewUp(...(cameraState.viewUp || cameraState.up));
    }

    // Apply projection parameters
    if (cameraState.viewAngle !== undefined) {
      camera.setViewAngle(cameraState.viewAngle);
    }

    if (cameraState.parallelScale !== undefined) {
      camera.setParallelScale(cameraState.parallelScale);
    }

    if (cameraState.clippingRange) {
      camera.setClippingRange(...cameraState.clippingRange);
    }

    // Reset clipping range to ensure proper rendering
    renderer.resetCameraClippingRange();

    log.debug("Camera state applied successfully");
    return true;
  } catch (error) {
    log.error("Failed to apply camera state:", error);
    return false;
  }
}

/**
 * Interpolate between two camera states (for smooth transitions)
 *
 * @param {Object} fromState - Starting camera state
 * @param {Object} toState - Target camera state
 * @param {number} t - Interpolation factor (0 to 1)
 * @returns {Object} Interpolated camera state
 */
export function interpolateCameraState(fromState, toState, t) {
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpArray = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));

  return {
    position: lerpArray(fromState.position, toState.position, t),
    focalPoint: lerpArray(
      fromState.focalPoint || fromState.target,
      toState.focalPoint || toState.target,
      t
    ),
    viewUp: lerpArray(
      fromState.viewUp || fromState.up,
      toState.viewUp || toState.up,
      t
    ),
    viewAngle: lerp(fromState.viewAngle || 30, toState.viewAngle || 30, t),
    parallelScale: lerp(
      fromState.parallelScale || 1,
      toState.parallelScale || 1,
      t
    ),
  };
}

/**
 * Check if two camera states are approximately equal
 *
 * @param {Object} stateA - First camera state
 * @param {Object} stateB - Second camera state
 * @param {number} tolerance - Comparison tolerance (default 0.001)
 * @returns {boolean} True if states are approximately equal
 */
export function camerasEqual(stateA, stateB, tolerance = 0.001) {
  if (!stateA || !stateB) return false;

  const arraysEqual = (a, b) => {
    if (!a || !b || a.length !== b.length) return false;
    return a.every((v, i) => Math.abs(v - b[i]) < tolerance);
  };

  return (
    arraysEqual(stateA.position, stateB.position) &&
    arraysEqual(
      stateA.focalPoint || stateA.target,
      stateB.focalPoint || stateB.target
    ) &&
    arraysEqual(stateA.viewUp || stateA.up, stateB.viewUp || stateB.up)
  );
}

// =============================================================================
// EASING FUNCTIONS
// =============================================================================

/**
 * Collection of easing functions for smooth camera animations
 */
export const EASING_FUNCTIONS = {
  linear: (t) => t,
  easeInOut: (t) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeIn: (t) => t * t * t,
  bounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

// =============================================================================
// ANIMATED CAMERA TRANSITIONS
// =============================================================================

/**
 * Animate camera to a target state with easing
 *
 * @param {Object} renderer - VTK renderer instance
 * @param {Object} renderWindow - VTK renderWindow instance
 * @param {Object} targetState - Target camera state
 * @param {Object} options - Animation options
 * @param {number} options.duration - Animation duration in ms (default: 500)
 * @param {string} options.easing - Easing function name (default: 'easeInOut')
 * @param {Function} options.onProgress - Called each frame with progress (0-1)
 * @param {Function} options.onComplete - Called when animation completes
 * @returns {Function} Cancel function to stop the animation
 *
 * @example
 * const cancel = flyTo(renderer, renderWindow, targetCameraState, {
 *   duration: 500,
 *   easing: 'easeOut',
 *   onComplete: () => console.log('Animation done'),
 * });
 * // To cancel mid-animation:
 * cancel();
 */
export function flyTo(renderer, renderWindow, targetState, options = {}) {
  const {
    duration = 500,
    easing = "easeInOut",
    onProgress = null,
    onComplete = null,
  } = options;

  if (!renderer || !renderWindow || !targetState) {
    log.warn("flyTo: Missing required parameters");
    return () => {};
  }

  const camera = renderer.getActiveCamera?.();
  if (!camera) {
    log.warn("flyTo: No active camera found");
    return () => {};
  }

  // Capture starting state
  const fromState = captureCameraState(renderer);
  if (!fromState) {
    log.warn("flyTo: Could not capture starting camera state");
    return () => {};
  }

  // Get easing function
  const easingFn = EASING_FUNCTIONS[easing] || EASING_FUNCTIONS.easeInOut;

  // Animation state
  let startTime = null;
  let animationId = null;
  let cancelled = false;

  const animate = (timestamp) => {
    if (cancelled) return;

    if (!startTime) startTime = timestamp;

    const elapsed = timestamp - startTime;
    const rawT = Math.min(elapsed / duration, 1);
    const t = easingFn(rawT);

    // Interpolate camera state
    const currentState = interpolateCameraState(fromState, targetState, t);

    // Apply to camera
    camera.setPosition(...currentState.position);
    camera.setFocalPoint(...currentState.focalPoint);
    camera.setViewUp(...currentState.viewUp);
    if (currentState.viewAngle !== undefined) {
      camera.setViewAngle(currentState.viewAngle);
    }
    if (currentState.parallelScale !== undefined) {
      camera.setParallelScale(currentState.parallelScale);
    }

    // Reset clipping range for proper rendering
    renderer.resetCameraClippingRange();
    renderWindow.render();

    // Progress callback
    if (onProgress) {
      onProgress(rawT);
    }

    // Continue or complete
    if (rawT < 1) {
      animationId = requestAnimationFrame(animate);
    } else {
      if (onComplete) {
        onComplete();
      }
    }
  };

  // Start animation
  animationId = requestAnimationFrame(animate);

  // Return cancel function
  return () => {
    cancelled = true;
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  };
}

/**
 * Standard view camera configurations
 * Returns target camera state for a given standard view
 *
 * @param {Object} renderer - VTK renderer to get bounds from
 * @param {string} view - View name: 'front', 'back', 'top', 'bottom', 'left', 'right', 'isometric'
 * @returns {Object|null} Target camera state or null if view is unknown
 */
export function getStandardViewState(renderer, view) {
  if (!renderer) return null;

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
  const distance = diagonal * 1.5;

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
      viewUp: [0, 0, -1],
    },
    bottom: {
      position: [center[0], center[1] - distance, center[2]],
      focalPoint: center,
      viewUp: [0, 0, 1],
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
    iso: {
      position: [
        center[0] + distance * 0.7,
        center[1] + distance * 0.7,
        center[2] + distance * 0.7,
      ],
      focalPoint: center,
      viewUp: [0, 1, 0],
    },
  };

  return views[view] || null;
}

export default {
  captureCameraState,
  applyCameraState,
  interpolateCameraState,
  camerasEqual,
  flyTo,
  getStandardViewState,
  EASING_FUNCTIONS,
};
