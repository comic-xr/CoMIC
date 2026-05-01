// src/ui/react/components/common/ToolPanel.jsx
// Sliding panel component with glassmorphism theme

import React from "react";
import { Icon } from '@UI/react/components/atoms/Icon';
import "./ToolPanel.scss";

/**
 * ToolPanel
 *
 * A sliding panel that opens from the left side of the screen.
 * Used for file browsers, settings, and other tool interfaces.
 */
export function ToolPanel({
    isOpen,
    title,
    icon,
    onClose,
    children,
    width = 350,
}) {
    return (
        <div
            className={`tool-panel ${isOpen ? "tool-panel--open" : ""}`}
            style={{ "--panel-width": `${width}px` }}
        >
            {/* Panel Header */}
            <div className="tool-panel__header">
                <div className="tool-panel__title-group">
                    {icon && <span className="tool-panel__icon">{icon}</span>}
                    <h3 className="tool-panel__title">{title}</h3>
                </div>

                <button
                    onClick={onClose}
                    className="tool-panel__close"
                    aria-label="Close panel"
                >
                    <Icon name="close" size={16} />
                </button>
            </div>

            {/* Panel Content */}
            <div className="tool-panel__content">
                {children}
            </div>
        </div>
    );
}

export default ToolPanel;