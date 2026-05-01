/**
 * @file SegmentedToggle.jsx
 * @description Adaptive icon-based segmented toggle for mutually exclusive options.
 * Used for Flow Direction (Row/Column), View Mode (Normal/Isolation/Subset), etc.
 *
 * Features:
 * - Icon-only buttons with tooltips (desktop) or icon+label (VR)
 * - Accent color per option
 * - Active state with tinted background
 * - Compact design for toolbars
 * - VR mode: larger touch targets, optional labels
 *
 * @example
 * <SegmentedToggle
 *   options={[
 *     { value: 'row', icon: 'arrowRight', label: 'Row Flow', accent: 'var(--color-accent-blue)' },
 *     { value: 'column', icon: 'arrowDown', label: 'Column Flow', accent: 'var(--color-accent-blue)' },
 *   ]}
 *   value="row"
 *   onChange={(value) => setFlowDirection(value)}
 * />
 */

import React, { useState, useCallback, memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useAdaptive } from '@UI/react/context';

import './SegmentedToggle.scss';

// =============================================================================
// TYPES
// =============================================================================

/**
 * @typedef {Object} SegmentedOption
 * @property {string} value - Option value
 * @property {string} icon - Icon name (string)
 * @property {string} label - Tooltip/aria-label text
 * @property {string} [accent] - CSS color for active state
 */

/**
 * Icon sizes for different modes and sizes
 */
const ICON_SIZES = {
    desktop: { sm: 10, md: 12, lg: 14 },
    vr: { sm: 16, md: 20, lg: 24 },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Adaptive segmented toggle component for icon-based option selection.
 *
 * @param {Object} props - Component props
 * @param {SegmentedOption[]} props.options - Available options
 * @param {string} props.value - Currently selected value
 * @param {Function} props.onChange - Callback when value changes
 * @param {string} [props.size] - Size variant: 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} [props.mode] - Display mode: 'desktop' | 'vr' (default: from context)
 * @param {boolean} [props.showLabels] - Show labels in VR mode (default: false)
 * @param {boolean} [props.disabled] - Whether toggle is disabled
 * @param {string} [props.className] - Additional CSS class
 */
function SegmentedToggle({
    options = [],
    value,
    onChange,
    size = 'md',
    mode: modeProp,
    showLabels = false,
    disabled = false,
    className = '',
}) {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    // Get adaptive context
    const adaptive = useAdaptive();
    const mode = modeProp || adaptive.mode || 'desktop';
    const isVR = mode === 'vr';

    const handleSelect = useCallback((optionValue) => {
        if (!disabled && optionValue !== value) {
            onChange?.(optionValue);
        }
    }, [disabled, value, onChange]);

    const iconSize = ICON_SIZES[mode]?.[size] || ICON_SIZES.desktop[size];

    const containerClasses = [
        'segmented-toggle',
        `segmented-toggle--${size}`,
        isVR && 'segmented-toggle--vr',
        disabled && 'segmented-toggle--disabled',
        showLabels && 'segmented-toggle--with-labels',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={containerClasses} role="radiogroup">
            {options.map((option, index) => {
                const isActive = value === option.value;
                const isHovered = hoveredIndex === index;

                return (
                    <button
                        key={option.value}
                        type="button"
                        className={`segmented-toggle__option ${isActive ? 'segmented-toggle__option--active' : ''}`}
                        style={{ '--option-accent': option.accent }}
                        onClick={() => handleSelect(option.value)}
                        onMouseEnter={() => !isVR && setHoveredIndex(index)}
                        onMouseLeave={() => !isVR && setHoveredIndex(null)}
                        disabled={disabled}
                        role="radio"
                        aria-checked={isActive}
                        aria-label={option.label}
                        title={!isVR ? option.label : undefined}
                        data-hovered={isHovered}
                    >
                        <Icon name={option.icon} size={iconSize} />
                        {(isVR && showLabels) && (
                            <span className="segmented-toggle__label">{option.label}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default memo(SegmentedToggle);
export { SegmentedToggle };