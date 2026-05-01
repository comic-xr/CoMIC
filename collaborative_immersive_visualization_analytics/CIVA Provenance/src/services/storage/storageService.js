// src/services/storage/storageService.js
// Storage provider initialization and management
//
// This module handles the logic for selecting and initializing
// the appropriate storage provider based on configuration.
//
// Usage:
//   import { initializeStorageProvider } from '@Services/storage/storageService.js';
//   const { provider, mode } = await initializeStorageProvider();

import { config } from "@Core/config/clientConfig.js";
import { ServerStorageProvider } from "@Core/data/providers/ServerStorageProvider.js";
import { DatasetManagerAdapter } from "@Core/data/managers/DatasetManagerAdapter.js";
import { dataCache } from "@Services/storage/dataCache.js";
import { files as log } from "@Utils/logger.js";

/**
 * Initialize storage provider with automatic fallback
 *
 * This function implements the storage initialization strategy:
 * 1. If useServerStorage is true, try to connect to the server
 * 2. If server connection fails OR useServerStorage is false, use local storage
 * 3. Return both the provider and what mode we're in
 *
 * The automatic fallback ensures the app can work even if the server is down,
 * providing graceful degradation from full server functionality to local-only mode.
 *
 * @returns {Promise<{provider: StorageProvider, mode: 'server' | 'local'}>}
 */
export async function initializeStorageProvider() {
  if (config.useServerStorage) {
    log.debug("Creating server storage provider...");

    const provider = new ServerStorageProvider(
      config.apiBaseUrl,
      config.defaultSessionId
    );

    try {
      await provider.initialize();
      log.debug("Server storage provider ready");
      return { provider, mode: "server" };
    } catch (error) {
      log.warn("Server storage provider failed:", error.message);
      log.warn("Falling back to local storage...");
      // Fall through to local storage initialization
    }
  }

  // Either useServerStorage is false, or server initialization failed
  return initializeLocalStorage();
}

/**
 * Initialize local-only storage
 * Used as fallback when server is unavailable or disabled
 *
 * @returns {Promise<{provider: DatasetManagerAdapter, mode: 'local'}>}
 */
async function initializeLocalStorage() {
  log.debug("Creating local storage adapter...");

  // Initialize the data cache if needed
  if (dataCache && typeof dataCache.initialize === "function") {
    await dataCache.initialize();
  }

  const provider = new DatasetManagerAdapter(dataCache);
  await provider.initialize();

  log.debug("Local storage provider ready");
  return { provider, mode: "local" };
}

/**
 * Check if the server is reachable
 * Useful for UI indicators showing connection status
 *
 * @returns {Promise<boolean>}
 */
export async function checkServerHealth() {
  if (!config.useServerStorage) {
    return false;
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      // Short timeout for health checks
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch (error) {
    log.debug("Server health check failed:", error.message);
    return false;
  }
}

/**
 * Get current storage mode configuration
 * Useful for displaying in UI or debugging
 *
 * @returns {Object} Storage configuration details
 */
export function getStorageConfig() {
  return {
    useServerStorage: config.useServerStorage,
    apiBaseUrl: config.apiBaseUrl,
    sessionId: config.defaultSessionId,
  };
}
