/**
 * @file constants.js
 * @description Constants for Canvas Map Panel V2
 */

/**
 * Map operation modes
 */
export const MAP_MODES = {
  NAVIGATE: 'navigate',
  LAYOUT: 'layout',
  LINKS: 'links',
  TEAM: 'team',
};

/**
 * Mode metadata for UI rendering
 */
export const MODE_CONFIG = {
  [MAP_MODES.NAVIGATE]: {
    id: MAP_MODES.NAVIGATE,
    name: 'Viewports',
    icon: 'frame',
    color: 'cyan',
    description: 'Manage viewports',
  },
  [MAP_MODES.LAYOUT]: {
    id: MAP_MODES.LAYOUT,
    name: 'Layout',
    icon: 'layoutGrid',
    color: 'green',
    description: 'Build and edit canvas',
  },
  [MAP_MODES.TEAM]: {
    id: MAP_MODES.TEAM,
    name: 'Team',
    icon: 'users',
    color: 'amber',
    description: 'See teammates',
  },
};

/**
 * Display modes for minimap
 */
export const DISPLAY_MODES = {
  VG: 'vg',
  VIEW: 'view',
};

/**
 * Sub-tab options for Links mode
 */
export const LINKS_SUB_TABS = {
  VG: 'vg',
  VIEW: 'view',
};

/**
 * Sub-tab options for Collaborate mode
 */
export const COLLABORATE_SUB_TABS = {
  ME: 'me',
  TEAM: 'team',
};

/**
 * Layout configurations for ViewGroups
 */
export const LAYOUTS = {
  'single': { rows: 1, cols: 1, cells: 1 },
  'side-by-side': { rows: 1, cols: 2, cells: 2 },
  'stacked': { rows: 2, cols: 1, cells: 2 },
  '2x2': { rows: 2, cols: 2, cells: 4 },
  '1+2': { rows: 2, cols: 2, cells: 3, merged: 'top' },
  '2+1': { rows: 2, cols: 2, cells: 3, merged: 'right' },
};

/**
 * View type icons and colors
 */
export const VIEW_TYPES = {
  volume: { icon: 'box', color: 'purple', name: 'Volume' },
  slice: { icon: 'layers', color: 'blue', name: 'Slice' },
  data: { icon: 'barChart', color: 'green', name: 'Data' },
  chart: { icon: 'lineChart', color: 'amber', name: 'Chart' },
  notes: { icon: 'fileText', color: 'pink', name: 'Notes' },
};

/**
 * Size mode breakpoints for responsive behavior
 */
export const SIZE_MODE_BREAKPOINTS = {
  compact: 320,
  standard: 380,
  expanded: 440,
};

/**
 * Minimap constants
 */
export const MINIMAP_CONSTANTS = {
  BASE_CELL_SIZE: 42,
  FOCUSED_CELL_SIZE: 60,
  MIN_ZOOM: 50,
  MAX_ZOOM: 200,
  ZOOM_STEP: 25,
  GRID_GAP: 4,
  HEADER_SIZE: 24,
  SCROLL_PADDING: 0,
  EXTRA_GRID_CELLS: 2,
  PAN_PADDING_CELLS: 1,
};

/**
 * QuickNav actions
 */
export const QUICK_NAV_ACTIONS = {
  GO_HOME: 'goHome',
  SET_HOME: 'setHome',
  FIT_ALL: 'fitAll',
  ADD_BOOKMARK: 'addBookmark',
};
