// src/ui/react/components/atoms/LinkBadges/ModeBadge.jsx
// ModeBadge atom - Shows link mode (Follow/Sync/Broadcast)

import React, { memo } from 'react';
import { useAdaptive } from '@UI/react/context';
import './ModeBadge.scss';

/**
 * Link mode configurations
 */
const MODE_CONFIG = {
    follow: { icon: '←', label: 'Following', colorClass: 'cyan' },
    sync: { icon: '↔', label: 'Synced', colorClass: 'teal' },
    bidirectional: { icon: '↔', label: 'Synced', colorClass: 'teal' },
    broadcast: { icon: '→', label: 'Broadcasting', colorClass: 'purple' },
};

/**
 * ModeBadge - Shows link mode (Follow/Sync/Broadcast)
 *
 * Usage:
 * <ModeBadge mode="sync" />
 * <ModeBadge mode="follow" showLabel />
 *
 * @param {string} mode - Link mode: 'follow' | 'sync' | 'bidirectional' | 'broadcast'
 * @param {string} size - Size variant: 'small' | 'default' | 'large'
 * @param {boolean} showLabel - Show mode label text
 * @param {string} className - Additional CSS classes
 */
export const ModeBadge = memo(function ModeBadge({
    mode,
    size = 'default',
    showLabel = false,
    className = '',
}) {
    const { isVR } = useAdaptive();

    const config = MODE_CONFIG[mode];
    if (!config) return null;

    // Size mapping for VR mode
    const effectiveSize = isVR && size === 'small' ? 'default' : size;

    const classList = [
        'mode-badge',
        `mode-badge--${mode}`,
        `mode-badge--${effectiveSize}`,
        `mode-badge--color-${config.colorClass}`,
        isVR && 'mode-badge--vr',
        className,
    ].filter(Boolean).join(' ');

    return (
        <span className={classList} title={config.label}>
            <span className="mode-badge__icon">{config.icon}</span>
            {showLabel && <span className="mode-badge__label">{config.label}</span>}
        </span>
    );
});

export default ModeBadge;
