// server/src/services/fileTypeValidator.js
// Secure file type validation using magic bytes
// Never trust file extensions - always verify actual content

const fs = require("fs");
const path = require("path");
const { createLogger } = require("../utils/logger");

const log = createLogger("files");

/**
 * Magic byte signatures for supported file types
 * Each entry contains: offset, bytes, and optional mask
 */
const MAGIC_SIGNATURES = {
  // VTK formats
  vtp: [
    { offset: 0, bytes: Buffer.from("<?xml"), description: "VTK XML PolyData" },
    {
      offset: 0,
      bytes: Buffer.from("<VTKFile"),
      description: "VTK XML format",
    },
  ],
  vti: [
    {
      offset: 0,
      bytes: Buffer.from("<?xml"),
      description: "VTK XML ImageData",
    },
    {
      offset: 0,
      bytes: Buffer.from("<VTKFile"),
      description: "VTK XML format",
    },
  ],
  vtu: [
    {
      offset: 0,
      bytes: Buffer.from("<?xml"),
      description: "VTK XML UnstructuredGrid",
    },
    {
      offset: 0,
      bytes: Buffer.from("<VTKFile"),
      description: "VTK XML format",
    },
  ],
  vtk: [
    {
      offset: 0,
      bytes: Buffer.from("# vtk DataFile"),
      description: "VTK Legacy format",
    },
  ],

  // Standard 3D formats
  stl: [
    { offset: 0, bytes: Buffer.from("solid"), description: "ASCII STL" },
    // Binary STL has 80-byte header then triangle count - check for reasonable values
    {
      offset: 0,
      bytes: null,
      validator: "stl_binary",
      description: "Binary STL",
    },
  ],
  obj: [
    // OBJ files typically start with comments or vertex data
    { offset: 0, bytes: Buffer.from("#"), description: "OBJ with comment" },
    { offset: 0, bytes: Buffer.from("v "), description: "OBJ vertex data" },
    {
      offset: 0,
      bytes: Buffer.from("mtllib"),
      description: "OBJ with material",
    },
  ],
  ply: [{ offset: 0, bytes: Buffer.from("ply"), description: "PLY format" }],
  gltf: [{ offset: 0, bytes: Buffer.from("{"), description: "glTF JSON" }],
  glb: [{ offset: 0, bytes: Buffer.from("glTF"), description: "glTF Binary" }],

  // Image formats (for textures)
  png: [
    {
      offset: 0,
      bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      description: "PNG",
    },
  ],
  jpg: [
    { offset: 0, bytes: Buffer.from([0xff, 0xd8, 0xff]), description: "JPEG" },
  ],
  jpeg: [
    { offset: 0, bytes: Buffer.from([0xff, 0xd8, 0xff]), description: "JPEG" },
  ],

  // Data formats
  csv: [
    // CSV is text-based, check for printable ASCII
    { offset: 0, bytes: null, validator: "csv_text", description: "CSV text" },
  ],
  json: [
    { offset: 0, bytes: Buffer.from("{"), description: "JSON object" },
    { offset: 0, bytes: Buffer.from("["), description: "JSON array" },
  ],

  // Compressed formats
  zip: [
    {
      offset: 0,
      bytes: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      description: "ZIP archive",
    },
  ],
  gz: [{ offset: 0, bytes: Buffer.from([0x1f, 0x8b]), description: "GZIP" }],

  // NIfTI medical imaging
  nii: [
    {
      offset: 0,
      bytes: Buffer.from([0x6e, 0x2b, 0x31, 0x00]),
      description: "NIfTI-1 single file",
    },
    {
      offset: 0,
      bytes: Buffer.from([0x6e, 0x69, 0x31, 0x00]),
      description: "NIfTI-1",
    },
  ],

  // DICOM medical imaging
  dcm: [{ offset: 128, bytes: Buffer.from("DICM"), description: "DICOM" }],
  dicom: [{ offset: 128, bytes: Buffer.from("DICM"), description: "DICOM" }],
};

/**
 * File categories for access control and processing
 */
const FILE_CATEGORIES = {
  mesh: ["vtp", "vtu", "stl", "obj", "ply", "gltf", "glb"],
  volume: ["vti", "nii", "dcm", "dicom"],
  legacy_vtk: ["vtk"],
  image: ["png", "jpg", "jpeg"],
  data: ["csv", "json"],
  archive: ["zip", "gz"],
};

/**
 * Custom validators for complex file types
 */
const CUSTOM_VALIDATORS = {
  /**
   * Binary STL validation
   * Binary STL: 80-byte header + 4-byte triangle count + triangles
   */
  stl_binary: (buffer) => {
    if (buffer.length < 84) return false;

    // Read triangle count (little-endian at offset 80)
    const triangleCount = buffer.readUInt32LE(80);

    // Each triangle is 50 bytes (normal + 3 vertices + attribute)
    const expectedSize = 84 + triangleCount * 50;

    // Allow some tolerance for file size
    return (
      triangleCount > 0 &&
      triangleCount < 10000000 && // Reasonable limit
      Math.abs(buffer.length - expectedSize) < 100
    );
  },

  /**
   * CSV text validation
   * Check for printable ASCII/UTF-8 text
   */
  csv_text: (buffer) => {
    // Check first 1000 bytes for printable characters
    const sample = buffer.slice(0, Math.min(1000, buffer.length));

    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      // Allow printable ASCII, newlines, tabs, and UTF-8 continuation bytes
      if (byte < 9 || (byte > 13 && byte < 32 && byte !== 27)) {
        // Allow UTF-8 continuation bytes (0x80-0xBF) and start bytes (0xC0-0xFF)
        if (byte < 0x80 || byte > 0xbf) {
          if (byte < 0xc0) {
            return false;
          }
        }
      }
    }

    // Look for common CSV patterns
    const text = sample.toString("utf8");
    return text.includes(",") || text.includes("\t") || text.includes(";");
  },
};

/**
 * Validate file type using magic bytes
 * @param {string|Buffer} input - File path or buffer
 * @param {string} claimedExtension - The extension claimed by the file
 * @returns {Promise<object>} Validation result
 */
async function validateFileType(input, claimedExtension = null) {
  let buffer;

  if (Buffer.isBuffer(input)) {
    buffer = input;
  } else if (typeof input === "string") {
    // Read first 512 bytes for magic detection
    const fd = await fs.promises.open(input, "r");
    buffer = Buffer.alloc(512);
    await fd.read(buffer, 0, 512, 0);
    await fd.close();

    // Get extension from path if not provided
    if (!claimedExtension) {
      claimedExtension = path.extname(input).toLowerCase().replace(".", "");
    }
  } else {
    throw new Error("Input must be a Buffer or file path");
  }

  // Normalize extension
  claimedExtension = (claimedExtension || "").toLowerCase().replace(".", "");

  const result = {
    valid: false,
    detectedType: null,
    claimedType: claimedExtension,
    category: null,
    mismatch: false,
    description: null,
    error: null,
  };

  // Try to detect actual file type
  for (const [type, signatures] of Object.entries(MAGIC_SIGNATURES)) {
    for (const sig of signatures) {
      let matched = false;

      if (sig.bytes) {
        // Check magic bytes at offset
        const slice = buffer.slice(sig.offset, sig.offset + sig.bytes.length);
        matched = sig.bytes.equals(slice);
      } else if (sig.validator && CUSTOM_VALIDATORS[sig.validator]) {
        // Use custom validator
        matched = CUSTOM_VALIDATORS[sig.validator](buffer);
      }

      if (matched) {
        result.detectedType = type;
        result.description = sig.description;
        result.category = getCategory(type);
        result.valid = true;

        // Check for extension mismatch
        if (claimedExtension && claimedExtension !== type) {
          // Some extensions are equivalent
          const equivalents = {
            jpeg: "jpg",
            dicom: "dcm",
          };

          if (
            equivalents[claimedExtension] !== type &&
            equivalents[type] !== claimedExtension
          ) {
            result.mismatch = true;
          }
        }

        return result;
      }
    }
  }

  // Special handling for VTK XML files - need deeper inspection
  if (
    buffer.slice(0, 5).toString() === "<?xml" ||
    buffer.slice(0, 8).toString() === "<VTKFile"
  ) {
    const text = buffer.toString("utf8");

    if (text.includes('type="PolyData"')) {
      result.detectedType = "vtp";
      result.description = "VTK XML PolyData";
    } else if (text.includes('type="ImageData"')) {
      result.detectedType = "vti";
      result.description = "VTK XML ImageData";
    } else if (text.includes('type="UnstructuredGrid"')) {
      result.detectedType = "vtu";
      result.description = "VTK XML UnstructuredGrid";
    } else if (text.includes('type="RectilinearGrid"')) {
      result.detectedType = "vtr";
      result.description = "VTK XML RectilinearGrid";
    } else if (text.includes('type="StructuredGrid"')) {
      result.detectedType = "vts";
      result.description = "VTK XML StructuredGrid";
    }

    if (result.detectedType) {
      result.valid = true;
      result.category = getCategory(result.detectedType);

      if (claimedExtension && claimedExtension !== result.detectedType) {
        result.mismatch = true;
      }

      return result;
    }
  }

  // Could not detect type
  result.error = "Unable to detect file type from magic bytes";
  return result;
}

/**
 * Get file category
 * @param {string} type - File type
 * @returns {string|null} Category name
 */
function getCategory(type) {
  for (const [category, types] of Object.entries(FILE_CATEGORIES)) {
    if (types.includes(type)) {
      return category;
    }
  }
  return null;
}

/**
 * Check if file type is allowed
 * @param {string} type - File type
 * @param {string[]} allowedCategories - Allowed category names
 * @returns {boolean}
 */
function isTypeAllowed(type, allowedCategories = null) {
  if (!allowedCategories) {
    // All registered types are allowed by default
    return Object.keys(MAGIC_SIGNATURES).includes(type);
  }

  const category = getCategory(type);
  return category && allowedCategories.includes(category);
}

/**
 * Get supported file extensions
 * @param {string[]} categories - Filter by categories (optional)
 * @returns {string[]} Array of extensions
 */
function getSupportedExtensions(categories = null) {
  if (!categories) {
    return Object.keys(MAGIC_SIGNATURES);
  }

  const extensions = [];
  for (const category of categories) {
    if (FILE_CATEGORIES[category]) {
      extensions.push(...FILE_CATEGORIES[category]);
    }
  }
  return [...new Set(extensions)];
}

/**
 * Express middleware for file type validation
 */
function fileTypeMiddleware(options = {}) {
  const {
    allowedCategories = null,
    rejectMismatch = true,
    fieldName = "file",
  } = options;

  return async (req, res, next) => {
    if (!req.file && (!req.files || !req.files[fieldName])) {
      return next();
    }

    const file = req.file || req.files[fieldName];

    try {
      const validation = await validateFileType(
        file.buffer || file.path,
        file.originalname
      );

      if (!validation.valid) {
        return res.status(400).json({
          error: "Invalid file type",
          message: validation.error || "Could not verify file type",
        });
      }

      if (!isTypeAllowed(validation.detectedType, allowedCategories)) {
        return res.status(400).json({
          error: "File type not allowed",
          message: `File type "${validation.detectedType}" is not allowed`,
          allowedTypes: getSupportedExtensions(allowedCategories),
        });
      }

      if (rejectMismatch && validation.mismatch) {
        return res.status(400).json({
          error: "File extension mismatch",
          message: `File claims to be "${validation.claimedType}" but is actually "${validation.detectedType}"`,
          detectedType: validation.detectedType,
        });
      }

      // Attach validation result to request
      req.fileValidation = validation;
      next();
    } catch (error) {
      log.error("File validation error:", error);
      return res.status(500).json({
        error: "File validation failed",
        message: "Could not validate file type",
      });
    }
  };
}

module.exports = {
  validateFileType,
  getCategory,
  isTypeAllowed,
  getSupportedExtensions,
  fileTypeMiddleware,
  MAGIC_SIGNATURES,
  FILE_CATEGORIES,
};
