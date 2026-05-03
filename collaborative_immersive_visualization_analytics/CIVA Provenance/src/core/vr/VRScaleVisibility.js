// src/core/vr/VRScaleVisibility.js
// Manages how users at different scales see each other

import { vr as log } from "@Utils/logger.js";
import { SCALE_VISIBILITY } from "@Core/data/models/VRExplorationSession.js";

export class VRScaleVisibilityManager {
  constructor(session) {
    this._session = session;
    this._localParticipant = null;
  }

  setLocalParticipant(participant) {
    this._localParticipant = participant;
  }

  /**
   * Toggle between MY_SCALE and WORLD_SCALE visibility modes
   */
  toggleVisibilityMode() {
    if (!this._localParticipant) return null;

    const current = this._localParticipant.scaleVisibility;
    const newMode =
      current === SCALE_VISIBILITY.MY_SCALE
        ? SCALE_VISIBILITY.WORLD_SCALE
        : SCALE_VISIBILITY.MY_SCALE;

    this._localParticipant.scaleVisibility = newMode;

    log.debug(`Scale visibility changed to: ${newMode}`);

    return newMode;
  }

  /**
   * Get current visibility mode
   */
  getVisibilityMode() {
    return (
      this._localParticipant?.scaleVisibility || SCALE_VISIBILITY.MY_SCALE
    );
  }

  /**
   * Calculate render transform for a remote participant
   *
   * @param {Object} remoteParticipant - Remote participant data
   * @param {number} localScale - Local user's VR scale
   * @returns {Object} Transform info { scale, position, showScaleIndicator }
   */
  getRemoteParticipantTransform(remoteParticipant, localScale) {
    const visibilityMode =
      this._localParticipant?.scaleVisibility || SCALE_VISIBILITY.MY_SCALE;

    if (visibilityMode === SCALE_VISIBILITY.MY_SCALE) {
      // Render relative to local scale
      // A user at 2x scale appears 2x larger to me
      const relativeScale = remoteParticipant.vrScale / localScale;

      return {
        scale: relativeScale,
        // Position stays in world space, but avatar is scaled
        position: remoteParticipant.headPose?.position || { x: 0, y: 0, z: 0 },
        showScaleIndicator: Math.abs(relativeScale - 1.0) > 0.1,
        scaleLabel: this._formatScaleLabel(relativeScale),
      };
    } else {
      // WORLD_SCALE: Show everyone at their actual world positions
      // Useful for understanding where others are in data space
      return {
        scale: 1.0, // Don't scale avatars
        position: remoteParticipant.headPose?.position || { x: 0, y: 0, z: 0 },
        showScaleIndicator: true,
        scaleLabel: `${remoteParticipant.vrScale.toFixed(1)}x`,
      };
    }
  }

  /**
   * Calculate where to render remote participant's annotations/markers
   *
   * @param {Object} worldPosition - Position in world coordinates
   * @param {number} remoteScale - Remote user's VR scale
   * @param {number} localScale - Local user's VR scale
   */
  transformRemotePosition(worldPosition, remoteScale, localScale) {
    const visibilityMode = this.getVisibilityMode();

    if (visibilityMode === SCALE_VISIBILITY.WORLD_SCALE) {
      // No transformation needed
      return worldPosition;
    }

    // MY_SCALE: Transform position relative to local scale
    // This keeps interactions visible when at different scales
    const relativeScale = remoteScale / localScale;

    return {
      x: worldPosition.x * relativeScale,
      y: worldPosition.y * relativeScale,
      z: worldPosition.z * relativeScale,
    };
  }

  /**
   * Get user-friendly label for current visibility mode
   */
  getVisibilityModeLabel() {
    const mode = this._localParticipant?.scaleVisibility;
    return mode === SCALE_VISIBILITY.MY_SCALE
      ? "Relative to my scale"
      : "World positions";
  }

  /**
   * Get icon for current visibility mode
   */
  getVisibilityModeIcon() {
    const mode = this._localParticipant?.scaleVisibility;
    return mode === SCALE_VISIBILITY.MY_SCALE ? "scale-relative" : "scale-world";
  }

  /**
   * Format a relative scale value for display
   * @private
   */
  _formatScaleLabel(relativeScale) {
    if (relativeScale > 1) {
      return `${relativeScale.toFixed(1)}x larger`;
    } else if (relativeScale < 1) {
      return `${(1 / relativeScale).toFixed(1)}x smaller`;
    }
    return "Same scale";
  }

  /**
   * Calculate recommended avatar size for a remote participant
   * This ensures avatars remain visible even at extreme scale differences
   *
   * @param {number} relativeScale - Relative scale between users
   * @param {number} baseAvatarSize - Base avatar size in meters
   */
  getClampedAvatarSize(relativeScale, baseAvatarSize = 0.3) {
    // Clamp the avatar size to keep it visible
    const minSize = 0.05; // 5cm minimum
    const maxSize = 2.0; // 2m maximum

    const scaledSize = baseAvatarSize * relativeScale;
    return Math.max(minSize, Math.min(maxSize, scaledSize));
  }

  /**
   * Should we show a "scale mismatch" indicator for this participant?
   *
   * @param {number} localScale - Local user's scale
   * @param {number} remoteScale - Remote user's scale
   * @param {number} threshold - Scale difference threshold (default 2x)
   */
  shouldShowScaleMismatchIndicator(localScale, remoteScale, threshold = 2.0) {
    const ratio = Math.max(localScale, remoteScale) / Math.min(localScale, remoteScale);
    return ratio >= threshold;
  }

  /**
   * Get all participants grouped by their scale similarity to local user
   *
   * @param {Array} participants - All session participants
   * @param {number} localScale - Local user's scale
   */
  groupParticipantsByScale(participants, localScale) {
    const groups = {
      sameScale: [], // Within 50% of local scale
      largerScale: [], // More than 1.5x local scale
      smallerScale: [], // Less than 0.67x local scale
    };

    for (const participant of participants) {
      if (!participant.vrScale) continue;

      const ratio = participant.vrScale / localScale;

      if (ratio >= 0.67 && ratio <= 1.5) {
        groups.sameScale.push(participant);
      } else if (ratio > 1.5) {
        groups.largerScale.push(participant);
      } else {
        groups.smallerScale.push(participant);
      }
    }

    return groups;
  }
}

export default VRScaleVisibilityManager;
