/**
 * CanvasMapPanel V2 - Public API
 *
 * Floating panel for unified canvas navigation and editing control.
 * Uses PanelShell architecture (floating-first).
 *
 * V2 Features:
 * - Side QuickNavToolbar for quick actions
 * - Companion panel for Views & Datasets
 * - Pannable minimap for large canvases
 * - Real-time cursor tracking for collaborators
 *
 * Usage:
 * 1. Render CanvasMapPanel inside PanelShellProvider
 * 2. Toggle with keyboard shortcut 'm' or dispatch 'cia:toggle-canvas-map' event
 * 3. Programmatically control via usePanelShell().togglePanel('canvas-map')
 */

// Main components
export { CanvasMapPanel, default, CANVAS_MAP_PANEL_ID } from './CanvasMapPanel';
export { CanvasMapContent } from './CanvasMapContent';

// Hooks
export { useCanvasMapState } from './hooks/useCanvasMapState';
export { useMinimapPanning } from './hooks/useMinimapPanning';
export { useMinimapCellSize } from './hooks/useMinimapCellSize';

// Constants and utilities
export {
  MAP_MODES,
  MODE_CONFIG,
  DISPLAY_MODES,
  LINKS_SUB_TABS,
  COLLABORATE_SUB_TABS,
  LAYOUTS,
  VIEW_TYPES,
  SIZE_MODE_BREAKPOINTS,
  MINIMAP_CONSTANTS,
  QUICK_NAV_ACTIONS,
} from './utils/constants';

export {
  colToLetter,
  formatCellRef,
  formatRangeRef,
  getVGDisplayName,
  getGridPosition,
  getGridCenter,
  getGridDimensions,
  pixelToGrid,
  clamp,
} from './utils/gridUtils';

// Components (for custom implementations)
export {
  ModeTabs,
  MapToolbar,
  Minimap,
  QuickNavToolbar,
  CompanionPanel,
  NavigatePanel,
  LayoutPanel,
  LinksPanel,
  TeamPanel,
} from './components';
