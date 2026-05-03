/**
 * AudioTab
 * VR accessibility settings for audio feedback and spatial sound
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useVRAccessibilitySection } from '@UI/react/context/VRAccessibilityContext';

// =============================================================================
// OPTIONS
// =============================================================================

const VOLUME_OPTIONS = [
    { value: 20, label: '20%' },
    { value: 40, label: '40%' },
    { value: 60, label: '60%' },
    { value: 80, label: '80%' },
    { value: 100, label: '100%' },
];

const SPEECH_RATE_OPTIONS = [
    { value: 0.75, label: '0.75x' },
    { value: 0.9, label: '0.9x' },
    { value: 1.0, label: '1.0x' },
    { value: 1.25, label: '1.25x' },
    { value: 1.5, label: '1.5x' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function AudioTab() {
    const { settings, updateSection } = useVRAccessibilitySection('audio');

    return (
        <div className="vr-audio-tab">
            {/* Audio Cues */}
            <div className="vr-setting-group">
                <h3 className="vr-setting-group__title">Audio Cues</h3>
                <p className="vr-setting-group__description">
                    System sounds for VR interactions.
                </p>

                <div className="vr-setting-row">
                    <span className="vr-setting-row__label">Enable Audio Cues</span>
                    <button
                        type="button"
                        className={`vr-toggle__switch ${settings.cues.enabled ? 'vr-toggle__switch--on' : ''}`}
                        onClick={() => updateSection('cues.enabled', !settings.cues.enabled)}
                        aria-pressed={settings.cues.enabled}
                    />
                </div>

                {settings.cues.enabled && (
                    <>
                        <div className="vr-setting-row vr-setting-row--stacked">
                            <span className="vr-setting-row__label">Volume</span>
                            <div className="vr-slider">
                                <div className="vr-slider__track">
                                    <span className="vr-slider__label-min">Quiet</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="4"
                                        value={VOLUME_OPTIONS.findIndex(o => o.value === settings.cues.volume)}
                                        onChange={(e) => {
                                            const volume = VOLUME_OPTIONS[parseInt(e.target.value)].value;
                                            updateSection('cues.volume', volume);
                                        }}
                                    />
                                    <span className="vr-slider__label-max">Loud</span>
                                </div>
                                <span className="vr-slider__value">
                                    {VOLUME_OPTIONS.find(o => o.value === settings.cues.volume)?.label}
                                </span>
                            </div>
                        </div>

                        <p className="vr-setting-row__label" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                            Individual Cue Settings:
                        </p>
                        <div className="vr-checkbox-group">
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="cue-panel"
                                    checked={settings.cues.panelSounds}
                                    onChange={(e) => updateSection('cues.panelSounds', e.target.checked)}
                                />
                                <label htmlFor="cue-panel">Panel open/close sounds</label>
                            </div>
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="cue-whoosh"
                                    checked={settings.cues.priorityWhoosh}
                                    onChange={(e) => updateSection('cues.priorityWhoosh', e.target.checked)}
                                />
                                <label htmlFor="cue-whoosh">Priority panel reposition whoosh</label>
                            </div>
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="cue-button"
                                    checked={settings.cues.buttonClicks}
                                    onChange={(e) => updateSection('cues.buttonClicks', e.target.checked)}
                                />
                                <label htmlFor="cue-button">Button click feedback</label>
                            </div>
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="cue-error"
                                    checked={settings.cues.errorSounds}
                                    onChange={(e) => updateSection('cues.errorSounds', e.target.checked)}
                                />
                                <label htmlFor="cue-error">Error/warning sounds</label>
                            </div>
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="cue-teleport"
                                    checked={settings.cues.teleportSound}
                                    onChange={(e) => updateSection('cues.teleportSound', e.target.checked)}
                                />
                                <label htmlFor="cue-teleport">Teleport confirmation</label>
                            </div>
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="cue-nav"
                                    checked={settings.cues.navigationSounds}
                                    onChange={(e) => updateSection('cues.navigationSounds', e.target.checked)}
                                />
                                <label htmlFor="cue-nav">Menu navigation sounds</label>
                            </div>
                        </div>

                        <button type="button" className="vr-preview-button" style={{ marginTop: '12px' }}>
                            <Icon name="play" size={14} />
                            <span>Test Sound</span>
                        </button>
                    </>
                )}
            </div>

            {/* Spatial Audio */}
            <div className="vr-setting-group">
                <h3 className="vr-setting-group__title">Spatial Audio</h3>
                <p className="vr-setting-group__description">
                    How voice and sounds are positioned in 3D space.
                </p>

                <div className="vr-setting-row">
                    <div>
                        <span className="vr-setting-row__label">Voice Spatialization</span>
                        <p className="vr-setting-row__hint">
                            When enabled, voices come from avatar positions in space.
                            When disabled, all voices play at equal volume (flat mix).
                        </p>
                    </div>
                    <button
                        type="button"
                        className={`vr-toggle__switch ${settings.spatial.voiceEnabled ? 'vr-toggle__switch--on' : ''}`}
                        onClick={() => updateSection('spatial.voiceEnabled', !settings.spatial.voiceEnabled)}
                        aria-pressed={settings.spatial.voiceEnabled}
                    />
                </div>

                {settings.spatial.voiceEnabled && (
                    <div style={{
                        background: 'rgba(96, 165, 250, 0.05)',
                        borderRadius: '8px',
                        padding: '12px',
                        marginTop: '12px'
                    }}>
                        <p className="vr-setting-row__label" style={{ marginBottom: '8px' }}>Distance Falloff</p>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.8125rem' }}>
                                Full volume within:
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={settings.spatial.fullVolumeDistance}
                                    onChange={(e) => updateSection('spatial.fullVolumeDistance', parseInt(e.target.value) || 3)}
                                    style={{
                                        width: '50px',
                                        marginLeft: '8px',
                                        padding: '4px 8px',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '4px',
                                        color: 'inherit'
                                    }}
                                /> meters
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px' }}>
                            <label style={{ fontSize: '0.8125rem' }}>
                                Fade to 30% at:
                                <input
                                    type="number"
                                    min="5"
                                    max="50"
                                    value={settings.spatial.fadeDistance}
                                    onChange={(e) => updateSection('spatial.fadeDistance', parseInt(e.target.value) || 10)}
                                    style={{
                                        width: '50px',
                                        marginLeft: '8px',
                                        padding: '4px 8px',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '4px',
                                        color: 'inherit'
                                    }}
                                /> meters
                            </label>
                        </div>
                    </div>
                )}

                <div className="vr-info-box" style={{ marginTop: '12px' }}>
                    <Icon name="info" size={16} />
                    <span>Presenter mode overrides these settings (full volume always)</span>
                </div>
            </div>

            {/* Voice Announcements */}
            <div className="vr-setting-group">
                <h3 className="vr-setting-group__title">Voice Announcements</h3>
                <p className="vr-setting-group__description">
                    Screen reader and voice announcements.
                </p>

                <div className="vr-setting-row">
                    <span className="vr-setting-row__label">Enable Voice Announcements</span>
                    <button
                        type="button"
                        className={`vr-toggle__switch ${settings.announcements.enabled ? 'vr-toggle__switch--on' : ''}`}
                        onClick={() => updateSection('announcements.enabled', !settings.announcements.enabled)}
                        aria-pressed={settings.announcements.enabled}
                    />
                </div>

                {settings.announcements.enabled && (
                    <>
                        <p className="vr-setting-row__label" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                            Announce:
                        </p>
                        <div className="vr-checkbox-group">
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="announce-panels"
                                    checked={settings.announcements.events.panels}
                                    onChange={(e) => updateSection('announcements.events.panels', e.target.checked)}
                                />
                                <label htmlFor="announce-panels">Panel opened/closed</label>
                            </div>
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="announce-focus"
                                    checked={settings.announcements.events.focus}
                                    onChange={(e) => updateSection('announcements.events.focus', e.target.checked)}
                                />
                                <label htmlFor="announce-focus">Button focused</label>
                            </div>
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="announce-actions"
                                    checked={settings.announcements.events.actions}
                                    onChange={(e) => updateSection('announcements.events.actions', e.target.checked)}
                                />
                                <label htmlFor="announce-actions">Action completed</label>
                            </div>
                            <div className="vr-checkbox-group__item">
                                <input
                                    type="checkbox"
                                    id="announce-errors"
                                    checked={settings.announcements.events.errors}
                                    onChange={(e) => updateSection('announcements.events.errors', e.target.checked)}
                                />
                                <label htmlFor="announce-errors">Errors and warnings</label>
                            </div>
                        </div>

                        <div className="vr-setting-row vr-setting-row--stacked" style={{ marginTop: '1rem' }}>
                            <span className="vr-setting-row__label">Speech Rate</span>
                            <div className="vr-slider">
                                <div className="vr-slider__track">
                                    <span className="vr-slider__label-min">Slower</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="4"
                                        value={SPEECH_RATE_OPTIONS.findIndex(o => o.value === settings.announcements.speechRate)}
                                        onChange={(e) => {
                                            const rate = SPEECH_RATE_OPTIONS[parseInt(e.target.value)].value;
                                            updateSection('announcements.speechRate', rate);
                                        }}
                                    />
                                    <span className="vr-slider__label-max">Faster</span>
                                </div>
                                <span className="vr-slider__value">
                                    {SPEECH_RATE_OPTIONS.find(o => o.value === settings.announcements.speechRate)?.label}
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default AudioTab;
