/**
 * Explicit reduction phases (Phase 5). Transitions are conservative: no implicit jumps.
 */

import type { LodLevel, ReductionPhase } from './types';

export function phaseForLod(level: LodLevel): ReductionPhase {
  return level === 'full' ? 'base_volume' : 'lod_switched';
}

/** Combine feature / ROI flags into a single phase for logging and UI. */
export function resolveReductionPhase(
  lod: LodLevel,
  roiActive: boolean,
  featureAny: boolean
): ReductionPhase {
  if (roiActive) return 'roi_refined';
  if (featureAny) return 'feature_focus';
  return phaseForLod(lod);
}
