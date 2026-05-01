// src/core/data/managers/CanvasManager.js
// Manages WorkspaceCanvas instances and server synchronization
//
// ARCHITECTURE:
// - Server is source of truth for all canvas state
// - Local cache for performance, but server always wins conflicts
// - WebSocket broadcasts keep clients in sync
// - All mutations go through server API

import { WorkspaceCanvas } from "@Core/data/models/WorkspaceCanvas.js";
import { CanvasPlacement } from "@Core/data/models/CanvasPlacement.js";
import { workspace as log } from "@Utils/logger.js";
import { BaseManager } from "@Core/data/managers/BaseManager.js";
import { config } from "@Core/config/clientConfig.js";
import {
  getStoredMockUserId,
  getMockUser,
  getDefaultMockUser,
} from "@Config/mockUsers.js";

/**
 * CanvasManager - Manages workspace canvases with server sync
 *
 * Responsibilities:
 * - CRUD operations for canvases via REST API
 * - Local caching of loaded canvases
 * - Event emission for UI updates
 * - WebSocket broadcast integration
 */
export class CanvasManager extends BaseManager {
  constructor(config = {}) {
    super({
      events: [
        "canvasCreated",
        "canvasUpdated",
        "canvasDeleted",
        "placementAdded",
        "placementUpdated",
        "placementRemoved",
        "connectionStateChanged",
      ],
      logCategory: "canvas",
    });

    this._apiBaseUrl = config.apiBaseUrl || "http://localhost:3001/api";
    this._sessionManager = config.sessionManager || null;
    this._canvases = new Map();
    this._connectionState = "disconnected";
    this._reconnectAttempts = 0;

    // Focused pane tracking (for tile mode with multiple viewports)
    this._focusedPaneId = null;

    // Bind methods for WebSocket handlers
    this.handleServerBroadcast = this.handleServerBroadcast.bind(this);
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  /**
   * Initialize the canvas manager
   * @param {Object} options - { apiBaseUrl, sessionManager }
   */
  initialize(options = {}) {
    if (options.apiBaseUrl) this._apiBaseUrl = options.apiBaseUrl;
    if (options.sessionManager) this._sessionManager = options.sessionManager;

    log.debug("CanvasManager initialized");
  }

  /**
   * Set the session manager (for auth tokens)
   * @param {Object} sessionManager
   */
  setSessionManager(sessionManager) {
    this._sessionManager = sessionManager;
  }

  // ===========================================================================
  // CANVAS CRUD
  // ===========================================================================

  /**
   * Load a canvas by ID
   * @param {string} canvasId
   * @returns {Promise<WorkspaceCanvas>}
   */
  async loadCanvas(canvasId) {
    // Check cache first
    if (this._canvases.has(canvasId)) {
      const cached = this._canvases.get(canvasId);
      if (cached?.placements !== undefined) {
        return cached;
      }
    }

    try {
      const response = await this._fetch(`/canvases/${canvasId}`);
      const data = await response.json();
      let placements = data.placements;

      // Some API responses omit placements entirely; fetch them explicitly.
      if (!Array.isArray(placements)) {
        try {
          const placementsResponse = await this._fetch(
            `/canvases/${canvasId}/placements`
          );
          const placementsData = await placementsResponse.json();
          placements = placementsData.placements || [];
        } catch (error) {
          log.warn("Failed to load placements for canvas:", error);
          placements = [];
        }
      }

      const canvas = new WorkspaceCanvas({
        ...data,
        placements,
      });
      this._canvases.set(canvas.id, canvas);
      this._emit("canvasLoaded", { canvas });

      return canvas;
    } catch (error) {
      this._emit("error", { operation: "loadCanvas", error });
      throw error;
    }
  }

  /**
   * Get or create personal canvas for current user
   * @param {string} projectId
   * @returns {Promise<WorkspaceCanvas>}
   */
  async getPersonalCanvas(projectId) {
    const userId = this._getUserId();

    // Check cache for existing personal canvas WITH placements loaded
    const cached = Array.from(this._canvases.values()).find(
      (c) =>
        c.projectId === projectId &&
        c.ownership.type === "personal" &&
        c.ownership.ownerId === userId &&
        c.placements !== undefined // Ensure placements are loaded
    );
    if (cached) return cached;

    try {
      // Try to fetch from server (list endpoint returns basic info)
      const response = await this._fetch(
        `/projects/${projectId}/canvases?type=personal`
      );
      const data = await response.json();

      if (data.canvases && data.canvases.length > 0) {
        // Found a canvas in the list - now load it fully with placements
        const canvasId = data.canvases[0].id;
        // Clear from cache to force full reload
        this._canvases.delete(canvasId);
        // Load the full canvas with placements
        return this.loadCanvas(canvasId);
      }

      // Create new personal canvas
      return this.createCanvas(projectId, {
        name: "My Workspace",
        ownership: { type: "personal", ownerId: userId },
      });
    } catch (error) {
      this._emit("error", { operation: "getPersonalCanvas", error });
      throw error;
    }
  }

  /**
   * Get or create project room canvas
   * @param {string} projectId
   * @returns {Promise<WorkspaceCanvas>}
   */
  async getProjectCanvas(projectId) {
    // Check cache for existing project canvas WITH placements loaded
    const cached = Array.from(this._canvases.values()).find(
      (c) =>
        c.projectId === projectId &&
        c.ownership.type === "project" &&
        c.placements !== undefined // Ensure placements are loaded
    );
    if (cached) return cached;

    try {
      const response = await this._fetch(
        `/projects/${projectId}/canvases?type=project`
      );
      const data = await response.json();

      if (data.canvases && data.canvases.length > 0) {
        // Found a canvas in the list - now load it fully with placements
        const canvasId = data.canvases[0].id;
        // Clear from cache to force full reload
        this._canvases.delete(canvasId);
        // Load the full canvas with placements
        return this.loadCanvas(canvasId);
      }

      // Create project canvas (usually done by project creator)
      return this.createCanvas(projectId, {
        name: "Project Room",
        ownership: { type: "project", ownerId: projectId },
      });
    } catch (error) {
      this._emit("error", { operation: "getProjectCanvas", error });
      throw error;
    }
  }

  /**
   * Create a new canvas
   * @param {string} projectId
   * @param {Object} options - { name, ownership, dimensions }
   * @returns {Promise<WorkspaceCanvas>}
   */
  async createCanvas(projectId, options = {}) {
    const userId = this._getUserId();

    const payload = {
      name: options.name || "Untitled Workspace",
      ownership: options.ownership || { type: "personal", ownerId: userId },
      dimensions: options.dimensions || { rows: 3, cols: 3 },
      workspace_id: options.workspaceId || options.workspace_id || null,
    };

    try {
      const endpoint =
        projectId && projectId !== "default-project"
          ? `/projects/${projectId}/canvases`
          : "/canvases";
      const response = await this._fetch(endpoint, {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          project_id: options.projectId || options.project_id || projectId || null,
        }),
      });

      const data = await response.json();
      const canvas = new WorkspaceCanvas(data);

      this._canvases.set(canvas.id, canvas);
      this._emit("canvasCreated", { canvas });

      return canvas;
    } catch (error) {
      this._emit("error", { operation: "createCanvas", error });
      throw error;
    }
  }

  /**
   * Update canvas metadata and settings
   * @param {string} canvasId
   * @param {Object} updates - { name, dimensions, layoutMode, flowDirection, homepoint }
   * @returns {Promise<WorkspaceCanvas>}
   */
  async updateCanvas(canvasId, updates) {
    try {
      // FIX: Get existing placements from cache BEFORE the update
      const existingCanvas = this._canvases.get(canvasId);
      const existingPlacements = existingCanvas?.placements || [];

      const response = await this._fetch(`/canvases/${canvasId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      // FIX: Merge server response with existing placements
      // The server only returns canvas metadata, not placements
      const canvas = new WorkspaceCanvas({
        ...data,
        placements: existingPlacements.map((p) => (p.toJSON ? p.toJSON() : p)),
      });

      this._canvases.set(canvas.id, canvas);
      this._emit("canvasUpdated", { canvas, updates });

      return canvas;
    } catch (error) {
      this._emit("error", { operation: "updateCanvas", error });
      throw error;
    }
  }

  /**
   * Find a placement containing a specific view
   * @param {string} viewId - The view configuration ID to find
   * @param {string} [canvasId] - Optional canvas ID to search (searches active canvas if not provided)
   * @returns {CanvasPlacement|null}
   */
  getPlacementForView(viewId, canvasId) {
    if (!viewId) return null;

    // If canvasId provided, search only that canvas
    if (canvasId) {
      const canvas = this._canvases.get(canvasId);
      if (!canvas?.placements) return null;

      return (
        canvas.placements.find(
          (p) =>
            p.content?.viewConfigurationId === viewId ||
            p.content?.viewId === viewId
        ) || null
      );
    }

    // Search active canvas first
    const activeCanvas = this.getActiveCanvas();
    if (activeCanvas?.placements) {
      const placement = activeCanvas.placements.find(
        (p) =>
          p.content?.viewConfigurationId === viewId ||
          p.content?.viewId === viewId
      );
      if (placement) return placement;
    }

    // Search all other canvases
    for (const canvas of this._canvases.values()) {
      if (canvas.id === this._activeCanvasId) continue; // Already checked

      const placement = canvas.placements?.find(
        (p) =>
          p.content?.viewConfigurationId === viewId ||
          p.content?.viewId === viewId
      );
      if (placement) return placement;
    }

    return null;
  }

  /**
   * Check if a view is placed on any canvas
   * @param {string} viewId - The view configuration ID
   * @returns {boolean}
   */
  isViewOnCanvas(viewId) {
    return this.getPlacementForView(viewId) !== null;
  }

  /**
   * Delete a canvas
   * @param {string} canvasId
   * @returns {Promise<void>}
   */
  async deleteCanvas(canvasId) {
    try {
      await this._fetch(`/canvases/${canvasId}`, {
        method: "DELETE",
      });

      const canvas = this._canvases.get(canvasId);
      this._canvases.delete(canvasId);

      if (this._activeCanvasId === canvasId) {
        this._activeCanvasId = null;
      }

      this._emit("canvasDeleted", { canvasId, canvas });
    } catch (error) {
      this._emit("error", { operation: "deleteCanvas", error });
      throw error;
    }
  }

  // ===========================================================================
  // PLACEMENT CRUD
  // ===========================================================================

  /**
   * Add a placement to a canvas
   * @param {string} canvasId
   * @param {Object} placementData - { row, col, rowSpan, colSpan, content }
   * @returns {Promise<CanvasPlacement>}
   */
  async addPlacement(canvasId, placementData) {
    try {
      const response = await this._fetch(`/canvases/${canvasId}/placements`, {
        method: "POST",
        body: JSON.stringify(placementData),
      });

      const data = await response.json();
      const placement = new CanvasPlacement(data);

      // Update local cache with duplicate prevention
      const canvas = this._canvases.get(canvasId);
      if (canvas) {
        const existingIdx = canvas.placements.findIndex(
          (p) => p.id === placement.id
        );
        if (existingIdx === -1) {
          canvas.placements.push(placement);
        } else {
          // Replace existing placement (shouldn't happen, but safe)
          canvas.placements[existingIdx] = placement;
        }
      }

      this._emit("placementAdded", { canvasId, placement });

      return placement;
    } catch (error) {
      this._emit("error", { operation: "addPlacement", error });
      throw error;
    }
  }

  /**
   * Update a placement (move, resize, change content)
   * @param {string} placementId
   * @param {Object} updates - { row, col, rowSpan, colSpan, content }
   * @returns {Promise<CanvasPlacement>}
   */
  async updatePlacement(placementId, updates) {
    try {
      const response = await this._fetch(
        `/canvases/placements/${placementId}`,
        {
          method: "PUT",
          body: JSON.stringify(updates),
        }
      );

      const data = await response.json();
      const placement = new CanvasPlacement(data);

      // Update local cache
      for (const canvas of this._canvases.values()) {
        const idx = canvas.placements.findIndex((p) => p.id === placementId);
        if (idx !== -1) {
          canvas.placements[idx] = placement;
          this._emit("placementUpdated", { canvasId: canvas.id, placement });
          break;
        }
      }

      return placement;
    } catch (error) {
      this._emit("error", { operation: "updatePlacement", error });
      throw error;
    }
  }

  /**
   * Move a placement to a new position
   * @param {string} placementId
   * @param {number} newRow
   * @param {number} newCol
   * @returns {Promise<CanvasPlacement>}
   */
  async movePlacement(placementId, newRow, newCol) {
    return this.updatePlacement(placementId, { row: newRow, col: newCol });
  }

  /**
   * Resize a placement
   * @param {string} placementId
   * @param {number} rowSpan
   * @param {number} colSpan
   * @returns {Promise<CanvasPlacement>}
   */
  async resizePlacement(placementId, rowSpan, colSpan) {
    return this.updatePlacement(placementId, { rowSpan, colSpan });
  }

  /**
   * Swap positions of two placements
   * @param {string} placementId1 - First placement ID
   * @param {string} placementId2 - Second placement ID
   * @returns {Promise<{placement1: CanvasPlacement, placement2: CanvasPlacement}>}
   */
  async swapPlacements(placementId1, placementId2) {
    try {
      // Find both placements
      let placement1 = null;
      let placement2 = null;
      let canvasId = null;

      for (const canvas of this._canvases.values()) {
        const p1 = canvas.placements.find((p) => p.id === placementId1);
        const p2 = canvas.placements.find((p) => p.id === placementId2);

        if (p1) placement1 = p1;
        if (p2) placement2 = p2;
        if (p1 || p2) canvasId = canvas.id;

        if (placement1 && placement2) break;
      }

      if (!placement1 || !placement2) {
        throw new Error("Could not find both placements to swap");
      }

      // Store original positions
      const pos1 = { row: placement1.row, col: placement1.col };
      const pos2 = { row: placement2.row, col: placement2.col };

      // Swap positions (update both placements)
      const [updated1, updated2] = await Promise.all([
        this.updatePlacement(placementId1, { row: pos2.row, col: pos2.col }),
        this.updatePlacement(placementId2, { row: pos1.row, col: pos1.col }),
      ]);

      log.debug(`Swapped placements: ${placementId1} <-> ${placementId2}`);

      this._emit("placementsSwapped", {
        canvasId,
        placement1: updated1,
        placement2: updated2,
      });

      return { placement1: updated1, placement2: updated2 };
    } catch (error) {
      this._emit("error", { operation: "swapPlacements", error });
      throw error;
    }
  }

  /**
   * Push placements in a direction to make room for a new placement
   * @param {string} canvasId - Canvas ID
   * @param {number} targetRow - Row to insert at
   * @param {number} targetCol - Column to insert at
   * @param {string} direction - 'up', 'down', 'left', 'right'
   * @param {Object} options - { wrap: boolean, closeLast: boolean }
   * @returns {Promise<{movedPlacements: CanvasPlacement[], expandedCanvas: boolean}>}
   */
  async pushPlacements(
    canvasId,
    targetRow,
    targetCol,
    direction,
    options = {}
  ) {
    const { wrap = false, closeLast = false } = options;

    try {
      const canvas = this._canvases.get(canvasId);
      if (!canvas) {
        throw new Error(`Canvas not found: ${canvasId}`);
      }

      const placements = canvas.placements || [];
      const movedPlacements = [];
      let expandedCanvas = false;

      // Determine which placements need to move based on direction
      // and calculate their new positions
      const placementsToMove = [];

      switch (direction) {
        case "down":
          // Push all placements at or below targetRow (in the same column) down by 1
          // Sort by row descending so we move bottom-most first (avoids collisions)
          placements
            .filter((p) => p.row >= targetRow && p.col === targetCol)
            .sort((a, b) => b.row - a.row)
            .forEach((p) => {
              placementsToMove.push({
                placement: p,
                newRow: p.row + 1,
                newCol: p.col,
              });
            });
          log.debug(
            `Push down: found ${placementsToMove.length} placements to move at col ${targetCol}, row >= ${targetRow}`
          );
          break;

        case "up":
          // Push all placements at or above targetRow (in the same column) up by 1
          // Sort by row ascending so we move top-most first
          placements
            .filter((p) => p.row <= targetRow && p.col === targetCol)
            .sort((a, b) => a.row - b.row)
            .forEach((p) => {
              placementsToMove.push({
                placement: p,
                newRow: p.row - 1,
                newCol: p.col,
              });
            });
          log.debug(
            `Push up: found ${placementsToMove.length} placements to move at col ${targetCol}, row <= ${targetRow}`
          );
          break;

        case "right":
          // Push all placements at or to the right of targetCol (in the same row) right by 1
          // Sort by col descending so we move right-most first
          placements
            .filter((p) => p.col >= targetCol && p.row === targetRow)
            .sort((a, b) => b.col - a.col)
            .forEach((p) => {
              placementsToMove.push({
                placement: p,
                newRow: p.row,
                newCol: p.col + 1,
              });
            });
          log.debug(
            `Push right: found ${placementsToMove.length} placements to move at row ${targetRow}, col >= ${targetCol}`
          );
          break;

        case "left":
          // Push all placements at or to the left of targetCol (in the same row) left by 1
          // Sort by col ascending so we move left-most first
          placements
            .filter((p) => p.col <= targetCol && p.row === targetRow)
            .sort((a, b) => a.col - b.col)
            .forEach((p) => {
              placementsToMove.push({
                placement: p,
                newRow: p.row,
                newCol: p.col - 1,
              });
            });
          log.debug(
            `Push left: found ${placementsToMove.length} placements to move at row ${targetRow}, col <= ${targetCol}`
          );
          break;
      }

      // Handle wrap option - wrap to next row/col instead of pushing off edge
      if (wrap) {
        placementsToMove.forEach((item) => {
          if (item.newRow < 0) {
            item.newRow = canvas.dimensions.rows - 1;
            item.newCol = item.newCol - 1;
          } else if (item.newRow >= canvas.dimensions.rows) {
            item.newRow = 0;
            item.newCol = item.newCol + 1;
          } else if (item.newCol < 0) {
            item.newCol = canvas.dimensions.cols - 1;
            item.newRow = item.newRow - 1;
          } else if (item.newCol >= canvas.dimensions.cols) {
            item.newCol = 0;
            item.newRow = item.newRow + 1;
          }
        });
      }

      // Handle closeLast option - remove the last placement instead of expanding
      if (closeLast && placementsToMove.length > 0) {
        // Find the placement that would be pushed off the edge
        const lastPlacement = placementsToMove.find(
          (item) =>
            item.newRow < 0 ||
            item.newRow >= canvas.dimensions.rows ||
            item.newCol < 0 ||
            item.newCol >= canvas.dimensions.cols
        );

        if (lastPlacement) {
          await this.removePlacement(lastPlacement.placement.id);
          // Remove from the move list
          const idx = placementsToMove.indexOf(lastPlacement);
          if (idx !== -1) placementsToMove.splice(idx, 1);
        }
      }

      // Check if we need to expand the canvas
      const needsExpansion = placementsToMove.some(
        (item) =>
          item.newRow >= canvas.dimensions.rows ||
          item.newCol >= canvas.dimensions.cols
      );

      if (needsExpansion && !closeLast) {
        // Expand canvas dimensions
        const newDimensions = {
          rows: Math.max(
            canvas.dimensions.rows,
            ...placementsToMove.map((item) => item.newRow + 1)
          ),
          cols: Math.max(
            canvas.dimensions.cols,
            ...placementsToMove.map((item) => item.newCol + 1)
          ),
        };

        await this.updateCanvas(canvasId, { dimensions: newDimensions });
        expandedCanvas = true;
      }

      // Filter out any placements that would go to invalid positions
      const validMoves = placementsToMove.filter(
        (item) => item.newRow >= 0 && item.newCol >= 0
      );

      // Move all placements
      const movePromises = validMoves.map((item) =>
        this.movePlacement(item.placement.id, item.newRow, item.newCol)
      );

      const moved = await Promise.all(movePromises);
      movedPlacements.push(...moved);

      log.debug(`Pushed ${movedPlacements.length} placements ${direction}`);

      this._emit("placementsPushed", {
        canvasId,
        direction,
        movedPlacements,
        expandedCanvas,
      });

      return { movedPlacements, expandedCanvas };
    } catch (error) {
      this._emit("error", { operation: "pushPlacements", error });
      throw error;
    }
  }

  // ===========================================================================
  // LAYOUT MODE OPERATIONS
  // ===========================================================================

  /**
   * Set the layout mode for a canvas
   * @param {string} canvasId
   * @param {string} layoutMode - 'grid' or 'flow'
   * @returns {Promise<WorkspaceCanvas>}
   */
  async setLayoutMode(canvasId, layoutMode) {
    return this.updateCanvas(canvasId, { layoutMode });
  }

  /**
   * Set the flow direction for a canvas
   * @param {string} canvasId
   * @param {string} flowDirection - 'row' or 'column'
   * @returns {Promise<WorkspaceCanvas>}
   */
  async setFlowDirection(canvasId, flowDirection) {
    return this.updateCanvas(canvasId, { flowDirection });
  }

  /**
   * Set the homepoint for a canvas
   * @param {string} canvasId
   * @param {number} row
   * @param {number} col
   * @returns {Promise<WorkspaceCanvas>}
   */
  async setHomepoint(canvasId, row, col) {
    return this.updateCanvas(canvasId, { homepoint: { row, col } });
  }

  /**
   * Clear the homepoint for a canvas
   * @param {string} canvasId
   * @returns {Promise<WorkspaceCanvas>}
   */
  async clearHomepoint(canvasId) {
    return this.updateCanvas(canvasId, { homepoint: null });
  }

  /**
   * Remove a placement from a canvas
   * @param {string} placementId
   * @returns {Promise<void>}
   */
  async removePlacement(placementId) {
    // OPTIMISTIC UPDATE: Remove from local cache FIRST before API call
    // This prevents race conditions where React re-renders while
    // the placement still exists in the array
    let removedPlacement = null;
    let sourceCanvasId = null;

    for (const canvas of this._canvases.values()) {
      const idx = canvas.placements.findIndex((p) => p.id === placementId);
      if (idx !== -1) {
        removedPlacement = canvas.placements.splice(idx, 1)[0];
        sourceCanvasId = canvas.id;
        // Emit immediately so React updates right away
        this._emit("placementRemoved", {
          canvasId: canvas.id,
          placement: removedPlacement,
        });
        break;
      }
    }

    // If placement wasn't found locally, nothing to do
    if (!removedPlacement) {
      log.debug(`Placement ${placementId} not found locally, skipping removal`);
      return;
    }

    // Now make the API call in the background
    try {
      await this._fetch(`/canvases/placements/${placementId}`, {
        method: "DELETE",
      });
    } catch (error) {
      // 404 means placement is already gone on server - that's fine
      if (error.message?.includes("404")) {
        log.debug(`Placement ${placementId} already removed from server`);
        return;
      }

      // For other errors, log but don't try to restore (optimistic update stands)
      // This avoids complex rollback logic and the server will eventually sync
      log.error(`Failed to delete placement ${placementId} from server:`, error);
      this._emit("error", { operation: "removePlacement", error });
    }
  }

  /**
   * Remove all placements containing a specific view
   * Used when a view is closed from the Datasets panel
   * @param {string} viewId - The view configuration ID to remove
   * @returns {Promise<void>}
   */
  async removeViewPlacements(viewId) {
    if (!viewId) return;

    // Find all placements with this viewId across all canvases
    const placementsToRemove = [];
    for (const canvas of this._canvases.values()) {
      for (const placement of canvas.placements) {
        if (placement.isView() && placement.getViewId() === viewId) {
          placementsToRemove.push(placement.id);
        }
      }
    }

    // Remove each placement
    for (const placementId of placementsToRemove) {
      try {
        await this.removePlacement(placementId);
      } catch (error) {
        console.warn(`Failed to remove placement ${placementId}:`, error);
      }
    }
  }

  // ===========================================================================
  // ACTIVE CANVAS MANAGEMENT
  // ===========================================================================

  /**
   * Set the active canvas
   * @param {string} canvasId
   */
  setActiveCanvas(canvasId) {
    const previousId = this._activeCanvasId;
    this._activeCanvasId = canvasId;

    if (previousId !== canvasId) {
      this._emit("activeCanvasChanged", {
        previousId,
        canvasId,
        canvas: this._canvases.get(canvasId),
      });
    }
  }

  /**
   * Get the active canvas
   * @returns {WorkspaceCanvas|null}
   */
  getActiveCanvas() {
    return this._activeCanvasId
      ? this._canvases.get(this._activeCanvasId)
      : null;
  }

  /**
   * Get active canvas ID
   * @returns {string|null}
   */
  getActiveCanvasId() {
    return this._activeCanvasId;
  }

  // ===========================================================================
  // FOCUSED PANE MANAGEMENT (for tile mode)
  // ===========================================================================

  /**
   * Set which pane has focus
   * A pane is a viewport into a canvas - same canvas can have multiple panes
   *
   * @param {string} paneId - Unique pane identifier
   */
  setFocusedPane(paneId) {
    const previousPaneId = this._focusedPaneId;
    this._focusedPaneId = paneId;

    if (previousPaneId !== paneId) {
      log.debug(`CanvasManager: Focused pane changed: ${previousPaneId} -> ${paneId}`);
      this._emit("focusedPaneChanged", {
        paneId,
        previousPaneId,
      });
    }
  }

  /**
   * Get the currently focused pane ID
   * @returns {string|null}
   */
  getFocusedPaneId() {
    return this._focusedPaneId;
  }

  /**
   * Check if a specific pane has focus
   * @param {string} paneId
   * @returns {boolean}
   */
  isPaneFocused(paneId) {
    return this._focusedPaneId === paneId;
  }

  // ===========================================================================
  // QUERIES
  // ===========================================================================

  /**
   * Get a canvas from cache
   * @param {string} canvasId
   * @returns {WorkspaceCanvas|null}
   */
  getCanvas(canvasId) {
    return this._canvases.get(canvasId) || null;
  }

  /**
   * Get all cached canvases
   * @returns {WorkspaceCanvas[]}
   */
  getAllCanvases() {
    return Array.from(this._canvases.values());
  }

  /**
   * Get canvases for a project
   * @param {string} projectId
   * @returns {WorkspaceCanvas[]}
   */
  getCanvasesForProject(projectId) {
    return this.getAllCanvases().filter((c) => c.projectId === projectId);
  }

  /**
   * Get placements visible in viewport
   * @param {string} canvasId
   * @param {Object} viewport - { row, col, rows, cols }
   * @returns {CanvasPlacement[]}
   */
  getVisiblePlacements(canvasId, viewport) {
    const canvas = this._canvases.get(canvasId);
    if (!canvas) return [];

    return canvas.getPlacementsInViewport(viewport);
  }

  /**
   * Find a placement by ID across all canvases
   * @param {string} placementId
   * @returns {{ canvas: WorkspaceCanvas, placement: CanvasPlacement }|null}
   */
  findPlacement(placementId) {
    for (const canvas of this._canvases.values()) {
      const placement = canvas.getPlacementById(placementId);
      if (placement) {
        return { canvas, placement };
      }
    }
    return null;
  }

  // ===========================================================================
  // WEBSOCKET BROADCAST HANDLING
  // ===========================================================================

  /**
   * Handle server broadcast events
   * Called by serverSync service when canvas-related events arrive
   * @param {Object} message - { type, canvasId, placement, ... }
   */
  handleServerBroadcast(message) {
    log.debug("CanvasManager received broadcast:", message.type);

    switch (message.type) {
      case "canvas:created":
        this._handleCanvasCreated(message);
        break;

      case "canvas:updated":
        this._handleCanvasUpdated(message);
        break;

      case "canvas:deleted":
        this._handleCanvasDeleted(message);
        break;

      case "placement:added":
        this._handlePlacementAdded(message);
        break;

      case "placement:updated":
        this._handlePlacementUpdated(message);
        break;

      case "placement:removed":
        this._handlePlacementRemoved(message);
        break;

      default:
        log.warn("CanvasManager: Unknown broadcast type", message.type);
    }
  }

  _handleCanvasCreated(message) {
    const canvas = new WorkspaceCanvas(message.canvas);
    this._canvases.set(canvas.id, canvas);
    this._emit("canvasCreated", { canvas, source: "broadcast" });
  }

  _handleCanvasUpdated(message) {
    const canvas = this._canvases.get(message.canvasId);
    if (canvas) {
      Object.assign(canvas, message.updates);
      this._emit("canvasUpdated", {
        canvas,
        updates: message.updates,
        source: "broadcast",
      });
    }
  }

  _handleCanvasDeleted(message) {
    const canvas = this._canvases.get(message.canvasId);
    this._canvases.delete(message.canvasId);
    this._emit("canvasDeleted", {
      canvasId: message.canvasId,
      canvas,
      source: "broadcast",
    });
  }

  _handlePlacementAdded(message) {
    const canvas = this._canvases.get(message.canvasId);
    if (canvas) {
      const placement = new CanvasPlacement(message.placement);
      // Check for duplicate - don't add if placement with same ID already exists
      const existingIdx = canvas.placements.findIndex(
        (p) => p.id === placement.id
      );
      if (existingIdx === -1) {
        canvas.placements.push(placement);
        this._emit("placementAdded", {
          canvasId: message.canvasId,
          placement,
          source: "broadcast",
        });
      } else {
        // Update existing placement instead
        canvas.placements[existingIdx] = placement;
        this._emit("placementUpdated", {
          canvasId: message.canvasId,
          placement,
          source: "broadcast",
        });
      }
    }
  }

  _handlePlacementUpdated(message) {
    const canvas = this._canvases.get(message.canvasId);
    if (canvas) {
      const idx = canvas.placements.findIndex(
        (p) => p.id === message.placement.id
      );
      if (idx !== -1) {
        canvas.placements[idx] = new CanvasPlacement(message.placement);
        this._emit("placementUpdated", {
          canvasId: message.canvasId,
          placement: canvas.placements[idx],
          source: "broadcast",
        });
      }
    }
  }

  _handlePlacementRemoved(message) {
    const canvas = this._canvases.get(message.canvasId);
    if (canvas) {
      const idx = canvas.placements.findIndex(
        (p) => p.id === message.placementId
      );
      if (idx !== -1) {
        const removed = canvas.placements.splice(idx, 1)[0];
        this._emit("placementRemoved", {
          canvasId: message.canvasId,
          placement: removed,
          source: "broadcast",
        });
      }
    }
  }

  // ===========================================================================
  // CONNECTION STATE MANAGEMENT
  // ===========================================================================

  /**
   * Get current connection state
   * @returns {'connected'|'disconnected'|'reconnecting'}
   */
  getConnectionState() {
    return this._connectionState;
  }

  /**
   * Check if connected to server
   * @returns {boolean}
   */
  isConnected() {
    return this._connectionState === "connected";
  }

  /**
   * Get last error if any
   * @returns {Error|null}
   */
  getLastError() {
    return this._lastError;
  }

  /**
   * Set connection state and emit event
   * @param {'connected'|'disconnected'|'reconnecting'} state
   * @param {Error|null} error
   */
  _setConnectionState(state, error = null) {
    const previous = this._connectionState;
    this._connectionState = state;
    this._lastError = error;

    if (previous !== state) {
      log.info(
        `CanvasManager: Connection state changed ${previous} -> ${state}`
      );
      this._emit("connectionStateChanged", {
        state,
        previousState: previous,
        error,
        isConnected: state === "connected",
      });
    }
  }

  /**
   * Handle successful connection
   */
  handleConnected() {
    this._retryCount = 0;
    this._setConnectionState("connected");
  }

  /**
   * Handle disconnection
   * @param {Error} error
   */
  handleDisconnected(error) {
    this._setConnectionState("disconnected", error);
  }

  /**
   * Handle reconnection attempt
   */
  handleReconnecting() {
    this._retryCount++;
    this._setConnectionState("reconnecting");
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Get current user ID from session manager
   */
  _getUserId() {
    const userId = this._sessionManager?.getUserId?.();
    if (userId) {
      return userId;
    }
    // Log warning if no userId available - this shouldn't happen after auth
    log.warn("No userId available from sessionManager");
    return null;
  }

  /**
   * Get auth token
   */
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

  /**
   * Make authenticated API request with connection state tracking
   */
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

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Track successful connection
      if (this._connectionState !== "connected") {
        this._setConnectionState("connected");
      }

      if (!response.ok) {
        const error = new Error(
          `API error: ${response.status} ${response.statusText}`
        );
        error.status = response.status;
        error.response = response;
        throw error;
      }

      return response;
    } catch (error) {
      // Network errors indicate disconnection
      if (error.name === "TypeError" || !error.status) {
        this._setConnectionState("disconnected", error);
      }
      throw error;
    }
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Clear all cached canvases
   */
  clearCache() {
    this._canvases.clear();
    this._activeCanvasId = null;
  }

  /**
   * Dispose of the manager
   */
  dispose() {
    this._canvases.clear();
    super.dispose();
  }
}

// Singleton instance
export const canvasManager = new CanvasManager();
