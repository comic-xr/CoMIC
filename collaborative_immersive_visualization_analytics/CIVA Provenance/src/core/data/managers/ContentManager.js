// src/core/data/managers/ContentManager.js
// Manager for notes and images on canvas
//
// Uses plugin architecture: content type handlers register themselves
// and handle type-specific logic (rendering, validation, serialization)

import { Note } from "../models/Note.js";
import { CanvasImage } from "../models/CanvasImage.js";
import { workspace as log } from "@Utils/logger.js";

/**
 * ContentHandler - Base class for content type handlers
 * Each content type (note, image, etc.) has its own handler
 */
export class ContentHandler {
  constructor(type) {
    this.type = type;
  }

  // Override in subclasses
  validate(data) {
    return { valid: true };
  }
  create(data) {
    throw new Error("Not implemented");
  }
  render(item, container) {
    throw new Error("Not implemented");
  }
  serialize(item) {
    return item.toJSON();
  }
  deserialize(json) {
    throw new Error("Not implemented");
  }
}

/**
 * NoteHandler - Handler for note content type
 */
export class NoteHandler extends ContentHandler {
  constructor() {
    super("note");
  }

  validate(data) {
    if (data.content && data.content.length > 50000) {
      return { valid: false, error: "Note content too long (max 50000 chars)" };
    }
    return { valid: true };
  }

  create(data) {
    return new Note(data);
  }

  deserialize(json) {
    return Note.fromJSON(json);
  }
}

/**
 * ImageHandler - Handler for image content type
 */
export class ImageHandler extends ContentHandler {
  constructor() {
    super("image");
  }

  validate(data) {
    if (data.fileSize && data.fileSize > 10 * 1024 * 1024) {
      return { valid: false, error: "Image too large (max 10MB)" };
    }
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (data.mimeType && !validTypes.includes(data.mimeType)) {
      return { valid: false, error: "Invalid image type" };
    }
    return { valid: true };
  }

  create(data) {
    return new CanvasImage(data);
  }

  deserialize(json) {
    return CanvasImage.fromJSON(json);
  }

  async createFromFile(file, canvasId) {
    return CanvasImage.fromFile(file, canvasId);
  }
}

/**
 * ContentManager - Manages canvas content using plugin handlers
 */
class ContentManagerClass {
  constructor() {
    // Registered content type handlers
    this.handlers = new Map();

    // Content storage by type
    this.content = new Map(); // type -> Map<id, item>
    this.canvasContent = new Map(); // canvasId -> Map<type, Set<id>>

    // Pending items awaiting server confirmation
    this.pendingByLocalId = new Map(); // localId -> item

    this.listeners = new Set();

    // Register default handlers
    this.registerHandler(new NoteHandler());
    this.registerHandler(new ImageHandler());
  }

  /**
   * Register a content type handler (plugin architecture)
   */
  registerHandler(handler) {
    this.handlers.set(handler.type, handler);
    this.content.set(handler.type, new Map());
  }

  /**
   * Get handler for a content type
   */
  getHandler(type) {
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new Error(`No handler registered for content type: ${type}`);
    }
    return handler;
  }

  /**
   * Get all registered content types
   */
  getContentTypes() {
    return Array.from(this.handlers.keys());
  }

  /**
   * Subscribe to content changes
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners of changes
   */
  notify(event, data) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (err) {
        log.error("ContentManager listener error:", err);
      }
    });
  }

  // ============ GENERIC CONTENT OPERATIONS ============

  /**
   * Create content item using appropriate handler
   */
  async createContent(type, canvasId, data = {}) {
    const handler = this.getHandler(type);

    // Validate using handler
    const validation = handler.validate(data);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Create using handler
    const item = handler.create({ ...data, canvasId });

    // Store locally with localId (pending server confirmation)
    const typeContent = this.content.get(type);
    typeContent.set(item.localId, item);
    this.pendingByLocalId.set(item.localId, item);

    // Track by canvas
    if (!this.canvasContent.has(canvasId)) {
      this.canvasContent.set(canvasId, new Map());
    }
    const canvasTypes = this.canvasContent.get(canvasId);
    if (!canvasTypes.has(type)) {
      canvasTypes.set(type, new Set());
    }
    canvasTypes.get(type).add(item.localId);

    // TODO: Send to server, await confirmation with server ID
    this.notify(`${type}:created`, { item, pending: true });

    return item;
  }

  /**
   * Handle server confirmation of created item
   */
  confirmContent(type, localId, serverId) {
    const item = this.pendingByLocalId.get(localId);
    if (!item) return null;

    // Update item with server ID
    item.confirmWithServerId(serverId);

    // Re-index with server ID
    const typeContent = this.content.get(type);
    typeContent.delete(localId);
    typeContent.set(serverId, item);

    // Update canvas tracking
    const canvasTypes = this.canvasContent.get(item.canvasId);
    if (canvasTypes && canvasTypes.has(type)) {
      const ids = canvasTypes.get(type);
      ids.delete(localId);
      ids.add(serverId);
    }

    this.pendingByLocalId.delete(localId);
    this.notify(`${type}:confirmed`, { item, serverId });

    return item;
  }

  /**
   * Get content item by ID (server ID or local ID)
   */
  getContent(type, id) {
    const typeContent = this.content.get(type);
    return typeContent?.get(id) || null;
  }

  /**
   * Get all content of a type for a canvas
   */
  getContentForCanvas(type, canvasId) {
    const canvasTypes = this.canvasContent.get(canvasId);
    if (!canvasTypes || !canvasTypes.has(type)) return [];

    const ids = canvasTypes.get(type);
    const typeContent = this.content.get(type);
    return Array.from(ids)
      .map((id) => typeContent.get(id))
      .filter(Boolean);
  }

  /**
   * Update content item
   */
  async updateContent(type, id, updates) {
    const item = this.getContent(type, id);
    if (!item) return null;

    Object.assign(item, updates);
    item.updatedAt = new Date().toISOString();

    // TODO: Sync to server
    this.notify(`${type}:updated`, { item });

    return item;
  }

  /**
   * Delete content item
   */
  async deleteContent(type, id) {
    const item = this.getContent(type, id);
    if (!item) return false;

    const typeContent = this.content.get(type);
    typeContent.delete(id);

    const canvasTypes = this.canvasContent.get(item.canvasId);
    if (canvasTypes && canvasTypes.has(type)) {
      canvasTypes.get(type).delete(id);
    }

    if (item.isPending) {
      this.pendingByLocalId.delete(item.localId);
    }

    // TODO: Sync to server
    this.notify(`${type}:deleted`, { id, canvasId: item.canvasId });

    return true;
  }

  // ============ CONVENIENCE METHODS (delegate to generic) ============

  async createNote(canvasId, data = {}) {
    return this.createContent("note", canvasId, data);
  }

  getNote(id) {
    return this.getContent("note", id);
  }

  getNotesForCanvas(canvasId) {
    return this.getContentForCanvas("note", canvasId);
  }

  async updateNote(id, updates) {
    return this.updateContent("note", id, updates);
  }

  async deleteNote(id) {
    return this.deleteContent("note", id);
  }

  async uploadImage(canvasId, file) {
    const handler = this.getHandler("image");
    const image = await handler.createFromFile(file, canvasId);

    // Validate
    const validation = handler.validate(image);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Store locally
    const typeContent = this.content.get("image");
    typeContent.set(image.localId, image);
    this.pendingByLocalId.set(image.localId, image);

    // Track by canvas
    if (!this.canvasContent.has(canvasId)) {
      this.canvasContent.set(canvasId, new Map());
    }
    const canvasTypes = this.canvasContent.get(canvasId);
    if (!canvasTypes.has("image")) {
      canvasTypes.set("image", new Set());
    }
    canvasTypes.get("image").add(image.localId);

    // TODO: Upload to server
    this.notify("image:created", { item: image, pending: true });

    return image;
  }

  getImage(id) {
    return this.getContent("image", id);
  }

  getImagesForCanvas(canvasId) {
    return this.getContentForCanvas("image", canvasId);
  }

  async updateImage(id, updates) {
    return this.updateContent("image", id, updates);
  }

  async deleteImage(id) {
    return this.deleteContent("image", id);
  }

  // ============ BULK OPERATIONS ============

  /**
   * Load all content for a canvas from server
   */
  async loadCanvasContent(canvasId) {
    // TODO: Fetch from server and populate local cache
    const result = {};
    for (const type of this.getContentTypes()) {
      result[type + "s"] = this.getContentForCanvas(type, canvasId);
    }
    return result;
  }

  /**
   * Clear all content for a canvas
   */
  clearCanvasContent(canvasId) {
    const canvasTypes = this.canvasContent.get(canvasId);
    if (canvasTypes) {
      for (const [type, ids] of canvasTypes) {
        const typeContent = this.content.get(type);
        for (const id of ids) {
          const item = typeContent.get(id);
          if (item?.isPending) {
            this.pendingByLocalId.delete(item.localId);
          }
          typeContent.delete(id);
        }
      }
    }
    this.canvasContent.delete(canvasId);
    this.notify("canvas:cleared", { canvasId });
  }

  /**
   * Get content counts for a canvas
   */
  getContentCounts(canvasId) {
    const counts = {};
    const canvasTypes = this.canvasContent.get(canvasId);
    for (const type of this.getContentTypes()) {
      counts[type + "s"] = canvasTypes?.get(type)?.size || 0;
    }
    return counts;
  }
}

// Singleton instance
export const contentManager = new ContentManagerClass();
export default contentManager;
