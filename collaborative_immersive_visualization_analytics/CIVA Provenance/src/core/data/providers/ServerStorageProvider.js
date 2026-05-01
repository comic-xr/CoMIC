// src/core/data/providers/ServerStorageProvider.js

import { files as log } from "@Utils/logger.js";

/**
 * ServerStorageProvider
 *
 * This acts as a "cache" adapter for DatasetManager, but instead of storing
 * files in IndexedDB, it uploads them to the server and retrieves them from
 * the server when needed.
 *
 * From DatasetManager's perspective, this looks identical to DatasetManagerAdapter.
 * Both implement the same interface: storeFile(), getFile(), removeFile(), etc.
 *
 * This is the ADAPTER PATTERN - making the server API look like a local cache
 * so existing code doesn't need to change.
 */
export class ServerStorageProvider {
  constructor(apiBaseUrl, sessionId) {
    // Validate required parameters
    if (!apiBaseUrl) {
      throw new Error("ServerStorageProvider requires apiBaseUrl parameter");
    }
    if (!sessionId) {
      throw new Error("ServerStorageProvider requires sessionId parameter");
    }

    this.apiBaseUrl = apiBaseUrl; // e.g., 'http://localhost:3001'
    this.sessionId = sessionId; // Current collaboration session

    // Track uploaded datasets in memory for quick lookups
    // Maps hash -> datasetId
    this._hashToId = new Map();

    // Track dataset metadata
    // Maps datasetId -> { filename, hash, size, etc. }
    this._metadata = new Map();

    log.debug("ServerStorageProvider created");
  }

  /**
   * Initialize the provider
   * This could load existing datasets from the server to populate our cache
   */
  async initialize() {
    log.debug("ServerStorageProvider initializing...");

    try {
      // Load existing datasets for this session
      const datasets = await this.listDatasets();

      // Populate our hash registry
      for (const dataset of datasets) {
        if (dataset.metadata?.hash) {
          this._hashToId.set(dataset.metadata.hash, dataset.id);
        }
        this._metadata.set(dataset.id, dataset);
      }

      log.debug(
        `ServerStorageProvider loaded ${datasets.length} existing datasets`
      );
    } catch (error) {
      log.error("ServerStorageProvider initialization failed:", error);

      // Re-throw so the fallback logic in initializeStorageProvider can catch it
      throw new Error(`Failed to initialize server storage: ${error.message}`);
    }
  }

  /**
   * Store a file by uploading to the server
   *
   * This matches the interface that DatasetManager expects from the cache adapter.
   * Returns a "cache key" which is actually the server's dataset ID.
   *
   * @param {File} file - The file to store
   * @returns {Promise<string>} - Dataset ID (used as cache key)
   */
  async storeFile(file) {
    log.debug(`ServerStorageProvider uploading file: ${file.name}`);

    try {
      const hash = await this.calculateHash(file);

      if (this._hashToId.has(hash)) {
        const existingId = this._hashToId.get(hash);
        log.debug(`File already exists with ID ${existingId}`);
        return existingId;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploadedBy", this._getCurrentUser());

      // Upload to correct endpoint: /api/projects/:projectId/files
      const response = await fetch(
        `${this.apiBaseUrl}/projects/${this.sessionId}/files`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        log.error(`Upload failed with status ${response.status}:`, errorText);
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const responseData = await response.json();
      log.trace("Server response:", responseData);

      const { file: dataset } = responseData;

      if (!dataset) {
        log.error("No file object in response:", responseData);
        throw new Error("Server response missing 'file' object");
      }

      this._hashToId.set(hash, dataset.id);
      this._metadata.set(dataset.id, {
        ...dataset,
        metadata: {
          ...dataset.metadata,
          hash,
        },
      });

      log.debug(`ServerStorageProvider file uploaded with ID ${dataset.id}`);
      return dataset.id;
    } catch (error) {
      log.error("ServerStorageProvider upload failed:", error);
      throw error;
    }
  }

  /**
   * Retrieve a file from the server
   *
   * @param {string} cacheKey - Dataset ID from storeFile()
   * @returns {Promise<File>} - The file object
   */
  async getFile(cacheKey) {
    log.debug(`ServerStorageProvider downloading file: ${cacheKey}`);

    try {
      // Use correct download endpoint: /api/files/:id/download
      const response = await fetch(
        `${this.apiBaseUrl}/files/${cacheKey}/download`
      );

      if (!response.ok) {
        if (response.status === 404) {
          log.warn(`ServerStorageProvider file not found: ${cacheKey}`);
          return null;
        }
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const metadata = this._metadata.get(cacheKey);
      const filename = metadata?.filename || "downloaded.vtp";

      const blob = new Blob([arrayBuffer]);
      const file = new File([blob], filename, {
        type: "application/octet-stream",
        lastModified: metadata?.uploaded_at
          ? new Date(metadata.uploaded_at).getTime()
          : Date.now(),
      });

      log.debug(`ServerStorageProvider file downloaded: ${filename}`);
      return file;
    } catch (error) {
      log.error("ServerStorageProvider download failed:", error);
      throw error;
    }
  }

  /**
   * Check if a file exists on the server
   *
   * @param {string} cacheKey - Dataset ID
   * @returns {Promise<boolean>}
   */
  async hasFile(cacheKey) {
    try {
      // Use the correct file download endpoint with HEAD to check existence
      const response = await fetch(
        `${this.apiBaseUrl}/files/${cacheKey}/download`,
        {
          method: "HEAD",
        }
      );
      return response.ok;
    } catch (error) {
      log.error("ServerStorageProvider error checking file existence:", error);
      return false;
    }
  }

  /**
   * Remove a file from the server
   *
   * @param {string} cacheKey - Dataset ID
   * @returns {Promise<boolean>}
   */
  async removeFile(cacheKey) {
    log.debug(`ServerStorageProvider removing file: ${cacheKey}`);

    try {
      // Find and remove hash mapping
      for (const [hash, id] of this._hashToId.entries()) {
        if (id === cacheKey) {
          this._hashToId.delete(hash);
          break;
        }
      }

      // Remove metadata
      this._metadata.delete(cacheKey);

      // Note: We're not implementing server deletion yet
      // In the future, this would call DELETE /api/files/:id
      // For now, files stay on server (which is safer during development)

      log.debug("ServerStorageProvider file removed from local tracking");

      return true;
    } catch (error) {
      log.error("ServerStorageProvider removal failed:", error);
      return false;
    }
  }

  /**
   * Calculate hash for a file
   * Uses SHA-256 just like your dataCache
   *
   * @param {File} file
   * @returns {Promise<string>} - Hash string
   */
  async calculateHash(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  }

  /**
   * List all available datasets from server
   * @returns {Promise<Array>} Array of dataset metadata
   */
  async listDatasets() {
    log.debug("ServerStorageProvider listing datasets from server");

    try {
      // Use the correct server route: /api/projects/:projectId/files
      // sessionId is actually the projectId in our case
      const response = await fetch(
        `${this.apiBaseUrl}/projects/${this.sessionId}/files`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}: ${response.statusText}`
        );
      }

      // Server returns { files: [...] }
      const data = await response.json();
      const datasets = data.files || [];

      log.debug(`Retrieved ${datasets.length} datasets from server`);

      return datasets;
    } catch (error) {
      log.error("ServerStorageProvider failed to list datasets:", error);
      throw error;
    }
  }

  /**
   * Get statistics about stored files
   *
   * @returns {Promise<object>}
   */
  async getStats() {
    try {
      const datasets = await this.listDatasets();

      return {
        count: datasets.length,
        totalSize: datasets.reduce((sum, ds) => sum + (ds.file_size || 0), 0),
        files: datasets.map((ds) => ({
          id: ds.id.substring(0, 16) + "...",
          name: ds.filename,
          size: ds.file_size,
          uploaded: new Date(ds.uploaded_at).toLocaleString(),
        })),
      };
    } catch (error) {
      log.error("ServerStorageProvider failed to get stats:", error);
      return {
        count: 0,
        totalSize: 0,
        files: [],
      };
    }
  }

  /**
   * Helper to get current user ID
   * @private
   */
  _getCurrentUser() {
    // This would integrate with your user management system
    // For now, return a placeholder
    return "anonymous";
  }

  /**
   * Clear all datasets (for development/testing)
   * WARNING: Destructive!
   */
  async clearAll() {
    log.warn(
      "ServerStorageProvider: Clear operation not implemented on server"
    );
    log.warn("Clearing local tracking only");

    this._hashToId.clear();
    this._metadata.clear();

    return true;
  }
}
