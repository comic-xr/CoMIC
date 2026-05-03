// src/ui/react/components/molecules/SliderMenuOption/SliderMenuOption.jsx
// Slider molecule for dropdown menus - extracted from workspace/Sliders
//
// Per Atomic Design spec: Composed of Icon, slider input, Text (label/value)
// Used for: Toolbar menus, settings panels, any slider in dropdown context

import React, { useState, useEffect, useRef } from 'react';
import './SliderMenuOption.scss';

/**
 * SliderMenuOption - Reusable slider for dropdown menus
 *
 * @param {React.Element} [props.icon] - Icon element to display
 * @param {string} props.label - Label text
 * @param {string} [props.description] - Optional description text
 * @param {number} props.value - Current value
 * @param {number} [props.min=0] - Minimum value
 * @param {number} [props.max=1] - Maximum value
 * @param {number} [props.step=0.01] - Step increment
 * @param {function} props.onChange - Change handler
 * @param {function} [props.formatValue] - Value formatter function
 * @param {number[]} [props.presets] - Preset value markers
 * @param {boolean} [props.disabled=false] - Disabled state
 */
export function SliderMenuOption({
    icon,
    label,
    description,
    value,
    min = 0,
    max = 1,
    step = 0.01,
    onChange,
    formatValue = (val) => val.toFixed(2),
    presets = null,
    disabled = false,
}) {
    const [localValue, setLocalValue] = useState(value);
    const isInteractingRef = useRef(false);
    const lastEmittedValueRef = useRef(value);
    const syncTimeoutRef = useRef(null);

    // Update local value when prop changes (only when not interacting)
    useEffect(() => {
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        if (isInteractingRef.current) {
            return;
        }

        // Only sync if this is truly an external change
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

    const handleChange = (e) => {
        if (disabled) return;
        const newValue = parseFloat(e.target.value);
        setLocalValue(newValue);

        if (onChange) {
            onChange(newValue);
            lastEmittedValueRef.current = newValue;
        }
    };

    const handleMouseDown = () => {
        if (disabled) return;
        isInteractingRef.current = true;

        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = null;
        }
    };

    const handleMouseUp = () => {
        // Emit final value
        if (onChange && !disabled) {
            onChange(localValue);
            lastEmittedValueRef.current = localValue;
        }

        // Delay clearing interaction flag
        setTimeout(() => {
            isInteractingRef.current = false;
        }, 150);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, []);

    // Calculate progress percentage for gradient
    const progress = ((localValue - min) / (max - min)) * 100;

    return (
        <div
            className="menu-option slider-option"
            onClick={(e) => e.stopPropagation()}
            role="group"
            aria-label={label}
        >
            {/* Header with icon, label, and current value */}
            <div className="slider-header">
                <div className="slider-label-group">
                    {icon && <span className="slider-icon">{icon}</span>}
                    <span className="slider-label">{label}</span>
                </div>
                <span className="slider-value" aria-live="polite">
                    {formatValue(localValue)}
                </span>
            </div>

            {/* Slider input */}
            <div className="slider-input-container">
                <input
                    type="range"
                    className="dropdown-slider"
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
                    aria-label={label}
                    aria-valuemin={min}
                    aria-valuemax={max}
                    aria-valuenow={localValue}
                    aria-valuetext={formatValue(localValue)}
                />
            </div>

            {/* Optional preset tick marks */}
            {presets && (
                <div className="slider-presets">
                    {presets.map((preset, index) => (
                        <div
                            key={index}
                            className="slider-preset-mark"
                            style={{
                                opacity: Math.abs(localValue - preset) < step * 2 ? 1 : 0.3
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Optional description */}
            {description && (
                <div className="slider-description">{description}</div>
            )}
        </div>
    );
}

export default SliderMenuOption;
