// src/core/vr/navigation/VRNavigationController.js
// Orchestrates VR navigation modes (fly, teleport, walk, scale)

import { vr as log } from "@Utils/logger.js";
import { EXPLORATION_MODES } from "@Core/data/models/VRExplorationSession.js";
import { VRFlyMode } from "./VRFlyMode.js";
import { VRTeleportMode } from "./VRTeleportMode.js";
import { VRScaleController } from "./VRScaleController.js";

export class VRNavigationController {
  constructor(session, vrContext) {
    this._session = session;
    this._vrContext = vrContext;
    this._activeMode = null;
    this._activeModeId = null;

    // Navigation modes
    this._modes = {
      [EXPLORATION_MODES.FLY]: new VRFlyMode(vrContext),
      [EXPLORATION_MODES.TELEPORT]: new VRTeleportMode(vrContext),
      // WALK mode uses same as fly but restricted to ground
      [EXPLORATION_MODES.WALK]: new VRFlyMode(vrContext, { groundLocked: true }),
    };

    // Scale controller is always active alongside navigation
    this._scaleController = new VRScaleController(vrContext);

    // Set default mode
    this.setMode(session.defaultExplorationMode || EXPLORATION_MODES.FLY);
  }

  /**
   * Set the active navigation mode
   *
   * @param {string} modeId - One of EXPLORATION_MODES
   */
  setMode(modeId) {
    if (this._activeModeId === modeId) return;

    // Deactivate current mode
    if (this._activeMode) {
      this._activeMode.deactivate();
    }

    // Activate new mode
    this._activeMode = this._modes[modeId];
    this._activeModeId = modeId;

    if (this._activeMode) {
      this._activeMode.activate();
      log.debug(`Navigation mode changed to: ${modeId}`);
    } else {
      log.warn(`Unknown navigation mode: ${modeId}`);
    }
  }

  /**
   * Get current navigation mode
   */
  getMode() {
    return this._activeModeId;
  }

  /**
   * Cycle through available navigation modes
   */
  cycleMode() {
    const modes = [
      EXPLORATION_MODES.FLY,
      EXPLORATION_MODES.TELEPORT,
      EXPLORATION_MODES.WALK,
    ];

    const currentIndex = modes.indexOf(this._activeModeId);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setMode(modes[nextIndex]);

    return modes[nextIndex];
  }

  /**
   * Update navigation based on input state
   * Called every frame
   *
   * @param {Object} inputState - Controller input state
   * @param {XRFrame} frame - XR frame
   * @param {number} deltaTime - Time since last frame in seconds
   * @returns {Object} Navigation result { position, orientation, vrScale }
   */
  update(inputState, frame, deltaTime) {
    let result = {
      position: null,
      orientation: null,
      vrScale: null,
      teleporting: false,
    };

    // Check for scale gesture (two-hand pinch)
    const scaleResult = this._scaleController.update(inputState, deltaTime);
    if (scaleResult.scaling) {
      result.vrScale = scaleResult.newScale;
    }

    // Update active navigation mode
    if (this._activeMode && !scaleResult.scaling) {
      const navResult = this._activeMode.update(inputState, frame, deltaTime);
      result = { ...result, ...navResult };
    }

    return result;
  }

  /**
   * Get current VR scale
   */
  getScale() {
    return this._scaleController.getScale();
  }

  /**
   * Set VR scale directly
   *
   * @param {number} scale - New scale value
   */
  setScale(scale) {
    this._scaleController.setScale(scale);
  }

  /**
   * Get navigation mode display info
   */
  getModeInfo() {
    const modeInfo = {
      [EXPLORATION_MODES.FLY]: {
        name: "Fly",
        icon: "fly",
        description: "Free movement in all directions",
        controls: "Thumbstick to move, trigger to boost",
      },
      [EXPLORATION_MODES.TELEPORT]: {
        name: "Teleport",
        icon: "teleport",
        description: "Point and teleport to location",
        controls: "Hold thumbstick to aim, release to teleport",
      },
      [EXPLORATION_MODES.WALK]: {
        name: "Walk",
        icon: "walk",
        description: "Ground-locked movement",
        controls: "Thumbstick to move, stays on ground plane",
      },
    };

    return modeInfo[this._activeModeId] || modeInfo[EXPLORATION_MODES.FLY];
  }

  /**
   * Get scale controller info
   */
  getScaleInfo() {
    return {
      currentScale: this._scaleController.getScale(),
      minScale: this._scaleController.getMinScale(),
      maxScale: this._scaleController.getMaxScale(),
    };
  }

  /**
   * Clean up navigation controller
   */
  cleanup() {
    if (this._activeMode) {
      this._activeMode.deactivate();
    }
    this._scaleController.cleanup();
  }
}

export default VRNavigationController;
