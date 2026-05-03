/**
 * @file VRMinimapCell.jsx
 * @description Individual cell component for VR minimap.
 */

import React, { memo, useRef } from 'react';
import { useVRNavigator } from './VRNavigatorContext';
import './VRCanvasNavigator.scss';

/**
 * VRMinimapCell - Individual cell in the VR minimap
 */
export const VRMinimapCell = memo(function VRMinimapCell({
    row,
    col,
    cell,
    color,
    label,
    isInViewport,
    isHome,
    collaborators,
}) {
    const {
        handleCellTap,
        handleCellPressStart,
        handleCellPressEnd,
        getCellState,
        setHoveredCell,
    } = useVRNavigator();

    const cellRef = useRef(null);

    const state = getCellState(row, col);
    const isEmpty = !cell;

    // Handle pointer down (start long-press timer)
    const handlePointerDown = () => {
        const rect = cellRef.current?.getBoundingClientRect();
        if (rect) {
            handleCellPressStart(row, col, {
                x: rect.left + rect.width / 2,
                y: rect.top - 150,
            });
        }
    };

    // Handle pointer up
    const handlePointerUp = () => {
        handleCellPressEnd();
        handleCellTap(row, col);
    };

    // Handle pointer leave (cancel long-press)
    const handlePointerLeave = () => {
        handleCellPressEnd();
        setHoveredCell(null);
    };

    // Build class names
    const classNames = ['vr-minimap-cell'];
    if (isEmpty) classNames.push('vr-minimap-cell--empty');
    if (state.isSource) classNames.push('vr-minimap-cell--source');
    if (state.isSelected) classNames.push('vr-minimap-cell--selected');
    if (state.isValidTarget) classNames.push('vr-minimap-cell--valid-target');
    if (state.isValidTarget && state.isHovered) {
        classNames.push('vr-minimap-cell--target-hover');
    }
    if (isInViewport) classNames.push('vr-minimap-cell--in-viewport');

    const colSpan = cell?.colSpan || 1;
    const rowSpan = cell?.rowSpan || 1;

    return (
        <div
            ref={cellRef}
            className={classNames.join(' ')}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerEnter={() => setHoveredCell({ row, col })}
            onPointerLeave={handlePointerLeave}
            style={{
                '--cell-color': color || '#60a5fa',
                gridColumn: colSpan > 1 ? `span ${colSpan}` : 'span 1',
                gridRow: rowSpan > 1 ? `span ${rowSpan}` : 'span 1',
            }}
        >
            {/* Color indicator */}
            {!isEmpty && color && (
                <div
                    className="vr-minimap-cell__color"
                    style={{ background: color }}
                />
            )}

            {/* Label */}
            {label && (
                <span className="vr-minimap-cell__label">{label}</span>
            )}

            {/* Home indicator */}
            {isHome && (
                <div className="vr-minimap-cell__home">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                    </svg>
                </div>
            )}

            {/* Collaborator indicators */}
            {collaborators?.length > 0 && (
                <div className="vr-minimap-cell__collaborators">
                    {collaborators.slice(0, 3).map((c, i) => (
                        <div
                            key={i}
                            className="vr-minimap-cell__collab-dot"
                            style={{ background: c.color || '#a78bfa' }}
                            title={c.name}
                        />
                    ))}
                    {collaborators.length > 3 && (
                        <span className="vr-minimap-cell__collab-more">
                            +{collaborators.length - 3}
                        </span>
                    )}
                </div>
            )}

            {/* Move source indicator */}
            {state.isSource && (
                <div className="vr-minimap-cell__moving-badge">MOVING</div>
            )}
        </div>
    );
});

export default VRMinimapCell;
