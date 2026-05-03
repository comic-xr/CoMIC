/**
 * @file VRNavigatorContext.jsx
 * @description Context provider for VR canvas navigator state management.
 */

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
} from 'react';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Navigator operation modes */
export const NAV_OPERATIONS = {
    IDLE: 'idle',
    SELECTING: 'selecting',
    MULTI_SELECTING: 'multi',
    MOVING: 'moving',
    CONTEXT_MENU: 'context',
};

/** Cell actions available in context menu */
export const CELL_ACTIONS = {
    MOVE: 'move',
    SWAP: 'swap',
    DUPLICATE: 'duplicate',
    DELETE: 'delete',
    MERGE: 'merge',
    SPLIT: 'split',
    SET_HOME: 'setHome',
    NAVIGATE: 'navigate',
    LOCK: 'lock',
    PROPERTIES: 'properties',
};

// =============================================================================
// CONTEXT
// =============================================================================

const VRNavigatorContext = createContext(null);

/**
 * VRNavigatorProvider - Manages VR navigator state
 */
export function VRNavigatorProvider({
    children,
    cells,
    canvasSize,
    onMovePlacement,
    onSwapPlacements,
    onDeletePlacement,
    onMergeCells,
    onSplitCell,
    onSetHomepoint,
    onNavigateToCell,
}) {
    // Current operation mode
    const [operation, setOperation] = useState(NAV_OPERATIONS.IDLE);

    // Selected cells
    const [selectedCells, setSelectedCells] = useState([]);

    // Primary selected cell (for move/swap source)
    const [sourceCell, setSourceCell] = useState(null);

    // Hover/pointed cell
    const [hoveredCell, setHoveredCell] = useState(null);

    // Context menu state
    const [contextMenu, setContextMenu] = useState(null);

    // Grip modifier (for multi-select)
    const [gripHeld, setGripHeld] = useState(false);

    // Long-press timer
    const longPressTimer = useRef(null);

    // Helper to get cell at position
    const getCellAt = useCallback(
        (row, col) => {
            return (
                cells?.find((c) => {
                    const rowSpan = c.rowSpan || 1;
                    const colSpan = c.colSpan || 1;
                    return (
                        row >= c.row &&
                        row < c.row + rowSpan &&
                        col >= c.col &&
                        col < c.col + colSpan
                    );
                }) || null
            );
        },
        [cells]
    );

    /**
     * Toggle cell selection (for multi-select)
     */
    const toggleCellSelection = useCallback((row, col) => {
        setSelectedCells((prev) => {
            const existing = prev.findIndex(
                (c) => c.row === row && c.col === col
            );
            if (existing >= 0) {
                return prev.filter((_, i) => i !== existing);
            } else {
                return [...prev, { row, col }];
            }
        });
    }, []);

    /**
     * Cancel current operation
     */
    const cancelOperation = useCallback(() => {
        setOperation(NAV_OPERATIONS.IDLE);
        setSourceCell(null);
        setContextMenu(null);
    }, []);

    /**
     * Handle cell tap
     */
    const handleCellTap = useCallback(
        (row, col) => {
            const cell = getCellAt(row, col);

            // Clear any long-press timer
            if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
            }

            switch (operation) {
                case NAV_OPERATIONS.IDLE:
                    if (gripHeld) {
                        // Multi-select mode
                        setOperation(NAV_OPERATIONS.MULTI_SELECTING);
                        toggleCellSelection(row, col);
                    } else if (cell) {
                        // Select cell and enter moving mode
                        setSourceCell({ row, col, cell });
                        setOperation(NAV_OPERATIONS.MOVING);
                    }
                    break;

                case NAV_OPERATIONS.MOVING:
                    if (sourceCell) {
                        // Tap on target - execute move or swap
                        if (
                            row === sourceCell.row &&
                            col === sourceCell.col
                        ) {
                            // Tapped same cell - cancel
                            cancelOperation();
                        } else {
                            const targetCell = getCellAt(row, col);
                            if (targetCell) {
                                // Swap with existing cell
                                onSwapPlacements?.(
                                    sourceCell.cell.id,
                                    targetCell.id
                                );
                            } else {
                                // Move to empty cell
                                onMovePlacement?.(sourceCell.cell.id, row, col);
                            }
                            cancelOperation();
                        }
                    }
                    break;

                case NAV_OPERATIONS.MULTI_SELECTING:
                    toggleCellSelection(row, col);
                    break;

                case NAV_OPERATIONS.CONTEXT_MENU:
                    // Tap outside menu closes it
                    setContextMenu(null);
                    setOperation(NAV_OPERATIONS.IDLE);
                    break;

                default:
                    break;
            }
        },
        [
            operation,
            gripHeld,
            sourceCell,
            getCellAt,
            onMovePlacement,
            onSwapPlacements,
            toggleCellSelection,
            cancelOperation,
        ]
    );

    /**
     * Handle cell long-press (opens context menu)
     */
    const handleCellPressStart = useCallback(
        (row, col, screenPosition) => {
            const cell = getCellAt(row, col);
            if (!cell) return;

            longPressTimer.current = setTimeout(() => {
                setContextMenu({
                    cell: { row, col, ...cell },
                    position: screenPosition,
                });
                setOperation(NAV_OPERATIONS.CONTEXT_MENU);
            }, 500);
        },
        [getCellAt]
    );

    /**
     * Handle cell press end (cancel long-press if not triggered)
     */
    const handleCellPressEnd = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    /**
     * Handle context menu action
     */
    const handleContextAction = useCallback(
        (action) => {
            if (!contextMenu?.cell) return;

            const { cell } = contextMenu;

            switch (action) {
                case CELL_ACTIONS.MOVE:
                    setSourceCell({ row: cell.row, col: cell.col, cell });
                    setOperation(NAV_OPERATIONS.MOVING);
                    setContextMenu(null);
                    break;

                case CELL_ACTIONS.DELETE:
                    onDeletePlacement?.(cell.id);
                    setContextMenu(null);
                    setOperation(NAV_OPERATIONS.IDLE);
                    break;

                case CELL_ACTIONS.SET_HOME:
                    onSetHomepoint?.(cell.row, cell.col);
                    setContextMenu(null);
                    setOperation(NAV_OPERATIONS.IDLE);
                    break;

                case CELL_ACTIONS.NAVIGATE:
                    onNavigateToCell?.(cell.row, cell.col);
                    setContextMenu(null);
                    setOperation(NAV_OPERATIONS.IDLE);
                    break;

                case CELL_ACTIONS.DUPLICATE:
                    // Would need to find empty cell and copy
                    setContextMenu(null);
                    setOperation(NAV_OPERATIONS.IDLE);
                    break;

                case CELL_ACTIONS.SPLIT:
                    onSplitCell?.(cell.id);
                    setContextMenu(null);
                    setOperation(NAV_OPERATIONS.IDLE);
                    break;

                default:
                    setContextMenu(null);
                    setOperation(NAV_OPERATIONS.IDLE);
            }
        },
        [contextMenu, onDeletePlacement, onSetHomepoint, onNavigateToCell, onSplitCell]
    );

    /**
     * Handle merge action (requires multi-select)
     */
    const handleMerge = useCallback(() => {
        if (selectedCells.length >= 2) {
            onMergeCells?.(selectedCells);
            setSelectedCells([]);
            setOperation(NAV_OPERATIONS.IDLE);
        }
    }, [selectedCells, onMergeCells]);

    /**
     * Clear all selections
     */
    const clearSelection = useCallback(() => {
        setSelectedCells([]);
        setSourceCell(null);
        setOperation(NAV_OPERATIONS.IDLE);
    }, []);

    /**
     * Handle grip button (modifier for multi-select)
     */
    const handleGripChange = useCallback(
        (pressed) => {
            setGripHeld(pressed);
            if (!pressed && operation === NAV_OPERATIONS.MULTI_SELECTING) {
                // Grip released - exit multi-select but keep selection
                setOperation(NAV_OPERATIONS.IDLE);
            }
        },
        [operation]
    );

    /**
     * Check if a cell is a valid move target
     */
    const isValidMoveTarget = useCallback(
        (row, col) => {
            if (!sourceCell) return false;
            if (row === sourceCell.row && col === sourceCell.col) return false;

            // Check bounds
            if (row < 0 || col < 0) return false;
            if (row >= canvasSize.rows || col >= canvasSize.cols) return false;

            return true;
        },
        [sourceCell, canvasSize]
    );

    /**
     * Get cell visual state for rendering
     */
    const getCellState = useCallback(
        (row, col) => {
            const isSource =
                sourceCell?.row === row && sourceCell?.col === col;
            const isSelected = selectedCells.some(
                (c) => c.row === row && c.col === col
            );
            const isHovered =
                hoveredCell?.row === row && hoveredCell?.col === col;
            const isValidTarget =
                operation === NAV_OPERATIONS.MOVING &&
                isValidMoveTarget(row, col);

            return {
                isSource,
                isSelected,
                isHovered,
                isValidTarget,
                isMoving: operation === NAV_OPERATIONS.MOVING,
            };
        },
        [sourceCell, selectedCells, hoveredCell, operation, isValidMoveTarget]
    );

    const contextValue = {
        // State
        operation,
        selectedCells,
        sourceCell,
        hoveredCell,
        contextMenu,
        gripHeld,
        cells,
        canvasSize,

        // Actions
        handleCellTap,
        handleCellPressStart,
        handleCellPressEnd,
        handleContextAction,
        handleMerge,
        cancelOperation,
        clearSelection,
        handleGripChange,
        setHoveredCell,

        // Utilities
        getCellState,
        isValidMoveTarget,
        getCellAt,
    };

    return (
        <VRNavigatorContext.Provider value={contextValue}>
            {children}
        </VRNavigatorContext.Provider>
    );
}

export function useVRNavigator() {
    const context = useContext(VRNavigatorContext);
    if (!context) {
        throw new Error(
            'useVRNavigator must be used within VRNavigatorProvider'
        );
    }
    return context;
}

export default VRNavigatorContext;
