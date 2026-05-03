// IndexedDB wrapper for caching VTP file data locally
// This allows multiple tabs and users to share the same file data without re-uploading

import { files as log } from "@Utils/logger.js";

/**
 * DataCache Class
 *
 * Manages local storage of VTP files using IndexedDB.
 * Files are stored by their SHA-256 hash, so the same file
 * uploaded by different users will have the same hash.
 *
 * IndexedDB Structure:
 *   Database: "cia-datasets"
 *   Object Store: "datasets"
 *   Key: hash (SHA-256 string)
 *   Value: { hash, name, data, storedAt }
 */
class DataCache {
  constructor() {
    this.dbName = "cia-datasets";
    this.version = 1;
    this.storeName = "datasets";
    this.dbPromise = null;
  }

  /**
   * Initialize IndexedDB connection
   * This is called automatically when needed, but can be called manually
   *
   * @returns {Promise<IDBDatabase>} Database connection
   */
  async initDB() {
    // Return existing connection if already initialized
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      // Called when database needs to be created or upgraded
      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          // Create store with "hash" as the key path
          const objectStore = db.createObjectStore(this.storeName, {
            keyPath: "hash",
          });

          // Create index on "name" for searching by filename
          objectStore.createIndex("name", "name", { unique: false });

          log.debug("IndexedDB object store created");
        }
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        log.debug("IndexedDB connection established");
        resolve(db);
      };

      request.onerror = (event) => {
        log.error("IndexedDB connection failed:", event.target.error);
        reject(event.target.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Calculate SHA-256 hash of a file
   * This is used as the unique key for storing files
   *
   * Why SHA-256?
   * - Same file always produces same hash
   * - Different files (almost) never produce same hash
   * - Fast enough for our purposes
   *
   * @param {File} file - File to hash
   * @returns {Promise<string>} Hex string of hash
   */
  async hashFile(file) {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Calculate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    log.debug(
      `Hash calculated for ${file.name}: ${hashHex.substring(0, 16)}...`
    );

    return hashHex;
  }

  /**
   * Store a dataset file in IndexedDB
   *
   * @param {File} file - VTP file to store
   * @returns {Promise<string>} Hash of the stored file
   */
  /**
   * Store dataset with hash verification
   * If another user uploads the same file, it will have the same hash
   * and we'll skip re-storing it
   */
  async storeDataset(file) {
    log.debug(`Storing dataset in cache: ${file.name}`);

    try {
      // Calculate hash - this is deterministic!
      const hash = await this.hashFile(file);
      log.trace(`Hash: ${hash.substring(0, 16)}...`);

      // Check if already stored (by ANY user)
      const existing = await this.hasDataset(hash);
      if (existing) {
        log.debug(`Dataset already in cache (hash match)`);
        return hash;
      }

      // Read file data
      const arrayBuffer = await file.arrayBuffer();

      // Get database connection
      const db = await this.initDB();

      // Store in IndexedDB
      await new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);

        const dataset = {
          hash,
          name: file.name,
          data: arrayBuffer,
          storedAt: Date.now(),
          sizeBytes: file.size,
        };

        const request = store.put(dataset);

        request.onsuccess = () => {
          log.debug(`Dataset stored successfully`);
          resolve();
        };

        request.onerror = () => {
          log.error(`Failed to store dataset:`, request.error);
          reject(request.error);
        };
      });

      return hash;
    } catch (error) {
      log.error("Error storing dataset:", error);
      throw error;
    }
  }

  /**
   * Retrieve a dataset from IndexedDB
   *
   * @param {string} hash - Hash of the dataset to retrieve
   * @returns {Promise<Object|null>} Dataset object or null if not found
   */
  /**
   * Get dataset by hash
   * This works across all users who have the same file!
   */
  async getDataset(hash) {
    if (!hash || typeof hash !== "string") {
      log.warn("Invalid hash provided to getDataset:", hash);
      return null;
    }

    try {
      const db = await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], "readonly");
        const store = transaction.objectStore(this.storeName);
        const request = store.get(hash);

        request.onsuccess = () => {
          if (request.result) {
            log.debug(`Retrieved dataset from cache: ${request.result.name}`);
          } else {
            log.debug(
              `Dataset not found in cache: ${hash.substring(0, 16)}...`
            );
          }
          resolve(request.result);
        };

        request.onerror = () => {
          log.error("Error retrieving dataset:", request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      log.error("Error in getDataset:", error);
      return null;
    }
  }

  /**
   * Check if a dataset exists in cache
   *
   * @param {string} hash - Hash to check
   * @returns {Promise<boolean>} True if exists
   */
  /**
   * Check if we have this exact file by hash
   * This is what enables cross-user file matching!
   */
  async hasDataset(hash) {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const transaction = db.transaction([this.storeName], "readonly");
        const store = transaction.objectStore(this.storeName);
        const request = store.get(hash);

        request.onsuccess = () => {
          resolve(!!request.result);
        };

        request.onerror = () => {
          resolve(false);
        };
      });
    } catch {
      return false;
    }
  }

  /**
   * Delete a dataset from cache
   *
   * @param {string} hash - Hash of dataset to delete
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteDataset(hash) {
    try {
      const db = await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(hash);

        request.onsuccess = () => {
          log.debug(`Dataset deleted from cache: ${hash.substring(0, 16)}...`);
          resolve(true);
        };

        request.onerror = () => {
          log.error("Error deleting dataset:", request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      log.error("Error deleting dataset:", error);
      return false;
    }
  }

  /**
   * List all datasets in cache
   * Useful for debugging or showing user what's stored locally
   *
   * @returns {Promise<Array>} Array of dataset metadata (without binary data)
   */
  async listDatasets() {
    try {
      const db = await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], "readonly");
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          // Return metadata only (exclude large "data" field)
          const datasets = request.result.map((ds) => ({
            hash: ds.hash,
            name: ds.name,
            storedAt: ds.storedAt,
            sizeBytes: ds.sizeBytes,
          }));

          log.debug(`Found ${datasets.length} datasets in cache`);
          resolve(datasets);
        };

        request.onerror = () => {
          log.error("Error listing datasets:", request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      log.error("Error listing datasets:", error);
      return [];
    }
  }

  /**
   * Clear all datasets from cache
   * WARNING: This deletes all cached data!
   *
   * @returns {Promise<boolean>} True if cleared successfully
   */
  async clearAll() {
    try {
      const db = await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => {
          log.info("All datasets cleared from cache");
          resolve(true);
        };

        request.onerror = () => {
          log.error("Error clearing cache:", request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      log.error("Error clearing cache:", error);
      return false;
    }
  }
}

// Export singleton instance
export const dataCache = new DataCache();
