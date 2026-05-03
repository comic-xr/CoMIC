/**
 * @file viewTypes.js
 * @description View type definitions with icons, colors, and categories
 *
 * Used for consistent visual styling of views across the Canvas Map and related components.
 * Each view type has an associated icon, color, label, and category.
 */

/**
 * View type configuration
 * @type {Object.<string, {icon: string, color: string, label: string, category: string}>}
 */
export const VIEW_TYPES = {
  // Analysis views
  volume: {
    icon: 'box',
    color: '#a855f7',
    label: 'Volume',
    category: 'analysis',
  },
  slice: {
    icon: 'layers',
    color: '#3b82f6',
    label: 'Slice',
    category: 'analysis',
  },
  mpr: {
    icon: 'grid3x3',
    color: '#22d3ee',
    label: 'MPR',
    category: 'analysis',
  },

  // Visualization views
  mesh: {
    icon: 'box',
    color: '#14b8a6',
    label: '3D Mesh',
    category: 'visualization',
  },
  surface: {
    icon: 'layers',
    color: '#22c55e',
    label: 'Surface',
    category: 'visualization',
  },
  pointcloud: {
    icon: 'circle',
    color: '#8b5cf6',
    label: 'Point Cloud',
    category: 'visualization',
  },

  // Data views
  chart: {
    icon: 'barChart',
    color: '#f59e0b',
    label: 'Chart',
    category: 'data',
  },
  table: {
    icon: 'grid',
    color: '#3b82f6',
    label: 'Table',
    category: 'data',
  },
  stats: {
    icon: 'activity',
    color: '#22c55e',
    label: 'Statistics',
    category: 'data',
  },

  // Media views
  image: {
    icon: 'image',
    color: '#ec4899',
    label: 'Image',
    category: 'media',
  },
  annotation: {
    icon: 'fileText',
    color: '#f59e0b',
    label: 'Annotation',
    category: 'media',
  },
  video: {
    icon: 'video',
    color: '#ef4444',
    label: 'Video',
    category: 'media',
  },

  // Default fallback
  default: {
    icon: 'square',
    color: '#6b7280',
    label: 'View',
    category: 'other',
  },
};

/**
 * Get view type configuration, with fallback to default
 * @param {string} type - View type key
 * @returns {Object} View type configuration
 */
export function getViewType(type) {
  return VIEW_TYPES[type] || VIEW_TYPES.default;
}

/**
 * Get all view types in a specific category
 * @param {string} category - Category name ('analysis', 'visualization', 'data', 'media')
 * @returns {Array<{key: string, ...Object}>} Array of view types with their keys
 */
export function getViewTypesByCategory(category) {
  return Object.entries(VIEW_TYPES)
    .filter(([key, config]) => config.category === category && key !== 'default')
    .map(([key, config]) => ({ key, ...config }));
}

/**
 * Get all unique categories
 * @returns {string[]} Array of category names
 */
export function getCategories() {
  const categories = new Set();
  Object.values(VIEW_TYPES).forEach((config) => {
    if (config.category !== 'other') {
      categories.add(config.category);
    }
  });
  return Array.from(categories);
}

export default VIEW_TYPES;
