// src/ui/react/components/common/VRButton/VRButton.jsx
// VR mode toggle button with state feedback

import React, { useState, useEffect, useCallback } from "react";
import { Icon } from '@UI/react/components/atoms/Icon';
import { SlashedIcon } from "@UI/react/components/atoms/IconOverlay/IconOverlay.jsx";
import { vrManager } from "@Core/vr/VRManager.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { toast } from "@UI/react/store/toastStore.js";
import "./VRButton.scss";

/**
 * VRButton - Button to enter/exit VR mode for an instance
 *
 * @param {Object} props
 * @param {string} props.instanceId - The instance to send to VR
 * @param {string} props.size - Button size: 'sm' | 'md' | 'lg'
 * @param {boolean} props.showLabel - Whether to show text label
 * @param {string} props.className - Additional CSS class
 */
export function VRButton({
    instanceId,
    size = "sm",
    showLabel = false,
    className = "",
}) {
    const [isSupported, setIsSupported] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isInVR, setIsInVR] = useState(false);
    const [isEntering, setIsEntering] = useState(false);
    const [handlerSupportsVR, setHandlerSupportsVR] = useState(false);

    // Check VR support on mount
    useEffect(() => {
        const checkSupport = async () => {
            setIsLoading(true);

            try {
                // Check if WebXR is supported
                const vrSupported = vrManager.isVRSupported();
                if (!vrSupported) {
                    setIsSupported(false);
                    setIsLoading(false);
                    return;
                }

                // Check full VR capabilities
                const capabilities = await vrManager.checkVRCapabilities();
                setIsSupported(capabilities.supported);

                // Check if the instance handler supports VR
                if (instanceId) {
                    const instance = workspaceManager.getInstance(instanceId);
                    if (instance?.handler) {
                        const supportsVR =
                            typeof instance.handler.supportsInstanceVR === "function"
                                ? instance.handler.supportsInstanceVR()
                                : false;
                        setHandlerSupportsVR(supportsVR);
                    }
                }
            } catch (err) {
                console.error("VR capability check failed:", err);
                setIsSupported(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkSupport();
    }, [instanceId]);

    // Listen for VR session changes
    useEffect(() => {
        const handleSessionStarted = () => {
            setIsInVR(true);
            setIsEntering(false);
        };

        const handleSessionEnded = () => {
            setIsInVR(false);
            setIsEntering(false);
        };

        const handleError = (error) => {
            setIsEntering(false);
            toast.error(`VR error: ${error.message || "Unknown error"}`);
        };

        vrManager.on("sessionStarted", handleSessionStarted);
        vrManager.on("sessionEnded", handleSessionEnded);
        vrManager.on("error", handleError);

        // Check if already in VR
        setIsInVR(vrManager.isInVR());

        return () => {
            vrManager.off("sessionStarted", handleSessionStarted);
            vrManager.off("sessionEnded", handleSessionEnded);
            vrManager.off("error", handleError);
        };
    }, []);

    // Handle VR toggle
    const handleClick = useCallback(async () => {
        if (isEntering || isLoading) return;

        if (isInVR) {
            // Exit VR
            try {
                await vrManager.exitVR();
                toast.success("Exited VR mode");
            } catch (err) {
                toast.error(`Failed to exit VR: ${err.message}`);
            }
        } else {
            // Enter VR
            setIsEntering(true);

            try {
                // Get the WebGL context from the instance
                let glContext = null;
                if (instanceId) {
                    const instance = workspaceManager.getInstance(instanceId);
                    if (instance?.handler?.getWebGLContext) {
                        glContext = instance.handler.getWebGLContext();
                    }
                }

                await vrManager.enterVR(glContext);
                toast.success("Entered VR mode");
            } catch (err) {
                setIsEntering(false);
                toast.error(`Failed to enter VR: ${err.message}`);
            }
        }
    }, [instanceId, isInVR, isEntering, isLoading]);

    // Determine if button should be shown
    const shouldShow = isSupported && (handlerSupportsVR || !instanceId);

    if (isLoading) {
        return (
            <button
                className={`vr-button vr-button--${size} vr-button--loading ${className}`}
                disabled
                title="Checking VR support..."
            >
                <span className="vr-button__icon">
                    <Icon name="loader" size={size === "lg" ? 18 : size === "md" ? 16 : 14} />
                </span>
                {showLabel && <span className="vr-button__label">VR</span>}
            </button>
        );
    }

    if (!shouldShow) {
        return null;
    }

    // Determine visual state
    const getStateClass = () => {
        if (isEntering) return "vr-button--entering";
        if (isInVR) return "vr-button--active";
        return "";
    };

    const getTooltip = () => {
        if (isEntering) return "Entering VR mode...";
        if (isInVR) return "Exit VR mode";
        if (!isSupported) return "VR not supported in this browser";
        if (!handlerSupportsVR && instanceId) return "This view type doesn't support VR";
        return "Enter VR mode";
    };

    const getLabel = () => {
        if (isEntering) return "Entering...";
        if (isInVR) return "Exit VR";
        return "VR Mode";
    };

    const iconSize = size === "lg" ? 18 : size === "md" ? 16 : 14;

    return (
        <button
            className={`vr-button vr-button--${size} ${getStateClass()} ${className}`}
            onClick={handleClick}
            disabled={isEntering}
            title={getTooltip()}
            aria-label={getTooltip()}
            aria-pressed={isInVR}
        >
            <span className="vr-button__icon">
                {isEntering ? (
                    <Icon name="loader" size={iconSize} className="vr-button__spinner" />
                ) : isInVR ? (
                    <SlashedIcon icon="vr" size={iconSize} />
                ) : (
                    <Icon name="vr" size={iconSize} />
                )}
            </span>

            {showLabel && <span className="vr-button__label">{getLabel()}</span>}

            {/* Pulse animation when in VR */}
            {isInVR && <span className="vr-button__pulse" />}
        </button>
    );
}

export default VRButton;