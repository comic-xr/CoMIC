// src/ui/react/hooks/useVoiceCommands.js
// React hook for voice command integration
//
// This hook provides:
// - Voice command state (enabled, listening, awake)
// - Command registration for components
// - TTS feedback integration
//
// Usage:
//   const { isEnabled, enable, lastCommand, registerCommand } = useVoiceCommands();

import { useState, useEffect, useCallback, useRef } from "react";
import { voiceCommandService } from "@Services/voice/voiceCommandService.js";
import { voiceFeedbackService } from "@Services/voice/voiceFeedbackService.js";
import { toast } from "@UI/react/store/toastStore.js";
import { app as log } from "@Utils/logger.js";

/**
 * Voice command state type
 * @typedef {'stopped' | 'listening' | 'awake' | 'processing' | 'error'} VoiceState
 */

/**
 * useVoiceCommands Hook
 *
 * Provides voice command functionality to React components.
 * Handles initialization, state management, and command registration.
 *
 * @param {Object} options
 * @param {boolean} options.autoInitialize - Initialize services on mount
 * @param {Object} options.localCommands - Component-specific commands
 * @returns {Object} Voice command state and controls
 */
export function useVoiceCommands(options = {}) {
  const { autoInitialize = true, localCommands = {} } = options;

  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [state, setState] = useState("stopped"); // VoiceState
  const [lastCommand, setLastCommand] = useState(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState(null);

  // Refs for cleanup
  const commandUnsubscribe = useRef(null);
  const stateUnsubscribe = useRef(null);
  const localCommandHandlers = useRef(new Map());

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  useEffect(() => {
    // Check browser support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (!autoInitialize) return;

    const init = async () => {
      try {
        const success = await voiceCommandService.initialize();
        if (success) {
          await voiceFeedbackService.initialize();
          setIsInitialized(true);
          setIsEnabled(voiceCommandService.isEnabled());
          log.debug("Voice services initialized");
        }
      } catch (err) {
        log.error("Failed to initialize voice services:", err);
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

    // Subscribe to command events
    commandUnsubscribe.current = voiceCommandService.onCommand(
      (action, params, phrase) => {
        setLastCommand({ action, params, phrase, timestamp: Date.now() });

        // Check for local command handlers
        const handler = localCommandHandlers.current.get(action);
        if (handler) {
          try {
            handler(params, phrase);
          } catch (err) {
            log.error(`Local command handler error for ${action}:`, err);
          }
        }
      }
    );

    // Subscribe to state changes
    stateUnsubscribe.current = voiceCommandService.onStateChange(
      (newState, data) => {
        setState(newState);

        if (newState === "interim") {
          setInterimTranscript(data);
        } else {
          setInterimTranscript("");
        }

        if (newState === "error") {
          setError(data);
        }
      }
    );

    return () => {
      commandUnsubscribe.current?.();
      stateUnsubscribe.current?.();
    };
  }, [isInitialized]);

  // =========================================================================
  // CONTROLS
  // =========================================================================

  /**
   * Enable voice commands
   */
  const enable = useCallback(async () => {
    if (!isSupported) {
      toast.error("Voice commands not supported in this browser");
      return false;
    }

    try {
      // Initialize if needed
      if (!isInitialized) {
        const success = await voiceCommandService.initialize();
        if (!success) {
          toast.error("Failed to initialize voice commands");
          return false;
        }
        await voiceFeedbackService.initialize();
        setIsInitialized(true);
      }

      voiceCommandService.enable();
      setIsEnabled(true);
      toast.success('Voice commands enabled. Say "Hey CIA" to activate.');
      return true;
    } catch (err) {
      toast.error(`Voice commands failed: ${err.message}`);
      return false;
    }
  }, [isSupported, isInitialized]);

  /**
   * Disable voice commands
   */
  const disable = useCallback(() => {
    voiceCommandService.disable();
    setIsEnabled(false);
    toast.info("Voice commands disabled");
  }, []);

  /**
   * Toggle voice commands
   */
  const toggle = useCallback(() => {
    if (isEnabled) {
      disable();
    } else {
      enable();
    }
  }, [isEnabled, enable, disable]);

  // =========================================================================
  // COMMAND REGISTRATION
  // =========================================================================

  /**
   * Register a local command handler
   *
   * This allows components to handle specific commands locally
   * in addition to the global command dispatch.
   *
   * @param {string} action - Action name (e.g., 'camera:rotate')
   * @param {Function} handler - Handler function (params, phrase) => void
   * @returns {Function} Unregister function
   */
  const registerCommand = useCallback((action, handler) => {
    localCommandHandlers.current.set(action, handler);

    return () => {
      localCommandHandlers.current.delete(action);
    };
  }, []);

  /**
   * Register multiple commands at once
   *
   * @param {Object} commands - Map of action -> handler
   * @returns {Function} Unregister all function
   */
  const registerCommands = useCallback(
    (commands) => {
      const unregisterFns = Object.entries(commands).map(([action, handler]) =>
        registerCommand(action, handler)
      );

      return () => {
        unregisterFns.forEach((fn) => fn());
      };
    },
    [registerCommand]
  );

  // =========================================================================
  // TTS HELPERS
  // =========================================================================

  /**
   * Speak text using TTS
   */
  const speak = useCallback((text, options) => {
    voiceFeedbackService.speak(text, options);
  }, []);

  /**
   * Speak with spatial positioning (VR)
   */
  const speakSpatial = useCallback((text, position, options) => {
    voiceFeedbackService.speakSpatial(text, position, options);
  }, []);

  /**
   * Stop current speech
   */
  const stopSpeaking = useCallback(() => {
    voiceFeedbackService.stop();
  }, []);

  // =========================================================================
  // SETTINGS
  // =========================================================================

  /**
   * Update voice command settings
   */
  const updateSettings = useCallback((newSettings) => {
    voiceCommandService.updateSettings(newSettings);
  }, []);

  /**
   * Update TTS settings
   */
  const updateTTSSettings = useCallback((newSettings) => {
    voiceFeedbackService.updateSettings(newSettings);
  }, []);

  /**
   * Get available voices for TTS
   */
  const getVoices = useCallback(() => {
    return voiceFeedbackService.getVoices();
  }, []);

  /**
   * Get available commands
   */
  const getAvailableCommands = useCallback(() => {
    return voiceCommandService.getAvailableCommands();
  }, []);

  // =========================================================================
  // RETURN
  // =========================================================================

  return {
    // State
    isInitialized,
    isEnabled,
    isSupported,
    state,
    isListening: state === "listening" || state === "awake",
    isAwake: state === "awake",
    lastCommand,
    interimTranscript,
    error,

    // Controls
    enable,
    disable,
    toggle,

    // Command registration
    registerCommand,
    registerCommands,

    // TTS
    speak,
    speakSpatial,
    stopSpeaking,

    // Settings
    updateSettings,
    updateTTSSettings,
    getVoices,
    getAvailableCommands,
  };
}

/**
 * useVoiceCommandHandler Hook
 *
 * Simplified hook for components that just need to handle specific commands.
 *
 * @param {string|Array} actions - Action(s) to listen for
 * @param {Function} handler - Handler function
 */
export function useVoiceCommandHandler(actions, handler) {
  const { registerCommand, registerCommands, isEnabled } = useVoiceCommands({
    autoInitialize: false,
  });

  useEffect(() => {
    if (!isEnabled) return;

    if (Array.isArray(actions)) {
      const commands = {};
      actions.forEach((action) => {
        commands[action] = handler;
      });
      return registerCommands(commands);
    } else {
      return registerCommand(actions, handler);
    }
  }, [actions, handler, isEnabled, registerCommand, registerCommands]);
}

/**
 * useVoiceFeedback Hook
 *
 * Simplified hook for components that just need TTS.
 *
 * @returns {Object} TTS controls
 */
export function useVoiceFeedback() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    voiceFeedbackService.initialize().then(() => {
      setIsInitialized(true);
    });
  }, []);

  const speak = useCallback((text, options = {}) => {
    const utterance = voiceFeedbackService.speak(text, {
      ...options,
      onEnd: () => {
        setIsSpeaking(false);
        options.onEnd?.();
      },
    });

    if (utterance) {
      setIsSpeaking(true);
    }

    return utterance;
  }, []);

  const stop = useCallback(() => {
    voiceFeedbackService.stop();
    setIsSpeaking(false);
  }, []);

  return {
    isInitialized,
    isSpeaking,
    speak,
    stop,
    getVoices: () => voiceFeedbackService.getVoices(),
    setVoice: (name) => voiceFeedbackService.setVoice(name),
  };
}

export default useVoiceCommands;
