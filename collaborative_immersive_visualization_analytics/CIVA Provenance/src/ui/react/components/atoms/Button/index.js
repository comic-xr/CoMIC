/**
 * @file index.js
 * @description Public exports for the Button component system.
 *
 * This module provides comprehensive button components for CIA Web:
 * - Button: Standard button with variants, sizes, icons, and loading states
 * - IconButton: Square icon-only button for toolbars
 * - ButtonGroup: Container for grouping buttons with layout options
 *
 * @example
 * // Import components
 * import { Button, IconButton, ButtonGroup } from '@UI/react/components/atoms/Button';
 * import { Icon } from '@UI/react/components/atoms/Icon';
 *
 * // Primary button with icon
 * <Button variant="primary" icon="save" onClick={handleSave}>
 *   Save Changes
 * </Button>
 *
 * // Loading button
 * <Button variant="primary" loading>
 *   Saving...
 * </Button>
 *
 * // Danger button
 * <Button variant="danger" icon="delete">
 *   Delete
 * </Button>
 *
 * // Icon button with tooltip
 * <IconButton
 *   icon="settings"
 *   label="Settings"
 *   tooltip="Open settings"
 *   onClick={openSettings}
 * />
 *
 * // Button group
 * <ButtonGroup align="end" gap="sm">
 *   <Button variant="secondary">Cancel</Button>
 *   <Button variant="primary">Confirm</Button>
 * </ButtonGroup>
 *
 * @example
 * // Connected buttons (segmented control)
 * <ButtonGroup connected>
 *   <Button variant="secondary">Day</Button>
 *   <Button variant="secondary">Week</Button>
 *   <Button variant="secondary">Month</Button>
 * </ButtonGroup>
 *
 * @example
 * // Full width button
 * <Button variant="primary" fullWidth>
 *   Sign In
 * </Button>
 */

// Main components
export { Button } from "./Button";
export { default } from "./Button";
export { IconButton } from "./IconButton";
export { ButtonGroup } from "./ButtonGroup";
