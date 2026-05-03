/**
 * @file DisplayTab.jsx
 * @description Display tab with Scene Overlays, Window/Level, and Appearance sections
 *
 * Features:
 * - Scene Overlays: Toggle and configure orientation, grid, axes, scalebar, coordinates, FPS
 * - Window/Level: Presets and sliders for medical imaging
 * - Appearance: Render mode, color map, opacity
 */

import React, { memo, useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import {
  OVERLAY_DEFAULTS,
  OVERLAY_CONFIG,
  ORIENTATION_STYLES,
  SIZE_PRESETS,
  GRID_PLANES,
  SCALEBAR_STYLES,
  WINDOW_LEVEL_PRESETS,
  RENDER_MODES,
  COLOR_MAPS,
  POSITION_GRID,
} from '../../constants';

// =============================================================================
// SHARED COMPONENTS
// =============================================================================

const SectionHeader = memo(function SectionHeader({
  icon,
  label,
  color,
  isExpanded,
  onToggle,
  badge,
}) {
  return (
    <button className={`display-tab__section-header ${isExpanded ? 'display-tab__section-header--expanded' : ''}`} onClick={onToggle} data-color={color}>
      <Icon name={isExpanded ? 'chevronDown' : 'chevronRight'} size={10} className="display-tab__section-chevron" />
      <Icon name={icon} size={14} className="display-tab__section-icon" />
      <span className="display-tab__section-label">{label}</span>
      {badge && <span className={`display-tab__section-badge display-tab__section-badge--${color}`}>{badge}</span>}
    </button>
  );
});

// =============================================================================
// POSITION GRID (9-point)
// =============================================================================

const PositionGridPicker = memo(function PositionGridPicker({ value, onChange, allowedPositions = null }) {
  return (
    <div className="display-tab__position-grid">
      {POSITION_GRID.flat().map((pos) => {
        const isSelected = value === pos;
        const isAllowed = !allowedPositions || allowedPositions.includes(pos);
        const isCenter = pos === 'CENTER';

        return (
          <button
            key={pos}
            className={`display-tab__position-cell ${isSelected ? 'display-tab__position-cell--selected' : ''} ${isCenter ? 'display-tab__position-cell--center' : ''}`}
            onClick={() => isAllowed && onChange(pos)}
            disabled={!isAllowed}
          >
            {isSelected && <div className="display-tab__position-dot" />}
          </button>
        );
      })}
    </div>
  );
});

// =============================================================================
// SIZE CONTROL (Tri-tier)
// =============================================================================

const SizeControl = memo(function SizeControl({
  preset,
  percent,
  pixels,
  onPresetChange,
  onPercentChange,
  onPixelsChange,
}) {
  const handlePresetClick = (p) => {
    onPresetChange(p.id);
    onPercentChange(p.percent);
    onPixelsChange(p.pixels);
  };

  return (
    <div className="display-tab__size-control">
      {/* Presets */}
      <div className="display-tab__size-presets">
        <div className="display-tab__control-label">Size Presets</div>
        <div className="display-tab__size-preset-row">
          {SIZE_PRESETS.map((p) => (
            <button
              key={p.id}
              className={`display-tab__size-preset-btn ${preset === p.id ? 'display-tab__size-preset-btn--active' : ''}`}
              onClick={() => handlePresetClick(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Percent slider */}
      <div className="display-tab__slider-group">
        <div className="display-tab__slider-header">
          <span className="display-tab__control-label">Viewport %</span>
          <span className="display-tab__slider-value display-tab__slider-value--purple">{percent}%</span>
        </div>
        <input
          type="range"
          className="display-tab__slider display-tab__slider--purple"
          min={5}
          max={25}
          value={percent}
          onChange={(e) => {
            onPercentChange(parseInt(e.target.value, 10));
            onPresetChange(null);
          }}
          style={{ '--slider-percent': `${((percent - 5) / 20) * 100}%` }}
        />
      </div>

      {/* Pixels slider */}
      <div className="display-tab__slider-group">
        <div className="display-tab__slider-header">
          <span className="display-tab__control-label">Fine (px)</span>
          <span className="display-tab__slider-value display-tab__slider-value--cyan">{pixels}px</span>
        </div>
        <input
          type="range"
          className="display-tab__slider display-tab__slider--cyan"
          min={30}
          max={200}
          value={pixels}
          onChange={(e) => {
            onPixelsChange(parseInt(e.target.value, 10));
            onPresetChange(null);
          }}
          style={{ '--slider-percent': `${((pixels - 30) / 170) * 100}%` }}
        />
      </div>
    </div>
  );
});

// =============================================================================
// OVERLAY TOGGLE CHIP
// =============================================================================

const OverlayToggle = memo(function OverlayToggle({
  config,
  overlayConfig,
  isActive,
  hasSettingsOpen,
  onToggle,
  onSettingsClick,
}) {
  const activeLabel = isActive && overlayConfig.getActiveLabel ? overlayConfig.getActiveLabel(config) : null;

  return (
    <div className="display-tab__overlay-toggle">
      <button
        className={`display-tab__overlay-btn ${isActive ? 'display-tab__overlay-btn--active' : ''}`}
        onClick={onToggle}
        title={`${overlayConfig.name} (${overlayConfig.shortcut})`}
      >
        <Icon name={overlayConfig.icon} size={11} />
        <span>{overlayConfig.name}</span>
        {activeLabel && <span className="display-tab__overlay-label">{activeLabel}</span>}
      </button>
      {overlayConfig.hasSettings && (
        <button
          className={`display-tab__overlay-settings-btn ${hasSettingsOpen ? 'display-tab__overlay-settings-btn--open' : ''}`}
          onClick={onSettingsClick}
          disabled={!isActive}
        >
          <Icon name={hasSettingsOpen ? 'chevronUp' : 'chevronDown'} size={8} />
        </button>
      )}
    </div>
  );
});

// =============================================================================
// SETTINGS PANELS
// =============================================================================

const OrientationSettings = memo(function OrientationSettings({ config, onChange, onReset }) {
  return (
    <div className="display-tab__settings-panel">
      {/* Style selector */}
      <div className="display-tab__setting-group">
        <div className="display-tab__control-label">Style</div>
        <div className="display-tab__btn-row">
          {ORIENTATION_STYLES.map((s) => (
            <button
              key={s.id}
              className={`display-tab__option-btn ${config.style === s.id ? 'display-tab__option-btn--active' : ''}`}
              onClick={() => onChange({ ...config, style: s.id })}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="display-tab__setting-row">
        {/* Position grid */}
        <div className="display-tab__setting-group">
          <div className="display-tab__control-label">Position</div>
          <PositionGridPicker value={config.position} onChange={(pos) => onChange({ ...config, position: pos })} />
        </div>

        {/* Size control */}
        <div className="display-tab__setting-group display-tab__setting-group--flex">
          <SizeControl
            preset={config.sizePreset}
            percent={config.sizePercent}
            pixels={config.sizePixels}
            onPresetChange={(val) => onChange({ ...config, sizePreset: val })}
            onPercentChange={(val) => onChange({ ...config, sizePercent: val })}
            onPixelsChange={(val) => onChange({ ...config, sizePixels: val })}
          />
        </div>
      </div>

      <button className="display-tab__reset-btn" onClick={onReset}>
        <Icon name="refreshCcw" size={10} />
        Reset
      </button>
    </div>
  );
});

const GridSettings = memo(function GridSettings({ config, onChange, onReset }) {
  return (
    <div className="display-tab__settings-panel">
      {/* Plane selector */}
      <div className="display-tab__setting-group">
        <div className="display-tab__control-label">Plane</div>
        <div className="display-tab__btn-row">
          {GRID_PLANES.map((p) => (
            <button
              key={p.id}
              className={`display-tab__option-btn ${config.plane === p.id ? 'display-tab__option-btn--active' : ''}`}
              onClick={() => onChange({ ...config, plane: p.id })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="display-tab__setting-row">
        {/* Divisions slider */}
        <div className="display-tab__slider-group display-tab__slider-group--half">
          <div className="display-tab__slider-header">
            <span className="display-tab__control-label">Divisions</span>
            <span className="display-tab__slider-value display-tab__slider-value--teal">{config.divisions}</span>
          </div>
          <input
            type="range"
            className="display-tab__slider display-tab__slider--teal"
            min={2}
            max={20}
            value={config.divisions}
            onChange={(e) => onChange({ ...config, divisions: parseInt(e.target.value, 10) })}
            style={{ '--slider-percent': `${((config.divisions - 2) / 18) * 100}%` }}
          />
        </div>

        {/* Opacity slider */}
        <div className="display-tab__slider-group display-tab__slider-group--half">
          <div className="display-tab__slider-header">
            <span className="display-tab__control-label">Opacity</span>
            <span className="display-tab__slider-value display-tab__slider-value--teal">{config.opacity}%</span>
          </div>
          <input
            type="range"
            className="display-tab__slider display-tab__slider--teal"
            min={10}
            max={100}
            value={config.opacity}
            onChange={(e) => onChange({ ...config, opacity: parseInt(e.target.value, 10) })}
            style={{ '--slider-percent': `${((config.opacity - 10) / 90) * 100}%` }}
          />
        </div>
      </div>

      <button className="display-tab__reset-btn" onClick={onReset}>
        <Icon name="refreshCcw" size={10} />
        Reset
      </button>
    </div>
  );
});

const ScaleBarSettings = memo(function ScaleBarSettings({ config, onChange, onReset }) {
  return (
    <div className="display-tab__settings-panel">
      <div className="display-tab__setting-row">
        {/* Style */}
        <div className="display-tab__setting-group">
          <div className="display-tab__control-label">Style</div>
          <div className="display-tab__btn-row display-tab__btn-row--wrap">
            {SCALEBAR_STYLES.map((s) => (
              <button
                key={s.id}
                className={`display-tab__option-btn display-tab__option-btn--sm ${config.style === s.id ? 'display-tab__option-btn--active' : ''}`}
                onClick={() => onChange({ ...config, style: s.id })}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Orientation */}
        <div className="display-tab__setting-group">
          <div className="display-tab__control-label">Orientation</div>
          <div className="display-tab__btn-row">
            {['H', 'V'].map((o) => (
              <button
                key={o}
                className={`display-tab__option-btn ${config.orientation === (o === 'H' ? 'horizontal' : 'vertical') ? 'display-tab__option-btn--active' : ''}`}
                onClick={() => onChange({ ...config, orientation: o === 'H' ? 'horizontal' : 'vertical' })}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="display-tab__setting-row">
        {/* Behavior */}
        <div className="display-tab__setting-group">
          <div className="display-tab__control-label">Behavior</div>
          <div className="display-tab__btn-row">
            {[{ id: 'auto', name: 'Auto' }, { id: 'fixed', name: 'Fixed' }].map((b) => (
              <button
                key={b.id}
                className={`display-tab__option-btn ${config.behavior === b.id ? 'display-tab__option-btn--active' : ''}`}
                onClick={() => onChange({ ...config, behavior: b.id })}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        {/* Units */}
        <div className="display-tab__setting-group">
          <div className="display-tab__control-label">Units</div>
          <select
            value={config.units}
            onChange={(e) => onChange({ ...config, units: e.target.value })}
            className="display-tab__select"
          >
            <option value="auto">From Data</option>
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="m">m</option>
          </select>
        </div>
      </div>

      <button className="display-tab__reset-btn" onClick={onReset}>
        <Icon name="refreshCcw" size={10} />
        Reset
      </button>
    </div>
  );
});

const AxesSettings = memo(function AxesSettings({ config, onChange, onReset }) {
  return (
    <div className="display-tab__settings-panel">
      <div className="display-tab__setting-row">
        <label className="display-tab__toggle-row">
          <span className="display-tab__toggle-label">Show Labels</span>
          <button
            className={`display-tab__toggle ${config.showLabels ? 'display-tab__toggle--active' : ''}`}
            onClick={() => onChange({ ...config, showLabels: !config.showLabels })}
          >
            <div className="display-tab__toggle-knob" />
          </button>
        </label>

        <label className="display-tab__toggle-row">
          <span className="display-tab__toggle-label">Show Ticks</span>
          <button
            className={`display-tab__toggle ${config.showTicks ? 'display-tab__toggle--active' : ''}`}
            onClick={() => onChange({ ...config, showTicks: !config.showTicks })}
          >
            <div className="display-tab__toggle-knob" />
          </button>
        </label>
      </div>

      <button className="display-tab__reset-btn" onClick={onReset}>
        <Icon name="refreshCcw" size={10} />
        Reset
      </button>
    </div>
  );
});

const CoordinatesSettings = memo(function CoordinatesSettings({ config, onChange, onReset }) {
  return (
    <div className="display-tab__settings-panel">
      <div className="display-tab__setting-row">
        <div className="display-tab__setting-group">
          <div className="display-tab__control-label">Position</div>
          <PositionGridPicker
            value={config.position}
            onChange={(pos) => onChange({ ...config, position: pos })}
            allowedPositions={['TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT']}
          />
        </div>

        <div className="display-tab__setting-group">
          <div className="display-tab__slider-group">
            <div className="display-tab__slider-header">
              <span className="display-tab__control-label">Precision</span>
              <span className="display-tab__slider-value display-tab__slider-value--teal">{config.precision} dp</span>
            </div>
            <input
              type="range"
              className="display-tab__slider display-tab__slider--teal"
              min={0}
              max={6}
              value={config.precision}
              onChange={(e) => onChange({ ...config, precision: parseInt(e.target.value, 10) })}
              style={{ '--slider-percent': `${(config.precision / 6) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <button className="display-tab__reset-btn" onClick={onReset}>
        <Icon name="refreshCcw" size={10} />
        Reset
      </button>
    </div>
  );
});

// =============================================================================
// SCENE OVERLAYS SECTION
// =============================================================================

const SceneOverlaysSection = memo(function SceneOverlaysSection({
  isExpanded,
  onToggle,
  // Props from logic hook
  overlayState,
  overlayConfigs,
  onToggleOverlay,
  onUpdateOverlayConfig,
}) {
  // Use props if provided, otherwise fall back to local state (for standalone use)
  const [localActiveOverlays, setLocalActiveOverlays] = useState({
    orientation: true,
    grid: false,
    axes: true,
    scalebar: false,
    coordinates: false,
    fps: false,
  });
  const [localOverlayConfigs, setLocalOverlayConfigs] = useState({ ...OVERLAY_DEFAULTS });
  const [openSettings, setOpenSettings] = useState(null);

  // Use props or local state
  const activeOverlays = overlayState || localActiveOverlays;
  const configs = overlayConfigs || localOverlayConfigs;

  const toggleOverlay = useCallback((id) => {
    if (onToggleOverlay) {
      // Use the VTK-connected handler
      onToggleOverlay(id);
    } else {
      // Fallback to local state
      setLocalActiveOverlays((prev) => ({ ...prev, [id]: !prev[id] }));
    }
    if (activeOverlays[id] && openSettings === id) {
      setOpenSettings(null);
    }
  }, [onToggleOverlay, activeOverlays, openSettings]);

  const updateConfig = useCallback((id, config) => {
    if (onUpdateOverlayConfig) {
      // Use the VTK-connected handler
      onUpdateOverlayConfig(id, config);
    } else {
      // Fallback to local state
      setLocalOverlayConfigs((prev) => ({ ...prev, [id]: config }));
    }
  }, [onUpdateOverlayConfig]);

  const activeCount = Object.values(activeOverlays).filter(Boolean).length;

  const SETTINGS_COMPONENTS = {
    orientation: OrientationSettings,
    grid: GridSettings,
    scalebar: ScaleBarSettings,
    axes: AxesSettings,
    coordinates: CoordinatesSettings,
  };

  const SettingsComponent = SETTINGS_COMPONENTS[openSettings];

  return (
    <div className="display-tab__section">
      <SectionHeader
        icon="layers"
        label="Scene Overlays"
        color="teal"
        isExpanded={isExpanded}
        onToggle={onToggle}
        badge={activeCount > 0 ? `${activeCount}` : null}
      />

      {isExpanded && (
        <div className="display-tab__section-content">
          {/* Primary overlays */}
          <div className="display-tab__overlay-row">
            {['orientation', 'grid', 'axes', 'scalebar'].map((id) => (
              <OverlayToggle
                key={id}
                config={configs[id]}
                overlayConfig={OVERLAY_CONFIG[id]}
                isActive={activeOverlays[id]}
                hasSettingsOpen={openSettings === id}
                onToggle={() => toggleOverlay(id)}
                onSettingsClick={() => setOpenSettings(openSettings === id ? null : id)}
              />
            ))}
          </div>

          {/* Settings panel (slides open inline) */}
          {openSettings && SettingsComponent && activeOverlays[openSettings] && (
            <div className="display-tab__settings-container">
              <div className="display-tab__settings-header">
                <Icon name={OVERLAY_CONFIG[openSettings].icon} size={11} />
                <span>{OVERLAY_CONFIG[openSettings].name}</span>
                <button className="display-tab__settings-close" onClick={() => setOpenSettings(null)}>
                  <Icon name="x" size={10} />
                </button>
              </div>
              <SettingsComponent
                config={configs[openSettings]}
                onChange={(c) => updateConfig(openSettings, c)}
                onReset={() => updateConfig(openSettings, { ...OVERLAY_DEFAULTS[openSettings] })}
              />
            </div>
          )}

          {/* Secondary overlays */}
          <div className="display-tab__overlay-row display-tab__overlay-row--secondary">
            {['coordinates', 'fps'].map((id) => (
              <OverlayToggle
                key={id}
                config={configs[id] || {}}
                overlayConfig={OVERLAY_CONFIG[id]}
                isActive={activeOverlays[id]}
                hasSettingsOpen={openSettings === id}
                onToggle={() => toggleOverlay(id)}
                onSettingsClick={() => setOpenSettings(openSettings === id ? null : id)}
              />
            ))}
          </div>

          {/* Keyboard hint */}
          <div className="display-tab__keyboard-hint">
            <Icon name="keyboard" size={10} />
            Shift+G/O/A/B for quick toggle
          </div>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// WINDOW/LEVEL SECTION
// =============================================================================

const WindowLevelSection = memo(function WindowLevelSection({ isExpanded, onToggle }) {
  const [windowWidth, setWindowWidth] = useState(400);
  const [windowCenter, setWindowCenter] = useState(40);
  const [preset, setPreset] = useState('soft');
  const [invert, setInvert] = useState(false);

  const handlePresetClick = (p) => {
    setPreset(p.id);
    if (p.window !== null) setWindowWidth(p.window);
    if (p.level !== null) setWindowCenter(p.level);
  };

  return (
    <div className="display-tab__section">
      <SectionHeader icon="sun" label="Window / Level" color="orange" isExpanded={isExpanded} onToggle={onToggle} />

      {isExpanded && (
        <div className="display-tab__section-content">
          {/* Presets */}
          <div className="display-tab__setting-group">
            <div className="display-tab__control-label">Presets</div>
            <div className="display-tab__btn-row display-tab__btn-row--wrap">
              {WINDOW_LEVEL_PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={`display-tab__preset-btn ${preset === p.id ? 'display-tab__preset-btn--active' : ''}`}
                  onClick={() => handlePresetClick(p)}
                >
                  {p.label}
                </button>
              ))}
              <button
                className={`display-tab__preset-btn ${preset === 'custom' ? 'display-tab__preset-btn--active' : ''}`}
                onClick={() => setPreset('custom')}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Window Width */}
          <div className="display-tab__slider-group">
            <div className="display-tab__slider-header">
              <span className="display-tab__control-label">Window Width</span>
              <span className="display-tab__slider-value display-tab__slider-value--orange">{windowWidth}</span>
            </div>
            <input
              type="range"
              className="display-tab__slider display-tab__slider--orange"
              min={1}
              max={4000}
              value={windowWidth}
              onChange={(e) => {
                setWindowWidth(parseInt(e.target.value, 10));
                setPreset('custom');
              }}
              style={{ '--slider-percent': `${(windowWidth / 4000) * 100}%` }}
            />
          </div>

          {/* Window Center */}
          <div className="display-tab__slider-group">
            <div className="display-tab__slider-header">
              <span className="display-tab__control-label">Window Center</span>
              <span className="display-tab__slider-value display-tab__slider-value--orange">{windowCenter}</span>
            </div>
            <input
              type="range"
              className="display-tab__slider display-tab__slider--orange"
              min={-1000}
              max={1000}
              value={windowCenter}
              onChange={(e) => {
                setWindowCenter(parseInt(e.target.value, 10));
                setPreset('custom');
              }}
              style={{ '--slider-percent': `${((windowCenter + 1000) / 2000) * 100}%` }}
            />
          </div>

          {/* Invert toggle */}
          <label className="display-tab__toggle-row">
            <span className="display-tab__toggle-label">Invert Colors</span>
            <button
              className={`display-tab__toggle ${invert ? 'display-tab__toggle--active' : ''}`}
              onClick={() => setInvert(!invert)}
            >
              <div className="display-tab__toggle-knob" />
            </button>
          </label>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// APPEARANCE SECTION
// =============================================================================

const AppearanceSection = memo(function AppearanceSection({ isExpanded, onToggle }) {
  const [renderMode, setRenderMode] = useState('volume');
  const [colorMap, setColorMap] = useState('grayscale');
  const [opacity, setOpacity] = useState(100);

  return (
    <div className="display-tab__section">
      <SectionHeader icon="eye" label="Appearance" color="green" isExpanded={isExpanded} onToggle={onToggle} />

      {isExpanded && (
        <div className="display-tab__section-content">
          {/* Render Mode */}
          <div className="display-tab__setting-group">
            <div className="display-tab__control-label">Render Mode</div>
            <div className="display-tab__btn-row">
              {RENDER_MODES.map((mode) => (
                <button
                  key={mode.id}
                  className={`display-tab__option-btn ${renderMode === mode.id ? 'display-tab__option-btn--active display-tab__option-btn--green' : ''}`}
                  onClick={() => setRenderMode(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Map */}
          <div className="display-tab__setting-group">
            <div className="display-tab__control-label">Color Map</div>
            <div className="display-tab__btn-row display-tab__btn-row--wrap">
              {COLOR_MAPS.map((cm) => (
                <button
                  key={cm.id}
                  className={`display-tab__option-btn display-tab__option-btn--sm ${colorMap === cm.id ? 'display-tab__option-btn--active display-tab__option-btn--green' : ''}`}
                  onClick={() => setColorMap(cm.id)}
                >
                  {cm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Opacity */}
          <div className="display-tab__slider-group">
            <div className="display-tab__slider-header">
              <span className="display-tab__control-label">Opacity</span>
              <span className="display-tab__slider-value display-tab__slider-value--green">{opacity}%</span>
            </div>
            <input
              type="range"
              className="display-tab__slider display-tab__slider--green"
              min={0}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(parseInt(e.target.value, 10))}
              style={{ '--slider-percent': `${opacity}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// MAIN DISPLAY TAB
// =============================================================================

/**
 * DisplayTab - Visual settings for instance display
 *
 * @param {Object} props.logic - Optional logic hook props for VTK connection
 */
export const DisplayTab = memo(function DisplayTab({ logic }) {
  const [expanded, setExpanded] = useState({
    overlays: true,
    windowLevel: false,
    appearance: false,
  });

  // Extract overlay-related props from logic if provided
  const {
    overlayState,
    overlayConfigs,
    handleToggleOverlay,
    handleUpdateOverlayConfig,
  } = logic || {};

  return (
    <div className="display-tab">
      <SceneOverlaysSection
        isExpanded={expanded.overlays}
        onToggle={() => setExpanded((p) => ({ ...p, overlays: !p.overlays }))}
        overlayState={overlayState}
        overlayConfigs={overlayConfigs}
        onToggleOverlay={handleToggleOverlay}
        onUpdateOverlayConfig={handleUpdateOverlayConfig}
      />
      <WindowLevelSection
        isExpanded={expanded.windowLevel}
        onToggle={() => setExpanded((p) => ({ ...p, windowLevel: !p.windowLevel }))}
      />
      <AppearanceSection
        isExpanded={expanded.appearance}
        onToggle={() => setExpanded((p) => ({ ...p, appearance: !p.appearance }))}
      />
    </div>
  );
});

export default DisplayTab;
