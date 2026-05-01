// src/ui/react/components/workspace/Canvas/CanvasGrid/CanvasEdgeDropZone.jsx
// Canvas Edge Drop Zones - Expand canvas by dropping at edges
//
// Per spec: Drop beyond canvas boundary to expand canvas and place view
//
// Shows '+' indicator at canvas edges during drag operations to indicate
// that dropping will expand the canvas in that direction.

import React, { memo, useState, useCallback, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './CanvasEdgeDropZone.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const EDGE_POSITIONS = {
    TOP: 'top',
    BOTTOM: 'bottom',
    LEFT: 'left',
    RIGHT: 'right',
};

// =============================================================================
// EDGE DROP ZONE COMPONENT
// =============================================================================

/**
 * Single edge drop zone - shows at one edge of the canvas
 */
const EdgeDropZone = memo(function EdgeDropZone({
    position,
    isDragActive,
    isHovered,
    onDragEnter,
    onDragLeave,
    onDrop,
    canExpand,
}) {
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        onDragEnter?.(position);
    }, [position, onDragEnter]);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        // Only leave if actually leaving the zone
        if (!e.currentTarget.contains(e.relatedTarget)) {
            onDragLeave?.(position);
        }
    }, [position, onDragLeave]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        onDrop?.(position, e);
    }, [position, onDrop]);

    // Don't show if can't expand
    if (!canExpand) return null;

    // Only show during active drag
    if (!isDragActive) return null;

    const isVertical = position === EDGE_POSITIONS.LEFT || position === EDGE_POSITIONS.RIGHT;
    const label = isVertical ? 'Add Column' : 'Add Row';

    return (
        <div
            className={`canvas-edge-drop-zone canvas-edge-drop-zone--${position} ${isHovered ? 'canvas-edge-drop-zone--active' : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="canvas-edge-drop-zone__indicator">
                <Icon name="plus" size={16} />
                <span className="canvas-edge-drop-zone__label">{label}</span>
            </div>
        </div>
    );
});

// =============================================================================
// MODIFIER HINTS COMPONENT
// =============================================================================

/**
 * Shows modifier key hints during drag operations
 */
const ModifierHints = memo(function ModifierHints({ isDragActive, modifiers }) {
    if (!isDragActive) return null;

    return (
        <div className="canvas-drop-hints">
            <div className="canvas-drop-hints__content">
                <div className={`canvas-drop-hints__hint ${modifiers.shift ? 'canvas-drop-hints__hint--active' : ''}`}>
                    <kbd>Shift</kbd>
                    <span>Wrap to next row</span>
                </div>
                <div className={`canvas-drop-hints__hint ${modifiers.ctrl ? 'canvas-drop-hints__hint--active' : ''}`}>
                    <kbd>{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</kbd>
                    <span>Close last view</span>
                </div>
                <div className={`canvas-drop-hints__hint ${modifiers.alt ? 'canvas-drop-hints__hint--active' : ''}`}>
                    <kbd>{navigator.platform.includes('Mac') ? '⌥' : 'Alt'}</kbd>
                    <span>Create linked view</span>
                </div>
            </div>
        </div>
    );
});

// =============================================================================
// MAIN CANVAS EDGE DROP ZONES COMPONENT
// =============================================================================

/**
 * CanvasEdgeDropZones - Renders drop zones at all canvas edges
 *
 * Per spec: "Canvas Edge | Beyond canvas boundary | Expand canvas and place"
 *
 * Shows '+' indicator at edges during drag operations.
 * Dropping at an edge expands the canvas in that direction.
 */
export const CanvasEdgeDropZones = memo(function CanvasEdgeDropZones({
    isDragActive = false,
    canExpandTop = true,
    canExpandBottom = true,
    canExpandLeft = true,
    canExpandRight = true,
    maxRows = 100,
    maxCols = 100,
    currentRows = 1,
    currentCols = 1,
    modifiers = {},
    onEdgeDrop,
}) {
    const [hoveredEdge, setHoveredEdge] = useState(null);

    // Check if expansion is possible
    const canExpand = useMemo(() => ({
        top: canExpandTop && currentRows < maxRows,
        bottom: canExpandBottom && currentRows < maxRows,
        left: canExpandLeft && currentCols < maxCols,
        right: canExpandRight && currentCols < maxCols,
    }), [canExpandTop, canExpandBottom, canExpandLeft, canExpandRight, currentRows, currentCols, maxRows, maxCols]);

    const handleDragEnter = useCallback((position) => {
        setHoveredEdge(position);
    }, []);

    const handleDragLeave = useCallback((position) => {
        setHoveredEdge(null);
    }, []);

    const handleDrop = useCallback((position, e) => {
        setHoveredEdge(null);
        onEdgeDrop?.(position, e);
    }, [onEdgeDrop]);

    return (
        <div className={`canvas-edge-drop-zones ${isDragActive ? 'canvas-edge-drop-zones--active' : ''}`}>
            {/* Edge drop zones */}
            <EdgeDropZone
                position={EDGE_POSITIONS.TOP}
                isDragActive={isDragActive}
                isHovered={hoveredEdge === EDGE_POSITIONS.TOP}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                canExpand={canExpand.top}
            />
            <EdgeDropZone
                position={EDGE_POSITIONS.BOTTOM}
                isDragActive={isDragActive}
                isHovered={hoveredEdge === EDGE_POSITIONS.BOTTOM}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                canExpand={canExpand.bottom}
            />
            <EdgeDropZone
                position={EDGE_POSITIONS.LEFT}
                isDragActive={isDragActive}
                isHovered={hoveredEdge === EDGE_POSITIONS.LEFT}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                canExpand={canExpand.left}
            />
            <EdgeDropZone
                position={EDGE_POSITIONS.RIGHT}
                isDragActive={isDragActive}
                isHovered={hoveredEdge === EDGE_POSITIONS.RIGHT}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                canExpand={canExpand.right}
            />

            {/* Modifier key hints */}
            <ModifierHints isDragActive={isDragActive} modifiers={modifiers} />
        </div>
    );
});

export default CanvasEdgeDropZones;
