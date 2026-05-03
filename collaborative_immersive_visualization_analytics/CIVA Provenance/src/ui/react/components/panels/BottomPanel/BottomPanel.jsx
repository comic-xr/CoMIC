// src/ui/react/components/panels/BottomPanel/BottomPanel.jsx
// Collapsible bottom panel for logs, compute jobs, and debug output
//
// Features:
// - Expand/collapse from StatusBar
// - Tabbed interface for multiple views
// - Resizable height via drag handle
// - Keyboard accessible

import React, { useEffect, useRef, useCallback } from "react";
import { Icon } from '@UI/react/components/atoms/Icon';
import {
    useBottomPanel,
    BottomPanelTabs,
    registerBottomPanelControls,
} from "./useBottomPanel.js";
import { LogsTab } from "./tabs/LogsTab";
import "./BottomPanel.scss";

// Tab configuration
const TABS = [
    {
        id: BottomPanelTabs.LOGS,
        label: "Logs",
        icon: "scrollText",
        component: LogsTab,
    },
    {
        id: BottomPanelTabs.COMPUTE,
        label: "Compute",
        icon: "cpu",
        component: () => <ComputePlaceholder />,  // Future implementation
    },
    {
        id: BottomPanelTabs.CONSOLE,
        label: "Console",
        icon: "terminal",
        component: () => <ConsolePlaceholder />,  // Future implementation
    },
];

// Placeholder for future tabs
function ComputePlaceholder() {
    return (
        <div className="bottom-panel__placeholder">
            <Icon name="cpu" size={32} />
            <p>Compute Jobs</p>
            <span>Background processing status will appear here</span>
        </div>
    );
}

function ConsolePlaceholder() {
    return (
        <div className="bottom-panel__placeholder">
            <Icon name="terminal" size={32} />
            <p>Debug Console</p>
            <span>Interactive debugging coming soon</span>
        </div>
    );
}

/**
 * BottomPanel - Expandable panel for system output
 */
export function BottomPanel() {
    const panel = useBottomPanel();
    const panelRef = useRef(null);
    const resizeRef = useRef(null);
    const isDragging = useRef(false);
    const startY = useRef(0);
    const startHeight = useRef(0);

    // Register controls for global access (StatusBar)
    useEffect(() => {
        registerBottomPanelControls({
            toggle: panel.toggle,
            expand: panel.expand,
            collapse: panel.collapse,
            showLogs: panel.showLogs,
            showCompute: panel.showCompute,
        });
    }, [panel]);

    // Handle resize drag
    const handleMouseDown = useCallback((e) => {
        isDragging.current = true;
        startY.current = e.clientY;
        startHeight.current = panel.height;
        document.body.style.cursor = "ns-resize";
        document.body.style.userSelect = "none";
    }, [panel.height]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging.current) return;

            // Dragging up increases height, down decreases
            const delta = startY.current - e.clientY;
            const newHeight = startHeight.current + delta;
            panel.setHeight(newHeight);
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [panel]);

    // Find active tab component
    const activeTabConfig = TABS.find(t => t.id === panel.activeTab) || TABS[0];
    const ActiveComponent = activeTabConfig.component;

    // Don't render if collapsed
    if (!panel.isExpanded) {
        return null;
    }

    return (
        <div
            ref={panelRef}
            className="bottom-panel"
            style={{ height: panel.height }}
        >
            {/* Resize Handle */}
            <div
                ref={resizeRef}
                className="bottom-panel__resize-handle"
                onMouseDown={handleMouseDown}
                title="Drag to resize"
            >
                <Icon name="gripHorizontal" size={14} />
            </div>

            {/* Header with tabs */}
            <div className="bottom-panel__header">
                <div className="bottom-panel__tabs" role="tablist">
                    {TABS.map(tab => {
                        const isActive = panel.activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={isActive}
                                className={`bottom-panel__tab ${isActive ? "bottom-panel__tab--active" : ""}`}
                                onClick={() => panel.setActiveTab(tab.id)}
                            >
                                <Icon name={tab.icon} size={14} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="bottom-panel__actions">
                    <button
                        className="bottom-panel__action"
                        onClick={panel.collapse}
                        title="Close panel (Escape)"
                        aria-label="Close panel"
                    >
                        <Icon name="chevronDown" size={16} />
                    </button>
                </div>
            </div>

            {/* Tab content */}
            <div
                className="bottom-panel__content"
                role="tabpanel"
                aria-labelledby={`tab-${panel.activeTab}`}
            >
                <ActiveComponent />
            </div>
        </div>
    );
}

export default BottomPanel;