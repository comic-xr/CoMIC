/**
 * @file CanvasSizeDisplay.jsx
 * @description Shows canvas dimensions, click to resize.
 * Prevents shrinking if it would affect existing placements.
 */

import React, { useMemo, useCallback } from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { Dropdown } from '@UI/react/components/atoms/Dropdown';

import './CanvasSizeDisplay.scss';

// Quick pick presets for canvas sizes
const CANVAS_PRESETS = [
    { id: '3x3', label: '3×3', cols: 3, rows: 3 },
    { id: '4x4', label: '4×4', cols: 4, rows: 4 },
    { id: '5x5', label: '5×5', cols: 5, rows: 5 },
    { id: '6x6', label: '6×6', cols: 6, rows: 6 },
    { id: '8x8', label: '8×8', cols: 8, rows: 8 },
    { id: '10x10', label: '10×10', cols: 10, rows: 10 },
];

/**
 * Calculate the minimum canvas size based on existing placements.
 * The minimum is determined by the furthest placement (row + rowSpan, col + colSpan).
 * @param {Array} placements - Array of placement objects with row, col, rowSpan, colSpan
 * @returns {{ minRows: number, minCols: number, affectedPlacements: Array }}
 */
function calculateMinCanvasSize(placements = []) {
    if (!placements || placements.length === 0) {
        return { minRows: 1, minCols: 1, affectedPlacements: [] };
    }

    let minRows = 1;
    let minCols = 1;

    for (const placement of placements) {
        const placementEndRow = placement.row + (placement.rowSpan || 1);
        const placementEndCol = placement.col + (placement.colSpan || 1);
        minRows = Math.max(minRows, placementEndRow);
        minCols = Math.max(minCols, placementEndCol);
    }

    return { minRows, minCols };
}

/**
 * Get placements that would be affected by shrinking to a new size.
 * @param {Array} placements - Current placements
 * @param {number} newRows - Proposed new row count
 * @param {number} newCols - Proposed new column count
 * @returns {Array} Placements that would be outside the new bounds
 */
function getAffectedPlacements(placements = [], newRows, newCols) {
    return placements.filter(placement => {
        const placementEndRow = placement.row + (placement.rowSpan || 1);
        const placementEndCol = placement.col + (placement.colSpan || 1);
        return placementEndRow > newRows || placementEndCol > newCols;
    });
}

/**
 * Canvas size display and control component.
 * Canvas can be any size (no upper limit) - viewport constrains what's visible.
 * Prevents shrinking that would affect existing placements.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.size] - Canvas size {cols, rows}
 * @param {Array} [props.placements] - Array of canvas placements to check against
 * @param {Function} [props.onChange] - Callback when size changes
 * @param {Function} [props.onShrinkBlocked] - Called when shrink is blocked due to placements
 */
export function CanvasSizeDisplay({
    size = { cols: 3, rows: 3 },
    placements = [],
    onChange,
    onShrinkBlocked,
}) {
    // Ensure we have valid numbers (protect against NaN)
    const safeRows = typeof size?.rows === 'number' && !isNaN(size.rows) ? size.rows : 3;
    const safeCols = typeof size?.cols === 'number' && !isNaN(size.cols) ? size.cols : 3;

    // Calculate minimum size based on placements
    const { minRows, minCols } = useMemo(
        () => calculateMinCanvasSize(placements),
        [placements]
    );

    // Determine if shrink buttons should be disabled
    const canShrinkRows = safeRows > minRows;
    const canShrinkCols = safeCols > minCols;

    // Count placements that would be affected if we try to shrink
    const rowShrinkAffected = useMemo(
        () => getAffectedPlacements(placements, safeRows - 1, safeCols),
        [placements, safeRows, safeCols]
    );
    const colShrinkAffected = useMemo(
        () => getAffectedPlacements(placements, safeRows, safeCols - 1),
        [placements, safeRows, safeCols]
    );

    const handleChange = (dimension, delta) => {
        const currentValue = dimension === 'rows' ? safeRows : safeCols;
        const newValue = Math.max(1, currentValue + delta);

        // Check if shrinking would affect placements
        if (delta < 0) {
            const affectedPlacements = dimension === 'rows'
                ? rowShrinkAffected
                : colShrinkAffected;

            if (affectedPlacements.length > 0) {
                // Notify about blocked shrink with affected placement info
                onShrinkBlocked?.({
                    dimension,
                    currentValue,
                    requestedValue: newValue,
                    affectedPlacements,
                    minAllowed: dimension === 'rows' ? minRows : minCols,
                });
                return; // Don't apply the change
            }
        }

        // No upper limit - canvas can be as large as needed
        onChange?.({
            rows: dimension === 'rows' ? newValue : safeRows,
            cols: dimension === 'cols' ? newValue : safeCols,
        });
    };

    // Handle preset selection - check if shrinking would affect placements
    const handlePreset = useCallback((preset) => {
        // Check if this preset would shrink and affect placements
        const affectedByRows = preset.rows < safeRows ? getAffectedPlacements(placements, preset.rows, safeCols) : [];
        const affectedByCols = preset.cols < safeCols ? getAffectedPlacements(placements, safeRows, preset.cols) : [];
        const totalAffected = [...new Set([...affectedByRows, ...affectedByCols])];

        if (totalAffected.length > 0) {
            onShrinkBlocked?.({
                dimension: 'both',
                currentValue: { rows: safeRows, cols: safeCols },
                requestedValue: { rows: preset.rows, cols: preset.cols },
                affectedPlacements: totalAffected,
            });
            return;
        }

        onChange?.({ rows: preset.rows, cols: preset.cols });
    }, [safeRows, safeCols, placements, onChange, onShrinkBlocked]);

    return (
        <Dropdown
            trigger={
                <LabeledButton
                    icon="dashboard"
                    label={`${safeRows} × ${safeCols}`}
                    size="sm"
                    variant="ghost"
                    className="canvas-size-display"
                />
            }
            placement="top"
        >
            <div className="canvas-size-display__popover">
                <div className="canvas-size-display__header">Canvas Size</div>

                {/* Quick Pick Presets */}
                <div className="canvas-size-display__presets">
                    {CANVAS_PRESETS.map(preset => {
                        // Check if this preset would affect placements
                        const wouldAffect = preset.rows < minRows || preset.cols < minCols;
                        const isActive = preset.cols === safeCols && preset.rows === safeRows;
                        return (
                            <button
                                key={preset.id}
                                className={`canvas-size-display__preset ${isActive ? 'canvas-size-display__preset--active' : ''}`}
                                disabled={wouldAffect}
                                onClick={() => handlePreset(preset)}
                                title={wouldAffect ? 'Would affect existing views' : `Set to ${preset.label}`}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                </div>

                <div className="canvas-size-display__divider" />

                <div className="canvas-size-display__row">
                    <span>Rows</span>
                    <div className="canvas-size-display__controls">
                        <IconButton
                            icon="remove"
                            onClick={() => handleChange('rows', -1)}
                            disabled={safeRows <= 1 || !canShrinkRows}
                            tooltip={!canShrinkRows && safeRows > 1
                                ? `Cannot shrink: ${rowShrinkAffected.length} view(s) in row ${safeRows}`
                                : 'Decrease rows'
                            }
                            size="xs"
                            variant="ghost"
                        />
                        <span>{safeRows}</span>
                        <IconButton
                            icon="add"
                            onClick={() => handleChange('rows', 1)}
                            tooltip="Increase rows"
                            size="xs"
                            variant="ghost"
                        />
                    </div>
                </div>
                <div className="canvas-size-display__row">
                    <span>Columns</span>
                    <div className="canvas-size-display__controls">
                        <IconButton
                            icon="remove"
                            onClick={() => handleChange('cols', -1)}
                            disabled={safeCols <= 1 || !canShrinkCols}
                            tooltip={!canShrinkCols && safeCols > 1
                                ? `Cannot shrink: ${colShrinkAffected.length} view(s) in column ${safeCols}`
                                : 'Decrease columns'
                            }
                            size="xs"
                            variant="ghost"
                        />
                        <span>{safeCols}</span>
                        <IconButton
                            icon="add"
                            onClick={() => handleChange('cols', 1)}
                            tooltip="Increase columns"
                            size="xs"
                            variant="ghost"
                        />
                    </div>
                </div>
                {/* Show hint when shrink is blocked */}
                {(!canShrinkRows || !canShrinkCols) && placements.length > 0 && (
                    <div className="canvas-size-display__hint">
                        <Icon name="info" size={12} />
                        <span>Close or move views to shrink further</span>
                    </div>
                )}
            </div>
        </Dropdown>
    );
}

export default CanvasSizeDisplay;