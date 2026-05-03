// src/ui/react/components/atoms/LinkBadges/LinkBadge.jsx
// LinkBadge atom - Shows linked property count, draggable for quick-link

import React, { memo, forwardRef } from 'react';
import { useAdaptive } from '@UI/react/context';
import './LinkBadge.scss';

// Link chain icon SVG path
const LINK_ICON_PATH = (
    <>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
);

/**
 * LinkBadge - Shows linked property count, draggable for quick-link
 *
 * Usage:
 * <LinkBadge count={3} onClick={openLinkPanel} onDragStart={startQuickLink} />
 *
 * @param {number} count - Number of linked properties
 * @param {function} onClick - Callback when badge is clicked
 * @param {boolean} draggable - Whether badge can be dragged for quick-link
 * @param {function} onDragStart - Callback when drag starts
 * @param {function} onDragEnd - Callback when drag ends
 * @param {string} size - Size variant: 'small' | 'default' | 'large'
 * @param {boolean} showLabel - Show "linked" label text
 * @param {string} className - Additional CSS classes
 */
export const LinkBadge = memo(forwardRef(function LinkBadge({
    count,
    onClick,
    draggable = true,
    onDragStart,
    onDragEnd,
    size = 'default',
    showLabel = false,
    className = '',
}, ref) {
    const { isVR } = useAdaptive();

    // Don't render if no links
    if (!count || count === 0) return null;

    // Size mapping for VR mode
    const effectiveSize = isVR && size === 'small' ? 'default' : size;
    const iconSizes = {
        small: 8,
        default: 10,
        large: 12,
    };
    const iconSize = iconSizes[effectiveSize] || 10;

    const handleClick = (e) => {
        e.stopPropagation();
        onClick?.();
    };

    const classList = [
        'link-badge',
        `link-badge--${effectiveSize}`,
        draggable && 'link-badge--draggable',
        isVR && 'link-badge--vr',
        className,
    ].filter(Boolean).join(' ');

    const title = `${count} linked ${count === 1 ? 'property' : 'properties'}${draggable ? ' – drag to link' : ''}`;

    return (
        <button
            ref={ref}
            className={classList}
            onClick={handleClick}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            title={title}
            type="button"
        >
            <svg
                className="link-badge__icon"
                width={iconSize}
                height={iconSize}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {LINK_ICON_PATH}
            </svg>
            <span className="link-badge__count">{count}</span>
            {showLabel && <span className="link-badge__label">linked</span>}
        </button>
    );
}));

export default LinkBadge;
