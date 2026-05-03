// src/core/vr/VRSceneRenderer.js
// WebXR stereo scene renderer for VTK.js
//
// Handles:
// - Stereo rendering (left/right eye)
// - WebGL/WebXR framebuffer management
// - Camera matrix updates from XR poses
// - Integration with VTK.js renderers

import { vr as log } from "@Utils/logger.js";
import { VRNavigationController } from "./navigation/VRNavigationController.js";

/**
 * VRSceneRenderer - Handles WebXR stereo rendering for VTK.js scenes
 *
 * This class manages the complex interaction between WebXR, WebGL, and VTK.js
 * to render 3D scenes in VR headsets.
 */
export class VRSceneRenderer {
  constructor(options = {}) {
    // VTK.js scene objects
    this._renderer = options.renderer;
    this._renderWindow = options.renderWindow;
    this._openGLRenderWindow = options.openGLRenderWindow;
    this._camera = options.camera;

    // WebXR objects
    this._xrSession = null;
    this._xrLayer = null;
    this._referenceSpace = null;
    this._gl = null;

    // Scene configuration
    this._dataBounds = options.dataBounds || [-1, 1, -1, 1, -1, 1];
    this._sceneCenter = this._computeCenter(this._dataBounds);
    this._sceneDiagonal = this._computeDiagonal(this._dataBounds);

    // VR state
    this._vrOrigin = [0, 0, 0]; // User's position in scene space
    this._vrScale = 1.0; // Scene scale (1.0 = 1 unit = 1 meter)
    this._isRendering = false;
    this._frameId = null;

    // Navigation controller
    this._navigationController = null;

    // Original camera state for restoration
    this._originalCameraState = null;

    // Performance tracking
    this._frameCount = 0;
    this._lastFrameTime = 0;

    // Bind methods
    this._onXRFrame = this._onXRFrame.bind(this);
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  /**
   * Initialize VR rendering for an XR session
   *
   * @param {XRSession} xrSession - Active WebXR session
   * @param {VRExplorationSession} session - VR exploration session config
   * @returns {Promise<void>}
   */
  async initialize(xrSession, session = null) {
    log.info("Initializing VR scene renderer...");

    this._xrSession = xrSession;

    // Save original camera state
    this._saveOriginalCameraState();

    // Get WebGL context from VTK.js render window
    this._gl = this._openGLRenderWindow.get3DContext();

    // Make context XR compatible
    await this._gl.makeXRCompatible();

    // Create XR WebGL layer
    this._xrLayer = new XRWebGLLayer(this._xrSession, this._gl, {
      antialias: true,
      depth: true,
      stencil: false,
      alpha: false,
      framebufferScaleFactor: 1.0, // Can increase for higher quality
    });

    // Update session render state
    await this._xrSession.updateRenderState({
      baseLayer: this._xrLayer,
      depthNear: 0.01,
      depthFar: 1000.0,
    });

    // Get reference space
    try {
      this._referenceSpace = await this._xrSession.requestReferenceSpace(
        "bounded-floor"
      );
      log.debug("Using bounded-floor reference space");
    } catch {
      try {
        this._referenceSpace = await this._xrSession.requestReferenceSpace(
          "local-floor"
        );
        log.debug("Using local-floor reference space");
      } catch {
        this._referenceSpace = await this._xrSession.requestReferenceSpace(
          "local"
        );
        log.debug("Using local reference space");
      }
    }

    // Configure VR scale based on scene size
    this._configureVRScale(session);

    // Initialize navigation controller
    if (session) {
      this._navigationController = new VRNavigationController(session, {
        vrOrigin: this._vrOrigin,
        vrScale: this._vrScale,
        dataBounds: this._dataBounds,
        sceneCenter: this._sceneCenter,
      });
    }

    // Configure VTK.js camera for VR
    this._configureVTKCamera();

    log.info("VR scene renderer initialized", {
      vrScale: this._vrScale,
      sceneDiagonal: this._sceneDiagonal,
    });
  }

  /**
   * Configure VR scale based on scene dimensions
   * Aim for comfortable viewing (model ~1-2 meters in VR)
   */
  _configureVRScale(session) {
    // Default to session scale if provided
    if (session?.defaultVRScale) {
      this._vrScale = session.defaultVRScale;
      return;
    }

    // Auto-scale based on scene diagonal
    if (this._sceneDiagonal > 0) {
      // Target: make scene diagonal about 2 meters in VR
      this._vrScale = 2.0 / this._sceneDiagonal;
      log.debug(
        `Auto VR scale: ${this._vrScale.toFixed(4)} (diagonal: ${this._sceneDiagonal.toFixed(2)})`
      );
    }

    // Position user at comfortable distance from center
    const viewDistance = 1.5 / this._vrScale; // 1.5 meters back in VR
    this._vrOrigin = [
      this._sceneCenter[0],
      this._sceneCenter[1],
      this._sceneCenter[2] + viewDistance,
    ];
  }

  /**
   * Configure VTK.js camera for VR rendering
   */
  _configureVTKCamera() {
    // Disable VTK.js camera manipulators during VR
    // The camera will be controlled entirely by WebXR poses

    // Set initial camera position
    this._camera.setPosition(...this._vrOrigin);
    this._camera.setFocalPoint(...this._sceneCenter);
    this._camera.setViewUp(0, 1, 0);

    // Ensure perspective projection
    this._camera.setParallelProjection(false);

    // Set clipping range for VR
    const nearClip = 0.01 / this._vrScale;
    const farClip = 1000.0 / this._vrScale;
    this._camera.setClippingRange(nearClip, farClip);
  }

  // ===========================================================================
  // RENDER LOOP
  // ===========================================================================

  /**
   * Start VR rendering
   */
  start() {
    if (this._isRendering) return;

    this._isRendering = true;
    this._frameId = this._xrSession.requestAnimationFrame(this._onXRFrame);
    log.info("VR rendering started");
  }

  /**
   * Stop VR rendering
   */
  stop() {
    this._isRendering = false;
    this._frameId = null;
    log.info("VR rendering stopped");
  }

  /**
   * XR frame callback - renders stereo views
   *
   * @param {DOMHighResTimeStamp} time
   * @param {XRFrame} frame
   */
  _onXRFrame(time, frame) {
    if (!this._isRendering || !this._xrSession) return;

    // Request next frame immediately
    this._frameId = this._xrSession.requestAnimationFrame(this._onXRFrame);

    // Calculate delta time
    const deltaTime = this._lastFrameTime
      ? (time - this._lastFrameTime) / 1000
      : 0.016;
    this._lastFrameTime = time;
    this._frameCount++;

    try {
      // Get viewer pose
      const viewerPose = frame.getViewerPose(this._referenceSpace);
      if (!viewerPose) {
        // Tracking lost, skip frame
        return;
      }

      // Gather input state
      const inputState = this._gatherInputState(frame);

      // Update navigation
      if (this._navigationController) {
        const navResult = this._navigationController.update(
          inputState,
          frame,
          deltaTime
        );

        // Apply navigation results
        if (navResult.position) {
          this._vrOrigin = navResult.position;
        }
        if (navResult.vrScale !== null) {
          this._vrScale = navResult.vrScale;
        }
      }

      // Render stereo views
      this._renderStereoViews(frame, viewerPose);

      // Emit frame event
      this._emitFrameEvent(time, deltaTime, inputState, viewerPose);
    } catch (error) {
      log.error("Error in VR frame:", error);
    }
  }

  /**
   * Render both eye views
   */
  _renderStereoViews(frame, viewerPose) {
    const gl = this._gl;
    const xrLayer = this._xrLayer;

    // Bind XR framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, xrLayer.framebuffer);

    // Clear once for the whole framebuffer
    gl.clearColor(0.1, 0.1, 0.12, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // Render each view (typically left and right eye)
    for (const view of viewerPose.views) {
      const viewport = xrLayer.getViewport(view);

      // Set viewport for this eye
      gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

      // Update VTK camera from XR view
      this._updateCameraFromXRView(view);

      // Tell VTK.js render window about the viewport
      this._openGLRenderWindow.setSize(viewport.width, viewport.height);

      // Render the scene
      this._renderer.setViewport(
        viewport.x / xrLayer.framebufferWidth,
        viewport.y / xrLayer.framebufferHeight,
        viewport.width / xrLayer.framebufferWidth,
        viewport.height / xrLayer.framebufferHeight
      );

      // Trigger VTK.js render
      this._renderWindow.render();
    }

    // Reset viewport to full framebuffer (for any post-processing)
    this._renderer.setViewport(0, 0, 1, 1);
  }

  /**
   * Update VTK.js camera from WebXR view pose
   *
   * @param {XRView} xrView - WebXR view (left or right eye)
   */
  _updateCameraFromXRView(xrView) {
    const viewMatrix = xrView.transform.inverse.matrix;

    // Extract eye position from view matrix (column-major, last column)
    // Transform from VR space to scene space
    const eyePosition = [
      viewMatrix[12] / this._vrScale + this._vrOrigin[0],
      viewMatrix[13] / this._vrScale + this._vrOrigin[1],
      viewMatrix[14] / this._vrScale + this._vrOrigin[2],
    ];

    // Extract view direction (negative Z axis in WebXR)
    const forward = [
      -viewMatrix[8],
      -viewMatrix[9],
      -viewMatrix[10],
    ];

    // Extract up direction (Y axis)
    const up = [viewMatrix[4], viewMatrix[5], viewMatrix[6]];

    // Calculate focal point (1 unit ahead in scene space)
    const focalDistance = 1.0 / this._vrScale;
    const focalPoint = [
      eyePosition[0] + forward[0] * focalDistance,
      eyePosition[1] + forward[1] * focalDistance,
      eyePosition[2] + forward[2] * focalDistance,
    ];

    // Update VTK.js camera
    this._camera.setPosition(...eyePosition);
    this._camera.setFocalPoint(...focalPoint);
    this._camera.setViewUp(...up);

    // Apply XR projection matrix directly
    // This ensures correct stereo separation and FOV
    this._camera.setProjectionMatrix(xrView.projectionMatrix);

    // Disable parallel projection (ensure perspective)
    this._camera.setParallelProjection(false);
  }

  // ===========================================================================
  // INPUT HANDLING
  // ===========================================================================

  /**
   * Gather controller input state from XR frame
   *
   * @param {XRFrame} frame
   * @returns {Object} Input state
   */
  _gatherInputState(frame) {
    const state = {
      headPose: null,
      controllers: {
        left: null,
        right: null,
      },
      hands: {
        left: null,
        right: null,
      },
    };

    // Get head pose
    const viewerPose = frame.getViewerPose(this._referenceSpace);
    if (viewerPose) {
      state.headPose = viewerPose.transform;
    }

    // Get controller states
    for (const source of this._xrSession.inputSources) {
      if (source.hand) {
        // Hand tracking
        state.hands[source.handedness] = this._getHandState(frame, source);
        continue;
      }

      if (source.gripSpace) {
        const handedness = source.handedness;
        try {
          const gripPose = frame.getPose(source.gripSpace, this._referenceSpace);
          const targetRayPose = source.targetRaySpace
            ? frame.getPose(source.targetRaySpace, this._referenceSpace)
            : null;

          state.controllers[handedness] = {
            pose: gripPose?.transform,
            targetRay: targetRayPose?.transform,
            gamepad: source.gamepad,
            // Button states
            triggerPressed: source.gamepad?.buttons?.[0]?.pressed || false,
            triggerValue: source.gamepad?.buttons?.[0]?.value || 0,
            squeezePressed: source.gamepad?.buttons?.[1]?.pressed || false,
            squeezeValue: source.gamepad?.buttons?.[1]?.value || 0,
            // Thumbstick
            thumbstick: {
              x: source.gamepad?.axes?.[2] || 0,
              y: source.gamepad?.axes?.[3] || 0,
              pressed: source.gamepad?.buttons?.[3]?.pressed || false,
            },
            // Face buttons (A/B on right, X/Y on left)
            buttons: {
              primary: source.gamepad?.buttons?.[4]?.pressed || false, // A or X
              secondary: source.gamepad?.buttons?.[5]?.pressed || false, // B or Y
            },
          };
        } catch (e) {
          // Pose not available
        }
      }
    }

    return state;
  }

  /**
   * Get hand tracking state
   *
   * @param {XRFrame} frame
   * @param {XRInputSource} source
   * @returns {Object|null} Hand joint data
   */
  _getHandState(frame, source) {
    if (!source.hand) return null;

    const joints = {};
    for (const joint of source.hand.values()) {
      try {
        const jointPose = frame.getJointPose(joint, this._referenceSpace);
        if (jointPose) {
          joints[joint.jointName] = {
            position: jointPose.transform.position,
            orientation: jointPose.transform.orientation,
            radius: jointPose.radius,
          };
        }
      } catch (e) {
        // Joint pose not available
      }
    }

    return Object.keys(joints).length > 0 ? joints : null;
  }

  // ===========================================================================
  // VR ORIGIN & SCALE
  // ===========================================================================

  /**
   * Set VR origin (user position in scene space)
   *
   * @param {number[]} position - [x, y, z] in scene coordinates
   */
  setVROrigin(position) {
    this._vrOrigin = [...position];
  }

  /**
   * Get current VR origin
   *
   * @returns {number[]} [x, y, z]
   */
  getVROrigin() {
    return [...this._vrOrigin];
  }

  /**
   * Set VR scale (scene units per meter)
   *
   * @param {number} scale
   */
  setVRScale(scale) {
    this._vrScale = Math.max(0.001, Math.min(1000, scale));
    log.debug(`VR scale set to: ${this._vrScale}`);
  }

  /**
   * Get current VR scale
   *
   * @returns {number}
   */
  getVRScale() {
    return this._vrScale;
  }

  /**
   * Teleport user to a position
   *
   * @param {number[]} position - [x, y, z] in scene coordinates
   * @param {number[]} orientation - Optional [yaw, pitch, roll] in radians
   */
  teleportTo(position, orientation = null) {
    this._vrOrigin = [...position];
    log.debug(`Teleported to: ${position.join(", ")}`);
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  /**
   * Compute center of bounds
   */
  _computeCenter(bounds) {
    return [
      (bounds[0] + bounds[1]) / 2,
      (bounds[2] + bounds[3]) / 2,
      (bounds[4] + bounds[5]) / 2,
    ];
  }

  /**
   * Compute diagonal length of bounds
   */
  _computeDiagonal(bounds) {
    return Math.sqrt(
      Math.pow(bounds[1] - bounds[0], 2) +
        Math.pow(bounds[3] - bounds[2], 2) +
        Math.pow(bounds[5] - bounds[4], 2)
    );
  }

  /**
   * Save original camera state for restoration
   */
  _saveOriginalCameraState() {
    this._originalCameraState = {
      position: this._camera.getPosition(),
      focalPoint: this._camera.getFocalPoint(),
      viewUp: this._camera.getViewUp(),
      clippingRange: this._camera.getClippingRange(),
      parallelScale: this._camera.getParallelScale(),
      viewAngle: this._camera.getViewAngle(),
    };
  }

  /**
   * Restore original camera state
   */
  restoreCameraState() {
    if (!this._originalCameraState) return;

    this._camera.setPosition(...this._originalCameraState.position);
    this._camera.setFocalPoint(...this._originalCameraState.focalPoint);
    this._camera.setViewUp(...this._originalCameraState.viewUp);
    this._camera.setClippingRange(...this._originalCameraState.clippingRange);
    this._camera.setParallelScale(this._originalCameraState.parallelScale);
    this._camera.setViewAngle(this._originalCameraState.viewAngle);
    this._camera.setProjectionMatrix(null); // Clear XR projection matrix
  }

  /**
   * Emit frame event for external listeners
   */
  _emitFrameEvent(time, deltaTime, inputState, viewerPose) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cia:vr-frame", {
          detail: {
            time,
            deltaTime,
            frameCount: this._frameCount,
            inputState,
            viewerPose,
            vrOrigin: this._vrOrigin,
            vrScale: this._vrScale,
          },
        })
      );
    }
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Clean up VR scene renderer
   */
  dispose() {
    log.info("Disposing VR scene renderer...");

    // Stop rendering
    this.stop();

    // Restore camera
    this.restoreCameraState();

    // Clean up navigation
    if (this._navigationController) {
      this._navigationController.cleanup();
      this._navigationController = null;
    }

    // Clear references
    this._xrSession = null;
    this._xrLayer = null;
    this._referenceSpace = null;
    this._gl = null;

    log.info("VR scene renderer disposed");
  }

  // ===========================================================================
  // GETTERS
  // ===========================================================================

  get isRendering() {
    return this._isRendering;
  }

  get frameCount() {
    return this._frameCount;
  }

  get navigationController() {
    return this._navigationController;
  }

  get referenceSpace() {
    return this._referenceSpace;
  }

  get xrLayer() {
    return this._xrLayer;
  }
}

export default VRSceneRenderer;
