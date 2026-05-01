/**
 * @file viewsFilterConfig.js
 * @description Filter configuration for the Views Tab
 */

// =============================================================================
// QUICK FILTERS
// =============================================================================

export const VIEWS_QUICK_FILTERS = [
  {
    id: 'active',
    label: 'Active',
    icon: 'circleCheck',
    predicate: (view) => view.status === 'active' || view.isOnCanvas,
  },
  {
    id: 'inactive',
    label: 'Inactive',
    icon: 'circleDashed',
    predicate: (view) => view.status === 'inactive' && !view.isOnCanvas,
  },
  {
    id: 'shared',
    label: 'Shared',
    icon: 'users',
    predicate: (view) => view.isShared,
  },
  {
    id: 'linked',
    label: 'Linked',
    icon: 'link2',
    predicate: (view) => view.isLinked || view.hasLinks,
  },
];

// =============================================================================
// SORT OPTIONS
// =============================================================================

export const VIEWS_SORT_OPTIONS = [
  {
    value: 'position',
    label: 'Grid Position',
    shortLabel: 'Position',
    icon: 'grid',
    comparator: (a, b) => {
      const posA = a.position || { row: 999, col: 999 };
      const posB = b.position || { row: 999, col: 999 };
      return posA.row !== posB.row
        ? posA.row - posB.row
        : posA.col - posB.col;
    },
  },
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
    value: 'recent',
    label: 'Recent',
    shortLabel: 'Recent',
    icon: 'clock',
    comparator: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
  },
  {
    value: 'dataset',
    label: 'Dataset',
    shortLabel: 'Dataset',
    icon: 'database',
    comparator: (a, b) =>
      (a.datasetName || '').localeCompare(b.datasetName || ''),
  },
];

// =============================================================================
// COMBINED CONFIG
// =============================================================================

export const VIEWS_FILTER_CONFIG = {
  quickFilterDefs: VIEWS_QUICK_FILTERS,
  typeCategories: [], // Views don't have type categories
  sortOptions: VIEWS_SORT_OPTIONS,
  searchFields: (view) => [view.name, view.datasetName],
  persistKey: 'cia-web-views-filters',
};

export default VIEWS_FILTER_CONFIG;
