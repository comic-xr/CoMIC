// src/core/vr/VRGridLayout.js
// Calculates 3D positions for views in VR grid mode
//
// STUB: Structure only, implementation deferred per DEC-014
//
// Layout Style: Fiesta-style curved grid surrounding user
// Views are arranged in a curved arc so user doesn't need to turn completely around

import { vr as log } from "@Utils/logger.js";

/**
 * VRGridLayout - Curved grid layout for VR mode
 *
 * Arranges canvas placements in a curved arc around the user.
 * Handles gaze/point selection and grab-to-isolate gestures.
 *
 * Layout parameters:
 * - gridRadius: Distance from user to view panels (meters)
 * - gridCurvature: How much the grid curves (0 = flat, 1 = semicircle)
 * - viewSpacing: Gap between adjacent views
 * - viewScale: Base scale of view panels
 */
export class VRGridLayout {
  constructor(options = {}) {
    // Layout configuration
    this._gridRadius = options.gridRadius || 3.0; // meters
    this._gridCurvature = options.gridCurvature || 0.3; // 0-1
    this._viewSpacing = options.viewSpacing || 0.1; // meters between views
    this._viewScale = options.viewScale || 1.0; // base panel size multiplier

    // Vertical configuration
    this._eyeHeight = options.eyeHeight || 1.6; // meters
    this._rowHeight = options.rowHeight || 0.8; // meters per row

    // Cached positions
    this._placementPositions = new Map(); // placementId -> { position, rotation, scale }

    // Currently targeted placement (from gaze/pointer)
    this._targetedPlacementId = null;
  }

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  /**
   * Update layout parameters
   */
  setConfig(config) {
    if (config.gridRadius !== undefined) this._gridRadius = config.gridRadius;
    if (config.gridCurvature !== undefined)
      this._gridCurvature = config.gridCurvature;
    if (config.viewSpacing !== undefined)
      this._viewSpacing = config.viewSpacing;
    if (config.viewScale !== undefined) this._viewScale = config.viewScale;
    if (config.eyeHeight !== undefined) this._eyeHeight = config.eyeHeight;
    if (config.rowHeight !== undefined) this._rowHeight = config.rowHeight;

    // Clear cache to force recalculation
    this._placementPositions.clear();
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      gridRadius: this._gridRadius,
      gridCurvature: this._gridCurvature,
      viewSpacing: this._viewSpacing,
      viewScale: this._viewScale,
      eyeHeight: this._eyeHeight,
      rowHeight: this._rowHeight,
    };
  }

  // ===========================================================================
  // POSITION CALCULATION
  // ===========================================================================

  /**
   * Calculate 3D world position for a canvas placement
   *
   * @param {CanvasPlacement} placement - The placement to position
   * @param {Object} canvasDimensions - { rows, cols } of the canvas
   * @returns {{ position: Vector3, rotation: Quaternion, scale: Vector3 }}
   */
  getWorldTransform(placement, canvasDimensions) {
    log.trace("VRGridLayout.getWorldTransform() - STUB: Returning placeholder");

    // TODO: Full implementation
    // 1. Calculate horizontal angle based on column position
    // 2. Apply curvature to determine X/Z position
    // 3. Calculate Y position based on row
    // 4. Calculate rotation to face user
    // 5. Apply span-based scaling

    const { row, col, rowSpan = 1, colSpan = 1 } = placement;
    const { rows: totalRows, cols: totalCols } = canvasDimensions;

    // Calculate center position of the placement (accounting for span)
    const centerCol = col + colSpan / 2;
    const centerRow = row + rowSpan / 2;

    // Horizontal angle (spread views across an arc)
    const horizontalRange = Math.PI * this._gridCurvature; // How wide the arc is
    const colFraction = (centerCol - totalCols / 2) / totalCols;
    const angle = colFraction * horizontalRange;

    // Position on the curved surface
    const x = Math.sin(angle) * this._gridRadius;
    const z = -Math.cos(angle) * this._gridRadius;

    // Vertical position (row 0 at eye level, rows go up/down)
    const rowOffset = centerRow - totalRows / 2;
    const y = this._eyeHeight - rowOffset * this._rowHeight;

    // Rotation to face the user (look at origin)
    const rotationY = angle;

    // Scale based on span
    const baseWidth = 0.6; // meters
    const baseHeight = 0.4; // meters
    const scaleX = baseWidth * colSpan * this._viewScale;
    const scaleY = baseHeight * rowSpan * this._viewScale;

    return {
      position: { x, y, z },
      rotation: { x: 0, y: rotationY, z: 0, w: 1 }, // Simplified quaternion
      scale: { x: scaleX, y: scaleY, z: 0.01 }, // Thin panel
    };
  }

  /**
   * Calculate transforms for all visible placements
   *
   * @param {CanvasPlacement[]} placements - Visible placements
   * @param {Object} canvasDimensions - { rows, cols }
   * @returns {Map<string, Object>} - placementId -> transform
   */
  calculateAllTransforms(placements, canvasDimensions) {
    log.trace(
      "VRGridLayout.calculateAllTransforms() - STUB: Calculating placeholders"
    );

    const transforms = new Map();

    placements.forEach((placement) => {
      const transform = this.getWorldTransform(placement, canvasDimensions);
      transforms.set(placement.id, transform);
      this._placementPositions.set(placement.id, transform);
    });

    return transforms;
  }

  // ===========================================================================
  // INTERACTION (Gaze/Pointer Selection)
  // ===========================================================================

  /**
   * Find which placement a ray intersects (for gaze/pointer selection)
   *
   * @param {Object} ray - { origin: Vector3, direction: Vector3 }
   * @param {CanvasPlacement[]} placements - Placements to test
   * @returns {CanvasPlacement|null} - The targeted placement, or null
   */
  getTargetedPlacement(ray, placements) {
    log.trace(
      "VRGridLayout.getTargetedPlacement() - STUB: Not fully implemented"
    );

    // TODO: Full implementation
    // 1. For each placement, get its world transform
    // 2. Create bounding box/plane for the view panel
    // 3. Test ray intersection
    // 4. Return closest intersected placement

    // Placeholder: return first placement if ray is roughly forward
    if (ray.direction.z < -0.5 && placements.length > 0) {
      this._targetedPlacementId = placements[0].id;
      return placements[0];
    }

    this._targetedPlacementId = null;
    return null;
  }

  /**
   * Get the currently targeted placement ID
   */
  getTargetedPlacementId() {
    return this._targetedPlacementId;
  }

  /**
   * Clear targeting (e.g., when pointer exits all panels)
   */
  clearTarget() {
    this._targetedPlacementId = null;
  }

  // ===========================================================================
  // ANIMATION SUPPORT
  // ===========================================================================

  /**
   * Get interpolated transform for smooth transitions
   *
   * @param {string} placementId
   * @param {Object} targetTransform
   * @param {number} t - Interpolation factor (0-1)
   * @returns {Object} Interpolated transform
   */
  getInterpolatedTransform(placementId, targetTransform, t) {
    const current = this._placementPositions.get(placementId);
    if (!current) return targetTransform;

    // Linear interpolation (lerp)
    const lerp = (a, b, t) => a + (b - a) * t;

    return {
      position: {
        x: lerp(current.position.x, targetTransform.position.x, t),
        y: lerp(current.position.y, targetTransform.position.y, t),
        z: lerp(current.position.z, targetTransform.position.z, t),
      },
      rotation: {
        x: lerp(current.rotation.x, targetTransform.rotation.x, t),
        y: lerp(current.rotation.y, targetTransform.rotation.y, t),
        z: lerp(current.rotation.z, targetTransform.rotation.z, t),
        w: lerp(current.rotation.w, targetTransform.rotation.w, t),
      },
      scale: {
        x: lerp(current.scale.x, targetTransform.scale.x, t),
        y: lerp(current.scale.y, targetTransform.scale.y, t),
        z: lerp(current.scale.z, targetTransform.scale.z, t),
      },
    };
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Clear cached positions
   */
  clearCache() {
    this._placementPositions.clear();
    this._targetedPlacementId = null;
  }

  /**
   * Dispose of resources
   */
  dispose() {
    this.clearCache();
  }
}

// Default instance (can create custom instances with different configs)
export const vrGridLayout = new VRGridLayout();
