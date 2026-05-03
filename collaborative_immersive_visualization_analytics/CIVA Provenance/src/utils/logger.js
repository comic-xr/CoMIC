// src/utils/logger.js
// Client-side structured logging with levels and categories
// Control verbosity via localStorage, URL params, or runtime API
//
// Usage:
//   import { dataset, workspace } from '@Utils/logger.js';
//   dataset.info('Loaded:', count);
//   workspace.debug('Camera updated:', position);
//
// Runtime control (browser console):
//   log.status()              - Show current config
//   log.setLevel('debug')     - Set level
//   log.setCategory('sync', false) - Toggle category
//   log.only('ws', 'dataset') - Enable only specific categories
//   log.all()                 - Enable all
//
// URL params:
//   ?log=debug&logcat=ws,dataset

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

// Default category states
// true = enabled by default, false = disabled (too noisy for normal use)
const DEFAULT_CATEGORIES = {
  // Core app
  app: true, // App lifecycle, initialization phases
  ui: false, // UI component events (noisy)
  event: true, // App events
  store: false, // Zustand/state updates (noisy)

  // Network & sync
  api: true, // HTTP API calls
  ws: true, // WebSocket events
  sync: false, // Y.js sync operations (very noisy)

  // Data layer
  dataset: true, // DatasetManager operations
  view: true, // ViewConfigurationManager operations
  viewGroup: true, // ViewGroupManager operations
  annotation: true, // AnnotationManager operations

  // Instance layer
  workspace: true, // WorkspaceCanvas, layout
  instance: true, // Instance lifecycle, handler calls
  render: false, // Render loop (extremely noisy)

  // Collaboration
  presence: false, // User presence updates (noisy)
  cursor: false, // Cursor position updates (very noisy)

  // Features
  vr: true, // VR/XR events
  files: true, // File operations
  auth: true, // Authentication
  compute: true, // Compute job events
  thumbnails: true, // Thumbnail capture and progressive loading
};

// Parse configuration from localStorage or URL
function getConfig() {
  const urlParams = new URLSearchParams(window.location?.search || "");

  // Level from URL, localStorage, or default based on hostname
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location?.hostname === "localhost" ||
      window.location?.hostname === "127.0.0.1");
  const defaultLevel = isLocalhost ? "debug" : "warn";

  const level =
    urlParams.get("log") ||
    (typeof localStorage !== "undefined" &&
      localStorage.getItem("LOG_LEVEL")) ||
    defaultLevel;

  // Categories from URL or localStorage
  const categoryConfig =
    urlParams.get("logcat") ||
    (typeof localStorage !== "undefined" &&
      localStorage.getItem("LOG_CATEGORIES")) ||
    "";

  const categories = { ...DEFAULT_CATEGORIES };

  if (categoryConfig) {
    if (categoryConfig.startsWith("-")) {
      // Disable mode: "-sync,-cursor" disables those
      categoryConfig.split(",").forEach((cat) => {
        const name = cat.replace("-", "").trim();
        if (name in categories) categories[name] = false;
      });
    } else if (categoryConfig === "*" || categoryConfig === "all") {
      // Enable all
      Object.keys(categories).forEach((k) => (categories[k] = true));
    } else {
      // Enable only specified: "ws,dataset"
      Object.keys(categories).forEach((k) => (categories[k] = false));
      categoryConfig.split(",").forEach((cat) => {
        const name = cat.trim();
        if (name in categories) categories[name] = true;
      });
    }
  }

  return {
    level: LOG_LEVELS[level] ?? LOG_LEVELS.debug,
    categories,
    levelName: level,
  };
}

let config = getConfig();

// Style prefixes for browser console
const STYLES = {
  error: "color: #ff6b6b; font-weight: bold",
  warn: "color: #feca57; font-weight: bold",
  info: "color: #54a0ff",
  debug: "color: #a0a0a0",
  trace: "color: #707070; font-size: 0.9em",
};

// Category colors (consistent, distinct)
const CATEGORY_COLORS = {
  // Core
  app: "#48dbfb",
  ui: "#ff9ff3",
  events: "#48dbfb",
  store: "#feca57",
  // Network
  api: "#1dd1a1",
  ws: "#5f27cd",
  sync: "#ee5a24",
  // Data layer
  dataset: "#0984e3",
  view: "#6c5ce7",
  viewGroup: "#9b59b6",
  annotation: "#e17055",
  // Instance layer
  workspace: "#00cec9",
  instance: "#fdcb6e",
  render: "#636e72",
  // Collaboration
  presence: "#fd79a8",
  cursor: "#a29bfe",
  // Features
  vr: "#00d2d3",
  files: "#74b9ff",
  auth: "#b2bec3",
  compute: "#e056fd",
  thumbnails: "#a3cb38",
};

/**
 * Create a logger for a specific category
 */
function createLogger(category) {
  const categoryColor = CATEGORY_COLORS[category] || "#888";
  const categoryStyle = `color: ${categoryColor}; font-weight: bold`;

  function shouldLog(level) {
    const categoryEnabled = config.categories[category] ?? true;
    return categoryEnabled && LOG_LEVELS[level] <= config.level;
  }

  function log(level, ...args) {
    if (!shouldLog(level)) return;

    const method = level === "trace" ? "log" : level;
    const style = STYLES[level];

    // Use styled logging in browsers that support it
    if (typeof args[0] === "string") {
      console[method](
        `%c[${level.toUpperCase()}]%c [${category}] ${args[0]}`,
        style,
        categoryStyle,
        ...args.slice(1)
      );
    } else {
      console[method](
        `%c[${level.toUpperCase()}]%c [${category}]`,
        style,
        categoryStyle,
        ...args
      );
    }
  }

  return {
    error: (...args) => log("error", ...args),
    warn: (...args) => log("warn", ...args),
    info: (...args) => log("info", ...args),
    debug: (...args) => log("debug", ...args),
    trace: (...args) => log("trace", ...args),
    isEnabled: (level) => shouldLog(level),
  };
}

// Pre-created loggers for all categories
const loggers = {
  // Core
  app: createLogger("app"),
  ui: createLogger("ui"),
  events: createLogger("events"),
  store: createLogger("store"),
  // Network
  api: createLogger("api"),
  ws: createLogger("ws"),
  sync: createLogger("sync"),
  // Data layer
  dataset: createLogger("dataset"),
  view: createLogger("view"),
  viewGroup: createLogger("viewGroup"),
  annotation: createLogger("annotation"),
  // Instance layer
  workspace: createLogger("workspace"),
  instance: createLogger("instance"),
  render: createLogger("render"),
  canvas: createLogger("canvas"),
  // Collaboration
  presence: createLogger("presence"),
  cursor: createLogger("cursor"),
  // Features
  vr: createLogger("vr"),
  files: createLogger("files"),
  auth: createLogger("auth"),
  compute: createLogger("compute"),
  thumbnails: createLogger("thumbnails"),
  embed: createLogger("embed"),
};

// Runtime configuration API (exposed on window.log)
const logConfig = {
  /**
   * Set log level at runtime
   */
  setLevel(level) {
    if (level in LOG_LEVELS) {
      config.level = LOG_LEVELS[level];
      config.levelName = level;
      localStorage.setItem("LOG_LEVEL", level);
      console.log(`Log level set to: ${level}`);
    } else {
      console.warn(
        `Invalid level: ${level}. Use: error, warn, info, debug, trace`
      );
    }
  },

  /**
   * Enable/disable a category
   */
  setCategory(category, enabled) {
    if (category in config.categories) {
      config.categories[category] = enabled;
      console.log(`Category '${category}' ${enabled ? "enabled" : "disabled"}`);
    } else {
      console.warn(`Unknown category: ${category}`);
      console.log("Available:", Object.keys(config.categories).join(", "));
    }
  },

  /**
   * Enable only specific categories (disables all others)
   */
  only(...categories) {
    Object.keys(config.categories).forEach((k) => {
      config.categories[k] = categories.includes(k);
    });
    console.log(`Logging only: ${categories.join(", ")}`);
  },

  /**
   * Enable all categories
   */
  all() {
    Object.keys(config.categories).forEach(
      (k) => (config.categories[k] = true)
    );
    console.log("All log categories enabled");
  },

  /**
   * Disable all categories except errors
   */
  quiet() {
    Object.keys(config.categories).forEach(
      (k) => (config.categories[k] = false)
    );
    config.level = LOG_LEVELS.error;
    console.log("Quiet mode: errors only");
  },

  /**
   * Show current configuration
   */
  status() {
    console.log("\n📊 Logger Configuration:");
    console.log(`   Level: ${config.levelName}`);
    console.log("\n   Categories:");
    Object.entries(config.categories).forEach(([cat, enabled]) => {
      const color = CATEGORY_COLORS[cat] || "#888";
      console.log(
        `   %c● ${cat}: ${enabled ? "ON" : "off"}`,
        `color: ${enabled ? color : "#555"}`
      );
    });
    console.log(
      "\n   Commands: log.setLevel(), log.setCategory(), log.only(), log.all(), log.quiet()"
    );
  },

  /**
   * Reset to defaults
   */
  reset() {
    localStorage.removeItem("LOG_LEVEL");
    localStorage.removeItem("LOG_CATEGORIES");
    config = getConfig();
    console.log("Log config reset to defaults");
  },
};

// =============================================================================
// PROGRESS LOGGING
// =============================================================================
// These functions are for long-running operations (algorithms, file processing)
// They emit events that the LoggingPanel can subscribe to for UI display.

/**
 * Log types for progress-style logging
 * Used by LoggingPanel to style messages appropriately
 */
export const LogType = Object.freeze({
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
  PROGRESS: "progress",
});

// Event emitter for progress logs (LoggingPanel subscribes to this)
const progressListeners = new Set();

/**
 * Subscribe to progress log events
 * Used by LoggingPanel to display logs in UI
 * @param {Function} callback - Called with { type, message, timestamp }
 * @returns {Function} Unsubscribe function
 */
export function subscribeToProgressLogs(callback) {
  progressListeners.add(callback);
  return () => progressListeners.delete(callback);
}

/**
 * Emit a progress log event
 * @private
 */
function emitProgressLog(type, message) {
  const logEntry = {
    type,
    message,
    timestamp: Date.now(),
  };

  // Emit to subscribers (LoggingPanel)
  progressListeners.forEach((listener) => {
    try {
      listener(logEntry);
    } catch (e) {
      console.error("Progress log listener error:", e);
    }
  });

  // Also log to console using the compute category
  const log = createLogger("compute");
  switch (type) {
    case LogType.ERROR:
      log.error(message);
      break;
    case LogType.WARNING:
      log.warn(message);
      break;
    case LogType.SUCCESS:
      log.info(`✅ ${message}`);
      break;
    case LogType.PROGRESS:
      log.debug(`⏳ ${message}`);
      break;
    default:
      log.info(message);
  }
}

// =============================================================================
// PROGRESS LOGGING FUNCTIONS
// Use these in algorithms and long-running operations
// =============================================================================

/**
 * Log an informational message about operation progress
 * @param {string} message
 */
export function logInfo(message) {
  emitProgressLog(LogType.INFO, message);
}

/**
 * Log a success message (operation completed)
 * @param {string} message
 */
export function logSuccess(message) {
  emitProgressLog(LogType.SUCCESS, message);
}

/**
 * Log a warning (non-fatal issue)
 * @param {string} message
 */
export function logWarning(message) {
  emitProgressLog(LogType.WARNING, message);
}

/**
 * Log an error (operation failed)
 * @param {string} message
 */
export function logError(message) {
  emitProgressLog(LogType.ERROR, message);
}

/**
 * Log progress update (for long operations)
 * @param {string} message
 */
export function logProgress(message) {
  emitProgressLog(LogType.PROGRESS, message);
}

/**
 * Log memory usage (useful for debugging TensorFlow/large datasets)
 * @param {string} context - Description of when this was measured
 */
export function logMemoryUsage(context = "") {
  if (typeof performance !== "undefined" && performance.memory) {
    const used = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    const total = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
    logProgress(`Memory ${context}: ${used}MB / ${total}MB`);
  }
}

// Expose to window for debugging
if (typeof window !== "undefined") {
  window.log = logConfig;
  window.loggers = loggers;
}

// Named exports for each category
export { createLogger, logConfig };
export const {
  app,
  ui,
  events,
  store,
  api,
  ws,
  sync,
  dataset,
  view,
  viewGroup,
  annotation,
  workspace,
  instance,
  render,
  presence,
  cursor,
  vr,
  files,
  auth,
  compute,
  thumbnails,
  embed,
  canvas,
} = loggers;

// Default export for simple usage
export default loggers.app;
