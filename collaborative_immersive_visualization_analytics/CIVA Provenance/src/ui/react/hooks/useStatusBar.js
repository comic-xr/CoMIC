// src/ui/react/hooks/useStatusBar.js
// Hook for connecting real data to the StatusBar component
//
// This hook aggregates data from various services:
// - Connection/sync status from Y.js and server
// - Online users from presence system
// - Cursor visibility from user preferences
// - Recording status from recording service
// - FPS from render loop
// - Warnings from logging system
//
// Usage:
//   import { useStatusBar } from '@UI/react/hooks/useStatusBar.js';
//   const { syncStatus, onlineCount, fps, ... } = useStatusBar();

import { useState, useEffect, useCallback, useRef } from "react";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";
import { ws as log } from "@Utils/logger.js";

/**
 * Sync status type
 * @typedef {'connected' | 'syncing' | 'disconnected' | 'error'} SyncStatus
 */

/**
 * Recording mode type
 * @typedef {'workspace' | 'instance' | 'session'} RecordingMode
 */

/**
 * StatusBar data interface
 * @typedef {Object} StatusBarData
 * @property {SyncStatus} syncStatus - Current sync/connection status
 * @property {boolean} isSyncing - Whether actively syncing
 * @property {boolean} isConnected - Whether connected to server
 * @property {number} onlineCount - Number of online users
 * @property {Array} onlineUsers - List of online user objects
 * @property {boolean} cursorsVisible - Whether remote cursors are shown
 * @property {boolean} isRecording - Whether recording is active
 * @property {number} recordingDuration - Recording duration in seconds
 * @property {RecordingMode} recordingMode - Current recording mode
 * @property {number} warningCount - Number of active warnings
 * @property {number} fps - Current frames per second
 */

/**
 * useStatusBar Hook
 *
 * Connects to various system services to provide real-time status data.
 * All data is reactive and updates automatically.
 *
 * @returns {Object} StatusBar data and actions
 */
export function useStatusBar() {
  // =========================================================================
  // CONNECTION STATE
  // =========================================================================

  const [isConnected, setIsConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // Subscribe to WebSocket status
  useEffect(() => {
    const handleConnectionChange = (event) => {
      const { connected, syncing, error } = event.detail || {};
      setIsConnected(connected ?? true);
      setIsSyncing(syncing ?? false);
      setSyncError(error ?? null);
    };

    // Listen for connection events
    window.addEventListener("cia:connection-status", handleConnectionChange);
    window.addEventListener("cia:sync-status", handleConnectionChange);

    // Initial check
    const checkConnection = async () => {
      try {
        // Try to reach the server health endpoint
        const response = await fetch("/api/health", {
          method: "HEAD",
          signal: AbortSignal.timeout(3000),
        });
        setIsConnected(response.ok);
      } catch (error) {
        setIsConnected(false);
        log.debug("Server health check failed:", error.message);
      }
    };

    checkConnection();

    // Periodic health check (every 30 seconds)
    const healthInterval = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener(
        "cia:connection-status",
        handleConnectionChange
      );
      window.removeEventListener("cia:sync-status", handleConnectionChange);
      clearInterval(healthInterval);
    };
  }, []);

  // Compute sync status
  const syncStatus = !isConnected
    ? "disconnected"
    : syncError
    ? "error"
    : isSyncing
    ? "syncing"
    : "connected";

  // =========================================================================
  // ONLINE USERS
  // =========================================================================

  const [onlineCount, setOnlineCount] = useState(1); // At least self
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const handlePresenceChange = (users) => {
      setOnlineUsers(users || []);
      setOnlineCount(users?.length || 1);
    };

    // Subscribe to presence system
    const cleanup = presenceSystem.onPresenceChange?.(handlePresenceChange);

    // Initial state
    const initialUsers = presenceSystem.getOnlineUsers?.() || [];
    setOnlineUsers(initialUsers);
    setOnlineCount(initialUsers.length || 1);

    return () => cleanup?.();
  }, []);

  // =========================================================================
  // CURSOR VISIBILITY
  // =========================================================================

  const [cursorsVisible, setCursorsVisible] = useState(() => {
    // Load from localStorage
    const stored = localStorage.getItem("cia:cursors-visible");
    return stored !== null ? JSON.parse(stored) : true;
  });

  const toggleCursors = useCallback(() => {
    setCursorsVisible((prev) => {
      const newValue = !prev;
      localStorage.setItem("cia:cursors-visible", JSON.stringify(newValue));

      // Dispatch event for other components
      window.dispatchEvent(
        new CustomEvent("cia:cursors-visibility-change", {
          detail: { visible: newValue },
        })
      );

      return newValue;
    });
  }, []);

  // =========================================================================
  // RECORDING STATE
  // =========================================================================

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingMode, setRecordingMode] = useState("workspace");
  const recordingIntervalRef = useRef(null);

  useEffect(() => {
    const handleRecordingStart = (event) => {
      const { mode } = event.detail || {};
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingMode(mode || "workspace");

      // Start duration counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    };

    const handleRecordingStop = () => {
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    };

    window.addEventListener("cia:recording-started", handleRecordingStart);
    window.addEventListener("cia:recording-stopped", handleRecordingStop);

    return () => {
      window.removeEventListener("cia:recording-started", handleRecordingStart);
      window.removeEventListener("cia:recording-stopped", handleRecordingStop);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const stopRecording = useCallback(() => {
    window.dispatchEvent(new CustomEvent("cia:recording-stopped"));
  }, []);

  // =========================================================================
  // WARNING COUNT
  // =========================================================================

  const [warningCount, setWarningCount] = useState(0);

  useEffect(() => {
    // Listen for warning events
    const handleWarning = () => {
      setWarningCount((prev) => prev + 1);
    };

    const handleWarningClear = () => {
      setWarningCount(0);
    };

    window.addEventListener("cia:warning", handleWarning);
    window.addEventListener("cia:warnings-cleared", handleWarningClear);

    return () => {
      window.removeEventListener("cia:warning", handleWarning);
      window.removeEventListener("cia:warnings-cleared", handleWarningClear);
    };
  }, []);

  const clearWarnings = useCallback(() => {
    setWarningCount(0);
    window.dispatchEvent(new CustomEvent("cia:warnings-cleared"));
  }, []);

  // =========================================================================
  // FPS MONITORING
  // =========================================================================

  const [fps, setFps] = useState(60);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId;

    const measureFps = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = currentTime;
      }

      animationId = requestAnimationFrame(measureFps);
    };

    animationId = requestAnimationFrame(measureFps);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  // =========================================================================
  // RETURN INTERFACE
  // =========================================================================

  return {
    // Connection
    syncStatus,
    isConnected,
    isSyncing,
    syncError,

    // Users
    onlineCount,
    onlineUsers,

    // Cursors
    cursorsVisible,
    toggleCursors,

    // Recording
    isRecording,
    recordingDuration,
    recordingMode,
    stopRecording,

    // Warnings
    warningCount,
    clearWarnings,

    // Performance
    fps,
  };
}

export default useStatusBar;
