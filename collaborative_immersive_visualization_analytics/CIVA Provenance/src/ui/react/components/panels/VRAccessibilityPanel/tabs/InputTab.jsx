/**
 * InputTab
 * VR accessibility settings for controller and input customization
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useVRAccessibilitySection } from '@UI/react/context/VRAccessibilityContext';

// =============================================================================
// OPTIONS
// =============================================================================

const HAND_SIZE_OPTIONS = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
];

const HAPTIC_INTENSITY_OPTIONS = [
    { value: 20, label: '20%' },
    { value: 40, label: '40%' },
    { value: 60, label: '60%' },
    { value: 80, label: '80%' },
    { value: 100, label: '100%' },
];

const VOICE_ACTIVATION_OPTIONS = [
    { value: 'always', label: 'Always listening', description: 'Uses more battery' },
    { value: 'wake-word', label: 'Wake word: "Hey Claude"', description: '' },
    { value: 'push-to-talk', label: 'Push-to-talk', description: 'Hold Y button' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function InputTab() {
    const { settings, updateSection } = useVRAccessibilitySection('input');

    return (
        <div className="vr-input-tab">
            {/* Hand Configuration */}
            <div className="vr-setting-group">
                <h3 className="vr-setting-group__title">Hand Configuration</h3>
                <p className="vr-setting-group__description">
                    Dominant hand and handedness settings.
                </p>

                <p className="vr-setting-row__label" style={{ marginBottom: '0.5rem' }}>Dominant Hand</p>
                <div className="vr-radio-group">
                    <label className="vr-radio-group__option">
                        <input
                            type="radio"
                            name="dominantHand"
                            value="right"
                            checked={settings.dominantHand === 'right'}
                            onChange={() => updateSection('dominantHand', 'right')}
                        />
                        <div className="vr-radio-group__option-content">
                            <span className="vr-radio-group__option-label">Right-handed</span>
                            <span className="vr-radio-group__option-description">
                                Pointer on right, menu on left wrist
                            </span>
                        </div>
                    </label>
                    <label className="vr-radio-group__option">
                        <input
                            type="radio"
                            name="dominantHand"
                            value="left"
                            checked={settings.dominantHand === 'left'}
                            onChange={() => updateSection('dominantHand', 'left')}
                        />
                        <div className="vr-radio-group__option-content">
                            <span className="vr-radio-group__option-label">Left-handed</span>
                            <span className="vr-radio-group__option-description">
                                Pointer on left, menu on right wrist
                            </span>
                        </div>
                    </label>
                </div>

                <div className="vr-setting-row vr-setting-row--stacked" style={{ marginTop: '1rem' }}>
                    <span className="vr-setting-row__label">Hand Size (affects controller model)</span>
                    <div className="vr-slider">
                        <div className="vr-slider__track">
                            <span className="vr-slider__label-min">Smaller</span>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                value={HAND_SIZE_OPTIONS.findIndex(o => o.value === settings.handSize)}
                                onChange={(e) => {
                                    const size = HAND_SIZE_OPTIONS[parseInt(e.target.value)].value;
                                    updateSection('handSize', size);
                                }}
                            />
                            <span className="vr-slider__label-max">Larger</span>
                        </div>
                        <span className="vr-slider__value">
                            {HAND_SIZE_OPTIONS.find(o => o.value === settings.handSize)?.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* One-Handed Mode */}
            <div className="vr-setting-group">
                <h3 className="vr-setting-group__title">One-Handed Mode</h3>
                <p className="vr-setting-group__description">
                    Accessibility feature for single controller use.
                </p>

                <div className="vr-setting-row">
                    <span className="vr-setting-row__label">Enable One-Handed Mode</span>
                    <button
                        type="button"
                        className={`vr-toggle__switch ${settings.oneHandedMode.enabled ? 'vr-toggle__switch--on' : ''}`}
                        onClick={() => updateSection('oneHandedMode.enabled', !settings.oneHandedMode.enabled)}
                        aria-pressed={settings.oneHandedMode.enabled}
                    />
                </div>

                {settings.oneHandedMode.enabled && (
                    <>
                        <div className="vr-info-box" style={{ marginTop: '12px' }}>
                            <Icon name="info" size={16} />
                            <span>
                                When enabled: All actions available with single controller,
                                two-handed gestures replaced with alternatives, thumbstick tap replaces second grip
                            </span>
                        </div>

                        <p className="vr-setting-row__label" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                            Primary Controller
                        </p>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="primaryController"
                                    value="left"
                                    checked={settings.oneHandedMode.primaryController === 'left'}
                                    onChange={() => updateSection('oneHandedMode.primaryController', 'left')}
                                />
                                <span>Left</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="primaryController"
                                    value="right"
                                    checked={settings.oneHandedMode.primaryController === 'right'}
                                    onChange={() => updateSection('oneHandedMode.primaryController', 'right')}
                                />
                                <span>Right</span>
                            </label>
                        </div>
                    </>
                )}
            </div>

            {/* Haptic Feedback */}
            <div className="vr-setting-group">
                <h3 className="vr-setting-group__title">Haptic Feedback</h3>
                <p className="vr-setting-group__description">
                    Vibration intensity for controllers.
                </p>

                <div className="vr-setting-row">
                    <span className="vr-setting-row__label">Enable Haptics</span>
                    <button
                        type="button"
                        className={`vr-toggle__switch ${settings.haptics.enabled ? 'vr-toggle__switch--on' : ''}`}
                        onClick={() => updateSection('haptics.enabled', !settings.haptics.enabled)}
                        aria-pressed={settings.haptics.enabled}
                    />
                </div>

                {settings.haptics.enabled && (
                    <>
                        <div className="vr-setting-row vr-setting-row--stacked">
                            <span className="vr-setting-row__label">Intensity</span>
                            <div className="vr-slider">
                                <div className="vr-slider__track">
                                    <span className="vr-slider__label-min">Light</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="4"
                                        value={HAPTIC_INTENSITY_OPTIONS.findIndex(o => o.value === settings.haptics.intensity)}
                                        onChange={(e) => {
                                            const intensity = HAPTIC_INTENSITY_OPTIONS[parseInt(e.target.value)].value;
                                            updateSection('haptics.intensity', intensity);
                                        }}
                                    />
                                    <span className="vr-slider__label-max">Strong</span>
                                </div>
                                <span className="vr-slider__value">
                                    {HAPTIC_INTENSITY_OPTIONS.find(o => o.value === settings.haptics.intensity)?.label}
                                </span>
                            </div>
                        </div>

                        <p className="vr-setting-row__label" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                            Haptic Events:
                        </p>
                        <div className="vr-checkbox-group">
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="haptic-buttons"
                                    checked={settings.haptics.events.buttons}
                                    onChange={(e) => updateSection('haptics.events.buttons', e.target.checked)}
                                />
                                <label htmlFor="haptic-buttons">Button presses</label>
                            </div>
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="haptic-menus"
                                    checked={settings.haptics.events.menus}
                                    onChange={(e) => updateSection('haptics.events.menus', e.target.checked)}
                                />
                                <label htmlFor="haptic-menus">Menu selections</label>
                            </div>
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="haptic-teleport"
                                    checked={settings.haptics.events.teleport}
                                    onChange={(e) => updateSection('haptics.events.teleport', e.target.checked)}
                                />
                                <label htmlFor="haptic-teleport">Teleport landing</label>
                            </div>
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="haptic-grabbing"
                                    checked={settings.haptics.events.grabbing}
                                    onChange={(e) => updateSection('haptics.events.grabbing', e.target.checked)}
                                />
                                <label htmlFor="haptic-grabbing">Object grabbing</label>
                            </div>
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="haptic-panels"
                                    checked={settings.haptics.events.panels}
                                    onChange={(e) => updateSection('haptics.events.panels', e.target.checked)}
                                />
                                <label htmlFor="haptic-panels">Panel interactions</label>
                            </div>
                        </div>

                        <button type="button" className="vr-preview-button" style={{ marginTop: '12px' }}>
                            <Icon name="vibrate" size={14} />
                            <span>Test Haptics</span>
                        </button>
                    </>
                )}
            </div>

            {/* Voice Commands */}
            <div className="vr-setting-group">
                <h3 className="vr-setting-group__title">Voice Commands</h3>
                <p className="vr-setting-group__description">
                    Hands-free control options.
                </p>

                <div className="vr-setting-row">
                    <span className="vr-setting-row__label">Enable Voice Commands</span>
                    <button
                        type="button"
                        className={`vr-toggle__switch ${settings.voice.enabled ? 'vr-toggle__switch--on' : ''}`}
                        onClick={() => updateSection('voice.enabled', !settings.voice.enabled)}
                        aria-pressed={settings.voice.enabled}
                    />
                </div>

                {settings.voice.enabled && (
                    <>
                        <p className="vr-setting-row__label" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                            Activation
                        </p>
                        <div className="vr-radio-group">
                            {VOICE_ACTIVATION_OPTIONS.map(option => (
                                <label key={option.value} className="vr-radio-group__option">
                                    <input
                                        type="radio"
                                        name="voiceActivation"
                                        value={option.value}
                                        checked={settings.voice.activation === option.value}
                                        onChange={() => updateSection('voice.activation', option.value)}
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

                        <div style={{
                            background: 'rgba(96, 165, 250, 0.05)',
                            borderRadius: '8px',
                            padding: '12px',
                            marginTop: '12px',
                            fontSize: '0.8125rem'
                        }}>
                            <p style={{ fontWeight: 500, marginBottom: '8px' }}>Available Commands:</p>
                            <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.6, opacity: 0.8 }}>
                                <li>"Menu" - Open wrist menu</li>
                                <li>"Reset" - Reset view</li>
                                <li>"Screenshot" - Capture view</li>
                                <li>"Mute" / "Unmute" - Toggle microphone</li>
                                <li>"Exit VR" - Return to desktop</li>
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default InputTab;
