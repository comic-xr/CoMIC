/**
 * ROI (Region of Interest) module: spatial sub-domain selection for refinement.
 * Single responsibility: represent and update ROI bounds (e.g. 6-plane box).
 */

import { appConfig } from '@/config';

export type ROIShape = 'box' | 'sphere' | 'cylinder';

export interface ROIBounds {
  shape: ROIShape;
  /** For box: [xMin, xMax, yMin, yMax, zMin, zMax] in world units. */
  bounds: [number, number, number, number, number, number];
}

const { roi: roiConfig } = appConfig;

/** Default ROI bounds from config (no magic numbers). */
export function getDefaultROIBounds(): ROIBounds {
  const s = roiConfig.defaultSizeM;
  return {
    shape: roiConfig.defaultShape,
    bounds: [-s / 2, s / 2, -s / 2, s / 2, -s / 2, s / 2],
  };
}

/** Clamp bounds to config min/max size. */
export function clampROIBounds(bounds: ROIBounds): ROIBounds {
  const [xMin, xMax, yMin, yMax, zMin, zMax] = bounds.bounds;
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  return {
    ...bounds,
    bounds: [
      clamp(xMin, -roiConfig.maxSizeM / 2, roiConfig.maxSizeM / 2),
      clamp(xMax, xMin + roiConfig.minSizeM, roiConfig.maxSizeM / 2),
      clamp(yMin, -roiConfig.maxSizeM / 2, roiConfig.maxSizeM / 2),
      clamp(yMax, yMin + roiConfig.minSizeM, roiConfig.maxSizeM / 2),
      clamp(zMin, -roiConfig.maxSizeM / 2, roiConfig.maxSizeM / 2),
      clamp(zMax, zMin + roiConfig.minSizeM, roiConfig.maxSizeM / 2),
    ],
  };
}
