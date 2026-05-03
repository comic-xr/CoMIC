// src/ui/react/components/molecules/SliderWithPresets/SliderWithPresets.jsx
// Slider with preset buttons molecule - extracted from workspace/Sliders
//
// Per Atomic Design spec: Composed of Icon, slider input, Text, Buttons (presets)
// Used for: Toolbar settings, parameters with common values

import React, { useState, useEffect, useRef } from 'react';
import './SliderWithPresets.scss';

/**
 * SliderWithPresets - Slider with integrated preset buttons
 *
 * @param {React.Element} [props.icon] - Icon element to display
 * @param {string} props.label - Label text
 * @param {number} props.value - Current value
 * @param {number} [props.min=0] - Minimum value
 * @param {number} [props.max=1] - Maximum value
 * @param {number} [props.step=0.01] - Step increment
 * @param {function} props.onChange - Change handler
 * @param {function} [props.formatValue] - Value formatter function
 * @param {number[]} [props.presets] - Array of preset values
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.disabledReason] - Reason shown when disabled
 */
export function SliderWithPresets({
    icon,
    label,
    value,
    min = 0,
    max = 1,
    step = 0.01,
    onChange,
    formatValue = (val) => val.toFixed(2),
    presets = null,
    disabled = false,
    disabledReason = "Not available",
}) {
    const [localValue, setLocalValue] = useState(value);
    const isDraggingRef = useRef(false);
    const isInteractingRef = useRef(false);
    const lastEmittedValueRef = useRef(value);
    const syncTimeoutRef = useRef(null);

    // Only sync external value when NOT interacting and value actually changed externally
    useEffect(() => {
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        if (isInteractingRef.current) {
            return;
        }

        const isExternalChange = Math.abs(value - lastEmittedValueRef.current) > step / 2;

        if (isExternalChange || Math.abs(value - localValue) > step / 2) {
            syncTimeoutRef.current = setTimeout(() => {
                if (!isInteractingRef.current) {
                    setLocalValue(value);
                    lastEmittedValueRef.current = value;
                }
            }, 100);
        }
    }, [value, step, localValue]);

    const emitChange = (newValue) => {
        if (!onChange || disabled) return;
        onChange(newValue);
        lastEmittedValueRef.current = newValue;
    };

    const handleChange = (e) => {
        if (disabled) return;
        const newValue = parseFloat(e.target.value);
        setLocalValue(newValue);
        emitChange(newValue);
    };

    const handleMouseDown = () => {
        if (disabled) return;
        isDraggingRef.current = true;
        isInteractingRef.current = true;

        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = null;
        }
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;

        if (onChange && !disabled) {
            onChange(localValue);
            lastEmittedValueRef.current = localValue;
        }

        setTimeout(() => {
            isInteractingRef.current = false;
        }, 150);
    };

    const handlePresetClick = (presetValue) => {
        if (disabled) return;
        isInteractingRef.current = true;
        setLocalValue(presetValue);
        if (onChange) {
            onChange(presetValue);
            lastEmittedValueRef.current = presetValue;
        }
        setTimeout(() => {
            isInteractingRef.current = false;
        }, 150);
    };

    useEffect(() => {
        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, []);

    const progress = ((localValue - min) / (max - min)) * 100;

    return (
        <div className={`slider-with-presets ${disabled ? 'disabled' : ''}`}>
            {/* Header with label and value */}
            <div className="slider-header">
                <div className="slider-label-group">
                    {icon && <span className="slider-icon">{icon}</span>}
                    <span className="slider-label">{label}</span>
                    {disabled && (
                        <span className="slider-disabled-badge">DISABLED</span>
                    )}
                </div>
                <span className="slider-value">
                    {formatValue(localValue)}
                </span>
            </div>

            {/* Slider track */}
            <div className="slider-track-container">
                <input
                    type="range"
                    className="slider-input"
                    min={min}
                    max={max}
                    step={step}
                    value={localValue}
                    onChange={handleChange}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchEnd={handleMouseUp}
                    disabled={disabled}
                    style={{ '--slider-progress': `${progress}%` }}
                />
            </div>

            {/* Presets directly under slider */}
            {presets && presets.length > 0 && (
                <div className="slider-presets-row">
                    {presets.map((preset, index) => {
                        const isActive = Math.abs(localValue - preset) < step * 2;
                        return (
                            <button
                                key={index}
                                className={`preset-btn ${isActive ? 'active' : ''}`}
                                onClick={() => handlePresetClick(preset)}
                                disabled={disabled}
                                title={formatValue(preset)}
                            >
                                {formatValue(preset)}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Disabled reason */}
            {disabled && disabledReason && (
                <div className="slider-disabled-reason">{disabledReason}</div>
            )}
        </div>
    );
}

export default SliderWithPresets;
