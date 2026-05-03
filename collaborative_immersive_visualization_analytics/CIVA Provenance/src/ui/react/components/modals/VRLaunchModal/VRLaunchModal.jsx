/**
 * @file VRLaunchModal.jsx
 * @description Modal for configuring and launching a VR exploration session.
 *
 * Features:
 * - Select exploration scope (full dataset, region, or selection)
 * - Choose navigation mode (fly, teleport, walk, orbit)
 * - Configure collaboration settings
 * - Set initial VR scale
 * - Launch VR session
 */

import React, { memo, useState, useCallback, useEffect, useMemo } from "react";
import { Icon, getIconComponent } from "@UI/react/components/atoms/Icon";
import { Modal } from "../Modal";
import { Button } from "@UI/react/components/atoms/Button";
import { vrManager } from "@Core/vr/VRManager.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { toast } from "@UI/react/store/toastStore.js";
import "./VRLaunchModal.scss";

/**
 * Navigation mode options
 */
const NAVIGATION_MODES = [
  {
    id: "fly",
    label: "Fly",
    description: "Free movement in 3D space",
    icon: "plane",
  },
  {
    id: "teleport",
    label: "Teleport",
    description: "Point-and-click movement",
    icon: "cursor",
  },
  {
    id: "walk",
    label: "Walk",
    description: "Ground-based movement",
    icon: "footprints",
  },
  {
    id: "orbit",
    label: "Orbit",
    description: "Rotate around center point",
    icon: "orbit",
  },
];

/**
 * Scale preset options
 */
const SCALE_PRESETS = [
  { id: "overview", label: "Overview", scale: 10.0, description: "See the whole dataset" },
  { id: "normal", label: "Normal", scale: 1.0, description: "1:1 scale" },
  { id: "detail", label: "Detail", scale: 0.1, description: "10x magnification" },
  { id: "micro", label: "Micro", scale: 0.01, description: "100x magnification" },
];

/**
 * VRLaunchModal - Modal for launching VR exploration sessions
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {() => void} props.onClose - Close handler
 * @param {Object} props.dataset - The dataset to explore
 * @param {Object} props.viewConfig - Current view configuration
 * @param {string} props.projectId - Project ID for the session
 * @param {Object} props.selection - Current selection (optional)
 * @param {Function} props.onLaunch - Callback when session is launched
 * @param {string} props.className - Additional CSS class
 */
function VRLaunchModal({
  isOpen,
  onClose,
  dataset,
  viewConfig,
  projectId,
  selection,
  onLaunch,
  className = "",
}) {
  // VR support state
  const [vrSupported, setVrSupported] = useState(null);
  const [vrCapabilities, setVrCapabilities] = useState(null);
  const [checkingSupport, setCheckingSupport] = useState(true);

  // Configuration state
  const [selectionType, setSelectionType] = useState("full");
  const [navigationMode, setNavigationMode] = useState("teleport");
  const [scalePreset, setScalePreset] = useState("normal");
  const [customScale, setCustomScale] = useState(1.0);
  const [useCustomScale, setUseCustomScale] = useState(false);

  // Collaboration settings
  const [allowJoin, setAllowJoin] = useState(true);
  const [allowDesktopParticipants, setAllowDesktopParticipants] = useState(true);
  const [allowDesktopControl, setAllowDesktopControl] = useState(false);

  // UI state
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState("");

  // Check VR support when modal opens
  useEffect(() => {
    if (isOpen) {
      checkVRSupport();
    }
  }, [isOpen]);

  /**
   * Check VR capabilities
   */
  const checkVRSupport = useCallback(async () => {
    setCheckingSupport(true);
    setError("");

    try {
      const isSupported = vrManager.isVRSupported();
      setVrSupported(isSupported);

      if (isSupported) {
        const capabilities = await vrManager.checkVRCapabilities();
        setVrCapabilities(capabilities);
      }
    } catch (err) {
      console.error("VR support check failed:", err);
      setError("Failed to check VR support");
      setVrSupported(false);
    } finally {
      setCheckingSupport(false);
    }
  }, []);

  // Derive effective scale
  const effectiveScale = useMemo(() => {
    if (useCustomScale) {
      return customScale;
    }
    const preset = SCALE_PRESETS.find((p) => p.id === scalePreset);
    return preset?.scale || 1.0;
  }, [useCustomScale, customScale, scalePreset]);

  // Check if we have a selection available
  const hasSelection = useMemo(() => {
    return selection && (selection.pointIds?.length > 0 || selection.cellIds?.length > 0);
  }, [selection]);

  /**
   * Handle launching the VR session
   */
  const handleLaunch = useCallback(async () => {
    if (!vrSupported || !dataset) return;

    setIsLaunching(true);
    setError("");

    try {
      // Build session configuration
      const sessionConfig = {
        viewConfigurationId: viewConfig?.id,
        datasetId: dataset.id,
        projectId,
        selectionType,
        explorationMode: navigationMode,
        vrScale: effectiveScale,
        allowJoin,
        allowDesktopParticipants,
        allowDesktopControl,
      };

      // Add selection data if applicable
      if (selectionType === "selection" && hasSelection) {
        sessionConfig.selectionIds = selection.pointIds || selection.cellIds;
      }

      // Create session via API
      const response = await fetch("/api/vr/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": localStorage.getItem("userId") || "anonymous",
          "x-user-name": localStorage.getItem("userName") || "Anonymous",
        },
        body: JSON.stringify(sessionConfig),
      });

      if (!response.ok) {
        throw new Error("Failed to create VR session");
      }

      const session = await response.json();

      // Enter VR mode
      const instance = viewConfig?.id
        ? workspaceManager.getInstanceByViewId(viewConfig.id)
        : null;
      const glContext = instance?.handler?.getWebGLContext?.();

      await vrManager.enterVR(glContext, {
        sessionId: session.id,
        scale: effectiveScale,
        navigationMode,
        deviceProfile: "meta-quest",
        optionalFeatures: ["bounded-floor", "local-floor", "hand-tracking", "layers"],
      });

      toast.success("VR session started");

      // Notify parent
      if (onLaunch) {
        onLaunch(session);
      }

      onClose();
    } catch (err) {
      console.error("Failed to launch VR session:", err);
      setError(err.message || "Failed to launch VR session");
      toast.error(`VR launch failed: ${err.message}`);
    } finally {
      setIsLaunching(false);
    }
  }, [
    vrSupported,
    dataset,
    viewConfig,
    projectId,
    selectionType,
    navigationMode,
    effectiveScale,
    allowJoin,
    allowDesktopParticipants,
    allowDesktopControl,
    hasSelection,
    selection,
    onLaunch,
    onClose,
  ]);

  // Build class names
  const contentClassNames = ["vr-launch-modal", className].filter(Boolean).join(" ");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Launch VR Exploration"
      icon={getIconComponent("vr")}
      severity="info"
      size="md"
      footer={
        <div className="vr-launch-modal__footer">
          <Button variant="ghost" onClick={onClose} disabled={isLaunching}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleLaunch}
            loading={isLaunching}
            disabled={!vrSupported || checkingSupport || isLaunching}
            icon={getIconComponent("vr")}
          >
            {isLaunching ? "Launching..." : "Enter VR"}
          </Button>
        </div>
      }
    >
      <div className={contentClassNames}>
        {/* VR Support Status */}
        {checkingSupport && (
          <div className="vr-launch-modal__status vr-launch-modal__status--checking">
            <Icon name="loader" size={16} className="vr-launch-modal__spinner" />
            <span>Checking VR support...</span>
          </div>
        )}

        {!checkingSupport && !vrSupported && (
          <div className="vr-launch-modal__status vr-launch-modal__status--unsupported">
            <Icon name="warning" size={16} />
            <span>WebXR is not supported in this browser or no VR headset is connected.</span>
          </div>
        )}

        {!checkingSupport && vrSupported && vrCapabilities && (
          <div className="vr-launch-modal__status vr-launch-modal__status--supported">
            <Icon name="check" size={16} />
            <span>VR headset detected (Meta Quest Browser recommended)</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="vr-launch-modal__error" role="alert">
            <Icon name="alertCircle" size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Dataset info */}
        {dataset && (
          <div className="vr-launch-modal__section">
            <h4 className="vr-launch-modal__section-title">Dataset</h4>
            <div className="vr-launch-modal__dataset-info">
              <Icon name="cube" size={16} />
              <span>{dataset.filename || dataset.name}</span>
            </div>
          </div>
        )}

        {/* Exploration Scope */}
        <div className="vr-launch-modal__section">
          <h4 className="vr-launch-modal__section-title">Exploration Scope</h4>
          <div className="vr-launch-modal__radio-group">
            <label className="vr-launch-modal__radio">
              <input
                type="radio"
                name="selectionType"
                value="full"
                checked={selectionType === "full"}
                onChange={() => setSelectionType("full")}
                disabled={!vrSupported}
              />
              <span className="vr-launch-modal__radio-label">
                <Icon name="cube" size={14} />
                Full Dataset
              </span>
            </label>
            <label className="vr-launch-modal__radio">
              <input
                type="radio"
                name="selectionType"
                value="region"
                checked={selectionType === "region"}
                onChange={() => setSelectionType("region")}
                disabled={!vrSupported}
              />
              <span className="vr-launch-modal__radio-label">
                <Icon name="box" size={14} />
                Current View Region
              </span>
            </label>
            <label className={`vr-launch-modal__radio ${!hasSelection ? "vr-launch-modal__radio--disabled" : ""}`}>
              <input
                type="radio"
                name="selectionType"
                value="selection"
                checked={selectionType === "selection"}
                onChange={() => setSelectionType("selection")}
                disabled={!vrSupported || !hasSelection}
              />
              <span className="vr-launch-modal__radio-label">
                <Icon name="mousePointer" size={14} />
                Current Selection
                {!hasSelection && <span className="vr-launch-modal__hint">(no selection)</span>}
              </span>
            </label>
          </div>
        </div>

        {/* Navigation Mode */}
        <div className="vr-launch-modal__section">
          <h4 className="vr-launch-modal__section-title">Navigation Mode</h4>
          <div className="vr-launch-modal__mode-grid">
            {NAVIGATION_MODES.map((mode) => (
              <button
                key={mode.id}
                className={`vr-launch-modal__mode-option ${navigationMode === mode.id ? "vr-launch-modal__mode-option--active" : ""}`}
                onClick={() => setNavigationMode(mode.id)}
                disabled={!vrSupported}
              >
                <Icon name={mode.icon} size={20} />
                <span className="vr-launch-modal__mode-label">{mode.label}</span>
                <span className="vr-launch-modal__mode-desc">{mode.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scale Settings */}
        <div className="vr-launch-modal__section">
          <h4 className="vr-launch-modal__section-title">Initial Scale</h4>
          <div className="vr-launch-modal__scale-presets">
            {SCALE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={`vr-launch-modal__scale-preset ${!useCustomScale && scalePreset === preset.id ? "vr-launch-modal__scale-preset--active" : ""}`}
                onClick={() => {
                  setScalePreset(preset.id);
                  setUseCustomScale(false);
                }}
                disabled={!vrSupported}
                title={preset.description}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="vr-launch-modal__custom-scale">
            <label>
              <input
                type="checkbox"
                checked={useCustomScale}
                onChange={(e) => setUseCustomScale(e.target.checked)}
                disabled={!vrSupported}
              />
              Custom scale:
            </label>
            <input
              type="number"
              min="0.001"
              max="100"
              step="0.1"
              value={customScale}
              onChange={(e) => setCustomScale(parseFloat(e.target.value) || 1.0)}
              disabled={!vrSupported || !useCustomScale}
              className="vr-launch-modal__scale-input"
            />
          </div>
        </div>

        {/* Collaboration Settings */}
        <div className="vr-launch-modal__section">
          <h4 className="vr-launch-modal__section-title">Collaboration</h4>
          <div className="vr-launch-modal__checkbox-group">
            <label className="vr-launch-modal__checkbox">
              <input
                type="checkbox"
                checked={allowJoin}
                onChange={(e) => setAllowJoin(e.target.checked)}
                disabled={!vrSupported}
              />
              <span>Allow others to join this session</span>
            </label>
            <label className="vr-launch-modal__checkbox">
              <input
                type="checkbox"
                checked={allowDesktopParticipants}
                onChange={(e) => setAllowDesktopParticipants(e.target.checked)}
                disabled={!vrSupported || !allowJoin}
              />
              <span>Allow desktop participants</span>
            </label>
            <label className="vr-launch-modal__checkbox">
              <input
                type="checkbox"
                checked={allowDesktopControl}
                onChange={(e) => setAllowDesktopControl(e.target.checked)}
                disabled={!vrSupported || !allowJoin || !allowDesktopParticipants}
              />
              <span>Allow desktop users to control exploration</span>
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default memo(VRLaunchModal);
export { VRLaunchModal };
