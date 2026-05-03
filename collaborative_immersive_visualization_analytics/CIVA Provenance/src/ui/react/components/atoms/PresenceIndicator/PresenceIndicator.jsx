/**
 * @file PresenceIndicator.jsx
 * @description Reusable presence status indicator component.
 * Displays user status as a colored dot or icon with consistent styling.
 *
 * @example
 * import { PresenceIndicator } from '@UI/react/components/atoms/PresenceIndicator';
 *
 * <PresenceIndicator status="online" size="md" />
 * <PresenceIndicator status="idle" showLabel />
 * <PresenceIndicator status="away" variant="icon" />
 */

import React, { memo } from 'react';
import {
    STATUS_CONFIG,
    getStatusIcon,
    getStatusColor,
    getStatusLabel,
    isStatusFilled,
} from '@UI/react/utils/statusConfig';
import './PresenceIndicator.scss';

/**
 * Size configuration for indicator
 */
const SIZE_CONFIG = {
    xs: { dot: 6, icon: 10 },
    sm: { dot: 8, icon: 12 },
    md: { dot: 10, icon: 14 },
    lg: { dot: 12, icon: 16 },
};

/**
 * @typedef {Object} PresenceIndicatorProps
 * @property {'online'|'idle'|'away'|'dnd'|'offline'|'active'|'busy'} status - User status
 * @property {'xs'|'sm'|'md'|'lg'} [size='sm'] - Size variant
 * @property {'dot'|'icon'} [variant='dot'] - Display variant
 * @property {boolean} [showLabel=false] - Show status label text
 * @property {boolean} [pulse=false] - Add pulse animation (typically for online status)
 * @property {string} [className] - Additional CSS class
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * PresenceIndicator Component
 *
 * Displays a user's presence status as a visual indicator.
 * Can be shown as a simple dot or with the status icon.
 *
 * @param {PresenceIndicatorProps} props - Component props
 * @returns {React.ReactElement} The rendered indicator
 */
function PresenceIndicator({
    status = 'offline',
    size = 'sm',
    variant = 'dot',
    showLabel = false,
    pulse = false,
    className = '',
    testId,
}) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
    const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.sm;
    const StatusIcon = getStatusIcon(status);
    const color = getStatusColor(status);
    const label = getStatusLabel(status);
    const filled = isStatusFilled(status);

    // Build class names
    const classNames = [
        'presence-indicator',
        `presence-indicator--${size}`,
        `presence-indicator--${variant}`,
        `presence-indicator--${status}`,
        pulse && 'presence-indicator--pulse',
        showLabel && 'presence-indicator--with-label',
        className,
    ].filter(Boolean).join(' ');

    // Render icon variant
    if (variant === 'icon') {
        return (
            <span
                className={classNames}
                title={label}
                data-testid={testId}
                aria-label={label}
            >
                <StatusIcon
                    size={sizeConfig.icon}
                    color={color}
                    fill={filled ? color : 'none'}
                    className="presence-indicator__icon"
                />
                {showLabel && (
                    <span className="presence-indicator__label">{label}</span>
                )}
            </span>
        );
    }

    // Render dot variant (default)
    return (
        <span
            className={classNames}
            title={label}
            data-testid={testId}
            aria-label={label}
        >
            <span
                className="presence-indicator__dot"
                style={{
                    width: sizeConfig.dot,
                    height: sizeConfig.dot,
                    backgroundColor: color,
                }}
            />
            {showLabel && (
                <span className="presence-indicator__label">{label}</span>
            )}
        </span>
    );
}

export default memo(PresenceIndicator);
export { PresenceIndicator, SIZE_CONFIG };