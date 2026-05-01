// src/core/data/models/WorkspaceCanvas.js
// Represents an infinite pinboard canvas with view placements
//
// ARCHITECTURE:
// - Canvas is an infinite 2D grid that users navigate via viewport
// - Only views within the viewport are rendered (GPU optimization)
// - Server is source of truth - all canvas state persisted via API
//
// Ownership Types:
// - 'personal': User's private workspace (only they can see)
// - 'breakout': Shared within a breakout room (subset of team)
// - 'project': Shared with all project members

import { CanvasPlacement } from "./CanvasPlacement.js";
import {
  LAYOUT_MODES,
  FLOW_DIRECTIONS,
  FlowLayoutEngine,
  calculateOptimalGrid,
  reflowPlacements,
} from "../utils/flowLayoutEngine.js";

// Re-export layout constants for convenience
export { LAYOUT_MODES, FLOW_DIRECTIONS };

/**
 * WorkspaceCanvas - The infinite pinboard containing view placements
 *
 * Key Concepts:
 * - Dimensions grow on demand (add rows/columns)
 * - Placements can span multiple cells (1-3 rows, 1-3 cols)
 * - Viewport determines which placements are rendered
 * - Supports Grid (manual) and Flow (auto-arrange) layout modes
 */
export class WorkspaceCanvas {
  /**
   * @param {Object} options - Accepts both client format (camelCase) and server format (snake_case)
   * @param {string} options.id - Server-generated ID
   * @param {string} options.projectId - Parent project ID (client format)
   * @param {string} options.project_id - Parent project ID (server format)
   * @param {string} options.name - Canvas display name
   * @param {Object} options.dimensions - { rows, cols } current grid size
   * @param {Object} options.ownership - { type, ownerId }
   * @param {Array} options.placements - Array of CanvasPlacement objects
   * @param {string} options.layoutMode - 'grid' or 'flow' (client format)
   * @param {string} options.layout_mode - 'grid' or 'flow' (server format)
   * @param {string} options.flowDirection - 'row' or 'column' (client format)
   * @param {string} options.flow_direction - 'row' or 'column' (server format)
   * @param {Object} options.homepoint - { row, col } saved homepoint position
   * @param {string} options.createdBy - User ID who created this (client format)
   * @param {string} options.created_by - User ID who created this (server format)
   * @param {string} options.createdAt - ISO timestamp (client format)
   * @param {string} options.created_at - ISO timestamp (server format)
   * @param {string} options.updatedAt - ISO timestamp (client format)
   * @param {string} options.updated_at - ISO timestamp (server format)
   */
  constructor(options = {}) {
    // Handle both camelCase (client) and snake_case (server) formats
    const {
      id = null,
      projectId,
      project_id,
      name = "Untitled Workspace",
      dimensions = { rows: 3, cols: 3 },
      ownership = { type: "personal", ownerId: null },
      placements = [],
      layoutMode,
      layout_mode,
      flowDirection,
      flow_direction,
      homepoint = null,
      createdBy,
      created_by,
      createdAt,
      created_at,
      updatedAt,
      updated_at,
    } = options;

    this.id = id;
    this.projectId = projectId ?? project_id;
    this.name = name;

    // Handle dimensions - could be string (from DB) or object
    if (typeof dimensions === "string") {
      try {
        this.dimensions = JSON.parse(dimensions);
      } catch {
        this.dimensions = { rows: 3, cols: 3 };
      }
    } else {
      this.dimensions = { ...dimensions };
    }

    // Handle ownership - could be string (from DB) or object
    if (typeof ownership === "string") {
      try {
        this.ownership = JSON.parse(ownership);
      } catch {
        this.ownership = { type: "personal", ownerId: null };
      }
    } else {
      this.ownership = { ...ownership };
    }

    // Convert and deduplicate placements by ID
    const placementMap = new Map();
    placements.forEach((p) => {
      const placement =
        p instanceof CanvasPlacement ? p : new CanvasPlacement(p);
      if (placement.id) {
        // Dedupe by ID - later entries override earlier ones
        placementMap.set(placement.id, placement);
      } else {
        // Placements without ID (new/unsaved) - use position as key
        const posKey = `pos-${placement.row}-${placement.col}`;
        placementMap.set(posKey, placement);
      }
    });
    this.placements = Array.from(placementMap.values());
    this.layoutMode = layoutMode ?? layout_mode ?? LAYOUT_MODES.FLOW;
    this.flowDirection = flowDirection ?? flow_direction ?? FLOW_DIRECTIONS.ROW;

    // Handle homepoint - could be string (from DB) or object
    if (typeof homepoint === "string") {
      try {
        this.homepoint = JSON.parse(homepoint);
      } catch {
        this.homepoint = null;
      }
    } else {
      this.homepoint = homepoint ? { ...homepoint } : null;
    }

    this.createdBy = createdBy ?? created_by;
    this.createdAt = createdAt ?? created_at;
    this.updatedAt = updatedAt ?? updated_at;

    // Initialize flow layout engine
    this._flowEngine = new FlowLayoutEngine({
      direction: this.flowDirection,
      useSpanning: true,
    });
  }

  // ===========================================================================
  // DIMENSION MANAGEMENT
  // ===========================================================================

  /**
   * Add a row to the canvas
   * @returns {number} New row count
   */
  addRow() {
    this.dimensions.rows++;
    return this.dimensions.rows;
  }

  /**
   * Add a column to the canvas
   * @returns {number} New column count
   */
  addColumn() {
    this.dimensions.cols++;
    return this.dimensions.cols;
  }

  /**
   * Remove last row (if empty)
   * @returns {boolean} True if removed, false if row has placements
   */
  removeRow() {
    const lastRow = this.dimensions.rows - 1;
    const hasPlacementsInRow = this.placements.some(
      (p) => p.row <= lastRow && p.row + (p.rowSpan || 1) > lastRow
    );

    if (!hasPlacementsInRow && this.dimensions.rows > 1) {
      this.dimensions.rows--;
      return true;
    }
    return false;
  }

  /**
   * Remove last column (if empty)
   * @returns {boolean} True if removed, false if column has placements
   */
  removeColumn() {
    const lastCol = this.dimensions.cols - 1;
    const hasPlacementsInCol = this.placements.some(
      (p) => p.col <= lastCol && p.col + (p.colSpan || 1) > lastCol
    );

    if (!hasPlacementsInCol && this.dimensions.cols > 1) {
      this.dimensions.cols--;
      return true;
    }
    return false;
  }

  /**
   * Set canvas dimensions
   * @param {number} rows
   * @param {number} cols
   */
  setDimensions(rows, cols) {
    this.dimensions.rows = Math.max(1, rows);
    this.dimensions.cols = Math.max(1, cols);
  }

  // ===========================================================================
  // PLACEMENT QUERIES
  // ===========================================================================

  /**
   * Get placement at a specific grid position (considering spans)
   * @param {number} row
   * @param {number} col
   * @returns {CanvasPlacement|null}
   */
  getPlacementAt(row, col) {
    return (
      this.placements.find(
        (p) =>
          row >= p.row &&
          row < p.row + (p.rowSpan || 1) &&
          col >= p.col &&
          col < p.col + (p.colSpan || 1)
      ) || null
    );
  }

  /**
   * Get placement by ID
   * @param {string} placementId
   * @returns {CanvasPlacement|null}
   */
  getPlacementById(placementId) {
    return this.placements.find((p) => p.id === placementId) || null;
  }

  /**
   * Check if a position is available for a placement
   * @param {number} row - Starting row
   * @param {number} col - Starting column
   * @param {number} rowSpan - Height in cells (1-3)
   * @param {number} colSpan - Width in cells (1-3)
   * @param {string} excludePlacementId - Placement to exclude (for moving)
   * @returns {boolean}
   */
  isPositionAvailable(
    row,
    col,
    rowSpan = 1,
    colSpan = 1,
    excludePlacementId = null
  ) {
    // Check bounds
    if (row < 0 || col < 0) return false;
    if (row + rowSpan > this.dimensions.rows) return false;
    if (col + colSpan > this.dimensions.cols) return false;

    // Check for overlaps
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        const existing = this.getPlacementAt(r, c);
        if (existing && existing.id !== excludePlacementId) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get placements visible within a viewport
   * @param {Object} viewport - { row, col, rows, cols }
   * @returns {CanvasPlacement[]}
   */
  getPlacementsInViewport(viewport) {
    return this.placements.filter((p) => p.isInViewport(viewport));
  }

  /**
   * Find first available position for a new placement
   * @param {number} rowSpan - Desired height
   * @param {number} colSpan - Desired width
   * @returns {{ row: number, col: number }|null}
   */
  findAvailablePosition(rowSpan = 1, colSpan = 1) {
    for (let row = 0; row <= this.dimensions.rows - rowSpan; row++) {
      for (let col = 0; col <= this.dimensions.cols - colSpan; col++) {
        if (this.isPositionAvailable(row, col, rowSpan, colSpan)) {
          return { row, col };
        }
      }
    }

    // No space found - suggest expanding canvas
    return null;
  }

  // ===========================================================================
  // PLACEMENT MANAGEMENT
  // ===========================================================================

  /**
   * Add a placement to the canvas
   * @param {CanvasPlacement|Object} placement
   * @returns {CanvasPlacement}
   */
  addPlacement(placement) {
    const p =
      placement instanceof CanvasPlacement
        ? placement
        : new CanvasPlacement(placement);

    if (!this.isPositionAvailable(p.row, p.col, p.rowSpan, p.colSpan)) {
      throw new Error(`Position (${p.row}, ${p.col}) is not available`);
    }

    this.placements.push(p);
    return p;
  }

  /**
   * Remove a placement from the canvas
   * @param {string} placementId
   * @returns {CanvasPlacement|null} The removed placement
   */
  removePlacement(placementId) {
    const index = this.placements.findIndex((p) => p.id === placementId);
    if (index !== -1) {
      return this.placements.splice(index, 1)[0];
    }
    return null;
  }

  /**
   * Move a placement to a new position
   * @param {string} placementId
   * @param {number} newRow
   * @param {number} newCol
   * @returns {boolean} Success
   */
  movePlacement(placementId, newRow, newCol) {
    const placement = this.getPlacementById(placementId);
    if (!placement) return false;

    if (
      !this.isPositionAvailable(
        newRow,
        newCol,
        placement.rowSpan,
        placement.colSpan,
        placementId
      )
    ) {
      return false;
    }

    placement.row = newRow;
    placement.col = newCol;
    return true;
  }

  /**
   * Resize a placement
   * @param {string} placementId
   * @param {number} newRowSpan
   * @param {number} newColSpan
   * @returns {boolean} Success
   */
  resizePlacement(placementId, newRowSpan, newColSpan) {
    const placement = this.getPlacementById(placementId);
    if (!placement) return false;

    // Clamp to 1-3 range
    newRowSpan = Math.max(1, Math.min(3, newRowSpan));
    newColSpan = Math.max(1, Math.min(3, newColSpan));

    if (
      !this.isPositionAvailable(
        placement.row,
        placement.col,
        newRowSpan,
        newColSpan,
        placementId
      )
    ) {
      return false;
    }

    placement.rowSpan = newRowSpan;
    placement.colSpan = newColSpan;
    return true;
  }

  // ===========================================================================
  // LAYOUT MODE MANAGEMENT
  // ===========================================================================

  /**
   * Set the layout mode
   * @param {string} mode - 'grid' or 'flow'
   */
  setLayoutMode(mode) {
    if (mode !== LAYOUT_MODES.GRID && mode !== LAYOUT_MODES.FLOW) {
      throw new Error(`Invalid layout mode: ${mode}`);
    }
    this.layoutMode = mode;

    // If switching to flow mode, trigger reflow
    if (mode === LAYOUT_MODES.FLOW) {
      this.reflowPlacements();
    }
  }

  /**
   * Set the flow direction
   * @param {string} direction - 'row' or 'column'
   */
  setFlowDirection(direction) {
    if (
      direction !== FLOW_DIRECTIONS.ROW &&
      direction !== FLOW_DIRECTIONS.COLUMN
    ) {
      throw new Error(`Invalid flow direction: ${direction}`);
    }
    this.flowDirection = direction;
    this._flowEngine.setDirection(direction);

    // If in flow mode, trigger reflow
    if (this.layoutMode === LAYOUT_MODES.FLOW) {
      this.reflowPlacements();
    }
  }

  /**
   * Check if canvas is in grid mode
   */
  isGridMode() {
    return this.layoutMode === LAYOUT_MODES.GRID;
  }

  /**
   * Check if canvas is in flow mode
   */
  isFlowMode() {
    return this.layoutMode === LAYOUT_MODES.FLOW;
  }

  /**
   * Reflow all placements according to current flow settings
   * @returns {Array} Updated placement positions
   */
  reflowPlacements() {
    if (this.layoutMode !== LAYOUT_MODES.FLOW) {
      return [];
    }

    const viewPlacements = this.placements.filter((p) => p.isView());
    const updates = reflowPlacements(
      viewPlacements.map((p) => ({
        id: p.id,
        viewConfigurationId: p.getViewId(),
      })),
      this.flowDirection
    );

    // Apply updates to placements
    updates.forEach((update) => {
      const placement = this.getPlacementById(update.id);
      if (placement) {
        placement.row = update.row;
        placement.col = update.col;
        placement.rowSpan = update.rowSpan;
        placement.colSpan = update.colSpan;
      }
    });

    // Update dimensions to optimal size
    const viewCount = viewPlacements.length;
    if (viewCount > 0) {
      const optimal = calculateOptimalGrid(viewCount);
      this.dimensions.rows = Math.max(this.dimensions.rows, optimal.rows);
      this.dimensions.cols = Math.max(this.dimensions.cols, optimal.cols);
    }

    return updates;
  }

  /**
   * Add a view placement in flow mode
   * @param {string} viewConfigurationId - The view to add
   * @returns {CanvasPlacement} The created placement
   */
  addViewInFlowMode(viewConfigurationId) {
    const viewCount = this.placements.filter((p) => p.isView()).length;
    const nextPos = this._flowEngine.getNextPosition(viewCount);

    // Expand grid if needed
    if (nextPos.needsExpansion && nextPos.newDimensions) {
      this.dimensions.rows = Math.max(
        this.dimensions.rows,
        nextPos.newDimensions.rows
      );
      this.dimensions.cols = Math.max(
        this.dimensions.cols,
        nextPos.newDimensions.cols
      );
    }

    const placement = new CanvasPlacement({
      row: nextPos.row,
      col: nextPos.col,
      rowSpan: 1,
      colSpan: 1,
      content: {
        type: "view",
        viewConfigurationId,
      },
    });

    this.placements.push(placement);

    // Trigger reflow to handle special cases (like 3 views)
    this.reflowPlacements();

    return placement;
  }

  /**
   * Remove a placement and reflow if in flow mode
   * @param {string} placementId
   * @returns {CanvasPlacement|null}
   */
  removePlacementWithReflow(placementId) {
    const removed = this.removePlacement(placementId);

    if (removed && this.layoutMode === LAYOUT_MODES.FLOW) {
      this.reflowPlacements();
    }

    return removed;
  }

  // ===========================================================================
  // HOMEPOINT MANAGEMENT
  // ===========================================================================

  /**
   * Set the homepoint position
   * @param {number} row
   * @param {number} col
   */
  setHomepoint(row, col) {
    this.homepoint = { row, col };
  }

  /**
   * Clear the homepoint
   */
  clearHomepoint() {
    this.homepoint = null;
  }

  /**
   * Check if homepoint is set
   */
  hasHomepoint() {
    return this.homepoint !== null;
  }

  /**
   * Get the homepoint position
   * @returns {{ row: number, col: number }|null}
   */
  getHomepoint() {
    return this.homepoint ? { ...this.homepoint } : null;
  }

  // ===========================================================================
  // OWNERSHIP & SHARING
  // ===========================================================================

  /**
   * Check if canvas is personal workspace
   */
  isPersonal() {
    return this.ownership.type === "personal";
  }

  /**
   * Check if canvas is a breakout room workspace
   */
  isBreakout() {
    return this.ownership.type === "breakout";
  }

  /**
   * Check if canvas is the project-wide shared workspace
   */
  isProjectRoom() {
    return this.ownership.type === "project";
  }

  /**
   * Check if user can edit this canvas
   * @param {string} userId
   * @param {string[]} userBreakoutRooms - IDs of breakout rooms user belongs to
   * @returns {boolean}
   */
  canEdit(userId, userBreakoutRooms = []) {
    switch (this.ownership.type) {
      case "personal":
        return this.ownership.ownerId === userId;
      case "breakout":
        return userBreakoutRooms.includes(this.ownership.ownerId);
      case "project":
        return true; // All project members can edit project room
      default:
        return false;
    }
  }

  // ===========================================================================
  // SERIALIZATION
  // ===========================================================================

  /**
   * Convert to plain object for API/storage
   */
  toJSON() {
    return {
      id: this.id,
      projectId: this.projectId,
      name: this.name,
      dimensions: { ...this.dimensions },
      ownership: { ...this.ownership },
      placements: this.placements.map((p) => p.toJSON()),
      layoutMode: this.layoutMode,
      flowDirection: this.flowDirection,
      homepoint: this.homepoint ? { ...this.homepoint } : null,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create from plain object
   * @param {Object} data
   * @returns {WorkspaceCanvas}
   */
  static fromJSON(data) {
    return new WorkspaceCanvas(data);
  }

  /**
   * Clone the canvas (creates new instance with same data)
   * @returns {WorkspaceCanvas}
   */
  clone() {
    return new WorkspaceCanvas({
      ...this.toJSON(),
      id: null, // New canvas should get new ID from server
      placements: this.placements.map((p) => ({
        ...p.toJSON(),
        id: null, // New placements should get new IDs
      })),
    });
  }
}
