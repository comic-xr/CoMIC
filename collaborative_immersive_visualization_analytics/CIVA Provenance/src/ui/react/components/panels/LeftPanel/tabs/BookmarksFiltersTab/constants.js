// src/ui/react/components/panels/LeftPanel/tabs/BookmarksFiltersTab/constants.js
// Scope configuration for bookmarks and filters
// Used by ChipGroup, ScopedSection, FilterItem, BookmarkItem

/**
 * Scope configuration for collaboration levels
 * 
 * - project: Visible to all project members
 * - room: Visible to current room/workspace members  
 * - personal: Private to the user
 */
export const SCOPE_CONFIG = {
    project: {
        id: 'project',
        label: 'Project',
        icon: 'globe',
        color: 'amber'
    },
    room: {
        id: 'room',
        label: 'This Room',
        icon: 'users',
        color: 'teal'
    },
    personal: {
        id: 'personal',
        label: 'Personal',
        icon: 'userCircle',
        color: 'blue'
    },
};

/**
 * Convert SCOPE_CONFIG to ChipGroup-compatible format
 * @param {Object} counts - Optional counts per scope { project: 5, room: 3, personal: 12 }
 * @returns {Array} Chips array for ChipGroup component
 */
export function getScopeChips(counts = {}) {
    return Object.entries(SCOPE_CONFIG).map(([key, config]) => ({
        id: key,
        label: config.label,
        icon: config.icon,
        color: config.color,
        count: counts[key] || 0,
    }));
}

/**
 * Get scope configuration by key with fallback
 * @param {string} scope - Scope key
 * @returns {Object} Scope config object
 */
export function getScopeConfig(scope) {
    return SCOPE_CONFIG[scope] || SCOPE_CONFIG.personal;
}