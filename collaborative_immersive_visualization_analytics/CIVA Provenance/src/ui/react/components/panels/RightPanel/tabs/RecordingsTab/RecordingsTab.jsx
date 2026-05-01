/**
 * @file RecordingsTab.jsx
 * @description Recordings tab for session capture and playback.
 * Part of the Right Panel collaboration hub.
 *
 * Features:
 * - Start/stop recording with mode selection
 * - Recording modes: Full Session, Isolation, Subset
 * - Audio toggle and live indicator
 * - Past recordings list with playback controls
 * - Export and download options
 * - Storage usage indicator
 *
 * @see Right_Panel_Design_Specification.md - Recording Tab section
 *
 * @example
 * <RecordingsTab workspaceId="ws-1" />
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms';
import { Button } from '@UI/react/components/atoms/Button';
import { CollapsibleHeaderSection, StatusDot, StatBadge, SectionHeader } from '@UI/react/components/molecules/HeaderSection';
import { SearchBar } from '@UI/react/components/molecules/SearchBar';

import { useRecordingsTab, MARKER_TYPES } from './hooks/useRecordingsTab';
import { RecordingCard } from './components/RecordingCard';
import {
    RecordingPlaybackModal,
    RecordingPlaybackPanelBody,
    formatDurationMs,
    formatPlaybackEvent,
    formatPlaybackEventDetail,
} from './components/RecordingPlaybackModal';

import './RecordingsTab.scss';

// =============================================================================
// MARKER COMPONENTS
// =============================================================================

/**
 * Marker input form for adding annotated markers
 */
function MarkerInput({
    markerText,
    setMarkerText,
    markerType,
    setMarkerType,
    onSubmit,
    onCancel
}) {
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(markerText, markerType);
    };

    return (
        <form className="marker-input" onSubmit={handleSubmit}>
            <div className="marker-input__type-selector">
                {MARKER_TYPES.map(type => (
                    <button
                        key={type.id}
                        type="button"
                        className={`marker-input__type-btn marker-input__type-btn--${type.color} ${markerType === type.id ? 'marker-input__type-btn--active' : ''}`}
                        onClick={() => setMarkerType(type.id)}
                        title={type.label}
                    >
                        <Icon name={type.icon} size={12} />
                    </button>
                ))}
            </div>
            <input
                type="text"
                className="marker-input__text"
                value={markerText}
                onChange={(e) => setMarkerText(e.target.value)}
                placeholder="Add a note for this marker..."
                autoFocus
            />
            <div className="marker-input__actions">
                <button type="button" className="marker-input__cancel" onClick={onCancel}>
                    <Icon name="x" size={12} />
                </button>
                <button type="submit" className="marker-input__submit">
                    <Icon name="check" size={12} />
                </button>
            </div>
        </form>
    );
}

/**
 * Single marker item in the markers list
 */
function MarkerItem({ marker, onDelete }) {
    const typeConfig = MARKER_TYPES.find(t => t.id === marker.type) || MARKER_TYPES[0];

    return (
        <div className={`marker-item marker-item--${typeConfig.color}`}>
            <Icon name={typeConfig.icon} size={12} className="marker-item__icon" />
            <span className="marker-item__time">{formatTimestamp(marker.timestamp)}</span>
            <span className="marker-item__text">{marker.text || typeConfig.label}</span>
            <button
                className="marker-item__delete"
                onClick={() => onDelete(marker.id)}
                title="Delete marker"
            >
                <Icon name="x" size={10} />
            </button>
        </div>
    );
}

/**
 * Format timestamp helper for markers
 */
function formatTimestamp(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format duration in seconds to HH:MM:SS or MM:SS
 */
function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * @typedef {Object} RecordingsTabProps
 * @property {string} [workspaceId] - Current workspace ID
 */

/**
 * Recordings tab component.
 * Provides session recording and playback.
 *
 * @param {RecordingsTabProps} props - Component props
 * @returns {React.ReactElement} The rendered tab
 */
export function RecordingsTab({ workspaceId }) {
    const {
        recordings,
        filteredRecordings,
        isRecording,
        isPaused,
        recordingDuration,
        recordingName,
        setRecordingName,
        recordingMode,
        setRecordingMode,
        includeAudio,
        setIncludeAudio,
        searchQuery,
        setSearchQuery,
        sortBy,
        setSortBy,
        sortOrder,
        toggleSortOrder,
        filterBy,
        setFilterBy,
        selectedRecording,
        setSelectedRecording,
        exportingId,
        loading,
        error,
        totalSize,
        handleStartRecording,
        handleStopRecording,
        handlePauseRecording,
        handleResumeRecording,
        handleExport,
        handleDownload,
        handleDelete,
        handleTogglePlayback,
        handlePausePlayback,
        handleSeekPlayback,
        refresh,
        // Markers
        markers,
        showMarkerInput,
        setShowMarkerInput,
        markerText,
        setMarkerText,
        markerType,
        setMarkerType,
        handleAddMarker,
        handleQuickMarker,
        handleDeleteMarker,
        handleToggleMarkerInput,
        // Playback
        playbackRecordingId,
        isPlaybackPlaying,
        isPlaybackLoading,
        playbackTimeMs,
        playbackDurationMs,
        playbackProgress,
        playbackEvents,
        playbackEventIndex,
        playbackCurrentEvent,
        playbackError,
    } = useRecordingsTab();
    const [playbackModalRecordingId, setPlaybackModalRecordingId] = React.useState(null);
    const playbackSectionActiveEventRef = React.useRef(null);

    const playbackModalRecording = React.useMemo(
        () => recordings.find((item) => item.id === playbackModalRecordingId) || null,
        [playbackModalRecordingId, recordings]
    );

    const handleOpenPlaybackModal = React.useCallback((recordingId) => {
        if (!recordingId) return;
        setSelectedRecording(recordingId);
        setPlaybackModalRecordingId(recordingId);

        if (playbackRecordingId !== recordingId || !isPlaybackPlaying) {
            handleTogglePlayback(recordingId);
        }
    }, [handleTogglePlayback, isPlaybackPlaying, playbackRecordingId, setSelectedRecording]);

    const handleClosePlaybackModal = React.useCallback(() => {
        handlePausePlayback();
        setPlaybackModalRecordingId(null);
    }, [handlePausePlayback]);

    React.useEffect(() => {
        if (!playbackModalRecording || !playbackSectionActiveEventRef.current) return;
        playbackSectionActiveEventRef.current.scrollIntoView({ block: 'nearest' });
    }, [playbackEventIndex, playbackModalRecording]);

    return (
        <>
            <div className="recordings-panel">
                {/* Panel Header */}
                <div className="panel-header panel-header--red">
                    <Icon name="video" size={14} className="panel-header__icon" />
                    <span className="panel-header__title">Recording</span>
                    <div className="panel-header__spacer" />
                    <span className="panel-header__count">
                        {isRecording ? 'Recording...' : `${recordings.length} saved`}
                    </span>
                </div>

                {/* Error display */}
                {error && (
                    <div className="recordings-panel__error">
                        <Icon name="alertCircle" size={14} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Recording Status/Controls */}
                <div className="recordings-panel__header">
                    <CollapsibleHeaderSection
                        icon="radio"
                        title={isRecording ? "Live Session" : "Start Session"}
                        color={isRecording ? "red" : "default"}
                        defaultExpanded={true}
                    >
                        {isRecording ? (
                            <>
                            {/* Row 1: Recording name + status */}
                            <div className="recording-status__info">
                                <StatusDot
                                    color="var(--color-accent-red)"
                                    pulse={!isPaused}
                                />
                                <span className="recording-status__name">
                                    {recordingName || 'Session Recording'}
                                </span>
                                {isPaused && (
                                    <span className="recording-status__paused">
                                        Paused
                                    </span>
                                )}
                            </div>

                            {/* Row 2: Stats */}
                            <div className="recording-status__stats">
                                <StatBadge icon="clock">
                                    <span className="monospace">
                                        {formatDuration(recordingDuration)}
                                    </span>
                                </StatBadge>
                                <StatBadge icon="circle">
                                    {markers.length} markers
                                </StatBadge>
                            </div>

                            {/* Row 3: Controls */}
                            <div className="recording-status__controls">
                                <div className="recording-status__controls-left">
                                    <Button
                                        icon={isPaused ? 'play' : 'pause'}
                                        variant="secondary"
                                        onClick={isPaused ? handleResumeRecording : handlePauseRecording}
                                        title={isPaused ? 'Resume' : 'Pause'}
                                    />
                                    <Button
                                        icon="circle"
                                        variant={showMarkerInput ? 'primary' : 'secondary'}
                                        onClick={handleToggleMarkerInput}
                                        title="Add Marker"
                                    />
                                </div>
                                <Button
                                    icon="stop"
                                    variant="danger"
                                    onClick={handleStopRecording}
                                >
                                    Stop
                                </Button>
                            </div>

                            {/* Marker Input */}
                            {showMarkerInput && (
                                <MarkerInput
                                    markerText={markerText}
                                    setMarkerText={setMarkerText}
                                    markerType={markerType}
                                    setMarkerType={setMarkerType}
                                    onSubmit={handleAddMarker}
                                    onCancel={() => setShowMarkerInput(false)}
                                />
                            )}

                            {/* Markers List */}
                            {markers.length > 0 && (
                                <div className="recording-status__markers">
                                    {markers.map(marker => (
                                        <MarkerItem
                                            key={marker.id}
                                            marker={marker}
                                            onDelete={handleDeleteMarker}
                                        />
                                    ))}
                                </div>
                            )}
                            </>
                        ) : (
                            <Button
                                icon="radio"
                                variant="danger"
                                fullWidth
                                onClick={handleStartRecording}
                            >
                                Start Recording
                            </Button>
                        )}
                    </CollapsibleHeaderSection>
                </div>

                {playbackModalRecording && (
                    <div className="recordings-panel__playback-workspace">
                        <div className="recordings-panel__playback-header">
                            <div className="recordings-panel__playback-header-copy">
                                <Icon name="play" size={14} />
                                <span>
                                    Playback Details: {playbackModalRecording.metadata?.name || 'Untitled Recording'}
                                </span>
                            </div>
                            <button
                                className="recordings-panel__playback-close"
                                onClick={handleClosePlaybackModal}
                                title="Close playback details"
                            >
                                <Icon name="x" size={14} />
                            </button>
                        </div>

                        <RecordingPlaybackPanelBody
                            metaItems={[
                                `Status: ${playbackModalRecording.status || 'ready'}`,
                                `Duration: ${formatDurationMs(Number(playbackModalRecording.duration_ms || playbackDurationMs || 0))}`,
                                `${playbackModalRecording.event_count || 0} events`,
                                playbackModalRecording.recorded_by_name
                                    ? `By ${playbackModalRecording.recorded_by_name}`
                                    : null,
                            ].filter(Boolean)}
                            playbackLabel={
                                isPlaybackLoading
                                    ? 'Loading playback events...'
                                    : (playbackError || formatPlaybackEvent(playbackCurrentEvent))
                            }
                            playbackDetail={playbackError || formatPlaybackEventDetail(playbackCurrentEvent)}
                            eventCount={playbackModalRecording.event_count || 0}
                            playbackEventIndex={playbackEventIndex}
                            isPlaybackLoading={isPlaybackLoading}
                            isPlaybackPlaying={isPlaybackPlaying}
                            playbackDurationMs={playbackDurationMs || Number(playbackModalRecording.duration_ms || 0)}
                            playbackTimeMs={playbackTimeMs}
                            playbackProgress={playbackProgress}
                            playbackEvents={playbackEvents}
                            playbackCurrentEvent={playbackCurrentEvent}
                            activeEventRef={playbackSectionActiveEventRef}
                            handleSeekStart={() => handleSeekPlayback(playbackModalRecording.id, 0, { play: false })}
                            handlePlayPause={() => handleTogglePlayback(playbackModalRecording.id)}
                            handleSeekEnd={() => handleSeekPlayback(playbackModalRecording.id, playbackDurationMs || Number(playbackModalRecording.duration_ms || 0), { play: false })}
                            handleProgressSeek={(e) => {
                                const totalDuration = playbackDurationMs || Number(playbackModalRecording.duration_ms || 0);
                                if (!totalDuration) return;
                                const rect = e.currentTarget.getBoundingClientRect();
                                if (!rect.width) return;
                                const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
                                handleSeekPlayback(playbackModalRecording.id, totalDuration * ratio);
                            }}
                        />
                    </div>
                )}

                {/* Past Recordings List */}
                <div className="recordings-panel__list">
                <SectionHeader
                    icon="video"
                    color="var(--color-accent-red)"
                    count={recordings.length}
                >
                    Past Recordings
                </SectionHeader>

                    {/* Search */}
                    <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search recordings..."
                    />

                {/* Controls Row */}
                <div className="recordings-tab__toolbar">
                    <div className="recordings-tab__controls">
                        {/* Filter dropdown */}
                        <div className="recordings-tab__dropdown">
                            <button
                                className={`recordings-tab__dropdown-btn ${filterBy !== 'all' ? 'recordings-tab__dropdown-btn--active' : ''}`}
                                title="Filter by date"
                            >
                                <Icon name="filter" size={12} />
                            </button>
                            <select
                                value={filterBy}
                                onChange={(e) => setFilterBy(e.target.value)}
                                className="recordings-tab__dropdown-select"
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                            </select>
                        </div>
                        {/* Sort dropdown */}
                        <div className="recordings-tab__dropdown">
                            <button
                                className="recordings-tab__dropdown-btn"
                                onClick={toggleSortOrder}
                                title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                            >
                                <Icon name={sortOrder === 'asc' ? 'arrowUp' : 'arrowDown'} size={12} />
                            </button>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="recordings-tab__dropdown-select"
                            >
                                <option value="date">Date</option>
                                <option value="name">Name</option>
                                <option value="duration">Duration</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Loading state */}
                {loading && (
                    <div className="recordings-tab__loading">
                        <Icon name="loader" size={20} className="spin" />
                        <span>Loading recordings...</span>
                    </div>
                )}

                {/* Empty state */}
                {!loading && filteredRecordings.length === 0 && (
                    <div className="recordings-tab__empty">
                        <Icon name="video" size={32} />
                        <span>
                            {searchQuery
                                ? 'No recordings match your search'
                                : 'No recordings yet. Start one above!'}
                        </span>
                    </div>
                )}

                {/* Recordings list */}
                    <div className="recordings-list">
                        {filteredRecordings.map(recording => (
                            <RecordingCard
                                key={recording.id}
                                recording={recording}
                                isSelected={selectedRecording === recording.id}
                                onSelect={setSelectedRecording}
                                onExport={handleExport}
                                onDownload={handleDownload}
                                onDelete={handleDelete}
                                isExporting={exportingId === recording.id}
                                isPlaybackActive={playbackRecordingId === recording.id}
                                isPlaybackPlaying={
                                    playbackRecordingId === recording.id && isPlaybackPlaying
                                }
                                isPlaybackLoading={
                                    playbackRecordingId === recording.id && isPlaybackLoading
                                }
                                playbackTimeMs={
                                    playbackRecordingId === recording.id ? playbackTimeMs : 0
                                }
                                playbackDurationMs={
                                    playbackRecordingId === recording.id
                                        ? playbackDurationMs
                                        : Number(recording.duration_ms || 0)
                                }
                                playbackEventIndex={
                                    playbackRecordingId === recording.id ? playbackEventIndex : -1
                                }
                                playbackCurrentEvent={
                                    playbackRecordingId === recording.id ? playbackCurrentEvent : null
                                }
                                playbackError={
                                    playbackRecordingId === recording.id ? playbackError : null
                                }
                                onOpenPlayback={handleOpenPlaybackModal}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="panel-footer">
                    <span className="panel-footer__info">
                        Storage: {totalSize}
                    </span>
                    <button
                        className="panel-footer__btn panel-footer__btn--icon"
                        onClick={refresh}
                        title="Refresh"
                    >
                        <Icon name="refreshCw" size={11} />
                    </button>
                </div>
            </div>
            <RecordingPlaybackModal
                recording={playbackModalRecording}
                isOpen={!!playbackModalRecording}
                isPlaybackPlaying={!!playbackModalRecording && isPlaybackPlaying}
                isPlaybackLoading={!!playbackModalRecording && isPlaybackLoading}
                playbackTimeMs={playbackTimeMs}
                playbackDurationMs={playbackDurationMs || Number(playbackModalRecording?.duration_ms || 0)}
                playbackProgress={playbackProgress}
                playbackEvents={playbackEvents}
                playbackEventIndex={playbackEventIndex}
                playbackCurrentEvent={playbackCurrentEvent}
                playbackError={playbackError}
                onClose={handleClosePlaybackModal}
                onPlayPause={handleTogglePlayback}
                onPausePlayback={handlePausePlayback}
                onSeek={handleSeekPlayback}
            />
        </>
    );
}

// Export with both names for backwards compatibility
export { RecordingsTab as RecordingsPanelContent };
export default RecordingsTab;
