// src/ui/react/components/panels/BottomPanel/tabs/LogsTab/LogsTab.jsx
// Log viewer tab for the bottom panel
//
// Features:
// - Auto-scroll to newest logs
// - Filter by log type
// - Clear logs
// - Copy log entry
// - Timestamp display

import React, { useRef, useEffect, useState, useMemo } from "react";
import { Icon } from '@UI/react/components/atoms/Icon';
import { useLogging } from "@UI/react/hooks/useLogging.js";
import { LogType } from "@Utils/logger.js";
import "./LogsTab.scss";

// Icon mapping for log types
const LOG_ICONS = {
    [LogType.INFO]: "info",
    [LogType.SUCCESS]: "success",
    [LogType.WARNING]: "warning",
    [LogType.ERROR]: "cancel",
    [LogType.PROGRESS]: "clock",
};

// Color classes for log types
const LOG_CLASSES = {
    [LogType.INFO]: "logs-tab__entry--info",
    [LogType.SUCCESS]: "logs-tab__entry--success",
    [LogType.WARNING]: "logs-tab__entry--warning",
    [LogType.ERROR]: "logs-tab__entry--error",
    [LogType.PROGRESS]: "logs-tab__entry--progress",
};

/**
 * Format timestamp for display
 */
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

/**
 * LogsTab - Log viewer component
 */
export function LogsTab() {
    const { logs, clearLogs } = useLogging();
    const scrollRef = useRef(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const [filter, setFilter] = useState("all"); // all, errors, warnings
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (autoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    // Detect manual scroll to disable auto-scroll
    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        setAutoScroll(isAtBottom);
    };

    // Filter logs based on selection
    const filteredLogs = useMemo(() => {
        if (filter === "all") return logs;
        if (filter === "errors") {
            return logs.filter(l => l.type === LogType.ERROR);
        }
        if (filter === "warnings") {
            return logs.filter(l =>
                l.type === LogType.WARNING || l.type === LogType.ERROR
            );
        }
        return logs;
    }, [logs, filter]);

    // Count by type for filter badges
    const counts = useMemo(() => ({
        total: logs.length,
        errors: logs.filter(l => l.type === LogType.ERROR).length,
        warnings: logs.filter(l => l.type === LogType.WARNING).length,
    }), [logs]);

    return (
        <div className="logs-tab">
            {/* Toolbar */}
            <div className="logs-tab__toolbar">
                <div className="logs-tab__toolbar-left">
                    {/* Filter dropdown */}
                    <div className="logs-tab__filter-wrapper">
                        <button
                            className="logs-tab__filter-btn"
                            onClick={() => setShowFilterMenu(!showFilterMenu)}
                        >
                            <Icon name="filter" size={14} />
                            <span>
                                {filter === "all" && "All"}
                                {filter === "errors" && `Errors (${counts.errors})`}
                                {filter === "warnings" && `Warnings+ (${counts.warnings})`}
                            </span>
                            <Icon name="chevronDown" size={12} />
                        </button>

                        {showFilterMenu && (
                            <div className="logs-tab__filter-menu">
                                <button
                                    className={filter === "all" ? "active" : ""}
                                    onClick={() => { setFilter("all"); setShowFilterMenu(false); }}
                                >
                                    All ({counts.total})
                                </button>
                                <button
                                    className={filter === "warnings" ? "active" : ""}
                                    onClick={() => { setFilter("warnings"); setShowFilterMenu(false); }}
                                >
                                    Warnings & Errors ({counts.warnings + counts.errors})
                                </button>
                                <button
                                    className={filter === "errors" ? "active" : ""}
                                    onClick={() => { setFilter("errors"); setShowFilterMenu(false); }}
                                >
                                    Errors Only ({counts.errors})
                                </button>
                            </div>
                        )}
                    </div>

                    <span className="logs-tab__count">
                        {filteredLogs.length} entries
                    </span>
                </div>

                <div className="logs-tab__toolbar-right">
                    {!autoScroll && (
                        <button
                            className="logs-tab__scroll-btn"
                            onClick={() => {
                                setAutoScroll(true);
                                if (scrollRef.current) {
                                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                                }
                            }}
                        >
                            ↓ Scroll to bottom
                        </button>
                    )}

                    <button
                        className="logs-tab__clear-btn"
                        onClick={clearLogs}
                        title="Clear all logs"
                    >
                        <Icon name="delete" size={14} />
                        Clear
                    </button>
                </div>
            </div>

            {/* Log entries */}
            <div
                ref={scrollRef}
                className="logs-tab__entries"
                onScroll={handleScroll}
            >
                {filteredLogs.length === 0 ? (
                    <div className="logs-tab__empty">
                        {filter === "all"
                            ? "No logs yet. Activity will appear here."
                            : `No ${filter} to display.`
                        }
                    </div>
                ) : (
                    filteredLogs.map((log, index) => {
                        const iconName = LOG_ICONS[log.type] || "info";
                        const colorClass = LOG_CLASSES[log.type] || "";

                        return (
                            <div
                                key={`${log.timestamp}-${index}`}
                                className={`logs-tab__entry ${colorClass}`}
                            >
                                <span className="logs-tab__entry-time">
                                    {formatTime(log.timestamp)}
                                </span>
                                <Icon name={iconName} size={14} className="logs-tab__entry-icon" />
                                <span className="logs-tab__entry-message">
                                    {log.message}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default LogsTab;