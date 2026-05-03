// src/ui/react/components/auth/DevModeBanner.jsx
// Development mode warning banner with user switcher
// FIXED: Positioned as overlay (not push layout) per design spec

import React, { useState, useEffect } from "react";
import { Icon } from '@UI/react/components/atoms/Icon';
import { DevUserSwitcher } from "@UI/react/components/dev/DevUserSwitcher";
import "./DevModeBanner.scss";

/** Storage key for dismissed state */
const DISMISSED_KEY = "cia_dev_banner_dismissed";

/**
 * DevModeBanner - Warning banner shown when running in development mode
 * Positioned as fixed overlay at top of screen (doesn't push layout)
 *
 * @param {Object} props
 * @param {boolean} props.visible - Whether to show the banner
 * @param {string} props.message - Optional custom message
 */
export function DevModeBanner({
    visible = true,
    message = "Development Mode",
}) {
    const [isDismissed, setIsDismissed] = useState(false);

    // Check if banner was dismissed this session
    useEffect(() => {
        const dismissed = sessionStorage.getItem(DISMISSED_KEY);
        if (dismissed === "true") {
            setIsDismissed(true);
        }
    }, []);

    const handleDismiss = () => {
        setIsDismissed(true);
        sessionStorage.setItem(DISMISSED_KEY, "true");
    };

    if (!visible || isDismissed) {
        return null;
    }

    return (
        <div className="dev-mode-banner">
            <div className="dev-mode-banner__content">
                <Icon name="warning" size={14} className="dev-mode-banner__icon" />
                <span className="dev-mode-banner__message">{message}</span>
                <DevUserSwitcher compact />
            </div>
            <button
                className="dev-mode-banner__dismiss"
                onClick={handleDismiss}
                title="Dismiss (will reappear on refresh)"
            >
                <Icon name="close" size={12} />
            </button>
        </div>
    );
}

export default DevModeBanner;