// src/ui/react/hooks/useLogging.js
// React hook for displaying progress logs in UI
//
// This hook subscribes to progress log events from @Utils/logger.js
// and maintains a React state array for the LoggingPanel component.
//
// IMPORTANT: For logging in non-React code (algorithms, services, etc.),
// import directly from @Utils/logger.js instead:
//
//   import { logProgress, logSuccess, logError } from '@Utils/logger.js';

import { useState, useEffect, useCallback } from "react";
import { subscribeToProgressLogs, LogType } from "@Utils/logger.js";

// Re-export LogType for backward compatibility with LoggingPanel
export { LogType };

// Maximum logs to keep in memory (prevents memory leaks in long sessions)
const MAX_LOGS = 200;

/**
 * useLogging - React hook for log display
 *
 * Use this ONLY in React components that need to display logs.
 * For creating logs, use the functions from @Utils/logger.js directly.
 *
 * @returns {{ logs: Array, clearLogs: Function }}
 */
export function useLogging() {
  const [logs, setLogs] = useState([]);

  // Subscribe to progress log events
  useEffect(() => {
    const unsubscribe = subscribeToProgressLogs((logEntry) => {
      setLogs((prev) => {
        const newLogs = [...prev, logEntry];
        // Trim to max size
        if (newLogs.length > MAX_LOGS) {
          return newLogs.slice(-MAX_LOGS);
        }
        return newLogs;
      });
    });

    return unsubscribe;
  }, []);

  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return { logs, clearLogs };
}