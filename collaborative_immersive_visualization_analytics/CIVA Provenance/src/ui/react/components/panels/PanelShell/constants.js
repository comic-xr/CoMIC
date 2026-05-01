/**
 * PanelShell Constants
 *
 * Defines chrome levels, size modes, breakpoints, and VR modes
 * for the PanelShell component system.
 */

/**
 * Chrome level determines header complexity
 * @type {'full' | 'compact' | 'minimal'}
 */
export const CHROME_LEVELS = {
  FULL: 'full',
  COMPACT: 'compact',
  MINIMAL: 'minimal',
};

/**
 * Size mode based on current width vs breakpoints
 * @type {'compact' | 'standard' | 'expanded'}
 */
export const SIZE_MODES = {
  COMPACT: 'compact',
  STANDARD: 'standard',
  EXPANDED: 'expanded',
};

/**
 * VR positioning mode (for future implementation)
 * @type {'world-anchored' | 'hand-follow' | 'wrist-menu'}
 */
export const VR_POSITION_MODES = {
  WORLD_ANCHORED: 'world-anchored',
  HAND_FOLLOW: 'hand-follow',
  WRIST_MENU: 'wrist-menu',
};

/**
 * Default breakpoints for panel size modes
 * @typedef {Object} PanelBreakpoints
 * @property {number} minWidth - Absolute minimum, warning below this
 * @property {number} compactWidth - Below this: compact mode
 * @property {number} standardWidth - Default width
 * @property {number} expandedWidth - Above this: expanded mode
 */
export const DEFAULT_BREAKPOINTS = {
  minWidth: 200,
  compactWidth: 280,
  standardWidth: 320,
  expandedWidth: 400,
};

/**
 * Default panel dimensions
 */
export const DEFAULT_DIMENSIONS = {
  width: 320,
  height: 400,
  minWidth: 200,
  minHeight: 150,
  maxWidth: 800,
  maxHeight: 900,
};

/**
 * Storage key for persisting panel state
 */
export const STORAGE_KEY = 'ciaPanelShellState';

/**
 * Base z-index for panels
 */
export const BASE_Z_INDEX = 1000;
