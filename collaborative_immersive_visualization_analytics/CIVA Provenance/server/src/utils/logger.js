// server/src/utils/logger.js
// Structured logging with levels and categories
// Control verbosity via environment variables

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

// Categories that can be individually enabled/disabled
const CATEGORIES = {
  server: true, // Server startup, shutdown
  db: true, // Database operations
  auth: true, // Authentication
  ws: true, // WebSocket events
  http: false, // HTTP request logging (noisy)
  files: true, // File operations
  compute: true, // Computation jobs
  audit: false, // Audit logging internals
  sync: false, // Y.js sync (very noisy)
  cache: false, // Cache operations
};

// Parse environment configuration
function getConfig() {
  const level =
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === "production" ? "info" : "debug");

  // Parse LOG_CATEGORIES: "ws,db,auth" or "-http,-sync" (disable specific)
  const categoryConfig = process.env.LOG_CATEGORIES || "";
  const categories = { ...CATEGORIES };

  if (categoryConfig) {
    if (categoryConfig.startsWith("-")) {
      // Disable mode: "-http,-sync" disables those categories
      categoryConfig.split(",").forEach((cat) => {
        const name = cat.replace("-", "").trim();
        if (name in categories) categories[name] = false;
      });
    } else {
      // Enable mode: "ws,db" enables only those categories
      Object.keys(categories).forEach((k) => (categories[k] = false));
      categoryConfig.split(",").forEach((cat) => {
        const name = cat.trim();
        if (name in categories) categories[name] = true;
      });
    }
  }

  return { level: LOG_LEVELS[level] ?? LOG_LEVELS.debug, categories };
}

const config = getConfig();

// Prefixes for visual scanning
const PREFIXES = {
  error: "\x1b[31m[ERROR]\x1b[0m",
  warn: "\x1b[33m[WARN]\x1b[0m",
  info: "\x1b[36m[INFO]\x1b[0m",
  debug: "\x1b[90m[DEBUG]\x1b[0m",
  trace: "\x1b[90m[TRACE]\x1b[0m",
};

// Production mode uses simple prefixes (no colors)
const PROD_PREFIXES = {
  error: "[ERROR]",
  warn: "[WARN]",
  info: "[INFO]",
  debug: "[DEBUG]",
  trace: "[TRACE]",
};

const isProd = process.env.NODE_ENV === "production";
const prefixes = isProd ? PROD_PREFIXES : PREFIXES;

/**
 * Create a logger for a specific category
 * @param {string} category - The logging category
 * @returns {object} Logger with error, warn, info, debug, trace methods
 */
function createLogger(category) {
  const categoryEnabled = config.categories[category] ?? true;
  const categoryTag = `[${category.toUpperCase()}]`;

  function log(level, ...args) {
    if (!categoryEnabled) return;
    if (LOG_LEVELS[level] > config.level) return;

    const timestamp = isProd ? new Date().toISOString() : "";
    const prefix = prefixes[level];

    if (isProd) {
      console[level === "trace" ? "log" : level](
        timestamp,
        prefix,
        categoryTag,
        ...args
      );
    } else {
      console[level === "trace" ? "log" : level](prefix, categoryTag, ...args);
    }
  }

  return {
    error: (...args) => log("error", ...args),
    warn: (...args) => log("warn", ...args),
    info: (...args) => log("info", ...args),
    debug: (...args) => log("debug", ...args),
    trace: (...args) => log("trace", ...args),

    // Check if a level would log (useful for expensive string building)
    isEnabled: (level) => categoryEnabled && LOG_LEVELS[level] <= config.level,
  };
}

// Pre-created loggers for common categories
const loggers = {
  server: createLogger("server"),
  db: createLogger("db"),
  auth: createLogger("auth"),
  ws: createLogger("ws"),
  http: createLogger("http"),
  files: createLogger("files"),
  compute: createLogger("compute"),
  audit: createLogger("audit"),
  sync: createLogger("sync"),
  cache: createLogger("cache"),
};

// Default logger (for general use)
const defaultLogger = createLogger("server");

module.exports = {
  createLogger,
  ...loggers,
  // Direct access methods (use default category)
  error: defaultLogger.error,
  warn: defaultLogger.warn,
  info: defaultLogger.info,
  debug: defaultLogger.debug,
  trace: defaultLogger.trace,
};
