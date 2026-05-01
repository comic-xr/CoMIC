/**
 * @file WindowLevelSection.jsx
 * @description Window/Level presets and sliders
 */

import React, { memo } from 'react';
import { WINDOW_LEVEL_PRESETS } from '../../constants';

/**
 * WindowLevelSection - Window/Level controls
 */
export const WindowLevelSection = memo(function WindowLevelSection({
  windowValue,
  levelValue,
  activePreset,
  onWindowChange,
  onLevelChange,
  onPresetSelect,
  disabled = false,
}) {
  return (
    <div className="window-level-section">
      {/* Preset Buttons */}
      <div className="window-level-section__presets">
        {WINDOW_LEVEL_PRESETS.map(preset => (
          <button
            key={preset.id}
            className={`window-level-section__preset ${activePreset === preset.id ? 'window-level-section__preset--active' : ''}`}
            onClick={() => onPresetSelect(preset.id, preset.window, preset.level)}
            disabled={disabled}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Window Slider */}
      <div className="window-level-section__slider-group">
        <div className="window-level-section__slider-header">
          <span className="window-level-section__slider-label">Window</span>
          <span className="window-level-section__slider-value">{windowValue}</span>
        </div>
        <input
          type="range"
          className="window-level-section__slider"
          min={1}
          max={4000}
          value={windowValue}
          onChange={(e) => onWindowChange(parseInt(e.target.value))}
          disabled={disabled}
        />
      </div>

      {/* Level Slider */}
      <div className="window-level-section__slider-group">
        <div className="window-level-section__slider-header">
          <span className="window-level-section__slider-label">Level</span>
          <span className="window-level-section__slider-value">{levelValue}</span>
        </div>
        <input
          type="range"
          className="window-level-section__slider"
          min={-1000}
          max={1000}
          value={levelValue}
          onChange={(e) => onLevelChange(parseInt(e.target.value))}
          disabled={disabled}
        />
      </div>
    </div>
  );
});

export default WindowLevelSection;
