/**
 * @file CanvasMap.jsx
 * @description Canvas map visualization component for Layout Tab V4.6.
 *
 * Shows a minimap of the canvas grid with ViewGroups and Viewports.
 * Supports zoom, layer toggles, drag-and-drop for layouts, and
 * selection of ViewGroups/Viewports.
 *
 * @example
 * <CanvasMap
 *   canvas={canvas}
 *   viewGroups={viewGroups}
 *   viewports={viewports}
 *   zoom={100}
 *   onSelectViewGroup={handleSelectViewGroup}
 *   onDoubleClickViewGroup={handleDrillIn}
 * />
 */

import React, { memo, useRef, useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms';

/**
 * CanvasMap component
 *
 * @param {Object} props - Component props
 * @param {Object} props.canvas - Canvas configuration with rows, cols, viewGroupPositions
 * @param {Array} props.viewGroups - Array of ViewGroup objects
 * @param {Array} props.viewports - Array of Viewport objects
 * @param {string} [props.selectedViewGroupId] - Currently selected ViewGroup ID
 * @param {string} [props.selectedViewportId] - Currently selected Viewport ID
 * @param {boolean} [props.showViewGroups=true] - Whether to show ViewGroups
 * @param {boolean} [props.showViewports=true] - Whether to show Viewports
 * @param {number} [props.zoom=100] - Zoom level percentage
 * @param {Function} [props.onSelectViewGroup] - ViewGroup selection handler
 * @param {Function} [props.onSelectViewport] - Viewport selection handler
 * @param {Function} [props.onDoubleClickViewGroup] - ViewGroup double-click handler
 * @param {Function} [props.onDropLayout] - Layout drop handler (layoutId, position)
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactElement}
 */
export const CanvasMap = memo(function CanvasMap({
    canvas,
    viewGroups,
    viewports,
    selectedViewGroupId,
    selectedViewportId,
    showViewGroups = true,
    showViewports = true,
    zoom = 100,
    onSelectViewGroup,
    onSelectViewport,
    onDoubleClickViewGroup,
    onDropLayout,
    className = '',
}) {
    const containerRef = useRef(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [dropPosition, setDropPosition] = useState(null);

    // Calculate cell size based on zoom
    const cellSize = Math.max(32, (40 * zoom) / 100);
    const gap = 4;

    // Handle drag over for layout drop
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(true);

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            const col = Math.max(0, Math.min(canvas.cols - 1,
                Math.floor((e.clientX - rect.left) / (cellSize + gap))
            ));
            const row = Math.max(0, Math.min(canvas.rows - 1,
                Math.floor((e.clientY - rect.top) / (cellSize + gap))
            ));
            setDropPosition({ row, col });
        }
    }, [canvas.cols, canvas.rows, cellSize, gap]);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
        setDropPosition(null);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const layoutId = e.dataTransfer.getData('layoutId');
        if (layoutId && dropPosition) {
            onDropLayout?.(layoutId, dropPosition);
        }
        setIsDragOver(false);
        setDropPosition(null);
    }, [dropPosition, onDropLayout]);

    const handleContainerClick = useCallback(() => {
        // Deselect when clicking on empty space
        onSelectViewGroup?.(null);
        onSelectViewport?.(null);
    }, [onSelectViewGroup, onSelectViewport]);

    const gridWidth = canvas.cols * (cellSize + gap) - gap;
    const gridHeight = canvas.rows * (cellSize + gap) - gap;

    return (
        <div
            ref={containerRef}
            className={`canvas-map ${isDragOver ? 'canvas-map--drag-over' : ''} ${className}`}
            style={{
                padding: 12,
                overflow: 'auto',
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleContainerClick}
        >
            <div
                className="canvas-map__grid"
                style={{
                    position: 'relative',
                    width: gridWidth,
                    height: gridHeight,
                    margin: '0 auto',
                    border: isDragOver
                        ? '2px dashed var(--color-accent-green, #22c55e)'
                        : '1px solid var(--color-border-subtle, rgba(255,255,255,0.06))',
                    borderRadius: 6,
                    background: 'var(--color-bg-secondary, #12121a)',
                }}
            >
                {/* Grid lines */}
                <div
                    className="canvas-map__lines"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0.3,
                        borderRadius: 'inherit',
                        overflow: 'hidden',
                        backgroundImage: `
                            linear-gradient(var(--color-border-subtle) 1px, transparent 1px),
                            linear-gradient(90deg, var(--color-border-subtle) 1px, transparent 1px)
                        `,
                        backgroundSize: `${cellSize + gap}px ${cellSize + gap}px`,
                    }}
                />

                {/* Drop position indicator */}
                {isDragOver && dropPosition && (
                    <div
                        className="canvas-map__drop-indicator"
                        style={{
                            position: 'absolute',
                            left: dropPosition.col * (cellSize + gap),
                            top: dropPosition.row * (cellSize + gap),
                            width: cellSize,
                            height: cellSize,
                            background: 'color-mix(in srgb, var(--color-accent-green) 30%, transparent)',
                            border: '2px dashed var(--color-accent-green, #22c55e)',
                            borderRadius: 4,
                            pointerEvents: 'none',
                            zIndex: 20,
                        }}
                    />
                )}

                {/* ViewGroups */}
                {showViewGroups && canvas.viewGroupPositions.map(pos => {
                    const vg = viewGroups.find(g => g.id === pos.viewGroupId);
                    if (!vg) return null;

                    const isSelected = selectedViewGroupId === vg.id;
                    const isEmpty = vg.views.length === 0;

                    return (
                        <div
                            key={pos.viewGroupId}
                            className={`canvas-map__viewgroup ${isSelected ? 'canvas-map__viewgroup--selected' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectViewGroup?.(vg.id);
                            }}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                onDoubleClickViewGroup?.(vg.id);
                            }}
                            style={{
                                position: 'absolute',
                                left: pos.col * (cellSize + gap),
                                top: pos.row * (cellSize + gap),
                                width: pos.colSpan * cellSize + (pos.colSpan - 1) * gap,
                                height: pos.rowSpan * cellSize + (pos.rowSpan - 1) * gap,
                                background: isEmpty
                                    ? `color-mix(in srgb, ${vg.color} 10%, transparent)`
                                    : `color-mix(in srgb, ${vg.color} 20%, transparent)`,
                                border: `2px ${isEmpty ? 'dashed' : 'solid'} ${isSelected ? vg.color : `color-mix(in srgb, ${vg.color} 60%, transparent)`}`,
                                borderRadius: 4,
                                cursor: 'pointer',
                                boxShadow: isSelected ? `0 0 12px color-mix(in srgb, ${vg.color} 50%, transparent)` : 'none',
                                zIndex: isSelected ? 5 : 1,
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                className="canvas-map__viewgroup-label"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    padding: '2px 6px',
                                    borderBottomRightRadius: 4,
                                    background: vg.color,
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#000',
                                    maxWidth: '90%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                {vg.linkedTo && <Icon name="link2" size={10} />}
                                <span>{vg.name}</span>
                            </div>
                        </div>
                    );
                })}

                {/* Viewports */}
                {showViewports && viewports.map(vp => {
                    const isSelected = selectedViewportId === vp.id;

                    return (
                        <div
                            key={vp.id}
                            className={`canvas-map__viewport ${isSelected ? 'canvas-map__viewport--selected' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectViewport?.(vp.id);
                            }}
                            style={{
                                position: 'absolute',
                                left: vp.position.col * (cellSize + gap) - 3,
                                top: vp.position.row * (cellSize + gap) - 3,
                                width: vp.size.cols * (cellSize + gap) - gap + 6,
                                height: vp.size.rows * (cellSize + gap) - gap + 6,
                                border: `2px ${vp.mode === 'snap' ? 'solid' : 'dashed'} var(--color-accent-cyan, #22d3ee)`,
                                borderRadius: 4,
                                background: isSelected
                                    ? 'color-mix(in srgb, var(--color-accent-cyan) 15%, transparent)'
                                    : 'color-mix(in srgb, var(--color-accent-cyan) 5%, transparent)',
                                boxShadow: isSelected ? '0 0 12px color-mix(in srgb, var(--color-accent-cyan) 50%, transparent)' : 'none',
                                cursor: 'pointer',
                                zIndex: 10,
                            }}
                        >
                            <div
                                className="canvas-map__viewport-label"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    padding: '2px 6px',
                                    borderBottomRightRadius: 4,
                                    background: 'var(--color-accent-cyan, #22d3ee)',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#000',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                {vp.isShared && <Icon name="users" size={10} />}
                                <span>{vp.name}</span>
                                {vp.isPrimary && <span>★</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default CanvasMap;
