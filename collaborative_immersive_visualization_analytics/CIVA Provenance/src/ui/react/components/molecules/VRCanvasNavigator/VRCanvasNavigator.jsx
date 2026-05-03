/**
 * @file VRCanvasNavigator.jsx
 * @description Complete VR canvas navigator component with minimap, controls, and menus.
 */

import React, { memo } from 'react';
import { VRNavigatorProvider } from './VRNavigatorContext';
import { VRMinimapGrid } from './VRMinimapGrid';
import { VRMultiSelectToolbar } from './VRMultiSelectToolbar';
import { VRNavigationControls } from './VRNavigationControls';
import { VRCellContextMenuPortal } from './VRCellContextMenu';
import './VRCanvasNavigator.scss';

/**
 * VRCanvasNavigator - Complete VR canvas navigator component
 */
export const VRCanvasNavigator = memo(function VRCanvasNavigator({
    cells,
    canvasSize,
    viewport,
    homepoint,
    collaborators,
    displayMode = 'names',
    onMovePlacement,
    onSwapPlacements,
    onDeletePlacement,
    onMergeCells,
    onSplitCell,
    onSetHomepoint,
    onNavigateToCell,
    onNavigate,
    onZoom,
}) {
    return (
        <VRNavigatorProvider
            cells={cells}
            canvasSize={canvasSize}
            onMovePlacement={onMovePlacement}
            onSwapPlacements={onSwapPlacements}
            onDeletePlacement={onDeletePlacement}
            onMergeCells={onMergeCells}
            onSplitCell={onSplitCell}
            onSetHomepoint={onSetHomepoint}
            onNavigateToCell={onNavigateToCell}
        >
            <div className="vr-canvas-navigator">
                {/* Header */}
                <div className="vr-canvas-navigator__header">
                    <span className="vr-canvas-navigator__title">
                        Canvas Navigator
                    </span>
                    <span className="vr-canvas-navigator__size">
                        {canvasSize.rows}&times;{canvasSize.cols} grid
                    </span>
                </div>

                {/* Minimap */}
                <VRMinimapGrid
                    viewport={viewport}
                    homepoint={homepoint}
                    collaborators={collaborators}
                    displayMode={displayMode}
                />

                {/* Multi-select toolbar */}
                <VRMultiSelectToolbar />

                {/* Navigation controls */}
                <VRNavigationControls
                    onNavigate={onNavigate}
                    onZoom={onZoom}
                    currentPosition={viewport || { row: 0, col: 0 }}
                />

                {/* Instructions */}
                <div className="vr-canvas-navigator__instructions">
                    <strong>Controls:</strong>
                    <ul>
                        <li>Tap cell &rarr; Tap destination to move</li>
                        <li>Long-press for context menu</li>
                        <li>Hold Grip + tap for multi-select</li>
                        <li>Thumbstick to navigate viewport</li>
                    </ul>
                </div>
            </div>

            {/* Context menu (portal) */}
            <VRCellContextMenuPortal />
        </VRNavigatorProvider>
    );
});

export default VRCanvasNavigator;
