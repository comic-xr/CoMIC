/**
 * @file ViewportSizeDisplay.jsx
 * @description Shows viewport dimensions (visible grid cells), click to resize.
 * Viewport is constrained to canvas dimensions (or max 10 if canvas not provided).
 */

import React, { useCallback } from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { Dropdown } from '@UI/react/components/atoms/Dropdown';

import './ViewportSizeDisplay.scss';

// Quick pick presets for viewport sizes
const VIEWPORT_PRESETS = [
    { id: '1x1', label: '1×1', cols: 1, rows: 1 },
    { id: '2x2', label: '2×2', cols: 2, rows: 2 },
    { id: '3x3', label: '3×3', cols: 3, rows: 3 },
    { id: '4x4', label: '4×4', cols: 4, rows: 4 },
    { id: '2x1', label: '2×1', cols: 2, rows: 1 },
    { id: '1x2', label: '1×2', cols: 1, rows: 2 },
    { id: '3x2', label: '3×2', cols: 3, rows: 2 },
];

/**
 * Viewport size display and control component.
 * Viewport determines how many cells are visible at once.
 * Constrained to canvas dimensions when provided, otherwise max 10.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.size] - Viewport size {cols, rows}
 * @param {Object} [props.maxSize] - Maximum size {cols, rows} - typically canvas dimensions
 * @param {Function} [props.onChange] - Callback when size changes
 */
export function ViewportSizeDisplay({ size = { cols: 3, rows: 3 }, maxSize = { rows: 10, cols: 10 }, onChange }) {
    // Ensure we have valid numbers (protect against NaN)
    const safeRows = typeof size?.rows === 'number' && !isNaN(size.rows) ? size.rows : 3;
    const safeCols = typeof size?.cols === 'number' && !isNaN(size.cols) ? size.cols : 3;
    const safeMaxRows = typeof maxSize?.rows === 'number' && !isNaN(maxSize.rows) ? maxSize.rows : 10;
    const safeMaxCols = typeof maxSize?.cols === 'number' && !isNaN(maxSize.cols) ? maxSize.cols : 10;

    const handleChange = (dimension, delta) => {
        const currentValue = dimension === 'rows' ? safeRows : safeCols;
        const max = dimension === 'rows' ? safeMaxRows : safeMaxCols;
        const newValue = Math.max(1, Math.min(max, currentValue + delta));
        onChange?.({
            rows: dimension === 'rows' ? newValue : safeRows,
            cols: dimension === 'cols' ? newValue : safeCols,
        });
    };

    const handlePreset = useCallback((preset) => {
        // Clamp to max bounds
        const cols = Math.min(preset.cols, safeMaxCols);
        const rows = Math.min(preset.rows, safeMaxRows);
        onChange?.({ rows, cols });
    }, [safeMaxRows, safeMaxCols, onChange]);

    return (
        <Dropdown
            trigger={
                <LabeledButton
                    icon="aspectRatio"
                    label={`${safeRows} × ${safeCols}`}
                    size="sm"
                    variant="ghost"
                    className="viewport-size-display"
                />
            }
            placement="top"
        >
            <div className="viewport-size-display__popover">
                <div className="viewport-size-display__header">Viewport Size</div>

                {/* Quick Pick Presets */}
                <div className="viewport-size-display__presets">
                    {VIEWPORT_PRESETS.map(preset => {
                        const isDisabled = preset.cols > safeMaxCols || preset.rows > safeMaxRows;
                        const isActive = preset.cols === safeCols && preset.rows === safeRows;
                        return (
                            <button
                                key={preset.id}
                                className={`viewport-size-display__preset ${isActive ? 'viewport-size-display__preset--active' : ''}`}
                                disabled={isDisabled}
                                onClick={() => handlePreset(preset)}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                </div>

                <div className="viewport-size-display__divider" />

                <div className="viewport-size-display__row">
                    <span>Rows</span>
                    <div className="viewport-size-display__controls">
                        <IconButton
                            icon="remove"
                            onClick={() => handleChange('rows', -1)}
                            disabled={safeRows <= 1}
                            tooltip="Decrease rows"
                            size="xs"
                            variant="ghost"
                        />
                        <span>{safeRows}</span>
                        <IconButton
                            icon="add"
                            onClick={() => handleChange('rows', 1)}
                            disabled={safeRows >= safeMaxRows}
                            tooltip="Increase rows"
                            size="xs"
                            variant="ghost"
                        />
                    </div>
                </div>
                <div className="viewport-size-display__row">
                    <span>Columns</span>
                    <div className="viewport-size-display__controls">
                        <IconButton
                            icon="remove"
                            onClick={() => handleChange('cols', -1)}
                            disabled={safeCols <= 1}
                            tooltip="Decrease columns"
                            size="xs"
                            variant="ghost"
                        />
                        <span>{safeCols}</span>
                        <IconButton
                            icon="add"
                            onClick={() => handleChange('cols', 1)}
                            disabled={safeCols >= safeMaxCols}
                            tooltip="Increase columns"
                            size="xs"
                            variant="ghost"
                        />
                    </div>
                </div>
            </div>
        </Dropdown>
    );
}

export default ViewportSizeDisplay;
