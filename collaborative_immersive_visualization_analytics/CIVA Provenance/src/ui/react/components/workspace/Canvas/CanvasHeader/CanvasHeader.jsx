// src/ui/react/components/workspace/Canvas/CanvasHeader/CanvasHeader.jsx
// Canvas navigation header with breadcrumb, viewport controls, and grid size
//
// Replaces the navigation portion of SecondaryHeader
// Part of the new canvas-centric chrome architecture

import React, { memo, useCallback } from 'react';
import { IconButton, ButtonGroup, Icon } from '@UI/react/components/atoms';
import { useViewStack, VIEW_TYPES } from '@UI/react/hooks/useViewStack.js';
import './CanvasHeader.scss';

// =============================================================================
// GRID SIZE OPTIONS (per memory log: 1×2 through 10×10)
// =============================================================================

const GRID_SIZE_OPTIONS = [
    { value: '1x2', label: '1×2', rows: 1, cols: 2 },
    { value: '2x2', label: '2×2', rows: 2, cols: 2 },
    { value: '2x3', label: '2×3', rows: 2, cols: 3 },
    { value: '3x3', label: '3×3', rows: 3, cols: 3 },
    { value: '3x4', label: '3×4', rows: 3, cols: 4 },
    { value: '4x4', label: '4×4', rows: 4, cols: 4 },
    { value: '5x5', label: '5×5', rows: 5, cols: 5 },
    { value: '10x10', label: '10×10', rows: 10, cols: 10 },
];

// =============================================================================
// ZOOM PRESETS (per memory log: 50-200%)
// =============================================================================

const ZOOM_PRESETS = [
    { value: 50, label: '50%' },
    { value: 75, label: '75%' },
    { value: 100, label: '100%' },
    { value: 125, label: '125%' },
    { value: 150, label: '150%' },
    { value: 200, label: '200%' },
];

// =============================================================================
// BREADCRUMB COMPONENT
// =============================================================================

const Breadcrumb = memo(function Breadcrumb({ items, onNavigate }) {
    return (
        <div className="canvas-header__breadcrumb">
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    {index > 0 && (
                        <Icon
                            name="chevronRight"
                            size={12}
                            className="canvas-header__breadcrumb-separator"
                        />
                    )}
                    <button
                        type="button"
                        className={`canvas-header__breadcrumb-item ${item.isActive ? 'canvas-header__breadcrumb-item--active' : ''}`}
                        onClick={() => onNavigate(item.index)}
                        disabled={item.isActive}
                    >
                        {item.type === VIEW_TYPES.GRID && (
                            <Icon name="home" size={12} className="canvas-header__breadcrumb-icon" />
                        )}
                        <span className="canvas-header__breadcrumb-label">{item.label}</span>
                    </button>
                </React.Fragment>
            ))}
        </div>
    );
});

// =============================================================================
// VIEWPORT NAVIGATION
// =============================================================================

const ViewportNavigation = memo(function ViewportNavigation({
    viewport,
    onNavigate,
    disabled,
}) {
    const handleMove = useCallback((direction) => {
        if (disabled) return;
        const delta = {
            up: { row: -1, col: 0 },
            down: { row: 1, col: 0 },
            left: { row: 0, col: -1 },
            right: { row: 0, col: 1 },
        }[direction];
        onNavigate?.(delta.row, delta.col);
    }, [onNavigate, disabled]);

    return (
        <div className="canvas-header__viewport-nav">
            <ButtonGroup gap="xs">
                <IconButton
                    icon="chevronLeft"
                    label="Move left"
                    size="xs"
                    onClick={() => handleMove('left')}
                    disabled={disabled || viewport.col <= 0}
                />
                <IconButton
                    icon="chevronUp"
                    label="Move up"
                    size="xs"
                    onClick={() => handleMove('up')}
                    disabled={disabled || viewport.row <= 0}
                />
            </ButtonGroup>

            <div className="canvas-header__viewport-position">
                <span className="canvas-header__viewport-coord">
                    {viewport.col},{viewport.row}
                </span>
            </div>

            <ButtonGroup gap="xs">
                <IconButton
                    icon="chevronDown"
                    label="Move down"
                    size="xs"
                    onClick={() => handleMove('down')}
                    disabled={disabled}
                />
                <IconButton
                    icon="chevronRight"
                    label="Move right"
                    size="xs"
                    onClick={() => handleMove('right')}
                    disabled={disabled}
                />
            </ButtonGroup>
        </div>
    );
});

// =============================================================================
// GRID SIZE SELECTOR
// =============================================================================

const GridSizeSelector = memo(function GridSizeSelector({
    gridSize,
    onGridSizeChange,
    disabled,
}) {
    const currentValue = `${gridSize.rows}x${gridSize.cols}`;

    const handleChange = useCallback((e) => {
        const option = GRID_SIZE_OPTIONS.find(opt => opt.value === e.target.value);
        if (option) {
            onGridSizeChange?.({ rows: option.rows, cols: option.cols });
        }
    }, [onGridSizeChange]);

    return (
        <div className="canvas-header__grid-size">
            <span className="canvas-header__grid-size-label">Grid:</span>
            <select
                className="canvas-header__grid-size-select"
                value={currentValue}
                onChange={handleChange}
                disabled={disabled}
            >
                {GRID_SIZE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
});

// =============================================================================
// ZOOM SELECTOR
// =============================================================================

const ZoomSelector = memo(function ZoomSelector({
    zoom = 100,
    onZoomChange,
    disabled,
}) {
    const handleChange = useCallback((e) => {
        onZoomChange?.(parseInt(e.target.value, 10));
    }, [onZoomChange]);

    const handleZoomIn = useCallback(() => {
        const currentIndex = ZOOM_PRESETS.findIndex(p => p.value >= zoom);
        const nextIndex = Math.min(currentIndex + 1, ZOOM_PRESETS.length - 1);
        onZoomChange?.(ZOOM_PRESETS[nextIndex].value);
    }, [zoom, onZoomChange]);

    const handleZoomOut = useCallback(() => {
        const currentIndex = ZOOM_PRESETS.findIndex(p => p.value >= zoom);
        const prevIndex = Math.max(currentIndex - 1, 0);
        onZoomChange?.(ZOOM_PRESETS[prevIndex].value);
    }, [zoom, onZoomChange]);

    return (
        <div className="canvas-header__zoom">
            <IconButton
                icon="zoomOut"
                label="Zoom out"
                size="xs"
                onClick={handleZoomOut}
                disabled={disabled || zoom <= ZOOM_PRESETS[0].value}
            />
            <select
                className="canvas-header__zoom-select"
                value={zoom}
                onChange={handleChange}
                disabled={disabled}
            >
                {ZOOM_PRESETS.map(preset => (
                    <option key={preset.value} value={preset.value}>
                        {preset.label}
                    </option>
                ))}
            </select>
            <IconButton
                icon="zoomIn"
                label="Zoom in"
                size="xs"
                onClick={handleZoomIn}
                disabled={disabled || zoom >= ZOOM_PRESETS[ZOOM_PRESETS.length - 1].value}
            />
        </div>
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CanvasHeader - Navigation header for canvas workspace
 *
 * Features:
 * - Back/Home navigation buttons
 * - Breadcrumb trail (Canvas > Subset > View)
 * - Viewport position navigation (grid mode only)
 * - Grid size selector (grid mode only)
 * - Zoom controls (50-200%)
 */
export function CanvasHeader({
    viewport = { row: 0, col: 0 },
    gridSize = { rows: 3, cols: 3 },
    zoom = 100,
    onViewportChange,
    onGridSizeChange,
    onZoomChange,
    className = '',
}) {
    const {
        breadcrumbs,
        canGoBack,
        isGridView,
        goBack,
        goHome,
        goToIndex,
    } = useViewStack();

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape' && canGoBack) {
            e.preventDefault();
            goBack();
        }
    }, [canGoBack, goBack]);

    // Register keyboard handler
    React.useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div className={`canvas-header ${className}`}>
            {/* Left - Navigation */}
            <div className="canvas-header__left">
                <ButtonGroup gap="xs">
                    <IconButton
                        icon="arrowLeft"
                        label="Back (Esc)"
                        size="sm"
                        onClick={goBack}
                        disabled={!canGoBack}
                    />
                    <IconButton
                        icon="home"
                        label="Home"
                        size="sm"
                        onClick={goHome}
                        active={breadcrumbs.length === 1}
                    />
                </ButtonGroup>

                <Breadcrumb items={breadcrumbs} onNavigate={goToIndex} />
            </div>

            {/* Center - Viewport Navigation (grid mode only) */}
            {isGridView && (
                <div className="canvas-header__center">
                    <ViewportNavigation
                        viewport={viewport}
                        onNavigate={onViewportChange}
                        disabled={false}
                    />
                </div>
            )}

            {/* Right - Grid Size + Zoom (grid mode only) */}
            {isGridView && (
                <div className="canvas-header__right">
                    <GridSizeSelector
                        gridSize={gridSize}
                        onGridSizeChange={onGridSizeChange}
                        disabled={false}
                    />
                    <ZoomSelector
                        zoom={zoom}
                        onZoomChange={onZoomChange}
                        disabled={false}
                    />
                </div>
            )}
        </div>
    );
}

export default memo(CanvasHeader);
