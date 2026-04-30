/**
 * Table-driven reduction FSM: explicit states, events, and guards (research doc Phase 5).
 * Runtime state is recomputed from context after each action so the UI cannot drift.
 */

import type { LodLevel, ReductionPhase } from './types';

export type FsmState = ReductionPhase;

export type FsmEvent =
  | 'BOOT'
  | 'VOLUME_READY'
  | 'VOLUME_UNLOAD'
  | 'LOD_SELECT'
  | 'ROI_ENABLE'
  | 'ROI_DISABLE'
  | 'FEATURE_ENABLE'
  | 'FEATURE_DISABLE'
  | 'RESET';

export type FsmContext = {
  volumeReady: boolean;
  lodLevel: LodLevel;
  roiWireframeEnabled: boolean;
  featureSliceEnabled: boolean;
  featureDimVolume: boolean;
  featureIsosurfaceEnabled: boolean;
  featureThresholdEnabled: boolean;
};

/** Canonical phase from context (single source of truth). */
export function snapshotFsmState(ctx: FsmContext): FsmState {
  if (!ctx.volumeReady) return 'idle';
  if (ctx.roiWireframeEnabled) return 'roi_refined';
  if (
    ctx.featureSliceEnabled ||
    ctx.featureDimVolume ||
    ctx.featureIsosurfaceEnabled ||
    ctx.featureThresholdEnabled
  ) {
    return 'feature_focus';
  }
  if (ctx.lodLevel !== 'full') return 'lod_switched';
  return 'base_volume';
}

/**
 * Ordered transition guard table: first matching row wins.
 * `from: '*'` matches any state. Used for documentation + optional strict validation.
 */
export const FSM_TRANSITION_TABLE: ReadonlyArray<{
  from: FsmState | '*';
  event: FsmEvent;
  /** If false, transition is illegal in strict mode. */
  guard: (prev: FsmState, ctx: FsmContext) => boolean;
}> = [
  { from: '*', event: 'RESET', guard: () => true },
  { from: 'idle', event: 'VOLUME_READY', guard: (_, c) => c.volumeReady },
  { from: '*', event: 'VOLUME_UNLOAD', guard: (_, c) => !c.volumeReady },
  { from: '*', event: 'LOD_SELECT', guard: () => true },
  { from: '*', event: 'ROI_ENABLE', guard: (_, c) => c.roiWireframeEnabled },
  { from: '*', event: 'ROI_DISABLE', guard: (_, c) => !c.roiWireframeEnabled },
  {
    from: '*',
    event: 'FEATURE_ENABLE',
    guard: (_, c) =>
      c.featureSliceEnabled ||
      c.featureDimVolume ||
      c.featureIsosurfaceEnabled ||
      c.featureThresholdEnabled,
  },
  {
    from: '*',
    event: 'FEATURE_DISABLE',
    guard: (_, c) =>
      !c.featureSliceEnabled &&
      !c.featureDimVolume &&
      !c.featureIsosurfaceEnabled &&
      !c.featureThresholdEnabled,
  },
];

/** Returns whether `event` is allowed from `prev` given resulting `ctx` (post-mutation). */
export function isFsmEventAllowed(prev: FsmState, event: FsmEvent, ctx: FsmContext): boolean {
  for (const row of FSM_TRANSITION_TABLE) {
    if (row.event !== event) continue;
    if (row.from !== '*' && row.from !== prev) continue;
    if (row.guard(prev, ctx)) return true;
  }
  return false;
}
