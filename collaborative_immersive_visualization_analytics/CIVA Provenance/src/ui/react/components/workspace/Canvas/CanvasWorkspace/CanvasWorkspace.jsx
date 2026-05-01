// src/ui/react/components/workspace/Canvas/CanvasWorkspace/CanvasWorkspace.jsx
// Integration component for the new canvas system
//
// This wraps CanvasGrid with:
// - ViewStackProvider for navigation (Grid → Focus → Subset)
// - Canvas chrome (Header, Toolbar, StatusBar)
// - Edge triggers and floating panels

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CanvasGrid } from '@UI/react/components/workspace';
import { TiledCanvasView } from '@UI/react/components/organisms/TiledCanvasView';
import { SubsetPanel } from '@UI/react/components/panels/SubsetPanel';
import { FocusModeOverlay } from '@UI/react/components/panels/FocusModeOverlay';
import { SubsetSelectorModal } from '@UI/react/components/modals/SubsetSelectorModal';

// New canvas chrome components
import { CanvasChrome } from '../CanvasChrome/CanvasChrome.jsx';
import { ConfirmationDialog } from '@UI/react/components/modals/ConfirmationDialog';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import { CanvasChromeFooter2 } from '../CanvasChrome/CanvasChromeFooter2.jsx';
import { CanvasInfoFooter } from '../CanvasInfoFooter/CanvasInfoFooter.jsx';
import { EdgeTrigger, FloatingPanel } from '../EdgePanels';
import { FloatingCanvasWrapper, CANVAS_MODES, ASPECT_RATIOS } from '../FloatingCanvas';
import { CreateWorkspacePanel } from '@UI/react/components/panels/FloatingPanel';

import { useCanvas, useSubsets } from '@UI/react/hooks/useCanvas.js';
import { ViewStackProvider, useViewStack, VIEW_TYPES } from '@UI/react/hooks/useViewStack.js';
import { useViewContextLogic } from '@UI/react/hooks/useViewContextLogic.js';
import { CanvasFocusProvider, generatePaneId } from '@UI/react/context/CanvasFocusContext';
import { useViewGroupManagerSync } from '@UI/react/hooks/useViewGroupManagerSync.js';
import { useViewGroups, useViewGroupLinks, useViewportSize } from '@UI/react/hooks';
import { useStatusBar } from '@UI/react/hooks/useStatusBar.js';
import { useViewportSyncListener, dispatchMoveViewport, dispatchNavigateTo } from '@UI/react/hooks/useViewportSync';
import { useLayoutContext } from '@UI/react/components/layout/ThreeEdgeLayout';
import { useWorkspaces } from '@UI/react/hooks/useWorkspaces.js';
import { useRoomActions } from '@UI/react/hooks/useRoomPresence.js';
import { useRoomsTab } from '@UI/react/components/panels/RightPanel/tabs/RoomsTab/hooks/useRoomsTab.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { getViewConfigurationManager, getDatasetManager } from '@Init/appInitializer.js';
import { sessionManager } from '@Core/session/sessionManager.js';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { vrManager } from '@Core/vr/VRManager.js';
import { workspace as log } from '@Utils/logger.js';
import { normalizeInstanceToolsResult } from '@UI/react/utils/instanceTools.js';
import { useCanvasHistory } from '@UI/react/store/canvasHistoryStore';
// Viewport sync handled by CanvasGrid - no need to import here

import './CanvasWorkspace.scss';

// =============================================================================
// PANE-ISOLATED CANVAS RENDERER
// =============================================================================
// This component wraps CanvasGrid with ViewStackProvider to ensure each pane
// (whether in tile mode, tab mode, or floating window) has independent state.
//
// PANE ISOLATION PATTERN:
// -----------------------
// PROBLEM: When multiple panes share a single context provider, state changes
// in one pane affect ALL panes. For example, clicking "Focus" in pane A would
// cause ALL panes to enter focus mode.
//
// SOLUTION: Wrap each pane's CanvasGrid with its own ViewStackProvider instance.
//
// CHECKLIST for pane-scoped features:
// 1. ViewStackProvider - focus/subset mode (DONE - wrapped here)
// 2. CanvasFocusProvider - active instance per pane (DONE - in TiledCanvasView/FloatingWindow)
// 3. Any new feature state (VR mode, selection, etc.) needs its own provider
//    OR must filter events by paneId
//
// HOW TO IDENTIFY: If clicking/interacting in one pane affects other panes,
// check if the feature uses:
//   - A shared context (React.createContext) → Wrap with per-pane provider
//   - Global events without paneId filtering → Add paneId to event detail
//   - Global state (workspaceManager.xxx) → Use pane-scoped getters/setters
// =============================================================================

/**
 * IsolatedCanvasGrid - CanvasGrid with pane-isolated ViewStackProvider
 *
 * Use this component instead of CanvasGrid directly when rendering in multi-pane
 * contexts (tile mode, floating windows, etc.) to ensure focus mode and other
 * view stack features are isolated per pane.
 */
function IsolatedCanvasGrid({ children, ...canvasGridProps }) {
    return (
        <ViewStackProvider>
            <CanvasGrid {...canvasGridProps}>
                {children}
            </CanvasGrid>
        </ViewStackProvider>
    );
}

/**
 * WorkspaceCanvasRenderer - Unified canvas renderer for all modes
 *
 * Handles loading states, errors, and wraps CanvasGrid with proper isolation.
 * Used by both tile mode and floating window mode.
 */
function WorkspaceCanvasRenderer({
    canvasId,
    showCoordinates,
    showViewGroupBorders,
    isEnsuringCanvas = false,
    // Optional overrides - if not provided, uses useCanvas internally
    canvas: canvasProp,
    loading: loadingProp,
    error: errorProp,
    viewport: viewportProp,
    placements: placementsProp,
    onViewportChange: onViewportChangeProp,
    onRemovePlacement: onRemovePlacementProp,
    onAddRow: onAddRowProp,
    onAddColumn: onAddColumnProp,
    onAddContent: onAddContentProp,
    // Additional CanvasGrid props
    viewGroups = [],
    ...extraGridProps
}) {
    // Use internal hook if props not provided
    const canvasHook = useCanvas(canvasId);

    const canvas = canvasProp ?? canvasHook.canvas;
    const loading = loadingProp ?? canvasHook.loading;
    const error = errorProp ?? canvasHook.error;
    const viewport = viewportProp ?? canvasHook.viewport;
    const placements = placementsProp ?? canvasHook.visiblePlacements;
    const moveViewport = onViewportChangeProp ?? canvasHook.moveViewport;
    const removePlacement = onRemovePlacementProp ?? canvasHook.removePlacement;
    const addRow = onAddRowProp ?? canvasHook.addRow;
    const addColumn = onAddColumnProp ?? canvasHook.addColumn;
    const addPlacement = canvasHook.addPlacement;

    const handleAddContent = useCallback(async (row, col, type) => {
        if (onAddContentProp) {
            return onAddContentProp(row, col, type);
        }

        if (!canvasId) return;

        switch (type) {
            case 'view':
                window.dispatchEvent(new CustomEvent('cia:open-dataset-selector', {
                    detail: { targetRow: row, targetCol: col, canvasId },
                }));
                break;
            case 'notes':
                await addPlacement?.({
                    row,
                    col,
                    rowSpan: 1,
                    colSpan: 1,
                    content: {
                        type: 'notes',
                        notesBlockId: null,
                    },
                });
                break;
            case 'image':
                window.dispatchEvent(new CustomEvent('cia:open-image-selector', {
                    detail: {
                        targetRow: row,
                        targetCol: col,
                        purpose: 'add-image-to-cell',
                        canvasId,
                    },
                }));
                break;
            default:
                break;
        }
    }, [onAddContentProp, addPlacement, canvasId]);

    // Loading/error states
    if (!canvasId) {
        if (isEnsuringCanvas) {
            return <div className="canvas-workspace__loading">Preparing canvas...</div>;
        }
        return (
            <div className="canvas-workspace__empty">
                <p>No canvas for this workspace</p>
            </div>
        );
    }

    if (loading && !canvas) {
        return <div className="canvas-workspace__loading">Loading canvas...</div>;
    }

    if (error) {
        return (
            <div className="canvas-workspace__error">
                {error?.message || 'Failed to load canvas'}
            </div>
        );
    }

    if (!canvas) {
        return (
            <div className="canvas-workspace__empty">
                <p>No canvas selected</p>
            </div>
        );
    }

    return (
        <IsolatedCanvasGrid
            canvasId={canvasId}
            viewport={viewport}
            placements={placements}
            showCoordinates={showCoordinates}
            showViewGroupBorders={showViewGroupBorders}
            viewGroups={viewGroups}
            onViewportChange={moveViewport}
            onRemovePlacement={removePlacement}
            onAddRow={addRow}
            onAddColumn={addColumn}
            onAddContent={handleAddContent}
            {...extraGridProps}
        />
    );
}

// Legacy alias for backward compatibility
const WorkspaceTileCanvas = WorkspaceCanvasRenderer;

const DEFAULT_WINDOW_SIZE = { width: 860, height: 620 };
const DEFAULT_WINDOW_OFFSET = { x: 140, y: 120 };
const WINDOW_OFFSET_STEP = 32;
const DEFAULT_TOOL_STATE = {
    editMode: false,
    activeTool: 'select',
    mergeMode: false,
    flowDirection: 'row',
};
const SNAP_THRESHOLD = 16;
const FREE_LAYOUT_PADDING = 120;
const FREE_LAYOUT_GAP = 24;
const EMPTY_FOOTER_PROPS = {}; // Stable reference to avoid re-renders

const WorkspaceFloatingWindow = React.memo(function WorkspaceFloatingWindow({
    workspace,
    position,
    size,
    zIndex,
    onPositionChange,
    onSizeChange,
    onFocus,
    onClose,
    showCoordinates,
    showViewGroupBorders,
    isFocused = false,
    footer1Props,
    footer2,
    infoBar,
    isEnsuringCanvas = false,
    toolState,
    onEditModeChange,
    onToolChange,
    onMergeModeChange,
    onFlowDirectionChange,
    onOpenNavigator,
}) {
    // Use workspace.id as fallback if activeCanvasId not set yet
    const canvasId = workspace?.activeCanvasId || workspace?.id || null;
    const paneId = canvasId ? generatePaneId(canvasId, 0) : null;
    const {
        canvas,
        loading,
        error,
        viewport,
        addPlacement,
        removePlacement,
        addRow,
        addColumn,
        moveViewport,
        setViewportPosition,
    } = useCanvas(canvasId);
    const effectiveToolState = toolState || DEFAULT_TOOL_STATE;
    const {
        editMode,
        activeTool,
        mergeMode,
        flowDirection,
    } = effectiveToolState;

    const handleEditModeChange = useCallback((newEditMode) => {
        onEditModeChange?.(newEditMode, canvasId);
    }, [canvasId, onEditModeChange]);

    const handleToolChange = useCallback((newTool) => {
        onToolChange?.(newTool, canvasId);
    }, [canvasId, onToolChange]);

    const handleMergeModeChange = useCallback((newMergeMode) => {
        onMergeModeChange?.(newMergeMode, canvasId);
    }, [canvasId, onMergeModeChange]);

    const handleEditBarGridAction = useCallback((action) => {
        if (action === 'merge') {
            handleMergeModeChange(!mergeMode);
            return;
        }
        log.debug(`Canvas edit action not yet implemented: ${action}`);
    }, [handleMergeModeChange, mergeMode]);

    const handleEditBarRowAction = useCallback((action) => {
        if (action === 'add') {
            if (flowDirection === 'row') {
                addColumn();
            } else {
                addRow();
            }
            return;
        }
        if (action === 'remove') {
            const cachedCanvas = canvasManager.getCanvas(canvasId);
            if (!cachedCanvas) return;
            if (flowDirection === 'row') {
                const nextCols = Math.max(1, cachedCanvas.dimensions.cols - 1);
                canvasManager.updateCanvas(canvasId, {
                    dimensions: { ...cachedCanvas.dimensions, cols: nextCols },
                });
            } else {
                const nextRows = Math.max(1, cachedCanvas.dimensions.rows - 1);
                canvasManager.updateCanvas(canvasId, {
                    dimensions: { ...cachedCanvas.dimensions, rows: nextRows },
                });
            }
        }
    }, [addColumn, addRow, canvasId, flowDirection]);

    const handleAddContent = useCallback(async (row, col, type) => {
        if (!canvasId) return;

        switch (type) {
            case 'view':
                window.dispatchEvent(new CustomEvent('cia:open-dataset-selector', {
                    detail: {
                        targetRow: row,
                        targetCol: col,
                        canvasId,
                    }
                }));
                break;
            case 'notes':
                try {
                    await addPlacement({
                        row,
                        col,
                        rowSpan: 1,
                        colSpan: 1,
                        content: {
                            type: 'notes',
                            notesBlockId: null,
                        },
                    });
                } catch (err) {
                    log.error('Failed to add notes placement:', err);
                }
                break;
            case 'image':
                window.dispatchEvent(new CustomEvent('cia:open-image-selector', {
                    detail: {
                        targetRow: row,
                        targetCol: col,
                        purpose: 'add-image-to-cell',
                        canvasId,
                    }
                }));
                break;
            default:
                log.warn(`Unknown content type: ${type}`);
        }
    }, [addPlacement, canvasId]);

    const canvasSize = useMemo(() => ({
        cols: canvas?.dimensions?.cols || 1,
        rows: canvas?.dimensions?.rows || 1,
    }), [canvas?.dimensions?.cols, canvas?.dimensions?.rows]);

    const viewportSize = useMemo(() => ({
        cols: viewport?.cols || 1,
        rows: viewport?.rows || 1,
    }), [viewport?.cols, viewport?.rows]);

    const viewportPosition = useMemo(() => ({
        col: viewport?.col || 0,
        row: viewport?.row || 0,
    }), [viewport?.col, viewport?.row]);

    return (
        <CanvasFocusProvider
            canvasId={canvasId}
            paneId={paneId}
            isFocused={isFocused}
        >
            <FloatingCanvasWrapper
                canvasMode={CANVAS_MODES.FLOATING}
                position={position}
                size={size}
                onPositionChange={onPositionChange}
                onSizeChange={onSizeChange}
                onFocus={onFocus}
                zIndex={zIndex}
            >
                <CanvasChrome
                className="canvas-workspace__window"
                headerProps={{
                    canGoBack: false,
                    onGoBack: undefined,
                    onGoHome: undefined,
                    workspace,
                    workspaces: [],
                    onWorkspaceChange: undefined,
                    allowWorkspaceSwitch: false,
                    viewGroup: null,
                    viewGroups: [],
                    onViewGroupChange: undefined,
                    isViewGroupLinked: false,
                    onEditViewGroup: undefined,
                    onOpenViewGroupManager: undefined,
                    isEditMode: editMode,
                    onToggleEditMode: handleEditModeChange,
                    flowDirection: flowDirection === 'row' ? 'right' : 'down',
                    onFlowDirectionChange: (direction) => {
                        const nextDirection = direction === 'right' ? 'row' : 'column';
                        onFlowDirectionChange?.(nextDirection);
                    },
                    showCoordinates,
                    showViewGroupBorders,
                    onToggleCoordinates: undefined,
                    onToggleViewGroupBorders: undefined,
                    canvasSize,
                    viewportSize,
                    viewportPosition,
                    onMoveViewport: moveViewport,
                    onHome: () => setViewportPosition(0, 0),
                    onOpenNavigator,
                    windowMode: 'floating',
                    showWindowControls: false,
                    onCloseWorkspace: onClose,
                }}
                editBarProps={isFocused ? {
                    activeTool,
                    onToolChange: handleToolChange,
                    onGridAction: handleEditBarGridAction,
                    onRowAction: handleEditBarRowAction,
                    onDone: () => handleEditModeChange(false),
                } : null}
                footer1Props={isFocused ? footer1Props : EMPTY_FOOTER_PROPS}
                footer2={isFocused ? footer2 : null}
                infoBar={isFocused ? infoBar : null}
                isEditMode={isFocused ? editMode : false}
            >
                <WorkspaceCanvasRenderer
                    canvasId={canvasId}
                    showCoordinates={showCoordinates}
                    showViewGroupBorders={showViewGroupBorders}
                    isEnsuringCanvas={isEnsuringCanvas}
                    canvas={canvas}
                    loading={loading}
                    error={error}
                    onRemovePlacement={removePlacement}
                    onAddRow={addRow}
                    onAddColumn={addColumn}
                    onAddContent={handleAddContent}
                />
                </CanvasChrome>
            </FloatingCanvasWrapper>
        </CanvasFocusProvider>
    );
});

/**
 * CanvasWorkspaceInner - Internal component with ViewStack context
 */
function CanvasWorkspaceInner({
    userId,
    projectId: propProjectId,
    leftPanelContent,
    rightPanelContent,
    onCloseWorkspace,
    onRenameWorkspace,
    onDeactivateWorkspace,
    workspaceViewMode = 'tabs',
    workspaceTabs = [],
    activeWorkspaceId,
    onSelectWorkspace,
    onSetWorkspaceViewMode,
    ensuringWorkspaceIds = {},
    // Server-persisted preferences
    tileMaximizedWorkspaceId,
    onMaximizeWorkspace,
    windowPositions = {},
    windowSizes = {},
    viewportPositions = {},
    onWindowPositionChange,
    onWindowSizeChange,
    onViewportPositionChange,
}) {
    const layoutContext = useLayoutContext();
    const { isVR } = useAdaptive();
    const [isInImmersiveSession, setIsInImmersiveSession] = useState(() => vrManager.isInVR());
    const setLeftDockedOpen = layoutContext?.setLeftOpen || (() => { });
    const setRightDockedOpen = layoutContext?.setRightOpen || (() => { });
    // Use sessionManager room ID as fallback project ID
    const projectId = useMemo(() => {
        return propProjectId || sessionManager.getRoomId?.() || 'default-project';
    }, [propProjectId]);

    const [activeCanvasId, setActiveCanvasId] = useState(null);
    const [showSubsetPanel, setShowSubsetPanel] = useState(false);
    const [showSubsetSelector, setShowSubsetSelector] = useState(false);
    const [highlightedPlacementId, setHighlightedPlacementId] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const instanceCreationInProgress = useRef(false);

    // Floating panel state
    const [leftPanelOpen, setLeftPanelOpen] = useState(false);
    const [rightPanelOpen, setRightPanelOpen] = useState(false);
    const [showCreateWorkspacePanel, setShowCreateWorkspacePanel] = useState(false);
    const [createWorkspaceDefaults, setCreateWorkspaceDefaults] = useState({
        type: 'project',
        namePrefix: 'Workspace',
    });
    const [createWorkspaceAllowedTypes, setCreateWorkspaceAllowedTypes] = useState(null);
    const [showCloseAllTilesConfirm, setShowCloseAllTilesConfirm] = useState(false);
    const [skipCloseAllTilesConfirm, setSkipCloseAllTilesConfirm] = useState(false);


    // Canvas mode state (dock/float/fullscreen)
    const [canvasMode, setCanvasMode] = useState(CANVAS_MODES.DOCKED);
    const [aspectRatio, setAspectRatio] = useState('FREE');
    const [floatingPosition, setFloatingPosition] = useState({ x: 100, y: 100 });
    const [floatingSize, setFloatingSize] = useState({ width: 800, height: 600 });

    // Header bar state (edit mode, tools, flow)
    const [editMode, setEditMode] = useState(DEFAULT_TOOL_STATE.editMode);
    const [activeTool, setActiveTool] = useState(DEFAULT_TOOL_STATE.activeTool);
    const [mergeMode, setMergeMode] = useState(DEFAULT_TOOL_STATE.mergeMode);
    const [flowDirection, setFlowDirection] = useState(DEFAULT_TOOL_STATE.flowDirection);
    const [showCoordinates, setShowCoordinates] = useState(false);
    const [showViewGroupBorders, setShowViewGroupBorders] = useState(false);
    const [closedWorkspaceIds, setClosedWorkspaceIds] = useState([]);
    // Tile maximized state - use prop if provided, otherwise local state
    const [localTileMaximizedId, setLocalTileMaximizedId] = useState(null);
    const effectiveTileMaximizedId = tileMaximizedWorkspaceId ?? localTileMaximizedId;
    const setTileMaximizedWorkspaceId = useCallback((id) => {
        // Update both local state and prop callback (for server persistence)
        setLocalTileMaximizedId(id);
        onMaximizeWorkspace?.(id);
    }, [onMaximizeWorkspace]);
    const [windowLayouts, setWindowLayouts] = useState({});
    const [windowOrder, setWindowOrder] = useState([]);
    const [workspaceToolState, setWorkspaceToolState] = useState({});
    const freeLayoutRef = useRef(null);
    const [freeLayoutBounds, setFreeLayoutBounds] = useState({ width: 0, height: 0 });
    const layoutLoadedRef = useRef(false);
    const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
    const loadingShowTimerRef = useRef(null);
    const loadingHideTimerRef = useRef(null);
    const loadingStartRef = useRef(0);

    const { syncStatus: rawSyncStatus, onlineCount } = useStatusBar();

    const infoSyncStatus = useMemo(() => {
        if (rawSyncStatus === 'connected') return 'synced';
        if (rawSyncStatus === 'syncing') return 'syncing';
        return 'disconnected';
    }, [rawSyncStatus]);

    // Rooms and workspaces hooks
    const { currentRoom } = useRoomsTab({ projectId });
    const layoutStorageKey = useMemo(() => {
        let roomKey = currentRoom?.id;
        if (!roomKey) {
            try {
                roomKey = sessionManager.getRoomId?.();
            } catch {
                roomKey = null;
            }
        }
        if (!roomKey) return null;
        const userKey = userId || sessionManager.getUserId?.() || 'anon';
        const projectScope = projectId || 'default';
        return `cia:workspace-window-layouts:${userKey}:${projectScope}:${roomKey}`;
    }, [currentRoom?.id, projectId, userId]);
    const closeAllTilesStorageKey = useMemo(() => {
        let roomKey = currentRoom?.id;
        if (!roomKey) {
            try {
                roomKey = sessionManager.getRoomId?.();
            } catch {
                roomKey = null;
            }
        }
        if (!roomKey) return null;
        const userKey = userId || sessionManager.getUserId?.() || 'anon';
        const projectScope = projectId || 'default';
        return `cia:close-all-tiles-confirm:${userKey}:${projectScope}:${roomKey}`;
    }, [currentRoom?.id, projectId, userId]);

    const { setWorkspace: setWorkspacePresence } = useRoomActions();

    const {
        workspaces: allWorkspaces,
        currentWorkspaceId,
        selectWorkspace,
        createBreakout,
        createProjectWorkspace,
        createPersonalWorkspace,
        isLoading: isWorkspacesLoading,
    } = useWorkspaces({ userId, projectId, roomId: currentRoom?.id });

    // Transform workspaces for the selector
    const workspacesForSelector = useMemo(() => {
        return allWorkspaces || [];
    }, [allWorkspaces]);

    const tileWorkspaces = useMemo(() => {
        if (workspaceTabs && workspaceTabs.length > 0) {
            return workspaceTabs;
        }
        return workspacesForSelector.map((workspace) => ({
            ...workspace,
            isOpen: true,
        }));
    }, [workspaceTabs, workspacesForSelector]);

    const hasOpenWorkspaces = useMemo(
        () => tileWorkspaces.some((workspace) => workspace.isOpen),
        [tileWorkspaces]
    );
    const openTileWorkspaceNames = useMemo(() => (
        tileWorkspaces
            .filter((workspace) => workspace.isOpen)
            .map((workspace) => workspace.name || 'Untitled Workspace')
    ), [tileWorkspaces]);

    useEffect(() => {
        if (!closeAllTilesStorageKey) return;
        try {
            const stored = window.localStorage.getItem(closeAllTilesStorageKey);
            setSkipCloseAllTilesConfirm(stored === '1');
        } catch (error) {
            log.debug('Close-all tiles localStorage read failed:', error);
        }
    }, [closeAllTilesStorageKey]);

    useEffect(() => {
        if (!closeAllTilesStorageKey) return;
        try {
            window.localStorage.setItem(closeAllTilesStorageKey, skipCloseAllTilesConfirm ? '1' : '0');
        } catch (error) {
            log.debug('Close-all tiles localStorage write failed:', error);
        }
    }, [closeAllTilesStorageKey, skipCloseAllTilesConfirm]);
    const closedWorkspaceSet = useMemo(
        () => new Set(closedWorkspaceIds),
        [closedWorkspaceIds]
    );

    const currentWorkspace = useMemo(() => {
        return allWorkspaces?.find(ws => ws.id === currentWorkspaceId) || null;
    }, [allWorkspaces, currentWorkspaceId]);
    const activeWorkspaceKey = activeWorkspaceId || currentWorkspaceId;
    const activeWorkspaceEnsuring = Boolean(
        (activeWorkspaceKey && ensuringWorkspaceIds?.[activeWorkspaceKey])
    );
    const isCanvasBusy = Boolean(
        isWorkspacesLoading
        || activeWorkspaceEnsuring
        || (activeCanvasId && isLoading && !canvas)
    );
    const loadingLabel = useMemo(() => {
        if (isWorkspacesLoading) return 'Loading workspace...';
        if (activeWorkspaceEnsuring) return 'Preparing canvas...';
        if (isLoading && !canvas) return 'Loading canvas...';
        return 'Loading canvas...';
    }, [activeWorkspaceEnsuring, canvas, isLoading, isWorkspacesLoading]);

    useEffect(() => {
        if (isCanvasBusy) {
            if (loadingHideTimerRef.current) {
                clearTimeout(loadingHideTimerRef.current);
                loadingHideTimerRef.current = null;
            }
            if (showLoadingOverlay) return undefined;
            if (!loadingShowTimerRef.current) {
                loadingShowTimerRef.current = setTimeout(() => {
                    loadingStartRef.current = Date.now();
                    setShowLoadingOverlay(true);
                    loadingShowTimerRef.current = null;
                }, 150);
            }
        } else {
            if (loadingShowTimerRef.current) {
                clearTimeout(loadingShowTimerRef.current);
                loadingShowTimerRef.current = null;
            }
            if (!showLoadingOverlay) return undefined;
            const elapsed = Date.now() - (loadingStartRef.current || 0);
            const remaining = Math.max(0, 300 - elapsed);
            if (loadingHideTimerRef.current) {
                clearTimeout(loadingHideTimerRef.current);
            }
            loadingHideTimerRef.current = setTimeout(() => {
                setShowLoadingOverlay(false);
                loadingHideTimerRef.current = null;
            }, remaining);
        }
        return undefined;
    }, [isCanvasBusy, showLoadingOverlay]);

    useEffect(() => {
        return () => {
            if (loadingShowTimerRef.current) {
                clearTimeout(loadingShowTimerRef.current);
            }
            if (loadingHideTimerRef.current) {
                clearTimeout(loadingHideTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const handleSessionStarted = () => setIsInImmersiveSession(true);
        const handleSessionEnded = () => setIsInImmersiveSession(false);

        vrManager.on('sessionStarted', handleSessionStarted);
        vrManager.on('sessionEnded', handleSessionEnded);
        setIsInImmersiveSession(vrManager.isInVR());

        return () => {
            vrManager.off('sessionStarted', handleSessionStarted);
            vrManager.off('sessionEnded', handleSessionEnded);
        };
    }, []);

    useEffect(() => {
        if (!isInImmersiveSession) return;
        setLeftPanelOpen(false);
        setRightPanelOpen(false);
        setShowSubsetPanel(false);
    }, [isInImmersiveSession]);

    // Handle workspace change
    const handleWorkspaceChange = useCallback((workspaceId) => {
        selectWorkspace(workspaceId);
        setWorkspacePresence(workspaceId);
    }, [selectWorkspace, setWorkspacePresence]);

    const handleWorkspaceSelect = useCallback((workspaceItem) => {
        const workspaceId = workspaceItem?.id || workspaceItem;
        if (!workspaceId) return;

        setClosedWorkspaceIds((prev) => prev.filter((id) => id !== workspaceId));

        if (onSelectWorkspace) {
            onSelectWorkspace(workspaceId);
        } else {
            handleWorkspaceChange(workspaceId);
        }
    }, [handleWorkspaceChange, onSelectWorkspace]);

    const handleTileWorkspaceSelect = useCallback((workspaceId) => {
        setClosedWorkspaceIds((prev) => prev.filter((id) => id !== workspaceId));
        if (onSelectWorkspace) {
            onSelectWorkspace(workspaceId);
        } else {
            handleWorkspaceSelect(workspaceId);
        }
    }, [handleWorkspaceSelect, onSelectWorkspace]);

    const handleTileWorkspaceMaximize = useCallback((workspaceId) => {
        handleTileWorkspaceSelect(workspaceId);
        setTileMaximizedWorkspaceId((prev) => (prev === workspaceId ? null : workspaceId));
    }, [handleTileWorkspaceSelect]);

    const handleTileClearSelection = useCallback(() => {
        if (effectiveTileMaximizedId) {
            setTileMaximizedWorkspaceId(null);
        }
        onDeactivateWorkspace?.();
    }, [onDeactivateWorkspace, effectiveTileMaximizedId, setTileMaximizedWorkspaceId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        layoutLoadedRef.current = false;
        if (!layoutStorageKey) return;

        const stored = window.localStorage.getItem(layoutStorageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed && typeof parsed === 'object') {
                    setWindowLayouts(parsed.layouts || {});
                    setWindowOrder(Array.isArray(parsed.order) ? parsed.order : []);
                    setClosedWorkspaceIds(Array.isArray(parsed.closedWorkspaceIds) ? parsed.closedWorkspaceIds : []);
                    setTileMaximizedWorkspaceId(
                        typeof parsed.tileMaximizedWorkspaceId === 'string' ? parsed.tileMaximizedWorkspaceId : null
                    );
                }
            } catch (error) {
                log.warn('Failed to parse workspace window layouts:', error);
            }
        } else {
            setWindowLayouts({});
            setWindowOrder([]);
            setClosedWorkspaceIds([]);
            setTileMaximizedWorkspaceId(null);
        }

        layoutLoadedRef.current = true;
    }, [layoutStorageKey]);

    useEffect(() => {
        const openIds = tileWorkspaces
            .filter((workspace) => workspace.isOpen)
            .map((workspace) => workspace.id);

        setClosedWorkspaceIds((prev) => prev.filter((id) => openIds.includes(id)));

        setTileMaximizedWorkspaceId((prev) => (prev && !openIds.includes(prev) ? null : prev));

        setWindowLayouts((prev) => {
            const next = { ...prev };
            openIds.forEach((id, index) => {
                if (!next[id]) {
                    next[id] = {
                        position: {
                            x: DEFAULT_WINDOW_OFFSET.x + index * WINDOW_OFFSET_STEP,
                            y: DEFAULT_WINDOW_OFFSET.y + index * WINDOW_OFFSET_STEP,
                        },
                        size: { ...DEFAULT_WINDOW_SIZE },
                    };
                }
            });
            return next;
        });

        setWindowOrder((prev) => {
            const next = prev.filter((id) => openIds.includes(id));
            openIds.forEach((id) => {
                if (!next.includes(id)) {
                    next.push(id);
                }
            });
            return next;
        });

        setWorkspaceToolState((prev) => {
            const next = { ...prev };
            openIds.forEach((id) => {
                if (!next[id]) {
                    next[id] = { ...DEFAULT_TOOL_STATE };
                }
            });
            return next;
        });

        setTileMaximizedWorkspaceId((prev) => (
            prev && !openIds.includes(prev) ? null : prev
        ));
    }, [tileWorkspaces]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!layoutLoadedRef.current || !layoutStorageKey) return;

        const payload = {
            layouts: windowLayouts,
            order: windowOrder,
            closedWorkspaceIds,
            tileMaximizedWorkspaceId: effectiveTileMaximizedId,
        };
        window.localStorage.setItem(layoutStorageKey, JSON.stringify(payload));
    }, [closedWorkspaceIds, layoutStorageKey, effectiveTileMaximizedId, windowLayouts, windowOrder]);

    const handleWindowFocus = useCallback((workspaceId) => {
        if (!workspaceId) return;
        setWindowOrder((prev) => {
            const next = prev.filter((id) => id !== workspaceId);
            next.push(workspaceId);
            return next;
        });
        handleWorkspaceSelect(workspaceId);
    }, [handleWorkspaceSelect]);

    const handleCloseWorkspaceWindow = useCallback((workspaceId) => {
        if (!workspaceId) return;
        onCloseWorkspace?.(workspaceId);
        setClosedWorkspaceIds((prev) => (prev.includes(workspaceId) ? prev : [...prev, workspaceId]));
        if (activeWorkspaceKey === workspaceId) {
            const nextActive = freeLayoutWorkspaces
                .map((workspace) => workspace.id)
                .find((id) => id !== workspaceId);
            if (nextActive) {
                handleWorkspaceSelect(nextActive);
            } else {
                onDeactivateWorkspace?.();
            }
        }
    }, [activeWorkspaceKey, freeLayoutWorkspaces, handleWorkspaceSelect, onCloseWorkspace, onDeactivateWorkspace]);

    const handleCloseAllTileWorkspaces = useCallback(() => {
        const openIds = tileWorkspaces
            .filter((workspace) => workspace.isOpen)
            .map((workspace) => workspace.id);
        if (openIds.length === 0) return;
        setTileMaximizedWorkspaceId(null);
        setClosedWorkspaceIds((prev) => {
            const next = new Set(prev);
            openIds.forEach((id) => next.add(id));
            return Array.from(next);
        });
        openIds.forEach((id) => onCloseWorkspace?.(id));
        if (!onCloseWorkspace) {
            onDeactivateWorkspace?.();
        }
    }, [onCloseWorkspace, onDeactivateWorkspace, tileWorkspaces]);

    useEffect(() => {
        if (workspaceViewMode !== 'tabs') return;
        if (!activeWorkspaceKey) return;
        setClosedWorkspaceIds((prev) => prev.filter((id) => id !== activeWorkspaceKey));
        setWindowOrder((prev) => {
            const next = prev.filter((id) => id !== activeWorkspaceKey);
            next.push(activeWorkspaceKey);
            return next;
        });
    }, [activeWorkspaceKey, workspaceViewMode]);

    useEffect(() => {
        if (!activeWorkspaceKey) return;
        const storedState = workspaceToolState[activeWorkspaceKey] || DEFAULT_TOOL_STATE;
        setEditMode(storedState.editMode);
        setActiveTool(storedState.activeTool);
        setMergeMode(storedState.mergeMode);
        setFlowDirection(storedState.flowDirection);
    }, [activeWorkspaceKey, workspaceToolState]);

    useEffect(() => {
        if (!activeWorkspaceKey) return;
        setWorkspaceToolState((prev) => {
            const previous = prev[activeWorkspaceKey] || DEFAULT_TOOL_STATE;
            const next = {
                ...previous,
                editMode,
                activeTool,
                mergeMode,
                flowDirection,
            };
            const isSame =
                previous.editMode === next.editMode &&
                previous.activeTool === next.activeTool &&
                previous.mergeMode === next.mergeMode &&
                previous.flowDirection === next.flowDirection;
            if (isSame) return prev;
            return { ...prev, [activeWorkspaceKey]: next };
        });
    }, [activeWorkspaceKey, activeTool, editMode, flowDirection, mergeMode]);

    useEffect(() => {
        if (workspaceViewMode !== 'tabs') return;
        if (!freeLayoutRef.current) return;
        const element = freeLayoutRef.current;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setFreeLayoutBounds({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [workspaceViewMode]);

    const getWindowZIndex = useCallback((workspaceId) => {
        const index = windowOrder.indexOf(workspaceId);
        if (index === -1) return 1;
        return 10 + index;
    }, [windowOrder]);

    // Handle workspace creation - open the panel or route to subset/scratchpad
    const handleOpenCreateWorkspace = useCallback((intent = 'empty', allowedTypes = null) => {
        if (Array.isArray(allowedTypes) && allowedTypes.length > 0) {
            setCreateWorkspaceAllowedTypes(allowedTypes);
        } else {
            setCreateWorkspaceAllowedTypes(null);
        }
        if (intent === 'subset') {
            setShowCreateWorkspacePanel(false);
            setShowSubsetSelector(true);
            return;
        }

        if (intent === 'scratch') {
            const personalWorkspace = allWorkspaces?.find((workspace) => workspace.type === 'personal');
            if (personalWorkspace?.id) {
                handleWorkspaceSelect(personalWorkspace);
                return;
            }

            setCreateWorkspaceDefaults({
                type: 'personal',
                namePrefix: 'Scratch Pad',
            });
            setShowCreateWorkspacePanel(true);
            return;
        }

        setCreateWorkspaceDefaults({
            type: 'project',
            namePrefix: 'Workspace',
        });
        setShowCreateWorkspacePanel(true);
    }, [allWorkspaces, handleWorkspaceSelect]);
    const handleOpenCreateWorkspaceLimited = useCallback((intent = 'empty', allowedTypes = null) => {
        handleOpenCreateWorkspace(intent, allowedTypes);
    }, [handleOpenCreateWorkspace]);

    // Handle actual workspace creation from the panel
    const handleCreateWorkspace = useCallback(async ({ name, description, type }) => {
        try {
            let workspace;
            if (type === 'personal') {
                workspace = await createPersonalWorkspace(name);
            } else if (type === 'breakout') {
                workspace = await createBreakout(name, 2, currentRoom?.id);
            } else {
                workspace = await createProjectWorkspace(name, description);
            }

            if (workspace) {
                // Select/open the newly created workspace
                handleWorkspaceSelect(workspace.id);
                setWorkspacePresence(workspace.id);
                log.info('Created and selected workspace:', workspace.name);
            }
        } catch (error) {
            log.error('Failed to create workspace:', error);
            throw error; // Re-throw so the panel can handle it
        }
    }, [
        createProjectWorkspace,
        createBreakout,
        createPersonalWorkspace,
        handleWorkspaceSelect,
        setWorkspacePresence,
        currentRoom,
    ]);

    // Dispatch edit mode changes to CanvasGrid
    const handleEditModeChange = useCallback((newEditMode, targetCanvasId = activeCanvasId) => {
        setEditMode(newEditMode);
        if (!targetCanvasId) return;
        window.dispatchEvent(new CustomEvent('canvas:editModeChange', {
            detail: { editMode: newEditMode, canvasId: targetCanvasId }
        }));
    }, [activeCanvasId]);

    // Dispatch tool changes to CanvasGrid
    const handleToolChange = useCallback((newTool, targetCanvasId = activeCanvasId) => {
        setActiveTool(newTool);
        if (targetCanvasId) {
            window.dispatchEvent(new CustomEvent('canvas:toolChange', {
                detail: { tool: newTool, canvasId: targetCanvasId }
            }));
        }
        // Pan tool automatically enables edit mode
        if (newTool === 'pan') {
            handleEditModeChange(true, targetCanvasId);
        }
    }, [activeCanvasId, handleEditModeChange]);

    // Handle merge mode toggle
    const handleMergeModeChange = useCallback((newMergeMode, targetCanvasId = activeCanvasId) => {
        setMergeMode(newMergeMode);
        if (newMergeMode) {
            // Entering merge mode also enables edit mode
            handleEditModeChange(true, targetCanvasId);
        }
        if (!targetCanvasId) return;
        window.dispatchEvent(new CustomEvent('canvas:mergeModeChange', {
            detail: { mergeMode: newMergeMode, canvasId: targetCanvasId }
        }));
    }, [activeCanvasId, handleEditModeChange]);

    const handleEditBarGridAction = useCallback((action) => {
        switch (action) {
            case 'merge':
                handleMergeModeChange(!mergeMode);
                break;
            case 'split':
            case 'swap':
            default:
                log.debug(`Canvas edit action not yet implemented: ${action}`);
                break;
        }
    }, [handleMergeModeChange, mergeMode]);

    const handleEditBarRowAction = useCallback((action) => {
        if (action === 'add') {
            if (flowDirection === 'row') {
                addColumn();
            } else {
                addRow();
            }
            return;
        }

        if (action === 'remove') {
            if (flowDirection === 'row') {
                removeColumn();
            } else {
                removeRow();
            }
        }
    }, [addColumn, addRow, removeColumn, removeRow, flowDirection]);

    // Canvas hook for the active canvas
    const {
        canvas,
        viewport,
        visiblePlacements,
        loading: isLoading,
        error: canvasError,
        moveViewport,
        setViewportPosition: navigateTo,
        addPlacement: serverAddPlacement,
    } = useCanvas(activeCanvasId);

    const [syncedViewport, setSyncedViewport] = useState(() => ({
        row: viewport?.row || 0,
        col: viewport?.col || 0,
    }));

    useEffect(() => {
        if (!viewport) return;
        setSyncedViewport({ row: viewport.row, col: viewport.col });
    }, [viewport?.row, viewport?.col]);

    useViewportSyncListener({
        onViewportChanged: (nextViewport) => {
            if (!nextViewport) return;
            setSyncedViewport({
                row: nextViewport.row ?? 0,
                col: nextViewport.col ?? 0,
            });
        },
        canvasId: activeCanvasId,
    });

    // Subsets hook
    const {
        subsets,
        activeSubset: focusedSubset,
        inFocusMode: isFocusMode,
        selectionMode,
        selectedIds,
        createSubset,
        enterFocusMode,
        exitFocusMode,
        enterSelectionMode,
        exitSelectionMode,
        toggleSelection,
        addPlacementsToSubset,
    } = useSubsets(activeCanvasId);

    const handleDockLeftPanel = useCallback(() => {
        setLeftDockedOpen(true);
        setLeftPanelOpen(false);
    }, [setLeftDockedOpen, setLeftPanelOpen]);

    const handleDockRightPanel = useCallback(() => {
        setRightDockedOpen(true);
        setRightPanelOpen(false);
    }, [setRightDockedOpen, setRightPanelOpen]);

    useEffect(() => {
        if (!currentWorkspace?.activeCanvasId) {
            setActiveCanvasId(null);
            return;
        }

        setActiveCanvasId(currentWorkspace.activeCanvasId);
        canvasManager.setActiveCanvas(currentWorkspace.activeCanvasId);
    }, [currentWorkspace?.activeCanvasId]);

    useEffect(() => {
        if (canvasMode !== CANVAS_MODES.DOCKED) {
            setCanvasMode(CANVAS_MODES.DOCKED);
        }
    }, [canvasMode, workspaceViewMode]);

    // NOTE: Viewport sync events are handled by CanvasGrid directly
    // Do NOT listen here to avoid double movement

    // Add placement (server-authoritative)
    const addPlacement = useCallback(async (placementData) => {
        if (!activeCanvasId) {
            throw new Error('No canvas available');
        }
        return serverAddPlacement(placementData);
    }, [activeCanvasId, serverAddPlacement]);

    // Add row to canvas (server-authoritative)
    const addRow = useCallback(async () => {
        const cachedCanvas = canvasManager.getCanvas(activeCanvasId);
        if (!cachedCanvas) return;

        log.debug('Adding row to canvas');
        await canvasManager.updateCanvas(activeCanvasId, {
            dimensions: { ...cachedCanvas.dimensions, rows: cachedCanvas.dimensions.rows + 1 }
        });
    }, [activeCanvasId]);

    // Add column to canvas (server-authoritative)
    const addColumn = useCallback(async () => {
        const cachedCanvas = canvasManager.getCanvas(activeCanvasId);
        if (!cachedCanvas) return;

        log.debug('Adding column to canvas');
        await canvasManager.updateCanvas(activeCanvasId, {
            dimensions: { ...cachedCanvas.dimensions, cols: cachedCanvas.dimensions.cols + 1 }
        });
    }, [activeCanvasId]);

    const removeRow = useCallback(async () => {
        const cachedCanvas = canvasManager.getCanvas(activeCanvasId);
        if (!cachedCanvas) return;

        const nextRows = Math.max(1, cachedCanvas.dimensions.rows - 1);
        log.debug('Removing row from canvas');
        await canvasManager.updateCanvas(activeCanvasId, {
            dimensions: { ...cachedCanvas.dimensions, rows: nextRows }
        });
    }, [activeCanvasId]);

    const removeColumn = useCallback(async () => {
        const cachedCanvas = canvasManager.getCanvas(activeCanvasId);
        if (!cachedCanvas) return;

        const nextCols = Math.max(1, cachedCanvas.dimensions.cols - 1);
        log.debug('Removing column from canvas');
        await canvasManager.updateCanvas(activeCanvasId, {
            dimensions: { ...cachedCanvas.dimensions, cols: nextCols }
        });
    }, [activeCanvasId]);

    // Remove placement (server-authoritative)
    const removePlacement = useCallback(async (placementId) => {
        if (!placementId) return;
        const found = canvasManager.findPlacement?.(placementId);
        const placement = found?.placement;
        const canvasId = found?.canvas?.id || null;
        const viewManager = getViewConfigurationManager();
        const viewId = placement?.content?.viewConfigurationId || placement?.content?.viewId || null;
        const view = viewId ? viewManager?.getView?.(viewId) : null;
        const viewName = view?.name ? `"${view.name}"` : null;
        const row = placement?.row ?? 0;
        const col = placement?.col ?? 0;
        const rowSpan = placement?.rowSpan ?? 1;
        const colSpan = placement?.colSpan ?? 1;
        const content = placement?.content;
        let currentPlacementId = placementId;
        log.debug('Removing placement:', placementId);
        await canvasManager.removePlacement(placementId);

        if (viewId && !canvasManager.isViewOnCanvas(viewId)) {
            viewManager?.deactivateView?.(viewId);
        }

        if (!canvasId || !content) {
            return;
        }

        canvasHistory.record({
            type: 'DELETE',
            description: viewName ? `Remove ${viewName}` : 'Remove placement',
            undo: async () => {
                const restored = await canvasManager.addPlacement(canvasId, {
                    row,
                    col,
                    rowSpan,
                    colSpan,
                    content,
                });
                currentPlacementId = restored?.id || currentPlacementId;
                if (viewId) {
                    viewManager?.activateView?.(viewId);
                }
            },
            redo: async () => {
                await canvasManager.removePlacement(currentPlacementId);
                if (viewId && !canvasManager.isViewOnCanvas(viewId)) {
                    viewManager?.deactivateView?.(viewId);
                }
            },
        });
    }, []);

    // Find next empty cell for placement
    const findNextEmptyCell = useCallback(() => {
        if (!canvas) return { row: 0, col: 0 };

        const occupiedCells = new Set();
        if (canvas.placements) {
            canvas.placements.forEach(p => {
                for (let r = p.row; r < p.row + (p.rowSpan || 1); r++) {
                    for (let c = p.col; c < p.col + (p.colSpan || 1); c++) {
                        occupiedCells.add(`${r}-${c}`);
                    }
                }
            });
        }

        // Search for empty cell in viewport first, then expand
        const maxRows = canvas.dimensions?.rows || 10;
        const maxCols = canvas.dimensions?.cols || 10;

        for (let r = 0; r < maxRows; r++) {
            for (let c = 0; c < maxCols; c++) {
                if (!occupiedCells.has(`${r}-${c}`)) {
                    return { row: r, col: c };
                }
            }
        }

        // All cells occupied, return next row
        return { row: maxRows, col: 0 };
    }, [canvas]);

    // Access view stack for navigation
    const {
        focusView,
        openSubset,
        isGridView,
        isFocusView,
        isSubsetView,
        goHome,
        goBack,
        canGoBack,
        currentView,
    } = useViewStack();

    // Get active view from view context (source of truth for what's currently selected)
    const {
        activeView: contextActiveView,
        onCanvasViews,
        availableViews,
        onSelectView: contextSelectView,
        onPlaceView: contextPlaceView,
        onViewAction: contextViewAction,
        onUpdateLink: contextUpdateLink,
    } = useViewContextLogic();

    const {
        past: historyPast,
        future: historyFuture,
        isUndoing,
        isRedoing,
        undo,
        redo,
    } = useCanvasHistory((state) => ({
        past: state.past,
        future: state.future,
        isUndoing: state.isUndoing,
        isRedoing: state.isRedoing,
        undo: state.undo,
        redo: state.redo,
    }));
    const canUndo = historyPast.length > 0 && !isUndoing && !isRedoing;
    const canRedo = historyFuture.length > 0 && !isUndoing && !isRedoing;

    // Connect WebSocket broadcasts to ViewGroupManager
    useViewGroupManagerSync();

    // ViewGroup data for header and footer (shared source of truth)
    const {
        visibleViewGroups,
        activeViewGroupId,
        createViewGroup,
        updateViewGroup,
        deleteViewGroup,
        duplicateViewGroup,
        selectViewGroup,
        goToViewGroup,
    } = useViewGroups(currentWorkspaceId || projectId);

    const { isLinked: isViewGroupLinked } = useViewGroupLinks(activeViewGroupId);
    const formattedViewGroups = useMemo(() => (
        visibleViewGroups.map(vg => ({
            id: vg.id,
            name: vg.name || 'Untitled Group',
            color: vg.color,
            layoutId: vg.layoutId,
            views: vg.getViewIds?.() || [],
            canvasPosition: vg.getCanvasPosition?.() || vg.canvasPosition,
            linkedTo: vg.link?.targetGroupId || null,
            linkedToName: vg.link?.targetGroupName || null,
        }))
    ), [visibleViewGroups]);

    const activeHeaderViewGroup = useMemo(() => (
        formattedViewGroups.find(vg => vg.id === activeViewGroupId) || null
    ), [formattedViewGroups, activeViewGroupId]);

    const handleSelectViewGroup = useCallback((viewGroupId) => {
        selectViewGroup(viewGroupId);
    }, [selectViewGroup]);

    const handleCreateViewGroup = useCallback(async (layoutId, templateId) => {
        try {
            await createViewGroup(layoutId, templateId);
        } catch (error) {
            log.error('Failed to create ViewGroup:', error);
        }
    }, [createViewGroup]);

    const handleUpdateViewGroup = useCallback(async (viewGroupId, updates) => {
        try {
            await updateViewGroup(viewGroupId, updates);
        } catch (error) {
            log.error('Failed to update ViewGroup:', error);
        }
    }, [updateViewGroup]);

    const handleDeleteViewGroup = useCallback(async (viewGroupId) => {
        try {
            await deleteViewGroup(viewGroupId);
        } catch (error) {
            log.error('Failed to delete ViewGroup:', error);
        }
    }, [deleteViewGroup]);

    const handleDuplicateViewGroup = useCallback(async (viewGroupId, linkOption) => {
        try {
            const linkOptionMap = {
                keepIndividual: 'keep_individual',
                linkToOriginal: 'link_to_original',
                noLinks: 'no_links',
            };

            await duplicateViewGroup(viewGroupId, {
                linkOption: linkOptionMap[linkOption] || 'no_links',
            });
        } catch (error) {
            log.error('Failed to duplicate ViewGroup:', error);
        }
    }, [duplicateViewGroup]);

    const handleGoToViewGroup = useCallback((viewGroupId) => {
        goToViewGroup(viewGroupId);
    }, [goToViewGroup]);

    // Dynamic footer width measurement
    const footerRef = useRef(null);
    const [footerWidth, setFooterWidth] = useState(1200);

    useEffect(() => {
        if (!footerRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                setFooterWidth(entry.contentRect.width);
            }
        });
        observer.observe(footerRef.current);
        return () => observer.disconnect();
    }, []);

    // Get layout context for panel focus mode (collapse panels when entering focus view)
    // Renamed to avoid collision with useSubsets's enterFocusMode/exitFocusMode
    const {
        enterFocusMode: enterPanelFocusMode,
        exitFocusMode: exitPanelFocusMode
    } = useLayoutContext();

    // Track previous focus view state to detect exit
    const wasFocusViewRef = useRef(isFocusView);

    // Restore panels when exiting focus view (e.g., pressing Escape, clicking back)
    useEffect(() => {
        // Detect transition from focus view to non-focus view
        if (wasFocusViewRef.current && !isFocusView) {
            exitPanelFocusMode?.();
        }
        wasFocusViewRef.current = isFocusView;
    }, [isFocusView, exitPanelFocusMode]);

    // ==========================================================================
    // INSTANCE TOOLS STATE (from handler)
    // ==========================================================================

    const [instanceToolsData, setInstanceToolsData] = useState({ sections: [], tools: [] });

    // Load tools when active instance changes
    useEffect(() => {
        const loadInstanceTools = () => {
            const instance = workspaceManager?.getActiveInstance?.();
            log.debug('InstanceTools: Active instance:', instance?.instanceId);

            if (!instance?.instanceId) {
                log.debug('InstanceTools: No active instance, clearing tools');
                setInstanceToolsData({ sections: [], tools: [] });
                return;
            }

            try {
                // Get structured tools from the instance handler
                const result = workspaceManager.getInstanceTools(instance.instanceId);
                const normalized = normalizeInstanceToolsResult(result);
                log.debug('InstanceTools: Loaded tools:', normalized.tools?.length, normalized.tools?.map(t => t.id));
                setInstanceToolsData(normalized);
            } catch (err) {
                log.warn('Failed to load instance tools:', err);
                setInstanceToolsData({ sections: [], tools: [] });
            }
        };

        loadInstanceTools();

        // Listen for instance focus changes
        const handleInstanceFocus = () => {
            log.debug('InstanceTools: Instance focus event received');
            loadInstanceTools();
        };
        window.addEventListener('cia:instance-focused', handleInstanceFocus);
        window.addEventListener('cia:active-instance-changed', handleInstanceFocus);
        window.addEventListener('cia:tools-updated', handleInstanceFocus);

        return () => {
            window.removeEventListener('cia:instance-focused', handleInstanceFocus);
            window.removeEventListener('cia:active-instance-changed', handleInstanceFocus);
            window.removeEventListener('cia:tools-updated', handleInstanceFocus);
        };
    }, [contextActiveView]);

    // Split tools by placement: notch (quick-access) vs footer (display/config)
    const { notchTools, footerTools, toolSections } = useMemo(() => {
        const { sections = [], tools = [] } = instanceToolsData;
        return {
            notchTools: tools.filter(t => t.placement === 'notch'),
            footerTools: tools.filter(t => t.placement === 'footer'),
            toolSections: sections,
        };
    }, [instanceToolsData]);

    // Listen for "Add to Subset" requests from ViewHeader menus
    useEffect(() => {
        const handleAddToSubsetRequest = (e) => {
            log.debug('Add to Subset request received:', e.detail);
            // Show the subset selector modal
            setShowSubsetSelector(true);
        };

        window.addEventListener('cia:add-to-subset-request', handleAddToSubsetRequest);
        return () => {
            window.removeEventListener('cia:add-to-subset-request', handleAddToSubsetRequest);
        };
    }, []);

    // Handle tool selection from notch
    // Note: For menu items, the onClick is already called directly in ToolMenu.handleSelect
    // This callback is mainly for logging and handling non-menu tools
    const handleNotchToolSelect = useCallback((tool) => {
        log.debug('Notch tool selected:', tool?.id, tool?.selectedOption?.id);
        // onClick is already called in ToolMenu.handleSelect for menu options
        // For non-menu tools (type !== 'menu'), the onClick would be on the tool itself
        if (tool.type !== 'menu' && tool.onClick) {
            log.debug('  -> Calling tool.onClick() for non-menu tool');
            tool.onClick();
        }
    }, []);

    // Handle opening full Instance Tools panel
    const handleResetCamera = useCallback(() => {
        const instance = workspaceManager?.getActiveInstance?.();
        if (instance?.instanceId) {
            workspaceManager.resetCamera?.(instance.instanceId);
            // Zoom level will be updated via onCameraChange subscription
        }
    }, []);

    // ==========================================================================
    // DUPLICATE VIEW & VIEW SETTINGS HANDLERS
    // ==========================================================================

    const handleDuplicateView = useCallback(() => {
        log.debug('Duplicate view requested from Footer2');
        if (contextActiveView?.id) {
            window.dispatchEvent(new CustomEvent('cia:duplicate-view', {
                detail: { viewId: contextActiveView.id }
            }));
        }
    }, [contextActiveView]);

    const handleViewSettings = useCallback(() => {
        log.debug('View settings requested from Footer2');
        if (contextActiveView?.id) {
            window.dispatchEvent(new CustomEvent('cia:open-view-settings', {
                detail: { viewId: contextActiveView.id }
            }));
        }
    }, [contextActiveView]);

    // Compute view mode for toolbar based on view stack state
    const toolbarViewMode = useMemo(() => {
        if (isFocusView) return 'focus';
        if (isSubsetView) return 'subset';
        return 'normal';
    }, [isFocusView, isSubsetView]);

    // Handle toolbar mode change - enter/exit focus/subset modes
    const handleToolbarModeChange = useCallback((mode) => {
        log.debug('Toolbar mode change:', mode);

        if (mode === 'normal') {
            // Exit to grid view
            goHome();
        } else if (mode === 'focus') {
            // Enter focus mode with active view from context (the currently focused instance)
            // This is the source of truth - it's set when user clicks on a cell

            // First try: Use the active view from context (user's current selection)
            if (contextActiveView?.id) {
                // Find the placement by viewConfigurationId or position
                const activePlacement = canvas?.placements?.find(p =>
                    p.content?.viewConfigurationId === contextActiveView.id ||
                    (contextActiveView.position &&
                     p.row === contextActiveView.position.row &&
                     p.col === contextActiveView.position.col)
                );

                if (activePlacement) {
                    focusView({
                        placementId: activePlacement.id,
                        viewConfigurationId: contextActiveView.id,
                        name: contextActiveView.name || 'View',
                        row: activePlacement.row,
                        col: activePlacement.col,
                    });
                    return;
                }
            }

            // Fallback: No active view - try to focus the first view on canvas
            const firstViewPlacement = canvas?.placements?.find(p => p.content?.viewConfigurationId);
            if (firstViewPlacement) {
                const viewId = firstViewPlacement.content?.viewConfigurationId;
                let viewName = 'View';
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
                    placementId: firstViewPlacement.id,
                    viewConfigurationId: viewId,
                    name: viewName,
                    row: firstViewPlacement.row,
                    col: firstViewPlacement.col,
                });
            } else {
                log.warn('No views available to focus');
            }
        } else if (mode === 'subset') {
            // Enter subset mode - show the subset selector modal
            log.debug('Subset mode requested - opening subset selector');
            setShowSubsetSelector(true);
        }
    }, [goHome, focusView, openSubset, canvas?.placements, contextActiveView, subsets]);

    // Handle placement click (single click - select)
    const handlePlacementClick = useCallback((placement) => {
        log.debug('Placement clicked:', placement);
        // Single click selects the view
        setHighlightedPlacementId(placement.id);
    }, []);

    // Handle placement double-click (focus view - per memory log)
    const handlePlacementDoubleClick = useCallback((placement) => {
        log.debug('Placement double-clicked:', placement);

        // Check if it's a subset
        if (placement.content?.type === 'subset') {
            // Double-click subset → open subset view
            openSubset({
                subsetId: placement.content.subsetId,
                name: placement.content.name || 'Subset',
                views: placement.content.views || [],
            });
        } else {
            // Double-click view → focus mode (view stack + panel collapse)
            focusView({
                placementId: placement.id,
                name: placement.content?.name || 'View',
                row: placement.row,
                col: placement.col,
            });

            // Also collapse panels for maximum canvas space
            enterPanelFocusMode?.(placement.id);
        }
    }, [focusView, openSubset, enterPanelFocusMode]);

    // Handle cell double-click (empty cell - add content)
    const handleCellDoubleClick = useCallback((row, col) => {
        log.debug('Empty cell double-clicked at:', row, col);
        // Empty cells trigger add content dialog
        // This is handled by the CanvasGrid component
    }, []);

    // Handle adding content to a cell from placeholder buttons
    const handleAddContent = useCallback(async (row, col, type) => {
        log.debug(`Add content requested: type=${type} at (${row}, ${col})`);

        if (!activeCanvasId) {
            log.error('No canvas available for adding content');
            return;
        }

        switch (type) {
            case 'view':
                // Dispatch event to open dataset selector modal
                window.dispatchEvent(new CustomEvent('cia:open-dataset-selector', {
                    detail: {
                        targetRow: row,
                        targetCol: col,
                    }
                }));
                log.debug('Dispatched cia:open-dataset-selector', { row, col });
                break;

            case 'notes':
                // Create a notes placement directly
                try {
                    await addPlacement({
                        row,
                        col,
                        rowSpan: 1,
                        colSpan: 1,
                        content: {
                            type: 'notes',
                            notesBlockId: null, // Will be created on first save
                        },
                    });
                    log.debug('Notes placement added');
                } catch (err) {
                    log.error('Failed to add notes placement:', err);
                }
                break;

            case 'image':
                // Dispatch event to open image selector
                window.dispatchEvent(new CustomEvent('cia:open-image-selector', {
                    detail: {
                        targetRow: row,
                        targetCol: col,
                        purpose: 'add-image-to-cell'
                    }
                }));
                break;

            default:
                log.warn(`Unknown content type: ${type}`);
        }
    }, [activeCanvasId, addPlacement]);

    // ==========================================================================
    // SUBSET SELECTOR MODAL HANDLERS
    // ==========================================================================

    // Handle selecting an existing subset from the modal
    const handleSelectSubset = useCallback((subset) => {
        log.debug('Subset selected:', subset.id, subset.name);
        openSubset({
            subsetId: subset.id,
            name: subset.name || 'Subset',
            placementIds: subset.placementIds || [],
        });
        setShowSubsetSelector(false);
    }, [openSubset]);

    // Handle creating a new subset from selected placements
    const handleCreateSubset = useCallback(async ({ name, placementIds }) => {
        log.debug('Creating subset:', name, 'with placements:', placementIds);
        try {
            const newSubset = await createSubset({
                name,
                placementIds,
            });
            // Exit selection mode and clear selection
            exitSelectionMode(true);
            setShowSubsetSelector(false);
            // Return the subset so the modal can optionally place it on canvas
            return newSubset;
        } catch (err) {
            log.error('Failed to create subset:', err);
            setShowSubsetSelector(false);
            return null;
        }
    }, [createSubset, exitSelectionMode]);

    // Handle entering selection mode from the modal
    const handleEnterSelectionMode = useCallback(() => {
        log.debug('Entering selection mode for subset creation');
        enterSelectionMode();
        setShowSubsetSelector(false);
    }, [enterSelectionMode]);

    // Handle adding placements to an existing subset
    const handleAddToExistingSubset = useCallback(async (subsetId, placementIds) => {
        log.debug('Adding placements to subset:', subsetId, placementIds);
        try {
            await addPlacementsToSubset(subsetId, placementIds);
            // Exit selection mode and clear selection
            exitSelectionMode(true);
        } catch (err) {
            log.error('Failed to add placements to subset:', err);
        }
    }, [addPlacementsToSubset, exitSelectionMode]);

    // Handle placing a subset on the canvas as a first-class citizen
    const handlePlaceSubsetOnCanvas = useCallback(async (subsetId) => {
        log.debug('Placing subset on canvas:', subsetId);
        if (!activeCanvasId) {
            log.error('No canvas available for placing subset');
            return;
        }

        try {
            // Find next empty cell
            const { row, col } = findNextEmptyCell();

            // Create a subset placement
            await addPlacement({
                row,
                col,
                rowSpan: 1,
                colSpan: 1,
                content: {
                    type: 'subset',
                    subsetId,
                },
            });
            log.debug('Subset placement added at', row, col);
        } catch (err) {
            log.error('Failed to place subset on canvas:', err);
        }
    }, [activeCanvasId, findNextEmptyCell, addPlacement]);

    // Show error if canvas loading failed
    const showError = (canvasError || loadError) && !canvas;

    // Compute cell size and render mode
    const cellSize = useMemo(() => {
        // Estimate based on viewport size (will be more accurate with actual measurements)
        const avgWidth = 300;
        const avgHeight = 250;
        return { width: avgWidth, height: avgHeight };
    }, []);

    const renderMode = useMemo(() => {
        const minDimension = Math.min(cellSize.width, cellSize.height);
        if (minDimension >= 200) return 'full';
        if (minDimension >= 150) return 'compact';
        if (minDimension >= 80) return 'thumbnail';
        return 'snapshot';
    }, [cellSize]);

    // Canvas dimensions
    const canvasSize = useMemo(() => ({
        cols: canvas?.dimensions?.cols || 10,
        rows: canvas?.dimensions?.rows || 10,
    }), [canvas?.dimensions?.cols, canvas?.dimensions?.rows]);

    // Viewport size state (shared with CanvasGrid)
    const { viewportSize: sharedViewportSize, setViewportSize: setSharedViewportSize } = useViewportSize(canvasSize);

    // Panel toggle handlers
    const toggleLeftPanel = useCallback(() => {
        setLeftPanelOpen(prev => !prev);
    }, []);

    const toggleRightPanel = useCallback(() => {
        setRightPanelOpen(prev => !prev);
    }, []);

    const handleCanvasSizeChange = useCallback(async (newSize) => {
        // Update canvas dimensions on server
        if (!activeCanvasId) return;
        const currentCanvas = canvasManager.getCanvas(activeCanvasId);
        if (!currentCanvas) return;

        const newDimensions = {
            ...currentCanvas.dimensions,
            rows: newSize.rows,
            cols: newSize.cols,
        };
        await canvasManager.updateCanvas(activeCanvasId, { dimensions: newDimensions });
    }, [activeCanvasId, canvasManager]);

    const handleViewportSizeChange = useCallback((newSize) => {
        setSharedViewportSize(newSize.rows, newSize.cols);
    }, [setSharedViewportSize]);

    const hasWorkspace = Boolean(activeWorkspaceId || currentWorkspace?.id);
    const isFreeLayout = workspaceViewMode === 'tabs';
    const shouldRenderChrome =
        !isFreeLayout && (workspaceViewMode === 'tile' ? hasOpenWorkspaces : hasWorkspace);
    const freeLayoutWorkspaces = useMemo(() => (
        tileWorkspaces.filter((workspace) => workspace.isOpen && !closedWorkspaceSet.has(workspace.id))
    ), [tileWorkspaces, closedWorkspaceSet]);
    const applySnap = useCallback((position, size) => {
        if (!freeLayoutBounds.width || !freeLayoutBounds.height) {
            return {
                x: Math.max(0, position.x),
                y: Math.max(0, position.y),
            };
        }

        const maxX = Math.max(0, freeLayoutBounds.width - size.width);
        const maxY = Math.max(0, freeLayoutBounds.height - size.height);
        let nextX = position.x;
        let nextY = position.y;

        if (Math.abs(nextX) <= SNAP_THRESHOLD) {
            nextX = 0;
        } else if (Math.abs(nextX - maxX) <= SNAP_THRESHOLD) {
            nextX = maxX;
        }

        if (Math.abs(nextY) <= SNAP_THRESHOLD) {
            nextY = 0;
        } else if (Math.abs(nextY - maxY) <= SNAP_THRESHOLD) {
            nextY = maxY;
        }

        return {
            x: Math.max(0, nextX),
            y: Math.max(0, nextY),
        };
    }, [freeLayoutBounds.height, freeLayoutBounds.width]);
    const freeLayoutSurfaceSize = useMemo(() => {
        let maxWidth = freeLayoutBounds.width || 0;
        let maxHeight = freeLayoutBounds.height || 0;

        freeLayoutWorkspaces.forEach((workspace, index) => {
            const layout = windowLayouts[workspace.id] || {
                position: {
                    x: DEFAULT_WINDOW_OFFSET.x + index * WINDOW_OFFSET_STEP,
                    y: DEFAULT_WINDOW_OFFSET.y + index * WINDOW_OFFSET_STEP,
                },
                size: { ...DEFAULT_WINDOW_SIZE },
            };
            maxWidth = Math.max(maxWidth, layout.position.x + layout.size.width + FREE_LAYOUT_PADDING);
            maxHeight = Math.max(maxHeight, layout.position.y + layout.size.height + FREE_LAYOUT_PADDING);
        });

        return {
            width: Math.max(maxWidth, freeLayoutBounds.width || 0),
            height: Math.max(maxHeight, freeLayoutBounds.height || 0),
        };
    }, [freeLayoutBounds.height, freeLayoutBounds.width, freeLayoutWorkspaces, windowLayouts]);
    const handleWindowPositionChange = useCallback((workspaceId, nextPosition) => {
        setWindowLayouts((prev) => {
            const current = prev[workspaceId] || {
                position: { ...DEFAULT_WINDOW_OFFSET },
                size: { ...DEFAULT_WINDOW_SIZE },
            };
            const snappedPosition = applySnap(nextPosition, current.size);
            return {
                ...prev,
                [workspaceId]: {
                    ...current,
                    position: snappedPosition,
                },
            };
        });
    }, [applySnap]);
    const handleWindowSizeChange = useCallback((workspaceId, nextSize) => {
        setWindowLayouts((prev) => {
            const current = prev[workspaceId] || {
                position: { ...DEFAULT_WINDOW_OFFSET },
                size: { ...DEFAULT_WINDOW_SIZE },
            };
            const snappedPosition = applySnap(current.position, nextSize);
            return {
                ...prev,
                [workspaceId]: {
                    ...current,
                    size: nextSize,
                    position: snappedPosition,
                },
            };
        });
    }, [applySnap]);
    const handleArrangeCascade = useCallback(() => {
        setWindowLayouts((prev) => {
            const next = { ...prev };
            freeLayoutWorkspaces.forEach((workspace, index) => {
                const current = next[workspace.id] || {
                    position: { ...DEFAULT_WINDOW_OFFSET },
                    size: { ...DEFAULT_WINDOW_SIZE },
                };
                next[workspace.id] = {
                    ...current,
                    position: {
                        x: DEFAULT_WINDOW_OFFSET.x + index * WINDOW_OFFSET_STEP,
                        y: DEFAULT_WINDOW_OFFSET.y + index * WINDOW_OFFSET_STEP,
                    },
                };
            });
            return next;
        });
    }, [freeLayoutWorkspaces]);
    const handleArrangeTile = useCallback(() => {
        setWindowLayouts((prev) => {
            const next = { ...prev };
            const count = freeLayoutWorkspaces.length;
            if (!count) return next;

            const availableWidth = Math.max(0, freeLayoutBounds.width - FREE_LAYOUT_GAP);
            const columnCount = Math.max(1, Math.floor(availableWidth / (DEFAULT_WINDOW_SIZE.width + FREE_LAYOUT_GAP)));
            freeLayoutWorkspaces.forEach((workspace, index) => {
                const current = next[workspace.id] || {
                    position: { ...DEFAULT_WINDOW_OFFSET },
                    size: { ...DEFAULT_WINDOW_SIZE },
                };
                const row = Math.floor(index / columnCount);
                const col = index % columnCount;
                next[workspace.id] = {
                    ...current,
                    position: {
                        x: FREE_LAYOUT_GAP + col * (DEFAULT_WINDOW_SIZE.width + FREE_LAYOUT_GAP),
                        y: FREE_LAYOUT_GAP + row * (DEFAULT_WINDOW_SIZE.height + FREE_LAYOUT_GAP),
                    },
                };
            });
            return next;
        });
    }, [freeLayoutBounds.width, freeLayoutWorkspaces]);
    useEffect(() => {
        const handleArrangeEvent = (event) => {
            const mode = event?.detail?.mode;
            if (mode === 'cascade') {
                handleArrangeCascade();
                return;
            }
            if (mode === 'tile') {
                handleArrangeTile();
            }
        };
        if (workspaceViewMode !== 'tabs') return undefined;
        window.addEventListener('cia:workspace-arrange', handleArrangeEvent);
        return () => window.removeEventListener('cia:workspace-arrange', handleArrangeEvent);
    }, [handleArrangeCascade, handleArrangeTile, workspaceViewMode]);

    const sharedFooter1Props = useMemo(() => ({
        canUndo,
        canRedo,
        onUndo: undo,
        onRedo: redo,
        activeView: contextActiveView,
        onCanvasViews,
        availableViews,
        onSelectView: contextSelectView,
        onPlaceView: contextPlaceView,
        onViewAction: contextViewAction,
        tools: notchTools,
        toolSections,
        onSelectTool: handleNotchToolSelect,
    }), [
        canRedo,
        canUndo,
        contextActiveView,
        contextPlaceView,
        contextSelectView,
        contextViewAction,
        availableViews,
        notchTools,
        onCanvasViews,
        redo,
        toolSections,
        undo,
        handleNotchToolSelect,
    ]);

    const sharedFooter2 = useMemo(() => (
        <div ref={footerRef}>
            <CanvasChromeFooter2
                containerWidth={footerWidth}
                hasActiveView={Boolean(contextActiveView?.id)}
                links={contextActiveView?.links || {}}
                onUpdateLink={contextUpdateLink}
                onToggleFocus={() => {
                    if (isFocusView) {
                        goHome();
                    } else {
                        handleToolbarModeChange('focus');
                    }
                }}
                onOpenViewList={() => {
                    setLeftDockedOpen(true);
                }}
                onSnapshot={() => {
                    log.debug('Snapshot requested from Footer2');
                    if (contextActiveView?.id) {
                        window.dispatchEvent(new CustomEvent('cia:view-snapshot', {
                            detail: { viewId: contextActiveView.id }
                        }));
                    }
                }}
                onResetView={() => {
                    log.debug('Reset view requested from Footer2');
                    handleResetCamera();
                }}
                onCopyView={handleDuplicateView}
                onOpenSettings={handleViewSettings}
                isVRAvailable={true}
                isInVR={isInImmersiveSession}
                onToggleVR={async () => {
                    if (isInImmersiveSession) {
                        await vrManager.exitVR();
                        return;
                    }

                    if (!contextActiveView?.id) {
                        log.warn('Cannot enter VR: no active view selected');
                        return;
                    }

                    const instance = workspaceManager.getInstanceByViewId(contextActiveView.id);
                    const glContext = instance?.handler?.getWebGLContext?.();

                    await vrManager.enterVR(glContext, {
                        navigationMode: 'teleport',
                        deviceProfile: 'meta-quest',
                        optionalFeatures: ['bounded-floor', 'local-floor', 'hand-tracking', 'layers'],
                    });
                }}
            />
        </div>
    ), [
        isInImmersiveSession,
        activeCanvasId,
        contextActiveView,
        contextUpdateLink,
        footerWidth,
        goHome,
        handleDuplicateView,
        handleResetCamera,
        handleToolbarModeChange,
        handleViewSettings,
        isFocusView,
        setLeftDockedOpen,
        sharedViewportSize,
        syncedViewport,
    ]);

    const sharedInfoBar = useMemo(() => (
        <CanvasInfoFooter
            canvasSize={canvasSize}
            viewportSize={sharedViewportSize}
            cellSize={cellSize}
            collaboratorCount={onlineCount}
            syncStatus={infoSyncStatus}
            onCanvasSizeChange={handleCanvasSizeChange}
            onViewportSizeChange={handleViewportSizeChange}
            onOpenNavigator={() => {
                // TODO: Open canvas navigator
            }}
        />
    ), [
        canvasSize,
        cellSize,
        handleCanvasSizeChange,
        handleViewportSizeChange,
        infoSyncStatus,
        onlineCount,
        sharedViewportSize,
    ]);

    return (
        <FloatingCanvasWrapper
            canvasMode={canvasMode}
            aspectRatio={aspectRatio}
            position={floatingPosition}
            size={floatingSize}
            onPositionChange={setFloatingPosition}
            onSizeChange={setFloatingSize}
            onModeChange={setCanvasMode}
        >
            {isFreeLayout ? (
                <div className="canvas-workspace canvas-workspace--free-layout">
                    <div className="canvas-workspace__content">
                        <EdgeTrigger
                            side="left"
                            onClick={toggleLeftPanel}
                            active={leftPanelOpen}
                        />

                        <div
                            className="canvas-workspace__canvas canvas-workspace__canvas--free-layout"
                            ref={freeLayoutRef}
                        >
                            <div
                                className="canvas-workspace__free-surface"
                                style={{
                                    width: freeLayoutSurfaceSize.width,
                                    height: freeLayoutSurfaceSize.height,
                                }}
                            >
                                {freeLayoutWorkspaces.length > 0 ? (
                                    freeLayoutWorkspaces.map((workspace) => {
                                        const layout = windowLayouts[workspace.id] || {
                                            position: {
                                                x: DEFAULT_WINDOW_OFFSET.x,
                                                y: DEFAULT_WINDOW_OFFSET.y,
                                            },
                                            size: { ...DEFAULT_WINDOW_SIZE },
                                        };
                                        const isFocused = activeWorkspaceKey === workspace.id;
                                        return (
                                            <WorkspaceFloatingWindow
                                                key={workspace.id}
                                                workspace={workspace}
                                                position={layout.position}
                                                size={layout.size}
                                                zIndex={getWindowZIndex(workspace.id)}
                                                onPositionChange={(nextPosition) => {
                                                    handleWindowPositionChange(workspace.id, nextPosition);
                                                }}
                                                onSizeChange={(nextSize) => {
                                                    handleWindowSizeChange(workspace.id, nextSize);
                                                }}
                                            onFocus={() => handleWindowFocus(workspace.id)}
                                            onClose={() => handleCloseWorkspaceWindow(workspace.id)}
                                            showCoordinates={showCoordinates}
                                            showViewGroupBorders={showViewGroupBorders}
                                            isFocused={isFocused}
                                            footer1Props={sharedFooter1Props}
                                            footer2={sharedFooter2}
                                            infoBar={sharedInfoBar}
                                            isEnsuringCanvas={Boolean(ensuringWorkspaceIds?.[workspace.id])}
                                            toolState={workspaceToolState[workspace.id] || DEFAULT_TOOL_STATE}
                                            onEditModeChange={handleEditModeChange}
                                            onToolChange={handleToolChange}
                                            onMergeModeChange={handleMergeModeChange}
                                            onFlowDirectionChange={setFlowDirection}
                                            onOpenNavigator={() => {
                                                setLeftDockedOpen(true);
                                            }}
                                            />
                                        );
                                    })
                                ) : (
                                    <div className="canvas-workspace__empty">
                                        <p>No workspace windows open</p>
                                        <span className="canvas-workspace__empty-hint">
                                            Select a workspace tab to open its window.
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <EdgeTrigger
                            side="right"
                            onClick={toggleRightPanel}
                            active={rightPanelOpen}
                        />
                    </div>
                </div>
            ) : shouldRenderChrome ? (
                <CanvasChrome
                    className={`canvas-workspace ${isInImmersiveSession ? 'canvas-workspace--immersive' : ''}`}
                    headerProps={{
                        canGoBack,
                        onGoBack: goBack,
                        onGoHome: goHome,
                        workspace: currentWorkspace || { id: projectId, name: 'Workspace', type: 'project' },
                        workspaces: workspacesForSelector,
                        onWorkspaceChange: handleWorkspaceSelect,
                        allowWorkspaceSwitch: workspaceViewMode === 'tile',
                        onOpenCreateWorkspace: handleOpenCreateWorkspace,
                        viewGroup: activeHeaderViewGroup,
                        viewGroups: formattedViewGroups,
                        onViewGroupChange: (viewGroup) => handleSelectViewGroup(viewGroup?.id ?? null),
                        isViewGroupLinked,
                        onEditViewGroup: (viewGroup) => {
                            if (viewGroup?.id) {
                                handleSelectViewGroup(viewGroup.id);
                            }
                            setLeftDockedOpen(true);
                        },
                        onOpenViewGroupManager: () => {
                            setLeftDockedOpen(true);
                        },
                        isEditMode: editMode,
                        onToggleEditMode: handleEditModeChange,
                        flowDirection: flowDirection === 'row' ? 'right' : 'down',
                        onFlowDirectionChange: (direction) => {
                            setFlowDirection(direction === 'right' ? 'row' : 'column');
                        },
                        showCoordinates,
                        showViewGroupBorders,
                        onToggleCoordinates: setShowCoordinates,
                        onToggleViewGroupBorders: setShowViewGroupBorders,
                        workspaceViewMode,
                        onWorkspaceViewModeChange: onSetWorkspaceViewMode,
                        canvasSize,
                        viewportSize: sharedViewportSize,
                        viewportPosition: syncedViewport,
                        onMoveViewport: (deltaRow, deltaCol) => {
                            dispatchMoveViewport(deltaRow, deltaCol, activeCanvasId);
                        },
                        onHome: () => dispatchNavigateTo(0, 0, activeCanvasId),
                        onOpenNavigator: () => {
                            setLeftDockedOpen(true);
                        },
                        windowMode: canvasMode === CANVAS_MODES.FULLSCREEN ? 'full' : canvasMode,
                        showWindowControls: false,
                        onCloseWorkspace: () => {
                            if (workspaceViewMode === 'tile' && effectiveTileMaximizedId) {
                                setTileMaximizedWorkspaceId(null);
                                return;
                            }
                            if (workspaceViewMode === 'tile' && !effectiveTileMaximizedId) {
                                if (skipCloseAllTilesConfirm) {
                                    handleCloseAllTileWorkspaces();
                                    return;
                                }
                                setShowCloseAllTilesConfirm(true);
                                return;
                            }
                            if (onDeactivateWorkspace) {
                                onDeactivateWorkspace();
                                return;
                            }
                            if (currentWorkspace?.id) {
                                onCloseWorkspace?.(currentWorkspace.id);
                            }
                        },
                    }}
                    editBarProps={{
                        activeTool,
                        onToolChange: handleToolChange,
                        onGridAction: handleEditBarGridAction,
                        onRowAction: handleEditBarRowAction,
                        onDone: () => handleEditModeChange(false),
                    }}
                    footer1Props={sharedFooter1Props}
                    footer2={sharedFooter2}
                    infoBar={sharedInfoBar}
                    isEditMode={editMode}
                >
                    {/* Main content area */}
                    <div className="canvas-workspace__content">
                        {showLoadingOverlay && (
                            <div
                                className={`canvas-workspace__loading-overlay ${isVR ? 'canvas-workspace__loading-overlay--vr' : ''}`}
                                aria-live="polite"
                            >
                                <div className={`canvas-workspace__loading-card ${isVR ? 'canvas-workspace__loading-card--vr' : ''}`}>
                                    <div className="canvas-workspace__spinner" />
                                    <div className="canvas-workspace__loading-title">{loadingLabel}</div>
                                    <div className="canvas-workspace__loading-subtitle">
                                        Syncing workspace state…
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Left Edge Trigger */}
                        <EdgeTrigger
                            side="left"
                            onClick={toggleLeftPanel}
                            active={leftPanelOpen}
                        />

                        {/* Canvas grid */}
                        <div className="canvas-workspace__canvas">
                            {workspaceViewMode === 'tile' ? (
                                <TiledCanvasView
                                    workspaces={tileWorkspaces}
                                    activeWorkspaceId={activeWorkspaceId || currentWorkspace?.id}
                                    maximizedWorkspaceId={effectiveTileMaximizedId}
                                    onSelectWorkspace={handleTileWorkspaceSelect}
                                    onClearSelection={handleTileClearSelection}
                                    onCloseWorkspace={(workspaceId) => {
                                        if (effectiveTileMaximizedId === workspaceId) {
                                            setTileMaximizedWorkspaceId(null);
                                        }
                                        onCloseWorkspace?.(workspaceId);
                                    }}
                                    onMaximizeWorkspace={handleTileWorkspaceMaximize}
                                    onRenameWorkspace={onRenameWorkspace}
                                    renderCanvas={(workspace) => (
                                        <WorkspaceTileCanvas
                                            canvasId={workspace.activeCanvasId}
                                            showCoordinates={showCoordinates}
                                            showViewGroupBorders={showViewGroupBorders}
                                            isEnsuringCanvas={Boolean(ensuringWorkspaceIds?.[workspace.id])}
                                        />
                                    )}
                                />
                            ) : isWorkspacesLoading && !currentWorkspaceId ? (
                                <div className="canvas-workspace__loading">Loading workspace...</div>
                            ) : isLoading && !canvas ? (
                                <div className="canvas-workspace__loading">Loading canvas...</div>
                            ) : activeWorkspaceEnsuring ? (
                                <div className="canvas-workspace__loading">Preparing canvas...</div>
                            ) : showError ? (
                                <div className="canvas-workspace__error">
                                    {(canvasError || loadError)?.message || 'Failed to load canvas'}
                                </div>
                            ) : canvas ? (
                                <CanvasGrid
                                    canvasId={activeCanvasId}
                                    viewport={viewport}
                                    placements={visiblePlacements}
                                    focusedSubset={focusedSubset}
                                    highlightedPlacementId={highlightedPlacementId}
                                    showCoordinates={showCoordinates}
                                    showViewGroupBorders={showViewGroupBorders}
                                    viewGroups={formattedViewGroups}
                                    onPlacementClick={handlePlacementClick}
                                    onPlacementDoubleClick={handlePlacementDoubleClick}
                                    onCellDoubleClick={handleCellDoubleClick}
                                    onViewportChange={moveViewport}
                                    onRemovePlacement={removePlacement}
                                    onAddRow={addRow}
                                    onAddColumn={addColumn}
                                    onAddContent={handleAddContent}
                                    onOpenSubsetSelector={() => setShowSubsetSelector(true)}
                                />
                            ) : (
                                <div className="canvas-workspace__empty">
                                    <p>No workspace open</p>
                                    <div className="canvas-workspace__empty-hint">
                                        Open a workspace from the Workspace Bar above, or choose one below.
                                    </div>
                                    <div className="canvas-workspace__empty-actions">
                                        <button
                                            onClick={() => handleOpenCreateWorkspaceLimited('empty', ['project', 'personal'])}
                                        >
                                            Create Workspace
                                        </button>
                                        <button
                                            onClick={() => handleOpenCreateWorkspaceLimited('scratch', ['personal'])}
                                        >
                                            Create Scratchpad
                                        </button>
                                    </div>
                                    {tileWorkspaces.filter((workspace) => !workspace.isOpen).length > 0 && (
                                        <div className="canvas-workspace__empty-list">
                                            <div className="canvas-workspace__empty-label">Open workspace</div>
                                            <div className="canvas-workspace__empty-buttons">
                                                {tileWorkspaces
                                                    .filter((workspace) => !workspace.isOpen)
                                                    .map((workspace) => (
                                                        <button
                                                            key={workspace.id}
                                                            onClick={() => handleWorkspaceSelect(workspace)}
                                                        >
                                                            {workspace.name || 'Untitled Workspace'}
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Edge Trigger */}
                        <EdgeTrigger
                            side="right"
                            onClick={toggleRightPanel}
                            active={rightPanelOpen}
                        />

                        {/* Subset panel (right sidebar) - legacy, will be replaced by FloatingPanel */}
                        {showSubsetPanel && (
                            <div className="canvas-workspace__subset-panel">
                                <SubsetPanel
                                    canvasId={activeCanvasId}
                                    subsets={subsets}
                                    focusedSubset={focusedSubset}
                                    onEnterFocus={enterFocusMode}
                                    onExitFocus={exitFocusMode}
                                />
                            </div>
                        )}

                        {/* Left Floating Panel */}
                        <FloatingPanel
                            side="left"
                            visible={leftPanelOpen}
                            onClose={() => setLeftPanelOpen(false)}
                            onDock={handleDockLeftPanel}
                            title="Files"
                            width={280}
                        >
                            {leftPanelContent}
                        </FloatingPanel>

                        {/* Right Floating Panel */}
                        <FloatingPanel
                            side="right"
                            visible={rightPanelOpen}
                            onClose={() => setRightPanelOpen(false)}
                            onDock={handleDockRightPanel}
                            title="Properties"
                            width={280}
                        >
                            {rightPanelContent}
                        </FloatingPanel>
                    </div>
                </CanvasChrome>
            ) : (
                <div className="canvas-workspace__empty-shell">
                    <div className="canvas-workspace__empty">
                        <p>No workspace open</p>
                        <div className="canvas-workspace__empty-hint">
                            Open a workspace from the Workspace Bar above, or choose one below.
                        </div>
                        <div className="canvas-workspace__empty-actions">
                            <button
                                onClick={() => handleOpenCreateWorkspaceLimited('empty', ['project', 'personal'])}
                            >
                                Create Workspace
                            </button>
                            <button
                                onClick={() => handleOpenCreateWorkspaceLimited('scratch', ['personal'])}
                            >
                                Create Scratchpad
                            </button>
                        </div>
                        {tileWorkspaces.filter((workspace) => !workspace.isOpen).length > 0 && (
                            <div className="canvas-workspace__empty-list">
                                <div className="canvas-workspace__empty-label">Open workspace</div>
                                <div className="canvas-workspace__empty-buttons">
                                    {tileWorkspaces
                                        .filter((workspace) => !workspace.isOpen)
                                        .map((workspace) => (
                                            <button
                                                key={workspace.id}
                                                onClick={() => handleWorkspaceSelect(workspace)}
                                            >
                                                {workspace.name || 'Untitled Workspace'}
                                            </button>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Focus mode overlay */}
            {isFocusMode && focusedSubset && (
                <FocusModeOverlay
                    subset={focusedSubset}
                    onExit={exitFocusMode}
                />
            )}

            {/* Subset selector modal */}
            <SubsetSelectorModal
                isOpen={showSubsetSelector}
                onClose={() => setShowSubsetSelector(false)}
                subsets={subsets}
                allPlacements={visiblePlacements}
                selectedPlacementIds={selectedIds}
                onSelectSubset={handleSelectSubset}
                onCreateSubset={handleCreateSubset}
                onAddToSubset={handleAddToExistingSubset}
                onPlaceOnCanvas={handlePlaceSubsetOnCanvas}
                onEnterSelectionMode={handleEnterSelectionMode}
            />

            {/* Create Workspace Panel */}
            <CreateWorkspacePanel
                isOpen={showCreateWorkspacePanel}
                onClose={() => setShowCreateWorkspacePanel(false)}
                onCreate={handleCreateWorkspace}
                initialType={createWorkspaceDefaults.type}
                initialNamePrefix={createWorkspaceDefaults.namePrefix}
                allowedTypes={createWorkspaceAllowedTypes}
                userId={userId}
                projectId={projectId}
            />

            <ConfirmationDialog
                isOpen={showCloseAllTilesConfirm}
                onClose={() => setShowCloseAllTilesConfirm(false)}
                title="Close all canvases?"
                description="This will close every open workspace canvas in this room."
                severity="warning"
                confirmLabel="Close All"
                cancelLabel="Cancel"
                itemList={openTileWorkspaceNames}
                showCheckbox={true}
                checkboxLabel="Don't ask again"
                checkboxChecked={skipCloseAllTilesConfirm}
                onCheckboxChange={setSkipCloseAllTilesConfirm}
                className={isVR ? 'confirmation-dialog--vr' : ''}
                onConfirm={() => {
                    handleCloseAllTileWorkspaces();
                    setShowCloseAllTilesConfirm(false);
                }}
                onCancel={() => setShowCloseAllTilesConfirm(false)}
            />
        </FloatingCanvasWrapper>
    );
}

/**
 * CanvasWorkspace - Full canvas system with workspace selection
 *
 * Wraps the inner component with ViewStackProvider for navigation state
 * Server-authoritative: No local fallback. Shows connection overlay when disconnected.
 */
export function CanvasWorkspace({
    userId,
    projectId,
    leftPanelContent,
    rightPanelContent,
    onCloseWorkspace,
    onRenameWorkspace,
    onDeactivateWorkspace,
    workspaceViewMode,
    workspaceTabs,
    activeWorkspaceId,
    onSelectWorkspace,
    onSetWorkspaceViewMode,
    ensuringWorkspaceIds,
    // Server-persisted preferences
    tileMaximizedWorkspaceId,
    onMaximizeWorkspace,
    windowPositions,
    windowSizes,
    viewportPositions,
    onWindowPositionChange,
    onWindowSizeChange,
    onViewportPositionChange,
}) {
    return (
        <ViewStackProvider>
            <CanvasWorkspaceInner
                userId={userId}
                projectId={projectId}
                leftPanelContent={leftPanelContent}
                rightPanelContent={rightPanelContent}
                onCloseWorkspace={onCloseWorkspace}
                onRenameWorkspace={onRenameWorkspace}
                onDeactivateWorkspace={onDeactivateWorkspace}
                workspaceViewMode={workspaceViewMode}
                workspaceTabs={workspaceTabs}
                activeWorkspaceId={activeWorkspaceId}
                onSelectWorkspace={onSelectWorkspace}
                onSetWorkspaceViewMode={onSetWorkspaceViewMode}
                ensuringWorkspaceIds={ensuringWorkspaceIds}
                tileMaximizedWorkspaceId={tileMaximizedWorkspaceId}
                onMaximizeWorkspace={onMaximizeWorkspace}
                windowPositions={windowPositions}
                windowSizes={windowSizes}
                viewportPositions={viewportPositions}
                onWindowPositionChange={onWindowPositionChange}
                onWindowSizeChange={onWindowSizeChange}
                onViewportPositionChange={onViewportPositionChange}
            />
        </ViewStackProvider>
    );
}

export default CanvasWorkspace;
