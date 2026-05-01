/**
 * SpawnSizePicker Component
 *
 * Allows selecting the default size for new views.
 * Shows preset sizes (1×1, 2×1, 1×2, 2×2) and a custom size option.
 */

import React, { memo, useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './SpawnSizePicker.scss';

// Preset size options
const PRESET_SIZES = [
    { id: '1x1', cols: 1, rows: 1 },
    { id: '2x1', cols: 2, rows: 1 },
    { id: '1x2', cols: 1, rows: 2 },
    { id: '2x2', cols: 2, rows: 2 },
];

export const SpawnSizePicker = memo(function SpawnSizePicker({
    value,
    onChange,
    className = '',
}) {
    const [showCustom, setShowCustom] = useState(false);
    const [customCols, setCustomCols] = useState(1);
    const [customRows, setCustomRows] = useState(1);

    // Check if current value is a custom size
    const isCustom = typeof value === 'object';

    // Handle preset selection
    const handlePresetClick = useCallback((size) => {
        onChange?.(size.id);
        setShowCustom(false);
    }, [onChange]);

    // Handle custom size apply
    const handleApplyCustom = useCallback(() => {
        onChange?.({ cols: customCols, rows: customRows });
        setShowCustom(false);
    }, [customCols, customRows, onChange]);

    // Handle custom button click
    const handleCustomClick = useCallback(() => {
        setShowCustom((prev) => !prev);
    }, []);

    // Handle input changes
    const handleColsChange = useCallback((e) => {
        const val = Math.max(1, Math.min(6, parseInt(e.target.value) || 1));
        setCustomCols(val);
    }, []);

    const handleRowsChange = useCallback((e) => {
        const val = Math.max(1, Math.min(6, parseInt(e.target.value) || 1));
        setCustomRows(val);
    }, []);

    return (
        <div className={`spawn-size-picker ${className}`}>
            {/* Preset Sizes */}
            <div className="spawn-size-picker__presets">
                {PRESET_SIZES.map((size) => (
                    <button
                        key={size.id}
                        className={`spawn-size-picker__btn ${value === size.id ? 'spawn-size-picker__btn--active' : ''}`}
                        onClick={() => handlePresetClick(size)}
                    >
                        {size.cols}×{size.rows}
                    </button>
                ))}
                <button
                    className={`spawn-size-picker__btn spawn-size-picker__btn--custom ${isCustom || showCustom ? 'spawn-size-picker__btn--active' : ''}`}
                    onClick={handleCustomClick}
                >
                    {isCustom ? `${value.cols}×${value.rows}` : 'Custom'}
                </button>
            </div>

            {/* Custom Size Panel */}
            {showCustom && (
                <div className="spawn-size-picker__custom-panel">
                    <div className="spawn-size-picker__custom-header">Custom Size</div>

                    <div className="spawn-size-picker__custom-inputs">
                        <input
                            type="number"
                            min="1"
                            max="6"
                            value={customCols}
                            onChange={handleColsChange}
                            className="spawn-size-picker__custom-input"
                        />
                        <span className="spawn-size-picker__custom-separator">×</span>
                        <input
                            type="number"
                            min="1"
                            max="6"
                            value={customRows}
                            onChange={handleRowsChange}
                            className="spawn-size-picker__custom-input"
                        />
                    </div>

                    <div className="spawn-size-picker__custom-actions">
                        <button
                            className="spawn-size-picker__custom-btn spawn-size-picker__custom-btn--apply"
                            onClick={handleApplyCustom}
                        >
                            <Icon name="check" size={12} /> Apply
                        </button>
                        <button
                            className="spawn-size-picker__custom-btn"
                            onClick={() => setShowCustom(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

export default SpawnSizePicker;