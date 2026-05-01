// src/ui/react/components/workspace/Canvas/CanvasCell/CanvasCell.jsx
// Individual cell in the canvas grid - Updated December 10, 2025
//
// ARCHITECTURE:
// - Supports progressive UI degradation via renderMode prop
// - Four render modes: full, compact, thumbnail, snapshot
// - No minimum sizes - cells scale with viewport
// - Isolation mode click handling for tiny cells
//
// FIXES (Dec 10, 2025):
// - Removed portal for radial menu - now positioned relative to cell
// - Added X button toggle when menu is open
// - Added click outside to close menu
// - Fixed double border on empty cells

import React, { memo, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { ViewHeader } from '@UI/react/components/workspace/ViewHeader';
import { useCanvasFocus } from '@UI/react/context/CanvasFocusContext';

// =============================================================================
// SHARED COLOR UTILITIES
// =============================================================================

import {
    hexToRgbString,
    getCellColorByPosition,
} from '@UI/react/utils/canvasColors.js';
import { formatGridPosition } from '@UI/react/utils/gridPosition.js';

// =============================================================================
// DROP ZONE CONSTANTS
// =============================================================================

// Drop zone types per spec
const DROP_ZONES = {
    NONE: 'none',
    PLACE: 'place',      // Empty cell center - green
    SWAP: 'swap',        // Occupied cell center (60%) - blue
    PUSH_UP: 'push-up',      // Top 20% - amber
    PUSH_DOWN: 'push-down',  // Bottom 20% - amber
    PUSH_LEFT: 'push-left',  // Left 20% - amber
    PUSH_RIGHT: 'push-right', // Right 20% - amber
};

// Calculate which drop zone based on mouse position within cell
function getDropZone(e, cellRef, isEmpty) {
    if (!cellRef.current) return DROP_ZONES.NONE;

    const rect = cellRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    // Calculate relative position (0-1)
    const relX = x / width;
    const relY = y / height;

    // Edge threshold is 20% per spec
    const edgeThreshold = 0.20;

    // Check edges first (push zones)
    if (relY < edgeThreshold) return DROP_ZONES.PUSH_UP;
    if (relY > 1 - edgeThreshold) return DROP_ZONES.PUSH_DOWN;
    if (relX < edgeThreshold) return DROP_ZONES.PUSH_LEFT;
    if (relX > 1 - edgeThreshold) return DROP_ZONES.PUSH_RIGHT;

    // Center zone - Place for empty, Swap for occupied
    return isEmpty ? DROP_ZONES.PLACE : DROP_ZONES.SWAP;
}

import { PlacementContentType } from '@Core/data/models/CanvasPlacement.js';
import { InstanceViewport } from '@UI/react/components/workspace/InstanceViewport';
import { ProgressiveLoader } from '@UI/react/components/molecules/ThumbnailPreview';
import { RENDER_MODES } from '@UI/react/hooks/useCanvasDimensions.js';
import { Thumbnail } from '@UI/react/components/atoms/Thumbnail';
import { SubsetCardById } from '@UI/react/components/workspace/Canvas/SubsetCard';
import { getViewConfigurationManager, getDatasetManager } from '@Init/appInitializer.js';
import { usePresence } from '@UI/react/hooks/usePresence.js';
import './CanvasCell.scss';

// =============================================================================
// COLD VIEW HEADER - For thumbnail/snapshot modes (uses unified ViewHeader)
// =============================================================================

/**
 * ColdViewHeader - Header for cold views (thumbnail/snapshot modes)
 * Uses the unified ViewHeader component with variant='cold'
 *
 * Also used during loading state to show header immediately
 */
function ColdViewHeader({ viewId, viewColor, onClose, onActivate, onVRMode, onFocus, onAddToSubset, renderMode, isLoading = false, isActive = false }) {
    // Get view name and file type info
    const { displayName, fileTypeInfo } = useMemo(() => {
        try {
            const view = getViewConfigurationManager()?.getView(viewId);
            if (view) {
                const dataset = getDatasetManager()?.getDataset(view.datasetId);
                const name = dataset?.filename || view.name || 'View';
                const fileType = dataset?.fileType;
                const typeInfo = fileType ? { icon: 'box' } : { icon: 'box' };
                return { displayName: name, fileTypeInfo: typeInfo };
            }
        } catch (e) {
            // Fall through
        }
        return { displayName: 'View', fileTypeInfo: { icon: 'box' } };
    }, [viewId]);

    const colorHex = viewColor || '#60a5fa';

    return (
        <ViewHeader
            variant={isActive ? 'active' : 'cold'}
            renderMode={renderMode}
            displayName={displayName}
            color={{ hex: colorHex, name: 'position' }}
            fileTypeInfo={fileTypeInfo}
            isActive={isActive}
            isLoading={isLoading}
            onActivate={onActivate}
            onRemove={onClose}
            onVRMode={onVRMode}
            onOpenInIsolation={onFocus}
            onAddToSubset={onAddToSubset}
        />
    );
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Content type options for the radial menu - positioned in cross pattern
const CONTENT_OPTIONS = [
    { type: 'view', icon: 'cube', label: 'Add View', color: 'blue' },
    { type: 'notes', icon: 'note_add', label: 'Add Notes', color: 'amber' },
    { type: 'image', icon: 'image', label: 'Add Image', color: 'teal' },
    { type: 'grid', icon: 'grid', label: 'Add Grid', color: 'purple' },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CanvasCell - A single cell in the canvas grid
 *
 * Supports:
 * - Spanning across multiple rows/columns
 * - Progressive UI degradation based on renderMode
 * - Isolation mode trigger for small cells
 */
export const CanvasCell = memo(function CanvasCell({
    placement,
    row,
    col,
    renderMode = RENDER_MODES.FULL,
    cellSize = { width: 300, height: 200 },
    isSelected = false,
    isHighlighted = false,
    selectionMode = false,
    inEditMode = false,
    activeViewId = null,
    recentViewIds = [],
    isInFocusMode = false, // Whether the app is in focus mode (from useViewStack)
    onClick,
    onDoubleClick,
    onSelect,
    onDrop,
    onSwap,
    onPush,
    onAddContent,
    onRemove,
    onFocusView, // Handler to enter focus mode for this view
}) {
    const [activeDropZone, setActiveDropZone] = useState(DROP_ZONES.NONE);
    const cellRef = useRef(null);
    // Refs for dragover throttling - avoid state updates on every mouse move
    const pendingZoneRef = useRef(DROP_ZONES.NONE);
    const rafIdRef = useRef(null);

    // Canvas focus context for pane-scoped state in tile mode
    const canvasFocusContext = useCanvasFocus();

    const isEmpty = !placement ||
        !placement.content ||
        placement.content.type === PlacementContentType.EMPTY ||
        placement.content.type === undefined ||
        placement.content.type === null;
    const contentType = placement?.content?.type || 'empty';
    const rowSpan = placement?.rowSpan || 1;
    const colSpan = placement?.colSpan || 1;

    // Get instance color based on cell position for consistent coloring
    // Uses diagonal stripe pattern so adjacent cells have different colors
    const viewId = placement?.content?.viewConfigurationId;
    const positionColor = useMemo(() => {
        return getCellColorByPosition(row, col);
    }, [row, col]);

    const { users } = usePresence();
    const focusedByUsers = useMemo(() => {
        if (!viewId) return [];
        return users.filter((user) => !user.isYou && user.focusedViewId === viewId);
    }, [users, viewId]);
    const focusBadgeUsers = focusedByUsers.slice(0, 2);
    const focusExtraCount = focusedByUsers.length - focusBadgeUsers.length;

    // Use position-based color (hex string for CSS)
    const instanceColor = positionColor.hex;
    const positionLabel = formatGridPosition(col, row);

    // Determine which UI elements to show based on render mode
    const uiConfig = useMemo(() => {
        switch (renderMode) {
            case RENDER_MODES.FULL:
                return {
                    showToolbar: true,
                    showHeader: true,
                    showHeaderButtons: true,
                    showCoords: true,
                    showSizeBadge: true,
                    renderContent: 'full',
                    showTooltipOnHover: false,
                };
            case RENDER_MODES.COMPACT:
                return {
                    showToolbar: true,
                    showHeader: true,
                    showHeaderButtons: false,
                    showCoords: false,
                    showSizeBadge: false,
                    renderContent: 'full',
                    showTooltipOnHover: false,
                };
            case RENDER_MODES.THUMBNAIL:
                return {
                    showToolbar: false,
                    showHeader: false,        // Regular header hidden
                    showMiniHeader: true,     // Show mini header instead
                    showHeaderButtons: false,
                    showCoords: false,
                    showSizeBadge: false,
                    renderContent: 'thumbnail',
                    showTooltipOnHover: true,
                };
            case RENDER_MODES.SNAPSHOT:
                return {
                    showToolbar: false,
                    showHeader: false,
                    showMiniHeader: true,     // Show mini header
                    showHeaderButtons: false,
                    showCoords: false,
                    showSizeBadge: false,
                    renderContent: 'snapshot',
                    showTooltipOnHover: true,
                };
            default:
                return {
                    showToolbar: true,
                    showHeader: true,
                    showHeaderButtons: true,
                    showCoords: true,
                    showSizeBadge: true,
                    renderContent: 'full',
                    showTooltipOnHover: false,
                };
        }
    }, [renderMode]);

    // Build class names
    const isDragOver = activeDropZone !== DROP_ZONES.NONE;
    const classNames = [
        'canvas-cell',
        `canvas-cell--${contentType}`,
        `canvas-cell--mode-${renderMode}`,
        isEmpty && 'canvas-cell--empty',
        isSelected && 'canvas-cell--selected',
        isHighlighted && 'canvas-cell--highlighted',
        selectionMode && 'canvas-cell--selectable',
        inEditMode && 'canvas-cell--edit-mode',
        isDragOver && 'canvas-cell--drag-over',
        isDragOver && `canvas-cell--drop-zone-${activeDropZone}`,
        rowSpan > 1 && 'canvas-cell--row-span',
        colSpan > 1 && 'canvas-cell--col-span',
    ]
        .filter(Boolean)
        .join(' ');

    // ==========================================================================
    // DRAG AND DROP - With Zone Detection (rAF throttled)
    // ==========================================================================

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        // Accept both 'copy' (from DatasetParent) and 'move' (from ViewItem)
        const allowedEffect = e.dataTransfer.effectAllowed;
        if (allowedEffect === 'copy' || allowedEffect === 'copyMove') {
            e.dataTransfer.dropEffect = 'copy';
        } else {
            e.dataTransfer.dropEffect = 'move';
        }

        // Calculate which drop zone we're in
        const zone = getDropZone(e, cellRef, isEmpty);

        // Only schedule update if zone actually changed
        if (zone !== pendingZoneRef.current) {
            pendingZoneRef.current = zone;

            // Throttle with rAF - only one update per frame
            if (!rafIdRef.current) {
                rafIdRef.current = requestAnimationFrame(() => {
                    rafIdRef.current = null;
                    setActiveDropZone(pendingZoneRef.current);
                });
            }
        }
    }, [isEmpty]);

    const handleDragLeave = useCallback((e) => {
        // Only clear if leaving the cell entirely (not entering a child)
        if (!cellRef.current?.contains(e.relatedTarget)) {
            // Cancel any pending rAF
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            pendingZoneRef.current = DROP_ZONES.NONE;
            setActiveDropZone(DROP_ZONES.NONE);
        }
    }, []);

    // Parse drop data from drag event
    const parseDropData = useCallback((e) => {
        try {
            const types = Array.from(e.dataTransfer.types);
            let data;

            // Try CIA dataset format (from DatasetsTab)
            data = e.dataTransfer.getData('application/cia-dataset');
            if (data) {
                const parsed = JSON.parse(data);
                return { type: 'dataset', datasetId: parsed.id || parsed.datasetId, ...parsed };
            }

            // Try x-dataset format (legacy)
            data = e.dataTransfer.getData('application/x-dataset');
            if (data) {
                const parsed = JSON.parse(data);
                return { type: 'dataset', datasetId: parsed.id || parsed.datasetId, ...parsed };
            }

            // Try ViewItem format (from Views tab - x-viewitem MIME type)
            data = e.dataTransfer.getData('application/x-viewitem');
            if (data) {
                const parsed = JSON.parse(data);
                return { type: 'view', viewConfigId: parsed.id || parsed.viewConfigId, ...parsed };
            }

            // Fall back to generic JSON (from files tab or other sources)
            data = e.dataTransfer.getData('application/json');
            if (data) {
                const parsed = JSON.parse(data);

                if (parsed.type === 'dataset') {
                    return { type: 'dataset', datasetId: parsed.datasetId || parsed.id, ...parsed };
                } else if (parsed.type === 'view-item' || parsed.type === 'view') {
                    return { type: 'view', viewConfigId: parsed.viewId || parsed.viewConfigId || parsed.id, ...parsed };
                } else if (parsed.type === 'file' || parsed.path || parsed.isFile) {
                    return { type: 'file', ...parsed, isFile: true };
                } else {
                    return { type: 'unknown', ...parsed };
                }
            }

            // Try text/plain as last resort (might contain JSON)
            data = e.dataTransfer.getData('text/plain');
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.viewConfigId || parsed.viewId || parsed.id) {
                        return { type: 'view', viewConfigId: parsed.viewConfigId || parsed.viewId || parsed.id, ...parsed };
                    }
                    if (parsed.datasetId) {
                        return { type: 'dataset', ...parsed };
                    }
                } catch {
                    // Not JSON, ignore
                }
            }

            // Last resort: check if any application/* type contains parseable data
            for (const mimeType of types) {
                if (mimeType.startsWith('application/')) {
                    data = e.dataTransfer.getData(mimeType);
                    if (data) {
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.datasetId || parsed.type === 'dataset') {
                                return { type: 'dataset', datasetId: parsed.datasetId || parsed.id, ...parsed };
                            }
                            if (parsed.viewConfigId || parsed.viewId || parsed.type === 'view' || parsed.type === 'view-item') {
                                return { type: 'view', viewConfigId: parsed.viewConfigId || parsed.viewId || parsed.id, ...parsed };
                            }
                            return { type: 'unknown', ...parsed };
                        } catch {
                            // Not JSON, continue
                        }
                    }
                }
            }

            return null;
        } catch {
            return null;
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const dropZone = activeDropZone;
        setActiveDropZone(DROP_ZONES.NONE);

        const dropData = parseDropData(e);
        if (!dropData) return;

        // Get modifier keys for push behavior
        const modifiers = {
            shift: e.shiftKey,   // Wrap to next row
            ctrl: e.ctrlKey,     // Close last view
            alt: e.altKey,
        };

        // Handle based on drop zone
        switch (dropZone) {
            case DROP_ZONES.PLACE:
                // Place in empty cell
                if (onDrop && isEmpty) {
                    if (dropData.type === 'dataset') {
                        onDrop(row, col, { datasetId: dropData.datasetId, ...dropData, modifiers });
                    } else if (dropData.type === 'view') {
                        onDrop(row, col, { viewConfigId: dropData.viewConfigId, ...dropData, modifiers });
                    } else {
                        onDrop(row, col, { ...dropData, modifiers });
                    }
                }
                break;

            case DROP_ZONES.SWAP:
                // Swap with existing view
                if (onSwap && !isEmpty) {
                    onSwap(row, col, dropData, placement);
                } else if (onDrop) {
                    // Fallback to onDrop if onSwap not provided
                    onDrop(row, col, { ...dropData, action: 'swap', existingPlacement: placement });
                }
                break;

            case DROP_ZONES.PUSH_UP:
            case DROP_ZONES.PUSH_DOWN:
            case DROP_ZONES.PUSH_LEFT:
            case DROP_ZONES.PUSH_RIGHT:
                // Push in direction
                const direction = dropZone.replace('push-', '');
                if (onPush) {
                    onPush(row, col, direction, dropData, modifiers);
                } else if (onDrop) {
                    // Fallback to onDrop with push info
                    onDrop(row, col, { ...dropData, action: 'push', direction, modifiers });
                }
                break;

            default:
                console.warn('Unknown drop zone:', dropZone);
        }
    }, [activeDropZone, parseDropData, isEmpty, row, col, placement, onDrop, onSwap, onPush]);

    // ==========================================================================
    // CELL DRAGGING (Edit Mode)
    // ==========================================================================

    const handleDragStart = useCallback((e) => {
        // Only allow dragging in edit mode and for non-empty cells
        if (!inEditMode || isEmpty) {
            e.preventDefault();
            return;
        }

        // Set drag data with placement info for swap handling
        const dragData = {
            type: 'canvas-cell',
            placementId: placement?.id,
            row,
            col,
            contentType,
            viewConfigId: placement?.content?.viewConfigurationId,
            sourcePlacementId: placement?.id,
        };

        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
        e.dataTransfer.effectAllowed = 'move';

        // Add dragging class after a small delay for visual feedback
        requestAnimationFrame(() => {
            cellRef.current?.classList.add('canvas-cell--dragging');
        });
    }, [inEditMode, isEmpty, placement, row, col, contentType]);

    const handleDragEnd = useCallback(() => {
        cellRef.current?.classList.remove('canvas-cell--dragging');
    }, []);

    // ==========================================================================
    // CLICK HANDLERS
    // ==========================================================================

    // Mousedown activates this view for the 3-tier lifecycle system
    // This ensures the view becomes LIVE before any interaction starts
    const handleMouseDown = useCallback((e) => {
        // Only activate for view placements
        if (contentType === 'view' && placement?.content?.viewConfigurationId) {
            const viewId = placement.content.viewConfigurationId;
            // Dispatch activation event - CanvasGrid listens for this
            // Include paneId for proper scoping in tile mode
            window.dispatchEvent(new CustomEvent('cia:instance-focused', {
                detail: {
                    viewId,
                    paneId: canvasFocusContext?.paneId || null,
                    source: 'cell-mousedown',
                }
            }));

            // Also request focus for this pane if in tile mode
            canvasFocusContext?.requestFocus?.();
        }
    }, [contentType, placement?.content?.viewConfigurationId, canvasFocusContext]);

    const handleClick = useCallback((e) => {
        // In selection mode, clicking the cell toggles selection
        if (selectionMode) {
            e.stopPropagation();
            onSelect?.();
            return;
        }
        if (onClick) {
            onClick(e);
        }
    }, [onClick, selectionMode, onSelect]);

    const handleAddClick = useCallback((type) => {
        if (onAddContent) {
            onAddContent(type);
        }
    }, [onAddContent]);

    // ==========================================================================
    // HELPER FUNCTIONS
    // ==========================================================================

    const getDisplayName = useCallback(() => {
        if (isEmpty) return `Empty [${row}, ${col}]`;
        if (contentType === 'view') return placement.content?.name || 'View';
        if (contentType === 'notes') return 'Notes';
        if (contentType === 'image') return 'Image';
        return `Cell [${row}, ${col}]`;
    }, [isEmpty, contentType, placement, row, col]);

    // ==========================================================================
    // RENDER FUNCTIONS
    // ==========================================================================

    const renderContent = () => {
        if (isEmpty) {
            return (
                <EmptyPlaceholder
                    row={row}
                    col={col}
                    renderMode={renderMode}
                    inEditMode={inEditMode}
                    onAddClick={handleAddClick}
                />
            );
        }

        switch (contentType) {
            case PlacementContentType.VIEW:
                // =================================================================
                // 3-TIER LIFECYCLE SYSTEM for InstanceViewport
                // =================================================================
                // LIVE: Active view (interactive, renders on demand)
                // PAUSED: Recently used views in LRU cache (mounted but paused)
                // COLD: All other views (thumbnail only, no InstanceViewport)
                //
                // This reduces GPU load from N instances to 1 live + max 3 paused.
                // Paused instances don't render or handle events, but resume fast.
                // =================================================================
                const viewId = placement.content.viewConfigurationId;
                const isActiveView = viewId === activeViewId;
                const isWarmCached = recentViewIds.includes(viewId);

                // Determine lifecycle state
                let lifecycle = 'cold';
                if (isActiveView) {
                    lifecycle = 'live';
                } else if (isWarmCached) {
                    lifecycle = 'paused';
                }

                // Mount InstanceViewport for active OR warm-cached views
                // In FULL/COMPACT mode, always mount and run live
                const isThumbnailMode =
                    renderMode === RENDER_MODES.THUMBNAIL ||
                    renderMode === RENDER_MODES.SNAPSHOT;

                const shouldMountViewport =
                    renderMode === RENDER_MODES.FULL ||
                    renderMode === RENDER_MODES.COMPACT ||
                    isActiveView ||
                    isWarmCached;

                // In full/compact mode, always live
                const effectiveLifecycle = isThumbnailMode ? lifecycle : 'live';

                // Handler for activating cold views (promotes to LIVE)
                const handleActivateView = () => {
                    window.dispatchEvent(new CustomEvent('cia:instance-focused', {
                        detail: {
                            viewId,
                            paneId: canvasFocusContext?.paneId || null,
                            source: 'cold-header-activate',
                        }
                    }));
                    // Also request focus for this pane
                    canvasFocusContext?.requestFocus?.();
                };

                // Handler for trashing the view (moves to Recently Deleted)
                const handleTrashView = () => {
                    window.dispatchEvent(new CustomEvent('cia:trash-view', {
                        detail: { viewId }
                    }));
                };

                return (
                    <ViewContent
                        viewId={viewId}
                        rowSpan={rowSpan}
                        colSpan={colSpan}
                        placementId={placement.id}
                        renderMode={renderMode}
                        uiConfig={uiConfig}
                        onClose={() => onRemove?.()}
                        onTrash={handleTrashView}
                        viewColor={instanceColor}
                        shouldMountViewport={shouldMountViewport}
                        isActiveView={isActiveView}
                        isInFocusMode={isInFocusMode}
                        lifecycle={effectiveLifecycle}
                        onActivate={handleActivateView}
                        onFocusView={onFocusView}
                    />
                );

            case PlacementContentType.NOTES:
                return (
                    <NotesPlaceholder
                        notesId={placement.content.notesBlockId}
                        renderMode={renderMode}
                        onClose={() => onRemove?.()}
                    />
                );

            case PlacementContentType.IMAGE:
                return (
                    <ImagePlaceholder
                        imageId={placement.content.imageBlockId}
                        renderMode={renderMode}
                        onClose={() => onRemove?.()}
                    />
                );

            case PlacementContentType.SUBSET:
                return (
                    <SubsetCardById
                        subsetId={placement.content.subsetId}
                        renderMode={renderMode}
                        isActive={false}
                        onOpen={() => {
                            // Dispatch event to open subset in focus mode
                            window.dispatchEvent(new CustomEvent('cia:open-subset', {
                                detail: { subsetId: placement.content.subsetId }
                            }));
                        }}
                        onClose={() => onRemove?.()}
                    />
                );

            default:
                return (
                    <div className="canvas-cell__unknown">
                        <span>Unknown content type: {contentType}</span>
                        {onRemove && (
                            <button
                                className="canvas-cell__remove-invalid-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove();
                                }}
                                title="Remove invalid placement"
                            >
                                <Icon name="close" size={14} />
                                <span>Remove</span>
                            </button>
                        )}
                    </div>
                );
        }
    };

    // ==========================================================================
    // MAIN RENDER
    // ==========================================================================

    return (
        <div
            ref={cellRef}
            className={classNames}
            data-row={row}
            data-col={col}
            data-content-type={contentType}
            data-render-mode={renderMode}
            data-drop-zone={activeDropZone}
            style={{
                '--cell-width': `${cellSize.width}px`,
                '--cell-height': `${cellSize.height}px`,
                // Apply instance color for selected border/glow styling
                ...(instanceColor && {
                    '--instance-color': instanceColor,
                    '--instance-color-rgb': hexToRgbString(instanceColor),
                }),
            }}
            // Enable dragging in edit mode for non-empty cells
            draggable={inEditMode && !isEmpty}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            onDoubleClick={onDoubleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            // Use native title for tooltip in small modes - no React state needed
            title={uiConfig.showTooltipOnHover ? `${getDisplayName()}${rowSpan > 1 || colSpan > 1 ? ` (${colSpan}×${rowSpan})` : ''}` : undefined}
        >
            {/* Drop Zone Overlay - Shows visual feedback during drag */}
            {isDragOver && (
                <DropZoneOverlay zone={activeDropZone} isEmpty={isEmpty} />
            )}

            {/* Selection checkbox (for edit mode) */}
            {selectionMode && (
                <div className="canvas-cell__selection-overlay">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                            e.stopPropagation();
                            onSelect?.(e);
                        }}
                        aria-label={`Select empty cell at ${positionLabel || `${row}, ${col}`}`}
                    />
                </div>
            )}

            {/* Isolation mode indicator (for small cells) */}
            {(renderMode === RENDER_MODES.THUMBNAIL || renderMode === RENDER_MODES.SNAPSHOT) && !isEmpty && (
                <div className="canvas-cell__isolation-hint">
                    <Icon name="zoomIn" size={12} />
                </div>
            )}

            {/* Focused by other users */}
            {focusedByUsers.length > 0 && (
                <div className="canvas-cell__focus-indicator">
                    {focusBadgeUsers.map((user) => (
                        <span
                            key={user.clientId || user.userId}
                            className="canvas-cell__focus-badge"
                            style={{ '--focus-color': user.userColor || '#60a5fa' }}
                            title={`${user.userName} focused`}
                        >
                            {user.userName}
                        </span>
                    ))}
                    {focusExtraCount > 0 && (
                        <span className="canvas-cell__focus-badge canvas-cell__focus-badge--more">
                            +{focusExtraCount}
                        </span>
                    )}
                </div>
            )}

            {/* Content */}
            {renderContent()}

            {/* Coordinates badge (only in full mode) */}
            {uiConfig.showCoords && (
                <div className="canvas-cell__coords">
                    {positionLabel || `${row}, ${col}`}
                </div>
            )}
        </div>
    );
});

// =============================================================================
// DROP ZONE OVERLAY - Visual feedback during drag
// =============================================================================

function DropZoneOverlay({ zone, isEmpty }) {
    const getZoneConfig = () => {
        switch (zone) {
            case DROP_ZONES.PLACE:
                return {
                    className: 'drop-zone--place',
                    icon: 'add',
                    label: 'Place Here',
                };
            case DROP_ZONES.SWAP:
                return {
                    className: 'drop-zone--swap',
                    icon: 'arrowLeftRight',
                    label: 'Swap',
                };
            case DROP_ZONES.PUSH_UP:
                return {
                    className: 'drop-zone--push drop-zone--push-up',
                    icon: 'arrowUp',
                    label: 'Push Up',
                };
            case DROP_ZONES.PUSH_DOWN:
                return {
                    className: 'drop-zone--push drop-zone--push-down',
                    icon: 'arrowDown',
                    label: 'Push Down',
                };
            case DROP_ZONES.PUSH_LEFT:
                return {
                    className: 'drop-zone--push drop-zone--push-left',
                    icon: 'arrowLeft',
                    label: 'Push Left',
                };
            case DROP_ZONES.PUSH_RIGHT:
                return {
                    className: 'drop-zone--push drop-zone--push-right',
                    icon: 'arrowRight',
                    label: 'Push Right',
                };
            default:
                return null;
        }
    };

    const config = getZoneConfig();
    if (!config) return null;

    return (
        <div className={`canvas-cell__drop-zone ${config.className}`}>
            <div className="drop-zone__content">
                <Icon name={config.icon} size={20} />
                <span className="drop-zone__label">{config.label}</span>
            </div>
        </div>
    );
}

// =============================================================================
// EMPTY PLACEHOLDER - With Radial Menu (No Portal)
// =============================================================================

function EmptyPlaceholder({ row, col, renderMode, inEditMode, onAddClick }) {
    const [showRadial, setShowRadial] = useState(false);
    const containerRef = useRef(null);
    const radialRadius = 55; // Distance from center to options

    // Close menu when clicking outside
    useEffect(() => {
        if (!showRadial) return;

        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setShowRadial(false);
            }
        };

        // Small delay to prevent immediate close from the same click
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 10);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showRadial]);

    // Close on escape key
    useEffect(() => {
        if (!showRadial) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setShowRadial(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [showRadial]);

    // Don't show add button in tiny modes
    if (renderMode === RENDER_MODES.SNAPSHOT) {
        return (
            <div className="canvas-cell__empty-minimal">
                <div className="canvas-cell__empty-dot" />
            </div>
        );
    }

    if (renderMode === RENDER_MODES.THUMBNAIL) {
        return (
            <div className="canvas-cell__empty-thumbnail">
                <Icon name="add" size={12} />
            </div>
        );
    }

    const handleOptionClick = (type) => {
        setShowRadial(false);
        onAddClick?.(type);
    };

    const handleCenterClick = (e) => {
        e.stopPropagation();
        setShowRadial(!showRadial);
    };

    return (
        <div ref={containerRef} className="canvas-cell__empty-container">
            {/* Center button - Plus or X */}
            <button
                className={`canvas-cell__add-btn ${showRadial ? 'canvas-cell__add-btn--active' : ''}`}
                onClick={handleCenterClick}
                title={showRadial ? 'Close menu' : 'Add content'}
            >
                {showRadial ? <Icon name="close" size={20} /> : <Icon name="add" size={20} />}
            </button>

            {/* Radial options - positioned around center button */}
            {showRadial && (
                <div className="canvas-cell__radial-options">
                    {CONTENT_OPTIONS.map((option, index) => {
                        const { type, icon, label, color } = option;
                        // Position in a cross pattern: right, bottom, left, top
                        const angles = [0, 90, 180, 270];
                        const angle = angles[index];
                        const rad = (angle * Math.PI) / 180;
                        const x = Math.cos(rad) * radialRadius;
                        const y = Math.sin(rad) * radialRadius;

                        return (
                            <button
                                key={type}
                                className={`canvas-cell__radial-option canvas-cell__radial-option--${color}`}
                                style={{
                                    '--radial-x': `${x}px`,
                                    '--radial-y': `${y}px`,
                                    animationDelay: `${index * 0.04}s`,
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOptionClick(type);
                                }}
                                title={label}
                            >
                                <Icon name={icon} size={18} />
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Position indicator - bottom right corner */}
            <div className="canvas-cell__position-badge">
                {formatGridPosition(col, row) || '--'}
            </div>
        </div>
    );
}

// No headers in thumbnail/snapshot modes - small cells show only thumbnails
// Headers are only rendered in FULL/COMPACT modes via InstanceViewport

// =============================================================================
// VIEW CONTENT
// =============================================================================

function ViewContent({
    viewId,
    rowSpan,
    colSpan,
    placementId,
    renderMode,
    uiConfig,
    onClose,
    onTrash,
    viewColor, // Fallback color from placement content (used if hook returns no color)
    shouldMountViewport = true,
    isActiveView = false,
    isInFocusMode = false, // Whether in focus mode (hides focus button)
    lifecycle = 'live', // 'live' | 'paused' | 'cold'
    onActivate, // Called when user wants to activate a cold view
    onFocusView, // Called when user clicks Focus button in header
}) {
    const [isReady, setIsReady] = useState(false);

    // Determine render mode type
    const isThumbnailMode =
        uiConfig.renderContent === 'thumbnail' ||
        uiConfig.renderContent === 'snapshot';
    const isFullMode = uiConfig.renderContent === 'full';

    // Cold mode = thumbnail mode AND viewport NOT mounted
    const isCold = isThumbnailMode && !shouldMountViewport;

    // Loading state: viewport is mounting but not ready yet
    const isLoading = shouldMountViewport && !isReady;

    // ==========================================================================
    // PROGRESSIVE LOADING - Show thumbnail while viewport loads (ALL modes)
    // ==========================================================================
    // Show thumbnail overlay:
    // - In THUMBNAIL/SNAPSHOT mode: until viewport is ready and live
    // - In FULL/COMPACT mode: while loading, then fade out
    // This provides smooth visual transition from thumbnail to live content
    const showThumbnailOverlay = isThumbnailMode
        ? !(shouldMountViewport && isReady && lifecycle === 'live')  // Thumbnail mode: show until live
        : isLoading;  // Full mode: show only while loading

    // CSS class for crossfade transition when becoming active
    const viewportTransitionClass = (isActiveView || isLoading) ? 'canvas-cell__instance-container--activating' : '';

    // Show standalone header when viewport is NOT mounted (cold thumbnail views)
    // When viewport IS mounted, InstanceViewport renders its own header
    const showStandaloneHeader = !shouldMountViewport && uiConfig.showMiniHeader;

    return (
        <div className={`canvas-cell__view-content ${isLoading ? 'canvas-cell__view-content--loading' : ''}`}>
            {/* ================================================================
                STANDALONE HEADER - For cold views (viewport not mounted)
                ================================================================ */}
            {/* When InstanceViewport is mounted, IT renders the header instead */}
            {showStandaloneHeader && (
                <ColdViewHeader
                    viewId={viewId}
                    viewColor={viewColor}
                    onClose={onClose}
                    onActivate={onActivate}
                    onFocus={onFocusView}
                    renderMode={renderMode}
                    isLoading={false}
                    isActive={isActiveView}
                />
            )}

            {/* ================================================================
                THUMBNAIL OVERLAY - Progressive loading for ALL modes
                ================================================================ */}
            {/* Shows thumbnail while viewport loads, fades out when ready */}
            <div
                className={`canvas-cell__thumbnail-overlay ${showThumbnailOverlay ? '' : 'canvas-cell__thumbnail-overlay--hidden'} ${isCold ? 'canvas-cell__thumbnail-overlay--cold' : ''}`}
            >
                <Thumbnail
                    viewId={viewId}
                    size="fill"
                    instanceType="vtk"
                    fallback={
                        <div className="canvas-cell__thumbnail-placeholder">
                            <Icon name="box" size={uiConfig.renderContent === 'snapshot' ? 16 : 24} />
                        </div>
                    }
                />
            </div>

            {/* Mount InstanceViewport when:
                - FULL/COMPACT mode (always render live), OR
                - THUMBNAIL/SNAPSHOT mode AND (active view OR warm-cached)

                Lifecycle states:
                - 'live': Interactive, renders on demand
                - 'paused': Mounted but frozen (no events, no render loop)
                - 'cold': Not mounted at all (thumbnail only)

                This reduces GPU load from N instances to 1 live + 3 paused max */}
            {shouldMountViewport && (
                <div
                    className={`canvas-cell__instance-container ${viewportTransitionClass}`}
                    style={{
                        pointerEvents: showThumbnailOverlay ? 'none' : 'auto',
                    }}
                >
                    <ProgressiveLoader viewId={viewId} isReady={isReady}>
                        <InstanceViewport
                            viewConfigId={viewId}
                            isRemote={false}
                            currentSpan={`${colSpan}x${rowSpan}`}
                            renderMode={renderMode}
                            onFocus={onFocusView}
                            isInFocusMode={isInFocusMode}
                            onReady={() => setIsReady(true)}
                            onClose={onClose}
                            onTrash={onTrash}
                            lifecycle={lifecycle}
                            positionColor={viewColor}
                        />
                    </ProgressiveLoader>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// NOTES PLACEHOLDER
// =============================================================================

function NotesPlaceholder({ notesId, renderMode, onClose }) {
    if (renderMode === RENDER_MODES.SNAPSHOT || renderMode === RENDER_MODES.THUMBNAIL) {
        return (
            <div className="canvas-cell__notes-mini">
                <Icon name="FileText" size={renderMode === RENDER_MODES.SNAPSHOT ? 16 : 20} />
            </div>
        );
    }

    return (
        <div className="canvas-cell__notes-placeholder">
            <div className="canvas-cell__notes-header">
                <span className="canvas-cell__notes-icon"><Icon name="note" size={16} /></span>
                <span className="canvas-cell__notes-title">Notes</span>
                <button
                    className="canvas-cell__close-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose?.();
                    }}
                    title="Remove notes"
                >
                    <Icon name="close" size={14} />
                </button>
            </div>
            <div className="canvas-cell__notes-body">
                <p className="canvas-cell__notes-preview">
                    {notesId ? 'Notes content...' : 'Empty notes - click to edit'}
                </p>
            </div>
        </div>
    );
}

// =============================================================================
// IMAGE PLACEHOLDER
// =============================================================================

function ImagePlaceholder({ imageId, renderMode, onClose }) {
    if (renderMode === RENDER_MODES.SNAPSHOT || renderMode === RENDER_MODES.THUMBNAIL) {
        return (
            <div className="canvas-cell__image-mini">
                <FileImage size={renderMode === RENDER_MODES.SNAPSHOT ? 16 : 20} />
            </div>
        );
    }

    return (
        <div className="canvas-cell__image-placeholder">
            <div className="canvas-cell__image-header">
                <span className="canvas-cell__image-icon"><Icon name="image" size={16} /></span>
                <span className="canvas-cell__image-title">Image</span>
                <button
                    className="canvas-cell__close-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose?.();
                    }}
                    title="Remove image"
                >
                    <Icon name="close" size={14} />
                </button>
            </div>
            <div className="canvas-cell__image-body">
                <div className="canvas-cell__image-preview">
                    {imageId ? `Image: ${imageId.slice(0, 8)}...` : 'No image selected'}
                </div>
            </div>
        </div>
    );
}

export default CanvasCell;
