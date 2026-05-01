/**
 * @file VRExploreButton.jsx
 * @description Button to launch VR exploration session with configuration modal.
 *
 * This component differs from VRButton in that it:
 * - Opens a configuration modal before entering VR
 * - Creates a collaborative VR session
 * - Supports joining existing sessions
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Icon } from "@UI/react/components/atoms/Icon";
import { SlashedIcon } from "@UI/react/components/atoms/IconOverlay/IconOverlay.jsx";
import { vrManager } from "@Core/vr/VRManager.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { VRLaunchModal } from "@UI/react/components/modals/VRLaunchModal";
import { toast } from "@UI/react/store/toastStore.js";
import "./VRExploreButton.scss";

/**
 * VRExploreButton - Button to launch VR exploration with configuration
 *
 * @param {Object} props
 * @param {string} props.instanceId - The instance to explore
 * @param {Object} props.dataset - Dataset to explore
 * @param {Object} props.viewConfig - Current view configuration
 * @param {string} props.projectId - Project ID
 * @param {Object} props.selection - Current selection (optional)
 * @param {Object[]} props.activeSessions - Active VR sessions in this project
 * @param {string} props.size - Button size: 'sm' | 'md' | 'lg'
 * @param {boolean} props.showLabel - Whether to show text label
 * @param {string} props.variant - Visual variant: 'default' | 'primary' | 'minimal'
 * @param {string} props.className - Additional CSS class
 */
export function VRExploreButton({
  instanceId,
  dataset,
  viewConfig,
  projectId,
  selection,
  activeSessions = [],
  size = "sm",
  showLabel = false,
  variant = "default",
  className = "",
}) {
  // VR state
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInVR, setIsInVR] = useState(false);
  const [handlerSupportsVR, setHandlerSupportsVR] = useState(false);

  // Modal state
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [showSessionList, setShowSessionList] = useState(false);

  // Check VR support on mount
  useEffect(() => {
    const checkSupport = async () => {
      setIsLoading(true);

      try {
        const vrSupported = vrManager.isVRSupported();
        if (!vrSupported) {
          setIsSupported(false);
          setIsLoading(false);
          return;
        }

        const capabilities = await vrManager.checkVRCapabilities();
        setIsSupported(capabilities.supported);

        // Check if handler supports VR exploration
        if (instanceId) {
          const instance = workspaceManager.getInstance(instanceId);
          if (instance?.handler) {
            // Check for VR exploration support (different from basic VR)
            const supportsExploration =
              typeof instance.handler.supportsVRExploration === "function"
                ? instance.handler.supportsVRExploration()
                : typeof instance.handler.supportsInstanceVR === "function"
                  ? instance.handler.supportsInstanceVR()
                  : false;
            setHandlerSupportsVR(supportsExploration);
          }
        }
      } catch (err) {
        console.error("VR exploration check failed:", err);
        setIsSupported(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSupport();
  }, [instanceId]);

  // Listen for VR session changes
  useEffect(() => {
    const handleSessionStarted = () => setIsInVR(true);
    const handleSessionEnded = () => setIsInVR(false);

    vrManager.on("sessionStarted", handleSessionStarted);
    vrManager.on("sessionEnded", handleSessionEnded);

    setIsInVR(vrManager.isInVR());

    return () => {
      vrManager.off("sessionStarted", handleSessionStarted);
      vrManager.off("sessionEnded", handleSessionEnded);
    };
  }, []);

  // Relevant active sessions for this dataset
  const relevantSessions = useMemo(() => {
    if (!dataset) return [];
    return activeSessions.filter(
      (s) => s.datasetId === dataset.id && s.status !== "ended"
    );
  }, [activeSessions, dataset]);

  /**
   * Handle button click
   */
  const handleClick = useCallback(() => {
    if (isInVR) {
      // If in VR, exit
      vrManager.exitVR();
      return;
    }

    if (relevantSessions.length > 0) {
      // Show session list to join or create new
      setShowSessionList(true);
    } else {
      // Open launch modal directly
      setShowLaunchModal(true);
    }
  }, [isInVR, relevantSessions]);

  /**
   * Handle joining an existing session
   */
  const handleJoinSession = useCallback(async (session) => {
    try {
      const response = await fetch(`/api/vr/sessions/${session.id}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": localStorage.getItem("userId") || "anonymous",
          "x-user-name": localStorage.getItem("userName") || "Anonymous",
        },
        body: JSON.stringify({ mode: "desktop-observer" }),
      });

      if (!response.ok) {
        throw new Error("Failed to join session");
      }

      toast.success(`Joined ${session.ownerUserName}'s VR session`);
      setShowSessionList(false);
    } catch (err) {
      toast.error(`Failed to join session: ${err.message}`);
    }
  }, []);

  /**
   * Handle launching a new session
   */
  const handleLaunchNew = useCallback(() => {
    setShowSessionList(false);
    setShowLaunchModal(true);
  }, []);

  /**
   * Handle session launched
   */
  const handleSessionLaunched = useCallback((session) => {
    setShowLaunchModal(false);
  }, []);

  // Determine visibility
  const shouldShow = isSupported && (handlerSupportsVR || !instanceId);

  if (isLoading) {
    return (
      <button
        className={`vr-explore-button vr-explore-button--${size} vr-explore-button--${variant} vr-explore-button--loading ${className}`}
        disabled
        title="Checking VR support..."
      >
        <span className="vr-explore-button__icon">
          <Icon name="loader" size={size === "lg" ? 18 : size === "md" ? 16 : 14} />
        </span>
        {showLabel && <span className="vr-explore-button__label">VR</span>}
      </button>
    );
  }

  if (!shouldShow) {
    return null;
  }

  const iconSize = size === "lg" ? 18 : size === "md" ? 16 : 14;

  const getTooltip = () => {
    if (isInVR) return "Exit VR exploration";
    if (relevantSessions.length > 0) return `Join VR session (${relevantSessions.length} active)`;
    return "Start VR exploration";
  };

  const getLabel = () => {
    if (isInVR) return "Exit VR";
    if (relevantSessions.length > 0) return `VR (${relevantSessions.length})`;
    return "Explore in VR";
  };

  return (
    <>
      <button
        className={`vr-explore-button vr-explore-button--${size} vr-explore-button--${variant} ${isInVR ? "vr-explore-button--active" : ""} ${className}`}
        onClick={handleClick}
        title={getTooltip()}
        aria-label={getTooltip()}
        aria-pressed={isInVR}
      >
        <span className="vr-explore-button__icon">
          {isInVR ? (
            <SlashedIcon icon="vr" size={iconSize} />
          ) : (
            <Icon name="vr" size={iconSize} />
          )}
        </span>

        {showLabel && <span className="vr-explore-button__label">{getLabel()}</span>}

        {/* Session count badge */}
        {!isInVR && relevantSessions.length > 0 && !showLabel && (
          <span className="vr-explore-button__badge">{relevantSessions.length}</span>
        )}

        {/* Active pulse */}
        {isInVR && <span className="vr-explore-button__pulse" />}
      </button>

      {/* Launch Modal */}
      <VRLaunchModal
        isOpen={showLaunchModal}
        onClose={() => setShowLaunchModal(false)}
        dataset={dataset}
        viewConfig={viewConfig}
        projectId={projectId}
        selection={selection}
        onLaunch={handleSessionLaunched}
      />

      {/* Session List Popover */}
      {showSessionList && (
        <div className="vr-explore-button__session-list">
          <div className="vr-explore-button__session-header">
            <span>Active VR Sessions</span>
            <button
              className="vr-explore-button__close"
              onClick={() => setShowSessionList(false)}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
          <div className="vr-explore-button__sessions">
            {relevantSessions.map((session) => (
              <button
                key={session.id}
                className="vr-explore-button__session-item"
                onClick={() => handleJoinSession(session)}
              >
                <Icon name="vr" size={14} />
                <span className="vr-explore-button__session-owner">
                  {session.ownerUserName}'s session
                </span>
                <span className="vr-explore-button__session-count">
                  {session.participantCount || 1} participant{(session.participantCount || 1) !== 1 ? "s" : ""}
                </span>
              </button>
            ))}
          </div>
          <button
            className="vr-explore-button__new-session"
            onClick={handleLaunchNew}
          >
            <Icon name="plus" size={14} />
            <span>Start new session</span>
          </button>
        </div>
      )}
    </>
  );
}

export default VRExploreButton;
