// src/ui/react/components/atoms/LinkBadges/ViewerBadge.jsx
// ViewerBadge atom - Shows current viewer count

import React, { memo } from 'react';
import { useAdaptive } from '@UI/react/context';
import './ViewerBadge.scss';

// Eye icon SVG path
const EYE_ICON_PATH = (
    <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </>
);

/**
 * ViewerBadge - Shows current viewer count
 *
 * Usage:
 * <ViewerBadge count={2} />
 *
 * @param {number} count - Number of current viewers
 * @param {string} size - Size variant: 'small' | 'default' | 'large'
 * @param {string} className - Additional CSS classes
 */
export const ViewerBadge = memo(function ViewerBadge({
    count,
    size = 'default',
    className = '',
}) {
    const { isVR } = useAdaptive();

    // Don't render if no viewers
    if (!count || count === 0) return null;

    // Size mapping for VR mode
    const effectiveSize = isVR && size === 'small' ? 'default' : size;
    const iconSizes = {
        small: 8,
        default: 10,
        large: 12,
    };
    const iconSize = iconSizes[effectiveSize] || 10;

    const classList = [
        'viewer-badge',
        `viewer-badge--${effectiveSize}`,
        isVR && 'viewer-badge--vr',
        className,
    ].filter(Boolean).join(' ');

    const title = `${count} ${count === 1 ? 'viewer' : 'viewers'}`;

    return (
        <span className={classList} title={title}>
            <svg
                className="viewer-badge__icon"
                width={iconSize}
                height={iconSize}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {EYE_ICON_PATH}
            </svg>
            <span className="viewer-badge__count">{count}</span>
        </span>
    );
});

export default ViewerBadge;
