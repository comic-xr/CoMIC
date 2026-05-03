/**
 * @file constants.js
 * @description Constants for Instance Tools Panel V2
 */

// ViewGroup tipping point - when to switch from connectors to grid
export const VIEWGROUP_TIPPING_POINT = 5;

// Tool section configuration
export const TOOL_SECTIONS = [
  { id: 'camera', label: 'Camera', icon: 'camera', color: 'cyan' },
  { id: 'transform', label: 'Transform', icon: 'move', color: 'pink' },
  { id: 'widgets', label: 'Widgets', icon: 'ruler', color: 'purple' },
  { id: 'appearance', label: 'Appearance', icon: 'eye', color: 'green' },
  { id: 'colormap', label: 'Colormap', icon: 'palette', color: 'amber' },
  { id: 'scene', label: 'Scene', icon: 'layers', color: 'teal' },
  { id: 'slice', label: 'Slice', icon: 'sliders', color: 'blue' },
  { id: 'windowLevel', label: 'Window/Level', icon: 'sun', color: 'orange' },
];

// Transform limits
export const TRANSFORM_LIMITS = {
  position: { min: -500, max: 500, step: 1, unit: 'mm' },
  rotation: { min: -180, max: 180, step: 1, unit: '°' },
  scale: { min: 10, max: 200, step: 1, unit: '%' },
};

// Camera presets for the camera grid
export const CAMERA_PRESETS = [
  { id: 'iso', label: 'Iso', icon: 'box', position: [0, 0] },
  { id: 'top', label: 'Top', icon: 'arrowUp', position: [0, 1] },
  null, // Empty cell
  { id: 'left', label: 'Left', icon: 'arrowLeft', position: [1, 0] },
  { id: 'reset', label: 'Reset', icon: 'refreshCcw', position: [1, 1], special: true },
  { id: 'right', label: 'Right', icon: 'arrowRight', position: [1, 2] },
  { id: 'front', label: 'Front', icon: 'circle', position: [2, 0] },
  { id: 'bottom', label: 'Bot', icon: 'arrowDown', position: [2, 1] },
  { id: 'back', label: 'Back', icon: 'circleDot', position: [2, 2] },
];

// Slice orientations
export const SLICE_ORIENTATIONS = [
  { id: 'axial', label: 'Axial' },
  { id: 'sagittal', label: 'Sagittal' },
  { id: 'coronal', label: 'Coronal' },
];

// Window/Level presets
export const WINDOW_LEVEL_PRESETS = [
  { id: 'brain', label: 'Brain', window: 80, level: 40 },
  { id: 'bone', label: 'Bone', window: 2500, level: 480 },
  { id: 'lung', label: 'Lung', window: 1500, level: -600 },
  { id: 'soft', label: 'Soft', window: 400, level: 40 },
];

// Appearance representations
export const REPRESENTATIONS = [
  { id: 'surface', label: 'Surface' },
  { id: 'wireframe', label: 'Wireframe' },
  { id: 'points', label: 'Points' },
];

// Panel tabs
export const PANEL_TABS = [
  { id: 'tools', label: 'Tools', icon: 'wrench', color: 'amber' },
  { id: 'display', label: 'Display', icon: 'eye', color: 'teal' },
  { id: 'annotations', label: 'Annotations', icon: 'mapPin', color: 'pink' },
];

// Layer types with colors
export const LAYER_TYPES = {
  data: { label: 'Data', color: 'purple' },
  overlay: { label: 'Overlay', color: 'pink' },
  segmentation: { label: 'Segmentation', color: 'teal' },
};

// Widget types
export const WIDGET_TYPES = {
  line: { label: 'Line', icon: 'ruler' },
  angle: { label: 'Angle', icon: 'cornerUpRight' },
  plane: { label: 'Plane', icon: 'square' },
  point: { label: 'Point', icon: 'mapPin' },
};

// Animation easing options
export const EASING_OPTIONS = [
  { id: 'easeInOut', label: 'Ease In/Out', icon: 'arrowLeftRight' },
  { id: 'easeOut', label: 'Ease Out', icon: 'arrowRight' },
  { id: 'easeIn', label: 'Ease In', icon: 'arrowLeft' },
  { id: 'linear', label: 'Linear', icon: 'minus' },
  { id: 'bounce', label: 'Bounce', icon: 'arrowUpDown' },
];

// Animation presets
export const ANIMATION_PRESETS = [
  {
    id: 'orbit',
    icon: 'rotateCw',
    label: 'Orbit',
    description: '360° horizontal rotation',
    defaultDuration: 8000,
  },
  {
    id: 'tumble',
    icon: 'rotate3d',
    label: 'Tumble',
    description: 'Random gentle rotation',
    defaultDuration: 10000,
  },
  {
    id: 'rock',
    icon: 'arrowLeftRight',
    label: 'Rock',
    description: '±30° back and forth',
    defaultDuration: 4000,
  },
];

// Camera animation defaults
export const CAMERA_ANIMATION_DEFAULTS = {
  enabled: true,
  duration: 500,
  easing: 'easeInOut',
};

// Annotation tools
export const ANNOTATION_TOOLS = [
  {
    id: 'text',
    name: 'Text',
    icon: 'type',
    shortcut: 'T',
    description: 'Add text annotation at a point',
    instructions: 'Click to place, then type',
  },
  {
    id: 'marker',
    name: 'Marker',
    icon: 'mapPin',
    shortcut: 'M',
    description: 'Mark a point of interest',
    instructions: 'Click to place marker',
  },
  {
    id: 'arrow',
    name: 'Arrow',
    icon: 'arrowUpRight',
    shortcut: 'W',
    description: 'Point to something',
    instructions: 'Click start, drag to end',
  },
  {
    id: 'region',
    name: 'Region',
    icon: 'hexagon',
    shortcut: 'R',
    description: 'Outline an area',
    instructions: 'Click points, Enter to close',
  },
  {
    id: 'freehand',
    name: 'Draw',
    icon: 'penTool',
    shortcut: 'D',
    description: 'Freeform drawing',
    instructions: 'Click and drag',
  },
  {
    id: 'callout',
    name: 'Callout',
    icon: 'messageSquare',
    shortcut: 'C',
    description: 'Text with leader line',
    instructions: 'Click target, place text',
  },
];

// Annotation colors
export const ANNOTATION_COLORS = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#ffffff', // white
];

// Annotation scopes
export const ANNOTATION_SCOPES = {
  instance: { label: 'This View', icon: 'image', color: 'pink' },
  workspace: { label: 'Workspace', icon: 'users', color: 'teal' },
};

// Annotation filter options
export const ANNOTATION_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'instance', label: 'This View' },
  { id: 'mine', label: 'My Annotations' },
];

// =============================================================================
// DISPLAY TAB CONSTANTS
// =============================================================================

// Scene Overlay defaults
export const OVERLAY_DEFAULTS = {
  orientation: { style: 'cube', position: 'BOTTOM_RIGHT', sizePreset: 'md', sizePercent: 12, sizePixels: 80 },
  grid: { plane: 'xz', divisions: 10, opacity: 50 },
  axes: { showLabels: true, showTicks: true, color: 'white' },
  scalebar: { style: 'ticked', position: 'BOTTOM_RIGHT', orientation: 'horizontal', behavior: 'auto', units: 'auto' },
  coordinates: { position: 'BOTTOM_LEFT', format: 'xyz', precision: 2 },
};

// Scene Overlay configurations
export const OVERLAY_CONFIG = {
  orientation: {
    id: 'orientation',
    name: 'Orientation',
    icon: 'compass',
    shortcut: 'Shift+O',
    hasSettings: true,
    getActiveLabel: (c) => c.style.charAt(0).toUpperCase() + c.style.slice(1),
  },
  grid: {
    id: 'grid',
    name: 'Grid',
    icon: 'grid',
    shortcut: 'Shift+G',
    hasSettings: true,
    getActiveLabel: (c) => c.plane.toUpperCase(),
  },
  axes: {
    id: 'axes',
    name: 'Axes',
    icon: 'move3d',
    shortcut: 'Shift+A',
    hasSettings: true,
    getActiveLabel: () => null,
  },
  scalebar: {
    id: 'scalebar',
    name: 'Scale Bar',
    icon: 'ruler',
    shortcut: 'Shift+B',
    hasSettings: true,
    getActiveLabel: (c) => (c.behavior === 'auto' ? 'Auto' : 'Fixed'),
  },
  coordinates: {
    id: 'coordinates',
    name: 'Coords',
    icon: 'mapPin',
    shortcut: 'Shift+C',
    hasSettings: true,
    getActiveLabel: (c) => `${c.precision}dp`,
  },
  fps: {
    id: 'fps',
    name: 'FPS',
    icon: 'activity',
    shortcut: 'Shift+F',
    hasSettings: false,
    getActiveLabel: () => null,
  },
};

// Orientation widget styles
export const ORIENTATION_STYLES = [
  { id: 'cube', name: 'Cube' },
  { id: 'arrows', name: 'Arrows' },
  { id: 'compass', name: 'Compass' },
  { id: 'gimbal', name: 'Gimbal' },
  { id: 'human', name: 'Human' },
];

// Size presets for overlays
export const SIZE_PRESETS = [
  { id: 'xs', label: 'XS', percent: 6, pixels: 40 },
  { id: 'sm', label: 'S', percent: 9, pixels: 60 },
  { id: 'md', label: 'M', percent: 12, pixels: 80 },
  { id: 'lg', label: 'L', percent: 16, pixels: 120 },
  { id: 'xl', label: 'XL', percent: 20, pixels: 160 },
];

// Grid plane options
export const GRID_PLANES = [
  { id: 'xy', label: 'XY' },
  { id: 'xz', label: 'XZ' },
  { id: 'yz', label: 'YZ' },
];

// Scale bar styles
export const SCALEBAR_STYLES = [
  { id: 'simple', name: 'Simple' },
  { id: 'ticked', name: 'Ticked' },
  { id: 'bracketed', name: 'Bracket' },
  { id: 'boxed', name: 'Boxed' },
];

// Render modes
export const RENDER_MODES = [
  { id: 'volume', label: 'Volume' },
  { id: 'surface', label: 'Surface' },
  { id: 'slice', label: 'Slice' },
  { id: 'mip', label: 'MIP' },
];

// Color maps
export const COLOR_MAPS = [
  { id: 'grayscale', label: 'Grayscale' },
  { id: 'viridis', label: 'Viridis' },
  { id: 'plasma', label: 'Plasma' },
  { id: 'hot', label: 'Hot' },
  { id: 'cool', label: 'Cool' },
];

// Position grid (9-point)
export const POSITION_GRID = [
  ['TOP_LEFT', 'TOP_CENTER', 'TOP_RIGHT'],
  ['MIDDLE_LEFT', 'CENTER', 'MIDDLE_RIGHT'],
  ['BOTTOM_LEFT', 'BOTTOM_CENTER', 'BOTTOM_RIGHT'],
];
