// src/ui/react/components/atoms/IconLabel/IconLabel.jsx
// Icon + text label atom - the most common pairing in the UI

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useAdaptive } from '@UI/react/context';
import './IconLabel.scss';

// Size mappings for icon sizes
const ICON_SIZES = {
    xs: { desktop: 12, vr: 16 },
    sm: { desktop: 14, vr: 18 },
    md: { desktop: 16, vr: 20 },
    lg: { desktop: 20, vr: 24 },
};

/**
 * IconLabel - Icon with text label combination
 *
 * The most commonly used pairing in the UI. Use for:
 * - Menu items
 * - Tab labels
 * - Info displays
 * - Navigation items
 *
 * @param {string} icon - Icon name from registry
 * @param {string} label - Text label
 * @param {string} size - Size variant: 'xs' | 'sm' | 'md' | 'lg'
 * @param {string} color - Icon color (CSS color value)
 * @param {boolean} subtle - Use muted text styling
 * @param {boolean} reverse - Put label before icon
 * @param {number} gap - Custom gap override in pixels
 * @param {string} className - Additional CSS classes
 */
export const IconLabel = memo(function IconLabel({
    icon,
    label,
    size = 'sm',
    color,
    subtle = false,
    reverse = false,
    gap,
    className = '',
}) {
    const { isVR } = useAdaptive();

    const iconSize = ICON_SIZES[size]?.[isVR ? 'vr' : 'desktop'] ?? ICON_SIZES.sm.desktop;

    const classList = [
        'icon-label',
        `icon-label--${size}`,
        subtle && 'icon-label--subtle',
        reverse && 'icon-label--reverse',
        isVR && 'icon-label--vr',
        className,
    ].filter(Boolean).join(' ');

    const style = gap ? { gap: `${gap}px` } : undefined;

    return (
        <span className={classList} style={style}>
            {icon && (
                <Icon
                    name={icon}
                    size={iconSize}
                    className="icon-label__icon"
                    style={color ? { color } : undefined}
                />
            )}
            {label && (
                <span className="icon-label__text">{label}</span>
            )}
        </span>
    );
});

export default IconLabel;
