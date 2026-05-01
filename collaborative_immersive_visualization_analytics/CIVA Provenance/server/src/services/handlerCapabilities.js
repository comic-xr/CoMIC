/**
 * Handler Capabilities Service (JavaScript Runtime Version)
 *
 * Server-side service for querying handler capabilities from the manifest registry.
 * This is the JavaScript runtime version that loads the generated registry.json
 * and provides validation and lookup methods.
 *
 * NOTE: The TypeScript version (handlerCapabilities.ts) is the source of truth
 * for type definitions. This JS version is for server runtime use until the
 * server is migrated to TypeScript.
 *
 * USAGE:
 * 1. Run `npm run build:manifests` to generate registry.json
 * 2. Import this module in server routes
 * 3. Use validateUpload(), getHandlerForExtension(), etc.
 *
 * @module server/services/handlerCapabilities
 */

const fs = require("fs");
const path = require("path");
const { createLogger } = require("../utils/logger");

const log = createLogger("capabilities");

// =============================================================================
// REGISTRY LOADING
// =============================================================================

let registry = null;
let registryLoadError = null;

/**
 * Path to the registry file
 */
const REGISTRY_PATH = path.resolve(__dirname, "../../manifests/registry.json");

/**
 * Load the manifest registry from disk
 * Called once at server startup
 */
function loadRegistry() {
  try {
    if (!fs.existsSync(REGISTRY_PATH)) {
      log.warn("Registry not found at", REGISTRY_PATH);
      log.warn('Run "npm run build:manifests" to generate');
      registryLoadError = new Error("Registry file not found");
      return false;
    }

    const content = fs.readFileSync(REGISTRY_PATH, "utf-8");
    registry = JSON.parse(content);

    log.info("Loaded registry v" + registry.contractVersion);
    log.info("Handlers:", Object.keys(registry.handlers).length);
    log.info("File types:", Object.keys(registry.fileTypeIndex).length);
    return true;
  } catch (error) {
    registryLoadError = error;
    log.error("Failed to load registry:", error.message);
    return false;
  }
}

/**
 * Check if registry is loaded and available
 */
function isRegistryLoaded() {
  return registry !== null;
}

/**
 * Get registry load error if any
 */
function getRegistryError() {
  return registryLoadError;
}

// =============================================================================
// FILE VALIDATION
// =============================================================================

/**
 * Validate an uploaded file by extension
 *
 * @param {string} filename - Original filename with extension
 * @returns {Object} Validation result with handler info
 */
function validateUpload(filename) {
  const ext = path.extname(filename).toLowerCase().replace(".", "");

  if (!registry) {
    return {
      valid: false,
      extension: ext,
      handlerType: null,
      displayName: null,
      mimeType: null,
      error: "Registry not loaded",
    };
  }

  const indexEntry = registry.fileTypeIndex[ext];

  if (!indexEntry) {
    return {
      valid: false,
      extension: ext,
      handlerType: null,
      displayName: null,
      mimeType: null,
      error: `Unsupported file type: .${ext}`,
    };
  }

  // Get full file type info from handler manifest
  const handler = registry.handlers[indexEntry.handlerType];
  const fileType = handler?.fileTypes.find(
    (ft) => ft.extension.toLowerCase() === ext
  );

  return {
    valid: true,
    extension: ext,
    handlerType: indexEntry.handlerType,
    displayName: indexEntry.displayName,
    mimeType: fileType?.mimeType || null,
    icon: indexEntry.icon,
    color: indexEntry.color,
  };
}

/**
 * Validate file content using magic bytes
 *
 * @param {string} filename - Original filename
 * @param {Buffer} buffer - File buffer (first 512 bytes minimum)
 * @returns {Object} Validation result with detected type
 */
function validateUploadWithMagicBytes(filename, buffer) {
  const extensionResult = validateUpload(filename);

  // If extension validation failed, try to detect type from magic bytes
  if (!extensionResult.valid || !registry) {
    return detectFileType(buffer);
  }

  // Verify magic bytes match claimed extension
  const handler = registry.handlers[extensionResult.handlerType];
  const fileType = handler?.fileTypes.find(
    (ft) => ft.extension.toLowerCase() === extensionResult.extension
  );

  if (fileType?.magicBytes) {
    const expectedBytes = Buffer.from(fileType.magicBytes, "hex");
    const offset = fileType.magicBytesOffset || 0;
    const actualBytes = buffer.slice(offset, offset + expectedBytes.length);

    const primaryMatch = actualBytes.equals(expectedBytes);

    // Check alternative magic bytes if primary doesn't match
    let altMatch = false;
    if (!primaryMatch && fileType.altMagicBytes) {
      for (const altHex of fileType.altMagicBytes) {
        const altBytes = Buffer.from(altHex, "hex");
        const altActual = buffer.slice(offset, offset + altBytes.length);
        if (altActual.equals(altBytes)) {
          altMatch = true;
          break;
        }
      }
    }

    if (!primaryMatch && !altMatch) {
      // Try to detect what the file actually is
      const detected = detectFileType(buffer);
      return {
        ...extensionResult,
        valid: false,
        error: `File content does not match .${
          extensionResult.extension
        } format. ${
          detected.valid
            ? `Detected as: ${detected.displayName}`
            : "Unknown format"
        }`,
      };
    }
  }

  return extensionResult;
}

/**
 * Detect file type from magic bytes alone
 */
function detectFileType(buffer) {
  if (!registry) {
    return {
      valid: false,
      extension: "",
      handlerType: null,
      displayName: null,
      mimeType: null,
      error: "Registry not loaded",
    };
  }

  // Check all known magic byte signatures
  for (const handler of Object.values(registry.handlers)) {
    for (const fileType of handler.fileTypes) {
      if (!fileType.magicBytes) continue;

      const offset = fileType.magicBytesOffset || 0;
      const expectedBytes = Buffer.from(fileType.magicBytes, "hex");

      if (buffer.length < offset + expectedBytes.length) continue;

      const actualBytes = buffer.slice(offset, offset + expectedBytes.length);

      if (actualBytes.equals(expectedBytes)) {
        return {
          valid: true,
          extension: fileType.extension,
          handlerType: handler.type,
          displayName: fileType.displayName,
          mimeType: fileType.mimeType,
        };
      }

      // Check alternatives
      if (fileType.altMagicBytes) {
        for (const altHex of fileType.altMagicBytes) {
          const altBytes = Buffer.from(altHex, "hex");
          if (buffer.length < offset + altBytes.length) continue;

          const altActual = buffer.slice(offset, offset + altBytes.length);
          if (altActual.equals(altBytes)) {
            return {
              valid: true,
              extension: fileType.extension,
              handlerType: handler.type,
              displayName: fileType.displayName,
              mimeType: fileType.mimeType,
            };
          }
        }
      }
    }
  }

  return {
    valid: false,
    extension: "",
    handlerType: null,
    displayName: null,
    mimeType: null,
    error: "Unable to detect file type from content",
  };
}

// =============================================================================
// HANDLER QUERIES
// =============================================================================

/**
 * Get the handler type for a file extension
 *
 * @param {string} extension - File extension (with or without dot)
 * @returns {string|null} Handler type or null if not supported
 */
function getHandlerForExtension(extension) {
  if (!registry) return null;

  const ext = extension.toLowerCase().replace(".", "");
  return registry.fileTypeIndex[ext]?.handlerType || null;
}

/**
 * Get full handler manifest by type
 *
 * @param {string} type - Handler type (e.g., 'vtk')
 * @returns {Object|null} Handler manifest or null
 */
function getHandlerManifest(type) {
  if (!registry) return null;
  return registry.handlers[type] || null;
}

/**
 * Get all supported file extensions
 *
 * @returns {string[]} Array of supported extensions
 */
function getSupportedExtensions() {
  if (!registry) return [];
  return Object.keys(registry.fileTypeIndex);
}

/**
 * Check if an extension is supported
 */
function isExtensionSupported(extension) {
  if (!registry) return false;
  const ext = extension.toLowerCase().replace(".", "");
  return ext in registry.fileTypeIndex;
}

// =============================================================================
// DISPLAY INFO
// =============================================================================

/**
 * Get display info for a file extension
 *
 * @param {string} extension - File extension
 * @returns {Object|null} Display info or null
 */
function getFileTypeDisplayInfo(extension) {
  if (!registry) return null;

  const ext = extension.toLowerCase().replace(".", "");
  const indexEntry = registry.fileTypeIndex[ext];

  if (!indexEntry) return null;

  // Get MIME type from handler
  const handler = registry.handlers[indexEntry.handlerType];
  const fileType = handler?.fileTypes.find(
    (ft) => ft.extension.toLowerCase() === ext
  );

  return {
    extension: ext,
    displayName: indexEntry.displayName,
    icon: indexEntry.icon,
    color: indexEntry.color,
    handlerType: indexEntry.handlerType,
    mimeType: fileType?.mimeType || "application/octet-stream",
  };
}

/**
 * Get display info for all supported file types
 *
 * @returns {Array} Array of display info objects
 */
function getAllFileTypeDisplayInfo() {
  if (!registry) return [];

  return Object.entries(registry.fileTypeIndex).map(([ext, entry]) => {
    const handler = registry.handlers[entry.handlerType];
    const fileType = handler?.fileTypes.find(
      (ft) => ft.extension.toLowerCase() === ext
    );

    return {
      extension: ext,
      displayName: entry.displayName,
      icon: entry.icon,
      color: entry.color,
      handlerType: entry.handlerType,
      mimeType: fileType?.mimeType || "application/octet-stream",
    };
  });
}

// =============================================================================
// COMPUTE ROUTING
// =============================================================================

/**
 * Get the worker type for a handler's server-side compute
 *
 * @param {string} handlerType - Handler type
 * @returns {string|null} Worker type string or null
 */
function getComputeWorkerType(handlerType) {
  if (!registry) return null;

  const handler = registry.handlers[handlerType];
  return handler?.compute?.serverSide?.workerType || null;
}

/**
 * Get server-side operations supported by a handler
 *
 * @param {string} handlerType - Handler type
 * @returns {Array} Array of operation definitions
 */
function getServerOperations(handlerType) {
  if (!registry) return [];

  const handler = registry.handlers[handlerType];
  return handler?.compute?.serverSide?.operations || [];
}

// =============================================================================
// EXPRESS MIDDLEWARE
// =============================================================================

/**
 * Express middleware to validate file uploads using registry
 */
function createValidationMiddleware(options = {}) {
  const { allowedExtensions = null, validateMagicBytes = false } = options;

  return async (req, res, next) => {
    if (!req.file) {
      return next();
    }

    let result;

    if (validateMagicBytes && req.file.buffer) {
      result = validateUploadWithMagicBytes(
        req.file.originalname,
        req.file.buffer
      );
    } else {
      result = validateUpload(req.file.originalname);
    }

    if (!result.valid) {
      return res.status(400).json({
        error: "Invalid file type",
        message: result.error,
        extension: result.extension,
      });
    }

    // Check against allowed extensions if specified
    if (allowedExtensions && !allowedExtensions.includes(result.extension)) {
      return res.status(400).json({
        error: "File type not allowed",
        message: `Extension .${result.extension} is not in the allowed list`,
        allowed: allowedExtensions,
      });
    }

    // Attach validation result to request
    req.fileValidation = result;
    next();
  };
}

// =============================================================================
// INITIALIZATION
// =============================================================================

// Try to load registry on module import
const loaded = loadRegistry();
if (!loaded) {
  log.warn("Registry not loaded - using fallback validation until build runs");
}

// Export reload function for hot-reloading in development
function reloadRegistry() {
  registry = null;
  registryLoadError = null;
  return loadRegistry();
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Loading
  loadRegistry,
  reloadRegistry,
  isRegistryLoaded,
  getRegistryError,

  // Validation
  validateUpload,
  validateUploadWithMagicBytes,

  // Queries
  getHandlerForExtension,
  getHandlerManifest,
  getSupportedExtensions,
  isExtensionSupported,

  // Display
  getFileTypeDisplayInfo,
  getAllFileTypeDisplayInfo,

  // Compute
  getComputeWorkerType,
  getServerOperations,

  // Middleware
  createValidationMiddleware,
};
