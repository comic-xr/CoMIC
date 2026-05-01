// src/core/vr/VRManager.js
// Manages VR session lifecycle and mode transitions
//
// WebXR Implementation for immersive VR experiences
//
// VR Modes:
// - 'inactive': Desktop mode, no VR session
// - 'grid': Views arranged in curved arc around user (Fiesta-style)
// - 'isolated': Single view at room-scale, user can walk around

import { vr as log } from "@Utils/logger.js";
import { BaseManager } from "@Core/data/managers/BaseManager.js";
import { viewConfigurationManager } from "@Core/data/managers/ViewConfigurationManager.js";
import { vrIsolationMode } from "@Core/vr/VRIsolationMode.js";
import { vrModeManager } from "@VR/vrModeManager.js";

/**
 * VRManager - Manages VR session lifecycle
 *
 * Responsibilities:
 * - Check WebXR availability and capabilities
 * - Enter/exit VR sessions
 * - Manage XR render loop and frame timing
 * - Track input sources (controllers, hands)
 * - Switch between grid and isolation modes
 * - Coordinate with handlers for VR rendering
 */
class VRManager extends BaseManager {
  constructor() {
    super({
      events: [
        "vrEntered",
        "vrExited",
        "modeChanged",
        "isolationEntered",
        "isolationExited",
        "isolationUpdated",
        "handConnected",
        "handDisconnected",
        "controllerConnected",
        "controllerDisconnected",
        "controllerUpdate",
        "handUpdate",
        "selectStart",
        "selectEnd",
        "squeezeStart",
        "squeezeEnd",
        "buttonPress",
        "buttonRelease",
        "sessionStarted",
        "sessionEnded",
        "frame",
        "error",
      ],
      logCategory: "vr",
    });

    this._mode = "inactive"; // 'inactive' | 'grid' | 'isolated'
    this._xrSession = null;
    this._referenceSpace = null;
    this._xrLayer = null;
    this._isolatedViewId = null;
    this._inputSources = new Map(); // XRInputSource -> controller data
    this._hands = { left: null, right: null };
    this._mode = "inactive";
    this._xrSession = null;
    this._isolatedViewId = null;
    this._referenceSpace = null;

    // WebXR state
    this._glContext = null;
    this._frameId = null;
    this._isRendering = false;
    this._viewerPose = null;
    this._isolationMode = vrIsolationMode;

    // Frame timing
    this._lastFrameTime = 0;
    this._frameCount = 0;
    this._sessionConfig = null;

    // Bind methods for event handlers
    this._handleSessionEnd = this._handleSessionEnd.bind(this);
    this._onXRFrame = this._onXRFrame.bind(this);
    this._handleInputSourcesChange = this._handleInputSourcesChange.bind(this);
    this._handleSelect = this._handleSelect.bind(this);
    this._handleSelectStart = this._handleSelectStart.bind(this);
    this._handleSelectEnd = this._handleSelectEnd.bind(this);
    this._handleSqueezeStart = this._handleSqueezeStart.bind(this);
    this._handleSqueezeEnd = this._handleSqueezeEnd.bind(this);

    this._isolationCleanup = [
      this._isolationMode.on("scaleChanged", (data) => {
        this._emit("isolationUpdated", {
          ...data,
          isolatedViewId: this._isolatedViewId,
          state: this._isolationMode.getState(),
        });
      }),
      this._isolationMode.on("positionChanged", (data) => {
        this._emit("isolationUpdated", {
          ...data,
          isolatedViewId: this._isolatedViewId,
          state: this._isolationMode.getState(),
        });
      }),
      this._isolationMode.on("transitionEnd", (data) => {
        this._emit("isolationUpdated", {
          ...data,
          isolatedViewId: this._isolatedViewId,
          state: this._isolationMode.getState(),
        });
      }),
    ];
  }

  // ===========================================================================
  // CAPABILITY DETECTION
  // ===========================================================================

  /**
   * Check if WebXR is available in the browser
   */
  isVRSupported() {
    return (
      typeof navigator !== "undefined" &&
      "xr" in navigator &&
      typeof navigator.xr.isSessionSupported === "function"
    );
  }

  /**
   * Check for specific VR capabilities
   * @returns {Promise<{supported: boolean, reason: string|null, features: string[]}>}
   */
  async checkVRCapabilities() {
    if (!this.isVRSupported()) {
      return {
        supported: false,
        reason: "WebXR not available in this browser",
        features: [],
      };
    }

    try {
      const immersiveSupported = await navigator.xr.isSessionSupported(
        "immersive-vr"
      );

      if (!immersiveSupported) {
        return {
          supported: false,
          reason: "Immersive VR not supported on this device",
          features: [],
        };
      }

      // Check for optional features
      const features = ["immersive-vr"];

      // These checks would need actual session to verify, so we just list potential
      const potentialFeatures = [
        "local-floor",
        "bounded-floor",
        "hand-tracking",
        "layers",
      ];

      return {
        supported: true,
        reason: null,
        features,
        potentialFeatures,
      };
    } catch (error) {
      return {
        supported: false,
        reason: `WebXR check failed: ${error.message}`,
        features: [],
      };
    }
  }

  // ===========================================================================
  // SESSION MANAGEMENT
  // ===========================================================================

  /**
   * Enter VR mode
   * @param {WebGLRenderingContext} glContext - Optional WebGL context to use
   * @returns {Promise<void>}
   */
  async enterVR(glContext = null, options = {}) {
    log.info("VRManager.enterVR() - Starting VR session");

    if (this._xrSession) {
      log.warn("VR session already active");
      return;
    }

    if (!this.isVRSupported()) {
      const error = new Error("WebXR is not supported in this browser");
      this._emit("error", { error, type: "not_supported" });
      throw error;
    }

    try {
      // Check if immersive-vr is supported
      const isSupported = await navigator.xr.isSessionSupported("immersive-vr");
      if (!isSupported) {
        throw new Error("Immersive VR not supported on this device");
      }

      log.debug("Requesting immersive-vr session...");

      const requestedFeatures = {
        requiredFeatures: Array.isArray(options.requiredFeatures)
          ? options.requiredFeatures
          : ["local-floor"],
        optionalFeatures: Array.isArray(options.optionalFeatures)
          ? options.optionalFeatures
          : ["bounded-floor", "hand-tracking", "layers"],
      };

      this._sessionConfig = {
        sessionId: options.sessionId || null,
        navigationMode: options.navigationMode || "fly",
        scale: options.scale ?? 1,
        deviceProfile: options.deviceProfile || "generic",
      };

      // Request immersive session with features
      this._xrSession = await navigator.xr.requestSession("immersive-vr", requestedFeatures);

      log.debug("XR session obtained, setting up event listeners...");

      // Set up session event listeners
      this._xrSession.addEventListener("end", this._handleSessionEnd);
      this._xrSession.addEventListener(
        "inputsourceschange",
        this._handleInputSourcesChange
      );
      this._xrSession.addEventListener("select", this._handleSelect);
      this._xrSession.addEventListener("selectstart", this._handleSelectStart);
      this._xrSession.addEventListener("selectend", this._handleSelectEnd);
      this._xrSession.addEventListener(
        "squeezestart",
        this._handleSqueezeStart
      );
      this._xrSession.addEventListener("squeezeend", this._handleSqueezeEnd);

      // Get reference space (try bounded-floor first, fall back to local-floor)
      try {
        this._referenceSpace = await this._xrSession.requestReferenceSpace(
          "bounded-floor"
        );
        log.debug("Using bounded-floor reference space");
      } catch {
        this._referenceSpace = await this._xrSession.requestReferenceSpace(
          "local-floor"
        );
        log.debug("Using local-floor reference space");
      }

      // Set up WebGL layer if context provided
      if (glContext) {
        await this._setupWebGLLayer(glContext);
      }

      // Initialize input sources that may already be connected
      this._initializeInputSources();

      // Update state
      this._mode = "grid";
      this._isRendering = true;

      // Emit events
      this._emit("sessionStarted", {
        session: this._xrSession,
        referenceSpace: this._referenceSpace,
        sessionType: "immersive-vr",
        config: this._sessionConfig,
      });
      this._emit("vrEntered", {
        sessionType: "immersive-vr",
        config: this._sessionConfig,
      });
      this._emit("modeChanged", { mode: this._mode });
      vrModeManager.setMode("vr");

      // Start render loop
      this._frameId = this._xrSession.requestAnimationFrame(this._onXRFrame);

      log.info("VR session started successfully");
    } catch (error) {
      log.error("Failed to enter VR:", error);
      this._emit("error", { error, type: "session_failed" });
      this._cleanup();
      throw new Error(`Failed to enter VR: ${error.message}`);
    }
  }

  /**
   * Set up WebGL layer for XR rendering
   * @private
   */
  async _setupWebGLLayer(glContext) {
    this._glContext = glContext;

    // Make XR compatible
    await glContext.makeXRCompatible();

    // Create XR layer
    this._xrLayer = new XRWebGLLayer(this._xrSession, glContext);

    // Update session render state
    this._xrSession.updateRenderState({
      baseLayer: this._xrLayer,
    });

    log.debug("WebGL layer configured for XR");
  }

  /**
   * Exit VR mode
   * @returns {Promise<void>}
   */
  async exitVR() {
    log.info("VRManager.exitVR() - Ending VR session");

    if (!this._xrSession) {
      log.warn("No VR session to exit");
      return;
    }

    // Stop render loop
    this._isRendering = false;
    if (this._frameId) {
      // Can't cancel XR animation frame directly, but stopping the loop is enough
      this._frameId = null;
    }

    try {
      await this._xrSession.end();
      log.info("VR session ended gracefully");
    } catch (error) {
      log.error("Error ending VR session:", error);
      // Clean up anyway
      this._cleanup();
    }
  }

  /**
   * Handle XR session end event (called by system or after exitVR)
   * @private
   */
  _handleSessionEnd(event) {
    log.info("VR session ended", event?.reason || "");
    this._cleanup();
  }

  /**
   * Clean up after VR session
   * @private
   */
  _cleanup() {
    // Remove event listeners
    if (this._xrSession) {
      this._xrSession.removeEventListener("end", this._handleSessionEnd);
      this._xrSession.removeEventListener(
        "inputsourceschange",
        this._handleInputSourcesChange
      );
      this._xrSession.removeEventListener("select", this._handleSelect);
      this._xrSession.removeEventListener(
        "selectstart",
        this._handleSelectStart
      );
      this._xrSession.removeEventListener("selectend", this._handleSelectEnd);
      this._xrSession.removeEventListener(
        "squeezestart",
        this._handleSqueezeStart
      );
      this._xrSession.removeEventListener("squeezeend", this._handleSqueezeEnd);
    }

    // Clear input sources
    this._inputSources.clear();
    this._hands = { left: null, right: null };

    // Clear WebXR state
    this._xrSession = null;
    this._referenceSpace = null;
    this._xrLayer = null;
    this._glContext = null;
    this._frameId = null;
    this._isRendering = false;
    this._frameCount = 0;
    this._sessionConfig = null;
    this._viewerPose = null;
    this._isolationMode.reset();

    // Reset mode
    const wasIsolated = this._mode === "isolated";
    this._mode = "inactive";
    this._isolatedViewId = null;

    // Emit events
    this._emit("sessionEnded", { wasIsolated });
    this._emit("vrExited", { wasIsolated });
    this._emit("modeChanged", { mode: this._mode });
    vrModeManager.setMode("desktop");
  }

  // ===========================================================================
  // XR RENDER LOOP
  // ===========================================================================

  /**
   * XR animation frame callback
   * @param {DOMHighResTimeStamp} time - Current time
   * @param {XRFrame} frame - XR frame data
   * @private
   */
  _onXRFrame(time, frame) {
    // Check if we should continue rendering
    if (!this._isRendering || !this._xrSession) {
      return;
    }

    // Request next frame immediately
    this._frameId = this._xrSession.requestAnimationFrame(this._onXRFrame);

    // Calculate delta time
    const deltaTime = this._lastFrameTime ? time - this._lastFrameTime : 16.67;
    this._lastFrameTime = time;
    this._frameCount++;

    try {
      // Get viewer pose
      const viewerPose = frame.getViewerPose(this._referenceSpace);

      if (!viewerPose) {
        // No pose available (tracking lost)
        return;
      }
      this._viewerPose = viewerPose.transform || null;

      // Update input source poses
      const controllerPoses = this._updateInputPoses(frame);

      // Update hand tracking if available
      const handPoses = this._updateHandTracking(frame);

      // Emit frame event with all pose data
      this._emit("frame", {
        time,
        deltaTime,
        frame,
        viewerPose,
        views: viewerPose.views,
        controllerPoses,
        handPoses,
        referenceSpace: this._referenceSpace,
        session: this._xrSession,
        frameCount: this._frameCount,
      });
    } catch (error) {
      log.error("Error in XR frame:", error);
      this._emit("error", { error, type: "frame_error" });
    }
  }

  /**
   * Update input source poses
   * @private
   */
  _updateInputPoses(frame) {
    const poses = {};

    for (const [source, data] of this._inputSources) {
      if (source.gripSpace) {
        const gripPose = frame.getPose(source.gripSpace, this._referenceSpace);
        if (gripPose) {
          data.gripPose = gripPose;
          poses[data.handedness] = {
            gripPose,
            targetRayPose: source.targetRaySpace
              ? frame.getPose(source.targetRaySpace, this._referenceSpace)
              : null,
            gamepad: source.gamepad,
            handedness: data.handedness,
          };

          // Emit controller update
          this._emit("controllerUpdate", {
            source,
            handedness: data.handedness,
            hand: data.handedness,
            gripPose,
            controller: {
              source,
              handedness: data.handedness,
              gripPose,
              targetRayPose: poses[data.handedness].targetRayPose,
              gamepad: source.gamepad,
            },
            gamepad: source.gamepad,
          });
        }
      }
    }

    return poses;
  }

  /**
   * Update hand tracking poses
   * @private
   */
  _updateHandTracking(frame) {
    const handPoses = {};

    // Check if hand tracking is available
    if (!frame.session.inputSources) return handPoses;

    for (const source of frame.session.inputSources) {
      if (source.hand) {
        const handedness = source.handedness;
        const joints = {};

        // Get pose for each joint
        for (const joint of source.hand.values()) {
          const jointPose = frame.getJointPose(joint, this._referenceSpace);
          if (jointPose) {
            joints[joint.jointName] = {
              position: jointPose.transform.position,
              orientation: jointPose.transform.orientation,
              radius: jointPose.radius,
            };
          }
        }

        if (Object.keys(joints).length > 0) {
          handPoses[handedness] = joints;
          this._hands[handedness] = joints;

          this._emit("handUpdate", {
            handedness,
            hand: handedness,
            joints,
            pose: joints,
          });
        }
      }
    }

    return handPoses;
  }

  // ===========================================================================
  // INPUT SOURCE TRACKING
  // ===========================================================================

  /**
   * Initialize input sources already connected when session starts
   * @private
   */
  _initializeInputSources() {
    if (!this._xrSession?.inputSources) return;

    for (const source of this._xrSession.inputSources) {
      this._addInputSource(source);
    }
  }

  /**
   * Handle input sources change event
   * @private
   */
  _handleInputSourcesChange(event) {
    // Handle added sources
    for (const source of event.added) {
      this._addInputSource(source);
    }

    // Handle removed sources
    for (const source of event.removed) {
      this._removeInputSource(source);
    }
  }

  /**
   * Add an input source
   * @private
   */
  _addInputSource(source) {
    const data = {
      handedness: source.handedness || "none",
      targetRayMode: source.targetRayMode,
      profiles: source.profiles,
      gripPose: null,
      isHand: !!source.hand,
    };

    this._inputSources.set(source, data);

    if (source.hand) {
      this._hands[source.handedness] = null; // Will be populated in frame loop
      this._emit("handConnected", {
        source,
        handedness: source.handedness,
      });
      log.debug(`Hand connected: ${source.handedness}`);
    } else {
      this._emit("controllerConnected", {
        source,
        handedness: data.handedness,
        profiles: source.profiles,
      });
      log.debug(
        `Controller connected: ${data.handedness} (${
          source.profiles?.[0] || "unknown"
        })`
      );
    }
  }

  /**
   * Remove an input source
   * @private
   */
  _removeInputSource(source) {
    const data = this._inputSources.get(source);
    if (!data) return;

    this._inputSources.delete(source);

    if (data.isHand) {
      this._hands[data.handedness] = null;
      this._emit("handDisconnected", {
        source,
        handedness: data.handedness,
      });
      log.debug(`Hand disconnected: ${data.handedness}`);
    } else {
      this._emit("controllerDisconnected", {
        source,
        handedness: data.handedness,
      });
      log.debug(`Controller disconnected: ${data.handedness}`);
    }
  }

  // ===========================================================================
  // INPUT EVENT HANDLERS
  // ===========================================================================

  /**
   * Handle select event (trigger fully pressed and released)
   * @private
   */
  _handleSelect(event) {
    const data = this._inputSources.get(event.inputSource);
    log.debug(`Select: ${data?.handedness || "unknown"}`);
  }

  /**
   * Handle select start event (trigger pressed)
   * @private
   */
  _handleSelectStart(event) {
    const data = this._inputSources.get(event.inputSource);
    this._emit("selectStart", {
      source: event.inputSource,
      handedness: data?.handedness,
      hand: data?.handedness,
      frame: event.frame,
    });
    this._emit("buttonPress", {
      source: event.inputSource,
      handedness: data?.handedness,
      hand: data?.handedness,
      button: "trigger",
      frame: event.frame,
    });
  }

  /**
   * Handle select end event (trigger released)
   * @private
   */
  _handleSelectEnd(event) {
    const data = this._inputSources.get(event.inputSource);
    this._emit("selectEnd", {
      source: event.inputSource,
      handedness: data?.handedness,
      hand: data?.handedness,
      frame: event.frame,
    });
    this._emit("buttonRelease", {
      source: event.inputSource,
      handedness: data?.handedness,
      hand: data?.handedness,
      button: "trigger",
      frame: event.frame,
    });
  }

  /**
   * Handle squeeze start event (grip pressed)
   * @private
   */
  _handleSqueezeStart(event) {
    const data = this._inputSources.get(event.inputSource);
    this._emit("squeezeStart", {
      source: event.inputSource,
      handedness: data?.handedness,
      hand: data?.handedness,
      frame: event.frame,
    });
    this._emit("buttonPress", {
      source: event.inputSource,
      handedness: data?.handedness,
      hand: data?.handedness,
      button: "grip",
      frame: event.frame,
    });
  }

  /**
   * Handle squeeze end event (grip released)
   * @private
   */
  _handleSqueezeEnd(event) {
    const data = this._inputSources.get(event.inputSource);
    this._emit("squeezeEnd", {
      source: event.inputSource,
      handedness: data?.handedness,
      hand: data?.handedness,
      frame: event.frame,
    });
    this._emit("buttonRelease", {
      source: event.inputSource,
      handedness: data?.handedness,
      hand: data?.handedness,
      button: "grip",
      frame: event.frame,
    });
  }

  // ===========================================================================
  // CONTROLLER ACCESS
  // ===========================================================================

  /**
   * Get connected controllers
   * @returns {Array<{handedness: string, source: XRInputSource, profiles: string[]}>}
   */
  getControllers() {
    const controllers = [];
    for (const [source, data] of this._inputSources) {
      if (!data.isHand) {
        controllers.push({
          handedness: data.handedness,
          source,
          profiles: source.profiles,
        });
      }
    }
    return controllers;
  }

  /**
   * Get controller by handedness
   * @param {string} handedness - 'left' | 'right'
   * @returns {XRInputSource|null}
   */
  getController(handedness) {
    for (const [source, data] of this._inputSources) {
      if (!data.isHand && data.handedness === handedness) {
        return source;
      }
    }
    return null;
  }

  /**
   * Get hand tracking data
   * @param {string} handedness - 'left' | 'right'
   * @returns {Object|null} Joint poses
   */
  getHandTracking(handedness) {
    return this._hands[handedness];
  }

  /**
   * Check if hand tracking is active
   * @returns {boolean}
   */
  hasHandTracking() {
    return this._hands.left !== null || this._hands.right !== null;
  }

  // ===========================================================================
  // ISOLATION MODE (Room-scale single view)
  // ===========================================================================

  /**
   * Enter isolation mode - pull single view to room-scale
   * User can walk around the 3D model
   *
   * @param {string} viewId - The ViewConfiguration ID to isolate
   */
  enterIsolationMode(viewId) {
    if (this._mode !== "grid") {
      log.warn("Must be in VR grid mode to enter isolation");
      return null;
    }

    const viewConfig = viewConfigurationManager.getView(viewId);
    if (!viewConfig) {
      log.warn(`Cannot enter isolation mode for missing view ${viewId}`);
      return null;
    }

    const isolationState = this._isolationMode.isolateView(viewConfig, {
      transitionMs: 500,
      gridState: {
        previousViewId: this._isolatedViewId,
        activeViewId: viewId,
      },
    });
    this._mode = "isolated";
    this._isolatedViewId = viewId;

    this._emit("isolationEntered", { viewId, isolationState, viewConfig });
    this._emit("modeChanged", {
      mode: this._mode,
      isolatedViewId: viewId,
      isolationState,
    });

    log.debug(`Entered isolation mode for view: ${viewId}`);
    return isolationState;
  }

  /**
   * Exit isolation mode - return to grid view
   */
  exitIsolationMode() {
    if (this._mode !== "isolated") {
      log.warn("Not in isolation mode");
      return null;
    }

    const previousViewId = this._isolatedViewId;
    const isolationState = this._isolationMode.returnToGrid();
    this._mode = "grid";
    this._isolatedViewId = null;

    this._emit("isolationExited", { viewId: previousViewId, isolationState });
    this._emit("modeChanged", { mode: this._mode, isolationState });

    log.debug("Exited isolation mode, returned to grid");
    return isolationState;
  }

  // ===========================================================================
  // STATE GETTERS
  // ===========================================================================

  /**
   * Get current VR state
   */
  getState() {
    return {
      mode: this._mode,
      isolatedViewId: this._isolatedViewId,
      hasSession: this._xrSession !== null,
      isInVR: this._mode !== "inactive",
      isIsolated: this._mode === "isolated",
      isRendering: this._isRendering,
      frameCount: this._frameCount,
      controllerCount: this.getControllers().length,
      hasHandTracking: this.hasHandTracking(),
      isolationState: this._isolationMode.getState(),
      viewerPose: this._viewerPose,
    };
  }

  /**
   * Get current mode
   */
  getMode() {
    return this._mode;
  }

  /**
   * Check if currently in VR
   */
  isInVR() {
    return this._mode !== "inactive";
  }

  /**
   * Check if in isolation mode
   */
  isIsolated() {
    return this._mode === "isolated";
  }

  /**
   * Get the isolated view ID (if in isolation mode)
   */
  getIsolatedViewId() {
    return this._isolatedViewId;
  }

  /**
   * Get the current XR session
   * @returns {XRSession|null}
   */
  getSession() {
    return this._xrSession;
  }

  /**
   * Get the current reference space
   * @returns {XRReferenceSpace|null}
   */
  getReferenceSpace() {
    return this._referenceSpace;
  }

  /**
   * Get the XR WebGL layer
   * @returns {XRWebGLLayer|null}
   */
  getXRLayer() {
    return this._xrLayer;
  }


  /**
   * Get current session configuration
   * @returns {{sessionId:string|null,navigationMode:string,scale:number,deviceProfile:string}|null}
   */
  getSessionConfig() {
    return this._sessionConfig ? { ...this._sessionConfig } : null;
  }

  getIsolationState() {
    return this._isolationMode.getState();
  }

  getHeadPose() {
    return this._viewerPose;
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  dispose() {
    if (this._xrSession) {
      this.exitVR();
    }

    // Clear VR-specific state
    this._inputSources.clear();
    this._hands = { left: null, right: null };
    this._viewerPose = null;
    this._isolationMode.reset();
    this._isolationCleanup.forEach((cleanup) => cleanup?.());
    this._isolationCleanup = [];

    // Call parent cleanup
    super.dispose();
  }

}

// Singleton instance
export const vrManager = new VRManager();
