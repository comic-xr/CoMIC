// src/ui/react/components/atoms/StatusDot/StatusDot.jsx
// StatusDot atom - status indicator with predefined states

import React, { memo } from 'react';
import { useAdaptive } from '@UI/react/context';
import './StatusDot.scss';

// Status color mapping
const STATUS_COLORS = {
    online: 'var(--color-accent-green, #22c55e)',
    offline: 'var(--color-text-muted, #6b7280)',
    busy: 'var(--color-accent-red, #ef4444)',
    away: 'var(--color-accent-amber, #f59e0b)',
    loading: 'var(--color-accent-blue, #3b82f6)',
};

// Size mappings
const SIZE_MAP = {
    sm: { desktop: 8, vr: 10 },
    md: { desktop: 10, vr: 14 },
    lg: { desktop: 12, vr: 18 },
};

/**
 * StatusDot - Status indicator dot with predefined states
 *
 * Use for:
 * - User presence indicators
 * - Connection status
 * - Activity states
 *
 * @param {string} [status] - Status state: 'online' | 'offline' | 'busy' | 'away' | 'loading'
 * @param {string} [color] - Direct color override (CSS color value). Takes precedence over status.
 * @param {string|number} [size] - Size variant: 'sm' | 'md' | 'lg' or pixel number
 * @param {boolean} [pulse] - Show pulse animation (auto-enabled for 'loading' status)
 * @param {string} [className] - Additional CSS classes
 */
export const StatusDot = memo(function StatusDot({
    status = 'offline',
    color: colorProp,
    size = 'md',
    pulse,
    className = '',
}) {
    const { isVR } = useAdaptive();

    // Get size based on mode - support both string variants and pixel numbers
    const dotSize = typeof size === 'number'
        ? size
        : SIZE_MAP[size]?.[isVR ? 'vr' : 'desktop'] ?? SIZE_MAP.md.desktop;

    // Get color - direct color prop takes precedence over status
    const color = colorProp ?? STATUS_COLORS[status] ?? STATUS_COLORS.offline;

    // Auto-pulse for loading state
    const shouldPulse = pulse ?? status === 'loading';

    const classList = [
        'status-dot',
        `status-dot--${status}`,
        shouldPulse && 'status-dot--pulse',
        isVR && 'status-dot--vr',
        className,
    ].filter(Boolean).join(' ');

    const style = {
        width: `${dotSize}px`,
        height: `${dotSize}px`,
        backgroundColor: color,
    };

    return (
        <span
            className={classList}
            style={style}
            role="status"
            aria-label={status}
        />
    );
});

export default StatusDot;
