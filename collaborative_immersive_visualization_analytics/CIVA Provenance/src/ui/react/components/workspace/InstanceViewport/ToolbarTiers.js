// src/ui/react/components/workspace/InstanceViewport/ToolbarTiers.js
// Tool group definitions and tier configurations for the overlay toolbar system

// ============================================================================
// TOOL GROUPS - Organized by functionality
// ============================================================================

export const TOOL_GROUPS = {
  annotate: {
    id: "annotate",
    label: "Annotate",
    icon: 'pencil',
    description: "Drawing and annotation tools",
    tools: [
      { id: "pencil", label: "Pencil", icon: 'pencil', shortcut: "P" },
      { id: "text", label: "Text", icon: 'type', shortcut: "T" },
      { id: "measure", label: "Measure", icon: 'ruler', shortcut: "M" },
      { id: "crosshair", label: "Crosshair", icon: 'crosshair' },
      { id: "rectangle", label: "Rectangle", icon: 'square' },
      { id: "circle", label: "Circle", icon: 'circle' },
      { id: "arrow", label: "Arrow", icon: 'arrowRight' },
    ],
  },
  view: {
    id: "view",
    label: "View",
    icon: 'eye',
    description: "Camera and view controls",
    tools: [
      { id: "orbit", label: "Orbit", icon: 'eye' },
      { id: "pan", label: "Pan", icon: 'move' },
      { id: "zoom", label: "Zoom", icon: 'zoomIn' },
      { id: "reset-view", label: "Reset View", icon: 'rotateCcw', shortcut: "R" },
      { id: "focus", label: "Focus Selection", icon: 'focus' },
      { id: "fullscreen", label: "Fullscreen", icon: 'maximize', shortcut: "F" },
    ],
  },
  visual: {
    id: "visual",
    label: "Visual",
    icon: 'palette',
    description: "Visual styling and appearance",
    tools: [
      { id: "colormap", label: "Colormap", icon: 'palette' },
      { id: "layers", label: "Layers", icon: 'layers' },
      { id: "grid", label: "Grid", icon: 'grid3x3' },
      { id: "bounds", label: "Bounds", icon: 'box' },
    ],
  },
  collab: {
    id: "collab",
    label: "Collaborate",
    icon: 'users',
    description: "Collaboration tools",
    tools: [
      { id: "cursors", label: "Show Cursors", icon: 'users' },
      { id: "share", label: "Share View", icon: 'share2' },
      { id: "comment", label: "Comment", icon: 'messageSquare' },
      { id: "record", label: "Record", icon: 'video' },
    ],
  },
};

// ============================================================================
// GLOBAL TOOLS - Always visible on right side
// ============================================================================

export const GLOBAL_TOOLS = {
  instanceTools: {
    id: "instance-tools",
    label: "Instance Tools",
    icon: 'wrench',
    description: "Open instance tools panel",
    shortcut: "I",
  },
  more: {
    id: "more",
    label: "More",
    icon: 'moreHorizontal',
    description: "Additional options",
  },
};

// ============================================================================
// HISTORY TOOLS - Undo/Redo
// ============================================================================

export const HISTORY_TOOLS = {
  undo: {
    id: "undo",
    label: "Undo",
    icon: 'undo',
    shortcut: "Ctrl+Z",
  },
  redo: {
    id: "redo",
    label: "Redo",
    icon: 'redo',
    shortcut: "Ctrl+Shift+Z",
  },
};

// ============================================================================
// NAVIGATION BAR TOOLS - Bottom bar controls
// ============================================================================

export const NAV_TOOLS = {
  pan: { id: "nav-pan", label: "Pan", icon: 'move' },
  zoom: { id: "nav-zoom", label: "Zoom", icon: 'zoomIn' },
  rotate: { id: "nav-rotate", label: "Rotate", icon: 'rotateCcw' },
  fit: { id: "nav-fit", label: "Fit", icon: 'scan' },
  oneToOne: { id: "nav-1to1", label: "1:1", icon: null },
};

// ============================================================================
// CORNER CONTROL TOOLS - For small viewport fallback
// ============================================================================

export const CORNER_TOOLS = {
  instanceTools: {
    id: "corner-instance-tools",
    label: "Instance Tools",
    icon: 'wrench',
  },
  vrMode: {
    id: "corner-vr",
    label: "VR Mode",
    icon: 'vrHeadset',
  },
  settings: {
    id: "corner-settings",
    label: "Settings",
    icon: 'settings',
  },
};

// ============================================================================
// GEAR ONLY DROPDOWN ITEMS - For super tiny viewports
// ============================================================================

export const GEAR_DROPDOWN_ITEMS = [
  {
    id: "gear-instance-tools",
    label: "Instance Tools",
    icon: 'wrench',
    primary: true,
  },
  { id: "gear-vr", label: "VR Mode", icon: 'vrHeadset' },
  { id: "gear-maximize", label: "Maximize", icon: 'maximize' },
  { id: "gear-duplicate", label: "Duplicate", icon: null },
  { id: "gear-close", label: "Close", icon: null },
];

// ============================================================================
// TIER CONFIGURATIONS - What shows at each breakpoint
// ============================================================================

export const TIER_CONFIG = {
  expanded: {
    // All individual tool buttons
    showAnnotateGroup: false,
    showViewGroup: false,
    showVisualGroup: false,
    showIndividualTools: true,
    showCollabGroup: false,
    showHistoryButtons: true,
    cursorToolVisible: true,
    groupsAsDropdowns: false,
    iconsOnly: false,
  },
  standard: {
    // Annotate button + View/Visual dropdowns + Cursor + Undo/Redo
    showAnnotateGroup: true,
    showViewGroup: true,
    showVisualGroup: true,
    showIndividualTools: false,
    showCollabGroup: false,
    showHistoryButtons: true,
    cursorToolVisible: true,
    groupsAsDropdowns: true,
    iconsOnly: false,
  },
  compact: {
    // All groups as labeled dropdown buttons
    showAnnotateGroup: true,
    showViewGroup: true,
    showVisualGroup: true,
    showIndividualTools: false,
    showCollabGroup: true,
    showHistoryButtons: true,
    cursorToolVisible: false,
    groupsAsDropdowns: true,
    iconsOnly: false,
  },
  mini: {
    // Icon-only group dropdown buttons
    showAnnotateGroup: true,
    showViewGroup: true,
    showVisualGroup: true,
    showIndividualTools: false,
    showCollabGroup: true,
    showHistoryButtons: false,
    cursorToolVisible: false,
    groupsAsDropdowns: true,
    iconsOnly: true,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the tier configuration for a given UI mode
 * @param {'expanded'|'standard'|'compact'|'mini'} uiMode
 * @returns {Object} Tier configuration
 */
export const getTierConfig = (uiMode) => {
  return TIER_CONFIG[uiMode] || TIER_CONFIG.mini;
};

/**
 * Filter tools array based on tier configuration
 * @param {Array} tools - Array of tools from workspaceManager
 * @param {Object} tierConfig - Configuration for current tier
 * @returns {Object} Organized tools by group
 */
export const organizeToolsForTier = (tools, tierConfig) => {
  // For now, return the tools as-is organized by their group property
  // In a real implementation, this would filter and organize based on tier
  const organized = {
    annotate: [],
    view: [],
    visual: [],
    collab: [],
    other: [],
  };

  tools.forEach((tool) => {
    const group = tool.group || "other";
    if (organized[group]) {
      organized[group].push(tool);
    } else {
      organized.other.push(tool);
    }
  });

  return organized;
};

/**
 * Get tool groups to display based on UI mode
 * @param {'expanded'|'standard'|'compact'|'mini'} uiMode
 * @returns {Array} Array of group IDs to show
 */
export const getVisibleGroups = (uiMode) => {
  const config = getTierConfig(uiMode);
  const groups = [];

  if (config.showAnnotateGroup) groups.push("annotate");
  if (config.showViewGroup) groups.push("view");
  if (config.showVisualGroup) groups.push("visual");
  if (config.showCollabGroup) groups.push("collab");

  return groups;
};

// ============================================================================
// INSTANCE COLORS - For color assignment
// ============================================================================

export const INSTANCE_COLORS = [
  { name: "blue", hex: "#60a5fa", cssVar: "$color-accent-blue" },
  { name: "green", hex: "#34d399", cssVar: "$color-accent-green" },
  { name: "purple", hex: "#c084fc", cssVar: "$color-accent-purple" },
  { name: "pink", hex: "#fb7185", cssVar: "$color-accent-pink" },
  { name: "amber", hex: "#fbbf24", cssVar: "$color-accent-amber" },
  { name: "teal", hex: "#7dd3fc", cssVar: "$color-accent-teal" },
];

/**
 * Get color for an instance based on creation index
 * @param {number} index - Instance creation index
 * @returns {Object} Color object with name and hex
 */
export const getInstanceColor = (index) => {
  return INSTANCE_COLORS[index % INSTANCE_COLORS.length];
};

export default {
  TOOL_GROUPS,
  GLOBAL_TOOLS,
  HISTORY_TOOLS,
  NAV_TOOLS,
  CORNER_TOOLS,
  GEAR_DROPDOWN_ITEMS,
  TIER_CONFIG,
  INSTANCE_COLORS,
  getTierConfig,
  organizeToolsForTier,
  getVisibleGroups,
  getInstanceColor,
};
