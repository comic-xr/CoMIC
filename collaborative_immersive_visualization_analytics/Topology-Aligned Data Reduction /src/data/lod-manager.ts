/**
 * Spatial LOD manager: switches datasets based on user proximity or ROI.
 * Guarantees only one resolution active per region; exposes explicit state transitions.
 * All transitions are observable and logged (topology-aligned reduction).
 */

import type { LodLevel } from './types';
import type { ResolutionLevel } from './dataset-descriptor';
import { resolutionToLodLevel } from './dataset-descriptor';
import { appConfig } from '@/config';

export type LODRegion = 'global' | string;

export type LODStateTransition = {
  from: { region: LODRegion; level: LodLevel };
  to: { region: LODRegion; level: LodLevel };
  reason: 'proximity' | 'roi' | 'manual' | 'initial';
  at: number;
};

type LODStateListener = (transition: LODStateTransition) => void;

/** Single responsibility: manage which LOD is active per region; one resolution per region. */
export class SpatialLODManager {
  private activeByRegion = new Map<LODRegion, LodLevel>();
  private listeners: LODStateListener[] = [];
  private logEnabled: boolean;

  constructor() {
    this.logEnabled = appConfig.logging.enabled;
    this.activeByRegion.set('global', appConfig.dataset.defaultDatasetId ? 'high' : 'high');
  }

  /** Get the active LOD level for a region (default: global). */
  getActiveLevel(region: LODRegion = 'global'): LodLevel {
    return this.activeByRegion.get(region) ?? 'high';
  }

  /** Set LOD for a region; only one resolution active per region. Emits state transition and logs. */
  setLevel(
    region: LODRegion,
    level: LodLevel,
    reason: LODStateTransition['reason'] = 'manual'
  ): void {
    const prev = this.getActiveLevel(region);
    if (prev === level) return;
    this.activeByRegion.set(region, level);
    const transition: LODStateTransition = {
      from: { region, level: prev },
      to: { region, level },
      reason,
      at: Date.now(),
    };
    this.notify(transition);
  }

  /** Set by resolution level (coarse/medium/fine/feature). */
  setByResolutionLevel(
    region: LODRegion,
    resolutionLevel: ResolutionLevel,
    reason: LODStateTransition['reason']
  ): void {
    this.setLevel(region, resolutionToLodLevel(resolutionLevel), reason);
  }

  /** Notify listeners and optionally log. */
  private notify(transition: LODStateTransition): void {
    if (this.logEnabled && appConfig.logging.logPerformance) {
      console.debug('[LODManager]', transition);
    }
    this.listeners.forEach((fn) => fn(transition));
  }

  subscribe(listener: LODStateListener): () => void {
    this.listeners.push(listener);
    return () => {
      const i = this.listeners.indexOf(listener);
      if (i !== -1) this.listeners.splice(i, 1);
    };
  }
}
