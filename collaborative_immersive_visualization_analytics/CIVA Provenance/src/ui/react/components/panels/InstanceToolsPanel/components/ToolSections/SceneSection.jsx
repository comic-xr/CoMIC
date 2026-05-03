/**
 * @file SceneSection.jsx
 * @description Scene settings - Background, Grid, Axes, Orientation
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * Background presets
 */
const BACKGROUND_PRESETS = [
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'darkGradient', label: 'Dark Grad', icon: 'moon' },
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'scientific', label: 'Scientific', icon: 'flask' },
  { id: 'presentation', label: 'Present', icon: 'presentation' },
];

/**
 * Grid plane options
 */
const GRID_PLANES = [
  { id: 'xz', label: 'XZ (Floor)' },
  { id: 'xy', label: 'XY (Front)' },
  { id: 'yz', label: 'YZ (Side)' },
];

/**
 * ToggleRow - Simple toggle with label
 */
const ToggleRow = memo(function ToggleRow({
  icon,
  label,
  active,
  disabled,
  onToggle,
  children,
}) {
  return (
    <div className="scene-section__toggle-row">
      <button
        className={`scene-section__toggle-btn ${active ? 'scene-section__toggle-btn--active' : ''}`}
        onClick={onToggle}
        disabled={disabled}
      >
        <Icon name={icon} size={14} />
        <span>{label}</span>
        <span className={`scene-section__toggle-indicator ${active ? 'scene-section__toggle-indicator--on' : ''}`} />
      </button>
      {active && children && (
        <div className="scene-section__toggle-options">
          {children}
        </div>
      )}
    </div>
  );
});

/**
 * SceneSection - Scene visualization settings
 */
export const SceneSection = memo(function SceneSection({
  // Background
  backgroundPreset = 'dark',
  onBackgroundChange,
  // Grid
  showGrid = false,
  gridPlane = 'xz',
  onToggleGrid,
  onGridPlaneChange,
  // Axes
  showAxes = false,
  onToggleAxes,
  // Orientation
  showOrientation = true,
  onToggleOrientation,
  // General
  disabled = false,
}) {
  return (
    <div className="scene-section">
      {/* Background Presets */}
      <div className="scene-section__group">
        <div className="scene-section__group-label">Background</div>
        <div className="scene-section__btn-row">
          {BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.id}
              className={`scene-section__preset-btn ${backgroundPreset === preset.id ? 'scene-section__preset-btn--active' : ''}`}
              onClick={() => onBackgroundChange?.(preset.id)}
              disabled={disabled}
              title={preset.label}
            >
              <Icon name={preset.icon} size={12} />
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scene Helpers */}
      <div className="scene-section__group">
        <div className="scene-section__group-label">Scene Helpers</div>

        {/* Orientation Cube */}
        <ToggleRow
          icon="compass"
          label="Orientation Cube"
          active={showOrientation}
          disabled={disabled}
          onToggle={onToggleOrientation}
        />

        {/* Grid */}
        <ToggleRow
          icon="grid"
          label="Grid"
          active={showGrid}
          disabled={disabled}
          onToggle={onToggleGrid}
        >
          <div className="scene-section__plane-btns">
            {GRID_PLANES.map((plane) => (
              <button
                key={plane.id}
                className={`scene-section__plane-btn ${gridPlane === plane.id ? 'scene-section__plane-btn--active' : ''}`}
                onClick={() => onGridPlaneChange?.(plane.id)}
                disabled={disabled}
              >
                {plane.label}
              </button>
            ))}
          </div>
        </ToggleRow>

        {/* Data Axes */}
        <ToggleRow
          icon="move3d"
          label="Data Axes"
          active={showAxes}
          disabled={disabled}
          onToggle={onToggleAxes}
        />
      </div>
    </div>
  );
});

export default SceneSection;
