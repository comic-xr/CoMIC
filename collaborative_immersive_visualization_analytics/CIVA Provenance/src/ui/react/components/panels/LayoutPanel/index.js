// src/ui/react/components/panels/LayoutPanel/index.js
// Layout Panel exports
//
// IMPORTANT NOTES:
// 1. DOCK_POSITIONS should ONLY be imported from LayoutPanelContext
// 2. FloatingCanvasNavigator is a SEPARATE component from LayoutPanel
// 3. Both LayoutPanel and FloatingCanvasNavigator consume the same context

// =============================================================================
// MAIN COMPONENTS
// =============================================================================

import { LayoutPanel } from "./LayoutPanel";

export { LayoutPanel };
export {
  FloatingCanvasNavigator,
  useNavigatorButton,
} from "./FloatingCanvasNavigator";
export default LayoutPanel;

// =============================================================================
// CONTEXT & HOOKS
// =============================================================================

// DOCK_POSITIONS - ALWAYS import from LayoutPanelContext to avoid comparison bugs
export {
  LayoutPanelProvider,
  useLayoutPanelContext,
  useLayoutPanelLogic,
  useNavigatorDocked,
  DOCK_POSITIONS, // Single source of truth!
} from "./LayoutPanelContext";

// =============================================================================
// LOGIC HOOKS
// =============================================================================

export {
  useLayoutPanel,
  LAYOUT_MODES,
  FLOW_DIRECTIONS,
  TOOLS,
  DROP_MODES,
  VIEW_MODES,
  SPAWN_SIZES,
  parseSpawnSize,
} from "./LayoutPanel.logic";

// =============================================================================
// CANVAS NAVIGATOR EXPORTS
// =============================================================================

// Export CanvasNavigator component
export { CanvasNavigator } from "./components/CanvasNavigator/CanvasNavigator";

// Export constants from logic file (single source of truth)
export {
  DISPLAY_MODES,
  NAV_MODES,
  CONTEXT_MODES,
  INSTANCE_COLORS,
} from "./components/CanvasNavigator/CanvasNavigator.logic";

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

export { SpawnSizePicker } from "./components/SpawnSizePicker";

// =============================================================================
// SUBTABS
// =============================================================================

export { CanvasSubtab } from "./subtabs/CanvasSubtab";
export { ViewsSubtab } from "./subtabs/ViewsSubtab";
