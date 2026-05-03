// src/ui/react/components/common/VoiceCommandToggle/VoiceCommandToggle.jsx
// Voice command toggle button with visual state feedback
//
// States:
// - off: Greyed out microphone
// - listening: Blue microphone, subtle pulse
// - awake: Green microphone, stronger pulse (waiting for command after wake word)
// - processing: Orange microphone, spinning indicator

import React, { useState, useEffect, useCallback } from "react";
import { Icon } from '@UI/react/components/atoms/Icon';
import { useVoiceCommands } from "@UI/react/hooks/useVoiceCommands.js";
import { VoiceCommandHelp } from "@UI/react/components/modals/VoiceCommandHelp";
import "./VoiceCommandToggle.scss";

/**
 * VoiceCommandToggle - Microphone button for voice command control
 *
 * @param {Object} props
 * @param {string} props.size - Button size: 'sm' | 'md' | 'lg'
 * @param {boolean} props.showLabel - Whether to show text label
 * @param {boolean} props.showHelpButton - Whether to show help button
 * @param {boolean} props.enableKeyboardShortcut - Enable 'V' key toggle
 * @param {string} props.className - Additional CSS class
 */
export function VoiceCommandToggle({
    size = "sm",
    showLabel = false,
    showHelpButton = true,
    enableKeyboardShortcut = true,
    className = "",
}) {
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const {
        isEnabled,
        isSupported,
        state,
        isListening,
        isAwake,
        toggle,
        interimTranscript,
    } = useVoiceCommands({ autoInitialize: false });

    // Listen for help voice command
    useEffect(() => {
        const handleShowHelp = (event) => {
            if (event.detail?.section === "voice-commands") {
                setIsHelpOpen(true);
            }
        };

        window.addEventListener("cia:show-help", handleShowHelp);
        return () => {
            window.removeEventListener("cia:show-help", handleShowHelp);
        };
    }, []);

    // Keyboard shortcut handler
    const handleKeyDown = useCallback(
        (e) => {
            // Only trigger if 'V' is pressed without modifiers and not in an input
            if (
                e.key.toLowerCase() === "v" &&
                !e.metaKey &&
                !e.ctrlKey &&
                !e.altKey &&
                !e.shiftKey
            ) {
                const target = e.target;
                const isInput =
                    target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.isContentEditable;

                if (!isInput) {
                    e.preventDefault();
                    toggle();
                }
            }

            // '?' key opens help
            if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const target = e.target;
                const isInput =
                    target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.isContentEditable;

                if (!isInput) {
                    e.preventDefault();
                    setIsHelpOpen(true);
                }
            }
        },
        [toggle]
    );

    // Set up keyboard shortcut
    useEffect(() => {
        if (!enableKeyboardShortcut) return;

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [enableKeyboardShortcut, handleKeyDown]);

    // Determine visual state
    const getStateClass = () => {
        if (!isEnabled) return "voice-toggle--off";
        if (isAwake) return "voice-toggle--awake";
        if (state === "processing") return "voice-toggle--processing";
        if (isListening) return "voice-toggle--listening";
        return "voice-toggle--off";
    };

    // Get tooltip text
    const getTooltip = () => {
        if (!isSupported) {
            return "Voice commands not supported in this browser";
        }
        if (!isEnabled) {
            return 'Voice commands off (Press V or say "Hey CIA")';
        }
        if (isAwake) {
            return "Listening for command...";
        }
        if (state === "processing") {
            return "Processing command...";
        }
        if (isListening) {
            return 'Listening... Say "Hey CIA" to activate';
        }
        return "Voice commands";
    };

    // Get status label
    const getLabel = () => {
        if (!isEnabled) return "Voice Off";
        if (isAwake) return "Speak now";
        if (state === "processing") return "Processing";
        if (isListening) return "Listening";
        return "Voice";
    };

    const iconSize = size === "lg" ? 18 : size === "md" ? 14 : 10;
    const helpIconSize = size === "lg" ? 14 : size === "md" ? 12 : 10;

    return (
        <>
            <div className={`voice-toggle-group voice-toggle-group--${size} ${className}`}>
                <button
                    className={`voice-toggle voice-toggle--${size} ${getStateClass()}`}
                    onClick={toggle}
                    disabled={!isSupported}
                    title={getTooltip()}
                    aria-label={getTooltip()}
                    aria-pressed={isEnabled}
                >
                    <span className="voice-toggle__icon">
                        {isEnabled ? <Icon name="mic" size={iconSize} /> : <Icon name="micOff" size={iconSize} />}
                    </span>

                    {showLabel && <span className="voice-toggle__label">{getLabel()}</span>}

                    {/* Pulse animation ring */}
                    {isEnabled && (isListening || isAwake) && (
                        <span className="voice-toggle__pulse" />
                    )}

                    {/* Interim transcript indicator */}
                    {interimTranscript && (
                        <span className="voice-toggle__transcript">{interimTranscript}</span>
                    )}
                </button>

                {showHelpButton && (
                    <button
                        className="voice-toggle__help"
                        onClick={() => setIsHelpOpen(true)}
                        title="Voice command help (?)"
                        aria-label="Voice command help"
                    >
                        <Icon name="help" size={helpIconSize} />
                    </button>
                )}
            </div>

            <VoiceCommandHelp
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
            />
        </>
    );
}

export default VoiceCommandToggle;