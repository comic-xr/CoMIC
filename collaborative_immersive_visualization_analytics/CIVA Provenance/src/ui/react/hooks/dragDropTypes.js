// src/ui/react/hooks/dragDropTypes.js
// =============================================================================
// CENTRALIZED DRAG AND DROP TYPES AND UTILITIES
// =============================================================================
//
// This file is the SINGLE SOURCE OF TRUTH for drag and drop operations.
//
// WHY THIS EXISTS:
// - Prevents MIME type mismatches between drag sources and drop targets
// - Provides consistent data parsing across 10+ components
// - Centralizes drop zone logic used in CanvasCell, GridLayoutPreview, etc.
//
// USAGE:
// import { DRAG_TYPES, DROP_ZONES, parseDragData } from '@UI/react/hooks/dragDropTypes';
//
// =============================================================================

// =============================================================================
// MIME TYPES
// Used by drag sources to set data and drop targets to read data
// =============================================================================

export const DRAG_TYPES = {
    /** ViewItem objects - views being dragged to canvas */
    VIEWITEM: 'application/x-viewitem',
    /** Dataset objects from DatasetsTab */
    DATASET: 'application/cia-dataset',
    /** Legacy dataset format (deprecated) */
    DATASET_LEGACY: 'application/x-dataset',
    /** Generic JSON data (ScratchPad, files, etc.) */
    JSON: 'application/json',
    /** Plain text fallback - always set for compatibility */
    TEXT: 'text/plain',
};

// =============================================================================
// DROP ZONES
// Used by drop targets to determine where within a cell the drop occurred
// =============================================================================

export const DROP_ZONES = {
    /** No active drop zone */
    NONE: 'none',
    /** Empty cell center - place new content (green indicator) */
    PLACE: 'place',
    /** Occupied cell center (60%) - swap with existing (blue indicator) */
    SWAP: 'swap',
    /** Top 20% edge - push content up (amber indicator) */
    PUSH_UP: 'push-up',
    /** Bottom 20% edge - push content down (amber indicator) */
    PUSH_DOWN: 'push-down',
    /** Left 20% edge - push content left (amber indicator) */
    PUSH_LEFT: 'push-left',
    /** Right 20% edge - push content right (amber indicator) */
    PUSH_RIGHT: 'push-right',
};

// =============================================================================
// DRAG DATA SERIALIZATION
// =============================================================================

/**
 * Serialize data for drag operations
 * @param {'VIEWITEM' | 'DATASET'} type - The drag type key
 * @param {Object} data - The data to serialize
 * @returns {Object} Object with MIME type as key and JSON string as value
 */
export function serializeDragData(type, data) {
    const mimeType = DRAG_TYPES[type];
    if (!mimeType) {
        console.warn(`Unknown drag type: ${type}`);
        return {};
    }

    const jsonData = JSON.stringify(data);
    return {
        [mimeType]: jsonData,
        [DRAG_TYPES.TEXT]: jsonData, // Always include text fallback
    };
}

/**
 * Set drag data on a dataTransfer object
 * @param {DataTransfer} dataTransfer - The drag event's dataTransfer
 * @param {'VIEWITEM' | 'DATASET'} type - The drag type key
 * @param {Object} data - The data to set
 * @param {'move' | 'copy' | 'link'} [effectAllowed='move'] - Allowed drag effect
 */
export function setDragData(dataTransfer, type, data, effectAllowed = 'move') {
    dataTransfer.effectAllowed = effectAllowed;

    const serialized = serializeDragData(type, data);
    Object.entries(serialized).forEach(([mimeType, value]) => {
        dataTransfer.setData(mimeType, value);
    });
}

// =============================================================================
// DROP DATA PARSING
// Robust parser that handles all CIA MIME types with fallbacks
// Extracted from CanvasCell.jsx for reuse across components
// =============================================================================

/**
 * Parse drop data from a drag event's dataTransfer
 * Checks multiple MIME types in priority order with fallbacks
 *
 * @param {DataTransfer} dataTransfer - The drop event's dataTransfer
 * @returns {Object|null} Parsed data with normalized type, or null if unparseable
 *
 * @example
 * const data = parseDragData(e.dataTransfer);
 * if (data?.type === 'dataset') {
 *     handleDatasetDrop(data.datasetId);
 * } else if (data?.type === 'view') {
 *     handleViewDrop(data.viewConfigId);
 * }
 */
export function parseDragData(dataTransfer) {
    try {
        const types = Array.from(dataTransfer.types);
        let data;

        // Priority 1: CIA dataset format (from DatasetsTab)
        data = dataTransfer.getData(DRAG_TYPES.DATASET);
        if (data) {
            const parsed = JSON.parse(data);
            return { type: 'dataset', datasetId: parsed.id || parsed.datasetId, ...parsed };
        }

        // Priority 2: Legacy x-dataset format
        data = dataTransfer.getData(DRAG_TYPES.DATASET_LEGACY);
        if (data) {
            const parsed = JSON.parse(data);
            return { type: 'dataset', datasetId: parsed.id || parsed.datasetId, ...parsed };
        }

        // Priority 3: ViewItem format (from Views tab)
        data = dataTransfer.getData(DRAG_TYPES.VIEWITEM);
        if (data) {
            const parsed = JSON.parse(data);
            return { type: 'view', viewConfigId: parsed.id || parsed.viewConfigId, ...parsed };
        }

        // Priority 4: Generic JSON (from files tab, ScratchPad, etc.)
        data = dataTransfer.getData(DRAG_TYPES.JSON);
        if (data) {
            const parsed = JSON.parse(data);

            if (parsed.type === 'dataset') {
                return { type: 'dataset', datasetId: parsed.datasetId || parsed.id, ...parsed };
            } else if (parsed.type === 'view-item' || parsed.type === 'view') {
                return { type: 'view', viewConfigId: parsed.viewId || parsed.viewConfigId || parsed.id, ...parsed };
            } else if (parsed.type === 'file' || parsed.path || parsed.isFile) {
                return { type: 'file', ...parsed, isFile: true };
            } else {
                return { type: 'unknown', ...parsed };
            }
        }

        // Priority 5: Plain text (might contain JSON)
        data = dataTransfer.getData(DRAG_TYPES.TEXT);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                if (parsed.viewConfigId || parsed.viewId || parsed.id) {
                    return { type: 'view', viewConfigId: parsed.viewConfigId || parsed.viewId || parsed.id, ...parsed };
                }
                if (parsed.datasetId) {
                    return { type: 'dataset', ...parsed };
                }
            } catch {
                // Not JSON, continue
            }
        }

        // Priority 6: Scan all application/* types
        for (const mimeType of types) {
            if (mimeType.startsWith('application/')) {
                data = dataTransfer.getData(mimeType);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.datasetId || parsed.type === 'dataset') {
                            return { type: 'dataset', datasetId: parsed.datasetId || parsed.id, ...parsed };
                        }
                        if (parsed.viewConfigId || parsed.viewId || parsed.type === 'view' || parsed.type === 'view-item') {
                            return { type: 'view', viewConfigId: parsed.viewConfigId || parsed.viewId || parsed.id, ...parsed };
                        }
                        return { type: 'unknown', ...parsed };
                    } catch {
                        // Not JSON, continue
                    }
                }
            }
        }

        return null;
    } catch {
        return null;
    }
}

// =============================================================================
// DROP ZONE DETECTION
// Calculate which zone within a cell the mouse is over
// =============================================================================

/** Edge threshold as fraction of cell dimension (20% per spec) */
const EDGE_THRESHOLD = 0.20;

/**
 * Calculate which drop zone based on mouse position within a cell
 *
 * @param {MouseEvent} event - The drag event
 * @param {React.RefObject} cellRef - Ref to the cell element
 * @param {boolean} isEmpty - Whether the cell is empty
 * @returns {string} The drop zone from DROP_ZONES
 */
export function getDropZone(event, cellRef, isEmpty) {
    if (!cellRef?.current) return DROP_ZONES.NONE;

    const rect = cellRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    // Calculate relative position (0-1)
    const relX = x / width;
    const relY = y / height;

    // Check edges first (push zones)
    if (relY < EDGE_THRESHOLD) return DROP_ZONES.PUSH_UP;
    if (relY > 1 - EDGE_THRESHOLD) return DROP_ZONES.PUSH_DOWN;
    if (relX < EDGE_THRESHOLD) return DROP_ZONES.PUSH_LEFT;
    if (relX > 1 - EDGE_THRESHOLD) return DROP_ZONES.PUSH_RIGHT;

    // Center zone - Place for empty, Swap for occupied
    return isEmpty ? DROP_ZONES.PLACE : DROP_ZONES.SWAP;
}

/**
 * Check if a drag event contains a specific type
 * Useful for dragenter/dragover to determine if drop should be accepted
 *
 * @param {DataTransfer} dataTransfer - The drag event's dataTransfer
 * @param {'VIEWITEM' | 'DATASET' | 'JSON'} type - The type to check for
 * @returns {boolean} True if the type is present
 */
export function hasDragType(dataTransfer, type) {
    const mimeType = DRAG_TYPES[type];
    return mimeType && dataTransfer.types.includes(mimeType);
}

/**
 * Check if a drag event contains any CIA drag type
 * @param {DataTransfer} dataTransfer - The drag event's dataTransfer
 * @returns {boolean} True if any recognized type is present
 */
export function hasAnyCIADragType(dataTransfer) {
    return hasDragType(dataTransfer, 'VIEWITEM') ||
           hasDragType(dataTransfer, 'DATASET') ||
           hasDragType(dataTransfer, 'DATASET_LEGACY');
}
