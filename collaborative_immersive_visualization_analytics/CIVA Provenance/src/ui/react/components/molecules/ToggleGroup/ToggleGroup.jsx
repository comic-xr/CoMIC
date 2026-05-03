// src/ui/react/components/molecules/ToggleGroup/ToggleGroup.jsx
// ToggleGroup molecule - Mutually exclusive toggle buttons

import React, { memo, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { useAdaptive } from '@UI/react/context';
import './ToggleGroup.scss';

// Icon sizes by mode and size
const ICON_SIZES = {
    desktop: { sm: 14, md: 16, lg: 18 },
    vr: { sm: 18, md: 20, lg: 24 },
};

/**
 * ToggleGroup - Mutually exclusive toggle buttons
 *
 * Composed from: Button-like elements
 *
 * Use for:
 * - Segmented controls
 * - Mode toggles
 * - View switchers
 * - Option selectors
 *
 * @param {Array} options - Array of { value, icon?, label? }
 * @param {string} value - Currently selected value
 * @param {function} onChange - Called with new value when selection changes
 * @param {string} variant - Style variant: 'default' | 'etched' | 'segmented'
 * @param {string} size - Size: 'sm' | 'md' | 'lg'
 * @param {boolean} disabled - Disable all options
 * @param {boolean} fullWidth - Stretch to fill container
 * @param {string} className - Additional CSS classes
 */
export const ToggleGroup = memo(function ToggleGroup({
    options = [],
    value,
    onChange,
    variant = 'default',
    size = 'md',
    disabled = false,
    fullWidth = false,
    className = '',
    ...props
}) {
    const { isVR, mode } = useAdaptive();

    const iconSize = ICON_SIZES[mode || 'desktop']?.[size] ?? ICON_SIZES.desktop.md;

    const classList = [
        'toggle-group',
        `toggle-group--${variant}`,
        `toggle-group--${size}`,
        fullWidth && 'toggle-group--full-width',
        disabled && 'toggle-group--disabled',
        isVR && 'toggle-group--vr',
        className,
    ].filter(Boolean).join(' ');

    const handleSelect = useCallback((optionValue) => {
        if (!disabled && optionValue !== value) {
            onChange?.(optionValue);
        }
    }, [disabled, value, onChange]);

    const handleKeyDown = useCallback((e, optionValue) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSelect(optionValue);
        }
    }, [handleSelect]);

    return (
        <div
            className={classList}
            role="group"
            {...props}
        >
            {options.map((option) => {
                const isActive = option.value === value;
                const optionDisabled = disabled || option.disabled;

                const optionClassList = [
                    'toggle-group__option',
                    isActive && 'toggle-group__option--active',
                    optionDisabled && 'toggle-group__option--disabled',
                ].filter(Boolean).join(' ');

                return (
                    <button
                        key={option.value}
                        type="button"
                        className={optionClassList}
                        onClick={() => handleSelect(option.value)}
                        onKeyDown={(e) => handleKeyDown(e, option.value)}
                        disabled={optionDisabled}
                        aria-pressed={isActive}
                        title={option.tooltip || option.label}
                    >
                        {option.icon && (
                            <Icon
                                name={option.icon}
                                size={iconSize}
                                className="toggle-group__icon"
                            />
                        )}
                        {option.label && (
                            <span className="toggle-group__label">{option.label}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
});

export default ToggleGroup;
