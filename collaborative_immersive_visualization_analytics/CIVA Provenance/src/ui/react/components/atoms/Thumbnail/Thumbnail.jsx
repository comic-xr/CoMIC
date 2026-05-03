// src/ui/react/components/common/Thumbnail/Thumbnail.jsx
// Thumbnail display component (fetch-only, server-authoritative)
//
// Displays server-generated thumbnails with loading states and fallbacks.
// This component can only DISPLAY thumbnails - generation is handled server-side.

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useThumbnail, THUMBNAIL_STATUS } from '@UI/react/hooks/useThumbnail.js';
import './Thumbnail.scss';

/**
 * Get icon name for instance type
 */
const TYPE_ICONS = {
    vtk: 'box',
    '3d': 'box',
    mesh: 'box',
    volume: 'box',
    chart: 'barChart',
    plot: 'barChart',
    image: 'image',
    default: 'image',
};

function getTypeIcon(instanceType) {
    return TYPE_ICONS[instanceType?.toLowerCase()] || TYPE_ICONS.default;
}

/**
 * Thumbnail - Display a server-generated view thumbnail
 *
 * @param {Object} props
 * @param {string} props.viewId - View configuration ID
 * @param {string} props.snapshotId - Optional snapshot ID for bookmark thumbnails
 * @param {string} props.alt - Alt text for the image
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.size - Size preset: 'xs' | 'sm' | 'md' | 'lg' | 'fill'
 * @param {string} props.instanceType - Instance type for fallback icon ('vtk', 'chart', etc.)
 * @param {React.ReactNode} props.fallback - Custom fallback when no thumbnail exists
 * @param {Function} props.onClick - Click handler
 */
export const Thumbnail = memo(function Thumbnail({
    viewId,
    snapshotId,
    alt = 'View thumbnail',
    className = '',
    size = 'md',
    instanceType = 'vtk',
    fallback,
    onClick,
}) {
    const { url, status, error } = useThumbnail(viewId, {
        snapshotId,
        enabled: !!viewId,
    });

    const sizeClass = `thumbnail--${size}`;
    const typeIconName = getTypeIcon(instanceType);
    const isClickable = !!onClick;

    // Common wrapper props - never draggable to not interfere with parent drag
    const wrapperProps = {
        className: `thumbnail ${sizeClass} ${className}`.trim(),
        onClick,
        role: isClickable ? 'button' : undefined,
        tabIndex: isClickable ? 0 : undefined,
        draggable: false,
    };

    // Loading state
    if (status === THUMBNAIL_STATUS.LOADING) {
        return (
            <div {...wrapperProps} className={`${wrapperProps.className} thumbnail--loading`}>
                <div className="thumbnail__loader">
                    <Icon name="loader" className="thumbnail__spinner" />
                </div>
            </div>
        );
    }

    // Not found - thumbnail hasn't been generated yet
    // This is normal - server generates on its own schedule
    if (status === THUMBNAIL_STATUS.NOT_FOUND || status === THUMBNAIL_STATUS.IDLE) {
        return (
            <div
                {...wrapperProps}
                className={`${wrapperProps.className} thumbnail--placeholder`}
                title="Preview not yet available"
            >
                {fallback || (
                    <div className="thumbnail__fallback">
                        <Icon name={typeIconName} className="thumbnail__icon" />
                    </div>
                )}
            </div>
        );
    }

    // Error state
    if (status === THUMBNAIL_STATUS.ERROR) {
        return (
            <div
                {...wrapperProps}
                className={`${wrapperProps.className} thumbnail--error`}
                title={error || 'Failed to load thumbnail'}
            >
                {fallback || (
                    <div className="thumbnail__fallback thumbnail__fallback--error">
                        <Icon name="imageOff" className="thumbnail__icon" />
                    </div>
                )}
            </div>
        );
    }

    // Loaded - display the thumbnail
    if (status === THUMBNAIL_STATUS.LOADED && url) {
        return (
            <div {...wrapperProps} className={`${wrapperProps.className} thumbnail--loaded`} draggable={false}>
                <img
                    src={url}
                    alt={alt}
                    className="thumbnail__image"
                    loading="lazy"
                    draggable={false}
                    // Prevent layout shift - let CSS handle actual sizing
                    width="100%"
                    height="100%"
                    style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
            </div>
        );
    }

    // Fallback for any other state
    return (
        <div {...wrapperProps} className={`${wrapperProps.className} thumbnail--idle`}>
            {fallback || (
                <div className="thumbnail__fallback">
                    <Icon name={typeIconName} className="thumbnail__icon" />
                </div>
            )}
        </div>
    );
});

/**
 * ThumbnailSkeleton - Loading skeleton placeholder
 */
export const ThumbnailSkeleton = memo(function ThumbnailSkeleton({
    size = 'md',
    className = '',
}) {
    return (
        <div className={`thumbnail thumbnail--skeleton thumbnail--${size} ${className}`.trim()}>
            <div className="thumbnail__skeleton-pulse" />
        </div>
    );
});

/**
 * ThumbnailGrid - Display multiple thumbnails in a grid
 */
export const ThumbnailGrid = memo(function ThumbnailGrid({
    viewIds = [],
    columns = 'auto',
    size = 'md',
    onSelect,
    className = '',
}) {
    const columnClass = columns === 'auto'
        ? 'thumbnail-grid--auto'
        : `thumbnail-grid--${columns}`;

    return (
        <div className={`thumbnail-grid ${columnClass} ${className}`.trim()}>
            {viewIds.map((viewId) => (
                <Thumbnail
                    key={viewId}
                    viewId={viewId}
                    size={size}
                    onClick={onSelect ? () => onSelect(viewId) : undefined}
                />
            ))}
        </div>
    );
});

// Re-export for convenience
export { THUMBNAIL_STATUS } from '@UI/react/hooks/useThumbnail.js';

export default Thumbnail;