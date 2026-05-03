import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Modal } from '@UI/react/components/modals/Modal';
import { Icon, IconButton } from '@UI/react/components/atoms';

export function formatDurationMs(ms) {
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

export function formatPlaybackEvent(event) {
    if (!event) return 'Ready to play';

    const label = event.event_source || event.event_type || 'event';
    return label
        .split(':')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export function formatPlaybackEventDetail(event) {
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

export function RecordingPlaybackModal({
    recording,
    isOpen,
    isPlaybackPlaying,
    isPlaybackLoading,
    playbackTimeMs = 0,
    playbackDurationMs = 0,
    playbackProgress = 0,
    playbackEvents = [],
    playbackEventIndex = -1,
    playbackCurrentEvent = null,
    playbackError = null,
    onClose,
    onPlayPause,
    onPausePlayback,
    onSeek,
}) {
    const activeEventRef = useRef(null);
    const name = recording?.metadata?.name || 'Untitled Recording';
    const eventCount = recording?.event_count || 0;
    const playbackLabel = isPlaybackLoading
        ? 'Loading playback events...'
        : playbackError || formatPlaybackEvent(playbackCurrentEvent);
    const playbackDetail = playbackError
        ? playbackError
        : formatPlaybackEventDetail(playbackCurrentEvent);

    useEffect(() => {
        if (!isOpen || !activeEventRef.current) return;
        activeEventRef.current.scrollIntoView({ block: 'nearest' });
    }, [isOpen, playbackEventIndex]);

    const handlePlayPause = useCallback(() => {
        if (!recording?.id) return;
        if (isPlaybackPlaying) {
            onPausePlayback();
            return;
        }
        onPlayPause(recording.id);
    }, [isPlaybackPlaying, onPausePlayback, onPlayPause, recording?.id]);

    const handleSeekStart = useCallback(() => {
        if (!recording?.id) return;
        onSeek(recording.id, 0, { play: false });
    }, [onSeek, recording?.id]);

    const handleSeekEnd = useCallback(() => {
        if (!recording?.id) return;
        onSeek(recording.id, playbackDurationMs, { play: false });
    }, [onSeek, playbackDurationMs, recording?.id]);

    const handleProgressSeek = useCallback((e) => {
        if (!recording?.id || !playbackDurationMs) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (!rect.width) return;
        const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
        onSeek(recording.id, playbackDurationMs * ratio);
    }, [onSeek, playbackDurationMs, recording?.id]);

    const metaItems = useMemo(() => ([
        `Status: ${recording?.status || 'ready'}`,
        `Duration: ${formatDurationMs(Number(recording?.duration_ms || playbackDurationMs || 0))}`,
        `${eventCount} events`,
        recording?.recorded_by_name ? `By ${recording.recorded_by_name}` : null,
    ].filter(Boolean)), [eventCount, playbackDurationMs, recording?.duration_ms, recording?.recorded_by_name, recording?.status]);

    if (!recording) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Playback: ${name}`}
            icon="play"
            size="lg"
            className="recording-playback-modal"
        >
            <RecordingPlaybackPanelBody
                metaItems={metaItems}
                playbackLabel={playbackLabel}
                playbackDetail={playbackDetail}
                eventCount={eventCount}
                playbackEventIndex={playbackEventIndex}
                isPlaybackLoading={isPlaybackLoading}
                isPlaybackPlaying={isPlaybackPlaying}
                playbackDurationMs={playbackDurationMs}
                playbackTimeMs={playbackTimeMs}
                playbackProgress={playbackProgress}
                playbackEvents={playbackEvents}
                playbackCurrentEvent={playbackCurrentEvent}
                activeEventRef={activeEventRef}
                handleSeekStart={handleSeekStart}
                handlePlayPause={handlePlayPause}
                handleSeekEnd={handleSeekEnd}
                handleProgressSeek={handleProgressSeek}
            />
        </Modal>
    );
}

export function RecordingPlaybackPanelBody({
    metaItems,
    playbackLabel,
    playbackDetail,
    eventCount,
    playbackEventIndex,
    isPlaybackLoading,
    isPlaybackPlaying,
    playbackDurationMs,
    playbackTimeMs,
    playbackProgress,
    playbackEvents,
    playbackCurrentEvent,
    activeEventRef,
    handleSeekStart,
    handlePlayPause,
    handleSeekEnd,
    handleProgressSeek,
}) {
    return (
        <div className="recording-playback-modal__content">
            <div className="recording-playback-modal__meta">
                {metaItems.map((item) => (
                    <span key={item} className="recording-playback-modal__meta-item">
                        {item}
                    </span>
                ))}
            </div>

            <div className="recording-playback-modal__hero">
                <div className="recording-playback-modal__current">
                    <div className="recording-playback-modal__label">Current Action</div>
                    <div className="recording-playback-modal__title">{playbackLabel}</div>
                    <div className="recording-playback-modal__detail">{playbackDetail}</div>
                </div>
                <div className="recording-playback-modal__counter">
                    {eventCount > 0
                        ? `${Math.max(playbackEventIndex + 1, 0)} / ${eventCount} events`
                        : '0 events captured'}
                </div>
            </div>

            <div className="recording-playback-modal__controls">
                <IconButton
                    icon="skipBack"
                    size="sm"
                    disabled={isPlaybackLoading || !playbackDurationMs}
                    onClick={handleSeekStart}
                    className="recording-playback-modal__control-btn"
                />
                <IconButton
                    icon={isPlaybackPlaying ? 'pause' : 'play'}
                    size="sm"
                    disabled={isPlaybackLoading}
                    onClick={handlePlayPause}
                    className="recording-playback-modal__control-btn recording-playback-modal__control-btn--play"
                />
                <IconButton
                    icon="skipForward"
                    size="sm"
                    disabled={isPlaybackLoading || !playbackDurationMs}
                    onClick={handleSeekEnd}
                    className="recording-playback-modal__control-btn"
                />

                <div
                    className="recording-playback-modal__progress"
                    onClick={handleProgressSeek}
                    role="slider"
                    aria-valuemin={0}
                    aria-valuemax={Math.max(playbackDurationMs, 1)}
                    aria-valuenow={playbackTimeMs}
                    tabIndex={0}
                >
                    <div
                        className="recording-playback-modal__progress-bar"
                        style={{ width: `${Math.max(playbackProgress, 0) * 100}%` }}
                    />
                </div>

                <span className="recording-playback-modal__time">
                    {formatDurationMs(playbackTimeMs)} / {formatDurationMs(playbackDurationMs)}
                </span>
            </div>

            <div className="recording-playback-modal__events">
                <div className="recording-playback-modal__events-header">
                    <span>Event Timeline</span>
                    {isPlaybackLoading && (
                        <span className="recording-playback-modal__loading">
                            <Icon name="loader" size={12} className="spin" />
                            Loading
                        </span>
                    )}
                </div>

                {playbackEvents.length === 0 && !isPlaybackLoading ? (
                    <div className="recording-playback-modal__empty">
                        No playback events available for this recording.
                    </div>
                ) : (
                    <div className="recording-playback-modal__event-list">
                        {playbackEvents.map((event) => (
                            <div
                                key={event.id}
                                ref={event.id === playbackCurrentEvent?.id ? activeEventRef : null}
                                className={`recording-playback-modal__event-item ${
                                    event.id === playbackCurrentEvent?.id
                                        ? 'recording-playback-modal__event-item--active'
                                        : ''
                                }`}
                            >
                                <span className="recording-playback-modal__event-time">
                                    {formatDurationMs(event.timestamp_offset_ms)}
                                </span>
                                <span className="recording-playback-modal__event-name">
                                    {formatPlaybackEvent(event)}
                                </span>
                                <span className="recording-playback-modal__event-detail">
                                    {formatPlaybackEventDetail(event)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default RecordingPlaybackModal;
