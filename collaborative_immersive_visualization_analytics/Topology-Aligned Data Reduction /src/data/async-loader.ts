/**
 * Async data loading with progress reporting, cancellation support, and error handling.
 * Supports coarse / medium / fine / feature resolution levels.
 */

import type { LodLevel, VTKImageData } from './types';
import type { DatasetDescriptor, ResolutionLevel } from './dataset-descriptor';
import { resolutionToLodLevel } from './dataset-descriptor';
import { loadVolumeWithProgress, type LoadVolumeProgress } from './data-loader';
import { appConfig } from '@/config';

export type LoadProgress = {
  phase: 'fetch' | 'parse' | 'done';
  progress: number;
  message?: string;
};

export interface LoadOptions {
  datasetId: string;
  resolutionLevel: ResolutionLevel;
  descriptor?: DatasetDescriptor | null;
  signal?: AbortSignal;
  onProgress?: (p: LoadProgress) => void;
  /** Normalized persistence [0,1] for POST /api/reduce when the backend path is used. */
  persistenceThreshold?: number;
}

export interface LoadResult {
  data: VTKImageData;
  descriptor: DatasetDescriptor | null;
  lodLevel: LodLevel;
}

export class LoadError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly cancelled?: boolean
  ) {
    super(message);
    this.name = 'LoadError';
  }
}

/**
 * Load volume with progress reporting and cancellation.
 * Only one resolution active per load; supports coarse, medium, fine, feature via ResolutionLevel.
 */
export async function loadVolumeAsync(options: LoadOptions): Promise<LoadResult> {
  const { datasetId, resolutionLevel, signal, onProgress, persistenceThreshold } = options;
  const lodLevel = options.descriptor?.lodLevel ?? resolutionToLodLevel(resolutionLevel);

  if (signal?.aborted) {
    throw new LoadError('Load cancelled', undefined, true);
  }

  const mapProgress = (vp: LoadVolumeProgress): LoadProgress => {
    let progress = vp.progress;
    if (vp.phase === 'resolve') progress = vp.progress * 0.12;
    else if (vp.phase === 'fetch') progress = 0.12 + vp.progress * 0.58;
    else if (vp.phase === 'decode') progress = 0.7 + vp.progress * 0.28;
    else progress = 1;
    const phase: LoadProgress['phase'] =
      vp.phase === 'decode' ? 'parse' : vp.phase === 'done' ? 'done' : 'fetch';
    return { phase, progress: Math.min(1, progress), message: vp.message };
  };

  try {
    onProgress?.({
      phase: 'fetch',
      progress: 0,
      message: `Loading ${datasetId} (${resolutionLevel})…`,
    });
    const data = await loadVolumeWithProgress(
      datasetId,
      lodLevel,
      onProgress ? (vp) => onProgress(mapProgress(vp)) : undefined,
      signal,
      persistenceThreshold
    );
    if (signal?.aborted) {
      throw new LoadError('Load cancelled', undefined, true);
    }
    return {
      data,
      descriptor: options.descriptor ?? null,
      lodLevel,
    };
  } catch (err) {
    if (err instanceof LoadError && err.cancelled) throw err;
    if (signal?.aborted) {
      throw new LoadError('Load cancelled', err, true);
    }
    throw new LoadError(err instanceof Error ? err.message : String(err), err, false);
  }
}

/** Fetch dataset descriptor JSON from base path. */
export async function loadDescriptor(
  datasetId: string,
  signal?: AbortSignal
): Promise<DatasetDescriptor | null> {
  const base = appConfig.dataset.basePath.replace(/\/$/, '');
  const url = `${base}/${datasetId}.descriptor.json`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const json = (await res.json()) as DatasetDescriptor;
  if (!json.id || !json.gridDimensions || !Array.isArray(json.scalarFields)) {
    return null;
  }
  return json;
}
