// src/ui/react/hooks/useGridHistory.js
// Grid state management with undo/redo support
// Extracted from GridLayoutPreview for reuse

import { useReducer, useCallback } from 'react';

/**
 * Action types for grid history management
 */
export const GRID_ACTIONS = {
    SET_STATE: 'SET_STATE',
    PUSH_STATE: 'PUSH_STATE',
    UNDO: 'UNDO',
    REDO: 'REDO',
    CLEAR_HISTORY: 'CLEAR_HISTORY',
};

/**
 * Create initial state for grid history
 */
const createInitialState = (initialValue) => ({
    current: initialValue,
    history: [],
    historyIndex: -1,
});

/**
 * Reducer for grid history management
 */
function gridHistoryReducer(state, action) {
    switch (action.type) {
        case GRID_ACTIONS.SET_STATE: {
            return {
                ...state,
                current: action.payload,
            };
        }

        case GRID_ACTIONS.PUSH_STATE: {
            // Add current state to history before changing
            const newHistory = [
                ...state.history.slice(0, state.historyIndex + 1),
                state.current,
            ];

            return {
                current: action.payload,
                history: newHistory,
                historyIndex: newHistory.length - 1,
            };
        }

        case GRID_ACTIONS.UNDO: {
            if (state.historyIndex < 0) return state;

            const prevState = state.history[state.historyIndex];
            return {
                ...state,
                current: prevState,
                historyIndex: state.historyIndex - 1,
            };
        }

        case GRID_ACTIONS.REDO: {
            if (state.historyIndex >= state.history.length - 1) return state;

            // For redo, we need to track "future" states
            // This simplified version just prevents going past history end
            return state;
        }

        case GRID_ACTIONS.CLEAR_HISTORY: {
            return createInitialState(state.current);
        }

        default:
            return state;
    }
}

/**
 * Hook for managing state with undo/redo history
 *
 * @param {any} initialValue - Initial state value
 * @returns {Object} - State and history control functions
 */
export function useGridHistory(initialValue) {
    const [state, dispatch] = useReducer(
        gridHistoryReducer,
        createInitialState(initialValue)
    );

    const setValue = useCallback((value, addToHistory = true) => {
        dispatch({
            type: addToHistory ? GRID_ACTIONS.PUSH_STATE : GRID_ACTIONS.SET_STATE,
            payload: value,
        });
    }, []);

    const undo = useCallback(() => {
        dispatch({ type: GRID_ACTIONS.UNDO });
    }, []);

    const redo = useCallback(() => {
        dispatch({ type: GRID_ACTIONS.REDO });
    }, []);

    const clearHistory = useCallback(() => {
        dispatch({ type: GRID_ACTIONS.CLEAR_HISTORY });
    }, []);

    return {
        value: state.current,
        setValue,
        undo,
        redo,
        clearHistory,
        canUndo: state.historyIndex >= 0,
        canRedo: state.historyIndex < state.history.length - 1,
        historyLength: state.history.length,
    };
}

/**
 * Detect overlapping cells in a grid placement
 *
 * @param {Array} placements - Array of placement objects with row, col, rowSpan, colSpan
 * @returns {Set} - Set of overlapping placement IDs
 */
export function detectOverlaps(placements) {
    const cellOccupancy = new Map();
    const overlappingPlacements = new Set();

    placements.forEach((p) => {
        const rowSpan = p.rowSpan || 1;
        const colSpan = p.colSpan || 1;

        for (let r = p.row; r < p.row + rowSpan; r++) {
            for (let c = p.col; c < p.col + colSpan; c++) {
                const key = `${r}-${c}`;
                if (cellOccupancy.has(key)) {
                    overlappingPlacements.add(p.id);
                    overlappingPlacements.add(cellOccupancy.get(key));
                } else {
                    cellOccupancy.set(key, p.id);
                }
            }
        }
    });

    return overlappingPlacements;
}

/**
 * Check if selected cells form a valid rectangle for merging
 *
 * @param {Array} selectedCells - Array of {row, col} objects
 * @returns {boolean} - True if cells form a complete rectangle
 */
export function canMergeCells(selectedCells) {
    if (selectedCells.length < 2) return false;

    const rows = selectedCells.map((c) => c.row);
    const cols = selectedCells.map((c) => c.col);
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);

    // Check if selection forms a complete rectangle
    const expectedCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    return selectedCells.length === expectedCount;
}

/**
 * Generate grid cells with placement mapping
 *
 * @param {Array} placements - Array of placement objects
 * @param {Object} gridSize - { rows, cols }
 * @returns {Array} - Array of cell objects with placement info
 */
export function generateGridCells(placements, gridSize) {
    const cells = [];
    const placementMap = new Map();

    // Build placement map for quick lookup
    placements.forEach((p) => {
        const rowSpan = p.rowSpan || 1;
        const colSpan = p.colSpan || 1;

        for (let r = p.row; r < p.row + rowSpan; r++) {
            for (let c = p.col; c < p.col + colSpan; c++) {
                const key = `${r}-${c}`;
                placementMap.set(key, {
                    placement: p,
                    isOrigin: r === p.row && c === p.col,
                });
            }
        }
    });

    // Generate all cells
    for (let row = 0; row < gridSize.rows; row++) {
        for (let col = 0; col < gridSize.cols; col++) {
            const key = `${row}-${col}`;
            const placementInfo = placementMap.get(key);

            if (placementInfo) {
                if (placementInfo.isOrigin) {
                    cells.push({
                        row,
                        col,
                        type: 'placement',
                        placement: placementInfo.placement,
                    });
                }
                // Skip non-origin cells of spanning placements
            } else {
                cells.push({
                    row,
                    col,
                    type: 'empty',
                    placement: null,
                });
            }
        }
    }

    return cells;
}

export default useGridHistory;
