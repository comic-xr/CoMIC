// =============================================================================
// ICON REGISTRY - Material Symbols Mapping
// =============================================================================
//
// Maps semantic icon names used in CIA Web → Material Symbol names
// Source: https://fonts.google.com/icons (Material Symbols)
//
// Naming conventions:
// - Use camelCase for semantic names
// - Keep names action/object focused
// - Add aliases for common variations
//
// =============================================================================

export const ICON_REGISTRY = {
  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION & ARROWS
  // ═══════════════════════════════════════════════════════════════════════════
  chevronDown: "expand_more",
  chevronUp: "expand_less",
  chevronLeft: "chevron_left",
  chevronRight: "chevron_right",
  arrowUp: "arrow_upward",
  arrowDown: "arrow_downward",
  arrowLeft: "arrow_back",
  arrowRight: "arrow_forward",
  arrowUpDown: "swap_vert",
  arrowLeftRight: "swap_horiz",
  skipBack: "skip_previous",
  skipForward: "skip_next",
  arrowUpRight: "north_east",
  arrowUpLeft: "north_west",
  arrowDownRight: "south_east",
  arrowDownLeft: "south_west",
  cornerUpLeft: "north_west",
  cornerUpRight: "north_east",
  cornerDownLeft: "south_west",
  cornerDownRight: "south_east",

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  add: "add",
  plus: "add",
  remove: "remove",
  minus: "remove",
  close: "close",
  x: "close",
  check: "check",
  done: "done",
  edit: "edit",
  delete: "delete",
  trash: "delete",
  deletePermanent: "delete_forever",
  save: "save",
  copy: "content_copy",
  paste: "content_paste",
  cut: "content_cut",
  undo: "undo",
  redo: "redo",
  refresh: "refresh",
  refreshCw: "sync", // Clockwise refresh/sync
  rotateCcw: "rotate_left",
  rotateCw: "rotate_right",
  restore: "history",
  search: "search",
  filter: "filter_alt",
  filterList: "filter_list",
  sort: "sort",
  sync: "sync",
  cancel: "cancel",
  rightClick: "right_click",

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW & DISPLAY
  // ═══════════════════════════════════════════════════════════════════════════
  eye: "visibility",
  eyeOff: "visibility_off",
  preview: "preview",
  zoomIn: "zoom_in",
  zoomOut: "zoom_out",
  fitView: "fit_screen",
  focus: "center_focus_strong",
  fullscreen: "fullscreen",
  fullscreenExit: "fullscreen_exit",
  maximize: "open_in_full",
  minimize: "close_fullscreen",
  expand: "open_in_full",
  collapse: "close_fullscreen",
  canvasSize: "photo_size_select_small",
  windowRestore: "pip_exit", // Restore window from maximized/pip

  // ═══════════════════════════════════════════════════════════════════════════
  // 3D & SPATIAL
  // ═══════════════════════════════════════════════════════════════════════════
  box: "square",
  cube: "deployed_code",
  rotate3d: "rotation_3d",
  pan: "pan_tool",
  move: "open_with",
  hand: "pan_tool_alt",
  layers: "layers",
  place: "playlist_add",
  combine: "merge_type",

  // ═══════════════════════════════════════════════════════════════════════════
  // VR & IMMERSIVE
  // ═══════════════════════════════════════════════════════════════════════════
  vr: "view_in_ar",
  vrPano: "vrpano", // VR panorama view
  vrHeadset: "head_mounted_device", // VR headset view
  spatialAudio: "spatial_audio",
  gesture: "gesture",
  controller: "sports_esports",

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOLS & EDITING
  // ═══════════════════════════════════════════════════════════════════════════
  pencil: "edit",
  pen: "draw",
  penTool: "draw",
  brush: "brush",
  eraser: "ink_eraser",
  scissors: "content_cut",
  clip: "content_cut",
  ruler: "straighten",
  measure: "square_foot",
  protractor: "architecture", // Angle measurement
  palette: "palette",
  colorize: "colorize",
  sliders: "tune",
  tune: "tune",
  settings: "settings",
  wrench: "build",
  tools: "build",
  handyman: "handyman",
  target: "my_location",
  crosshair: "gps_fixed",
  scan: "center_focus_strong",
  wand: "auto_fix_high",
  boxSelect: "select_all", // Box selection tool

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA & FILES
  // ═══════════════════════════════════════════════════════════════════════════
  file: "description",
  fileText: "description",
  fileType: "description",
  fileDownload: "download",
  fileUpload: "upload",
  folder: "folder",
  folderOpen: "folder_open",
  folderPlus: "create_new_folder",
  folderTree: "account_tree",
  database: "database",
  dataset: "dataset",
  upload: "upload",
  download: "download",
  paperclip: "attach_file",
  archive: "archive",
  hardDrive: "hard_drive",

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIA & COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════════════
  mic: "mic",
  micOff: "mic_off",
  video: "videocam",
  videoOff: "videocam_off",
  camera: "photo_camera",
  photoCamera: "photo_camera",
  volume: "volume_up",
  volumeOff: "volume_off",
  volumeMute: "volume_off",
  play: "play_arrow",
  pause: "pause",
  stop: "stop",
  record: "fiber_manual_record",
  image: "image",
  imageOff: "hide_image",
  brokenImage: "broken_image",
  radio: "radio",
  signal: "signal_cellular_alt",

  // ═══════════════════════════════════════════════════════════════════════════
  // USERS & COLLABORATION
  // ═══════════════════════════════════════════════════════════════════════════
  user: "person",
  userCircle: "account_circle",
  users: "group",
  people: "group",
  userPlus: "person_add",
  userRemove: "person_remove",
  userCheck: "how_to_reg",
  userCog: "manage_accounts",
  userX: "person_off",
  share: "share",
  share2: "ios_share",
  chat: "chat",
  messageSquare: "chat_bubble",
  comment: "comment",
  send: "send",
  bell: "notifications",
  bellOutline: "notifications_none",

  // ═══════════════════════════════════════════════════════════════════════════
  // UI & LAYOUT
  // ═══════════════════════════════════════════════════════════════════════════
  menu: "menu",
  moreHorizontal: "more_horiz",
  moreVertical: "more_vert",
  grid: "grid_view",
  grid3x3: "grid_3x3",
  layoutGrid: "view_module",
  layoutList: "view_list",
  aspectRatio: "aspect_ratio",
  list: "list",
  layout: "dashboard",
  dashboard: "dashboard",
  panelLeftClose: "left_panel_close",
  panelLeftOpen: "left_panel_open",
  panelRightClose: "right_panel_close",
  panelRightOpen: "right_panel_open",
  gripHorizontal: "drag_handle",
  gripVertical: "drag_indicator",
  grip: "drag_handle",
  dragHorizontal: "drag_handle",
  dragVertical: "drag_indicator",
  dock: "view_module", // Grid layout for docked mode
  viewGroup: "view_quilt",
  view: "view_carousel",

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS & FEEDBACK
  // ═══════════════════════════════════════════════════════════════════════════
  info: "info",
  warning: "warning",
  error: "error",
  errorOutline: "error_outline",
  success: "check_circle",
  checkCircle: "check_circle",
  help: "help",
  helpCircle: "help_outline",
  loader: "progress_activity",
  alertCircle: "error",
  alertTriangle: "warning",
  xCircle: "cancel",
  disabled: "do_not_disturb_on",
  dot: "fiber_manual_record",
  slash: "do_not_disturb_on",

  // ═══════════════════════════════════════════════════════════════════════════
  // SCIENCE & DOMAIN-SPECIFIC
  // ═══════════════════════════════════════════════════════════════════════════
  biotech: "biotech",
  science: "science",
  microscope: "biotech",
  analytics: "analytics",
  chart: "bar_chart",
  barChart: "bar_chart",
  graph: "show_chart",
  scatterChart: "scatter_plot",
  activity: "monitoring",
  trend: "trending_up",
  trendUp: "trending_up",
  trendDown: "trending_down",
  network: "hub",
  atom: "science",
  brain: "psychology",
  dna: "genetics",
  heart: "favorite",
  zap: "bolt",
  rocket: "rocket_launch",
  gitCompare: "compare",
  compare: "compare",
  gitBranch: "fork_right",
  flask: "science",
  thermometer: "thermostat",
  axis3d: "3d_rotation",
  "3d": "3d",
  "2d": "2d",
  presentation: "slideshow",
  waterDrop: "water_drop",

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION & LOCATION
  // ═══════════════════════════════════════════════════════════════════════════
  compass: "explore",
  compassOff: "explore_off",
  navigation: "navigation",
  home: "home",
  map: "map",
  mapPin: "location_on",
  location: "location_on",
  globe: "language",
  public: "public",

  // ═══════════════════════════════════════════════════════════════════════════
  // TIME & SCHEDULING
  // ═══════════════════════════════════════════════════════════════════════════
  clock: "schedule",
  time: "schedule",
  calendar: "calendar_today",
  event: "event",

  // ═══════════════════════════════════════════════════════════════════════════
  // SHAPES & GEOMETRY
  // ═══════════════════════════════════════════════════════════════════════════
  circle: "circle",
  circleDot: "radio_button_checked",
  radioDot: "radio_button_checked",
  square: "square",
  triangle: "change_history",
  hexagon: "hexagon",

  // ═══════════════════════════════════════════════════════════════════════════
  // SECURITY & ACCESS
  // ═══════════════════════════════════════════════════════════════════════════
  lock: "lock",
  unlock: "lock_open",
  shield: "shield",
  shieldAlert: "gpp_maybe",
  key: "key",
  verified: "verified_user",

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOKMARKS & FAVORITES
  // ═══════════════════════════════════════════════════════════════════════════
  bookmark: "bookmark",
  bookmarkBorder: "bookmark_border",
  star: "star",
  starOutline: "star_border",
  pin: "keep",
  pinOff: "keep_off",
  tag: "sell", //"label",
  label: "label",

  // ═══════════════════════════════════════════════════════════════════════════
  // LINKS & EXTERNAL
  // ═══════════════════════════════════════════════════════════════════════════
  link: "link",
  addLink: "add_link",
  linkOff: "link_off",
  externalLink: "open_in_new",
  doorOpen: "meeting_room",
  logout: "logout",
  login: "login",

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVICES & HARDWARE
  // ═══════════════════════════════════════════════════════════════════════════
  keyboard: "keyboard",
  monitor: "desktop_windows",
  desktop: "desktop_windows",
  headphones: "headphones",
  headset: "headset",
  headsetMic: "headset_mic",
  headsetOff: "headset_off",
  joinVoice: "headset_mic",
  leaveVoice: "headset_off",
  phone: "phone",
  phoneOff: "phone_disabled",
  phoneMissed: "phone_missed",
  wifi: "wifi",
  wifiOff: "wifi_off",
  cpu: "developer_board",
  memory: "memory",
  terminal: "terminal",

  // ═══════════════════════════════════════════════════════════════════════════
  // TOGGLES & MODES
  // ═══════════════════════════════════════════════════════════════════════════
  sun: "light_mode",
  moon: "dark_mode",
  toggleOn: "toggle_on",
  toggleOff: "toggle_off",

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENTS & TEXT
  // ═══════════════════════════════════════════════════════════════════════════
  scrollText: "article", // For logs tab
  article: "article",
  type: "text_fields_alt", // Text/typography
  stickyNote: "sticky_note_2",
  note: "note",
  notes: "notes",

  // ═══════════════════════════════════════════════════════════════════════════
  // MISC
  // ═══════════════════════════════════════════════════════════════════════════
  coffee: "coffee",
  smile: "sentiment_satisfied",
  crown: "emoji_events",
  building: "business",
  building2: "apartment",
  merge: "merge",
  mousePointer: "mouse",
  atSign: "alternate_email",
  flipHorizontal: "flip",
  transform: "transform",

  // ═══════════════════════════════════════════════════════════════════════════
  // FALLBACK
  // ═══════════════════════════════════════════════════════════════════════════
  //default: "help_outline", // Fallback icon for unknown semantic names
  default: "frame_bug", // More distinct fallback to catch icon problems in development
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get Material Symbol name from semantic name
 * @param {string} semanticName - The semantic icon name used in the app
 * @returns {string} The Material Symbol name
 */
export function getSymbolName(semanticName) {
  const name = ICON_REGISTRY[semanticName];
  if (!name) {
    console.warn(`[Icon] Unknown: "${semanticName}", using fallback`);
    return ICON_REGISTRY.default;
  }
  return name;
}

/**
 * Check if a semantic name exists in the registry
 * @param {string} semanticName - The semantic icon name
 * @returns {boolean}
 */
export function hasIcon(semanticName) {
  return semanticName in ICON_REGISTRY;
}

/**
 * Get all available semantic icon names
 * @returns {string[]}
 */
export function getAvailableIcons() {
  return Object.keys(ICON_REGISTRY).sort();
}

/**
 * Get all unique Material Symbol names used
 * @returns {string[]}
 */
export function getUsedSymbols() {
  return [...new Set(Object.values(ICON_REGISTRY))].sort();
}
