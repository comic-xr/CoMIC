// src/ui/react/hooks/useCanvasSelection.js
// Hook for canvas cell selection with rubber-band support
//
// Features:
// - Click selection (toggle single cells)
// - Shift+click for range selection
// - Rubber-band drag selection
// - Rectangle validation for merge operations
// - VR-compatible selection (no hover dependency)

import { useState, useCallback, useRef, useMemo } from "react";

/**
 * Check if selected cells form a valid rectangle
 * @param {Array<{row: number, col: number}>} cells - Selected cells
 * @returns {boolean}
 */
function isValidRectangle(cells) {
  if (cells.length < 2) return false;

  // Get bounds
  const minRow = Math.min(...cells.map((c) => c.row));
  const maxRow = Math.max(...cells.map((c) => c.row));
  const minCol = Math.min(...cells.map((c) => c.col));
  const maxCol = Math.max(...cells.map((c) => c.col));

  // Check if all cells in bounds are selected
  const expectedCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
  if (cells.length !== expectedCount) return false;

  // Check each cell exists
  const cellSet = new Set(cells.map((c) => `${c.row}-${c.col}`));
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (!cellSet.has(`${r}-${c}`)) return false;
    }
  }

  return true;
}

/**
 * Get rectangle bounds from cells
 * @param {Array<{row: number, col: number}>} cells
 * @returns {{ minRow, maxRow, minCol, maxCol, rows, cols }}
 */
function getRectangleBounds(cells) {
  if (cells.length === 0) return null;

  const minRow = Math.min(...cells.map((c) => c.row));
  const maxRow = Math.max(...cells.map((c) => c.row));
  const minCol = Math.min(...cells.map((c) => c.col));
  const maxCol = Math.max(...cells.map((c) => c.col));

  return {
    minRow,
    maxRow,
    minCol,
    maxCol,
    rows: maxRow - minRow + 1,
    cols: maxCol - minCol + 1,
  };
}

/**
 * Get cells within a rubber-band rectangle
 * @param {Object} start - { row, col }
 * @param {Object} end - { row, col }
 * @returns {Array<{row, col}>}
 */
function getCellsInRect(start, end) {
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);

  const cells = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      cells.push({ row: r, col: c });
    }
  }
  return cells;
}

/**
 * useCanvasSelection - Hook for cell selection with rubber-band support
 *
 * @param {Object} options
 * @param {number} options.maxSpan - Maximum span for merged cells (default: 3)
 * @param {Function} options.onSelectionChange - Callback when selection changes
 * @param {Function} options.onMerge - Callback when merge is triggered
 * @returns {Object} Selection state and handlers
 */
export function useCanvasSelection({
  maxSpan = 3,
  onSelectionChange,
  onMerge,
} = {}) {
  // Selected cells
  const [selectedCells, setSelectedCells] = useState([]);

  // Rubber-band state
  const [rubberBand, setRubberBand] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastClickRef = useRef(null);

  // Computed values
  const bounds = useMemo(
    () => getRectangleBounds(selectedCells),
    [selectedCells]
  );
  const canMerge = useMemo(() => {
    if (!isValidRectangle(selectedCells)) return false;
    if (!bounds) return false;
    return bounds.rows <= maxSpan && bounds.cols <= maxSpan;
  }, [selectedCells, bounds, maxSpan]);

  // Toggle a single cell selection
  const toggleCell = useCallback(
    (row, col) => {
      setSelectedCells((prev) => {
        const exists = prev.find((c) => c.row === row && c.col === col);
        const next = exists
          ? prev.filter((c) => !(c.row === row && c.col === col))
          : [...prev, { row, col }];
        onSelectionChange?.(next);
        return next;
      });
      lastClickRef.current = { row, col };
    },
    [onSelectionChange]
  );

  // Range select (shift+click)
  const rangeSelectTo = useCallback(
    (row, col) => {
      if (!lastClickRef.current) {
        toggleCell(row, col);
        return;
      }

      const cells = getCellsInRect(lastClickRef.current, { row, col });
      setSelectedCells(cells);
      onSelectionChange?.(cells);
    },
    [toggleCell, onSelectionChange]
  );

  // Handle click on cell
  const handleCellClick = useCallback(
    (row, col, event) => {
      if (event?.shiftKey && lastClickRef.current) {
        rangeSelectTo(row, col);
      } else {
        toggleCell(row, col);
      }
    },
    [toggleCell, rangeSelectTo]
  );

  // Start rubber-band selection
  const startRubberBand = useCallback((row, col, clientX, clientY) => {
    setIsDragging(true);
    setRubberBand({
      startRow: row,
      startCol: col,
      endRow: row,
      endCol: col,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
    });
  }, []);

  // Update rubber-band during drag
  const updateRubberBand = useCallback(
    (row, col, clientX, clientY) => {
      if (!isDragging) return;

      setRubberBand((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          endRow: row,
          endCol: col,
          currentX: clientX,
          currentY: clientY,
        };
      });
    },
    [isDragging]
  );

  // End rubber-band selection
  const endRubberBand = useCallback(() => {
    if (rubberBand) {
      const cells = getCellsInRect(
        { row: rubberBand.startRow, col: rubberBand.startCol },
        { row: rubberBand.endRow, col: rubberBand.endCol }
      );
      setSelectedCells(cells);
      onSelectionChange?.(cells);
    }
    setIsDragging(false);
    setRubberBand(null);
  }, [rubberBand, onSelectionChange]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedCells([]);
    setRubberBand(null);
    setIsDragging(false);
    lastClickRef.current = null;
    onSelectionChange?.([]);
  }, [onSelectionChange]);

  // Select all cells in a range
  const selectRange = useCallback(
    (startRow, startCol, endRow, endCol) => {
      const cells = getCellsInRect(
        { row: startRow, col: startCol },
        { row: endRow, col: endCol }
      );
      setSelectedCells(cells);
      onSelectionChange?.(cells);
    },
    [onSelectionChange]
  );

  // Trigger merge
  const triggerMerge = useCallback(() => {
    if (!canMerge || !bounds) return false;

    onMerge?.({
      row: bounds.minRow,
      col: bounds.minCol,
      rowSpan: bounds.rows,
      colSpan: bounds.cols,
      cells: selectedCells,
    });

    clearSelection();
    return true;
  }, [canMerge, bounds, selectedCells, onMerge, clearSelection]);

  // Check if a cell is selected
  const isCellSelected = useCallback(
    (row, col) => {
      return selectedCells.some((c) => c.row === row && c.col === col);
    },
    [selectedCells]
  );

  // Get rubber-band rectangle style (for rendering overlay)
  const getRubberBandStyle = useCallback(
    (gridElement, cellSize = 100, gap = 8) => {
      if (!rubberBand || !gridElement) return null;

      const startX = Math.min(rubberBand.startX, rubberBand.currentX);
      const startY = Math.min(rubberBand.startY, rubberBand.currentY);
      const width = Math.abs(rubberBand.currentX - rubberBand.startX);
      const height = Math.abs(rubberBand.currentY - rubberBand.startY);

      const gridRect = gridElement.getBoundingClientRect();

      return {
        position: "fixed",
        left: `${startX}px`,
        top: `${startY}px`,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: "none",
      };
    },
    [rubberBand]
  );

  return {
    // State
    selectedCells,
    rubberBand,
    isDragging,
    bounds,
    canMerge,

    // Cell selection
    toggleCell,
    handleCellClick,
    isCellSelected,
    clearSelection,
    selectRange,

    // Rubber-band
    startRubberBand,
    updateRubberBand,
    endRubberBand,
    getRubberBandStyle,

    // Merge
    triggerMerge,
  };
}

export default useCanvasSelection;
