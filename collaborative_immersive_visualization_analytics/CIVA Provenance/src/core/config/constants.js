// Configuration constants

// ----------------------------------------------------------------------------
// Networking Constants
// ----------------------------------------------------------------------------
export const NETWORK_CONFIG = {
  // Y.js WebSocket URL is now in clientConfig.js (yjsWebSocketUrl)
  CURSOR_UPDATE_THROTTLE: 16, // ms
  STALE_CURSOR_THRESHOLD: 30000, // ms
};

// ----------------------------------------------------------------------------
// Logging Constants
// ----------------------------------------------------------------------------

export const MAX_LOG_MESSAGES = 100;

// Color coding based on type
export const LOG_COLORS = {
  info: "#ffffff",
  success: "#4CAF50",
  warning: "#ff9800",
  error: "#f44336",
  progress: "#2196F3",
};

// ----------------------------------------------------------------------------
// Algorithm Constants
// ----------------------------------------------------------------------------

export const ALGORITHM_LIMITS = {
  MAX_TSNE_POINTS: 1000,
  MAX_UMAP_POINTS: 800,
  LARGE_DATASET_WARNING: 10000,
  VERY_LARGE_DATASET_WARNING: 50000,
};

export const REDUCTION_DEFAULTS = {
  PCA_COMPONENTS: 3,
  TSNE_COMPONENTS: 2,
  UMAP_COMPONENTS: 2,
  TSNE_PERPLEXITY: 10.0,
  TSNE_MAX_ITERATIONS: 300,
  TSNE_LEARNING_RATE: 100.0,
  UMAP_N_NEIGHBORS: 8,
  UMAP_MIN_DIST: 0.1,
  UMAP_N_EPOCHS: 200,
};

export const MEMORY_THRESHOLDS = {
  HIGH_MEMORY_WARNING: 0.8,
  HIGH_TENSOR_COUNT: 50,
};

// ----------------------------------------------------------------------------
// Collaboration Constants
// ----------------------------------------------------------------------------

export const USER_COLORS = [
  "#ff4444",
  "#44ff44",
  "#4444ff",
  "#ffff44",
  "#ff44ff",
  "#44ffff",
  "#ff8800",
  "#8800ff",
  "#00ff88",
  "#ff0088",
  "#0088ff",
  "#88ff00",
];
