// src/core/data/models/Note.js
// Note model for canvas annotations
//
// Notes can be placed on the canvas or attached to subsets

import { generateNoteId } from "@Utils/idGenerator.js";

/**
 * Note - A text annotation on the canvas
 */
export class Note {
  constructor(data = {}) {
    // Server-authoritative: ID comes from server
    // localId used for optimistic updates before server confirms
    this.id = data.id || null;
    this.localId = data.localId || generateNoteId();
    this.isPending = !data.id; // True if not yet confirmed by server
    this.canvasId = data.canvasId || null;

    // Content
    this.title = data.title || "";
    this.content = data.content || "";
    this.format = data.format || "markdown"; // 'markdown' | 'plain' | 'rich'

    // Position on canvas (if placed directly)
    this.position = data.position || null; // { x, y } or null if attached to subset
    this.width = data.width || 1; // Grid units
    this.height = data.height || 1;

    // Styling
    this.color = data.color || "default"; // 'default' | 'yellow' | 'blue' | 'green' | 'red' | 'purple'
    this.pinned = data.pinned || false;

    // Ownership
    this.createdBy = data.createdBy || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();

    // Visibility
    this.visibility = data.visibility || "private"; // 'private' | 'shared' | 'public'
  }

  /**
   * Check if note is placed on canvas
   */
  isPlacedOnCanvas() {
    return this.position !== null;
  }

  /**
   * Check if note has content
   */
  hasContent() {
    return this.content.trim().length > 0;
  }

  /**
   * Get preview text (first 100 chars)
   */
  getPreview(maxLength = 100) {
    const text = this.content.trim();
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "...";
  }

  /**
   * Update content and timestamp
   */
  updateContent(content) {
    this.content = content;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Update title
   */
  updateTitle(title) {
    this.title = title;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Move note to position
   */
  moveTo(x, y) {
    this.position = { x, y };
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Resize note
   */
  resize(width, height) {
    this.width = Math.max(1, Math.min(3, width));
    this.height = Math.max(1, Math.min(3, height));
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Set color
   */
  setColor(color) {
    this.color = color;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Toggle pinned state
   */
  togglePinned() {
    this.pinned = !this.pinned;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Confirm with server-assigned ID
   */
  confirmWithServerId(serverId) {
    this.id = serverId;
    this.isPending = false;
  }

  /**
   * Get the effective ID (server ID or local ID for pending items)
   */
  getEffectiveId() {
    return this.id || this.localId;
  }

  /**
   * Serialize for sending to server (excludes local-only fields)
   */
  toServerJSON() {
    return {
      id: this.id, // null for new items
      localId: this.localId, // Server returns this to correlate response
      canvasId: this.canvasId,
      title: this.title,
      content: this.content,
      format: this.format,
      position: this.position,
      width: this.width,
      height: this.height,
      color: this.color,
      pinned: this.pinned,
      visibility: this.visibility,
    };
  }

  /**
   * Serialize for storage
   */
  toJSON() {
    return {
      id: this.id,
      localId: this.localId,
      isPending: this.isPending,
      canvasId: this.canvasId,
      title: this.title,
      content: this.content,
      format: this.format,
      position: this.position,
      width: this.width,
      height: this.height,
      color: this.color,
      pinned: this.pinned,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      visibility: this.visibility,
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(json) {
    return new Note(json);
  }
}

export default Note;
