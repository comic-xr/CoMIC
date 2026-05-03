// tabs/LayoutTab/index.jsx
// Re-export the main component - V2 is now the standard
export { LayoutTabV2 as default, LayoutTabV2, LayoutTabV2 as LayoutPanelContent } from './LayoutTabV2';

// Legacy export (deprecated, use LayoutTabV2 instead)
export { LayoutPanelContent as LayoutTabLegacy } from './LayoutTab';

// Re-export constants and hooks
export * from './constants';
export { useLayoutTab } from './hooks';