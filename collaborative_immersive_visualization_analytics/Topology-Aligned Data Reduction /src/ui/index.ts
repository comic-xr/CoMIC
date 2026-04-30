/**
 * UI Module
 *
 * Responsible for:
 * - React UI components
 * - UI layout and styling
 * - Form components and validation UI
 * - Data visualization (charts, tables)
 * - Modal dialogs and notifications
 * - Tooltips and help text
 * - UI state management (local to components)
 *
 * Component Organization:
 * - Panels: Information display panels
 * - Controls: User interaction controls
 * - Widgets: Reusable UI widgets
 * - Hooks: Custom React hooks for UI logic
 *
 * API Contract:
 * - React components accepting props
 * - No direct file imports (use state/ for data)
 * - Controlled components (props-driven)
 * - Event callbacks for user actions
 *
 * CONSTRAINTS:
 * - UI components are dumb (presentation only)
 * - Business logic stays in state/
 * - No direct DOM manipulation
 * - Props-based configuration
 *
 * DO NOT:
 * - Contain business logic (belongs in state/)
 * - Handle WebGL rendering (belongs in renderer/)
 * - Process low-level input (belongs in interaction/)
 * - Load data directly (belongs in data/)
 */

// Export public API
export type { ComponentProps } from './types';
export { store } from './state';
export type { AppState, LodLevel, ReductionState, ScalarState, VolumeStats } from './state';
