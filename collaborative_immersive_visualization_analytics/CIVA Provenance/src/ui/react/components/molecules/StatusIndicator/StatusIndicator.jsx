// src/ui/react/components/molecules/StatusIndicator/StatusIndicator.jsx
// StatusIndicator molecule - Status dot with label

import React, { memo } from 'react';
import { StatusDot, Text } from '@UI/react/components/atoms';
import { useAdaptive } from '@UI/react/context';
import './StatusIndicator.scss';

/**
 * StatusIndicator - Status dot with label
 *
 * Composed from: StatusDot atom + Text atom
 *
 * Use for:
 * - User presence indicators
 * - Connection status
 * - Service health indicators
 * - Any status with a label
 *
 * @param {string} status - Status: 'online' | 'offline' | 'busy' | 'away' | 'loading'
 * @param {string} label - Status label text
 * @param {string} size - Size: 'sm' | 'md' | 'lg'
 * @param {boolean} pulse - Animate the status dot
 * @param {boolean} reverse - Put label before dot
 * @param {string} className - Additional CSS classes
 */
export const StatusIndicator = memo(function StatusIndicator({
    status,
    label,
    size = 'md',
    pulse = false,
    reverse = false,
    className = '',
}) {
    const { isVR } = useAdaptive();

    const classList = [
        'status-indicator',
        `status-indicator--${size}`,
        reverse && 'status-indicator--reverse',
        isVR && 'status-indicator--vr',
        className,
    ].filter(Boolean).join(' ');

    // Map status to text color
    const textColor = {
        online: '#4ecdc4',
        offline: 'muted',
        busy: '#ff6b6b',
        away: '#f7dc6f',
        loading: 'secondary',
    }[status] || 'secondary';

    return (
        <span className={classList}>
            <StatusDot
                status={status}
                size={size}
                pulse={pulse}
                className="status-indicator__dot"
            />
            {label && (
                <Text
                    variant="label"
                    size={size === 'lg' ? 'md' : 'sm'}
                    color={textColor}
                    className="status-indicator__label"
                >
                    {label}
                </Text>
            )}
        </span>
    );
});

export default StatusIndicator;
