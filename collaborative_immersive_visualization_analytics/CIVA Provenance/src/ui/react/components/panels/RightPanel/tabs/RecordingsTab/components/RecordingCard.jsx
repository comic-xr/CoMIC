/**
 * @file RecordingCard.jsx
 * @description Recording card with playback controls and actions.
 */

import React, { useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';

/**
 * Recording modes for icon lookup
 */
const RECORDING_MODES = {
    full: 'monitor',
    isolation: 'maximize',
    subset: 'layers',
};

/**
 * Format duration in milliseconds
 */
function formatDurationMs(ms) {
    if (!ms) return '--:--';
    const seconds = Math.floor(ms / 1000);
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const dayMs = 24 * 60 * 60 * 1000;

    if (diff < dayMs) {
        return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diff < 2 * dayMs) {
        return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
}

function formatPlaybackEvent(event) {
    if (!event) return 'Ready to play';

    const label = event.event_source || event.event_type || 'event';
    return label
        .split(':')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function formatPlaybackEventDetail(event) {
    if (!event?.event_data) return 'No event details';

    const { event_data: data } = event;

    if (data.filterName) return `Filter: ${data.filterName}`;
    if (data.fileName) return `Opened: ${data.fileName}`;
    if (data.viewId) return `View: ${data.viewId.slice(0, 8)}`;
    if (data.instanceId) return `Instance: ${data.instanceId}`;
    if (data.row != null || data.col != null) {
        return `Cell: ${data.row ?? '-'}, ${data.col ?? '-'}`;
    }
    if (data.text) return data.text;

    const keys = Object.keys(data);
    if (keys.length === 0) return 'No event details';

    return keys
        .slice(0, 3)
        .map((key) => `${key}: ${String(data[key])}`)
        .join(' • ');
}

/**
 * @typedef {Object} RecordingCardProps
 * @property {Object} recording - Recording data
 * @property {boolean} isSelected - Whether this card is selected
 * @property {function} onSelect - Callback when card is clicked
 * @property {function} onExport - Callback to export recording
 * @property {function} onDownload - Callback to download recording
 * @property {function} onDelete - Callback to delete recording
 * @property {boolean} isExporting - Whether currently exporting
 * @property {boolean} isPlaybackActive - Whether this recording is loaded in the player
 * @property {boolean} isPlaybackPlaying - Whether playback is running
 * @property {boolean} isPlaybackLoading - Whether playback data is loading
 * @property {number} playbackTimeMs - Current playback time
 * @property {number} playbackDurationMs - Playback duration
 * @property {number} playbackEventIndex - Current playback event index
 * @property {Object|null} playbackCurrentEvent - Current playback event
 * @property {string|null} playbackError - Playback error message
 * @property {function} onOpenPlayback - Callback to open playback modal
 */

/**
 * Recording card component.
 * Displays recording with expandable controls.
 *
 * @param {RecordingCardProps} props - Component props
 * @returns {React.ReactElement} The rendered card
 */
export function RecordingCard({
    recording,
    isSelected,
    onSelect,
    onDownload,
    onDelete,
    isPlaybackActive,
    isPlaybackPlaying,
    isPlaybackLoading,
    playbackTimeMs = 0,
    playbackDurationMs = 0,
    playbackEventIndex = -1,
    playbackCurrentEvent = null,
    playbackError = null,
    onOpenPlayback,
}) {
    const mode = recording.metadata?.mode || 'full';
    const modeIconName = RECORDING_MODES[mode] || 'monitor';
    const name = recording.metadata?.name || 'Untitled Recording';
    const totalDurationMs = Number(recording.duration_ms || playbackDurationMs || 0);
    const currentTimeMs = isPlaybackActive ? playbackTimeMs : 0;
    const eventCount = recording.event_count || 0;
    const playbackLabel = isPlaybackLoading
        ? 'Loading playback events...'
        : playbackError || formatPlaybackEvent(playbackCurrentEvent);
    const playbackDetail = playbackError
        ? playbackError
        : formatPlaybackEventDetail(playbackCurrentEvent);

    const handleDelete = useCallback((e) => {
        e.stopPropagation();
        if (window.confirm('Delete this recording? This cannot be undone.')) {
            onDelete(recording.id);
        }
    }, [recording.id, onDelete]);

    const handleDownload = useCallback((e) => {
        e.stopPropagation();
        onDownload(recording.id);
    }, [recording.id, onDownload]);

    const handleOpenPlayback = useCallback((e) => {
        e.stopPropagation();
        onOpenPlayback(recording.id);
    }, [onOpenPlayback, recording.id]);

    return (
        <div
            className={`recording-card ${isSelected ? 'recording-card--selected' : ''}`}
            onClick={() => onSelect(isSelected ? null : recording.id)}
        >
            <div className="recording-card__main">
                {/* Thumbnail */}
                <div
                    className="recording-card__thumbnail"
                    onClick={recording.status !== 'recording' ? handleOpenPlayback : undefined}
                    role={recording.status !== 'recording' ? 'button' : undefined}
                    tabIndex={recording.status !== 'recording' ? 0 : undefined}
                    title={recording.status !== 'recording' ? 'Open playback details' : undefined}
                >
                    {recording.status === 'recording' ? (
                        <span className="recording-card__live-indicator">
                            <Icon name="circle" size={16} className="recording-card__live-dot" />
                        </span>
                    ) : (
                        <Icon name="play" size={20} />
                    )}
                </div>

                {/* Info */}
                <div className="recording-card__info">
                    <div className="recording-card__title">{name}</div>
                    <div className="recording-card__meta">
                        <span className="recording-card__duration">
                            <Icon name="clock" size={10} />
                            {formatDurationMs(recording.duration_ms)}
                        </span>
                        <span className="recording-card__events">
                            {recording.event_count || 0} events
                        </span>
                        <span className="recording-card__mode">
                            <Icon name={modeIconName} size={10} />
                        </span>
                    </div>
                    <div className="recording-card__date">
                        {formatDate(recording.started_at)}
                        {recording.recorded_by_name && ` by ${recording.recorded_by_name}`}
                    </div>
                </div>
            </div>

            {/* Expanded details */}
            {isSelected && (
                <div className="recording-card__expanded">
                    {/* Status info */}
                    <div className="recording-card__details">
                        <span>Status: {recording.status}</span>
                        {recording.file_size && (
                            <span>Size: {(recording.file_size / 1024).toFixed(1)} KB</span>
                        )}
                    </div>

                    {/* Playback summary */}
                    {recording.status !== 'recording' && (
                        <div className="recording-card__playback-summary">
                            <div className="recording-card__playback-summary-main">
                                <span className="recording-card__playback-summary-label">
                                    {isPlaybackActive
                                        ? (isPlaybackPlaying ? 'Playback running' : 'Playback paused')
                                        : 'Playback ready'}
                                </span>
                                <span className="recording-card__playback-summary-detail">
                                    {playbackLabel}
                                </span>
                            </div>
                            <span className="recording-card__playback-summary-time">
                                {formatDurationMs(currentTimeMs)} / {formatDurationMs(totalDurationMs)}
                            </span>
                        </div>
                    )}

                    {recording.status !== 'recording' && (
                        <div className="recording-card__playback-status">
                            <span>{playbackDetail}</span>
                            <span>
                                {eventCount > 0
                                    ? `${Math.max(playbackEventIndex + 1, 0)} / ${eventCount} events`
                                    : '0 events captured'}
                            </span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="recording-card__actions">
                        {recording.status !== 'recording' && (
                            <LabeledButton
                                icon="play"
                                label="Open Playback"
                                onClick={handleOpenPlayback}
                                tooltip="Open playback details"
                                size="sm"
                                variant="ghost"
                                color="red"
                            />
                        )}
                        {recording.status !== 'recording' && (
                            <LabeledButton
                                icon="download"
                                label="Download"
                                onClick={handleDownload}
                                tooltip="Download recording"
                                size="sm"
                                variant="ghost"
                                color="blue"
                            />
                        )}
                        <LabeledButton
                            icon="delete"
                            label="Delete"
                            onClick={handleDelete}
                            tooltip="Delete recording"
                            size="sm"
                            variant="ghost"
                            color="red"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default RecordingCard;
