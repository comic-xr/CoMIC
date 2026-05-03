// ----------------------------------------------------------------------------
// VTK Raycaster Utility
//
// Converts screen (2D) coordinates to world (3D) coordinates via raycasting.
// Used for collaborative cursors in 3D scenes.
//
// COORDINATE SYSTEMS:
// 1. Screen coordinates: Pixels from top-left of browser window (clientX, clientY)
// 2. Container-relative: Pixels from top-left of VTK container element
// 3. Normalized Device Coordinates (NDC): [-1, 1] range used by VTK picker
// 4. World coordinates: 3D position in the scene's coordinate system
//
// TRANSFORMATION PIPELINE:
// Screen → Container-relative → NDC → Picker → World
// ----------------------------------------------------------------------------

import vtkCellPicker from "@kitware/vtk.js/Rendering/Core/CellPicker";
import vtkPointPicker from "@kitware/vtk.js/Rendering/Core/PointPicker";
import { instance as log } from "@Utils/logger.js";

// Cache pickers per instance to avoid recreation overhead
const pickerCache = new Map(); // instanceId -> { cellPicker, pointPicker, tolerance }

// Default picker tolerance - larger value for more forgiving surface picking
// This value is in world coordinates, not normalized
const DEFAULT_TOLERANCE = 0.01;

/**
 * Get or create a cached picker for an instance
 *
 * @param {string} instanceId - Unique instance identifier
 * @param {Object} options - Picker configuration options
 * @param {string} pickerType - Type of picker ('cell' or 'point')
 * @returns {vtkCellPicker|vtkPointPicker} The picker instance
 */
function getOrCreatePicker(instanceId, options = {}, pickerType = "cell") {
  const tolerance = options.tolerance || DEFAULT_TOLERANCE;

  if (pickerCache.has(instanceId)) {
    const cached = pickerCache.get(instanceId);
    const picker =
      pickerType === "point" ? cached.pointPicker : cached.cellPicker;

    // Always update tolerance to match options
    if (picker && picker.getTolerance() !== tolerance) {
      picker.setTolerance(tolerance);
      log.debug(
        `Updated ${pickerType} picker tolerance to ${tolerance} for instance: ${instanceId}`
      );
    }

    if (picker) {
      return picker;
    }
  }

  // Create cell picker
  const cellPicker = vtkCellPicker.newInstance();
  cellPicker.setTolerance(tolerance);
  cellPicker.setPickFromList(false);

  // Create point picker as fallback
  const pointPicker = vtkPointPicker.newInstance();
  pointPicker.setTolerance(tolerance);
  pointPicker.setPickFromList(false);

  pickerCache.set(instanceId, { cellPicker, pointPicker, tolerance });

  log.debug(
    `Created raycaster pickers (cell + point) for instance: ${instanceId}, tolerance: ${tolerance}`
  );

  return pickerType === "point" ? pointPicker : cellPicker;
}

/**
 * Convert screen coordinates to normalized device coordinates (NDC).
 *
 * NDC in VTK:
 * - X: -1 (left edge) to +1 (right edge)
 * - Y: -1 (bottom edge) to +1 (top edge)
 *
 * Note: VTK's Y-axis is inverted compared to browser coordinates
 * (browser Y increases downward, VTK Y increases upward)
 *
 * @param {number} screenX - Screen X coordinate (clientX)
 * @param {number} screenY - Screen Y coordinate (clientY)
 * @param {HTMLElement} container - VTK container element
 * @returns {{ ndcX: number, ndcY: number, valid: boolean }}
 */
function screenToNDC(screenX, screenY, container) {
  const rect = container.getBoundingClientRect();

  // Convert to container-relative coordinates
  const containerX = screenX - rect.left;
  const containerY = screenY - rect.top;

  // Check if point is within container bounds
  const valid =
    containerX >= 0 &&
    containerX <= rect.width &&
    containerY >= 0 &&
    containerY <= rect.height;

  if (!valid || rect.width === 0 || rect.height === 0) {
    return { ndcX: 0, ndcY: 0, valid: false };
  }

  // Convert to normalized [0, 1] range
  const normalizedX = containerX / rect.width;
  const normalizedY = containerY / rect.height;

  // Convert to NDC [-1, 1] range
  // X: 0 -> -1, 1 -> +1
  // Y: 0 -> +1 (top), 1 -> -1 (bottom) - note the Y inversion!
  const ndcX = normalizedX * 2 - 1;
  const ndcY = 1 - normalizedY * 2; // Invert Y axis

  return { ndcX, ndcY, valid: true };
}

/**
 * Convert screen coordinates to VTK display coordinates.
 *
 * VTK display coordinates:
 * - X: Pixels from left edge of container
 * - Y: Pixels from BOTTOM edge of container (VTK Y-axis points up)
 *
 * @param {number} screenX - Screen X coordinate (clientX)
 * @param {number} screenY - Screen Y coordinate (clientY)
 * @param {HTMLElement} container - VTK container element
 * @returns {{ displayX: number, displayY: number, valid: boolean }}
 */
function screenToDisplay(screenX, screenY, container) {
  const rect = container.getBoundingClientRect();

  // Convert to container-relative coordinates
  const containerX = screenX - rect.left;
  const containerY = screenY - rect.top;

  // Check if point is within container bounds
  const valid =
    containerX >= 0 &&
    containerX <= rect.width &&
    containerY >= 0 &&
    containerY <= rect.height;

  if (!valid || rect.width === 0 || rect.height === 0) {
    return { displayX: 0, displayY: 0, valid: false };
  }

  // VTK display Y is from the bottom, browser Y is from the top
  // So invert the Y coordinate
  const displayX = containerX;
  const displayY = rect.height - containerY;

  return { displayX, displayY, valid: true };
}

/**
 * Convert screen coordinates to normalized viewport coordinates.
 *
 * VTK picker expects normalized viewport coordinates:
 * - X: 0 (left edge) to 1 (right edge)
 * - Y: 0 (bottom edge) to 1 (top edge)
 *
 * @param {number} screenX - Screen X coordinate (clientX)
 * @param {number} screenY - Screen Y coordinate (clientY)
 * @param {HTMLElement} container - VTK container element
 * @returns {{ viewportX: number, viewportY: number, valid: boolean }}
 */
function screenToViewport(screenX, screenY, container) {
  const rect = container.getBoundingClientRect();

  // Convert to container-relative coordinates
  const containerX = screenX - rect.left;
  const containerY = screenY - rect.top;

  // Check if point is within container bounds
  const valid =
    containerX >= 0 &&
    containerX <= rect.width &&
    containerY >= 0 &&
    containerY <= rect.height;

  if (!valid || rect.width === 0 || rect.height === 0) {
    return { viewportX: 0, viewportY: 0, valid: false };
  }

  // Normalize to [0, 1] range
  // X: 0 (left) to 1 (right)
  // Y: 0 (bottom) to 1 (top) - note Y inversion from browser coords
  const viewportX = containerX / rect.width;
  const viewportY = 1 - containerY / rect.height;

  return { viewportX, viewportY, valid: true };
}

/**
 * Raycast from screen coordinates to find 3D world position.
 *
 * This function performs a ray pick from the camera through the given screen
 * coordinates and returns the intersection point with scene geometry.
 *
 * @param {Object} sceneObjects - VTK scene objects from instance
 * @param {Object} sceneObjects.renderer - vtkRenderer instance
 * @param {Object} sceneObjects.renderWindow - vtkRenderWindow instance
 * @param {Object} sceneObjects.camera - vtkCamera instance
 * @param {number} screenX - Screen X coordinate (e.g., event.clientX)
 * @param {number} screenY - Screen Y coordinate (e.g., event.clientY)
 * @param {HTMLElement} container - VTK container DOM element
 * @param {Object} options - Optional configuration
 * @param {string} options.instanceId - Instance ID for picker caching
 * @param {number} options.tolerance - Pick tolerance (default: 0.005)
 * @returns {{
 *   worldPosition: [number, number, number] | null,
 *   normal: [number, number, number] | null,
 *   hit: boolean,
 *   cellId: number | null,
 *   actorId: string | null
 * }}
 */
export function raycastFromScreen(
  sceneObjects,
  screenX,
  screenY,
  container,
  options = {}
) {
  // Validate inputs
  if (!sceneObjects?.renderer || !sceneObjects?.renderWindow) {
    log.warn("raycastFromScreen: Invalid sceneObjects provided");
    return {
      worldPosition: null,
      normal: null,
      hit: false,
      cellId: null,
      actorId: null,
    };
  }

  if (!container) {
    log.warn("raycastFromScreen: No container provided");
    return {
      worldPosition: null,
      normal: null,
      hit: false,
      cellId: null,
      actorId: null,
    };
  }

  const { renderer, renderWindow } = sceneObjects;

  // Get container/canvas dimensions for coordinate conversion
  const rect = container.getBoundingClientRect();
  const containerX = screenX - rect.left;
  const containerY = screenY - rect.top;

  // Check if point is within container bounds
  if (
    containerX < 0 ||
    containerX > rect.width ||
    containerY < 0 ||
    containerY > rect.height ||
    rect.width === 0 ||
    rect.height === 0
  ) {
    return {
      worldPosition: null,
      normal: null,
      hit: false,
      cellId: null,
      actorId: null,
    };
  }

  // Get the actual canvas size from the OpenGL render window view
  // In VTK.js, renderWindow.getViews() returns the OpenGL render window(s)
  let canvasWidth = rect.width;
  let canvasHeight = rect.height;
  let scaleX = 1;
  let scaleY = 1;

  try {
    const views = renderWindow.getViews();
    if (views && views.length > 0) {
      const glRenderWindow = views[0];
      const size = glRenderWindow.getSize();
      if (size && size[0] > 0 && size[1] > 0) {
        canvasWidth = size[0];
        canvasHeight = size[1];
        scaleX = canvasWidth / rect.width;
        scaleY = canvasHeight / rect.height;
      }
    }
  } catch (e) {
    // Fall back to device pixel ratio if getViews fails
    const dpr = window.devicePixelRatio || 1;
    scaleX = dpr;
    scaleY = dpr;
    canvasWidth = rect.width * dpr;
    canvasHeight = rect.height * dpr;
  }

  // VTK display coordinates: Y is from bottom, browser Y is from top
  const displayX = containerX * scaleX;
  const displayY = (rect.height - containerY) * scaleY;

  // Get or create picker
  const instanceId = options.instanceId || "default";
  const picker = getOrCreatePicker(instanceId, options);

  // Add all actors from renderer to picker (ensure we pick everything)
  const actors = renderer.getActors();
  actors.forEach((actor) => {
    if (actor.getPickable()) {
      picker.addPickList(actor);
    }
  });

  try {
    // Perform the pick operation
    // VTK picker.pick expects display coordinates (pixels in canvas space, Y from bottom)
    log.debug(
      `Picking at display coords (${displayX.toFixed(1)}, ${displayY.toFixed(
        1
      )}), canvas: ${canvasWidth}x${canvasHeight}, scale: ${scaleX.toFixed(
        2
      )}x${scaleY.toFixed(2)}, actors: ${actors.length}`
    );
    picker.pick([displayX, displayY, 0], renderer);

    // Check if we hit something
    const pickedPosition = picker.getPickPosition();
    const pickedNormal = picker.getPickNormal();
    const cellId = picker.getCellId();

    log.debug(
      `Pick result: cellId=${cellId}, position=${pickedPosition
        ?.map((v) => v?.toFixed(2))
        .join(", ")}`
    );

    // cellId of -1 means no intersection
    if (cellId < 0) {
      return {
        worldPosition: null,
        normal: null,
        hit: false,
        cellId: null,
        actorId: null,
      };
    }

    // Get the picked actor (if available)
    let pickedActor = null;
    if (typeof picker.getActor === "function") {
      pickedActor = picker.getActor();
    } else if (typeof picker.getActors === "function") {
      const actors = picker.getActors();
      pickedActor = Array.isArray(actors) ? actors[0] : null;
    }
    const actorId = pickedActor ? pickedActor.get?.("id") : null;

    return {
      worldPosition: [pickedPosition[0], pickedPosition[1], pickedPosition[2]],
      normal: pickedNormal
        ? [pickedNormal[0], pickedNormal[1], pickedNormal[2]]
        : null,
      hit: true,
      cellId,
      actorId,
    };
  } catch (error) {
    log.error("raycastFromScreen: Pick operation failed", error);
    return {
      worldPosition: null,
      normal: null,
      hit: false,
      cellId: null,
      actorId: null,
    };
  }
}

/**
 * Raycast with alternative methods for different use cases.
 *
 * Sometimes vtkCellPicker may miss thin surfaces or points.
 * This function tries multiple picking strategies:
 * 1. CellPicker with default tolerance
 * 2. CellPicker with larger tolerance
 * 3. PointPicker as fallback (better for meshes with small cells)
 * 4. Fall back to view ray position
 *
 * @param {Object} sceneObjects - VTK scene objects
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @param {HTMLElement} container - VTK container element
 * @param {Object} options - Configuration options
 * @returns {Object} Raycast result
 */
export function raycastFromScreenWithFallback(
  sceneObjects,
  screenX,
  screenY,
  container,
  options = {}
) {
  // First try with cell picker (best for surfaces)
  const result = raycastFromScreen(
    sceneObjects,
    screenX,
    screenY,
    container,
    options
  );

  if (result.hit) {
    return result;
  }

  // If cell picker missed, try with a larger tolerance
  const looseTolerance = (options.tolerance || DEFAULT_TOLERANCE) * 5;
  const fallbackResult = raycastFromScreen(
    sceneObjects,
    screenX,
    screenY,
    container,
    { ...options, tolerance: looseTolerance }
  );

  if (fallbackResult.hit) {
    return fallbackResult;
  }

  // Try with PointPicker as last resort (better for certain mesh types)
  const pointPickResult = raycastFromScreenWithPointPicker(
    sceneObjects,
    screenX,
    screenY,
    container,
    { ...options, tolerance: looseTolerance * 2 }
  );

  if (pointPickResult.hit) {
    return pointPickResult;
  }

  // If still no hit, return a world position along the view ray
  // This gives a sensible position even when not hitting geometry
  const worldPos = getWorldPositionOnViewRay(
    sceneObjects,
    screenX,
    screenY,
    container
  );

  return {
    worldPosition: worldPos,
    normal: null,
    hit: false,
    cellId: null,
    actorId: null,
    onViewRay: true, // Flag indicating this is on the ray, not on geometry
  };
}

/**
 * Raycast using PointPicker instead of CellPicker.
 *
 * PointPicker finds the closest point on any geometry, which can work
 * better for meshes where CellPicker misses due to cell size issues.
 *
 * @param {Object} sceneObjects - VTK scene objects
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @param {HTMLElement} container - VTK container element
 * @param {Object} options - Configuration options
 * @returns {Object} Raycast result
 */
function raycastFromScreenWithPointPicker(
  sceneObjects,
  screenX,
  screenY,
  container,
  options = {}
) {
  // Validate inputs
  if (!sceneObjects?.renderer || !sceneObjects?.renderWindow) {
    return {
      worldPosition: null,
      normal: null,
      hit: false,
      cellId: null,
      actorId: null,
    };
  }

  if (!container) {
    return {
      worldPosition: null,
      normal: null,
      hit: false,
      cellId: null,
      actorId: null,
    };
  }

  const { renderer, renderWindow } = sceneObjects;

  // Get container/canvas dimensions for coordinate conversion
  const rect = container.getBoundingClientRect();
  const containerX = screenX - rect.left;
  const containerY = screenY - rect.top;

  // Check if point is within container bounds
  if (
    containerX < 0 ||
    containerX > rect.width ||
    containerY < 0 ||
    containerY > rect.height ||
    rect.width === 0 ||
    rect.height === 0
  ) {
    return {
      worldPosition: null,
      normal: null,
      hit: false,
      cellId: null,
      actorId: null,
    };
  }

  // Get the actual canvas size from the OpenGL render window view
  let scaleX = 1;
  let scaleY = 1;

  try {
    const views = renderWindow.getViews();
    if (views && views.length > 0) {
      const glRenderWindow = views[0];
      const size = glRenderWindow.getSize();
      if (size && size[0] > 0 && size[1] > 0) {
        scaleX = size[0] / rect.width;
        scaleY = size[1] / rect.height;
      }
    }
  } catch (e) {
    const dpr = window.devicePixelRatio || 1;
    scaleX = dpr;
    scaleY = dpr;
  }

  // VTK display coordinates: Y is from bottom, browser Y is from top
  const displayX = containerX * scaleX;
  const displayY = (rect.height - containerY) * scaleY;

  // Get point picker
  const instanceId = options.instanceId || "default";
  const picker = getOrCreatePicker(instanceId, options, "point");

  // Add all actors from renderer to picker
  const actors = renderer.getActors();
  actors.forEach((actor) => {
    if (actor.getPickable()) {
      picker.addPickList(actor);
    }
  });

  try {
    // Perform the pick operation with PointPicker
    log.debug(
      `PointPicker picking at display coords (${displayX.toFixed(
        1
      )}, ${displayY.toFixed(1)})`
    );
    picker.pick([displayX, displayY, 0], renderer);

    // Check if we hit something
    const pickedPosition = picker.getPickPosition();
    const pointId = picker.getPointId();

    log.debug(
      `PointPicker result: pointId=${pointId}, position=${pickedPosition
        ?.map((v) => v?.toFixed(2))
        .join(", ")}`
    );

    // pointId of -1 means no intersection
    if (pointId < 0) {
      return {
        worldPosition: null,
        normal: null,
        hit: false,
        cellId: null,
        actorId: null,
      };
    }

    // Get the picked actor (PointPicker uses getActors() not getActor())
    let actorId = null;
    try {
      const pickedActors = picker.getActors?.() || [];
      if (pickedActors.length > 0) {
        actorId = pickedActors[0].get?.("id") || null;
      }
    } catch (e) {
      // Actor retrieval is optional, ignore errors
    }

    return {
      worldPosition: [pickedPosition[0], pickedPosition[1], pickedPosition[2]],
      normal: null, // PointPicker doesn't provide normals
      hit: true,
      cellId: null, // PointPicker finds points, not cells
      pointId,
      actorId,
    };
  } catch (error) {
    log.error("raycastFromScreenWithPointPicker: Pick operation failed", error);
    return {
      worldPosition: null,
      normal: null,
      hit: false,
      cellId: null,
      actorId: null,
    };
  }
}

/**
 * Get a world position along the view ray (even if no geometry is hit).
 *
 * This is useful for showing cursor position in empty space.
 * The position is computed at the focal point distance from the camera.
 *
 * @param {Object} sceneObjects - VTK scene objects
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @param {HTMLElement} container - VTK container element
 * @returns {[number, number, number] | null} World position on view ray
 */
export function getWorldPositionOnViewRay(
  sceneObjects,
  screenX,
  screenY,
  container
) {
  if (!sceneObjects?.camera || !sceneObjects?.renderer) {
    return null;
  }

  const { camera, renderer } = sceneObjects;

  // Convert screen to NDC
  const { ndcX, ndcY, valid } = screenToNDC(screenX, screenY, container);
  if (!valid) return null;

  try {
    // Get camera position and focal point
    const cameraPos = camera.getPosition();
    const focalPoint = camera.getFocalPoint();

    // Calculate the distance from camera to focal plane
    const distance = Math.sqrt(
      Math.pow(focalPoint[0] - cameraPos[0], 2) +
        Math.pow(focalPoint[1] - cameraPos[1], 2) +
        Math.pow(focalPoint[2] - cameraPos[2], 2)
    );

    // Use VTK.js renderer.viewToWorld to convert NDC to world coordinates
    // viewToWorld expects normalized view coordinates (-1 to 1)
    let nearPoint, farPoint;
    if (typeof renderer.viewToWorld === "function") {
      nearPoint = renderer.viewToWorld(ndcX, ndcY, 0);
      farPoint = renderer.viewToWorld(ndcX, ndcY, 1);
    } else {
      // Fallback: compute ray from camera through NDC point
      // This is a simplified approximation using the camera's view direction
      const viewUp = camera.getViewUp();
      const viewDir = [
        focalPoint[0] - cameraPos[0],
        focalPoint[1] - cameraPos[1],
        focalPoint[2] - cameraPos[2],
      ];
      // Normalize view direction
      const viewDirLen = Math.sqrt(
        viewDir[0] ** 2 + viewDir[1] ** 2 + viewDir[2] ** 2
      );
      if (viewDirLen === 0) return null;
      viewDir[0] /= viewDirLen;
      viewDir[1] /= viewDirLen;
      viewDir[2] /= viewDirLen;

      // Return focal point as approximation (won't be precise but won't crash)
      return [focalPoint[0], focalPoint[1], focalPoint[2]];
    }

    if (!nearPoint || !farPoint) return null;

    // Calculate ray direction
    const rayDir = [
      farPoint[0] - nearPoint[0],
      farPoint[1] - nearPoint[1],
      farPoint[2] - nearPoint[2],
    ];

    // Normalize
    const rayLength = Math.sqrt(
      rayDir[0] ** 2 + rayDir[1] ** 2 + rayDir[2] ** 2
    );
    if (rayLength === 0) return null;

    rayDir[0] /= rayLength;
    rayDir[1] /= rayLength;
    rayDir[2] /= rayLength;

    // Project point at focal distance
    return [
      nearPoint[0] + rayDir[0] * distance,
      nearPoint[1] + rayDir[1] * distance,
      nearPoint[2] + rayDir[2] * distance,
    ];
  } catch (error) {
    log.error("getWorldPositionOnViewRay failed:", error);
    return null;
  }
}

/**
 * Convert world coordinates back to screen coordinates.
 *
 * Useful for displaying UI elements at 3D positions.
 *
 * @param {Object} sceneObjects - VTK scene objects
 * @param {[number, number, number]} worldPosition - 3D world coordinates
 * @param {HTMLElement} container - VTK container element
 * @returns {{ screenX: number, screenY: number, visible: boolean } | null}
 */
export function worldToScreen(sceneObjects, worldPosition, container) {
  if (!sceneObjects?.renderer || !worldPosition) {
    return null;
  }

  const { renderer } = sceneObjects;

  try {
    // Use renderer to convert world to display coordinates
    const displayCoord = renderer.worldToDisplay(
      worldPosition[0],
      worldPosition[1],
      worldPosition[2]
    );

    if (!displayCoord) return null;

    const rect = container.getBoundingClientRect();

    // displayCoord is in [0,1] normalized coordinates
    // Convert to screen pixels
    const containerX = displayCoord[0] * rect.width;
    const containerY = (1 - displayCoord[1]) * rect.height; // Invert Y

    // Check if point is in front of camera (z < 1 means visible)
    const visible = displayCoord[2] < 1;

    return {
      screenX: rect.left + containerX,
      screenY: rect.top + containerY,
      visible,
    };
  } catch (error) {
    log.error("worldToScreen failed:", error);
    return null;
  }
}

/**
 * Dispose the raycaster for an instance.
 *
 * Call this when cleaning up an instance to free memory.
 *
 * @param {string} instanceId - Instance ID to clean up
 */
export function disposeRaycaster(instanceId) {
  if (pickerCache.has(instanceId)) {
    const cached = pickerCache.get(instanceId);
    if (cached.cellPicker) cached.cellPicker.delete();
    if (cached.pointPicker) cached.pointPicker.delete();
    pickerCache.delete(instanceId);
    log.debug(`Disposed raycaster for instance: ${instanceId}`);
  }
}

/**
 * Dispose all raycasters.
 *
 * Call this on application shutdown.
 */
export function disposeAllRaycasters() {
  pickerCache.forEach((cached, instanceId) => {
    if (cached.cellPicker) cached.cellPicker.delete();
    if (cached.pointPicker) cached.pointPicker.delete();
    log.debug(`Disposed raycaster for instance: ${instanceId}`);
  });
  pickerCache.clear();
}

/**
 * Raycast from a 3D origin along a direction (for VR controller picking).
 *
 * Unlike screen-based raycasting, this takes a 3D ray directly.
 * Used for VR controller laser pointer interactions.
 *
 * @param {Object} sceneObjects - VTK scene objects from instance
 * @param {[number, number, number]} origin - Ray origin in world coordinates
 * @param {[number, number, number]} direction - Ray direction (normalized or will be normalized)
 * @param {Object} options - Optional configuration
 * @param {string} options.instanceId - Instance ID for picker caching
 * @param {number} options.tolerance - Pick tolerance (default: 0.005)
 * @param {number} options.maxDistance - Maximum ray distance (default: 100)
 * @returns {{
 *   worldPosition: [number, number, number] | null,
 *   normal: [number, number, number] | null,
 *   hit: boolean,
 *   cellId: number | null,
 *   actor: Object | null,
 *   distance: number | null
 * }}
 */
export function raycastFromRay(sceneObjects, origin, direction, options = {}) {
  // Validate inputs
  if (!sceneObjects?.renderer) {
    log.warn("raycastFromRay: Invalid sceneObjects provided");
    return {
      worldPosition: null,
      normal: null,
      hit: false,
      cellId: null,
      actor: null,
      distance: null,
    };
  }

  if (!origin || !direction || origin.length !== 3 || direction.length !== 3) {
    log.warn("raycastFromRay: Invalid ray origin or direction");
    return {
      worldPosition: null,
      normal: null,
      hit: false,
      cellId: null,
      actor: null,
      distance: null,
    };
  }

  const { renderer } = sceneObjects;
  const maxDistance = options.maxDistance || 100;

  // Get or create picker
  const instanceId = options.instanceId || "default";
  const picker = getOrCreatePicker(instanceId, options);

  // Normalize direction
  const dirLength = Math.sqrt(
    direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2
  );
  if (dirLength === 0) {
    return {
      worldPosition: null,
      normal: null,
      hit: false,
      cellId: null,
      actor: null,
      distance: null,
    };
  }
  const normDir = [
    direction[0] / dirLength,
    direction[1] / dirLength,
    direction[2] / dirLength,
  ];

  // Calculate ray end point
  const endPoint = [
    origin[0] + normDir[0] * maxDistance,
    origin[1] + normDir[1] * maxDistance,
    origin[2] + normDir[2] * maxDistance,
  ];

  // Add all actors from renderer to picker
  const actors = renderer.getActors();
  actors.forEach((actor) => {
    if (actor.getPickable()) {
      picker.addPickList(actor);
    }
  });

  try {
    // Use pick3DRay for 3D raycasting (origin to end point)
    // VTK's CellPicker can pick along a ray using pick method with 3D points
    picker.pick3DRay(origin, endPoint, renderer);

    // Check if we hit something
    const pickedPosition = picker.getPickPosition();
    const pickedNormal = picker.getPickNormal();
    const cellId = picker.getCellId();

    // cellId of -1 means no intersection
    if (cellId < 0) {
      return {
        worldPosition: null,
        normal: null,
        hit: false,
        cellId: null,
        actor: null,
        distance: null,
      };
    }

    // Calculate distance from origin to hit point
    const hitDistance = Math.sqrt(
      (pickedPosition[0] - origin[0]) ** 2 +
        (pickedPosition[1] - origin[1]) ** 2 +
        (pickedPosition[2] - origin[2]) ** 2
    );

    // Get the picked actor
    const pickedActor = picker.getActor();

    return {
      worldPosition: [pickedPosition[0], pickedPosition[1], pickedPosition[2]],
      normal: pickedNormal
        ? [pickedNormal[0], pickedNormal[1], pickedNormal[2]]
        : null,
      hit: true,
      cellId,
      actor: pickedActor,
      distance: hitDistance,
    };
  } catch (error) {
    log.error("raycastFromRay: Pick operation failed", error);
    return {
      worldPosition: null,
      normal: null,
      hit: false,
      cellId: null,
      actor: null,
      distance: null,
    };
  }
}

// Export coordinate conversion helpers for external use
export { screenToNDC, screenToDisplay, DEFAULT_TOLERANCE };
