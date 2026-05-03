/**
 * @file NavigatorTab/index.js
 * @description Navigator Tab V5 - Spatial navigation and view organization
 *
 * Features:
 * - Three tabs: Map (minimap), Views (view list), Bookmarks
 * - Focus modes: Groups vs Views
 * - D-pad navigation with home position
 * - Viewport/Canvas size controls
 * - Collaborator presence on minimap
 *
 * Architectural Principle:
 * Navigator handles spatial navigation ONLY.
 * Type-specific controls (slice, camera, opacity) are in Instance Tools.
 */

export { NavigatorTab, NavigatorTab as default } from './NavigatorTab.jsx';
export { useNavigatorTab } from './NavigatorTab.logic.js';
