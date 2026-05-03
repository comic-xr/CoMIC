/**
 * SizePicker Component
 *
 * Dropdown for selecting view size presets or custom size.
 * Presets: 1×1, 2×1, 1×2, 2×2
 * Custom: n×n input (1-5 range)
 */

import React, { memo, useState, useEffect, useRef } from 'react';
import './SizePicker.scss';

const SIZE_PRESETS = [
    { rows: 1, cols: 1, label: '1×1' },
    { rows: 1, cols: 2, label: '1×2' },
    { rows: 2, cols: 1, label: '2×1' },
    { rows: 2, cols: 2, label: '2×2' },
];

export const SizePicker = memo(function SizePicker({
    currentSize = { rows: 1, cols: 1 },
    onChange,
    onClose,
}) {
    const [customRows, setCustomRows] = useState(currentSize.rows);
    const [customCols, setCustomCols] = useState(currentSize.cols);
    const [showCustom, setShowCustom] = useState(false);
    const pickerRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                onClose?.();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handlePresetClick = (preset) => {
        onChange?.({ rows: preset.rows, cols: preset.cols });
    };

    const handleCustomApply = () => {
        const rows = Math.max(1, Math.min(5, customRows));
        const cols = Math.max(1, Math.min(5, customCols));
        onChange?.({ rows, cols });
    };

    const isPresetSelected = (preset) =>
        currentSize.rows === preset.rows && currentSize.cols === preset.cols;

    return (
        <div ref={pickerRef} className="size-picker">
            {/* Presets */}
            <div className="size-picker__presets">
                {SIZE_PRESETS.map((preset) => (
                    <button
                        key={preset.label}
                        className={`size-picker__preset ${isPresetSelected(preset) ? 'size-picker__preset--selected' : ''}`}
                        onClick={() => handlePresetClick(preset)}
                    >
                        {/* Visual grid representation */}
                        <div
                            className="size-picker__preset-grid"
                            style={{
                                '--rows': preset.rows,
                                '--cols': preset.cols,
                            }}
                        >
                            {Array.from({ length: preset.rows * preset.cols }).map((_, i) => (
                                <div key={i} className="size-picker__preset-cell" />
                            ))}
                        </div>
                        <span className="size-picker__preset-label">{preset.label}</span>
                    </button>
                ))}
            </div>

            {/* Custom toggle */}
            <button
                className={`size-picker__custom-toggle ${showCustom ? 'size-picker__custom-toggle--active' : ''}`}
                onClick={() => setShowCustom(!showCustom)}
            >
                Custom size
            </button>

            {/* Custom inputs */}
            {showCustom && (
                <div className="size-picker__custom">
                    <div className="size-picker__custom-inputs">
                        <label className="size-picker__custom-field">
                            <span>Rows</span>
                            <input
                                type="number"
                                min={1}
                                max={5}
                                value={customRows}
                                onChange={(e) => setCustomRows(parseInt(e.target.value) || 1)}
                            />
                        </label>
                        <span className="size-picker__custom-x">×</span>
                        <label className="size-picker__custom-field">
                            <span>Cols</span>
                            <input
                                type="number"
                                min={1}
                                max={5}
                                value={customCols}
                                onChange={(e) => setCustomCols(parseInt(e.target.value) || 1)}
                            />
                        </label>
                    </div>
                    <button
                        className="size-picker__apply"
                        onClick={handleCustomApply}
                    >
                        Apply
                    </button>
                </div>
            )}
        </div>
    );
});

export default SizePicker;