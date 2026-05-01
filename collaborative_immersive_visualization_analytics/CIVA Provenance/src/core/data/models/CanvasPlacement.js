// src/core/data/models/CanvasPlacement.js
// A positioned item on the canvas (view, notes, image, or empty slot)
//
// ARCHITECTURE:
// - Placements define POSITION on canvas, not the content itself
// - Content is referenced by ID (viewConfigurationId, notesBlockId, etc.)
// - Placements can span 1-3 rows and 1-3 columns
// - Server generates placement IDs for audit/collaboration

/**
 * Content types for canvas placements
 */
export const PlacementContentType = {
  VIEW: "view", // A ViewConfiguration
  NOTES: "notes", // A NotesBlock (markdown notes)
  IMAGE: "image", // An ImageBlock (reference image)
  SUBSET: "subset", // A Subset (focus group of views)
  EMPTY: "empty", // Empty slot placeholder
};

/**
 * CanvasPlacement - A positioned item on the workspace canvas
 *
 * Key Concepts:
 * - Position defined by row/col (top-left corner)
 * - Span defined by rowSpan/colSpan (1-3 each, max 3×3)
 * - Content is a union type referencing external entities
 */
export class CanvasPlacement {
  /**
   * @param {Object} options - Accepts both client format (row, col, content) and server format (row_index, col_index, content_type, content_id)
   * @param {string} options.id - Server-generated placement ID
   * @param {number} options.row - Grid row (0-indexed, client format)
   * @param {number} options.row_index - Grid row (0-indexed, server format)
   * @param {number} options.col - Grid column (0-indexed, client format)
   * @param {number} options.col_index - Grid column (0-indexed, server format)
   * @param {number} options.rowSpan - Height in cells (1-3, client format)
   * @param {number} options.row_span - Height in cells (1-3, server format)
   * @param {number} options.colSpan - Width in cells (1-3, client format)
   * @param {number} options.col_span - Width in cells (1-3, server format)
   * @param {Object} options.content - Content definition { type, ...ids } (client format)
   * @param {string} options.content_type - Content type (server format)
   * @param {string} options.content_id - Content reference ID (server format)
   * @param {string[]} options.subsetIds - Subsets that include this placement
   */
  constructor(options = {}) {
    this.id = options.id || null;

    // Handle both client (row, col) and server (row_index, col_index) formats
    this.row = options.row ?? options.row_index ?? 0;
    this.col = options.col ?? options.col_index ?? 0;
    this.rowSpan = Math.min(
      3,
      Math.max(1, options.rowSpan ?? options.row_span ?? 1)
    );
    this.colSpan = Math.min(
      3,
      Math.max(1, options.colSpan ?? options.col_span ?? 1)
    );

    // Handle both client (content object) and server (content_type, content_id) formats
    if (options.content && typeof options.content === "object") {
      // Client format: { content: { type: 'view', viewConfigurationId: '...' } }
      this.content = { ...options.content };
    } else {
      // Server format: { content_type: 'view', content_id: '...' }
      const contentType =
        options.content_type ||
        options.contentType ||
        PlacementContentType.EMPTY;
      const contentId = options.content_id || options.contentId || null;

      switch (contentType) {
        case "view":
        case PlacementContentType.VIEW:
          this.content = {
            type: PlacementContentType.VIEW,
            viewConfigurationId: contentId,
          };
          break;
        case "note": // DB stores 'note' (singular)
        case "notes":
        case PlacementContentType.NOTES:
          this.content = {
            type: PlacementContentType.NOTES,
            notesBlockId: contentId,
          };
          break;
        case "image":
        case PlacementContentType.IMAGE:
          this.content = {
            type: PlacementContentType.IMAGE,
            imageBlockId: contentId,
          };
          break;
        case "subset":
        case PlacementContentType.SUBSET:
          this.content = {
            type: PlacementContentType.SUBSET,
            subsetId: contentId,
          };
          break;
        default:
          this.content = { type: PlacementContentType.EMPTY };
      }
    }

    this.subsetIds = [...(options.subsetIds || options.subset_ids || [])];
  }

  // ===========================================================================
  // VIEWPORT & POSITION QUERIES
  // ===========================================================================

  /**
   * Check if this placement is visible within a viewport
   * @param {Object} viewport - { row, col, rows, cols }
   * @returns {boolean}
   */
  isInViewport(viewport) {
    const pEndRow = this.row + this.rowSpan;
    const pEndCol = this.col + this.colSpan;
    const vEndRow = viewport.row + viewport.rows;
    const vEndCol = viewport.col + viewport.cols;

    // Check for overlap (not just containment)
    return (
      this.row < vEndRow &&
      pEndRow > viewport.row &&
      this.col < vEndCol &&
      pEndCol > viewport.col
    );
  }

  /**
   * Get the bounding box of this placement
   * @returns {{ startRow, startCol, endRow, endCol }}
   */
  getBounds() {
    return {
      startRow: this.row,
      startCol: this.col,
      endRow: this.row + this.rowSpan,
      endCol: this.col + this.colSpan,
    };
  }

  /**
   * Get center position (for layout calculations)
   * @returns {{ row: number, col: number }}
   */
  getCenter() {
    return {
      row: this.row + this.rowSpan / 2,
      col: this.col + this.colSpan / 2,
    };
  }

  /**
   * Check if this placement overlaps with another
   * @param {CanvasPlacement} other
   * @returns {boolean}
   */
  overlaps(other) {
    const a = this.getBounds();
    const b = other.getBounds();

    return (
      a.startRow < b.endRow &&
      a.endRow > b.startRow &&
      a.startCol < b.endCol &&
      a.endCol > b.startCol
    );
  }

  /**
   * Check if a grid cell is within this placement's bounds
   * @param {number} row
   * @param {number} col
   * @returns {boolean}
   */
  containsCell(row, col) {
    return (
      row >= this.row &&
      row < this.row + this.rowSpan &&
      col >= this.col &&
      col < this.col + this.colSpan
    );
  }

  // ===========================================================================
  // CONTENT TYPE HELPERS
  // ===========================================================================

  /**
   * Get the content type
   * @returns {string}
   */
  getContentType() {
    return this.content.type;
  }

  /**
   * Check if placement holds a view
   */
  isView() {
    return this.content.type === PlacementContentType.VIEW;
  }

  /**
   * Check if placement holds notes
   */
  isNotes() {
    return this.content.type === PlacementContentType.NOTES;
  }

  /**
   * Check if placement holds an image
   */
  isImage() {
    return this.content.type === PlacementContentType.IMAGE;
  }

  /**
   * Check if placement holds a subset
   */
  isSubset() {
    return this.content.type === PlacementContentType.SUBSET;
  }

  /**
   * Check if placement is empty
   */
  isEmpty() {
    return this.content.type === PlacementContentType.EMPTY;
  }

  /**
   * Get the view ID (if this is a view placement)
   * @returns {string|null}
   */
  getViewId() {
    return this.isView() ? this.content.viewConfigurationId : null;
  }

  /**
   * Get the notes block ID (if this is a notes placement)
   * @returns {string|null}
   */
  getNotesId() {
    return this.isNotes() ? this.content.notesBlockId : null;
  }

  /**
   * Get the image block ID (if this is an image placement)
   * @returns {string|null}
   */
  getImageId() {
    return this.isImage() ? this.content.imageBlockId : null;
  }

  /**
   * Get the subset ID (if this is a subset placement)
   * @returns {string|null}
   */
  getSubsetId() {
    return this.isSubset() ? this.content.subsetId : null;
  }

  /**
   * Get the content reference ID (regardless of type)
   * @returns {string|null}
   */
  getContentId() {
    switch (this.content.type) {
      case PlacementContentType.VIEW:
        return this.content.viewConfigurationId;
      case PlacementContentType.NOTES:
        return this.content.notesBlockId;
      case PlacementContentType.IMAGE:
        return this.content.imageBlockId;
      case PlacementContentType.SUBSET:
        return this.content.subsetId;
      default:
        return null;
    }
  }

  // ===========================================================================
  // CONTENT SETTERS
  // ===========================================================================

  /**
   * Set content to a view
   * @param {string} viewConfigurationId
   */
  setView(viewConfigurationId) {
    this.content = {
      type: PlacementContentType.VIEW,
      viewConfigurationId,
    };
  }

  /**
   * Set content to notes
   * @param {string} notesBlockId
   */
  setNotes(notesBlockId) {
    this.content = {
      type: PlacementContentType.NOTES,
      notesBlockId,
    };
  }

  /**
   * Set content to an image
   * @param {string} imageBlockId
   */
  setImage(imageBlockId) {
    this.content = {
      type: PlacementContentType.IMAGE,
      imageBlockId,
    };
  }

  /**
   * Set content to a subset
   * @param {string} subsetId
   */
  setSubset(subsetId) {
    this.content = {
      type: PlacementContentType.SUBSET,
      subsetId,
    };
  }

  /**
   * Clear content (set to empty)
   */
  clearContent() {
    this.content = { type: PlacementContentType.EMPTY };
  }

  // ===========================================================================
  // SUBSET MANAGEMENT
  // ===========================================================================

  /**
   * Add to a subset
   * @param {string} subsetId
   */
  addToSubset(subsetId) {
    if (!this.subsetIds.includes(subsetId)) {
      this.subsetIds.push(subsetId);
    }
  }

  /**
   * Remove from a subset
   * @param {string} subsetId
   */
  removeFromSubset(subsetId) {
    const index = this.subsetIds.indexOf(subsetId);
    if (index !== -1) {
      this.subsetIds.splice(index, 1);
    }
  }

  /**
   * Check if placement is in a subset
   * @param {string} subsetId
   * @returns {boolean}
   */
  isInSubset(subsetId) {
    return this.subsetIds.includes(subsetId);
  }

  // ===========================================================================
  // SIZING
  // ===========================================================================

  /**
   * Resize the placement
   * @param {number} rowSpan
   * @param {number} colSpan
   */
  resize(rowSpan, colSpan) {
    this.rowSpan = Math.min(3, Math.max(1, rowSpan));
    this.colSpan = Math.min(3, Math.max(1, colSpan));
  }

  /**
   * Move the placement
   * @param {number} row
   * @param {number} col
   */
  moveTo(row, col) {
    this.row = row;
    this.col = col;
  }

  /**
   * Get cell count (for layout calculations)
   * @returns {number}
   */
  getCellCount() {
    return this.rowSpan * this.colSpan;
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
      row: this.row,
      col: this.col,
      rowSpan: this.rowSpan,
      colSpan: this.colSpan,
      content: { ...this.content },
      subsetIds: [...this.subsetIds],
    };
  }

  /**
   * Create from plain object
   * @param {Object} data
   * @returns {CanvasPlacement}
   */
  static fromJSON(data) {
    return new CanvasPlacement(data);
  }

  /**
   * Clone the placement
   * @returns {CanvasPlacement}
   */
  clone() {
    return new CanvasPlacement(this.toJSON());
  }

  // ===========================================================================
  // FACTORY METHODS
  // ===========================================================================

  /**
   * Create a view placement
   * @param {string} viewConfigurationId
   * @param {number} row
   * @param {number} col
   * @param {Object} options - { rowSpan, colSpan }
   * @returns {CanvasPlacement}
   */
  static createViewPlacement(viewConfigurationId, row, col, options = {}) {
    return new CanvasPlacement({
      row,
      col,
      rowSpan: options.rowSpan || 1,
      colSpan: options.colSpan || 1,
      content: {
        type: PlacementContentType.VIEW,
        viewConfigurationId,
      },
    });
  }

  /**
   * Create a notes placement
   * @param {string} notesBlockId
   * @param {number} row
   * @param {number} col
   * @param {Object} options
   * @returns {CanvasPlacement}
   */
  static createNotesPlacement(notesBlockId, row, col, options = {}) {
    return new CanvasPlacement({
      row,
      col,
      rowSpan: options.rowSpan || 1,
      colSpan: options.colSpan || 1,
      content: {
        type: PlacementContentType.NOTES,
        notesBlockId,
      },
    });
  }

  /**
   * Create an image placement
   * @param {string} imageBlockId
   * @param {number} row
   * @param {number} col
   * @param {Object} options
   * @returns {CanvasPlacement}
   */
  static createImagePlacement(imageBlockId, row, col, options = {}) {
    return new CanvasPlacement({
      row,
      col,
      rowSpan: options.rowSpan || 1,
      colSpan: options.colSpan || 1,
      content: {
        type: PlacementContentType.IMAGE,
        imageBlockId,
      },
    });
  }

  /**
   * Create a subset placement
   * @param {string} subsetId
   * @param {number} row
   * @param {number} col
   * @param {Object} options
   * @returns {CanvasPlacement}
   */
  static createSubsetPlacement(subsetId, row, col, options = {}) {
    return new CanvasPlacement({
      row,
      col,
      rowSpan: options.rowSpan || 1,
      colSpan: options.colSpan || 1,
      content: {
        type: PlacementContentType.SUBSET,
        subsetId,
      },
    });
  }

  /**
   * Create an empty placeholder
   * @param {number} row
   * @param {number} col
   * @returns {CanvasPlacement}
   */
  static createEmpty(row, col) {
    return new CanvasPlacement({
      row,
      col,
      content: { type: PlacementContentType.EMPTY },
    });
  }
}
