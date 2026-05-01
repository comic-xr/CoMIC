// src/ui/react/hooks/useCanvas.js
// React hook for canvas state management
//
// Provides reactive access to canvas data and viewport state.
// Connects React components to CanvasManager and SubsetManager.
// Supports Grid and Flow layout modes.

import { useState, useEffect, useCallback, useMemo } from "react";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { subsetManager } from "@Core/data/managers/SubsetManager.js";
import {
  WorkspaceCanvas,
  LAYOUT_MODES,
  FLOW_DIRECTIONS,
} from "@Core/data/models/WorkspaceCanvas.js";
import {
  VIEWPORT_SIZE_EVENT,
  getInitialViewportState,
  dispatchViewportSizeChanged,
} from "./viewportState.js";
import { canvasHistory } from "@UI/react/store/canvasHistoryStore";

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID
 * @param {string} str - String to validate
 * @returns {boolean}
 */
function isValidUUID(str) {
  return typeof str === "string" && UUID_REGEX.test(str);
}

/**
 * useCanvas - Hook for canvas and viewport state
 *
 * @param {string} canvasId - Canvas to manage (optional, uses active canvas if not provided)
 * @returns {Object} Canvas state and controls
 */
export function useCanvas(canvasId = null) {
  // Canvas state
  const [canvas, setCanvas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track the active canvas ID when no explicit canvasId is provided
  const [activeCanvasId, setActiveCanvasId] = useState(() =>
    canvasManager.getActiveCanvasId()
  );

  // Connection state
  const [connectionState, setConnectionState] = useState(
    canvasManager.getConnectionState()
  );
  const [isConnected, setIsConnected] = useState(canvasManager.isConnected());

  // Viewport state (local, not persisted)
  const [viewport, setViewport] = useState(getInitialViewportState);

  // Resolve canvas ID - use provided canvasId or fall back to activeCanvasId
  const resolvedCanvasId = canvasId || activeCanvasId;

  // Listen for active canvas changes (when no explicit canvasId provided)
  useEffect(() => {
    if (canvasId) return; // Don't listen if explicit canvasId was provided

    const handleActiveCanvasChanged = ({ canvasId: newActiveId }) => {
      setActiveCanvasId(newActiveId);
    };

    const unsub = canvasManager.on(
      "activeCanvasChanged",
      handleActiveCanvasChanged
    );
    return () => unsub();
  }, [canvasId]);

  // Subscribe to connection state changes
  useEffect(() => {
    const handleConnectionStateChanged = ({
      state,
      isConnected: connected,
    }) => {
      setConnectionState(state);
      setIsConnected(connected);
    };

    const unsub = canvasManager.on(
      "connectionStateChanged",
      handleConnectionStateChanged
    );
    return () => unsub();
  }, []);

  // Load canvas
  useEffect(() => {
    // Skip if no ID or if ID is not a valid UUID (e.g., "default")
    if (!resolvedCanvasId || !isValidUUID(resolvedCanvasId)) {
      setCanvas(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    canvasManager
      .loadCanvas(resolvedCanvasId)
      .then((loadedCanvas) => {
        setCanvas(loadedCanvas);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [resolvedCanvasId]);

  // Subscribe to canvas updates
  useEffect(() => {
    const handleCanvasUpdated = ({ canvas: updatedCanvas }) => {
      if (updatedCanvas.id === resolvedCanvasId) {
        // Re-fetch from cache and create fresh instance for React's benefit
        const cached = canvasManager.getCanvas(resolvedCanvasId);
        if (cached) {
          // Create new instance to trigger React re-render while preserving methods
          setCanvas(WorkspaceCanvas.fromJSON(cached.toJSON()));
        }
      }
    };

    const handlePlacementChanged = ({ canvasId: cId }) => {
      if (cId === resolvedCanvasId) {
        // Get the canvas from cache - it's already a WorkspaceCanvas instance
        const updated = canvasManager.getCanvas(cId);
        if (updated) {
          // Create new instance to trigger React re-render while preserving methods
          setCanvas(WorkspaceCanvas.fromJSON(updated.toJSON()));
        }
      }
    };

    const handlePlacementAdded = handlePlacementChanged;
    const handlePlacementUpdated = handlePlacementChanged;
    const handlePlacementRemoved = handlePlacementChanged;

    const unsubs = [
      canvasManager.on("canvasUpdated", handleCanvasUpdated),
      canvasManager.on("placementAdded", handlePlacementAdded),
      canvasManager.on("placementUpdated", handlePlacementUpdated),
      canvasManager.on("placementRemoved", handlePlacementRemoved),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [resolvedCanvasId]);

  // Get visible placements
  const visiblePlacements = useMemo(() => {
    if (!canvas) return [];
    // Safety check - canvas must be a WorkspaceCanvas with proper methods
    if (typeof canvas.getPlacementsInViewport !== "function") {
      console.warn("[useCanvas] Canvas missing getPlacementsInViewport method");
      return canvas.placements || [];
    }
    return canvas.getPlacementsInViewport(viewport);
  }, [canvas, viewport]);

  // Viewport navigation
  const moveViewport = useCallback(
    (deltaRow, deltaCol) => {
      setViewport((prev) => {
        const newRow = Math.max(0, prev.row + deltaRow);
        const newCol = Math.max(0, prev.col + deltaCol);

        // Clamp to canvas bounds if canvas exists
        if (canvas) {
          const maxRow = Math.max(0, canvas.dimensions.rows - prev.rows);
          const maxCol = Math.max(0, canvas.dimensions.cols - prev.cols);
          return {
            ...prev,
            row: Math.min(newRow, maxRow),
            col: Math.min(newCol, maxCol),
          };
        }

        return { ...prev, row: newRow, col: newCol };
      });
    },
    [canvas]
  );

  const setViewportPosition = useCallback(
    (row, col) => {
      setViewport((prev) => {
        if (canvas) {
          const maxRow = Math.max(0, canvas.dimensions.rows - prev.rows);
          const maxCol = Math.max(0, canvas.dimensions.cols - prev.cols);
          return {
            ...prev,
            row: Math.min(Math.max(0, row), maxRow),
            col: Math.min(Math.max(0, col), maxCol),
          };
        }
        return { ...prev, row: Math.max(0, row), col: Math.max(0, col) };
      });
    },
    [canvas]
  );

  const setViewportSize = useCallback((rows, cols) => {
    // Protect against NaN - use defaults as fallback
    const safeInputRows = typeof rows === 'number' && !isNaN(rows) ? rows : 3;
    const safeInputCols = typeof cols === 'number' && !isNaN(cols) ? cols : 3;

    // Constrain viewport to canvas dimensions (or max 10 if no canvas)
    const maxRows = canvas?.dimensions?.rows || 10;
    const maxCols = canvas?.dimensions?.cols || 10;
    const newRows = Math.max(1, Math.min(maxRows, safeInputRows));
    const newCols = Math.max(1, Math.min(maxCols, safeInputCols));

    setViewport((prev) => {
      // Only update if actually changed
      if (prev.rows !== newRows || prev.cols !== newCols) {
        // Defer event dispatch to avoid updating other components during render
        const newSize = { rows: newRows, cols: newCols };
        const prevSize = { rows: prev.rows, cols: prev.cols };
        queueMicrotask(() => {
          dispatchViewportSizeChanged(newSize, prevSize);
        });

        return {
          ...prev,
          rows: newRows,
          cols: newCols,
        };
      }
      return prev;
    });
  }, [canvas?.dimensions?.rows, canvas?.dimensions?.cols]);

  // Listen for viewport size changes from useViewportSize hook (shared state)
  // Canvas dimensions used to constrain viewport size
  const canvasRows = canvas?.dimensions?.rows || 10;
  const canvasCols = canvas?.dimensions?.cols || 10;

  useEffect(() => {
    const handleViewportSizeChanged = (e) => {
      const { size } = e.detail;
      // Validate that we have valid numbers before updating
      const inputRows = size?.rows;
      const inputCols = size?.cols;
      const validRows = typeof inputRows === 'number' && !isNaN(inputRows) && inputRows > 0;
      const validCols = typeof inputCols === 'number' && !isNaN(inputCols) && inputCols > 0;

      if (validRows && validCols) {
        setViewport((prev) => ({
          ...prev,
          // Constrain viewport to canvas dimensions
          rows: Math.max(1, Math.min(canvasRows, inputRows)),
          cols: Math.max(1, Math.min(canvasCols, inputCols)),
        }));
      }
    };

    window.addEventListener(VIEWPORT_SIZE_EVENT, handleViewportSizeChanged);
    return () =>
      window.removeEventListener(
        VIEWPORT_SIZE_EVENT,
        handleViewportSizeChanged
      );
  }, [canvasRows, canvasCols]);

  // Placement operations
  const addPlacement = useCallback(
    async (placementData) => {
      if (!resolvedCanvasId) throw new Error("No canvas selected");
      return canvasManager.addPlacement(resolvedCanvasId, placementData);
    },
    [resolvedCanvasId]
  );

  const updatePlacement = useCallback(async (placementId, updates) => {
    return canvasManager.updatePlacement(placementId, updates);
  }, []);

  const removePlacement = useCallback(async (placementId) => {
    const found = canvasManager.findPlacement?.(placementId);
    const placement = found?.placement;
    const canvasId = found?.canvas?.id || null;
    const row = placement?.row ?? 0;
    const col = placement?.col ?? 0;
    const rowSpan = placement?.rowSpan ?? 1;
    const colSpan = placement?.colSpan ?? 1;
    const content = placement?.content;
    let currentPlacementId = placementId;

    await canvasManager.removePlacement(placementId);

    if (!canvasId || !content) {
      return;
    }

    canvasHistory.record({
      type: "DELETE",
      description: "Remove placement",
      undo: async () => {
        const restored = await canvasManager.addPlacement(canvasId, {
          row,
          col,
          rowSpan,
          colSpan,
          content,
        });
        currentPlacementId = restored?.id || currentPlacementId;
      },
      redo: async () => {
        await canvasManager.removePlacement(currentPlacementId);
      },
    });
  }, []);

  const movePlacement = useCallback(async (placementId, newRow, newCol) => {
    return canvasManager.movePlacement(placementId, newRow, newCol);
  }, []);

  const resizePlacement = useCallback(async (placementId, rowSpan, colSpan) => {
    const found = canvasManager.findPlacement?.(placementId);
    const prevRowSpan = found?.placement?.rowSpan ?? 1;
    const prevColSpan = found?.placement?.colSpan ?? 1;
    const viewId =
      found?.placement?.content?.viewConfigurationId ||
      found?.placement?.content?.viewId ||
      null;

    const updated = await canvasManager.resizePlacement(
      placementId,
      rowSpan,
      colSpan
    );

    if (prevRowSpan !== rowSpan || prevColSpan !== colSpan) {
      const description = viewId
        ? `Resize view to ${rowSpan}×${colSpan}`
        : `Resize placement to ${rowSpan}×${colSpan}`;
      canvasHistory.record({
        type: "RESIZE",
        description,
        undo: () => canvasManager.resizePlacement(placementId, prevRowSpan, prevColSpan),
        redo: () => canvasManager.resizePlacement(placementId, rowSpan, colSpan),
      });
    }

    return updated;
  }, []);

  // Canvas dimension operations
  const addRow = useCallback(async () => {
    if (!canvas) return;
    const newRows = canvas.dimensions.rows + 1;
    return canvasManager.updateCanvas(canvas.id, {
      dimensions: { ...canvas.dimensions, rows: newRows },
    });
  }, [canvas]);

  const addColumn = useCallback(async () => {
    if (!canvas) return;
    const newCols = canvas.dimensions.cols + 1;
    return canvasManager.updateCanvas(canvas.id, {
      dimensions: { ...canvas.dimensions, cols: newCols },
    });
  }, [canvas]);

  const setCanvasSize = useCallback(
    async (newSize) => {
      if (!canvas) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[useCanvas] setCanvasSize called but canvas is null");
        }
        return;
      }
      // Canvas can be larger than viewport - only enforce minimum of 1
      const rows = Math.max(1, newSize.rows);
      const cols = Math.max(1, newSize.cols);

      if (process.env.NODE_ENV === "development") {
        console.log(`[useCanvas] Setting canvas size to ${rows}×${cols}`);
      }

      return canvasManager.updateCanvas(canvas.id, {
        dimensions: { rows, cols },
      });
    },
    [canvas]
  );

  // Layout mode operations
  const setLayoutMode = useCallback(
    async (mode) => {
      if (!canvas) return;
      if (mode !== LAYOUT_MODES.GRID && mode !== LAYOUT_MODES.FLOW) {
        throw new Error(`Invalid layout mode: ${mode}`);
      }
      return canvasManager.updateCanvas(canvas.id, { layoutMode: mode });
    },
    [canvas]
  );

  const setFlowDirection = useCallback(
    async (direction) => {
      if (!canvas) return;
      if (
        direction !== FLOW_DIRECTIONS.ROW &&
        direction !== FLOW_DIRECTIONS.COLUMN
      ) {
        throw new Error(`Invalid flow direction: ${direction}`);
      }
      return canvasManager.updateCanvas(canvas.id, {
        flowDirection: direction,
      });
    },
    [canvas]
  );

  const reflowPlacements = useCallback(async () => {
    if (!canvas || canvas.layoutMode !== LAYOUT_MODES.FLOW) return;
    // Trigger reflow on the canvas model
    const updates = canvas.reflowPlacements();
    // Persist the updated placements
    for (const update of updates) {
      await canvasManager.updatePlacement(update.id, {
        row: update.row,
        col: update.col,
        rowSpan: update.rowSpan,
        colSpan: update.colSpan,
      });
    }
  }, [canvas]);

  // Add view in flow mode
  const addViewInFlowMode = useCallback(
    async (viewConfigurationId) => {
      if (!canvas) return;
      if (canvas.layoutMode === LAYOUT_MODES.FLOW) {
        // Use the flow engine to get the next position
        const placement = canvas.addViewInFlowMode(viewConfigurationId);
        return canvasManager.addPlacement(canvas.id, placement.toJSON());
      } else {
        // In grid mode, find first available position
        const position = canvas.findAvailablePosition();
        return canvasManager.addPlacement(canvas.id, {
          row: position.row,
          col: position.col,
          rowSpan: 1,
          colSpan: 1,
          content: { type: "view", viewConfigurationId },
        });
      }
    },
    [canvas]
  );

  return {
    // State
    canvas,
    loading,
    error,
    viewport,
    visiblePlacements,

    // Connection state
    connectionState,
    isConnected,

    // Viewport controls
    moveViewport,
    setViewportPosition,
    setViewportSize,

    // Placement operations
    addPlacement,
    updatePlacement,
    removePlacement,
    movePlacement,
    resizePlacement,

    // Canvas operations
    addRow,
    addColumn,
    setCanvasSize,

    // Layout mode operations
    setLayoutMode,
    setFlowDirection,
    reflowPlacements,
    addViewInFlowMode,
  };
}

/**
 * useViewport - Simplified hook for just viewport state
 */
export function useViewport(initialViewport = DEFAULT_VIEWPORT) {
  const [viewport, setViewport] = useState(initialViewport);

  const moveUp = useCallback(() => {
    setViewport((prev) => ({ ...prev, row: Math.max(0, prev.row - 1) }));
  }, []);

  const moveDown = useCallback((maxRows = Infinity) => {
    setViewport((prev) => ({
      ...prev,
      row: Math.min(maxRows - prev.rows, prev.row + 1),
    }));
  }, []);

  const moveLeft = useCallback(() => {
    setViewport((prev) => ({ ...prev, col: Math.max(0, prev.col - 1) }));
  }, []);

  const moveRight = useCallback((maxCols = Infinity) => {
    setViewport((prev) => ({
      ...prev,
      col: Math.min(maxCols - prev.cols, prev.col + 1),
    }));
  }, []);

  return {
    viewport,
    setViewport,
    moveUp,
    moveDown,
    moveLeft,
    moveRight,
  };
}

/**
 * useSubsets - Hook for subset management
 */
export function useSubsets(canvasId) {
  const [subsets, setSubsets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inFocusMode, setInFocusMode] = useState(false);
  const [activeSubset, setActiveSubset] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Load subsets
  useEffect(() => {
    if (!canvasId) {
      setSubsets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    subsetManager
      .loadSubsetsForCanvas(canvasId)
      .then((loaded) => {
        setSubsets(loaded);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [canvasId]);

  // Subscribe to subset updates
  useEffect(() => {
    const handleCreated = ({ subset }) => {
      if (subset.canvasId === canvasId) {
        setSubsets((prev) => [...prev, subset]);
      }
    };

    const handleUpdated = ({ subset }) => {
      setSubsets((prev) => prev.map((s) => (s.id === subset.id ? subset : s)));
    };

    const handleDeleted = ({ subsetId }) => {
      setSubsets((prev) => prev.filter((s) => s.id !== subsetId));
    };

    const handleFocusEntered = ({ subset }) => {
      setInFocusMode(true);
      setActiveSubset(subset);
    };

    const handleFocusExited = () => {
      setInFocusMode(false);
      setActiveSubset(null);
    };

    const handleSelectionChanged = ({ selected }) => {
      setSelectedIds(selected);
      setSelectionMode(subsetManager.isInSelectionMode());
    };

    const unsubs = [
      subsetManager.on("subsetCreated", handleCreated),
      subsetManager.on("subsetUpdated", handleUpdated),
      subsetManager.on("subsetDeleted", handleDeleted),
      subsetManager.on("focusModeEntered", handleFocusEntered),
      subsetManager.on("focusModeExited", handleFocusExited),
      subsetManager.on("selectionChanged", handleSelectionChanged),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [canvasId]);

  // Actions
  const createSubset = useCallback(
    async (options) => {
      return subsetManager.createSubset(canvasId, options);
    },
    [canvasId]
  );

  const enterFocusMode = useCallback((subsetId, currentViewport) => {
    subsetManager.enterFocusMode(subsetId, currentViewport);
  }, []);

  const exitFocusMode = useCallback(() => {
    return subsetManager.exitFocusMode();
  }, []);

  const enterSelectionMode = useCallback(() => {
    subsetManager.enterSelectionMode();
  }, []);

  const exitSelectionMode = useCallback((clear = true) => {
    subsetManager.exitSelectionMode(clear);
  }, []);

  const toggleSelection = useCallback((placementId) => {
    subsetManager.toggleSelection(placementId);
  }, []);

  const addPlacementsToSubset = useCallback(
    async (subsetId, placementIds) => {
      return subsetManager.addPlacementsToSubset(subsetId, placementIds);
    },
    []
  );

  const removePlacementsFromSubset = useCallback(
    async (subsetId, placementIds) => {
      return subsetManager.removePlacementsFromSubset(subsetId, placementIds);
    },
    []
  );

  return {
    subsets,
    loading,
    inFocusMode,
    activeSubset,
    selectionMode,
    selectedIds,

    createSubset,
    enterFocusMode,
    exitFocusMode,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelection,
    addPlacementsToSubset,
    removePlacementsFromSubset,
  };
}
