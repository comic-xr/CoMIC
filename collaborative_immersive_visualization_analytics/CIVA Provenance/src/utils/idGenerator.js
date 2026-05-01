// Simple utility to generate unique IDs for datasets and instances

/**
 * Generate a unique ID
 * Format: prefix_timestamp_randomString
 *
 * Examples:
 *   dataset_1234567890_abc123
 *   instance_1234567890_xyz789
 *
 * @param {string} prefix - Optional prefix (default: "id")
 * @returns {string} Unique ID
 */
export function generateId(prefix = "id") {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}_${timestamp}_${random}`;
}

// ============================================================================
// Layer 1: Data
// ============================================================================

/**
 * Generate a dataset ID
 * @returns {string} Dataset ID
 */
export function generateDatasetId() {
  return generateId("dataset");
}

/**
 * Generate an annotation ID
 * @returns {string} Annotation ID
 */
export function generateAnnotationId() {
  return generateId("annotation");
}

// ============================================================================
// Layer 2: Views
// ============================================================================

/**
 * Generate an view ID
 * @returns {string} View ID
 */
export function generateViewId() {
  return generateId("view");
}

/**
 * Generate a snapshot ID
 * @returns {string} Snapshot ID
 */
export function generateSnapshotId() {
  return generateId("snapshot");
}

/**
 * Generate a filter ID
 * @returns {string} Filter ID
 */
export function generateFilterId() {
  return generateId("filter");
}

/**
 * Generate a widget ID
 * @returns {string} Widget ID
 */
export function generateWidgetId() {
  return generateId("widget");
}

// ============================================================================
// Layer 3: Instances (ephemeral, but still need IDs)
// ============================================================================

/**
 * Generate an instance ID
 * @returns {string} Instance ID
 */
export function generateInstanceId() {
  return generateId("instance");
}

// ============================================================================
// Grid/UI
// ============================================================================
/**
 * Generate a grid slot ID (for workspace grid instances)
 * @returns {string} Grid slot ID
 */
export function generateGridSlotId() {
  return generateId("grid");
}

// ============================================================================
// Workspace and Layout
// ============================================================================

/**
 * Generate a workspace layout ID
 * @returns {string} Workspace layout ID
 */
export function generateWorkspaceLayoutId() {
  return generateId("layout");
}

// ============================================================================
// Organization
// ============================================================================
/**
 * Generate a project ID
 * @returns {string} Project ID
 */
export function generateProjectId() {
  return generateId("project");
}

/**
 * Generate an organization ID
 * @returns {string} Organization ID
 */
export function generateOrganizationId() {
  return generateId("org");
}

// ============================================================================
// User (UUID format - special case)
// ============================================================================
export function generateUserId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// Collaboration
// ============================================================================
/**
 * Generate a text chat ID
 * @returns {string} TextChat ID
 */
export function generateTextChatId() {
  return generateId("textchat");
}

// ============================================================================
// Logging
// ============================================================================
/**
 * Generate a log ID
 * @returns {string} Log ID
 */
export function generateLogId() {
  return generateId("log");
}

// ============================================================================
// Canvas Content
// ============================================================================
/**
 * Generate a note ID (local, pending server confirmation)
 * @returns {string} Note ID
 */
export function generateNoteId() {
  return generateId("note");
}

/**
 * Generate an image ID (local, pending server confirmation)
 * @returns {string} Image ID
 */
export function generateImageId() {
  return generateId("image");
}

/**
 * Generate a canvas ID
 * @returns {string} Canvas ID
 */
export function generateCanvasId() {
  return generateId("canvas");
}

/**
 * Generate a placement ID
 * @returns {string} Placement ID
 */
export function generatePlacementId() {
  return generateId("placement");
}

/**
 * Generate a subset ID (local, pending server confirmation)
 * @returns {string} Subset ID
 */
export function generateSubsetId() {
  return generateId("subset");
}

// ============================================================================
// Utility
// ============================================================================
/**
 * Extract timestamp from ID
 * Useful for sorting or debugging
 *
 * @param {string} id - ID to parse
 * @returns {number} Timestamp or null if invalid
 */
export function getIdTimestamp(id) {
  const parts = id.split("_");
  if (parts.length >= 2) {
    const timestamp = parseInt(parts[1], 10);
    return isNaN(timestamp) ? null : timestamp;
  }
  return null;
}
