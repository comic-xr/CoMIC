// src/core/data/models/VRExplorationSession.js
// Coordinates multi-user VR exploration sessions
//
// ARCHITECTURE:
// - This does NOT duplicate ViewConfiguration state
// - It coordinates participants and collaboration
// - All visualization state lives in ViewConfiguration
// - Server is source of truth for session data

import { vr as log } from '@Utils/logger.js';

// =============================================================================
// ENUMS
// =============================================================================

export const SELECTION_TYPE = Object.freeze({
  FULL: 'full',           // Entire dataset
  FILTERED: 'filtered',   // Current view with filters applied
  SELECTION: 'selection', // User-selected points/regions
  REGION: 'region',       // Defined bounding region
});

export const EXPLORATION_MODES = Object.freeze({
  FLY: 'fly',           // Free 6DOF movement
  TELEPORT: 'teleport', // Point and click locomotion
  WALK: 'walk',         // Room-scale physical movement
  SCALE: 'scale',       // Pinch to resize relative to data
});

export const PARTICIPATION_MODE = Object.freeze({
  VR_EXPLORER: 'vr-explorer',           // In VR headset
  DESKTOP_OBSERVER: 'desktop-observer', // Watch only
  DESKTOP_PARTICIPANT: 'desktop-participant', // Interact via avatar
  DESKTOP_CONTROLLER: 'desktop-controller',   // Control a VR user's view
});

export const SCALE_VISIBILITY = Object.freeze({
  MY_SCALE: 'my-scale',     // See others relative to own scale
  WORLD_SCALE: 'world-scale', // See others at actual positions
});

export const SESSION_STATUS = Object.freeze({
  PREPARING: 'preparing',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ENDED: 'ended',
});

export const VR_TOOL_IDS = Object.freeze({
  SLICE: 'slice',
  MEASURE: 'measure',
  ANNOTATE: 'annotate',
  CLIP: 'clip',
  PROBE: 'probe',
  CROSS_SECTION: 'cross',
});

// =============================================================================
// PARTICIPANT CLASS
// =============================================================================

export class VRParticipant {
  constructor(config = {}) {
    this.odUserId = config.odUserId;
    this.userName = config.userName;
    this.userColor = config.userColor || '#00ff00';

    this.mode = config.mode || PARTICIPATION_MODE.DESKTOP_OBSERVER;
    this.joinedAt = config.joinedAt || Date.now();
    this.lastActiveAt = config.lastActiveAt || Date.now();

    this.permissions = config.permissions || {
      canAnnotate: false,
      canSlice: false,
      canControl: false,
    };

    // VR-specific (when mode is VR_EXPLORER)
    this.vrScale = config.vrScale || 1.0;
    this.scaleVisibility = config.scaleVisibility || SCALE_VISIBILITY.MY_SCALE;

    // Control relationship
    this.controllingUserId = config.controllingUserId || null;
    this.controlledByUserId = config.controlledByUserId || null;
  }

  isVR() {
    return this.mode === PARTICIPATION_MODE.VR_EXPLORER;
  }

  isDesktop() {
    return this.mode !== PARTICIPATION_MODE.VR_EXPLORER;
  }

  isControlling() {
    return this.controllingUserId !== null;
  }

  isBeingControlled() {
    return this.controlledByUserId !== null;
  }

  toJSON() {
    return {
      odUserId: this.odUserId,
      userName: this.userName,
      userColor: this.userColor,
      mode: this.mode,
      joinedAt: this.joinedAt,
      lastActiveAt: this.lastActiveAt,
      permissions: { ...this.permissions },
      vrScale: this.vrScale,
      scaleVisibility: this.scaleVisibility,
      controllingUserId: this.controllingUserId,
      controlledByUserId: this.controlledByUserId,
    };
  }

  static fromJSON(json) {
    return new VRParticipant(json);
  }
}

// =============================================================================
// SESSION SNAPSHOT CLASS
// =============================================================================

export class VRSessionSnapshot {
  constructor(config = {}) {
    this.id = config.id;
    this.name = config.name || '';
    this.timestamp = config.timestamp || Date.now();
    this.viewSnapshotId = config.viewSnapshotId;  // Reference to ViewConfiguration snapshot
    this.createdBy = config.createdBy;
    this.createdByName = config.createdByName;

    // Participant states at snapshot time
    this.participantStates = config.participantStates || [];
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      timestamp: this.timestamp,
      viewSnapshotId: this.viewSnapshotId,
      createdBy: this.createdBy,
      createdByName: this.createdByName,
      participantStates: this.participantStates,
    };
  }

  static fromJSON(json) {
    return new VRSessionSnapshot(json);
  }
}

// =============================================================================
// MAIN SESSION CLASS
// =============================================================================

export class VRExplorationSession {
  constructor(config = {}) {
    // =========================================================================
    // IDENTITY
    // =========================================================================
    this.id = config.id;                  // Server-generated
    this.serverId = config.serverId;      // For server sync
    this.name = config.name || '';        // Optional session name

    // =========================================================================
    // RELATIONSHIPS
    // =========================================================================
    this.viewConfigurationId = config.viewConfigurationId;  // THE state source
    this.datasetId = config.datasetId;
    this.projectId = config.projectId;

    // =========================================================================
    // DATA SELECTION (what subset to explore)
    // =========================================================================
    this.selectionType = config.selectionType || SELECTION_TYPE.FULL;
    this.regionOfInterest = config.regionOfInterest || null;
    // regionOfInterest: { bounds: [xMin, xMax, yMin, yMax, zMin, zMax], transform: matrix4 }

    this.selectionIds = config.selectionIds || [];
    // Point/cell IDs when selectionType is SELECTION

    this.filterSnapshotId = config.filterSnapshotId || null;
    // Reference to ViewConfiguration snapshot with filter state

    // =========================================================================
    // EXPLORATION SETTINGS
    // =========================================================================
    this.defaultExplorationMode = config.defaultExplorationMode || EXPLORATION_MODES.FLY;
    this.defaultVRScale = config.defaultVRScale || 1.0;

    // =========================================================================
    // PARTICIPANTS
    // =========================================================================
    this.ownerUserId = config.ownerUserId;
    this.ownerUserName = config.ownerUserName;

    this.participants = (config.participants || []).map(p =>
      p instanceof VRParticipant ? p : VRParticipant.fromJSON(p)
    );

    // =========================================================================
    // COLLABORATION SETTINGS
    // =========================================================================
    this.visibility = config.visibility || 'group';  // 'private' | 'group' | 'public'
    this.allowJoin = config.allowJoin !== false;
    this.allowDesktopParticipants = config.allowDesktopParticipants !== false;
    this.allowDesktopControl = config.allowDesktopControl !== false;
    this.requireControlApproval = config.requireControlApproval !== false;

    // =========================================================================
    // DESKTOP SYNC
    // =========================================================================
    this.syncSlicesToDesktop = config.syncSlicesToDesktop !== false;
    this.syncAnnotationsToDesktop = config.syncAnnotationsToDesktop !== false;

    // =========================================================================
    // LIFECYCLE
    // =========================================================================
    this.status = config.status || SESSION_STATUS.PREPARING;
    this.createdAt = config.createdAt || Date.now();
    this.startedAt = config.startedAt || null;
    this.endedAt = config.endedAt || null;
    this.pausedAt = config.pausedAt || null;

    // =========================================================================
    // SNAPSHOTS
    // =========================================================================
    this.sessionSnapshots = (config.sessionSnapshots || []).map(s =>
      s instanceof VRSessionSnapshot ? s : VRSessionSnapshot.fromJSON(s)
    );

    // =========================================================================
    // PENDING REQUESTS
    // =========================================================================
    this.pendingControlRequests = config.pendingControlRequests || [];
    // { fromUserId, toUserId, requestedAt }
  }

  // ===========================================================================
  // PARTICIPANT MANAGEMENT
  // ===========================================================================

  getParticipant(odUserId) {
    return this.participants.find(p => p.odUserId === odUserId);
  }

  addParticipant(odUserId, userName, userColor, mode = PARTICIPATION_MODE.DESKTOP_OBSERVER) {
    // Remove if already exists
    this.removeParticipant(odUserId);

    const participant = new VRParticipant({
      odUserId,
      userName,
      userColor,
      mode,
      permissions: this._getDefaultPermissions(mode),
    });

    this.participants.push(participant);
    return participant;
  }

  removeParticipant(odUserId) {
    const index = this.participants.findIndex(p => p.odUserId === odUserId);
    if (index !== -1) {
      const participant = this.participants[index];

      // Clean up any control relationships
      if (participant.controllingUserId) {
        const target = this.getParticipant(participant.controllingUserId);
        if (target) target.controlledByUserId = null;
      }
      if (participant.controlledByUserId) {
        const controller = this.getParticipant(participant.controlledByUserId);
        if (controller) controller.controllingUserId = null;
      }

      this.participants.splice(index, 1);
      return participant;
    }
    return null;
  }

  updateParticipantMode(odUserId, newMode) {
    const participant = this.getParticipant(odUserId);
    if (participant) {
      participant.mode = newMode;
      participant.permissions = this._getDefaultPermissions(newMode);
      participant.lastActiveAt = Date.now();
    }
    return participant;
  }

  _getDefaultPermissions(mode) {
    switch (mode) {
      case PARTICIPATION_MODE.VR_EXPLORER:
        return { canAnnotate: true, canSlice: true, canControl: false };
      case PARTICIPATION_MODE.DESKTOP_PARTICIPANT:
        return { canAnnotate: true, canSlice: true, canControl: false };
      case PARTICIPATION_MODE.DESKTOP_CONTROLLER:
        return { canAnnotate: false, canSlice: false, canControl: true };
      case PARTICIPATION_MODE.DESKTOP_OBSERVER:
      default:
        return { canAnnotate: false, canSlice: false, canControl: false };
    }
  }

  // ===========================================================================
  // PARTICIPANT QUERIES
  // ===========================================================================

  getVRParticipants() {
    return this.participants.filter(p => p.isVR());
  }

  getDesktopParticipants() {
    return this.participants.filter(p => p.isDesktop());
  }

  getControllableVRUsers() {
    return this.participants.filter(p =>
      p.isVR() && !p.isBeingControlled()
    );
  }

  // ===========================================================================
  // CONTROL MANAGEMENT
  // ===========================================================================

  requestControl(fromUserId, toUserId) {
    const from = this.getParticipant(fromUserId);
    const to = this.getParticipant(toUserId);

    if (!from || !to) {
      throw new Error('Invalid participant IDs');
    }

    if (!to.isVR()) {
      throw new Error('Can only control VR users');
    }

    if (to.isBeingControlled()) {
      throw new Error('User is already being controlled');
    }

    if (this.requireControlApproval) {
      this.pendingControlRequests.push({
        fromUserId,
        toUserId,
        requestedAt: Date.now(),
      });
      return { status: 'pending' };
    } else {
      return this.establishControl(fromUserId, toUserId);
    }
  }

  establishControl(controllerUserId, targetUserId) {
    const controller = this.getParticipant(controllerUserId);
    const target = this.getParticipant(targetUserId);

    if (!controller || !target) {
      throw new Error('Invalid participant IDs');
    }

    controller.controllingUserId = targetUserId;
    controller.mode = PARTICIPATION_MODE.DESKTOP_CONTROLLER;
    target.controlledByUserId = controllerUserId;

    // Remove from pending
    this.pendingControlRequests = this.pendingControlRequests.filter(
      r => !(r.fromUserId === controllerUserId && r.toUserId === targetUserId)
    );

    return { status: 'established' };
  }

  releaseControl(controllerUserId) {
    const controller = this.getParticipant(controllerUserId);
    if (!controller || !controller.controllingUserId) return;

    const target = this.getParticipant(controller.controllingUserId);
    if (target) {
      target.controlledByUserId = null;
    }

    controller.controllingUserId = null;
    controller.mode = PARTICIPATION_MODE.DESKTOP_PARTICIPANT;
  }

  declineControlRequest(fromUserId, toUserId) {
    this.pendingControlRequests = this.pendingControlRequests.filter(
      r => !(r.fromUserId === fromUserId && r.toUserId === toUserId)
    );
  }

  // ===========================================================================
  // SNAPSHOTS
  // ===========================================================================

  createSessionSnapshot(name, viewSnapshotId, userId, userName) {
    const snapshot = new VRSessionSnapshot({
      id: `vrsnapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      viewSnapshotId,
      createdBy: userId,
      createdByName: userName,
      participantStates: this.participants.map(p => ({
        odUserId: p.odUserId,
        vrScale: p.vrScale,
        mode: p.mode,
      })),
    });

    this.sessionSnapshots.push(snapshot);
    return snapshot;
  }

  getSessionSnapshot(snapshotId) {
    return this.sessionSnapshots.find(s => s.id === snapshotId);
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  start() {
    this.status = SESSION_STATUS.ACTIVE;
    this.startedAt = Date.now();
  }

  pause() {
    this.status = SESSION_STATUS.PAUSED;
    this.pausedAt = Date.now();
  }

  resume() {
    this.status = SESSION_STATUS.ACTIVE;
    this.pausedAt = null;
  }

  end() {
    this.status = SESSION_STATUS.ENDED;
    this.endedAt = Date.now();
  }

  isActive() {
    return this.status === SESSION_STATUS.ACTIVE;
  }

  // ===========================================================================
  // SERIALIZATION
  // ===========================================================================

  toJSON() {
    return {
      id: this.id,
      serverId: this.serverId,
      name: this.name,
      viewConfigurationId: this.viewConfigurationId,
      datasetId: this.datasetId,
      projectId: this.projectId,
      selectionType: this.selectionType,
      regionOfInterest: this.regionOfInterest,
      selectionIds: this.selectionIds,
      filterSnapshotId: this.filterSnapshotId,
      defaultExplorationMode: this.defaultExplorationMode,
      defaultVRScale: this.defaultVRScale,
      ownerUserId: this.ownerUserId,
      ownerUserName: this.ownerUserName,
      participants: this.participants.map(p => p.toJSON()),
      visibility: this.visibility,
      allowJoin: this.allowJoin,
      allowDesktopParticipants: this.allowDesktopParticipants,
      allowDesktopControl: this.allowDesktopControl,
      requireControlApproval: this.requireControlApproval,
      syncSlicesToDesktop: this.syncSlicesToDesktop,
      syncAnnotationsToDesktop: this.syncAnnotationsToDesktop,
      status: this.status,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      pausedAt: this.pausedAt,
      sessionSnapshots: this.sessionSnapshots.map(s => s.toJSON()),
      pendingControlRequests: this.pendingControlRequests,
    };
  }

  static fromJSON(json) {
    return new VRExplorationSession(json);
  }
}

export default VRExplorationSession;
