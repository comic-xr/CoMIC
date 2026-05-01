// src/core/data/managers/DatasetManager.js
// v2.0: Server-authoritative - IDs must come from server

import { Dataset } from "@Core/data/models/Dataset.js";
import { Annotation } from "@Core/data/models/Annotation.js";
import { config } from "@Core/config/clientConfig.js";
import { apiClient, ApiError } from "@Services/apiClient.js";
import {
  dataset as log,
  logInfo,
  logSuccess,
  logWarning,
  logError,
} from "@Utils/logger.js";
import { BaseManager } from "@Core/data/managers/BaseManager.js";

/**
 * DatasetManager - Format-agnostic dataset management
 *
 * This manager handles dataset metadata and storage references.
 * It knows NOTHING about specific file formats (VTK, JSON, etc).
 * Format-specific parsing is delegated to instance type handlers.
 */
export class DatasetManager extends BaseManager {
  constructor(storageProvider, config = {}) {
    super({
      events: [
        "datasetAdded",
        "datasetRemoved",
        "datasetUpdated",
        "datasetLoaded",
        "annotationAdded",
        "annotationRemoved",
        "annotationUpdated",
        "reconciled",
        "reset",
      ],
      logCategory: "dataset",
    });

    this.storageProvider = storageProvider;
    this._datasets = new Map();
    this.parsedDataCache = new Map();
    this._dbName = config.dbName || "CIA_Datasets";
    this._dbVersion = config.dbVersion || 1;
    this._db = null;

    log.debug("DatasetManager: Initializing...");
  }

  // ==================== INITIALIZATION ====================

  async initialize() {
    log.debug("DatasetManager: Initializing...");
    await this._openDatabase();
    await this._loadExistingDatasets();
    log.info(
      `DatasetManager: Initialized with ${this._datasets.size} datasets`
    );
  }

  async generateFileHash(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      return hashHex;
    } catch (error) {
      log.error("DatasetManager: Failed to generate file hash:", error);
      return `fallback_${file.name}_${file.size}_${file.lastModified}`;
    }
  }

  async findDatasetByHash(hash) {
    for (const dataset of this._datasets.values()) {
      if (dataset.hash === hash) {
        return dataset;
      }
    }
    return null;
  }

  /**
   * Quick check if we have a dataset with a given hash
   * @param {string} hash - The file hash to check
   * @returns {boolean}
   */
  hasDatasetWithHash(hash) {
    for (const dataset of this._datasets.values()) {
      if (dataset.hash === hash) {
        return true;
      }
    }
    return false;
  }

  async _openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this._dbName, this._dbVersion);

      request.onerror = () =>
        reject(new Error("Failed to open dataset metadata database"));
      request.onsuccess = (event) => {
        this._db = event.target.result;

        // Check if the required object store exists
        // If not, the database is corrupted/outdated - delete and recreate
        if (!this._db.objectStoreNames.contains("datasets")) {
          log.warn("Database missing 'datasets' store, recreating...");
          this._db.close();

          const deleteRequest = indexedDB.deleteDatabase(this._dbName);
          deleteRequest.onsuccess = () => {
            log.debug("Deleted corrupted database, recreating...");
            // Recursively call _openDatabase to recreate
            this._openDatabase().then(resolve).catch(reject);
          };
          deleteRequest.onerror = () => {
            reject(new Error("Failed to delete corrupted database"));
          };
          return;
        }

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("datasets")) {
          const store = db.createObjectStore("datasets", { keyPath: "id" });
          store.createIndex("filename", "filename", { unique: false });
          store.createIndex("uploadedBy", "metadata.uploadedBy", {
            unique: false,
          });
          store.createIndex("uploadedAt", "metadata.uploadedAt", {
            unique: false,
          });
        }
      };
    });
  }

  async _loadExistingDatasets() {
    const transaction = this._db.transaction(["datasets"], "readonly");
    const store = transaction.objectStore("datasets");
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const storedDatasets = request.result;
        storedDatasets.forEach((data) => {
          if (!data.id) {
            log.warn(
              `Skipping dataset without ID: ${data.filename || "unknown"}`
            );
            log.warn(`This dataset is corrupted and will be ignored`);
            return; // Skip this dataset
          }

          try {
            const dataset = Dataset.fromJSON(data);
            this._datasets.set(dataset.id, dataset);
          } catch (error) {
            log.error(`Failed to load dataset ${data.id}:`, error);
            log.error(`Dataset: ${data.filename || "unknown"}`);
            // Skip corrupted datasets instead of crashing
          }
        });

        log.debug(`Loaded ${storedDatasets.length} datasets from IndexedDB`);
        resolve();
      };
      request.onerror = () =>
        reject(new Error("Failed to load existing datasets"));
    });
  }

  /**
   * Sync datasets from the server's session storage
   * Called during Phase 1 initialization to populate from server
   */
  async syncDatasetsFromServer() {
    log.debug("DatasetManager: Syncing datasets from server...");

    // Check if we're using server storage
    if (!this.storageProvider || !this.storageProvider.listDatasets) {
      log.debug("Not using server storage, skipping sync");
      return;
    }

    try {
      const serverDatasets = await this.storageProvider.listDatasets();

      log.debug(`Found ${serverDatasets.length} dataset(s) on server`);

      let syncedCount = 0;
      let skippedCount = 0;

      for (const serverDataset of serverDatasets) {
        log.debug(`Creating dataset from server: ${serverDataset.filename}`);

        const dataset = await this._addDatasetFromServer(serverDataset);

        if (dataset) {
          syncedCount++;
        } else {
          skippedCount++;
        }
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
      log.error("DatasetManager: Server sync failed:", error);
      throw error;
    }
  }

  /**
   * Fetch a single dataset from the server by ID
   * Used when we need a specific dataset but don't want to sync all datasets
   *
   * @param {string} datasetId - The dataset ID to fetch
   * @returns {Promise<Dataset|null>} The dataset, or null if not found
   */
  async fetchDatasetById(datasetId) {
    log.debug(`DatasetManager: Fetching single dataset ${datasetId} from server...`);

    // Check if we already have it locally
    if (this._datasets.has(datasetId)) {
      log.debug(`Dataset ${datasetId} already exists locally`);
      return this._datasets.get(datasetId);
    }

    try {
      // Fetch from server API
      const response = await apiClient.get(`/files/${datasetId}`);

      if (!response || !response.file) {
        log.warn(`Dataset ${datasetId} not found on server`);
        return null;
      }

      // Add it locally
      const dataset = await this._addDatasetFromServer(response.file);
      return dataset;
    } catch (error) {
      log.error(`Failed to fetch dataset ${datasetId}:`, error);
      return null;
    }
  }

  /**
   * Add a dataset from server sync (v2.0)
   * Called when fetching existing datasets from server API
   * Does NOT upload - the file already exists on server
   *
   * @param {object} serverFile - Server file record
   * @returns {Promise<Dataset>} The created dataset
   */
  async _addDatasetFromServer(serverFile) {
    log.debug(
      `DatasetManager: Adding dataset from server: ${serverFile.filename}`
    );

    // Check if we already have this dataset
    if (this._datasets.has(serverFile.id)) {
      log.debug(`Dataset ${serverFile.id} already exists locally`);
      return this._datasets.get(serverFile.id);
    }

    // Create dataset object with server-provided data
    const dataset = new Dataset({
      id: serverFile.id,
      serverId: serverFile.id,
      filename: serverFile.filename,
      fileType:
        serverFile.file_type || this._extractFileType(serverFile.filename),
      hash: serverFile.hash,
      storageKey: serverFile.storage_key,
      publicPath: `${config.apiBaseUrl}/files/${serverFile.id}/download`,
      userId: serverFile.uploaded_by,
      metadata: {
        fileSize: serverFile.file_size,
        uploadedBy: serverFile.uploaded_by,
        uploadedAt: serverFile.uploaded_at,
        pointCount: serverFile.point_count,
        cellCount: serverFile.cell_count,
        bounds: serverFile.bounds,
        dataArrays: serverFile.data_arrays,
      },
    });

    // Mark as needing file fetch (file is on server, not local yet)
    dataset.setFileStatus("needs-fetch");

    // Store in memory
    this._datasets.set(dataset.id, dataset);

    // Persist to IndexedDB
    await this._persistDataset(dataset);

    // Notify listeners
    this._emit("datasetAdded", dataset);

    log.debug(`Dataset added from server: ${dataset.id}`);
    return dataset;
  }

  // ==================== DATASET MANAGEMENT ====================

  /**
   * Add a new dataset from a file (v2.0 SERVER-AUTHORITATIVE)
   *
   * This is the primary entry point for creating datasets. The flow uploads
   * to the server first to get a server-generated ID, ensuring consistency.
   *
   * The flow:
   * 1. Extract file type from filename
   * 2. Validate it's a supported type (optional but recommended)
   * 3. Upload to server to get server-generated ID
   * 4. Store file locally for immediate use
   * 5. Create Dataset object with server-provided ID
   * 6. Persist everything
   *
   * @param {File} file - The file object from user input
   * @param {string} userId - ID of the user adding this dataset
   * @param {object} options - Optional: { projectId, orgId }
   * @returns {Promise<Dataset>} - The created dataset
   */
  async addDataset(file, userId, options = {}) {
    log.debug(`DatasetManager: Adding dataset "${file.name}"`);
    logInfo(`Loading file: ${file.name}`);

    try {
      // STEP 1: Extract file type from filename
      const fileType = this._extractFileType(file.name);
      log.debug(`File type: ${fileType}`);

      // STEP 2: Validate file type is supported (optional but helpful)
      const isSupported = await this._isFileTypeSupported(fileType);
      if (!isSupported) {
        log.warn(`Warning: File type "${fileType}" may not be supported`);
      }

      // STEP 3: Generate hash for duplicate detection
      const hash = await this.generateFileHash(file);
      log.debug(`Hash: ${hash.substring(0, 16)}...`);

      // STEP 4: Check for existing dataset with same hash locally
      const existingLocal = await this.findDatasetByHash(hash);
      if (existingLocal) {
        log.debug(
          `Found existing local dataset with same hash: ${existingLocal.id}`
        );
        // Update with new file reference
        existingLocal.rawFile = file;
        existingLocal.setFileStatus("available", file);
        this._emit("datasetUpdated", existingLocal);
        return existingLocal;
      }

      // STEP 5: Upload to server to get server-generated ID
      log.debug(`Uploading to server...`);
      const serverResponse = await this._uploadFileToServer(file, options);

      if (!serverResponse || !serverResponse.file || !serverResponse.file.id) {
        throw new Error("Server did not return a valid file ID");
      }

      const serverFile = serverResponse.file;
      log.debug(`Server assigned ID: ${serverFile.id}`);

      // STEP 6: Store file locally for immediate use
      const storageResult = await this.storageProvider.storeFile(file);
      log.debug(`File stored locally`);

      // STEP 7: Create the Dataset object with server-provided ID
      const dataset = new Dataset({
        id: serverFile.id, // SERVER-PROVIDED ID
        serverId: serverFile.id,
        filename: file.name,
        fileType: serverFile.file_type || fileType,
        hash: serverFile.hash || hash,
        storageKey: serverFile.storage_key || storageResult || hash,
        publicPath: `${config.apiBaseUrl}/files/${serverFile.id}/download`,
        userId: userId,
        rawFile: file, // Keep reference for immediate use
        metadata: {
          fileSize: file.size,
          uploadedBy: userId,
          uploadedAt: serverFile.uploaded_at || Date.now(),
        },
      });

      // STEP 8: Store in memory
      this._datasets.set(dataset.id, dataset);

      // STEP 9: Persist to IndexedDB
      await this._persistDataset(dataset);

      // STEP 10: Notify listeners
      this._emit("datasetAdded", dataset);

      log.debug(
        `DatasetManager: Dataset "${file.name}" added with ID ${dataset.id}`
      );
      log.debug(`File type: ${fileType}`);
      logSuccess(`File loaded: ${file.name}`);

      return dataset;
    } catch (error) {
      log.error("DatasetManager: Failed to add dataset:", error);
      logError(`Failed to load file: ${file.name}`);
      throw error;
    }
  }

  /**
   * Upload file to server API
   * @private
   * @param {File} file - The file to upload
   * @param {object} options - { projectId, orgId }
   * @returns {Promise<object>} Server response with file metadata including ID
   */
  async _uploadFileToServer(file, options = {}) {
    const formData = new FormData();
    formData.append("file", file);

    if (options.projectId) {
      formData.append("projectId", options.projectId);
    }
    if (options.orgId) {
      formData.append("orgId", options.orgId);
    }

    try {
      return await apiClient.upload("/files", formData);
    } catch (error) {
      // Handle duplicate file case
      if (
        error instanceof ApiError &&
        error.status === 409 &&
        error.details?.existingFile
      ) {
        log.debug(`Server found duplicate: ${error.details.existingFile.id}`);
        // Return the existing file info as if it was just uploaded
        return {
          success: true,
          file: error.details.existingFile,
          duplicate: true,
        };
      }
      throw error;
    }
  }

  getDataset(datasetId) {
    return this._datasets.get(datasetId) || null;
  }

  getAllDatasets() {
    return Array.from(this._datasets.values());
  }

  getDatasetsByFilename(filename) {
    return this.getAllDatasets().filter((d) => d.filename === filename);
  }

  async removeDataset(datasetId) {
    log.debug(`DatasetManager: Removing dataset ${datasetId}`);

    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      log.warn(`DatasetManager: Dataset ${datasetId} not found`);
      return;
    }

    try {
      this._datasets.delete(datasetId);
      await this._deleteDataset(datasetId);
      this._emit("datasetRemoved", datasetId);
      log.debug(`DatasetManager: Dataset ${datasetId} removed`);
    } catch (error) {
      log.error("DatasetManager: Failed to remove dataset:", error);
      throw error;
    }
  }

  /**
   * Release dataset data from memory but keep metadata
   *
   * This frees up memory (rawFile, parsedDataCache) while keeping
   * the dataset reference in IndexedDB. The file can be reloaded
   * when needed.
   *
   * Use this for "unload from memory" - when you want to free resources
   * but keep the dataset in the file list.
   *
   * @param {string} datasetId - Dataset to release data for
   * @returns {Promise<boolean>} True if data was released
   */
  async releaseDatasetData(datasetId) {
    log.debug(`DatasetManager: Releasing data for dataset ${datasetId}`);

    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      log.warn(`DatasetManager: Dataset ${datasetId} not found`);
      return false;
    }

    // Release the data
    const wasReleased = dataset.releaseData();

    if (wasReleased) {
      // Clear from parsed data cache as well
      this.parsedDataCache.delete(datasetId);

      // Emit update so UI refreshes
      this._emit("datasetUpdated", dataset);

      log.info(`DatasetManager: Data released for ${dataset.filename}`);
    }

    return wasReleased;
  }

  /**
   * Cancel a loading/processing operation for a dataset
   * This resets the state back to STORED and clears any partial data.
   *
   * @param {string} datasetId - Dataset to cancel
   * @returns {boolean} True if operation was cancelled
   */
  async cancelLoadDataset(datasetId) {
    log.debug(`DatasetManager: Canceling load for dataset ${datasetId}`);

    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      log.warn(`DatasetManager: Dataset ${datasetId} not found`);
      return false;
    }

    // Only cancel if actually loading or processing
    if (!dataset.isDataLoading() && dataset.dataState !== 'processing') {
      log.debug(`DatasetManager: Dataset ${datasetId} is not loading/processing`);
      return false;
    }

    // Reset the state - releaseData() sets state back to STORED
    const wasReleased = dataset.releaseData();

    if (wasReleased) {
      // Clear from parsed data cache as well
      this.parsedDataCache.delete(datasetId);

      // Reset file status if it was in fetching state
      if (dataset.fileStatus === 'fetching') {
        dataset.setFileStatus('available');
      }

      // Emit update so UI refreshes
      this._emit("datasetUpdated", dataset);

      log.info(`DatasetManager: Load cancelled for ${dataset.filename}`);
    }

    return wasReleased;
  }

  /**
   * Check if a dataset has data loaded in memory
   * @param {string} datasetId - Dataset to check
   * @returns {boolean} True if data is loaded
   */
  isDatasetDataLoaded(datasetId) {
    const dataset = this.getDataset(datasetId);
    return dataset?.isDataLoaded() ?? false;
  }

  /**
   * Get all datasets that have data loaded in memory
   * @returns {Dataset[]} Array of datasets with loaded data
   */
  getLoadedDatasets() {
    return this.getAllDatasets().filter((d) => d.isDataLoaded());
  }

  async updateMetadata(datasetId, metadata) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    dataset.updateMetadata(metadata);
    await this._persistDataset(dataset);
    this._emit("datasetUpdated", dataset);
  }

  /**
   * Load a dataset file (v2.0 SERVER-AUTHORITATIVE)
   *
   * This is the bridge method that handles the complete loading workflow.
   * For new files, it uploads to server first to get a server-generated ID.
   *
   * @param {File} file - The file to load
   * @param {string} publicPath - Optional public URL for sample files
   * @param {object} options - { serverId, serverMetadata, userId, projectId, orgId }
   * @returns {Promise<string>} - The dataset ID
   */
  async loadDataset(file, publicPath = null, options = {}) {
    log.debug(`DatasetManager: Loading dataset "${file.name}"`);

    // Extract options
    const {
      serverId = null,
      serverMetadata = null,
      projectId,
      orgId,
    } = options;
    let userId = options.userId || null;

    // Use current user if not specified
    if (!userId) {
      const { getUserId } = await import(
        "@Collaboration/presence/userManagement.js"
      );
      userId = getUserId();
    }

    try {
      // STEP 1: Extract file type
      const fileType = this._extractFileType(file.name);
      log.debug(`File type: ${fileType}`);

      // STEP 2: Calculate hash
      const hash = await this.generateFileHash(file);
      log.debug(`Hash: ${hash.substring(0, 16)}...`);

      // STEP 3: Check if we already have this dataset metadata
      const existing = await this.findDatasetByHash(hash);

      if (existing) {
        log.debug(`Found existing dataset: ${existing.id}`);

        // CRITICAL: Even though we have metadata, we might not have the file!
        // Store the file so it's available for visualization
        log.debug(`Updating file data for existing dataset...`);

        // Store the file in cache
        try {
          const storageResult = await this.storageProvider.storeFile(file);
          log.debug(`File stored successfully`);

          // Update the dataset object with the new file reference
          existing.rawFile = file;
          existing.setFileStatus("available", file);

          // Update serverId if provided (linking local dataset to server)
          if (serverId && !existing.serverId) {
            existing.serverId = serverId;
          }

          // If publicPath was provided, update it (in case it changed)
          if (publicPath && publicPath !== existing.publicPath) {
            existing.publicPath = publicPath;
            await this._persistDataset(existing);
          }

          // Emit events so UI updates
          this._emit("datasetUpdated", existing);

          // Emit datasetLoaded event so instances can load it
          this._emit("datasetLoaded", {
            datasetId: existing.id,
            dataset: existing,
          });

          log.debug(`DatasetManager: Existing dataset updated with new file`);
          log.debug(`ID: ${existing.id}`);

          return existing.id;
        } catch (storageError) {
          log.error(`Failed to store file:`, storageError);
          throw new Error(
            `Failed to update file for ${file.name}: ${storageError.message}`
          );
        }
      }

      // STEP 4: This is a truly new dataset - validate file type support
      const isSupported = await this._isFileTypeSupported(fileType);
      if (!isSupported) {
        throw new Error(
          `File type ${fileType.toUpperCase()} is not supported by any registered handler. ` +
            `Please ensure the appropriate visualization plugin is installed.`
        );
      }

      // STEP 5: Determine dataset ID
      // If serverId provided (from server sync), use it
      // Otherwise, upload to server to get a new ID
      let datasetId = serverId;
      let serverFile = null;

      if (!datasetId) {
        // Upload to server to get server-generated ID
        log.debug(`Uploading to server...`);
        const serverResponse = await this._uploadFileToServer(file, {
          projectId,
          orgId,
        });

        if (
          !serverResponse ||
          !serverResponse.file ||
          !serverResponse.file.id
        ) {
          throw new Error("Server did not return a valid file ID");
        }

        serverFile = serverResponse.file;
        datasetId = serverFile.id;
        log.debug(`Server assigned ID: ${datasetId}`);
      }

      // STEP 6: Store the raw file locally
      const storageResult = await this.storageProvider.storeFile(file);

      // STEP 7: Create dataset metadata with server-provided ID
      const dataset = new Dataset({
        id: datasetId, // SERVER-PROVIDED ID
        serverId: datasetId,
        filename: file.name,
        fileType: serverFile?.file_type || fileType,
        hash: serverFile?.hash || hash,
        publicPath:
          publicPath || `${config.apiBaseUrl}/files/${datasetId}/download`,
        storageKey: serverFile?.storage_key || storageResult || hash,
        userId: userId,
        rawFile: file, // Keep reference for immediate use
        metadata: {
          fileSize: file.size,
          uploadedBy: userId,
          uploadedAt: serverFile?.uploaded_at || Date.now(),
          ...serverMetadata,
        },
      });

      // STEP 8: Try to extract quick metadata (optional, non-blocking)
      try {
        const quickMetadata = await this.extractQuickMetadataUsingHandlers(
          file,
          fileType
        );
        if (quickMetadata) {
          dataset.quickMetadata = quickMetadata;
          dataset.updateMetadata(quickMetadata);
          log.debug(`Quick metadata extracted`);
        }
      } catch (error) {
        log.warn(`Could not extract quick metadata:`, error.message);
      }

      // STEP 9: Store and persist
      this._datasets.set(dataset.id, dataset);
      await this._persistDataset(dataset);

      // STEP 10: Notify listeners
      this._emit("datasetAdded", dataset);

      // STEP 11: Emit datasetLoaded event
      this._emit("datasetLoaded", {
        datasetId: dataset.id,
        dataset: dataset,
      });

      log.debug(`DatasetManager: Dataset "${file.name}" ready`);
      log.debug(`ID: ${dataset.id}`);
      log.debug(`Type: ${fileType}`);

      return dataset.id;
    } catch (error) {
      log.error(
        `DatasetManager: Failed to load dataset "${file.name}":`,
        error
      );
      throw error;
    }
  }

  async extractQuickMetadataUsingHandlers(file, fileType) {
    const { instanceTypeRegistry } = await import(
      "@Core/instances/types/instanceTypeRegistry.js"
    );
    const handlers = instanceTypeRegistry.getAvailableHandlers();

    for (const { handler } of handlers) {
      if (handler.canExtractMetadata && handler.canExtractMetadata(fileType)) {
        log.debug(`Using ${handler.getDisplayName()} to extract metadata`);
        try {
          const metadata = await handler.extractMetadata(file, fileType);
          if (metadata) return metadata;
        } catch (error) {
          log.warn(`Handler failed to extract metadata:`, error.message);
        }
      }
    }

    log.debug(`No handler available for ${fileType} metadata extraction`);
    return null;
  }

  getRawFile(datasetId) {
    const dataset = this._datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }
    return dataset.rawFile;
  }

  /**
   * Load raw file for a dataset (TYPE-AGNOSTIC)
   *
   * This is a convenience method that:
   * 1. Gets the raw file from memory if available
   * 2. Fetches it if needed (for sample files with publicPath)
   * 3. Returns the raw File object for the handler to parse
   *
   * IMPORTANT: This method is TYPE-AGNOSTIC!
   * - It does NOT parse the file - that's the handler's job
   * - VTK handler parses .vtp files
   * - Plot handler parses .csv files
   * - Image handler parses .png files
   * - Each handler knows how to parse its own formats
   *
   * This method only handles file retrieval and fetching, not parsing.
   *
   * @param {string} datasetId - Dataset ID to load
   * @returns {Promise<File>} The raw file object (unparsed)
   * @throws {Error} If dataset not found or file unavailable
   */
  async loadFile(datasetId) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    // Check if we already have the file in memory
    let rawFile = dataset.rawFile;

    // If data is already loaded, just return it
    if (rawFile && dataset.isDataLoaded()) {
      log.debug(`Data already loaded for ${dataset.filename}`);
      return rawFile;
    }

    // If we don't have it, try to fetch it
    if (!rawFile) {
      log.debug(
        `File not in memory for ${dataset.filename}, attempting fetch...`
      );

      // If dataset has a public path, we can fetch it
      if (dataset.publicPath) {
        log.debug(`Fetching from: ${dataset.publicPath}`);

        try {
          // Update status to show we're fetching/loading
          dataset.setFileStatus("fetching");
          dataset.setDataLoading();
          this._emit("datasetUpdated", dataset);

          const response = await fetch(dataset.publicPath);

          if (!response.ok) {
            throw new Error(
              `Failed to fetch ${dataset.filename}: ${response.status} ${response.statusText}`
            );
          }

          const blob = await response.blob();
          rawFile = new File([blob], dataset.filename, {
            type: "application/octet-stream",
          });

          // Store it back in the dataset for future use
          dataset.setFileStatus("available", rawFile);
          dataset.setDataLoaded();

          // Only cache if this file doesn't already have a cacheKey from the server
          // Files loaded from the database already have a cacheKey and don't need re-uploading
          if (!dataset.cacheKey) {
            try {
              const serverId = await this.storageProvider.storeFile(rawFile);
              log.debug(`File fetched and cached successfully`);

              // CRITICAL: Update the dataset with the server ID so downloads work
              if (serverId) {
                dataset.serverId = serverId;
                dataset.cacheKey = serverId;

                // Persist the update so it survives page reload
                await this._persistDataset(dataset);
              }
            } catch (cacheError) {
              log.warn(`File fetched but caching failed:`, cacheError);
              // Continue anyway - we have the file in memory
            }
          } else {
            log.debug(`File already has server cacheKey, skipping upload`);
          }

          // Notify that dataset was updated
          this._emit("datasetUpdated", dataset);
        } catch (fetchError) {
          dataset.setFileStatus("fetch-failed");
          dataset.releaseData(); // Reset to stored state on failure
          this._emit("datasetUpdated", dataset);

          throw new Error(
            `Failed to fetch ${dataset.filename} from ${dataset.publicPath}: ${fetchError.message}`
          );
        }
      } else {
        // No public path - mark as needing upload
        dataset.setFileStatus("needs-upload");
        dataset.releaseData(); // Ensure we're in stored state
        this._emit("datasetUpdated", dataset);

        throw new Error(
          `Dataset ${dataset.filename} is not available. ` +
            `The file was loaded in a previous session and is no longer in cache. ` +
            `Please re-upload this file to visualize it.`
        );
      }
    }

    if (!rawFile) {
      throw new Error(`Failed to obtain file for ${dataset.filename}`);
    }

    log.debug(`loadPolydata: File ready for ${dataset.filename}`);
    return rawFile;
  }

  cacheParsedData(datasetId, handlerType, parsedData, metadata) {
    const dataset = this._datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    dataset.parsedDataCache[handlerType] = {
      data: parsedData,
      metadata: metadata,
      parsedAt: Date.now(),
    };

    log.debug(`Cached parsed data for ${datasetId} (handler: ${handlerType})`);
  }

  getCachedParsedData(datasetId, handlerType) {
    const dataset = this._datasets.get(datasetId);
    if (!dataset) return null;
    return dataset.parsedDataCache[handlerType] || null;
  }

  // ==================== FILE TYPE UTILITIES ====================
  // These helper methods extract and validate file types
  // They live in DatasetManager because this is where datasets are created

  /**
   * Extract file type (extension) from filename
   *
   * This is the authoritative place where file type determination happens.
   * Extract once at dataset creation, store it, and all subsequent code
   * can simply read dataset.fileType with confidence it's always populated.
   *
   * Examples:
   *   "Earth.vtp" → "vtp"
   *   "model.STL" → "stl"
   *   "data.tar.gz" → "gz" (last extension)
   *
   * @param {string} filename - The filename to parse
   * @returns {string} - The lowercase file extension without the dot
   * @throws {Error} - If filename is invalid or has no extension
   * @private
   */
  _extractFileType(filename) {
    // Defensive validation
    if (!filename || typeof filename !== "string") {
      throw new Error("Invalid filename: must be a non-empty string");
    }

    // Handle filenames with multiple dots (like "data.tar.gz")
    // We want the last part after the final dot
    const parts = filename.split(".");

    if (parts.length < 2) {
      throw new Error(
        `Filename "${filename}" has no extension. ` +
          `All dataset files must have a file extension (e.g., .vtp, .vti, .stl)`
      );
    }

    // Get the last part and normalize to lowercase
    const extension = parts[parts.length - 1].toLowerCase();

    // Additional validation: extension should not be empty
    if (extension.length === 0) {
      throw new Error(`Filename "${filename}" has empty extension`);
    }

    return extension;
  }

  /**
   * Validate that a file type is supported by at least one registered handler
   *
   * This provides early validation - we can reject unsupported file types
   * immediately at upload time with a helpful error message, rather than
   * letting the file get stored and only failing later when someone tries
   * to visualize it.
   *
   * @param {string} fileType - The file extension to validate
   * @returns {boolean} - True if at least one handler supports this type
   * @private
   */
  async _isFileTypeSupported(fileType) {
    try {
      const { instanceTypeRegistry } = await import(
        "@Core/instances/types/instanceTypeRegistry.js"
      );

      // Create a descriptor that matches what canHandleDataset() expects
      // The interface default implementation looks for dataset.fileType
      const descriptor = {
        extension: fileType,
        filename: `test.${fileType}`,
        fileType: fileType, // ← ADD THIS - matches interface expectations
      };

      // Ask registry which handlers can work with this type
      const compatibleHandlers =
        instanceTypeRegistry.getCompatibleHandlers(descriptor);

      return compatibleHandlers.length > 0;
    } catch (error) {
      // If we can't check (registry not available), be permissive
      log.warn("Could not validate file type support:", error);
      return true;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get the file type for a dataset
   *
   * This is a convenience method that returns the fileType with validation.
   * It's useful when you want to be extra defensive in case old datasets
   * don't have fileType set.
   *
   * @param {string} datasetId - The dataset ID
   * @returns {string|null} - The file type, or null if dataset not found
   */
  getDatasetFileType(datasetId) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      return null;
    }

    // If fileType is missing (old dataset), extract it from filename
    if (!dataset.fileType && dataset.filename) {
      try {
        dataset.fileType = this._extractFileType(dataset.filename);
        // Persist the update so we don't have to extract again
        this._persistDataset(dataset).catch((err) => {
          log.warn("Failed to persist fileType update:", err);
        });
      } catch (error) {
        log.warn(`Could not extract file type for ${dataset.filename}:`, error);
        return null;
      }
    }

    return dataset.fileType;
  }

  // ==================== ANNOTATION MANAGEMENT ====================

  /**
   * Add an annotation to a dataset (v2.0 SERVER-AUTHORITATIVE)
   *
   * Creates annotation on server first to get server-generated ID,
   * then creates local Annotation object with that ID.
   *
   * @param {string} datasetId - The dataset to annotate
   * @param {object} annotationConfig - Annotation configuration
   * @param {string} userId - User creating the annotation
   * @param {object} options - { projectId }
   * @returns {Promise<Annotation>} The created annotation
   */
  async addAnnotation(datasetId, annotationConfig, userId, options = {}) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    // Create annotation on server first to get ID
    log.debug(`DatasetManager: Creating annotation on server...`);
    const serverAnnotation = await this._createAnnotationOnServer(
      datasetId,
      annotationConfig,
      options
    );

    if (!serverAnnotation || !serverAnnotation.id) {
      throw new Error("Server did not return a valid annotation ID");
    }

    log.debug(`Server assigned annotation ID: ${serverAnnotation.id}`);

    // Create local Annotation with server-provided ID
    const annotation = new Annotation({
      id: serverAnnotation.id, // SERVER-PROVIDED ID
      ...annotationConfig,
      datasetId,
      createdBy: userId,
      createdAt: serverAnnotation.created_at || Date.now(),
    });

    dataset.addAnnotation(annotation);
    await this._persistDataset(dataset);
    this._emit("annotationAdded", { datasetId, annotation });

    log.debug(
      `DatasetManager: Added annotation ${annotation.id} to dataset ${datasetId}`
    );
    return annotation;
  }

  /**
   * Create annotation on server API
   * @private
   * @param {string} fileId - The dataset/file ID
   * @param {object} annotationConfig - Annotation configuration
   * @param {object} options - { projectId }
   * @returns {Promise<object>} Server response with annotation including ID
   */
  async _createAnnotationOnServer(fileId, annotationConfig, options = {}) {
    const result = await apiClient.post("/annotations", {
      fileId,
      projectId: options.projectId,
      type: annotationConfig.type || "point",
      coordinates: annotationConfig.position ||
        annotationConfig.coordinates || [0, 0, 0],
      position: annotationConfig.position,
      normal: annotationConfig.normal,
      text: annotationConfig.text,
      properties: annotationConfig.metadata,
      metadata: annotationConfig.metadata,
      visibility: annotationConfig.visibility || "public",
    });

    return result.annotation;
  }

  async removeAnnotation(datasetId, annotationId) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    const removed = dataset.removeAnnotation(annotationId);
    if (!removed) {
      log.warn(`DatasetManager: Annotation ${annotationId} not found`);
      return;
    }

    await this._persistDataset(dataset);
    this._emit("annotationRemoved", { datasetId, annotationId });
    log.debug(
      `DatasetManager: Removed annotation ${annotationId} from dataset ${datasetId}`
    );
  }

  async updateAnnotation(datasetId, annotationId, updates, userId) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    const annotation = dataset.getAnnotation(annotationId);
    if (!annotation) {
      throw new Error(`Annotation ${annotationId} not found`);
    }

    annotation.update(updates, userId);
    await this._persistDataset(dataset);
    this._emit("annotationUpdated", { datasetId, annotation });
    log.debug(`DatasetManager: Updated annotation ${annotationId}`);
  }

  getAnnotations(datasetId, filter = null, userId = null) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }
    return dataset.getAnnotations(filter, userId);
  }

  // ==================== PERSISTENCE ====================

  async _persistDataset(dataset) {
    // Validate dataset has required id field before persisting
    if (!dataset.id) {
      log.error("Cannot persist dataset without ID:", dataset);
      throw new Error(
        `Dataset ${dataset.filename} is missing required 'id' field`
      );
    }

    const transaction = this._db.transaction(["datasets"], "readwrite");
    const store = transaction.objectStore("datasets");
    const data = dataset.toJSON();

    // Double-check the JSON has the id
    if (!data.id) {
      log.error("Dataset.toJSON() did not include 'id':", data);
      throw new Error(
        `Dataset ${dataset.filename} toJSON() missing 'id' field`
      );
    }

    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        log.error("IndexedDB put failed:", request.error);
        log.error("Dataset:", data);
        reject(
          new Error(`Failed to persist dataset: ${request.error.message}`)
        );
      };
    });
  }

  async _deleteDataset(datasetId) {
    const transaction = this._db.transaction(["datasets"], "readwrite");
    const store = transaction.objectStore("datasets");

    return new Promise((resolve, reject) => {
      const request = store.delete(datasetId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to delete dataset"));
    });
  }

  // ==================== CLEANUP ====================

  async cleanup() {
    log.debug("DatasetManager: Cleaning up...");
    this._datasets.clear();
    if (this._db) {
      this._db.close();
      this._db = null;
    }
    log.debug("DatasetManager: Cleanup complete");
  }

  async clearCorruptedData() {
    log.debug("Clearing potentially corrupted IndexedDB data...");

    try {
      const transaction = this._db.transaction(["datasets"], "readwrite");
      const store = transaction.objectStore("datasets");

      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => {
          log.debug("IndexedDB cleared successfully");
          log.debug("Please refresh the page to start fresh");
          resolve();
        };
        request.onerror = () => {
          log.error("Failed to clear IndexedDB:", request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      log.error("Error clearing IndexedDB:", error);
    }
  }

  // ==================== RECONCILIATION ====================

  /**
   * Reconcile local state with server
   *
   * This method:
   * 1. Fetches current server state
   * 2. Identifies orphan datasets (local but not on server)
   * 3. Removes orphans from IndexedDB
   * 4. Adds any new datasets from server
   * 5. Handles ID migrations (same file, different ID)
   *
   * @param {Object} options
   * @returns {Promise<ReconciliationResult>}
   */
  async reconcileWithServer(options = {}) {
    log.info("DatasetManager: Starting server reconciliation...");

    const startTime = Date.now();

    try {
      // 1. Check if we have server storage
      if (!this.storageProvider || !this.storageProvider.listDatasets) {
        log.debug("No server storage provider - skipping reconciliation");
        return { skipped: true, reason: "no-server-storage" };
      }

      const serverFiles = await this.storageProvider.listDatasets();
      log.debug(`Server has ${serverFiles.length} dataset(s)`);

      // Build lookup maps
      const serverById = new Map(serverFiles.map((f) => [f.id, f]));
      const serverByHash = new Map(
        serverFiles.filter((f) => f.hash).map((f) => [f.hash, f])
      );

      // 2. Analyze local datasets
      const localDatasets = this.getAllDatasets();
      const orphans = [];
      const needsIdMigration = [];
      const valid = [];

      for (const local of localDatasets) {
        const serverById_match = serverById.get(local.id);
        const serverByHash_match = local.hash
          ? serverByHash.get(local.hash)
          : null;

        if (serverById_match) {
          valid.push(local);
        } else if (serverByHash_match) {
          needsIdMigration.push({
            local,
            serverFile: serverByHash_match,
            oldId: local.id,
            newId: serverByHash_match.id,
          });
        } else {
          orphans.push(local);
        }
      }

      log.debug(
        `Analysis: ${valid.length} valid, ${orphans.length} orphans, ${needsIdMigration.length} need migration`
      );

      // 3. Remove orphans
      for (const orphan of orphans) {
        log.warn(`Removing orphan dataset: ${orphan.filename} (${orphan.id})`);
        this._datasets.delete(orphan.id);
        try {
          await this._deleteDataset(orphan.id);
        } catch (err) {
          log.warn(`Failed to delete orphan from IndexedDB:`, err);
        }
      }

      // 4. Migrate IDs
      for (const migration of needsIdMigration) {
        const { local, serverFile, oldId, newId } = migration;
        log.info(`Migrating dataset ID: ${local.filename}`);

        this._datasets.delete(oldId);
        local.id = newId;
        local.serverId = newId;
        local.publicPath = `${config.apiBaseUrl}/files/${newId}/download`;
        this._datasets.set(newId, local);

        try {
          await this._deleteDataset(oldId);
          await this._persistDataset(local);
        } catch (err) {
          log.warn(`Failed to persist ID migration:`, err);
        }
      }

      // 5. Add new datasets from server
      let added = 0;
      const existingIds = new Set(this._datasets.keys());

      for (const serverFile of serverFiles) {
        if (!existingIds.has(serverFile.id)) {
          try {
            await this._addDatasetFromServer(serverFile);
            added++;
          } catch (err) {
            log.error(`Failed to add server dataset ${serverFile.id}:`, err);
          }
        }
      }

      // 6. Build result
      const result = {
        orphansRemoved: orphans.length,
        idsMigrated: needsIdMigration.length,
        added,
        total: this._datasets.size,
        wasClean:
          orphans.length === 0 && needsIdMigration.length === 0 && added === 0,
        durationMs: Date.now() - startTime,
      };

      if (!result.wasClean) {
        log.info(`Reconciliation complete in ${result.durationMs}ms:`);
        log.info(`  Orphans removed: ${result.orphansRemoved}`);
        log.info(`  IDs migrated: ${result.idsMigrated}`);
        log.info(`  Added: ${result.added}`);
        this._emit("reconciled", result);
      } else {
        log.debug(`Already in sync (${result.durationMs}ms)`);
      }

      return result;
    } catch (error) {
      log.error("Reconciliation failed:", error);
      throw error;
    }
  }

  /**
   * Force clear all local dataset data
   */
  async forceReset() {
    log.warn("Force resetting all dataset state...");
    this._datasets.clear();
    await this.clearCorruptedData();
    this._emit("reset");
    log.info("Dataset state reset complete");
  }

  /**
   * Get IDs of all local datasets
   */
  getLocalDatasetIds() {
    return Array.from(this._datasets.keys());
  }
}

/**
 * USAGE EXAMPLE:
 *
 * // During app initialization (e.g., in your Phase 1 init)
 * import { DatasetManager } from '@Core/data/managers/DatasetManager.js';
 * import { fileCache } from '@Services/fileCache.js'; // Your existing cache
 *
 * const datasetManager = new DatasetManager();
 * await datasetManager.initialize(fileCache);
 *
 * // Make it globally accessible
 * window.CIA = window.CIA || {};
 * window.CIA.datasetManager = datasetManager;
 *
 * // When a user drops a file
 * async function handleFileDrop(file) {
 *   const dataset = await datasetManager.addDataset(file, currentUser.id);
 *
 *   // Load and analyze the file to extract metadata
 *   const fileData = await datasetManager.loadFile(dataset.id);
 *   const bounds = extractBounds(fileData); // Your existing analysis code
 *   const pointCount = extractPointCount(fileData);
 *
 *   // Update the dataset with analysis results
 *   await datasetManager.updateMetadata(dataset.id, {
 *     bounds,
 *     pointCount
 *   });
 *
 *   // Now ViewConfigurationManager can create a default view for this dataset
 * }
 *
 * // When a user creates an annotation
 * async function createAnnotation(datasetId, position, text) {
 *   const annotation = await datasetManager.addAnnotation(
 *     datasetId,
 *     {
 *       position,
 *       text,
 *       type: 'point',
 *       tags: ['user-created']
 *     },
 *     currentUser.id
 *   );
 *
 *   // The annotation is now stored with the dataset
 *   // Views can filter and display it based on their annotation display config
 * }
 *
 * // When a handler needs to render a dataset
 * async function renderDataset(datasetId) {
 *   const dataset = datasetManager.getDataset(datasetId);
 *   const file = await datasetManager.loadFile(datasetId);
 *
 *   // Load and render the file
 *   // ...
 * }
 *
 * // Listen for dataset changes
 * datasetManager.on('datasetAdded', (dataset) => {
 *   log.info('New dataset added:', dataset.filename);
 *   // Update UI to show the new dataset
 * });
 *
 * datasetManager.on('annotationAdded', ({ datasetId, annotation }) => {
 *   log.info('New annotation on dataset:', datasetId);
 *   // Trigger re-render if this dataset is currently visible
 * });
 */
