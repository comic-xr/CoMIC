// src/ui/react/components/common/ViewItem/index.js
// Common ViewItem Components - Shared across ViewsTab, DatasetsTab, and LayoutPanel
//
// This module provides the canonical ViewItem components used throughout the application.
// All tabs should import from here to ensure consistent behavior and styling.
//
// Component Hierarchy:
// - ViewItem: Full-featured view item for active/placed views (sliding panel, context menu, etc.)
// - InactiveViewItem: Simplified version for views not on canvas (click to place)
// - TrashedViewItem: Compact version for Recently Deleted section (restore/delete actions)
//
// Supporting Components:
// - SlidingPanel: Hover panel with quick actions
// - ViewItemContextMenu: Right-click context menu

export { ViewItem } from "./ViewItem";
export { InactiveViewItem } from "./InactiveViewItem";
export { TrashedViewItem } from "./TrashedViewItem";
export { SlidingPanel } from "./components/SlidingPanel";
export { ViewItemContextMenu } from "./components/ViewItemContextMenu";
export { ViewExpandedPanel, LINK_MODES } from "./components/ViewExpandedPanel";
export { SizePicker } from "./components/SizePicker";
export { LinkPropertyRow, LINK_PROPERTIES } from "./components/LinkPropertyRow";

// Re-export default as ViewItem for convenience
export { ViewItem as default } from "./ViewItem";

// Status icon configuration - shared across all variants
export const STATUS_ICONS = {
  starredWorkspace: {
    icon: "Folder",
    color: "purple",
    tooltip: "Saved to Workspace",
  },
  starredPersonal: {
    icon: "Globe",
    color: "amber",
    tooltip: "Saved to Personal",
  },
  hasSavedState: { icon: "Save", color: "amber", tooltip: "Has saved state" },
  isShared: { icon: "Users", color: "pink", tooltip: "Shared" },
  isLocked: { icon: "Lock", color: "amber", tooltip: "Locked" },
  hasLinks: { icon: "Link2", color: "teal", tooltip: "Linked properties" },
  hasFilters: { icon: "Filter", color: "purple", tooltip: "Active filters" },
};
