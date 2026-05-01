/**
 * @file annotationsFilterConfig.js
 * @description Filter configuration for the Annotations Tab
 */

// =============================================================================
// QUICK FILTERS
// =============================================================================

export const ANNOTATIONS_QUICK_FILTERS = [
  {
    id: 'mine',
    label: 'Mine',
    icon: 'user',
    predicate: (annotation, userId) =>
      annotation.createdBy === userId || annotation.isMine,
  },
  {
    id: 'visible',
    label: 'Visible',
    icon: 'eye',
    predicate: (annotation) => annotation.isVisible !== false,
  },
  {
    id: 'pinned',
    label: 'Pinned',
    icon: 'pin',
    predicate: (annotation) => annotation.isPinned,
  },
  {
    id: 'hasComments',
    label: 'Discussed',
    icon: 'messageCircle',
    predicate: (annotation) => (annotation.commentCount || 0) > 0,
  },
];

// =============================================================================
// TYPE CATEGORIES
// =============================================================================

export const ANNOTATIONS_TYPE_CATEGORIES = [
  {
    id: 'markers',
    label: 'Markers',
    icon: 'mapPin',
    types: [
      { id: 'point', label: 'Point' },
      { id: 'crosshair', label: 'Crosshair' },
    ],
  },
  {
    id: 'regions',
    label: 'Regions',
    icon: 'square',
    types: [
      { id: 'rectangle', label: 'Rectangle' },
      { id: 'ellipse', label: 'Ellipse' },
      { id: 'freehand', label: 'Freehand' },
      { id: 'polygon', label: 'Polygon' },
    ],
  },
  {
    id: 'measurements',
    label: 'Measurements',
    icon: 'ruler',
    types: [
      { id: 'distance', label: 'Distance' },
      { id: 'angle', label: 'Angle' },
      { id: 'area', label: 'Area' },
    ],
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: 'stickyNote',
    types: [
      { id: 'text', label: 'Text Note' },
      { id: 'arrow', label: 'Arrow' },
    ],
  },
];

// =============================================================================
// SORT OPTIONS
// =============================================================================

export const ANNOTATIONS_SORT_OPTIONS = [
  {
    value: 'recent',
    label: 'Recent',
    shortLabel: 'Recent',
    icon: 'clock',
    comparator: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
  },
  {
    value: 'oldest',
    label: 'Oldest',
    shortLabel: 'Oldest',
    icon: 'clock',
    comparator: (a, b) => (a.createdAt || 0) - (b.createdAt || 0),
  },
  {
    value: 'name-asc',
    label: 'Name (A→Z)',
    shortLabel: 'Name',
    icon: 'arrowDownAZ',
    comparator: (a, b) => (a.label || '').localeCompare(b.label || ''),
  },
  {
    value: 'author',
    label: 'Author',
    shortLabel: 'Author',
    icon: 'user',
    comparator: (a, b) =>
      (a.authorName || '').localeCompare(b.authorName || ''),
  },
  {
    value: 'comments',
    label: 'Most Discussed',
    shortLabel: 'Discussed',
    icon: 'messageCircle',
    comparator: (a, b) => (b.commentCount || 0) - (a.commentCount || 0),
  },
];

// =============================================================================
// COMBINED CONFIG
// =============================================================================

export const ANNOTATIONS_FILTER_CONFIG = {
  quickFilterDefs: ANNOTATIONS_QUICK_FILTERS,
  typeCategories: ANNOTATIONS_TYPE_CATEGORIES,
  sortOptions: ANNOTATIONS_SORT_OPTIONS,
  searchFields: (annotation) => [
    annotation.label,
    annotation.text,
    annotation.authorName,
    ...(annotation.tags || []),
  ],
  persistKey: 'cia-web-annotations-filters',
};

export default ANNOTATIONS_FILTER_CONFIG;
