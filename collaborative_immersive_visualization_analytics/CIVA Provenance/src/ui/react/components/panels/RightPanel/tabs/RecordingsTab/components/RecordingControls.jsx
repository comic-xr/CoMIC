/**
 * @file RecordingControls.jsx
 * @description Recording controls with mode selection and start/stop.
 */

import React, { useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * Recording modes configuration
 */
const RECORDING_MODES = [
    { id: 'full', label: 'Full Session', icon: 'monitor', description: 'Record entire workspace grid' },
    { id: 'isolation', label: 'Isolation', icon: 'maximize', description: 'Record single focused instance' },
    { id: 'subset', label: 'Subset', icon: 'layers', description: 'Record selected instances only' },
];

/**
 * Format duration in seconds to HH:MM:SS
 */
function formatDuration(seconds) {
    if (!seconds && seconds !== 0) return '--:--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * @typedef {Object} RecordingControlsProps
 * @property {boolean} isRecording - Whether currently recording
 * @property {number} recordingDuration - Duration in seconds
 * @property {string} recordingMode - Current recording mode
 * @property {boolean} includeAudio - Whether to include audio
 * @property {function} onModeChange - Callback when mode changes
 * @property {function} onAudioToggle - Callback to toggle audio
 * @property {function} onStart - Callback to start recording
 * @property {function} onStop - Callback to stop recording
 * @property {string} recordingName - Recording name
 * @property {function} onNameChange - Callback when name changes
 * @property {boolean} isPaused - Whether recording is paused
 * @property {function} onPause - Callback to pause
 * @property {function} onResume - Callback to resume
 */

/**
 * Recording controls component.
 * Displays recording status and controls.
 *
 * @param {RecordingControlsProps} props - Component props
 * @returns {React.ReactElement} The rendered controls
 */
export function RecordingControls({
    isRecording,
    recordingDuration,
    recordingMode,
    includeAudio,
    onModeChange,
    onAudioToggle,
    onStart,
    onStop,
    recordingName,
    onNameChange,
    isPaused,
    onPause,
    onResume,
}) {
    const [showNameInput, setShowNameInput] = useState(false);
    const [nameInput, setNameInput] = useState('');

    const handleStartClick = useCallback(() => {
        if (showNameInput) {
            if (nameInput.trim()) {
                onNameChange(nameInput.trim());
            }
            onStart();
            setShowNameInput(false);
            setNameInput('');
        } else {
            setShowNameInput(true);
        }
    }, [showNameInput, nameInput, onNameChange, onStart]);

    if (isRecording) {
        return (
            <div className="recording-controls recording-controls--active">
                {/* Recording indicator */}
                <div className="recording-controls__status">
                    <span className="recording-controls__dot recording-controls__dot--pulse" />
                    <span className="recording-controls__label">Recording</span>
                    <span className="recording-controls__time">{formatDuration(recordingDuration)}</span>
                </div>

                {/* Recording info */}
                <div className="recording-controls__info">
                    <span className="recording-controls__info-item">
                        <Icon name="monitor" size={12} />
                        {RECORDING_MODES.find(m => m.id === recordingMode)?.label}
                    </span>
                    <span className="recording-controls__info-item">
                        {includeAudio ? <Icon name="mic" size={12} /> : <Icon name="micOff" size={12} />}
                        {includeAudio ? 'Audio on' : 'Audio off'}
                    </span>
                </div>

                {/* Actions */}
                <div className="recording-controls__actions">
                    <button
                        className="recording-controls__stop-btn"
                        onClick={onStop}
                    >
                        <Icon name="square" size={14} />
                        Stop Recording
                    </button>
                    <button
                        className="recording-controls__pause-btn"
                        onClick={isPaused ? onResume : onPause}
                    >
                        {isPaused ? <Icon name="play" size={14} /> : <Icon name="pause" size={14} />}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="recording-controls">
            {/* Name input */}
            {showNameInput && (
                <div className="recording-controls__name-input">
                    <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="Recording name (optional)"
                        className="recording-controls__input"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleStartClick();
                            if (e.key === 'Escape') setShowNameInput(false);
                        }}
                    />
                </div>
            )}

            {/* Mode selector */}
            <div className="recording-controls__mode-section">
                <div className="recording-controls__mode-label">Recording Mode</div>
                <div className="recording-controls__mode-buttons">
                    {RECORDING_MODES.map(mode => {
                        const iconName = mode.icon;
                        const isActive = recordingMode === mode.id;
                        return (
                            <button
                                key={mode.id}
                                className={`recording-controls__mode-btn ${isActive ? 'recording-controls__mode-btn--active' : ''}`}
                                onClick={() => onModeChange(mode.id)}
                                title={mode.description}
                            >
                                <Icon name={iconName} size={16} />
                                <span>{mode.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Audio toggle */}
            <div className="recording-controls__audio-toggle">
                <div className="recording-controls__audio-info">
                    <Icon name="mic" size={14} className={includeAudio ? 'icon-green' : ''} />
                    <span>Include audio</span>
                </div>
                <button
                    className={`toggle-switch ${includeAudio ? 'toggle-switch--active' : ''}`}
                    onClick={onAudioToggle}
                >
                    <span className="toggle-switch__thumb" />
                </button>
            </div>

            {/* Start button */}
            <button
                className="recording-controls__start-btn"
                onClick={handleStartClick}
            >
                <Icon name="circle" size={16} />
                {showNameInput ? 'Start' : 'Start Recording'}
            </button>
        </div>
    );
}

export default RecordingControls;