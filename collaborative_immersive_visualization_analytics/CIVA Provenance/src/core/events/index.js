// src/core/events/index.js
// =============================================================================
// CIA Web Event System
// =============================================================================
//
// This module exports all event-related utilities:
// - EventBus: Central event bus for cross-component communication
// - BUS_EVENTS: Typed event names for EventBus
// - Event constants for managers (VIEW_EVENTS, CANVAS_MANAGER_EVENTS, etc.)
// - Helper functions for event subscription
//
// USAGE:
// import { eventBus, BUS_EVENTS, VIEW_EVENTS } from '@Core/events';
//
// =============================================================================

// EventBus - central event bus
export { eventBus, BUS_EVENTS, createSubscription } from "./EventBus.js";

// Event constants for managers and DOM events
export {
  VIEW_EVENTS,
  CANVAS_MANAGER_EVENTS,
  DATASET_EVENTS,
  ANNOTATION_EVENTS,
  DOM_EVENTS,
  dispatchCIAEvent,
  subscribeToCIAEvent,
  subscribeToManagerEvents,
  getViewRefreshEvents,
  getViewDOMRefreshEvents,
} from "./eventConstants.js";
