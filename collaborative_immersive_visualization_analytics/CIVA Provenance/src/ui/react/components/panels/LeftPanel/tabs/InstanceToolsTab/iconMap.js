// iconMap.js
// Icon mapping for tool components - now returns string names for centralized Icon system

export const ICON_MAP = {
  "mouse-pointer": "mousePointer",
  move: "move",
  "rotate-ccw": "rotateCcw",
  "zoom-in": "zoomIn",
  palette: "palette",
  circle: "circle",
  "circle-dot": "circleDot",
  sliders: "sliders",
  scissors: "scissors",
  "grid-3x3": "grid3x3",
  ruler: "ruler",
  compass: "compass",
  crosshair: "crosshair",
  "map-pin": "mapPin",
  square: "square",
  "message-square": "messageSquare",
  eye: "eye",
  "eye-off": "eyeOff",
  settings: "settings",
  save: "save",
  monitor: "monitor",
  users: "users",
  "pen-tool": "penTool",
  box: "box",
  plus: "add",
  "flip-horizontal": "flipHorizontal",
  copy: "copy",
  "trash-2": "delete",
  "wand-2": "wand",
  camera: "camera",
  triangle: "triangle",
  x: "close",
  "maximize-2": "maximize",
  "bar-chart-3": "barChart",
  activity: "activity",
  network: "network",
  transform: "box",
  wrench: "wrench",
  layers: "layers",
  minus: "remove",
};

export function getIcon(iconName) {
  if (!iconName) return "box";
  return ICON_MAP[iconName] || ICON_MAP[iconName.toLowerCase()] || "box";
}
