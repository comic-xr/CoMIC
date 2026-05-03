/**
 * Link Manager Constants
 * Shared constants for link management panels
 */

// =============================================================================
// LINK PROPERTIES - Properties that can be synced between views
// =============================================================================

export const LINK_PROPERTIES = [
    {
        id: 'camera',
        icon: 'camera',
        label: 'Camera',
        color: 'var(--color-accent-teal)',
        colorHex: '#2dd4bf',
        description: 'View angle & zoom',
        requiresSameDataset: false,
    },
    {
        id: 'filters',
        icon: 'filter',
        label: 'Filters',
        color: 'var(--color-accent-purple)',
        colorHex: '#a78bfa',
        description: 'Active filters',
        requiresSameDataset: true,
    },
    {
        id: 'colorMaps',
        icon: 'palette',
        label: 'Colors',
        color: 'var(--color-accent-pink)',
        colorHex: '#f472b6',
        description: 'Color mapping',
        requiresSameDataset: true,
    },
    {
        id: 'widgets',
        icon: 'layout',
        label: 'Widgets',
        color: 'var(--color-accent-amber)',
        colorHex: '#fbbf24',
        description: 'Widget states',
        requiresSameDataset: false,
    },
    {
        id: 'cursors',
        icon: 'crosshair',
        label: 'Cursors',
        color: 'var(--color-accent-teal)',
        colorHex: '#22d3ee',
        description: 'Cursor positions',
        requiresSameDataset: false,
    },
    {
        id: 'annotationDisplay',
        icon: 'edit',
        label: 'Annotations',
        color: 'var(--color-accent-orange)',
        colorHex: '#fb923c',
        description: 'Annotation visibility',
        requiresSameDataset: false,
    },
];

// =============================================================================
// LINK MODES - Direction of synchronization
// =============================================================================

export const LINK_MODES = {
    follow: {
        id: 'follow',
        label: 'Follow',
        icon: 'arrowLeft',
        iconChar: '←',
        description: 'Receive updates only',
        color: 'var(--color-accent-teal)',
    },
    sync: {
        id: 'sync',
        label: 'Sync',
        icon: 'arrowLeftRight',
        iconChar: '↔',
        description: 'Two-way sync',
        color: 'var(--color-accent-teal)',
    },
    bidirectional: {
        id: 'bidirectional',
        label: 'Sync',
        icon: 'arrowLeftRight',
        iconChar: '↔',
        description: 'Two-way sync',
        color: 'var(--color-accent-teal)',
    },
    broadcast: {
        id: 'broadcast',
        label: 'Broadcast',
        icon: 'arrowRight',
        iconChar: '→',
        description: 'Send updates only',
        color: 'var(--color-accent-purple)',
    },
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get property config by ID
 */
export function getPropertyById(propertyId) {
    return LINK_PROPERTIES.find(p => p.id === propertyId);
}

/**
 * Get mode config by ID
 */
export function getModeById(modeId) {
    return LINK_MODES[modeId] || LINK_MODES.sync;
}

/**
 * Get mode icon character
 */
export function getModeIconChar(modeId) {
    return LINK_MODES[modeId]?.iconChar || '↔';
}
