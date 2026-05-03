// src/ui/react/components/atoms/Badge/Badge.jsx
// Badge atom - small status/count indicator

import React, { memo } from 'react';
import { useAdaptive } from '@UI/react/context';
import './Badge.scss';

/**
 * Badge - Small status or count indicator
 *
 * Use for:
 * - Notification counts
 * - Tab badges
 * - Status labels
 *
 * @param {React.ReactNode} children - Badge content (number or short text)
 * @param {number} count - Numeric count (alternative to children)
 * @param {boolean} dot - Show as dot only, no content
 * @param {string} color - Badge color ('default' | 'primary' | 'danger' | 'success' | 'warning' | CSS color)
 * @param {string} size - Size variant: 'sm' | 'md'
 * @param {string} variant - Style variant: 'filled' | 'outline'
 * @param {number} max - Max count before showing "99+"
 * @param {boolean} pulse - Show pulse animation
 * @param {string} className - Additional CSS classes
 */
export const Badge = memo(function Badge({
    children,
    count,
    dot = false,
    color = 'default',
    size = 'md',
    variant = 'filled',
    max = 99,
    pulse = false,
    className = '',
}) {
    const { isVR } = useAdaptive();

    // Determine display content
    let displayContent = children;
    if (count !== undefined) {
        displayContent = count > max ? `${max}+` : count;
    }

    // Color mapping
    const colorClass = ['default', 'primary', 'danger', 'success', 'warning'].includes(color)
        ? `badge--color-${color}`
        : '';

    const customColor = colorClass ? undefined : color;

    const classList = [
        'badge',
        `badge--${size}`,
        `badge--${variant}`,
        colorClass,
        dot && 'badge--dot',
        pulse && 'badge--pulse',
        isVR && 'badge--vr',
        className,
    ].filter(Boolean).join(' ');

    const style = customColor ? {
        '--badge-color': customColor,
    } : undefined;

    return (
        <span className={classList} style={style}>
            {!dot && displayContent}
        </span>
    );
});

export default Badge;
