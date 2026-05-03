// src/ui/react/components/panels/FloatingPanel/index.js
// Floating Panel exports
//
// UPDATED: Now includes ScratchPad floating panel exports

// Core floating panel components
export { FloatingPanel, FloatingPanelPortal } from "./FloatingPanel.jsx";
export { PriorityPanel } from "./PriorityPanel.jsx";
export { PopOutButton } from "./PopOutButton.jsx";
export { AllFloatingPanels } from "./AllFloatingPanels.jsx";
export { CreateWorkspacePanel } from "./CreateWorkspacePanel.jsx";

// Context and hooks
export {
  FloatingPanelProvider,
  useFloatingPanels,
  usePanelPopOut,
  FLOATING_PANEL_DEFAULTS,
  VR_PANEL_POSITIONS,
} from "./FloatingPanelContext.jsx";

// ScratchPad floating panel
export {
  ScratchPadFloating,
  useScratchPadFloating,
  SCRATCHPAD_PANEL_ID,
  SCRATCHPAD_CONFIG,
} from "./ScratchPadFloating.jsx";

// Instance Tools floating panel
export {
  InstanceToolsFloating,
  useInstanceToolsFloating,
  INSTANCE_TOOLS_PANEL_ID,
  INSTANCE_TOOLS_CONFIG,
} from "./InstanceToolsFloating.jsx";

// Annotation Creator floating panel
export { FloatingAnnotationCreator } from "./FloatingAnnotationCreator";

// Link Manager floating panels (View Linking System)
export {
  AllLinkManagerFloating,
  ViewLinkManagerFloating,
  UserFollowingFloating,
  WorkspaceLinksHubFloating,
  useViewLinkManagerFloating,
  useUserFollowingFloating,
  useWorkspaceLinksHubFloating,
  VIEW_LINK_MANAGER_PANEL_ID,
  USER_FOLLOWING_PANEL_ID,
  WORKSPACE_LINKS_HUB_PANEL_ID,
  LINK_PANEL_CONFIGS,
} from "./LinkManagerFloating.jsx";

// VR Session floating panel
export {
  VRSessionFloating,
  useVRSessionFloating,
  VR_SESSION_PANEL_ID,
  VR_SESSION_CONFIG,
} from "./VRSessionFloating.jsx";
