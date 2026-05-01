// src/ui/react/components/panels/LayoutPanel/components/CanvasNavigator/CanvasNavigator.logic.js
// Complete Canvas Navigator Logic Hook
//
// FEATURES:
// - Navigation: D-pad, click-to-navigate, homepoint
// - Edit Mode: Cell selection, merge, unmerge, delete, resize
// - Drag & Drop: Move placements, swap on drop, external drops
// - Undo/Redo: Full history with apply/cancel workflow
// - Collaborator Tracking: Show who's viewing each cell
// - Context Modes: EDIT (layout), VIEWS (navigation)
// - Display Modes: Names, Numbers, Colors only
//
// ARCHITECTURE:
// - Uses reducer for undo/redo history
// - Integrates with CanvasManager for server sync
// - Receives dockPosition from parent context (no local definition)

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { createLogger } from "@Utils/logger.js";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { saveCanvasSize } from "@UI/react/hooks/canvasState.js";
import { VIEWPORT_SIZE_EVENT } from "@UI/react/hooks/viewportState.js";

const log = createLogger("canvas-navigator");

// =============================================================================
// CONSTANTS
// =============================================================================

// Context modes - what the navigator is being used for
export const CONTEXT_MODES = {
  EDIT: "edit", // Edit mode - merge cells, resize canvas
  VIEWS: "views", // Views mode - navigate, view info
  PRESENCE: "presence", // Show collaborator positions
  HOMEPOINTS: "homepoints", // Manage homepoints
};

// Display modes for cells
export const DISPLAY_MODES = {
  NAMES: "names", // Show view names
  NUMBERS: "numbers", // Show numbers (1, 2, 3...)
  COLORS: "colors", // Just colored blocks, no text
};

// Navigator modes (sub-mode within context)
export const NAV_MODES = {
  NAVIGATE: "navigate", // Click to navigate viewport
  SELECT: "select", // Click to select cells
};

// Instance colors
export const INSTANCE_COLORS = {
  blue: "#60a5fa",
  green: "#4ade80",
  pink: "#f472b6",
  amber: "#fbbf24",
  teal: "#2dd4bf",
  purple: "#a78bfa",
  indigo: "#818cf8",
  red: "#f87171",
};

// =============================================================================
// HISTORY REDUCER
// =============================================================================

const HISTORY_ACTIONS = {
  SNAPSHOT: "SNAPSHOT", // Save current state to history
  UNDO: "UNDO",
  REDO: "REDO",
  CLEAR_HISTORY: "CLEAR_HISTORY",
  MARK_SAVED: "MARK_SAVED", // Mark current state as saved (apply)
  RESET_TO_SAVED: "RESET_TO_SAVED", // Cancel - revert to saved state
};

const historyReducer = (state, action) => {
  switch (action.type) {
    case HISTORY_ACTIONS.SNAPSHOT: {
      // Don't create duplicate snapshots
      const lastSnapshot = state.history[state.historyIndex];
      if (
        lastSnapshot &&
        JSON.stringify(lastSnapshot) === JSON.stringify(action.payload)
      ) {
        return state;
      }

      // Truncate any "future" history when making new changes
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(action.payload);

      return {
        ...state,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isDirty: true,
      };
    }

    case HISTORY_ACTIONS.UNDO: {
      if (state.historyIndex <= 0) return state;
      return {
        ...state,
        historyIndex: state.historyIndex - 1,
      };
    }

    case HISTORY_ACTIONS.REDO: {
      if (state.historyIndex >= state.history.length - 1) return state;
      return {
        ...state,
        historyIndex: state.historyIndex + 1,
      };
    }

    case HISTORY_ACTIONS.CLEAR_HISTORY: {
      return {
        history: [action.payload],
        historyIndex: 0,
        savedIndex: 0,
        isDirty: false,
      };
    }

    case HISTORY_ACTIONS.MARK_SAVED: {
      return {
        ...state,
        savedIndex: state.historyIndex,
        isDirty: false,
      };
    }

    case HISTORY_ACTIONS.RESET_TO_SAVED: {
      return {
        ...state,
        historyIndex: state.savedIndex,
        isDirty: false,
      };
    }

    default:
      return state;
  }
};

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * useCanvasNavigator - Complete canvas navigator logic
 *
 * @param {Object} options
 * @param {Object} options.canvasSize - { rows, cols }
 * @param {Object} options.viewport - { row, col }
 * @param {Object} options.viewportSize - { rows, cols }
 * @param {Array} options.cells - Array of cell/placement objects
 * @param {Object} options.homepoint - { row, col } or null
 * @param {Array} options.collaborators - Array of collaborator objects with positions
 * @param {string} options.dockPosition - From parent context
 * @param {boolean} options.loading - Loading state
 * @param {boolean} options.isConnected - Connection state
 * @param {Function} options.moveViewport - (deltaRow, deltaCol) => void
 * @param {Function} options.navigateToCell - (row, col) => void
 * @param {Function} options.setViewportSizeRows - (rows) => void
 * @param {Function} options.setViewportSizeCols - (cols) => void
 * @param {Function} options.setCanvasRows - (rows) => void
 * @param {Function} options.setCanvasCols - (cols) => void
 * @param {Function} options.setHomepoint - (row, col) => void
 * @param {Function} options.clearHomepoint - () => void
 * @param {Function} options.movePlacement - (id, row, col) => Promise
 * @param {Function} options.swapPlacements - (id1, id2) => Promise
 * @param {Function} options.resizePlacement - (id, rowSpan, colSpan) => Promise
 * @param {Function} options.removePlacement - (id) => Promise
 * @param {Function} options.mergeCells - (cellIds) => Promise
 * @param {Function} options.unmergeCells - (id) => Promise
 * @param {Function} options.onExternalDrop - (viewItem, { row, col }) => void
 */
export function useCanvasNavigator({
  // Canvas object for direct manager calls (bypasses stale closure issues)
  canvas = null,

  // Data from parent
  canvasSize = { rows: 3, cols: 3 },
  viewport = { row: 0, col: 0 },
  viewportSize = { rows: 3, cols: 3 },
  cells = [],
  homepoint = null,
  collaborators = [],
  dockPosition = "left-panel",
  loading = false,
  isConnected = true,

  // Navigation callbacks
  moveViewport: parentMoveViewport,
  navigateToCell: parentNavigateToCell,
  setViewportSizeRows: parentSetViewportSizeRows,
  setViewportSizeCols: parentSetViewportSizeCols,
  setCanvasRows: parentSetCanvasRows,
  setCanvasCols: parentSetCanvasCols,
  setHomepoint: parentSetHomepoint,
  clearHomepoint: parentClearHomepoint,

  // Placement callbacks
  movePlacement: parentMovePlacement,
  swapPlacements: parentSwapPlacements,
  resizePlacement: parentResizePlacement,
  removePlacement: parentRemovePlacement,
  mergeCells: parentMergeCells,
  unmergeCells: parentUnmergeCells,

  // External drop callback
  onExternalDrop,
} = {}) {
  // ===========================================================================
  // LOCAL STATE
  // ===========================================================================

  // Context mode (EDIT vs VIEWS)
  const [contextMode, setContextMode] = useState(CONTEXT_MODES.VIEWS);

  // Navigator mode within context
  const [navMode, setNavMode] = useState(NAV_MODES.NAVIGATE);

  // Display mode for cells
  const [displayMode, setDisplayMode] = useState(DISPLAY_MODES.NAMES);

  // Minimap zoom level
  const [minimapZoom, setMinimapZoom] = useState(1);

  // Float position (for floating mode)
  const [floatPosition, setFloatPosition] = useState({ x: 100, y: 100 });

  // Setting homepoint mode
  const [settingHomepoint, setSettingHomepoint] = useState(false);

  // Cell selection (for edit mode)
  const [selectedCells, setSelectedCells] = useState([]);

  // Drag state
  const [draggedCell, setDraggedCell] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);

  // External drag state
  const [externalDragOver, setExternalDragOver] = useState(null);

  // Hovered cell (for tooltip)
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // ===========================================================================
  // LOCAL SIZE STATE (used when context functions unavailable)
  // ===========================================================================

  const [localViewportSize, setLocalViewportSize] = useState(() => ({
    rows: viewportSize?.rows || 3,
    cols: viewportSize?.cols || 3,
  }));

  const [localCanvasSize, setLocalCanvasSize] = useState(() => ({
    rows: canvasSize?.rows || 4,
    cols: canvasSize?.cols || 5,
  }));

  // Sync local state when props change (from context)
  useEffect(() => {
    if (viewportSize?.rows && viewportSize?.cols) {
      setLocalViewportSize({ rows: viewportSize.rows, cols: viewportSize.cols });
    }
  }, [viewportSize?.rows, viewportSize?.cols]);

  useEffect(() => {
    if (canvasSize?.rows && canvasSize?.cols) {
      setLocalCanvasSize({ rows: canvasSize.rows, cols: canvasSize.cols });
    }
  }, [canvasSize?.rows, canvasSize?.cols]);

  // Effective sizes - prefer canvas.dimensions (most accurate), then props, then local
  const effectiveViewportSize = {
    rows: viewportSize?.rows ?? localViewportSize.rows,
    cols: viewportSize?.cols ?? localViewportSize.cols,
  };

  // For canvas size, prefer the actual canvas object's dimensions over everything else
  const effectiveCanvasSize = {
    rows: canvas?.dimensions?.rows ?? canvasSize?.rows ?? localCanvasSize.rows,
    cols: canvas?.dimensions?.cols ?? canvasSize?.cols ?? localCanvasSize.cols,
  };

  // ===========================================================================
  // HISTORY STATE (for undo/redo)
  // ===========================================================================

  const initialHistoryState = {
    history: [{ cells, canvasSize }],
    historyIndex: 0,
    savedIndex: 0,
    isDirty: false,
  };

  const [historyState, dispatchHistory] = useReducer(
    historyReducer,
    initialHistoryState
  );

  // Track when cells change externally
  const prevCellsRef = useRef(cells);
  useEffect(() => {
    if (JSON.stringify(prevCellsRef.current) !== JSON.stringify(cells)) {
      // External change - reset history
      dispatchHistory({
        type: HISTORY_ACTIONS.CLEAR_HISTORY,
        payload: { cells, canvasSize },
      });
      prevCellsRef.current = cells;
    }
  }, [cells, canvasSize]);

  // Get current state from history
  const currentHistoryState = historyState.history[
    historyState.historyIndex
  ] || { cells, canvasSize };

  // ===========================================================================
  // COMPUTED STATE
  // ===========================================================================

  const isDisabled = loading || !isConnected;

  const isAtHome = useMemo(() => {
    return (
      homepoint &&
      viewport.row === homepoint.row &&
      viewport.col === homepoint.col
    );
  }, [homepoint, viewport]);

  const canUndo = historyState.historyIndex > 0;
  const canRedo = historyState.historyIndex < historyState.history.length - 1;
  const isDirty = historyState.isDirty;

  // ===========================================================================
  // CELL HELPERS
  // ===========================================================================

  /**
   * Get cell at specific position (handles spanning)
   */
  const getCellAt = useCallback(
    (row, col) => {
      return cells.find(
        (c) =>
          row >= c.row &&
          row < c.row + (c.rowSpan || 1) &&
          col >= c.col &&
          col < c.col + (c.colSpan || 1)
      );
    },
    [cells]
  );

  /**
   * Check if position is within current viewport
   */
  const isInViewport = useCallback(
    (row, col) => {
      return (
        row >= viewport.row &&
        row < viewport.row + effectiveViewportSize.rows &&
        col >= viewport.col &&
        col < viewport.col + effectiveViewportSize.cols
      );
    },
    [viewport, effectiveViewportSize]
  );

  /**
   * Get collaborators at a specific cell
   */
  const getCollaboratorsAtCell = useCallback(
    (row, col) => {
      return collaborators.filter(
        (c) => c.position?.row === row && c.position?.col === col
      );
    },
    [collaborators]
  );

  /**
   * Get display text for cell based on display mode
   */
  const getCellDisplay = useCallback(
    (cell, index, maxWidth = 60) => {
      if (!cell) return null;

      switch (displayMode) {
        case DISPLAY_MODES.NUMBERS:
          return index + 1;
        case DISPLAY_MODES.NAMES: {
          const name = cell.name || `View ${index + 1}`;
          const maxLen = Math.floor(maxWidth / 7); // Approximate character width
          return name.length <= maxLen
            ? name
            : name.substring(0, Math.max(2, maxLen - 1)) + "…";
        }
        case DISPLAY_MODES.COLORS:
          return null;
        default:
          return null;
      }
    },
    [displayMode]
  );

  /**
   * Get cell color
   */
  const getCellColor = useCallback((cell) => {
    if (!cell) return null;
    if (typeof cell.color === "string") {
      return INSTANCE_COLORS[cell.color] || cell.color;
    }
    // Numeric index into color array
    const colorKeys = Object.keys(INSTANCE_COLORS);
    const colorKey = colorKeys[cell.color % colorKeys.length];
    return INSTANCE_COLORS[colorKey];
  }, []);

  // ===========================================================================
  // NAVIGATION
  // ===========================================================================

  const handleMoveViewport = useCallback(
    (direction) => {
      if (!parentMoveViewport) return;

      switch (direction) {
        case "up":
          parentMoveViewport(-1, 0);
          break;
        case "down":
          parentMoveViewport(1, 0);
          break;
        case "left":
          parentMoveViewport(0, -1);
          break;
        case "right":
          parentMoveViewport(0, 1);
          break;
      }
    },
    [parentMoveViewport]
  );

  const handleNavigateToCell = useCallback(
    (row, col) => {
      if (parentNavigateToCell) {
        parentNavigateToCell(row, col);
      }
    },
    [parentNavigateToCell]
  );

  const handleNavigateHome = useCallback(() => {
    if (homepoint && parentNavigateToCell) {
      parentNavigateToCell(homepoint.row, homepoint.col);
    }
  }, [homepoint, parentNavigateToCell]);

  // ===========================================================================
  // HOMEPOINT
  // ===========================================================================

  const handleSetHomepoint = useCallback(
    (row, col) => {
      if (parentSetHomepoint) {
        parentSetHomepoint(row, col);
      }
      setSettingHomepoint(false);
    },
    [parentSetHomepoint]
  );

  const handleClearHomepoint = useCallback(() => {
    if (parentClearHomepoint) {
      parentClearHomepoint();
    }
  }, [parentClearHomepoint]);

  // ===========================================================================
  // VIEWPORT SIZE
  // ===========================================================================

  // Storage key for viewport size (must match LayoutPanel.logic.js)
  const VIEWPORT_STORAGE_KEY = "cia-viewport-size";

  const handleSetViewportSizeRows = useCallback(
    (rows) => {
      const value = Math.max(1, Math.min(10, rows));
      // Also constrain to canvas size
      const constrainedValue = Math.min(value, effectiveCanvasSize.rows);

      log.info(`[handleSetViewportSizeRows] Setting rows to ${constrainedValue}`);

      const newSize = { rows: constrainedValue, cols: effectiveViewportSize.cols };

      // Update local state
      setLocalViewportSize(prev => ({ ...prev, rows: constrainedValue }));

      // Save to localStorage
      try {
        localStorage.setItem(VIEWPORT_STORAGE_KEY, JSON.stringify(newSize));
      } catch (e) {
        log.warn(`Failed to save viewport size: ${e}`);
      }

      // Dispatch event so other components (like CanvasGrid) can react
      window.dispatchEvent(
        new CustomEvent(VIEWPORT_SIZE_EVENT, {
          detail: {
            size: newSize,
            previousSize: { rows: effectiveViewportSize.rows, cols: effectiveViewportSize.cols },
            source: 'CanvasNavigator',
          },
          bubbles: true,
        })
      );
    },
    [effectiveCanvasSize.rows, effectiveViewportSize]
  );

  const handleSetViewportSizeCols = useCallback(
    (cols) => {
      const value = Math.max(1, Math.min(10, cols));
      // Also constrain to canvas size
      const constrainedValue = Math.min(value, effectiveCanvasSize.cols);

      log.info(`[handleSetViewportSizeCols] Setting cols to ${constrainedValue}`);

      const newSize = { rows: effectiveViewportSize.rows, cols: constrainedValue };

      // Update local state
      setLocalViewportSize(prev => ({ ...prev, cols: constrainedValue }));

      // Save to localStorage
      try {
        localStorage.setItem(VIEWPORT_STORAGE_KEY, JSON.stringify(newSize));
      } catch (e) {
        log.warn(`Failed to save viewport size: ${e}`);
      }

      // Dispatch event so other components (like CanvasGrid) can react
      window.dispatchEvent(
        new CustomEvent(VIEWPORT_SIZE_EVENT, {
          detail: {
            size: newSize,
            previousSize: { rows: effectiveViewportSize.rows, cols: effectiveViewportSize.cols },
            source: 'CanvasNavigator',
          },
          bubbles: true,
        })
      );
    },
    [effectiveCanvasSize.cols, effectiveViewportSize]
  );

  // ===========================================================================
  // CANVAS SIZE
  // ===========================================================================

  const handleSetCanvasRows = useCallback(
    async (rows, isDelta = false) => {
      // If isDelta is true, rows is a delta (+1 or -1), otherwise it's an absolute value
      const currentRows = canvas?.dimensions?.rows ?? effectiveCanvasSize.rows;
      const targetValue = isDelta ? currentRows + rows : rows;
      const value = Math.max(1, targetValue);

      // Call canvasManager directly to bypass stale closure issues
      if (canvas?.id) {
        // Check if reduction would orphan views
        const maxOccupiedRow = (canvas.placements || []).reduce(
          (max, p) => Math.max(max, p.row + (p.rowSpan || 1)),
          0
        );

        // Only block if we're trying to DECREASE below the occupied area
        if (value < currentRows && value < maxOccupiedRow) {
          log.warn(`Cannot reduce rows to ${value}: views occupy up to row ${maxOccupiedRow}`);
          return;
        }

        // If current dimensions are inconsistent (smaller than occupied), fix them
        const finalValue = Math.max(value, maxOccupiedRow);
        const newCols = canvas.dimensions?.cols || effectiveCanvasSize.cols;

        try {
          await canvasManager.updateCanvas(canvas.id, {
            dimensions: { rows: finalValue, cols: newCols },
          });
          saveCanvasSize({ rows: finalValue, cols: newCols });
          setLocalCanvasSize(prev => ({ ...prev, rows: finalValue }));

          // If canvas shrinks below viewport, shrink viewport too
          if (finalValue < effectiveViewportSize.rows) {
            handleSetViewportSizeRows(finalValue);
          }
        } catch (error) {
          log.error(`[handleSetCanvasRows] Failed to update canvas: ${error}`);
        }
      } else {
        // Fallback: update local state only
        setLocalCanvasSize(prev => ({ ...prev, rows: value }));

        // If canvas shrinks below viewport, shrink viewport too
        if (value < effectiveViewportSize.rows) {
          handleSetViewportSizeRows(value);
        }
      }
    },
    [canvas, effectiveCanvasSize.rows, effectiveCanvasSize.cols, effectiveViewportSize.rows, handleSetViewportSizeRows]
  );

  const handleSetCanvasCols = useCallback(
    async (cols, isDelta = false) => {
      // If isDelta is true, cols is a delta (+1 or -1), otherwise it's an absolute value
      const currentCols = canvas?.dimensions?.cols ?? effectiveCanvasSize.cols;
      const targetValue = isDelta ? currentCols + cols : cols;
      const value = Math.max(1, targetValue);

      // Call canvasManager directly to bypass stale closure issues
      if (canvas?.id) {
        // Check if reduction would orphan views
        const maxOccupiedCol = (canvas.placements || []).reduce(
          (max, p) => Math.max(max, p.col + (p.colSpan || 1)),
          0
        );
        // Only block if we're trying to DECREASE below the occupied area
        if (value < currentCols && value < maxOccupiedCol) {
          log.warn(`Cannot reduce cols to ${value}: views occupy up to col ${maxOccupiedCol}`);
          return;
        }

        // If current dimensions are inconsistent (smaller than occupied), fix them
        const finalValue = Math.max(value, maxOccupiedCol);
        const newRows = canvas.dimensions?.rows || effectiveCanvasSize.rows;

        try {
          await canvasManager.updateCanvas(canvas.id, {
            dimensions: { rows: newRows, cols: finalValue },
          });
          saveCanvasSize({ rows: newRows, cols: finalValue });
          setLocalCanvasSize(prev => ({ ...prev, cols: finalValue }));

          // If canvas shrinks below viewport, shrink viewport too
          if (finalValue < effectiveViewportSize.cols) {
            handleSetViewportSizeCols(finalValue);
          }
        } catch (error) {
          log.error(`[handleSetCanvasCols] Failed to update canvas: ${error?.message || error}`);
        }
      } else {
        // Fallback: update local state only
        setLocalCanvasSize(prev => ({ ...prev, cols: value }));

        // If canvas shrinks below viewport, shrink viewport too
        if (value < effectiveViewportSize.cols) {
          handleSetViewportSizeCols(value);
        }
      }
    },
    [canvas, effectiveCanvasSize.cols, effectiveCanvasSize.rows, effectiveViewportSize.cols, handleSetViewportSizeCols]
  );

  const handleAddRow = useCallback(() => {
    // Read directly from canvas.dimensions to avoid stale closure issues
    const currentRows = canvas?.dimensions?.rows ?? effectiveCanvasSize.rows;
    handleSetCanvasRows(currentRows + 1);
  }, [canvas, effectiveCanvasSize.rows, handleSetCanvasRows]);

  const handleRemoveRow = useCallback(() => {
    const currentRows = canvas?.dimensions?.rows ?? effectiveCanvasSize.rows;
    if (currentRows > 1) {
      handleSetCanvasRows(currentRows - 1);
    }
  }, [canvas, effectiveCanvasSize.rows, handleSetCanvasRows]);

  const handleAddColumn = useCallback(() => {
    // Read directly from canvas.dimensions to avoid stale closure issues
    const currentCols = canvas?.dimensions?.cols ?? effectiveCanvasSize.cols;
    handleSetCanvasCols(currentCols + 1);
  }, [canvas, effectiveCanvasSize.cols, handleSetCanvasCols]);

  const handleRemoveColumn = useCallback(() => {
    const currentCols = canvas?.dimensions?.cols ?? effectiveCanvasSize.cols;
    if (currentCols > 1) {
      handleSetCanvasCols(currentCols - 1);
    }
  }, [canvas, effectiveCanvasSize.cols, handleSetCanvasCols]);

  // ===========================================================================
  // CELL SELECTION (Edit Mode)
  // ===========================================================================

  const selectCell = useCallback((row, col, isMultiSelect = false) => {
    const key = `${row}-${col}`;
    if (isMultiSelect) {
      setSelectedCells((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      );
    } else {
      setSelectedCells([key]);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCells([]);
  }, []);

  const selectAll = useCallback(() => {
    const allKeys = cells.map((c) => `${c.row}-${c.col}`);
    setSelectedCells(allKeys);
  }, [cells]);

  // ===========================================================================
  // MERGE / UNMERGE / DELETE
  // ===========================================================================

  const canMerge = useMemo(() => {
    if (selectedCells.length < 2) return false;

    // Check if cells form a rectangle
    const selected = selectedCells.map((key) => {
      const [row, col] = key.split("-").map(Number);
      return { row, col };
    });

    const minRow = Math.min(...selected.map((s) => s.row));
    const maxRow = Math.max(...selected.map((s) => s.row));
    const minCol = Math.min(...selected.map((s) => s.col));
    const maxCol = Math.max(...selected.map((s) => s.col));

    const expectedCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    return selectedCells.length === expectedCount;
  }, [selectedCells]);

  const canUnmerge = useMemo(() => {
    if (selectedCells.length !== 1) return false;
    const [row, col] = selectedCells[0].split("-").map(Number);
    const cell = getCellAt(row, col);
    return cell && ((cell.rowSpan || 1) > 1 || (cell.colSpan || 1) > 1);
  }, [selectedCells, getCellAt]);

  const handleMerge = useCallback(async () => {
    if (!canMerge || !parentMergeCells) return;

    // Get cell IDs for selected cells
    const cellIds = selectedCells
      .map((key) => {
        const [row, col] = key.split("-").map(Number);
        return getCellAt(row, col)?.id;
      })
      .filter(Boolean);

    // Snapshot before change
    dispatchHistory({
      type: HISTORY_ACTIONS.SNAPSHOT,
      payload: { cells, canvasSize },
    });

    await parentMergeCells(cellIds);
    clearSelection();
  }, [
    canMerge,
    selectedCells,
    getCellAt,
    parentMergeCells,
    cells,
    canvasSize,
    clearSelection,
  ]);

  const handleUnmerge = useCallback(async () => {
    if (!canUnmerge || !parentUnmergeCells) return;

    const [row, col] = selectedCells[0].split("-").map(Number);
    const cell = getCellAt(row, col);

    if (cell) {
      // Snapshot before change
      dispatchHistory({
        type: HISTORY_ACTIONS.SNAPSHOT,
        payload: { cells, canvasSize },
      });

      await parentUnmergeCells(cell.id);
    }
    clearSelection();
  }, [
    canUnmerge,
    selectedCells,
    getCellAt,
    parentUnmergeCells,
    cells,
    canvasSize,
    clearSelection,
  ]);

  const handleDelete = useCallback(async () => {
    if (selectedCells.length === 0 || !parentRemovePlacement) return;

    // Snapshot before change
    dispatchHistory({
      type: HISTORY_ACTIONS.SNAPSHOT,
      payload: { cells, canvasSize },
    });

    for (const key of selectedCells) {
      const [row, col] = key.split("-").map(Number);
      const cell = getCellAt(row, col);
      if (cell) {
        await parentRemovePlacement(cell.id);
      }
    }
    clearSelection();
  }, [
    selectedCells,
    getCellAt,
    parentRemovePlacement,
    cells,
    canvasSize,
    clearSelection,
  ]);

  // ===========================================================================
  // PLACEMENT RESIZE
  // ===========================================================================

  const handleResizePlacement = useCallback(
    async (id, rowSpan, colSpan) => {
      if (!parentResizePlacement) return;

      // Snapshot before change
      dispatchHistory({
        type: HISTORY_ACTIONS.SNAPSHOT,
        payload: { cells, canvasSize },
      });

      await parentResizePlacement(id, rowSpan, colSpan);
    },
    [parentResizePlacement, cells, canvasSize]
  );

  // ===========================================================================
  // DRAG AND DROP - Internal
  // ===========================================================================

  const handleDragStart = useCallback((cell, e) => {
    if (!cell) return;
    console.log('[CanvasNavigator] Drag started for cell:', cell);
    setDraggedCell(cell);
    if (e?.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", cell.id);

      // Also set view data if this cell contains a view
      // Cell can have viewId or viewConfigurationId depending on source
      const viewId = cell.viewId || cell.viewConfigurationId;
      if (viewId) {
        const viewData = {
          type: 'view-item',
          id: viewId,
          viewConfigId: viewId,
          viewId: viewId,
          name: cell.name || cell.label,
          color: cell.color,
          datasetId: cell.datasetId,
          sourcePlacementId: cell.id, // Placement ID for swap operations
        };
        console.log('[CanvasNavigator] Setting view drag data:', viewData);
        e.dataTransfer.setData('application/x-viewitem', JSON.stringify(viewData));
      }
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedCell(null);
    setDragOverCell(null);
  }, []);

  const handleDragOver = useCallback((row, col, e) => {
    if (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
    setDragOverCell({ row, col });
  }, []);

  const handleDrop = useCallback(
    async (row, col, e) => {
      if (e) e.preventDefault();

      if (draggedCell && parentMovePlacement) {
        // Same cell - do nothing
        if (draggedCell.row === row && draggedCell.col === col) {
          handleDragEnd();
          return;
        }

        // Check if target has a cell
        const targetCell = getCellAt(row, col);

        // Snapshot before change
        dispatchHistory({
          type: HISTORY_ACTIONS.SNAPSHOT,
          payload: { cells, canvasSize },
        });

        if (targetCell && targetCell.id !== draggedCell.id) {
          // Swap positions
          if (parentSwapPlacements) {
            log.debug(`Swapping ${draggedCell.id} with ${targetCell.id}`);
            await parentSwapPlacements(draggedCell.id, targetCell.id);
          }
        } else if (!targetCell) {
          // Move to empty cell
          log.debug(`Moving ${draggedCell.id} to (${row}, ${col})`);
          await parentMovePlacement(draggedCell.id, row, col);
        }
      }

      handleDragEnd();
    },
    [
      draggedCell,
      getCellAt,
      parentMovePlacement,
      parentSwapPlacements,
      cells,
      canvasSize,
      handleDragEnd,
    ]
  );

  // ===========================================================================
  // DRAG AND DROP - External (from ViewItem)
  // ===========================================================================

  const handleExternalDragEnter = useCallback((e) => {
    if (e.dataTransfer.types.includes("application/x-viewitem")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleExternalDragOver = useCallback((e, row, col) => {
    if (e.dataTransfer.types.includes("application/x-viewitem")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setExternalDragOver({ row, col });
    }
  }, []);

  const handleExternalDragLeave = useCallback((e, containerRef) => {
    const relatedTarget = e.relatedTarget;
    if (
      !relatedTarget ||
      !(relatedTarget instanceof Node) ||
      !containerRef?.current?.contains(relatedTarget)
    ) {
      setExternalDragOver(null);
    }
  }, []);

  const handleExternalDrop = useCallback(
    (e, row, col) => {
      if (!e.dataTransfer.types.includes("application/x-viewitem")) return;

      e.preventDefault();
      const viewItemData = e.dataTransfer.getData("application/x-viewitem");

      try {
        const viewItem = JSON.parse(viewItemData);
        log.debug("External drop:", viewItem, { row, col });

        if (onExternalDrop) {
          onExternalDrop(viewItem, { row, col });
        }
      } catch (err) {
        log.error("Failed to parse dropped ViewItem:", err);
      }

      setExternalDragOver(null);
    },
    [onExternalDrop]
  );

  // ===========================================================================
  // UNDO / REDO
  // ===========================================================================

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    dispatchHistory({ type: HISTORY_ACTIONS.UNDO });
    // Note: We'd need to apply the undone state to the actual canvas
    // This requires the parent to accept a "restore" callback
  }, [canUndo]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    dispatchHistory({ type: HISTORY_ACTIONS.REDO });
  }, [canRedo]);

  // ===========================================================================
  // APPLY / CANCEL
  // ===========================================================================

  const handleApply = useCallback(() => {
    dispatchHistory({ type: HISTORY_ACTIONS.MARK_SAVED });
    log.info("Changes applied");
    // Could emit event or call callback here
  }, []);

  const handleCancel = useCallback(() => {
    dispatchHistory({ type: HISTORY_ACTIONS.RESET_TO_SAVED });
    log.info("Changes cancelled");
    // Note: Would need to restore from savedIndex state
  }, []);

  // ===========================================================================
  // CELL CLICK HANDLER
  // ===========================================================================

  const handleCellClick = useCallback(
    (row, col, cell, e) => {
      // Setting homepoint mode
      if (settingHomepoint) {
        handleSetHomepoint(row, col);
        return;
      }

      // Edit mode - handle selection
      if (contextMode === CONTEXT_MODES.EDIT) {
        if (e?.shiftKey) {
          // Multi-select
          selectCell(row, col, true);
        } else {
          // Single select
          selectCell(row, col, false);
        }
        return;
      }

      // Views mode - navigate
      handleNavigateToCell(row, col);
    },
    [
      settingHomepoint,
      contextMode,
      handleSetHomepoint,
      selectCell,
      handleNavigateToCell,
    ]
  );

  // ===========================================================================
  // MINIMAP CELLS COMPUTATION
  // ===========================================================================

  const minimapCells = useMemo(() => {
    const result = [];
    const processedCells = new Set();
    let viewIndex = 0;

    for (let row = 0; row < effectiveCanvasSize.rows; row++) {
      for (let col = 0; col < effectiveCanvasSize.cols; col++) {
        const cell = getCellAt(row, col);
        const inVP = isInViewport(row, col);
        const isHome =
          homepoint && row === homepoint.row && col === homepoint.col;
        const isSelected = selectedCells.includes(`${row}-${col}`);
        const isDragOver =
          dragOverCell?.row === row && dragOverCell?.col === col;
        const isExtDragOver =
          externalDragOver?.row === row && externalDragOver?.col === col;
        const cellCollaborators = getCollaboratorsAtCell(row, col);

        // Skip non-origin cells of spanning placements
        if (cell && (cell.row !== row || cell.col !== col)) continue;

        // Track processed cells to avoid duplicates
        const key = `${row}-${col}`;
        if (processedCells.has(key)) continue;
        processedCells.add(key);

        const cellIndex = cell ? viewIndex++ : -1;

        result.push({
          row,
          col,
          cell,
          inVP,
          isHome,
          isSelected,
          isDragOver,
          isExtDragOver,
          cellIndex,
          key,
          collaborators: cellCollaborators,
        });
      }
    }

    return result;
  }, [
    effectiveCanvasSize,
    cells,
    viewport,
    effectiveViewportSize,
    homepoint,
    selectedCells,
    dragOverCell,
    externalDragOver,
    getCellAt,
    isInViewport,
    getCollaboratorsAtCell,
  ]);

  // ===========================================================================
  // RETURN API
  // ===========================================================================

  return {
    // State - use effective sizes that include local fallbacks
    canvasSize: effectiveCanvasSize,
    viewport,
    viewportSize: effectiveViewportSize,
    cells,
    homepoint,
    collaborators,
    minimapZoom,
    dockPosition,
    floatPosition,
    contextMode,
    navMode,
    displayMode,
    selectedCells,
    settingHomepoint,
    isAtHome,
    isDisabled,
    loading,
    isConnected,
    hoveredCell,
    tooltipPos,
    minimapCells,

    // History state
    canUndo,
    canRedo,
    isDirty,

    // Drag state
    draggedCell,
    dragOverCell,
    externalDragOver,

    // Mode setters
    setContextMode,
    setNavMode,
    setDisplayMode,
    setSettingHomepoint,
    setMinimapZoom,
    setFloatPosition,
    setHoveredCell,
    setTooltipPos,

    // Navigation
    moveViewport: handleMoveViewport,
    navigateToCell: handleNavigateToCell,
    navigateHome: handleNavigateHome,

    // Homepoint
    setHomepoint: handleSetHomepoint,
    clearHomepoint: handleClearHomepoint,

    // Viewport size
    setViewportSizeRows: handleSetViewportSizeRows,
    setViewportSizeCols: handleSetViewportSizeCols,

    // Canvas size
    setCanvasRows: handleSetCanvasRows,
    setCanvasCols: handleSetCanvasCols,
    addRow: handleAddRow,
    removeRow: handleRemoveRow,
    addColumn: handleAddColumn,
    removeColumn: handleRemoveColumn,

    // Cell selection (edit mode)
    selectCell,
    clearSelection,
    selectAll,

    // Edit operations
    handleMerge,
    handleUnmerge,
    handleDelete,
    handleResizePlacement,
    canMerge,
    canUnmerge,

    // Drag and drop - internal
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,

    // Drag and drop - external
    handleExternalDragEnter,
    handleExternalDragOver,
    handleExternalDragLeave,
    handleExternalDrop,

    // Undo/Redo
    undo: handleUndo,
    redo: handleRedo,

    // Apply/Cancel
    apply: handleApply,
    cancel: handleCancel,

    // Cell helpers
    getCellAt,
    isInViewport,
    getCellDisplay,
    getCellColor,
    getCollaboratorsAtCell,

    // Cell click
    handleCellClick,
  };
}

export default useCanvasNavigator;
