// src/ui/react/components/panels/LayoutPanel/FloatingCanvasNavigator.jsx
// Floating Canvas Navigator - Draggable & Resizable wrapper for CanvasNavigator
//
// FIXED: Drag handling now uses onMouseDown on the container and checks target,
// instead of an overlay that blocks button clicks.

import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import { useLayoutPanelContext, DOCK_POSITIONS } from './LayoutPanelContext';
import { CanvasNavigator } from './components/CanvasNavigator/CanvasNavigator';
import './FloatingCanvasNavigator.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const FLOAT_POSITION_KEY = 'cia-navigator-float-position';
const FLOAT_SIZE_KEY = 'cia-navigator-float-size';

const DEFAULT_SIZE = { width: 520, height: 380 };
const MIN_SIZE = { width: 450, height: 340 };
const MAX_SIZE = { width: 900, height: 700 };

// Corner positions
const CORNER_STYLES = {
    [DOCK_POSITIONS.TOP_LEFT]: { top: 70, left: 16 },
    [DOCK_POSITIONS.TOP_RIGHT]: { top: 70, right: 16 },
    [DOCK_POSITIONS.BOTTOM_LEFT]: { bottom: 70, left: 16 },
    [DOCK_POSITIONS.BOTTOM_RIGHT]: { bottom: 70, right: 16 },
};

// =============================================================================
// HELPERS
// =============================================================================

function loadFloatPosition() {
    try {
        const stored = localStorage.getItem(FLOAT_POSITION_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                return {
                    x: Math.max(0, Math.min(window.innerWidth - MIN_SIZE.width, parsed.x)),
                    y: Math.max(60, Math.min(window.innerHeight - MIN_SIZE.height, parsed.y)),
                };
            }
        }
    } catch (e) {
        console.warn('[FloatingCanvasNavigator] Failed to load position:', e);
    }
    return { x: 100, y: 100 };
}

function loadFloatSize() {
    try {
        const stored = localStorage.getItem(FLOAT_SIZE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
                return {
                    width: Math.max(MIN_SIZE.width, Math.min(MAX_SIZE.width, parsed.width)),
                    height: Math.max(MIN_SIZE.height, Math.min(MAX_SIZE.height, parsed.height)),
                };
            }
        }
    } catch (e) {
        console.warn('[FloatingCanvasNavigator] Failed to load size:', e);
    }
    return { ...DEFAULT_SIZE };
}

// =============================================================================
// COMPONENT
// =============================================================================

export const FloatingCanvasNavigator = memo(function FloatingCanvasNavigator({
    className = '',
}) {
    const context = useLayoutPanelContext();
    const containerRef = useRef(null);

    // Position & size state
    const [floatPosition, setFloatPosition] = useState(loadFloatPosition);
    const [floatSize, setFloatSize] = useState(loadFloatSize);

    // Drag state
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef(null);

    // Resize state
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDirection, setResizeDirection] = useState(null);
    const resizeStartRef = useRef(null);

    // Extract dock position
    const logic = context?.logic;
    const dockPosition = context?.dockPosition || logic?.dockPosition || DOCK_POSITIONS.FLOAT;
    const setDockPosition = context?.setDockPosition || logic?.setDockPosition || (() => { });

    // ==========================================================================
    // PERSISTENCE
    // ==========================================================================

    useEffect(() => {
        if (dockPosition === DOCK_POSITIONS.FLOAT && !isDragging) {
            try {
                localStorage.setItem(FLOAT_POSITION_KEY, JSON.stringify(floatPosition));
            } catch (e) { }
        }
    }, [floatPosition, dockPosition, isDragging]);

    useEffect(() => {
        if (dockPosition === DOCK_POSITIONS.FLOAT && !isResizing) {
            try {
                localStorage.setItem(FLOAT_SIZE_KEY, JSON.stringify(floatSize));
            } catch (e) { }
        }
    }, [floatSize, dockPosition, isResizing]);

    // ==========================================================================
    // DRAG HANDLERS - Fixed to not block buttons
    // ==========================================================================

    const handleMouseDown = useCallback((e) => {
        // Only allow dragging in float mode
        if (dockPosition !== DOCK_POSITIONS.FLOAT) return;

        // Don't drag if clicking on interactive elements
        if (e.target.closest('button, input, select, [role="button"]')) {
            return;
        }

        // Only drag from header area (check if click is in top ~45px of container)
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const clickY = e.clientY - rect.top;
        if (clickY > 35) return; // Only drag from header region (header is ~30px tall now)

        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            posX: floatPosition.x,
            posY: floatPosition.y,
        };

        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    }, [dockPosition, floatPosition]);

    const handleDragMove = useCallback((e) => {
        if (!isDragging || !dragStartRef.current) return;

        const dx = e.clientX - dragStartRef.current.mouseX;
        const dy = e.clientY - dragStartRef.current.mouseY;

        setFloatPosition({
            x: Math.max(0, Math.min(window.innerWidth - floatSize.width, dragStartRef.current.posX + dx)),
            y: Math.max(60, Math.min(window.innerHeight - floatSize.height, dragStartRef.current.posY + dy)),
        });
    }, [isDragging, floatSize]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        dragStartRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    // ==========================================================================
    // RESIZE HANDLERS
    // ==========================================================================

    const handleResizeStart = useCallback((direction, e) => {
        if (dockPosition !== DOCK_POSITIONS.FLOAT) return;

        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        setResizeDirection(direction);
        resizeStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            width: floatSize.width,
            height: floatSize.height,
            posX: floatPosition.x,
            posY: floatPosition.y,
        };

        document.body.style.userSelect = 'none';
    }, [dockPosition, floatSize, floatPosition]);

    const handleResizeMove = useCallback((e) => {
        if (!isResizing || !resizeStartRef.current) return;

        const dx = e.clientX - resizeStartRef.current.mouseX;
        const dy = e.clientY - resizeStartRef.current.mouseY;
        const dir = resizeDirection;

        let newWidth = resizeStartRef.current.width;
        let newHeight = resizeStartRef.current.height;
        let newX = resizeStartRef.current.posX;
        let newY = resizeStartRef.current.posY;

        // Horizontal
        if (dir.includes('e')) {
            newWidth = Math.min(MAX_SIZE.width, Math.max(MIN_SIZE.width, resizeStartRef.current.width + dx));
        }
        if (dir.includes('w')) {
            const maxDelta = resizeStartRef.current.width - MIN_SIZE.width;
            const widthDelta = Math.min(maxDelta, dx);
            newWidth = Math.max(MIN_SIZE.width, resizeStartRef.current.width - widthDelta);
            newX = resizeStartRef.current.posX + (resizeStartRef.current.width - newWidth);
        }

        // Vertical
        if (dir.includes('s')) {
            newHeight = Math.min(MAX_SIZE.height, Math.max(MIN_SIZE.height, resizeStartRef.current.height + dy));
        }
        if (dir.includes('n')) {
            const maxDelta = resizeStartRef.current.height - MIN_SIZE.height;
            const heightDelta = Math.min(maxDelta, dy);
            newHeight = Math.max(MIN_SIZE.height, resizeStartRef.current.height - heightDelta);
            newY = resizeStartRef.current.posY + (resizeStartRef.current.height - newHeight);
        }

        setFloatSize({ width: newWidth, height: newHeight });
        setFloatPosition({ x: newX, y: newY });
    }, [isResizing, resizeDirection]);

    const handleResizeEnd = useCallback(() => {
        setIsResizing(false);
        setResizeDirection(null);
        resizeStartRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    // ==========================================================================
    // GLOBAL EVENT LISTENERS
    // ==========================================================================

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            return () => {
                window.removeEventListener('mousemove', handleDragMove);
                window.removeEventListener('mouseup', handleDragEnd);
            };
        }
    }, [isDragging, handleDragMove, handleDragEnd]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleResizeMove);
            window.addEventListener('mouseup', handleResizeEnd);
            return () => {
                window.removeEventListener('mousemove', handleResizeMove);
                window.removeEventListener('mouseup', handleResizeEnd);
            };
        }
    }, [isResizing, handleResizeMove, handleResizeEnd]);

    // Listen for keyboard shortcut toggle event (Ctrl+M)
    useEffect(() => {
        const handleToggle = () => {
            if (dockPosition === DOCK_POSITIONS.FLOAT || Object.keys(CORNER_STYLES).includes(dockPosition)) {
                // Currently visible, minimize it
                setDockPosition(DOCK_POSITIONS.MINIMIZED);
            } else {
                // Currently hidden, show as float
                setDockPosition(DOCK_POSITIONS.FLOAT);
            }
        };

        window.addEventListener('cia:toggle-canvas-navigator', handleToggle);
        return () => {
            window.removeEventListener('cia:toggle-canvas-navigator', handleToggle);
        };
    }, [dockPosition, setDockPosition]);

    // ==========================================================================
    // RENDER CONDITIONS
    // ==========================================================================

    // Don't render if docked in left panel
    if (dockPosition === DOCK_POSITIONS.LEFT_PANEL) {
        return null;
    }

    // Don't render if minimized - user can access from left panel
    if (dockPosition === DOCK_POSITIONS.MINIMIZED) {
        return null;
    }

    // ==========================================================================
    // POSITION STYLE
    // ==========================================================================

    const isCorner = Object.keys(CORNER_STYLES).includes(dockPosition);
    const isFloat = dockPosition === DOCK_POSITIONS.FLOAT;

    const positionStyle = isCorner
        ? { position: 'fixed', ...CORNER_STYLES[dockPosition], width: floatSize.width, height: floatSize.height }
        : isFloat
            ? { position: 'fixed', left: floatPosition.x, top: floatPosition.y, width: floatSize.width, height: floatSize.height }
            : {};

    // ==========================================================================
    // RENDER
    // ==========================================================================

    return (
        <div
            ref={containerRef}
            className={`floating-canvas-navigator ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''} ${className}`}
            onMouseDown={handleMouseDown}
            style={{
                ...positionStyle,
                zIndex: 1000,
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                cursor: isFloat ? 'default' : 'default',
            }}
        >
            {/* Navigator Content */}
            <CanvasNavigator isDockedInPanel={false} />

            {/* Resize Handles (only in float mode) */}
            {isFloat && (
                <>
                    {/* Edges */}
                    <div
                        className="resize-handle resize-n"
                        onMouseDown={(e) => handleResizeStart('n', e)}
                        style={{ position: 'absolute', top: 0, left: 12, right: 12, height: 6, cursor: 'ns-resize' }}
                    />
                    <div
                        className="resize-handle resize-s"
                        onMouseDown={(e) => handleResizeStart('s', e)}
                        style={{ position: 'absolute', bottom: 0, left: 12, right: 12, height: 6, cursor: 'ns-resize' }}
                    />
                    <div
                        className="resize-handle resize-w"
                        onMouseDown={(e) => handleResizeStart('w', e)}
                        style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 6, cursor: 'ew-resize' }}
                    />
                    <div
                        className="resize-handle resize-e"
                        onMouseDown={(e) => handleResizeStart('e', e)}
                        style={{ position: 'absolute', right: 0, top: 12, bottom: 12, width: 6, cursor: 'ew-resize' }}
                    />

                    {/* Corners */}
                    <div
                        className="resize-handle resize-nw"
                        onMouseDown={(e) => handleResizeStart('nw', e)}
                        style={{ position: 'absolute', top: 0, left: 0, width: 14, height: 14, cursor: 'nwse-resize' }}
                    />
                    <div
                        className="resize-handle resize-ne"
                        onMouseDown={(e) => handleResizeStart('ne', e)}
                        style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, cursor: 'nesw-resize' }}
                    />
                    <div
                        className="resize-handle resize-sw"
                        onMouseDown={(e) => handleResizeStart('sw', e)}
                        style={{ position: 'absolute', bottom: 0, left: 0, width: 14, height: 14, cursor: 'nesw-resize' }}
                    />
                    <div
                        className="resize-handle resize-se"
                        onMouseDown={(e) => handleResizeStart('se', e)}
                        style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, cursor: 'nwse-resize' }}
                    />
                </>
            )}
        </div>
    );
});

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook for controlling navigator from outside (e.g., buttons in footer)
 */
export function useNavigatorButton() {
    const context = useLayoutPanelContext();
    const logic = context?.logic;
    const dockPosition = context?.dockPosition || logic?.dockPosition || DOCK_POSITIONS.FLOAT;
    const setDockPosition = context?.setDockPosition || logic?.setDockPosition || (() => { });

    const isMinimized = dockPosition === DOCK_POSITIONS.MINIMIZED;
    const isDocked = dockPosition === DOCK_POSITIONS.LEFT_PANEL;
    const isFloating = !isMinimized && !isDocked;

    const openNavigator = useCallback(() => {
        setDockPosition(DOCK_POSITIONS.FLOAT);
    }, [setDockPosition]);

    const minimizeNavigator = useCallback(() => {
        setDockPosition(DOCK_POSITIONS.MINIMIZED);
    }, [setDockPosition]);

    const toggleNavigator = useCallback(() => {
        if (isMinimized || isDocked) {
            setDockPosition(DOCK_POSITIONS.FLOAT);
        } else {
            setDockPosition(DOCK_POSITIONS.MINIMIZED);
        }
    }, [isMinimized, isDocked, setDockPosition]);

    return {
        isMinimized,
        isDocked,
        isFloating,
        openNavigator,
        minimizeNavigator,
        toggleNavigator,
        dockPosition,
        setDockPosition,
    };
}

export default FloatingCanvasNavigator;