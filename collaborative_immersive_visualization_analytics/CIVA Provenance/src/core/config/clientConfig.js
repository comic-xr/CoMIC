// src/core/config/clientConfig.js
// Centralized configuration for client-side code
//
// This module provides a single source of truth for runtime configuration,
// handling the differences between:
// - Webpack DefinePlugin (build-time injection)
// - Window config object (runtime configuration)
// - Default fallbacks (local development)
//
// Usage:
//   import { config } from '@Core/config/clientConfig.js';
//   const response = await fetch(`${config.apiBaseUrl}/projects`);

import { app as log } from "@Utils/logger.js";

// =============================================================================
// CONFIGURATION OBJECT
// =============================================================================

/**
 * Configuration object with all client settings
 * Values are resolved once at module load time
 */
export const config = Object.freeze({
  // ---------------------------------------------------------------------------
  // API & Server URLs
  // ---------------------------------------------------------------------------

  /** Base URL for the API server */
  apiBaseUrl: resolveValue(
    "apiBaseUrl",
    "__API_BASE_URL__",
    "http://localhost:3001/api"
  ),

  /** WebSocket URL for Y.js collaboration server */
  yjsWebSocketUrl: resolveValue(
    "yjsWebSocketUrl",
    "__YJS_WS_URL__",
    "ws://localhost:9001"
  ),

  /** LiveKit server URL for voice chat */
  liveKitUrl: resolveValue(
    "liveKitUrl",
    "__LIVEKIT_URL__",
    "ws://localhost:7880"
  ),

  /** LiveKit token server URL */
  liveKitTokenUrl: resolveValue(
    "liveKitTokenUrl",
    "__LIVEKIT_TOKEN_URL__",
    "/api/voice"
  ),

  // ---------------------------------------------------------------------------
  // Project & Session
  // ---------------------------------------------------------------------------

  /** Default session/project ID for development */
  defaultSessionId: resolveValue(
    "defaultSessionId",
    "__DEFAULT_SESSION_ID__",
    "00000000-0000-0000-0000-000000000001"
  ),

  /** Demo project ID (sample files project) */
  demoProjectId: "00000000-0000-0000-0000-000000000001",

  // ---------------------------------------------------------------------------
  // Feature Flags
  // ---------------------------------------------------------------------------

  /** Whether to use server storage (vs local-only mode) */
  useServerStorage: resolveValue(
    "useServerStorage",
    "__USE_SERVER_STORAGE__",
    true
  ),

  /** Whether we're in development mode */
  isDevelopment: resolveValue("isDevelopment", "__DEV__", true),

  /** Whether to enable debug logging */
  debugEnabled: resolveValue("debugEnabled", "__DEBUG__", true),

  /** Application version (injected at build time) */
  version: resolveValue("version", "__APP_VERSION__", "dev"),

  // ---------------------------------------------------------------------------
  // Authentication (Keycloak)
  // ---------------------------------------------------------------------------

  /** Keycloak server URL */
  keycloakUrl: resolveValue(
    "keycloakUrl",
    "__KEYCLOAK_URL__",
    "http://localhost:8080"
  ),

  /** Keycloak realm name */
  keycloakRealm: resolveValue("keycloakRealm", "__KEYCLOAK_REALM__", "cia-web"),

  /** Keycloak client ID */
  keycloakClientId: resolveValue(
    "keycloakClientId",
    "__KEYCLOAK_CLIENT_ID__",
    "cia-web-app"
  ),

  /** Dev bypass auth (skip Keycloak in development) */
  devBypassAuth: resolveValue("devBypassAuth", "__DEV_BYPASS_AUTH__", false),
});

// =============================================================================
// VALUE RESOLUTION
// =============================================================================

/**
 * Resolve a configuration value from multiple sources
 * Priority order:
 * 1. Webpack DefinePlugin (build-time)
 * 2. Window config object (runtime)
 * 3. Default fallback
 */
function resolveValue(key, defineKey, defaultValue) {
  // Try Webpack DefinePlugin first
  try {
    const defineValue = eval(
      `typeof ${defineKey} !== 'undefined' ? ${defineKey} : undefined`
    );
    if (defineValue !== undefined && defineValue !== defineKey) {
      return defineValue;
    }
  } catch (e) {
    // DefinePlugin variable doesn't exist
  }

  // Try window config object
  if (typeof window !== "undefined" && window.__CIA_CONFIG__) {
    const windowValue = window.__CIA_CONFIG__[key];
    if (windowValue !== undefined) {
      return windowValue;
    }
  }

  return defaultValue;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get a config value at runtime (for dynamic lookups)
 * Prefer using `config.propertyName` for static access
 */
export function getConfig(key, defaultValue = undefined) {
  return config[key] ?? defaultValue;
}

/** Check if running in a browser environment */
export function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/** Check if running in development mode */
export function isDev() {
  return config.isDevelopment;
}

/**
 * Log configuration (for debugging)
 * Only logs in development mode
 */
export function logConfig() {
  if (!config.debugEnabled) return;

  log.debug("CIA Web Configuration:", {
    apiBaseUrl: config.apiBaseUrl,
    yjsWebSocketUrl: config.yjsWebSocketUrl,
    liveKitUrl: config.liveKitUrl,
    isDevelopment: config.isDevelopment,
    debugEnabled: config.debugEnabled,
    version: config.version,
  });
}

/**
 * Log storage configuration specifically
 * Used during initialization to show storage mode
 */
export function logStorageConfig() {
  log.debug("Storage Configuration:", {
    mode: config.useServerStorage
      ? "Server (with local fallback)"
      : "Local only",
    apiBaseUrl: config.apiBaseUrl,
    sessionId: config.defaultSessionId,
  });
}

// Log config on load in development
if (config.debugEnabled && isBrowser()) {
  setTimeout(() => logConfig(), 100);
}

export default config;
