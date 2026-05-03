// =============================================================================
// TOOLBAR ICON REGISTRY
// =============================================================================
// Maps semantic icon names to icon components for toolbar tools.
// Uses the centralized Icon system via getIconComponent.
//
// PATTERN:
// - Use lowercase-with-hyphens for names
// - Keep names semantic, not tool-specific
// - Allow multiple tools to share one icon
// - Add aliases for common variations
//
// USAGE IN TOOLS:
// {
//   id: "my-specific-tool",        ← Unique tool ID
//   icon: "compass",               ← Semantic icon name
//   label: "My Tool"
// }
// =============================================================================

import { ui as log } from "@Utils/logger.js";
import { createSlashedIcon } from "@UI/react/components/atoms/IconOverlay";
import { getIconComponent } from "@UI/react/components/atoms/Icon";

// =============================================================================
// SLASHED ICON VARIANTS
// =============================================================================
// Create slashed (disabled/off) versions of common icons
// Using string names with createSlashedIcon factory

const SlashedCompass = createSlashedIcon("compass");
const SlashedGrid = createSlashedIcon("grid");
const SlashedRuler = createSlashedIcon("ruler");
const SlashedEye = createSlashedIcon("eye");
const SlashedMic = createSlashedIcon("mic");
const SlashedVideo = createSlashedIcon("video");
const SlashedWifi = createSlashedIcon("wifi");

// =============================================================================
// ICON REGISTRY
// =============================================================================

const TOOL_ICON_MAP = {
  // =========================================================================
  // GEOMETRY & 3D
  // Used by: general shapes, bounds, primitives
  // =========================================================================
  box: getIconComponent("box"),
  cube: getIconComponent("box"),
  square: getIconComponent("square"),
  circle: getIconComponent("circle"),
  triangle: getIconComponent("triangle"),
  layers: getIconComponent("layers"),

  // =========================================================================
  // MEASUREMENT & ANALYSIS
  // Used by: measurement tools, statistics, data analysis
  // =========================================================================
  ruler: getIconComponent("ruler"),
  measure: getIconComponent("ruler"),
  "ruler-off": SlashedRuler,
  "measure-off": SlashedRuler,
  "bar-chart": getIconComponent("dashboard"),
  trend: getIconComponent("arrowUp"),
  network: getIconComponent("gitBranch"),
  graph: getIconComponent("gitBranch"),

  // =========================================================================
  // CAMERA & VIEWING
  // Used by: camera controls, view presets, zoom
  // =========================================================================
  camera: getIconComponent("camera"),
  eye: getIconComponent("eye"),
  "eye-off": SlashedEye,
  focus: getIconComponent("focus"),
  "zoom-in": getIconComponent("zoomIn"),
  "zoom-out": getIconComponent("zoomOut"),
  fit: getIconComponent("fitView"),
  "fit-view": getIconComponent("fitView"),

  // =========================================================================
  // NAVIGATION & ORIENTATION
  // Used by: compass, orientation cube, navigation
  // =========================================================================
  compass: getIconComponent("compass"),
  "compass-off": SlashedCompass,
  orientation: getIconComponent("compass"),
  navigate: getIconComponent("navigation"),
  pan: getIconComponent("move"),
  rotate: getIconComponent("rotate3d"),
  "rotate-3d": getIconComponent("rotate3d"),

  // =========================================================================
  // TOOLS & EDITING
  // Used by: clip planes, scissors, editing tools
  // =========================================================================
  scissors: getIconComponent("scissors"),
  clip: getIconComponent("clip"),
  cut: getIconComponent("scissors"),
  edit: getIconComponent("edit"),
  pencil: getIconComponent("pencil"),
  hand: getIconComponent("hand"),
  move: getIconComponent("move"),
  palette: getIconComponent("palette"),
  color: getIconComponent("palette"),

  // =========================================================================
  // GRID & LAYOUT
  // Used by: grid overlays, layout tools
  // =========================================================================
  grid: getIconComponent("grid"),
  "grid-off": SlashedGrid,
  "grid-3x3": getIconComponent("grid3x3"),
  layout: getIconComponent("layout"),
  "layout-grid": getIconComponent("layoutGrid"),

  // =========================================================================
  // MEDIA & COMMUNICATION
  // Used by: voice, video, audio controls
  // =========================================================================
  mic: getIconComponent("mic"),
  "mic-off": SlashedMic,
  video: getIconComponent("video"),
  "video-off": SlashedVideo,
  volume: getIconComponent("volume"),
  wifi: getIconComponent("wifi"),
  "wifi-off": SlashedWifi,

  // =========================================================================
  // ACTIONS & CONFIRMATION
  // Used by: confirmations, cancel, refresh
  // =========================================================================
  check: getIconComponent("check"),
  confirm: getIconComponent("check"),
  x: getIconComponent("close"),
  cancel: getIconComponent("close"),
  close: getIconComponent("close"),
  refresh: getIconComponent("refresh"),
  reload: getIconComponent("refresh"),
  fullscreen: getIconComponent("fullscreen"),
  maximize: getIconComponent("maximize"),
  minimize: getIconComponent("minimize"),

  // =========================================================================
  // DATA & FILES
  // Used by: data info, import/export
  // =========================================================================
  database: getIconComponent("database"),
  data: getIconComponent("database"),
  file: getIconComponent("file"),
  document: getIconComponent("file"),
  download: getIconComponent("download"),
  export: getIconComponent("download"),
  upload: getIconComponent("upload"),
  import: getIconComponent("upload"),

  // =========================================================================
  // SETTINGS & INFO
  // Used by: configuration, properties, information
  // =========================================================================
  settings: getIconComponent("settings"),
  config: getIconComponent("settings"),
  sliders: getIconComponent("sliders"),
  properties: getIconComponent("sliders"),
  controls: getIconComponent("sliders"),
  info: getIconComponent("info"),
  help: getIconComponent("help"),

  // =========================================================================
  // VR & 3D
  // Used by: VR mode, 3D controls
  // =========================================================================
  vr: getIconComponent("vr"),
  "3d": getIconComponent("box"),

  // =========================================================================
  // FALLBACK
  // =========================================================================
  default: getIconComponent("box"),
};

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get icon component for a tool
 *
 * Priority order:
 * 1. Explicit icon provided by tool definition (tool.icon)
 * 2. Tool's ID if it matches an icon name (tool.id)
 * 3. Default fallback
 *
 * @param {string} toolId - The tool's unique ID
 * @param {string} [toolIcon] - Optional explicit icon name from tool.icon
 * @returns {React.Component} Icon component
 */
export function getToolIcon(toolId, toolIcon) {
  // Priority 1: Explicit icon name provided
  if (toolIcon && TOOL_ICON_MAP[toolIcon]) {
    return TOOL_ICON_MAP[toolIcon];
  }

  // Priority 2: Tool ID matches an icon name
  if (TOOL_ICON_MAP[toolId]) {
    return TOOL_ICON_MAP[toolId];
  }

  // Priority 3: Default fallback
  log.warn(`No icon mapping for tool: ${toolId}, using default`);
  log.debug(
    `Hint: Add 'icon: "icon-name"' to tool definition or add mapping: "${toolId}": getIconComponent('...')`
  );
  return TOOL_ICON_MAP["default"];
}

/**
 * Check if an icon name exists in the toolbar registry
 *
 * @param {string} iconName - Icon name to check
 * @returns {boolean}
 */
export function hasIconMapping(iconName) {
  return iconName in TOOL_ICON_MAP;
}

/**
 * Get all available icon names in the toolbar registry
 * Useful for documentation and debugging
 *
 * @returns {string[]} Array of all icon names
 */
export function getAvailableToolIcons() {
  return Object.keys(TOOL_ICON_MAP);
}

/**
 * Register a new icon at runtime
 * Allows features/plugins to add their own icons
 *
 * @param {string} iconName - Name to register
 * @param {React.Component} iconComponent - Icon component (from getIconComponent)
 */
export function registerToolIcon(iconName, iconComponent) {
  if (TOOL_ICON_MAP[iconName]) {
    log.warn(`Overwriting existing icon mapping: ${iconName}`);
  }
  TOOL_ICON_MAP[iconName] = iconComponent;
}

export default TOOL_ICON_MAP;
