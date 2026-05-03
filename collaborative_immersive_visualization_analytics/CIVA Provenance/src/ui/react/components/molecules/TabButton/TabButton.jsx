// src/ui/react/components/molecules/TabButton/TabButton.jsx
// TabButton molecule - Tab/navigation button with optional badge

import React, { memo, forwardRef } from 'react';
import { Icon, Badge } from '@UI/react/components/atoms';
import { useAdaptive } from '@UI/react/context';
import './TabButton.scss';

// Icon sizes by mode
const ICON_SIZES = {
    desktop: { sm: 16, md: 18, lg: 20 },
    vr: { sm: 20, md: 24, lg: 28 },
};

/**
 * TabButton - Tab or navigation button with optional badge
 *
 * Composed from: Icon atom + Badge atom
 *
 * Use for:
 * - Activity bar tabs
 * - Panel tabs
 * - Navigation items
 * - Any selectable tab-like button
 *
 * @param {string} icon - Icon name from registry
 * @param {string} label - Tab label text (hidden in icon-only mode)
 * @param {boolean} active - Active/selected state
 * @param {number} badge - Badge count (optional)
 * @param {string} badgeColor - Badge color preset or CSS color
 * @param {string} color - Accent color name: 'blue' | 'teal' | 'purple' | 'amber' | 'green' | 'red' | 'pink' | 'indigo'
 * @param {string} variant - Visual style: 'default' | 'etched' (recessed button style)
 * @param {string} size - Size: 'sm' | 'md' | 'lg'
 * @param {string} orientation - Layout: 'horizontal' | 'vertical'
 * @param {boolean} iconOnly - Show only icon, hide label (for compact activity bars)
 * @param {boolean} disabled - Disabled state
 * @param {function} onClick - Click handler
 * @param {string} tooltip - Tooltip text
 * @param {string} className - Additional CSS classes
 */
export const TabButton = memo(forwardRef(function TabButton({
    icon,
    label,
    active = false,
    badge,
    badgeColor = 'primary',
    color,
    variant = 'default',
    size = 'md',
    orientation = 'horizontal',
    iconOnly = false,
    disabled = false,
    onClick,
    tooltip,
    className = '',
    ...props
}, ref) {
    const { isVR, mode } = useAdaptive();

    const iconSize = ICON_SIZES[mode || 'desktop']?.[size] ?? ICON_SIZES.desktop.md;

    const classList = [
        'tab-button',
        `tab-button--${size}`,
        `tab-button--${variant}`,
        `tab-button--${orientation}`,
        active && 'tab-button--active',
        color && `tab-button--${color}`,
        iconOnly && 'tab-button--icon-only',
        disabled && 'tab-button--disabled',
        isVR && 'tab-button--vr',
        className,
    ].filter(Boolean).join(' ');

    const handleClick = (e) => {
        if (!disabled && onClick) {
            onClick(e);
        }
    };

    const handleKeyDown = (e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick?.(e);
        }
    };

    const showBadge = badge !== undefined && badge !== null && badge > 0;

    return (
        <button
            ref={ref}
            type="button"
            className={classList}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            title={tooltip || label}
            aria-label={label}
            aria-pressed={active}
            {...props}
        >
            <span className="tab-button__icon-wrapper">
                {icon && (
                    <Icon
                        name={icon}
                        size={iconSize}
                        className="tab-button__icon"
                    />
                )}
                {showBadge && (
                    <Badge
                        count={badge}
                        color={badgeColor}
                        size="sm"
                        className="tab-button__badge"
                    />
                )}
            </span>
            {label && !iconOnly && (
                <span className="tab-button__label">{label}</span>
            )}
        </button>
    );
}));

export default TabButton;
