// src/ui/react/hooks/useWebSocketEvents.js
// Hook for subscribing to WebSocket events via window event listeners
//
// Extracts the common pattern of:
// - Adding multiple event listeners on mount
// - Removing them on unmount
// - Handling events consistently
//
// Used with serverSync.js which dispatches custom events like:
// - ws:filter:created, ws:filter:updated, ws:filter:deleted
// - ws:bookmark:created, ws:bookmark:updated, ws:bookmark:deleted
// - ws:annotation:created, etc.
//
// Usage:
//   useWebSocketEvents({
//     'ws:filter:created': handleFilterCreated,
//     'ws:filter:updated': handleFilterUpdated,
//     'ws:filter:deleted': handleFilterDeleted,
//   });

import { useEffect, useRef, useCallback } from "react";
import { api as log } from "@Utils/logger.js";

/**
 * useWebSocketEvents - Subscribe to multiple WebSocket events
 *
 * Automatically cleans up listeners on unmount or when handlers change.
 *
 * @param {Object.<string, function(CustomEvent): void>} eventHandlers - Map of event names to handlers
 * @param {Object} [options={}] - Configuration options
 * @param {boolean} [options.enabled=true] - Whether to attach listeners
 * @param {boolean} [options.logEvents=false] - Log received events (debug)
 *
 * @example
 * // Basic usage
 * useWebSocketEvents({
 *   'ws:dataset:added': (e) => addDataset(e.detail),
 *   'ws:dataset:removed': (e) => removeDataset(e.detail.id),
 * });
 *
 * @example
 * // With refetch pattern
 * const { refetch } = useAsyncData(fetchFilters, [projectId]);
 *
 * useWebSocketEvents({
 *   'ws:filter:created': refetch,
 *   'ws:filter:updated': refetch,
 *   'ws:filter:deleted': refetch,
 * });
 *
 * @example
 * // Conditional subscription
 * useWebSocketEvents(
 *   { 'ws:presence:updated': handlePresence },
 *   { enabled: isConnected }
 * );
 */
export function useWebSocketEvents(eventHandlers, options = {}) {
  const { enabled = true, logEvents = false } = options;

  // Store handlers in ref to avoid re-subscribing on every render
  const handlersRef = useRef(eventHandlers);
  handlersRef.current = eventHandlers;

  useEffect(() => {
    if (!enabled) return;

    const entries = Object.entries(handlersRef.current);

    if (entries.length === 0) return;

    // Create wrapped handlers that use current ref value
    const wrappedHandlers = entries.map(([eventName, handler]) => {
      const wrappedHandler = (event) => {
        if (logEvents) {
          log.debug(`WebSocket event: ${eventName}`, event.detail);
        }

        try {
          // Get current handler from ref (allows handler updates without resubscribing)
          const currentHandler = handlersRef.current[eventName];
          if (currentHandler) {
            currentHandler(event);
          }
        } catch (error) {
          log.error(`Error in WebSocket event handler (${eventName}):`, error);
        }
      };

      return [eventName, wrappedHandler];
    });

    // Subscribe to all events
    wrappedHandlers.forEach(([eventName, handler]) => {
      window.addEventListener(eventName, handler);
    });

    log.debug(
      `Subscribed to ${entries.length} WebSocket events:`,
      entries.map(([name]) => name)
    );

    // Cleanup
    return () => {
      wrappedHandlers.forEach(([eventName, handler]) => {
        window.removeEventListener(eventName, handler);
      });

      log.debug(`Unsubscribed from ${entries.length} WebSocket events`);
    };
  }, [enabled, logEvents]);
}

/**
 * useWebSocketEvent - Subscribe to a single WebSocket event
 *
 * Simpler version when you only need one event.
 *
 * @param {string} eventName - The event name to subscribe to
 * @param {function(CustomEvent): void} handler - Event handler
 * @param {Object} [options={}] - Configuration options
 *
 * @example
 * useWebSocketEvent('ws:compute:progress', (e) => {
 *   setProgress(e.detail.progress);
 * });
 */
export function useWebSocketEvent(eventName, handler, options = {}) {
  const { enabled = true } = options;

  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled || !eventName) return;

    const wrappedHandler = (event) => {
      try {
        handlerRef.current?.(event);
      } catch (error) {
        log.error(`Error in WebSocket event handler (${eventName}):`, error);
      }
    };

    window.addEventListener(eventName, wrappedHandler);

    return () => {
      window.removeEventListener(eventName, wrappedHandler);
    };
  }, [eventName, enabled]);
}

/**
 * useServerSyncEvents - Convenience hook for common serverSync patterns
 *
 * Pre-configured for the standard CRUD event pattern used throughout the app.
 *
 * @param {string} resourceType - Resource type (e.g., 'filter', 'bookmark', 'annotation')
 * @param {Object} handlers - Event handlers
 * @param {function} [handlers.onCreate] - Called when resource is created
 * @param {function} [handlers.onUpdate] - Called when resource is updated
 * @param {function} [handlers.onDelete] - Called when resource is deleted
 * @param {Object} [options={}] - Configuration options
 *
 * @example
 * useServerSyncEvents('filter', {
 *   onCreate: (detail) => setFilters(prev => [...prev, detail]),
 *   onUpdate: (detail) => setFilters(prev =>
 *     prev.map(f => f.id === detail.id ? detail : f)
 *   ),
 *   onDelete: (detail) => setFilters(prev =>
 *     prev.filter(f => f.id !== detail.filterId)
 *   ),
 * });
 */
export function useServerSyncEvents(resourceType, handlers, options = {}) {
  const { onCreate, onUpdate, onDelete } = handlers;

  const eventHandlers = {};

  if (onCreate) {
    eventHandlers[`ws:${resourceType}:created`] = (e) => onCreate(e.detail);
  }
  if (onUpdate) {
    eventHandlers[`ws:${resourceType}:updated`] = (e) => onUpdate(e.detail);
  }
  if (onDelete) {
    eventHandlers[`ws:${resourceType}:deleted`] = (e) => onDelete(e.detail);
  }

  useWebSocketEvents(eventHandlers, options);
}

/**
 * Dispatch a mock WebSocket event (useful for testing)
 *
 * @param {string} eventName - Event name
 * @param {Object} detail - Event detail payload
 *
 * @example
 * // In tests or Storybook
 * dispatchMockWSEvent('ws:filter:created', { id: '123', name: 'Test' });
 */
export function dispatchMockWSEvent(eventName, detail) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export default useWebSocketEvents;
