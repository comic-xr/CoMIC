// src/ui/react/components/workspace/Canvas/index.js
// Canvas component exports

// Canvas components
export { CanvasGrid } from "./CanvasGrid/CanvasGrid.jsx";
export { CanvasCell } from "./CanvasCell/CanvasCell.jsx";

// Canvas chrome components (new architecture)
export { CanvasHeader } from "./CanvasHeader/CanvasHeader.jsx";
export { CanvasHeaderBar } from "./CanvasHeaderBar/CanvasHeaderBar.jsx";
export { CanvasChrome } from "./CanvasChrome/CanvasChrome.jsx";
export { CanvasChromeHeader } from "./CanvasChrome/CanvasChromeHeader.jsx";
export { CanvasChromeEditBar } from "./CanvasChrome/CanvasChromeEditBar.jsx";
export { Footer1InstanceTools } from "./CanvasChrome/Footer1InstanceTools.jsx";
// CanvasToolbar now integrates canvas controls + status info
export { CanvasToolbar } from "./CanvasToolbar/CanvasToolbar.jsx";
// CanvasInfoFooter - compact info bar (canvas size, viewport, cell size, sync status)
export { CanvasInfoFooter } from "./CanvasInfoFooter/CanvasInfoFooter.jsx";
// CanvasStatusBar kept for standalone use if needed (legacy)
export { CanvasStatusBar } from "./CanvasStatusBar/CanvasStatusBar.jsx";
export { SubsetCard } from "./SubsetCard/SubsetCard.jsx";
export { EdgeTrigger, FloatingPanel } from "./EdgePanels";
export { LinksDropdown, LINK_TYPES, LINK_DIRECTIONS } from "./LinksDropdown/LinksDropdown.jsx";

// Floating canvas (dock/float/fullscreen modes)
export {
  FloatingCanvasWrapper,
  CanvasControlsBar,
  CANVAS_MODES,
  ASPECT_RATIOS,
} from "./FloatingCanvas";

// Full canvas workspace integration
export { CanvasWorkspace } from "./CanvasWorkspace/CanvasWorkspace.jsx";
export {
  IsolationOverlay,
  useIsolationMode,
} from "./IsolationOverlay/IsolationOverlay.jsx";
