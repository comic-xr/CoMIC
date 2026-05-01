/**
 * @file canvasHistoryStore.js
 * @description Zustand store for canvas operation history with undo/redo support.
 * Tracks canvas operations (move, swap, add, delete, resize) and allows reverting.
 *
 * @example
 * import { useCanvasHistory, canvasHistory } from '@UI/react/store/canvasHistoryStore';
 *
 * // Record an operation
 * canvasHistory.record({
 *   type: 'MOVE',
 *   description: 'Move view to B2',
 *   undo: () => movePlacement(id, oldRow, oldCol),
 *   redo: () => movePlacement(id, newRow, newCol),
 * });
 *
 * // Undo/Redo
 * canvasHistory.undo();
 * canvasHistory.redo();
 *
 * // In components
 * const { canUndo, canRedo, undo, redo } = useCanvasHistory();
 */

import { create } from "zustand";
import { toast } from "@UI/react/store/toastStore";

/**
 * Maximum number of operations to keep in history
 */
const MAX_HISTORY_SIZE = 50;

/**
 * Operation type definitions with icons and colors
 */
export const OPERATION_TYPES = {
  MOVE: { icon: 'move', color: 'green', label: 'Move' },
  SWAP: { icon: 'swapHoriz', color: 'amber', label: 'Swap' },
  ADD: { icon: 'add', color: 'blue', label: 'Add' },
  DELETE: { icon: 'trash', color: 'red', label: 'Delete' },
  RESIZE: { icon: 'aspectRatio', color: 'purple', label: 'Resize' },
  MERGE: { icon: 'merge', color: 'purple', label: 'Merge' },
  UNMERGE: { icon: 'layers', color: 'amber', label: 'Unmerge' },
  CANVAS_RESIZE: { icon: 'grid3x3', color: 'blue', label: 'Canvas Resize' },
  BATCH: { icon: 'layers', color: 'teal', label: 'Batch' },
};

/**
 * @typedef {Object} HistoryEntry
 * @property {string} id - Unique entry identifier
 * @property {string} type - Operation type (from OPERATION_TYPES)
 * @property {string} description - Human-readable description
 * @property {Function} undo - Function to undo this operation
 * @property {Function} redo - Function to redo this operation
 * @property {number} timestamp - When the operation occurred
 */

/**
 * @typedef {Object} CanvasHistoryStore
 * @property {HistoryEntry[]} past - Stack of undoable operations
 * @property {HistoryEntry[]} future - Stack of redoable operations
 * @property {boolean} isUndoing - Whether an undo is in progress
 * @property {boolean} isRedoing - Whether a redo is in progress
 * @property {(entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void} record - Record a new operation
 * @property {() => Promise<void>} undo - Undo the last operation
 * @property {() => Promise<void>} redo - Redo the last undone operation
 * @property {() => void} clear - Clear all history
 * @property {boolean} canUndo - Whether undo is available
 * @property {boolean} canRedo - Whether redo is available
 */

let entryIdCounter = 0;

/**
 * Zustand store for canvas operation history
 */
export const useCanvasHistory = create((set, get) => ({
  // History stacks
  past: [],
  future: [],

  // Operation flags to prevent recording during undo/redo
  isUndoing: false,
  isRedoing: false,

  /**
   * Record a new operation in history.
   * Clears the redo stack since we're on a new branch.
   */
  record: ({ type, description, undo, redo }) => {
    const state = get();

    // Don't record if we're in the middle of undo/redo
    if (state.isUndoing || state.isRedoing) {
      return;
    }

    const entry = {
      id: `op-${++entryIdCounter}-${Date.now()}`,
      type,
      description,
      undo,
      redo,
      timestamp: Date.now(),
    };

    set((state) => {
      let newPast = [...state.past, entry];

      // Limit history size
      if (newPast.length > MAX_HISTORY_SIZE) {
        newPast = newPast.slice(-MAX_HISTORY_SIZE);
      }

      return {
        past: newPast,
        future: [], // Clear redo stack on new operation
      };
    });
  },

  /**
   * Undo the last operation
   */
  undo: async () => {
    const state = get();
    if (state.past.length === 0 || state.isUndoing || state.isRedoing) {
      return;
    }

    const entry = state.past[state.past.length - 1];

    set({ isUndoing: true });

    try {
      // Execute the undo function
      await entry.undo();

      set((state) => ({
        past: state.past.slice(0, -1),
        future: [entry, ...state.future],
        isUndoing: false,
      }));

      // Show toast
      toast.info(`Undo: ${entry.description}`, {
        actionLabel: 'Redo',
        onAction: () => get().redo(),
        duration: 3000,
      });
    } catch (error) {
      console.error('Undo failed:', error);
      set({ isUndoing: false });
      toast.error(`Failed to undo: ${entry.description}`);
    }
  },

  /**
   * Redo the last undone operation
   */
  redo: async () => {
    const state = get();
    if (state.future.length === 0 || state.isUndoing || state.isRedoing) {
      return;
    }

    const entry = state.future[0];

    set({ isRedoing: true });

    try {
      // Execute the redo function
      await entry.redo();

      set((state) => ({
        past: [...state.past, entry],
        future: state.future.slice(1),
        isRedoing: false,
      }));

      // Show toast
      toast.info(`Redo: ${entry.description}`, {
        actionLabel: 'Undo',
        onAction: () => get().undo(),
        duration: 3000,
      });
    } catch (error) {
      console.error('Redo failed:', error);
      set({ isRedoing: false });
      toast.error(`Failed to redo: ${entry.description}`);
    }
  },

  /**
   * Clear all history
   */
  clear: () => {
    set({ past: [], future: [] });
  },

  /**
   * Get undo availability
   */
  get canUndo() {
    return get().past.length > 0 && !get().isUndoing && !get().isRedoing;
  },

  /**
   * Get redo availability
   */
  get canRedo() {
    return get().future.length > 0 && !get().isUndoing && !get().isRedoing;
  },
}));

/**
 * Convenience object for imperative access to canvas history
 */
export const canvasHistory = {
  /**
   * Record a new operation
   */
  record: (entry) => useCanvasHistory.getState().record(entry),

  /**
   * Undo the last operation
   */
  undo: () => useCanvasHistory.getState().undo(),

  /**
   * Redo the last undone operation
   */
  redo: () => useCanvasHistory.getState().redo(),

  /**
   * Clear all history
   */
  clear: () => useCanvasHistory.getState().clear(),

  /**
   * Check if undo is available
   */
  canUndo: () => {
    const state = useCanvasHistory.getState();
    return state.past.length > 0 && !state.isUndoing && !state.isRedoing;
  },

  /**
   * Check if redo is available
   */
  canRedo: () => {
    const state = useCanvasHistory.getState();
    return state.future.length > 0 && !state.isUndoing && !state.isRedoing;
  },

  /**
   * Get current history state
   */
  getState: () => useCanvasHistory.getState(),
};

export default useCanvasHistory;
