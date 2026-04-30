/**
 * Data Module
 *
 * Responsible for:
 * - Data loading from files/APIs
 * - Data parsing (CSV, JSON, Binary)
 * - Data validation and normalization
 * - Caching strategies
 * - Data transformation pipelines
 * - No hardcoded paths (use environment variables or config)
 *
 * API Contract:
 * - DataLoader: Load data from various sources
 * - DataValidator: Validate data structure and schema
 * - DataTransformer: Transform/normalize data formats
 * - CacheManager: Cache frequently accessed data
 *
 * CONSTRAINTS:
 * - All data paths must come from config or environment variables
 * - No hardcoded file paths
 * - Async operations only (no sync file reads in browser)
 * - Error handling with descriptive messages
 *
 * DO NOT:
 * - Render data (belongs in ui/)
 * - Manage state (belongs in state/)
 * - Handle user input (belongs in interaction/)
 */

// Export public API
export type {
  DataConfig,
  LoadedData,
  LoadedVolume,
  Dimensions,
  Extent,
  LodLevel,
  Vec3,
  VTKImageData,
} from './types';
export {
  DataLoader,
  DataValidator,
  getVolumeStatsFromVtkImageData,
  getVtiUrlForLod,
  getVtkjsIndexUrlForLod,
  loadVtkjsIndex,
  loadVolume,
  loadVolumeFromBackend,
  loadVolumeWithProgress,
  loadVti,
  loadVtiAsVolume,
  loadVtiFromFile,
  volumeFromVtkImageData,
} from './data-loader';
export type { LoadVolumeProgress, VolumeStatsFromVtk } from './data-loader';
export type {
  DatasetDescriptor,
  ScalarFieldDescriptor,
  ResolutionLevel,
} from './dataset-descriptor';
export {
  voxelCountFromDimensions,
  resolutionToLodLevel,
  descriptorFromVtkImageData,
} from './dataset-descriptor';
export type { LoadProgress, LoadOptions, LoadResult } from './async-loader';
export { loadVolumeAsync, loadDescriptor, LoadError } from './async-loader';
export { SpatialLODManager } from './lod-manager';
export type { LODStateTransition, LODRegion } from './lod-manager';
export { FeatureManager } from './feature-manager';
export type { FeatureDatasetInfo } from './feature-manager';
