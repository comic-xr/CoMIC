// src/ui/react/components/atoms/LinkBadges/HubBadge.jsx
// HubBadge atom - Indicates this view is the hub (source of truth)

import React, { memo } from 'react';
import { useAdaptive } from '@UI/react/context';
import './HubBadge.scss';

/**
 * HubBadge - Indicates this view is the hub (source of truth)
 *
 * Usage:
 * <HubBadge />
 * {isHub && <HubBadge />}
 *
 * @param {string} size - Size variant: 'small' | 'default' | 'large'
 * @param {boolean} showLabel - Show "Hub" label text
 * @param {string} className - Additional CSS classes
 */
export const HubBadge = memo(function HubBadge({
    size = 'default',
    showLabel = true,
    className = '',
}) {
    const { isVR } = useAdaptive();

    // Size mapping for VR mode
    const effectiveSize = isVR && size === 'small' ? 'default' : size;

    const classList = [
        'hub-badge',
        `hub-badge--${effectiveSize}`,
        !showLabel && 'hub-badge--icon-only',
        isVR && 'hub-badge--vr',
        className,
    ].filter(Boolean).join(' ');

    const title = 'Hub – source of truth for this link group';

    return (
        <span className={classList} title={title}>
            <span className="hub-badge__star">★</span>
            {showLabel && <span className="hub-badge__label">Hub</span>}
        </span>
    );
});

export default HubBadge;
