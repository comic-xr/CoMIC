// src/core/data/models/InstanceWindow.js
import { generateInstanceId } from "@Utils/idGenerator.js";

/**
 * InstanceWindow - Layer 3 of the architecture
 *
 * An InstanceWindow is an ephemeral rendered viewport that displays a ViewConfiguration.
 * It's surprisingly simple because it doesn't own any visualization state - it's just
 * a "projector" that renders whatever view configuration it's pointed at.
 *
 * Key architectural principle:
 * - InstanceWindows are EPHEMERAL and can be destroyed to free GPU resources
 * - All state lives in the ViewConfiguration (Layer 2)
 * - When you destroy an instance, the view configuration persists
 * - When you create a new instance pointing to that view, everything comes back
 *
 * Think of it like a web browser tab:
 * - The tab (InstanceWindow) can be closed without losing the webpage
 * - Opening a new tab to the same URL loads the same content
 * - The tab is just a renderer, the content exists independently
 *
 * This separation enables:
 * - Resource management (destroy instances you're not viewing)
 * - Flexible layouts (move instances around the grid)
 * - Multiple instances viewing the same configuration
 * - Type-agnostic instance creation (instance defaults to no type)
 */

export class InstanceWindow {
  constructor(config = {}) {
    // Core identification
    this.id = config.id || this._generateId();

    // What this instance is rendering
    // Can be null for empty instances waiting for content
    this.viewConfigurationId = config.viewConfigurationId || null;

    // What type of renderer this instance uses
    // Can be null for empty instances - type is determined when content is loaded
    // Examples: 'vtk', 'plot', 'image', etc.
    this.type = config.type || null;

    // UI layout position (bento-style grid)
    // This is ephemeral - not part of the view configuration
    this.gridPosition = {
      row: config.gridPosition?.row || 0,
      col: config.gridPosition?.col || 0,
      rowSpan: config.gridPosition?.rowSpan || 1,
      colSpan: config.gridPosition?.colSpan || 1,
    };

    // Transient state (not serialized)
    // These are runtime references managed by the InstanceManager
    this._handler = null; // Reference to the InstanceTypeHandler
    this._containerElement = null; // DOM element this instance renders into
    this._isInitialized = false; // Has the handler been initialized?
  }

  _generateId() {
    return generateInstanceId();
  }

  // ==================== LIFECYCLE ====================

  /**
   * Check if this instance has content loaded
   */
  hasContent() {
    return this.viewConfigurationId !== null && this.type !== null;
  }

  /**
   * Check if this instance is empty (no content)
   */
  isEmpty() {
    return this.viewConfigurationId === null;
  }

  /**
   * Load a view configuration into this instance
   * This is called by the InstanceManager
   *
   * @param {string} viewConfigId - ID of the view configuration to render
   * @param {string} type - Type of handler to use ('vtk', 'plot', etc.)
   */
  loadView(viewConfigId, type) {
    this.viewConfigurationId = viewConfigId;
    this.type = type;
  }

  /**
   * Unload the current view (make this instance empty)
   * This does NOT destroy the view configuration, just stops rendering it
   */
  unloadView() {
    this.viewConfigurationId = null;
    this.type = null;
    this._handler = null;
    this._isInitialized = false;
  }

  /**
   * Update the grid position
   * @param {object} position - New grid position
   */
  updateGridPosition(position) {
    this.gridPosition = {
      ...this.gridPosition,
      ...position,
    };
  }

  // ==================== HANDLER MANAGEMENT ====================
  // These methods are used by the InstanceManager to manage the renderer

  /**
   * Set the handler for this instance
   * Called by InstanceManager during initialization
   * @param {InstanceTypeHandler} handler - The handler instance
   */
  setHandler(handler) {
    this._handler = handler;
  }

  /**
   * Get the current handler
   * @returns {InstanceTypeHandler|null}
   */
  getHandler() {
    return this._handler;
  }

  /**
   * Set the container element this instance renders into
   * @param {HTMLElement} element - The container element
   */
  setContainer(element) {
    this._containerElement = element;
  }

  /**
   * Get the container element
   * @returns {HTMLElement|null}
   */
  getContainer() {
    return this._containerElement;
  }

  /**
   * Mark this instance as initialized
   */
  markInitialized() {
    this._isInitialized = true;
  }

  /**
   * Check if this instance has been initialized
   */
  isInitialized() {
    return this._isInitialized;
  }

  // ==================== SERIALIZATION ====================

  /**
   * Serialize for storage
   * Note: We only serialize the configuration, not the runtime state
   * The handler and DOM references are transient and recreated on load
   */
  toJSON() {
    return {
      id: this.id,
      viewConfigurationId: this.viewConfigurationId,
      type: this.type,
      gridPosition: this.gridPosition,
    };
  }

  /**
   * Create an InstanceWindow from stored JSON
   */
  static fromJSON(json) {
    return new InstanceWindow(json);
  }
}

/**
 * USAGE EXAMPLES:
 *
 * // Create an empty instance window (no type, waiting for content)
 * const instance = new InstanceWindow({
 *   gridPosition: { row: 0, col: 0, rowSpan: 1, colSpan: 1 }
 * });
 * console.log(instance.isEmpty()); // true
 * console.log(instance.type); // null - type determined when content loads
 *
 * // User loads a dataset into the empty instance
 * // InstanceManager determines the appropriate type based on the data
 * instance.loadView(viewConfig.id, 'vtk');
 * console.log(instance.hasContent()); // true
 *
 * // InstanceManager initializes the handler
 * const handler = registry.getHandler('vtk');
 * instance.setHandler(handler);
 * instance.setContainer(domElement);
 * await handler.initialize(instance.getContainer());
 * instance.markInitialized();
 *
 * // User switches to a different dataset (click without shift)
 * // The view configuration changes, but the instance persists
 * instance.loadView(differentViewConfig.id, 'vtk');
 * // Handler re-renders with the new view configuration
 *
 * // User closes the instance window
 * // The view configuration becomes inactive but persists
 * // The instance is destroyed, freeing GPU resources
 * instance.unloadView();
 * // At this point, the instance could be reused or destroyed
 *
 * // Later, user wants that view back
 * // InstanceManager creates a new instance pointing to the same view config
 * const newInstance = new InstanceWindow({
 *   viewConfigurationId: oldViewConfig.id,
 *   type: 'vtk',
 *   gridPosition: { row: 1, col: 0, rowSpan: 1, colSpan: 1 }
 * });
 * // Everything comes back exactly as the user left it because
 * // the view configuration was preserved
 */

/**
 * COMPARISON WITH OLD ARCHITECTURE:
 *
 * OLD WAY (instances owned state):
 * - Instance had filters, camera, data directly
 * - Closing instance = losing all work
 * - Switching datasets = complex state management
 * - Hard to save/load configurations
 * - Synchronization complicated
 *
 * NEW WAY (instances are projectors):
 * - Instance just points to a view configuration
 * - View configuration owns all state
 * - Closing instance = view becomes inactive, state preserved
 * - Switching datasets = just change which view config to render
 * - Save/load = just serialize view configuration
 * - Synchronization = sync view configurations via Y.js
 * - Multiple instances can show the same view (for collaboration)
 */
