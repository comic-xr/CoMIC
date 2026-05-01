// src/ui/react/hooks/useVoice.js
// React hook for voice room integration
//
// This hook provides a clean React interface to the voiceRoomService.
// It handles initialization, state management, and cleanup.
//
// Usage:
//   const {
//     isInVoice,
//     participants,
//     isMuted,
//     joinVoice,
//     toggleMute
//   } = useVoice();

import { useState, useEffect, useCallback, useRef } from "react";
import {
  voiceRoomService,
  VoiceConnectionState,
} from "@Services/voice/voiceRoomService.js";
import {
  getUserName,
  getUserId,
} from "@Collaboration/presence/userManagement.js";
import { ws as log } from "@Utils/logger.js";

/**
 * useVoice Hook
 *
 * Provides complete voice room functionality for React components.
 * Automatically handles initialization and cleanup.
 *
 * @param {Object} options
 * @param {string} options.defaultRoom - Default room name to use
 * @param {boolean} options.autoInitialize - Initialize service on mount
 * @returns {Object} Voice state and controls
 */
export function useVoice(options = {}) {
  const { defaultRoom = "main-room", autoInitialize = true } = options;

  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionState, setConnectionState] = useState(
    VoiceConnectionState.DISCONNECTED
  );
  const [currentRoom, setCurrentRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);
  const [error, setError] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  // Track speaking participants
  const [activeSpeakers, setActiveSpeakers] = useState([]);

  // Cleanup refs
  const unsubscribeRefs = useRef([]);

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  useEffect(() => {
    if (!autoInitialize) return;

    const init = async () => {
      try {
        const success = await voiceRoomService.initialize();
        setIsInitialized(success);

        if (!success) {
          setError("Failed to initialize voice service");
        }
      } catch (err) {
        log.error("Voice initialization error:", err);
        setError(err.message);
      }
    };

    init();
  }, [autoInitialize]);

  // =========================================================================
  // EVENT SUBSCRIPTIONS
  // =========================================================================

  useEffect(() => {
    if (!isInitialized) return;

    // Subscribe to connection changes
    const unsub1 = voiceRoomService.onConnectionChange((state) => {
      setConnectionState(state);

      if (state === VoiceConnectionState.CONNECTED) {
        setCurrentRoom(voiceRoomService.getCurrentRoom());
        setParticipants(voiceRoomService.getParticipants());
      } else if (state === VoiceConnectionState.DISCONNECTED) {
        setCurrentRoom(null);
        setParticipants([]);
      }
    });

    // Subscribe to participant updates
    const unsub2 = voiceRoomService.onParticipantUpdate((participant) => {
      setParticipants((prev) => {
        const idx = prev.findIndex((p) => p.id === participant.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = participant;
          return next;
        } else {
          return [...prev, participant];
        }
      });

      // Update local mute state if it's us
      if (participant.isLocal) {
        setIsMuted(participant.isMuted);
      }
    });

    // Subscribe to participant joined
    const unsub3 = voiceRoomService.onParticipantJoined((participant) => {
      setParticipants((prev) => [...prev, participant]);
    });

    // Subscribe to participant left
    const unsub4 = voiceRoomService.onParticipantLeft(({ id }) => {
      setParticipants((prev) => prev.filter((p) => p.id !== id));
    });

    // Subscribe to active speakers
    const unsub5 = voiceRoomService.onActiveSpeakerChange((speakerIds) => {
      setActiveSpeakers(speakerIds);
    });

    // Subscribe to errors
    const unsub6 = voiceRoomService.onError((err) => {
      setError(err.message);
    });

    // Store unsubscribe functions
    unsubscribeRefs.current = [unsub1, unsub2, unsub3, unsub4, unsub5, unsub6];

    // Sync initial state
    setConnectionState(voiceRoomService.getConnectionState());
    setCurrentRoom(voiceRoomService.getCurrentRoom());
    setParticipants(voiceRoomService.getParticipants());
    setIsMuted(voiceRoomService.isMuted);
    setIsDeafened(voiceRoomService.isDeafened);

    return () => {
      unsubscribeRefs.current.forEach((unsub) => unsub?.());
    };
  }, [isInitialized]);

  // =========================================================================
  // ACTIONS
  // =========================================================================

  /**
   * Join a voice room
   */
  const joinVoice = useCallback(
    async (roomName) => {
      if (!isInitialized) {
        setError("Voice service not initialized");
        return false;
      }

      const targetRoom = roomName || defaultRoom;
      const userName = getUserName();

      setIsJoining(true);
      setError(null);

      try {
        await voiceRoomService.joinRoom(targetRoom, userName);
        return true;
      } catch (err) {
        log.error("Failed to join voice:", err);
        setError(err.message);
        return false;
      } finally {
        setIsJoining(false);
      }
    },
    [isInitialized, defaultRoom]
  );

  /**
   * Leave current voice room
   */
  const leaveVoice = useCallback(async () => {
    try {
      await voiceRoomService.leaveRoom();
    } catch (err) {
      log.error("Failed to leave voice:", err);
      setError(err.message);
    }
  }, []);

  /**
   * Toggle between join/leave
   */
  const toggleVoice = useCallback(
    async (roomName) => {
      if (connectionState === VoiceConnectionState.CONNECTED) {
        await leaveVoice();
      } else {
        await joinVoice(roomName);
      }
    },
    [connectionState, joinVoice, leaveVoice]
  );

  /**
   * Toggle microphone mute
   */
  const toggleMute = useCallback(async () => {
    try {
      const newState = await voiceRoomService.toggleMute();
      setIsMuted(newState);
      return newState;
    } catch (err) {
      log.error("Failed to toggle mute:", err);
      setError(err.message);
      return isMuted;
    }
  }, [isMuted]);

  /**
   * Toggle deafen
   */
  const toggleDeafen = useCallback(() => {
    const newState = voiceRoomService.toggleDeafen();
    setIsDeafened(newState);
    return newState;
  }, []);

  /**
   * Set participant volume
   */
  const setParticipantVolume = useCallback((participantId, volume) => {
    voiceRoomService.setParticipantVolume(participantId, volume);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // =========================================================================
  // DERIVED STATE
  // =========================================================================

  const isInVoice = connectionState === VoiceConnectionState.CONNECTED;
  const isConnecting =
    connectionState === VoiceConnectionState.CONNECTING || isJoining;
  const isReconnecting = connectionState === VoiceConnectionState.RECONNECTING;

  // Get local participant
  const localParticipant = participants.find((p) => p.isLocal);

  // Get remote participants
  const remoteParticipants = participants.filter((p) => !p.isLocal);

  // Get speaking participants
  const speakingParticipants = participants.filter((p) =>
    activeSpeakers.includes(p.id)
  );

  // =========================================================================
  // RETURN
  // =========================================================================

  return {
    // Status
    isInitialized,
    isInVoice,
    isConnecting,
    isReconnecting,
    connectionState,
    currentRoom,
    error,

    // Participants
    participants,
    localParticipant,
    remoteParticipants,
    speakingParticipants,
    participantCount: participants.length,

    // Local state
    isMuted,
    isDeafened,

    // Actions
    joinVoice,
    leaveVoice,
    toggleVoice,
    toggleMute,
    toggleDeafen,
    setParticipantVolume,
    clearError,
  };
}

/**
 * useVoiceParticipant Hook
 *
 * Get a single participant's state with reactive updates.
 * Useful for rendering individual participant cards.
 *
 * @param {string} participantId - Participant ID
 * @returns {Object|null} Participant data or null
 */
export function useVoiceParticipant(participantId) {
  const { participants } = useVoice({ autoInitialize: false });
  return participants.find((p) => p.id === participantId) || null;
}

/**
 * useVoiceStatus Hook
 *
 * Lightweight hook for just checking voice status.
 * Useful for indicators that don't need full participant list.
 *
 * @returns {Object} Voice status
 */
export function useVoiceStatus() {
  const { isInVoice, isMuted, participantCount, currentRoom } = useVoice({
    autoInitialize: false,
  });
  return { isInVoice, isMuted, participantCount, currentRoom };
}

export default useVoice;
