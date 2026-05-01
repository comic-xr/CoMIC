/**
 * PanelsTab
 * VR accessibility settings for floating panel behavior
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useVRAccessibilitySection } from '@UI/react/context/VRAccessibilityContext';

// =============================================================================
// OPTIONS
// =============================================================================

const PANEL_SIZES = [
    { value: 'small', label: 'Small', description: '30cm × 40cm' },
    { value: 'medium', label: 'Medium', description: '40cm × 50cm - Recommended' },
    { value: 'large', label: 'Large', description: '60cm × 75cm' },
];

const FOLLOW_DELAY_OPTIONS = [
    { value: 1.0, label: '1.0s' },
    { value: 0.75, label: '0.75s' },
    { value: 0.5, label: '0.5s' },
    { value: 0.35, label: '0.35s' },
    { value: 0.3, label: '0.3s' },
];

const FOLLOW_ANGLE_OPTIONS = [
    { value: 60, label: '60°' },
    { value: 45, label: '45°' },
    { value: 30, label: '30°' },
    { value: 20, label: '20°' },
];

const REPOSITION_SPEED_OPTIONS = [
    { value: 500, label: '500ms' },
    { value: 400, label: '400ms' },
    { value: 300, label: '300ms' },
    { value: 250, label: '250ms' },
    { value: 200, label: '200ms' },
];

const DISTANCE_OPTIONS = [
    { value: 0.8, label: '0.8m' },
    { value: 1.2, label: '1.2m' },
    { value: 1.6, label: '1.6m' },
    { value: 2.0, label: '2.0m' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function PanelsTab() {
    const { settings, updateSection } = useVRAccessibilitySection('panels');

    return (
        <div className="vr-panels-tab">
            {/* Priority Panel Behavior */}
            <div className="vr-setting-group">
                <h3 className="vr-setting-group__title">Priority Panel Behavior</h3>
                <p className="vr-setting-group__description">
                    Controls how confirmation dialogs and other priority panels behave.
                </p>

                <p className="vr-setting-row__label" style={{ marginBottom: '0.5rem' }}>
                    When you look away from a priority panel:
                </p>

                <div className="vr-radio-group">
                    <label className="vr-radio-group__option">
                        <input
                            type="radio"
                            name="followMode"
                            value="follow"
                            checked={settings.priority.followMode === 'follow'}
                            onChange={() => updateSection('priority.followMode', 'follow')}
                        />
                        <div className="vr-radio-group__option-content">
                            <span className="vr-radio-group__option-label">Follow gaze (recommended)</span>
                            <span className="vr-radio-group__option-description">
                                Panel smoothly repositions to stay in front of you
                            </span>
                        </div>
                    </label>
                    <label className="vr-radio-group__option">
                        <input
                            type="radio"
                            name="followMode"
                            value="stay"
                            checked={settings.priority.followMode === 'stay'}
                            onChange={() => updateSection('priority.followMode', 'stay')}
                        />
                        <div className="vr-radio-group__option-content">
                            <span className="vr-radio-group__option-label">Stay in place</span>
                            <span className="vr-radio-group__option-description">
                                Panel remains where it appeared; glows as reminder
                            </span>
                        </div>
                    </label>
                </div>

                <div className="vr-info-box">
                    <Icon name="info" size={16} />
                    <span>Priority panels require your decision before continuing</span>
                </div>
            </div>

            {/* Follow Sensitivity */}
            {settings.priority.followMode === 'follow' && (
                <div className="vr-setting-group">
                    <h3 className="vr-setting-group__title">Follow Sensitivity</h3>
                    <p className="vr-setting-group__description">
                        Fine-tune when gaze-following triggers.
                    </p>

                    <div className="vr-setting-row vr-setting-row--stacked">
                        <span className="vr-setting-row__label">Time before reposition</span>
                        <div className="vr-slider">
                            <div className="vr-slider__track">
                                <span className="vr-slider__label-min">Longer</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="4"
                                    value={FOLLOW_DELAY_OPTIONS.findIndex(o => o.value === settings.priority.followDelay)}
                                    onChange={(e) => {
                                        const delay = FOLLOW_DELAY_OPTIONS[parseInt(e.target.value)].value;
                                        updateSection('priority.followDelay', delay);
                                    }}
                                />
                                <span className="vr-slider__label-max">Shorter</span>
                            </div>
                            <span className="vr-slider__value">
                                {FOLLOW_DELAY_OPTIONS.find(o => o.value === settings.priority.followDelay)?.label}
                            </span>
                        </div>
                    </div>

                    <div className="vr-setting-row vr-setting-row--stacked">
                        <span className="vr-setting-row__label">Angle threshold</span>
                        <div className="vr-slider">
                            <div className="vr-slider__track">
                                <span className="vr-slider__label-min">Wider</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="3"
                                    value={FOLLOW_ANGLE_OPTIONS.findIndex(o => o.value === settings.priority.followAngle)}
                                    onChange={(e) => {
                                        const angle = FOLLOW_ANGLE_OPTIONS[parseInt(e.target.value)].value;
                                        updateSection('priority.followAngle', angle);
                                    }}
                                />
                                <span className="vr-slider__label-max">Narrower</span>
                            </div>
                            <span className="vr-slider__value">
                                {FOLLOW_ANGLE_OPTIONS.find(o => o.value === settings.priority.followAngle)?.label}
                            </span>
                        </div>
                    </div>

                    <p className="vr-setting-row__hint" style={{ marginTop: '0.5rem' }}>
                        Current: Panel follows after looking away {settings.priority.followAngle}° for {settings.priority.followDelay} seconds
                    </p>
                </div>
            )}

            {/* Reposition Animation */}
            {settings.priority.followMode === 'follow' && (
                <div className="vr-setting-group">
                    <h3 className="vr-setting-group__title">Reposition Animation</h3>
                    <p className="vr-setting-group__description">
                        Control how quickly panels move.
                    </p>

                    <div className="vr-setting-row vr-setting-row--stacked">
                        <span className="vr-setting-row__label">Animation Speed</span>
                        <div className="vr-slider">
                            <div className="vr-slider__track">
                                <span className="vr-slider__label-min">Slower</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="4"
                                    value={REPOSITION_SPEED_OPTIONS.findIndex(o => o.value === settings.priority.repositionSpeed)}
                                    onChange={(e) => {
                                        const speed = REPOSITION_SPEED_OPTIONS[parseInt(e.target.value)].value;
                                        updateSection('priority.repositionSpeed', speed);
                                    }}
                                />
                                <span className="vr-slider__label-max">Faster</span>
                            </div>
                            <span className="vr-slider__value">
                                {REPOSITION_SPEED_OPTIONS.find(o => o.value === settings.priority.repositionSpeed)?.label}
                            </span>
                        </div>
                    </div>

                    <div className="vr-info-box">
                        <Icon name="info" size={16} />
                        <span>Faster may feel snappy; slower is gentler but less responsive</span>
                    </div>
                </div>
            )}

            {/* Standard Panel Defaults */}
            <div className="vr-setting-group">
                <h3 className="vr-setting-group__title">Standard Panel Defaults</h3>
                <p className="vr-setting-group__description">
                    Default behavior for regular floating panels.
                </p>

                <div className="vr-setting-row vr-setting-row--stacked">
                    <span className="vr-setting-row__label">Default Distance</span>
                    <div className="vr-slider">
                        <div className="vr-slider__track">
                            <span className="vr-slider__label-min">Closer</span>
                            <input
                                type="range"
                                min="0"
                                max="3"
                                value={DISTANCE_OPTIONS.findIndex(o => o.value === settings.standard.defaultDistance)}
                                onChange={(e) => {
                                    const distance = DISTANCE_OPTIONS[parseInt(e.target.value)].value;
                                    updateSection('standard.defaultDistance', distance);
                                }}
                            />
                            <span className="vr-slider__label-max">Further</span>
                        </div>
                        <span className="vr-slider__value">
                            {DISTANCE_OPTIONS.find(o => o.value === settings.standard.defaultDistance)?.label}
                        </span>
                    </div>
                </div>

                <p className="vr-setting-row__label" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                    Default Panel Size
                </p>
                <div className="vr-radio-group">
                    {PANEL_SIZES.map(option => (
                        <label key={option.value} className="vr-radio-group__option">
                            <input
                                type="radio"
                                name="defaultSize"
                                value={option.value}
                                checked={settings.standard.defaultSize === option.value}
                                onChange={() => updateSection('standard.defaultSize', option.value)}
                            />
                            <div className="vr-radio-group__option-content">
                                <span className="vr-radio-group__option-label">{option.label}</span>
                                <span className="vr-radio-group__option-description">{option.description}</span>
                            </div>
                        </label>
                    ))}
                </div>

                <div className="vr-setting-row" style={{ marginTop: '1rem' }}>
                    <span className="vr-setting-row__label">Remember Panel Positions</span>
                    <button
                        type="button"
                        className={`vr-toggle__switch ${settings.standard.rememberPositions ? 'vr-toggle__switch--on' : ''}`}
                        onClick={() => updateSection('standard.rememberPositions', !settings.standard.rememberPositions)}
                        aria-pressed={settings.standard.rememberPositions}
                    />
                </div>

                <div className="vr-setting-row">
                    <span className="vr-setting-row__label">Panel Follow Mode (auto-follow head)</span>
                    <button
                        type="button"
                        className={`vr-toggle__switch ${settings.standard.autoFollow ? 'vr-toggle__switch--on' : ''}`}
                        onClick={() => updateSection('standard.autoFollow', !settings.standard.autoFollow)}
                        aria-pressed={settings.standard.autoFollow}
                    />
                </div>
            </div>
        </div>
    );
}

export default PanelsTab;
