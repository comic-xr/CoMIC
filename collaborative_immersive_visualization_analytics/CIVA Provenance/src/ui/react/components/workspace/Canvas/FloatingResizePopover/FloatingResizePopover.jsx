// src/ui/react/components/workspace/Canvas/FloatingResizePopover/FloatingResizePopover.jsx
// Glassmorphism-styled popover for resizing selected views
//
// Features:
// - Shows when view is selected in Edit Mode
// - Positioned at top-right of canvas
// - Height/Width +/- controls
// - Remove button
// - VR-compatible (no hover dependency)

import React, { useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './FloatingResizePopover.scss';

/**
 * FloatingResizePopover - Resize controls for selected view
 */
export function FloatingResizePopover({
    placement,
    viewName,
    instanceColor = '#60a5fa',
    maxSpan = 3,
    minSpan = 1,
    onResize,
    onRemove,
    onClose,
    visible = true,
}) {
    if (!visible || !placement) return null;

    const { rowSpan = 1, colSpan = 1 } = placement;

    // Handlers
    const handleIncreaseHeight = useCallback(() => {
        if (rowSpan < maxSpan) {
            onResize?.(placement.id, rowSpan + 1, colSpan);
        }
    }, [placement, rowSpan, colSpan, maxSpan, onResize]);

    const handleDecreaseHeight = useCallback(() => {
        if (rowSpan > minSpan) {
            onResize?.(placement.id, rowSpan - 1, colSpan);
        }
    }, [placement, rowSpan, colSpan, minSpan, onResize]);

    const handleIncreaseWidth = useCallback(() => {
        if (colSpan < maxSpan) {
            onResize?.(placement.id, rowSpan, colSpan + 1);
        }
    }, [placement, rowSpan, colSpan, maxSpan, onResize]);

    const handleDecreaseWidth = useCallback(() => {
        if (colSpan > minSpan) {
            onResize?.(placement.id, rowSpan, colSpan - 1);
        }
    }, [placement, rowSpan, colSpan, minSpan, onResize]);

    const handleRemove = useCallback(() => {
        onRemove?.(placement.id);
    }, [placement, onRemove]);

    return (
        <div
            className="floating-resize-popover"
            style={{ '--instance-color': instanceColor }}
        >
            {/* Header */}
            <div className="floating-resize-popover__header">
                <div className="floating-resize-popover__color-dot" />
                <span className="floating-resize-popover__title">
                    {viewName || 'Selected View'}
                </span>
                <button
                    className="floating-resize-popover__close"
                    onClick={onClose}
                    title="Close"
                >
                    <Icon name="close" size={12} />
                </button>
            </div>

            {/* Size display */}
            <div className="floating-resize-popover__size-display">
                <Icon name="maximize" size={12} />
                <span>{colSpan}×{rowSpan}</span>
            </div>

            {/* Controls */}
            <div className="floating-resize-popover__controls">
                {/* Height controls */}
                <div className="floating-resize-popover__control-group">
                    <span className="floating-resize-popover__control-label">
                        <Icon name="arrowUpDown" size={10} />
                        Height
                    </span>
                    <div className="floating-resize-popover__control-buttons">
                        <button
                            className="floating-resize-popover__btn"
                            onClick={handleDecreaseHeight}
                            disabled={rowSpan <= minSpan}
                            title="Decrease height"
                        >
                            <Icon name="remove" size={12} />
                        </button>
                        <span className="floating-resize-popover__control-value">
                            {rowSpan}
                        </span>
                        <button
                            className="floating-resize-popover__btn"
                            onClick={handleIncreaseHeight}
                            disabled={rowSpan >= maxSpan}
                            title="Increase height"
                        >
                            <Icon name="add" size={12} />
                        </button>
                    </div>
                </div>

                {/* Width controls */}
                <div className="floating-resize-popover__control-group">
                    <span className="floating-resize-popover__control-label">
                        <Icon name="arrowLeftRight" size={10} />
                        Width
                    </span>
                    <div className="floating-resize-popover__control-buttons">
                        <button
                            className="floating-resize-popover__btn"
                            onClick={handleDecreaseWidth}
                            disabled={colSpan <= minSpan}
                            title="Decrease width"
                        >
                            <Icon name="remove" size={12} />
                        </button>
                        <span className="floating-resize-popover__control-value">
                            {colSpan}
                        </span>
                        <button
                            className="floating-resize-popover__btn"
                            onClick={handleIncreaseWidth}
                            disabled={colSpan >= maxSpan}
                            title="Increase width"
                        >
                            <Icon name="add" size={12} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Remove button */}
            <button
                className="floating-resize-popover__remove-btn"
                onClick={handleRemove}
                title="Remove from canvas"
            >
                <Icon name="delete" size={12} />
                Remove
            </button>
        </div>
    );
}

export default FloatingResizePopover;