/**
 * Complete application configuration schema
 */

/** Static volume wire format: `vti` (XML) or `vtkjs` (HttpDataSetReader index.json tree). API responses remain VTI blobs unless extended server-side. */
export type VolumeDataFormat = 'vti' | 'vtkjs';

export interface DatasetConfig {
  basePath: string;
  defaultDatasetId: string;
  maxSizeMB: number;
  supportedFormats: string[];
  /** Base URL for dynamic reduction API (e.g. http://localhost:8000). If set, volume loading uses backend TTK reduction. */
  reductionApiUrl: string;
  /** Max wait (ms) for POST /api/reduce before falling back to static VTI. Override for slow TTK runs. */
  reductionFetchTimeoutMs: number;
  /** Preferred static asset format under basePath (see docs / vtk.js HttpDataSetReader). */
  volumeDataFormat: VolumeDataFormat;
}

export interface LODConfig {
  mediumThresholdM: number;
  lowThresholdM: number;
  maxDistanceM: number;
  minPointSizePx: number;
  maxPointSizePx: number;
}

export interface ROIConfig {
  minSizeM: number;
  maxSizeM: number;
  defaultShape: 'box' | 'sphere' | 'cylinder';
  defaultSizeM: number;
  /** When enabling ROI wireframe, bump LOD to at least `high` if currently coarser (refinement load). */
  boostLodWhenRoiActive: boolean;
}

export interface RenderingConfig {
  defaultOpacity: number;
  sampleDistanceM: number;
  pointSizePx: number;
  backgroundColor: string;
  gridEnabled: boolean;
  gridCellSizeM: number;
  antialiasEnabled: boolean;
  targetFPS: number;
  /** Scalar range for transfer functions (e.g. [0, 255] for 8-bit CT). No magic numbers. */
  scalarRangeMin: number;
  scalarRangeMax: number;
}

export interface XRConfig {
  enabled: boolean;
  supportedModes: ('immersive-vr' | 'immersive-ar' | 'inline')[];
  handTrackingEnabled: boolean;
  hapticFeedbackEnabled: boolean;
}

export interface LoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  logPerformance: boolean;
  logInteractions: boolean;
  maxMessagesInMemory: number;
}

export interface PerformanceConfig {
  monitoringEnabled: boolean;
  fpsMonitorIntervalMs: number;
  memoryWarningThresholdMB: number;
  autoOptimizeEnabled: boolean;
  autoOptimizeFPSThreshold: number;
}

/** Topology-aligned reduction (sublevel-set filter) threshold bounds. No magic numbers; use config. */
export interface TopologyConfig {
  thresholdMin: number;
  thresholdMax: number;
  thresholdDefault: number;
}

export interface AppConfig {
  appName: string;
  version: string;
  environment: string;
  dataset: DatasetConfig;
  lod: LODConfig;
  roi: ROIConfig;
  rendering: RenderingConfig;
  xr: XRConfig;
  logging: LoggingConfig;
  performance: PerformanceConfig;
  topology: TopologyConfig;
}
