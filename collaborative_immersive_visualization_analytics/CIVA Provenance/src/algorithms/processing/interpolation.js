// ----------------------------------------------------------------------------
// Result Interpolation for Large Datasets
// ----------------------------------------------------------------------------

import { logProgress } from "@Utils/logger.js";

export function interpolateResults(
  allPoints,
  sampledPoints,
  sampledResult,
  numComponents
) {
  logProgress(
    `Interpolating to ${allPoints.length.toLocaleString()} points...`
  );

  const result = [];
  const BATCH_SIZE = 1000;

  for (
    let batchStart = 0;
    batchStart < allPoints.length;
    batchStart += BATCH_SIZE
  ) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, allPoints.length);

    for (let i = batchStart; i < batchEnd; i++) {
      const point = allPoints[i];

      // Find nearest sample point (simplified search)
      let minDist = Infinity;
      let nearestIdx = 0;

      // Check every 10th sample point for efficiency
      const checkStep = Math.max(1, Math.floor(sampledPoints.length / 50));

      for (let j = 0; j < sampledPoints.length; j += checkStep) {
        let dist = 0;
        for (let d = 0; d < point.length; d++) {
          const diff = point[d] - sampledPoints[j][d];
          dist += diff * diff;
        }

        if (dist < minDist) {
          minDist = dist;
          nearestIdx = j;
        }
      }

      // Use nearest sample result with small random offset
      const interpolatedPoint = [...sampledResult[nearestIdx]];
      for (let d = 0; d < interpolatedPoint.length; d++) {
        interpolatedPoint[d] += (Math.random() - 0.5) * 0.02;
      }

      // Ensure 3D output
      while (interpolatedPoint.length < 3) {
        interpolatedPoint.push(0);
      }

      result.push(interpolatedPoint);
    }

    // Progress update
    if (batchStart % (BATCH_SIZE * 5) === 0) {
      const progress = ((batchEnd / allPoints.length) * 100).toFixed(1);
      logProgress(`  Interpolation: ${progress}%`);
    }
  }

  return result;
}
