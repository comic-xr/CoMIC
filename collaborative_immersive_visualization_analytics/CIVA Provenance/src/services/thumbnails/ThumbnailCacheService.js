/**
 * @file ThumbnailCacheService.js
 * @description Visual hash caching service for thumbnails.
 *
 * Creates SHA-256 based cache keys from view state properties:
 * - Camera position, focal point, view up
 * - Filters configuration
 * - Representation (surface, wireframe, points)
 * - Color mapping settings
 * - Clip planes
 * - Visible layers
 *
 * This enables instant thumbnail display when switching between
 * previously-seen view states without re-rendering.
 *
 * Handler-specific thumbnail format strategy:
 * - VTK: WebP (lossy, good for 3D renderings)
 * - Chart/Plotly: SVG preferred, PNG fallback (vector graphics)
 * - Table: PNG (crisp text/lines)
 * - Default: WebP (good general compression)
 */

import { thumbnails as log } from '@Utils/logger.js';

/**
 * Thumbnail format strategies by handler type
 * Each strategy defines format, quality, and encoding options
 */
export const THUMBNAIL_FORMAT_STRATEGIES = {
    vtk: {
        format: 'webp',
        mimeType: 'image/webp',
        quality: 0.85,
        description: '3D renderings - WebP for good compression',
    },
    chart: {
        format: 'svg',
        mimeType: 'image/svg+xml',
        quality: 1.0,
        description: 'Charts - SVG for scalable vector graphics',
        fallback: {
            format: 'png',
            mimeType: 'image/png',
            quality: 1.0,
        },
    },
    plotly: {
        format: 'svg',
        mimeType: 'image/svg+xml',
        quality: 1.0,
        description: 'Plotly charts - SVG for scalable vector graphics',
        fallback: {
            format: 'png',
            mimeType: 'image/png',
            quality: 1.0,
        },
    },
    table: {
        format: 'png',
        mimeType: 'image/png',
        quality: 1.0,
        description: 'Tables - PNG for crisp text and lines',
    },
    image: {
        format: 'webp',
        mimeType: 'image/webp',
        quality: 0.90,
        description: 'Images - WebP with high quality',
    },
    default: {
        format: 'webp',
        mimeType: 'image/webp',
        quality: 0.80,
        description: 'Default - WebP for general use',
    },
};

/**
 * In-memory LRU cache for thumbnail blobs
 * Maps hash -> { blob, objectUrl, timestamp, size }
 */
class ThumbnailLRUCache {
    constructor(maxSize = 50 * 1024 * 1024) { // 50MB default
        this.cache = new Map();
        this.maxSize = maxSize;
        this.currentSize = 0;
    }

    /**
     * Get cached thumbnail by hash
     * @param {string} hash - Visual state hash
     * @returns {string|null} Object URL or null
     */
    get(hash) {
        const entry = this.cache.get(hash);
        if (entry) {
            // Update access time for LRU
            entry.lastAccess = Date.now();
            return entry.objectUrl;
        }
        return null;
    }

    /**
     * Store thumbnail in cache
     * @param {string} hash - Visual state hash
     * @param {Blob} blob - Thumbnail blob
     * @returns {string} Object URL
     */
    set(hash, blob) {
        // Evict if needed
        while (this.currentSize + blob.size > this.maxSize && this.cache.size > 0) {
            this._evictOldest();
        }

        // Create object URL
        const objectUrl = URL.createObjectURL(blob);

        this.cache.set(hash, {
            blob,
            objectUrl,
            size: blob.size,
            lastAccess: Date.now(),
            created: Date.now(),
        });
        this.currentSize += blob.size;

        log.debug(`[ThumbnailCache] Cached ${hash.slice(0, 8)}... (${this.cache.size} items, ${(this.currentSize / 1024 / 1024).toFixed(2)}MB)`);

        return objectUrl;
    }

    /**
     * Check if hash exists in cache
     * @param {string} hash
     * @returns {boolean}
     */
    has(hash) {
        return this.cache.has(hash);
    }

    /**
     * Remove specific entry
     * @param {string} hash
     */
    delete(hash) {
        const entry = this.cache.get(hash);
        if (entry) {
            URL.revokeObjectURL(entry.objectUrl);
            this.currentSize -= entry.size;
            this.cache.delete(hash);
        }
    }

    /**
     * Clear all cached thumbnails
     */
    clear() {
        for (const entry of this.cache.values()) {
            URL.revokeObjectURL(entry.objectUrl);
        }
        this.cache.clear();
        this.currentSize = 0;
        log.debug('[ThumbnailCache] Cache cleared');
    }

    /**
     * Evict least recently used entry
     * @private
     */
    _evictOldest() {
        let oldest = null;
        let oldestTime = Infinity;

        for (const [hash, entry] of this.cache) {
            if (entry.lastAccess < oldestTime) {
                oldestTime = entry.lastAccess;
                oldest = hash;
            }
        }

        if (oldest) {
            log.debug(`[ThumbnailCache] Evicting ${oldest.slice(0, 8)}...`);
            this.delete(oldest);
        }
    }

    /**
     * Get cache statistics
     * @returns {Object}
     */
    getStats() {
        return {
            entries: this.cache.size,
            sizeBytes: this.currentSize,
            sizeMB: (this.currentSize / 1024 / 1024).toFixed(2),
            maxSizeMB: (this.maxSize / 1024 / 1024).toFixed(2),
        };
    }
}

/**
 * ThumbnailCacheService - Manages visual hash caching for thumbnails
 */
class ThumbnailCacheService {
    constructor() {
        this.cache = new ThumbnailLRUCache();
        this.hashCache = new Map(); // viewId -> last computed hash
        this.pendingRequests = new Map(); // hash -> Promise (dedup concurrent requests)
        this.handlerTypeCache = new Map(); // viewId -> handlerType
    }

    /**
     * Get the optimal thumbnail format strategy for a handler type
     *
     * @param {string} handlerType - Instance handler type (e.g., 'vtk', 'chart', 'table')
     * @returns {Object} Format strategy with format, mimeType, quality
     */
    getFormatStrategy(handlerType) {
        const normalizedType = (handlerType || 'default').toLowerCase();
        return THUMBNAIL_FORMAT_STRATEGIES[normalizedType] || THUMBNAIL_FORMAT_STRATEGIES.default;
    }

    /**
     * Check if browser supports a specific image format
     *
     * @param {string} format - Format to check ('webp', 'avif', etc.)
     * @returns {boolean} True if supported
     */
    isFormatSupported(format) {
        // Check canvas support for the format
        if (typeof document === 'undefined') return false;

        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;

        switch (format) {
            case 'webp':
                return canvas.toDataURL('image/webp').startsWith('data:image/webp');
            case 'avif':
                return canvas.toDataURL('image/avif').startsWith('data:image/avif');
            case 'svg':
                return true; // SVG is always supported
            case 'png':
                return true; // PNG is always supported
            case 'jpeg':
            case 'jpg':
                return true; // JPEG is always supported
            default:
                return false;
        }
    }

    /**
     * Get effective format strategy, with fallback if primary not supported
     *
     * @param {string} handlerType - Instance handler type
     * @returns {Object} Format strategy with guaranteed browser support
     */
    getEffectiveFormatStrategy(handlerType) {
        const strategy = this.getFormatStrategy(handlerType);

        // Check if primary format is supported
        if (this.isFormatSupported(strategy.format)) {
            return strategy;
        }

        // Try fallback if available
        if (strategy.fallback && this.isFormatSupported(strategy.fallback.format)) {
            log.debug(`[ThumbnailCache] Using fallback format ${strategy.fallback.format} for ${handlerType}`);
            return strategy.fallback;
        }

        // Ultimate fallback to PNG
        log.debug(`[ThumbnailCache] Using PNG fallback for ${handlerType}`);
        return {
            format: 'png',
            mimeType: 'image/png',
            quality: 1.0,
        };
    }

    /**
     * Register handler type for a view (for format strategy lookup)
     *
     * @param {string} viewId - View configuration ID
     * @param {string} handlerType - Handler type (e.g., 'vtk', 'chart')
     */
    registerViewHandlerType(viewId, handlerType) {
        this.handlerTypeCache.set(viewId, handlerType);
    }

    /**
     * Get handler type for a view
     *
     * @param {string} viewId - View configuration ID
     * @returns {string|null} Handler type or null
     */
    getViewHandlerType(viewId) {
        return this.handlerTypeCache.get(viewId) || null;
    }

    /**
     * Build thumbnail URL with format query parameter
     *
     * @param {string} baseUrl - Base thumbnail URL
     * @param {string} handlerType - Handler type for format selection
     * @returns {string} URL with format parameter
     */
    buildThumbnailUrl(baseUrl, handlerType) {
        const strategy = this.getEffectiveFormatStrategy(handlerType);
        const url = new URL(baseUrl, window.location.origin);
        url.searchParams.set('format', strategy.format);
        url.searchParams.set('quality', strategy.quality.toString());
        return url.toString();
    }

    /**
     * Compute visual state hash from view configuration
     * Uses SHA-256 for consistent, collision-resistant hashing
     *
     * @param {Object} viewState - View state object containing:
     *   - camera: { position, focalPoint, viewUp }
     *   - filters: active filter configurations
     *   - representation: 'surface' | 'wireframe' | 'points'
     *   - colorMapping: { arrayName, component, preset, range }
     *   - clipPlanes: array of clip plane definitions
     *   - visibleLayers: array of visible layer IDs
     * @returns {Promise<string>} Hex hash string
     */
    async computeVisualHash(viewState) {
        // Extract only visual-relevant properties
        const hashInput = {
            camera: viewState.camera ? {
                position: this._roundArray(viewState.camera.position, 2),
                focalPoint: this._roundArray(viewState.camera.focalPoint, 2),
                viewUp: this._roundArray(viewState.camera.viewUp, 3),
                parallelScale: this._round(viewState.camera.parallelScale, 1),
            } : null,
            filters: viewState.filters || null,
            representation: viewState.representation || 'surface',
            colorMapping: viewState.colorMapping ? {
                arrayName: viewState.colorMapping.arrayName,
                component: viewState.colorMapping.component,
                preset: viewState.colorMapping.preset,
                range: this._roundArray(viewState.colorMapping.range, 2),
            } : null,
            clipPlanes: viewState.clipPlanes?.map(cp => ({
                origin: this._roundArray(cp.origin, 2),
                normal: this._roundArray(cp.normal, 3),
            })) || null,
            visibleLayers: viewState.visibleLayers?.sort() || null,
        };

        // Convert to JSON string (sorted keys for consistency)
        const jsonStr = JSON.stringify(hashInput, Object.keys(hashInput).sort());

        // Compute SHA-256 hash
        const encoder = new TextEncoder();
        const data = encoder.encode(jsonStr);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);

        // Convert to hex string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return hashHex;
    }

    /**
     * Round a number to specified decimal places
     * @private
     */
    _round(num, decimals) {
        if (num == null) return null;
        const factor = Math.pow(10, decimals);
        return Math.round(num * factor) / factor;
    }

    /**
     * Round array elements to specified decimal places
     * @private
     */
    _roundArray(arr, decimals) {
        if (!arr) return null;
        return arr.map(n => this._round(n, decimals));
    }

    /**
     * Get cached thumbnail or fetch new one
     *
     * @param {string} viewId - View configuration ID
     * @param {Object} viewState - Current visual state
     * @param {Function} fetchFn - Function to fetch thumbnail if not cached
     * @returns {Promise<string>} Object URL for thumbnail
     */
    async getThumbnail(viewId, viewState, fetchFn) {
        const hash = await this.computeVisualHash(viewState);

        // Check cache first
        const cached = this.cache.get(hash);
        if (cached) {
            log.debug(`[ThumbnailCache] Cache HIT for ${viewId} (${hash.slice(0, 8)}...)`);
            return cached;
        }

        // Check if already fetching this hash (dedup concurrent requests)
        if (this.pendingRequests.has(hash)) {
            log.debug(`[ThumbnailCache] Joining pending request for ${hash.slice(0, 8)}...`);
            return this.pendingRequests.get(hash);
        }

        // Fetch and cache
        log.debug(`[ThumbnailCache] Cache MISS for ${viewId} (${hash.slice(0, 8)}...)`);

        const fetchPromise = (async () => {
            try {
                const blob = await fetchFn();
                const objectUrl = this.cache.set(hash, blob);
                this.hashCache.set(viewId, hash);
                return objectUrl;
            } finally {
                this.pendingRequests.delete(hash);
            }
        })();

        this.pendingRequests.set(hash, fetchPromise);
        return fetchPromise;
    }

    /**
     * Invalidate cached thumbnail for a view
     * Call this when view state changes significantly
     *
     * @param {string} viewId - View configuration ID
     */
    invalidateView(viewId) {
        const hash = this.hashCache.get(viewId);
        if (hash) {
            this.cache.delete(hash);
            this.hashCache.delete(viewId);
            log.debug(`[ThumbnailCache] Invalidated ${viewId}`);
        }
    }

    /**
     * Invalidate all thumbnails for a dataset
     * Call when dataset changes (e.g., file re-upload)
     *
     * @param {string} datasetId - Dataset ID
     * @param {Function} getViewsForDataset - Function to get view IDs for dataset
     */
    invalidateDataset(datasetId, getViewsForDataset) {
        const viewIds = getViewsForDataset(datasetId);
        for (const viewId of viewIds) {
            this.invalidateView(viewId);
        }
        log.debug(`[ThumbnailCache] Invalidated ${viewIds.length} views for dataset ${datasetId}`);
    }

    /**
     * Clear entire cache
     */
    clearCache() {
        this.cache.clear();
        this.hashCache.clear();
        this.pendingRequests.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.cache.getStats(),
            viewMappings: this.hashCache.size,
            pendingRequests: this.pendingRequests.size,
        };
    }
}

// Singleton instance
export const thumbnailCacheService = new ThumbnailCacheService();

export default thumbnailCacheService;
