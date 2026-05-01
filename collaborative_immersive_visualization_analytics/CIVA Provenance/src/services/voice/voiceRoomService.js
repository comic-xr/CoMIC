// src/services/voice/voiceRoomService.js
// Enhanced Voice Room Service with multi-room support
//
// This is the production-ready voice room service that handles:
// - Multiple rooms (main room, breakout rooms)
// - Participant tracking with speaking indicators
// - Mute/deafen controls
// - Connection state management
// - Event-driven architecture for React integration
//
// Usage:
//   import { voiceRoomService } from '@Services/voice/voiceRoomService.js';
//   await voiceRoomService.initialize();
//   await voiceRoomService.joinRoom('main-room');
//   voiceRoomService.onParticipantUpdate(callback);

import { Room, RoomEvent, Track, ConnectionState } from "livekit-client";
import { ws as log } from "@Utils/logger.js";
import { config } from "@Core/config/clientConfig.js";
import { authService } from "@Services/authService.js";
import { sessionManager } from "@Core/session/sessionManager.js";

/**
 * Connection status enum
 */
export const VoiceConnectionState = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  ERROR: "error",
};

/**
 * Voice Room Service
 *
 * Manages LiveKit voice rooms with full participant tracking and state management.
 */
class VoiceRoomService {
  constructor() {
    // LiveKit room instance
    this.room = null;

    // Current state
    this.connectionState = VoiceConnectionState.DISCONNECTED;
    this.currentRoomName = null;
    this.isMuted = true; // Start muted by default
    this.isDeafened = false;

    // Participants (including self)
    this.participants = new Map();

    // Event listeners
    this._listeners = {
      connectionChange: new Set(),
      participantUpdate: new Set(),
      participantJoined: new Set(),
      participantLeft: new Set(),
      activeSpeakerChange: new Set(),
      error: new Set(),
    };

    // Configuration - use correct property names from clientConfig
    // Auto-detect protocol based on page protocol to avoid mixed content issues
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const defaultLiveKitUrl = isSecure ? "wss://localhost:7880" : "ws://localhost:7880";
    const defaultTokenUrl = "/api/voice";

    this.config = {
      tokenServerUrl: config.liveKitTokenUrl || defaultTokenUrl,
      livekitUrl: config.liveKitUrl || defaultLiveKitUrl,
      autoMuteOnJoin: true,
      reconnectAttempts: 3,
    };

    // Audio elements for remote participants
    this._audioElements = new Map();
  }

  /**
   * Initialize the voice room service
   * @returns {Promise<boolean>}
   */
  async initialize() {
    log.debug("VoiceRoomService initializing...");

    // Check for browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      log.error("Browser does not support getUserMedia");
      return false;
    }

    // Pre-check microphone permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop()); // Release immediately
      log.debug("Microphone permission granted");
    } catch (error) {
      log.warn("Microphone permission not granted:", error.message);
      // Don't fail - we'll request again when joining
    }

    log.info("VoiceRoomService initialized");
    return true;
  }

  /**
   * Get a token from the token server
   * @param {string} roomName - Room to join
   * @param {string} userName - User's display name
   * @returns {Promise<string>} JWT token
   */
  async getToken(roomName, userName) {
    log.debug(`Fetching token for room: ${roomName}, user: ${userName}`);

    const headers = await authService.buildRequestHeaders({
      "Content-Type": "application/json",
    });

    // Include a per-browser userId when available so the token server
    // can bind the LiveKit identity to this client in dev mode.
    const body = { roomName, userName };
    try {
      const uid = sessionManager.getUserId();
      if (uid) body.userId = uid;
    } catch (e) {
      // ignore if sessionManager not initialized
    }

    const response = await fetch(`${this.config.tokenServerUrl}/token`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Token server error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.token) {
      throw new Error("No token in response");
    }

    return data.token;
  }

  /**
   * Join a voice room
   * @param {string} roomName - Room name to join
   * @param {string} userName - User's display name
   * @returns {Promise<void>}
   */
  async joinRoom(roomName, userName) {
    if (this.connectionState === VoiceConnectionState.CONNECTED) {
      if (this.currentRoomName === roomName) {
        log.debug("Already in this room");
        return;
      }
      // Leave current room first
      await this.leaveRoom();
    }

    this._setConnectionState(VoiceConnectionState.CONNECTING);

    try {
      // Get token
      const token = await this.getToken(roomName, userName);

      // Create room instance
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        // Audio quality settings
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Set up event listeners before connecting
      this._setupRoomEventListeners();

      // Connect to room
      await this.room.connect(this.config.livekitUrl, token);

      this.currentRoomName = roomName;
      this._setConnectionState(VoiceConnectionState.CONNECTED);

      // Enable microphone (starts muted if configured)
      if (this.config.autoMuteOnJoin) {
        await this.room.localParticipant.setMicrophoneEnabled(false);
        this.isMuted = true;
      } else {
        await this.room.localParticipant.setMicrophoneEnabled(true);
        this.isMuted = false;
      }

      // Add self to participants
      this._updateParticipant(this.room.localParticipant, true);

      // Add existing participants
      this.room.participants.forEach((participant) => {
        this._updateParticipant(participant, false);
      });

      log.info(`Joined voice room: ${roomName}`);

      // Dispatch event
      window.dispatchEvent(
        new CustomEvent("cia:voice-room-joined", {
          detail: { roomName, participantCount: this.participants.size },
        })
      );
    } catch (error) {
      log.error("Failed to join room:", error);
      this._setConnectionState(VoiceConnectionState.ERROR);
      this._emit("error", error);
      throw error;
    }
  }

  /**
   * Leave the current voice room
   */
  async leaveRoom() {
    if (!this.room) return;

    log.debug("Leaving voice room...");

    // Clean up audio elements
    this._audioElements.forEach((el, id) => {
      el.remove();
    });
    this._audioElements.clear();

    // Disconnect
    await this.room.disconnect();
    this.room = null;

    // Clear state
    this.participants.clear();
    this.currentRoomName = null;
    this.isMuted = true;
    this.isDeafened = false;

    this._setConnectionState(VoiceConnectionState.DISCONNECTED);

    log.info("Left voice room");

    // Dispatch event
    window.dispatchEvent(new CustomEvent("cia:voice-room-left"));
  }

  /**
   * Toggle microphone mute
   * @returns {boolean} New mute state
   */
  async toggleMute() {
    if (!this.room || this.connectionState !== VoiceConnectionState.CONNECTED) {
      log.warn("Cannot toggle mute: not connected");
      return this.isMuted;
    }

    this.isMuted = !this.isMuted;
    await this.room.localParticipant.setMicrophoneEnabled(!this.isMuted);

    // Update self in participants
    this._updateParticipant(this.room.localParticipant, true);

    log.debug(`Microphone ${this.isMuted ? "muted" : "unmuted"}`);
    return this.isMuted;
  }

  /**
   * Set mute state explicitly
   * @param {boolean} muted - Mute state
   */
  async setMuted(muted) {
    if (this.isMuted === muted) return;
    await this.toggleMute();
  }

  /**
   * Toggle deafen (mute all incoming audio)
   * @returns {boolean} New deafen state
   */
  toggleDeafen() {
    this.isDeafened = !this.isDeafened;

    // Mute/unmute all audio elements
    this._audioElements.forEach((el) => {
      el.muted = this.isDeafened;
    });

    log.debug(`Audio ${this.isDeafened ? "deafened" : "undeafened"}`);
    return this.isDeafened;
  }

  /**
   * Set participant volume
   * @param {string} participantId - Participant ID
   * @param {number} volume - Volume level (0-1)
   */
  setParticipantVolume(participantId, volume) {
    const audioEl = this._audioElements.get(participantId);
    if (audioEl) {
      audioEl.volume = Math.max(0, Math.min(1, volume));
    }
  }

  // =========================================================================
  // Event Listeners
  // =========================================================================

  /**
   * Set up LiveKit room event listeners
   * @private
   */
  _setupRoomEventListeners() {
    if (!this.room) return;

    // Connection state changes
    this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
      log.debug("Connection state changed:", state);
      switch (state) {
        case ConnectionState.Connected:
          this._setConnectionState(VoiceConnectionState.CONNECTED);
          break;
        case ConnectionState.Reconnecting:
          this._setConnectionState(VoiceConnectionState.RECONNECTING);
          break;
        case ConnectionState.Disconnected:
          this._setConnectionState(VoiceConnectionState.DISCONNECTED);
          break;
      }
    });

    // Participant joined
    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      log.debug("Participant joined:", participant.identity);
      this._updateParticipant(participant, false);
      this._emit(
        "participantJoined",
        this._formatParticipant(participant, false)
      );
    });

    // Participant left
    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      log.debug("Participant left:", participant.identity);
      this.participants.delete(participant.sid);
      this._cleanupParticipantAudio(participant.sid);
      this._emit("participantLeft", {
        id: participant.sid,
        name: participant.identity,
      });
    });

    // Track subscribed (audio from remote participant)
    this.room.on(
      RoomEvent.TrackSubscribed,
      (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          this._attachAudioTrack(track, participant);
        }
      }
    );

    // Track unsubscribed
    this.room.on(
      RoomEvent.TrackUnsubscribed,
      (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          this._cleanupParticipantAudio(participant.sid);
        }
      }
    );

    // Active speakers changed
    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const speakerIds = speakers.map((s) => s.sid);

      // Update all participants' speaking state
      this.participants.forEach((p, id) => {
        const wasSpeaking = p.isSpeaking;
        p.isSpeaking = speakerIds.includes(id);
        if (wasSpeaking !== p.isSpeaking) {
          this._emit("participantUpdate", p);
        }
      });

      this._emit("activeSpeakerChange", speakerIds);
    });

    // Mute state changed
    this.room.on(RoomEvent.TrackMuted, (publication, participant) => {
      this._updateParticipant(
        participant,
        participant === this.room.localParticipant
      );
    });

    this.room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
      this._updateParticipant(
        participant,
        participant === this.room.localParticipant
      );
    });
  }

  /**
   * Attach audio track to DOM
   * @private
   */
  _attachAudioTrack(track, participant) {
    const audioElement = track.attach();
    audioElement.id = `voice-audio-${participant.sid}`;
    audioElement.muted = this.isDeafened;
    document.body.appendChild(audioElement);
    this._audioElements.set(participant.sid, audioElement);
    log.debug(`Attached audio for: ${participant.identity}`);
  }

  /**
   * Clean up participant audio element
   * @private
   */
  _cleanupParticipantAudio(participantId) {
    const el = this._audioElements.get(participantId);
    if (el) {
      el.remove();
      this._audioElements.delete(participantId);
    }
  }

  // =========================================================================
  // Participant Management
  // =========================================================================

  /**
   * Update participant in the map
   * @private
   */
  _updateParticipant(participant, isLocal) {
    const formatted = this._formatParticipant(participant, isLocal);
    this.participants.set(participant.sid, formatted);
    this._emit("participantUpdate", formatted);
  }

  /**
   * Format participant for external use
   * @private
   */
  _formatParticipant(participant, isLocal) {
    return {
      id: participant.sid,
      identity: participant.identity,
      name: participant.name || participant.identity,
      isLocal,
      isMuted: !participant.isMicrophoneEnabled,
      isSpeaking: participant.isSpeaking || false,
      // Add color based on identity hash for consistency
      color: this._getParticipantColor(participant.identity),
    };
  }

  /**
   * Generate consistent color for participant
   * @private
   */
  _getParticipantColor(identity) {
    const colors = [
      "#4CAF50",
      "#2196F3",
      "#FF9800",
      "#E91E63",
      "#9C27B0",
      "#00BCD4",
    ];
    let hash = 0;
    for (let i = 0; i < identity.length; i++) {
      hash = identity.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Get all participants
   * @returns {Array} Participant list
   */
  getParticipants() {
    return Array.from(this.participants.values());
  }

  // =========================================================================
  // Event Emitter
  // =========================================================================

  /**
   * Subscribe to connection state changes
   */
  onConnectionChange(callback) {
    this._listeners.connectionChange.add(callback);
    return () => this._listeners.connectionChange.delete(callback);
  }

  /**
   * Subscribe to participant updates
   */
  onParticipantUpdate(callback) {
    this._listeners.participantUpdate.add(callback);
    return () => this._listeners.participantUpdate.delete(callback);
  }

  /**
   * Subscribe to participant joined events
   */
  onParticipantJoined(callback) {
    this._listeners.participantJoined.add(callback);
    return () => this._listeners.participantJoined.delete(callback);
  }

  /**
   * Subscribe to participant left events
   */
  onParticipantLeft(callback) {
    this._listeners.participantLeft.add(callback);
    return () => this._listeners.participantLeft.delete(callback);
  }

  /**
   * Subscribe to active speaker changes
   */
  onActiveSpeakerChange(callback) {
    this._listeners.activeSpeakerChange.add(callback);
    return () => this._listeners.activeSpeakerChange.delete(callback);
  }

  /**
   * Subscribe to errors
   */
  onError(callback) {
    this._listeners.error.add(callback);
    return () => this._listeners.error.delete(callback);
  }

  _emit(event, data) {
    this._listeners[event]?.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        log.error(`Error in ${event} listener:`, e);
      }
    });
  }

  _setConnectionState(state) {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this._emit("connectionChange", state);
    }
  }

  // =========================================================================
  // Status
  // =========================================================================

  isConnected() {
    return this.connectionState === VoiceConnectionState.CONNECTED;
  }

  getCurrentRoom() {
    return this.currentRoomName;
  }

  getConnectionState() {
    return this.connectionState;
  }
}

// Singleton instance
export const voiceRoomService = new VoiceRoomService();
export default voiceRoomService;
