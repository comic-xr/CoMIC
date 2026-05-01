/**
 * @file AppearanceSection.jsx
 * @description Appearance controls - opacity, representation, point size, line width
 */

import React, { memo } from 'react';
import { REPRESENTATIONS } from '../../constants';

/**
 * AppearanceSection - Opacity and representation controls
 */
export const AppearanceSection = memo(function AppearanceSection({
  opacity,
  representation,
  pointSize = 5,
  lineWidth = 2,
  onOpacityChange,
  onRepresentationChange,
  onPointSizeChange,
  onLineWidthChange,
  disabled = false,
}) {
  return (
    <div className="appearance-section">
      {/* Opacity Slider */}
      <div className="appearance-section__slider-row">
        <div className="appearance-section__slider-header">
          <span className="appearance-section__slider-label">Opacity</span>
          <span className="appearance-section__slider-value">{opacity}%</span>
        </div>
        <input
          type="range"
          className="appearance-section__slider"
          min={0}
          max={100}
          value={opacity}
          onChange={(e) => onOpacityChange(parseInt(e.target.value))}
          disabled={disabled}
          style={{ '--slider-percent': `${opacity}%` }}
        />
      </div>

      {/* Representation Buttons */}
      <div className="appearance-section__representations">
        {REPRESENTATIONS.map(rep => (
          <button
            key={rep.id}
            className={`appearance-section__representation ${representation === rep.id ? 'appearance-section__representation--active' : ''}`}
            onClick={() => onRepresentationChange(rep.id)}
            disabled={disabled}
          >
            {rep.label}
          </button>
        ))}
      </div>

      {/* Point Size Slider - shown when representation is 'points' */}
      {representation === 'points' && (
        <div className="appearance-section__slider-row">
          <div className="appearance-section__slider-header">
            <span className="appearance-section__slider-label">Point Size</span>
            <span className="appearance-section__slider-value">{pointSize}px</span>
          </div>
          <input
            type="range"
            className="appearance-section__slider"
            min={1}
            max={20}
            value={pointSize}
            onChange={(e) => onPointSizeChange?.(parseInt(e.target.value))}
            disabled={disabled}
            style={{ '--slider-percent': `${((pointSize - 1) / 19) * 100}%` }}
          />
        </div>
      )}

      {/* Line Width Slider - shown when representation is 'wireframe' */}
      {representation === 'wireframe' && (
        <div className="appearance-section__slider-row">
          <div className="appearance-section__slider-header">
            <span className="appearance-section__slider-label">Line Width</span>
            <span className="appearance-section__slider-value">{lineWidth}px</span>
          </div>
          <input
            type="range"
            className="appearance-section__slider"
            min={1}
            max={10}
            value={lineWidth}
            onChange={(e) => onLineWidthChange?.(parseInt(e.target.value))}
            disabled={disabled}
            style={{ '--slider-percent': `${((lineWidth - 1) / 9) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
});

export default AppearanceSection;
