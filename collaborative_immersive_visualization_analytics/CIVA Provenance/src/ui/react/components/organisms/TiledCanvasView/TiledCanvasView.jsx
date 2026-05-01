/**
 * @file TiledCanvasView.jsx
 * @description Display multiple workspaces side-by-side with resizable dividers
 *
 * Features:
 * - Maximum 4 canvases visible at once
 * - Minimum canvas size: 280px × 200px
 * - Divider drag ratio: 20% - 80%
 * - Layout patterns: single, horizontal split, 2×2 grid
 */

import React, { memo, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';
import { CanvasFocusProvider, generatePaneId } from '@UI/react/context/CanvasFocusContext';
import { MiniCanvasHeader } from './MiniCanvasHeader';
import { ResizableDivider } from './ResizableDivider';
import {
    useSplitRatio,
    useOpenWorkspaces,
    getLayoutConfig,
    WORKSPACE_TYPE_CONFIG,
} from './TiledCanvasView.logic';
import './TiledCanvasView.scss';

/**
 * CanvasPanel - Individual canvas panel with header and content area
 */
const CanvasPanel = memo(function CanvasPanel({
    workspace,
    isActive,
    isMaximized,
    onSelect,
    onClose,
    onMaximize,
    onRename,
    currentBreakoutId,
    onJoinBreakout,
    children,
}) {
    const config = WORKSPACE_TYPE_CONFIG[workspace.type] || WORKSPACE_TYPE_CONFIG.workspace;

    return (
        <div
            className={`canvas-panel ${isActive ? 'canvas-panel--active' : ''} ${isMaximized ? 'canvas-panel--maximized' : ''}`}
            onClick={(event) => {
                event.stopPropagation();
                onSelect?.();
            }}
            role="presentation"
        >
            {!isMaximized && (
                <MiniCanvasHeader
                    workspace={workspace}
                    isActive={isActive}
                    onActivate={onSelect}
                    onClose={onClose}
                    onMaximize={onMaximize}
                    onRename={onRename}
                    currentBreakoutId={currentBreakoutId}
                    onJoinBreakout={onJoinBreakout}
                />
            )}
            <div className="canvas-panel__content">
                {children || (
                    <div className="canvas-panel__placeholder">
                        <Icon
                            name={config.icon || 'layoutGrid'}
                            size={32}
                            className="canvas-panel__placeholder-icon"
                        />
                        <span className="canvas-panel__placeholder-name">{workspace.name}</span>
                    </div>
                )}
            </div>
        </div>
    );
});

/**
 * TiledCanvasView - Main component for tile mode canvas display
 */
const TiledCanvasView = memo(function TiledCanvasView({
    workspaces = [],
    activeWorkspaceId,
    maximizedWorkspaceId,
    onSelectWorkspace,
    onCloseWorkspace,
    onMaximizeWorkspace,
    onRenameWorkspace,
    onClearSelection,
    currentBreakoutId,
    onJoinBreakout,
    renderCanvas,
}) {
    const { openWorkspaces, count } = useOpenWorkspaces(workspaces);
    const {
        splitRatio,
        isDragging,
        containerRef,
        handleDividerMouseDown,
    } = useSplitRatio();

    const layoutConfig = getLayoutConfig(count);

    const handleSelect = useCallback((id) => {
        onSelectWorkspace?.(id);
    }, [onSelectWorkspace]);

    const handleClose = useCallback((id) => {
        onCloseWorkspace?.(id);
    }, [onCloseWorkspace]);

    const handleMaximize = useCallback((id) => {
        onMaximizeWorkspace?.(id);
    }, [onMaximizeWorkspace]);

    const handleRename = useCallback((id, name) => {
        onRenameWorkspace?.(id, name);
    }, [onRenameWorkspace]);

    const handleClearSelection = useCallback(() => {
        onClearSelection?.();
    }, [onClearSelection]);

    // Listen for pane focus requests from child components (e.g., InstanceViewport clicks)
    // This enables the focus-on-click flow: InstanceViewport → requestFocus → here → onSelectWorkspace
    useEffect(() => {
        const handlePaneFocusRequested = (e) => {
            const { paneId, canvasId } = e.detail || {};
            console.log(`[TiledCanvasView] pane-focus-requested event:`, { paneId, canvasId, activeWorkspaceId });

            if (!paneId && !canvasId) return;

            // Find workspace matching this pane/canvas
            const targetWorkspace = openWorkspaces.find((ws) => {
                const wsCanvasId = ws.activeCanvasId || ws.id;
                // Check if paneId starts with the canvas ID (handles viewport indices)
                return wsCanvasId === canvasId || paneId?.startsWith(wsCanvasId);
            });

            console.log(`[TiledCanvasView] Found target workspace:`, targetWorkspace?.id, 'current active:', activeWorkspaceId);

            if (targetWorkspace && targetWorkspace.id !== activeWorkspaceId) {
                console.log(`[TiledCanvasView] Switching to workspace:`, targetWorkspace.id);
                onSelectWorkspace?.(targetWorkspace.id);
            }
        };

        window.addEventListener('cia:pane-focus-requested', handlePaneFocusRequested);
        return () => {
            window.removeEventListener('cia:pane-focus-requested', handlePaneFocusRequested);
        };
    }, [openWorkspaces, activeWorkspaceId, onSelectWorkspace]);

    /**
     * Render a canvas panel wrapped with CanvasFocusProvider for pane-scoped state
     * @param {Object} workspace - Workspace object
     */
    const renderCanvasPanel = (workspace) => {
        if (!workspace) return null;
        const isActive = workspace.id === activeWorkspaceId;
        const isMaximized = workspace.id === maximizedWorkspaceId;

        // Each workspace has a unique canvas, so paneId = canvasId
        // (viewport index 0 for each canvas - paneIndex is only for multiple viewports of SAME canvas)
        const canvasId = workspace.activeCanvasId || workspace.id;
        const paneId = generatePaneId(canvasId, 0);

        return (
            <CanvasFocusProvider
                key={paneId}
                canvasId={canvasId}
                paneId={paneId}
                isFocused={isActive}
            >
                <CanvasPanel
                    workspace={workspace}
                    isActive={isActive}
                    isMaximized={isMaximized}
                    onSelect={() => handleSelect(workspace.id)}
                    onClose={() => handleClose(workspace.id)}
                    onMaximize={() => handleMaximize(workspace.id)}
                    onRename={(name) => handleRename(workspace.id, name)}
                    currentBreakoutId={currentBreakoutId}
                    onJoinBreakout={onJoinBreakout}
                >
                    {renderCanvas?.(workspace, paneId)}
                </CanvasPanel>
            </CanvasFocusProvider>
        );
    };

    // Empty state
    if (count === 0) {
        return (
            <div
                ref={containerRef}
                className="tiled-canvas-view tiled-canvas-view--empty"
                onClick={handleClearSelection}
                role="presentation"
            >
                <div className="tiled-canvas-view__empty-state">
                    <Icon name="layoutGrid" size={48} className="tiled-canvas-view__empty-icon" />
                    <span className="tiled-canvas-view__empty-text">No workspaces open</span>
                </div>
            </div>
        );
    }

    const maximizedWorkspace = maximizedWorkspaceId
        ? openWorkspaces.find((workspace) => workspace.id === maximizedWorkspaceId)
        : null;

    if (maximizedWorkspace) {
        return (
            <div
                ref={containerRef}
                className="tiled-canvas-view tiled-canvas-view--single tiled-canvas-view--maximized"
                onClick={handleClearSelection}
                role="presentation"
            >
                <div className="tiled-canvas-view__panel tiled-canvas-view__panel--maximized">
                    {renderCanvasPanel(maximizedWorkspace)}
                </div>
            </div>
        );
    }

    // Single canvas
    if (count === 1) {
        return (
            <div
                ref={containerRef}
                className="tiled-canvas-view tiled-canvas-view--single"
                onClick={handleClearSelection}
                role="presentation"
            >
                <div className="tiled-canvas-view__panel">
                    {renderCanvasPanel(openWorkspaces[0])}
                </div>
            </div>
        );
    }

    // Two canvases - horizontal split
    if (count === 2) {
        return (
            <div
                ref={containerRef}
                className="tiled-canvas-view tiled-canvas-view--horizontal"
                onClick={handleClearSelection}
                role="presentation"
            >
                <div
                    className="tiled-canvas-view__panel"
                    style={{ width: `${splitRatio.h * 100}%` }}
                >
                    {renderCanvasPanel(openWorkspaces[0])}
                </div>
                <ResizableDivider
                    type="horizontal"
                    isDragging={isDragging === 'h'}
                    onMouseDown={handleDividerMouseDown('h')}
                />
                <div className="tiled-canvas-view__panel tiled-canvas-view__panel--flex">
                    {renderCanvasPanel(openWorkspaces[1])}
                </div>
            </div>
        );
    }

    // 3-4 canvases - 2×2 grid
    return (
        <div
            ref={containerRef}
            className="tiled-canvas-view tiled-canvas-view--grid"
            onClick={handleClearSelection}
            role="presentation"
        >
            {/* Top row */}
            <div
                className="tiled-canvas-view__row"
                style={{ height: `${splitRatio.v * 100}%` }}
            >
                <div
                    className="tiled-canvas-view__panel"
                    style={{ width: `${splitRatio.h * 100}%` }}
                >
                    {renderCanvasPanel(openWorkspaces[0])}
                </div>
                <ResizableDivider
                    type="horizontal"
                    isDragging={isDragging === 'h'}
                    onMouseDown={handleDividerMouseDown('h')}
                />
                <div className="tiled-canvas-view__panel tiled-canvas-view__panel--flex">
                    {renderCanvasPanel(openWorkspaces[1])}
                </div>
            </div>

            {/* Vertical divider */}
            <ResizableDivider
                type="vertical"
                isDragging={isDragging === 'v'}
                onMouseDown={handleDividerMouseDown('v')}
            />

            {/* Bottom row */}
            <div className="tiled-canvas-view__row tiled-canvas-view__row--flex">
                <div
                    className="tiled-canvas-view__panel"
                    style={{ width: `${splitRatio.h * 100}%` }}
                >
                    {renderCanvasPanel(openWorkspaces[2])}
                </div>
                <div className="tiled-canvas-view__spacer" />
                <div className="tiled-canvas-view__panel tiled-canvas-view__panel--flex">
                    {openWorkspaces[3] && renderCanvasPanel(openWorkspaces[3])}
                </div>
            </div>
        </div>
    );
});

TiledCanvasView.propTypes = {
    workspaces: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        type: PropTypes.oneOf(['workspace', 'subset', 'scratch']),
        isOpen: PropTypes.bool,
        hasChanges: PropTypes.bool,
        hasBreakout: PropTypes.bool,
        breakoutUsers: PropTypes.number,
    })),
    activeWorkspaceId: PropTypes.string,
    maximizedWorkspaceId: PropTypes.string,
    onSelectWorkspace: PropTypes.func,
    onCloseWorkspace: PropTypes.func,
    onMaximizeWorkspace: PropTypes.func,
    onClearSelection: PropTypes.func,
    currentBreakoutId: PropTypes.string,
    onJoinBreakout: PropTypes.func,
    /** Custom render function for canvas content */
    renderCanvas: PropTypes.func,
};

export { TiledCanvasView, CanvasPanel };
export default TiledCanvasView;
