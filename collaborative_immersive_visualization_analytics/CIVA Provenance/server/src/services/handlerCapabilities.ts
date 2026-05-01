/**
 * Handler Capabilities Service
 *
 * Server-side service for querying handler capabilities from the manifest registry.
 * Loads the generated registry.json at startup and provides methods for:
 * - File upload validation (extension + magic bytes)
 * - Handler routing (which handler can process this file)
 * - Display info (icons, colors for UI)
 *
 * This service replaces the hardcoded file type knowledge in fileTypeValidator.js
 * by reading from the manifest-generated registry.
 *
 * @module server/services/handlerCapabilities
 */

import * as fs from "fs";
import * as path from "path";

// Type definitions for the registry structure
// (Mirrored from contracts since server may not have access to client types)

interface FileTypeCapability {
  extension: string;
  mimeType: string;
  displayName: string;
  icon: string;
  color: string;
  priority: number;
  magicBytes?: string;
  altMagicBytes?: string[];
  magicBytesOffset?: number;
  capabilities: {
    canRender: boolean;
    canExtractMetadata: boolean;
    canExport: boolean;
    canStream?: boolean;
  };
}

interface HandlerManifest {
  contractVersion: string;
  type: string;
  displayName: string;
  version: string;
  fileTypes: FileTypeCapability[];
  compute: {
    serverSide: {
      operations: Array<{ id: string; name: string }>;
      workerType: string;
    };
  };
}

interface ManifestRegistry {
  generatedAt: string;
  contractVersion: string;
  handlers: Record<string, HandlerManifest>;
  fileTypeIndex: Record<
    string,
    {
      handlerType: string;
      priority: number;
      displayName: string;
      icon: string;
      color: string;
    }
  >;
}

// =============================================================================
// REGISTRY LOADING
// =============================================================================

let registry: ManifestRegistry | null = null;
let registryLoadError: Error | null = null;

/**
 * Path to the registry file
 */
const REGISTRY_PATH = path.resolve(__dirname, "../../manifests/registry.json");

/**
 * Load the manifest registry from disk
 * Called once at server startup
 */
export function loadRegistry(): void {
  try {
    if (!fs.existsSync(REGISTRY_PATH)) {
      console.warn(
        `[handlerCapabilities] Registry not found at ${REGISTRY_PATH}`
      );
      console.warn(
        '[handlerCapabilities] Run "npm run build:manifests" to generate'
      );
      registryLoadError = new Error("Registry file not found");
      return;
    }

    const content = fs.readFileSync(REGISTRY_PATH, "utf-8");
    registry = JSON.parse(content) as ManifestRegistry;

    console.log(
      `[handlerCapabilities] Loaded registry v${registry.contractVersion}`
    );
    console.log(
      `[handlerCapabilities] Handlers: ${Object.keys(registry.handlers).length}`
    );
    console.log(
      `[handlerCapabilities] File types: ${
        Object.keys(registry.fileTypeIndex).length
      }`
    );
  } catch (error) {
    registryLoadError = error as Error;
    console.error("[handlerCapabilities] Failed to load registry:", error);
  }
}

/**
 * Check if registry is loaded and available
 */
export function isRegistryLoaded(): boolean {
  return registry !== null;
}

/**
 * Get registry load error if any
 */
export function getRegistryError(): Error | null {
  return registryLoadError;
}

// =============================================================================
// FILE VALIDATION
// =============================================================================

/**
 * Result of file validation
 */
export interface ValidationResult {
  valid: boolean;
  extension: string;
  handlerType: string | null;
  displayName: string | null;
  mimeType: string | null;
  error?: string;
}

/**
 * Validate an uploaded file by extension
 *
 * @param filename - Original filename with extension
 * @returns Validation result with handler info
 */
export function validateUpload(filename: string): ValidationResult {
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
  };
}

/**
 * Validate file content using magic bytes
 *
 * @param filename - Original filename
 * @param buffer - File buffer (first 512 bytes minimum)
 * @returns Validation result with detected type
 */
export function validateUploadWithMagicBytes(
  filename: string,
  buffer: Buffer
): ValidationResult {
  const extensionResult = validateUpload(filename);

  // If extension validation failed, try to detect type from magic bytes
  if (!extensionResult.valid || !registry) {
    return detectFileType(buffer);
  }

  // Verify magic bytes match claimed extension
  const handler = registry.handlers[extensionResult.handlerType!];
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
function detectFileType(buffer: Buffer): ValidationResult {
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
 * @param extension - File extension (with or without dot)
 * @returns Handler type or null if not supported
 */
export function getHandlerForExtension(extension: string): string | null {
  if (!registry) return null;

  const ext = extension.toLowerCase().replace(".", "");
  return registry.fileTypeIndex[ext]?.handlerType || null;
}

/**
 * Get full handler manifest by type
 *
 * @param type - Handler type (e.g., 'vtk')
 * @returns Handler manifest or null
 */
export function getHandlerManifest(type: string): HandlerManifest | null {
  if (!registry) return null;
  return registry.handlers[type] || null;
}

/**
 * Get all supported file extensions
 *
 * @returns Array of supported extensions
 */
export function getSupportedExtensions(): string[] {
  if (!registry) return [];
  return Object.keys(registry.fileTypeIndex);
}

/**
 * Check if an extension is supported
 */
export function isExtensionSupported(extension: string): boolean {
  if (!registry) return false;
  const ext = extension.toLowerCase().replace(".", "");
  return ext in registry.fileTypeIndex;
}

// =============================================================================
// DISPLAY INFO
// =============================================================================

/**
 * Display info for a file type
 */
export interface FileTypeDisplayInfo {
  extension: string;
  displayName: string;
  icon: string;
  color: string;
  handlerType: string;
  mimeType: string;
}

/**
 * Get display info for a file extension
 *
 * @param extension - File extension
 * @returns Display info or null
 */
export function getFileTypeDisplayInfo(
  extension: string
): FileTypeDisplayInfo | null {
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
 * @returns Array of display info objects
 */
export function getAllFileTypeDisplayInfo(): FileTypeDisplayInfo[] {
  if (!registry) return [];

  return Object.entries(registry.fileTypeIndex).map(([ext, entry]) => {
    const handler = registry!.handlers[entry.handlerType];
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
 * @param handlerType - Handler type
 * @returns Worker type string or null
 */
export function getComputeWorkerType(handlerType: string): string | null {
  if (!registry) return null;

  const handler = registry.handlers[handlerType];
  return handler?.compute?.serverSide?.workerType || null;
}

/**
 * Get server-side operations supported by a handler
 *
 * @param handlerType - Handler type
 * @returns Array of operation definitions
 */
export function getServerOperations(
  handlerType: string
): Array<{ id: string; name: string }> {
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
export function createValidationMiddleware(
  options: {
    allowedExtensions?: string[];
    validateMagicBytes?: boolean;
  } = {}
) {
  return async (req: any, res: any, next: any) => {
    if (!req.file) {
      return next();
    }

    const { allowedExtensions, validateMagicBytes = false } = options;

    let result: ValidationResult;

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

// Auto-load registry on module import
loadRegistry();

// Export reload function for hot-reloading in development
export function reloadRegistry(): void {
  registry = null;
  registryLoadError = null;
  loadRegistry();
}
