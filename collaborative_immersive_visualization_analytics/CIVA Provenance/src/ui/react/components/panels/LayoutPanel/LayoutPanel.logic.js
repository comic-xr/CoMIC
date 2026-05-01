// src/ui/react/components/panels/LayoutPanel/LayoutPanel.logic.js
// Headless logic hook for LayoutPanel
//
// This hook wraps useCanvas and exposes all the functions needed by:
// - LayoutPanel subtabs (Canvas, Views)
// - CanvasNavigator (via useCanvasNavigator)
//
// IMPORTANT: This is the bridge between useCanvas and the UI components.

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useCanvas } from "@UI/react/hooks/useCanvas.js";
import {
  getDatasetManager,
  getViewConfigurationManager,
} from "@Init/appInitializer";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { ui as log } from "@Utils/logger.js";
import {
  dispatchNavigateTo,
  dispatchMoveViewport,
} from "@UI/react/hooks/useViewportSync.js";
import {
  VIEWPORT_SIZE_EVENT,
  getInitialViewportSize,
  DEFAULT_VIEWPORT_SIZE,
} from "@UI/react/hooks/viewportState.js";
import { saveCanvasSize } from "@UI/react/hooks/canvasState.js";

// Must match the key used in useViewportSize.js
const VIEWPORT_STORAGE_KEY = "cia-viewport-size";
const VIEWPORT_POSITION_KEY = "cia-viewport-position";

/**
 * Load saved viewport size from localStorage
 * This must match the logic in useViewportSize.js to ensure consistency
 */
function loadSavedViewportSize() {
  try {
    const saved = localStorage.getItem(VIEWPORT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        typeof parsed.rows === "number" &&
        typeof parsed.cols === "number" &&
        parsed.rows >= 1 &&
        parsed.rows <= 10 &&
        parsed.cols >= 1 &&
        parsed.cols <= 10
      ) {
        return { rows: parsed.rows, cols: parsed.cols };
      }
    }
  } catch (e) {
    console.warn("[LayoutPanel.logic] Failed to load saved viewport size:", e);
  }
  // Default fallback - matches DEFAULT_VIEWPORT_SIZE in useViewportSize.js
  return { rows: 2, cols: 3 };
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const LAYOUT_MODES = {
  FREE: "free",
  FLOW: "flow",
  GRID: "grid",
};

export const FLOW_DIRECTIONS = {
  ROW: "row",
  COLUMN: "column",
};

export const TOOLS = {
  SELECT: "select",
  PAN: "pan",
  MERGE: "merge",
};

export const DROP_MODES = {
  REPLACE: "replace",
  SWAP: "swap",
  INSERT: "insert",
};

export const VIEW_MODES = {
  DETAILED: "detailed",
  COMPACT: "compact",
  MINIMAL: "minimal",
};

export const SPAWN_SIZES = {
  "1x1": { rows: 1, cols: 1 },
  "1x2": { rows: 1, cols: 2 },
  "2x1": { rows: 2, cols: 1 },
  "2x2": { rows: 2, cols: 2 },
  "2x3": { rows: 2, cols: 3 },
  "3x2": { rows: 3, cols: 2 },
  "3x3": { rows: 3, cols: 3 },
};

export const DOCK_POSITIONS = {
  LEFT_PANEL: "left-panel",
  TOP_LEFT: "top-left",
  TOP_RIGHT: "top-right",
  BOTTOM_LEFT: "bottom-left",
  BOTTOM_RIGHT: "bottom-right",
  FLOAT: "float",
  MINIMIZED: "minimized",
};

export function parseSpawnSize(sizeStr) {
  return SPAWN_SIZES[sizeStr] || SPAWN_SIZES["1x1"];
}

// Instance colors for views
export const INSTANCE_COLORS = [
  "#60a5fa", // blue
  "#34d399", // green
  "#7dd3fc", // cyan
  "#fb7185", // pink
  "#c084fc", // purple
  "#fbbf24", // amber
];

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * useLayoutPanel - Headless hook for layout panel state and actions
 *
 * @param {Object} options
 * @param {string} [options.canvasId] - Target canvas ID (uses active canvas if not provided)
 * @param {Object} [options.__testing] - Mock data for testing
 * @returns {Object} Panel state and actions
 */
export function useLayoutPanel({ canvasId, __testing } = {}) {
  // ===========================================================================
  // DATA SOURCE: useCanvas
  // ===========================================================================

  const canvasData = useCanvas(canvasId);

  const {
    canvas,
    viewport: canvasViewport,
    loading,
    error,
    isConnected,
    // Canvas operations
    moveViewport: canvasMoveViewport,
    setViewportPosition: canvasSetViewportPosition,
    setViewportSize: canvasSetViewportSize,
    addPlacement,
    updatePlacement,
    removePlacement,
    movePlacement,
    resizePlacement,
    addRow: canvasAddRow,
    addColumn: canvasAddColumn,
  } = __testing || canvasData;

  // ===========================================================================
  // CANVAS DIMENSIONS
  // ===========================================================================

  const canvasSize = useMemo(
    () => canvas?.dimensions || { rows: 4, cols: 5 },
    [canvas]
  );

  // Get the effective pane ID for dispatching navigation events
  // In tile mode, use the focused pane ID from workspaceManager
  // In tab mode, use the canvasId from props
  const getEffectivePaneId = useCallback(() => {
    // First check if there's a focused pane (tile mode)
    const focusedPaneId = workspaceManager?.getFocusedPaneId?.();
    if (focusedPaneId) {
      return focusedPaneId;
    }
    // Fall back to canvasId from props (tab mode)
    return canvasId || canvas?.id || null;
  }, [canvasId, canvas?.id]);

  // Static version for cases where we need a stable reference (like focusCell)
  const effectivePaneId = canvasId || canvas?.id || null;

  // ===========================================================================
  // VIEWPORT STATE
  // ===========================================================================

  // Initialize from useCanvas viewport if available
  const [localViewportSize, setLocalViewportSize] = useState(
    getInitialViewportSize
  );

  // Only sync from canvasViewport on initial mount (when we don't have local values yet)
  // After that, localViewportSize is the source of truth to prevent rubberbanding
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current && canvasViewport?.rows && canvasViewport?.cols) {
      setLocalViewportSize({
        rows: canvasViewport.rows,
        cols: canvasViewport.cols,
      });
      hasInitializedRef.current = true;
    }
  }, [canvasViewport?.rows, canvasViewport?.cols]);

  const [enrichmentRefreshKey, setEnrichmentRefreshKey] = useState(0);

  // Listen for view/dataset updates to trigger re-enrichment
  useEffect(() => {
    const handleRefresh = () => {
      setEnrichmentRefreshKey((k) => k + 1);
    };

    // Window events (for initial loading and view updates)
    window.addEventListener("cia:views-loaded", handleRefresh);
    window.addEventListener("cia:view-added", handleRefresh);
    window.addEventListener("cia:view-updated", handleRefresh);
    window.addEventListener("cia:datasets-loaded", handleRefresh);
    window.addEventListener("cia:dataset-added", handleRefresh);

    // Subscribe to ViewConfigurationManager's internal events (for name changes, etc.)
    const viewManager = getViewConfigurationManager();
    if (viewManager) {
      viewManager.on?.("viewUpdated", handleRefresh);
      viewManager.on?.("viewAdded", handleRefresh);
      viewManager.on?.("viewRemoved", handleRefresh);
    }

    return () => {
      window.removeEventListener("cia:views-loaded", handleRefresh);
      window.removeEventListener("cia:view-added", handleRefresh);
      window.removeEventListener("cia:view-updated", handleRefresh);
      window.removeEventListener("cia:datasets-loaded", handleRefresh);
      window.removeEventListener("cia:dataset-added", handleRefresh);

      if (viewManager) {
        viewManager.off?.("viewUpdated", handleRefresh);
        viewManager.off?.("viewAdded", handleRefresh);
        viewManager.off?.("viewRemoved", handleRefresh);
      }
    };
  }, []);

  // Listen for viewport size changes from CanvasGrid (via useViewportSize events)
  // Ignore events we dispatched ourselves to prevent feedback loops
  useEffect(() => {
    const handleViewportSizeChanged = (e) => {
      // Ignore events we dispatched ourselves
      if (e.detail?.source === 'LayoutPanel.logic') {
        return;
      }
      const { size } = e.detail;
      if (size?.rows && size?.cols) {
        setLocalViewportSize({
          rows: Math.max(1, Math.min(10, size.rows)),
          cols: Math.max(1, Math.min(10, size.cols)),
        });
      }
    };

    window.addEventListener(VIEWPORT_SIZE_EVENT, handleViewportSizeChanged);
    return () =>
      window.removeEventListener(
        VIEWPORT_SIZE_EVENT,
        handleViewportSizeChanged
      );
  }, []);

  const viewport = useMemo(
    () => ({
      row: canvasViewport?.row ?? 0,
      col: canvasViewport?.col ?? 0,
    }),
    [canvasViewport]
  );

  // Persist viewport position to localStorage for ViewLifecycleService flow-aware placement
  useEffect(() => {
    try {
      localStorage.setItem(VIEWPORT_POSITION_KEY, JSON.stringify({ row: viewport.row, col: viewport.col }));
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [viewport.row, viewport.col]);

  // IMPORTANT: localViewportSize is the source of truth for viewport size
  // This prevents rubberbanding when user changes size via navigator controls
  const viewportSize = useMemo(
    () => ({
      rows: localViewportSize.rows ?? DEFAULT_VIEWPORT_SIZE.rows,
      cols: localViewportSize.cols ?? DEFAULT_VIEWPORT_SIZE.cols,
    }),
    [localViewportSize]
  );

  // ===========================================================================
  // VIEWPORT NAVIGATION
  // ===========================================================================

  /**
   * Move viewport by delta or direction string
   * Also dispatches sync events so CanvasGrid can follow
   * Uses getFocusedPaneId() for tile mode routing
   */
  const moveViewport = useCallback(
    (deltaRowOrDirection, deltaCol) => {
      // Get the target pane ID dynamically (focused pane in tile mode)
      const targetPaneId = getEffectivePaneId();

      // Only dispatch events - CanvasGrid listens and updates its viewport
      // Don't call canvasMoveViewport directly to avoid double movement
      if (typeof deltaRowOrDirection === "string") {
        const direction = deltaRowOrDirection;
        switch (direction) {
          case "up":
            dispatchMoveViewport(-1, 0, targetPaneId);
            break;
          case "down":
            dispatchMoveViewport(1, 0, targetPaneId);
            break;
          case "left":
            dispatchMoveViewport(0, -1, targetPaneId);
            break;
          case "right":
            dispatchMoveViewport(0, 1, targetPaneId);
            break;
          case "home":
            dispatchNavigateTo(0, 0, targetPaneId);
            break;
          default:
            log.warn(`Unknown direction: ${direction}`);
        }
        return;
      }

      const deltaRow =
        typeof deltaRowOrDirection === "number" ? deltaRowOrDirection : 0;
      const dCol = typeof deltaCol === "number" ? deltaCol : 0;
      dispatchMoveViewport(deltaRow, dCol, targetPaneId);
    },
    [getEffectivePaneId]
  );

  /**
   * Set viewport position directly
   * Also dispatches sync events so CanvasGrid can follow
   * Persists to localStorage for ViewLifecycleService flow-aware placement
   * Uses getFocusedPaneId() for tile mode routing
   */
  const setViewportPosition = useCallback(
    (row, col) => {
      const targetRow = typeof row === "number" && !isNaN(row) ? row : 0;
      const targetCol = typeof col === "number" && !isNaN(col) ? col : 0;

      // Clamp to canvas bounds
      const maxRow = Math.max(0, canvasSize.rows - viewportSize.rows);
      const maxCol = Math.max(0, canvasSize.cols - viewportSize.cols);
      const clampedRow = Math.max(0, Math.min(targetRow, maxRow));
      const clampedCol = Math.max(0, Math.min(targetCol, maxCol));

      canvasSetViewportPosition?.(clampedRow, clampedCol);
      dispatchNavigateTo(clampedRow, clampedCol, getEffectivePaneId());

      // Persist to localStorage for ViewLifecycleService
      try {
        localStorage.setItem(VIEWPORT_POSITION_KEY, JSON.stringify({ row: clampedRow, col: clampedCol }));
      } catch (e) {
        // Ignore localStorage errors
      }
    },
    [canvasSetViewportPosition, canvasSize, viewportSize, getEffectivePaneId]
  );

  /**
   * Navigate to specific cell
   * Also dispatches sync events so CanvasGrid can follow
   */
  const navigateToCell = useCallback(
    (row, col) => {
      setViewportPosition(row, col);
    },
    [setViewportPosition]
  );

  /**
   * Check if a cell at (row, col) with given span is fully visible in the current viewport
   */
  const isCellVisible = useCallback(
    (row, col, rowSpan = 1, colSpan = 1) => {
      const vpRow = canvasViewport?.row ?? 0;
      const vpCol = canvasViewport?.col ?? 0;
      const vpRows = viewportSize.rows;
      const vpCols = viewportSize.cols;

      // Cell's bounding box
      const cellEndRow = row + rowSpan;
      const cellEndCol = col + colSpan;

      // Viewport's bounding box
      const vpEndRow = vpRow + vpRows;
      const vpEndCol = vpCol + vpCols;

      // Check if cell is fully contained within viewport
      return (
        row >= vpRow &&
        col >= vpCol &&
        cellEndRow <= vpEndRow &&
        cellEndCol <= vpEndCol
      );
    },
    [canvasViewport, viewportSize]
  );

  /**
   * Focus a cell: make it active and navigate viewport if needed (smart navigation)
   *
   * TODO: Revisit this implementation - considering a redesign of the focus/active system.
   * Current implementation matches Active Instance Indicator behavior but may need refinement.
   *
   * This matches the behavior of the Active Instance Indicator (SecondaryHeader):
   * 1. Set the active instance via workspaceManager (source of truth)
   * 2. Smart viewport navigation (minimum movement to show cell)
   * 3. Dispatch events for other components
   *
   * @param {string} viewId - View configuration ID
   * @param {number} row - Cell row
   * @param {number} col - Cell column
   * @param {number} rowSpan - Cell row span (default 1)
   * @param {number} colSpan - Cell col span (default 1)
   * @param {string} [paneId] - Optional pane ID for canvas-scoped focus (tile mode)
   */
  const focusCell = useCallback(
    (viewId, row, col, rowSpan = 1, colSpan = 1, paneId = null) => {
      // Get the target pane ID - use provided, or get focused pane dynamically
      const targetPaneId = paneId || getEffectivePaneId();
      log.debug(`[focusCell] Focusing viewId=${viewId} at (${row}, ${col}) span=(${rowSpan}x${colSpan}) targetPaneId=${targetPaneId}`);

      // Use targetPaneId for all pane-scoped operations
      const effectivePaneId = targetPaneId;

      // 1. Find the instance and set it as active via workspaceManager (source of truth)
      // This is the KEY step that makes it the "active" instance
      const instance = workspaceManager?.getInstanceByViewConfigId?.(viewId);
      if (instance?.instanceId) {
        // Use pane-scoped setter if we have a paneId (tile mode)
        if (effectivePaneId) {
          workspaceManager.setActiveInstanceForPane(effectivePaneId, instance.instanceId);
          log.debug(`[focusCell] Set active instance for pane ${effectivePaneId}: ${instance.instanceId}`);
          // Only set global if this pane is focused (avoid cross-pane interference)
          if (workspaceManager.getFocusedPaneId?.() === effectivePaneId) {
            workspaceManager.setActiveInstance(instance.instanceId);
            log.debug(`[focusCell] Set global active instance: ${instance.instanceId}`);
          }
        } else {
          // No pane context (tab mode) - set global directly
          workspaceManager.setActiveInstance(instance.instanceId);
          log.debug(`[focusCell] Set global active instance: ${instance.instanceId}`);
        }
      } else {
        log.debug(`[focusCell] No instance found for viewId ${viewId}`);
      }

      // 2. Smart viewport navigation - only move if cell is not visible
      if (!isCellVisible(row, col, rowSpan, colSpan)) {
        // Cell is not fully visible - calculate minimum movement
        const vpRow = canvasViewport?.row ?? 0;
        const vpCol = canvasViewport?.col ?? 0;
        const vpRows = viewportSize.rows;
        const vpCols = viewportSize.cols;

        // Calculate cell bounds
        const cellEndRow = row + rowSpan;
        const cellEndCol = col + colSpan;

        // Viewport bounds
        const vpEndRow = vpRow + vpRows;
        const vpEndCol = vpCol + vpCols;

        // Calculate new viewport position with minimum movement
        let newVpRow = vpRow;
        let newVpCol = vpCol;

        // Vertical adjustment
        if (row < vpRow) {
          // Cell is above viewport - move up
          newVpRow = row;
        } else if (cellEndRow > vpEndRow) {
          // Cell is below viewport - move down just enough
          newVpRow = cellEndRow - vpRows;
        }

        // Horizontal adjustment
        if (col < vpCol) {
          // Cell is left of viewport - move left
          newVpCol = col;
        } else if (cellEndCol > vpEndCol) {
          // Cell is right of viewport - move right just enough
          newVpCol = cellEndCol - vpCols;
        }

        // Clamp to canvas bounds
        const maxRow = Math.max(0, canvasSize.rows - vpRows);
        const maxCol = Math.max(0, canvasSize.cols - vpCols);
        newVpRow = Math.max(0, Math.min(newVpRow, maxRow));
        newVpCol = Math.max(0, Math.min(newVpCol, maxCol));

        log.debug(`[focusCell] Moving viewport from (${vpRow}, ${vpCol}) to (${newVpRow}, ${newVpCol})`);

        // Set the new viewport position
        canvasSetViewportPosition?.(newVpRow, newVpCol);
        // Include paneId in navigation event for filtering
        dispatchNavigateTo(newVpRow, newVpCol, effectivePaneId);
      } else {
        log.debug(`[focusCell] Cell already visible, not moving viewport`);
      }

      // 3. Dispatch events for other components (matches SecondaryHeader behavior)
      if (viewId) {
        const { eventBus, BUS_EVENTS } = require("@Core/events/EventBus.js");
        eventBus.emit(BUS_EVENTS.VIEW_FOCUSED, { viewId, paneId: effectivePaneId });
        window.dispatchEvent(
          new CustomEvent("cia:instance-focused", {
            detail: {
              viewId,
              instanceId: instance?.instanceId,
              paneId: effectivePaneId,
              canvasId: effectivePaneId,
              source: "focus-button",
            },
          })
        );
      }
    },
    [getEffectivePaneId, canvasViewport, viewportSize, canvasSize, canvasSetViewportPosition, isCellVisible]
  );

  // ===========================================================================
  // VIEWPORT SIZE CONTROLS
  // ===========================================================================
  const setViewportSizeRows = useCallback(
    (rows) => {
      console.log('[LayoutPanel.logic setViewportSizeRows] ENTERED with rows:', rows);
      log.info(`[setViewportSizeRows] Called with rows=${rows}`);
      const value = Math.max(1, Math.min(10, rows));
      const previousSize = {
        rows: localViewportSize.rows,
        cols: localViewportSize.cols,
      };
      const newSize = { rows: value, cols: localViewportSize.cols };

      log.info(`[setViewportSizeRows] Updating: ${previousSize.rows} → ${value}`);

      // Update local state
      setLocalViewportSize((prev) => ({ ...prev, rows: value }));

      // Persist to localStorage
      try {
        localStorage.setItem(VIEWPORT_STORAGE_KEY, JSON.stringify(newSize));
      } catch (e) {
        console.warn("[LayoutPanel.logic] Failed to save viewport size:", e);
      }

      // Update useCanvas state
      canvasSetViewportSize?.(value, localViewportSize.cols);

      // CRITICAL: Dispatch event so CanvasGrid's useViewportSize receives update
      window.dispatchEvent(
        new CustomEvent(VIEWPORT_SIZE_EVENT, {
          detail: {
            size: newSize,
            previousSize: previousSize,
            cellCount: newSize.rows * newSize.cols,
            previousCellCount: previousSize.rows * previousSize.cols,
            source: 'LayoutPanel.logic',
          },
          bubbles: true,
        })
      );
    },
    [canvasSetViewportSize, localViewportSize]
  );

  const setViewportSizeCols = useCallback(
    (cols) => {
      console.log('[LayoutPanel.logic setViewportSizeCols] ENTERED with cols:', cols);
      log.info(`[setViewportSizeCols] Called with cols=${cols}`);
      const value = Math.max(1, Math.min(10, cols));
      const previousSize = {
        rows: localViewportSize.rows,
        cols: localViewportSize.cols,
      };
      const newSize = { rows: localViewportSize.rows, cols: value };

      log.info(`[setViewportSizeCols] Updating: ${previousSize.cols} → ${value}`);

      // Update local state
      setLocalViewportSize((prev) => ({ ...prev, cols: value }));

      // Persist to localStorage
      try {
        localStorage.setItem(VIEWPORT_STORAGE_KEY, JSON.stringify(newSize));
      } catch (e) {
        console.warn("[LayoutPanel.logic] Failed to save viewport size:", e);
      }

      // Update useCanvas state
      canvasSetViewportSize?.(localViewportSize.rows, value);

      // CRITICAL: Dispatch event so CanvasGrid's useViewportSize receives update
      window.dispatchEvent(
        new CustomEvent(VIEWPORT_SIZE_EVENT, {
          detail: {
            size: newSize,
            previousSize: previousSize,
            cellCount: newSize.rows * newSize.cols,
            previousCellCount: previousSize.rows * previousSize.cols,
            source: 'LayoutPanel.logic',
          },
          bubbles: true,
        })
      );
    },
    [canvasSetViewportSize, localViewportSize]
  );

  // ===========================================================================
  // CANVAS SIZE CONTROLS
  // ===========================================================================

  const setCanvasRows = useCallback(
    async (rows) => {
      log.info(`[setCanvasRows] Called with rows=${rows}, canvas.id=${canvas?.id}`);
      if (!canvas?.id) {
        log.warn("[setCanvasRows] No canvas ID available, cannot update rows");
        return;
      }
      const value = Math.max(1, rows); // No upper limit for canvas

      // Check if reduction would orphan views
      const maxOccupiedRow = (canvas.placements || []).reduce(
        (max, p) => Math.max(max, p.row + (p.rowSpan || 1)),
        0
      );

      if (value < maxOccupiedRow) {
        log.warn(
          `Cannot reduce rows to ${value}: views occupy up to row ${maxOccupiedRow}`
        );
        return;
      }

      try {
        log.info(`[setCanvasRows] Updating canvas ${canvas.id} rows: ${canvas.dimensions?.rows} → ${value}`);
        await canvasManager.updateCanvas(canvas.id, {
          dimensions: { rows: value, cols: canvas.dimensions?.cols || canvasSize.cols },
        });
        saveCanvasSize({ rows: value, cols: canvas.dimensions?.cols || canvasSize.cols });

        // If canvas shrinks below viewport, shrink viewport too
        if (value < localViewportSize.rows) {
          log.info(`[setCanvasRows] Canvas shrunk below viewport, adjusting viewport rows to ${value}`);
          setViewportSizeRows(value);
        }
      } catch (error) {
        log.error("[setCanvasRows] Failed to update canvas:", error);
      }
    },
    [canvas, canvasSize.cols, localViewportSize.rows, setViewportSizeRows]
  );

  const setCanvasCols = useCallback(
    async (cols) => {
      console.log('[LayoutPanel.logic setCanvasCols] ENTERED with cols:', cols);
      log.info(`[setCanvasCols] Called with cols=${cols}, canvas.id=${canvas?.id}`);
      if (!canvas?.id) {
        log.warn("[setCanvasCols] No canvas ID available, cannot update cols");
        return;
      }
      const value = Math.max(1, cols); // No upper limit for canvas

      // Check if reduction would orphan views
      const maxOccupiedCol = (canvas.placements || []).reduce(
        (max, p) => Math.max(max, p.col + (p.colSpan || 1)),
        0
      );

      if (value < maxOccupiedCol) {
        log.warn(
          `Cannot reduce cols to ${value}: views occupy up to col ${maxOccupiedCol}`
        );
        return;
      }

      try {
        log.info(`[setCanvasCols] Updating canvas ${canvas.id} cols: ${canvas.dimensions?.cols} → ${value}`);
        await canvasManager.updateCanvas(canvas.id, {
          dimensions: { rows: canvas.dimensions?.rows || canvasSize.rows, cols: value },
        });
        saveCanvasSize({ rows: canvas.dimensions?.rows || canvasSize.rows, cols: value });

        // If canvas shrinks below viewport, shrink viewport too
        if (value < localViewportSize.cols) {
          log.info(`[setCanvasCols] Canvas shrunk below viewport, adjusting viewport cols to ${value}`);
          setViewportSizeCols(value);
        }
      } catch (error) {
        log.error("[setCanvasCols] Failed to update canvas:", error);
      }
    },
    [canvas, canvasSize.rows, localViewportSize.cols, setViewportSizeCols]
  );

  // Legacy addRow/addColumn
  const addRow = useCallback(async () => {
    await setCanvasRows(canvasSize.rows + 1);
  }, [setCanvasRows, canvasSize.rows]);

  const addColumn = useCallback(async () => {
    await setCanvasCols(canvasSize.cols + 1);
  }, [setCanvasCols, canvasSize.cols]);

  // ===========================================================================
  // HOMEPOINT
  // ===========================================================================

  const [homepoint, setHomepointState] = useState(null);

  const setHomepoint = useCallback((row, col) => {
    setHomepointState({ row, col });
  }, []);

  const clearHomepoint = useCallback(() => {
    setHomepointState(null);
  }, []);

  // ===========================================================================
  // PLACEMENTS → CELLS (enriched with ViewConfiguration data)
  // ===========================================================================

  // ===========================================================================
  // PLACEMENTS → CELLS (enriched with ViewConfiguration data)
  // ===========================================================================

  const rawPlacements = useMemo(() => canvas?.placements || [], [canvas]);

  const cells = useMemo(() => {
    if (!rawPlacements || rawPlacements.length === 0) return [];

    // Get manager references at call time (not import time!)
    const vcManager = getViewConfigurationManager();
    const dsManager = getDatasetManager();

    return rawPlacements.map((placement, index) => {
      // Get viewConfigurationId from placement (multiple fallback paths)
      const viewId =
        placement.getViewId?.() ||
        placement.content?.viewConfigurationId ||
        placement.viewConfigurationId ||
        null;

      // Look up ViewConfiguration for metadata
      const viewConfig = viewId ? vcManager.getView(viewId) : null;

      // =====================================================================
      // Get dataset info - MUST define these variables before using them
      // =====================================================================
      const dataset = viewConfig?.datasetId
        ? dsManager.getDataset(viewConfig.datasetId)
        : null;

      // Extract filename from dataset
      const datasetFilename = dataset?.filename || dataset?.fileName || null;

      // Build datasetName with fallbacks
      const datasetName =
        datasetFilename ||
        viewConfig?.datasetName ||
        (viewConfig?.datasetId
          ? `Dataset ${viewConfig.datasetId.slice(0, 8)}`
          : null);

      // Determine display name - MATCH useViewMetadata.js priority:
      // If view has a custom name (not default), use it
      // Otherwise fall back to dataset filename
      const viewName = viewConfig?.name;
      const isDefaultName =
        !viewName ||
        viewName === "Untitled View" ||
        viewName === "Default View" ||
        viewName === datasetFilename;

      const displayName = isDefaultName
        ? datasetFilename || viewName || placement.content?.name || placement.name || `View ${index + 1}`
        : viewName;

      // =====================================================================
      // Get instance color from workspaceManager (matches canvas display)
      // =====================================================================
      const instanceColorFromManager = viewId
        ? workspaceManager?.getViewColor?.(viewId)
        : null;
      const colorHex =
        instanceColorFromManager?.hex ||
        viewConfig?.camera?.color ||
        INSTANCE_COLORS[index % INSTANCE_COLORS.length];

      // =====================================================================
      // Return enriched cell object
      // =====================================================================
      return {
        // Placement position data
        id: placement.id,
        row: placement.row,
        col: placement.col,
        rowSpan: placement.rowSpan || 1,
        colSpan: placement.colSpan || 1,
        content: placement.content,

        // ViewConfiguration metadata
        viewConfigurationId: viewId,

        // Display name - use the computed displayName
        name: displayName,
        title: displayName,

        // Additional metadata
        description: viewConfig?.description || "",
        datasetId: viewConfig?.datasetId,
        datasetName: datasetName, // Now properly defined above

        // Color - use workspaceManager color for consistency with canvas
        color: colorHex,
        instanceColor: colorHex,
        viewColor: colorHex,

        // Status flags
        isShared: viewConfig?.visibility !== "private",
        isLinked: false, // TODO: check links
        visibility: viewConfig?.visibility || "private",
        status: viewConfig?.status || "active",
      };
    });
  }, [rawPlacements, enrichmentRefreshKey]);

  // ===========================================================================
  // PANEL UI STATE
  // ===========================================================================

  const [panelSubtab, setPanelSubtab] = useState("views");
  const [viewMode, setViewMode] = useState(VIEW_MODES.DETAILED);
  const [activeFilters, setActiveFilters] = useState(["active"]);
  const [groupBy, setGroupBy] = useState("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [spawnSize, setSpawnSize] = useState("1x1");
  const [editMode, setEditMode] = useState(false);
  const [tool, setTool] = useState(TOOLS.SELECT);
  const [dropMode, setDropMode] = useState(DROP_MODES.REPLACE);
  const [expandedViewId, setExpandedViewId] = useState(null);

  // ===========================================================================
  // MERGE / UNMERGE / DELETE OPERATIONS
  // (Defined before SELECTION STATE because keyboard shortcuts depend on deleteCells)
  // ===========================================================================

  /**
   * Merge multiple placements into one spanning placement
   * Takes the first placement's position and expands to cover all selected
   */
  const mergeCells = useCallback(
    async (placementIds) => {
      if (!canvas?.id || placementIds.length < 2) return;

      // Get all placements
      const placements = placementIds
        .map((id) => rawPlacements.find((p) => p.id === id))
        .filter(Boolean);

      if (placements.length < 2) return;

      // Calculate bounding box
      let minRow = Infinity,
        minCol = Infinity;
      let maxRow = -Infinity,
        maxCol = -Infinity;

      placements.forEach((p) => {
        minRow = Math.min(minRow, p.row);
        minCol = Math.min(minCol, p.col);
        maxRow = Math.max(maxRow, p.row + (p.rowSpan || 1));
        maxCol = Math.max(maxCol, p.col + (p.colSpan || 1));
      });

      const rowSpan = maxRow - minRow;
      const colSpan = maxCol - minCol;

      // Keep the first placement, resize it to span all
      const keepPlacement = placements[0];
      const removePlacements = placements.slice(1);

      try {
        // Remove other placements first
        await Promise.all(removePlacements.map((p) => removePlacement(p.id)));

        // Resize the kept placement
        await resizePlacement(keepPlacement.id, rowSpan, colSpan);

        // Move to top-left if needed
        if (keepPlacement.row !== minRow || keepPlacement.col !== minCol) {
          await movePlacement(keepPlacement.id, minRow, minCol);
        }

        log.info(`Merged ${placements.length} cells into one`);
      } catch (error) {
        log.error("Failed to merge cells:", error);
      }
    },
    [canvas, rawPlacements, removePlacement, resizePlacement, movePlacement]
  );

  /**
   * Unmerge a spanning placement back to 1x1
   */
  const unmergeCells = useCallback(
    async (placementId) => {
      const placement = rawPlacements.find((p) => p.id === placementId);
      if (!placement) return;

      const { rowSpan = 1, colSpan = 1 } = placement;
      if (rowSpan === 1 && colSpan === 1) {
        log.warn("Cell is not merged");
        return;
      }

      try {
        // Just resize back to 1x1
        await resizePlacement(placementId, 1, 1);
        log.info(`Unmerged cell ${placementId}`);
      } catch (error) {
        log.error("Failed to unmerge cell:", error);
      }
    },
    [rawPlacements, resizePlacement]
  );

  /**
   * Delete a placement (remove from canvas)
   */
  const deleteCells = useCallback(
    async (placementId) => {
      try {
        await removePlacement(placementId);
        log.info(`Deleted placement ${placementId}`);
      } catch (error) {
        log.error("Failed to delete placement:", error);
      }
    },
    [removePlacement]
  );

  // ===========================================================================
  // SELECTION STATE
  // ===========================================================================

  const [selectedCellIds, setSelectedCellIds] = useState([]);
  const [selectionAnchorId, setSelectionAnchorId] = useState(null); // For shift+click range

  /**
   * Select a single cell (clears other selections)
   */
  const selectCell = useCallback((cellId) => {
    setSelectedCellIds([cellId]);
    setSelectionAnchorId(cellId);
    log.debug(`[Selection] Selected cell: ${cellId}`);
  }, []);

  /**
   * Toggle cell selection (Ctrl/Cmd + click)
   */
  const toggleCellSelection = useCallback((cellId) => {
    setSelectedCellIds((prev) => {
      if (prev.includes(cellId)) {
        // Deselect
        const newSelection = prev.filter((id) => id !== cellId);
        // Update anchor if we removed it
        if (selectionAnchorId === cellId && newSelection.length > 0) {
          setSelectionAnchorId(newSelection[newSelection.length - 1]);
        }
        return newSelection;
      } else {
        // Add to selection
        setSelectionAnchorId(cellId);
        return [...prev, cellId];
      }
    });
    log.debug(`[Selection] Toggled cell: ${cellId}`);
  }, [selectionAnchorId]);

  /**
   * Select range of cells (Shift + click)
   * Selects all cells in the rectangular region from anchor to target
   */
  const selectCellRange = useCallback(
    (targetCellId) => {
      if (!selectionAnchorId) {
        // No anchor, just select the target
        selectCell(targetCellId);
        return;
      }

      const anchorCell = cells.find((c) => c.id === selectionAnchorId);
      const targetCell = cells.find((c) => c.id === targetCellId);

      if (!anchorCell || !targetCell) {
        selectCell(targetCellId);
        return;
      }

      // Calculate rectangular region
      const minRow = Math.min(anchorCell.row, targetCell.row);
      const maxRow = Math.max(
        anchorCell.row + (anchorCell.rowSpan || 1),
        targetCell.row + (targetCell.rowSpan || 1)
      );
      const minCol = Math.min(anchorCell.col, targetCell.col);
      const maxCol = Math.max(
        anchorCell.col + (anchorCell.colSpan || 1),
        targetCell.col + (targetCell.colSpan || 1)
      );

      // Find all cells that intersect this region
      const cellsInRange = cells.filter((cell) => {
        const cellEndRow = cell.row + (cell.rowSpan || 1);
        const cellEndCol = cell.col + (cell.colSpan || 1);

        // Check if cell overlaps with selection region
        return (
          cell.row < maxRow &&
          cellEndRow > minRow &&
          cell.col < maxCol &&
          cellEndCol > minCol
        );
      });

      const rangeIds = cellsInRange.map((c) => c.id);
      setSelectedCellIds(rangeIds);
      log.debug(
        `[Selection] Range selected ${rangeIds.length} cells from (${minRow},${minCol}) to (${maxRow - 1},${maxCol - 1})`
      );
    },
    [cells, selectionAnchorId, selectCell]
  );

  /**
   * Select all cells
   */
  const selectAllCells = useCallback(() => {
    const allIds = cells.map((c) => c.id);
    setSelectedCellIds(allIds);
    if (allIds.length > 0) {
      setSelectionAnchorId(allIds[0]);
    }
    log.debug(`[Selection] Selected all ${allIds.length} cells`);
  }, [cells]);

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    setSelectedCellIds([]);
    setSelectionAnchorId(null);
    log.debug("[Selection] Cleared");
  }, []);

  /**
   * Check if a cell is selected
   */
  const isCellSelected = useCallback(
    (cellId) => selectedCellIds.includes(cellId),
    [selectedCellIds]
  );

  /**
   * Get selected cells (full cell objects, not just IDs)
   */
  const selectedCells = useMemo(
    () => cells.filter((c) => selectedCellIds.includes(c.id)),
    [cells, selectedCellIds]
  );

  /**
   * Get selection count
   */
  const selectionCount = selectedCellIds.length;

  /**
   * Handle cell click with modifier keys
   * @param {string} cellId - Cell ID
   * @param {Object} event - Mouse event with modifier keys
   */
  const handleCellClick = useCallback(
    (cellId, event) => {
      const isCtrlOrCmd = event?.ctrlKey || event?.metaKey;
      const isShift = event?.shiftKey;

      if (isShift && selectionAnchorId) {
        // Shift+click: range select
        selectCellRange(cellId);
      } else if (isCtrlOrCmd) {
        // Ctrl/Cmd+click: toggle selection
        toggleCellSelection(cellId);
      } else {
        // Normal click: single select
        selectCell(cellId);
      }
    },
    [selectCell, toggleCellSelection, selectCellRange, selectionAnchorId]
  );

  // Emit selection changed event
  useEffect(() => {
    const { eventBus, BUS_EVENTS } = require("@Core/events/EventBus.js");
    eventBus.emit(BUS_EVENTS.SELECTION_CHANGED, {
      selectedIds: selectedCellIds,
      count: selectedCellIds.length,
    });
  }, [selectedCellIds]);

  // Keyboard shortcuts for selection (only when edit mode is active)
  useEffect(() => {
    if (!editMode) return;

    const handleKeyDown = (e) => {
      // Ctrl/Cmd + A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        // Only if focus is not in an input
        if (
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA"
        ) {
          e.preventDefault();
          selectAllCells();
        }
      }

      // Escape: Clear selection
      if (e.key === "Escape" && selectedCellIds.length > 0) {
        e.preventDefault();
        clearSelection();
      }

      // Delete/Backspace: Delete selected cells
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedCellIds.length > 0
      ) {
        // Only if focus is not in an input
        if (
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA"
        ) {
          e.preventDefault();
          // Delete all selected cells
          selectedCellIds.forEach((id) => deleteCells(id));
          clearSelection();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editMode, selectedCellIds, selectAllCells, clearSelection, deleteCells]);

  // ===========================================================================
  // FILTERS
  // ===========================================================================

  const toggleFilter = useCallback((filterId) => {
    setActiveFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((f) => f !== filterId)
        : [...prev, filterId]
    );
  }, []);

  const filteredCells = useMemo(() => {
    let result = [...cells];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (cell) =>
          cell.name?.toLowerCase().includes(query) ||
          cell.datasetName?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [cells, searchQuery]);

  // ===========================================================================
  // VIEW ACTIONS
  // ===========================================================================

  const closeView = useCallback(
    async (viewId) => {
      const cell = cells.find(
        (c) => c.viewConfigurationId === viewId || c.id === viewId
      );
      if (cell) {
        await removePlacement(cell.id);
      }
    },
    [cells, removePlacement]
  );

  const deleteView = useCallback(
    async (viewId) => {
      await closeView(viewId);
      await getViewConfigurationManager()?.deleteView(viewId);
    },
    [closeView]
  );

  // ===========================================================================
  // EDIT MODE
  // ===========================================================================

  const toggleEditMode = useCallback(() => {
    setEditMode((prev) => !prev);
  }, []);

  const exitEditMode = useCallback(() => {
    setEditMode(false);
  }, []);

  // ===========================================================================
  // RETURN API
  // ===========================================================================

  return {
    // Canvas data
    canvas,
    canvasSize,
    cells,
    filteredCells,
    rawPlacements,

    // Viewport state
    viewport,
    viewportSize,

    // Loading/error state
    loading,
    error,
    isConnected,

    // Viewport navigation
    moveViewport,
    navigateToCell,
    setViewportPosition,
    focusCell,
    isCellVisible,

    // Viewport size controls (FOR CANVAS NAVIGATOR)
    setViewportSizeRows,
    setViewportSizeCols,

    // Canvas size controls (FOR CANVAS NAVIGATOR)
    setCanvasRows,
    setCanvasCols,
    addRow,
    addColumn,

    // Homepoint (FOR CANVAS NAVIGATOR)
    homepoint,
    setHomepoint,
    clearHomepoint,

    // Cell operations (FOR CANVAS NAVIGATOR)
    removePlacement,
    movePlacement,
    resizePlacement,
    mergeCells,
    unmergeCells,

    // Panel UI state
    panelSubtab,
    setPanelSubtab,
    viewMode,
    setViewMode,
    activeFilters,
    toggleFilter,
    setActiveFilters,
    groupBy,
    setGroupBy,
    searchQuery,
    setSearchQuery,
    spawnSize,
    setSpawnSize,
    expandedViewId,
    setExpandedViewId,

    // Edit mode
    editMode,
    setEditMode,
    toggleEditMode,
    exitEditMode,
    tool,
    setTool,
    dropMode,
    setDropMode,

    // View actions
    closeView,
    deleteView,

    // Merge/Unmerge/Delete operations (FOR CANVAS NAVIGATOR)
    mergeCells,
    unmergeCells,
    deleteCells,

    // Selection state and handlers
    selectedCellIds,
    selectedCells,
    selectionCount,
    selectionAnchorId,
    selectCell,
    toggleCellSelection,
    selectCellRange,
    selectAllCells,
    clearSelection,
    isCellSelected,
    handleCellClick,
  };
}

export default useLayoutPanel;
