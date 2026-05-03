/**
 * @file SliceSection.jsx
 * @description Slice orientation and position controls
 */

import React, { memo } from 'react';
import { SLICE_ORIENTATIONS } from '../../constants';

/**
 * SliceSection - Slice orientation and position controls
 */
export const SliceSection = memo(function SliceSection({
  orientation,
  position,
  maxPosition = 256,
  onOrientationChange,
  onPositionChange,
  disabled = false,
}) {
  const percentage = (position / maxPosition) * 100;

  return (
    <div className="slice-section">
      {/* Orientation Buttons */}
      <div className="slice-section__orientations">
        {SLICE_ORIENTATIONS.map(orient => (
          <button
            key={orient.id}
            className={`slice-section__orientation ${orientation === orient.id ? 'slice-section__orientation--active' : ''}`}
            onClick={() => onOrientationChange(orient.id)}
            disabled={disabled}
          >
            {orient.label}
          </button>
        ))}
      </div>

      {/* Position Slider */}
      <div className="slice-section__position">
        <div className="slice-section__position-header">
          <span className="slice-section__position-label">Slice Position</span>
          <span className="slice-section__position-value">{position} / {maxPosition}</span>
        </div>
        <input
          type="range"
          className="slice-section__slider"
          min={0}
          max={maxPosition}
          value={position}
          onChange={(e) => onPositionChange(parseInt(e.target.value))}
          disabled={disabled}
          style={{ '--slider-percent': `${percentage}%` }}
        />
      </div>
    </div>
  );
});

export default SliceSection;
