// src/ui/react/hooks/useRecordings.js
// Hook for managing session recordings and local playback state.

import { useState, useEffect, useCallback, useRef } from "react";
import { sessionManager } from "@Core/session/sessionManager.js";
import { config } from "@Core/config/clientConfig.js";
import { app as log } from "@Utils/logger.js";
import { recordingCaptureService } from "@Services/recordingCaptureService.js";

import { useAsyncData, useAsyncMutation } from "./useAsyncData";
import { useServerSyncEvents } from "./useWebSocketEvents";

const PLAYBACK_FETCH_LIMIT = 10000;
const PLAYBACK_TICK_MS = 100;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function findPlaybackEventIndex(events, timeMs) {
  let low = 0;
  let high = events.length - 1;
  let result = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const eventTime = Number(events[mid]?.timestamp_offset_ms || 0);

    if (eventTime <= timeMs) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
}

function getDownloadFilename(response, recordingId) {
  const disposition = response.headers.get("content-disposition");
  const match = disposition?.match(/filename="([^"]+)"/);
  return match?.[1] || `recording-${recordingId}.jsonl.gz`;
}

/**
 * Hook for managing session recordings
 *
 * @returns {Object} Recording state and controls
 */
export function useRecordings() {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeRecordingId, setActiveRecordingId] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingName, setRecordingName] = useState("");
  const [recordingOptions, setRecordingOptions] = useState({
    includeAudio: true,
    includeChat: true,
    includeAnnotations: true,
    includeCursors: false,
  });

  // Playback state
  const [playbackRecordingId, setPlaybackRecordingId] = useState(null);
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState(false);
  const [isPlaybackLoading, setIsPlaybackLoading] = useState(false);
  const [playbackTimeMs, setPlaybackTimeMs] = useState(0);
  const [playbackEvents, setPlaybackEvents] = useState([]);
  const [playbackError, setPlaybackError] = useState(null);

  const durationIntervalRef = useRef(null);
  const playbackIntervalRef = useRef(null);
  const playbackLastTickRef = useRef(null);
  const playbackCacheRef = useRef(new Map());

  const projectId =
    sessionManager.getProjectId?.() || sessionManager.getRoomId?.();
  const apiBase = config.apiBaseUrl || "http://localhost:3001/api";

  const buildHeaders = useCallback((includeContentType = true) => {
    const headers = {
      "x-user-id": sessionManager.getUserId?.() || "anonymous",
      "x-user-email": sessionManager.getUserEmail?.() || "anonymous@local",
      "x-user-name": sessionManager.getUserName?.() || "Anonymous",
    };

    if (includeContentType) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  }, []);

  const getRecordingDurationMs = useCallback(
    (recordingId) => {
      const recording = recordingsRef.current.find((item) => item.id === recordingId);
      return Number(recording?.duration_ms || 0);
    },
    []
  );

  const recordingsRef = useRef([]);

  // ---------------------------------------------------------------------------
  // FETCH RECORDINGS
  // ---------------------------------------------------------------------------

  const fetchRecordings = useCallback(
    async (signal) => {
      if (!projectId) return [];

      const response = await fetch(`${apiBase}/projects/${projectId}/recordings`, {
        signal,
        headers: buildHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recordings: ${response.status}`);
      }

      const data = await response.json();
      return data.recordings || [];
    },
    [apiBase, buildHeaders, projectId]
  );

  const { data: recordings, isLoading, error, refetch } = useAsyncData(
    fetchRecordings,
    [projectId],
    {
      initialData: [],
      enabled: !!projectId,
    }
  );

  useEffect(() => {
    recordingsRef.current = recordings;
  }, [recordings]);

  // ---------------------------------------------------------------------------
  // CHECK FOR ACTIVE RECORDING
  // ---------------------------------------------------------------------------

  const checkActiveRecording = useCallback(async () => {
    if (!projectId) return;

    try {
      const response = await fetch(
        `${apiBase}/projects/${projectId}/recordings/status/active`,
        {
          headers: buildHeaders(),
        }
      );

      if (!response.ok) return;

      const data = await response.json();

      if (data.active && data.recording) {
        setIsRecording(true);
        setActiveRecordingId(data.recording.id);
        setRecordingDuration(Math.floor(data.elapsed_ms / 1000));

        const metadata = data.recording.metadata || {};
        setRecordingName(metadata.name || "Untitled Recording");
        setRecordingOptions({
          includeAudio: metadata.includeAudio ?? true,
          includeChat: metadata.includeChat ?? true,
          includeAnnotations: metadata.includeAnnotations ?? true,
          includeCursors: metadata.includeCursors ?? false,
        });
      }
    } catch (err) {
      log.warn("Failed to check active recording:", err);
    }
  }, [apiBase, buildHeaders, projectId]);

  useEffect(() => {
    checkActiveRecording();
  }, [checkActiveRecording]);

  // ---------------------------------------------------------------------------
  // DURATION TIMER
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isRecording && !isPaused) {
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // ---------------------------------------------------------------------------
  // PLAYBACK
  // ---------------------------------------------------------------------------

  const loadPlaybackEvents = useCallback(
    async (recordingId) => {
      if (!projectId || !recordingId) return null;

      if (playbackCacheRef.current.has(recordingId)) {
        return playbackCacheRef.current.get(recordingId);
      }

      setIsPlaybackLoading(true);
      setPlaybackError(null);

      try {
        const response = await fetch(
          `${apiBase}/projects/${projectId}/recordings/${recordingId}/events?limit=${PLAYBACK_FETCH_LIMIT}`,
          {
            headers: buildHeaders(),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load playback events: ${response.status}`);
        }

        const data = await response.json();
        const events = Array.isArray(data.events) ? data.events : [];

        if (data.hasMore) {
          log.warn(
            `Playback event list for ${recordingId} was truncated at ${PLAYBACK_FETCH_LIMIT} events`
          );
        }

        playbackCacheRef.current.set(recordingId, events);
        return events;
      } catch (err) {
        const message = err.message || "Failed to load playback events";
        setPlaybackError(message);
        log.error("Playback load failed:", err);
        return null;
      } finally {
        setIsPlaybackLoading(false);
      }
    },
    [apiBase, buildHeaders, projectId]
  );

  const activatePlayback = useCallback(
    async (recordingId) => {
      if (!recordingId) return null;

      if (playbackRecordingId === recordingId) {
        return playbackEvents;
      }

      const events = await loadPlaybackEvents(recordingId);
      if (events === null) {
        return null;
      }

      setPlaybackRecordingId(recordingId);
      setPlaybackEvents(events);
      setPlaybackTimeMs(0);
      setPlaybackError(null);

      return events;
    },
    [loadPlaybackEvents, playbackEvents, playbackRecordingId]
  );

  const pausePlayback = useCallback(() => {
    setIsPlaybackPlaying(false);
  }, []);

  const stopPlayback = useCallback(() => {
    setIsPlaybackPlaying(false);
    setPlaybackRecordingId(null);
    setPlaybackEvents([]);
    setPlaybackTimeMs(0);
    setPlaybackError(null);
  }, []);

  const seekPlayback = useCallback(
    async (recordingId, nextTimeMs, options = {}) => {
      const events = await activatePlayback(recordingId);
      if (events === null) {
        return null;
      }

      const durationMs = getRecordingDurationMs(recordingId);
      const clampedTime = clamp(nextTimeMs, 0, durationMs);

      setPlaybackRecordingId(recordingId);
      setPlaybackEvents(events);
      setPlaybackTimeMs(clampedTime);

      if (options.play === true) {
        setIsPlaybackPlaying(true);
      } else if (options.play === false) {
        setIsPlaybackPlaying(false);
      }

      return clampedTime;
    },
    [activatePlayback, getRecordingDurationMs]
  );

  const playRecording = useCallback(
    async (recordingId) => {
      if (!recordingId) return null;

      const isSameRecording = playbackRecordingId === recordingId;
      if (isSameRecording && isPlaybackPlaying) {
        setIsPlaybackPlaying(false);
        return false;
      }

      const events = await activatePlayback(recordingId);
      if (events === null) {
        return null;
      }

      const durationMs = getRecordingDurationMs(recordingId);
      setPlaybackRecordingId(recordingId);
      setPlaybackEvents(events);
      setPlaybackError(null);

      if (!isSameRecording || playbackTimeMs >= durationMs) {
        setPlaybackTimeMs(0);
      }

      setIsPlaybackPlaying(true);
      return true;
    },
    [
      activatePlayback,
      getRecordingDurationMs,
      isPlaybackPlaying,
      playbackRecordingId,
      playbackTimeMs,
    ]
  );

  useEffect(() => {
    if (!playbackRecordingId || !isPlaybackPlaying) {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      return;
    }

    playbackLastTickRef.current = Date.now();
    playbackIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const lastTick = playbackLastTickRef.current || now;
      const delta = now - lastTick;
      playbackLastTickRef.current = now;

      setPlaybackTimeMs((prev) => {
        const durationMs = getRecordingDurationMs(playbackRecordingId);
        const nextTime = clamp(prev + delta, 0, durationMs);

        if (nextTime >= durationMs) {
          setIsPlaybackPlaying(false);
        }

        return nextTime;
      });
    }, PLAYBACK_TICK_MS);

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    };
  }, [getRecordingDurationMs, isPlaybackPlaying, playbackRecordingId]);

  useEffect(() => {
    if (
      playbackRecordingId &&
      !recordings.some((item) => item.id === playbackRecordingId)
    ) {
      stopPlayback();
    }
  }, [playbackRecordingId, recordings, stopPlayback]);

  const playbackDurationMs = playbackRecordingId
    ? getRecordingDurationMs(playbackRecordingId)
    : 0;
  const playbackEventIndex = playbackRecordingId
    ? findPlaybackEventIndex(playbackEvents, playbackTimeMs)
    : -1;
  const playbackCurrentEvent =
    playbackEventIndex >= 0 ? playbackEvents[playbackEventIndex] : null;
  const playbackProgress =
    playbackDurationMs > 0 ? playbackTimeMs / playbackDurationMs : 0;

  useEffect(() => {
    if (!playbackRecordingId) return;

    window.dispatchEvent(
      new CustomEvent("recording:playback", {
        detail: {
          recordingId: playbackRecordingId,
          isPlaying: isPlaybackPlaying,
          timeMs: playbackTimeMs,
          durationMs: playbackDurationMs,
          currentEvent: playbackCurrentEvent,
          eventIndex: playbackEventIndex,
          eventCount: playbackEvents.length,
        },
      })
    );
  }, [
    isPlaybackPlaying,
    playbackCurrentEvent,
    playbackDurationMs,
    playbackEventIndex,
    playbackEvents.length,
    playbackRecordingId,
    playbackTimeMs,
  ]);

  // ---------------------------------------------------------------------------
  // WEBSOCKET EVENTS
  // ---------------------------------------------------------------------------

  useServerSyncEvents("recording", {
    onCreate: () => refetch(),
    onUpdate: (detail) => {
      if (detail.recordingId === activeRecordingId) {
        if (detail.status === "paused") {
          setIsPaused(true);
        } else if (detail.status === "recording") {
          setIsPaused(false);
        }
      }
      refetch();
    },
    onDelete: () => refetch(),
  });

  // ---------------------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------------------

  const { mutate: startRecording, isLoading: isStarting } = useAsyncMutation(
    async (options = {}) => {
      const name =
        options.name ||
        recordingName ||
        `Recording ${new Date().toLocaleString()}`;
      const opts = { ...recordingOptions, ...options };

      const response = await fetch(
        `${apiBase}/projects/${projectId}/recordings/start`,
        {
          method: "POST",
          headers: buildHeaders(),
          body: JSON.stringify({
            name,
            mode: opts.mode || "full",
            options: opts,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to start recording: ${response.status}`
        );
      }

      const data = await response.json();

      setIsRecording(true);
      setActiveRecordingId(data.recording.id);
      setRecordingDuration(0);
      setRecordingName(name);
      setRecordingOptions(opts);
      window.dispatchEvent(
        new CustomEvent("recording:start", {
          detail: { mode: opts.mode || "Workspace", recordingId: data.recording.id },
        })
      );

      log.info(`Recording started: ${data.recording.id}`);
      return data.recording;
    },
    { onSuccess: refetch }
  );

  const { mutate: stopRecording, isLoading: isStopping } = useAsyncMutation(
    async () => {
      if (!activeRecordingId) {
        throw new Error("No active recording to stop");
      }

      await recordingCaptureService.flush();

      const response = await fetch(
        `${apiBase}/projects/${projectId}/recordings/${activeRecordingId}/stop`,
        {
          method: "POST",
          headers: buildHeaders(),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to stop recording: ${response.status}`
        );
      }

      const data = await response.json();

      setIsRecording(false);
      setIsPaused(false);
      setActiveRecordingId(null);
      setRecordingDuration(0);
      window.dispatchEvent(new CustomEvent("recording:stop"));

      log.info(`Recording stopped: ${activeRecordingId}`);
      return data.recording;
    },
    { onSuccess: refetch }
  );

  const { mutate: pauseRecording } = useAsyncMutation(async () => {
    if (!activeRecordingId) return;

    const response = await fetch(
      `${apiBase}/projects/${projectId}/recordings/${activeRecordingId}/pause`,
      {
        method: "POST",
        headers: buildHeaders(false),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to pause recording");
    }

    setIsPaused(true);
    window.dispatchEvent(new CustomEvent("recording:pause"));
    log.info("Recording paused");
  });

  const { mutate: resumeRecording } = useAsyncMutation(async () => {
    if (!activeRecordingId) return;

    const response = await fetch(
      `${apiBase}/projects/${projectId}/recordings/${activeRecordingId}/resume`,
      {
        method: "POST",
        headers: buildHeaders(false),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to resume recording");
    }

    setIsPaused(false);
    window.dispatchEvent(new CustomEvent("recording:resume"));
    log.info("Recording resumed");
  });

  const { mutate: deleteRecording, isLoading: isDeleting } = useAsyncMutation(
    async (recordingId) => {
      const response = await fetch(
        `${apiBase}/projects/${projectId}/recordings/${recordingId}`,
        {
          method: "DELETE",
          headers: buildHeaders(false),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete recording");
      }

      if (playbackRecordingId === recordingId) {
        stopPlayback();
      }

      log.info(`Recording deleted: ${recordingId}`);
      return { id: recordingId };
    },
    { onSuccess: refetch }
  );

  const { mutate: exportRecording } = useAsyncMutation(
    async (recordingId) => {
      const response = await fetch(
        `${apiBase}/projects/${projectId}/recordings/${recordingId}/export`,
        {
          method: "POST",
          headers: buildHeaders(),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to export recording: ${response.status}`
        );
      }

      return response.json();
    },
    { onSuccess: refetch }
  );

  const downloadRecording = useCallback(
    async (recordingId) => {
      const response = await fetch(
        `${apiBase}/projects/${projectId}/recordings/${recordingId}/download`,
        {
          headers: buildHeaders(false),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to download recording: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getDownloadFilename(response, recordingId);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    [apiBase, buildHeaders, projectId]
  );

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  const formatDuration = useCallback((seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const getPlaybackUrl = useCallback(
    (recordingId) => {
      if (!projectId) return null;
      return `${apiBase}/projects/${projectId}/recordings/${recordingId}/events`;
    },
    [apiBase, projectId]
  );

  return {
    // Data
    recordings,
    isLoading,
    loading: isLoading,
    error,

    // Active recording state
    isRecording,
    isPaused,
    activeRecordingId,
    recordingDuration,
    recordingName,
    recordingOptions,
    formattedDuration: formatDuration(recordingDuration),

    // Playback state
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

    // Mutation states
    isStarting,
    isStopping,
    isDeleting,

    // Recording configuration
    setRecordingName,
    setRecordingOptions,

    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    deleteRecording,
    exportRecording,
    downloadRecording,
    playRecording,
    pausePlayback,
    stopPlayback,
    seekPlayback,
    getPlaybackUrl,
    refetch,
    refresh: refetch,
  };
}

export default useRecordings;
