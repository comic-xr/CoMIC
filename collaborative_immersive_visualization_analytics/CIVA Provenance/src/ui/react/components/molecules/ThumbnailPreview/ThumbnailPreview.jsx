// src/ui/react/components/common/ThumbnailPreview/ThumbnailPreview.jsx
// Displays a thumbnail preview of a view for progressive loading
//
// Shows a cached thumbnail while the real visualization loads,
// then crossfades to the actual content when ready.
//
// Uses visual hash caching (SHA-256) for instant display of previously-seen
// view states based on: camera, filters, representation, colorMapping,
// clipPlanes, and visibleLayers.

import React, { useState, useEffect, memo } from 'react';
import { thumbnails as log } from '@Utils/logger.js';
import { config } from '@Core/config/clientConfig.js';
import { thumbnailCacheService } from '@Services/thumbnails/ThumbnailCacheService.js';
import './ThumbnailPreview.scss';

/**
 * ThumbnailPreview - Shows a thumbnail placeholder for progressive loading
 *
 * Uses visual hash caching for instant display of previously-seen states,
 * and handler-specific format optimization (WebP for VTK, SVG for charts, etc.)
 *
 * Usage:
 * ```jsx
 * <ThumbnailPreview
 *   viewId="abc-123"
 *   snapshotId={null}  // null for current state
 *   viewState={{ camera, filters, representation, colorMapping }}
 *   handlerType="vtk"  // for format optimization
 *   isContentReady={false}
 *   onLoad={() => console.log('Thumbnail loaded')}
 * />
 * ```
 *
 * @param {string} viewId - The view configuration ID
 * @param {string|null} snapshotId - Optional snapshot ID (null = current state)
 * @param {Object} viewState - Visual state for hash caching (camera, filters, etc.)
 * @param {string|null} handlerType - Handler type for format optimization ('vtk', 'chart', 'table')
 * @param {boolean} isContentReady - Whether the real content has loaded
 * @param {string} className - Additional CSS classes
 * @param {Function} onLoad - Callback when thumbnail loads
 * @param {Function} onError - Callback when thumbnail fails to load
 */
export const ThumbnailPreview = memo(function ThumbnailPreview({
    viewId,
    snapshotId = null,
    viewState = null,
    handlerType = null,
    isContentReady = false,
    className = '',
    onLoad,
    onError,
}) {
    const [thumbnailSrc, setThumbnailSrc] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [cacheHit, setCacheHit] = useState(false);

    // Load thumbnail from cache or API
    useEffect(() => {
        if (!viewId) return;

        let cancelled = false;

        const loadThumbnail = async () => {
            try {
                const apiBase = config.apiBaseUrl || 'http://localhost:3001/api';

                // Get format strategy based on handler type
                const formatStrategy = thumbnailCacheService.getEffectiveFormatStrategy(handlerType);

                // Build URL with format parameters
                let url = snapshotId
                    ? `${apiBase}/views/${viewId}/thumbnail?snapshotId=${snapshotId}`
                    : `${apiBase}/views/${viewId}/thumbnail`;

                // Add format and quality parameters for handler-specific optimization
                const urlObj = new URL(url, window.location.origin);
                urlObj.searchParams.set('format', formatStrategy.format);
                urlObj.searchParams.set('quality', formatStrategy.quality.toString());
                url = urlObj.toString();

                // Register handler type for future lookups
                if (handlerType) {
                    thumbnailCacheService.registerViewHandlerType(viewId, handlerType);
                }

                // Fetch function for cache miss
                const fetchFn = async () => {
                    log.debug(`Fetching ${formatStrategy.format} thumbnail from: ${url}`);
                    const response = await fetch(url);

                    if (!response.ok) {
                        if (response.status === 404) {
                            log.debug(`No thumbnail for view ${viewId}`);
                            return null;
                        }
                        throw new Error(`HTTP ${response.status}`);
                    }

                    return response.blob();
                };

                let objectUrl;

                // Use visual hash caching if viewState is provided
                if (viewState && !snapshotId) {
                    // Check if we have a cached version for this visual state
                    const hash = await thumbnailCacheService.computeVisualHash(viewState);
                    const cached = thumbnailCacheService.cache.get(hash);

                    if (cached) {
                        log.debug(`[ThumbnailPreview] Cache HIT for ${viewId} (${formatStrategy.format})`);
                        setCacheHit(true);
                        objectUrl = cached;
                    } else {
                        // Fetch and cache
                        objectUrl = await thumbnailCacheService.getThumbnail(
                            viewId,
                            viewState,
                            fetchFn
                        );
                    }
                } else {
                    // No viewState - fetch directly without caching
                    const blob = await fetchFn();
                    if (blob) {
                        objectUrl = URL.createObjectURL(blob);
                    }
                }

                if (!cancelled && objectUrl) {
                    setThumbnailSrc(objectUrl);
                    log.debug(`Loaded ${formatStrategy.format} thumbnail for view ${viewId}${cacheHit ? ' (cached)' : ''}`);
                }
            } catch (err) {
                if (!cancelled) {
                    log.warn(`Failed to load thumbnail for view ${viewId}:`, err.message);
                    setHasError(true);
                    onError?.(err);
                }
            }
        };

        loadThumbnail();

        return () => {
            cancelled = true;
            // Only revoke if not from cache (cache manages its own URLs)
            if (thumbnailSrc && !cacheHit) {
                URL.revokeObjectURL(thumbnailSrc);
            }
        };
    }, [viewId, snapshotId, viewState, handlerType]); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle image load
    const handleLoad = () => {
        setIsLoaded(true);
        onLoad?.();
    };

    // Handle image error
    const handleError = () => {
        setHasError(true);
        onError?.(new Error('Image failed to load'));
    };

    // Don't render if content is ready (thumbnail no longer needed)
    // or if there was an error loading the thumbnail
    if (isContentReady || hasError || !thumbnailSrc) {
        return null;
    }

    const classNames = [
        'thumbnail-preview',
        isLoaded && 'thumbnail-preview--loaded',
        isContentReady && 'thumbnail-preview--hidden',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classNames}>
            <img
                src={thumbnailSrc}
                alt="View preview"
                className="thumbnail-preview__image"
                onLoad={handleLoad}
                onError={handleError}
            />
            {!isLoaded && (
                <div className="thumbnail-preview__skeleton">
                    <div className="thumbnail-preview__skeleton-shimmer" />
                </div>
            )}
        </div>
    );
});

/**
 * ThumbnailPlaceholder - Static placeholder when no thumbnail is available
 *
 * Shows a simple placeholder with optional icon and text.
 */
export function ThumbnailPlaceholder({
    icon,
    text = 'Loading...',
    className = '',
}) {
    return (
        <div className={`thumbnail-placeholder ${className}`}>
            {icon && <div className="thumbnail-placeholder__icon">{icon}</div>}
            {text && <span className="thumbnail-placeholder__text">{text}</span>}
        </div>
    );
}

/**
 * ProgressiveLoader - Wrapper component for progressive loading pattern
 *
 * Shows thumbnail while children load, then crossfades to children.
 *
 * Usage:
 * ```jsx
 * <ProgressiveLoader
 *   viewId="abc-123"
 *   handlerType="vtk"
 *   viewState={{ camera, filters }}
 *   isReady={dataLoaded}
 * >
 *   <MyVisualization />
 * </ProgressiveLoader>
 * ```
 */
export function ProgressiveLoader({
    viewId,
    snapshotId = null,
    viewState = null,
    handlerType = null,
    isReady = false,
    children,
    className = '',
}) {
    return (
        <div className={`progressive-loader ${className}`}>
            {/* Thumbnail layer - shows while loading */}
            <ThumbnailPreview
                viewId={viewId}
                snapshotId={snapshotId}
                viewState={viewState}
                handlerType={handlerType}
                isContentReady={isReady}
            />

            {/* Content layer - fades in when ready */}
            <div
                className={`progressive-loader__content ${isReady ? 'progressive-loader__content--ready' : ''}`}
            >
                {children}
            </div>
        </div>
    );
}

export default ThumbnailPreview;