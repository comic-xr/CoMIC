/**
 * @file WidgetsSection.jsx
 * @description Measurement widgets section - Line, Angle, Clipping Plane
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * WidgetButton - Individual widget toggle button
 */
const WidgetButton = memo(function WidgetButton({
  icon,
  label,
  description,
  active,
  disabled,
  onClick,
}) {
  return (
    <button
      className={`widgets-section__btn ${active ? 'widgets-section__btn--active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={description}
    >
      <Icon name={icon} size={16} />
      <span className="widgets-section__btn-label">{label}</span>
      {active && (
        <span className="widgets-section__btn-indicator">
          <Icon name="check" size={10} />
        </span>
      )}
    </button>
  );
});

/**
 * WidgetsSection - Measurement and manipulation widgets
 */
export const WidgetsSection = memo(function WidgetsSection({
  lineActive = false,
  angleActive = false,
  planeActive = false,
  disabled = false,
  onToggleLine,
  onToggleAngle,
  onTogglePlane,
  onClearAll,
}) {
  const hasActiveWidgets = lineActive || angleActive || planeActive;

  return (
    <div className="widgets-section">
      {/* Widget Buttons */}
      <div className="widgets-section__grid">
        <WidgetButton
          icon="ruler"
          label="Line"
          description="Measure distance between two points"
          active={lineActive}
          disabled={disabled}
          onClick={onToggleLine}
        />
        <WidgetButton
          icon="triangle"
          label="Angle"
          description="Measure angle between three points"
          active={angleActive}
          disabled={disabled}
          onClick={onToggleAngle}
        />
        <WidgetButton
          icon="scissors"
          label="Clip"
          description="Clipping plane to cut data"
          active={planeActive}
          disabled={disabled}
          onClick={onTogglePlane}
        />
      </div>

      {/* Clear All Button */}
      {hasActiveWidgets && (
        <button
          className="widgets-section__clear-btn"
          onClick={onClearAll}
          disabled={disabled}
        >
          <Icon name="x" size={12} />
          <span>Clear All</span>
        </button>
      )}

      {/* Help Text */}
      <div className="widgets-section__help">
        <Icon name="info" size={10} />
        <span>Click to toggle widgets, interact in viewport</span>
      </div>
    </div>
  );
});

export default WidgetsSection;
