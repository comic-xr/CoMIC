/**
 * Type definitions for metrics module
 */

export interface MetricPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  memoryLimit: number;
  drawCalls: number;
}

export interface AnalyticsEvent {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface MetricsSnapshot {
  timestamp: number;
  performance: PerformanceMetrics;
  events: AnalyticsEvent[];
}
