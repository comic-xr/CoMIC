// src/core/data/managers/DatasetManagerAdapter.js

import { dataset as log } from "@Utils/logger.js";

/**
 * DatasetManagerAdapter
 *
 * Adapts your existing dataCache (which uses SHA-256 hashing) to the
 * interface expected by the new DatasetManager.
 *
 * Why this adapter exists:
 * - Your dataCache uses: storeDataset(), getDataset(), deleteDataset()
 * - DatasetManager expects: storeFile(), getFile(), removeFile()
 * - Your dataCache returns hashes as keys, which is perfect for deduplication
 * - This adapter translates between these interfaces without changing working code
 *
 * This is a BRIDGE pattern - it lets us use your well-designed cache
 * with the new architecture without rewriting either side.
 */

export class DatasetManagerAdapter {
  constructor(dataCache) {
    // Store reference to your existing dataCache
    this._cache = dataCache;

    // Track which hashes correspond to which cache operations
    // This helps with debugging and understanding cache state
    this._hashRegistry = new Map(); // hash → { filename, timestamp }

    log.debug("DatasetManagerAdapter created");
  }

  /**
   * Initialize the adapter
   * This ensures the underlying cache is ready
   */
  async initialize() {
    log.debug("DatasetManagerAdapter initializing...");

    // Your dataCache initializes on first use, but we can trigger it explicitly
    if (this._cache.initDB && typeof this._cache.initDB === "function") {
      await this._cache.initDB();
    }

    log.debug("DatasetManagerAdapter ready");
  }

  /**
   * Store a file in the cache
   *
   * This translates DatasetManager's storeFile() to dataCache's storeDataset()
   *
   * @param {File} file - The file to store
   * @returns {Promise<string>} - Hash of the stored file (used as cache key)
   */
  async storeFile(file) {
    log.debug(`Adapter storing file: ${file.name}`);

    try {
      // Call your existing dataCache.storeDataset()
      // This returns the SHA-256 hash of the file
      const hash = await this._cache.storeDataset(file);

      // Track this hash for debugging
      this._hashRegistry.set(hash, {
        filename: file.name,
        size: file.size,
        timestamp: Date.now(),
      });

      log.debug(`Adapter file stored with hash ${hash.substring(0, 16)}...`);

      // Return the hash - this becomes the file reference in Dataset objects
      return hash;
    } catch (error) {
      log.error("Adapter failed to store file:", error);
      throw error;
    }
  }

  /**
   * Retrieve a file from the cache
   *
   * This translates DatasetManager's getFile() to dataCache's getDataset()
   *
   * @param {string} cacheKey - The hash returned from storeFile()
   * @returns {Promise<File>} - The original file object
   */
  async getFile(cacheKey) {
    log.debug(
      `Adapter retrieving file with key ${cacheKey.substring(0, 16)}...`
    );

    try {
      // Call your existing dataCache.getDataset()
      // This returns { hash, name, data, storedAt, sizeBytes }
      const cached = await this._cache.getDataset(cacheKey);

      if (!cached) {
        log.warn(
          `Adapter file not found for key ${cacheKey.substring(0, 16)}...`
        );
        return null;
      }

      // Convert the cached data back to a File object
      // The data is stored as an ArrayBuffer, so we convert it back
      const blob = new Blob([cached.data]);
      const file = new File([blob], cached.name, {
        type: "application/octet-stream",
        lastModified: cached.storedAt,
      });

      log.debug(`Adapter file retrieved: ${cached.name}`);

      return file;
    } catch (error) {
      log.error("Adapter failed to retrieve file:", error);
      throw error;
    }
  }

  /**
   * Check if a file exists in the cache
   *
   * @param {string} cacheKey - The hash to check
   * @returns {Promise<boolean>} - Whether the file exists
   */
  async hasFile(cacheKey) {
    try {
      return await this._cache.hasDataset(cacheKey);
    } catch (error) {
      log.error("Adapter error checking file existence:", error);
      return false;
    }
  }

  /**
   * Remove a file from the cache
   *
   * This translates DatasetManager's removeFile() to dataCache's deleteDataset()
   *
   * @param {string} cacheKey - The hash of the file to remove
   * @returns {Promise<boolean>} - Whether removal was successful
   */
  async removeFile(cacheKey) {
    log.debug(`Adapter removing file with key ${cacheKey.substring(0, 16)}...`);

    try {
      const result = await this._cache.deleteDataset(cacheKey);

      // Clean up our tracking registry
      this._hashRegistry.delete(cacheKey);

      log.debug("Adapter file removed");

      return result;
    } catch (error) {
      log.error("Adapter failed to remove file:", error);
      throw error;
    }
  }

  /**
   * Get statistics about the cache
   * Useful for debugging and UI display
   *
   * @returns {Promise<object>} - Cache statistics
   */
  async getStats() {
    try {
      // Use your existing listDatasets() to get cache contents
      const datasets = await this._cache.listDatasets();

      const stats = {
        count: datasets.length,
        totalSize: datasets.reduce((sum, ds) => sum + (ds.sizeBytes || 0), 0),
        files: datasets.map((ds) => ({
          hash: ds.hash.substring(0, 16) + "...",
          name: ds.name,
          size: ds.sizeBytes,
          cached: new Date(ds.storedAt).toLocaleString(),
        })),
      };

      return stats;
    } catch (error) {
      log.error("Adapter failed to get stats:", error);
      return {
        count: 0,
        totalSize: 0,
        files: [],
      };
    }
  }

  /**
   * Calculate hash for a file without storing it
   * Useful for checking if a file already exists before uploading
   *
   * @param {File} file - File to hash
   * @returns {Promise<string>} - SHA-256 hash
   */
  async calculateHash(file) {
    return await this._cache.hashFile(file);
  }

  /**
   * Clear all cached files
   * WARNING: This is destructive!
   *
   * @returns {Promise<boolean>} - Whether clear was successful
   */
  async clearAll() {
    log.warn("Adapter clearing all cached files!");

    try {
      const result = await this._cache.clearAll();
      this._hashRegistry.clear();
      return result;
    } catch (error) {
      log.error("Adapter failed to clear cache:", error);
      return false;
    }
  }

  // In DatasetManager.js

  /**
   * Sync datasets from the server's session storage
   *
   * This method fetches the list of datasets that exist on the server for this session
   * and creates Dataset objects for any that we don't already have locally. This is
   * important when:
   * 1. A user joins a session where datasets were already uploaded
   * 2. After a page refresh, to restore access to previously uploaded files
   * 3. When another user uploads a file to the shared session
   *
   * The server becomes our source of truth for what datasets exist, while Y.js handles
   * the real-time synchronization of dataset metadata and state between users.
   */
  async syncDatasetsFromServer() {
    log.debug("DatasetManager syncing datasets from server...");

    // Check if we're using server storage
    if (!this.storageProvider || !this.storageProvider.listDatasets) {
      log.debug("Not using server storage, skipping sync");
      return;
    }

    try {
      // Get the list of datasets from the server
      const serverDatasets = await this.storageProvider.listDatasets();

      log.debug(`Found ${serverDatasets.length} dataset(s) on server`);

      let syncedCount = 0;
      let skippedCount = 0;

      for (const serverDataset of serverDatasets) {
        // Check if we already have this dataset
        const existingDataset = this.getDataset(serverDataset.id);

        if (existingDataset) {
          // We already have it, skip
          skippedCount++;
          continue;
        }

        log.debug(`Creating dataset from server: ${serverDataset.filename}`);

        // Create a Dataset object from the server metadata
        // The file itself stays on the server until someone actually needs to view it
        const dataset = new Dataset({
          id: serverDataset.id,
          serverId: serverDataset.id,
          filename: serverDataset.filename,
          fileType: serverDataset.file_type,
          fileSize: serverDataset.file_size || 0,
          userId: serverDataset.uploaded_by, // CRITICAL: Set userId for Y.js filtering
          uploadedBy: serverDataset.uploaded_by,
          uploadedAt: serverDataset.uploaded_at || Date.now(),
          publicPath: serverDataset.public_path || null,

          // Store the server's storage key so we can fetch the file later if needed
          cacheKey: serverDataset.id,

          // Mark that the file is on the server, not in local cache
          fileStatus: "on-server",

          // Copy over any metadata the server has
          metadata: serverDataset.metadata || {},
        });

        // Add to our datasets map
        this.datasets.set(dataset.id, dataset);

        // Emit event so UI can update
        this._emit("datasetAdded", dataset);

        syncedCount++;
      }

      log.debug(
        `Synced ${syncedCount} new dataset(s), skipped ${skippedCount} existing`
      );

      return {
        total: serverDatasets.length,
        synced: syncedCount,
        skipped: skippedCount,
      };
    } catch (error) {
      log.error("DatasetManager server sync failed:", error);
      throw error;
    }
  }
}

/**
 * USAGE EXAMPLE:
 *
 * import { dataCache } from '@Services/storage/dataCache.js';
 * import { DatasetManagerAdapter } from '@Core/data/managers/DatasetManagerAdapter.js';
 * import { DatasetManager } from '@Core/data/managers/DatasetManager.js';
 *
 * // Create adapter wrapping your existing cache
 * const cacheAdapter = new DatasetManagerAdapter(dataCache);
 * await cacheAdapter.initialize();
 *
 * // Create DatasetManager using the adapter
 * const datasetManager = new DatasetManager();
 * await datasetManager.initialize(cacheAdapter);
 *
 * // Now DatasetManager works with your existing dataCache seamlessly!
 * const dataset = await datasetManager.addDataset(file, userId);
 *
 * // Behind the scenes:
 * // 1. DatasetManager calls adapter.storeFile(file)
 * // 2. Adapter calls dataCache.storeDataset(file)
 * // 3. dataCache returns hash
 * // 4. Adapter returns hash to DatasetManager
 * // 5. DatasetManager stores hash as file reference in Dataset object
 */
