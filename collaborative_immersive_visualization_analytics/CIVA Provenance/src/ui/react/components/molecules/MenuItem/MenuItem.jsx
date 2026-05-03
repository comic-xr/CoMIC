// src/ui/react/components/molecules/MenuItem/MenuItem.jsx
// MenuItem molecule - Dropdown/context menu item

import React, { memo, forwardRef } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { useAdaptive } from '@UI/react/context';
import './MenuItem.scss';

// Icon sizes by mode
const ICON_SIZES = {
    desktop: 16,
    vr: 20,
};

/**
 * MenuItem - Dropdown or context menu item
 *
 * Composed from: Icon atom
 *
 * Use for:
 * - Dropdown menus
 * - Context menus
 * - Action lists
 * - Command palettes
 *
 * @param {string} icon - Icon name from registry (optional)
 * @param {string} label - Menu item label
 * @param {string} shortcut - Keyboard shortcut hint (optional)
 * @param {string} description - Secondary description text (optional)
 * @param {boolean} danger - Danger/destructive action styling
 * @param {boolean} disabled - Disabled state
 * @param {boolean} selected - Selected/checked state
 * @param {function} onClick - Click handler
 * @param {string} className - Additional CSS classes
 */
export const MenuItem = memo(forwardRef(function MenuItem({
    icon,
    label,
    shortcut,
    description,
    danger = false,
    disabled = false,
    selected = false,
    onClick,
    className = '',
    ...props
}, ref) {
    const { isVR, mode } = useAdaptive();

    const iconSize = ICON_SIZES[mode || 'desktop'] ?? ICON_SIZES.desktop;

    const classList = [
        'menu-item',
        danger && 'menu-item--danger',
        disabled && 'menu-item--disabled',
        selected && 'menu-item--selected',
        isVR && 'menu-item--vr',
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

    return (
        <button
            ref={ref}
            type="button"
            role="menuitem"
            className={classList}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-disabled={disabled}
            {...props}
        >
            <span className="menu-item__leading">
                {icon && (
                    <Icon
                        name={icon}
                        size={iconSize}
                        className="menu-item__icon"
                    />
                )}
                {!icon && <span className="menu-item__icon-spacer" />}
            </span>

            <span className="menu-item__content">
                <span className="menu-item__label">{label}</span>
                {description && (
                    <span className="menu-item__description">{description}</span>
                )}
            </span>

            {shortcut && (
                <span className="menu-item__shortcut">{shortcut}</span>
            )}

            {selected && (
                <Icon
                    name="check"
                    size={iconSize}
                    className="menu-item__check"
                />
            )}
        </button>
    );
}));

export default MenuItem;
