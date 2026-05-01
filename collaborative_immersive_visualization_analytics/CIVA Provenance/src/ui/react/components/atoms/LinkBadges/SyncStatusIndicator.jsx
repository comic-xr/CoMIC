// src/ui/react/components/atoms/LinkBadges/SyncStatusIndicator.jsx
// SyncStatusIndicator atom - Shows sync status with optional pulse

import React, { memo } from 'react';
import { useAdaptive } from '@UI/react/context';
import './SyncStatusIndicator.scss';

/**
 * Sync status configurations
 */
const STATUS_CONFIG = {
    synced: { label: 'Synced', colorClass: 'green', pulse: false },
    syncing: { label: 'Syncing...', colorClass: 'cyan', pulse: true },
    error: { label: 'Sync error', colorClass: 'red', pulse: false },
    paused: { label: 'Paused', colorClass: 'amber', pulse: false },
};

/**
 * SyncStatusIndicator - Shows sync status with optional pulse
 *
 * Usage:
 * <SyncStatusIndicator status="synced" />
 * <SyncStatusIndicator status="syncing" />
 *
 * @param {string} status - Sync status: 'synced' | 'syncing' | 'error' | 'paused'
 * @param {string} size - Size variant: 'small' | 'default' | 'large'
 * @param {boolean} showLabel - Show status label text
 * @param {string} className - Additional CSS classes
 */
export const SyncStatusIndicator = memo(function SyncStatusIndicator({
    status,
    size = 'default',
    showLabel = true,
    className = '',
}) {
    const { isVR } = useAdaptive();

    const config = STATUS_CONFIG[status];
    if (!config) return null;

    // Size mapping for VR mode
    const effectiveSize = isVR && size === 'small' ? 'default' : size;

    const classList = [
        'sync-status',
        `sync-status--${status}`,
        `sync-status--${effectiveSize}`,
        `sync-status--color-${config.colorClass}`,
        config.pulse && 'sync-status--pulse',
        isVR && 'sync-status--vr',
        className,
    ].filter(Boolean).join(' ');

    return (
        <span className={classList} title={config.label}>
            <span className="sync-status__dot" />
            {showLabel && <span className="sync-status__label">{config.label}</span>}
        </span>
    );
});

export default SyncStatusIndicator;
