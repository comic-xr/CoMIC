// src/ui/react/__mocks__/data/annotations.mock.js
// Annotation mock data for AnnotationsTab Storybook stories
//
// Provides:
// - Spatial annotations with 3D positions
// - Various annotation types (point, region, measurement)
// - Visibility and sharing states
// - Tag-based filtering support

import { MOCK_USERS } from "./users.mock.js";

// =============================================================================
// MOCK ANNOTATIONS
// =============================================================================

/**
 * Mock annotations matching the Annotation model shape
 */
export const MOCK_ANNOTATIONS = [
  {
    id: "ann-tumor-marker",
    datasetId: "ds-brain-scan",
    datasetName: "Brain_Scan_001.nii",
    type: "point",
    position: [12.5, -34.2, 56.8],
    normal: [0, 0, 1],
    text: "Suspicious mass - requires follow-up imaging",
    tags: ["tumor", "priority", "follow-up"],
    color: "#fb7185", // Pink for important
    visibility: "shared",
    sharedWith: ["user-smith", "user-jones"],
    isVisible: true,
    createdBy: MOCK_USERS.current.id,
    createdByName: MOCK_USERS.current.name,
    createdAt: "2025-11-20T10:30:00Z",
    modifiedAt: "2025-11-25T14:00:00Z",
    modifiedBy: MOCK_USERS.current.id,
  },
  {
    id: "ann-ventricle-label",
    datasetId: "ds-brain-scan",
    datasetName: "Brain_Scan_001.nii",
    type: "point",
    position: [0, 15.3, 22.1],
    normal: [0, 1, 0],
    text: "Lateral ventricle - normal appearance",
    tags: ["anatomy", "ventricle"],
    color: "#60a5fa", // Blue for anatomy
    visibility: "public",
    sharedWith: [],
    isVisible: true,
    createdBy: MOCK_USERS.drSmith.id,
    createdByName: MOCK_USERS.drSmith.name,
    createdAt: "2025-11-18T09:00:00Z",
    modifiedAt: "2025-11-18T09:00:00Z",
    modifiedBy: MOCK_USERS.drSmith.id,
  },
  {
    id: "ann-measurement-1",
    datasetId: "ds-brain-scan",
    datasetName: "Brain_Scan_001.nii",
    type: "measurement",
    position: [10, 20, 30],
    endPosition: [45, 20, 30], // For line measurements
    normal: null,
    text: "Lesion diameter: 35mm",
    tags: ["measurement", "tumor"],
    color: "#fbbf24", // Amber for measurements
    visibility: "shared",
    sharedWith: ["user-smith"],
    isVisible: true,
    createdBy: MOCK_USERS.current.id,
    createdByName: MOCK_USERS.current.name,
    createdAt: "2025-11-22T11:00:00Z",
    modifiedAt: "2025-11-22T11:00:00Z",
    modifiedBy: MOCK_USERS.current.id,
  },
  {
    id: "ann-ct-bone",
    datasetId: "ds-ct-overlay",
    datasetName: "CT_Overlay.dcm",
    type: "region",
    position: [25, -10, 45],
    bounds: [-5, 5, -5, 5, -5, 5], // Region bounds
    normal: null,
    text: "Bone density anomaly in vertebra T7",
    tags: ["bone", "spine", "anomaly"],
    color: "#34d399", // Green
    visibility: "public",
    sharedWith: [],
    isVisible: true,
    createdBy: MOCK_USERS.drSmith.id,
    createdByName: MOCK_USERS.drSmith.name,
    createdAt: "2025-11-24T16:00:00Z",
    modifiedAt: "2025-11-24T16:00:00Z",
    modifiedBy: MOCK_USERS.drSmith.id,
  },
  {
    id: "ann-surface-feature",
    datasetId: "ds-surface-model",
    datasetName: "Surface_Model.vtp",
    type: "point",
    position: [8.2, 12.4, -5.6],
    normal: [0.5, 0.7, 0.5],
    text: "High curvature region - artifact or feature?",
    tags: ["surface", "question", "review"],
    color: "#c084fc", // Purple
    visibility: "private",
    sharedWith: [],
    isVisible: true,
    createdBy: MOCK_USERS.alexChen.id,
    createdByName: MOCK_USERS.alexChen.name,
    createdAt: "2025-11-26T10:00:00Z",
    modifiedAt: "2025-11-26T10:00:00Z",
    modifiedBy: MOCK_USERS.alexChen.id,
  },
  {
    id: "ann-hidden-example",
    datasetId: "ds-brain-scan",
    datasetName: "Brain_Scan_001.nii",
    type: "point",
    position: [-20, 5, 15],
    normal: [1, 0, 0],
    text: "Reference point (hidden)",
    tags: ["reference"],
    color: "#94a3b8", // Gray
    visibility: "private",
    sharedWith: [],
    isVisible: false, // Hidden annotation
    createdBy: MOCK_USERS.current.id,
    createdByName: MOCK_USERS.current.name,
    createdAt: "2025-11-15T08:00:00Z",
    modifiedAt: "2025-11-15T08:00:00Z",
    modifiedBy: MOCK_USERS.current.id,
  },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get annotations for a specific dataset
 * @param {string} datasetId - Dataset ID
 * @returns {Array} Annotations for the dataset
 */
export function getAnnotationsForDataset(datasetId) {
  return MOCK_ANNOTATIONS.filter((a) => a.datasetId === datasetId);
}

/**
 * Get visible annotations only
 * @returns {Array} Visible annotations
 */
export function getVisibleAnnotations() {
  return MOCK_ANNOTATIONS.filter((a) => a.isVisible);
}

/**
 * Get annotations by type
 * @param {string} type - Annotation type (point, region, measurement, angle)
 * @returns {Array} Annotations of the specified type
 */
export function getAnnotationsByType(type) {
  return MOCK_ANNOTATIONS.filter((a) => a.type === type);
}

/**
 * Get all unique tags across annotations
 * @returns {Array} Sorted array of unique tags
 */
export function getAllAnnotationTags() {
  const tags = new Set();
  MOCK_ANNOTATIONS.forEach((a) => a.tags?.forEach((t) => tags.add(t)));
  return Array.from(tags).sort();
}

/**
 * Filter annotations by tags (returns annotations matching ANY tag)
 * @param {Array} tags - Tags to filter by
 * @returns {Array} Matching annotations
 */
export function filterAnnotationsByTags(tags) {
  if (!tags || tags.length === 0) return MOCK_ANNOTATIONS;
  return MOCK_ANNOTATIONS.filter((a) =>
    tags.some((tag) => a.tags?.includes(tag))
  );
}

// =============================================================================
// ANNOTATION TYPE CONFIG (for UI rendering)
// =============================================================================

/**
 * Configuration for annotation types
 */
export const ANNOTATION_TYPE_CONFIG = {
  point: {
    name: "Point",
    icon: "mapPin",
    color: "#60a5fa",
    description: "Single point marker",
  },
  region: {
    name: "Region",
    icon: "box",
    color: "#34d399",
    description: "3D bounding region",
  },
  measurement: {
    name: "Measurement",
    icon: "ruler",
    color: "#fbbf24",
    description: "Distance measurement",
  },
  angle: {
    name: "Angle",
    icon: "arrowUpRight",
    color: "#c084fc",
    description: "Angle measurement",
  },
};
