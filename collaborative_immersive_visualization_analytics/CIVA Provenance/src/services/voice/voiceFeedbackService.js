// src/services/voice/voiceFeedbackService.js
// Voice Feedback Service - Text-to-Speech for app responses
//
// This service provides spoken feedback to users, especially important for VR.
// Uses Web Speech Synthesis API (built into all modern browsers).
//
// Features:
// - Command confirmations
// - Error messages
// - Spatial audio for VR (uses position hints)
// - Interruptible speech queue
// - Multiple voice options
//
// Usage:
//   import { voiceFeedbackService } from '@Services/voice/voiceFeedbackService.js';
//   voiceFeedbackService.speak('Recording started');
//   voiceFeedbackService.speakSpatial('Annotation added', { x: 1, y: 0, z: -2 });

import { app as log } from "@Utils/logger.js";

/**
 * Priority levels for speech
 */
const PRIORITY = {
  LOW: 0, // Can be interrupted
  NORMAL: 1, // Standard messages
  HIGH: 2, // Important feedback
  CRITICAL: 3, // Cannot be interrupted (errors, warnings)
};

/**
 * Voice Feedback Service
 *
 * Provides text-to-speech functionality for the application.
 * Separate from voice room audio - TTS plays locally only.
 */
class VoiceFeedbackService {
  constructor() {
    this.synthesis = window.speechSynthesis;
    this.voices = [];
    this.currentUtterance = null;
    this.queue = [];
    this.isInitialized = false;

    // Audio context for spatial audio in VR
    this.audioContext = null;
    this.pannerNode = null;

    // Settings
    this.settings = {
      enabled: true,
      voice: null, // null = default
      rate: 1.0,
      pitch: 1.0,
      volume: 0.8,
      enableInVR: true,
      useSpatialAudio: true,
      confirmCommands: true,
      readErrors: true,
      readTooltips: false, // Accessibility option
    };

    this._loadSettings();
  }

  /**
   * Initialize the voice feedback service
   * @returns {Promise<boolean>}
   */
  async initialize() {
    if (!this.synthesis) {
      log.warn("Speech synthesis not supported");
      return false;
    }

    // Load voices (may be async in some browsers)
    return new Promise((resolve) => {
      const loadVoices = () => {
        this.voices = this.synthesis.getVoices();

        if (this.voices.length > 0) {
          this.isInitialized = true;
          log.debug(`Loaded ${this.voices.length} TTS voices`);

          // Select preferred voice if set
          if (this.settings.voice) {
            this._selectVoice(this.settings.voice);
          }

          resolve(true);
        }
      };

      // Try immediately
      loadVoices();

      // Also listen for voiceschanged event (Chrome loads async)
      if (this.voices.length === 0) {
        this.synthesis.onvoiceschanged = () => {
          loadVoices();
        };

        // Timeout fallback
        setTimeout(() => {
          if (!this.isInitialized) {
            log.warn("TTS voices did not load in time");
            this.isInitialized = true;
            resolve(true);
          }
        }, 2000);
      }
    });
  }

  /**
   * Speak a message
   *
   * @param {string} text - Text to speak
   * @param {Object} options - Speech options
   * @param {number} options.priority - Priority level
   * @param {number} options.rate - Speech rate (0.1-10)
   * @param {number} options.pitch - Speech pitch (0-2)
   * @param {number} options.volume - Volume (0-1)
   * @param {Function} options.onEnd - Callback when speech ends
   * @returns {SpeechSynthesisUtterance|null}
   */
  speak(text, options = {}) {
    if (!this.settings.enabled || !this.synthesis) {
      return null;
    }

    const {
      priority = PRIORITY.NORMAL,
      rate = this.settings.rate,
      pitch = this.settings.pitch,
      volume = this.settings.volume,
      onEnd,
    } = options;

    // Handle interruption based on priority
    if (this.currentUtterance && priority >= PRIORITY.HIGH) {
      this.synthesis.cancel(); // Interrupt current speech
    } else if (this.synthesis.speaking && priority < PRIORITY.HIGH) {
      // Queue for later
      this.queue.push({ text, options });
      return null;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // Apply settings
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Event handlers
    utterance.onend = () => {
      this.currentUtterance = null;
      onEnd?.();
      this._processQueue();
    };

    utterance.onerror = (event) => {
      log.error("TTS error:", event.error);
      this.currentUtterance = null;
      this._processQueue();
    };

    // Speak
    this.currentUtterance = utterance;
    this.synthesis.speak(utterance);

    log.debug(`TTS: "${text}"`);
    return utterance;
  }

  /**
   * Speak with spatial positioning (for VR)
   *
   * @param {string} text - Text to speak
   * @param {Object} position - 3D position {x, y, z}
   * @param {Object} options - Additional options
   */
  speakSpatial(text, position, options = {}) {
    if (!this.settings.useSpatialAudio || !this.settings.enableInVR) {
      // Fall back to regular speech
      return this.speak(text, options);
    }

    // For now, just speak normally
    // Full spatial audio requires AudioContext + TTS audio stream
    // which is complex and browser-dependent

    // TODO: Implement full spatial audio when needed
    // This would require:
    // 1. Using a TTS API that returns audio buffer
    // 2. Creating AudioBufferSourceNode
    // 3. Connecting through PannerNode
    // 4. Setting panner position

    // For now, add positional hint to the message
    const direction = this._getDirectionHint(position);
    if (direction && options.includeDirection !== false) {
      return this.speak(`${text}. ${direction}`, options);
    }

    return this.speak(text, options);
  }

  /**
   * Get directional hint for a position
   * @private
   */
  _getDirectionHint(position) {
    if (!position) return null;

    const { x, y, z } = position;
    const hints = [];

    // Horizontal
    if (Math.abs(x) > 0.5) {
      hints.push(x > 0 ? "to your right" : "to your left");
    }

    // Vertical
    if (Math.abs(y) > 0.5) {
      hints.push(y > 0 ? "above you" : "below you");
    }

    // Depth
    if (z < -1) {
      hints.push("in front of you");
    } else if (z > 1) {
      hints.push("behind you");
    }

    return hints.length > 0 ? hints.join(", ") : null;
  }

  /**
   * Process queued messages
   * @private
   */
  _processQueue() {
    if (this.queue.length > 0 && !this.synthesis.speaking) {
      const { text, options } = this.queue.shift();
      this.speak(text, options);
    }
  }

  /**
   * Stop current speech and clear queue
   */
  stop() {
    this.synthesis.cancel();
    this.queue = [];
    this.currentUtterance = null;
  }

  /**
   * Pause current speech
   */
  pause() {
    this.synthesis.pause();
  }

  /**
   * Resume paused speech
   */
  resume() {
    this.synthesis.resume();
  }

  // =========================================================================
  // Convenience methods for common feedback
  // =========================================================================

  /**
   * Confirm a command
   */
  confirmCommand(command) {
    if (this.settings.confirmCommands) {
      this.speak(command, { priority: PRIORITY.NORMAL });
    }
  }

  /**
   * Speak an error
   */
  error(message) {
    if (this.settings.readErrors) {
      this.speak(`Error: ${message}`, { priority: PRIORITY.HIGH });
    }
  }

  /**
   * Speak a warning
   */
  warn(message) {
    if (this.settings.readErrors) {
      this.speak(`Warning: ${message}`, { priority: PRIORITY.NORMAL });
    }
  }

  /**
   * Speak a success message
   */
  success(message) {
    this.speak(message, { priority: PRIORITY.NORMAL });
  }

  /**
   * Read a tooltip (accessibility)
   */
  readTooltip(text) {
    if (this.settings.readTooltips) {
      this.speak(text, { priority: PRIORITY.LOW });
    }
  }

  // =========================================================================
  // Voice management
  // =========================================================================

  /**
   * Get available voices
   * @returns {Array<SpeechSynthesisVoice>}
   */
  getVoices() {
    return this.voices;
  }

  /**
   * Get voices grouped by language
   * @returns {Object}
   */
  getVoicesGrouped() {
    const grouped = {};

    for (const voice of this.voices) {
      const lang = voice.lang.split("-")[0];
      if (!grouped[lang]) {
        grouped[lang] = [];
      }
      grouped[lang].push(voice);
    }

    return grouped;
  }

  /**
   * Select a voice by name
   * @param {string} voiceName
   */
  _selectVoice(voiceName) {
    const voice = this.voices.find((v) => v.name === voiceName);
    if (voice) {
      this.selectedVoice = voice;
      log.debug(`Selected TTS voice: ${voice.name}`);
    }
  }

  /**
   * Set the preferred voice
   * @param {string} voiceName
   */
  setVoice(voiceName) {
    this._selectVoice(voiceName);
    this.settings.voice = voiceName;
    this._saveSettings();
  }

  // =========================================================================
  // Settings
  // =========================================================================

  /**
   * Enable/disable voice feedback
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.settings.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
    this._saveSettings();
  }

  /**
   * Update settings
   * @param {Object} newSettings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };

    if (newSettings.voice) {
      this._selectVoice(newSettings.voice);
    }

    this._saveSettings();
  }

  /**
   * Get current settings
   * @returns {Object}
   */
  getSettings() {
    return { ...this.settings };
  }

  _loadSettings() {
    try {
      const stored = localStorage.getItem("cia:voice-feedback-settings");
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (e) {
      log.debug("Could not load TTS settings");
    }
  }

  _saveSettings() {
    try {
      localStorage.setItem(
        "cia:voice-feedback-settings",
        JSON.stringify(this.settings)
      );
    } catch (e) {
      log.debug("Could not save TTS settings");
    }
  }

  // =========================================================================
  // Status
  // =========================================================================

  /**
   * Check if currently speaking
   */
  isSpeaking() {
    return this.synthesis.speaking;
  }

  /**
   * Check if paused
   */
  isPaused() {
    return this.synthesis.paused;
  }

  /**
   * Get queue length
   */
  getQueueLength() {
    return this.queue.length;
  }
}

// Export priority constants
export { PRIORITY };

// Singleton instance
export const voiceFeedbackService = new VoiceFeedbackService();
export default voiceFeedbackService;
