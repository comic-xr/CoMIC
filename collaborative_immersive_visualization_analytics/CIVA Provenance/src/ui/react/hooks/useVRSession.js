/**
 * @file useVRSession.js
 * @description Hook for managing VR exploration session state.
 *
 * Provides:
 * - Active session tracking
 * - Participant list
 * - Session actions (create, join, leave, end)
 * - VR support detection
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { vrManager } from "@Core/vr/VRManager.js";
import { toast } from "@UI/react/store/toastStore.js";

/**
 * Hook for VR session state management
 *
 * @param {string} projectId - Current project ID
 * @returns {Object} VR session state and actions
 */
export function useVRSession(projectId) {
  // VR support state
  const [vrSupported, setVrSupported] = useState(false);
  const [vrCapabilities, setVrCapabilities] = useState(null);
  const [checkingSupport, setCheckingSupport] = useState(true);

  // Session state
  const [activeSessions, setActiveSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isInVR, setIsInVR] = useState(false);

  // Loading states
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [joiningSession, setJoiningSession] = useState(false);

  // Check VR support on mount
  useEffect(() => {
    const checkSupport = async () => {
      setCheckingSupport(true);
      try {
        const supported = vrManager.isVRSupported();
        setVrSupported(supported);

        if (supported) {
          const capabilities = await vrManager.checkVRCapabilities();
          setVrCapabilities(capabilities);
        }
      } catch (err) {
        console.error("VR support check failed:", err);
        setVrSupported(false);
      } finally {
        setCheckingSupport(false);
      }
    };

    checkSupport();
  }, []);

  // Listen for VR manager session events
  useEffect(() => {
    const handleSessionStarted = (session) => {
      setIsInVR(true);
      setCurrentSession(session);
    };

    const handleSessionEnded = () => {
      setIsInVR(false);
      setCurrentSession(null);
      setParticipants([]);
    };

    vrManager.on("sessionStarted", handleSessionStarted);
    vrManager.on("sessionEnded", handleSessionEnded);

    setIsInVR(vrManager.isInVR());

    return () => {
      vrManager.off("sessionStarted", handleSessionStarted);
      vrManager.off("sessionEnded", handleSessionEnded);
    };
  }, []);

  // Fetch active sessions for project
  const fetchActiveSessions = useCallback(async () => {
    if (!projectId) return;

    setLoadingSessions(true);
    try {
      const response = await fetch(
        `/api/vr/sessions?projectId=${projectId}`,
        {
          headers: {
            "x-user-id": localStorage.getItem("userId") || "anonymous",
          },
        }
      );

      if (response.ok) {
        const sessions = await response.json();
        setActiveSessions(sessions);
      }
    } catch (err) {
      console.error("Failed to fetch VR sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  }, [projectId]);

  // Fetch sessions on mount and project change
  useEffect(() => {
    fetchActiveSessions();
  }, [fetchActiveSessions]);

  // Listen for WebSocket session events (via serverSync custom events)
  useEffect(() => {
    const handleSessionCreated = (event) => {
      const { session } = event.detail || {};
      // Refresh sessions list to get full session details
      fetchActiveSessions();
      toast.info(`VR session started by ${session?.ownerUserName || "someone"}`);
    };

    const handleSessionUpdated = (event) => {
      const { sessionId, updates } = event.detail || {};
      // Update session in list
      setActiveSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, ...updates } : s))
      );
      // Update current session if it matches
      if (currentSession?.id === sessionId) {
        setCurrentSession((prev) => (prev ? { ...prev, ...updates } : prev));
      }
    };

    const handleSessionEnded = (event) => {
      const { sessionId } = event.detail || {};
      setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setParticipants([]);
        toast.info("VR session has ended");
      }
    };

    const handleParticipantJoined = (event) => {
      const { sessionId, participant } = event.detail || {};
      if (currentSession?.id === sessionId) {
        setParticipants((prev) => {
          const exists = prev.some((p) => p.odUserId === participant.odUserId);
          if (exists) return prev;
          return [...prev, participant];
        });
        toast.info(`${participant?.userName || "Someone"} joined the VR session`);
      }
      // Update session participant count in list
      setActiveSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, participant_count: (s.participant_count || 1) + 1 }
            : s
        )
      );
    };

    const handleParticipantLeft = (event) => {
      const { sessionId, userId } = event.detail || {};
      if (currentSession?.id === sessionId) {
        setParticipants((prev) => prev.filter((p) => p.odUserId !== userId));
      }
      // Update session participant count in list
      setActiveSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, participant_count: Math.max(0, (s.participant_count || 1) - 1) }
            : s
        )
      );
    };

    const handleSnapshotCreated = (event) => {
      const { sessionId, snapshot } = event.detail || {};
      if (currentSession?.id === sessionId) {
        toast.success(`Snapshot "${snapshot?.name}" created`);
      }
    };

    // Subscribe to serverSync custom events (cia: prefix)
    window.addEventListener("cia:vr-session-created", handleSessionCreated);
    window.addEventListener("cia:vr-session-updated", handleSessionUpdated);
    window.addEventListener("cia:vr-session-ended", handleSessionEnded);
    window.addEventListener("cia:vr-participant-joined", handleParticipantJoined);
    window.addEventListener("cia:vr-participant-left", handleParticipantLeft);
    window.addEventListener("cia:vr-snapshot-created", handleSnapshotCreated);

    return () => {
      window.removeEventListener("cia:vr-session-created", handleSessionCreated);
      window.removeEventListener("cia:vr-session-updated", handleSessionUpdated);
      window.removeEventListener("cia:vr-session-ended", handleSessionEnded);
      window.removeEventListener("cia:vr-participant-joined", handleParticipantJoined);
      window.removeEventListener("cia:vr-participant-left", handleParticipantLeft);
      window.removeEventListener("cia:vr-snapshot-created", handleSnapshotCreated);
    };
  }, [currentSession, fetchActiveSessions]);

  /**
   * Join an existing VR session
   */
  const joinSession = useCallback(
    async (sessionId, mode = "desktop-observer") => {
      setJoiningSession(true);
      try {
        const response = await fetch(`/api/vr/sessions/${sessionId}/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": localStorage.getItem("userId") || "anonymous",
            "x-user-name": localStorage.getItem("userName") || "Anonymous",
          },
          body: JSON.stringify({ mode }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to join session");
        }

        const participant = await response.json();

        // Fetch full session details
        const sessionResponse = await fetch(`/api/vr/sessions/${sessionId}`, {
          headers: {
            "x-user-id": localStorage.getItem("userId") || "anonymous",
          },
        });

        if (sessionResponse.ok) {
          const session = await sessionResponse.json();
          setCurrentSession(session);
          setParticipants(session.participants || []);
        }

        toast.success("Joined VR session");
        return participant;
      } catch (err) {
        toast.error(`Failed to join session: ${err.message}`);
        throw err;
      } finally {
        setJoiningSession(false);
      }
    },
    []
  );

  /**
   * Leave the current session
   */
  const leaveSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      await fetch(`/api/vr/sessions/${currentSession.id}/leave`, {
        method: "POST",
        headers: {
          "x-user-id": localStorage.getItem("userId") || "anonymous",
        },
      });

      // Exit VR if in VR mode
      if (isInVR) {
        await vrManager.exitVR();
      }

      setCurrentSession(null);
      setParticipants([]);
      toast.success("Left VR session");
    } catch (err) {
      toast.error(`Failed to leave session: ${err.message}`);
    }
  }, [currentSession, isInVR]);

  /**
   * End the current session (owner only)
   */
  const endSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      await fetch(`/api/vr/sessions/${currentSession.id}`, {
        method: "DELETE",
        headers: {
          "x-user-id": localStorage.getItem("userId") || "anonymous",
        },
      });

      // Exit VR if in VR mode
      if (isInVR) {
        await vrManager.exitVR();
      }

      setCurrentSession(null);
      setParticipants([]);
      setActiveSessions((prev) =>
        prev.filter((s) => s.id !== currentSession.id)
      );
      toast.success("VR session ended");
    } catch (err) {
      toast.error(`Failed to end session: ${err.message}`);
    }
  }, [currentSession, isInVR]);

  /**
   * Create a snapshot of the current session
   */
  const createSnapshot = useCallback(
    async (name) => {
      if (!currentSession) return;

      try {
        const response = await fetch(
          `/api/vr/sessions/${currentSession.id}/snapshots`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": localStorage.getItem("userId") || "anonymous",
              "x-user-name": localStorage.getItem("userName") || "Anonymous",
            },
            body: JSON.stringify({
              name: name || `Snapshot ${new Date().toLocaleTimeString()}`,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to create snapshot");
        }

        const snapshot = await response.json();
        toast.success("Snapshot created");
        return snapshot;
      } catch (err) {
        toast.error(`Failed to create snapshot: ${err.message}`);
        throw err;
      }
    },
    [currentSession]
  );

  // Check if current user is session owner
  const isOwner = useMemo(() => {
    if (!currentSession) return false;
    const userId = localStorage.getItem("userId") || "anonymous";
    return currentSession.ownerUserId === userId;
  }, [currentSession]);

  // Get sessions relevant to a specific dataset
  const getSessionsForDataset = useCallback(
    (datasetId) => {
      return activeSessions.filter(
        (s) => s.datasetId === datasetId && s.status !== "ended"
      );
    },
    [activeSessions]
  );

  return {
    // VR support
    vrSupported,
    vrCapabilities,
    checkingSupport,

    // Session state
    activeSessions,
    currentSession,
    participants,
    isInVR,
    isOwner,

    // Loading states
    loadingSessions,
    joiningSession,

    // Actions
    fetchActiveSessions,
    joinSession,
    leaveSession,
    endSession,
    createSnapshot,
    getSessionsForDataset,
  };
}

export default useVRSession;
