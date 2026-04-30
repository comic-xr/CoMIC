/**
 * Type definitions for data module
 */

/** LOD (level of detail) for volumetric datasets. Matches filenames: datasetId.vti (full), datasetId_high.vti (256³), etc. */
export type LodLevel = 'full' | 'high' | 'medium' | 'low';

/** VTK.js ImageData instance (from @kitware/vtk.js/Common/DataModel/ImageData). Typed as unknown to avoid pulling in VTK types; cast at use site. */
export type VTKImageData = unknown;

/** [x, y, z] in world units. */
export type Vec3 = readonly [number, number, number];

/** [iMin, iMax, jMin, jMax, kMin, kMax] index bounds. */
export type Extent = readonly [number, number, number, number, number, number];

/** [nx, ny, nz] number of points along each axis. */
export type Dimensions = readonly [number, number, number];

/**
 * Thin abstraction of a loaded volumetric image. Use this instead of raw VTK
 * objects so the rest of the app stays independent of VTK.
 */
export interface LoadedVolume {
  dimensions: Dimensions;
  spacing: Vec3;
  origin: Vec3;
  extent: Extent;
  scalarArray:
    | Float32Array
    | Float64Array
    | Int8Array
    | Uint8Array
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array;
  numberOfComponents: number;
  scalarName?: string;
  direction?: readonly number[];
}

export interface DataConfig {
  [key: string]: string; // Map of dataset names to paths/URLs
}

export interface LoadedData {
  name: string;
  data: unknown[];
  metadata: {
    loadedAt: number;
    rowCount: number;
    columnCount?: number;
  };
}

export interface DataPoint {
  [key: string]: number | string | boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}
