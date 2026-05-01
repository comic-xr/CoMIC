// src/ui/react/components/panels/LoggingPanel/LoggingPanel.jsx
// System Logs Display Component

import React, { useRef, useEffect } from "react";

import { useLogging } from "@UI/react/hooks/useLogging.js";
import { LogType } from "@Utils/logger.js";
import { Icon } from "@UI/react/components/atoms/Icon";

export function LoggingPanel() {
  const { logs, clearLogs } = useLogging();
  const logsEndRef = useRef(null);
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isExpanded) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isExpanded]);

  const getLogStyle = (type) => {
    // Uses CSS custom properties from VR Optimized theme
    const styles = {
      [LogType.INFO]: { color: "var(--color-info)", icon: "info" },
      [LogType.SUCCESS]: { color: "var(--color-success)", icon: "checkCircle" },
      [LogType.WARNING]: { color: "var(--color-warning)", icon: "warning" },
      [LogType.ERROR]: { color: "var(--color-error)", icon: "error" },
      [LogType.PROGRESS]: { color: "var(--color-accent-purple)", icon: "loader" }
    };
    return styles[type] || { color: "var(--color-text-muted)", icon: "file" };
  };

  return (
    <div style={{
      position: "fixed",
      bottom: "10px",
      left: "10px",
      width: isExpanded ? "400px" : "200px",
      maxHeight: isExpanded ? "300px" : "40px",
      backgroundColor: "var(--color-bg-secondary)",
      border: "1px solid var(--color-border-default)",
      borderRadius: "6px",
      overflow: "hidden",
      transition: "all 0.3s ease",
      zIndex: 900,
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 12px",
        backgroundColor: "var(--color-bg-base)",
        borderBottom: isExpanded ? "1px solid var(--color-border-default)" : "none",
        cursor: "pointer"
      }} onClick={() => setIsExpanded(!isExpanded)}>
        <div style={{
          fontSize: "12px",
          fontWeight: "600",
          color: "var(--color-text-secondary)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Icon name="scrollText" size={14} /> SYSTEM LOGS
          </span>
          <span style={{
            fontSize: "10px",
            backgroundColor: "var(--color-bg-tertiary)",
            padding: "2px 6px",
            borderRadius: "3px"
          }}>
            {logs.length}
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {logs.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearLogs();
              }}
              title="Clear logs"
              style={{
                background: "none",
                border: "1px solid var(--color-border-medium)",
                borderRadius: "3px",
                padding: "4px 8px",
                color: "var(--color-text-muted)",
                fontSize: "10px",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-error)";
                e.currentTarget.style.color = "var(--color-error)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border-medium)";
                e.currentTarget.style.color = "var(--color-text-muted)";
              }}
            >
              Clear
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            style={{
              background: "none",
              border: "1px solid var(--color-border-medium)",
              borderRadius: "3px",
              padding: "4px 8px",
              color: "var(--color-text-muted)",
              fontSize: "10px",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--color-success)";
              e.currentTarget.style.color = "var(--color-success)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border-medium)";
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            <Icon name={isExpanded ? "chevronDown" : "chevronUp"} size={12} />
          </button>
        </div>
      </div>

      {/* Logs Content */}
      {isExpanded && (
        <div style={{
          padding: "8px 12px",
          maxHeight: "250px",
          overflowY: "auto",
          fontSize: "11px",
          fontFamily: "monospace",
          lineHeight: "1.6"
        }}>
          {logs.length === 0 ? (
            <div style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "20px 0" }}>
              No logs yet
            </div>
          ) : (
            logs.map((log) => {
              const style = getLogStyle(log.type);
              return (
                <div
                  key={log.id}
                  style={{
                    marginBottom: "6px",
                    paddingBottom: "6px",
                    borderBottom: "1px solid var(--color-border-subtle)"
                  }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "start",
                    gap: "6px"
                  }}>
                    <span style={{ color: style.color, flexShrink: 0 }}>
                      <Icon name={style.icon} size={14} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: style.color, marginBottom: "2px" }}>
                        {log.message}
                      </div>
                      <div style={{ color: "var(--color-text-tertiary)", fontSize: "10px" }}>
                        {log.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}