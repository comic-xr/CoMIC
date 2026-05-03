// src/core/instances/types/instanceTypesInit.js
// Central initialization for all instance type plugins
//
// THIS IS WHERE CONTRIBUTORS ADD NEW INSTANCE TYPES
//
// When adding a new visualization type:
// 1. Create your handler in types/yourtype/YourTypeHandler.js
// 2. Import it below
// 3. Add one line to registerInstanceTypes()
// 4. Done! Your type is now available throughout the application

import { instanceTypeRegistry } from "@Core/instances/types/instanceTypeRegistry.js";
import { vtkInstanceHandler } from "@Core/instances/types/vtk/VTKInstanceHandler.js";
import { instance as log } from "@Utils/logger.js";

/**
 * registerInstanceTypes
 *
 * This function is called during application initialization to make all
 * instance types available. The registration order doesn't matter - the
 * Registry just builds a map of type identifiers to handlers.
 *
 * CONTRIBUTORS: This is the ONLY file you need to modify to add a new type.
 * Follow the pattern below:
 *
 * 1. Import your handler at the top of this file
 * 2. Call registry.register(yourHandler) in this function
 * 3. That's it!
 *
 * The core system will automatically know about your type and can create
 * instances of it. You never need to touch any core files.
 */
export function registerInstanceTypes() {
  log.debug("Registering instance type plugins...");

  // Register VTK (3D visualization)
  instanceTypeRegistry.register(vtkInstanceHandler);

  // =========================================================================
  // CONTRIBUTORS: Add your instance types below this line
  // =========================================================================

  // Example: To add Plotly support, uncomment these lines:
  // import { plotlyInstanceHandler } from '@Core/instances/types/plotly/PlotlyInstanceHandler.js';
  // instanceTypeRegistry.register(plotlyInstanceHandler);

  // Example: To add Three.js support:
  // import { threejsInstanceHandler } from '@Core/instances/types/threejs/ThreeJSInstanceHandler.js';
  // instanceTypeRegistry.register(threejsInstanceHandler);

  // Example: To add custom WebGL visualization:
  // import { customGLHandler } from '@Core/instances/types/customgl/CustomGLHandler.js';
  // instanceTypeRegistry.register(customGLHandler);

  // =========================================================================

  const registered = instanceTypeRegistry.getAvailableTypes();
  log.info(
    `Registered ${registered.length} instance type(s): ${registered.join(", ")}`
  );
}

export function getFileTypeDisplayInfo(fileType) {
  return instanceTypeRegistry.getFileTypeDisplayInfo(fileType);
}

/**
 * getRegisteredTypes
 *
 * Utility function to check what types are currently registered.
 * Useful for debugging and testing.
 */
export function getRegisteredTypes() {
  return instanceTypeRegistry.getAvailableTypes();
}

/**
 * isTypeRegistered
 *
 * Check if a specific type is registered.
 * Useful for conditional logic and feature detection.
 */
export function isTypeRegistered(type) {
  return instanceTypeRegistry.hasType(type);
}

/**
 * getHandlerForType
 *
 * Get the handler for a specific type.
 * This is the main API used by the core system.
 */
export function getHandlerForType(type) {
  return instanceTypeRegistry.getHandler(type);
}

/**
 * getHandlerForFileType
 *
 * Get the best handler for a specific file type.
 * Queries all registered handlers and returns the one that can handle this file type.
 * If multiple handlers support the same type, returns the one with highest priority.
 *
 * @param {string} fileType - File extension (e.g., 'vtp', 'csv', 'json')
 * @returns {InstanceTypeHandler|null} Handler or null if no handler supports this type
 */
export function getHandlerForFileType(fileType) {
  return instanceTypeRegistry.getHandlerForFileType(fileType);
}

/**
 * Example usage in application code:
 *
 * // During app initialization:
 * import { registerInstanceTypes } from '@Core/instances/types/instanceTypesInit.js';
 * registerInstanceTypes();
 *
 * // Later, when creating an instance:
 * import { getHandlerForType } from '@Core/instances/types/instanceTypesInit.js';
 * const handler = getHandlerForType('vtk');
 * const instanceData = await handler.initialize(container, options);
 */
