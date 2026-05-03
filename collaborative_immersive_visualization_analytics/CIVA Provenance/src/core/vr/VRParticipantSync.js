// src/core/vr/VRParticipantSync.js
// Synchronizes participant states via Y.js for real-time presence

import { vr as log } from '@Utils/logger.js';
import { ydoc } from '@Collaboration/yjs/yjsSetup.js';
import { getUserId } from '@Collaboration/presence/userManagement.js';

export class VRParticipantSync {
  constructor(session) {
    this._session = session;
    this._yParticipants = null;
    this._localUserId = getUserId();
    this._updateInterval = null;
    this._observers = [];
    this._throttleMs = 50; // Throttle updates to 20fps
    this._lastUpdateTime = 0;
  }

  start() {
    // Get or create Y.js map for this session
    this._yParticipants = ydoc.getMap(`vr-participants-${this._session.id}`);

    // Set up observer for remote updates
    const observer = (event) => {
      event.changes.keys.forEach((change, odUserId) => {
        if (odUserId === this._localUserId) return;

        if (change.action === 'delete') {
          this._handleParticipantLeft(odUserId);
        } else {
          const data = this._yParticipants.get(odUserId);
          this._handleParticipantUpdate(odUserId, data);
        }
      });
    };

    this._yParticipants.observe(observer);
    this._observers.push(() => this._yParticipants.unobserve(observer));

    log.debug('VRParticipantSync started');
  }

  stop() {
    // Clear observers
    this._observers.forEach(cleanup => cleanup());
    this._observers = [];

    // Remove self from Y.js
    if (this._yParticipants) {
      this._yParticipants.delete(this._localUserId);
    }

    // Stop update interval
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
    }

    log.debug('VRParticipantSync stopped');
  }

  /**
   * Update local participant state (call every frame or throttled)
   */
  updateLocalState(state) {
    if (!this._yParticipants) return;

    // Throttle updates
    const now = Date.now();
    if (now - this._lastUpdateTime < this._throttleMs) {
      return;
    }
    this._lastUpdateTime = now;

    const participant = this._session.getParticipant(this._localUserId);
    if (!participant) return;

    const data = {
      odUserId: this._localUserId,
      userName: participant.userName,
      userColor: participant.userColor,
      mode: participant.mode,
      vrScale: state.vrScale || participant.vrScale,
      scaleVisibility: participant.scaleVisibility,
      timestamp: now,

      // Pose data
      headPose: state.headPose ? this._serializePose(state.headPose) : null,
      leftHandPose: state.leftHandPose ? this._serializePose(state.leftHandPose) : null,
      rightHandPose: state.rightHandPose ? this._serializePose(state.rightHandPose) : null,

      // Cursor (for desktop participants)
      cursorPosition: state.cursorPosition || null,
      cursorTarget: state.cursorTarget || null,
    };

    this._yParticipants.set(this._localUserId, data);
  }

  /**
   * Broadcast participant metadata change
   */
  broadcastParticipant(participant) {
    if (!this._yParticipants) return;

    const existing = this._yParticipants.get(participant.odUserId) || {};
    this._yParticipants.set(participant.odUserId, {
      ...existing,
      mode: participant.mode,
      permissions: participant.permissions,
      vrScale: participant.vrScale,
      scaleVisibility: participant.scaleVisibility,
      controllingUserId: participant.controllingUserId,
      controlledByUserId: participant.controlledByUserId,
    });
  }

  /**
   * Get all remote participant states
   */
  getRemoteParticipants() {
    if (!this._yParticipants) return [];

    const participants = [];
    this._yParticipants.forEach((data, odUserId) => {
      if (odUserId !== this._localUserId) {
        participants.push({
          ...data,
          isStale: Date.now() - data.timestamp > 5000,
        });
      }
    });

    return participants;
  }

  /**
   * Get a specific participant's state
   */
  getParticipantState(odUserId) {
    if (!this._yParticipants) return null;
    return this._yParticipants.get(odUserId);
  }

  _handleParticipantUpdate(odUserId, data) {
    const participant = this._session.getParticipant(odUserId);
    if (participant) {
      // Update local session model
      participant.vrScale = data.vrScale;
      participant.scaleVisibility = data.scaleVisibility;
      participant.lastActiveAt = data.timestamp;
    } else {
      // New participant joined
      this._session.addParticipant(
        data.odUserId,
        data.userName,
        data.userColor,
        data.mode
      );
    }

    // Dispatch event for renderers
    window.dispatchEvent(new CustomEvent('cia:vr-participant-update', {
      detail: { odUserId, data }
    }));
  }

  _handleParticipantLeft(odUserId) {
    this._session.removeParticipant(odUserId);

    window.dispatchEvent(new CustomEvent('cia:vr-participant-left', {
      detail: { odUserId }
    }));
  }

  _serializePose(pose) {
    if (!pose) return null;

    return {
      position: pose.position ? {
        x: pose.position.x,
        y: pose.position.y,
        z: pose.position.z,
      } : null,
      orientation: pose.orientation ? {
        x: pose.orientation.x,
        y: pose.orientation.y,
        z: pose.orientation.z,
        w: pose.orientation.w,
      } : null,
    };
  }
}

export default VRParticipantSync;
