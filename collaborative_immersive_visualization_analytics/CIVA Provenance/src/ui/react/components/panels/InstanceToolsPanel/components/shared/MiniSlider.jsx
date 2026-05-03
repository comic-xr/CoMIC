/**
 * @file MiniSlider.jsx
 * @description Compact inline slider for opacity and other values
 */

import React, { memo } from 'react';

/**
 * MiniSlider - Compact slider with value display
 */
export const MiniSlider = memo(function MiniSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  color = '#a855f7',
  showValue = true,
  disabled = false,
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="mini-slider">
      <input
        type="range"
        className="mini-slider__input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        style={{
          '--slider-color': color,
          '--slider-percent': `${percentage}%`,
        }}
      />
      {showValue && (
        <span className="mini-slider__value">{value}%</span>
      )}
    </div>
  );
});

export default MiniSlider;
