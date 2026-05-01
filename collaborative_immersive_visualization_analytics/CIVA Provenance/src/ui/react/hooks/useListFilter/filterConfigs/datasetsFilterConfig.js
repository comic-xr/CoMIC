/**
 * @file datasetsFilterConfig.js
 * @description Filter configuration for the Datasets Tab
 */

// =============================================================================
// QUICK FILTERS
// =============================================================================

export const DATASETS_QUICK_FILTERS = [
  {
    id: 'loaded',
    label: 'Loaded',
    icon: 'checkCircle',
    predicate: (dataset) => dataset.loadState === 'loaded' || dataset.isLoaded,
  },
  {
    id: 'hasViews',
    label: 'Has Views',
    icon: 'eye',
    predicate: (dataset) => (dataset.viewCount || 0) > 0,
  },
  {
    id: 'starred',
    label: 'Starred',
    icon: 'star',
    predicate: (dataset) => dataset.isStarred,
  },
  {
    id: 'shared',
    label: 'Shared',
    icon: 'users',
    predicate: (dataset) => dataset.isShared,
  },
];

// =============================================================================
// TYPE CATEGORIES
// =============================================================================

export const DATASETS_TYPE_CATEGORIES = [
  {
    id: 'volumetric',
    label: 'Volumetric',
    icon: 'cube',
    types: [
      { id: 'volume', label: 'Volume' },
      { id: 'timeseries', label: 'Time Series' },
    ],
  },
  {
    id: 'surface',
    label: 'Surface',
    icon: 'layers',
    types: [
      { id: 'mesh', label: 'Mesh' },
      { id: 'tractography', label: 'Tractography' },
    ],
  },
  {
    id: 'atlas',
    label: 'Atlas',
    icon: 'map',
    types: [
      { id: 'segmentation', label: 'Segmentation' },
      { id: 'parcellation', label: 'Parcellation' },
    ],
  },
];

// =============================================================================
// SORT OPTIONS
// =============================================================================

export const DATASETS_SORT_OPTIONS = [
  {
    value: 'name-asc',
    label: 'Name (A→Z)',
    shortLabel: 'Name',
    icon: 'arrowDownAZ',
    comparator: (a, b) => (a.name || '').localeCompare(b.name || ''),
  },
  {
    value: 'name-desc',
    label: 'Name (Z→A)',
    shortLabel: 'Name',
    icon: 'arrowDownZA',
    comparator: (a, b) => (b.name || '').localeCompare(a.name || ''),
  },
  {
    value: 'views-desc',
    label: 'Most Views',
    shortLabel: 'Views',
    icon: 'eye',
    comparator: (a, b) => (b.viewCount || 0) - (a.viewCount || 0),
  },
  {
    value: 'recent',
    label: 'Recent',
    shortLabel: 'Recent',
    icon: 'clock',
    comparator: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
  },
  {
    value: 'size-desc',
    label: 'Size (Largest)',
    shortLabel: 'Size',
    icon: 'hardDrive',
    comparator: (a, b) => (b.size || 0) - (a.size || 0),
  },
];

// =============================================================================
// COMBINED CONFIG
// =============================================================================

export const DATASETS_FILTER_CONFIG = {
  quickFilterDefs: DATASETS_QUICK_FILTERS,
  typeCategories: DATASETS_TYPE_CATEGORIES,
  sortOptions: DATASETS_SORT_OPTIONS,
  searchFields: (dataset) => [
    dataset.name,
    dataset.type,
    dataset.description,
    ...(dataset.tags || []),
  ],
  persistKey: 'cia-web-datasets-filters',
};

export default DATASETS_FILTER_CONFIG;
