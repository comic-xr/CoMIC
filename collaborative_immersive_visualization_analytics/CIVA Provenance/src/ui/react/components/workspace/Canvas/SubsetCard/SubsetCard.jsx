// src/ui/react/components/workspace/Canvas/SubsetCard/SubsetCard.jsx
// Subset card component for displaying subsets as first-class citizens on canvas
//
// Features:
// - Dashed border with subset color
// - Preview grid showing miniature thumbnails of contained views
// - Hover overlay with "Open Subset" button
// - Double-click to open subset view

import React, { memo, useState, useCallback, useMemo } from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { getSubsetManager } from '@Init/appInitializer.js';
import './SubsetCard.scss';

// =============================================================================
// SUBSET HEADER
// =============================================================================

const SubsetHeader = memo(function SubsetHeader({
    name,
    color,
    viewCount,
    layout,
    renderMode,
    onClose,
    onShare,
}) {
    const isCompact = renderMode === 'compact' || renderMode === 'thumbnail';
    const isMinimal = renderMode === 'thumbnail' || renderMode === 'snapshot';

    return (
        <div
            className="subset-card__header"
            style={{ '--subset-color': color }}
        >
            <div className="subset-card__header-left">
                <Icon name="layers" size={isMinimal ? 12 : 14} className="subset-card__type-icon" />
                <span className="subset-card__name">{name}</span>
                {!isMinimal && (
                    <span className="subset-card__count">({viewCount} views)</span>
                )}
            </div>

            {!isMinimal && (
                <div className="subset-card__header-right">
                    {onShare && (
                        <IconButton
                            icon="share"
                            label="Share subset"
                            size="xs"
                            onClick={(e) => { e.stopPropagation(); onShare?.(); }}
                        />
                    )}
                    {onClose && (
                        <IconButton
                            icon="x"
                            label="Remove from canvas"
                            size="xs"
                            onClick={(e) => { e.stopPropagation(); onClose?.(); }}
                        />
                    )}
                </div>
            )}
        </div>
    );
});

// =============================================================================
// PREVIEW GRID
// =============================================================================

const PreviewGrid = memo(function PreviewGrid({
    layout,
    viewIds,
    viewPreviews = {},
    renderMode,
}) {
    // Parse layout (e.g., "2x2" → { rows: 2, cols: 2 })
    const [rows, cols] = (layout || '2x2').split('x').map(Number);
    const maxCells = rows * cols;
    const displayViews = viewIds.slice(0, maxCells);

    // Fill remaining cells with empty placeholders
    const cells = [...displayViews];
    while (cells.length < maxCells) {
        cells.push(null);
    }

    return (
        <div
            className="subset-card__preview-grid"
            style={{
                '--grid-rows': rows,
                '--grid-cols': cols,
            }}
        >
            {cells.map((viewId, index) => (
                <div
                    key={viewId || `empty-${index}`}
                    className={`subset-card__preview-cell ${viewId ? '' : 'subset-card__preview-cell--empty'}`}
                >
                    {viewId ? (
                        viewPreviews[viewId] ? (
                            <img
                                src={viewPreviews[viewId]}
                                alt="View preview"
                                className="subset-card__preview-image"
                            />
                        ) : (
                            <Icon name="box" size={renderMode === 'snapshot' ? 10 : 14} />
                        )
                    ) : (
                        <div className="subset-card__preview-empty-indicator" />
                    )}
                </div>
            ))}
        </div>
    );
});

// =============================================================================
// HOVER OVERLAY
// =============================================================================

const HoverOverlay = memo(function HoverOverlay({ color, onOpen }) {
    return (
        <div className="subset-card__hover-overlay">
            <button
                type="button"
                className="subset-card__open-btn"
                style={{ background: color }}
                onClick={(e) => { e.stopPropagation(); onOpen?.(); }}
            >
                <Icon name="focus" size={16} />
                <span>Open Subset</span>
            </button>
        </div>
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * SubsetCard - First-class subset representation on canvas
 *
 * Props:
 * - subset: { id, name, color, layout, viewIds }
 * - renderMode: 'full' | 'compact' | 'thumbnail' | 'snapshot'
 * - isActive: Whether this subset is currently selected
 * - viewPreviews: Map of viewId → thumbnail URL
 * - onOpen: Called when user wants to open/focus on subset
 * - onClose: Called when user removes subset from canvas
 * - onClick: Called when clicking the card (select)
 * - onShare: Called when sharing subset
 */
export function SubsetCard({
    subset,
    renderMode = 'full',
    isActive = false,
    viewPreviews = {},
    onOpen,
    onClose,
    onClick,
    onShare,
    className = '',
}) {
    const [hovering, setHovering] = useState(false);

    const {
        id,
        name = 'Unnamed Subset',
        color = 'var(--color-accent-amber)',
        layout = '2x2',
        viewIds = [],
    } = subset || {};

    const isSnapshot = renderMode === 'snapshot';

    const handleDoubleClick = useCallback((e) => {
        e.stopPropagation();
        onOpen?.();
    }, [onOpen]);

    return (
        <div
            className={`subset-card subset-card--${renderMode} ${isActive ? 'subset-card--active' : ''} ${className}`}
            style={{ '--subset-color': color }}
            onClick={onClick}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
        >
            {/* Header */}
            {!isSnapshot && (
                <SubsetHeader
                    name={name}
                    color={color}
                    viewCount={viewIds.length}
                    layout={layout}
                    renderMode={renderMode}
                    onClose={onClose}
                    onShare={onShare}
                />
            )}

            {/* Preview Grid */}
            <PreviewGrid
                layout={layout}
                viewIds={viewIds}
                viewPreviews={viewPreviews}
                renderMode={renderMode}
            />

            {/* Hover Overlay */}
            {hovering && !isSnapshot && (
                <HoverOverlay color={color} onOpen={onOpen} />
            )}

            {/* Snapshot mode overlay */}
            {isSnapshot && (
                <div
                    className="subset-card__snapshot-overlay"
                    onClick={(e) => { e.stopPropagation(); onOpen?.(); }}
                >
                    <div className="subset-card__snapshot-label">
                        <Icon name="layers" size={12} />
                        <span>{name}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * SubsetCardById - Wrapper that looks up subset by ID
 *
 * Used by CanvasCell when rendering a subset placement
 */
export const SubsetCardById = memo(function SubsetCardById({
    subsetId,
    renderMode = 'full',
    isActive = false,
    onOpen,
    onClose,
    onClick,
    onShare,
}) {
    // Look up subset from manager
    const subset = useMemo(() => {
        try {
            const subsetData = getSubsetManager()?.getSubset(subsetId);
            if (!subsetData) return null;

            // Convert Subset model to the format SubsetCard expects
            const layout = subsetData.calculateFocusLayout?.() || { rows: 2, cols: 2 };
            return {
                id: subsetData.id,
                name: subsetData.name || 'Unnamed Subset',
                color: 'var(--color-accent-amber)', // Default color for subsets
                layout: `${layout.cols}x${layout.rows}`,
                viewIds: subsetData.placementIds || [],
            };
        } catch (e) {
            console.warn('Failed to get subset:', subsetId, e);
            return null;
        }
    }, [subsetId]);

    // Handle missing subset
    if (!subset) {
        return (
            <div className="subset-card subset-card--error">
                <div className="subset-card__error-content">
                    <Icon name="alertTriangle" size={20} />
                    <span>Subset not found</span>
                    {onClose && (
                        <button
                            className="subset-card__close-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                        >
                            <Icon name="x" size={14} />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <SubsetCard
            subset={subset}
            renderMode={renderMode}
            isActive={isActive}
            onOpen={onOpen}
            onClose={onClose}
            onClick={onClick}
            onShare={onShare}
        />
    );
});

export default memo(SubsetCard);
