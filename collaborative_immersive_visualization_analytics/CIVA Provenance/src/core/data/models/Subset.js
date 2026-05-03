// src/core/data/models/Subset.js
// A saved selection of placements for focus mode / deep analysis
//
// ARCHITECTURE:
// - Subsets are "research artifacts" - saved views for reproducibility
// - Activating a subset enters "focus mode" (viewport replaced)
// - Can attach notes and images for research context
// - Server is source of truth for subset data

/**
 * Visibility levels for subsets
 */
export const SubsetVisibility = {
  PRIVATE: "private", // Only creator can see
  SHARED: "shared", // Specific users can see
  PUBLIC: "public", // All project members can see
};

/**
 * Subset - A saved selection of canvas placements for focus mode
 *
 * Key Concepts:
 * - Created by selecting multiple placements on the canvas
 * - Activating a subset replaces the viewport with just those views
 * - Supports attached notes/images for research context
 * - Visibility controls sharing within the project
 *
 * Use Cases:
 * - "Here's the 3 views I was looking at when I made this observation"
 * - "Focus on just these scans for deep analysis"
 * - "Share this specific combination with my team"
 */
export class Subset {
  /**
   * @param {Object} options
   * @param {string} options.id - Server-generated subset ID
   * @param {string} options.projectId - Parent project ID
   * @param {string} options.canvasId - Canvas this subset belongs to
   * @param {string} options.name - Display name
   * @param {string} options.description - Research context / notes
   * @param {string[]} options.placementIds - IDs of included placements
   * @param {string[]} options.attachedNotes - NotesBlock IDs
   * @param {string[]} options.attachedImages - ImageBlock IDs
   * @param {string} options.visibility - 'private' | 'shared' | 'public'
   * @param {string[]} options.sharedWith - User IDs (if visibility is 'shared')
   * @param {string} options.createdBy - Creator user ID
   * @param {string} options.createdAt - ISO timestamp
   * @param {string} options.updatedAt - ISO timestamp
   */
  constructor(data = {}) {
    // Handle both camelCase and snake_case from server
    this.id = data.id || null;
    this.projectId = data.projectId || data.project_id || null;
    this.canvasId = data.canvasId || data.canvas_id || null;
    this.name = data.name || "Untitled Focus Group";
    this.description = data.description || "";
    this.placementIds = [...(data.placementIds || data.placement_ids || [])];
    this.attachedNotes = [...(data.attachedNotes || data.attached_notes || [])];
    this.attachedImages = [...(data.attachedImages || data.attached_images || [])];
    this.visibility = data.visibility || SubsetVisibility.PRIVATE;
    this.sharedWith = [...(data.sharedWith || data.shared_with || [])];
    this.createdBy = data.createdBy || data.created_by || null;
    this.createdAt = data.createdAt || data.created_at || null;
    this.updatedAt = data.updatedAt || data.updated_at || null;
  }

  // ===========================================================================
  // PLACEMENT MANAGEMENT
  // ===========================================================================

  /**
   * Add a placement to the subset
   * @param {string} placementId
   */
  addPlacement(placementId) {
    if (!this.placementIds.includes(placementId)) {
      this.placementIds.push(placementId);
    }
  }

  /**
   * Remove a placement from the subset
   * @param {string} placementId
   */
  removePlacement(placementId) {
    const index = this.placementIds.indexOf(placementId);
    if (index !== -1) {
      this.placementIds.splice(index, 1);
    }
  }

  /**
   * Check if placement is in this subset
   * @param {string} placementId
   * @returns {boolean}
   */
  hasPlacement(placementId) {
    return this.placementIds.includes(placementId);
  }

  /**
   * Get placement count
   * @returns {number}
   */
  getPlacementCount() {
    return this.placementIds.length;
  }

  /**
   * Set all placements at once
   * @param {string[]} placementIds
   */
  setPlacements(placementIds) {
    this.placementIds = [...placementIds];
  }

  // ===========================================================================
  // ATTACHED CONTENT MANAGEMENT
  // ===========================================================================

  /**
   * Attach a notes block
   * @param {string} notesBlockId
   */
  attachNotes(notesBlockId) {
    if (!this.attachedNotes.includes(notesBlockId)) {
      this.attachedNotes.push(notesBlockId);
    }
  }

  /**
   * Detach a notes block
   * @param {string} notesBlockId
   */
  detachNotes(notesBlockId) {
    const index = this.attachedNotes.indexOf(notesBlockId);
    if (index !== -1) {
      this.attachedNotes.splice(index, 1);
    }
  }

  /**
   * Attach an image block
   * @param {string} imageBlockId
   */
  attachImage(imageBlockId) {
    if (!this.attachedImages.includes(imageBlockId)) {
      this.attachedImages.push(imageBlockId);
    }
  }

  /**
   * Detach an image block
   * @param {string} imageBlockId
   */
  detachImage(imageBlockId) {
    const index = this.attachedImages.indexOf(imageBlockId);
    if (index !== -1) {
      this.attachedImages.splice(index, 1);
    }
  }

  /**
   * Get total attached content count
   * @returns {number}
   */
  getAttachedContentCount() {
    return this.attachedNotes.length + this.attachedImages.length;
  }

  /**
   * Check if subset has any attached content
   * @returns {boolean}
   */
  hasAttachedContent() {
    return this.getAttachedContentCount() > 0;
  }

  // ===========================================================================
  // VISIBILITY & SHARING
  // ===========================================================================

  /**
   * Check if subset is private
   */
  isPrivate() {
    return this.visibility === SubsetVisibility.PRIVATE;
  }

  /**
   * Check if subset is shared with specific users
   */
  isShared() {
    return this.visibility === SubsetVisibility.SHARED;
  }

  /**
   * Check if subset is public to all project members
   */
  isPublic() {
    return this.visibility === SubsetVisibility.PUBLIC;
  }

  /**
   * Set visibility to private
   */
  makePrivate() {
    this.visibility = SubsetVisibility.PRIVATE;
    this.sharedWith = [];
  }

  /**
   * Set visibility to public (all project members)
   */
  makePublic() {
    this.visibility = SubsetVisibility.PUBLIC;
    this.sharedWith = [];
  }

  /**
   * Share with specific users
   * @param {string[]} userIds
   */
  shareWith(userIds) {
    this.visibility = SubsetVisibility.SHARED;
    this.sharedWith = [...userIds];
  }

  /**
   * Add a user to shared list
   * @param {string} userId
   */
  addSharedUser(userId) {
    if (this.visibility !== SubsetVisibility.SHARED) {
      this.visibility = SubsetVisibility.SHARED;
    }
    if (!this.sharedWith.includes(userId)) {
      this.sharedWith.push(userId);
    }
  }

  /**
   * Remove a user from shared list
   * @param {string} userId
   */
  removeSharedUser(userId) {
    const index = this.sharedWith.indexOf(userId);
    if (index !== -1) {
      this.sharedWith.splice(index, 1);
    }
    // If no users left, make private
    if (
      this.sharedWith.length === 0 &&
      this.visibility === SubsetVisibility.SHARED
    ) {
      this.visibility = SubsetVisibility.PRIVATE;
    }
  }

  /**
   * Check if a user can view this subset
   * @param {string} userId
   * @returns {boolean}
   */
  canUserView(userId) {
    // Creator can always view
    if (this.createdBy === userId) return true;

    switch (this.visibility) {
      case SubsetVisibility.PRIVATE:
        return false;
      case SubsetVisibility.SHARED:
        return this.sharedWith.includes(userId);
      case SubsetVisibility.PUBLIC:
        return true;
      default:
        return false;
    }
  }

  /**
   * Check if a user can edit this subset
   * @param {string} userId
   * @returns {boolean}
   */
  canUserEdit(userId) {
    // Only creator can edit (for now)
    return this.createdBy === userId;
  }

  // ===========================================================================
  // METADATA
  // ===========================================================================

  /**
   * Update name
   * @param {string} name
   */
  setName(name) {
    this.name = name;
  }

  /**
   * Update description
   * @param {string} description
   */
  setDescription(description) {
    this.description = description;
  }

  /**
   * Check if subset is empty (no placements)
   * @returns {boolean}
   */
  isEmpty() {
    return this.placementIds.length === 0;
  }

  // ===========================================================================
  // FOCUS MODE HELPERS
  // ===========================================================================

  /**
   * Calculate optimal grid layout for focus mode
   * Given n placements, return rows x cols that best fits
   * @returns {{ rows: number, cols: number }}
   */
  calculateFocusLayout() {
    const n = this.placementIds.length;
    if (n === 0) return { rows: 1, cols: 1 };
    if (n === 1) return { rows: 1, cols: 1 };
    if (n === 2) return { rows: 1, cols: 2 };
    if (n === 3) return { rows: 1, cols: 3 };
    if (n === 4) return { rows: 2, cols: 2 };
    if (n <= 6) return { rows: 2, cols: 3 };
    if (n <= 9) return { rows: 3, cols: 3 };

    // For more than 9, calculate closest square
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    return { rows, cols };
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
      canvasId: this.canvasId,
      name: this.name,
      description: this.description,
      placementIds: [...this.placementIds],
      attachedNotes: [...this.attachedNotes],
      attachedImages: [...this.attachedImages],
      visibility: this.visibility,
      sharedWith: [...this.sharedWith],
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create from plain object
   * @param {Object} data
   * @returns {Subset}
   */
  static fromJSON(data) {
    return new Subset(data);
  }

  /**
   * Clone the subset
   * @returns {Subset}
   */
  clone() {
    return new Subset({
      ...this.toJSON(),
      id: null, // New subset should get new ID from server
    });
  }

  // ===========================================================================
  // FACTORY METHODS
  // ===========================================================================

  /**
   * Create a new subset from selected placements
   * @param {string} projectId
   * @param {string} canvasId
   * @param {string[]} placementIds
   * @param {Object} options - { name, description, createdBy }
   * @returns {Subset}
   */
  static createFromSelection(projectId, canvasId, placementIds, options = {}) {
    return new Subset({
      projectId,
      canvasId,
      placementIds,
      name: options.name || `Focus Group (${placementIds.length} views)`,
      description: options.description || "",
      createdBy: options.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}
