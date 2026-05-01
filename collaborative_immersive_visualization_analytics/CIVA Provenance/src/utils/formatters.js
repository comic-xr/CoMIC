// src/utils/formatters.js
// Shared formatting utilities

/**
 * Format bytes to human-readable file size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "1.5 MB", "256 KB")
 */
export function formatFileSize(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Format a date for display
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString();
}

/**
 * Format a timestamp for display
 * @param {Date|string|number} inputDate - Date to format
 * @returns {string} Formatted date and time
 */
export function formatTimestamp(inputDate) {
  if (!inputDate) return "";
  const date = new Date(inputDate);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

/**
 * Format relative time (shorthand version)
 * @param {Date|string|number} inputDate - Date to format
 * @returns {string} Short relative time (e.g., "1h ago", "2d ago")
 */
export function formatRelativeTime(inputDate) {
  if (!inputDate) return "";
  const date = new Date(inputDate);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
