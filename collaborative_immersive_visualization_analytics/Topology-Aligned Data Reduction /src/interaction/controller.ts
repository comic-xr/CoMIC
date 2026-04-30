/**
 * Interaction controller: single entry point for input (mouse, touch, XR).
 * Single responsibility: route input events to camera, ROI, and scalar/LOD actions.
 */

import type { LodLevel } from '@/state';

export interface InteractionControllerConfig {
  onLODChange?: (level: LodLevel) => void;
  onThresholdChange?: (value: number) => void;
  onROIChange?: (bounds: unknown) => void;
}

/**
 * Facade over input handling; delegates to VTK interactor for camera and to store for LOD/threshold.
 * Renderer attaches the VTK interactor; this controller can trigger state updates from UI or future XR.
 */
export class InteractionController {
  private config: InteractionControllerConfig = {};

  configure(config: InteractionControllerConfig): void {
    this.config = { ...this.config, ...config };
  }

  setLOD(level: LodLevel): void {
    this.config.onLODChange?.(level);
  }

  setThreshold(value: number): void {
    this.config.onThresholdChange?.(value);
  }

  setROI(bounds: unknown): void {
    this.config.onROIChange?.(bounds);
  }
}
