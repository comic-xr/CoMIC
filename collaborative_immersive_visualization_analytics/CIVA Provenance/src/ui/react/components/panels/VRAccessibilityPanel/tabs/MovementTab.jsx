/**
 * MovementTab
 * VR accessibility settings for locomotion and motion comfort
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useVRAccessibilitySection } from '@UI/react/context/VRAccessibilityContext';

// =============================================================================
// SNAP TURN OPTIONS
// =============================================================================

const SNAP_TURN_OPTIONS = [
    { value: 'off', label: 'Off', description: 'Smooth turn only' },
    { value: 15, label: '15°', description: 'Fine control' },
    { value: 30, label: '30°', description: 'Moderate' },
    { value: 45, label: '45°', description: 'Recommended' },
    { value: 90, label: '90°', description: 'Quick turns' },
];

const SMOOTH_TURN_SPEEDS = [
    { value: 30, label: '30°/s' },
    { value: 60, label: '60°/s' },
    { value: 90, label: '90°/s' },
    { value: 120, label: '120°/s' },
];

const TELEPORT_STYLES = [
    { value: 'instant', label: 'Instant', description: 'Immediate transition' },
    { value: 'quick-fade', label: 'Quick Fade', description: 'Brief fade to black (recommended)' },
    { value: 'slow-fade', label: 'Slow Fade', description: 'Gradual transition' },
    { value: 'dash', label: 'Dash', description: 'Quick movement through space' },
];

const VIGNETTE_OPTIONS = [
    { value: 'off', label: 'Off', description: 'No vignette' },
    { value: 'light', label: 'Light', description: 'Subtle edge darkening (recommended)' },
    { value: 'medium', label: 'Medium', description: 'Moderate tunnel effect' },
    { value: 'strong', label: 'Strong', description: 'Maximum comfort, reduced FOV' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function MovementTab() {
    const { settings, updateSection } = useVRAccessibilitySection('movement');

    return (
        <div className="vr-movement-tab">
            {/* Snap Turn */}
            <div className="vr-setting-group">
                <h3 className="vr-setting-group__title">Snap Turn</h3>
                <p className="vr-setting-group__description">
                    Controls rotation behavior when using thumbstick left/right.
                </p>
                <div className="vr-radio-group">
                    {SNAP_TURN_OPTIONS.map(option => (
                        <label key={option.value} className="vr-radio-group__option">
                            <input
                                type="radio"
                                name="snapTurn"
                                value={option.value}
                                checked={settings.snapTurn === option.value}
                                onChange={() => updateSection('snapTurn', option.value)}
                            />
                            <div className="vr-radio-group__option-content">
                                <span className="vr-radio-group__option-label">{option.label}</span>
                                <span className="vr-radio-group__option-description">{option.description}</span>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Smooth Turn */}
            <div className="vr-setting-group">
                <h3 className="vr-setting-group__title">Smooth Turn</h3>
                <p className="vr-setting-group__description">
                    Alternative to snap turn, or can be combined with it.
                </p>

                <div className="vr-setting-row">
                    <span className="vr-setting-row__label">Enable Smooth Turn</span>
                    <button
                        type="button"
                        className={`vr-toggle__switch ${settings.smoothTurn.enabled ? 'vr-toggle__switch--on' : ''}`}
                        onClick={() => updateSection('smoothTurn.enabled', !settings.smoothTurn.enabled)}
                        aria-pressed={settings.smoothTurn.enabled}
                    />
                </div>

                {settings.smoothTurn.enabled && (
                    <div className="vr-setting-row vr-setting-row--stacked">
                        <span className="vr-setting-row__label">Turn Speed</span>
                        <div className="vr-slider">
                            <div className="vr-slider__track">
                                <span className="vr-slider__label-min">Slow</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="3"
                                    value={SMOOTH_TURN_SPEEDS.findIndex(s => s.value === settings.smoothTurn.speed)}
                                    onChange={(e) => {
                                        const speed = SMOOTH_TURN_SPEEDS[parseInt(e.target.value)].value;
                                        updateSection('smoothTurn.speed', speed);
                                    }}
                                />
                                <span className="vr-slider__label-max">Fast</span>
                            </div>
                            <span className="vr-slider__value">
                                {SMOOTH_TURN_SPEEDS.find(s => s.value === settings.smoothTurn.speed)?.label}
                            </span>
                        </div>
                    </div>
                )}

                <div className="vr-warning-box">
                    <Icon name="alert-triangle" size={16} />
                    <span>Smooth turning may cause discomfort for some users</span>
                </div>
            </div>

            {/* Teleportation */}
            <div className="vr-setting-group">
                <h3 className="vr-setting-group__title">Teleportation</h3>
                <p className="vr-setting-group__description">
                    Controls for teleport locomotion.
                </p>

                <div className="vr-radio-group">
                    {TELEPORT_STYLES.map(option => (
                        <label key={option.value} className="vr-radio-group__option">
                            <input
                                type="radio"
                                name="teleportStyle"
                                value={option.value}
                                checked={settings.teleport.style === option.value}
                                onChange={() => updateSection('teleport.style', option.value)}
                            />
                            <div className="vr-radio-group__option-content">
                                <span className="vr-radio-group__option-label">{option.label}</span>
                                <span className="vr-radio-group__option-description">{option.description}</span>
                            </div>
                        </label>
                    ))}
                </div>

                <div className="vr-setting-row">
                    <span className="vr-setting-row__label">Show Teleport Arc</span>
                    <button
                        type="button"
                        className={`vr-toggle__switch ${settings.teleport.showArc ? 'vr-toggle__switch--on' : ''}`}
                        onClick={() => updateSection('teleport.showArc', !settings.teleport.showArc)}
                        aria-pressed={settings.teleport.showArc}
                    />
                </div>

                <div className="vr-setting-row">
                    <span className="vr-setting-row__label">Haptic Feedback on Land</span>
                    <button
                        type="button"
                        className={`vr-toggle__switch ${settings.teleport.hapticOnLand ? 'vr-toggle__switch--on' : ''}`}
                        onClick={() => updateSection('teleport.hapticOnLand', !settings.teleport.hapticOnLand)}
                        aria-pressed={settings.teleport.hapticOnLand}
                    />
                </div>
            </div>

            {/* Vignette */}
            <div className="vr-setting-group">
                <h3 className="vr-setting-group__title">Comfort Vignette</h3>
                <p className="vr-setting-group__description">
                    Tunnel vision effect during movement to reduce motion sickness.
                </p>

                <div className="vr-radio-group">
                    {VIGNETTE_OPTIONS.map(option => (
                        <label key={option.value} className="vr-radio-group__option">
                            <input
                                type="radio"
                                name="vignetteIntensity"
                                value={option.value}
                                checked={settings.vignette.intensity === option.value}
                                onChange={() => updateSection('vignette.intensity', option.value)}
                            />
                            <div className="vr-radio-group__option-content">
                                <span className="vr-radio-group__option-label">{option.label}</span>
                                <span className="vr-radio-group__option-description">{option.description}</span>
                            </div>
                        </label>
                    ))}
                </div>

                {settings.vignette.intensity !== 'off' && (
                    <>
                        <p className="vr-setting-row__label" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                            Apply Vignette During:
                        </p>
                        <div className="vr-checkbox-group">
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="vignette-smooth-turn"
                                    checked={settings.vignette.triggers.smoothTurn}
                                    onChange={(e) => updateSection('vignette.triggers.smoothTurn', e.target.checked)}
                                />
                                <label htmlFor="vignette-smooth-turn">Smooth turning</label>
                            </div>
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="vignette-teleport"
                                    checked={settings.vignette.triggers.teleport}
                                    onChange={(e) => updateSection('vignette.triggers.teleport', e.target.checked)}
                                />
                                <label htmlFor="vignette-teleport">Teleportation</label>
                            </div>
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="vignette-world-move"
                                    checked={settings.vignette.triggers.worldMove}
                                    onChange={(e) => updateSection('vignette.triggers.worldMove', e.target.checked)}
                                />
                                <label htmlFor="vignette-world-move">World movement (grip + move)</label>
                            </div>
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="vignette-head-move"
                                    checked={settings.vignette.triggers.headMove}
                                    onChange={(e) => updateSection('vignette.triggers.headMove', e.target.checked)}
                                />
                                <label htmlFor="vignette-head-move">Looking around (head movement)</label>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default MovementTab;
