// src/ui/react/components/workspace/Canvas/CanvasInfoFooter/CanvasInfoFooter.jsx
// Canvas info footer showing canvas size, viewport, cell size, collaborators, and sync status
//
// Based on canvas-chrome-v12.jsx spec
// Height: 24px

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@UI/react/components/atoms';
import './CanvasInfoFooter.scss';

/**
 * CanvasInfoFooter - Info bar at bottom of canvas
 *
 * Shows:
 * - Canvas size (cols x rows) with map button to open navigator
 * - Viewport size
 * - Cell size in pixels
 * - Collaborator count
 * - Sync status indicator
 */
export function CanvasInfoFooter({
    // Canvas info
    canvasSize = { cols: 10, rows: 10 },
    viewportSize = { cols: 3, rows: 3 },
    cellSize = { width: 300, height: 250 },
    minCanvasSize = { cols: 1, rows: 1 },
    maxCanvasSize,

    // Collaborators
    collaboratorCount = 0,

    // Sync status
    syncStatus = 'synced', // 'synced' | 'syncing' | 'disconnected'

    // Callbacks
    onOpenNavigator,
    onCanvasSizeChange,
    onViewportSizeChange,

    className = '',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const popoutRef = useRef(null);
    const triggerRef = useRef(null);

    const safeMaxCanvas = useMemo(() => ({
        cols: Number.isFinite(maxCanvasSize?.cols) ? maxCanvasSize.cols : Number.POSITIVE_INFINITY,
        rows: Number.isFinite(maxCanvasSize?.rows) ? maxCanvasSize.rows : Number.POSITIVE_INFINITY,
    }), [maxCanvasSize]);

    const clamp = useCallback((value, min, max) => {
        if (Number.isNaN(value)) return min;
        return Math.min(max, Math.max(min, value));
    }, []);

    const handleCanvasChange = useCallback((next) => {
        if (!onCanvasSizeChange) return;
        const clamped = {
            cols: clamp(next.cols, minCanvasSize.cols, safeMaxCanvas.cols),
            rows: clamp(next.rows, minCanvasSize.rows, safeMaxCanvas.rows),
        };
        onCanvasSizeChange(clamped);

        if (onViewportSizeChange) {
            const clampedViewport = {
                cols: Math.min(viewportSize.cols, clamped.cols),
                rows: Math.min(viewportSize.rows, clamped.rows),
            };
            if (clampedViewport.cols !== viewportSize.cols || clampedViewport.rows !== viewportSize.rows) {
                onViewportSizeChange(clampedViewport);
            }
        }
    }, [onCanvasSizeChange, onViewportSizeChange, clamp, minCanvasSize, safeMaxCanvas, viewportSize]);

    const handleViewportChange = useCallback((next) => {
        if (!onViewportSizeChange) return;
        const clamped = {
            cols: clamp(next.cols, 1, canvasSize.cols),
            rows: clamp(next.rows, 1, canvasSize.rows),
        };
        onViewportSizeChange(clamped);
    }, [onViewportSizeChange, clamp, canvasSize]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleClick = (event) => {
            const target = event.target;
            if (popoutRef.current?.contains(target)) return;
            if (triggerRef.current?.contains(target)) return;
            setIsOpen(false);
        };

        const handleKey = (event) => {
            if (event.key === 'Escape') setIsOpen(false);
        };

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [isOpen]);

    const canvasPresets = [
        { cols: 1, rows: 1 },
        { cols: 2, rows: 2 },
        { cols: 3, rows: 3 },
        { cols: 4, rows: 4 },
    ];

    const viewportPresets = [
        { cols: 1, rows: 1 },
        { cols: 1, rows: 2 },
        { cols: 2, rows: 1 },
        { cols: 2, rows: 2 },
    ];

    return (
        <div ref={containerRef} className={`canvas-info-footer ${className}`}>
            {/* Left section - Canvas info */}
            <div className="canvas-info-footer__section canvas-info-footer__section--left">
                <button
                    ref={triggerRef}
                    type="button"
                    className="canvas-info-footer__size-trigger"
                    onClick={() => setIsOpen((prev) => !prev)}
                    aria-expanded={isOpen}
                    aria-haspopup="dialog"
                >
                    <span className="canvas-info-footer__item canvas-info-footer__item--canvas">
                        <Icon name="grid3x3" size={10} />
                        Canvas: {canvasSize.cols}×{canvasSize.rows}
                    </span>
                    <span className="canvas-info-footer__item canvas-info-footer__item--viewport">
                        <Icon name="focus" size={10} />
                        Viewport: {viewportSize.cols}×{viewportSize.rows}
                    </span>
                    <span className="canvas-info-footer__item">
                        <Icon name="square" size={10} />
                        Cell: {Math.round(cellSize.width)}×{Math.round(cellSize.height)}px
                    </span>
                </button>
                {onOpenNavigator && (
                    <button
                        type="button"
                        className="canvas-info-footer__nav-btn"
                        onClick={onOpenNavigator}
                        title="Open Canvas Navigator"
                    >
                        <Icon name="map" size={10} />
                    </button>
                )}
            </div>

            {/* Right section - Status */}
            <div className="canvas-info-footer__section canvas-info-footer__section--right">
                {/* Collaborator count */}
                {collaboratorCount > 0 && (
                    <span className="canvas-info-footer__item canvas-info-footer__item--collab">
                        <Icon name="users" size={10} />
                        {collaboratorCount}
                    </span>
                )}

                {/* Sync status */}
                <span className={`canvas-info-footer__sync canvas-info-footer__sync--${syncStatus}`}>
                    <span className="canvas-info-footer__sync-dot" />
                    {syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Disconnected'}
                </span>
            </div>

            {isOpen && (
                <div ref={popoutRef} className="canvas-info-footer__popout" role="dialog" aria-label="Canvas size controls">
                    <div className="canvas-info-footer__popout-section">
                        <div className="canvas-info-footer__popout-title">Canvas Size</div>
                        <div className="canvas-info-footer__popout-row">
                            <span className="canvas-info-footer__popout-label">Columns</span>
                            <div className="canvas-info-footer__stepper">
                                <button
                                    type="button"
                                    onClick={() => handleCanvasChange({ cols: canvasSize.cols - 1, rows: canvasSize.rows })}
                                    disabled={!onCanvasSizeChange || canvasSize.cols <= minCanvasSize.cols}
                                >
                                    <Icon name="remove" size={12} />
                                </button>
                                <span>{canvasSize.cols}</span>
                                <button
                                    type="button"
                                    onClick={() => handleCanvasChange({ cols: canvasSize.cols + 1, rows: canvasSize.rows })}
                                    disabled={!onCanvasSizeChange || canvasSize.cols >= safeMaxCanvas.cols}
                                >
                                    <Icon name="add" size={12} />
                                </button>
                            </div>
                        </div>
                        <div className="canvas-info-footer__popout-row">
                            <span className="canvas-info-footer__popout-label">Rows</span>
                            <div className="canvas-info-footer__stepper">
                                <button
                                    type="button"
                                    onClick={() => handleCanvasChange({ cols: canvasSize.cols, rows: canvasSize.rows - 1 })}
                                    disabled={!onCanvasSizeChange || canvasSize.rows <= minCanvasSize.rows}
                                >
                                    <Icon name="remove" size={12} />
                                </button>
                                <span>{canvasSize.rows}</span>
                                <button
                                    type="button"
                                    onClick={() => handleCanvasChange({ cols: canvasSize.cols, rows: canvasSize.rows + 1 })}
                                    disabled={!onCanvasSizeChange || canvasSize.rows >= safeMaxCanvas.rows}
                                >
                                    <Icon name="add" size={12} />
                                </button>
                            </div>
                        </div>
                        <div className="canvas-info-footer__preset-row">
                            {canvasPresets.map((preset) => (
                                <button
                                    key={`${preset.cols}x${preset.rows}`}
                                    type="button"
                                    className="canvas-info-footer__preset"
                                    onClick={() => handleCanvasChange(preset)}
                                    disabled={!onCanvasSizeChange}
                                >
                                    {preset.cols}×{preset.rows}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="canvas-info-footer__popout-section">
                        <div className="canvas-info-footer__popout-title">Viewport Size</div>
                        <div className="canvas-info-footer__popout-row">
                            <span className="canvas-info-footer__popout-label">Columns</span>
                            <div className="canvas-info-footer__stepper">
                                <button
                                    type="button"
                                    onClick={() => handleViewportChange({ cols: viewportSize.cols - 1, rows: viewportSize.rows })}
                                    disabled={!onViewportSizeChange || viewportSize.cols <= 1}
                                >
                                    <Icon name="remove" size={12} />
                                </button>
                                <span>{viewportSize.cols}</span>
                                <button
                                    type="button"
                                    onClick={() => handleViewportChange({ cols: viewportSize.cols + 1, rows: viewportSize.rows })}
                                    disabled={!onViewportSizeChange || viewportSize.cols >= canvasSize.cols}
                                >
                                    <Icon name="add" size={12} />
                                </button>
                            </div>
                        </div>
                        <div className="canvas-info-footer__popout-row">
                            <span className="canvas-info-footer__popout-label">Rows</span>
                            <div className="canvas-info-footer__stepper">
                                <button
                                    type="button"
                                    onClick={() => handleViewportChange({ cols: viewportSize.cols, rows: viewportSize.rows - 1 })}
                                    disabled={!onViewportSizeChange || viewportSize.rows <= 1}
                                >
                                    <Icon name="remove" size={12} />
                                </button>
                                <span>{viewportSize.rows}</span>
                                <button
                                    type="button"
                                    onClick={() => handleViewportChange({ cols: viewportSize.cols, rows: viewportSize.rows + 1 })}
                                    disabled={!onViewportSizeChange || viewportSize.rows >= canvasSize.rows}
                                >
                                    <Icon name="add" size={12} />
                                </button>
                            </div>
                        </div>
                        <div className="canvas-info-footer__preset-row">
                            {viewportPresets.map((preset) => {
                                const disabled = preset.cols > canvasSize.cols || preset.rows > canvasSize.rows;
                                return (
                                    <button
                                        key={`${preset.cols}x${preset.rows}`}
                                        type="button"
                                        className="canvas-info-footer__preset"
                                        onClick={() => handleViewportChange(preset)}
                                        disabled={!onViewportSizeChange || disabled}
                                    >
                                        {preset.cols}×{preset.rows}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(CanvasInfoFooter);
