// src/ui/react/hooks/useManagerSubscription.js
// =============================================================================
// MANAGER SUBSCRIPTION HOOK
// =============================================================================
//
// React hook wrapper around the existing subscribeToManagerEvents helper.
// Automatically handles subscription cleanup on unmount.
//
// WHY THIS EXISTS:
// - The subscribeToManagerEvents helper in eventConstants.js was UNUSED
// - Multiple hooks (useDatasets, useCanvas, useInstances) duplicate subscription logic
// - This hook provides a clean React interface for manager event subscriptions
//
// USAGE:
// useManagerSubscription(datasetManager, ['datasetAdded', 'datasetUpdated'], handleUpdate);
//
// REPLACES THIS PATTERN:
// useEffect(() => {
//     manager.on('event1', handler);
//     manager.on('event2', handler);
//     return () => {
//         manager.off('event1', handler);
//         manager.off('event2', handler);
//     };
// }, []);
//
// =============================================================================

import { useEffect, useRef, useCallback } from 'react';
import { subscribeToManagerEvents } from '@Core/events/eventConstants';

/**
 * Subscribe to multiple events on a manager with automatic cleanup
 *
 * @param {Object} manager - Manager with on/off methods (ViewConfigurationManager, DatasetManager, etc.)
 * @param {string[]} events - Array of event names to subscribe to
 * @param {Function} handler - Handler function called for all events
 * @param {any[]} [deps=[]] - Additional dependencies that should trigger resubscription
 *
 * @example
 * // Subscribe to dataset events
 * useManagerSubscription(
 *     datasetManager,
 *     ['datasetAdded', 'datasetUpdated', 'datasetRemoved', 'datasetLoaded'],
 *     handleDatasetChange
 * );
 *
 * @example
 * // Subscribe with dependencies
 * useManagerSubscription(
 *     viewManager,
 *     ['viewAdded', 'viewUpdated'],
 *     () => setViews(viewManager.getViews()),
 *     [filterStatus]  // Resubscribe when filter changes
 * );
 */
export function useManagerSubscription(manager, events, handler, deps = []) {
    // Keep handler ref stable to avoid resubscription on every render
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    // Stable callback that always calls latest handler
    const stableHandler = useCallback((...args) => {
        handlerRef.current(...args);
    }, []);

    useEffect(() => {
        if (!manager) return;

        // Use the existing helper from eventConstants
        const cleanup = subscribeToManagerEvents(manager, events, stableHandler);

        return cleanup;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [manager, stableHandler, ...deps]);
}

/**
 * Subscribe to a single event on a manager
 * Convenience wrapper for single-event subscriptions
 *
 * @param {Object} manager - Manager with on/off methods
 * @param {string} event - Event name to subscribe to
 * @param {Function} handler - Handler function
 * @param {any[]} [deps=[]] - Additional dependencies
 */
export function useManagerEvent(manager, event, handler, deps = []) {
    useManagerSubscription(manager, [event], handler, deps);
}

/**
 * Subscribe to manager events and trigger an immediate update
 * Useful for initializing state from manager on mount
 *
 * @param {Object} manager - Manager with on/off methods
 * @param {string[]} events - Array of event names
 * @param {Function} handler - Handler function (called immediately and on events)
 * @param {any[]} [deps=[]] - Additional dependencies
 */
export function useManagerSubscriptionWithInit(manager, events, handler, deps = []) {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    const stableHandler = useCallback((...args) => {
        handlerRef.current(...args);
    }, []);

    useEffect(() => {
        if (!manager) return;

        // Call handler immediately to initialize state
        stableHandler();

        // Then subscribe to future events
        const cleanup = subscribeToManagerEvents(manager, events, stableHandler);

        return cleanup;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [manager, stableHandler, ...deps]);
}

export default useManagerSubscription;
