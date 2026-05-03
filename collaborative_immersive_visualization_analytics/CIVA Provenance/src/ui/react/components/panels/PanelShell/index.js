/**
 * PanelShell - Public API
 *
 * Main component for all floating panels in CIA Web.
 */

// Main component
export { PanelShell, default } from './PanelShell';

// Headless logic hook (for custom implementations)
export { usePanelShellLogic } from './PanelShell.logic';

// Context and Provider
export {
  PanelShellProvider,
  usePanelShell,
} from './PanelShellContext';

// Constants
export {
  CHROME_LEVELS,
  SIZE_MODES,
  VR_POSITION_MODES,
  DEFAULT_BREAKPOINTS,
  DEFAULT_DIMENSIONS,
} from './constants';

// Sub-components (for advanced use cases)
export { PanelHeader } from './components/PanelHeader';
export { PanelDragHandle } from './components/PanelDragHandle';
export { PanelResizeHandle } from './components/PanelResizeHandle';

// Hooks (for custom implementations)
export { usePanelDrag } from './hooks/usePanelDrag';
export { usePanelResize } from './hooks/usePanelResize';
export { usePanelPosition } from './hooks/usePanelPosition';
