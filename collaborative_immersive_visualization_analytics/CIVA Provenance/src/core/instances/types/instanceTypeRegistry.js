// src/core/instances/types/InstanceTypeRegistry.js
// Central registry for instance type plugins
// This is how the core discovers and uses type handlers

import { instance as log } from "@Utils/logger.js";

/**
 * InstanceTypeRegistry
 *
 * The registry is the bridge between the core system and type-specific handlers.
 * It maintains a map of type identifiers to handler instances, and provides
 * methods for registering new types and retrieving handlers.
 *
 * When the application initializes, each instance type plugin registers itself
 * with this registry. From that point on, the core system can create instances
 * of any registered type without knowing implementation details.
 *
 * This is the key to the plugin architecture. Contributors add a new type by:
 * 1. Creating a handler class that implements InstanceTypeHandler
 * 2. Calling registry.register(handler) during app initialization
 * 3. That's it! The core system automatically knows how to use it.
 */
class InstanceTypeRegistry {
  constructor() {
    // Map of type identifier → handler instance
    // Example: { 'vtk': vtkHandlerInstance, 'plotly': plotlyHandlerInstance }
    this.handlers = new Map();

    log.debug("InstanceTypeRegistry created");
  }

  /**
   * Register a new instance type handler
   *
   * Call this during app initialization to make a new type available.
   * The handler must implement the InstanceTypeHandler interface.
   *
   * @param {InstanceTypeHandler} handler - Handler instance to register
   *
   * @example
   * import { vtkInstanceHandler } from './types/VTKInstanceHandler.js';
   * registry.register(vtkInstanceHandler);
   */
  register(handler) {
    const type = handler.getType();

    if (this.handlers.has(type)) {
      log.warn(`Registry: Type '${type}' already registered, overwriting`);
    }

    this.handlers.set(type, handler);
    log.debug(
      `Registry: Registered type '${type}' (${handler.getDisplayName()})`
    );
  }

  /**
   * Get handler for a specific type
   *
   * Returns the handler that knows how to work with this instance type.
   * Throws an error if the type isn't registered - this catches typos and
   * missing registrations early.
   *
   * @param {string} type - Type identifier (e.g., 'vtk', 'plotly')
   * @returns {InstanceTypeHandler} Handler for this type
   * @throws {Error} If type not registered
   */
  getHandler(type) {
    const handler = this.handlers.get(type);

    if (!handler) {
      throw new Error(
        `Instance type '${type}' not registered. ` +
          `Available types: ${this.getAvailableTypes().join(", ")}`
      );
    }

    return handler;
  }

  /**
   * Find the best handler for a specific file type
   *
   * Queries all registered handlers to find the one that can handle this file type.
   * If multiple handlers support the same type, returns the one with highest priority.
   *
   * @param {string} fileType - File extension (e.g., 'vtp', 'csv', 'json')
   * @returns {InstanceTypeHandler|null} Handler that can process this file type, or null
   *
   * @example
   * const handler = registry.getHandlerForFileType('vtp');
   * // Returns: vtkHandler (or null if no handler supports .vtp)
   */
  getHandlerForFileType(fileType) {
    if (!fileType) return null;
    const normalizedType = fileType.toLowerCase();
    let bestHandler = null;
    let bestPriority = -1;

    for (const handler of this.handlers.values()) {
      const supportedTypes = handler.getSupportedFileTypes();
      const typeConfig = supportedTypes.find(
        (t) => t.extension.toLowerCase() === normalizedType
      );

      if (typeConfig && typeConfig.capabilities.canRender) {
        const priority = typeConfig.priority || 0;
        if (priority > bestPriority) {
          bestHandler = handler;
          bestPriority = priority;
        }
      }
    }

    return bestHandler;
  }

  /**
   * Check if a type is registered
   *
   * @param {string} type - Type identifier
   * @returns {boolean} True if type is registered
   */
  hasType(type) {
    return this.handlers.has(type);
  }

  /**
   * Get list of all registered type identifiers
   *
   * @returns {string[]} Array of type identifiers
   */
  getAvailableTypes() {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get list of all registered handlers with their display names
   *
   * Useful for UI that lets users choose an instance type.
   *
   * @returns {Array<Object>} Array of {type, displayName, handler}
   *
   * @example
   * const types = registry.getAvailableHandlers();
   * // Returns: [
   * //   { type: 'vtk', displayName: 'VTK 3D View', handler: vtkHandler },
   * //   { type: 'plotly', displayName: 'Plotly Chart', handler: plotlyHandler }
   * // ]
   */
  getAvailableHandlers() {
    return Array.from(this.handlers.entries()).map(([type, handler]) => ({
      type,
      displayName: handler.getDisplayName(),
      handler,
    }));
  }

  /**
   * Find handlers that can display a specific dataset
   *
   * Some handlers can only work with specific data types. This method
   * asks each handler if it can handle the dataset and returns compatible ones.
   *
   * @param {Object} dataset - Dataset metadata
   * @returns {Array<Object>} Compatible handlers with their types
   *
   * @example
   * const vtpDataset = { name: 'model.vtp', ... };
   * const handlers = registry.getCompatibleHandlers(vtpDataset);
   * // Returns: [{ type: 'vtk', displayName: 'VTK 3D View', handler }]
   */
  getCompatibleHandlers(dataset) {
    const compatible = [];

    for (const [type, handler] of this.handlers.entries()) {
      if (handler.canHandleDataset(dataset)) {
        compatible.push({
          type,
          displayName: handler.getDisplayName(),
          handler,
        });
      }
    }

    return compatible;
  }

  /**
   * Get display info for a file type
   * Queries handlers for icon, color, and display name
   *
   * @param {string} fileType - File extension
   * @returns {Object|null} { icon, color, displayName } or null
   */
  getFileTypeDisplayInfo(fileType) {
    if (!fileType) return null;
    const normalizedType = fileType.toLowerCase();

    for (const handler of this.handlers.values()) {
      const supportedTypes = handler.getSupportedFileTypes();
      const typeConfig = supportedTypes.find(
        (t) => t.extension.toLowerCase() === normalizedType
      );

      if (typeConfig) {
        return {
          icon: typeConfig.icon || "file",
          color: typeConfig.color || null,
          displayName: typeConfig.displayName || fileType.toUpperCase(),
          handlerType: handler.getType(),
        };
      }
    }

    return null;
  }

  /**
   * Unregister a type (rarely needed, mainly for testing)
   *
   * @param {string} type - Type identifier to unregister
   */
  unregister(type) {
    if (this.handlers.delete(type)) {
      log.debug(`Registry: Unregistered type '${type}'`);
    }
  }

  /**
   * Clear all registered types (mainly for testing)
   */
  clear() {
    this.handlers.clear();
    log.debug("Registry: Cleared all types");
  }
}

// Export the class for testing and advanced use cases
export { InstanceTypeRegistry };

// Export singleton registry for normal application use
export const instanceTypeRegistry = new InstanceTypeRegistry();

/**
 * NOTE: Instance type registration has moved!
 *
 * To register instance types, import and call registerInstanceTypes()
 * from instanceTypesInit.js during application initialization.
 *
 * @example
 * import { registerInstanceTypes } from '@Core/instances/types/instanceTypesInit.js';
 * registerInstanceTypes();
 */
