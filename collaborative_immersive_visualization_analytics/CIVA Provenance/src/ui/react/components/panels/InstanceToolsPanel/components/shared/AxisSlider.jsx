/**
 * @file AxisSlider.jsx
 * @description Reusable X/Y/Z axis slider with colored indicator
 */

import React, { memo } from 'react';

const AXIS_COLORS = {
  X: '#ef4444', // red
  Y: '#22c55e', // green
  Z: '#3b82f6', // blue
  Uniform: '#a855f7', // purple
};

/**
 * AxisSlider - Slider for a single axis with label and value display
 */
export const AxisSlider = memo(function AxisSlider({
  axis,
  value,
  onChange,
  min = -100,
  max = 100,
  step = 1,
  unit = '',
  color,
  disabled = false,
}) {
  const axisColor = color || AXIS_COLORS[axis] || AXIS_COLORS.X;
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="axis-slider">
      <div className="axis-slider__header">
        <span
          className="axis-slider__label"
          style={{ color: axisColor }}
        >
          {axis}
        </span>
        <span
          className="axis-slider__value"
          style={{ color: axisColor }}
        >
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        className="axis-slider__input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        style={{
          '--slider-color': axisColor,
          '--slider-percent': `${percentage}%`,
        }}
      />
    </div>
  );
});

export default AxisSlider;
