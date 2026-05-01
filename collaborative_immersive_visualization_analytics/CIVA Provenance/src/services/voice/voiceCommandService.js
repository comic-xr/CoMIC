// src/services/voice/voiceCommandService.js
// Voice Command Service - Speech-to-Text for app control
//
// This service handles:
// 1. Wake word detection ("Hey CIA")
// 2. Speech-to-text transcription
// 3. Command parsing and dispatch
//
// It is SEPARATE from the voice room (LiveKit) for human communication.
// Users can have commands enabled while NOT in a voice room, or vice versa.
//
// Usage:
//   import { voiceCommandService } from '@Services/voice/voiceCommandService.js';
//   await voiceCommandService.initialize();
//   voiceCommandService.onCommand((command, params) => { ... });

import { app as log } from "@Utils/logger.js";

// Command definitions with action mapping
const COMMAND_GRAMMAR = {
  // Camera controls
  "rotate left": {
    action: "camera:rotate",
    params: { axis: "y", degrees: -15 },
  },
  "rotate right": {
    action: "camera:rotate",
    params: { axis: "y", degrees: 15 },
  },
  "rotate up": { action: "camera:rotate", params: { axis: "x", degrees: -15 } },
  "rotate down": {
    action: "camera:rotate",
    params: { axis: "x", degrees: 15 },
  },
  "zoom in": { action: "camera:zoom", params: { factor: 1.2 } },
  "zoom out": { action: "camera:zoom", params: { factor: 0.8 } },
  "reset view": { action: "camera:reset", params: {} },
  "reset camera": { action: "camera:reset", params: {} },

  // Instance controls
  "close instance": { action: "instance:close", params: {} },
  "new instance": { action: "instance:create", params: {} },
  fullscreen: { action: "instance:fullscreen", params: {} },
  "exit fullscreen": { action: "instance:exit-fullscreen", params: {} },

  // Recording
  "start recording": { action: "recording:start", params: {} },
  "stop recording": { action: "recording:stop", params: {} },
  "pause recording": { action: "recording:pause", params: {} },

  // Annotations
  "add annotation": { action: "annotation:start", params: {} },
  "start annotation": { action: "annotation:start", params: {} },
  "cancel annotation": { action: "annotation:cancel", params: {} },
  "delete annotation": { action: "annotation:delete-last", params: {} },
  "clear annotations": { action: "annotation:clear-all", params: {} },

  // Tools
  "select tool": { action: "tool:select", params: { tool: "select" } },
  "pan tool": { action: "tool:select", params: { tool: "pan" } },
  "zoom tool": { action: "tool:select", params: { tool: "zoom" } },
  "rotate tool": { action: "tool:select", params: { tool: "rotate" } },
  "measure tool": { action: "tool:select", params: { tool: "measure" } },
  "slice tool": { action: "tool:select", params: { tool: "slice" } },

  // VR specific
  "enter VR": { action: "vr:enter", params: {} },
  "exit VR": { action: "vr:exit", params: {} },
  grab: { action: "vr:grab", params: {} },
  release: { action: "vr:release", params: {} },
  teleport: { action: "vr:teleport", params: {} },

  // Voice room (separate from commands, but controllable via commands)
  "mute microphone": { action: "voice-room:mute", params: {} },
  "unmute microphone": { action: "voice-room:unmute", params: {} },
  "join voice": { action: "voice-room:join", params: {} },
  "leave voice": { action: "voice-room:leave", params: {} },

  // Help
  help: { action: "help:show-commands", params: {} },
  "what can I say": { action: "help:show-commands", params: {} },
};

// Wake words that trigger command listening
const DEFAULT_WAKE_WORDS = ["hey cia", "hey c i a", "okay cia", "ok cia"];

/**
 * Voice Command Service
 *
 * Uses Web Speech API for speech recognition.
 * Separate from LiveKit voice room - commands work independently.
 */
class VoiceCommandService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isAwake = false; // After wake word, before command
    this.awakeTimeout = null;
    this.commandListeners = new Set();
    this.stateListeners = new Set();

    // Settings
    this.settings = {
      enabled: false,
      wakeWords: [...DEFAULT_WAKE_WORDS],
      wakeWordTimeout: 5000, // ms to wait for command after wake word
      continuous: false, // Always listen vs wake word mode
      language: "en-US",
      confirmCommands: true, // Use TTS to confirm
    };

    // Load saved settings
    this._loadSettings();
  }

  /**
   * Initialize the voice command service
   * @returns {Promise<boolean>} Whether initialization succeeded
   */
  async initialize() {
    // Check for Web Speech API support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      log.warn("Web Speech API not supported in this browser");
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.settings.language;

    // Set up event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      this._notifyStateChange("listening");
      log.debug("Voice recognition started");
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this._notifyStateChange("stopped");
      log.debug("Voice recognition ended");

      // Restart if enabled and not intentionally stopped
      if (this.settings.enabled && !this._intentionalStop) {
        setTimeout(() => this._startRecognition(), 100);
      }
    };

    this.recognition.onresult = (event) => {
      this._handleResult(event);
    };

    this.recognition.onerror = (event) => {
      log.error("Voice recognition error:", event.error);
      this._notifyStateChange("error", event.error);
    };

    log.info("Voice command service initialized");
    return true;
  }

  /**
   * Enable voice commands
   */
  enable() {
    this.settings.enabled = true;
    this._saveSettings();
    this._startRecognition();
    log.info("Voice commands enabled");
  }

  /**
   * Disable voice commands
   */
  disable() {
    this.settings.enabled = false;
    this._intentionalStop = true;
    this._saveSettings();
    this._stopRecognition();
    log.info("Voice commands disabled");
  }

  /**
   * Check if service is enabled
   */
  isEnabled() {
    return this.settings.enabled;
  }

  /**
   * Handle speech recognition results
   * @private
   */
  _handleResult(event) {
    const results = event.results;
    const lastResult = results[results.length - 1];

    if (!lastResult.isFinal) {
      // Interim result - could show visual feedback
      const transcript = lastResult[0].transcript.toLowerCase().trim();
      this._notifyStateChange("interim", transcript);
      return;
    }

    const transcript = lastResult[0].transcript.toLowerCase().trim();
    const confidence = lastResult[0].confidence;

    log.debug(
      `Voice heard: "${transcript}" (confidence: ${(confidence * 100).toFixed(
        1
      )}%)`
    );

    if (this.settings.continuous) {
      // Continuous mode - try to parse command directly
      this._processCommand(transcript);
    } else {
      // Wake word mode
      if (!this.isAwake) {
        // Check for wake word
        const hasWakeWord = this.settings.wakeWords.some((wake) =>
          transcript.includes(wake)
        );

        if (hasWakeWord) {
          this._wake();

          // Check if command follows wake word
          const afterWake = this._extractAfterWakeWord(transcript);
          if (afterWake) {
            this._processCommand(afterWake);
          }
        }
      } else {
        // Already awake - process as command
        this._processCommand(transcript);
      }
    }
  }

  /**
   * Enter "awake" state after wake word
   * @private
   */
  _wake() {
    this.isAwake = true;
    this._notifyStateChange("awake");
    log.debug("Voice commands awake - listening for command");

    // Play awake sound or TTS
    this._playFeedback("ready");

    // Set timeout to go back to sleep
    if (this.awakeTimeout) {
      clearTimeout(this.awakeTimeout);
    }
    this.awakeTimeout = setTimeout(() => {
      this._sleep();
    }, this.settings.wakeWordTimeout);
  }

  /**
   * Return to sleep state
   * @private
   */
  _sleep() {
    if (this.isAwake) {
      this.isAwake = false;
      this._notifyStateChange("sleeping");
      log.debug("Voice commands going to sleep");
    }
  }

  /**
   * Extract command text after wake word
   * @private
   */
  _extractAfterWakeWord(transcript) {
    for (const wake of this.settings.wakeWords) {
      const index = transcript.indexOf(wake);
      if (index !== -1) {
        const after = transcript.substring(index + wake.length).trim();
        if (after.length > 0) {
          return after;
        }
      }
    }
    return null;
  }

  /**
   * Process a potential command
   * @private
   */
  _processCommand(transcript) {
    // Cancel awake timeout since we got a command
    if (this.awakeTimeout) {
      clearTimeout(this.awakeTimeout);
    }

    // Try to match against grammar
    const matched = this._matchCommand(transcript);

    if (matched) {
      log.info(
        `Voice command recognized: "${matched.phrase}" → ${matched.action}`
      );

      // Dispatch the command
      this._dispatchCommand(matched.action, matched.params);

      // Notify listeners
      this._notifyCommand(matched);

      // Play confirmation
      if (this.settings.confirmCommands) {
        this._playFeedback("confirmed", matched.phrase);
      }
    } else {
      log.debug(`No command matched for: "${transcript}"`);
      this._playFeedback("unrecognized");
    }

    // Go back to sleep (in wake word mode)
    if (!this.settings.continuous) {
      this._sleep();
    }
  }

  /**
   * Match transcript against command grammar
   * @private
   */
  _matchCommand(transcript) {
    // Exact match first
    if (COMMAND_GRAMMAR[transcript]) {
      return {
        phrase: transcript,
        ...COMMAND_GRAMMAR[transcript],
      };
    }

    // Fuzzy match - check if transcript starts with or contains command
    for (const [phrase, command] of Object.entries(COMMAND_GRAMMAR)) {
      if (transcript.includes(phrase)) {
        return {
          phrase,
          ...command,
        };
      }
    }

    return null;
  }

  /**
   * Dispatch command as custom event
   * @private
   */
  _dispatchCommand(action, params) {
    const [category, name] = action.split(":");

    window.dispatchEvent(
      new CustomEvent("cia:voice-command", {
        detail: { action, category, name, params },
      })
    );

    // Also dispatch specific event for the action
    window.dispatchEvent(
      new CustomEvent(`cia:${action}`, {
        detail: params,
      })
    );
  }

  /**
   * Play audio/TTS feedback
   * @private
   */
  _playFeedback(type, commandPhrase) {
    // Import voice feedback service dynamically to avoid circular deps
    import("./voiceFeedbackService.js")
      .then(({ voiceFeedbackService }) => {
        switch (type) {
          case "ready":
            voiceFeedbackService.speak("Listening");
            break;
          case "confirmed":
            voiceFeedbackService.speak(commandPhrase || "OK");
            break;
          case "unrecognized":
            voiceFeedbackService.speak("I didn't understand that");
            break;
        }
      })
      .catch(() => {
        // Voice feedback not available, use audio cues
        // TODO: Play beep sounds
      });
  }

  // =========================================================================
  // Recognition control
  // =========================================================================

  _startRecognition() {
    if (this.recognition && !this.isListening) {
      this._intentionalStop = false;
      try {
        this.recognition.start();
      } catch (e) {
        log.debug("Recognition already started");
      }
    }
  }

  _stopRecognition() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  // =========================================================================
  // Listeners
  // =========================================================================

  /**
   * Add listener for commands
   * @param {Function} callback - Called with (action, params)
   * @returns {Function} Unsubscribe function
   */
  onCommand(callback) {
    this.commandListeners.add(callback);
    return () => this.commandListeners.delete(callback);
  }

  /**
   * Add listener for state changes
   * @param {Function} callback - Called with (state, data)
   * @returns {Function} Unsubscribe function
   */
  onStateChange(callback) {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  _notifyCommand(matched) {
    this.commandListeners.forEach((cb) => {
      try {
        cb(matched.action, matched.params, matched.phrase);
      } catch (e) {
        log.error("Command listener error:", e);
      }
    });
  }

  _notifyStateChange(state, data) {
    this.stateListeners.forEach((cb) => {
      try {
        cb(state, data);
      } catch (e) {
        log.error("State listener error:", e);
      }
    });
  }

  // =========================================================================
  // Settings persistence
  // =========================================================================

  _loadSettings() {
    try {
      const stored = localStorage.getItem("cia:voice-command-settings");
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (e) {
      log.debug("Could not load voice settings");
    }
  }

  _saveSettings() {
    try {
      localStorage.setItem(
        "cia:voice-command-settings",
        JSON.stringify(this.settings)
      );
    } catch (e) {
      log.debug("Could not save voice settings");
    }
  }

  /**
   * Update settings
   * @param {Object} newSettings - Settings to merge
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this._saveSettings();

    // Apply language change
    if (this.recognition && newSettings.language) {
      this.recognition.lang = newSettings.language;
    }
  }

  /**
   * Get available commands
   * @returns {Array} List of command phrases
   */
  getAvailableCommands() {
    return Object.keys(COMMAND_GRAMMAR);
  }

  /**
   * Get command grammar for help display
   * @returns {Object} Command grammar
   */
  getCommandGrammar() {
    return { ...COMMAND_GRAMMAR };
  }
}

// Singleton instance
export const voiceCommandService = new VoiceCommandService();
export default voiceCommandService;
