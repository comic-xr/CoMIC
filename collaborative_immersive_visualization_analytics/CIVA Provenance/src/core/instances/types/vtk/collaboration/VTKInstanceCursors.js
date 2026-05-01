// ----------------------------------------------------------------------------
// VTK Instance Cursor Rendering
//
// Renders collaborative cursors within VTK 3D scenes.
// Supports both 3D actor rendering (when world coordinates available) and
// DOM overlay fallback (for screen-only coordinates).
//
// ARCHITECTURE:
// - For cursors with world coordinates: Render as circle outline (ring) on surface
// - For cursors with screen-only coordinates: Render as DOM overlays (OS-style cursor)
// - Actor pooling to reduce allocation overhead
// - Name labels positioned via world-to-screen projection
// - Self-cursor rendering (user sees their own cursor in their color)
// ----------------------------------------------------------------------------

import {
  onCursorUpdate,
  onCursorRemove,
  hasWorldPosition,
  getCursorNamesVisible,
  onCursorNamesVisibilityChange,
  getSelfCursorVisible,
  onSelfCursorVisibilityChange,
  getShowOthersCursors,
  onShowOthersCursorsChange,
} from "@Collaboration/presence/cursors.js";
import { getUserId } from "@Collaboration/presence/userManagement.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";
import { worldToScreen } from "@VTK/utils/vtkRaycaster.js";
import { cursor as log } from "@Utils/logger.js";
import { hexToRgb, clamp } from "@Utils/colorHelpers.js";

// VTK imports for 3D cursor actors
import vtkCircleSource from "@kitware/vtk.js/Filters/Sources/CircleSource";
import vtkLineSource from "@kitware/vtk.js/Filters/Sources/LineSource";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";

// Constants
const CURSOR_RING_RADIUS = 0.025; // Relative to scene scale
const CURSOR_RING_RESOLUTION = 32; // Smoothness of the circle
const ACTOR_POOL_SIZE = 10; // Pre-allocate this many cursor actors
const LABEL_OFFSET_Y = 25; // Pixels below cursor for label
const REMOTE_CURSOR_SMOOTHING = 0.35; // Lerp factor per frame
const REMOTE_PREDICTION_LIMIT_MS = 100; // Max dead-reckon prediction horizon
const REMOTE_ANIMATION_IDLE_MS = 250; // Stop animating if updates stall
const REMOTE_ADAPTIVE_SMOOTHING = true;
const REMOTE_SMOOTHING_MIN = 0.15;
const REMOTE_SMOOTHING_MAX = 0.85;
const REFERENCE_PIXELS_PER_WORLD = 120;

/**
 * VTKInstanceCursors - Manages collaborative cursor rendering in VTK scenes
 */
class VTKInstanceCursors {
  constructor() {
    // Map of instanceId → instance cursor state
    this.instanceStates = new Map();

    // Cleanup functions for global listeners
    this.cleanupFunctions = [];

    // Listen for cursor name visibility changes
    const cleanupNameVisibility = onCursorNamesVisibilityChange((visible) => {
      this._updateAllLabelVisibility(visible);
    });
    this.cleanupFunctions.push(cleanupNameVisibility);

    // Listen for self-cursor visibility changes
    const cleanupSelfCursor = onSelfCursorVisibilityChange((visible) => {
      this._updateSelfCursorVisibility(visible);
    });
    this.cleanupFunctions.push(cleanupSelfCursor);

    // Listen for show-others visibility changes
    const cleanupOthersCursors = onShowOthersCursorsChange((visible) => {
      this._updateOthersCursorsVisibility(visible);
    });
    this.cleanupFunctions.push(cleanupOthersCursors);
  }

  /**
   * Update visibility of self cursor across all instances
   * @private
   */
  _updateSelfCursorVisibility(visible) {
    const currentUserId = getUserId();

    this.instanceStates.forEach((state) => {
      if (visible) {
        // Self cursor will be rendered on next update
        return;
      }

      // Hide/remove self cursor
      const cursorActor = state.actorCursors.get(currentUserId);
      if (cursorActor) {
        cursorActor.actor.setVisibility(false);
      }

      const cursorEl = state.domCursors.get(currentUserId);
      if (cursorEl) {
        cursorEl.style.display = "none";
        // Restore native cursor
        state.container.style.cursor = "";
      }

      // Re-render
      this._scheduleRender(state, "self-visibility");
    });

    log.debug(`Updated self cursor visibility: ${visible}`);
  }

  /**
   * Update visibility of others' cursors across all instances
   * @private
   */
  _updateOthersCursorsVisibility(visible) {
    const currentUserId = getUserId();

    this.instanceStates.forEach((state) => {
      // Update actor cursors
      state.actorCursors.forEach((cursorActor, userId) => {
        if (userId !== currentUserId) {
          cursorActor.actor.setVisibility(visible);
        }
      });

      // Update DOM cursors
      state.domCursors.forEach((cursorEl, userId) => {
        if (userId !== currentUserId) {
          cursorEl.style.display = visible ? "block" : "none";
        }
      });

      // Update labels
      state.labels.forEach((labelEl, userId) => {
        if (userId !== currentUserId) {
          labelEl.style.display =
            visible && getCursorNamesVisible() ? "block" : "none";
        }
      });

      // Re-render
      this._scheduleRender(state, "others-visibility");
    });

    log.debug(`Updated others cursors visibility: ${visible}`);
  }

  /**
   * Update visibility of all labels across all instances
   * @private
   */
  _updateAllLabelVisibility(visible) {
    const currentUserId = getUserId();

    this.instanceStates.forEach((state) => {
      // Update 3D cursor labels (skip self cursor - it never has a label)
      state.labels.forEach((labelEl, userId) => {
        if (userId !== currentUserId) {
          labelEl.style.display = visible ? "block" : "none";
        }
      });

      // Update DOM cursor labels (skip self cursor - it never has a label)
      state.domCursors.forEach((cursorEl, userId) => {
        if (userId !== currentUserId) {
          const label = cursorEl.querySelector(".cursor-label");
          if (label) {
            label.style.display = visible ? "block" : "none";
          }
        }
      });

      // Re-render to reflect changes
      this._scheduleRender(state, "label-visibility");
    });

    log.debug(`Updated all cursor labels visibility: ${visible}`);
  }

  /**
   * Setup cursor rendering for a specific VTK instance
   *
   * @param {string} instanceId - Instance ID (local to this browser)
   * @param {HTMLElement} container - VTK container element
   * @param {Object} sceneObjects - VTK scene objects (renderer, renderWindow, etc.)
   * @param {string} viewConfigId - ViewConfig ID (shared across collaborators)
   */
  setupInstanceCursors(
    instanceId,
    container,
    sceneObjects = null,
    viewConfigId = null
  ) {
    log.debug(
      `Setting up cursors for instance: ${instanceId}, viewConfig: ${viewConfigId}`
    );

    // Initialize state for this instance
    const state = {
      container,
      sceneObjects,
      viewConfigId, // For collaborative cursor matching
      // 3D actor cursors: userId → { actor, source, mapper, type: 'sphere'|'cone' }
      actorCursors: new Map(),
      // DOM overlay cursors (fallback): userId → DOM element
      domCursors: new Map(),
      // Actor pool for reuse
      actorPool: [],
      // Label elements: userId → DOM element
      labels: new Map(),
      // Track which render mode each user is using
      renderModes: new Map(), // userId → 'actor' | 'dom'
      pendingRender: false,
      lastRectRead: 0,
      cachedRect: null,
      ringRadiusCache: null,
      ringRadiusUpdatedAt: 0,
      cursorMotion: new Map(),
      animationFrameId: null,
    };

    this.instanceStates.set(instanceId, state);

    // Pre-populate actor pool
    if (sceneObjects) {
      this._initializeActorPool(state);
    }

    // Subscribe to cursor updates
    const cleanupUpdate = onCursorUpdate(({ userId, cursorData }) => {
      this.renderCursor(instanceId, userId, cursorData);
    });

    const cleanupRemove = onCursorRemove(({ userId }) => {
      this.removeCursor(instanceId, userId);
    });

    // Store cleanup functions
    this.cleanupFunctions.push(cleanupUpdate, cleanupRemove);
  }

  /**
   * Update scene objects reference (called after VTK pipeline is initialized)
   */
  setSceneObjects(instanceId, sceneObjects, viewConfigId = null) {
    const state = this.instanceStates.get(instanceId);
    if (state) {
      state.sceneObjects = sceneObjects;
      // Update viewConfigId if provided (may not have been available during setup)
      if (viewConfigId !== null) {
        state.viewConfigId = viewConfigId;
      }
      // Initialize actor pool now that we have scene objects
      this._initializeActorPool(state);
    }
  }

  /**
   * Initialize the actor pool with pre-created cursor actors
   */
  _initializeActorPool(state) {
    if (!state.sceneObjects?.renderer) return;

    for (let i = 0; i < ACTOR_POOL_SIZE; i++) {
      const cursorActor = this._createCursorActor();
      cursorActor.actor.setVisibility(false);
      state.actorPool.push(cursorActor);
    }

    log.debug(`Initialized actor pool with ${ACTOR_POOL_SIZE} cursors`);
  }

  _scheduleRender(state, reason = "cursor") {
    if (!state.sceneObjects?.renderWindow) return;
    if (state.pendingRender) return;
    state.pendingRender = true;

    requestAnimationFrame(() => {
      state.pendingRender = false;
      try {
        state.sceneObjects.renderWindow.render();
      } catch (error) {
        log.warn(`Cursor render failed (${reason}): ${error.message}`);
      }
    });
  }

  _getContainerRect(state) {
    const now = Date.now();
    if (state.cachedRect && now - state.lastRectRead < 16) {
      return state.cachedRect;
    }

    state.cachedRect = state.container.getBoundingClientRect();
    state.lastRectRead = now;
    return state.cachedRect;
  }

  _getRingRadius(state) {
    if (!state.sceneObjects?.renderer) return CURSOR_RING_RADIUS;

    const now = Date.now();
    if (state.ringRadiusCache && now - state.ringRadiusUpdatedAt < 500) {
      return state.ringRadiusCache;
    }

    const bounds = state.sceneObjects.renderer.computeVisiblePropBounds();
    const sceneSize = Math.max(
      bounds[1] - bounds[0],
      bounds[3] - bounds[2],
      bounds[5] - bounds[4]
    );

    state.ringRadiusCache = sceneSize * CURSOR_RING_RADIUS;
    state.ringRadiusUpdatedAt = now;
    return state.ringRadiusCache;
  }

  _getAdaptiveSmoothing(state, worldPos) {
    if (!REMOTE_ADAPTIVE_SMOOTHING || !state.sceneObjects?.camera) {
      return REMOTE_CURSOR_SMOOTHING;
    }

    if (!worldPos || !isFinite(worldPos.x) || !isFinite(worldPos.y)) {
      return REMOTE_CURSOR_SMOOTHING;
    }

    const camera = state.sceneObjects.camera;
    const direction = camera.getDirectionOfProjection?.() || [0, 0, -1];
    const viewUp = camera.getViewUp?.() || [0, 1, 0];
    const right = [
      direction[1] * viewUp[2] - direction[2] * viewUp[1],
      direction[2] * viewUp[0] - direction[0] * viewUp[2],
      direction[0] * viewUp[1] - direction[1] * viewUp[0],
    ];

    const rightLength = Math.hypot(right[0], right[1], right[2]);
    if (!rightLength) return REMOTE_CURSOR_SMOOTHING;
    right[0] /= rightLength;
    right[1] /= rightLength;
    right[2] /= rightLength;

    const ringRadius = this._getRingRadius(state);
    const sceneSize = ringRadius / CURSOR_RING_RADIUS || 1;
    const epsilon = Math.max(sceneSize * 0.01, 1e-3);
    const worldA = [worldPos.x, worldPos.y, worldPos.z ?? 0];
    const worldB = [
      worldPos.x + right[0] * epsilon,
      worldPos.y + right[1] * epsilon,
      (worldPos.z ?? 0) + right[2] * epsilon,
    ];

    const screenA = worldToScreen(state.sceneObjects, worldA, state.container);
    const screenB = worldToScreen(state.sceneObjects, worldB, state.container);
    if (!screenA || !screenB) return REMOTE_CURSOR_SMOOTHING;

    const dx = screenB.screenX - screenA.screenX;
    const dy = screenB.screenY - screenA.screenY;
    const pixelsPerWorld = Math.hypot(dx, dy) / epsilon;
    if (!isFinite(pixelsPerWorld) || pixelsPerWorld <= 0) {
      return REMOTE_CURSOR_SMOOTHING;
    }

    const scale = REFERENCE_PIXELS_PER_WORLD / pixelsPerWorld;
    const smoothing = REMOTE_CURSOR_SMOOTHING * scale;
    return clamp(smoothing, REMOTE_SMOOTHING_MIN, REMOTE_SMOOTHING_MAX);
  }

  _ensureAnimation(state) {
    if (state.animationFrameId) return;
    const animate = () => {
      state.animationFrameId = null;
      const now = performance.now();
      let hasActive = false;

      state.cursorMotion.forEach((motion, userId) => {
        if (!motion || !motion.renderPos) return;

        const idleTime = now - motion.lastReceivedAt;
        if (idleTime > REMOTE_ANIMATION_IDLE_MS) {
          return;
        }

        hasActive = true;

        const elapsed = Math.min(idleTime, REMOTE_PREDICTION_LIMIT_MS);
        const predicted = {
          x: motion.lastPos.x + motion.velocity.x * (elapsed / 1000),
          y: motion.lastPos.y + motion.velocity.y * (elapsed / 1000),
          z:
            motion.lastPos.z !== undefined
              ? motion.lastPos.z + motion.velocity.z * (elapsed / 1000)
              : undefined,
        };

        const smoothing =
          motion.mode === "actor"
            ? this._getAdaptiveSmoothing(state, predicted)
            : REMOTE_CURSOR_SMOOTHING;

        motion.renderPos = {
          x: motion.renderPos.x + (predicted.x - motion.renderPos.x) * smoothing,
          y: motion.renderPos.y + (predicted.y - motion.renderPos.y) * smoothing,
          z:
            motion.renderPos.z !== undefined
              ? motion.renderPos.z +
                (predicted.z - motion.renderPos.z) * smoothing
              : undefined,
        };

        this._renderFromMotion(state, userId, motion);
      });

      if (hasActive) {
        state.animationFrameId = requestAnimationFrame(animate);
      }
    };

    state.animationFrameId = requestAnimationFrame(animate);
  }

  _updateRemoteMotion(state, userId, cursorData, mode) {
    const now = performance.now();
    const target =
      mode === "actor"
        ? cursorData.world
        : cursorData.screen || { x: cursorData.x, y: cursorData.y };

    if (!target) return null;

    const current = state.cursorMotion.get(userId);
    const motion =
      current && current.mode === mode
        ? current
        : {
            mode,
            lastPos: { ...target },
            renderPos: { ...target },
            velocity: { x: 0, y: 0, z: 0 },
            cursorData,
            lastReceivedAt: now,
          };

    if (current && current.mode === mode) {
      const dt = Math.max(now - motion.lastReceivedAt, 1);
      motion.velocity = {
        x: (target.x - motion.lastPos.x) / (dt / 1000),
        y: (target.y - motion.lastPos.y) / (dt / 1000),
        z:
          target.z !== undefined && motion.lastPos.z !== undefined
            ? (target.z - motion.lastPos.z) / (dt / 1000)
            : 0,
      };
      motion.lastPos = { ...target };
      motion.lastReceivedAt = now;
      motion.cursorData = cursorData;
    }

    if (!motion.renderPos) {
      motion.renderPos = { ...target };
    }

    state.cursorMotion.set(userId, motion);
    return motion;
  }

  _renderFromMotion(state, userId, motion) {
    const cursorData = motion.cursorData;
    if (!cursorData) return;

    if (motion.mode === "actor") {
      const data = {
        ...cursorData,
        world: {
          x: motion.renderPos.x,
          y: motion.renderPos.y,
          z: motion.renderPos.z,
        },
      };
      this._renderActorCursor(state, userId, data, false);
    } else {
      const data = {
        ...cursorData,
        screen: { x: motion.renderPos.x, y: motion.renderPos.y },
        x: motion.renderPos.x,
        y: motion.renderPos.y,
      };
      this._renderDomCursor(state, userId, data, false);
    }
  }

  /**
   * Create a cursor actor (circle outline ring that lies flat on surface)
   */
  _createCursorActor() {
    // Create circle source for cursor ring outline
    const circleSource = vtkCircleSource.newInstance();
    circleSource.setRadius(CURSOR_RING_RADIUS);
    circleSource.setResolution(CURSOR_RING_RESOLUTION);
    circleSource.setLines(true); // Render as lines (outline), not filled
    // Create line source for VR Raycast lines
    const lineSource = vtkLineSource.newInstance();
    lineSource.setPoint1(0, 0, 0);
    lineSource.setPoint2(0, 0, 1);

    // Create mapper for circle/line
    const mapper = vtkMapper.newInstance();
    // Default to circle
    mapper.setInputConnection(circleSource.getOutputPort());

    // Create actor
    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    actor.getProperty().setLineWidth(3.0); // Make laser thick
    actor.getProperty().setAmbient(1.0);
    actor.getProperty().setDiffuse(0.0);
    actor.setPickable(false);

    return {
      circleSource,
      lineSource,
      mapper,
      actor,
      inUse: false,
      userId: null,
    };
  }

  /**
   * Get an actor from the pool or create a new one
   */
  _acquireActor(state, userId) {
    // First check if user already has an actor
    if (state.actorCursors.has(userId)) {
      return state.actorCursors.get(userId);
    }

    // Try to get from pool
    let cursorActor = state.actorPool.find((a) => !a.inUse);

    if (!cursorActor) {
      // Pool exhausted, create new actor
      log.debug(`Actor pool exhausted, creating new cursor actor`);
      cursorActor = this._createCursorActor();
    }

    // Mark as in use
    cursorActor.inUse = true;
    cursorActor.userId = userId;

    // Add to renderer if we have scene objects
    if (state.sceneObjects?.renderer) {
      state.sceneObjects.renderer.addActor(cursorActor.actor);
    }

    // Store reference
    state.actorCursors.set(userId, cursorActor);

    return cursorActor;
  }

  /**
   * Release an actor back to the pool
   */
  _releaseActor(state, userId) {
    const cursorActor = state.actorCursors.get(userId);
    if (!cursorActor) return;

    // Hide the actor
    cursorActor.actor.setVisibility(false);

    // Remove from renderer
    if (state.sceneObjects?.renderer) {
      state.sceneObjects.renderer.removeActor(cursorActor.actor);
    }

    // Mark as available
    cursorActor.inUse = false;
    cursorActor.userId = null;

    // Remove from active cursors
    state.actorCursors.delete(userId);

    // Return to pool if it came from there
    if (!state.actorPool.includes(cursorActor)) {
      state.actorPool.push(cursorActor);
    }
  }

  /**
   * Render or update a cursor
   */
  renderCursor(instanceId, userId, cursorData) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    // Check if this is the user's own cursor
    const isSelf = userId === getUserId();

    // Check visibility preferences
    if (isSelf && !getSelfCursorVisible()) {
      // User has disabled their own projected cursor
      this.removeCursor(instanceId, userId);
      // Restore native cursor
      state.container.style.cursor = "";
      return;
    }

    if (!isSelf && !getShowOthersCursors()) {
      // User has disabled viewing others' cursors
      this.removeCursor(instanceId, userId);
      return;
    }

    // Match on viewConfigId (shared across collaborators) if available
    // Fall back to instanceId matching for backward compatibility
    const shouldShow = state.viewConfigId
      ? cursorData.viewConfigId === state.viewConfigId
      : cursorData.instanceId === instanceId;

    if (!shouldShow) {
      this.removeCursor(instanceId, userId);
      return;
    }

    // Determine render mode based on available coordinates
    const hasWorld = hasWorldPosition(cursorData);
    const hasSceneObjects = !!state.sceneObjects?.renderer;
    const mode = hasWorld && hasSceneObjects ? "actor" : "dom";

    if (!isSelf) {
      const previousMode = state.renderModes.get(userId);
      if (previousMode && previousMode !== mode) {
        if (mode === "actor") {
          this._removeDomCursor(state, userId);
        } else {
          this._releaseActor(state, userId);
          this._removeLabel(state, userId);
        }
      }

      const motion = this._updateRemoteMotion(state, userId, cursorData, mode);
      if (!motion) return;
      this._renderFromMotion(state, userId, motion);
      this._ensureAnimation(state);
      state.renderModes.set(userId, mode);
      return;
    }

    if (mode === "actor") {
      // Render as 3D actor (ring on surface)
      this._renderActorCursor(state, userId, cursorData, isSelf);
      // Remove any existing DOM cursor
      this._removeDomCursor(state, userId);
      state.renderModes.set(userId, "actor");
    } else {
      // Fallback to DOM overlay (OS-style cursor)
      this._renderDomCursor(state, userId, cursorData, isSelf);
      // Remove any existing actor cursor
      this._releaseActor(state, userId);
      state.renderModes.set(userId, "dom");
    }
  }

  /**
   * Render cursor as 3D VTK actor (circle ring outline on surface)
   */
  _renderActorCursor(state, userId, cursorData, isSelf = false) {
    const cursorActor = this._acquireActor(state, userId);
    const { world, normal, color } = cursorData;
    
    // Calculate cursor size based on scene scale (cached)
    const ringRadius = this._getRingRadius(state);

    // Check if the user is in VR
    const isVR = typeof userId === 'string' && presenceSystem.getOnlineUsers()
        .find(u => (u.userId === userId || u.odbc === userId) && (u.deviceType === 'vr' || u.capabilities?.xrCapable));

    // Update geometry based on modality
    if (isVR) {
        // Render as a laser line intersecting the volume
        cursorActor.mapper.setInputConnection(cursorActor.lineSource.getOutputPort());
        cursorActor.actor.getProperty().setLineWidth(4.0); // Thicker line
        
        // Raycast originates from world + normal, hits world
        const p1 = [world.x, world.y, world.z];
        const p2 = [
            world.x + (normal?.x || 0) * (ringRadius * 10),
            world.y + (normal?.y || 0) * (ringRadius * 10),
            world.z + (normal?.z || 1) * (ringRadius * 10)
        ];
        cursorActor.lineSource.setPoint1(...p1);
        cursorActor.lineSource.setPoint2(...p2);
    } else {
        // Desktop user (flat circle)
        cursorActor.mapper.setInputConnection(cursorActor.circleSource.getOutputPort());
        cursorActor.actor.getProperty().setLineWidth(2.5);
        cursorActor.circleSource.setRadius(ringRadius);
        cursorActor.circleSource.setCenter([world.x, world.y, world.z]);

        // Orient the ring to lie flat on the surface if we have a normal
        if (normal && (normal.x !== 0 || normal.y !== 0 || normal.z !== 0)) {
          cursorActor.circleSource.setNormal([normal.x, normal.y, normal.z]);
        } else {
          // Default to facing camera (Z-up)
          cursorActor.circleSource.setNormal([0, 0, 1]);
        }
    }

    // Set color from user
    const rgb = hexToRgb(color || "#60a5fa");
    cursorActor.actor.getProperty().setColor(...rgb);
    cursorActor.actor.setVisibility(true);

    // Update or create label (only for other users, not self)
    if (!isSelf) {
      this._updateLabel(state, userId, cursorData, world);
    } else {
      // Remove label for self cursor
      this._removeLabel(state, userId);
    }

    // Trigger render
    this._scheduleRender(state, "actor-update");
  }

  /**
   * Render cursor as DOM overlay (OS-style cursor)
   */
  _renderDomCursor(state, userId, cursorData, isSelf = false) {
    let cursorEl = state.domCursors.get(userId);

    if (!cursorEl) {
      cursorEl = this._createDomCursorElement(cursorData, isSelf);
      state.domCursors.set(userId, cursorEl);
      state.container.appendChild(cursorEl);

      // Hide native OS cursor in workspace when we have self-cursor
      if (isSelf) {
        state.container.style.cursor = "none";
      }
    }

    // Get screen coordinates (use legacy x/y or screen object)
    const screenX = cursorData.screen?.x ?? cursorData.x;
    const screenY = cursorData.screen?.y ?? cursorData.y;

    // Convert from global page coords to container-relative coords
    const rect = this._getContainerRect(state);
    const x = screenX - rect.left;
    const y = screenY - rect.top;

    // Only show if cursor is within container bounds
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      cursorEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      cursorEl.style.display = "block";

      // Update label visibility based on global setting (never show for self)
      const label = cursorEl.querySelector(".cursor-label");
      if (label) {
        const shouldShowLabel = !isSelf && getCursorNamesVisible();
        label.style.display = shouldShowLabel ? "block" : "none";
        
        // Update label content dynamically
        const fullUser = presenceSystem.getOnlineUsers().find(u => u.userId === userId || u.odbc === userId);
        let labelHTML = cursorData.name || "Unknown";
        if (fullUser) {
          if (fullUser.handRaised) labelHTML = `✋ ${labelHTML}`;
          if (fullUser.role === 'presenter') labelHTML = `⭐ ${labelHTML}`;
          if (fullUser.role === 'editor') labelHTML = `✏️ ${labelHTML}`;
          if (fullUser.activity?.label) {
             labelHTML += `<br><span style="font-size: 8px; opacity: 0.8; font-weight: normal">[${fullUser.activity.label}]</span>`;
          }
        }
        label.innerHTML = labelHTML;
      }
    } else {
      cursorEl.style.display = "none";
    }
  }

  /**
   * Update or create label for a cursor
   */
  _updateLabel(state, userId, cursorData, worldPos) {
    let labelEl = state.labels.get(userId);

    if (!labelEl) {
      labelEl = this._createLabelElement(cursorData);
      state.labels.set(userId, labelEl);
      state.container.appendChild(labelEl);
    }

    // Update label content dynamically
    const fullUser = presenceSystem.getOnlineUsers().find(u => u.userId === userId || u.odbc === userId);
    let labelHTML = cursorData.name || "Unknown";
    if (fullUser) {
      if (fullUser.handRaised) labelHTML = `✋ ${labelHTML}`;
      if (fullUser.role === 'presenter') labelHTML = `⭐ ${labelHTML}`;
      if (fullUser.role === 'editor') labelHTML = `✏️ ${labelHTML}`;
      if (fullUser.activity?.label) {
         labelHTML += `<br><span style="font-size: 8px; opacity: 0.8; font-weight: normal">[${fullUser.activity.label}]</span>`;
      }
    }
    labelEl.innerHTML = labelHTML;

    // Check if cursor names should be visible
    const namesVisible = getCursorNamesVisible();

    // Project world position to screen
    const screenPos = worldToScreen(
      state.sceneObjects,
      [worldPos.x, worldPos.y, worldPos.z],
      state.container
    );

    if (namesVisible && screenPos && screenPos.visible) {
      const rect = state.container.getBoundingClientRect();
      const x = screenPos.screenX - rect.left;
      const y = screenPos.screenY - rect.top + LABEL_OFFSET_Y;

      labelEl.style.left = `${x}px`;
      labelEl.style.top = `${y}px`;
      labelEl.style.display = "block";
    } else {
      labelEl.style.display = "none";
    }
  }

  /**
   * Create label DOM element
   */
  _createLabelElement(cursorData) {
    const label = document.createElement("div");
    label.className = "vtk-cursor-label";
    label.style.cssText = `
      position: absolute;
      background: ${cursorData.color || "#60a5fa"};
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-family: Arial, sans-serif;
      white-space: nowrap;
      font-weight: bold;
      max-width: 120px;
      text-overflow: ellipsis;
      overflow: hidden;
      pointer-events: none;
      z-index: 10000;
      transform: translateX(-50%);
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;
    label.textContent = cursorData.name || "Unknown";
    return label;
  }

  /**
   * Create DOM cursor element (OS-style pointer cursor)
   * Mimics the standard operating system cursor appearance
   */
  _createDomCursorElement(cursorData, isSelf = false) {
    const cursor = document.createElement("div");
    cursor.className = "collaborative-cursor";
    cursor.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 0;
      height: 0;
      pointer-events: none;
      z-index: 10000;
      transform: translate3d(0, 0, 0);
      transition: ${isSelf ? "none" : "transform 0.016s linear"};
      will-change: transform;
    `;

    // Create OS-style arrow cursor SVG
    // This mimics the classic Windows/Mac pointer cursor shape
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "24");
    svg.setAttribute("viewBox", "0 0 20 24");
    svg.style.cssText = "filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.4));";

    // Main cursor shape - classic OS pointer arrow
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    // Classic pointer shape: pointed top, body widening down, tail going right
    path.setAttribute("d", "M1,1 L1,18 L5,14 L8,21 L11,20 L8,13 L14,13 L1,1 Z");
    path.setAttribute("fill", cursorData.color || "#60a5fa");
    path.setAttribute("stroke", "white");
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("stroke-linejoin", "round");

    svg.appendChild(path);
    cursor.appendChild(svg);

    // Add name label (only for other users, not self)
    if (!isSelf) {
      const label = document.createElement("div");
      label.className = "cursor-label";
      label.style.cssText = `
        position: absolute;
        top: 20px;
        left: 12px;
        background: ${cursorData.color || "#60a5fa"};
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        white-space: nowrap;
        font-weight: 500;
        max-width: 120px;
        text-overflow: ellipsis;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      `;
      label.textContent = cursorData.name || "Unknown";
      cursor.appendChild(label);
    }

    return cursor;
  }

  /**
   * Remove a DOM cursor
   */
  _removeDomCursor(state, userId) {
    const cursorEl = state.domCursors.get(userId);
    if (cursorEl) {
      cursorEl.remove();
      state.domCursors.delete(userId);

      // Restore native cursor if this was the self cursor
      if (userId === getUserId()) {
        state.container.style.cursor = "";
      }
    }
  }

  /**
   * Remove a label
   */
  _removeLabel(state, userId) {
    const labelEl = state.labels.get(userId);
    if (labelEl) {
      labelEl.remove();
      state.labels.delete(userId);
    }
  }

  /**
   * Remove cursor from instance (both actor and DOM)
   */
  removeCursor(instanceId, userId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    // Remove actor cursor
    this._releaseActor(state, userId);

    // Remove DOM cursor
    this._removeDomCursor(state, userId);

    // Remove label
    this._removeLabel(state, userId);

    // Clear render mode
    state.renderModes.delete(userId);
    state.cursorMotion.delete(userId);

    // Trigger render to show removal
    this._scheduleRender(state, "remove");
  }

  /**
   * Cleanup cursors for an instance
   */
  cleanupInstance(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    // Remove all actor cursors from renderer
    state.actorCursors.forEach((cursorActor) => {
      if (state.sceneObjects?.renderer) {
        state.sceneObjects.renderer.removeActor(cursorActor.actor);
      }
    });
    state.actorCursors.clear();

    // Cleanup actor pool
    state.actorPool.forEach((cursorActor) => {
      cursorActor.actor.delete();
      cursorActor.circleMapper.delete();
      cursorActor.circleSource.delete();
    });
    state.actorPool = [];

    // Remove all DOM cursors
    state.domCursors.forEach((cursorEl) => cursorEl.remove());
    state.domCursors.clear();

    // Restore native cursor
    state.container.style.cursor = "";

    // Remove all labels
    state.labels.forEach((labelEl) => labelEl.remove());
    state.labels.clear();

    // Clear render modes
    state.renderModes.clear();
    state.cursorMotion.clear();

    if (state.animationFrameId) {
      cancelAnimationFrame(state.animationFrameId);
      state.animationFrameId = null;
    }

    // Remove state
    this.instanceStates.delete(instanceId);

    log.debug(`Cleaned up cursors for instance: ${instanceId}`);
  }

  /**
   * Cleanup all cursors
   */
  destroy() {
    // Cleanup all instances
    this.instanceStates.forEach((state, instanceId) => {
      this.cleanupInstance(instanceId);
    });

    // Call cleanup functions
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions = [];
  }
}

// Export singleton instance
export const vtkInstanceCursors = new VTKInstanceCursors();
