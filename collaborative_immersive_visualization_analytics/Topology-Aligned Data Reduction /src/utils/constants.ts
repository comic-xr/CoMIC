/**
 * Shared constants
 */

// Grid and scene constants
export const GRID_SIZE = 10;
export const MAX_ZOOM = 100;
export const MIN_ZOOM = 0.1;
export const DEFAULT_ZOOM = 1;

// Performance constants
export const TARGET_FPS = 60;
export const FRAME_TIME_MS = 1000 / TARGET_FPS;

// Animation constants
export const ANIMATION_DURATION_MS = 300;
export const EASING_FUNCTION = 'ease-in-out';

// Default colors
export const COLOR_PRIMARY = 0x0066cc;
export const COLOR_SECONDARY = 0x666666;
export const COLOR_BACKGROUND = 0xffffff;
export const COLOR_GRID = 0xdddddd;

// Default material properties
export const MATERIAL_METALNESS = 0.5;
export const MATERIAL_ROUGHNESS = 0.5;

// Input debounce/throttle
export const INPUT_DEBOUNCE_MS = 100;
export const INPUT_THROTTLE_MS = 16; // ~60fps

// Data limits
export const MAX_DATA_POINTS = 100000;
export const MAX_DATASET_SIZE_MB = 50;
