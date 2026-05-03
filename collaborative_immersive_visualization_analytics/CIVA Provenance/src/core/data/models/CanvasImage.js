// src/core/data/models/CanvasImage.js
// Image model for canvas attachments
//
// Images can be placed on the canvas or attached to subsets

import { generateImageId } from "@Utils/idGenerator.js";

/**
 * CanvasImage - An image on the canvas
 */
export class CanvasImage {
  constructor(data = {}) {
    // Server-authoritative: ID comes from server
    // localId used for optimistic updates before server confirms
    this.id = data.id || null;
    this.localId = data.localId || generateImageId();
    this.isPending = !data.id; // True if not yet confirmed by server
    this.canvasId = data.canvasId || null;

    // Image source
    this.src = data.src || ""; // URL or base64
    this.originalName = data.originalName || "";
    this.mimeType = data.mimeType || "image/png";
    this.fileSize = data.fileSize || 0; // bytes

    // Dimensions
    this.naturalWidth = data.naturalWidth || 0;
    this.naturalHeight = data.naturalHeight || 0;

    // Position on canvas
    this.position = data.position || null; // { x, y } or null
    this.width = data.width || 1; // Grid units
    this.height = data.height || 1;

    // Display options
    this.fit = data.fit || "contain"; // 'contain' | 'cover' | 'fill'
    this.caption = data.caption || "";
    this.alt = data.alt || "";

    // Ownership
    this.createdBy = data.createdBy || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();

    // Visibility
    this.visibility = data.visibility || "private";
  }

  /**
   * Check if image is placed on canvas
   */
  isPlacedOnCanvas() {
    return this.position !== null;
  }

  /**
   * Get aspect ratio
   */
  getAspectRatio() {
    if (!this.naturalHeight) return 1;
    return this.naturalWidth / this.naturalHeight;
  }

  /**
   * Check if image is loaded
   */
  isLoaded() {
    return this.src && this.src.length > 0;
  }

  /**
   * Move image to position
   */
  moveTo(x, y) {
    this.position = { x, y };
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Resize image
   */
  resize(width, height) {
    this.width = Math.max(1, Math.min(3, width));
    this.height = Math.max(1, Math.min(3, height));
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Update caption
   */
  updateCaption(caption) {
    this.caption = caption;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Set fit mode
   */
  setFit(fit) {
    this.fit = fit;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Get human-readable file size
   */
  getFileSizeString() {
    const bytes = this.fileSize;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      src: this.src,
      originalName: this.originalName,
      mimeType: this.mimeType,
      fileSize: this.fileSize,
      naturalWidth: this.naturalWidth,
      naturalHeight: this.naturalHeight,
      position: this.position,
      width: this.width,
      height: this.height,
      fit: this.fit,
      caption: this.caption,
      alt: this.alt,
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
      src: this.src,
      originalName: this.originalName,
      mimeType: this.mimeType,
      fileSize: this.fileSize,
      naturalWidth: this.naturalWidth,
      naturalHeight: this.naturalHeight,
      position: this.position,
      width: this.width,
      height: this.height,
      fit: this.fit,
      caption: this.caption,
      alt: this.alt,
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
    return new CanvasImage(json);
  }

  /**
   * Create from File object
   */
  static async fromFile(file, canvasId) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          resolve(
            new CanvasImage({
              canvasId,
              src: e.target.result,
              originalName: file.name,
              mimeType: file.type,
              fileSize: file.size,
              naturalWidth: img.width,
              naturalHeight: img.height,
              alt: file.name,
            })
          );
        };
        img.onerror = reject;
        img.src = e.target.result;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export default CanvasImage;
