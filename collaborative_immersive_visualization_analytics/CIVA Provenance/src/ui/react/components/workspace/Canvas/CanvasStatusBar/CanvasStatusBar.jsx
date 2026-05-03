// src/ui/react/components/workspace/Canvas/CanvasStatusBar/CanvasStatusBar.jsx
// Canvas status bar showing info about canvas, viewport, and sync state
//
// Part of the new canvas chrome architecture
// Height: 24px

import React, { memo, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { useViewStack } from '@UI/react/hooks/useViewStack.js';
import './CanvasStatusBar.scss';

// =============================================================================
// CONSTANTS (per memory log)
// =============================================================================

// Minimum canvas size for subset mode (per memory log: <600×500px disable)
const MIN_SUBSET_WIDTH = 600;
const MIN_SUBSET_HEIGHT = 500;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CanvasStatusBar - Info bar at bottom of canvas
 *
 * Shows:
 * - Canvas dimensions (cols × rows)
 * - Viewport dimensions
 * - Cell size (in pixels)
 * - Render mode indicator
 * - Subset mode constraint warning
 * - Sync status
 * - Collaborator count
 */
export function CanvasStatusBar({
    // Canvas info
    canvasSize = { cols: 10, rows: 10 },
    viewportSize = { cols: 3, rows: 3 },
    cellSize = { width: 300, height: 250 },

    // Canvas dimensions in pixels (for subset constraint)
    canvasPixelWidth = 800,
    canvasPixelHeight = 600,

    // Render mode (derived from cell size)
    renderMode = 'full', // full | compact | thumbnail | snapshot

    // Sync status
    isConnected = true,
    isSyncing = false,

    // Collaborators
    collaboratorCount = 0,

    // VR option
    onSendToVR,

    className = '',
}) {
    const { depth, currentView } = useViewStack();

    // Check if canvas is too small for subset mode (per memory log)
    const isSubsetDisabled = useMemo(() => {
        return canvasPixelWidth < MIN_SUBSET_WIDTH || canvasPixelHeight < MIN_SUBSET_HEIGHT;
    }, [canvasPixelWidth, canvasPixelHeight]);

    // Determine render mode message
    const renderModeMessage = {
        full: 'Full mode',
        compact: 'Compact mode',
        thumbnail: 'Thumbnail mode',
        snapshot: 'Snapshot mode - use Focus to interact',
    }[renderMode] || renderMode;

    return (
        <div className={`canvas-status-bar ${className}`}>
            {/* Left - Canvas Info */}
            <div className="canvas-status-bar__section canvas-status-bar__section--left">
                <span className="canvas-status-bar__item">
                    <Icon name="grid" size={10} className="canvas-status-bar__icon" />
                    Canvas: {canvasSize.cols}×{canvasSize.rows}
                </span>
                <span className="canvas-status-bar__separator">|</span>
                <span className="canvas-status-bar__item">
                    Viewport: {viewportSize.cols}×{viewportSize.rows}
                </span>
                <span className="canvas-status-bar__separator">|</span>
                <span className="canvas-status-bar__item">
                    Cell: {Math.round(cellSize.width)}×{Math.round(cellSize.height)}px
                </span>
            </div>

            {/* Center - Render Mode */}
            <div className="canvas-status-bar__section canvas-status-bar__section--center">
                <span className={`canvas-status-bar__render-mode canvas-status-bar__render-mode--${renderMode}`}>
                    {renderModeMessage}
                </span>
            </div>

            {/* Right - Status */}
            <div className="canvas-status-bar__section canvas-status-bar__section--right">
                {/* Subset disabled warning (per memory log: <600×500px) */}
                {isSubsetDisabled && (
                    <>
                        <span className="canvas-status-bar__item canvas-status-bar__item--warning">
                            <Icon name="alertTriangle" size={10} className="canvas-status-bar__icon" />
                            Subsets disabled (canvas too small)
                            {onSendToVR && (
                                <button
                                    type="button"
                                    className="canvas-status-bar__vr-btn"
                                    onClick={onSendToVR}
                                >
                                    Send to VR
                                </button>
                            )}
                        </span>
                        <span className="canvas-status-bar__separator">|</span>
                    </>
                )}

                {/* Depth indicator (when navigated) */}
                {depth > 0 && (
                    <>
                        <span className="canvas-status-bar__item canvas-status-bar__item--muted">
                            Depth: {depth}
                        </span>
                        <span className="canvas-status-bar__separator">|</span>
                    </>
                )}

                {/* Collaborators */}
                {collaboratorCount > 0 && (
                    <>
                        <span className="canvas-status-bar__item canvas-status-bar__item--collab">
                            <Icon name="users" size={10} className="canvas-status-bar__icon" />
                            {collaboratorCount} online
                        </span>
                        <span className="canvas-status-bar__separator">|</span>
                    </>
                )}

                {/* Sync status */}
                <span className={`canvas-status-bar__sync ${isConnected ? '' : 'canvas-status-bar__sync--disconnected'}`}>
                    {isSyncing ? (
                        <>
                            <Icon name="loader" size={10} className="canvas-status-bar__icon canvas-status-bar__icon--spin" />
                            Syncing...
                        </>
                    ) : isConnected ? (
                        <>
                            <Icon name="check" size={10} className="canvas-status-bar__icon" />
                            Synced
                        </>
                    ) : (
                        <>
                            <Icon name="alertCircle" size={10} className="canvas-status-bar__icon" />
                            Disconnected
                        </>
                    )}
                </span>
            </div>
        </div>
    );
}

export default memo(CanvasStatusBar);
