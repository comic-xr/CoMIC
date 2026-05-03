// src/core/vr/VRExplorationManager.js
// Manages VR exploration session lifecycle and coordination
//
// RESPONSIBILITIES:
// - Create/join/leave exploration sessions
// - Coordinate with VRManager for WebXR
// - Manage participant state via Y.js
// - Bridge between UI and VR system

import { vr as log } from '@Utils/logger.js';
import { vrManager } from '@Core/vr/VRManager.js';
import { VRExplorationSession, PARTICIPATION_MODE, SESSION_STATUS } from '@Core/data/models/VRExplorationSession.js';
import { VRParticipantSync } from '@Core/vr/VRParticipantSync.js';
import { VRToolManager } from '@Core/vr/tools/VRToolManager.js';
import { VRSnapshotManager } from '@Core/vr/VRSnapshotManager.js';
import { VRControlManager } from '@Core/vr/VRControlManager.js';
import { VRNavigationController } from '@Core/vr/navigation/VRNavigationController.js';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { getViewConfigurationManager } from '@Init/appInitializer.js';
import { getUserId, getUserName, getUserColor } from '@Collaboration/presence/userManagement.js';
import { EventEmitter } from '@Utils/EventEmitter.js';

class VRExplorationManager extends EventEmitter {
  constructor() {
    super();

    // Active session
    this._activeSession = null;
    this._activeContext = null;

    // Sub-managers
    this._participantSync = null;
    this._toolManager = null;
    this._snapshotManager = null;
    this._controlManager = null;
    this._navigationController = null;

    // Frame loop
    this._isRunning = false;
    this._lastFrameTime = 0;

    // Bind methods
    this._onFrame = this._onFrame.bind(this);
    this._onSessionEnd = this._onSessionEnd.bind(this);
  }

  // ===========================================================================
  // SESSION LIFECYCLE
  // ===========================================================================

  /**
   * Start a new VR exploration session
   *
   * @param {string} instanceId - Source instance
   * @param {Object} config - Session configuration
   * @returns {Promise<VRExplorationSession>}
   */
  async startExploration(instanceId, config = {}) {
    log.info('Starting VR exploration...', { instanceId, config });

    // Get instance and handler
    const instance = workspaceManager.getInstance(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    const handler = instance.handler;
    if (!handler.supportsVRExploration?.()) {
      throw new Error('Handler does not support VR exploration');
    }

    // Check VR support
    if (!vrManager.isVRSupported()) {
      throw new Error('WebXR not supported');
    }

    // Create session locally (server integration can be added later)
    const session = new VRExplorationSession({
      id: `vrsession_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      viewConfigurationId: instance.viewConfigId,
      datasetId: instance.instanceData?.dataset?.id,
      projectId: instance.instanceData?.projectId,
      ownerUserId: getUserId(),
      ownerUserName: getUserName(),
      ...config,
    });

    // Add self as participant
    session.addParticipant(
      getUserId(),
      getUserName(),
      getUserColor(),
      PARTICIPATION_MODE.VR_EXPLORER
    );

    // Initialize sub-managers
    this._participantSync = new VRParticipantSync(session);
    this._snapshotManager = new VRSnapshotManager(session, getViewConfigurationManager());
    this._controlManager = new VRControlManager(session);

    // Request XR session
    log.debug('Requesting XR session...');
    const xrSession = await navigator.xr.requestSession('immersive-vr', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hand-tracking', 'bounded-floor'],
    });

    // Set up session end handler
    xrSession.addEventListener('end', this._onSessionEnd);

    // Enter VR exploration mode on handler
    log.debug('Entering VR exploration mode on handler...');
    const vrContext = await handler.enterVRExploration(
      instance.instanceData,
      session,
      xrSession
    );

    // Initialize tool manager with handler
    this._toolManager = new VRToolManager(handler, vrContext);

    // Initialize navigation controller
    this._navigationController = new VRNavigationController(session, vrContext);

    // Store active context
    this._activeSession = session;
    this._activeContext = {
      session,
      instance,
      handler,
      vrContext,
      xrSession,
    };

    // Start session
    session.start();

    // Start frame loop
    this._startFrameLoop(xrSession);

    // Start participant sync
    this._participantSync.start();

    // Emit event
    this.emit('explorationStarted', { session, instanceId });

    // Dispatch window event for UI
    window.dispatchEvent(new CustomEvent('cia:vr-session-started', {
      detail: { sessionId: session.id, instanceId }
    }));

    log.info('VR exploration started', { sessionId: session.id });

    return session;
  }

  /**
   * Join an existing VR exploration session
   *
   * @param {string} sessionId - Session to join
   * @param {string} mode - Participation mode
   */
  async joinSession(sessionId, mode = PARTICIPATION_MODE.DESKTOP_OBSERVER) {
    log.info('Joining VR session...', { sessionId, mode });

    // For now, sessions are local - this would fetch from server
    throw new Error('Remote session joining not yet implemented');
  }

  /**
   * Leave the current session
   */
  async leaveSession() {
    if (!this._activeSession) return;

    const session = this._activeSession;

    log.info('Leaving VR session...', { sessionId: session.id });

    // Stop frame loop
    this._stopFrameLoop();

    // Clean up sub-managers
    this._participantSync?.stop();
    await this._toolManager?.cleanup();
    this._snapshotManager?.cleanup();
    this._controlManager?.cleanup();
    this._navigationController?.cleanup();

    // Exit VR exploration on handler
    if (this._activeContext?.handler && this._activeContext?.vrContext) {
      await this._activeContext.handler.exitVRExploration(this._activeContext.vrContext);
    }

    // End XR session if still active
    if (this._activeContext?.xrSession) {
      try {
        await this._activeContext.xrSession.end();
      } catch (e) {
        // Session may already be ended
      }
    }

    // End session
    session.end();

    // Clean up
    this._activeSession = null;
    this._activeContext = null;
    this._participantSync = null;
    this._toolManager = null;
    this._snapshotManager = null;
    this._controlManager = null;
    this._navigationController = null;

    // Emit events
    this.emit('sessionLeft', { sessionId: session.id });

    window.dispatchEvent(new CustomEvent('cia:vr-session-ended', {
      detail: { sessionId: session.id }
    }));
  }

  // ===========================================================================
  // PARTICIPANT MANAGEMENT
  // ===========================================================================

  getActiveSession() {
    return this._activeSession;
  }

  getMyParticipant() {
    return this._activeSession?.getParticipant(getUserId());
  }

  async updateParticipantMode(newMode) {
    if (!this._activeSession) return;

    const participant = this._activeSession.updateParticipantMode(getUserId(), newMode);

    // Sync via Y.js
    this._participantSync?.broadcastParticipant(participant);

    this.emit('participantUpdated', { participant });

    return participant;
  }

  // ===========================================================================
  // CONTROL MANAGEMENT (delegated to VRControlManager)
  // ===========================================================================

  async requestControl(targetUserId) {
    if (!this._controlManager) throw new Error('No active session');
    return this._controlManager.requestControl(targetUserId);
  }

  async releaseControl() {
    if (!this._controlManager) throw new Error('No active session');
    return this._controlManager.releaseControl();
  }

  respondToControlRequest(approved) {
    if (!this._controlManager) return;
    this._controlManager.respondToRequest(approved);
  }

  // ===========================================================================
  // TOOL MANAGEMENT (delegated to VRToolManager)
  // ===========================================================================

  activateTool(toolId) {
    if (!this._toolManager) return;
    this._toolManager.activateTool(toolId);
    this.emit('toolActivated', { toolId });
  }

  deactivateTool() {
    if (!this._toolManager) return;
    this._toolManager.deactivateTool();
    this.emit('toolDeactivated', {});
  }

  getActiveTool() {
    return this._toolManager?.getActiveTool();
  }

  getAvailableTools() {
    return this._toolManager?.getAvailableTools() || [];
  }

  // ===========================================================================
  // NAVIGATION (delegated to VRNavigationController)
  // ===========================================================================

  setNavigationMode(mode) {
    if (!this._navigationController) return;
    this._navigationController.setMode(mode);
    this.emit('navigationModeChanged', { mode });
    return mode;
  }

  getNavigationMode() {
    return this._navigationController?.getMode();
  }

  cycleNavigationMode() {
    if (!this._navigationController) return null;
    const newMode = this._navigationController.cycleMode();
    this.emit('navigationModeChanged', { mode: newMode });
    return newMode;
  }

  getNavigationModeInfo() {
    return this._navigationController?.getModeInfo();
  }

  getVRScale() {
    return this._navigationController?.getScale() || 1.0;
  }

  setVRScale(scale) {
    if (!this._navigationController) return;
    this._navigationController.setScale(scale);
    this.emit('vrScaleChanged', { scale });
  }

  // ===========================================================================
  // SNAPSHOTS (delegated to VRSnapshotManager)
  // ===========================================================================

  async createSnapshot(name) {
    if (!this._snapshotManager) throw new Error('No active session');
    return this._snapshotManager.quickSave(name);
  }

  async loadSnapshot(snapshotId) {
    if (!this._snapshotManager) throw new Error('No active session');
    return this._snapshotManager.loadSnapshot(snapshotId);
  }

  getSessionSnapshots() {
    return this._snapshotManager?.getSessionSnapshots() || [];
  }

  // ===========================================================================
  // FRAME LOOP
  // ===========================================================================

  _startFrameLoop(xrSession) {
    this._isRunning = true;
    xrSession.requestAnimationFrame(this._onFrame);
  }

  _stopFrameLoop() {
    this._isRunning = false;
  }

  _onFrame(time, frame) {
    if (!this._isRunning || !this._activeContext) return;

    const { handler, vrContext, xrSession } = this._activeContext;

    // Calculate delta time
    const deltaTime = this._lastFrameTime ? (time - this._lastFrameTime) / 1000 : 0.016;
    this._lastFrameTime = time;

    try {
      // Get input state
      const inputState = this._gatherInputState(frame);

      // Update navigation (handles movement, teleport, scale)
      if (this._navigationController) {
        const navResult = this._navigationController.update(inputState, frame, deltaTime);

        // Apply navigation result to VR context
        if (navResult.vrScale !== null) {
          vrContext.vrScale = navResult.vrScale;
        }
        if (navResult.position) {
          vrContext.vrOrigin = [
            navResult.position.x,
            navResult.position.y,
            navResult.position.z,
          ];
        }
      }

      // Update tools
      const toolAction = this._toolManager?.update(inputState, frame);
      if (toolAction) {
        this._handleToolAction(toolAction);
      }

      // Update participant sync
      this._participantSync?.updateLocalState({
        headPose: inputState.headPose,
        leftHandPose: inputState.controllers?.left?.pose,
        rightHandPose: inputState.controllers?.right?.pose,
        vrScale: vrContext.vrScale || 1.0,
      });

      // Let handler update VR rendering
      handler.updateVRExploration?.(vrContext, frame, inputState);

      // Emit frame event for UI
      this.emit('frame', { time, inputState, deltaTime });

    } catch (error) {
      log.error('Error in VR frame loop:', error);
    }

    // Continue loop
    xrSession.requestAnimationFrame(this._onFrame);
  }

  _gatherInputState(frame) {
    const session = frame.session;
    const referenceSpace = vrManager.getReferenceSpace?.() ||
      session.requestReferenceSpace?.('local-floor');

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
    try {
      const viewerPose = frame.getViewerPose(referenceSpace);
      if (viewerPose) {
        state.headPose = viewerPose.transform;
      }
    } catch (e) {
      // Reference space not ready
    }

    // Get controller states
    for (const source of session.inputSources) {
      if (source.hand) {
        // Hand tracking - skip for now
        continue;
      }

      if (source.gripSpace) {
        const handedness = source.handedness;
        try {
          const gripPose = frame.getPose(source.gripSpace, referenceSpace);
          const targetRayPose = source.targetRaySpace
            ? frame.getPose(source.targetRaySpace, referenceSpace)
            : null;

          state.controllers[handedness] = {
            pose: gripPose?.transform,
            targetRay: targetRayPose?.transform,
            gamepad: source.gamepad,
            triggerPressed: source.gamepad?.buttons?.[0]?.pressed || false,
            triggerValue: source.gamepad?.buttons?.[0]?.value || 0,
            squeezePressed: source.gamepad?.buttons?.[1]?.pressed || false,
            squeezeValue: source.gamepad?.buttons?.[1]?.value || 0,
            thumbstick: {
              x: source.gamepad?.axes?.[2] || 0,
              y: source.gamepad?.axes?.[3] || 0,
            },
            buttons: {
              a: source.gamepad?.buttons?.[4]?.pressed || false,
              b: source.gamepad?.buttons?.[5]?.pressed || false,
            },
          };
        } catch (e) {
          // Pose not available
        }
      }
    }

    return state;
  }

  _handleToolAction(action) {
    log.debug('Tool action:', action);

    switch (action.type) {
      case 'annotation-created':
        this.emit('annotationCreated', action.data);
        break;
      case 'measurement-created':
        this.emit('measurementCreated', action.data);
        break;
      case 'slice-plane-updated':
        this.emit('slicePlaneUpdated', action.data);
        break;
      case 'probe-created':
        this.emit('probeCreated', action.data);
        break;
      case 'clip-box-updated':
        this.emit('clipBoxUpdated', action.data);
        break;
    }
  }

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  _onSessionEnd() {
    log.info('XR session ended');
    this.leaveSession().catch(err => log.error('Error leaving session:', err));
  }

  // ===========================================================================
  // STATUS QUERIES
  // ===========================================================================

  isExploring() {
    return this._activeSession != null && this._activeSession.isActive();
  }

  getActiveContext() {
    return this._activeContext;
  }
}

export const vrExplorationManager = new VRExplorationManager();
export default vrExplorationManager;
