/**
 * Slider Component
 *
 * Range slider that adapts for VR/desktop modes.
 */
import React, { useRef, useCallback } from 'react';
import { useAdaptive } from '@UI/react/context';
import './Slider.scss';

export const Slider = ({
    value = 0,
    min = 0,
    max = 100,
    step = 1,
    onChange,
    label,
    showValue = true,
    valueFormatter = (v) => v,
    disabled = false,
    className = '',
    ...props
}) => {
    const { tokens, mode } = useAdaptive();
    const trackRef = useRef(null);

    // Scale sizes based on mode
    const trackHeight = mode === 'vr' ? 12 : 6;
    const thumbSize = mode === 'vr' ? 32 : 18;

    const percentage = ((value - min) / (max - min)) * 100;

    const sliderStyle = {
        '--track-height': `${trackHeight}px`,
        '--thumb-size': `${thumbSize}px`,
        '--fill-percentage': `${percentage}%`,
        '--label-font-size': `${tokens.fontSize}px`,
        '--gap': `${tokens.gap}px`,
    };

    const handleChange = useCallback((e) => {
        if (onChange && !disabled) {
            onChange(parseFloat(e.target.value));
        }
    }, [onChange, disabled]);

    return (
        <div
            className={`slider slider--${mode} ${disabled ? 'slider--disabled' : ''} ${className}`.trim()}
            style={sliderStyle}
        >
            {(label || showValue) && (
                <div className="slider__header">
                    {label && <span className="slider__label">{label}</span>}
                    {showValue && (
                        <span className="slider__value">{valueFormatter(value)}</span>
                    )}
                </div>
            )}
            <div className="slider__track-wrapper" ref={trackRef}>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={handleChange}
                    disabled={disabled}
                    className="slider__input"
                    {...props}
                />
                <div className="slider__track">
                    <div className="slider__fill" />
                </div>
            </div>
        </div>
    );
};

export default Slider;
