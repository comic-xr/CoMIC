// src/ui/react/components/molecules/MiniMapCell/MiniMapCell.jsx
// MiniMap Cell molecule - represents a single cell in the canvas navigator minimap
//
// Per Atomic Design spec: Composed of Icon (lock), Text (label)
// Used for: Canvas navigation minimap, layout preview

import React, { memo, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './MiniMapCell.scss';

/**
 * MiniMapCell - A single cell in the canvas minimap
 *
 * @param {Object} props
 * @param {Object} props.cell - Cell data
 * @param {number} props.cell.x - X position
 * @param {number} props.cell.y - Y position
 * @param {number} [props.cell.width=1] - Cell span width
 * @param {number} [props.cell.height=1] - Cell span height
 * @param {Object} [props.cell.view] - View data if cell has content
 * @param {boolean} [props.cell.locked] - Whether cell is locked
 * @param {number} props.cellSize - Size of each cell unit in pixels
 * @param {boolean} [props.selected] - Whether cell is selected
 * @param {boolean} [props.inViewport] - Whether cell is in current viewport
 * @param {boolean} [props.showLabel] - Whether to show view label
 * @param {boolean} [props.draggable] - Whether cell can be dragged
 * @param {function} [props.onClick] - Click handler
 * @param {function} [props.onDragStart] - Drag start handler
 * @param {function} [props.onDragEnd] - Drag end handler
 * @param {string} [props.className] - Additional CSS classes
 */
export const MiniMapCell = memo(function MiniMapCell({
    cell,
    cellSize,
    selected = false,
    inViewport = false,
    showLabel = false,
    draggable = false,
    onClick,
    onDragStart,
    onDragEnd,
    className = '',
}) {
    const { x, y, width = 1, height = 1, view, locked } = cell;

    const handleClick = useCallback((e) => {
        e.stopPropagation();
        onClick?.(cell, e);
    }, [cell, onClick]);

    const handleDragStart = useCallback((e) => {
        if (!draggable) {
            e.preventDefault();
            return;
        }
        onDragStart?.(cell, e);
    }, [cell, draggable, onDragStart]);

    const handleDragEnd = useCallback((e) => {
        onDragEnd?.(cell, e);
    }, [cell, onDragEnd]);

    const isEmpty = !view;
    const hasContent = !!view;

    const classList = [
        'minimap-cell',
        isEmpty && 'minimap-cell--empty',
        hasContent && 'minimap-cell--has-view',
        selected && 'minimap-cell--selected',
        inViewport && 'minimap-cell--in-viewport',
        locked && 'minimap-cell--locked',
        className,
    ].filter(Boolean).join(' ');

    const style = {
        left: x * cellSize,
        top: y * cellSize,
        width: width * cellSize - 1,
        height: height * cellSize - 1,
        '--cell-color': view?.color || 'transparent',
    };

    return (
        <div
            className={classList}
            style={style}
            onClick={handleClick}
            draggable={draggable && hasContent}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            title={view?.name}
        >
            {/* Color fill for views */}
            {hasContent && (
                <div
                    className="minimap-cell__fill"
                    style={{ backgroundColor: view.color }}
                />
            )}

            {/* Lock indicator */}
            {locked && (
                <div className="minimap-cell__lock">
                    <Icon name="lock" size={8} />
                </div>
            )}

            {/* Label (when enabled and has view) */}
            {showLabel && view?.name && (
                <span className="minimap-cell__label">
                    {view.name.slice(0, 2).toUpperCase()}
                </span>
            )}

            {/* Selection indicator */}
            {selected && (
                <div className="minimap-cell__selection" />
            )}
        </div>
    );
});

export default MiniMapCell;
