// src/ui/react/components/workspace/InstanceViewport/InstanceViewport.jsx
import React, { useRef, useEffect, useState, useCallback, useMemo, memo } from "react";
import { createPortal } from 'react-dom';
import { Icon, IconButton } from '@UI/react/components/atoms';
import {
    MenuItem,
    LabeledButton,
    VRButton,
    SliderMenuOption,
    SliderWithPresets,
    CameraViewGridPicker,
    ColorSwatchGrid,
    PositionGridPicker,
} from '@UI/react/components/molecules';

import { instance as log } from "@Utils/logger.js";
import { getToolIcon } from "@UI/react/components/workspace/ToolbarIconRegistry.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { setActiveInstance } from '@Collaboration/presence/cursors.js';
import { vrManager } from '@Core/vr/VRManager.js';
import { useFloatingPanels } from '@UI/react/components/panels/FloatingPanel/FloatingPanelContext';
import { useCanvasFocus } from '@UI/react/context/CanvasFocusContext';

import { getViewConfigurationManager, getDatasetManager } from "@Init/appInitializer.js";
import { getFileTypeDisplayInfo } from "@Core/instances/types/instanceTypesInit.js";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { viewLifecycleService } from "@Services/ViewLifecycleService.js";
import { normalizeInstanceToolsResult } from '@UI/react/utils/instanceTools.js';

import { useInstanceSize, getConstraintMessage } from './useInstanceSize';
import { TOOL_GROUPS, GLOBAL_TOOLS, HISTORY_TOOLS, NAV_TOOLS, CORNER_TOOLS, GEAR_DROPDOWN_ITEMS, getTierConfig } from './ToolbarTiers';
// NOTE: NavigationNotch removed - navigation controls now in InstanceToolsNotch at canvas level
import { ViewHeader, hexToRgb } from '@UI/react/components/workspace/ViewHeader';
// NOTE: InstanceToolbar import removed - tools now displayed in InstanceToolsNotch at canvas level

// Instance Tools panel content for embedded fullscreen mode
import { InstanceToolsPanelContent } from "@UI/react/components/panels/LeftPanel/tabs/InstanceToolsTab";

import "./InstanceViewport.scss";

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * BottomNavBar - Navigation bar at bottom of content area
 * Slides up on focus/click, contains zoom controls and fit button
 *
 * Design rationale:
 * - Mouse/trackpad already handles rotation, pan, and zoom naturally
 * - Zoom percentage syncs with actual camera state from all input sources
 * - Zoom is relative to initial view (100% = fit view after data load)
 * - Fit button provides quick reset to frame all content
 */
function BottomNavBar({
    visible,
    zoomLevel,
    onZoomChange,
    onFit,
}) {
    return (
        <div className={`instance-viewport__navbar-overlay ${visible ? 'instance-viewport__navbar-overlay--visible' : ''}`}>
            <div className="instance-navbar">
                {/* Zoom Display with +/- */}
                <div className="instance-navbar__zoom-display">
                    <button
                        className="instance-navbar__zoom-button"
                        onClick={() => onZoomChange(zoomLevel * 0.9)}
                        title="Zoom out 10%"
                    >
                        <Icon name="remove" size={12} />
                    </button>
                    <span className="instance-navbar__zoom-value">{Math.round(zoomLevel)}%</span>
                    <button
                        className="instance-navbar__zoom-button"
                        onClick={() => onZoomChange(zoomLevel * 1.1)}
                        title="Zoom in 10%"
                    >
                        <Icon name="add" size={12} />
                    </button>
                </div>

                {/* Fit Button */}
                <div className="instance-navbar__quick-actions">
                    <button
                        className="instance-navbar__action-button"
                        onClick={onFit}
                        title="Fit to view (reset to 100%)"
                    >
                        <Icon name="scan" size={14} />
                        Fit
                    </button>
                </div>
            </div>
        </div>
    );
}


/**
 * GearOnlyDropdown - Minimal controls for small viewports
 * Single gear button with portal dropdown menu
 */
function GearOnlyDropdown({
    open,
    onToggle,
    onOpenInstanceTools,
    onMaximize,
    onDuplicate,
    onClose,
    onTrash,
    instanceId,
}) {
    const buttonRef = useRef(null);
    const menuRef = useRef(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    // Position menu relative to button - smart positioning
    useEffect(() => {
        if (!open || !buttonRef.current) return;

        const updatePosition = () => {
            const rect = buttonRef.current.getBoundingClientRect();
            const menuWidth = 180;
            const menuHeight = 260;
            const padding = 8;

            let left, top;

            // Horizontal: prefer right-aligned with button, but keep in viewport
            left = rect.right - menuWidth;
            if (left < padding) {
                left = rect.left; // Align left edge with button instead
            }
            if (left + menuWidth > window.innerWidth - padding) {
                left = window.innerWidth - menuWidth - padding;
            }

            // Vertical: prefer below button, but flip to above if not enough space
            const spaceBelow = window.innerHeight - rect.bottom - padding;
            const spaceAbove = rect.top - padding;

            if (spaceBelow >= menuHeight) {
                // Enough space below
                top = rect.bottom + 4;
            } else if (spaceAbove >= menuHeight) {
                // Not enough below, but enough above - flip
                top = rect.top - menuHeight - 4;
            } else {
                // Not enough space either way - position at edge
                if (spaceBelow > spaceAbove) {
                    top = window.innerHeight - menuHeight - padding;
                } else {
                    top = padding;
                }
            }

            setMenuPosition({ top, left });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [open]);

    // Close on click outside
    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (e) => {
            if (
                buttonRef.current?.contains(e.target) ||
                menuRef.current?.contains(e.target)
            ) {
                return;
            }
            onToggle();
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') onToggle();
        };

        // Delay to prevent immediate close
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }, 10);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open, onToggle]);

    const handleItemClick = (e, action) => {
        e.stopPropagation();
        e.preventDefault();
        if (typeof action === 'function') {
            action();
        }
        onToggle();
    };

    const handleButtonClick = (e) => {
        e.stopPropagation(); // Prevent triggering isolation mode
        onToggle();
    };

    return (
        <div
            className="instance-viewport__gear-dropdown"
            onClick={(e) => e.stopPropagation()} // Prevent bubbling to cell
        >
            <button
                ref={buttonRef}
                className={`instance-viewport__gear-button ${open ? 'active' : ''}`}
                onClick={handleButtonClick}
                title="Options"
            >
                <Icon name="settings" size={16} />
            </button>
            {open && createPortal(
                <div
                    ref={menuRef}
                    className="instance-viewport__gear-menu"
                    style={{
                        position: 'fixed',
                        top: menuPosition.top,
                        left: menuPosition.left,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <MenuItem
                        icon="wrench"
                        label="Instance Tools"
                        onClick={(e) => handleItemClick(e, onOpenInstanceTools)}
                    />
                    <div
                        className="instance-viewport__gear-item"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle(); // Close menu, VRButton handles its own logic
                        }}
                    >
                        <VRButton instanceId={instanceId} size="sm" showLabel />
                    </div>
                    <MenuItem
                        icon="maximize"
                        label="Maximize"
                        onClick={(e) => handleItemClick(e, onMaximize)}
                    />
                    <MenuItem
                        icon="copy"
                        label="Duplicate"
                        onClick={(e) => handleItemClick(e, onDuplicate)}
                    />
                    <div className="instance-viewport__gear-separator" />
                    <MenuItem
                        icon="close"
                        label="Close"
                        onClick={(e) => handleItemClick(e, onClose)}
                    />
                    {onTrash && (
                        <MenuItem
                            icon="delete"
                            label="Delete View"
                            danger
                            onClick={(e) => handleItemClick(e, onTrash)}
                        />
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}

/**
 * VRModeIndicator - Shows when viewport is in VR mode
 */
function VRModeIndicator({ onExit }) {
    return (
        <div className="vr-mode-indicator">
            <span className="vr-mode-indicator__icon">
                <Icon name="vrHeadset" size={12} />
            </span>
            <span className="vr-mode-indicator__text">VR Mode</span>
            <button
                className="vr-mode-indicator__exit"
                onClick={onExit}
                title="Exit VR mode"
            >
                Exit
            </button>
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * InstanceViewport
 *
 * A viewport component that displays a ViewConfiguration using a handler.
 * Features overlay toolbars with size constraints and graceful degradation.
 */
export function InstanceViewport({
    viewConfigId = null,
    isRemote = false,
    remoteInstanceId = null,
    ownerUserName = null,
    displayName: propDisplayName,
    onClose,      // Called when user clicks X (close without delete)
    onTrash,      // Called when user clicks trash (move to Recently Deleted)
    onChangeSpan,
    onReady,      // Called when instance has loaded data and is ready to display
    currentSpan = '1x1',
    lifecycle = 'live', // 'live' | 'paused' - controls instance render loop and interactions
    renderMode: propRenderMode, // 'full' | 'compact' | 'thumbnail' | 'snapshot' - passed from CanvasCell
    onFocus, // Called when user clicks Focus button
    collaborators = [], // Array of collaborators viewing this instance
    isInFocusMode = false, // Whether this instance is currently in focus mode
    positionColor = null, // Position-based color from canvas cell (hex string)
}) {
    // =========================================================================
    // REFS
    // =========================================================================

    const containerRef = useRef(null);
    const viewportRef = useRef(null);
    const initOnce = useRef(false);
    const instanceIdRef = useRef(null);
    const menuButtonRefs = useRef(new Map());
    const spanPickerRef = useRef(null);
    const readyNotifiedRef = useRef(false);

    // =========================================================================
    // STATE
    // =========================================================================

    const [actualInstanceId, setActualInstanceId] = useState(
        isRemote ? remoteInstanceId : null
    );
    const [initialized, setInitialized] = useState(false);
    const [instanceType, setInstanceType] = useState(null);
    const [instanceColor, setInstanceColor] = useState(null);
    const [hasData, setHasData] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [tools, setTools] = useState([]);
    const [headerInfo, setHeaderInfo] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });

    // Toolbar pinned state (toolbar shows when focused OR pinned)
    const [toolbarPinned, setToolbarPinned] = useState(false);

    // Focus state
    const [navbarVisible, setNavbarVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Zoom state - tracks zoom relative to initial fit view (100%)
    const [zoomLevel, setZoomLevel] = useState(100);
    const zoomFromCameraRef = useRef(false); // Flag to prevent feedback loops

    // Span picker state
    const [showSpanPicker, setShowSpanPicker] = useState(false);

    // Gear dropdown state (for small viewports - kept for compatibility)
    const [gearDropdownOpen, setGearDropdownOpen] = useState(false);

    // Fullscreen state
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Embedded Instance Tools panel (for fullscreen mode)
    const [embeddedToolsOpen, setEmbeddedToolsOpen] = useState(false);
    const [embeddedToolsSide, setEmbeddedToolsSide] = useState('right'); // 'left' or 'right'

    // VR mode state
    const [isInVR, setIsInVR] = useState(false);

    // Track if Instance Tools tab is active in left panel
    const [instanceToolsTabActive, setInstanceToolsTabActive] = useState(false);

    // =========================================================================
    // CANVAS FOCUS CONTEXT (for tile mode pane-scoped state)
    // =========================================================================
    // When inside CanvasFocusProvider (tile mode), use pane-scoped methods
    // to ensure clicking this viewport only affects this pane, not all panes

    const canvasFocusContext = useCanvasFocus();

    // Refresh counter to re-render when view name/properties change
    const [viewRefreshCounter, setViewRefreshCounter] = useState(0);

    // =========================================================================
    // VIEW UPDATE LISTENER
    // =========================================================================

    // Listen for view updates to refresh display name
    useEffect(() => {
        if (!viewConfigId) return;

        const handleViewUpdate = (view) => {
            // Only re-render if this is our view
            if (view?.id === viewConfigId || view === viewConfigId) {
                setViewRefreshCounter(c => c + 1);
            }
        };

        getViewConfigurationManager()?.on?.('viewUpdated', handleViewUpdate);

        return () => {
            getViewConfigurationManager()?.off?.('viewUpdated', handleViewUpdate);
        };
    }, [viewConfigId]);

    // =========================================================================
    // LIFECYCLE MANAGEMENT (pause/resume for performance)
    // =========================================================================
    // When lifecycle prop changes between 'live' and 'paused':
    // - 'live': Resume the instance (rebind events, enable rendering)
    // - 'paused': Pause the instance (unbind events, stop render loop)
    //
    // This enables warm-caching of recently used views without GPU load.

    useEffect(() => {
        if (!actualInstanceId || !initialized) return;

        if (lifecycle === 'paused') {
            workspaceManager.pauseInstance(actualInstanceId);
            log.debug(`InstanceViewport: Pausing ${actualInstanceId}`);
        } else if (lifecycle === 'live') {
            workspaceManager.resumeInstance(actualInstanceId);
            log.debug(`InstanceViewport: Resuming ${actualInstanceId}`);
        }
    }, [lifecycle, actualInstanceId, initialized]);

    // =========================================================================
    // SIZE TRACKING
    // =========================================================================

    const {
        width,
        height,
        uiMode,
        constraintReason,
        constraintMessage,
        isConstrained,
        showFullToolbars
    } = useInstanceSize(viewportRef);

    // Compute effective render mode - prefer prop, fallback to size-based uiMode
    // Maps uiMode ('full', 'compact', etc.) to renderMode format
    const effectiveRenderMode = useMemo(() => {
        if (propRenderMode) return propRenderMode;
        // Map uiMode from useInstanceSize to render mode
        switch (uiMode) {
            case 'full': return 'full';
            case 'compact': return 'compact';
            case 'thumbnail': return 'thumbnail';
            case 'snapshot': return 'snapshot';
            case 'minimal': return 'snapshot';
            default: return 'full';
        }
    }, [propRenderMode, uiMode]);

    // =========================================================================
    // DROPDOWN POSITIONING & CLICK AWAY
    // =========================================================================

    useEffect(() => {
        if (!openMenuId) return;

        const updatePosition = () => {
            const buttonElement = menuButtonRefs.current.get(openMenuId);
            if (!buttonElement) return;

            const rect = buttonElement.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            const toolbar = buttonElement.closest('.instance-toolbar');
            const toolbarRect = toolbar?.getBoundingClientRect();

            const dropdownWidth = 260;
            const dropdownHeight = 240;

            let x, y;

            // Calculate button center and toolbar center
            const buttonCenterX = rect.left + rect.width / 2;
            const toolbarCenterX = toolbarRect
                ? toolbarRect.left + toolbarRect.width / 2
                : viewportWidth / 2;

            // Menu direction logic:
            // - If button is RIGHT of toolbar center → menu opens to LEFT
            // - If button is LEFT of toolbar center → menu opens to RIGHT
            // This prevents menus from obscuring other toolbar buttons
            const isButtonOnRight = buttonCenterX > toolbarCenterX;

            if (isButtonOnRight) {
                // Button on right side → open menu to the left
                x = rect.left - dropdownWidth - 8;
            } else {
                // Button on left side → open menu to the right
                x = rect.right + 8;
            }

            // Vertical alignment - align with toolbar top
            y = toolbarRect ? toolbarRect.top : rect.top;

            // Fallback: if menu goes off-screen horizontally, try the other side
            if (x < 10) {
                x = rect.right + 8; // Try right side
            }
            if (x + dropdownWidth > viewportWidth - 10) {
                x = rect.left - dropdownWidth - 8; // Try left side
            }

            // If STILL no room horizontally, position BELOW button
            if (x < 10 || x + dropdownWidth > viewportWidth - 10) {
                x = Math.max(10, Math.min(rect.left, viewportWidth - dropdownWidth - 10));
                y = rect.bottom + 8;
            }

            // Ensure dropdown stays within viewport vertically
            if (y < 10) y = 10;
            if (y + dropdownHeight > viewportHeight - 10) {
                y = viewportHeight - dropdownHeight - 10;
            }

            setDropdownPosition({ x, y, buttonWidth: rect.width });
        };

        updatePosition();

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        const handleClickAway = (e) => {
            const buttonElement = menuButtonRefs.current.get(openMenuId);
            const dropdownElement = document.querySelector('.toolbar-menu-dropdown--portal');

            if (
                buttonElement?.contains(e.target) ||
                dropdownElement?.contains(e.target)
            ) {
                return;
            }

            setOpenMenuId(null);
        };

        document.addEventListener('mousedown', handleClickAway, true);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
            document.removeEventListener('mousedown', handleClickAway, true);
        };
    }, [openMenuId]);

    // =========================================================================
    // INSTANCE INITIALIZATION
    // =========================================================================

    useEffect(() => {
        if (initOnce.current || !containerRef.current) return;

        initOnce.current = true;

        const initialize = async () => {
            try {
                setLoading(true);
                // DEBUG: Log instance creation with pane context
                const paneId = canvasFocusContext?.paneId || 'no-pane';
                const canvasId = canvasFocusContext?.canvasId || 'no-canvas';
                console.log(`[InstanceViewport] Creating instance - paneId: ${paneId}, canvasId: ${canvasId}, viewConfigId: ${viewConfigId || 'none'}`);
                log.debug(`Creating typeless instance (view: ${viewConfigId || 'none'})`);

                // Check if view is trashed or archived before creating instance
                if (viewConfigId) {
                    const viewConfig = getViewConfigurationManager()?.getView(viewConfigId);
                    if (viewConfig && (viewConfig.status === 'trashed' || viewConfig.status === 'archived')) {
                        log.warn(`Cannot create instance for ${viewConfig.status} view ${viewConfigId}`);
                        setError(`View has been ${viewConfig.status === 'trashed' ? 'deleted' : 'archived'}`);
                        setLoading(false);
                        return;
                    }
                }

                const instanceId = await workspaceManager.createInstance(
                    containerRef.current,
                    null,
                    { viewConfigId: viewConfigId }
                );

                instanceIdRef.current = instanceId;
                setActualInstanceId(instanceId);
                setInitialized(true);
                setActiveInstance(instanceId, viewConfigId);

                // Get the assigned color
                const color = workspaceManager.getInstanceColor(instanceId);
                setInstanceColor(color);

                if (viewConfigId) {
                    getViewConfigurationManager()?.activateView(viewConfigId);
                }

                const instanceHeader = workspaceManager.getInstanceHeaderInfo(instanceId);
                setHeaderInfo(instanceHeader);

                log.info(`Typeless instance ${instanceId} created with color ${color?.name}`);

            } catch (err) {
                log.error(`Instance initialization failed:`, err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        initialize();

        return () => {
            if (instanceIdRef.current) {
                log.debug(`Cleaning up instance ${instanceIdRef.current}`);
                workspaceManager.deleteInstance(instanceIdRef.current);
            }

            if (viewConfigId) {
                getViewConfigurationManager()?.deactivateView(viewConfigId);
            }
        };
    }, [viewConfigId]);

    // =========================================================================
    // DATA LOADING
    // =========================================================================

    useEffect(() => {
        if (!initialized || !actualInstanceId || !viewConfigId) return;

        const loadViewData = async () => {
            try {
                log.debug(`Loading view ${viewConfigId} into instance ${actualInstanceId}`);

                const viewConfig = getViewConfigurationManager()?.getView(viewConfigId);
                if (!viewConfig) {
                    log.warn(`View ${viewConfigId} not found`);
                    return;
                }

                // Don't load data for trashed or archived views
                if (viewConfig.status === 'trashed' || viewConfig.status === 'archived') {
                    log.warn(`View ${viewConfigId} is ${viewConfig.status}, skipping data load`);
                    return;
                }

                if (viewConfig.datasetId) {
                    await workspaceManager.loadDataIntoInstance(
                        actualInstanceId,
                        viewConfig.datasetId
                    );

                    const instance = workspaceManager.getInstance(actualInstanceId);
                    setInstanceType(instance.type);
                    setHasData(true);

                    log.info(`Instance ${actualInstanceId} is now type: ${instance.type}`);
                }

            } catch (err) {
                log.error(`Failed to load view data:`, err);
                setError(err.message);
            }
        };

        loadViewData();
    }, [initialized, actualInstanceId, viewConfigId]);

    // =========================================================================
    // READY CALLBACK
    // =========================================================================

    // Call onReady when data has loaded (for progressive loading)
    useEffect(() => {
        if (!onReady) return;

        if (hasData && !readyNotifiedRef.current) {
            readyNotifiedRef.current = true;
            onReady();
        }

        if (!hasData) {
            readyNotifiedRef.current = false;
        }
    }, [hasData, onReady]);

    // =========================================================================
    // TOOLS LOADING
    // =========================================================================

    useEffect(() => {
        if (!initialized || !actualInstanceId || !instanceType) return;

        const loadTools = () => {
            try {
                const toolsList = workspaceManager.getInstanceTools(actualInstanceId);
                const normalized = normalizeInstanceToolsResult(toolsList);
                log.debug(`Loaded ${normalized.tools.length} tools for ${instanceType} instance`);
                setTools(normalized.tools);

                const updatedHeader = workspaceManager.getInstanceHeaderInfo(actualInstanceId);
                setHeaderInfo(updatedHeader);
            } catch (err) {
                log.warn(`Failed to load tools:`, err);
            }
        };

        loadTools();

        const handleToolsUpdate = (event) => {
            if (event.detail?.instanceId === actualInstanceId) {
                log.debug(`Tools updated for ${actualInstanceId}, refreshing toolbar`);
                const updatedTools = workspaceManager.getInstanceTools(actualInstanceId);
                const normalized = normalizeInstanceToolsResult(updatedTools);
                setTools(normalized.tools);
            }
        };

        window.addEventListener('cia:tools-updated', handleToolsUpdate);
        return () => window.removeEventListener('cia:tools-updated', handleToolsUpdate);
    }, [actualInstanceId, initialized, instanceType]);

    // =========================================================================
    // VIEW LIFECYCLE - Listen for view being trashed/deleted
    // If our view gets trashed or deleted, remove placement and close instance
    // =========================================================================

    useEffect(() => {
        if (!viewConfigId) return;

        const handleViewTrashed = async ({ viewId }) => {
            if (viewId === viewConfigId) {
                log.info(`View ${viewConfigId} was trashed, removing placement and closing instance`);
                // Remove the canvas placement - this will cause React to unmount this component
                try {
                    await canvasManager?.removeViewPlacements?.(viewId);
                } catch (err) {
                    log.warn(`Failed to remove placements for trashed view ${viewId}:`, err);
                }
            }
        };

        const handleViewDeleted = async ({ viewId }) => {
            if (viewId === viewConfigId) {
                log.info(`View ${viewConfigId} was permanently deleted, removing placement and closing instance`);
                // Remove the canvas placement - this will cause React to unmount this component
                try {
                    await canvasManager?.removeViewPlacements?.(viewId);
                } catch (err) {
                    log.warn(`Failed to remove placements for deleted view ${viewId}:`, err);
                }
            }
        };

        getViewConfigurationManager()?.on?.('viewTrashed', handleViewTrashed);
        getViewConfigurationManager()?.on?.('viewDeleted', handleViewDeleted);

        return () => {
            getViewConfigurationManager()?.off?.('viewTrashed', handleViewTrashed);
            getViewConfigurationManager()?.off?.('viewDeleted', handleViewDeleted);
        };
    }, [viewConfigId]);

    // =========================================================================
    // ZOOM SYNC WITH CAMERA
    // Subscribe to camera changes to sync zoom percentage display
    // Zoom is relative to initial fit view: 100% = data fits in view
    // =========================================================================

    useEffect(() => {
        if (!initialized || !actualInstanceId || !hasData) return;

        // Subscribe to camera changes from the instance
        const unsubscribe = workspaceManager.onCameraChange(actualInstanceId, (cameraState) => {
            // Skip if this update was triggered by our own zoom change
            if (zoomFromCameraRef.current) {
                zoomFromCameraRef.current = false;
                return;
            }

            if (cameraState?.zoomLevel != null) {
                // Update zoom level from actual camera state
                // No clamping - allow whatever zoom VTK supports
                setZoomLevel(Math.round(cameraState.zoomLevel));
            }
        });

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [initialized, actualInstanceId, hasData]);

    // =========================================================================
    // UI HELPERS
    // =========================================================================

    // Native browser fullscreen
    const handleFullscreen = useCallback(() => {
        if (!viewportRef.current) return;

        if (document.fullscreenElement === viewportRef.current) {
            document.exitFullscreen?.();
        } else {
            viewportRef.current.requestFullscreen?.();
        }
    }, []);

    // Listen for fullscreen changes (e.g., user presses Esc)
    useEffect(() => {
        const handleFullscreenChange = () => {
            const nowFullscreen = document.fullscreenElement === viewportRef.current;
            setIsFullscreen(nowFullscreen);
            // Close embedded tools when exiting fullscreen
            if (!nowFullscreen) {
                setEmbeddedToolsOpen(false);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // =========================================================================
    // TOOLBAR PIN TOGGLE
    // =========================================================================

    const toggleToolbarPin = useCallback(() => {
        setToolbarPinned(prev => !prev);
    }, []);

    // Stub functions for header hover (no longer used for visibility)
    const showToolbar = useCallback(() => {}, []);
    const hideToolbar = useCallback(() => {}, []);

    // =========================================================================
    // NAVBAR VISIBILITY (focus-based)
    // =========================================================================

    const handleFocus = useCallback(() => {
        const myPaneId = canvasFocusContext?.paneId || 'no-pane';
        console.log(`[InstanceViewport] handleFocus called - paneId: ${myPaneId}, instanceId: ${actualInstanceId}, viewConfigId: ${viewConfigId}`);

        setIsFocused(true);
        setNavbarVisible(true);

        if (actualInstanceId) {
            // Always set for presence/cursor tracking
            setActiveInstance(actualInstanceId, viewConfigId);

            // Use pane-scoped methods when in tile mode (context available)
            // This ensures clicking one pane doesn't affect other panes
            if (canvasFocusContext) {
                console.log(`[InstanceViewport] Using pane-scoped focus for paneId: ${myPaneId}`);
                canvasFocusContext.setActiveInstance(actualInstanceId);
                canvasFocusContext.requestFocus?.();
            } else {
                // Fallback to global for tab mode or non-context scenarios
                console.log(`[InstanceViewport] Using GLOBAL focus (no context) - this may cause cross-pane issues`);
                workspaceManager?.setActiveInstance?.(actualInstanceId);
            }

            // Include paneId in event for filtering in tile mode
            window.dispatchEvent(
                new CustomEvent('cia:instance-focused', {
                    detail: {
                        instanceId: actualInstanceId,
                        viewId: viewConfigId,
                        paneId: canvasFocusContext?.paneId || null,
                    },
                })
            );
        }
    }, [actualInstanceId, viewConfigId, canvasFocusContext]);

    const handleActivateInstance = useCallback(() => {
        if (!actualInstanceId) return;

        // Use pane-scoped methods when in tile mode (context available)
        if (canvasFocusContext) {
            canvasFocusContext.setActiveInstance(actualInstanceId);
            canvasFocusContext.requestFocus?.();
        } else {
            // Fallback to global for tab mode
            workspaceManager?.setActiveInstance?.(actualInstanceId);
        }

        // Include paneId in event for filtering in tile mode
        window.dispatchEvent(
            new CustomEvent('cia:instance-focused', {
                detail: {
                    instanceId: actualInstanceId,
                    viewId: viewConfigId,
                    paneId: canvasFocusContext?.paneId || null,
                },
            })
        );
    }, [actualInstanceId, viewConfigId, canvasFocusContext]);

    const handleBlur = useCallback((e) => {
        // Only blur if focus is moving OUTSIDE the viewport entirely
        const relatedTarget = e.relatedTarget;
        const viewportElement = viewportRef.current;

        // If focus is moving to an element inside this viewport, stay focused
        if (relatedTarget && viewportElement?.contains(relatedTarget)) {
            return;
        }

        // Use a small delay to handle edge cases where relatedTarget is null
        setTimeout(() => {
            const activeElement = document.activeElement;
            if (viewportElement?.contains(activeElement)) {
                return; // Still focused inside viewport
            }
            setIsFocused(false);
            setNavbarVisible(false);
        }, 100);
    }, []);

    // =========================================================================
    // ZOOM CONTROLS
    // =========================================================================

    const handleZoomChange = useCallback((newZoom) => {
        // No clamping - allow whatever zoom VTK supports
        // Minimum of 1% to avoid divide-by-zero
        const safeZoom = Math.max(1, newZoom);
        const oldZoom = zoomLevel;

        // Set flag to prevent feedback loop from camera change callback
        zoomFromCameraRef.current = true;
        setZoomLevel(Math.round(safeZoom));

        // Apply zoom to the actual instance view
        if (actualInstanceId && oldZoom !== safeZoom && oldZoom > 0) {
            // Calculate zoom factor: new / old (> 1 = zoom in, < 1 = zoom out)
            const factor = safeZoom / oldZoom;
            workspaceManager.zoom(actualInstanceId, factor);
        }
    }, [zoomLevel, actualInstanceId]);

    const handleFit = useCallback(() => {
        // Fit resets to 100% (initial view)
        zoomFromCameraRef.current = true;
        setZoomLevel(100);
        if (actualInstanceId) {
            workspaceManager.fitView(actualInstanceId);
        }
    }, [actualInstanceId]);

    // =========================================================================
    // INSTANCE TOOLS PANEL
    // =========================================================================

    const handleOpenInstanceTools = useCallback(() => {
        // In fullscreen mode, toggle the embedded Instance Tools panel
        if (isFullscreen) {
            setEmbeddedToolsOpen(prev => !prev);
            return;
        }

        // Otherwise, emit event to open Instance Tools floating panel
        window.dispatchEvent(new CustomEvent('cia:open-instance-tools', {
            detail: { instanceId: actualInstanceId }
        }));
    }, [actualInstanceId, isFullscreen]);

    // =========================================================================
    // VR MODE
    // =========================================================================

    // Track VR session state
    useEffect(() => {
        const handleSessionStarted = () => setIsInVR(true);
        const handleSessionEnded = () => setIsInVR(false);

        vrManager.on('sessionStarted', handleSessionStarted);
        vrManager.on('sessionEnded', handleSessionEnded);

        // Check initial state
        setIsInVR(vrManager.isInVR());

        return () => {
            vrManager.off('sessionStarted', handleSessionStarted);
            vrManager.off('sessionEnded', handleSessionEnded);
        };
    }, []);

    const handleVRMode = useCallback(async () => {
        // Dispatch event to trigger VR mode - VRButton handles the actual logic
        window.dispatchEvent(new CustomEvent('cia:toggle-vr-mode', {
            detail: { instanceId: actualInstanceId }
        }));
    }, [actualInstanceId]);

    const handleExitVR = useCallback(async () => {
        try {
            await vrManager.exitVR();
        } catch (err) {
            console.error('Failed to exit VR:', err);
        }
    }, []);

    // =========================================================================
    // TRACK INSTANCE TOOLS TAB STATE
    // =========================================================================

    useEffect(() => {
        const handleTabChange = (event) => {
            const { isInstanceToolsActive } = event.detail || {};
            setInstanceToolsTabActive(isInstanceToolsActive || false);
        };

        window.addEventListener('cia:left-panel-tab-change', handleTabChange);
        return () => {
            window.removeEventListener('cia:left-panel-tab-change', handleTabChange);
        };
    }, []);

    // =========================================================================
    // KEYBOARD SHORTCUTS
    // =========================================================================

    useEffect(() => {
        if (!isFocused) return;

        const handleKeyDown = (e) => {
            // 'T' key opens Instance Tools panel
            if (e.key === 't' || e.key === 'T') {
                if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    handleOpenInstanceTools();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFocused, handleOpenInstanceTools]);

    // =========================================================================
    // MORE MENU HANDLERS
    // =========================================================================

    const handleResetCamera = useCallback(() => {
        if (actualInstanceId) {
            workspaceManager.resetCamera?.(actualInstanceId);
        }
    }, [actualInstanceId]);

    const handleCenterSelection = useCallback(() => {
        if (actualInstanceId) {
            workspaceManager.centerOnSelection?.(actualInstanceId);
        }
    }, [actualInstanceId]);

    const [currentRepresentation, setCurrentRepresentation] = useState('surface');

    const handleRepresentationChange = useCallback((representation) => {
        setCurrentRepresentation(representation);
        if (actualInstanceId) {
            workspaceManager.setRepresentation?.(actualInstanceId, representation);
        }
    }, [actualInstanceId]);

    const handleCaptureThumbnail = useCallback(() => {
        if (viewConfigId) {
            window.dispatchEvent(new CustomEvent('cia:capture-thumbnail', {
                detail: { viewConfigId, instanceId: actualInstanceId }
            }));
        }
    }, [viewConfigId, actualInstanceId]);

    const handleSaveBookmark = useCallback(() => {
        if (viewConfigId) {
            window.dispatchEvent(new CustomEvent('cia:save-bookmark', {
                detail: { viewConfigId, instanceId: actualInstanceId }
            }));
        }
    }, [viewConfigId, actualInstanceId]);

    const handleDuplicate = useCallback(() => {
        if (viewConfigId) {
            window.dispatchEvent(new CustomEvent('cia:duplicate-view', {
                detail: { viewConfigId }
            }));
        }
    }, [viewConfigId]);

    const handleLinkSettings = useCallback(() => {
        if (viewConfigId) {
            window.dispatchEvent(new CustomEvent('cia:open-link-settings', {
                detail: { viewConfigId }
            }));
        }
    }, [viewConfigId]);

    // =========================================================================
    // SPAN PICKER CLICK OUTSIDE
    // =========================================================================

    useEffect(() => {
        if (!showSpanPicker) return;

        const handleClickOutside = (e) => {
            if (spanPickerRef.current && !spanPickerRef.current.contains(e.target)) {
                setShowSpanPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSpanPicker]);

    // =========================================================================
    // GEAR DROPDOWN CLICK OUTSIDE
    // =========================================================================

    useEffect(() => {
        if (!gearDropdownOpen) return;

        const handleClickOutside = (e) => {
            const gearDropdown = document.querySelector('.instance-viewport__gear-dropdown');
            if (gearDropdown && !gearDropdown.contains(e.target)) {
                setGearDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [gearDropdownOpen]);

    // =========================================================================
    // TOOL RENDERING
    // =========================================================================

    const renderMenuOption = (option, optIndex, menuId) => {
        if (option.type === 'separator') {
            return (
                <div
                    key={`menu-sep-${menuId}-${optIndex}`}
                    className="menu-separator"
                />
            );
        }

        if (option.type === 'header') {
            return (
                <div
                    key={option.id || `header-${menuId}-${optIndex}`}
                    className="menu-header"
                >
                    {option.label}
                </div>
            );
        }

        if (option.type === 'camera-grid') {
            return (
                <CameraViewGridPicker
                    key={option.id}
                    views={option.views}
                    disabled={option.disabled}
                    onViewChange={option.onViewSelect}
                />
            );
        }

        if (option.type === 'position-grid') {
            return (
                <PositionGridPicker
                    key={option.id}
                    positions={option.positions}
                    currentPosition={option.currentPosition}
                    disabled={option.disabled}
                    onPositionChange={option.onPositionChange}
                />
            );
        }

        if (option.type === 'color-swatch-grid') {
            return (
                <ColorSwatchGrid
                    key={option.id}
                    colormaps={option.colormaps}
                    currentColormap={option.currentColormap}
                    disabled={option.disabled}
                    onColormapChange={option.onColormapChange}
                />
            );
        }

        if (option.type === 'slider-with-presets') {
            const IconComponent = getToolIcon(option.icon);

            return (
                <SliderWithPresets
                    key={option.id}
                    icon={IconComponent ? <IconComponent size={14} /> : null}
                    label={option.label}
                    min={option.min}
                    max={option.max}
                    step={option.step}
                    value={option.value}
                    presets={option.presets}
                    unit={option.unit}
                    disabled={option.disabled}
                    onChange={option.onChange}
                />
            );
        }

        if (option.type === 'slider') {
            return (
                <SliderMenuOption
                    key={option.id}
                    label={option.label}
                    min={option.min}
                    max={option.max}
                    step={option.step}
                    value={option.value}
                    unit={option.unit}
                    disabled={option.disabled}
                    onChange={option.onChange}
                />
            );
        }

        const OptionIcon = getToolIcon(option.id, option.icon);

        return (
            <button
                key={option.id || `option-${menuId}-${optIndex}`}
                onClick={option.onClick}
                className={`menu-option ${option.active ? 'active' : ''}`}
                disabled={option.disabled}
                aria-label={option.label}
            >
                <OptionIcon size={14} className="option-icon" />
                <div className="option-text">
                    <span className="option-label">{option.label}</span>
                    {option.description && (
                        <span className="option-description">
                            {option.description}
                        </span>
                    )}
                </div>
            </button>
        );
    };

    const renderTool = (tool, index) => {
        if (tool.type === 'separator') {
            return (
                <div
                    key={`separator-${index}`}
                    className="instance-toolbar__separator"
                />
            );
        }

        const IconComponent = getToolIcon(tool.id, tool.icon);
        const isOpen = openMenuId === tool.id;

        if (tool.type === 'menu') {
            return (
                <div
                    key={tool.id || `menu-${index}`}
                    className="toolbar-menu"
                    onMouseEnter={() => setOpenMenuId(tool.id)}
                    onMouseLeave={(e) => {
                        const relatedTarget = e.relatedTarget;
                        const dropdownElement = document.querySelector('.toolbar-menu-dropdown--portal');

                        // Check relatedTarget is a valid Node before calling contains()
                        if (!dropdownElement || !relatedTarget || !(relatedTarget instanceof Node) || !dropdownElement.contains(relatedTarget)) {
                            setTimeout(() => {
                                const stillHoveringDropdown = document.querySelector('.toolbar-menu-dropdown--portal:hover');
                                if (!stillHoveringDropdown) {
                                    setOpenMenuId(null);
                                }
                            }, 100);
                        }
                    }}
                >
                    <button
                        ref={(el) => {
                            if (el) menuButtonRefs.current.set(tool.id, el);
                        }}
                        className={`instance-toolbar__tool-button ${tool.active ? 'active' : ''}`}
                        disabled={tool.disabled}
                        aria-label={tool.label}
                        aria-haspopup="true"
                        aria-expanded={isOpen}
                    >
                        {IconComponent && <IconComponent size={16} strokeWidth={2} />}
                        <Icon name="chevronDown" size={8} className="instance-toolbar__menu-indicator" />

                        <div className="instance-toolbar__tooltip">
                            <div className="tooltip-title">{tool.label}</div>
                            {tool.description && (
                                <div className="tooltip-desc">{tool.description}</div>
                            )}
                            {tool.shortcut && (
                                <div className="tooltip-shortcut">{tool.shortcut}</div>
                            )}
                        </div>
                    </button>

                    {isOpen && tool.options && tool.options.length > 0 && createPortal(
                        <div
                            className="toolbar-menu-dropdown toolbar-menu-dropdown--portal"
                            style={{
                                position: 'fixed',
                                left: `${dropdownPosition.x}px`,
                                top: `${dropdownPosition.y}px`,
                                minWidth: '220px',
                            }}
                            onMouseEnter={() => setOpenMenuId(tool.id)}
                            onMouseLeave={() => {
                                setTimeout(() => {
                                    const hoveringButton = menuButtonRefs.current.get(tool.id)?.matches(':hover');
                                    if (!hoveringButton) {
                                        setOpenMenuId(null);
                                    }
                                }, 100);
                            }}
                        >
                            {tool.options.map((option, optIndex) =>
                                renderMenuOption(option, optIndex, tool.id)
                            )}
                        </div>,
                        document.body
                    )}
                </div>
            );
        }

        return (
            <button
                key={tool.id || `tool-${index}`}
                onClick={tool.onClick}
                className={`instance-toolbar__tool-button ${tool.active ? 'active' : ''}`}
                disabled={tool.disabled}
                aria-label={tool.label}
            >
                {IconComponent && <IconComponent size={16} strokeWidth={2} />}
                <div className="instance-toolbar__tooltip">
                    <div className="tooltip-title">{tool.label}</div>
                    {tool.description && (
                        <div className="tooltip-desc">{tool.description}</div>
                    )}
                    {tool.shortcut && (
                        <div className="tooltip-shortcut">{tool.shortcut}</div>
                    )}
                </div>
            </button>
        );
    };

    // Close handler - deactivates view but doesn't delete
    const handleClose = useCallback(() => {
        // IMPORTANT: Notify parent to remove from canvas FIRST
        // This starts the async placement removal before any state updates
        // that could cause re-renders while placement still exists
        onClose?.();

        // Clean up the instance
        if (instanceIdRef.current) {
            workspaceManager.deleteInstance(instanceIdRef.current);
        }

        // Deactivate the view (marks as inactive, keeps in Datasets list)
        // This is done after onClose to avoid race conditions where
        // viewUpdated events cause re-renders before placement is removed
        if (viewConfigId) {
            getViewConfigurationManager()?.deactivateView(viewConfigId);
        }
    }, [viewConfigId, onClose]);

    // Trash handler - moves to Recently Deleted
    const handleTrash = useCallback(async () => {
        // Clean up the instance first
        if (instanceIdRef.current) {
            workspaceManager.deleteInstance(instanceIdRef.current);
        }

        // Use viewLifecycleService for proper trash workflow
        // (removes from canvas AND trashes the view)
        if (viewConfigId) {
            try {
                await viewLifecycleService.trashView(viewConfigId);
                log.info(`View ${viewConfigId} moved to trash`);
            } catch (err) {
                log.error(`Failed to trash view ${viewConfigId}:`, err);
            }
        }

        // Notify parent
        onTrash?.();
    }, [viewConfigId, onTrash]);

    // =========================================================================
    // RENDER
    // =========================================================================

    const displayName = useMemo(() => {
        // If we have a display name prop from parent, use it
        if (propDisplayName) {
            return propDisplayName;
        }

        if (isRemote && ownerUserName) {
            if (viewConfigId) {
                try {
                    const view = getViewConfigurationManager()?.getView(viewConfigId);
                    if (view) {
                        const dataset = getDatasetManager()?.getDataset(view.datasetId);
                        const filename = dataset?.filename || 'Unknown';
                        return `${ownerUserName}'s view of ${filename}`;
                    }
                } catch (e) {
                    return `${ownerUserName}'s view`;
                }
            }
            return `${ownerUserName}'s view`;
        }

        if (viewConfigId) {
            try {
                const view = getViewConfigurationManager()?.getView(viewConfigId);
                if (view) {
                    const dataset = getDatasetManager()?.getDataset(view.datasetId);
                    // Show view name if it's been customized
                    const isDefaultName = !view.name ||
                        view.name === 'Untitled View' ||
                        view.name === 'Default View' ||
                        view.name === dataset?.filename;

                    if (!isDefaultName) {
                        return view.name;
                    }
                    return dataset?.filename || view.name || 'View';
                }
            } catch (e) {
                // Fall through
            }
        }

        // Show "Loading..." while data is loading, not the instance ID
        if (!hasData) {
            return 'Loading...';
        }

        // Final fallback - should rarely hit this now
        return `View ${viewConfigId?.slice(0, 8) || 'Unknown'}`;
    }, [viewConfigId, hasData, isRemote, ownerUserName, propDisplayName]);

    // =========================================================================
    // DERIVED STATE: File Type Display Info (from manifest)
    // =========================================================================

    const fileTypeDisplayInfo = useMemo(() => {
        if (!viewConfigId) return null;

        try {
            const view = getViewConfigurationManager()?.getView(viewConfigId);
            if (view?.datasetId) {
                const dataset = getDatasetManager()?.getDataset(view.datasetId);
                if (dataset?.fileType) {
                    // Get display info from manifest via instanceTypesInit
                    return getFileTypeDisplayInfo(dataset.fileType);
                }
            }
        } catch (e) {
            // Fall through
        }

        return null;
    }, [viewConfigId, hasData]); // Include hasData to re-derive after data loads

    // =========================================================================
    // VR EXPLORATION DATA
    // =========================================================================
    // Get viewConfig and dataset for VRExploreButton in ViewHeader

    const vrExplorationData = useMemo(() => {
        if (!viewConfigId || !hasData) return null;

        try {
            const view = getViewConfigurationManager()?.getView(viewConfigId);
            if (!view) return null;

            const dataset = view.datasetId
                ? getDatasetManager()?.getDataset(view.datasetId)
                : null;

            return {
                viewConfig: view,
                dataset: dataset,
                projectId: view.projectId || null,
            };
        } catch (e) {
            return null;
        }
    }, [viewConfigId, hasData]);

    // Use position-based color when provided (from CanvasCell), fall back to instance color
    const colorHex = positionColor || instanceColor?.hex || '#60a5fa';
    const colorRgb = hexToRgb(colorHex);

    // Create color object for components that expect { hex, name } format
    const effectiveColor = positionColor
        ? { hex: positionColor, name: 'position' }
        : instanceColor || { hex: '#60a5fa', name: 'blue' };

    return (
        <div
            ref={viewportRef}
            className={`instance-viewport instance-viewport--${uiMode} ${isFocused ? 'instance-viewport--active' : ''} ${isInVR ? 'instance-viewport--vr-mode' : ''}`}
            style={{
                '--instance-color': colorHex,
                '--instance-color-rgb': colorRgb,
            }}
            tabIndex={0}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseDown={handleActivateInstance}
        >
            {/* Header - ALWAYS renders, even before data loads */}
            <ViewHeader
                variant="active"
                renderMode={effectiveRenderMode}
                displayName={displayName}
                color={effectiveColor}
                fileTypeInfo={fileTypeDisplayInfo}
                isActive={isFocused}
                isLoading={loading || !hasData}
                isInFocusMode={isInFocusMode}
                isFullscreen={isFullscreen}
                collaborators={collaborators}
                onFocus={onFocus}
                onClose={handleClose}
                onDelete={handleTrash}
                onOpenInstanceTools={handleOpenInstanceTools}
                onFullscreen={handleFullscreen}
                onVRMode={handleVRMode}
                onResetCamera={handleResetCamera}
                onFitView={handleFit}
                onDuplicate={handleDuplicate}
                onShowToolbar={showToolbar}
                onHideToolbar={hideToolbar}
                // VR Exploration props
                instanceId={actualInstanceId}
                dataset={vrExplorationData?.dataset}
                viewConfig={vrExplorationData?.viewConfig}
                projectId={vrExplorationData?.projectId}
            />

            {/* NOTE: InstanceToolbar removed - tools now displayed in InstanceToolsNotch
             * above the canvas toolbar for a cleaner viewport appearance.
             * Tools are populated from workspaceManager.getInstanceTools() in CanvasWorkspace.
             * If needed in fullscreen mode, use the embedded tools panel (T key).
             */}

            {/* VR Mode Indicator - Shows when in VR */}
            {isInVR && <VRModeIndicator onExit={handleExitVR} />}

            {/* Content Area */}
            <div
                ref={containerRef}
                className="instance-viewport__content"
            >
                {loading && (
                    <div className="instance-viewport__loading">
                        Loading view...
                    </div>
                )}
                {error && (
                    <div className="instance-viewport__error">
                        <Icon name="alertCircle" size={24} />
                        <div className="error-message">{error}</div>
                    </div>
                )}
            </div>

            {/* Embedded Instance Tools Panel - For fullscreen mode */}
            {isFullscreen && (
                <div className={`instance-viewport__embedded-tools instance-viewport__embedded-tools--${embeddedToolsSide} ${embeddedToolsOpen ? 'instance-viewport__embedded-tools--open' : ''}`}>
                    <div className="instance-viewport__embedded-tools-header">
                        <button
                            className="instance-viewport__embedded-tools-toggle-side"
                            onClick={() => setEmbeddedToolsSide(side => side === 'right' ? 'left' : 'right')}
                            title={`Move to ${embeddedToolsSide === 'right' ? 'left' : 'right'} side`}
                        >
                            <Icon name={embeddedToolsSide === 'right' ? 'arrowLeft' : 'arrowRight'} size={14} />
                        </button>
                        <button
                            className="instance-viewport__embedded-tools-close"
                            onClick={() => setEmbeddedToolsOpen(false)}
                            title="Close (T)"
                        >
                            <Icon name="close" size={14} />
                        </button>
                    </div>
                    <div className="instance-viewport__embedded-tools-content">
                        <InstanceToolsPanelContent />
                    </div>
                </div>
            )}

            {/* NOTE: NavigationNotch removed - navigation controls now in InstanceToolsNotch at canvas level */}
        </div>
    );
}
