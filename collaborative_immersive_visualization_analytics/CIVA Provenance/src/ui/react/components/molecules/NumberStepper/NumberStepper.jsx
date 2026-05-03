// src/ui/react/components/molecules/NumberStepper/NumberStepper.jsx
// Number stepper molecule - increment/decrement control with value display
//
// Per Atomic Design spec: Composed of IconButton (2) + Text
// Used for: viewport size, grid dimensions, quantity inputs

import React, { memo, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { IconButton } from '@UI/react/components/atoms/Button';
import './NumberStepper.scss';

/**
 * NumberStepper - A numeric input with increment/decrement buttons
 *
 * @param {Object} props
 * @param {number} value - Current numeric value
 * @param {function} onChange - Called with new value when changed
 * @param {number} [min] - Minimum allowed value
 * @param {number} [max] - Maximum allowed value
 * @param {number} [step=1] - Step size for increment/decrement
 * @param {string} [label] - Optional label displayed above
 * @param {string} [unit] - Optional unit suffix (e.g., "px", "%")
 * @param {string} [color] - Accent color for active state
 * @param {string} [size='md'] - Size variant: 'sm' | 'md' | 'lg'
 * @param {boolean} [disabled] - Disable all interactions
 * @param {boolean} [compact] - Compact layout without label
 * @param {string} [className] - Additional CSS classes
 */
export const NumberStepper = memo(function NumberStepper({
    value,
    onChange,
    min,
    max,
    step = 1,
    label,
    unit,
    color,
    size = 'md',
    disabled = false,
    compact = false,
    className = '',
}) {
    const canDecrement = min === undefined || value > min;
    const canIncrement = max === undefined || value < max;

    const handleDecrement = useCallback(() => {
        if (!disabled && canDecrement) {
            const newValue = Math.max(min ?? -Infinity, value - step);
            onChange?.(newValue);
        }
    }, [disabled, canDecrement, min, value, step, onChange]);

    const handleIncrement = useCallback(() => {
        if (!disabled && canIncrement) {
            const newValue = Math.min(max ?? Infinity, value + step);
            onChange?.(newValue);
        }
    }, [disabled, canIncrement, max, value, step, onChange]);

    // Handle keyboard input when focused
    const handleKeyDown = useCallback((e) => {
        if (disabled) return;

        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
            e.preventDefault();
            handleIncrement();
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
            e.preventDefault();
            handleDecrement();
        }
    }, [disabled, handleIncrement, handleDecrement]);

    const classList = [
        'number-stepper',
        `number-stepper--${size}`,
        compact && 'number-stepper--compact',
        disabled && 'number-stepper--disabled',
        className,
    ].filter(Boolean).join(' ');

    const valueStyle = color ? { color } : undefined;

    return (
        <div className={classList}>
            {label && !compact && (
                <span className="number-stepper__label">{label}</span>
            )}

            <div className="number-stepper__control" onKeyDown={handleKeyDown} tabIndex={0}>
                <IconButton
                    icon="minus"
                    label="Decrease"
                    size={size === 'lg' ? 'md' : 'sm'}
                    variant="ghost"
                    disabled={disabled || !canDecrement}
                    onClick={handleDecrement}
                />

                <span className="number-stepper__value" style={valueStyle}>
                    {value}
                    {unit && <span className="number-stepper__unit">{unit}</span>}
                </span>

                <IconButton
                    icon="plus"
                    label="Increase"
                    size={size === 'lg' ? 'md' : 'sm'}
                    variant="ghost"
                    disabled={disabled || !canIncrement}
                    onClick={handleIncrement}
                />
            </div>

            {/* Show range indicator if min/max are set */}
            {(min !== undefined || max !== undefined) && !compact && (
                <span className="number-stepper__range">
                    {min ?? '...'} - {max ?? '...'}
                </span>
            )}
        </div>
    );
});

export default NumberStepper;
