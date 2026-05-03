// src/ui/react/components/workspace/Canvas/FloatingCanvas/FloatingCanvasWrapper.jsx
// Wrapper component that enables floating/docking/fullscreen canvas modes
//
// Based on canvas-floating-architecture-prototype.jsx
// Supports: DOCKED (default), FLOATING (draggable), FULLSCREEN

import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import './FloatingCanvas.scss';

// =============================================================================
// CANVAS MODES
// =============================================================================

export const CANVAS_MODES = {
    DOCKED: 'docked',
    FLOATING: 'floating',
    FULLSCREEN: 'fullscreen',
};

// =============================================================================
// ASPECT RATIO PRESETS
// =============================================================================

export const ASPECT_RATIOS = {
    FREE: { label: 'Free', ratio: null },
    SQUARE: { label: '1:1', ratio: 1 },
    FOUR_THREE: { label: '4:3', ratio: 4 / 3 },
    SIXTEEN_NINE: { label: '16:9', ratio: 16 / 9 },
    TWENTY_ONE_NINE: { label: '21:9', ratio: 21 / 9 },
};

// =============================================================================
// SIZE CONSTRAINTS
// =============================================================================

export const CANVAS_SIZE_CONSTRAINTS = {
    MIN_WIDTH: 650,       // Minimum for footer toolbar with all zones
    MIN_HEIGHT: 400,      // Adjusted proportionally
    COMFORTABLE_MIN_WIDTH: 700, // Width where all controls fit with labels
};

// =============================================================================
// CANVAS CONTROLS BAR
// =============================================================================
// Responsive: collapses to icon-only at smaller widths
// Can be used standalone or embedded in CanvasToolbar's info bar

export const CanvasControlsBar = memo(function CanvasControlsBar({
    canvasMode = CANVAS_MODES.DOCKED,
    aspectRatio = 'FREE',
    gridSize = { rows: 3, cols: 3 },
    onModeChange,
    onAspectRatioChange,
    onGridSizeChange,
    // Compact mode for embedding in toolbar info bar
    compact = false,
    // Status info (when embedded)
    statusInfo,
}) {
    // Grid presets per memory log: 1×2 through 10×10
    const gridOptions = [
        { value: '1x2', label: '1×2' },
        { value: '2x2', label: '2×2' },
        { value: '2x3', label: '2×3' },
        { value: '3x3', label: '3×3' },
        { value: '3x4', label: '3×4' },
        { value: '4x4', label: '4×4' },
        { value: '5x5', label: '5×5' },
        { value: '10x10', label: '10×10' },
    ];

    const handleGridChange = useCallback((e) => {
        const [rows, cols] = e.target.value.split('x').map(Number);
        onGridSizeChange?.({ rows, cols });
    }, [onGridSizeChange]);

    const modeButtons = [
        { mode: CANVAS_MODES.DOCKED, icon: 'dock', label: 'Docked', title: 'Dock canvas in layout' },
        { mode: CANVAS_MODES.FLOATING, icon: 'move', label: 'Float', title: 'Float canvas (draggable)' },
        { mode: CANVAS_MODES.FULLSCREEN, icon: 'maximize', label: 'Full', title: 'Fullscreen mode (Esc to exit)' },
    ];

    return (
        <div className={`canvas-controls-bar ${compact ? 'canvas-controls-bar--compact' : ''}`}>
            {/* Left - Canvas Mode */}
            <div className="canvas-controls-bar__section">
                <span className="canvas-controls-bar__label">Canvas:</span>
                <div className="canvas-controls-bar__modes">
                    {modeButtons.map(({ mode, icon, label, title }) => (
                        <button
                            key={mode}
                            type="button"
                            className={`canvas-controls-bar__mode-btn ${canvasMode === mode ? 'canvas-controls-bar__mode-btn--active' : ''}`}
                            onClick={() => onModeChange?.(mode)}
                            title={title}
                        >
                            <Icon name={icon} size={12} />
                            <span className="canvas-controls-bar__mode-label">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Center - Aspect Ratio */}
            <div className="canvas-controls-bar__section canvas-controls-bar__section--center">
                <span className="canvas-controls-bar__label">Aspect:</span>
                <select
                    className="canvas-controls-bar__select"
                    value={aspectRatio}
                    onChange={(e) => onAspectRatioChange?.(e.target.value)}
                    title="Lock aspect ratio"
                >
                    {Object.entries(ASPECT_RATIOS).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
                {aspectRatio !== 'FREE' && (
                    <Icon name="lock" size={10} className="canvas-controls-bar__lock-icon" />
                )}
            </div>

            {/* Right - Grid Size */}
            <div className="canvas-controls-bar__section">
                <Icon name="grid" size={10} className="canvas-controls-bar__grid-icon" />
                <select
                    className="canvas-controls-bar__select"
                    value={`${gridSize.rows}x${gridSize.cols}`}
                    onChange={handleGridChange}
                    title="Viewport grid size"
                >
                    {gridOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* Status info (when embedded in toolbar) */}
            {statusInfo && (
                <>
                    <div className="canvas-controls-bar__spacer" />
                    <div className="canvas-controls-bar__status">
                        {statusInfo}
                    </div>
                </>
            )}
        </div>
    );
});

// =============================================================================
// FLOATING CANVAS WRAPPER
// =============================================================================

/**
 * FloatingCanvasWrapper - Wraps canvas content with floating/docking capabilities
 *
 * Props:
 * - canvasMode: 'docked' | 'floating' | 'fullscreen'
 * - aspectRatio: Aspect ratio key from ASPECT_RATIOS
 * - position: { x, y } for floating mode
 * - size: { width, height } for floating mode
 * - onPositionChange: Callback when position changes
 * - onSizeChange: Callback when size changes
 * - children: Canvas content
 */
export function FloatingCanvasWrapper({
    children,
    canvasMode = CANVAS_MODES.DOCKED,
    aspectRatio = 'FREE',
    position = { x: 100, y: 100 },
    size = { width: 800, height: 600 },
    onPositionChange,
    onSizeChange,
    onModeChange,
    zIndex,
    onFocus,
}) {
    const [dragging, setDragging] = useState(false);
    const [resizing, setResizing] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const resizeStartRef = useRef({ width: 0, height: 0, x: 0, y: 0, left: 0, top: 0 });
    const resizeDirectionRef = useRef('bottom-right');

    // Handle drag start
    const handleDragStart = useCallback((e) => {
        if (canvasMode !== CANVAS_MODES.FLOATING) return;
        e.preventDefault();
        setDragging(true);
        dragStartRef.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };
    }, [canvasMode, position]);

    // Handle resize start
    const handleResizeStart = useCallback((direction) => (e) => {
        if (canvasMode !== CANVAS_MODES.FLOATING) return;
        e.preventDefault();
        e.stopPropagation();
        setResizing(true);
        resizeDirectionRef.current = direction;
        resizeStartRef.current = {
            width: size.width,
            height: size.height,
            x: e.clientX,
            y: e.clientY,
            left: position.x,
            top: position.y,
        };
    }, [canvasMode, position.x, position.y, size]);

    // Handle mouse move for drag/resize
    useEffect(() => {
        if (!dragging && !resizing) return;

        const handleMouseMove = (e) => {
            if (dragging) {
                const newX = e.clientX - dragStartRef.current.x;
                const newY = e.clientY - dragStartRef.current.y;
                onPositionChange?.({ x: Math.max(0, newX), y: Math.max(0, newY) });
            }

            if (resizing) {
                const deltaX = e.clientX - resizeStartRef.current.x;
                const deltaY = e.clientY - resizeStartRef.current.y;
                const direction = resizeDirectionRef.current;
                const startWidth = resizeStartRef.current.width;
                const startHeight = resizeStartRef.current.height;
                const startLeft = resizeStartRef.current.left;
                const startTop = resizeStartRef.current.top;
                let nextWidth = startWidth;
                let nextHeight = startHeight;
                let nextLeft = startLeft;
                let nextTop = startTop;

                if (direction.includes('right')) {
                    nextWidth = startWidth + deltaX;
                }
                if (direction.includes('left')) {
                    nextWidth = startWidth - deltaX;
                    nextLeft = startLeft + deltaX;
                }
                if (direction.includes('bottom')) {
                    nextHeight = startHeight + deltaY;
                }
                if (direction.includes('top')) {
                    nextHeight = startHeight - deltaY;
                    nextTop = startTop + deltaY;
                }

                // Apply aspect ratio constraint if set
                const ratioInfo = ASPECT_RATIOS[aspectRatio];
                if (ratioInfo?.ratio) {
                    if (direction.includes('left') || direction.includes('right')) {
                        nextHeight = nextWidth / ratioInfo.ratio;
                        if (direction.includes('top')) {
                            nextTop = startTop + (startHeight - nextHeight);
                        }
                    } else if (direction.includes('top') || direction.includes('bottom')) {
                        nextWidth = nextHeight * ratioInfo.ratio;
                        if (direction.includes('left')) {
                            nextLeft = startLeft + (startWidth - nextWidth);
                        }
                    }
                }

                if (nextWidth < CANVAS_SIZE_CONSTRAINTS.MIN_WIDTH) {
                    const delta = CANVAS_SIZE_CONSTRAINTS.MIN_WIDTH - nextWidth;
                    nextWidth = CANVAS_SIZE_CONSTRAINTS.MIN_WIDTH;
                    if (direction.includes('left')) {
                        nextLeft -= delta;
                    }
                }
                if (nextHeight < CANVAS_SIZE_CONSTRAINTS.MIN_HEIGHT) {
                    const delta = CANVAS_SIZE_CONSTRAINTS.MIN_HEIGHT - nextHeight;
                    nextHeight = CANVAS_SIZE_CONSTRAINTS.MIN_HEIGHT;
                    if (direction.includes('top')) {
                        nextTop -= delta;
                    }
                }

                const finalLeft = Math.max(0, nextLeft);
                const finalTop = Math.max(0, nextTop);

                onPositionChange?.({ x: finalLeft, y: finalTop });
                onSizeChange?.({ width: nextWidth, height: nextHeight });
            }
        };

        const handleMouseUp = () => {
            setDragging(false);
            setResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, resizing, aspectRatio, onPositionChange, onSizeChange]);

    // Handle escape to exit fullscreen
    useEffect(() => {
        if (canvasMode !== CANVAS_MODES.FULLSCREEN) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onModeChange?.(CANVAS_MODES.DOCKED);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [canvasMode, onModeChange]);

    // Docked mode - simple wrapper
    if (canvasMode === CANVAS_MODES.DOCKED) {
        return (
            <div className="floating-canvas floating-canvas--docked">
                {children}
            </div>
        );
    }

    // Fullscreen mode - fixed positioning
    if (canvasMode === CANVAS_MODES.FULLSCREEN) {
        return (
            <div className="floating-canvas floating-canvas--fullscreen">
                <div className="floating-canvas__exit-fullscreen">
                    <IconButton
                        icon="minimize"
                        label="Exit Fullscreen (Esc)"
                        size="sm"
                        onClick={() => onModeChange?.(CANVAS_MODES.DOCKED)}
                    />
                </div>
                {children}
            </div>
        );
    }

    // Floating mode - absolute positioning with drag/resize
    return (
        <div
            className={`floating-canvas floating-canvas--floating ${dragging ? 'floating-canvas--dragging' : ''}`}
            style={{
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                zIndex,
            }}
            onMouseDown={onFocus}
        >
            {/* Drag Handle */}
            <div
                className="floating-canvas__drag-handle"
                onMouseDown={handleDragStart}
            >
                <Icon name="grip" size={14} className="floating-canvas__grip-icon" />
            </div>

            {/* Content */}
            <div className="floating-canvas__content">
                {children}
            </div>

            {/* Resize Handles */}
            <div
                className="floating-canvas__resize-handle floating-canvas__resize-handle--top"
                onMouseDown={handleResizeStart('top')}
            />
            <div
                className="floating-canvas__resize-handle floating-canvas__resize-handle--right"
                onMouseDown={handleResizeStart('right')}
            />
            <div
                className="floating-canvas__resize-handle floating-canvas__resize-handle--bottom"
                onMouseDown={handleResizeStart('bottom')}
            />
            <div
                className="floating-canvas__resize-handle floating-canvas__resize-handle--left"
                onMouseDown={handleResizeStart('left')}
            />
            <div
                className="floating-canvas__resize-handle floating-canvas__resize-handle--top-left"
                onMouseDown={handleResizeStart('top-left')}
            />
            <div
                className="floating-canvas__resize-handle floating-canvas__resize-handle--top-right"
                onMouseDown={handleResizeStart('top-right')}
            />
            <div
                className="floating-canvas__resize-handle floating-canvas__resize-handle--bottom-left"
                onMouseDown={handleResizeStart('bottom-left')}
            />
            <div
                className="floating-canvas__resize-handle floating-canvas__resize-handle--bottom-right"
                onMouseDown={handleResizeStart('bottom-right')}
            />
        </div>
    );
}

export default memo(FloatingCanvasWrapper);
