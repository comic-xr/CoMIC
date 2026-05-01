/**
 * @file useVoiceTab.js
 * @description Logic hook for VoiceTab component.
 * Handles LiveKit integration, voice state, and keyboard shortcuts.
 *
 * @example
 * const {
 *   connectionState,
 *   isConnected,
 *   muted,
 *   participants,
 *   handleJoin,
 *   handleToggleMute,
 * } = useVoiceTab({ channels });
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  voiceRoomService,
  VoiceConnectionState,
} from "@Services/voice/voiceRoomService.js";
import { getUserName } from "@Collaboration/presence/userManagement.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";
import { toast } from "@UI/react/store/toastStore.js";

/**
 * Voice activation modes
 */
export const VOICE_MODES = {
  VAD: "vad", // Voice Activity Detection (always listening)
  PTT: "ptt", // Push-to-Talk (spacebar to transmit)
};

/**
 * Default voice channels
 */
export const DEFAULT_CHANNELS = [
  { id: "main", name: "Main Room", participants: 0 },
  { id: "breakout-1", name: "Breakout 1", participants: 0 },
  { id: "breakout-2", name: "Breakout 2", participants: 0 },
  { id: "breakout-3", name: "Breakout 3", participants: 0 },
];

/**
 * Hook for VoiceTab logic and state management.
 *
 * @param {Object} options - Hook options
 * @param {Array} [options.channels] - Available channels
 * @returns {Object} Voice state and handlers
 */
export function useVoiceTab(options = {}) {
  const { channels: propChannels, initialChannelId } = options;

  const syncParticipants = useCallback(() => {
    const orderedParticipants = voiceRoomService
      .getParticipants()
      .slice()
      .sort((a, b) => {
        if (a.isSpeaking !== b.isSpeaking) {
          return a.isSpeaking ? -1 : 1;
        }
        if (a.isLocal !== b.isLocal) {
          return a.isLocal ? 1 : -1;
        }
        return (a.name || a.identity || "").localeCompare(b.name || b.identity || "");
      });

    setParticipants(orderedParticipants);
  }, []);

  // Use provided channels or default
  const channels = propChannels?.length > 0 ? propChannels : DEFAULT_CHANNELS;

  // Voice state from service
  const [connectionState, setConnectionState] = useState(
    voiceRoomService.getConnectionState()
  );
  const [muted, setMuted] = useState(voiceRoomService.isMuted);
  const [deafened, setDeafened] = useState(voiceRoomService.isDeafened);
  const [currentChannel, setCurrentChannel] = useState(
    voiceRoomService.getCurrentRoom() || initialChannelId || channels[0]?.id
  );
  const [participants, setParticipants] = useState([]);

  // PTT and input level state
  const [voiceMode, setVoiceMode] = useState(VOICE_MODES.VAD);
  const [isPTTActive, setIsPTTActive] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const isConnected = connectionState === VoiceConnectionState.CONNECTED;

  // Subscribe to voice service events
  useEffect(() => {
    const resolvedChannel =
      voiceRoomService.getCurrentRoom() || initialChannelId || channels[0]?.id;
    if (resolvedChannel && resolvedChannel !== currentChannel) {
      setCurrentChannel(resolvedChannel);
    }
  }, [initialChannelId, channels, currentChannel]);

  useEffect(() => {
    // Initialize service
    voiceRoomService.initialize();

    // Subscribe to connection changes
    const unsubConnection = voiceRoomService.onConnectionChange((state) => {
      setConnectionState(state);
      if (state === VoiceConnectionState.CONNECTED) {
        const connectedRoom = voiceRoomService.getCurrentRoom();
        setCurrentChannel(connectedRoom);
        presenceSystem.updateVoiceState({
          inVoice: true,
          voiceRoomId: connectedRoom,
          isMuted: voiceRoomService.isMuted,
          isSpeaking: false,
        });
      } else if (state === VoiceConnectionState.DISCONNECTED) {
        presenceSystem.updateVoiceState({
          inVoice: false,
          voiceRoomId: null,
          isMuted: true,
          isSpeaking: false,
        });
      }
    });

    // Subscribe to participant updates
    const unsubParticipant = voiceRoomService.onParticipantUpdate(() => {
      syncParticipants();
    });

    // Subscribe to participant joined/left
    const unsubJoined = voiceRoomService.onParticipantJoined(() => {
      syncParticipants();
    });

    const unsubLeft = voiceRoomService.onParticipantLeft(() => {
      syncParticipants();
    });

    const unsubActiveSpeaker = voiceRoomService.onActiveSpeakerChange(() => {
      syncParticipants();
      const localParticipant = voiceRoomService
        .getParticipants()
        .find((participant) => participant.isLocal);
      presenceSystem.setSpeaking(Boolean(localParticipant?.isSpeaking));
    });

    // Subscribe to errors
    const unsubError = voiceRoomService.onError((error) => {
      toast.error(`Voice error: ${error.message}`);
    });

    // Sync initial state
    syncParticipants();

    return () => {
      unsubConnection();
      unsubParticipant();
      unsubJoined();
      unsubLeft();
      unsubActiveSpeaker();
      unsubError();
    };
  }, [syncParticipants]);

  // Keyboard shortcut for mute (M key) and deafen (D key)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.matches("input, textarea")) return;

      if (e.key === "m" || e.key === "M") {
        if (connectionState === VoiceConnectionState.CONNECTED) {
          e.preventDefault();
          handleToggleMute();
        }
      }

      if (e.key === "d" || e.key === "D") {
        if (connectionState === VoiceConnectionState.CONNECTED) {
          e.preventDefault();
          handleToggleDeafen();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [connectionState]);

  // Push-to-Talk spacebar handling
  useEffect(() => {
    if (voiceMode !== VOICE_MODES.PTT || !isConnected) return;

    const handleKeyDown = (e) => {
      if (e.target.matches("input, textarea")) return;
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setIsPTTActive(true);
        // Unmute while spacebar held
        if (muted) {
          voiceRoomService.setMuted(false);
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsPTTActive(false);
        // Mute when spacebar released
        voiceRoomService.setMuted(true);
        setMuted(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [voiceMode, isConnected, muted]);

  // Input level monitoring using Web Audio API
  useEffect(() => {
    if (!isConnected) {
      setInputLevel(0);
      return;
    }

    let stream = null;

    const startMonitoring = async () => {
      try {
        // Get microphone stream
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Create audio context and analyser
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;

        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

        // Animation loop to update level
        const updateLevel = () => {
          if (!analyserRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate average level (0-100)
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          const normalizedLevel = Math.min(100, Math.round((average / 128) * 100));

          setInputLevel(normalizedLevel);
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel();
      } catch (error) {
        console.warn("Could not access microphone for level monitoring:", error);
      }
    };

    startMonitoring();

    return () => {
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      analyserRef.current = null;
      setInputLevel(0);
    };
  }, [isConnected]);

  // Handlers
  const handleJoin = useCallback(async () => {
    try {
      const userName = getUserName() || "Anonymous User";
      const roomId = currentChannel || channels[0]?.id || "main";
      await voiceRoomService.joinRoom(roomId, userName);
      setMuted(voiceRoomService.isMuted);
      presenceSystem.updateVoiceState({
        inVoice: true,
        voiceRoomId: roomId,
        isMuted: voiceRoomService.isMuted,
        isSpeaking: false,
      });
      toast.success(
        `Joined ${channels.find((c) => c.id === roomId)?.name || roomId}`
      );
    } catch (error) {
      toast.error("Failed to join voice. Make sure LiveKit is running.");
    }
  }, [currentChannel, channels]);

  const handleLeave = useCallback(async () => {
    await voiceRoomService.leaveRoom();
    setParticipants([]);
    presenceSystem.updateVoiceState({
      inVoice: false,
      voiceRoomId: null,
      isMuted: true,
      isSpeaking: false,
    });
  }, []);

  const handleToggleMute = useCallback(async () => {
    const newMuted = await voiceRoomService.toggleMute();
    setMuted(newMuted);
    presenceSystem.updateVoiceState({
      inVoice: connectionState === VoiceConnectionState.CONNECTED,
      voiceRoomId: currentChannel,
      isMuted: newMuted,
    });
  }, []);

  const handleToggleDeafen = useCallback(() => {
    const newDeafened = voiceRoomService.toggleDeafen();
    setDeafened(newDeafened);
  }, []);

  const handleChannelSelect = useCallback(
    async (channelId) => {
      setCurrentChannel(channelId);

      // If already connected, switch rooms
      if (connectionState === VoiceConnectionState.CONNECTED) {
        try {
          const userName = getUserName() || "Anonymous User";
          await voiceRoomService.joinRoom(channelId, userName);
          presenceSystem.updateVoiceState({
            inVoice: true,
            voiceRoomId: channelId,
            isMuted: voiceRoomService.isMuted,
            isSpeaking: false,
          });
          toast.success(
            `Switched to ${
              channels.find((c) => c.id === channelId)?.name || channelId
            }`
          );
        } catch (error) {
          toast.error("Failed to switch rooms");
        }
      }
    },
    [connectionState, channels]
  );

  const handleAdjustVolume = useCallback((participantId) => {
    // TODO: Open volume slider for this participant
    console.log("Adjust volume for:", participantId);
  }, []);

  /**
   * Toggle between VAD and PTT voice modes
   */
  const handleToggleVoiceMode = useCallback(() => {
    setVoiceMode((prev) => {
      const newMode = prev === VOICE_MODES.VAD ? VOICE_MODES.PTT : VOICE_MODES.VAD;

      // When switching to PTT, mute by default (user holds space to talk)
      if (newMode === VOICE_MODES.PTT && isConnected) {
        voiceRoomService.setMuted(true);
        setMuted(true);
        toast.info("Push-to-Talk enabled. Hold SPACE to transmit.");
      } else if (newMode === VOICE_MODES.VAD && isConnected) {
        // When switching to VAD, unmute
        voiceRoomService.setMuted(false);
        setMuted(false);
        toast.info("Voice Activity Detection enabled.");
      }

      return newMode;
    });
  }, [isConnected]);

  return {
    // Data
    channels,

    // Connection state
    connectionState,
    isConnected,
    muted,
    deafened,
    currentChannel,
    participants,

    // PTT and input level
    voiceMode,
    isPTTActive,
    inputLevel,

    // Handlers
    handleJoin,
    handleLeave,
    handleToggleMute,
    handleToggleDeafen,
    handleChannelSelect,
    handleAdjustVolume,
    handleToggleVoiceMode,
  };
}

export default useVoiceTab;
