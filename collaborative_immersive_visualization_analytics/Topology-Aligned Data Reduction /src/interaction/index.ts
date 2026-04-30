/**
 * Interaction Module
 *
 * Responsible for:
 * - User input handling (mouse, keyboard, touch)
 * - Gesture recognition
 * - Event delegation and routing
 * - Input state management
 * - Raycasting and intersection detection
 * - Click/drag/pinch event synthesis
 *
 * API Contract:
 * - InputManager: Register and dispatch input events
 * - GestureRecognizer: Recognize user gestures
 * - RaycastManager: Handle raycasting and hit detection
 * - EventBus: Centralized event routing
 *
 * CONSTRAINTS:
 * - Pure event handling, no state mutations
 * - Decouple input from business logic
 * - All input events normalized to consistent format
 *
 * DO NOT:
 * - Mutate application state directly (dispatch to state/)
 * - Handle rendering (belongs in renderer/)
 * - Execute domain logic (dispatch as events)
 * - Load data (belongs in data/)
 */

// Export public API
export type { InputEvent, GestureType } from './types';
export { InputManager, GestureRecognizer } from './input-manager';
export { InteractionController } from './controller';
export type { InteractionControllerConfig } from './controller';
export type { ROIBounds, ROIShape } from './roi';
export { getDefaultROIBounds, clampROIBounds } from './roi';
