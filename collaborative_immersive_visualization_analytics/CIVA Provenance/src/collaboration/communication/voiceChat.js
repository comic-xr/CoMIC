// ----------------------------------------------------------------------------
// Voice Chat System (LiveKit-based)
// ----------------------------------------------------------------------------

import { Room } from "livekit-client";
import { ws as log } from "@Utils/logger.js";
import { authService } from "@Services/authService.js";

class VoiceChat {
  constructor() {
    this.room = null;
    this.isConnected = false;
    this.isMuted = false;
  }

  async getDevToken(roomName, userName) {
    // Use HTTP not HTTPS for local token server
    const TOKEN_SERVER = "http://localhost:3002";

    log.debug("Fetching token from:", TOKEN_SERVER);

    try {
      const authToken = await authService.getAccessToken();
      const headers = { "Content-Type": "application/json" };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch(`${TOKEN_SERVER}/token`, {
        method: "POST",
        headers,
        body: JSON.stringify({ roomName, userName }),
      });

      if (response.ok) {
        const data = await response.json();
        log.debug("Token received");
        log.trace("Token data:", data);
        return data.token;
      } else {
        log.error("Token server error:", response.status);
      }
    } catch (error) {
      log.error("Token server not reachable:", error.message);
    }

    throw new Error("Could not get token from server");
  }

  async connect(roomName, userName) {
    try {
      log.debug("Connecting to voice chat...");

      const token = await this.getDevToken(roomName, userName);

      this.room = new Room();
      this.setupEventListeners();

      // Use local LiveKit server
      const LIVEKIT_URL = "ws://localhost:7880";

      log.trace("Token type:", typeof token);

      await this.room.connect(LIVEKIT_URL, token);

      await this.room.localParticipant.setMicrophoneEnabled(true);
      this.isMuted = false;

      this.isConnected = true;
      log.info("Voice chat connected");
    } catch (error) {
      log.error("Failed to connect:", error);
      this.isConnected = false;
      throw error;
    }
  }

  setupEventListeners() {
    if (!this.room) return;

    this.room.on("participantConnected", (participant) => {
      log.debug("Participant joined:", participant.identity);
    });

    this.room.on("participantDisconnected", (participant) => {
      log.debug("Participant left:", participant.identity);
    });

    this.room.on("trackSubscribed", (track, publication, participant) => {
      if (track.kind === "audio") {
        const audioElement = track.attach();
        document.body.appendChild(audioElement);
        log.debug("Audio track subscribed from:", participant.identity);
      }
    });
  }

  async toggleMute() {
    if (!this.room || !this.isConnected) {
      log.warn("Not connected to voice chat");
      return;
    }

    try {
      this.isMuted = !this.isMuted;
      await this.room.localParticipant.setMicrophoneEnabled(!this.isMuted);
      log.debug(`Microphone ${this.isMuted ? "muted" : "unmuted"}`);
    } catch (error) {
      log.error("Failed to toggle mute:", error);
    }
  }

  disconnect() {
    if (this.room) {
      this.room.disconnect();
      this.room = null;
      this.isConnected = false;
      this.isMuted = false;
      log.debug("Voice chat disconnected");
    }
  }
}

export const voiceChat = new VoiceChat();
