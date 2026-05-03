/**
 * @file toastStore.js
 * @description Zustand store for managing toast notifications in CIA Web.
 * Provides a centralized state management system for toast notifications
 * with support for different types, actions, and auto-dismiss functionality.
 *
 * Features:
 * - Four toast types: info, success, warning, error
 * - Configurable duration with auto-dismiss
 * - Action button support with callbacks
 * - Maximum 5 visible toasts (oldest auto-dismissed)
 * - Unique ID generation for each toast
 * - Update existing toasts by ID
 *
 * @example
 * // Using convenience functions
 * import { toast } from '@UI/react/store/toastStore';
 *
 * toast.success('File uploaded successfully');
 * toast.error('Failed to save changes');
 *
 * // With action button
 * toast.info('View moved to trash', {
 *   actionLabel: 'Undo',
 *   onAction: () => restoreView(viewId),
 *   duration: 5000
 * });
 *
 * @example
 * // Using the store directly
 * import { useToastStore } from '@UI/react/store/toastStore';
 *
 * const { addToast, removeToast, clearAll } = useToastStore();
 * const toastId = addToast({ type: 'success', message: 'Saved!' });
 */

import { create } from "zustand";

/**
 * Counter for generating unique toast IDs.
 * @type {number}
 */
let toastIdCounter = 0;

/**
 * Maximum number of toasts that can be visible at once.
 * When exceeded, the oldest toast is auto-dismissed.
 * @type {number}
 */
const MAX_VISIBLE_TOASTS = 5;

/**
 * Default duration for auto-dismiss in milliseconds.
 * @type {number}
 */
const DEFAULT_DURATION = 4000;

/**
 * @typedef {Object} ToastOptions
 * @property {'info'|'success'|'warning'|'error'|'sync'} [type='info'] - Toast type
 * @property {string} message - Toast message
 * @property {string} [description] - Optional secondary description
 * @property {number} [duration=4000] - Auto-dismiss duration in ms (0 for persistent)
 * @property {string} [actionLabel] - Optional action button text
 * @property {() => void} [onAction] - Optional action callback
 * @property {boolean} [dismissible=true] - Show dismiss button
 * @property {string} [id] - Custom ID (auto-generated if not provided)
 * @property {string} [viewColor] - Optional view color indicator (for link toasts)
 * @property {string} [viewName] - Optional view name (for link toasts)
 * @property {string} [userName] - Optional user name (for link toasts)
 */

/**
 * @typedef {Object} Toast
 * @property {string} id - Unique toast identifier
 * @property {'info'|'success'|'warning'|'error'|'sync'} type - Toast type
 * @property {string} message - Toast message
 * @property {string} [description] - Optional secondary description
 * @property {number} duration - Auto-dismiss duration
 * @property {string} [actionLabel] - Action button text
 * @property {() => void} [onAction] - Action callback
 * @property {boolean} dismissible - Whether toast can be dismissed
 * @property {string} [viewColor] - Optional view color indicator (for link toasts)
 * @property {string} [viewName] - Optional view name (for link toasts)
 * @property {string} [userName] - Optional user name (for link toasts)
 * @property {number} createdAt - Timestamp when toast was created
 */

/**
 * @typedef {Object} ToastStore
 * @property {Toast[]} toasts - Array of active toasts
 * @property {(options: ToastOptions) => string} addToast - Add a new toast
 * @property {(id: string) => void} removeToast - Remove a toast by ID
 * @property {() => void} clearAll - Remove all toasts
 * @property {(id: string, updates: Partial<ToastOptions>) => void} updateToast - Update an existing toast
 */

/**
 * Map to store timeout IDs for auto-dismiss timers.
 * Allows cancellation when toast is manually dismissed.
 * @type {Map<string, number>}
 */
const dismissTimers = new Map();

/**
 * Zustand store for toast notifications.
 * @type {import('zustand').UseBoundStore<import('zustand').StoreApi<ToastStore>>}
 */
export const useToastStore = create((set, get) => ({
  /**
   * Array of active toast notifications.
   * @type {Toast[]}
   */
  toasts: [],

  /**
   * Adds a new toast notification.
   *
   * @param {ToastOptions} options - Toast configuration options
   * @returns {string} The ID of the created toast
   */
  addToast: ({
    type = "info",
    message,
    description,
    duration = DEFAULT_DURATION,
    actionLabel,
    onAction,
    dismissible = true,
    id: customId,
    viewColor,
    viewName,
    userName,
  }) => {
    // Generate unique ID if not provided
    const id = customId || `toast-${++toastIdCounter}-${Date.now()}`;

    // Create toast object
    const toast = {
      id,
      type,
      message,
      description,
      duration,
      actionLabel,
      onAction,
      dismissible,
      viewColor,
      viewName,
      userName,
      createdAt: Date.now(),
    };

    set((state) => {
      let newToasts = [...state.toasts, toast];

      // Enforce maximum visible toasts
      if (newToasts.length > MAX_VISIBLE_TOASTS) {
        // Get oldest toasts to remove
        const toastsToRemove = newToasts.slice(
          0,
          newToasts.length - MAX_VISIBLE_TOASTS
        );

        // Clear their timers
        toastsToRemove.forEach((t) => {
          if (dismissTimers.has(t.id)) {
            clearTimeout(dismissTimers.get(t.id));
            dismissTimers.delete(t.id);
          }
        });

        // Keep only the newest MAX_VISIBLE_TOASTS
        newToasts = newToasts.slice(-MAX_VISIBLE_TOASTS);
      }

      return { toasts: newToasts };
    });

    // Set up auto-dismiss timer (unless duration is 0 for persistent)
    if (duration > 0) {
      const timerId = setTimeout(() => {
        get().removeToast(id);
      }, duration);
      dismissTimers.set(id, timerId);
    }

    return id;
  },

  /**
   * Removes a toast by its ID.
   * Also clears any associated auto-dismiss timer.
   *
   * @param {string} id - The ID of the toast to remove
   */
  removeToast: (id) => {
    // Clear the auto-dismiss timer if it exists
    if (dismissTimers.has(id)) {
      clearTimeout(dismissTimers.get(id));
      dismissTimers.delete(id);
    }

    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  /**
   * Clears all active toasts.
   * Also clears all auto-dismiss timers.
   */
  clearAll: () => {
    // Clear all timers
    dismissTimers.forEach((timerId) => clearTimeout(timerId));
    dismissTimers.clear();

    set({ toasts: [] });
  },

  /**
   * Updates an existing toast by its ID.
   * Useful for updating progress or changing message after creation.
   *
   * @param {string} id - The ID of the toast to update
   * @param {Partial<ToastOptions>} updates - The properties to update
   */
  updateToast: (id, updates) => {
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));

    // If duration is updated and > 0, reset the timer
    if (updates.duration !== undefined && updates.duration > 0) {
      // Clear existing timer
      if (dismissTimers.has(id)) {
        clearTimeout(dismissTimers.get(id));
      }

      // Set new timer
      const timerId = setTimeout(() => {
        useToastStore.getState().removeToast(id);
      }, updates.duration);
      dismissTimers.set(id, timerId);
    }
  },
}));

/**
 * Convenience functions for showing toasts.
 * Can be imported directly without using the hook.
 *
 * @example
 * import { toast } from '@UI/react/store/toastStore';
 *
 * toast.success('Operation completed!');
 * toast.error('Something went wrong', { duration: 0 }); // Persistent
 * toast.info('New message', {
 *   actionLabel: 'View',
 *   onAction: () => openMessages()
 * });
 */
export const toast = {
  /**
   * Shows an info toast.
   * @param {string} message - Toast message
   * @param {Omit<ToastOptions, 'type' | 'message'>} [options] - Additional options
   * @returns {string} Toast ID
   */
  info: (message, options = {}) =>
    useToastStore.getState().addToast({ type: "info", message, ...options }),

  /**
   * Shows a success toast.
   * @param {string} message - Toast message
   * @param {Omit<ToastOptions, 'type' | 'message'>} [options] - Additional options
   * @returns {string} Toast ID
   */
  success: (message, options = {}) =>
    useToastStore.getState().addToast({ type: "success", message, ...options }),

  /**
   * Shows a warning toast.
   * @param {string} message - Toast message
   * @param {Omit<ToastOptions, 'type' | 'message'>} [options] - Additional options
   * @returns {string} Toast ID
   */
  warning: (message, options = {}) =>
    useToastStore.getState().addToast({ type: "warning", message, ...options }),

  /**
   * Shows an error toast.
   * @param {string} message - Toast message
   * @param {Omit<ToastOptions, 'type' | 'message'>} [options] - Additional options
   * @returns {string} Toast ID
   */
  error: (message, options = {}) =>
    useToastStore.getState().addToast({ type: "error", message, ...options }),

  /**
   * Shows a sync toast (for link events).
   * @param {string} message - Toast message
   * @param {Omit<ToastOptions, 'type' | 'message'>} [options] - Additional options
   * @returns {string} Toast ID
   */
  sync: (message, options = {}) =>
    useToastStore.getState().addToast({ type: "sync", message, duration: 3000, ...options }),

  /**
   * Removes a toast by ID.
   * @param {string} id - Toast ID to remove
   */
  dismiss: (id) => useToastStore.getState().removeToast(id),

  /**
   * Clears all toasts.
   */
  dismissAll: () => useToastStore.getState().clearAll(),

  /**
   * Updates an existing toast.
   * @param {string} id - Toast ID to update
   * @param {Partial<ToastOptions>} updates - Properties to update
   */
  update: (id, updates) => useToastStore.getState().updateToast(id, updates),
};
