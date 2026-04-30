/**
 * Central store for app state. Holds reduction state (e.g. topologyThreshold).
 * Actions update state and notify subscribers. No UI in this module.
 */

import type { AppState, LodLevel, VolumeStats } from './types';
import { appConfig } from '@/config';
import { snapshotFsmState } from './reduction-fsm';
import { sessionEventAppend } from '@/metrics/session-event-log';

const { topology, rendering } = appConfig;

function computePhase(reduction: AppState['reduction'], volumeStats: VolumeStats | null) {
  return snapshotFsmState({
    volumeReady: volumeStats != null,
    lodLevel: reduction.lodLevel,
    roiWireframeEnabled: reduction.roiWireframeEnabled,
    featureSliceEnabled: reduction.featureSliceEnabled,
    featureDimVolume: reduction.featureDimVolume,
    featureIsosurfaceEnabled: reduction.featureIsosurfaceEnabled,
    featureThresholdEnabled: reduction.featureThresholdEnabled,
  });
}

const initialReduction: AppState['reduction'] = {
  topologyThreshold: topology.thresholdDefault,
  displayIntensityMin: rendering.scalarRangeMin,
  lodLevel: 'full',
  useReductionBackend: true,
  reductionPhase: 'idle',
  autoLodByDistance: false,
  featureSliceEnabled: false,
  featureDimVolume: false,
  featureIsosurfaceEnabled: false,
  featureIsosurfaceValue:
    Math.round((rendering.scalarRangeMin + rendering.scalarRangeMax) * 0.5) || rendering.scalarRangeMin,
  featureThresholdEnabled: false,
  featureThresholdMin: rendering.scalarRangeMin,
  featureThresholdMax: rendering.scalarRangeMax,
  roiWireframeEnabled: false,
  roiRefinementEnabled: true,
  roiRadiusWorld: Math.min(appConfig.roi.defaultSizeM, 96),
  roiCenterNorm: null,
};

const initialState: AppState = {
  reduction: { ...initialReduction },
  scalar: {
    activeScalarField: 'ImageScalars',
    previousScalarField: null,
  },
  volumeStats: null,
};

let state: AppState = { ...initialState, reduction: { ...initialReduction } };
const listeners: Array<() => void> = [];

function getState(): AppState {
  return state;
}

function setState(next: Partial<AppState> | ((prev: AppState) => Partial<AppState>)): void {
  const nextPartial = typeof next === 'function' ? next(state) : next;
  const mergedReduction =
    nextPartial.reduction != null
      ? { ...state.reduction, ...nextPartial.reduction }
      : state.reduction;
  const mergedVolumeStats =
    nextPartial.volumeStats !== undefined ? nextPartial.volumeStats : state.volumeStats;

  state = {
    ...state,
    ...nextPartial,
    reduction: {
      ...mergedReduction,
      reductionPhase: computePhase(mergedReduction, mergedVolumeStats),
    },
    ...(nextPartial.scalar != null && {
      scalar: { ...state.scalar, ...nextPartial.scalar },
    }),
  };
  listeners.forEach((fn) => fn());
}

/** Set TTK / API persistence parameter (triggers reload when LOD or persistence changes). */
function setTopologyThreshold(value: number): void {
  sessionEventAppend('topology_persistence', { value });
  setState({
    reduction: { ...state.reduction, topologyThreshold: value },
  });
}

/** Set client-side opacity floor for volume rendering (VTK only; no network). */
function setDisplayIntensityMin(value: number): void {
  sessionEventAppend('display_intensity', { value });
  setState({
    reduction: { ...state.reduction, displayIntensityMin: value },
  });
}

/** Set the LOD level (e.g. 'high' | 'medium' | 'low' | 'full'). */
function setLodLevel(level: LodLevel): void {
  sessionEventAppend('lod_change', { level });
  setState({
    reduction: { ...state.reduction, lodLevel: level },
  });
}

function setAutoLodByDistance(enabled: boolean): void {
  sessionEventAppend('auto_lod', { enabled });
  setState({
    reduction: { ...state.reduction, autoLodByDistance: enabled },
  });
}

function setFeatureSliceEnabled(enabled: boolean): void {
  sessionEventAppend('feature_slice', { enabled });
  setState({
    reduction: { ...state.reduction, featureSliceEnabled: enabled },
  });
}

function setFeatureDimVolume(enabled: boolean): void {
  sessionEventAppend('feature_dim_volume', { enabled });
  setState({
    reduction: { ...state.reduction, featureDimVolume: enabled },
  });
}

function setFeatureIsosurfaceEnabled(enabled: boolean): void {
  sessionEventAppend('feature_isosurface', { enabled });
  setState({
    reduction: { ...state.reduction, featureIsosurfaceEnabled: enabled },
  });
}

function setFeatureIsosurfaceValue(value: number): void {
  sessionEventAppend('feature_isosurface_value', { value });
  setState({
    reduction: { ...state.reduction, featureIsosurfaceValue: value },
  });
}

function setFeatureThresholdEnabled(enabled: boolean): void {
  sessionEventAppend('feature_threshold', { enabled });
  setState({
    reduction: { ...state.reduction, featureThresholdEnabled: enabled },
  });
}

function setFeatureThresholdRange(minValue: number, maxValue: number): void {
  const min = Math.min(minValue, maxValue);
  const max = Math.max(minValue, maxValue);
  sessionEventAppend('feature_threshold_range', { min, max });
  setState({
    reduction: { ...state.reduction, featureThresholdMin: min, featureThresholdMax: max },
  });
}

function setRoiWireframe(enabled: boolean): void {
  const r = state.reduction;
  let nextLod = r.lodLevel;
  if (
    enabled &&
    appConfig.roi.boostLodWhenRoiActive &&
    (r.lodLevel === 'low' || r.lodLevel === 'medium')
  ) {
    nextLod = 'high';
    sessionEventAppend('lod_change', { level: 'high', reason: 'roi_boost' });
  }
  sessionEventAppend('roi_wireframe', { enabled, radius: r.roiRadiusWorld });
  setState({
    reduction: { ...r, roiWireframeEnabled: enabled, lodLevel: nextLod },
  });
}

function setRoiRefinementEnabled(enabled: boolean): void {
  sessionEventAppend('roi_refinement', { enabled });
  setState({
    reduction: { ...state.reduction, roiRefinementEnabled: enabled },
  });
}

function setRoiRadiusWorld(radius: number): void {
  sessionEventAppend('roi_radius', { radius });
  setState({
    reduction: { ...state.reduction, roiRadiusWorld: radius },
  });
}

function setRoiCenterNorm(center: readonly [number, number, number] | null): void {
  sessionEventAppend('roi_center', { center });
  setState({
    reduction: { ...state.reduction, roiCenterNorm: center },
  });
}

/** Enable or disable calling the reduction API for volume loads (from health probe or after errors). */
function setReductionBackendEnabled(enabled: boolean): void {
  setState({
    reduction: { ...state.reduction, useReductionBackend: enabled },
  });
}

/**
 * Reset exploration sliders/features/ROI/LOD to defaults; keep backend flag.
 * Reversibility / “reset view” (Phase 5).
 */
function resetExplorationState(): void {
  const keepBackend = state.reduction.useReductionBackend;
  sessionEventAppend('reset_exploration', {});
  const nextR = { ...initialReduction, useReductionBackend: keepBackend };
  nextR.reductionPhase = computePhase(nextR, state.volumeStats);
  state = {
    ...state,
    reduction: nextR,
    scalar: { ...initialState.scalar },
  };
  listeners.forEach((fn) => fn());
}

/** Set stats for the currently loaded volume (dimensions, voxel count, load time). */
function setVolumeStats(stats: VolumeStats | null): void {
  setState({ volumeStats: stats });
}

/** Set active scalar field (one at a time). Stores previous for rollback on failed switch). */
function setActiveScalarField(fieldName: string): void {
  sessionEventAppend('scalar_change', { field: fieldName });
  setState({
    scalar: {
      activeScalarField: fieldName,
      previousScalarField: state.scalar.activeScalarField,
    },
  });
}

/** Rollback to previous scalar field (e.g. after failed switch). */
function rollbackScalarField(): void {
  const prev = state.scalar.previousScalarField;
  if (prev != null) {
    sessionEventAppend('scalar_rollback', { field: prev });
    setState({
      scalar: {
        activeScalarField: prev,
        previousScalarField: null,
      },
    });
  }
}

function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    const i = listeners.indexOf(listener);
    if (i !== -1) listeners.splice(i, 1);
  };
}

export const store = {
  getState,
  setState,
  setTopologyThreshold,
  setDisplayIntensityMin,
  setLodLevel,
  setAutoLodByDistance,
  setFeatureSliceEnabled,
  setFeatureDimVolume,
  setFeatureIsosurfaceEnabled,
  setFeatureIsosurfaceValue,
  setFeatureThresholdEnabled,
  setFeatureThresholdRange,
  setRoiWireframe,
  setRoiRefinementEnabled,
  setRoiRadiusWorld,
  setRoiCenterNorm,
  resetExplorationState,
  setReductionBackendEnabled,
  setVolumeStats,
  setActiveScalarField,
  rollbackScalarField,
  subscribe,
};
