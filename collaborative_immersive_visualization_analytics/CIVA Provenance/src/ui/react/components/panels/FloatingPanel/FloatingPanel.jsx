// src/ui/react/components/panels/FloatingPanel/FloatingPanel.jsx
// Draggable, resizable floating panel component
// Can be used for popped-out panels on desktop or positioned in 3D space for VR

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@UI/react/components/atoms/Icon';
import { PanelHeader } from '@UI/react/components/molecules/PanelHeader';
import { useFloatingPanels, FLOATING_PANEL_DEFAULTS } from './FloatingPanelContext';
import './FloatingPanel.scss';

// =============================================================================
// SNAP-TO-CORNER CONSTANTS
// =============================================================================

const SNAP_THRESHOLD = 20; // px from edge to trigger snap
const EDGE_PADDING = 8;    // px from viewport edge when snapped

/**
 * Calculate snap position based on proximity to viewport edges
 * @param {number} x - Current x position
 * @param {number} y - Current y position
 * @param {number} width - Panel width
 * @param {number} height - Panel height
 * @returns {{ x: number, y: number, snapped: string|null }}
 */
function calculateSnapPosition(x, y, width, height) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let snappedX = x;
    let snappedY = y;
    let snapEdge = null;

    // Check left edge
    if (x < SNAP_THRESHOLD) {
        snappedX = EDGE_PADDING;
        snapEdge = 'left';
    }
    // Check right edge
    else if (x + width > vw - SNAP_THRESHOLD) {
        snappedX = vw - width - EDGE_PADDING;
        snapEdge = snapEdge ? `${snapEdge}-right` : 'right';
    }

    // Check top edge
    if (y < SNAP_THRESHOLD) {
        snappedY = EDGE_PADDING;
        snapEdge = snapEdge ? `${snapEdge}-top` : 'top';
    }
    // Check bottom edge
    else if (y + height > vh - SNAP_THRESHOLD) {
        snappedY = vh - height - EDGE_PADDING;
        snapEdge = snapEdge ? `${snapEdge}-bottom` : 'bottom';
    }

    return { x: snappedX, y: snappedY, snapped: snapEdge };
}

// =============================================================================
// FLOATING PANEL COMPONENT
// =============================================================================

/**
 * FloatingPanel - A draggable, resizable panel that floats above the main UI
 *
 * @param {string} panelId - Unique identifier for this panel
 * @param {string} title - Panel title shown in header
 * @param {React.Element} icon - Icon component to show in header
 * @param {string} color - Accent color (blue, purple, teal, etc.)
 * @param {React.ReactNode} children - Panel content
 * @param {Function} onDock - Callback when user clicks dock button
 */
export function FloatingPanel({
    panelId,
    title,
    icon: iconName,
    color = 'blue',
    children,
    onDock,
}) {
    const {
        getPanelState,
        updatePanelPosition,
        updatePanelSize,
        bringToFront,
        dockPanel,
    } = useFloatingPanels();

    const panelState = getPanelState(panelId);
    const panelRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [snappedEdge, setSnappedEdge] = useState(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ width: 0, height: 0, x: 0, y: 0 });

    // Don't render if not popped out
    if (!panelState) return null;

    const { x, y, width, height, zIndex } = panelState;

    // Handle drag start
    const handleDragStart = useCallback((e) => {
        if (e.target.closest('.floating-panel__controls')) return;
        e.preventDefault();
        setIsDragging(true);
        bringToFront(panelId);
        dragOffset.current = {
            x: e.clientX - x,
            y: e.clientY - y,
        };
    }, [x, y, panelId, bringToFront]);

    // Handle drag move with snap-to-corner
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            // Calculate raw position
            const rawX = e.clientX - dragOffset.current.x;
            const rawY = e.clientY - dragOffset.current.y;

            // Apply snap-to-corner logic
            const { x: snappedX, y: snappedY, snapped } = calculateSnapPosition(
                rawX,
                rawY,
                width,
                height
            );

            // Update snap state for visual feedback
            setSnappedEdge(snapped);

            // Clamp to viewport bounds
            const finalX = Math.max(0, Math.min(window.innerWidth - 100, snappedX));
            const finalY = Math.max(0, Math.min(window.innerHeight - 50, snappedY));

            updatePanelPosition(panelId, finalX, finalY);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            // Keep snapped state after release for visual indication
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, panelId, updatePanelPosition, width, height]);

    // Handle resize start
    const handleResizeStart = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        bringToFront(panelId);
        resizeStart.current = {
            width,
            height,
            x: e.clientX,
            y: e.clientY,
        };
    }, [width, height, panelId, bringToFront]);

    // Handle resize move
    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e) => {
            const deltaX = e.clientX - resizeStart.current.x;
            const deltaY = e.clientY - resizeStart.current.y;
            const newWidth = resizeStart.current.width + deltaX;
            const newHeight = resizeStart.current.height + deltaY;
            updatePanelSize(panelId, newWidth, newHeight);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, panelId, updatePanelSize]);

    // Handle panel focus on click
    const handlePanelClick = useCallback(() => {
        bringToFront(panelId);
    }, [panelId, bringToFront]);

    // Handle dock button
    const handleDock = useCallback(() => {
        if (onDock) {
            onDock();
        }
        dockPanel(panelId);
    }, [panelId, dockPanel, onDock]);

    const panelStyle = {
        left: `${x}px`,
        top: `${y}px`,
        width: minimized ? '280px' : `${width}px`,
        height: minimized ? 'auto' : `${height}px`,
        zIndex,
    };

    return createPortal(
        <div
            ref={panelRef}
            className={`floating-panel ${isDragging ? 'floating-panel--dragging' : ''} ${isResizing ? 'floating-panel--resizing' : ''} ${minimized ? 'floating-panel--minimized' : ''} ${snappedEdge ? 'floating-panel--snapped' : ''}`}
            style={panelStyle}
            onClick={handlePanelClick}
            data-color={color}
            data-snapped={snappedEdge || undefined}
        >
            {/* Header - draggable area */}
            <PanelHeader
                title={title}
                icon={iconName}
                color={color}
                showDragHandle={true}
                minimized={minimized}
                onMinimize={() => setMinimized(!minimized)}
                onDock={handleDock}
                onClose={handleDock}
                onMouseDown={handleDragStart}
            />

            {/* Content */}
            {!minimized && (
                <div className="floating-panel__content">
                    {children}
                </div>
            )}

            {/* Resize handle */}
            {!minimized && (
                <div
                    className="floating-panel__resize-handle"
                    onMouseDown={handleResizeStart}
                />
            )}
        </div>,
        document.body
    );
}

// =============================================================================
// FLOATING PANEL PORTAL - Renders all active floating panels
// =============================================================================

/**
 * FloatingPanelPortal - Renders all currently floating panels
 * Place this near the root of your app
 */
export function FloatingPanelPortal() {
    const { floatingPanels } = useFloatingPanels();

    // This component just provides the portal target
    // Individual panels render themselves via createPortal
    return null;
}

export default FloatingPanel;