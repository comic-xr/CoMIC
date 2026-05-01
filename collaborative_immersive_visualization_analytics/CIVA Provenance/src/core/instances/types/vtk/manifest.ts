/**
 * VTK Instance Handler Manifest
 *
 * Single source of truth for VTK handler capabilities.
 * This manifest declares what file types VTK can handle, what operations
 * it supports, and its collaboration/VR capabilities.
 *
 * The build script validates this manifest and generates registry.json
 * for server consumption. The handler itself imports from here to ensure
 * consistency between declared and actual capabilities.
 *
 * @module vtk/manifest
 */

import {
  CONTRACT_VERSION,
  type HandlerManifest,
  type FileTypeCapability,
} from "../contracts/index";

// =============================================================================
// FILE TYPE CAPABILITIES
// =============================================================================

/**
 * VTK XML PolyData - Primary format for mesh data
 * High priority, full metadata extraction support
 */
const vtpCapability: FileTypeCapability = {
  extension: "vtp",
  mimeType: "application/vnd.vtk.polydata+xml",
  displayName: "VTK PolyData (XML)",
  icon: "hexagon",
  color: "#c084fc", // Purple for VTK formats
  priority: 10,
  magicBytes: "3c3f786d6c", // <?xml
  altMagicBytes: ["3c56544b46696c65"], // <VTKFile
  capabilities: {
    canRender: true,
    canExtractMetadata: true,
    canExport: false,
    canStream: false,
  },
};

/**
 * VTK XML Image Data - Volume/image data
 * High priority, full metadata extraction support
 */
const vtiCapability: FileTypeCapability = {
  extension: "vti",
  mimeType: "application/vnd.vtk.imagedata+xml",
  displayName: "VTK Image Data (XML)",
  icon: "grid3x3",
  color: "#60a5fa", // Blue for image data
  priority: 10,
  magicBytes: "3c3f786d6c", // <?xml
  altMagicBytes: ["3c56544b46696c65"], // <VTKFile
  capabilities: {
    canRender: true,
    canExtractMetadata: true,
    canExport: false,
    canStream: false,
  },
};

/**
 * VTK XML Unstructured Grid - Complex mesh data
 * High priority, full metadata extraction support
 */
const vtuCapability: FileTypeCapability = {
  extension: "vtu",
  mimeType: "application/vnd.vtk.unstructuredgrid+xml",
  displayName: "VTK Unstructured Grid (XML)",
  icon: "share2",
  color: "#34d399", // Green for unstructured
  priority: 10,
  magicBytes: "3c3f786d6c", // <?xml
  altMagicBytes: ["3c56544b46696c65"], // <VTKFile
  capabilities: {
    canRender: true,
    canExtractMetadata: true,
    canExport: false,
    canStream: false,
  },
};

/**
 * VTK Legacy Format - Older binary/ASCII format
 * Lower priority, limited metadata extraction
 */
const vtkCapability: FileTypeCapability = {
  extension: "vtk",
  mimeType: "application/vnd.vtk",
  displayName: "VTK Legacy Format",
  icon: "box",
  color: "#a78bfa", // Lighter purple for legacy
  priority: 8,
  magicBytes: "232076746b2044617461", // # vtk Data
  capabilities: {
    canRender: true,
    canExtractMetadata: false, // Legacy format is harder to parse quickly
    canExport: false,
    canStream: false,
  },
};

/**
 * VTK.js Dataset - zipped bundle format
 * Supports multiple VTK dataset types through the vtkjs container
 */
const vtkjsCapability: FileTypeCapability = {
  extension: "vtkjs",
  mimeType: "application/vnd.vtkjs+zip",
  displayName: "VTK.js Dataset",
  icon: "package",
  color: "#38bdf8", // Sky blue for VTK.js bundles
  priority: 9,
  magicBytes: "504b0304", // PK.. (zip)
  capabilities: {
    canRender: true,
    canExtractMetadata: false,
    canExport: false,
    canStream: false,
  },
};

/**
 * STL Model - Common 3D printing format
 * Medium priority, export support
 */
const stlCapability: FileTypeCapability = {
  extension: "stl",
  mimeType: "model/stl",
  displayName: "STL Model",
  icon: "triangle",
  color: "#f472b6", // Pink for STL
  priority: 5,
  magicBytes: "736f6c6964", // solid (ASCII STL)
  capabilities: {
    canRender: true,
    canExtractMetadata: false,
    canExport: true,
    canStream: false,
  },
};

/**
 * Wavefront OBJ - Common interchange format
 * Medium priority, no metadata extraction
 */
const objCapability: FileTypeCapability = {
  extension: "obj",
  mimeType: "model/obj",
  displayName: "Wavefront OBJ",
  icon: "cube",
  color: "#fbbf24", // Amber for OBJ
  priority: 5,
  // OBJ files typically start with comments (#) or vertex data (v )
  magicBytes: "23", // # (comment)
  altMagicBytes: ["76202d"], // v - (vertex)
  capabilities: {
    canRender: true,
    canExtractMetadata: false,
    canExport: false,
    canStream: false,
  },
};

/**
 * PLY Point Cloud - Stanford polygon format
 * Medium priority, metadata extraction support
 */
const plyCapability: FileTypeCapability = {
  extension: "ply",
  mimeType: "application/x-ply",
  displayName: "PLY Point Cloud",
  icon: "scatter-chart",
  color: "#22d3ee", // Cyan for point clouds
  priority: 5,
  magicBytes: "706c79", // ply
  capabilities: {
    canRender: true,
    canExtractMetadata: true,
    canExport: false,
    canStream: false,
  },
};

// =============================================================================
// VTK HANDLER MANIFEST
// =============================================================================

/**
 * Complete VTK handler manifest
 * Exported for use by build script and handler
 */
export const vtkManifest: HandlerManifest = {
  contractVersion: CONTRACT_VERSION,
  type: "vtk",
  displayName: "VTK 3D Visualization",
  version: "1.0.0",
  description:
    "High-performance 3D visualization using VTK.js for scientific data, medical imaging, and engineering applications.",

  fileTypes: [
    vtpCapability,
    vtiCapability,
    vtuCapability,
    vtkCapability,
    vtkjsCapability,
    stlCapability,
    objCapability,
    plyCapability,
  ],

  runtime: {
    requires: ["webgl", "webgl2"],
    optional: ["webxr", "offscreencanvas"],
  },

  vr: {
    supportsInstanceVR: true,
    supportsApplicationVR: false,
    requirements: {
      controllers: true,
      handTracking: false,
      roomScale: true,
      minFPS: 90,
    },
  },

  collaboration: {
    supportsCursors: true,
    supportsAnnotations: true,
    supportsSharedState: true,
    supportsCameraSync: true,
    },

    compute: {
      clientSide: {
        operations: [
          "pca",
          "tsne",
          "umap",
          "clipping",
          "slicing",
          "contouring",
          "point-picking",
          "measurement",
        ],
        maxDatasetSize: "100MB",
        maxPointCount: 5_000_000,
      },
      serverSide: {
        operations: [
          // Dimensionality reduction (server/offloaded with cache)
          {
            id: "dr-pca",
            name: "PCA (Server)",
            description:
              "Principal Component Analysis offloaded to server with caching",
            inputFormats: ["vtp", "ply", "obj", "stl"],
            outputFormat: "json",
            requiredForVR: false,
            cacheable: true,
            computeCost: 3,
            estimatedDuration: "seconds",
            parameters: [
              {
                name: "components",
                type: "number",
                label: "Components",
                default: 3,
                min: 2,
                max: 3,
              },
            ],
            workerType: "general",
          },
          {
            id: "dr-tsne",
            name: "t-SNE (Server)",
            description:
              "t-SNE dimensionality reduction offloaded to server with caching",
            inputFormats: ["vtp", "ply", "obj", "stl"],
            outputFormat: "json",
            requiredForVR: false,
            cacheable: true,
            computeCost: 7,
            estimatedDuration: "minutes",
            parameters: [
              {
                name: "components",
                type: "number",
                label: "Components",
                default: 2,
                min: 2,
                max: 3,
              },
              {
                name: "perplexity",
                type: "number",
                label: "Perplexity",
                default: 10,
                min: 5,
                max: 50,
              },
              {
                name: "maxIterations",
                type: "number",
                label: "Max Iterations",
                default: 300,
                min: 50,
                max: 1000,
              },
            ],
            workerType: "general",
          },
          {
            id: "dr-umap",
            name: "UMAP (Server)",
            description:
              "UMAP dimensionality reduction offloaded to server with caching",
            inputFormats: ["vtp", "ply", "obj", "stl"],
            outputFormat: "json",
            requiredForVR: false,
            cacheable: true,
            computeCost: 6,
            estimatedDuration: "seconds",
            parameters: [
              {
                name: "components",
                type: "number",
                label: "Components",
                default: 2,
                min: 2,
                max: 3,
              },
              {
                name: "nNeighbors",
                type: "number",
                label: "Neighbors",
                default: 8,
                min: 2,
                max: 100,
              },
              {
                name: "minDist",
                type: "number",
                label: "Min Dist",
                default: 0.1,
                min: 0.01,
                max: 0.99,
              },
            ],
            workerType: "general",
          },
        // =====================================================
        // MESH OPERATIONS
        // =====================================================
        {
          id: "mesh-decimation",
          name: "Mesh Decimation",
          description:
            "Reduce polygon count while preserving shape quality. Uses quadric error metrics for optimal vertex placement.",
          inputFormats: ["vtp", "stl", "obj", "ply"],
          outputFormat: "vtp",
          requiredForVR: false,
          cacheable: true,
          computeCost: 5,
          estimatedDuration: "seconds",
          parameters: [
            {
              name: "targetReduction",
              type: "number",
              label: "Target Reduction %",
              default: 50,
              min: 10,
              max: 95,
              description:
                "Percentage of polygons to remove (50 = reduce to half)",
            },
            {
              name: "preserveBoundary",
              type: "boolean",
              label: "Preserve Boundary",
              default: true,
              description: "Prevent boundary edges from being modified",
            },
          ],
          workerType: "vtk-python",
        },
        {
          id: "mesh-smoothing",
          name: "Mesh Smoothing",
          description:
            "Apply Laplacian smoothing to reduce surface noise while preserving features.",
          inputFormats: ["vtp", "stl", "obj", "ply"],
          outputFormat: "vtp",
          requiredForVR: false,
          cacheable: true,
          computeCost: 3,
          estimatedDuration: "seconds",
          parameters: [
            {
              name: "iterations",
              type: "number",
              label: "Iterations",
              default: 20,
              min: 1,
              max: 100,
              description: "Number of smoothing passes",
            },
            {
              name: "relaxationFactor",
              type: "number",
              label: "Relaxation Factor",
              default: 0.1,
              min: 0.01,
              max: 1.0,
              description: "Strength of smoothing per iteration",
            },
          ],
          workerType: "vtk-python",
        },

        // =====================================================
        // VR-REQUIRED PREPROCESSING
        // =====================================================
        {
          id: "lod-generation",
          name: "LOD Generation",
          description:
            "Generate Level-of-Detail hierarchy for progressive rendering. Creates multiple resolution levels for efficient VR streaming.",
          inputFormats: ["vtp", "stl", "obj", "ply"],
          outputFormat: "lod-hierarchy",
          requiredForVR: true,
          cacheable: true,
          computeCost: 7,
          estimatedDuration: "minutes",
          parameters: [
            {
              name: "levels",
              type: "number",
              label: "LOD Levels",
              default: 4,
              min: 2,
              max: 8,
              description: "Number of detail levels to generate",
            },
            {
              name: "reductionRatio",
              type: "number",
              label: "Reduction Ratio",
              default: 0.5,
              min: 0.25,
              max: 0.75,
              description: "Polygon reduction between each level",
            },
          ],
          workerType: "vtk-python",
        },
        {
          id: "volume-chunking",
          name: "Volume Chunking",
          description:
            "Split volumetric data into streamable octree chunks for progressive VR loading.",
          inputFormats: ["vti"],
          outputFormat: "chunked-volume",
          requiredForVR: true,
          cacheable: true,
          computeCost: 8,
          estimatedDuration: "minutes",
          parameters: [
            {
              name: "chunkSize",
              type: "number",
              label: "Chunk Size",
              default: 64,
              min: 16,
              max: 256,
              description: "Size of each chunk in voxels (per dimension)",
            },
            {
              name: "overlap",
              type: "number",
              label: "Overlap",
              default: 2,
              min: 0,
              max: 8,
              description: "Overlap between chunks for seamless rendering",
            },
          ],
          workerType: "vtk-python",
        },

        // =====================================================
        // EXTRACTION OPERATIONS
        // =====================================================
        {
          id: "isosurface-extraction",
          name: "Isosurface Extraction",
          description:
            "Extract surface mesh from volumetric data at specified threshold value.",
          inputFormats: ["vti"],
          outputFormat: "vtp",
          requiredForVR: false,
          cacheable: true,
          computeCost: 6,
          estimatedDuration: "seconds",
          parameters: [
            {
              name: "isoValue",
              type: "number",
              label: "Iso Value",
              default: 0.5,
              min: 0,
              max: 1,
              description: "Threshold value for surface extraction",
            },
            {
              name: "computeNormals",
              type: "boolean",
              label: "Compute Normals",
              default: true,
              description: "Calculate surface normals for smooth shading",
            },
          ],
          workerType: "vtk-python",
        },

        // =====================================================
        // ANALYSIS OPERATIONS
        // =====================================================
        {
          id: "compute-statistics",
          name: "Compute Statistics",
          description:
            "Calculate statistical properties of the dataset (bounds, point count, data ranges).",
          inputFormats: ["vtp", "vti", "vtu", "vtk", "stl", "obj", "ply"],
          outputFormat: "json",
          requiredForVR: false,
          cacheable: true,
          computeCost: 2,
          estimatedDuration: "instant",
          parameters: [],
          workerType: "vtk-python",
        },
      ],

      workerType: "vtk-python",
      preferredRuntime: "python",

      // Auto-run these on upload for VR-destined files
      autoPreprocess: ["compute-statistics"],
    },
    caching: {
      preprocessResults: true,
      cacheKey: ["datasetId", "operation", "parameters", "fileVersion"],
      ttl: "7d",
      invalidateOn: ["dataset-update", "dataset-delete"],
    },
  },

  tools: [], // Empty for Phase 1 - tools defined in handler getTools()

  entry: {
    client: "./VTKInstanceHandler.js",
    server: undefined, // No server-side handler yet
  },
};

// =============================================================================
// EXPORTS FOR HANDLER USE
// =============================================================================

/**
 * Export individual file type capabilities for handler use
 * Handler can import these to build getSupportedFileTypes() return value
 */
export const fileTypes = {
  vtp: vtpCapability,
  vti: vtiCapability,
  vtu: vtuCapability,
  vtk: vtkCapability,
  stl: stlCapability,
  obj: objCapability,
  ply: plyCapability,
};

/**
 * Get file type capability by extension
 */
export function getFileTypeCapability(
  extension: string
): FileTypeCapability | undefined {
  return vtkManifest.fileTypes.find(
    (ft) => ft.extension.toLowerCase() === extension.toLowerCase()
  );
}

/**
 * Check if VTK handler supports a file extension
 */
export function supportsExtension(extension: string): boolean {
  return vtkManifest.fileTypes.some(
    (ft) => ft.extension.toLowerCase() === extension.toLowerCase()
  );
}

/**
 * Get all supported extensions
 */
export function getSupportedExtensions(): string[] {
  return vtkManifest.fileTypes.map((ft) => ft.extension);
}

// Default export for convenience
export default vtkManifest;
