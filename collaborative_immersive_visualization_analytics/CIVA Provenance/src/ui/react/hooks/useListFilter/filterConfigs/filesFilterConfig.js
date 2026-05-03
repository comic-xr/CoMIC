/**
 * @file filesFilterConfig.js
 * @description Filter configuration for the Files Tab
 */

// =============================================================================
// QUICK FILTERS
// =============================================================================

export const FILES_QUICK_FILTERS = [
  {
    id: 'loaded',
    label: 'Loaded',
    icon: 'checkCircle',
    predicate: (file) => file.loadState === 'loaded',
  },
  {
    id: 'starred',
    label: 'Starred',
    icon: 'star',
    predicate: (file) => file.isStarred,
  },
  {
    id: 'shared',
    label: 'Shared',
    icon: 'users',
    predicate: (file) => file.isShared,
  },
  {
    id: 'linked',
    label: 'Linked',
    icon: 'link2',
    predicate: (file) => file.isLinked,
  },
];

// =============================================================================
// TYPE CATEGORIES
// =============================================================================

export const FILES_TYPE_CATEGORIES = [
  {
    id: 'medical',
    label: 'Medical Imaging',
    icon: 'heartPulse',
    types: [
      { id: 'nifti', label: 'NIfTI' },
      { id: 'dicom', label: 'DICOM' },
      { id: 'minc', label: 'MINC' },
      { id: 'analyze', label: 'Analyze' },
    ],
  },
  {
    id: 'mesh',
    label: '3D Meshes',
    icon: 'box',
    types: [
      { id: 'vtk', label: 'VTK' },
      { id: 'obj', label: 'OBJ' },
      { id: 'stl', label: 'STL' },
      { id: 'gltf', label: 'glTF' },
      { id: 'ply', label: 'PLY' },
    ],
  },
  {
    id: 'images',
    label: 'Images',
    icon: 'image',
    types: [
      { id: 'png', label: 'PNG' },
      { id: 'jpg', label: 'JPEG' },
      { id: 'tiff', label: 'TIFF' },
      { id: 'webp', label: 'WebP' },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: 'fileText',
    types: [
      { id: 'pdf', label: 'PDF' },
      { id: 'csv', label: 'CSV' },
      { id: 'json', label: 'JSON' },
      { id: 'xml', label: 'XML' },
    ],
  },
];

// =============================================================================
// SORT OPTIONS
// =============================================================================

export const FILES_SORT_OPTIONS = [
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
    value: 'date-desc',
    label: 'Date (Newest)',
    shortLabel: 'Date',
    icon: 'clock',
    comparator: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
  },
  {
    value: 'date-asc',
    label: 'Date (Oldest)',
    shortLabel: 'Date',
    icon: 'clock',
    comparator: (a, b) => (a.updatedAt || 0) - (b.updatedAt || 0),
  },
  {
    value: 'size-desc',
    label: 'Size (Largest)',
    shortLabel: 'Size',
    icon: 'hardDrive',
    comparator: (a, b) => (b.size || 0) - (a.size || 0),
  },
  {
    value: 'size-asc',
    label: 'Size (Smallest)',
    shortLabel: 'Size',
    icon: 'hardDrive',
    comparator: (a, b) => (a.size || 0) - (b.size || 0),
  },
];

// =============================================================================
// COMBINED CONFIG
// =============================================================================

export const FILES_FILTER_CONFIG = {
  quickFilterDefs: FILES_QUICK_FILTERS,
  typeCategories: FILES_TYPE_CATEGORIES,
  sortOptions: FILES_SORT_OPTIONS,
  searchFields: (file) => [
    file.name,
    file.type,
    file.fileType,
    ...(file.tags || []),
  ],
  persistKey: 'cia-web-files-filters',
};

export default FILES_FILTER_CONFIG;
