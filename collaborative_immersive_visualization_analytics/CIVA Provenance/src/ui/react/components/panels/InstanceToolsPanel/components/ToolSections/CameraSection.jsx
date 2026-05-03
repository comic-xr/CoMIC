/**
 * @file CameraSection.jsx
 * @description Enhanced camera section with animated transitions, reset point, and animation presets
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import {
  CAMERA_PRESETS,
  EASING_OPTIONS,
  ANIMATION_PRESETS,
  CAMERA_ANIMATION_DEFAULTS,
} from '../../constants';

// =============================================================================
// TOGGLE SWITCH
// =============================================================================

const ToggleSwitch = memo(function ToggleSwitch({ checked, onChange, size = 'sm' }) {
  const sizes = {
    sm: { width: 32, height: 16, knob: 12 },
    md: { width: 40, height: 20, knob: 16 },
  };
  const s = sizes[size];

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`camera-section__toggle ${checked ? 'camera-section__toggle--active' : ''}`}
      style={{
        width: s.width,
        height: s.height,
        '--knob-size': `${s.knob}px`,
        '--knob-offset': checked ? `${s.width - s.knob - 2}px` : '2px',
      }}
    >
      <div className="camera-section__toggle-knob" />
    </button>
  );
});

// =============================================================================
// STANDARD VIEWS GRID
// =============================================================================

const StandardViewsGrid = memo(function StandardViewsGrid({
  onSelectView,
  isAnimating,
  disabled = false,
}) {
  return (
    <div className="camera-section__grid">
      {CAMERA_PRESETS.map((preset, index) => {
        if (!preset) {
          return <div key={index} className="camera-section__cell camera-section__cell--empty" />;
        }

        return (
          <button
            key={preset.id}
            className={`camera-section__cell ${preset.special ? 'camera-section__cell--special' : ''}`}
            onClick={() => onSelectView?.(preset.id)}
            disabled={disabled || isAnimating}
            title={preset.label}
          >
            <Icon name={preset.icon} size={14} />
            <span>{preset.label}</span>
          </button>
        );
      })}
    </div>
  );
});

// =============================================================================
// ANIMATION SETTINGS
// =============================================================================

const AnimationSettings = memo(function AnimationSettings({
  animateTransitions,
  setAnimateTransitions,
  duration,
  setDuration,
  easing,
  setEasing,
  expanded,
  setExpanded,
}) {
  const durationPercent = ((duration - 100) / (2000 - 100)) * 100;

  return (
    <div className="camera-section__animation-settings">
      {/* Toggle Row */}
      <div className="camera-section__animation-toggle-row">
        <div className="camera-section__animation-toggle-left">
          <ToggleSwitch checked={animateTransitions} onChange={setAnimateTransitions} />
          <span className="camera-section__animation-label">Animate</span>
        </div>

        {animateTransitions && (
          <button
            className={`camera-section__expand-btn ${expanded ? 'camera-section__expand-btn--active' : ''}`}
            onClick={() => setExpanded(!expanded)}
          >
            <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={10} />
            <span>{expanded ? 'Less' : 'More'}</span>
          </button>
        )}
      </div>

      {/* Expanded Settings */}
      {animateTransitions && expanded && (
        <div className="camera-section__animation-expanded">
          {/* Duration */}
          <div className="camera-section__animation-duration">
            <div className="camera-section__animation-duration-header">
              <span className="camera-section__animation-duration-label">Duration</span>
              <span className="camera-section__animation-duration-value">{duration}ms</span>
            </div>
            <input
              type="range"
              className="camera-section__animation-slider"
              min={100}
              max={2000}
              step={100}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{ '--slider-percent': `${durationPercent}%` }}
            />
          </div>

          {/* Easing */}
          <div className="camera-section__animation-easing">
            <span className="camera-section__animation-easing-label">Easing</span>
            <div className="camera-section__easing-options">
              {EASING_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  className={`camera-section__easing-btn ${easing === opt.id ? 'camera-section__easing-btn--active' : ''}`}
                  onClick={() => setEasing(opt.id)}
                  title={opt.label}
                >
                  <Icon name={opt.icon} size={10} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// SET RESET POINT BUTTON
// =============================================================================

const SetResetPointButton = memo(function SetResetPointButton({
  onSetResetPoint,
  hasCustomResetPoint,
  onClearResetPoint,
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (!showConfirm) {
    return (
      <button
        className={`camera-section__reset-point-btn ${hasCustomResetPoint ? 'camera-section__reset-point-btn--set' : ''}`}
        onClick={() => setShowConfirm(true)}
      >
        <Icon name="mapPin" size={12} />
        <span>
          {hasCustomResetPoint ? 'Reset Point Set (click to change)' : 'Set Current as Reset Point'}
        </span>
      </button>
    );
  }

  return (
    <div className="camera-section__reset-point-confirm">
      <div className="camera-section__reset-point-message">
        Set current camera position as the new reset point?
      </div>
      <div className="camera-section__reset-point-actions">
        <button
          className="camera-section__reset-point-confirm-btn"
          onClick={() => {
            onSetResetPoint();
            setShowConfirm(false);
          }}
        >
          <Icon name="check" size={12} />
          Set Reset Point
        </button>
        <button
          className="camera-section__reset-point-cancel-btn"
          onClick={() => setShowConfirm(false)}
        >
          Cancel
        </button>
        {hasCustomResetPoint && (
          <button
            className="camera-section__reset-point-clear-btn"
            onClick={() => {
              onClearResetPoint?.();
              setShowConfirm(false);
            }}
            title="Clear custom reset point"
          >
            <Icon name="x" size={12} />
          </button>
        )}
      </div>
    </div>
  );
});

// =============================================================================
// ANIMATION PRESETS
// =============================================================================

const AnimationPresetsSection = memo(function AnimationPresetsSection({
  activeAnimation,
  onStartAnimation,
  onStopAnimation,
  disabled = false,
}) {
  return (
    <div className="camera-section__presets">
      <div className="camera-section__presets-label">ANIMATION PRESETS</div>
      <div className="camera-section__presets-grid">
        {ANIMATION_PRESETS.map((preset) => {
          const isActive = activeAnimation === preset.id;
          return (
            <button
              key={preset.id}
              className={`camera-section__preset-btn ${isActive ? 'camera-section__preset-btn--active' : ''}`}
              onClick={() => (isActive ? onStopAnimation() : onStartAnimation(preset.id))}
              disabled={disabled || (activeAnimation && !isActive)}
              title={preset.description}
            >
              <Icon name={isActive ? 'square' : preset.icon} size={14} />
              <span>{isActive ? 'Stop' : preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

// =============================================================================
// CAMERA SLIDER (unchanged from before)
// =============================================================================

const CameraSlider = memo(function CameraSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled,
  color = 'cyan',
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="camera-section__slider-row">
      <div className="camera-section__slider-header">
        <span className="camera-section__slider-label">{label}</span>
        <span className={`camera-section__slider-value camera-section__slider-value--${color}`}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
      </div>
      <input
        type="range"
        className={`camera-section__slider camera-section__slider--${color}`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        style={{ '--slider-percent': `${percentage}%` }}
      />
    </div>
  );
});

// =============================================================================
// CAMERA TRANSFORM SUBSECTION
// =============================================================================

const CameraTransformSubsection = memo(function CameraTransformSubsection({
  cameraState,
  onCameraPositionChange,
  onCameraFocalPointChange,
  onCameraViewAngleChange,
  onReset,
  expanded,
  onToggleExpanded,
  disabled = false,
}) {
  const { position = [0, 0, 0], focalPoint = [0, 0, 0], viewAngle = 30 } = cameraState || {};

  return (
    <div className="camera-section__subsection">
      <div className="camera-section__subsection-row">
        <button
          className={`camera-section__subsection-header ${expanded ? 'camera-section__subsection-header--expanded' : ''}`}
          onClick={onToggleExpanded}
        >
          <Icon
            name="chevronRight"
            size={10}
            className={`camera-section__subsection-chevron ${expanded ? 'camera-section__subsection-chevron--expanded' : ''}`}
          />
          <Icon name="video" size={12} className="camera-section__subsection-icon" />
          <span>Camera Transform</span>
        </button>
        <button
          className="camera-section__reset-btn"
          onClick={onReset}
          disabled={disabled}
          title="Reset camera"
        >
          <Icon name="refreshCcw" size={12} />
        </button>
      </div>

      {expanded && (
        <div className="camera-section__subsection-content">
          {/* Camera Position */}
          <div className="camera-section__group">
            <div className="camera-section__group-label">Position</div>
            <CameraSlider
              label="X"
              value={position[0]}
              min={-1000}
              max={1000}
              step={1}
              onChange={(v) => onCameraPositionChange?.('x', v)}
              disabled={disabled}
              color="red"
            />
            <CameraSlider
              label="Y"
              value={position[1]}
              min={-1000}
              max={1000}
              step={1}
              onChange={(v) => onCameraPositionChange?.('y', v)}
              disabled={disabled}
              color="green"
            />
            <CameraSlider
              label="Z"
              value={position[2]}
              min={-1000}
              max={1000}
              step={1}
              onChange={(v) => onCameraPositionChange?.('z', v)}
              disabled={disabled}
              color="blue"
            />
          </div>

          {/* Focal Point */}
          <div className="camera-section__group">
            <div className="camera-section__group-label">Focal Point</div>
            <CameraSlider
              label="X"
              value={focalPoint[0]}
              min={-500}
              max={500}
              step={1}
              onChange={(v) => onCameraFocalPointChange?.('x', v)}
              disabled={disabled}
              color="red"
            />
            <CameraSlider
              label="Y"
              value={focalPoint[1]}
              min={-500}
              max={500}
              step={1}
              onChange={(v) => onCameraFocalPointChange?.('y', v)}
              disabled={disabled}
              color="green"
            />
            <CameraSlider
              label="Z"
              value={focalPoint[2]}
              min={-500}
              max={500}
              step={1}
              onChange={(v) => onCameraFocalPointChange?.('z', v)}
              disabled={disabled}
              color="blue"
            />
          </div>

          {/* View Angle */}
          <div className="camera-section__group">
            <div className="camera-section__group-label">View</div>
            <CameraSlider
              label="Angle"
              value={viewAngle}
              min={1}
              max={120}
              step={1}
              onChange={(v) => onCameraViewAngleChange?.(v)}
              disabled={disabled}
              color="cyan"
            />
          </div>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// SAVED CAMERA STATES
// =============================================================================

const SavedCameraStates = memo(function SavedCameraStates({
  savedStates = [],
  onSave,
  onRestore,
  onDelete,
  expanded,
  onToggleExpanded,
  disabled = false,
}) {
  return (
    <div className="camera-section__subsection">
      <div className="camera-section__saved-header">
        <button
          className={`camera-section__subsection-header ${expanded ? 'camera-section__subsection-header--expanded' : ''}`}
          onClick={onToggleExpanded}
        >
          <Icon
            name="chevronRight"
            size={10}
            className={`camera-section__subsection-chevron ${expanded ? 'camera-section__subsection-chevron--expanded' : ''}`}
          />
          <Icon name="bookmark" size={12} className="camera-section__subsection-icon" />
          <span>Saved Views ({savedStates.length}/5)</span>
        </button>
        <button
          className="camera-section__save-btn"
          onClick={onSave}
          disabled={disabled || savedStates.length >= 5}
          title="Save current view"
        >
          <Icon name="plus" size={12} />
        </button>
      </div>

      {expanded && (
        <div className="camera-section__saved-list">
          {savedStates.length === 0 ? (
            <div className="camera-section__saved-empty">
              No saved views. Click + to save current view.
            </div>
          ) : (
            savedStates.map((state) => (
              <div key={state.id} className="camera-section__saved-item">
                <button
                  className="camera-section__saved-restore"
                  onClick={() => onRestore(state)}
                  title={`Restore ${state.name}`}
                >
                  <Icon name="image" size={12} />
                  <span className="camera-section__saved-name">{state.name}</span>
                  <span className="camera-section__saved-time">{state.timestamp}</span>
                </button>
                <button
                  className="camera-section__saved-delete"
                  onClick={() => onDelete(state.id)}
                  title="Delete saved view"
                >
                  <Icon name="x" size={10} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
});

// =============================================================================
// CAMERA SECTION (MAIN COMPONENT)
// =============================================================================

/**
 * CameraSection - Enhanced camera controls with animations
 */
export const CameraSection = memo(function CameraSection({
  // View selection
  onPresetClick,
  onAnimatedPresetClick, // New: animated version

  // Camera transform
  cameraState,
  cameraTransformExpanded,
  onToggleCameraTransform,
  onCameraPositionChange,
  onCameraFocalPointChange,
  onCameraViewAngleChange,

  // Saved views
  savedCameraStates = [],
  savedStatesExpanded,
  onToggleSavedStates,
  onSaveCameraState,
  onRestoreCameraState,
  onDeleteCameraState,

  // Animation
  animationSettings,
  onAnimationSettingsChange,
  isAnimating = false,
  activeAnimation = null,
  onStartAnimation,
  onStopAnimation,

  // Reset point
  hasCustomResetPoint = false,
  onSetResetPoint,
  onClearResetPoint,

  // General
  disabled = false,
}) {
  // Local animation settings state (if not controlled externally)
  const [localAnimSettings, setLocalAnimSettings] = useState({
    enabled: CAMERA_ANIMATION_DEFAULTS.enabled,
    duration: CAMERA_ANIMATION_DEFAULTS.duration,
    easing: CAMERA_ANIMATION_DEFAULTS.easing,
    expanded: false,
  });

  // Use external or local animation settings
  const animSettings = animationSettings || localAnimSettings;
  const setAnimSettings = onAnimationSettingsChange || setLocalAnimSettings;

  // Local saved states expanded state
  const [localSavedExpanded, setLocalSavedExpanded] = useState(false);
  const handleToggleSavedStates = onToggleSavedStates || (() => setLocalSavedExpanded((prev) => !prev));
  const isSavedExpanded = savedStatesExpanded !== undefined ? savedStatesExpanded : localSavedExpanded;

  // Handle view selection (with or without animation)
  const handleSelectView = useCallback(
    (viewId) => {
      if (animSettings.enabled && onAnimatedPresetClick) {
        onAnimatedPresetClick(viewId, {
          duration: animSettings.duration,
          easing: animSettings.easing,
        });
      } else if (onPresetClick) {
        onPresetClick(viewId);
      }
    },
    [animSettings, onAnimatedPresetClick, onPresetClick]
  );

  return (
    <div className="camera-section">
      {/* Section Label */}
      <div className="camera-section__section-label">STANDARD VIEWS</div>

      {/* Standard Views Grid */}
      <StandardViewsGrid
        onSelectView={handleSelectView}
        isAnimating={isAnimating}
        disabled={disabled}
      />

      {/* Animation Settings */}
      <AnimationSettings
        animateTransitions={animSettings.enabled}
        setAnimateTransitions={(enabled) => setAnimSettings({ ...animSettings, enabled })}
        duration={animSettings.duration}
        setDuration={(duration) => setAnimSettings({ ...animSettings, duration })}
        easing={animSettings.easing}
        setEasing={(easing) => setAnimSettings({ ...animSettings, easing })}
        expanded={animSettings.expanded}
        setExpanded={(expanded) => setAnimSettings({ ...animSettings, expanded })}
      />

      {/* Set Reset Point */}
      {onSetResetPoint && (
        <SetResetPointButton
          onSetResetPoint={onSetResetPoint}
          hasCustomResetPoint={hasCustomResetPoint}
          onClearResetPoint={onClearResetPoint}
        />
      )}

      {/* Animation Presets */}
      {(onStartAnimation || onStopAnimation) && (
        <AnimationPresetsSection
          activeAnimation={activeAnimation}
          onStartAnimation={onStartAnimation}
          onStopAnimation={onStopAnimation}
          disabled={disabled}
        />
      )}

      {/* Saved Camera States */}
      <SavedCameraStates
        savedStates={savedCameraStates}
        onSave={onSaveCameraState}
        onRestore={onRestoreCameraState}
        onDelete={onDeleteCameraState}
        expanded={isSavedExpanded}
        onToggleExpanded={handleToggleSavedStates}
        disabled={disabled}
      />

      {/* Camera Transform Subsection */}
      <CameraTransformSubsection
        cameraState={cameraState}
        onCameraPositionChange={onCameraPositionChange}
        onCameraFocalPointChange={onCameraFocalPointChange}
        onCameraViewAngleChange={onCameraViewAngleChange}
        onReset={() => handleSelectView('reset')}
        expanded={cameraTransformExpanded}
        onToggleExpanded={onToggleCameraTransform}
        disabled={disabled}
      />
    </div>
  );
});

export default CameraSection;
