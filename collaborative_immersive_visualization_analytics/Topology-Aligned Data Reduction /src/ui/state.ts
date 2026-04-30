/**
 * UI state: re-exports central store and types for UI layer.
 * Single responsibility: provide state and actions to UI components (no business logic here).
 */

export { store } from '@/state/store';
export type { AppState, LodLevel, ReductionState, ScalarState, VolumeStats } from '@/state/types';
