// src/core/data/managers/SubsetManager.js
// Manages Subset instances and focus mode
//
// ARCHITECTURE:
// - Subsets are saved selections of canvas placements
// - Activating a subset enters "focus mode" (viewport replacement)
// - Server is source of truth for subset data
// - Integrates with CanvasManager for placement references

import { Subset } from "@Core/data/models/Subset.js";
import { workspace as log } from "@Utils/logger.js";
import { BaseManager } from "@Core/data/managers/BaseManager.js";
import { config } from "@Core/config/clientConfig.js";
import {
  getStoredMockUserId,
  getMockUser,
  getDefaultMockUser,
} from "@Config/mockUsers.js";

/**
 * SubsetManager - Manages subsets and focus mode
 *
 * Responsibilities:
 * - CRUD operations for subsets via REST API
 * - Focus mode activation/deactivation
 * - Visibility and sharing management
 * - WebSocket broadcast integration
 */
export class SubsetManager extends BaseManager {
  constructor(config = {}) {
    super({
      events: [
        "subsetCreated",
        "subsetUpdated",
        "subsetDeleted",
        "subsetActivated",
        "subsetDeactivated",
        "selectionChanged",
      ],
      logCategory: "subset",
    });

    this._apiBaseUrl = config.apiBaseUrl || "http://localhost:3001/api";
    this._sessionManager = config.sessionManager || null;
    this._subsets = new Map();
    this._activeSubsetId = null;
    this._previousViewport = null;
    this._selectedPlacementIds = new Set();
    this._selectionMode = false;

    // Bind methods
    this.handleServerBroadcast = this.handleServerBroadcast.bind(this);
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  /**
   * Initialize the subset manager
   */
  initialize(options = {}) {
    if (options.apiBaseUrl) this._apiBaseUrl = options.apiBaseUrl;
    if (options.sessionManager) this._sessionManager = options.sessionManager;
    if (options.canvasManager) this._canvasManager = options.canvasManager;

    log.debug("SubsetManager initialized");
  }

  /**
   * Set dependencies
   */
  setCanvasManager(canvasManager) {
    this._canvasManager = canvasManager;
  }

  // ===========================================================================
  // SUBSET CRUD
  // ===========================================================================

  /**
   * Load subsets for a canvas
   * @param {string} canvasId
   * @returns {Promise<Subset[]>}
   */
  async loadSubsetsForCanvas(canvasId) {
    try {
      const response = await this._fetch(`/canvases/${canvasId}/subsets`);
      const data = await response.json();

      const subsets = (data.subsets || []).map((s) => new Subset(s));

      // Update cache
      subsets.forEach((subset) => {
        this._subsets.set(subset.id, subset);
      });

      this._emit("subsetLoaded", { canvasId, subsets });

      return subsets;
    } catch (error) {
      this._emit("error", { operation: "loadSubsetsForCanvas", error });
      throw error;
    }
  }

  /**
   * Get a subset by ID
   * @param {string} subsetId
   * @returns {Promise<Subset>}
   */
  async getSubset(subsetId) {
    // Check cache
    if (this._subsets.has(subsetId)) {
      return this._subsets.get(subsetId);
    }

    try {
      const response = await this._fetch(`/subsets/${subsetId}`);
      const data = await response.json();

      const subset = new Subset(data);
      this._subsets.set(subset.id, subset);

      return subset;
    } catch (error) {
      this._emit("error", { operation: "getSubset", error });
      throw error;
    }
  }

  /**
   * Create a new subset from selection
   * @param {string} canvasId
   * @param {Object} options - { name, description, placementIds }
   * @returns {Promise<Subset>}
   */
  async createSubset(canvasId, options = {}) {
    const canvas = this._canvasManager?.getCanvas(canvasId);
    const projectId = canvas?.projectId;

    const placementIds = options.placementIds || Array.from(this._selectedPlacementIds);

    const payload = {
      name: options.name || "Untitled Focus Group",
      description: options.description || "",
      placementIds,
    };

    try {
      const response = await this._fetch(`/canvases/${canvasId}/subsets`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      const subset = new Subset(data);

      this._subsets.set(subset.id, subset);

      // Clear selection after creating subset
      this.clearSelection();

      this._emit("subsetCreated", { canvasId, subset });

      return subset;
    } catch (error) {
      // Fallback: Create local-only subset if server fails
      log.warn("Server subset creation failed, creating local subset:", error.message);

      const localSubset = new Subset({
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        canvasId,
        name: payload.name,
        description: payload.description,
        placementIds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      this._subsets.set(localSubset.id, localSubset);

      // Clear selection after creating subset
      this.clearSelection();

      this._emit("subsetCreated", { canvasId, subset: localSubset });

      return localSubset;
    }
  }

  /**
   * Update a subset
   * @param {string} subsetId
   * @param {Object} updates - { name, description, visibility, sharedWith }
   * @returns {Promise<Subset>}
   */
  async updateSubset(subsetId, updates) {
    const existingSubset = this._subsets.get(subsetId);

    // For local subsets (prefixed with 'local-'), update locally only
    if (subsetId.startsWith('local-') && existingSubset) {
      const updatedSubset = new Subset({
        ...existingSubset.toJSON?.() || existingSubset,
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      this._subsets.set(subsetId, updatedSubset);
      this._emit("subsetUpdated", { subset: updatedSubset, updates });

      return updatedSubset;
    }

    try {
      const response = await this._fetch(`/subsets/${subsetId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      const subset = new Subset(data);

      this._subsets.set(subset.id, subset);
      this._emit("subsetUpdated", { subset, updates });

      return subset;
    } catch (error) {
      // Fallback: Update locally if server fails
      if (existingSubset) {
        log.warn("Server subset update failed, updating locally:", error.message);

        const updatedSubset = new Subset({
          ...existingSubset.toJSON?.() || existingSubset,
          ...updates,
          updatedAt: new Date().toISOString(),
        });

        this._subsets.set(subsetId, updatedSubset);
        this._emit("subsetUpdated", { subset: updatedSubset, updates });

        return updatedSubset;
      }

      this._emit("error", { operation: "updateSubset", error });
      throw error;
    }
  }

  /**
   * Add placements to a subset
   * @param {string} subsetId
   * @param {string[]} placementIds
   * @returns {Promise<Subset>}
   */
  async addPlacementsToSubset(subsetId, placementIds) {
    const subset = this._subsets.get(subsetId);
    if (!subset) throw new Error("Subset not found");

    const newPlacementIds = [...subset.placementIds, ...placementIds];
    return this.updateSubset(subsetId, { placementIds: newPlacementIds });
  }

  /**
   * Remove placements from a subset
   * @param {string} subsetId
   * @param {string[]} placementIds
   * @returns {Promise<Subset>}
   */
  async removePlacementsFromSubset(subsetId, placementIds) {
    const subset = this._subsets.get(subsetId);
    if (!subset) throw new Error("Subset not found");

    const newPlacementIds = subset.placementIds.filter(
      (id) => !placementIds.includes(id)
    );
    return this.updateSubset(subsetId, { placementIds: newPlacementIds });
  }

  /**
   * Delete a subset
   * @param {string} subsetId
   * @returns {Promise<void>}
   */
  async deleteSubset(subsetId) {
    // Exit focus mode if this subset is active
    if (this._activeSubsetId === subsetId) {
      this.exitFocusMode();
    }

    try {
      await this._fetch(`/subsets/${subsetId}`, {
        method: "DELETE",
      });

      const subset = this._subsets.get(subsetId);
      this._subsets.delete(subsetId);

      this._emit("subsetDeleted", { subsetId, subset });
    } catch (error) {
      this._emit("error", { operation: "deleteSubset", error });
      throw error;
    }
  }

  // ===========================================================================
  // FOCUS MODE
  // ===========================================================================

  /**
   * Enter focus mode with a subset
   * @param {string} subsetId
   * @param {Object} currentViewport - { row, col, rows, cols } to save
   */
  enterFocusMode(subsetId, currentViewport) {
    const subset = this._subsets.get(subsetId);
    if (!subset) {
      log.error("SubsetManager: Cannot enter focus mode - subset not found");
      return;
    }

    // Save current viewport for return
    this._previousViewport = { ...currentViewport };
    this._activeSubsetId = subsetId;

    log.debug(
      `SubsetManager: Entering focus mode with subset "${subset.name}"`
    );

    this._emit("focusModeEntered", {
      subset,
      previousViewport: this._previousViewport,
      layout: subset.calculateFocusLayout(),
    });
  }

  /**
   * Exit focus mode, return to previous viewport
   * @returns {{ viewport: Object }|null} Previous viewport to restore
   */
  exitFocusMode() {
    if (!this._activeSubsetId) {
      log.warn("SubsetManager: Not in focus mode");
      return null;
    }

    const subset = this._subsets.get(this._activeSubsetId);
    const viewport = this._previousViewport;

    this._activeSubsetId = null;
    this._previousViewport = null;

    log.debug("SubsetManager: Exiting focus mode");

    this._emit("focusModeExited", {
      subset,
      viewport,
    });

    return { viewport };
  }

  /**
   * Check if currently in focus mode
   * @returns {boolean}
   */
  isInFocusMode() {
    return this._activeSubsetId !== null;
  }

  /**
   * Get active subset (if in focus mode)
   * @returns {Subset|null}
   */
  getActiveSubset() {
    return this._activeSubsetId
      ? this._subsets.get(this._activeSubsetId)
      : null;
  }

  /**
   * Get placements for the active subset
   * @returns {CanvasPlacement[]}
   */
  getActiveFocusPlacements() {
    const subset = this.getActiveSubset();
    if (!subset || !this._canvasManager) return [];

    const canvas = this._canvasManager.getCanvas(subset.canvasId);
    if (!canvas) return [];

    return subset.placementIds
      .map((id) => canvas.getPlacementById(id))
      .filter(Boolean);
  }

  // ===========================================================================
  // SELECTION MODE (for creating subsets)
  // ===========================================================================

  /**
   * Enter selection mode
   */
  enterSelectionMode() {
    this._selectionMode = true;
    this._selectedPlacementIds.clear();
    this._emit("selectionChanged", { mode: "enter", selected: [] });
  }

  /**
   * Exit selection mode
   * @param {boolean} clearSelection - Whether to clear selected items
   */
  exitSelectionMode(clearSelection = true) {
    this._selectionMode = false;
    if (clearSelection) {
      this._selectedPlacementIds.clear();
    }
    this._emit("selectionChanged", {
      mode: "exit",
      selected: Array.from(this._selectedPlacementIds),
    });
  }

  /**
   * Check if in selection mode
   */
  isInSelectionMode() {
    return this._selectionMode;
  }

  /**
   * Toggle placement selection
   * @param {string} placementId
   */
  toggleSelection(placementId) {
    if (this._selectedPlacementIds.has(placementId)) {
      this._selectedPlacementIds.delete(placementId);
    } else {
      this._selectedPlacementIds.add(placementId);
    }

    this._emit("selectionChanged", {
      mode: "toggle",
      placementId,
      selected: Array.from(this._selectedPlacementIds),
    });
  }

  /**
   * Add placement to selection
   * @param {string} placementId
   */
  addToSelection(placementId) {
    this._selectedPlacementIds.add(placementId);
    this._emit("selectionChanged", {
      mode: "add",
      placementId,
      selected: Array.from(this._selectedPlacementIds),
    });
  }

  /**
   * Remove placement from selection
   * @param {string} placementId
   */
  removeFromSelection(placementId) {
    this._selectedPlacementIds.delete(placementId);
    this._emit("selectionChanged", {
      mode: "remove",
      placementId,
      selected: Array.from(this._selectedPlacementIds),
    });
  }

  /**
   * Clear all selections
   */
  clearSelection() {
    this._selectedPlacementIds.clear();
    this._emit("selectionChanged", { mode: "clear", selected: [] });
  }

  /**
   * Get selected placement IDs
   * @returns {string[]}
   */
  getSelectedPlacementIds() {
    return Array.from(this._selectedPlacementIds);
  }

  /**
   * Check if placement is selected
   * @param {string} placementId
   * @returns {boolean}
   */
  isSelected(placementId) {
    return this._selectedPlacementIds.has(placementId);
  }

  // ===========================================================================
  // QUERIES
  // ===========================================================================

  /**
   * Get all subsets for a canvas
   * @param {string} canvasId
   * @returns {Subset[]}
   */
  getSubsetsForCanvas(canvasId) {
    return Array.from(this._subsets.values()).filter(
      (s) => s.canvasId === canvasId
    );
  }

  /**
   * Get subsets visible to current user
   * @param {string} canvasId
   * @returns {Subset[]}
   */
  getVisibleSubsets(canvasId) {
    const userId = this._getUserId();
    return this.getSubsetsForCanvas(canvasId).filter((s) =>
      s.canUserView(userId)
    );
  }

  /**
   * Get subsets that include a specific placement
   * @param {string} placementId
   * @returns {Subset[]}
   */
  getSubsetsForPlacement(placementId) {
    return Array.from(this._subsets.values()).filter((s) =>
      s.hasPlacement(placementId)
    );
  }

  // ===========================================================================
  // WEBSOCKET BROADCAST HANDLING
  // ===========================================================================

  /**
   * Handle server broadcast events
   */
  handleServerBroadcast(message) {
    log.debug("SubsetManager received broadcast:", message.type);

    switch (message.type) {
      case "subset:created":
        this._handleSubsetCreated(message);
        break;

      case "subset:updated":
        this._handleSubsetUpdated(message);
        break;

      case "subset:deleted":
        this._handleSubsetDeleted(message);
        break;

      default:
        // Ignore unknown types
        break;
    }
  }

  _handleSubsetCreated(message) {
    const subset = new Subset(message.subset);
    this._subsets.set(subset.id, subset);
    this._emit("subsetCreated", { subset, source: "broadcast" });
  }

  _handleSubsetUpdated(message) {
    const subset = new Subset(message.subset);
    this._subsets.set(subset.id, subset);
    this._emit("subsetUpdated", { subset, source: "broadcast" });
  }

  _handleSubsetDeleted(message) {
    const subset = this._subsets.get(message.subsetId);
    this._subsets.delete(message.subsetId);

    // Exit focus mode if this was the active subset
    if (this._activeSubsetId === message.subsetId) {
      this._activeSubsetId = null;
      this._previousViewport = null;
    }

    this._emit("subsetDeleted", {
      subsetId: message.subsetId,
      subset,
      source: "broadcast",
    });
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  _getUserId() {
    if (this._sessionManager?.getUserId) {
      return this._sessionManager.getUserId();
    }
    return "dev-user-001";
  }

  _getToken() {
    if (this._sessionManager?.getToken) {
      return this._sessionManager.getToken();
    }
    return null;
  }

  /**
   * Check if running in dev bypass mode
   */
  _isDevMode() {
    return config.devBypassAuth === true || config.devBypassAuth === "true";
  }

  /**
   * Get dev user headers for API requests (matching apiClient behavior)
   */
  _getDevUserHeaders() {
    if (!this._isDevMode()) {
      return {};
    }

    // Get current mock user from storage
    const storedId = getStoredMockUserId();
    const user = storedId ? getMockUser(storedId) : getDefaultMockUser();

    if (!user) {
      return {};
    }

    return {
      "x-user-id": user.id,
      "x-user-email": user.email,
      "x-user-name": user.name,
    };
  }

  async _fetch(endpoint, options = {}) {
    const url = `${this._apiBaseUrl}${endpoint}`;
    const token = this._getToken();

    // Build headers with auth token and dev user headers
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...this._getDevUserHeaders(), // Add dev user headers in dev mode
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = new Error(`API error: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return response;
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  clearCache() {
    this._subsets.clear();
    this._activeSubsetId = null;
    this._previousViewport = null;
    this._selectedPlacementIds.clear();
    this._selectionMode = false;
  }

  dispose() {
    this._subsets.clear();
    this._activeSubsetId = null;
    this._previousViewport = null;
    this._selectedPlacementIds.clear();
    this._selectionMode = false;
    super.dispose(); // Call parent
  }
}

// Singleton instance
export const subsetManager = new SubsetManager();
