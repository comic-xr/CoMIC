// src/core/vr/VRIsolationMode.js
// Manages room-scale isolation mode for deep VR analysis

// Isolation Mode:
// - Pull single view to room-scale
// - User can physically walk around the 3D model
// - Other VR users appear as avatars in the same space
// - Desktop users' cursors visible as floating rays/dots

import { vr as log } from "@Utils/logger.js";

/**
 * VRIsolationMode - Room-scale single view mode
 *
 * When user "grabs" a view in grid mode, it scales up to room size.
 * The user can then physically walk around the 3D model.
 *
 * Features:
 * - Scale up view to comfortable room-scale size
 * - Position model at center of play space
 * - Show other users as avatars
 * - Project desktop cursors into 3D space
 * - Provide "return to grid" gesture/button
 */
export class VRIsolationMode {
  constructor(options = {}) {
    // Configuration
    this._defaultScale = options.defaultScale || 2.0; // Room-scale multiplier
    this._minScale = options.minScale || 0.5;
    this._maxScale = options.maxScale || 10.0;
    this._modelHeight = options.modelHeight || 1.2; // meters above floor

    // State
    this._isolatedViewId = null;
    this._isolatedViewConfig = null;
    this._currentScale = this._defaultScale;
    this._modelPosition = { x: 0, y: this._modelHeight, z: -1.5 };
    this._modelRotation = { x: 0, y: 0, z: 0, w: 1 };

    // Transition state
    this._isTransitioning = false;
    this._transitionProgress = 0;
    this._transitionTimer = null;
    this._gridState = null;
    this._viewBounds = { width: 1.6, height: 1.0, depth: 0.15 };
    this._projectedDesktopCursors = new Map();

    // Event listeners
    this._listeners = {
      scaleChanged: [],
      positionChanged: [],
      transitionStart: [],
      transitionEnd: [],
    };
  }

  // ===========================================================================
  // ISOLATION LIFECYCLE
  // ===========================================================================

  /**
   * Isolate a view - scale it up to room size
   *
   * @param {ViewConfiguration} viewConfig - The view to isolate
   * @param {Object} options - Isolation options
   */
  isolateView(viewConfig, options = {}) {
    if (!viewConfig?.id) {
      throw new Error("VRIsolationMode.isolateView requires a valid view configuration");
    }

    this._clearTransitionTimer();

    const transitionMs = options.transitionMs ?? 500;
    const nextPosition = {
      x: options.x ?? 0,
      y: options.y ?? this._modelHeight,
      z: options.z ?? -1.5,
    };
    const nextRotation = options.rotation || { x: 0, y: 0, z: 0, w: 1 };
    const bounds = this._deriveViewBounds(viewConfig, options);

    this._gridState = options.gridState || {
      hiddenViewIds: Array.isArray(options.hiddenViewIds) ? [...options.hiddenViewIds] : [],
      previousViewId: this._isolatedViewId,
      previousTransform: this.getModelTransform(),
    };
    this._isolatedViewId = viewConfig.id;
    this._isolatedViewConfig = viewConfig;
    this._currentScale = options.scale || this._defaultScale;
    this._modelPosition = nextPosition;
    this._modelRotation = { ...nextRotation };
    this._viewBounds = bounds;
    this._projectedDesktopCursors.clear();

    this._emit("transitionStart", {
      viewId: viewConfig.id,
      type: "enter",
      transitionMs,
      bounds,
      transform: this.getModelTransform(),
    });
    this._emit("scaleChanged", { scale: this._currentScale });
    this._emit("positionChanged", { position: this._modelPosition });

    this._isTransitioning = true;
    this._transitionTimer = setTimeout(() => {
      this._isTransitioning = false;
      this._transitionProgress = 1;
      this._emit("transitionEnd", {
        viewId: viewConfig.id,
        type: "enter",
        bounds,
        transform: this.getModelTransform(),
      });
      this._transitionTimer = null;
    }, transitionMs);

    log.debug(`Isolated view: ${viewConfig.id} at scale ${this._currentScale}`);
    return this.getState();
  }

  /**
   * Return to grid view
   */
  returnToGrid() {
    if (!this._isolatedViewId) {
      log.warn("Not in isolation mode");
      return this.getState();
    }

    this._clearTransitionTimer();

    const viewId = this._isolatedViewId;
    const transitionMs = 350;
    const previousGridState = this._gridState;

    this._emit("transitionStart", {
      viewId,
      type: "exit",
      transitionMs,
      gridState: previousGridState,
    });

    this._isTransitioning = true;
    this._transitionTimer = setTimeout(() => {
      this._isolatedViewId = null;
      this._isolatedViewConfig = null;
      this._isTransitioning = false;
      this._transitionProgress = 0;
      this._projectedDesktopCursors.clear();

      const previousTransform = previousGridState?.previousTransform;
      if (previousTransform) {
        this._modelPosition = { ...previousTransform.position };
        this._modelRotation = { ...previousTransform.rotation };
        this._currentScale = previousTransform.scale?.x || this._defaultScale;
      } else {
        this.resetPosition();
        this._currentScale = this._defaultScale;
      }
      this._gridState = null;

      this._emit("transitionEnd", {
        viewId,
        type: "exit",
        transform: this.getModelTransform(),
      });
      this._emit("scaleChanged", { scale: this._currentScale });
      this._emit("positionChanged", { position: this._modelPosition });
      this._transitionTimer = null;
    }, transitionMs);

    log.debug("Returning to grid view");
    return this.getState();
  }

  // ===========================================================================
  // SCALE & POSITION MANIPULATION
  // ===========================================================================

  /**
   * Set model scale
   * @param {number} scale - New scale multiplier
   */
  setScale(scale) {
    const clampedScale = Math.max(
      this._minScale,
      Math.min(this._maxScale, scale)
    );
    this._currentScale = clampedScale;
    this._emit("scaleChanged", { scale: clampedScale });
  }

  /**
   * Adjust scale relative to current
   * @param {number} delta - Scale change (positive = bigger)
   */
  adjustScale(delta) {
    this.setScale(this._currentScale + delta);
  }

  /**
   * Reset to default scale
   */
  resetScale() {
    this.setScale(this._defaultScale);
  }

  /**
   * Set model position
   * @param {Object} position - { x, y, z }
   */
  setPosition(position) {
    this._modelPosition = { ...this._modelPosition, ...position };
    this._emit("positionChanged", { position: this._modelPosition });
  }

  /**
   * Set model rotation
   * @param {Object} rotation - { x, y, z, w } quaternion
   */
  setRotation(rotation) {
    this._modelRotation = { ...this._modelRotation, ...rotation };
  }

  /**
   * Reset model to default position
   */
  resetPosition() {
    this._modelPosition = { x: 0, y: this._modelHeight, z: -1.5 };
    this._modelRotation = { x: 0, y: 0, z: 0, w: 1 };
    this._emit("positionChanged", { position: this._modelPosition });
  }

  // ===========================================================================
  // CURSOR PROJECTION
  // ===========================================================================

  /**
   * Project a desktop user's 2D cursor to 3D position in isolated view
   *
   * @param {string} userId - The desktop user's ID
   * @param {Object} screenPos - { x, y } normalized screen position (0-1)
   * @param {Object} viewBounds - View bounds in screen space
   * @returns {Object} - { x, y, z } world position for the cursor dot
   */
  projectDesktopCursor(userId, screenPos, viewBounds) {
    if (!userId || !screenPos) {
      return null;
    }

    const bounds = this._deriveViewBounds(this._isolatedViewConfig, viewBounds || {});
    const clampedX = Math.min(Math.max(screenPos.x ?? 0.5, 0), 1);
    const clampedY = Math.min(Math.max(screenPos.y ?? 0.5, 0), 1);
    const scaledWidth = bounds.width * this._currentScale;
    const scaledHeight = bounds.height * this._currentScale;

    const projected = {
      userId,
      x: this._modelPosition.x + (clampedX - 0.5) * scaledWidth,
      y: this._modelPosition.y + (0.5 - clampedY) * scaledHeight,
      z: this._modelPosition.z + bounds.depth / 2 + 0.03,
      screenPos: { x: clampedX, y: clampedY },
      viewId: this._isolatedViewId,
    };

    this._projectedDesktopCursors.set(userId, projected);
    return projected;
  }

  /**
   * Get 3D position for a VR user's controller intersection with the model
   *
   * @param {Object} ray - { origin: Vector3, direction: Vector3 }
   * @returns {Object|null} - Intersection point or null
   */
  getControllerIntersection(ray) {
    if (!ray?.origin || !ray?.direction) {
      return null;
    }

    const directionZ = ray.direction.z || 0;
    if (Math.abs(directionZ) < 1e-5) {
      return null;
    }

    const planeZ = this._modelPosition.z;
    const t = (planeZ - ray.origin.z) / directionZ;
    if (t <= 0) {
      return null;
    }

    const x = ray.origin.x + ray.direction.x * t;
    const y = ray.origin.y + ray.direction.y * t;
    const scaledWidth = this._viewBounds.width * this._currentScale;
    const scaledHeight = this._viewBounds.height * this._currentScale;
    const halfWidth = scaledWidth / 2;
    const halfHeight = scaledHeight / 2;

    if (
      x < this._modelPosition.x - halfWidth ||
      x > this._modelPosition.x + halfWidth ||
      y < this._modelPosition.y - halfHeight ||
      y > this._modelPosition.y + halfHeight
    ) {
      return null;
    }

    return {
      x,
      y,
      z: planeZ,
      u: (x - (this._modelPosition.x - halfWidth)) / scaledWidth,
      v: 1 - (y - (this._modelPosition.y - halfHeight)) / scaledHeight,
      normal: { x: 0, y: 0, z: 1 },
      viewId: this._isolatedViewId,
    };
  }

  getProjectedDesktopCursor(userId) {
    return this._projectedDesktopCursors.get(userId) || null;
  }

  getProjectedDesktopCursors() {
    return Array.from(this._projectedDesktopCursors.values());
  }

  getViewPlaneBounds() {
    return {
      ...this._viewBounds,
      width: this._viewBounds.width * this._currentScale,
      height: this._viewBounds.height * this._currentScale,
    };
  }

  // ===========================================================================
  // STATE GETTERS
  // ===========================================================================

  /**
   * Get current isolation state
   */
  getState() {
    return {
      isIsolated: this._isolatedViewId !== null,
      viewId: this._isolatedViewId,
      scale: this._currentScale,
      position: { ...this._modelPosition },
      rotation: { ...this._modelRotation },
      isTransitioning: this._isTransitioning,
      bounds: this.getViewPlaneBounds(),
      projectedDesktopCursors: this.getProjectedDesktopCursors(),
      gridState: this._gridState ? { ...this._gridState } : null,
    };
  }

  /**
   * Check if currently isolating a view
   */
  isIsolated() {
    return this._isolatedViewId !== null;
  }

  /**
   * Get isolated view ID
   */
  getIsolatedViewId() {
    return this._isolatedViewId;
  }

  /**
   * Get current scale
   */
  getScale() {
    return this._currentScale;
  }

  /**
   * Get model transform for rendering
   */
  getModelTransform() {
    return {
      position: { ...this._modelPosition },
      rotation: { ...this._modelRotation },
      scale: {
        x: this._currentScale,
        y: this._currentScale,
        z: this._currentScale,
      },
    };
  }

  // ===========================================================================
  // EVENT HANDLING
  // ===========================================================================

  on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this._listeners[event]) {
      this._listeners[event] = this._listeners[event].filter(
        (cb) => cb !== callback
      );
    }
  }

  _emit(event, data) {
    if (this._listeners[event]) {
      this._listeners[event].forEach((cb) => {
        try {
          cb(data);
        } catch (error) {
          log.error(`VRIsolationMode event error (${event}):`, error);
        }
      });
    }
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  dispose() {
    this.reset();
    Object.keys(this._listeners).forEach((event) => {
      this._listeners[event] = [];
    });
  }

  reset() {
    this._clearTransitionTimer();
    this._isolatedViewId = null;
    this._isolatedViewConfig = null;
    this._currentScale = this._defaultScale;
    this._modelPosition = { x: 0, y: this._modelHeight, z: -1.5 };
    this._modelRotation = { x: 0, y: 0, z: 0, w: 1 };
    this._isTransitioning = false;
    this._transitionProgress = 0;
    this._projectedDesktopCursors.clear();
    this._gridState = null;
  }

  _clearTransitionTimer() {
    if (this._transitionTimer) {
      clearTimeout(this._transitionTimer);
      this._transitionTimer = null;
    }
  }

  _deriveViewBounds(viewConfig, options = {}) {
    return {
      width: Math.max(options.width ?? viewConfig?.width ?? this._viewBounds.width, 0.25),
      height: Math.max(options.height ?? viewConfig?.height ?? this._viewBounds.height, 0.25),
      depth: Math.max(options.depth ?? viewConfig?.depth ?? this._viewBounds.depth, 0.02),
    };
  }
}

// Default instance
export const vrIsolationMode = new VRIsolationMode();
