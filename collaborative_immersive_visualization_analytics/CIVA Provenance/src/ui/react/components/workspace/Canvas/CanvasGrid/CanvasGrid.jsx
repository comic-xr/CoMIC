// src/ui/react/components/workspace/Canvas/CanvasGrid/CanvasGrid.jsx
// Main canvas grid component - renders visible placements
//
// ARCHITECTURE (Updated December 2025):
// - Separates Canvas Grid (data - can be huge) from Viewport (render - visible cells)
// - Uses useCanvasDimensions for robust measurement and resize handling
// - Progressive UI degradation based on cell size (full → compact → thumbnail → snapshot)
// - Isolation mode overlay for working with tiny cells
// - Virtual scrolling for large canvases
// - No minimum cell sizes - true zoom behavior
//
// Key components:
// - Canvas Grid: The actual data grid (can be 100×350 cells)
// - Viewport: How many cells are visible/rendered at once (e.g., 3×3)
// - Render Mode: UI complexity based on cell size

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { CanvasCell } from '@UI/react/components/workspace';
import { ConnectionOverlay } from '../ConnectionOverlay';
import { CanvasEdgeDropZones } from './CanvasEdgeDropZone';
import { IsolationOverlay, useIsolationMode } from '@UI/react/components/workspace/Canvas/IsolationOverlay';
import { SelectionContextMenu } from '../SelectionContextMenu';
import { useCanvas, useSubsets } from '@UI/react/hooks/useCanvas.js';
import { useViewportSize } from '@UI/react/hooks';
import { useCanvasDimensions, RENDER_MODES } from '@UI/react/hooks/useCanvasDimensions.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { getViewConfigurationManager, getDatasetManager } from '@Init/appInitializer.js';
import { useViewportEventListener, dispatchViewportChanged } from '@UI/react/hooks/useViewportSync';
import { useViewStack, VIEW_TYPES } from '@UI/react/hooks/useViewStack.js';
import { LAYOUT_MODES, FLOW_DIRECTIONS } from '@Core/data/models/WorkspaceCanvas.js';
import { useCanvasFocus } from '@UI/react/context/CanvasFocusContext';
import { workspace as log } from '@Utils/logger.js';
import { canvasHistory } from '@UI/react/store/canvasHistoryStore';
import './CanvasGrid.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

// 8px gap per canvas-theme-explorer-v2 prototype specification
const GAP = 8; // Gap between cells in pixels
const VIEWPORT_PADDING = { top: 12, left: 12 };

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

function LoadingState({ message = 'Preparing workspace...', error = null }) {
    return (
        <div className="canvas-grid__loader">
            {error ? (
                <>
                    <div className="canvas-grid__error-icon"><Icon name="warning" size={24} /></div>
                    <div className="canvas-grid__error-message">{error.message}</div>
                    <div className="canvas-grid__error-hint">
                        Try resizing the window or refreshing the page.
                    </div>
                </>
            ) : (
                <>
                    <div className="canvas-grid__spinner" />
                    <div>{message}</div>
                </>
            )}
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CanvasGrid - The main workspace grid
 *
 * Renders a viewport-sized grid with placements positioned according
 * to their row/col coordinates. Only placements visible in the viewport
 * are rendered.
 *
 * Supports two layout modes:
 * - Grid: Manual placement with cell merging
 * - Flow: Auto-arrange with reflow on add/remove
 */
export function CanvasGrid({
    canvasId,
    onCellClick,
    onCellDoubleClick,
    onPlacementDoubleClick,
    onAddContent,
    onRemovePlacement,
    onAddRow,
    onAddColumn,
    highlightedPlacementId,
    layoutMode: propLayoutMode,
    flowDirection: propFlowDirection,
    onLayoutModeChange,
    onFlowDirectionChange,
    onOpenSubsetSelector,
    showCoordinates = false,
    showViewGroupBorders = false,
    viewGroups = [],
}) {
    const gridRef = useRef(null);

    // Edit mode state
    const [editMode, setEditMode] = useState(false);
    const [selectedCells, setSelectedCells] = useState([]);
    const [minimapExpanded, setMinimapExpanded] = useState(false);
    const [activeTool, setActiveTool] = useState('select');
    const [selectionModifierHeld, setSelectionModifierHeld] = useState(false);

    // Drag state for edge drop zones
    const [isDragActive, setIsDragActive] = useState(false);
    const [dragModifiers, setDragModifiers] = useState({ shift: false, ctrl: false, alt: false });

    // Pan state (for pan tool)
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0, viewportRow: 0, viewportCol: 0 });

    // Merge mode state
    const [mergeMode, setMergeMode] = useState(false);

    // Listen for edit mode, tool, and merge mode changes from header
    useEffect(() => {
        const handleEditModeChange = (e) => {
            if (e?.detail?.canvasId && e.detail.canvasId !== canvasId) return;
            setEditMode(e.detail.editMode);
        };
        const handleToolChange = (e) => {
            if (e?.detail?.canvasId && e.detail.canvasId !== canvasId) return;
            setActiveTool(e.detail.tool);
            // Entering a tool also enables edit mode
            if (e.detail.tool !== 'select') {
                setEditMode(true);
            }
        };
        const handleMergeModeChange = (e) => {
            if (e?.detail?.canvasId && e.detail.canvasId !== canvasId) return;
            setMergeMode(e.detail.mergeMode);
        };

        window.addEventListener('canvas:editModeChange', handleEditModeChange);
        window.addEventListener('canvas:toolChange', handleToolChange);
        window.addEventListener('canvas:mergeModeChange', handleMergeModeChange);

        return () => {
            window.removeEventListener('canvas:editModeChange', handleEditModeChange);
            window.removeEventListener('canvas:toolChange', handleToolChange);
            window.removeEventListener('canvas:mergeModeChange', handleMergeModeChange);
        };
    }, [canvasId]);

    // Active view tracking - for performance optimization
    // Only the active view mounts InstanceViewport in THUMBNAIL/SNAPSHOT modes
    const [activeViewId, setActiveViewId] = useState(null);

    // LRU cache of recently active views for warm-pausing
    // These views keep their InstanceViewport mounted but paused (no GPU work)
    // This enables fast switching between recently used views
    const MAX_WARM_INSTANCES = 3; // Budget for paused instances
    const [recentViewIds, setRecentViewIds] = useState([]);

    // Context menu state
    const [contextMenu, setContextMenu] = useState({
        isOpen: false,
        position: null,
        cells: [],
    });

    // ==========================================================================
    // CANVAS DATA HOOK
    // ==========================================================================

    const {
        canvas,
        loading: canvasLoading,
        error: canvasError,
        viewport,
        visiblePlacements,
        moveViewport,
        addPlacement,
        setLayoutMode,
        setFlowDirection,
        connectionState,
        isConnected,
    } = useCanvas(canvasId);

    // ==========================================================================
    // CANVAS FOCUS CONTEXT (for tile mode pane-scoped state)
    // ==========================================================================
    // If we're inside a CanvasFocusProvider (tile mode), use the paneId for
    // event filtering. This allows multiple viewports of the same canvas.

    const canvasFocusContext = useCanvasFocus();
    // Use paneId from context if available, otherwise fall back to canvasId
    const effectivePaneId = canvasFocusContext?.paneId || canvasId;

    // ==========================================================================
    // VIEWPORT SIZE HOOK (how many cells visible)
    // ==========================================================================

    useViewportEventListener({
        onNavigateTo: useCallback((row, col) => {
            if (process.env.NODE_ENV === 'development') {
                log.debug(`[CanvasGrid] Viewport sync: navigate to [${row}, ${col}]`);
            }
            // We can't use setViewportPosition directly from useCanvas because
            // it doesn't exist as a direct function. We need to calculate delta.
            // Actually, useCanvas does have moveViewport and we can calculate the delta.
            const currentRow = viewport?.row ?? 0;
            const currentCol = viewport?.col ?? 0;
            const deltaRow = row - currentRow;
            const deltaCol = col - currentCol;

            if (deltaRow !== 0 || deltaCol !== 0) {
                // Use the moveViewport from useCanvas
                moveViewport(deltaRow, deltaCol);
            }
        }, [viewport?.row, viewport?.col, moveViewport]),

        onMoveViewport: useCallback((deltaRow, deltaCol) => {
            if (process.env.NODE_ENV === 'development') {
                console.log(`[CanvasGrid] Viewport sync: move by [${deltaRow}, ${deltaCol}]`);
            }
            moveViewport(deltaRow, deltaCol);
        }, [moveViewport]),

        // Use effectivePaneId for proper filtering in tile mode
        paneId: effectivePaneId,
        canvasId: canvasId, // Keep for backward compatibility
    });


    const {
        viewportSize,
        isMinSize,
        isMaxSize,
        incrementViewportSize,
        decrementViewportSize,
        setViewportSize,
        resetViewportSize,
    } = useViewportSize(canvas?.dimensions);

    // Effective viewport combines position from useCanvas with size from useViewportSize
    const effectiveViewport = useMemo(() => ({
        row: viewport.row,
        col: viewport.col,
        rows: viewportSize.rows,
        cols: viewportSize.cols,
    }), [viewport.row, viewport.col, viewportSize.rows, viewportSize.cols]);

    useEffect(() => {
        if (!viewport || !viewportSize) return;
        // Use effectivePaneId for proper identification in tile mode
        dispatchViewportChanged({
            row: viewport.row,
            col: viewport.col,
            rows: viewportSize.rows,
            cols: viewportSize.cols,
        }, effectivePaneId);
    }, [viewport?.row, viewport?.col, viewportSize?.rows, viewportSize?.cols, effectivePaneId]);

    // ==========================================================================
    // CLAMP VIEWPORT POSITION WHEN SIZE CHANGES (NEW)
    // ==========================================================================
    // When viewport size increases (zoom out), positions at the edge may become
    // invalid. This effect clamps the position to keep cells accessible.

    useEffect(() => {
        if (!canvas?.dimensions) return;

        const maxRow = Math.max(0, canvas.dimensions.rows - viewportSize.rows);
        const maxCol = Math.max(0, canvas.dimensions.cols - viewportSize.cols);

        // Check if current position exceeds new bounds
        if (viewport.row > maxRow || viewport.col > maxCol) {
            const clampedRow = Math.min(viewport.row, maxRow);
            const clampedCol = Math.min(viewport.col, maxCol);

            // Calculate delta to move viewport to valid position
            const deltaRow = clampedRow - viewport.row;
            const deltaCol = clampedCol - viewport.col;

            if (deltaRow !== 0 || deltaCol !== 0) {
                moveViewport(deltaRow, deltaCol);
            }
        }
    }, [viewportSize.rows, viewportSize.cols, canvas?.dimensions, viewport.row, viewport.col, moveViewport]);


    useEffect(() => {
        const handleViewportSizeChanged = (e) => {
            const { size, previousSize } = e.detail;
            if (size?.rows && size?.cols) {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`[CanvasGrid] Viewport size changed: ${previousSize?.rows}x${previousSize?.cols} → ${size.rows}x${size.cols}`);
                }
                // Note: We don't need to do anything here because useViewportSize
                // is already being used in this component. The hook shares state
                // via the event system. If viewportSize isn't updating, check that
                // useViewportSize is correctly listening for this event.
            }
        };

        window.addEventListener('cia:viewport-size-changed', handleViewportSizeChanged);
        return () => window.removeEventListener('cia:viewport-size-changed', handleViewportSizeChanged);
    }, []);

    // ==========================================================================
    // ACTIVE VIEW TRACKING (Performance optimization)
    // ==========================================================================
    // Listen for instance focus events to track which view is active.
    // Only the active view mounts InstanceViewport in THUMBNAIL/SNAPSHOT modes,
    // reducing WebGL/GPU load from N instances to 0-1.

    useEffect(() => {
        const handleInstanceFocused = (e) => {
            // Note: The event uses 'viewId' not 'viewConfigId'
            const { viewId, paneId: eventPaneId } = e.detail || {};

            // DEBUG: Log all instance-focused events for debugging cross-pane issues
            console.log(`[CanvasGrid] instance-focused event received:`, {
                viewId,
                eventPaneId,
                effectivePaneId,
                focusedPaneId: workspaceManager?.getFocusedPaneId?.(),
            });

            // Strict paneId filtering to prevent cross-pane interference in tile mode
            if (eventPaneId) {
                // Event targets a specific pane - only handle if it's us
                if (effectivePaneId && eventPaneId !== effectivePaneId) {
                    console.log(`[CanvasGrid] FILTERED OUT: event paneId ${eventPaneId} !== our paneId ${effectivePaneId}`);
                    return;
                }
            } else if (effectivePaneId) {
                // Event has no target pane but we have a paneId (tile mode)
                // Only handle if we're the focused pane
                const focusedPaneId = workspaceManager?.getFocusedPaneId?.();
                if (focusedPaneId && focusedPaneId !== effectivePaneId) {
                    console.log(`[CanvasGrid] FILTERED OUT: not the focused pane (focused: ${focusedPaneId}, we are: ${effectivePaneId})`);
                    return;
                }
                // No focused pane set - don't handle to prevent cross-pane interference
                if (!focusedPaneId) {
                    console.log(`[CanvasGrid] FILTERED OUT: no focused pane set, we have paneId ${effectivePaneId}`);
                    return;
                }
            }
            // No effectivePaneId means tab mode - handle all events
            console.log(`[CanvasGrid] HANDLING event for paneId: ${effectivePaneId || 'tab-mode'}, viewId: ${viewId}`);

            if (viewId) {
                setActiveViewId((prevActiveId) => {
                    // Update LRU cache when active view changes
                    if (prevActiveId && prevActiveId !== viewId) {
                        setRecentViewIds((prevRecent) => {
                            // Build LRU list: [prevActive, ...filtered], max MAX_WARM_INSTANCES
                            // 1. Remove new active view from recent (it's now LIVE, not WARM)
                            // 2. Remove prevActive from filtered (will add to front)
                            const withoutNew = prevRecent.filter(id => id !== viewId);
                            const withoutPrev = withoutNew.filter(id => id !== prevActiveId);
                            // 3. Build updated list with prevActive at front
                            const updated = [prevActiveId, ...withoutPrev].slice(0, MAX_WARM_INSTANCES);

                            // DEV ASSERTIONS: Verify LRU invariants
                            if (process.env.NODE_ENV === 'development') {
                                // Invariant 1: activeViewId should never be in recentViewIds
                                if (updated.includes(viewId)) {
                                    console.error('[LRU BUG] activeViewId found in recentViewIds:', viewId, updated);
                                }
                                // Invariant 2: No duplicates in recentViewIds
                                const uniqueSet = new Set(updated);
                                if (uniqueSet.size !== updated.length) {
                                    console.error('[LRU BUG] Duplicates in recentViewIds:', updated);
                                }
                                // Debug log for instrumentation
                                if (window.__CIA_DEBUG_RENDER) {
                                    log.debug(`[LRU] LIVE: ${viewId.slice(0, 8)}, WARM: [${updated.map(id => id.slice(0, 8)).join(', ')}]`);
                                }
                            }

                            return updated;
                        });
                    }
                    return viewId;
                });

                if (process.env.NODE_ENV === 'development') {
                    log.debug(`[CanvasGrid] Active view changed: ${viewId}`);
                }
            }
        };

        window.addEventListener('cia:instance-focused', handleInstanceFocused);
        return () => window.removeEventListener('cia:instance-focused', handleInstanceFocused);
    }, [effectivePaneId]);
    // ==========================================================================
    // CONTAINER MEASUREMENT HOOK (robust resize handling)
    // ==========================================================================

    // Memoize dimensions config to prevent re-render loop
    const dimensionsConfig = useMemo(() => ({
        viewportCols: effectiveViewport.cols,
        viewportRows: effectiveViewport.rows,
        gap: GAP,
        padding: {
            top: 12,
            right: 12,
            bottom: 12,
            left: 12,
        },
    }), [effectiveViewport.cols, effectiveViewport.rows]);

    const {
        isReady: measurementsReady,
        measurementError,
        containerSize,
        cellSize,
        renderMode,
        measureRef,
        remeasure,
    } = useCanvasDimensions(dimensionsConfig);

    // ==========================================================================
    // ISOLATION MODE HOOK (for tiny cells)
    // ==========================================================================

    const {
        isolatedCell,
        isIsolationOpen,
        isolateCell,
        exitIsolation,
        shouldTriggerIsolation,
        renderSize: isolationRenderSize,
        setRenderSize: setIsolationRenderSize,
    } = useIsolationMode({ renderMode });

    // ==========================================================================
    // SUBSET SELECTION (for multi-select operations)
    // ==========================================================================

    const {
        selectionMode,
        selectedIds,
        toggleSelection,
        exitSelectionMode,
        inFocusMode,
        activeSubset,
    } = useSubsets(canvasId);

    // ==========================================================================
    // VIEW STACK HOOK (for focus mode navigation)
    // ==========================================================================
    // Note: CanvasGrid must be used within ViewStackProvider (in CanvasWorkspace)

    const {
        isFocusView,
        isSubsetView,
        currentView,
        focusView,
        goBack: exitFocusMode,
    } = useViewStack();

    // ==========================================================================
    // DERIVED STATE
    // ==========================================================================

    // Use prop layout mode if provided, otherwise use canvas state
    const layoutMode = propLayoutMode || canvas?.layoutMode || LAYOUT_MODES.FLOW;
    const flowDirection = propFlowDirection || canvas?.flowDirection || FLOW_DIRECTIONS.ROW;
    const isFlowMode = layoutMode === LAYOUT_MODES.FLOW;
    const isGridMode = layoutMode === LAYOUT_MODES.GRID;

    // Canvas dimensions
    const canvasDimensions = useMemo(() => ({
        rows: canvas?.dimensions?.rows || 10,
        cols: canvas?.dimensions?.cols || 10,
    }), [canvas?.dimensions?.rows, canvas?.dimensions?.cols]);

    // ==========================================================================
    // PAN TOOL HANDLERS
    // ==========================================================================

    const handlePanStart = useCallback((e) => {
        if (activeTool !== 'pan') return;

        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            viewportRow: viewport.row,
            viewportCol: viewport.col,
        };

        // Add cursor style
        document.body.style.cursor = 'grabbing';
    }, [activeTool, viewport.row, viewport.col]);

    const handlePanMove = useCallback((e) => {
        if (!isPanning || activeTool !== 'pan') return;

        const deltaX = e.clientX - panStartRef.current.x;
        const deltaY = e.clientY - panStartRef.current.y;

        // Convert pixel delta to cell delta (invert for natural panning)
        // Threshold: move viewport after dragging ~half a cell width/height
        const cellThresholdX = (cellSize.width + GAP) / 2;
        const cellThresholdY = (cellSize.height + GAP) / 2;

        const cellDeltaCol = Math.round(-deltaX / cellThresholdX);
        const cellDeltaRow = Math.round(-deltaY / cellThresholdY);

        // Calculate new viewport position
        const newRow = Math.max(0, panStartRef.current.viewportRow + cellDeltaRow);
        const newCol = Math.max(0, panStartRef.current.viewportCol + cellDeltaCol);

        // Only move if position changed
        const currentRowDelta = newRow - viewport.row;
        const currentColDelta = newCol - viewport.col;

        if (currentRowDelta !== 0 || currentColDelta !== 0) {
            moveViewport(currentRowDelta, currentColDelta);
        }
    }, [isPanning, activeTool, cellSize, viewport.row, viewport.col, moveViewport]);

    const handlePanEnd = useCallback(() => {
        if (isPanning) {
            setIsPanning(false);
            document.body.style.cursor = '';
        }
    }, [isPanning]);

    // Add pan event listeners
    useEffect(() => {
        if (activeTool === 'pan') {
            window.addEventListener('mousemove', handlePanMove);
            window.addEventListener('mouseup', handlePanEnd);
            window.addEventListener('mouseleave', handlePanEnd);

            return () => {
                window.removeEventListener('mousemove', handlePanMove);
                window.removeEventListener('mouseup', handlePanEnd);
                window.removeEventListener('mouseleave', handlePanEnd);
            };
        }
    }, [activeTool, handlePanMove, handlePanEnd]);

    // ==========================================================================
    // RETRY CONNECTION
    // ==========================================================================

    const handleRetryConnection = useCallback(() => {
        if (canvasId) {
            canvasManager.handleReconnecting();
            canvasManager.loadCanvas(canvasId).catch(() => {
                // Error will be handled by connection state
            });
        }
    }, [canvasId]);

    // ==========================================================================
    // KEYBOARD NAVIGATION
    // ==========================================================================

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Skip if typing in an input or textarea
            if (e.target.tagName === 'INPUT' ||
                e.target.tagName === 'TEXTAREA' ||
                e.target.isContentEditable) {
                return;
            }

            // Arrow keys - require grid focus for directional navigation
            if (gridRef.current?.contains(document.activeElement)) {
                const arrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);

                if (arrowKey) {
                    e.preventDefault();

                    // Calculate direction
                    const deltaRow = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
                    const deltaCol = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;

                    // If cells are selected, move/extend selection
                    if (selectedCells.length > 0) {
                        const lastSelected = selectedCells[selectedCells.length - 1];
                        const newRow = Math.max(0, lastSelected.row + deltaRow);
                        const newCol = Math.max(0, lastSelected.col + deltaCol);

                        // Find placement at new position
                        const newPlacement = canvas?.placements?.find(
                            p => p.row === newRow && p.col === newCol
                        );

                        if (newPlacement) {
                            const newCellData = { row: newRow, col: newCol, placement: newPlacement };

                            if (e.shiftKey) {
                                // Shift+Arrow: extend selection
                                const alreadySelected = selectedCells.some(
                                    sc => sc.row === newRow && sc.col === newCol
                                );
                                if (!alreadySelected) {
                                    setSelectedCells(prev => [...prev, newCellData]);
                                }
                            } else {
                                // Arrow only: move selection to new cell
                                setSelectedCells([newCellData]);
                            }
                        }
                    } else {
                        // No selection - move viewport (original behavior)
                        moveViewport(deltaRow, deltaCol);
                    }
                }
            }

            // ZOOM KEYS - Work globally (anywhere on page)
            // + / = : Zoom IN (fewer cells, larger)
            // - / _ : Zoom OUT (more cells, smaller - bird's eye)
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                decrementViewportSize(); // Zoom IN = fewer cells = decrement
                requestAnimationFrame(() => gridRef.current?.focus());
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                incrementViewportSize(); // Zoom OUT = more cells = increment
                requestAnimationFrame(() => gridRef.current?.focus());
            }

            // Number key presets - work globally
            if (e.key === '1' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                setViewportSize?.(1, 1);
            } else if (e.key === '2' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                // 2x2 
                setViewportSize?.(2, 2);
            } else if (e.key === '3' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                // 3x3
                setViewportSize?.(3, 3);
            } else if (e.key === '0' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                // 10x10 bird's eye (max)
                setViewportSize?.(10, 10);
            }

            // Home key - reset to default viewport
            if (e.key === 'Home') {
                e.preventDefault();
                resetViewportSize?.();
                requestAnimationFrame(() => gridRef.current?.focus());
            }

            // Ctrl+Shift+A - Select all cells with views (Ctrl+A conflicts with annotations)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
                // Only if grid has focus
                if (gridRef.current?.contains(document.activeElement)) {
                    e.preventDefault();
                    e.stopPropagation();
                    const cellsWithViews = (canvas?.placements || [])
                        .filter(p => p.content?.type === 'view')
                        .map(p => ({
                            row: p.row,
                            col: p.col,
                            placement: p,
                        }));
                    setSelectedCells(cellsWithViews);
                }
            }

            // Escape - Exit focus/subset mode first, then deselect all
            if (e.key === 'Escape') {
                // Priority 1: Exit focus mode if in it
                if (isFocusView && exitFocusMode) {
                    e.preventDefault();
                    exitFocusMode();
                    return;
                }

                // Priority 1.5: Exit subset mode if in it
                if (isSubsetView && exitFocusMode) {
                    e.preventDefault();
                    exitFocusMode();
                    return;
                }

                // Priority 2: Deselect selected cells
                if (selectedCells.length > 0) {
                    e.preventDefault();
                    setSelectedCells([]);
                }
                // Also close context menu
                if (contextMenu.isOpen) {
                    setContextMenu({ isOpen: false, position: null, cells: [] });
                }
            }

            // Tab / Shift+Tab - Cycle through cells with views
            if (e.key === 'Tab' && gridRef.current?.contains(document.activeElement)) {
                const cellsWithViews = (canvas?.placements || [])
                    .filter(p => p.content?.type === 'view')
                    .sort((a, b) => {
                        // Sort by row first, then by column
                        if (a.row !== b.row) return a.row - b.row;
                        return a.col - b.col;
                    });

                if (cellsWithViews.length > 0) {
                    e.preventDefault();

                    // Find current index
                    let currentIndex = -1;
                    if (selectedCells.length > 0) {
                        const lastSelected = selectedCells[selectedCells.length - 1];
                        currentIndex = cellsWithViews.findIndex(
                            p => p.row === lastSelected.row && p.col === lastSelected.col
                        );
                    }

                    // Calculate next index (wrap around)
                    let nextIndex;
                    if (e.shiftKey) {
                        // Shift+Tab - go backwards
                        nextIndex = currentIndex <= 0 ? cellsWithViews.length - 1 : currentIndex - 1;
                    } else {
                        // Tab - go forwards
                        nextIndex = currentIndex >= cellsWithViews.length - 1 ? 0 : currentIndex + 1;
                    }

                    const nextPlacement = cellsWithViews[nextIndex];
                    setSelectedCells([{
                        row: nextPlacement.row,
                        col: nextPlacement.col,
                        placement: nextPlacement,
                    }]);

                    // Emit focus event for the selected view (include paneId for tile mode)
                    if (nextPlacement.content?.viewConfigurationId) {
                        window.dispatchEvent(new CustomEvent('cia:instance-focused', {
                            detail: {
                                viewId: nextPlacement.content.viewConfigurationId,
                                paneId: effectivePaneId,
                            }
                        }));
                    }
                }
            }

            // Enter - Activate/isolate selected cell
            if (e.key === 'Enter' && selectedCells.length === 1) {
                e.preventDefault();
                const selected = selectedCells[0];
                if (selected.placement) {
                    // Check if should isolate (for small cells) or just focus
                    if (shouldTriggerIsolation(renderMode)) {
                        isolateCell({
                            id: selected.placement.id,
                            viewId: selected.placement.content?.viewConfigurationId,
                            name: getPlacementName(selected.placement),
                            row: selected.row,
                            col: selected.col,
                        });
                    } else {
                        // Emit focus event (include paneId for tile mode)
                        if (selected.placement.content?.viewConfigurationId) {
                            window.dispatchEvent(new CustomEvent('cia:instance-focused', {
                                detail: {
                                    viewId: selected.placement.content.viewConfigurationId,
                                    paneId: effectivePaneId,
                                }
                            }));
                        }
                    }
                }
            }

            // Space - Toggle selection of focused cell (without moving)
            if (e.code === 'Space' && gridRef.current?.contains(document.activeElement)) {
                // Only handle if we have a single selected cell and Ctrl is held
                if ((e.ctrlKey || e.metaKey) && selectedCells.length > 0) {
                    e.preventDefault();
                    const lastSelected = selectedCells[selectedCells.length - 1];
                    // Toggle this cell's selection
                    const isInSelection = selectedCells.length > 1;
                    if (isInSelection) {
                        // Remove from multi-selection
                        setSelectedCells(prev => prev.slice(0, -1));
                    }
                }
            }

            // Delete/Backspace - Remove selected views (with confirmation)
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCells.length > 0) {
                // Only if not in an input
                if (!e.target.matches('input, textarea')) {
                    e.preventDefault();
                    // Dispatch event to show confirmation dialog
                    window.dispatchEvent(new CustomEvent('cia:confirm-delete-views', {
                        detail: {
                            cells: selectedCells.filter(c => c.placement?.content?.type === 'view'),
                            onConfirm: () => {
                                selectedCells.forEach(cell => {
                                    if (cell.placement) {
                                        onRemovePlacement?.(cell.placement.id);
                                    }
                                });
                                setSelectedCells([]);
                            }
                        }
                    }));
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [moveViewport, incrementViewportSize, decrementViewportSize, resetViewportSize, setViewportSize, canvas?.placements, selectedCells, contextMenu.isOpen, renderMode, shouldTriggerIsolation, isolateCell, onRemovePlacement, isFocusView, isSubsetView, exitFocusMode]);

    // ==========================================================================
    // SELECTION MODIFIER KEY TRACKING (for cursor feedback)
    // ==========================================================================

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
                setSelectionModifierHeld(true);
            }
        };

        const handleKeyUp = (e) => {
            // Check if any modifier is still held
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                setSelectionModifierHeld(false);
            }
        };

        // Also handle window blur (user switches apps while holding modifier)
        const handleBlur = () => {
            setSelectionModifierHeld(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    // ==========================================================================
    // DRAG STATE TRACKING (for edge drop zones)
    // ==========================================================================

    useEffect(() => {
        const handleDragStart = () => {
            setIsDragActive(true);
        };

        const handleDragEnd = () => {
            setIsDragActive(false);
            setDragModifiers({ shift: false, ctrl: false, alt: false });
        };

        const handleDragOver = (e) => {
            // Update modifier state during drag
            setDragModifiers({
                shift: e.shiftKey,
                ctrl: e.ctrlKey || e.metaKey,
                alt: e.altKey,
            });
        };

        window.addEventListener('dragstart', handleDragStart);
        window.addEventListener('dragend', handleDragEnd);
        window.addEventListener('drop', handleDragEnd);
        window.addEventListener('dragover', handleDragOver);

        return () => {
            window.removeEventListener('dragstart', handleDragStart);
            window.removeEventListener('dragend', handleDragEnd);
            window.removeEventListener('drop', handleDragEnd);
            window.removeEventListener('dragover', handleDragOver);
        };
    }, []);

    // ==========================================================================
    // CELL CLICK HANDLING
    // ==========================================================================

    const handleCellClick = useCallback((placement, e) => {
        // Selection modifiers bypass isolation mode
        const isSelectionClick = e.ctrlKey || e.metaKey || e.shiftKey;

        // In edit mode OR merge mode, clicking selects cells for operations
        const isSelectionMode = editMode || mergeMode;

        // Ctrl/Cmd+Click - toggle cell in selection
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
            const cellData = { row: placement.row, col: placement.col, placement };
            const isCurrentlySelected = selectedCells.some(
                sc => sc.row === placement.row && sc.col === placement.col
            );

            if (isCurrentlySelected) {
                // Remove from selection
                setSelectedCells(prev => prev.filter(
                    sc => !(sc.row === placement.row && sc.col === placement.col)
                ));
            } else {
                // Add to selection
                setSelectedCells(prev => [...prev, cellData]);
            }
            return;
        }

        // Shift+Click - Select rectangular range from last selected cell (per spec)
        // Ctrl+Shift+Click - Add rectangular range to existing selection
        if (e.shiftKey) {
            // Get the anchor cell (last selected, or first if none)
            const anchorCell = selectedCells.length > 0
                ? selectedCells[selectedCells.length - 1]
                : null;

            if (!anchorCell) {
                // No previous selection, just select the clicked cell
                setSelectedCells([{ row: placement.row, col: placement.col, placement }]);
                return;
            }

            // Calculate rectangular bounds between anchor and clicked cell
            const minRow = Math.min(anchorCell.row, placement.row);
            const maxRow = Math.max(anchorCell.row, placement.row);
            const minCol = Math.min(anchorCell.col, placement.col);
            const maxCol = Math.max(anchorCell.col, placement.col);

            // Build list of all cells in the rectangular range
            const rangeCells = [];
            for (let row = minRow; row <= maxRow; row++) {
                for (let col = minCol; col <= maxCol; col++) {
                    // Find placement at this position
                    const cellPlacement = canvas?.placements?.find(
                        p => p.row === row && p.col === col
                    );
                    rangeCells.push({
                        row,
                        col,
                        placement: cellPlacement || null,
                    });
                }
            }

            if (e.ctrlKey || e.metaKey) {
                // Ctrl+Shift+Click: Add range to existing selection (dedup)
                setSelectedCells(prev => {
                    const existingKeys = new Set(prev.map(c => `${c.row},${c.col}`));
                    const newCells = rangeCells.filter(c => !existingKeys.has(`${c.row},${c.col}`));
                    return [...prev, ...newCells];
                });
            } else {
                // Shift+Click: Replace selection with range
                setSelectedCells(rangeCells);
            }
            return;
        }

        // In edit/merge mode, single click selects the cell (replaces selection)
        if (isSelectionMode) {
            const cellData = { row: placement.row, col: placement.col, placement };
            setSelectedCells([cellData]);
            return;
        }

        // Single click just focuses/activates the view (no isolation)
        // Isolation is now triggered by double-click for finer-grained control
        if (onCellClick) {
            onCellClick(placement, e);
        }
    }, [onCellClick, selectedCells, canvas?.placements, editMode, mergeMode]);

    // Double-click triggers view stack navigation (focus mode)
    // Also triggers isolation mode for small cells as fallback
    const handleCellDoubleClick = useCallback((placement, e) => {
        // If onPlacementDoubleClick is provided, use view stack navigation
        if (onPlacementDoubleClick) {
            onPlacementDoubleClick(placement);
            return;
        }

        // Fallback: trigger isolation in thumbnail/snapshot modes
        if (shouldTriggerIsolation(renderMode)) {
            isolateCell({
                id: placement.id,
                viewId: placement.content?.viewConfigurationId,
                name: getPlacementName(placement),
                row: placement.row,
                col: placement.col,
            });
        }
    }, [onPlacementDoubleClick, renderMode, shouldTriggerIsolation, isolateCell]);

    // ==========================================================================
    // CONTEXT MENU HANDLERS
    // ==========================================================================

    const handleContextMenu = useCallback((e) => {
        e.preventDefault();

        // Only show context menu if there are selected cells
        if (selectedCells.length === 0) return;

        setContextMenu({
            isOpen: true,
            position: { x: e.clientX, y: e.clientY },
            cells: selectedCells,
        });
    }, [selectedCells]);

    const handleCloseContextMenu = useCallback(() => {
        setContextMenu({ isOpen: false, position: null, cells: [] });
    }, []);

    // Click on grid background (not a cell) deselects all - per spec
    const handleGridClick = useCallback((e) => {
        // Only if clicking directly on the viewport (not a child cell)
        if (e.target === e.currentTarget && selectedCells.length > 0) {
            setSelectedCells([]);
        }
    }, [selectedCells.length]);

    const handleSwapCells = useCallback(() => {
        if (selectedCells.length !== 2) return;
        const [cell1, cell2] = selectedCells;

        // Swap placements
        if (cell1.placement && cell2.placement) {
            canvasManager.swapPlacements?.(cell1.placement.id, cell2.placement.id);
        }
        setSelectedCells([]);
    }, [selectedCells]);

    const handleMergeCells = useCallback(async () => {
        if (selectedCells.length < 2) return;

        // Calculate bounds of selected cells
        const rows = selectedCells.map(c => c.row);
        const cols = selectedCells.map(c => c.col);
        const minRow = Math.min(...rows);
        const maxRow = Math.max(...rows);
        const minCol = Math.min(...cols);
        const maxCol = Math.max(...cols);

        // Calculate span
        const rowSpan = maxRow - minRow + 1;
        const colSpan = maxCol - minCol + 1;

        // Find the top-left cell (first one to keep) - prioritize cells with content
        const cellsWithContent = selectedCells
            .filter(c => c.placement?.content?.type && c.placement.content.type !== 'empty')
            .sort((a, b) => {
                // Sort by row first, then by column (top-left first)
                if (a.row !== b.row) return a.row - b.row;
                return a.col - b.col;
            });

        // Use the first cell with content, or the top-left cell if all are empty
        const primaryCell = cellsWithContent[0] || selectedCells.sort((a, b) => {
            if (a.row !== b.row) return a.row - b.row;
            return a.col - b.col;
        })[0];

        if (!primaryCell?.placement) {
            log.warn('No valid placement to merge');
            setSelectedCells([]);
            return;
        }

        try {
            // First, move the primary placement to top-left if it's not already there
            if (primaryCell.row !== minRow || primaryCell.col !== minCol) {
                await canvasManager.movePlacement(primaryCell.placement.id, minRow, minCol);
            }

            // Resize the primary placement to span all selected cells
            await canvasManager.resizePlacement(primaryCell.placement.id, rowSpan, colSpan);

            // Remove all other placements in the selection (they're now covered by the merged cell)
            const otherPlacements = selectedCells
                .filter(c => c.placement && c.placement.id !== primaryCell.placement.id)
                .map(c => c.placement);

            for (const placement of otherPlacements) {
                if (placement?.content?.type && placement.content.type !== 'empty') {
                    await canvasManager.removePlacement(canvasId, placement.id);
                }
            }

            log.info(`Merged cells from [${minRow},${minCol}] to [${maxRow},${maxCol}] (${rowSpan}x${colSpan})`);
        } catch (error) {
            log.error('Failed to merge cells:', error);
        }

        setSelectedCells([]);
    }, [selectedCells, canvasId]);

    const handleAlignCells = useCallback((direction) => {
        if (selectedCells.length < 2) return;
        // TODO: Implement alignment
        log.info(`Align cells: ${direction}`);
    }, [selectedCells]);

    const handleCloseAllViews = useCallback(() => {
        const viewCells = selectedCells.filter(c => c.placement?.content?.type === 'view');
        viewCells.forEach(cell => {
            if (cell.placement) {
                onRemovePlacement?.(cell.placement.id);
            }
        });
        setSelectedCells([]);
    }, [selectedCells, onRemovePlacement]);

    const handleDeleteAllViews = useCallback(() => {
        // Same as close for now - could be permanent delete in future
        handleCloseAllViews();
    }, [handleCloseAllViews]);

    // ==========================================================================
    // FOCUS MODE HANDLER
    // ==========================================================================

    /**
     * Handle focusing a view (entering focus mode via header Focus button)
     * Creates focus view config and pushes onto view stack
     */
    const handleFocusView = useCallback((placement) => {
        if (!focusView || !placement) return;

        const viewId = placement.content?.viewConfigurationId;
        let viewName = 'View';

        // Get view name from view config if available
        if (viewId) {
            try {
                const view = getViewConfigurationManager()?.getView(viewId);
                if (view) {
                    const dataset = getDatasetManager()?.getDataset(view.datasetId);
                    viewName = dataset?.filename || view.name || 'View';
                }
            } catch (e) {
                // Fall through
            }
        }

        focusView({
            placementId: placement.id,
            viewConfigurationId: viewId,
            name: viewName,
            row: placement.row,
            col: placement.col,
        });
    }, [focusView]);

    // ==========================================================================
    // EDGE DROP HANDLING (expand canvas)
    // ==========================================================================

    const handleEdgeDrop = useCallback((position, e) => {
        log.debug(`Edge drop at ${position}`);

        // Determine which row/col to expand
        let newRow, newCol;

        switch (position) {
            case 'top':
                // Add row at top (row 0), existing rows shift down
                newRow = 0;
                newCol = 0;
                onAddRow?.('top');
                break;
            case 'bottom':
                // Add row at bottom
                newRow = canvasDimensions.rows;
                newCol = 0;
                onAddRow?.('bottom');
                break;
            case 'left':
                // Add column at left (col 0), existing cols shift right
                newRow = 0;
                newCol = 0;
                onAddColumn?.('left');
                break;
            case 'right':
                // Add column at right
                newRow = 0;
                newCol = canvasDimensions.cols;
                onAddColumn?.('right');
                break;
            default:
                return;
        }

        // Extract drop data from the event
        try {
            const dropData = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
            if (dropData && Object.keys(dropData).length > 0) {
                // Place the dropped content in the new row/column
                handleCellDrop(newRow, newCol, dropData);
            }
        } catch (err) {
            log.warn('Could not parse edge drop data:', err);
        }
    }, [canvasDimensions, onAddRow, onAddColumn, handleCellDrop]);

    // ==========================================================================
    // HELPER FUNCTIONS
    // ==========================================================================

    function getPlacementName(placement) {
        if (placement.content?.type === 'view') {
            try {
                const view = getViewConfigurationManager()?.getView(placement.content.viewConfigurationId);
                if (view) {
                    const dataset = getDatasetManager()?.getDataset(view.datasetId);
                    return dataset?.filename || view.name || 'View';
                }
            } catch (e) {
                // Fall through to default
            }
        }
        return `Cell [${placement.row}, ${placement.col}]`;
    }

    // Filter placements to only those visible in the viewport
    const viewportPlacements = useMemo(() => {
        if (!canvas?.placements) return [];

        return canvas.placements.filter((placement) => {
            const pEndRow = placement.row + (placement.rowSpan || 1);
            const pEndCol = placement.col + (placement.colSpan || 1);
            const vEndRow = effectiveViewport.row + effectiveViewport.rows;
            const vEndCol = effectiveViewport.col + effectiveViewport.cols;

            return (
                placement.row < vEndRow &&
                pEndRow > effectiveViewport.row &&
                placement.col < vEndCol &&
                pEndCol > effectiveViewport.col
            );
        });
    }, [canvas?.placements, effectiveViewport]);

    // Build placement lookup Map for O(1) access in render loop
    // Key: "row,col" -> placement
    const placementLookup = useMemo(() => {
        const map = new Map();
        if (viewportPlacements) {
            for (const p of viewportPlacements) {
                map.set(`${p.row},${p.col}`, p);
            }
        }
        return map;
    }, [viewportPlacements]);

    // Build Sets for O(1) selection lookups in render loop
    const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const selectedCellsSet = useMemo(() => {
        const set = new Set();
        for (const sc of selectedCells) {
            set.add(`${sc.row},${sc.col}`);
        }
        return set;
    }, [selectedCells]);

    const handleCellDrop = useCallback(async (row, col, dropData) => {
        log.debug('handleCellDrop', { row, col, dropData });

        try {
            // Handle push actions with modifiers
            // Per spec: Shift = wrap to next row, Ctrl = close last view
            if (dropData.action === 'push') {
                const { direction, modifiers = {} } = dropData;
                log.debug(`Push ${direction} at [${row}, ${col}] with modifiers:`, modifiers);

                // Calculate the actual insert position based on push direction
                // When dropping on PUSH_DOWN zone of cell [1,0], insert at [2,0] (below)
                // When dropping on PUSH_RIGHT zone of cell [1,0], insert at [1,1] (right)
                let insertRow = row;
                let insertCol = col;

                switch (direction) {
                    case 'down':
                        insertRow = row + 1;
                        break;
                    case 'up':
                        // Insert at current position, push existing up
                        // But we need to ensure row doesn't go negative
                        insertRow = Math.max(0, row);
                        break;
                    case 'right':
                        insertCol = col + 1;
                        break;
                    case 'left':
                        insertCol = Math.max(0, col);
                        break;
                }

                // Push existing views to make room at the insert position
                await canvasManager.pushPlacements(canvasId, insertRow, insertCol, direction, {
                    wrap: modifiers.shift || false,
                    closeLast: modifiers.ctrl || false,
                });

                // Update row/col to the insert position for placing the new view
                row = insertRow;
                col = insertCol;

                // Fall through to standard drop handling to place the new view
            }

            // Handle swap actions - when dropping ON an existing view
            // This replaces the existing view with the dropped one
            if (dropData.action === 'swap' && dropData.existingPlacement) {

                // Legacy swap behavior: if dragging within canvas, swap positions
                const sourcePlacementId = dropData.sourcePlacementId;
                const targetPlacementId = dropData.existingPlacement.id;

                if (sourcePlacementId && targetPlacementId) {
                    await canvasManager.swapPlacements(sourcePlacementId, targetPlacementId);
                    return; // Swap complete, don't place a new view
                }

                // If dropping from panel, remove existing and place new
                // First remove existing placement
                const existingPlacementId = dropData.existingPlacement.id;
                if (existingPlacementId) {
                    await canvasManager.removePlacement(canvasId, existingPlacementId);
                }
                // Fall through to normal handling to place the new view
            }

            // IMPORTANT: Check type field FIRST before checking for id
            // Every object has an id, so we must check type to distinguish

            // Case 0: Canvas cell dragged (reordering cells in edit mode)
            // This is a MOVE operation, not a duplicate
            if (dropData.type === 'canvas-cell' && dropData.placementId) {
                const sourcePlacementId = dropData.placementId;

                // Find source placement to get original position
                const sourcePlacement = canvas?.placements?.find(p => p.id === sourcePlacementId);
                const originalRow = sourcePlacement?.row;
                const originalCol = sourcePlacement?.col;

                // Find the target placement at the drop location
                const targetPlacement = canvas?.placements?.find(
                    p => p.row === row && p.col === col
                );

                if (targetPlacement && targetPlacement.id !== sourcePlacementId) {
                    // Swap with existing cell
                    log.debug(`Swapping cells: ${sourcePlacementId} <-> ${targetPlacement.id}`);
                    await canvasManager.swapPlacements(sourcePlacementId, targetPlacement.id);

                    // Record history for undo/redo
                    canvasHistory.record({
                        type: 'SWAP',
                        description: 'Swap views',
                        undo: () => canvasManager.swapPlacements(sourcePlacementId, targetPlacement.id),
                        redo: () => canvasManager.swapPlacements(sourcePlacementId, targetPlacement.id),
                    });
                } else if (!targetPlacement || targetPlacement.content?.type === 'empty') {
                    // Move to empty cell
                    log.debug(`Moving cell ${sourcePlacementId} to [${row}, ${col}]`);
                    await canvasManager.movePlacement(sourcePlacementId, row, col);

                    // Record history for undo/redo
                    if (originalRow !== undefined && originalCol !== undefined) {
                        canvasHistory.record({
                            type: 'MOVE',
                            description: `Move view to row ${row + 1}, col ${col + 1}`,
                            undo: () => canvasManager.movePlacement(sourcePlacementId, originalRow, originalCol),
                            redo: () => canvasManager.movePlacement(sourcePlacementId, row, col),
                        });
                    }
                }
                return;
            }

            // Case 1: File dropped (from FilesTab)
            // Check this FIRST because files have both 'id' and other properties
            if (dropData.type === 'file' || dropData.isFile) {
                log.debug(`File dropped: ${dropData.name} at [${row}, ${col}]`);

                window.dispatchEvent(new CustomEvent('cia:load-file-to-cell', {
                    detail: {
                        file: dropData,
                        targetRow: row,
                        targetCol: col,
                        canvasId,
                    },
                }));
                return;
            }

            // Case 2: Dataset dropped (create new view)
            if (dropData.type === 'dataset' || (dropData.datasetId && !dropData.viewConfigId)) {
                log.debug(`Creating new view for dataset ${dropData.datasetId} at [${row}, ${col}]`);

                window.dispatchEvent(new CustomEvent('cia:request-instance', {
                    detail: {
                        datasetId: dropData.datasetId,
                        fileName: dropData.name, // Pass the dataset name for the view
                        fileType: dropData.fileType,
                        spawnNew: true,
                        targetRow: row,
                        targetCol: col,
                        canvasId,
                    },
                }));
                return;
            }

            // Case 3: ViewItem dropped (existing view from Views/Datasets tab)
            // ARCHITECTURE:
            // - If view is NOT on canvas: PLACE IT (move, not copy)
            // - If view IS on canvas: DUPLICATE it (copy)
            // - Alt+drop = create fully linked view (regardless of placement status)
            if (dropData.viewConfigId || dropData.type === 'view' || dropData.type === 'view-item') {
                const sourceViewId = dropData.viewConfigId || dropData.viewId || dropData.id;
                const datasetId = dropData.datasetId;
                const createLinked = dropData.modifiers?.alt; // Alt key = create linked view

                // Check if view is already on the canvas
                const isAlreadyOnCanvas = canvasManager.isViewOnCanvas(sourceViewId);

                if (isAlreadyOnCanvas) {
                    // View already placed - duplicate it
                    log.debug(`ViewItem dropped - creating duplicate of ${sourceViewId} at [${row}, ${col}]`);
                    window.dispatchEvent(new CustomEvent('cia:request-instance', {
                        detail: {
                            datasetId: datasetId,
                            duplicateViewId: sourceViewId,
                            spawnNew: true,
                            targetRow: row,
                            targetCol: col,
                            canvasId,
                            createLinked,
                        },
                    }));
                } else {
                    // View not on canvas - place it (move, not copy)
                    log.debug(`ViewItem dropped - placing view ${sourceViewId} at [${row}, ${col}]`);
                    window.dispatchEvent(new CustomEvent('cia:request-instance', {
                        detail: {
                            datasetId: datasetId,
                            viewConfigId: sourceViewId, // Use viewConfigId to place, not duplicate
                            spawnNew: false, // Not spawning new, placing existing
                            targetRow: row,
                            targetCol: col,
                            canvasId,
                            createLinked,
                        },
                    }));
                }
                return;
            }

            // Unknown format - log warning instead of silently failing
            log.warn('Unknown drop data format:', dropData);
            log.warn('Expected one of: type="file", type="dataset", type="view", or viewConfigId');

        } catch (error) {
            log.error('Drop failed:', error);
        }
    }, [addPlacement, canvasId]);


    // ==========================================================================
    // RENDER CELLS
    // ==========================================================================

    // Helper function to validate placement
    function isValidPlacement(placement) {
        if (!placement.content) return false;
        if (placement.content.type === 'view') {
            return !!placement.content.viewConfigurationId;
        }
        if (placement.content.type === 'notes') {
            return true; // Notes can exist without content initially
        }
        // Add other content type validations as needed
        return true;
    }

    const renderCells = useMemo(() => {
        const cells = [];

        // Get placements visible in current viewport
        const viewportPlacements = visiblePlacements || [];

        // Build occupiedCells map for multi-span placements
        const occupiedCells = new Set();
        viewportPlacements.forEach((placement) => {
            if (placement.colSpan > 1 || placement.rowSpan > 1) {
                for (let r = 0; r < placement.rowSpan; r++) {
                    for (let c = 0; c < placement.colSpan; c++) {
                        if (r !== 0 || c !== 0) {
                            occupiedCells.add(`${placement.row + r},${placement.col + c}`);
                        }
                    }
                }
            }
        });

        // Render cells for the viewport
        for (let viewRow = 0; viewRow < effectiveViewport.rows; viewRow++) {
            for (let viewCol = 0; viewCol < effectiveViewport.cols; viewCol++) {
                const canvasRow = effectiveViewport.row + viewRow;
                const canvasCol = effectiveViewport.col + viewCol;
                const key = `${canvasRow},${canvasCol}`;

                // Check if this cell is the origin of a placement
                // Use Map for O(1) lookup instead of O(n) find
                const placement = placementLookup.get(key);

                // Validate placement has valid content
                if (placement && !isValidPlacement(placement)) {
                    log.warn(`Invalid placement at [${canvasRow}, ${canvasCol}]:`, placement);
                    // Could auto-clean here or render special "invalid" state
                }

                // Skip if cell is covered by a multi-span placement (but not origin)
                if (!placement && occupiedCells.has(key)) {
                    continue;
                }

                // ============================================
                // KEY FIX: Position relative to VIEWPORT, not canvas
                // This ensures cells always fill the visible container
                // ============================================
                // Add padding offset so cells don't touch edges
                const left = VIEWPORT_PADDING.left + viewCol * (cellSize.width + GAP);
                const top = VIEWPORT_PADDING.top + viewRow * (cellSize.height + GAP);

                // Calculate size (account for spanning)
                const colSpan = placement?.colSpan || 1;
                const rowSpan = placement?.rowSpan || 1;

                // Clip spans to viewport boundary (for cells that extend beyond)
                const visibleColSpan = Math.min(colSpan, effectiveViewport.cols - viewCol);
                const visibleRowSpan = Math.min(rowSpan, effectiveViewport.rows - viewRow);

                const width = visibleColSpan * cellSize.width + (visibleColSpan - 1) * GAP;
                const height = visibleRowSpan * cellSize.height + (visibleRowSpan - 1) * GAP;

                cells.push(
                    <div
                        key={`cell-${canvasRow}-${canvasCol}`}
                        className="canvas-grid__cell-wrapper"
                        data-placement-id={placement?.id}
                        style={{
                            left,
                            top,
                            width,
                            height,
                        }}
                    >
                        <CanvasCell
                            placement={placement}
                            row={canvasRow}
                            col={canvasCol}
                            renderMode={renderMode}
                            cellSize={cellSize}
                            isHighlighted={placement?.id === highlightedPlacementId}
                            isSelected={
                                selectedIdsSet.has(placement?.id) ||
                                selectedCellsSet.has(key) ||
                                (activeViewId && placement?.content?.viewConfigurationId === activeViewId)
                            }
                            selectionMode={selectionMode}
                            inEditMode={editMode}
                            activeViewId={activeViewId}
                            recentViewIds={recentViewIds}
                            isInFocusMode={isFocusView}
                            onSelect={() => placement?.id && toggleSelection(placement.id)}
                            onClick={(e) => placement && handleCellClick(placement, e)}
                            onDoubleClick={(e) => placement && handleCellDoubleClick(placement, e)}
                            onAddContent={(type) => onAddContent?.(canvasRow, canvasCol, type)}
                            onRemove={() => placement && onRemovePlacement?.(placement.id)}
                            onDrop={handleCellDrop}
                            onFocusView={placement ? () => handleFocusView(placement) : undefined}
                        />
                    </div>
                );
            }
        }

        return cells;
    }, [
        visiblePlacements,
        placementLookup,
        effectiveViewport,
        cellSize,
        renderMode,
        highlightedPlacementId,
        selectedIdsSet,
        selectedCellsSet,
        selectionMode,
        editMode,
        activeViewId,
        recentViewIds,
        isFocusView,
        toggleSelection,
        handleCellClick,
        handleCellDoubleClick,
        onAddContent,
        onRemovePlacement,
        handleCellDrop,
        handleFocusView,
    ]);

    const viewGroupBorders = useMemo(() => {
        if (!showViewGroupBorders || !viewGroups?.length || !measurementsReady) return null;
        if (!isGridMode || isFocusView || isSubsetView) return null;

        const overlays = [];
        const viewportRow = effectiveViewport.row;
        const viewportCol = effectiveViewport.col;
        const viewportEndRow = viewportRow + effectiveViewport.rows;
        const viewportEndCol = viewportCol + effectiveViewport.cols;

        viewGroups.forEach((group) => {
            const position = group.canvasPosition || group.position || group.canvasPos;
            if (!position) return;

            const row = position.row ?? 0;
            const col = position.col ?? 0;
            const rowSpan = position.rowSpan ?? 1;
            const colSpan = position.colSpan ?? 1;

            const groupEndRow = row + rowSpan;
            const groupEndCol = col + colSpan;

            const isVisible =
                groupEndRow > viewportRow &&
                row < viewportEndRow &&
                groupEndCol > viewportCol &&
                col < viewportEndCol;

            if (!isVisible) return;

            const visibleRowStart = Math.max(row, viewportRow);
            const visibleColStart = Math.max(col, viewportCol);
            const visibleRowEnd = Math.min(groupEndRow, viewportEndRow);
            const visibleColEnd = Math.min(groupEndCol, viewportEndCol);

            const viewRow = visibleRowStart - viewportRow;
            const viewCol = visibleColStart - viewportCol;
            const visibleRows = Math.max(1, visibleRowEnd - visibleRowStart);
            const visibleCols = Math.max(1, visibleColEnd - visibleColStart);

            const left = VIEWPORT_PADDING.left + viewCol * (cellSize.width + GAP);
            const top = VIEWPORT_PADDING.top + viewRow * (cellSize.height + GAP);
            const width = visibleCols * cellSize.width + (visibleCols - 1) * GAP;
            const height = visibleRows * cellSize.height + (visibleRows - 1) * GAP;

            overlays.push(
                <div
                    key={`viewgroup-${group.id || `${row}-${col}`}`}
                    className="canvas-grid__viewgroup-outline"
                    style={{
                        left,
                        top,
                        width,
                        height,
                        '--viewgroup-color': group.color || 'var(--color-accent-purple)',
                    }}
                />
            );
        });

        if (!overlays.length) return null;

        return (
            <div className="canvas-grid__viewgroup-overlay">
                {overlays}
            </div>
        );
    }, [
        showViewGroupBorders,
        viewGroups,
        measurementsReady,
        isGridMode,
        isFocusView,
        isSubsetView,
        effectiveViewport,
        cellSize,
    ]);

    // ==========================================================================
    // FOCUS MODE RENDERING
    // ==========================================================================

    // Find the focused placement when in focus mode
    const focusedPlacement = useMemo(() => {
        if (!isFocusView || !currentView?.data?.placementId) return null;
        return canvas?.placements?.find(p => p.id === currentView.data.placementId) || null;
    }, [isFocusView, currentView?.data?.placementId, canvas?.placements]);

    // Render the focused cell for focus mode
    const renderFocusedCell = useMemo(() => {
        if (!isFocusView || !focusedPlacement) return null;

        return (
            <CanvasCell
                placement={focusedPlacement}
                row={focusedPlacement.row}
                col={focusedPlacement.col}
                renderMode={RENDER_MODES.FULL}
                cellSize={containerSize} // Use full container size
                isHighlighted={false}
                isSelected={false}
                inEditMode={false}
                activeViewId={focusedPlacement.content?.viewConfigurationId}
                recentViewIds={[]}
                isInFocusMode={true}
                onRemove={() => {
                    exitFocusMode?.();
                    onRemovePlacement?.(focusedPlacement.id);
                }}
                onDrop={handleCellDrop}
                onFocusView={undefined} // Already in focus mode
            />
        );
    }, [isFocusView, focusedPlacement, containerSize, exitFocusMode, onRemovePlacement, handleCellDrop]);

    // ==========================================================================
    // SUBSET MODE RENDERING
    // ==========================================================================

    // Get subset placements when in subset mode
    const subsetPlacements = useMemo(() => {
        if (!isSubsetView || !currentView?.data?.placementIds) return [];
        const placementIds = currentView.data.placementIds;
        return canvas?.placements?.filter(p => placementIds.includes(p.id)) || [];
    }, [isSubsetView, currentView?.data?.placementIds, canvas?.placements]);

    // Calculate optimal grid layout for subset
    const subsetLayout = useMemo(() => {
        const n = subsetPlacements.length;
        if (n === 0) return { rows: 1, cols: 1 };
        if (n === 1) return { rows: 1, cols: 1 };
        if (n === 2) return { rows: 1, cols: 2 };
        if (n === 3) return { rows: 1, cols: 3 };
        if (n === 4) return { rows: 2, cols: 2 };
        if (n <= 6) return { rows: 2, cols: 3 };
        if (n <= 9) return { rows: 3, cols: 3 };
        // For more than 9, calculate closest square
        const cols = Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);
        return { rows, cols };
    }, [subsetPlacements.length]);

    // Calculate cell size for subset mode
    const subsetCellSize = useMemo(() => {
        if (!isSubsetView || subsetPlacements.length === 0) return containerSize;
        const { rows, cols } = subsetLayout;
        const gap = 8; // Gap between cells
        const width = (containerSize.width - (cols - 1) * gap) / cols;
        const height = (containerSize.height - (rows - 1) * gap) / rows;
        return { width, height };
    }, [isSubsetView, subsetPlacements.length, subsetLayout, containerSize]);

    // Render subset cells
    const renderSubsetCells = useMemo(() => {
        if (!isSubsetView || subsetPlacements.length === 0) return null;

        const { cols } = subsetLayout;

        return subsetPlacements.map((placement, index) => {
            const gridRow = Math.floor(index / cols);
            const gridCol = index % cols;

            return (
                <div
                    key={placement.id}
                    className="canvas-grid__subset-cell"
                    style={{
                        gridRow: gridRow + 1,
                        gridColumn: gridCol + 1,
                    }}
                >
                    <CanvasCell
                        placement={placement}
                        row={placement.row}
                        col={placement.col}
                        renderMode={RENDER_MODES.FULL}
                        cellSize={subsetCellSize}
                        isHighlighted={false}
                        isSelected={false}
                        inEditMode={false}
                        activeViewId={activeViewId}
                        recentViewIds={recentViewIds}
                        isInFocusMode={false}
                        onRemove={() => onRemovePlacement?.(placement.id)}
                        onDrop={handleCellDrop}
                        onFocusView={() => focusView({
                            placementId: placement.id,
                            name: placement.content?.name || 'View',
                            row: placement.row,
                            col: placement.col,
                        })}
                    />
                </div>
            );
        });
    }, [isSubsetView, subsetPlacements, subsetLayout, subsetCellSize, activeViewId, recentViewIds, onRemovePlacement, handleCellDrop, focusView]);

    // ==========================================================================
    // RENDER
    // ==========================================================================

    // Show loading if canvas is still loading
    if (canvasLoading) {
        return (
            <div className="canvas-grid canvas-grid--loading">
                <LoadingState message="Loading canvas..." />
            </div>
        );
    }

    // Show error if canvas failed to load
    if (canvasError) {
        return (
            <div className="canvas-grid canvas-grid--error">
                <LoadingState error={canvasError} />
            </div>
        );
    }

    return (
        <div
            className={`canvas-grid canvas-grid--${layoutMode} ${inFocusMode ? 'canvas-grid--subset-focus-mode' : ''} ${isFocusView ? 'canvas-grid--view-focus-mode' : ''} ${isSubsetView ? 'canvas-grid--subset-view-mode' : ''}`}
            data-render-mode={renderMode}
        >
            {/* Mode banners */}
            {inFocusMode && activeSubset && (
                <div className="canvas-grid__focus-banner">
                    <span>Focus: {activeSubset.name}</span>
                </div>
            )}

            {/* View Focus Mode Header - Shows when viewing single cell fullscreen */}
            {isFocusView && currentView && (
                <div className="canvas-grid__view-focus-header">
                    <button
                        className="canvas-grid__view-focus-back"
                        onClick={exitFocusMode}
                        title="Exit focus mode (Escape)"
                    >
                        <Icon name="arrowLeft" size={16} />
                        <span>Back</span>
                    </button>
                    <div className="canvas-grid__view-focus-title">
                        <span className="canvas-grid__view-focus-name">{currentView.label}</span>
                    </div>
                    <div className="canvas-grid__view-focus-hint">
                        Press <kbd>Escape</kbd> to exit
                    </div>
                </div>
            )}

            {/* Subset Mode Header - Shows when viewing subset of views */}
            {isSubsetView && currentView && (
                <div className="canvas-grid__subset-header">
                    <button
                        className="canvas-grid__subset-back"
                        onClick={exitFocusMode}
                        title="Exit subset mode (Escape)"
                    >
                        <Icon name="arrowLeft" size={16} />
                        <span>Back</span>
                    </button>
                    <div className="canvas-grid__subset-title">
                        <Icon name="layers" size={16} />
                        <span className="canvas-grid__subset-name">{currentView.label}</span>
                        <span className="canvas-grid__subset-count">
                            ({subsetPlacements.length} view{subsetPlacements.length !== 1 ? 's' : ''})
                        </span>
                    </div>
                    <div className="canvas-grid__subset-hint">
                        Press <kbd>Escape</kbd> to exit
                    </div>
                </div>
            )}

            {selectionMode && (
                <div className="canvas-grid__selection-banner">
                    <span>
                        <Icon name="pointer" size={14} />
                        Selection Mode - {selectedIds.length} selected
                    </span>
                    <div className="canvas-grid__selection-actions">
                        <button
                            className="canvas-grid__selection-btn canvas-grid__selection-btn--create"
                            onClick={() => {
                                if (onOpenSubsetSelector) {
                                    onOpenSubsetSelector();
                                }
                            }}
                            disabled={selectedIds.length === 0}
                        >
                            <Icon name="layers" size={12} />
                            Create Subset
                        </button>
                        <button
                            className="canvas-grid__selection-btn canvas-grid__selection-btn--cancel"
                            onClick={() => exitSelectionMode(true)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {(editMode || mergeMode) && (
                <div className={`canvas-grid__edit-banner ${mergeMode ? 'canvas-grid__edit-banner--merge' : ''}`}>
                    <span>
                        {mergeMode
                            ? `Merge Mode - ${selectedCells.length} cell${selectedCells.length !== 1 ? 's' : ''} selected`
                            : isFlowMode
                                ? 'Flow Mode - Views auto-arrange. Switch to Grid for manual placement.'
                                : `Edit Mode - ${selectedCells.length > 0 ? `${selectedCells.length} selected. ` : ''}Drag to move, Ctrl+click to multi-select`}
                    </span>
                    {selectedCells.length >= 2 && (
                        <div className="canvas-grid__edit-actions">
                            <button
                                className="canvas-grid__selection-btn canvas-grid__selection-btn--merge"
                                onClick={handleMergeCells}
                            >
                                <Icon name="merge" size={12} />
                                Merge ({selectedCells.length})
                            </button>
                            {selectedCells.length === 2 && (
                                <button
                                    className="canvas-grid__selection-btn canvas-grid__selection-btn--swap"
                                    onClick={handleSwapCells}
                                >
                                    <Icon name="arrowLeftRight" size={12} />
                                    Swap
                                </button>
                            )}
                            <button
                                className="canvas-grid__selection-btn canvas-grid__selection-btn--cancel"
                                onClick={() => setSelectedCells([])}
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Container - edge-to-edge wrapper */}
            <div className="canvas-grid__container">
                {/* Measurement container - fills available space */}
                <div
                    ref={measureRef}
                    className="canvas-grid__measure-container"
                >
                    {/* Loading overlay - shows OVER the grid, doesn't unmount it */}
                    {!measurementsReady && (
                        <div className="canvas-grid__loading-overlay">
                            <LoadingState
                                message="Preparing workspace..."
                                error={measurementError}
                            />
                        </div>
                    )}

                    {/* Grid viewport - ALWAYS rendered to preserve VTK instances */}
                    <div
                        ref={gridRef}
                        className={`canvas-grid__viewport ${!measurementsReady ? 'canvas-grid__viewport--loading' : ''} ${selectionModifierHeld ? 'canvas-grid__viewport--selection-mode' : ''} ${isFocusView ? 'canvas-grid__viewport--focus-mode' : ''} ${isSubsetView ? 'canvas-grid__viewport--subset-mode' : ''} ${activeTool === 'pan' ? 'canvas-grid__viewport--pan-tool' : ''} ${editMode ? 'canvas-grid__viewport--edit-mode' : ''} ${mergeMode ? 'canvas-grid__viewport--merge-mode' : ''}`}
                        tabIndex={0}
                        onClick={handleGridClick}
                        onContextMenu={handleContextMenu}
                        onMouseDown={handlePanStart}
                    >
                        {/* Show focus view, subset view, or normal grid */}
                        {isFocusView ? (
                            <div className="canvas-grid__focus-view-container">
                                {renderFocusedCell}
                            </div>
                        ) : isSubsetView ? (
                            <div
                                className="canvas-grid__subset-view-container"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${subsetLayout.cols}, 1fr)`,
                                    gridTemplateRows: `repeat(${subsetLayout.rows}, 1fr)`,
                                    gap: '8px',
                                    width: '100%',
                                    height: '100%',
                                    padding: '8px',
                                }}
                            >
                                {renderSubsetCells}
                            </div>
                        ) : (
                            renderCells
                        )}

                        {viewGroupBorders}

                        {showCoordinates && isGridMode && !isFocusView && !isSubsetView && measurementsReady && (
                            <div
                                className="canvas-grid__grid-overlay"
                                style={{
                                    '--grid-cell-width': `${cellSize.width}px`,
                                    '--grid-cell-height': `${cellSize.height}px`,
                                    '--grid-gap': `${GAP}px`,
                                    '--grid-pad-top': `${VIEWPORT_PADDING.top}px`,
                                    '--grid-pad-left': `${VIEWPORT_PADDING.left}px`,
                                }}
                            />
                        )}

                        {/* Edge Drop Zones - show at canvas edges during drag (hidden in focus/subset mode) */}
                        {!isFocusView && !isSubsetView && (
                        <CanvasEdgeDropZones
                            isDragActive={isDragActive}
                            canExpandTop={effectiveViewport.row === 0}
                            canExpandBottom={effectiveViewport.row + effectiveViewport.rows >= canvasDimensions.rows}
                            canExpandLeft={effectiveViewport.col === 0}
                            canExpandRight={effectiveViewport.col + effectiveViewport.cols >= canvasDimensions.cols}
                            maxRows={100}
                            maxCols={100}
                            currentRows={canvasDimensions.rows}
                            currentCols={canvasDimensions.cols}
                            modifiers={dragModifiers}
                            onEdgeDrop={handleEdgeDrop}
                        />
                        )}
                    </div>
                </div>
            </div>

            {/* Isolation Mode Overlay */}
            <IsolationOverlay
                isOpen={isIsolationOpen}
                onClose={exitIsolation}
                cell={isolatedCell}
                renderSize={isolationRenderSize}
            >
                {isolatedCell && (
                    <CanvasCell
                        placement={viewportPlacements.find(p => p.id === isolatedCell.id)}
                        row={isolatedCell.row}
                        col={isolatedCell.col}
                        renderMode={RENDER_MODES.FULL}
                        cellSize={{ width: 800, height: 600 }}
                        isHighlighted={false}
                        isSelected={false}
                        inEditMode={false}
                        onRemove={() => {
                            // First exit isolation mode
                            exitIsolation();
                            // Then remove the placement
                            const placement = viewportPlacements.find(p => p.id === isolatedCell.id);
                            if (placement) {
                                onRemovePlacement?.(placement.id);
                            }
                        }}
                    />
                )}
            </IsolationOverlay>

            {/* Connection Overlay */}
            <ConnectionOverlay
                connectionState={connectionState}
                error={canvasManager.getLastError()}
                onRetry={handleRetryConnection}
            />

            {/* Selection Context Menu */}
            <SelectionContextMenu
                isOpen={contextMenu.isOpen}
                position={contextMenu.position}
                selectedCells={contextMenu.cells}
                onClose={handleCloseContextMenu}
                onSwap={handleSwapCells}
                onMerge={handleMergeCells}
                onAlign={handleAlignCells}
                onCloseAll={handleCloseAllViews}
                onDeleteAll={handleDeleteAllViews}
            />
        </div>
    );
}

export default CanvasGrid;
