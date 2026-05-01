// src/utils/startupLogger.js
// Startup logging utility for verifying the logging pipeline
//
// This module provides comprehensive startup logging that helps verify
// all systems are initializing correctly. It's useful for:
// 1. Debugging initialization issues
// 2. Verifying the logging pipeline is working
// 3. Providing a startup summary for diagnostics
//
// Usage:
//   import { startupLogger } from '@Utils/startupLogger.js';
//   startupLogger.begin();
//   // ... initialization code ...
//   startupLogger.phase('Phase 1', 'Core services');
//   startupLogger.complete();

import { app as log } from "./logger.js";

// Track startup phases and timing
const phases = [];
let startTime = null;
let isComplete = false;

function readStartupProfilingFlag() {
  try {
    return localStorage.getItem("CIA_STARTUP_PROFILING") === "true";
  } catch (error) {
    return false;
  }
}

export function isStartupProfilingEnabled() {
  if (typeof window === "undefined") return false;
  if (window.CIA_STARTUP_PROFILING === true) return true;
  return readStartupProfilingFlag();
}

/**
 * Startup Logger
 *
 * Provides structured logging for application startup with timing,
 * phase tracking, and a summary report.
 */
export const startupLogger = {
  /**
   * Begin startup logging
   * Call this at the very start of initialization
   */
  begin() {
    startTime = performance.now();
    isComplete = false;
    phases.length = 0; // Clear any previous phases

    // Print startup banner
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   CIA Web Initializing                       ║
╠══════════════════════════════════════════════════════════════╣
`);

    log.info("Application startup initiated");
    log.debug("Startup time:", new Date().toISOString());
    log.debug("User Agent:", navigator.userAgent);
    log.debug("URL:", window.location.href);

    // Log environment info
    this._logEnvironment();
  },

  /**
   * Log environment information
   * @private
   */
  _logEnvironment() {
    const env = {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port || "default",
      pathname: window.location.pathname,
      isSecure: window.location.protocol === "https:",
      isLocalhost: ["localhost", "127.0.0.1"].includes(
        window.location.hostname
      ),
      hasWebXR: "xr" in navigator,
      hasWebGL: !!document.createElement("canvas").getContext("webgl2"),
      devicePixelRatio: window.devicePixelRatio,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    };

    log.debug("Environment:", env);
  },

  /**
   * Log the start of an initialization phase
   *
   * @param {string} name - Phase name (e.g., 'Phase 1')
   * @param {string} description - What this phase does
   */
  phase(name, description) {
    const phaseStart = performance.now();
    const elapsed = phaseStart - startTime;

    phases.push({
      name,
      description,
      startTime: phaseStart,
      startElapsed: elapsed,
      endTime: null,
      duration: null,
      status: "running",
      steps: [],
    });

    console.log(`║  ${name}: ${description}`);
    log.info(`Starting ${name}: ${description}`);
  },

  /**
   * Log a step within the current phase
   *
   * @param {string} step - Step description
   * @param {string} status - 'ok', 'warn', 'error', 'skip'
   */
  step(step, status = "ok") {
    const currentPhase = phases[phases.length - 1];
    if (!currentPhase) {
      log.warn("step() called without active phase");
      return;
    }

    const stepTime = performance.now();
    const icons = {
      ok: "✓",
      warn: "⚠",
      error: "✗",
      skip: "○",
    };

    currentPhase.steps.push({
      step,
      status,
      time: stepTime,
    });

    const icon = icons[status] || icons.ok;
    console.log(`║     ${icon} ${step}`);

    // Log with appropriate level
    switch (status) {
      case "error":
        log.error(`  ${step}`);
        break;
      case "warn":
        log.warn(`  ${step}`);
        break;
      case "skip":
        log.debug(`  ${step} (skipped)`);
        break;
      default:
        log.debug(`  ${step}`);
    }
  },

  /**
   * Complete the current phase
   *
   * @param {string} status - 'success', 'partial', 'failed'
   */
  phaseComplete(status = "success") {
    const currentPhase = phases[phases.length - 1];
    if (!currentPhase) {
      log.warn("phaseComplete() called without active phase");
      return;
    }

    currentPhase.endTime = performance.now();
    currentPhase.duration = currentPhase.endTime - currentPhase.startTime;
    currentPhase.status = status;

    const durationMs = currentPhase.duration.toFixed(0);
    log.info(`${currentPhase.name} complete (${durationMs}ms) - ${status}`);
  },

  /**
   * Log a warning during startup
   *
   * @param {string} message - Warning message
   * @param {Error} [error] - Optional error object
   */
  warn(message, error) {
    console.log(`║  ⚠️  ${message}`);
    if (error) {
      log.warn(message, error);
    } else {
      log.warn(message);
    }
  },

  /**
   * Log an error during startup
   *
   * @param {string} message - Error message
   * @param {Error} [error] - Optional error object
   */
  error(message, error) {
    console.log(`║  ❌  ${message}`);
    if (error) {
      log.error(message, error);
    } else {
      log.error(message);
    }
  },

  /**
   * Complete startup logging and print summary
   *
   * @param {Object} stats - Optional stats to include in summary
   */
  complete(stats = {}) {
    if (isComplete) {
      log.warn("complete() called multiple times");
      return;
    }

    isComplete = true;
    const totalTime = performance.now() - startTime;

    // Print summary banner
    console.log(`╠══════════════════════════════════════════════════════════════╣
║                    Startup Complete                          ║
╠══════════════════════════════════════════════════════════════╣`);

    // Phase summary
    console.log(`║  Phases:`);
    phases.forEach((phase) => {
      const dur = phase.duration ? `${phase.duration.toFixed(0)}ms` : "running";
      const statusIcon =
        phase.status === "success"
          ? "✓"
          : phase.status === "partial"
          ? "⚠"
          : "✗";
      console.log(`║    ${statusIcon} ${phase.name}: ${dur}`);
    });

    // Stats summary
    if (Object.keys(stats).length > 0) {
      console.log(`║  Stats:`);
      Object.entries(stats).forEach(([key, value]) => {
        console.log(`║    ${key}: ${value}`);
      });
    }

    // Total time
    console.log(`╠══════════════════════════════════════════════════════════════╣
║  Total startup time: ${totalTime.toFixed(0)}ms
╚══════════════════════════════════════════════════════════════╝`);

    log.info(`Startup complete in ${totalTime.toFixed(0)}ms`);

    // Return summary object for programmatic access
    return {
      totalTime,
      phases: phases.map((p) => ({
        name: p.name,
        duration: p.duration,
        status: p.status,
        stepCount: p.steps.length,
      })),
      stats,
    };
  },

  /**
   * Log verification that logging is working
   * Call this to verify all log levels are functioning
   */
  verifyLogging() {
    console.log("║  Verifying logging pipeline:");
    log.error("  Test error message (should be RED)");
    log.warn("  Test warning message (should be YELLOW)");
    log.info("  Test info message (should be BLUE)");
    log.debug("  Test debug message (should be GRAY)");
    log.trace("  Test trace message (should be LIGHT GRAY)");

    // Also verify the category system
    console.log("║  Logging categories verified");
  },

  /**
   * Get the startup summary
   * @returns {Object} Summary object or null if not complete
   */
  getSummary() {
    if (!isComplete) {
      return null;
    }

    return {
      totalTime: performance.now() - startTime,
      phases: [...phases],
    };
  },
};

// Also export individual functions for convenience
export const {
  begin,
  phase,
  step,
  phaseComplete,
  warn,
  error,
  complete,
  verifyLogging,
  getSummary,
} = startupLogger;

export default startupLogger;
