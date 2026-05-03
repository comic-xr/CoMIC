/**
 * @file statusConfig.js
 * @description Centralized user status configuration for CIA Web.
 * Single source of truth for status colors, icons, and labels.
 *
 * MIGRATED: Now uses string icon names instead of lucide-react imports
 *
 * @example
 * import { STATUS_CONFIG, getStatusIcon, getStatusColor } from '@UI/react/utils/statusConfig';
 *
 * const config = STATUS_CONFIG[user.status];
 * // or
 * const iconName = getStatusIconName(user.status);
 * const color = getStatusColor(user.status);
 */

import React from "react";
import { Icon } from "@UI/react/components/atoms/Icon";

/**
 * Status types available in CIA Web
 * @typedef {'online'|'active'|'idle'|'away'|'busy'|'dnd'|'offline'} StatusType
 */

/**
 * Complete status configuration
 * Icons are now string names that reference the centralized Icon system
 */
export const STATUS_CONFIG = {
  online: {
    id: "online",
    icon: "circle", // Filled circle for online
    label: "Online",
    description: "Available and active",
    color: "var(--status-online)",
    colorHex: "#4CAF50",
    fill: true,
  },
  active: {
    id: "active",
    icon: "circle",
    label: "Online",
    description: "Available and active",
    color: "var(--status-online)",
    colorHex: "#4CAF50",
    fill: true,
  },
  idle: {
    id: "idle",
    icon: "clock", // Clock for idle
    label: "Idle",
    description: "Temporarily away",
    color: "var(--status-idle)",
    colorHex: "#FF9800",
    fill: false,
  },
  away: {
    id: "away",
    icon: "coffee", // Coffee cup for away
    label: "Away",
    description: "Away for a while",
    color: "var(--status-away)",
    colorHex: "#808080",
    fill: false,
  },
  dnd: {
    id: "dnd",
    icon: "cancel", // X in circle for do not disturb
    label: "Do Not Disturb",
    description: "Mute notifications",
    color: "var(--status-dnd)",
    colorHex: "#f44336",
    fill: false,
  },
  busy: {
    id: "busy",
    icon: "cancel",
    label: "Do Not Disturb",
    description: "Mute notifications",
    color: "var(--status-dnd)",
    colorHex: "#f44336",
    fill: false,
  },
  offline: {
    id: "offline",
    icon: "circle", // Empty circle for offline
    label: "Offline",
    description: "Not connected",
    color: "var(--status-offline)",
    colorHex: "#666666",
    fill: false,
  },
};

/**
 * Get the icon name for a status
 * @param {StatusType} status - Status type
 * @returns {string} Icon name for use with <Icon name="..." />
 */
export function getStatusIconName(status) {
  return STATUS_CONFIG[status]?.icon || STATUS_CONFIG.offline.icon;
}

/**
 * Get the icon component for a status (renders the Icon)
 * @param {StatusType} status - Status type
 * @param {Object} props - Props to pass to Icon (size, className, etc.)
 * @returns {React.ReactElement} Rendered Icon component
 */
export function getStatusIcon(status, props = {}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  const { size = 10, className = "", ...rest } = props;

  return (
    <Icon
      name={config.icon}
      size={size}
      color={config.colorHex}
      className={`status-icon ${className}`.trim()}
      sx={
        config.fill
          ? {
              color: config.colorHex,
              // For filled appearance, we use the dot icon which is naturally filled
            }
          : undefined
      }
      {...rest}
    />
  );
}

/**
 * Get the CSS color variable for a status
 * @param {StatusType} status - Status type
 * @returns {string} CSS variable reference
 */
export function getStatusColor(status) {
  return STATUS_CONFIG[status]?.color || STATUS_CONFIG.offline.color;
}

/**
 * Get the hex color for a status
 * @param {StatusType} status - Status type
 * @returns {string} Hex color value
 */
export function getStatusColorHex(status) {
  return STATUS_CONFIG[status]?.colorHex || STATUS_CONFIG.offline.colorHex;
}

/**
 * Get the label for a status
 * @param {StatusType} status - Status type
 * @returns {string} Human-readable label
 */
export function getStatusLabel(status) {
  return STATUS_CONFIG[status]?.label || "Unknown";
}

/**
 * Get the description for a status
 * @param {StatusType} status - Status type
 * @returns {string} Description text
 */
export function getStatusDescription(status) {
  return STATUS_CONFIG[status]?.description || "";
}

/**
 * Check if a status icon should be filled
 * @param {StatusType} status - Status type
 * @returns {boolean} Whether icon should be filled
 */
export function isStatusFilled(status) {
  return STATUS_CONFIG[status]?.fill || false;
}

/**
 * Get props for rendering a status icon
 * @param {StatusType} status - Status type
 * @param {Object} options - Options
 * @param {number} options.size - Icon size (default: 10)
 * @param {boolean} options.useHex - Use hex colors instead of CSS vars (default: false)
 * @param {string} options.className - Additional CSS class
 * @returns {Object} Props to spread onto Icon component
 */
export function getStatusIconProps(status, options = {}) {
  const { size = 10, useHex = false, className = "" } = options;
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  const color = useHex ? config.colorHex : config.color;

  return {
    name: config.icon,
    size,
    color,
    className: `status-icon ${className}`.trim(),
  };
}

/**
 * Render a status indicator (icon + optional label)
 * @param {StatusType} status - Status type
 * @param {Object} options - Options
 * @param {boolean} options.showLabel - Show label text
 * @param {number} options.size - Icon size
 * @returns {React.ReactElement} Status indicator element
 */
export function StatusIndicator({ status, showLabel = false, size = 10 }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;

  return (
    <span className="status-indicator" data-status={status}>
      <Icon
        name={config.fill ? "dot" : config.icon}
        size={size}
        color={config.colorHex}
        className="status-indicator__icon"
      />
      {showLabel && (
        <span className="status-indicator__label">{config.label}</span>
      )}
    </span>
  );
}

export default STATUS_CONFIG;
