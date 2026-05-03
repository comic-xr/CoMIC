/**
 * ChipGroup - Adaptive multi-select chip/toggle group component
 * Location: src/ui/react/components/common/ChipGroup/ChipGroup.jsx
 *
 * Supports both desktop and VR modes with appropriate sizing.
 *
 * Use cases:
 * - Scope filters (Project | Room | Personal)
 * - Type filters (Point | Ruler | Region | Note)
 * - Any multi-select toggle group
 *
 * For single-select tab navigation, use PillBar instead.
 */

import React, { memo, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useAdaptive } from '@UI/react/context';
import './ChipGroup.scss';

/**
 * Icon sizes for different modes and sizes
 */
const ICON_SIZES = {
    desktop: { sm: 10, md: 12, lg: 14 },
    vr: { sm: 16, md: 20, lg: 24 },
};

/**
 * ChipGroup - Multi-select toggle chips
 *
 * @param {Array} chips - Array of chip objects: { id, label, icon?, color?, count?, disabled? }
 * @param {Array} activeChips - Array of active chip IDs (multi-select)
 * @param {function} onToggle - Callback when chip is toggled (receives chip id)
 * @param {string} size - Size variant: 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} mode - Display mode: 'desktop' | 'vr' (default: from context)
 * @param {boolean} allowEmpty - Allow deselecting all chips (default: true)
 * @param {string} className - Additional CSS class
 */
export const ChipGroup = memo(function ChipGroup({
    chips = [],
    activeChips = [],
    onToggle,
    size = 'md',
    mode: modeProp,
    allowEmpty = true,
    className = '',
}) {
    // Get adaptive context
    const adaptive = useAdaptive();
    const mode = modeProp || adaptive.mode || 'desktop';
    const isVR = mode === 'vr';

    const handleToggle = useCallback((chipId, disabled) => {
        if (disabled) return;

        // If allowEmpty is false, prevent deselecting the last chip
        if (!allowEmpty && activeChips.length === 1 && activeChips.includes(chipId)) {
            return;
        }

        onToggle?.(chipId);
    }, [onToggle, activeChips, allowEmpty]);

    const iconSize = ICON_SIZES[mode]?.[size] || ICON_SIZES.desktop[size];

    const containerClasses = [
        'chip-group',
        `chip-group--${size}`,
        isVR && 'chip-group--vr',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={containerClasses} role="group">
            {chips.map((chip) => {
                const isActive = activeChips.includes(chip.id);

                return (
                    <button
                        key={chip.id}
                        type="button"
                        className={`chip-group__chip ${isActive ? 'chip-group__chip--active' : ''} ${chip.disabled ? 'chip-group__chip--disabled' : ''}`}
                        onClick={() => handleToggle(chip.id, chip.disabled)}
                        disabled={chip.disabled}
                        aria-pressed={isActive}
                        data-color={chip.color}
                    >
                        {chip.icon && (
                            <span className="chip-group__chip-icon">
                                <Icon name={chip.icon} size={iconSize} />
                            </span>
                        )}
                        <span className="chip-group__chip-label">{chip.label}</span>
                        {chip.count !== undefined && chip.count > 0 && (
                            <span className="chip-group__chip-count">{chip.count}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
});

/**
 * Chip - Individual chip for composable usage
 *
 * @param {string} id - Chip identifier
 * @param {string} label - Display label
 * @param {string} icon - Icon name (string)
 * @param {number} count - Optional count badge
 * @param {boolean} isActive - Whether chip is selected
 * @param {boolean} disabled - Whether chip is disabled
 * @param {string} color - Color variant (blue, green, pink, amber, teal, purple)
 * @param {function} onClick - Click handler
 * @param {string} size - Size variant
 * @param {string} mode - Display mode
 */
export const Chip = memo(function Chip({
    id,
    label,
    icon,
    count,
    isActive = false,
    disabled = false,
    color,
    onClick,
    size = 'md',
    mode: modeProp,
}) {
    const adaptive = useAdaptive();
    const mode = modeProp || adaptive.mode || 'desktop';
    const iconSize = ICON_SIZES[mode]?.[size] || ICON_SIZES.desktop[size];

    return (
        <button
            type="button"
            className={`chip-group__chip ${isActive ? 'chip-group__chip--active' : ''} ${disabled ? 'chip-group__chip--disabled' : ''}`}
            onClick={() => !disabled && onClick?.(id)}
            disabled={disabled}
            aria-pressed={isActive}
            data-color={color}
        >
            {icon && (
                <span className="chip-group__chip-icon">
                    <Icon name={icon} size={iconSize} />
                </span>
            )}
            <span className="chip-group__chip-label">{label}</span>
            {count !== undefined && count > 0 && (
                <span className="chip-group__chip-count">{count}</span>
            )}
        </button>
    );
});

/**
 * useChipGroup - Hook for managing chip group state
 *
 * @param {Array} initialActive - Initially active chip IDs
 * @param {Object} options - { allowEmpty: boolean }
 * @returns {Object} { activeChips, toggle, setActive, selectAll, clearAll, isActive }
 */
export function useChipGroup(initialActive = [], options = {}) {
    const { allowEmpty = true } = options;
    const [activeChips, setActiveChips] = React.useState(initialActive);

    const toggle = useCallback((chipId) => {
        setActiveChips(prev => {
            const isCurrentlyActive = prev.includes(chipId);

            // Prevent empty selection if not allowed
            if (!allowEmpty && isCurrentlyActive && prev.length === 1) {
                return prev;
            }

            return isCurrentlyActive
                ? prev.filter(id => id !== chipId)
                : [...prev, chipId];
        });
    }, [allowEmpty]);

    const setActive = useCallback((chipIds) => {
        setActiveChips(Array.isArray(chipIds) ? chipIds : [chipIds]);
    }, []);

    const selectAll = useCallback((allChipIds) => {
        setActiveChips(allChipIds);
    }, []);

    const clearAll = useCallback(() => {
        if (allowEmpty) {
            setActiveChips([]);
        }
    }, [allowEmpty]);

    const isActive = useCallback((chipId) => {
        return activeChips.includes(chipId);
    }, [activeChips]);

    return {
        activeChips,
        toggle,
        setActive,
        selectAll,
        clearAll,
        isActive,
    };
}

export default ChipGroup;
