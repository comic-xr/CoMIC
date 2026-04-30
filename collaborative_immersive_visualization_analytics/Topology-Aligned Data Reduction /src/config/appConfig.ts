import type { AppConfig, VolumeDataFormat } from './types';

function getEnvString(key: string, defaultValue: string): string {
  const value = import.meta.env[`VITE_${key}`];
  return value ?? defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = import.meta.env[`VITE_${key}`];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = import.meta.env[`VITE_${key}`];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

function getVolumeDataFormat(): VolumeDataFormat {
  const v = getEnvString('VOLUME_DATA_FORMAT', 'vti').toLowerCase();
  return v === 'vtkjs' ? 'vtkjs' : 'vti';
}

const reductionApiUrlResolved = getEnvString(
  'REDUCTION_API_URL',
  import.meta.env.DEV ? '' : 'http://localhost:8000'
);

/** True when the app should call the reduction API (direct URL or dev proxy via relative /api). */
export function isReductionApiEnabled(): boolean {
  const u = reductionApiUrlResolved.trim();
  if (u.length > 0) return true;
  return import.meta.env.DEV;
}

export const DEFAULT_CONFIG: AppConfig = {
  appName: 'CIVA Reduction',
  version: '0.0.0',
  environment: import.meta.env.MODE,

  dataset: {
    basePath: getEnvString('DATA_PATH', '/data/datasets'),
    defaultDatasetId: getEnvString('DEFAULT_DATASET', 'ctBones'),
    maxSizeMB: getEnvNumber('DATA_MAX_SIZE_MB', 1000),
    supportedFormats: ['vti', 'vtr', 'vts', 'json', 'csv', 'bin'],
    // Dev default '' → fetch /api/* same-origin; Vite proxies to localhost:8000 (see vite.config).
    // Prod default full URL. Set VITE_REDUCTION_API_URL= to force static files in dev.
    reductionApiUrl: reductionApiUrlResolved,
    reductionFetchTimeoutMs: getEnvNumber('REDUCTION_FETCH_TIMEOUT_MS', 15_000),
    volumeDataFormat: getVolumeDataFormat(),
  },

  lod: {
    mediumThresholdM: getEnvNumber('LOD_MEDIUM_THRESHOLD_M', 50),
    lowThresholdM: getEnvNumber('LOD_LOW_THRESHOLD_M', 150),
    maxDistanceM: getEnvNumber('LOD_MAX_DISTANCE_M', 500),
    minPointSizePx: getEnvNumber('LOD_MIN_POINT_SIZE_PX', 1),
    maxPointSizePx: getEnvNumber('LOD_MAX_POINT_SIZE_PX', 10),
  },

  roi: {
    minSizeM: getEnvNumber('ROI_MIN_SIZE_M', 1),
    maxSizeM: getEnvNumber('ROI_MAX_SIZE_M', 10000),
    defaultShape: getEnvString('ROI_DEFAULT_SHAPE', 'box') as 'box' | 'sphere' | 'cylinder',
    defaultSizeM: getEnvNumber('ROI_DEFAULT_SIZE_M', 100),
    boostLodWhenRoiActive: getEnvBoolean('ROI_BOOST_LOD_WHEN_ACTIVE', true),
  },

  rendering: {
    defaultOpacity: getEnvNumber('RENDER_DEFAULT_OPACITY', 0.8),
    sampleDistanceM: getEnvNumber('RENDER_SAMPLE_DISTANCE_M', 0),
    pointSizePx: getEnvNumber('RENDER_POINT_SIZE_PX', 2),
    backgroundColor: getEnvString('RENDER_BG_COLOR', '#000000'),
    gridEnabled: getEnvBoolean('RENDER_GRID_ENABLED', true),
    gridCellSizeM: getEnvNumber('RENDER_GRID_CELL_SIZE_M', 10),
    antialiasEnabled: getEnvBoolean('RENDER_ANTIALIAS_ENABLED', true),
    targetFPS: getEnvNumber('RENDER_TARGET_FPS', 60),
    scalarRangeMin: getEnvNumber('RENDER_SCALAR_RANGE_MIN', 0),
    scalarRangeMax: getEnvNumber('RENDER_SCALAR_RANGE_MAX', 255),
  },

  xr: {
    enabled: getEnvBoolean('XR_ENABLED', true),
    supportedModes: ['immersive-vr', 'immersive-ar'],
    handTrackingEnabled: getEnvBoolean('XR_HAND_TRACKING_ENABLED', false),
    hapticFeedbackEnabled: getEnvBoolean('XR_HAPTIC_FEEDBACK_ENABLED', true),
  },

  logging: {
    enabled: getEnvBoolean('LOG_ENABLED', true),
    level: getEnvString('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error',
    logPerformance: getEnvBoolean('LOG_PERFORMANCE', true),
    logInteractions: getEnvBoolean('LOG_INTERACTIONS', false),
    maxMessagesInMemory: getEnvNumber('LOG_MAX_MESSAGES', 1000),
  },

  performance: {
    monitoringEnabled: getEnvBoolean('PERF_MONITORING_ENABLED', true),
    fpsMonitorIntervalMs: getEnvNumber('PERF_FPS_MONITOR_INTERVAL_MS', 1000),
    memoryWarningThresholdMB: getEnvNumber('PERF_MEMORY_WARNING_THRESHOLD_MB', 512),
    autoOptimizeEnabled: getEnvBoolean('PERF_AUTO_OPTIMIZE_ENABLED', true),
    autoOptimizeFPSThreshold: getEnvNumber('PERF_AUTO_OPTIMIZE_FPS_THRESHOLD', 30),
  },

  topology: {
    thresholdMin: getEnvNumber('TOPOLOGY_THRESHOLD_MIN', 0),
    thresholdMax: getEnvNumber('TOPOLOGY_THRESHOLD_MAX', 255),
    thresholdDefault: getEnvNumber('TOPOLOGY_THRESHOLD_DEFAULT', 0),
  },
};

export const appConfig = DEFAULT_CONFIG;
