/**
 * Application state shape. Reduction-related state (e.g. topology threshold, LOD level).
 */

/** LOD level for volume rendering (matches data module LodLevel). */
export type LodLevel = 'full' | 'high' | 'medium' | 'low';

/** Explicit reduction phases (Phase 5 state machine). */
export type ReductionPhase =
  | 'idle'
  | 'base_volume'
  | 'lod_switched'
  | 'roi_refined'
  | 'feature_focus';

export interface ReductionState {
  /**
   * Normalized persistence input for TTK / POST /api/reduce only (slider maps to [0,1] in App).
   * Does not change VTK transfer functions by itself.
   */
  topologyThreshold: number;
  /**
   * Display / opacity floor in configured scalar space (usually 0–255). Mapped into the
   * loaded volume’s actual scalar range for VTK opacity; updates without reload.
   */
  displayIntensityMin: number;
  /** LOD level: 'full' | 'high' (256³) | 'medium' (128³) | 'low' (64³). */
  lodLevel: LodLevel;
  /**
   * When false, skip POST /api/reduce and load static VTI only (faster when Docker/API is down).
   * Set from health probe, health polling, or after a failed reduce fetch.
   */
  useReductionBackend: boolean;
  /** Explicit machine phase (derived rules in store). */
  reductionPhase: ReductionPhase;
  /** When true, pick LOD from camera distance to volume (config LOD thresholds). */
  autoLodByDistance: boolean;
  /** Feature: single clipping plane through volume center (VTK mapper). */
  featureSliceEnabled: boolean;
  /** Feature: push contextual volume to background via opacity unit distance. */
  featureDimVolume: boolean;
  /** Feature: extract and overlay an isosurface from the active scalar volume. */
  featureIsosurfaceEnabled: boolean;
  /** Isosurface value in configured scalar space (mapped to data range in scene manager). */
  featureIsosurfaceValue: number;
  /** Feature: show thresholded scalar region as the primary volume focus. */
  featureThresholdEnabled: boolean;
  /** Threshold region lower bound in configured scalar space. */
  featureThresholdMin: number;
  /** Threshold region upper bound in configured scalar space. */
  featureThresholdMax: number;
  /** ROI preview: wireframe sphere in world space. */
  roiWireframeEnabled: boolean;
  /**
   * Local ROI refinement overlay: crop a higher LOD volume in ROI bounds and
   * render it over the contextual volume.
   */
  roiRefinementEnabled: boolean;
  roiRadiusWorld: number;
  /**
   * ROI center in normalized [0,1]^3 within the volume bounds. null = "follow
   * volume center" (default until the user moves a slider).
   */
  roiCenterNorm: readonly [number, number, number] | null;
}

/** Only one scalar field active at a time; previous value kept for rollback on failed switch. */
export interface ScalarState {
  activeScalarField: string;
  previousScalarField: string | null;
}

/** Stats for the currently loaded volume (updated when volume or LOD changes). */
export interface VolumeStats {
  dimensions: readonly [number, number, number];
  spacing: readonly [number, number, number];
  voxelCount: number;
  loadTimeMs: number;
}

export interface AppState {
  reduction: ReductionState;
  scalar: ScalarState;
  volumeStats: VolumeStats | null;
}
