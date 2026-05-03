/**
 * VisualTab
 * VR accessibility settings for visual comfort and accessibility
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useVRAccessibilitySection } from '@UI/react/context/VRAccessibilityContext';

// =============================================================================
// OPTIONS
// =============================================================================

const UI_SCALE_OPTIONS = [
    { value: 0.75, label: '0.75x' },
    { value: 0.85, label: '0.85x' },
    { value: 1.0, label: '1.0x' },
    { value: 1.25, label: '1.25x' },
    { value: 1.5, label: '1.5x' },
];

const TEXT_SCALE_OPTIONS = [
    { value: 0.8, label: '0.8x' },
    { value: 0.9, label: '0.9x' },
    { value: 1.0, label: '1.0x' },
    { value: 1.2, label: '1.2x' },
    { value: 1.4, label: '1.4x' },
];

const COLOR_MODES = [
    { value: 'normal', label: 'Normal' },
    { value: 'deuteranopia', label: 'Deuteranopia', description: 'Red-green, green-weak' },
    { value: 'protanopia', label: 'Protanopia', description: 'Red-green, red-weak' },
    { value: 'tritanopia', label: 'Tritanopia', description: 'Blue-yellow' },
];

const BRIGHTNESS_OPTIONS = [
    { value: 50, label: '50%' },
    { value: 75, label: '75%' },
    { value: 100, label: '100%' },
    { value: 125, label: '125%' },
    { value: 150, label: '150%' },
];

const UI_BRIGHTNESS_OPTIONS = [
    { value: 70, label: '70%' },
    { value: 85, label: '85%' },
    { value: 100, label: '100%' },
    { value: 115, label: '115%' },
    { value: 130, label: '130%' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function VisualTab() {
    const { settings, updateSection } = useVRAccessibilitySection('visual');

    return (
        <div className="vr-visual-tab">
            {/* UI Scale */}
            <div className="vr-setting-group">
                <h3 className="vr-setting-group__title">UI Scale</h3>
                <p className="vr-setting-group__description">
                    Overall scaling for VR interface elements.
                </p>

                <div className="vr-setting-row vr-setting-row--stacked">
                    <span className="vr-setting-row__label">Scale Factor</span>
                    <div className="vr-slider">
                        <div className="vr-slider__track">
                            <span className="vr-slider__label-min">Smaller</span>
                            <input
                                type="range"
                                min="0"
                                max="4"
                                value={UI_SCALE_OPTIONS.findIndex(o => o.value === settings.uiScale)}
                                onChange={(e) => {
                                    const scale = UI_SCALE_OPTIONS[parseInt(e.target.value)].value;
                                    updateSection('uiScale', scale);
                                }}
                            />
                            <span className="vr-slider__label-max">Larger</span>
                        </div>
                        <span className="vr-slider__value">
                            {UI_SCALE_OPTIONS.find(o => o.value === settings.uiScale)?.label}
                        </span>
                    </div>
                </div>

                <p className="vr-setting-row__hint">
                    Affects: Panel size, button size, text size, icon size
                </p>
            </div>

            {/* Text Size */}
            <div className="vr-setting-group">
                <h3 className="vr-setting-group__title">Text Size</h3>
                <p className="vr-setting-group__description">
                    Independent text scaling (in addition to UI scale).
                </p>

                <div className="vr-setting-row vr-setting-row--stacked">
                    <span className="vr-setting-row__label">Text Scale</span>
                    <div className="vr-slider">
                        <div className="vr-slider__track">
                            <span className="vr-slider__label-min">Smaller</span>
                            <input
                                type="range"
                                min="0"
                                max="4"
                                value={TEXT_SCALE_OPTIONS.findIndex(o => o.value === settings.textScale)}
                                onChange={(e) => {
                                    const scale = TEXT_SCALE_OPTIONS[parseInt(e.target.value)].value;
                                    updateSection('textScale', scale);
                                }}
                            />
                            <span className="vr-slider__label-max">Larger</span>
                        </div>
                        <span className="vr-slider__value">
                            {TEXT_SCALE_OPTIONS.find(o => o.value === settings.textScale)?.label}
                        </span>
                    </div>
                </div>

                <div className="vr-sample-text" style={{
                    padding: '12px',
                    background: 'rgba(96, 165, 250, 0.05)',
                    borderRadius: '8px',
                    marginTop: '8px',
                    fontSize: `${14 * settings.textScale}px`
                }}>
                    <p>The quick brown fox jumps over the lazy dog.</p>
                    <p style={{ marginTop: '4px', opacity: 0.7 }}>Dataset: brain_scan_001.nii (256 × 256 × 180)</p>
                </div>
            </div>

            {/* High Contrast Mode */}
            <div className="vr-setting-group">
                <h3 className="vr-setting-group__title">High Contrast Mode</h3>
                <p className="vr-setting-group__description">
                    Enhanced visibility for users who need it.
                </p>

                <div className="vr-setting-row">
                    <span className="vr-setting-row__label">Enable High Contrast</span>
                    <button
                        type="button"
                        className={`vr-toggle__switch ${settings.highContrast ? 'vr-toggle__switch--on' : ''}`}
                        onClick={() => updateSection('highContrast', !settings.highContrast)}
                        aria-pressed={settings.highContrast}
                    />
                </div>

                {settings.highContrast && (
                    <div className="vr-info-box">
                        <Icon name="info" size={16} />
                        <span>
                            When enabled: Increased border thickness, higher contrast between text and backgrounds,
                            more prominent focus indicators, brighter accent colors
                        </span>
                    </div>
                )}
            </div>

            {/* Color Vision */}
            <div className="vr-setting-group">
                <h3 className="vr-setting-group__title">Color Vision</h3>
                <p className="vr-setting-group__description">
                    Support for color vision deficiency.
                </p>

                <div className="vr-radio-group">
                    {COLOR_MODES.map(option => (
                        <label key={option.value} className="vr-radio-group__option">
                            <input
                                type="radio"
                                name="colorMode"
                                value={option.value}
                                checked={settings.colorMode === option.value}
                                onChange={() => updateSection('colorMode', option.value)}
                            />
                            <div className="vr-radio-group__option-content">
                                <span className="vr-radio-group__option-label">{option.label}</span>
                                {option.description && (
                                    <span className="vr-radio-group__option-description">{option.description}</span>
                                )}
                            </div>
                        </label>
                    ))}
                </div>

                <div className="vr-color-preview" style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '12px'
                }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#60a5fa' }} title="Primary" />
                    <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#30d158' }} title="Success" />
                    <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#ff9f0a' }} title="Warning" />
                    <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#ff453a' }} title="Danger" />
                    <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#0a84ff' }} title="Info" />
                </div>
            </div>

            {/* Brightness */}
            <div className="vr-setting-group">
                <h3 className="vr-setting-group__title">Brightness</h3>
                <p className="vr-setting-group__description">
                    Environmental brightness controls.
                </p>

                <div className="vr-setting-row vr-setting-row--stacked">
                    <span className="vr-setting-row__label">VR Environment Brightness</span>
                    <div className="vr-slider">
                        <div className="vr-slider__track">
                            <span className="vr-slider__label-min">Darker</span>
                            <input
                                type="range"
                                min="0"
                                max="4"
                                value={BRIGHTNESS_OPTIONS.findIndex(o => o.value === settings.environmentBrightness)}
                                onChange={(e) => {
                                    const brightness = BRIGHTNESS_OPTIONS[parseInt(e.target.value)].value;
                                    updateSection('environmentBrightness', brightness);
                                }}
                            />
                            <span className="vr-slider__label-max">Brighter</span>
                        </div>
                        <span className="vr-slider__value">
                            {BRIGHTNESS_OPTIONS.find(o => o.value === settings.environmentBrightness)?.label}
                        </span>
                    </div>
                </div>

                <div className="vr-setting-row vr-setting-row--stacked">
                    <span className="vr-setting-row__label">UI Brightness</span>
                    <div className="vr-slider">
                        <div className="vr-slider__track">
                            <span className="vr-slider__label-min">Darker</span>
                            <input
                                type="range"
                                min="0"
                                max="4"
                                value={UI_BRIGHTNESS_OPTIONS.findIndex(o => o.value === settings.uiBrightness)}
                                onChange={(e) => {
                                    const brightness = UI_BRIGHTNESS_OPTIONS[parseInt(e.target.value)].value;
                                    updateSection('uiBrightness', brightness);
                                }}
                            />
                            <span className="vr-slider__label-max">Brighter</span>
                        </div>
                        <span className="vr-slider__value">
                            {UI_BRIGHTNESS_OPTIONS.find(o => o.value === settings.uiBrightness)?.label}
                        </span>
                    </div>
                </div>

                <div className="vr-info-box">
                    <Icon name="info" size={16} />
                    <span>Lower brightness may reduce eye strain in dark environments</span>
                </div>
            </div>
        </div>
    );
}

export default VisualTab;
