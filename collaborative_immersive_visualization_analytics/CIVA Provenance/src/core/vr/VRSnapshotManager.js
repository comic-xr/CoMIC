// src/core/vr/VRSnapshotManager.js
// Manages VR session snapshots

import { vr as log } from '@Utils/logger.js';
import { getUserId, getUserName } from '@Collaboration/presence/userManagement.js';

export class VRSnapshotManager {
  constructor(session, viewConfigManager) {
    this._session = session;
    this._viewConfigManager = viewConfigManager;
    this._autoSaveInterval = null;
  }

  /**
   * Quick save - creates a snapshot with auto-generated name
   */
  async quickSave(name = null) {
    const viewConfig = this._viewConfigManager?.getView?.(this._session.viewConfigurationId);

    const userId = getUserId();
    const userName = getUserName();

    // Create ViewConfiguration snapshot if available
    let viewSnapshotId = null;
    if (viewConfig?.createVRSnapshot) {
      const viewSnapshot = viewConfig.createVRSnapshot({
        vrSession: this._session,
        name: name || `VR: ${new Date().toLocaleTimeString()}`,
        userId,
        userName,
      });
      viewSnapshotId = viewSnapshot.id;
    }

    // Create session snapshot with participant states
    const sessionSnapshot = this._session.createSessionSnapshot(
      name || `VR: ${new Date().toLocaleTimeString()}`,
      viewSnapshotId,
      userId,
      userName
    );

    // Trigger haptic feedback
    this._triggerHapticFeedback('save');

    log.info('VR snapshot created:', sessionSnapshot.id);

    return sessionSnapshot;
  }

  /**
   * Load a snapshot
   */
  async loadSnapshot(snapshotId) {
    // Find in session snapshots
    let sessionSnapshot = this._session.getSessionSnapshot(snapshotId);

    // If not found, might be a direct view snapshot ID
    if (!sessionSnapshot) {
      const viewConfig = this._viewConfigManager?.getView?.(this._session.viewConfigurationId);
      viewConfig?.restoreSnapshot?.(snapshotId);
      this._triggerHapticFeedback('load');
      return;
    }

    // Restore ViewConfiguration state
    const viewConfig = this._viewConfigManager?.getView?.(this._session.viewConfigurationId);
    viewConfig?.restoreSnapshot?.(sessionSnapshot.viewSnapshotId);

    // Trigger haptic feedback
    this._triggerHapticFeedback('load');

    log.info('VR snapshot loaded:', snapshotId);

    return sessionSnapshot;
  }

  /**
   * Get all snapshots for current session
   */
  getSessionSnapshots() {
    return this._session.sessionSnapshots;
  }

  /**
   * Get all VR snapshots for the ViewConfiguration
   */
  getAllVRSnapshots() {
    const viewConfig = this._viewConfigManager?.getView?.(this._session.viewConfigurationId);
    return viewConfig?.getVRSnapshots?.() || [];
  }

  /**
   * Enable auto-save at interval
   */
  enableAutoSave(intervalMs = 5 * 60 * 1000) {
    this.disableAutoSave();

    this._autoSaveInterval = setInterval(() => {
      this.quickSave(`Auto-save ${new Date().toLocaleTimeString()}`);
    }, intervalMs);

    log.debug('VR auto-save enabled');
  }

  /**
   * Disable auto-save
   */
  disableAutoSave() {
    if (this._autoSaveInterval) {
      clearInterval(this._autoSaveInterval);
      this._autoSaveInterval = null;
    }
  }

  _triggerHapticFeedback(type) {
    // Dispatch event for VR system to trigger haptics
    window.dispatchEvent(new CustomEvent('cia:vr-haptic', {
      detail: { type, intensity: type === 'save' ? 0.5 : 0.3, duration: 100 }
    }));
  }

  cleanup() {
    this.disableAutoSave();
  }
}

export default VRSnapshotManager;
