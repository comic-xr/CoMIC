/**
 * Data Loader
 * Loads immutable assets: VTI (XML) or vtk.js HttpDataSetReader (`index.json` + sidecars).
 * See `immutable-assets.ts`. API `/api/reduce` still returns VTI bytes unless extended.
 */

import vtkXMLImageDataReader from '@kitware/vtk.js/IO/XML/XMLImageDataReader';
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import type { LoadedVolume, LodLevel, VTKImageData } from './types';
import { appConfig, isReductionApiEnabled } from '@/config';
import { store } from '@/state';

function getReductionFetchSignal(existing?: AbortSignal): AbortSignal {
  const timeoutMs = appConfig.dataset.reductionFetchTimeoutMs;
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    const t = AbortSignal.timeout(timeoutMs);
    if (existing == null) return t;
    // Prefer whichever fires first: user cancel or timeout
    if (typeof AbortSignal.any === 'function') {
      return AbortSignal.any([existing, t]);
    }
  }
  const ctrl = new AbortController();
  const ms = timeoutMs;
  const tid = setTimeout(() => ctrl.abort(), ms);
  if (existing) {
    if (existing.aborted) ctrl.abort();
    else existing.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  ctrl.signal.addEventListener('abort', () => clearTimeout(tid), { once: true });
  return ctrl.signal;
}

/** Minimal VTK ImageData-like interface used only for extraction (avoids importing VTK types). */
interface VTKImageDataLike {
  getDimensions(): number[];
  getOrigin(): number[];
  getSpacing(): number[];
  getExtent(): number[];
  getPointData(): {
    getScalars(): {
      getData():
        | Float32Array
        | Float64Array
        | Int8Array
        | Uint8Array
        | Int16Array
        | Uint16Array
        | Int32Array
        | Uint32Array;
      getNumberOfComponents(): number;
      getName?(): string;
    } | null;
  };
  getDirection?: () => number[];
}

/**
 * Builds a LoadedVolume from a VTK ImageData instance so the rest of the app
 * can use a thin abstraction instead of raw VTK objects.
 */
export function volumeFromVtkImageData(vtkImageData: VTKImageData): LoadedVolume {
  const vtk = vtkImageData as VTKImageDataLike;
  const dimensions = vtk.getDimensions() as [number, number, number];
  const origin = vtk.getOrigin() as [number, number, number];
  const spacing = vtk.getSpacing() as [number, number, number];
  const extent = vtk.getExtent() as [number, number, number, number, number, number];
  const scalars = vtk.getPointData().getScalars();
  if (scalars == null) {
    throw new Error(
      'VTK ImageData has no point scalars; volume extraction requires scalar point data.'
    );
  }
  const scalarArray = scalars.getData();
  const numberOfComponents = scalars.getNumberOfComponents();
  const scalarName = typeof scalars.getName === 'function' ? scalars.getName() : undefined;
  const direction = typeof vtk.getDirection === 'function' ? vtk.getDirection() : undefined;
  return {
    dimensions,
    spacing,
    origin,
    extent,
    scalarArray,
    numberOfComponents,
    ...(scalarName != null && { scalarName }),
    ...(direction != null &&
      direction.length === 9 && { direction: direction as readonly number[] }),
  };
}

/** Stats extracted from VTK ImageData for display (dimensions, spacing, voxel count). */
export interface VolumeStatsFromVtk {
  dimensions: readonly [number, number, number];
  spacing: readonly [number, number, number];
  voxelCount: number;
}

/** Extract dimensions, spacing, and voxel count from VTK ImageData. */
export function getVolumeStatsFromVtkImageData(vtkImageData: VTKImageData): VolumeStatsFromVtk {
  const vtk = vtkImageData as VTKImageDataLike;
  const dimensions = vtk.getDimensions() as [number, number, number];
  const spacing = vtk.getSpacing() as [number, number, number];
  const voxelCount = dimensions[0] * dimensions[1] * dimensions[2];
  return { dimensions, spacing, voxelCount };
}

/**
 * Builds the VTI URL for a dataset and LOD level.
 * - full → `${basePath}/${datasetId}.vti`
 * - high | medium | low → `${basePath}/${datasetId}_${lodLevel}.vti`
 */
export function getVtiUrlForLod(basePath: string, datasetId: string, lodLevel: LodLevel): string {
  const base = basePath.replace(/\/$/, '');
  const suffix = lodLevel === 'full' ? '' : `_${lodLevel}`;
  return `${base}/${datasetId}${suffix}.vti`;
}

/** vtk.js web dataset: folder with `index.json` (VTK HttpDataSetReader). */
export function getVtkjsIndexUrlForLod(
  basePath: string,
  datasetId: string,
  lodLevel: LodLevel
): string {
  const base = basePath.replace(/\/$/, '');
  const suffix = lodLevel === 'full' ? '' : `_${lodLevel}`;
  return `${base}/${datasetId}${suffix}/index.json`;
}

/**
 * Load vtk.js JSON manifest + binary arrays (read-only; new vtkImageData instance).
 */
export async function loadVtkjsIndex(url: string, signal?: AbortSignal): Promise<VTKImageData> {
  if (signal?.aborted) {
    throw new Error('loadVtkjsIndex: aborted');
  }
  const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });
  const onAbort = (): void => {
    try {
      reader.delete?.();
    } catch {
      /* ignore */
    }
  };
  if (signal) signal.addEventListener('abort', onAbort, { once: true });
  try {
    await reader.setUrl(url, { loadData: true });
    if (signal?.aborted) {
      throw new Error('loadVtkjsIndex: aborted');
    }
    const output = reader.getOutputData();
    if (output == null) {
      throw new Error(`vtk.js reader produced no output for ${url}`);
    }
    return output as VTKImageData;
  } finally {
    signal?.removeEventListener('abort', onAbort);
    reader.delete?.();
  }
}

export type LoadVolumeProgress = {
  phase: 'resolve' | 'fetch' | 'decode' | 'done';
  progress: number;
  message?: string;
};

/**
 * Same as `loadVolume` with coarse progress callbacks (main UI path).
 */
export async function loadVolumeWithProgress(
  datasetId: string,
  lodLevel: LodLevel = 'full',
  onProgress?: (p: LoadVolumeProgress) => void,
  signal?: AbortSignal,
  persistenceThreshold?: number
): Promise<VTKImageData> {
  const report = (phase: LoadVolumeProgress['phase'], progress: number, message?: string): void => {
    onProgress?.({ phase, progress, message });
  };
  report('resolve', 0.05, `Resolving ${datasetId} (${lodLevel})…`);
  report('fetch', 0.15);
  const vtkData = await loadVolume(datasetId, lodLevel, signal, persistenceThreshold);
  report('decode', 0.85, 'Preparing GPU buffers…');
  report('done', 1, 'Ready');
  return vtkData;
}

/**
 * Loads reduced VTI from the backend reduction API (TTK only; no VTK shrink fallback).
 * Uses POST /api/reduce; response is VTI bytes parsed via blob URL.
 * Optional signal supports cancellation (e.g. from async loader).
 */
export async function loadVolumeFromBackend(
  datasetId: string,
  lodLevel: LodLevel = 'full',
  persistenceThreshold?: number,
  signal?: AbortSignal
): Promise<VTKImageData> {
  const base = appConfig.dataset.reductionApiUrl.replace(/\/$/, '');
  const payload: { datasetId: string; level: LodLevel; persistenceThreshold?: number } = {
    datasetId,
    level: lodLevel,
  };
  if (persistenceThreshold != null && Number.isFinite(persistenceThreshold)) {
    payload.persistenceThreshold = persistenceThreshold;
  }
  const res = await fetch(`${base}/api/reduce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: getReductionFetchSignal(signal),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Reduction API error: ${res.status} ${msg}`);
  }
  // Optional: log backend metadata when returned as a header.
  const metaHeader = res.headers.get('X-Reduction-Metadata');
  if (metaHeader) {
    try {
      const meta = JSON.parse(metaHeader) as unknown;
      console.debug('[Reduction metadata]', meta);
    } catch {
      // ignore malformed metadata
    }
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  try {
    return await loadVti(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Load from static base path (VTI or vtk.js index tree; LOD fallback to canonical full). */
async function loadVolumeStatic(datasetId: string, lodLevel: LodLevel): Promise<VTKImageData> {
  const basePath = appConfig.dataset.basePath;
  const fmt = appConfig.dataset.volumeDataFormat;

  if (fmt === 'vtkjs') {
    const canonical = getVtkjsIndexUrlForLod(basePath, datasetId, 'full');
    if (lodLevel === 'full') {
      return loadVtkjsIndex(canonical);
    }
    const lodUrl = getVtkjsIndexUrlForLod(basePath, datasetId, lodLevel);
    try {
      return await loadVtkjsIndex(lodUrl);
    } catch {
      return loadVtkjsIndex(canonical);
    }
  }

  const canonical = getVtiUrlForLod(basePath, datasetId, 'full');
  if (lodLevel === 'full') {
    return loadVti(canonical);
  }
  const lodUrl = getVtiUrlForLod(basePath, datasetId, lodLevel);
  try {
    return await loadVti(lodUrl);
  } catch {
    return loadVti(canonical);
  }
}

/**
 * Loads the correct VTI for the given dataset and reduction level.
 * Uses backend when reduction API is enabled (see isReductionApiEnabled); falls back to static if backend fails.
 * Optional signal supports cancellation (e.g. from async loader).
 *
 * @param datasetId - Dataset id (e.g. 'ctBones')
 * @param lodLevel - 'full', 'high', 'medium', 'low'
 * @returns Promise resolving to the VTK ImageData instance
 */
export async function loadVolume(
  datasetId: string,
  lodLevel: LodLevel = 'full',
  signal?: AbortSignal,
  persistenceThreshold?: number
): Promise<VTKImageData> {
  const tryBackend = isReductionApiEnabled() && store.getState().reduction.useReductionBackend;
  if (tryBackend) {
    try {
      return await loadVolumeFromBackend(datasetId, lodLevel, persistenceThreshold, signal);
    } catch {
      store.setReductionBackendEnabled(false);
      return loadVolumeStatic(datasetId, lodLevel);
    }
  }
  return loadVolumeStatic(datasetId, lodLevel);
}

interface PointDataLike {
  getScalars(): { getName?(): string } | null;
  getNumberOfArrays?(): number;
  getArrayByIndex?(i: number): {
    getName?(): string;
    getNumberOfComponents?(): number;
    getNumberOfTuples?(): number;
    getData?(): ArrayLike<number>;
  } | null;
  getArrayByName?(name: string): {
    getNumberOfComponents?(): number;
    getNumberOfTuples?(): number;
    getData?(): ArrayLike<number>;
  } | null;
  setActiveScalars?(name: string): void;
  setScalars?(arr: unknown): void;
  addArray?(arr: unknown): void;
}

/**
 * Make sure the VTI ImageData has an "active" 1-component scalar field that
 * vtk.js's volume mapper / our validator can render. Many VTI files in the
 * wild leave no array marked active, store only multi-component arrays
 * (e.g. RGBA, vector elevation), or only have CellData scalars. This walks
 * those cases and either flips the active pointer or synthesizes a
 * 1-component array from the first component of whatever is available.
 */
function ensureRenderableScalars(image: VTKImageData): void {
  const v = image as unknown as { getPointData?: () => PointDataLike | null };
  const pd = v.getPointData?.();
  if (pd == null) return;

  if (pd.getScalars() != null) return;

  const arrayCount = pd.getNumberOfArrays?.() ?? 0;
  const arrays: Array<{
    name: string;
    components: number;
    tuples: number;
    data: ArrayLike<number>;
  }> = [];
  for (let i = 0; i < arrayCount; i += 1) {
    const arr = pd.getArrayByIndex?.(i);
    if (arr == null) continue;
    const name = arr.getName?.() ?? `Array_${i}`;
    const components = arr.getNumberOfComponents?.() ?? 1;
    const data = arr.getData?.();
    if (data == null) continue;
    const tuples = arr.getNumberOfTuples?.() ?? Math.floor(data.length / components);
    arrays.push({ name, components, tuples, data });
  }

  const oneComp = arrays.find((a) => a.components === 1);
  if (oneComp != null && pd.setActiveScalars != null) {
    pd.setActiveScalars(oneComp.name);
    if (pd.getScalars() != null) return;
  }

  const multi = arrays[0];
  if (multi != null) {
    const flat = new Float32Array(multi.tuples);
    const stride = multi.components;
    for (let t = 0; t < multi.tuples; t += 1) {
      flat[t] = multi.data[t * stride];
    }
    const synthName = `${multi.name}_c0`;
    const synthArr = vtkDataArray.newInstance({
      name: synthName,
      numberOfComponents: 1,
      values: flat,
    });
    pd.addArray?.(synthArr);
    pd.setActiveScalars?.(synthName) ?? pd.setScalars?.(synthArr);
    if (pd.getScalars() != null) return;
  }
}

/**
 * Loads a single .vti (VTK Image Data) file from the given URL and returns
 * the parsed VTK ImageData dataset. The URL must be reachable by the runtime
 * (e.g. same-origin for dev, or a full URL).
 *
 * @param url - Full URL or path to the .vti file (e.g. from config: `${basePath}/${datasetId}.vti`)
 * @returns Promise resolving to the VTK ImageData instance
 * @throws On fetch or parse failure
 */
export async function loadVti(url: string): Promise<VTKImageData> {
  const reader = vtkXMLImageDataReader.newInstance();
  await reader.setUrl(url);
  const output = reader.getOutputData();
  if (output == null) {
    throw new Error(`VTI load failed: no output from reader for ${url}`);
  }
  ensureRenderableScalars(output as VTKImageData);
  return output as VTKImageData;
}

/**
 * Parse a user-picked .vti File from the browser file picker. Wraps the file
 * in a Blob URL and feeds it through the same `reader.setUrl()` path used by
 * static and backend-reduce loads — guarantees the active scalar pointer is
 * set the same way (parseAsArrayBuffer leaves it null on some VTI files).
 */
export async function loadVtiFromFile(file: File): Promise<VTKImageData> {
  const url = URL.createObjectURL(file);
  try {
    return await loadVti(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Loads a .vti file and returns a LoadedVolume (thin abstraction). Prefer this
 * when the rest of the app should not depend on VTK types.
 */
export async function loadVtiAsVolume(url: string): Promise<LoadedVolume> {
  const vtkData = await loadVti(url);
  return volumeFromVtkImageData(vtkData);
}

/**
 * DataLoader: facade for loading datasets. Use loadVti() or loadVtiAsVolume() for VTI files.
 */
export class DataLoader {
  /** Load VTI and return raw VTK ImageData. */
  async loadVti(url: string): Promise<VTKImageData> {
    return loadVti(url);
  }

  /** Load the correct VTI for dataset and LOD level; returns raw VTK ImageData. */
  async loadVolume(
    datasetId: string,
    lodLevel: LodLevel = 'full',
    signal?: AbortSignal,
    persistenceThreshold?: number
  ): Promise<VTKImageData> {
    return loadVolume(datasetId, lodLevel, signal, persistenceThreshold);
  }

  /** Load VTI and return LoadedVolume (thin abstraction, no VTK dependency for callers). */
  async loadVtiAsVolume(url: string): Promise<LoadedVolume> {
    return loadVtiAsVolume(url);
  }
}

/**
 * Data Validator
 * Validates data against schemas
 */
export class DataValidator {
  // Placeholder implementation
}
