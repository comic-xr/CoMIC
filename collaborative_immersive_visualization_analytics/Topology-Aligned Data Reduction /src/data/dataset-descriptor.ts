/**
 * Dataset descriptor: JSON metadata for a volumetric dataset (grid, resolution, scalar fields, size).
 * Used by loader and LOD manager; no magic numbers — all from descriptor or config.
 */

import type { Dimensions, LodLevel } from './types';

/** Resolution level for loading (maps to LOD / backend reduce level). */
export type ResolutionLevel = 'coarse' | 'medium' | 'fine' | 'feature';

/** Descriptor for one scalar field in the dataset. */
export interface ScalarFieldDescriptor {
  name: string;
  numberOfComponents: number;
  dataType: string;
  range?: [number, number];
}

/** Dataset descriptor JSON schema (grid dimensions, resolution level, scalar fields, file size, voxel count). */
export interface DatasetDescriptor {
  id: string;
  /** Grid dimensions [nx, ny, nz]. */
  gridDimensions: Dimensions;
  /** Resolution level this descriptor describes. */
  resolutionLevel: ResolutionLevel;
  /** LOD level label for UI/backend (full | high | medium | low). */
  lodLevel: LodLevel;
  /** Scalar fields present in the dataset. */
  scalarFields: ScalarFieldDescriptor[];
  /** File size in bytes (optional). */
  fileSizeBytes?: number;
  /** Voxel count (product of gridDimensions). */
  voxelCount: number;
  /** Spacing [sx, sy, sz] (optional). */
  spacing?: [number, number, number];
  /** Origin [ox, oy, oz] (optional). */
  origin?: [number, number, number];
  /** Path or URL relative to dataset base path (optional). */
  path?: string;
}

/** Build voxel count from dimensions. */
export function voxelCountFromDimensions(dims: Dimensions): number {
  return dims[0] * dims[1] * dims[2];
}

/** Map resolution level to LOD level for backend/API. */
export function resolutionToLodLevel(level: ResolutionLevel): LodLevel {
  const map: Record<ResolutionLevel, LodLevel> = {
    coarse: 'low',
    medium: 'medium',
    fine: 'high',
    feature: 'full',
  };
  return map[level];
}

interface VtkImageDataLike {
  getDimensions(): number[];
  getSpacing(): number[];
  getOrigin(): number[];
  getPointData(): {
    getScalars(): {
      getName?(): string;
      getNumberOfComponents(): number;
      getRange(): [number, number];
      getDataType?(): string | number;
    } | null;
  } | null;
}

/**
 * Build a descriptor from a freshly-loaded vtkImageData so users don't need
 * to hand-write a `.descriptor.json` for every dataset they drop in.
 */
export function descriptorFromVtkImageData(id: string, data: unknown): DatasetDescriptor {
  const v = data as VtkImageDataLike;
  const dims = v.getDimensions() as unknown as Dimensions;
  const spacing = v.getSpacing() as unknown as [number, number, number];
  const origin = v.getOrigin() as unknown as [number, number, number];
  const scalars = v.getPointData()?.getScalars?.() ?? null;
  const name =
    (scalars && typeof scalars.getName === 'function' ? scalars.getName() : '') || 'ImageScalars';
  const numberOfComponents = scalars ? scalars.getNumberOfComponents() : 1;
  const range = scalars ? scalars.getRange() : [0, 255];
  const rawDataType = scalars && typeof scalars.getDataType === 'function' ? scalars.getDataType() : 'Float64';
  const dataType = typeof rawDataType === 'string' ? rawDataType : String(rawDataType);
  return {
    id,
    gridDimensions: dims,
    resolutionLevel: 'fine',
    lodLevel: 'high',
    scalarFields: [{ name, numberOfComponents, dataType, range: [range[0], range[1]] }],
    voxelCount: voxelCountFromDimensions(dims),
    spacing,
    origin,
  };
}
