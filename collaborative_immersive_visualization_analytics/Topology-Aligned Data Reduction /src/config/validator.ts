import type { AppConfig } from './types';

/**
 * Validation error details
 */
export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate configuration with detailed error reporting
 * Returns errors array (empty if valid)
 */
export function validateConfig(config: AppConfig): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate LOD thresholds are ordered correctly
  if (config.lod.mediumThresholdM <= 0) {
    errors.push({
      path: 'lod.mediumThresholdM',
      message: 'Must be > 0',
      value: config.lod.mediumThresholdM,
    });
  }

  if (config.lod.lowThresholdM <= config.lod.mediumThresholdM) {
    errors.push({
      path: 'lod.lowThresholdM',
      message: 'Must be > medium threshold',
      value: config.lod.lowThresholdM,
    });
  }

  if (config.lod.maxDistanceM <= config.lod.lowThresholdM) {
    errors.push({
      path: 'lod.maxDistanceM',
      message: 'Must be > low threshold',
      value: config.lod.maxDistanceM,
    });
  }

  // Validate opacity is 0-1
  if (config.rendering.defaultOpacity < 0 || config.rendering.defaultOpacity > 1) {
    errors.push({
      path: 'rendering.defaultOpacity',
      message: 'Must be between 0 and 1',
      value: config.rendering.defaultOpacity,
    });
  }

  // Validate ROI sizes
  if (config.roi.minSizeM <= 0) {
    errors.push({
      path: 'roi.minSizeM',
      message: 'Must be > 0',
      value: config.roi.minSizeM,
    });
  }

  if (config.roi.maxSizeM <= config.roi.minSizeM) {
    errors.push({
      path: 'roi.maxSizeM',
      message: 'Must be > min size',
      value: config.roi.maxSizeM,
    });
  }

  if (
    config.roi.defaultSizeM < config.roi.minSizeM ||
    config.roi.defaultSizeM > config.roi.maxSizeM
  ) {
    errors.push({
      path: 'roi.defaultSizeM',
      message: `Must be between ${config.roi.minSizeM} and ${config.roi.maxSizeM}`,
      value: config.roi.defaultSizeM,
    });
  }

  // Validate ROI shape is valid
  if (!['box', 'sphere', 'cylinder'].includes(config.roi.defaultShape)) {
    errors.push({
      path: 'roi.defaultShape',
      message: "Must be 'box', 'sphere', or 'cylinder'",
      value: config.roi.defaultShape,
    });
  }

  // Validate rendering point size
  if (config.rendering.pointSizePx <= 0) {
    errors.push({
      path: 'rendering.pointSizePx',
      message: 'Must be > 0',
      value: config.rendering.pointSizePx,
    });
  }

  // Validate FPS target
  if (config.rendering.targetFPS < 15 || config.rendering.targetFPS > 240) {
    errors.push({
      path: 'rendering.targetFPS',
      message: 'Must be between 15 and 240',
      value: config.rendering.targetFPS,
    });
  }

  // Validate logging level
  if (!['debug', 'info', 'warn', 'error'].includes(config.logging.level)) {
    errors.push({
      path: 'logging.level',
      message: "Must be 'debug', 'info', 'warn', or 'error'",
      value: config.logging.level,
    });
  }

  // Validate dataset config
  if (!config.dataset.basePath || config.dataset.basePath.trim() === '') {
    errors.push({
      path: 'dataset.basePath',
      message: 'Is required. Set VITE_DATA_PATH environment variable.',
      value: config.dataset.basePath,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate config and throw with detailed error message
 * Used at application startup (fail-fast)
 */
export function validateConfigOrThrow(config: AppConfig): void {
  const result = validateConfig(config);

  if (!result.valid) {
    let errorMessage = '❌ Configuration validation failed:\n\n';

    result.errors.forEach((error, index) => {
      errorMessage += `${index + 1}. [${error.path}]\n`;
      errorMessage += `   Message: ${error.message}\n`;
      if (error.value !== undefined) {
        errorMessage += `   Value: ${JSON.stringify(error.value)}\n`;
      }
      errorMessage += '\n';
    });

    errorMessage += 'Fix these issues and restart the application.\n';
    errorMessage += 'See docs/CONFIG.md for configuration guide.';

    throw new Error(errorMessage);
  }
}

/**
 * Log configuration summary (safe version for public consumption)
 */

export function logConfigSummary(config: AppConfig): void {
  console.log('%c📋 Application Configuration', 'font-weight: bold; color: #0066cc;');

  console.group('App Info');

  console.log(`Version: ${config.version}`);

  console.log(`Environment: ${config.environment}`);

  console.groupEnd();

  console.group('Dataset');

  console.log(`Base Path: ${config.dataset.basePath}`);

  console.log(`Default ID: ${config.dataset.defaultDatasetId}`);

  console.groupEnd();

  console.group('LOD Settings');

  console.log(`Medium Threshold: ${config.lod.mediumThresholdM}m`);

  console.log(`Low Threshold: ${config.lod.lowThresholdM}m`);

  console.log(`Max Distance: ${config.lod.maxDistanceM}m`);

  console.groupEnd();

  console.log('✅ Configuration loaded and validated');
}
