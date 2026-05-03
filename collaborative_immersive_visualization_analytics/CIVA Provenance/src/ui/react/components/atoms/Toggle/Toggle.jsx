// src/ui/react/components/atoms/Toggle/Toggle.jsx
// Toggle atom - switch/checkbox control

import React, { memo, useId } from 'react';
import { useAdaptive } from '@UI/react/context';
import './Toggle.scss';

/**
 * Toggle - Switch/checkbox control
 *
 * Use for:
 * - Boolean settings
 * - Feature toggles
 * - On/off switches
 *
 * @param {boolean} checked - Whether toggle is on
 * @param {function} onChange - Called with new boolean value
 * @param {string} size - Size: 'sm' | 'md'
 * @param {string} color - Accent color when checked
 * @param {boolean} disabled - Disable the toggle
 * @param {string} label - Optional label text
 * @param {string} labelPosition - Label position: 'left' | 'right'
 * @param {string} className - Additional CSS classes
 */
export const Toggle = memo(function Toggle({
    checked = false,
    onChange,
    size = 'md',
    color,
    disabled = false,
    label,
    labelPosition = 'right',
    className = '',
}) {
    const { isVR } = useAdaptive();
    const id = useId();

    const classList = [
        'toggle',
        `toggle--${size}`,
        checked && 'toggle--checked',
        disabled && 'toggle--disabled',
        isVR && 'toggle--vr',
        className,
    ].filter(Boolean).join(' ');

    const handleChange = () => {
        if (!disabled && onChange) {
            onChange(!checked);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleChange();
        }
    };

    const style = color && checked ? { '--toggle-active-color': color } : undefined;

    const toggle = (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-labelledby={label ? `${id}-label` : undefined}
            className={classList}
            onClick={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            style={style}
        >
            <span className="toggle__track">
                <span className="toggle__thumb" />
            </span>
        </button>
    );

    if (!label) {
        return toggle;
    }

    return (
        <div className={`toggle-wrapper toggle-wrapper--${labelPosition}`}>
            {labelPosition === 'left' && (
                <label id={`${id}-label`} className="toggle__label" onClick={handleChange}>
                    {label}
                </label>
            )}
            {toggle}
            {labelPosition === 'right' && (
                <label id={`${id}-label`} className="toggle__label" onClick={handleChange}>
                    {label}
                </label>
            )}
        </div>
    );
});

export default Toggle;
