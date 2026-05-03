// src/core/instances/types/vtk/features/VTKTimeSeriesFeature.js

/**
 * VTK Time Series Feature
 *
 * Handles temporal data with multiple time steps.
 * Provides animation controls and time step navigation.
 *
 * Provides:
 * - Time step navigation
 * - Playback controls (play, pause, loop)
 * - Frame rate control
 * - Time interpolation options
 *
 * Works with:
 * - Multi-block datasets with time data
 * - Series of files representing time steps
 * - Datasets with time-varying arrays
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Playback modes
 */
const PLAYBACK_MODES = {
  once: { name: 'Play Once', description: 'Stop at end' },
  loop: { name: 'Loop', description: 'Restart from beginning' },
  pingPong: { name: 'Ping-Pong', description: 'Reverse direction at ends' },
};

/**
 * Playback speeds (frames per second)
 */
const PLAYBACK_SPEEDS = [0.5, 1, 2, 5, 10, 15, 24, 30];

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  enabled: false,
  currentStep: 0,
  totalSteps: 1,
  playing: false,
  playbackMode: 'loop',
  fps: 5,
  direction: 1,  // 1 = forward, -1 = backward
};

// =============================================================================
// VTK TIME SERIES FEATURE
// =============================================================================

export class VTKTimeSeriesFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKTimeSeriesFeature',
      name: 'Time Series',
      description: 'Navigate and animate temporal data',
      version: '1.0.0',
      author: 'CIA Team',
    };
  }

  /**
   * Check if this feature is available
   */
  isAvailable(instanceId, instanceData) {
    // Available if we detect time data
    const state = this.instanceStates.get(instanceId);
    return state?.totalSteps > 1;
  }

  /**
   * Initialize time series feature
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects } = instanceData;

    if (!sceneObjects) {
      log.warn(`Cannot initialize time series: no sceneObjects for ${instanceId}`);
      return;
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      instanceData,
      // Time data
      timeSteps: [],
      timeValues: [],
      // Playback
      animationFrame: null,
      lastFrameTime: 0,
      // Callbacks
      onTimeChange: null,
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Time series feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up time series resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    // Stop any animation
    this._stopAnimation(state);

    this.instanceStates.delete(instanceId);
    log.debug(`Time series feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      enabled: state.enabled,
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      playing: state.playing,
      playbackMode: state.playbackMode,
      fps: state.fps,
      timeValues: state.timeValues,
      currentTime: state.timeValues[state.currentStep] ?? state.currentStep,
    };
  }

  // ===========================================================================
  // TIME DATA CONFIGURATION
  // ===========================================================================

  /**
   * Configure time steps from data
   */
  configureTimeSteps(instanceId, options) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const {
      totalSteps = 1,
      timeValues = null,  // Optional array of time values
      timeStepData = null,  // Optional array of datasets per step
      onTimeChange = null,  // Callback when time changes
    } = options;

    state.totalSteps = totalSteps;
    state.timeSteps = timeStepData || [];

    // Generate time values if not provided
    if (timeValues && timeValues.length === totalSteps) {
      state.timeValues = timeValues;
    } else {
      state.timeValues = Array.from({ length: totalSteps }, (_, i) => i);
    }

    state.onTimeChange = onTimeChange;
    state.enabled = totalSteps > 1;
    state.currentStep = 0;

    log.debug(`Time series configured with ${totalSteps} steps`);
  }

  /**
   * Register a callback for time changes
   */
  onTimeChange(instanceId, callback) {
    const state = this.instanceStates.get(instanceId);
    if (state) {
      state.onTimeChange = callback;
    }
  }

  // ===========================================================================
  // NAVIGATION
  // ===========================================================================

  /**
   * Go to specific time step
   */
  setTimeStep(instanceId, step) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    // Clamp to valid range
    const newStep = Math.max(0, Math.min(state.totalSteps - 1, Math.floor(step)));

    if (newStep !== state.currentStep) {
      state.currentStep = newStep;
      this._notifyTimeChange(state);
    }
  }

  /**
   * Go to next time step
   */
  nextStep(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    let newStep = state.currentStep + 1;

    if (newStep >= state.totalSteps) {
      switch (state.playbackMode) {
        case 'loop':
          newStep = 0;
          break;
        case 'pingPong':
          state.direction = -1;
          newStep = state.totalSteps - 2;
          break;
        default:
          newStep = state.totalSteps - 1;
          break;
      }
    }

    if (newStep !== state.currentStep) {
      state.currentStep = newStep;
      this._notifyTimeChange(state);
    }
  }

  /**
   * Go to previous time step
   */
  prevStep(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    let newStep = state.currentStep - 1;

    if (newStep < 0) {
      switch (state.playbackMode) {
        case 'loop':
          newStep = state.totalSteps - 1;
          break;
        case 'pingPong':
          state.direction = 1;
          newStep = 1;
          break;
        default:
          newStep = 0;
          break;
      }
    }

    if (newStep !== state.currentStep) {
      state.currentStep = newStep;
      this._notifyTimeChange(state);
    }
  }

  /**
   * Go to first time step
   */
  firstStep(instanceId) {
    this.setTimeStep(instanceId, 0);
  }

  /**
   * Go to last time step
   */
  lastStep(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (state) {
      this.setTimeStep(instanceId, state.totalSteps - 1);
    }
  }

  // ===========================================================================
  // PLAYBACK
  // ===========================================================================

  /**
   * Start playback
   */
  play(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled || state.playing) return;

    state.playing = true;
    state.lastFrameTime = performance.now();
    this._animationLoop(instanceId, state);

    log.debug(`Time series playback started`);
  }

  /**
   * Pause playback
   */
  pause(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.playing) return;

    this._stopAnimation(state);
    log.debug(`Time series playback paused`);
  }

  /**
   * Toggle play/pause
   */
  togglePlayback(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (state.playing) {
      this.pause(instanceId);
    } else {
      this.play(instanceId);
    }
  }

  /**
   * Stop and reset to beginning
   */
  stop(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._stopAnimation(state);
    state.currentStep = 0;
    state.direction = 1;
    this._notifyTimeChange(state);

    log.debug(`Time series playback stopped`);
  }

  /**
   * Animation loop
   */
  _animationLoop(instanceId, state) {
    if (!state.playing) return;

    const now = performance.now();
    const elapsed = now - state.lastFrameTime;
    const frameInterval = 1000 / state.fps;

    if (elapsed >= frameInterval) {
      state.lastFrameTime = now - (elapsed % frameInterval);

      // Advance time step
      if (state.direction > 0) {
        this.nextStep(instanceId);
      } else {
        this.prevStep(instanceId);
      }

      // Check for end conditions
      if (state.playbackMode === 'once') {
        if ((state.direction > 0 && state.currentStep >= state.totalSteps - 1) ||
            (state.direction < 0 && state.currentStep <= 0)) {
          this.pause(instanceId);
          return;
        }
      }
    }

    state.animationFrame = requestAnimationFrame(() => this._animationLoop(instanceId, state));
  }

  /**
   * Stop animation
   */
  _stopAnimation(state) {
    state.playing = false;
    if (state.animationFrame) {
      cancelAnimationFrame(state.animationFrame);
      state.animationFrame = null;
    }
  }

  /**
   * Set playback speed (FPS)
   */
  setFPS(instanceId, fps) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.fps = Math.max(0.1, Math.min(60, fps));
    log.debug(`Playback speed set to ${state.fps} FPS`);
  }

  /**
   * Set playback mode
   */
  setPlaybackMode(instanceId, mode) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (!PLAYBACK_MODES[mode]) {
      log.warn(`Unknown playback mode: ${mode}`);
      return;
    }

    state.playbackMode = mode;
    state.direction = 1;  // Reset direction
  }

  // ===========================================================================
  // NOTIFICATION
  // ===========================================================================

  /**
   * Notify about time change
   */
  _notifyTimeChange(state) {
    const { currentStep, timeValues, onTimeChange, sceneObjects } = state;
    const currentTime = timeValues[currentStep] ?? currentStep;

    // Call registered callback
    if (onTimeChange) {
      onTimeChange({
        step: currentStep,
        time: currentTime,
        total: state.totalSteps,
      });
    }

    // Render
    sceneObjects.renderWindow?.render();
  }

  // ===========================================================================
  // TOOLS INTERFACE
  // ===========================================================================

  /**
   * Get tools for the toolbar
   */
  getTools(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return [];

    const currentTime = state.timeValues[state.currentStep] ?? state.currentStep;

    return [
      // Time display / scrubber
      {
        id: 'time-display',
        icon: 'clock',
        label: `${state.currentStep + 1}/${state.totalSteps}`,
        description: `Time: ${typeof currentTime === 'number' ? currentTime.toFixed(2) : currentTime}`,
        type: 'display',
      },
      // First
      {
        id: 'time-first',
        icon: 'skip-back',
        label: 'First',
        description: 'Go to first time step',
        type: 'action',
        disabled: state.currentStep === 0,
        onClick: () => this.firstStep(instanceId),
      },
      // Previous
      {
        id: 'time-prev',
        icon: 'chevron-left',
        label: 'Prev',
        description: 'Previous time step',
        type: 'action',
        disabled: state.currentStep === 0 && state.playbackMode === 'once',
        onClick: () => this.prevStep(instanceId),
      },
      // Play/Pause
      {
        id: 'time-play',
        icon: state.playing ? 'pause' : 'play',
        label: state.playing ? 'Pause' : 'Play',
        description: state.playing ? 'Pause playback' : 'Start playback',
        type: 'toggle',
        active: state.playing,
        onClick: () => this.togglePlayback(instanceId),
      },
      // Next
      {
        id: 'time-next',
        icon: 'chevron-right',
        label: 'Next',
        description: 'Next time step',
        type: 'action',
        disabled: state.currentStep >= state.totalSteps - 1 && state.playbackMode === 'once',
        onClick: () => this.nextStep(instanceId),
      },
      // Last
      {
        id: 'time-last',
        icon: 'skip-forward',
        label: 'Last',
        description: 'Go to last time step',
        type: 'action',
        disabled: state.currentStep >= state.totalSteps - 1,
        onClick: () => this.lastStep(instanceId),
      },
      // Speed control
      {
        id: 'time-speed',
        icon: 'zap',
        label: `${state.fps} FPS`,
        description: 'Playback speed',
        type: 'menu',
        options: PLAYBACK_SPEEDS.map(fps => ({
          id: `speed-${fps}`,
          label: `${fps} FPS`,
          active: state.fps === fps,
          onClick: () => this.setFPS(instanceId, fps),
        })),
      },
      // Playback mode
      {
        id: 'time-mode',
        icon: state.playbackMode === 'loop' ? 'repeat' : state.playbackMode === 'pingPong' ? 'refresh-cw' : 'arrow-right',
        label: PLAYBACK_MODES[state.playbackMode].name,
        description: 'Playback mode',
        type: 'menu',
        options: Object.entries(PLAYBACK_MODES).map(([id, mode]) => ({
          id: `mode-${id}`,
          label: mode.name,
          description: mode.description,
          active: state.playbackMode === id,
          onClick: () => this.setPlaybackMode(instanceId, id),
        })),
      },
    ];
  }
}

// Export singleton instance
export const vtkTimeSeriesFeature = new VTKTimeSeriesFeature();
export default vtkTimeSeriesFeature;
