/**
 * Aggregates performance monitor, reduction latencies, and memory hints (Phase 6).
 */

import { PerformanceMonitor, type PerformanceSnapshot } from './performance-monitor';

export type LatencyRecord = { kind: string; ms: number; at: number };

export class MetricsCollector {
  private readonly frameMonitor = new PerformanceMonitor();
  private latencies: LatencyRecord[] = [];
  private readonly latencyCap = 200;
  private pendingAction:
    | {
        kind: string;
        startAt: number;
        stableFrameCount: number;
      }
    | null = null;

  recordFrameDelta(deltaMs: number, targetFps = 60): void {
    this.frameMonitor.recordFrameDelta(deltaMs);
    this.resolvePendingAction(deltaMs, targetFps);
  }

  recordReductionLatency(kind: string, ms: number): void {
    if (!Number.isFinite(ms)) return;
    this.latencies.push({ kind, ms, at: Date.now() });
    if (this.latencies.length > this.latencyCap) this.latencies.shift();
  }

  /**
   * Begin action-to-stable-render latency tracking for any interaction.
   * Completion is detected when a short streak of stable frames is observed.
   */
  beginActionLatency(kind: string): void {
    this.pendingAction = {
      kind,
      startAt: performance.now(),
      stableFrameCount: 0,
    };
  }

  private resolvePendingAction(deltaMs: number, targetFps: number): void {
    if (this.pendingAction == null) return;
    const stableDeltaThresholdMs = Math.max(1000 / Math.max(targetFps, 1), 1) * 1.5;
    if (deltaMs <= stableDeltaThresholdMs) {
      this.pendingAction.stableFrameCount += 1;
    } else {
      this.pendingAction.stableFrameCount = 0;
    }
    // ~5 stable frames gives a robust "settled" signal without over-delaying.
    if (this.pendingAction.stableFrameCount >= 5) {
      const ms = performance.now() - this.pendingAction.startAt;
      this.recordReductionLatency(this.pendingAction.kind, ms);
      this.pendingAction = null;
    }
  }

  getPerformanceSnapshot(): PerformanceSnapshot | null {
    return this.frameMonitor.getSnapshot();
  }

  getLatencies(): readonly LatencyRecord[] {
    return this.latencies;
  }

  getMemorySnapshot(): { usedJSHeapMB?: number; totalJSHeapMB?: number; note: string } {
    const perf =
      typeof performance !== 'undefined'
        ? (performance as Performance & {
            memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
          })
        : undefined;
    const m = perf?.memory;
    if (m == null) {
      return { note: 'performance.memory not exposed in this context (use Chrome with flag).' };
    }
    return {
      usedJSHeapMB: Math.round((m.usedJSHeapSize / (1024 * 1024)) * 100) / 100,
      totalJSHeapMB: Math.round((m.totalJSHeapSize / (1024 * 1024)) * 100) / 100,
      note: 'Chrome/Chromium JS heap (approximate).',
    };
  }

  exportReport(): Record<string, unknown> {
    return {
      at: Date.now(),
      performance: this.getPerformanceSnapshot(),
      latencies: [...this.latencies],
      memory: this.getMemorySnapshot(),
    };
  }

  clearPerformance(): void {
    this.frameMonitor.clear();
  }

  clearLatencies(): void {
    this.latencies.length = 0;
    this.pendingAction = null;
  }
}
