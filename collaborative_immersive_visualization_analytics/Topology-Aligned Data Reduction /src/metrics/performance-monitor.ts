/**
 * Rolling FPS / frame-time stats (Phase 6).
 */

export type PerformanceSnapshot = {
  sampleCount: number;
  fpsMean: number;
  fpsMin: number;
  fpsMax: number;
  frameTimeMsP95: number;
  frameTimeMsMean: number;
};

const MAX_SAMPLES = 120;

export class PerformanceMonitor {
  private deltas: number[] = [];

  /** Call once per rendered frame with milliseconds since last frame (or render block time). */
  recordFrameDelta(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    this.deltas.push(deltaMs);
    if (this.deltas.length > MAX_SAMPLES) this.deltas.shift();
  }

  clear(): void {
    this.deltas.length = 0;
  }

  getSnapshot(): PerformanceSnapshot | null {
    if (this.deltas.length === 0) return null;
    const fpsList = this.deltas.map((d) => 1000 / d);
    const sorted = [...this.deltas].sort((a, b) => a - b);
    const p95i = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
    const meanDelta = this.deltas.reduce((a, b) => a + b, 0) / this.deltas.length;
    return {
      sampleCount: this.deltas.length,
      fpsMean: fpsList.reduce((a, b) => a + b, 0) / fpsList.length,
      fpsMin: Math.min(...fpsList),
      fpsMax: Math.max(...fpsList),
      frameTimeMsP95: sorted[p95i] ?? sorted[sorted.length - 1],
      frameTimeMsMean: meanDelta,
    };
  }
}
