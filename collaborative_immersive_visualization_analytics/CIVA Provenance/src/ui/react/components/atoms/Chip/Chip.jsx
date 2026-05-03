// src/ui/react/components/atoms/Chip/Chip.jsx
// Chip atom - interactive tag/pill component

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useAdaptive } from '@UI/react/context';
import './Chip.scss';

// Size mappings for icons
const ICON_SIZES = {
    sm: { desktop: 12, vr: 14 },
    md: { desktop: 14, vr: 18 },
};

/**
 * Chip - Interactive tag/pill component
 *
 * Use for:
 * - Tags and labels
 * - Filter chips
 * - Selection indicators
 * - Removable items
 *
 * @param {string} label - Chip text label
 * @param {string} icon - Optional icon name from registry
 * @param {string} color - Accent color (CSS color value)
 * @param {string} size - Size variant: 'sm' | 'md'
 * @param {boolean} selected - Whether chip is in selected state
 * @param {boolean} removable - Show remove button
 * @param {boolean} disabled - Disable interactions
 * @param {function} onClick - Click handler (makes chip interactive)
 * @param {function} onRemove - Remove button click handler
 * @param {string} className - Additional CSS classes
 */
export const Chip = memo(function Chip({
    label,
    icon,
    color,
    size = 'md',
    selected = false,
    removable = false,
    disabled = false,
    onClick,
    onRemove,
    className = '',
}) {
    const { isVR } = useAdaptive();

    const isInteractive = !!onClick && !disabled;
    const iconSize = ICON_SIZES[size]?.[isVR ? 'vr' : 'desktop'] ?? ICON_SIZES.md.desktop;

    const classList = [
        'chip',
        `chip--${size}`,
        selected && 'chip--selected',
        disabled && 'chip--disabled',
        isInteractive && 'chip--interactive',
        removable && 'chip--removable',
        isVR && 'chip--vr',
        className,
    ].filter(Boolean).join(' ');

    const style = color ? { '--chip-color': color } : undefined;

    const handleClick = (e) => {
        if (isInteractive) {
            onClick(e);
        }
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        if (onRemove && !disabled) {
            onRemove(e);
        }
    };

    const handleKeyDown = (e) => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick(e);
        }
    };

    const renderAsDivButton = isInteractive && removable;
    const Component = renderAsDivButton ? 'div' : (isInteractive ? 'button' : 'span');
    const interactiveProps = isInteractive ? (
        renderAsDivButton
            ? {
                role: 'button',
                tabIndex: disabled ? -1 : 0,
                onClick: handleClick,
                onKeyDown: handleKeyDown,
                'aria-disabled': disabled,
            }
            : {
                type: 'button',
                onClick: handleClick,
                onKeyDown: handleKeyDown,
                disabled,
            }
    ) : {};

    return (
        <Component
            className={classList}
            style={style}
            {...interactiveProps}
        >
            {icon && (
                <Icon
                    name={icon}
                    size={iconSize}
                    className="chip__icon"
                />
            )}
            <span className="chip__label">{label}</span>
            {removable && (
                <button
                    type="button"
                    className="chip__remove"
                    onClick={handleRemove}
                    disabled={disabled}
                    aria-label={`Remove ${label}`}
                >
                    <Icon name="close" size={iconSize - 2} />
                </button>
            )}
        </Component>
    );
});

export default Chip;
